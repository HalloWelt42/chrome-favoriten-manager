import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IndexedDbAssetStore } from '../src/data/assets';
import { memoryStore } from '../src/data/keyValue';
import { isLegacyPlaceholder } from '../src/data/legacy';
import { LIBRARY_KEY, LibraryRepository, type SnapshotService } from '../src/data/repository';
import { createSnapshot, listSnapshots, readSnapshot, selectExpired, type SnapshotInfo } from '../src/data/snapshots';
import { addFavorite, restoreFromTrash, trashFavorites, trashGroup } from '../src/domain/library';
import type { Library } from '../src/domain/types';

const REAL_DATA = '.test-daten/echt-3.1.1.json';

function memorySnapshots(): SnapshotService & { created: string[] } {
  const created: string[] = [];
  let last = 0;
  return {
    created,
    async create(reason) {
      created.push(reason);
      if (reason === 'auto') last = Date.now();
    },
    async lastTime() {
      return last;
    },
    async prune() {}
  };
}

function repo(initial: Record<string, unknown> = {}, snapshots = memorySnapshots()) {
  const kv = memoryStore(initial);
  const repository = new LibraryRepository({
    kv,
    assets: new IndexedDbAssetStore(),
    snapshots,
    defaultGroupName: () => 'Favoriten'
  });
  return { kv, repository, snapshots };
}

describe('Übernahme der echten Altdaten', () => {
  it.skipIf(!existsSync(REAL_DATA))('übernimmt alle Favoriten, Gruppen, Icons und Einstellungen verlustfrei', async () => {
    const legacy = JSON.parse(readFileSync(REAL_DATA, 'utf8'));
    const { repository, kv, snapshots } = repo(legacy);
    const lib = await repository.load();

    expect(snapshots.created).toEqual(['migration']);
    expect(lib.favorites).toHaveLength(legacy.favorites.length);
    expect(lib.groups).toHaveLength(legacy.groups.length);

    // Jeder alte Favorit ist mit Adresse, Name, Gruppe, Besuchen und Reihenfolge da.
    const byId = new Map(lib.favorites.map((f) => [f.id, f]));
    for (const old of legacy.favorites) {
      const fav = byId.get(old.id)!;
      expect(fav.url).toBe(old.url);
      expect(fav.alias).toBe(old.alias);
      expect(fav.groupId).toBe(old.groupId);
      expect(fav.visitCount).toBe(old.visitCount);
      if (old.customIcon?.startsWith('data:') && !isLegacyPlaceholder(old.customIcon)) expect(fav.icon.mode).toBe('custom');
      else expect(fav.icon.mode).toBe('auto');
    }
    // Reihenfolge innerhalb jeder Gruppe bleibt erhalten.
    for (const g of legacy.groups) {
      const oldOrder = legacy.favorites.filter((f: { groupId: string }) => f.groupId === g.id)
        .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
        .map((f: { id: string }) => f.id);
      const newOrder = lib.favorites.filter((f) => f.groupId === g.id).sort((a, b) => a.position - b.position).map((f) => f.id);
      expect(newOrder).toEqual(oldOrder);
    }
    // Eigene Icons liegen im Bildspeicher und sind lesbar.
    const assets = new IndexedDbAssetStore();
    const custom = lib.favorites.filter((f) => f.icon.mode === 'custom');
    const placeholders = legacy.favorites.filter((f: { customIcon: string | null }) => f.customIcon && isLegacyPlaceholder(f.customIcon)).length;
    expect(placeholders).toBe(13);
    expect(custom.length).toBe(legacy.favorites.filter((f: { customIcon: string | null }) => f.customIcon?.startsWith('data:')).length - placeholders);
    for (const f of custom) expect(await assets.get(f.icon.ref!)).not.toBeNull();

    // Einstellungen: Hintergrundbilder, Schrift, Raster.
    expect(lib.settings.background.type).toBe('image');
    expect(lib.settings.background.imageDark?.kind).toBe('asset');
    expect(lib.settings.background.imageLight?.kind).toBe('asset');
    expect(lib.settings.labels.font).toBe('custom');
    expect(lib.settings.labels.customFont).toBe('DIN Alternate');
    expect(lib.settings.grid.columns).toBe(9);
    expect(lib.settings.navigation.clickBehavior).toBe('sameTab');
    expect(lib.settings.startup.lastGroupId).toBe(legacy.settings.startup.lastGroupId);

    // Altschlüssel bleiben unangetastet.
    const stillThere = await kv.get(['favorites', 'groups', 'settings']);
    expect(stillThere.favorites).toEqual(legacy.favorites);

    // Zweiter Start übernimmt nicht erneut.
    await repository.load();
    expect(snapshots.created).toEqual(['migration']);
    const stored = (await kv.get([LIBRARY_KEY]))[LIBRARY_KEY] as Library;
    expect(JSON.stringify(stored).length).toBeLessThan(JSON.stringify(legacy).length / 3);
  });
});

