import { describe, expect, it } from 'vitest';
import { applyMerge, planMerge } from '../src/data/backup';
import { memoryStore } from '../src/data/keyValue';
import { IndexedDbAssetStore } from '../src/data/assets';
import { normalizeLibrary } from '../src/data/normalize';
import { LibraryRepository } from '../src/data/repository';
import { selectExpired, type SnapshotInfo } from '../src/data/snapshots';
import { addFavorite, applyAutoIcon, moveFavoriteWithinGroup, restoreFromTrash, trashFavorites } from '../src/domain/library';
import { paginate } from '../src/domain/views';
import type { Library } from '../src/domain/types';

function library(urls: string[]): Library {
  const lib = normalizeLibrary({}, 'Favoriten', 1);
  for (const url of urls) addFavorite(lib, { url }, 1);
  return lib;
}

const order = (lib: Library): string[] =>
  [...lib.favorites].sort((a, b) => a.position - b.position).map((f) => f.url);

describe('Icons', () => {
  it('erfolglose Suche lässt ein vorhandenes Icon stehen', () => {
    const lib = library(['https://a.de/']);
    const fav = lib.favorites[0]!;
    fav.icon = { mode: 'auto', ref: 'a'.repeat(64), origin: 'page', checkedAt: 1 };
    applyAutoIcon(lib, fav.id, fav.url, { mode: 'auto', ref: null, origin: null, checkedAt: 5 });
    expect(fav.icon.ref).toBe('a'.repeat(64));
    expect(fav.icon.mode === 'auto' && fav.icon.checkedAt).toBe(5);
  });

  it('Ergebnis zu einer alten Adresse wird verworfen', () => {
    const lib = library(['https://neu.de/']);
    const fav = lib.favorites[0]!;
    applyAutoIcon(lib, fav.id, 'https://alt.de/', { mode: 'auto', ref: 'b'.repeat(64), origin: 'page', checkedAt: 5 });
    expect(fav.icon.ref).toBeNull();
  });

  it('eigenes Icon wird nie automatisch ersetzt', () => {
    const lib = library(['https://a.de/']);
    const fav = lib.favorites[0]!;
    fav.icon = { mode: 'custom', ref: 'c'.repeat(64), origin: 'upload', originalRef: null };
    applyAutoIcon(lib, fav.id, fav.url, { mode: 'auto', ref: 'd'.repeat(64), origin: 'page', checkedAt: 5 });
    expect(fav.icon.ref).toBe('c'.repeat(64));
  });
});

describe('Reihenfolge', () => {
  it('gemeinsam gelöschte Favoriten kommen in alter Reihenfolge zurück', () => {
    const lib = library(['https://a/', 'https://b/', 'https://c/', 'https://d/']);
    const [a, , c] = [...lib.favorites].sort((x, y) => x.position - y.position);
    const entries = trashFavorites(lib, [c!.id, a!.id], 2);
    expect(order(lib)).toEqual(['https://b/', 'https://d/']);
    restoreFromTrash(lib, entries.map((e) => e.id), 3);
    expect(order(lib)).toEqual(['https://a/', 'https://b/', 'https://c/', 'https://d/']);
  });

  it('Ziehen auf ein Ziel nimmt dessen Platz ein', () => {
    const lib = library(['https://a/', 'https://b/', 'https://c/']);
    const a = lib.favorites.find((f) => f.url === 'https://a/')!;
    moveFavoriteWithinGroup(lib, a.id, 2, 2);
    expect(order(lib)).toEqual(['https://b/', 'https://c/', 'https://a/']);
    const c = lib.favorites.find((f) => f.url === 'https://c/')!;
    moveFavoriteWithinGroup(lib, c.id, 0, 3);
    expect(order(lib)).toEqual(['https://c/', 'https://b/', 'https://a/']);
  });

  it('Seiten berücksichtigen die Hinzufügen-Kachel', () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    expect(paginate(items, 0, 4, true).items).toEqual([0, 1, 2]);
    expect(paginate(items, 1, 4, true).items).toEqual([3, 4, 5, 6]);
    expect(paginate(items, 2, 4, true).items).toEqual([7, 8, 9]);
    expect(paginate(items, 9, 4, true).page).toBe(2);
  });
});

describe('Import', () => {
  it('prüft beim Schreiben noch einmal auf Doppelte', () => {
    const lib = library(['https://a.de/']);
    const plan = planMerge(lib, [{ url: 'https://b.de/', title: '', folder: [] }], lib.groups[0]!.id, false);
    addFavorite(lib, { url: 'https://www.b.de' }, 2);
    expect(applyMerge(lib, plan, '📁', '#ffffff', 3)).toBe(0);
    expect(lib.favorites).toHaveLength(2);
  });
});

describe('Sicherungsstände', () => {
  it('von Hand angelegte Stände verfallen nie', () => {
    const day = 86_400_000;
    const now = 400 * day;
    const make = (id: string, reason: SnapshotInfo['reason'], age: number): SnapshotInfo => ({
      id, reason, createdAt: now - age, favoriteCount: 0, groupCount: 0, trashCount: 0, assetRefs: [], bytes: 0
    });
    const list = [make('h', 'manual', 300 * day), ...Array.from({ length: 40 }, (_, i) => make(`e${i}`, 'before-import', i * day))];
    expect(selectExpired(list, now)).not.toContain('h');
  });

  it('beschädigter Speicherinhalt wird vor dem Überschreiben roh gesichert', async () => {
    const created: string[] = [];
    const repo = new LibraryRepository({
      kv: memoryStore({ library: 'kaputt' }),
      assets: new IndexedDbAssetStore(),
      snapshots: { create: async (r) => void created.push(r), lastTime: async () => Date.now(), prune: async () => undefined },
      defaultGroupName: () => 'Favoriten'
    });
    await repo.mutate(() => undefined);
    expect(created).toContain('damaged');
  });
});
