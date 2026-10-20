/**
 * Anwendungsfälle, die Oberfläche, Popup und Service Worker gemeinsam nutzen.
 * Jede Funktion ist genau eine atomare Änderung an der Bibliothek.
 */
import * as lib from '../domain/library';
import { duplicateKey } from '../domain/urls';
import { applyMerge, prepareReplacement, type ImportCandidate, type MergePlan } from '../data/backup';
import { readSnapshot } from '../data/snapshots';
import { convertLegacy } from '../data/legacy';
import { applySettingsPatch, type SettingsPatch } from '../domain/settingsPatch';
import type { Favorite, Group, IconChoice, Library, TrashEntry } from '../domain/types';
import { t } from '../i18n';
import { assetStore, repository } from './services';

const now = (): number => Date.now();

export async function updateSettings(patch: SettingsPatch): Promise<Library> {
  const { library } = await repository.mutate((draft) => applySettingsPatch(draft.settings, patch), { quiet: true });
  return library;
}

export async function addFavorite(input: lib.FavoriteInput, index?: number): Promise<Favorite> {
  return (await repository.mutate((draft) => lib.addFavorite(draft, input, now(), index))).result;
}

/** Fügt eine Seite hinzu, sofern ihre Adresse noch nicht vorhanden ist. */
export async function addFavoriteIfNew(input: lib.FavoriteInput): Promise<{ added: Favorite | null; existing: Favorite | null }> {
  const { result } = await repository.mutate((draft) => {
    const key = duplicateKey(input.url);
    const existing = draft.favorites.find((f) => duplicateKey(f.url) === key) ?? null;
    if (existing) return { added: null, existing };
    return { added: lib.addFavorite(draft, input, now()), existing: null };
  });
  return result;
}

export async function updateFavorite(id: string, patch: lib.FavoritePatch): Promise<void> {
  await repository.mutate((draft) => lib.updateFavorite(draft, id, patch, now()));
}

export async function moveFavorites(ids: string[], groupId: string, index?: number): Promise<void> {
  await repository.mutate((draft) => lib.moveFavorites(draft, ids, groupId, now(), index));
}

export async function moveFavoriteWithinGroup(id: string, index: number): Promise<void> {
  await repository.mutate((draft) => lib.moveFavoriteWithinGroup(draft, id, index, now()));
}

export async function duplicateFavorite(id: string): Promise<Favorite> {
  return (await repository.mutate((draft) => lib.duplicateFavorite(draft, id, t('copySuffix'), now()))).result;
}

export async function recordVisit(id: string): Promise<void> {
  await repository.mutate((draft) => lib.recordVisit(draft, id, now()), { quiet: true });
}

export async function setFavoriteIcon(id: string, icon: IconChoice): Promise<void> {
  await repository.mutate((draft) => lib.setFavoriteIcon(draft, id, icon, now()));
}

/** Nach neu erteiltem Webseitenzugriff: automatische Icons ohne Fund sofort wieder suchen lassen. */
export async function retryMissingAutoIcons(): Promise<void> {
  await repository.mutate((draft) => {
    for (const fav of draft.favorites) {
      if (fav.icon.mode === 'auto' && !fav.icon.ref) fav.icon.checkedAt = null;
    }
  }, { quiet: true });
}

export async function trashFavorites(ids: string[]): Promise<TrashEntry[]> {
  return (await repository.mutate((draft) => lib.trashFavorites(draft, ids, now()))).result;
}

export async function trashGroup(id: string): Promise<TrashEntry> {
  return (await repository.mutate((draft) => lib.trashGroup(draft, id, now()))).result;
}

export async function restoreFromTrash(entryIds: string[]): Promise<number> {
  return (await repository.mutate((draft) => lib.restoreFromTrash(draft, entryIds, now()))).result;
}

/** Endgültig löschen; vorher entsteht immer ein Sicherungsstand. */
export async function purgeTrash(entryIds: string[] | 'all'): Promise<number> {
  return (await repository.mutate((draft) => lib.purgeTrash(draft, entryIds), { snapshot: 'before-purge' })).result;
}

export async function addGroup(input: lib.GroupInput): Promise<Group> {
  return (await repository.mutate((draft) => lib.addGroup(draft, input, now()))).result;
}

export async function updateGroup(id: string, input: Partial<lib.GroupInput>): Promise<void> {
  await repository.mutate((draft) => lib.updateGroup(draft, id, input, now()));
}

export async function moveGroup(id: string, index: number): Promise<void> {
  await repository.mutate((draft) => lib.moveGroup(draft, id, index));
}

export async function rememberGroup(groupId: string): Promise<void> {
  await repository.mutate((draft) => {
    draft.settings.startup.lastGroupId = groupId;
  }, { quiet: true });
}

/** Lesezeichen oder Adresslisten ergänzen. */
export async function mergeBookmarks(plan: MergePlan): Promise<void> {
  await repository.mutate((draft) => applyMerge(draft, plan, '📁', draft.settings.accentColor, now()), { snapshot: 'before-import' });
}

/** Vollsicherung einspielen: ersetzt alles, vorher Sicherungsstand. */
export async function replaceFromBackup(candidate: Extract<ImportCandidate, { kind: 'backup' | 'legacy' }>): Promise<Library> {
  const next = await prepareReplacement(candidate, assetStore, t('defaultGroupName'));
  return repository.replace(next, 'before-import');
}

/** Sicherungsstand zurückholen: ersetzt alles, vorher wird der jetzige Zustand gesichert. */
export async function restoreSnapshot(id: string): Promise<Library | null> {
  const payload = await readSnapshot(id);
  if (!payload) return null;
  const next = payload.kind === 'library' ? payload.library : await convertLegacy(payload.data as never, assetStore, t('defaultGroupName'));
  return repository.replace(next, 'before-restore');
}

/** Alles auf Anfang, vorher Sicherungsstand. Bilder bleiben für die Sicherungsstände erhalten. */
export async function resetEverything(): Promise<void> {
  await repository.replace({}, 'before-reset');
}

export async function createManualSnapshot(): Promise<void> {
  await repository.snapshotNow('manual');
}