describe('Repository', () => {
  it('legt eine leere Bibliothek mit Standardgruppe an', async () => {
    const { repository } = repo();
    const lib = await repository.load();
    expect(lib.groups).toHaveLength(1);
    expect(lib.groups[0]!.isDefault).toBe(true);
  });

  it('verliert bei gleichzeitigen Änderungen nichts', async () => {
    const { repository } = repo();
    await repository.load();
    await Promise.all(
      Array.from({ length: 25 }, (_, i) => repository.mutate((lib) => addFavorite(lib, { url: `https://example${i}.org/` }, Date.now())))
    );
    const lib = await repository.load();
    expect(lib.favorites).toHaveLength(25);
    expect(lib.favorites.map((f) => f.position).sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });

  it('macht vor riskanten Vorgängen einen Sicherungsstand', async () => {
    const { repository, snapshots } = repo();
    await repository.load();
    await repository.mutate(() => undefined);
    await repository.mutate(() => undefined);
    expect(snapshots.created.filter((r) => r === 'auto')).toHaveLength(1);
    await repository.replace({ groups: [], favorites: [] }, 'before-import');
    expect(snapshots.created).toContain('before-import');
  });
});

describe('Papierkorb', () => {
  it('stellt gelöschte Favoriten an alter Stelle wieder her', async () => {
    const { repository } = repo();
    await repository.load();
    const { library } = await repository.mutate((lib) => {
      for (let i = 0; i < 5; i++) addFavorite(lib, { url: `https://s${i}.de/` }, 1);
    });
    const target = library.favorites.find((f) => f.position === 2)!;
    const { result: entries } = await repository.mutate((lib) => trashFavorites(lib, [target.id], 2));
    let lib = await repository.load();
    expect(lib.favorites).toHaveLength(4);
    expect(lib.trash).toHaveLength(1);
    await repository.mutate((l) => restoreFromTrash(l, entries.map((e) => e.id), 3));
    lib = await repository.load();
    expect(lib.trash).toHaveLength(0);
    expect(lib.favorites.find((f) => f.id === target.id)?.position).toBe(2);
  });

  it('stellt eine gelöschte Gruppe mit allen Favoriten wieder her', async () => {
    const { repository } = repo();
    await repository.load();
    const { library } = await repository.mutate((lib) => {
      lib.groups.push({ id: 'g2', name: 'Zwei', icon: '🏠', color: '#ff0000', position: 1, isDefault: false, createdAt: 1, updatedAt: 1 });
      for (let i = 0; i < 3; i++) addFavorite(lib, { url: `https://g${i}.de/`, groupId: 'g2' }, 1);
    });
    expect(library.favorites).toHaveLength(3);
    const { result: entry } = await repository.mutate((lib) => trashGroup(lib, 'g2', 2));
    let lib = await repository.load();
    expect(lib.groups).toHaveLength(1);
    expect(lib.favorites).toHaveLength(0);
    await repository.mutate((l) => restoreFromTrash(l, [entry.id], 3));
    lib = await repository.load();
    expect(lib.groups.map((g) => g.name)).toContain('Zwei');
    expect(lib.favorites.filter((f) => f.groupId === 'g2')).toHaveLength(3);
  });
});

describe('Sicherungsstände', () => {
  it('speichert gepackt und liest verlustfrei zurück', async () => {
    const { repository } = repo();
    const lib = await repository.load();
    const info = await createSnapshot('manual', { kind: 'library', library: lib });
    const list = await listSnapshots();
    expect(list.some((s) => s.id === info.id)).toBe(true);
    const payload = await readSnapshot(info.id);
    expect(payload).toEqual({ kind: 'library', library: lib });
  });

  it('behält Migration immer und dünnt automatische Stände aus', () => {
    const hour = 3600_000;
    const now = 100 * 24 * hour;
    const make = (id: string, reason: SnapshotInfo['reason'], age: number): SnapshotInfo => ({
      id, reason, createdAt: now - age, favoriteCount: 0, groupCount: 0, trashCount: 0, assetRefs: [], bytes: 0
    });
    const list = [make('m', 'migration', 99 * 24 * hour), ...Array.from({ length: 200 }, (_, i) => make(`a${i}`, 'auto', i * hour))];
    const expired = new Set(selectExpired(list, now));
    expect(expired.has('m')).toBe(false);
    expect(expired.has('a0')).toBe(false);
    expect(expired.has('a23')).toBe(false);
    expect(list.length - expired.size).toBeLessThan(40);
  });
});
