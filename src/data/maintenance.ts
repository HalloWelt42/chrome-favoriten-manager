/**
 * Aufräumen im Bildspeicher: Bilder, die weder die Bibliothek noch ein Sicherungsstand
 * kennt, fallen weg. Frisch gespeicherte Bilder bleiben mindestens einen Tag, weil sie
 * zwischen Speichern und Eintragen in die Bibliothek kurz unreferenziert sind.
 */
import type { AssetRef } from '../domain/types';
import { idbGetAll, STORES } from './idb';
import type { AssetStore } from './assets';
import type { LibraryRepository } from './repository';
import { libraryRefs, listSnapshots, pruneSnapshots } from './snapshots';

const GRACE_MS = 24 * 60 * 60 * 1000;

interface AssetMeta {
  ref: AssetRef;
  createdAt: number;
}

export async function collectGarbage(repository: LibraryRepository, assets: AssetStore, now = Date.now()): Promise<number> {
  await pruneSnapshots(now);
  return repository.exclusive(async (library) => {
    const used = new Set<AssetRef>(libraryRefs(library));
    for (const snapshot of await listSnapshots()) snapshot.assetRefs.forEach((ref) => used.add(ref));
    const all = await idbGetAll<AssetMeta>(STORES.assets);
    const unused = all.filter((a) => !used.has(a.ref) && now - a.createdAt > GRACE_MS).map((a) => a.ref);
    await assets.remove(unused);
    return unused.length;
  });
}
