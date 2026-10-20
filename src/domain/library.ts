/**
 * Fachliche Operationen auf der Bibliothek.
 *
 * Alle Funktionen verändern die übergebene Bibliothek direkt. Die Datenschicht reicht
 * ihnen immer eine frische Arbeitskopie und schreibt sie danach als Ganzes zurück.
 * Löschen heißt hier immer: in den Papierkorb legen. Endgültig entfernt wird nur über
 * purgeTrash.
 */
import { newId } from './ids';
import type { Favorite, FavoriteSource, Group, IconChoice, Library, TrashEntry } from './types';

export class DomainError extends Error {
  constructor(public readonly code: 'not-found' | 'default-group' | 'invalid') {
    super(code);
  }
}

const byPosition = <T extends { position: number }>(a: T, b: T): number => a.position - b.position;

export function sortedGroups(lib: Library): Group[] {
  return [...lib.groups].sort(byPosition);
}

export function defaultGroup(lib: Library): Group {
  const group = lib.groups.find((g) => g.isDefault) ?? sortedGroups(lib)[0];
  if (!group) throw new DomainError('not-found');
  return group;
}

export function favoritesOfGroup(lib: Library, groupId: string): Favorite[] {
  return lib.favorites.filter((f) => f.groupId === groupId).sort(byPosition);
}

export function countByGroup(lib: Library): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of lib.favorites) counts.set(f.groupId, (counts.get(f.groupId) ?? 0) + 1);
  return counts;
}

function findFavorite(lib: Library, id: string): Favorite {
  const fav = lib.favorites.find((f) => f.id === id);
  if (!fav) throw new DomainError('not-found');
  return fav;
}

function findGroup(lib: Library, id: string): Group {
  const group = lib.groups.find((g) => g.id === id);
  if (!group) throw new DomainError('not-found');
  return group;
}

/** Setzt die Positionen einer Gruppe lückenlos ab 0, in gegebener Reihenfolge. */
function applyOrder(items: { position: number }[]): void {
  items.forEach((item, index) => {
    item.position = index;
  });
}

function renumberGroup(lib: Library, groupId: string): void {
  applyOrder(favoritesOfGroup(lib, groupId));
}

function renumberGroups(lib: Library): void {
  applyOrder(sortedGroups(lib));
}

function clampIndex(index: number | undefined, length: number): number {
  if (index === undefined || !Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, Math.trunc(index)));
}

/** Fügt Favoriten in eine Gruppe an einer Stelle ein und nummeriert die Gruppe neu. */
function insertIntoGroup(lib: Library, favs: Favorite[], groupId: string, index?: number): void {
  const moving = new Set(favs.map((f) => f.id));
  const rest = favoritesOfGroup(lib, groupId).filter((f) => !moving.has(f.id));
  const at = clampIndex(index, rest.length);
  for (const f of favs) f.groupId = groupId;
  applyOrder([...rest.slice(0, at), ...favs, ...rest.slice(at)]);
}

// ---------------------------------------------------------------------------
// Favoriten
// ---------------------------------------------------------------------------

export interface FavoriteInput {
  url: string;
  alias?: string;
  description?: string;
  tags?: string[];
  groupId?: string;
  icon?: IconChoice;
  source?: FavoriteSource;
}

export function addFavorite(lib: Library, input: FavoriteInput, now: number, index?: number): Favorite {
  const groupId = input.groupId && lib.groups.some((g) => g.id === input.groupId)
    ? input.groupId
    : defaultGroup(lib).id;
  const fav: Favorite = {
    id: newId(),
    url: input.url,
    alias: input.alias?.trim() ?? '',
    description: input.description?.trim() ?? '',
    tags: input.tags ?? [],
    groupId,
    position: 0,
    icon: input.icon ?? { mode: 'auto', ref: null, origin: null, checkedAt: null },
    source: input.source ?? 'manual',
    createdAt: now,
    updatedAt: now,
    visitCount: 0,
    lastVisited: null
  };
  lib.favorites.push(fav);
  insertIntoGroup(lib, [fav], groupId, index);
  return fav;
}

export interface FavoritePatch {
  url?: string;
  alias?: string;
  description?: string;
  tags?: string[];
  groupId?: string;
  icon?: IconChoice;
}

export function updateFavorite(lib: Library, id: string, patch: FavoritePatch, now: number): Favorite {
  const fav = findFavorite(lib, id);
  const { groupId, ...fields } = patch;
  Object.assign(fav, fields);
  if (groupId && groupId !== fav.groupId) {
    findGroup(lib, groupId);
    const oldGroup = fav.groupId;
    insertIntoGroup(lib, [fav], groupId);
    renumberGroup(lib, oldGroup);
  }
  fav.updatedAt = now;
  return fav;
}

/** Verschiebt Favoriten (in ihrer bisherigen Reihenfolge) in eine Gruppe, wahlweise an eine Stelle. */
export function moveFavorites(lib: Library, ids: string[], groupId: string, now: number, index?: number): void {
  findGroup(lib, groupId);
  const favs = ids.map((id) => findFavorite(lib, id));
  const sourceGroups = new Set(favs.map((f) => f.groupId));
  favs.sort((a, b) => a.groupId.localeCompare(b.groupId) || a.position - b.position);
  insertIntoGroup(lib, favs, groupId, index);
  for (const f of favs) f.updatedAt = now;
  for (const g of sourceGroups) if (g !== groupId) renumberGroup(lib, g);
}

export function duplicateFavorite(lib: Library, id: string, copySuffix: string, now: number): Favorite {
  const original = findFavorite(lib, id);
  const copy: Favorite = {
    ...structuredClone(original),
    id: newId(),
    alias: `${original.alias || original.url} ${copySuffix}`.trim(),
    createdAt: now,
    updatedAt: now,
    visitCount: 0,
    lastVisited: null
  };
  lib.favorites.push(copy);
  insertIntoGroup(lib, [copy], original.groupId, original.position + 1);
  return copy;
}

export function recordVisit(lib: Library, id: string, now: number): void {
  const fav = lib.favorites.find((f) => f.id === id);
  if (!fav) return;
  fav.visitCount += 1;
  fav.lastVisited = now;
}

export function setFavoriteIcon(lib: Library, id: string, icon: IconChoice, now: number): void {
  const fav = findFavorite(lib, id);
  fav.icon = icon;
  fav.updatedAt = now;
}

/**
 * Trägt ein automatisch gefundenes Icon ein, aber nur, wenn der Nutzer kein eigenes gewählt
 * hat und die Adresse noch dieselbe ist wie bei der Suche. Ohne Fund bleibt ein vorhandenes
 * Icon erhalten; nur der Zeitpunkt der Prüfung wird vermerkt.
 */
export function applyAutoIcon(lib: Library, id: string, searchedUrl: string, icon: Extract<IconChoice, { mode: 'auto' }>): boolean {
  const fav = lib.favorites.find((f) => f.id === id);
  if (!fav || fav.icon.mode !== 'auto' || fav.url !== searchedUrl) return false;
  if (!icon.ref && fav.icon.ref) fav.icon = { ...fav.icon, checkedAt: icon.checkedAt };
  else fav.icon = icon;
  return true;
}

// ---------------------------------------------------------------------------
// Papierkorb
// ---------------------------------------------------------------------------

/** Legt Favoriten in den Papierkorb. Liefert die Einträge (für Rückgängig). */
export function trashFavorites(lib: Library, ids: string[], now: number): TrashEntry[] {
  const idSet = new Set(ids);
  // Nach Position, damit gemeinsames Wiederherstellen die Reihenfolge erhält.
  const favs = lib.favorites.filter((f) => idSet.has(f.id)).sort((a, b) => a.position - b.position);
  const groups = new Set(favs.map((f) => f.groupId));
  lib.favorites = lib.favorites.filter((f) => !idSet.has(f.id));
  const entries: TrashEntry[] = favs.map((favorite) => ({
    id: newId(),
    kind: 'favorite',
    deletedAt: now,
    favorite
  }));
  lib.trash.unshift(...entries);
  for (const g of groups) renumberGroup(lib, g);
  return entries;
}

/** Legt eine Gruppe samt ihren Favoriten in den Papierkorb. Die Standardgruppe bleibt. */
export function trashGroup(lib: Library, groupId: string, now: number): TrashEntry {
  const group = findGroup(lib, groupId);
  if (group.isDefault) throw new DomainError('default-group');
  const favorites = favoritesOfGroup(lib, groupId);
  lib.favorites = lib.favorites.filter((f) => f.groupId !== groupId);
  lib.groups = lib.groups.filter((g) => g.id !== groupId);
  renumberGroups(lib);
  const entry: TrashEntry = { id: newId(), kind: 'group', deletedAt: now, group, favorites };
  lib.trash.unshift(entry);
  return entry;
}

/**
 * Holt Einträge aus dem Papierkorb zurück. Favoriten kommen an ihre alte Stelle, sofern
 * ihre Gruppe noch existiert, sonst in die Standardgruppe. Gruppen kommen mit allen
 * Favoriten zurück, die sie beim Löschen hatten.
 */
export function restoreFromTrash(lib: Library, entryIds: string[], now: number): number {
  const wanted = new Set(entryIds);
  const entries = lib.trash.filter((e) => wanted.has(e.id));
  lib.trash = lib.trash.filter((e) => !wanted.has(e.id));
  let restored = 0;
  // Gruppen zuerst, damit Favoriten aus gleichzeitig wiederhergestellten Gruppen ihr Ziel finden.
  const rank = (e: TrashEntry): number => (e.kind === 'group' ? -1 : e.favorite.position);
  const ordered = [...entries].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'group' ? -1 : 1) || a.deletedAt - b.deletedAt || rank(a) - rank(b));
  for (const entry of ordered) {
    if (entry.kind === 'group') {
      const group = { ...entry.group, updatedAt: now };
      if (lib.groups.some((g) => g.id === group.id)) group.id = newId();
      const groupsInOrder = sortedGroups(lib);
      lib.groups.push(group);
      applyOrder([
        ...groupsInOrder.slice(0, clampIndex(entry.group.position, groupsInOrder.length)),
        group,
        ...groupsInOrder.slice(clampIndex(entry.group.position, groupsInOrder.length))
      ]);
      for (const fav of entry.favorites) {
        restoreFavorite(lib, { ...fav, groupId: group.id }, fav.position, now);
        restored += 1;
      }
    } else {
      const fav = entry.favorite;
      const groupExists = lib.groups.some((g) => g.id === fav.groupId);
      restoreFavorite(lib, groupExists ? fav : { ...fav, groupId: defaultGroup(lib).id }, groupExists ? fav.position : undefined, now);
      restored += 1;
    }
  }
  return restored;
}

function restoreFavorite(lib: Library, fav: Favorite, index: number | undefined, now: number): void {
  const restored: Favorite = { ...fav, updatedAt: now };
  if (lib.favorites.some((f) => f.id === restored.id)) restored.id = newId();
  lib.favorites.push(restored);
  insertIntoGroup(lib, [restored], restored.groupId, index);
}

/** Entfernt Einträge endgültig aus dem Papierkorb. */
export function purgeTrash(lib: Library, entryIds: string[] | 'all'): number {
  const before = lib.trash.length;
  if (entryIds === 'all') lib.trash = [];
  else {
    const ids = new Set(entryIds);
    lib.trash = lib.trash.filter((e) => !ids.has(e.id));
  }
  return before - lib.trash.length;
}

export function trashedFavoriteCount(entry: TrashEntry): number {
  return entry.kind === 'favorite' ? 1 : entry.favorites.length;
}

// ---------------------------------------------------------------------------
// Gruppen
// ---------------------------------------------------------------------------

export interface GroupInput {
  name: string;
  icon: string;
  color: string;
}

export function addGroup(lib: Library, input: GroupInput, now: number): Group {
  const group: Group = {
    id: newId(),
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    position: lib.groups.length,
    isDefault: false,
    createdAt: now,
    updatedAt: now
  };
  lib.groups.push(group);
  renumberGroups(lib);
  return group;
}

export function updateGroup(lib: Library, id: string, input: Partial<GroupInput>, now: number): Group {
  const group = findGroup(lib, id);
  if (input.name !== undefined) group.name = input.name.trim();
  if (input.icon !== undefined) group.icon = input.icon;
  if (input.color !== undefined) group.color = input.color;
  group.updatedAt = now;
  return group;
}

/** Verschiebt eine Gruppe an eine neue Stelle in der Reihenfolge. */
export function moveGroup(lib: Library, id: string, targetIndex: number): void {
  const groups = sortedGroups(lib);
  const from = groups.findIndex((g) => g.id === id);
  if (from === -1) throw new DomainError('not-found');
  const [group] = groups.splice(from, 1);
  if (!group) return;
  groups.splice(clampIndex(targetIndex, groups.length), 0, group);
  applyOrder(groups);
}

/** Verschiebt einen Favoriten innerhalb seiner Gruppe an eine neue Stelle. */
export function moveFavoriteWithinGroup(lib: Library, id: string, targetIndex: number, now: number): void {
  const fav = findFavorite(lib, id);
  insertIntoGroup(lib, [fav], fav.groupId, targetIndex);
  fav.updatedAt = now;
}
