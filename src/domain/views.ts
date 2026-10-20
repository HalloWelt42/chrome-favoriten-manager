/** Abfragen für die Anzeige: Sortierung, Suche, Seiten, Doppelte. Ohne Seiteneffekte. */
import { displayHost, duplicateKey } from './urls';
import type { Favorite, Group, Library, SortMode } from './types';

export function favoriteName(fav: Favorite): string {
  return fav.alias.trim() || displayHost(fav.url);
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function sortFavorites(items: readonly Favorite[], mode: SortMode): Favorite[] {
  const sorted = [...items];
  switch (mode) {
    case 'name-asc':
      return sorted.sort((a, b) => collator.compare(favoriteName(a), favoriteName(b)));
    case 'name-desc':
      return sorted.sort((a, b) => collator.compare(favoriteName(b), favoriteName(a)));
    case 'date-desc':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case 'date-asc':
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case 'visits-desc':
      return sorted.sort((a, b) => b.visitCount - a.visitCount || (b.lastVisited ?? 0) - (a.lastVisited ?? 0));
    case 'manual':
      return sorted.sort((a, b) => a.position - b.position);
  }
}

export interface SearchHit {
  favorite: Favorite;
  group: Group | undefined;
  score: number;
}

/**
 * Sucht über Name, Adresse, Beschreibung, Schlagworte und Gruppenname.
 * Alle Suchwörter müssen vorkommen; Treffer im Namen zählen mehr als in der Adresse.
 */
export function searchFavorites(lib: Library, query: string, limit = Infinity): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const groups = new Map(lib.groups.map((g) => [g.id, g]));
  const hits: SearchHit[] = [];
  for (const favorite of lib.favorites) {
    const group = groups.get(favorite.groupId);
    const name = favoriteName(favorite).toLowerCase();
    const url = favorite.url.toLowerCase();
    const rest = [favorite.description, ...favorite.tags, group?.name ?? ''].join(' ').toLowerCase();
    let score = 0;
    let all = true;
    for (const term of terms) {
      if (name.startsWith(term)) score += 6;
      else if (name.includes(term)) score += 4;
      else if (url.includes(term)) score += 2;
      else if (rest.includes(term)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) hits.push({ favorite, group, score: score + Math.min(favorite.visitCount, 50) / 50 });
  }
  hits.sort((a, b) => b.score - a.score || collator.compare(favoriteName(a.favorite), favoriteName(b.favorite)));
  return hits.slice(0, limit);
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  pageCount: number;
}

/**
 * Schneidet eine Seite aus. Auf der ersten Seite kann ein Platz für die Hinzufügen-Kachel
 * reserviert sein; die Seitenzahl berücksichtigt das.
 */
export function paginate<T>(items: readonly T[], page: number, perPage: number, reserveFirstSlot: boolean): PageSlice<T> {
  const size = Math.max(1, perPage);
  const reserved = reserveFirstSlot ? 1 : 0;
  const pageCount = Math.max(1, Math.ceil((items.length + reserved) / size));
  const current = Math.max(0, Math.min(page, pageCount - 1));
  const start = current === 0 ? 0 : current * size - reserved;
  const count = current === 0 ? size - reserved : size;
  return { items: items.slice(start, start + count), page: current, pageCount };
}

/** Seite, auf der ein Eintrag mit gegebenem Index liegt (passend zu paginate). */
export function pageOfIndex(index: number, perPage: number, reserveFirstSlot: boolean): number {
  const reserved = reserveFirstSlot ? 1 : 0;
  return Math.floor((index + reserved) / Math.max(1, perPage));
}

export interface DuplicateSet {
  key: string;
  favorites: Favorite[];
}

/** Findet Favoriten mit gleicher Adresse (unabhängig von www, Protokoll, Endschrägstrich). */
export function findDuplicates(lib: Library): DuplicateSet[] {
  const byKey = new Map<string, Favorite[]>();
  for (const fav of lib.favorites) {
    const key = duplicateKey(fav.url);
    const list = byKey.get(key);
    if (list) list.push(fav);
    else byKey.set(key, [fav]);
  }
  const sets: DuplicateSet[] = [];
  for (const [key, favorites] of byKey) {
    if (favorites.length > 1) sets.push({ key, favorites: rankForKeeping(favorites) });
  }
  return sets.sort((a, b) => b.favorites.length - a.favorites.length || a.key.localeCompare(b.key));
}

/**
 * Ordnet Doppelte so, dass der wertvollste Eintrag vorn steht: eigenes Icon, Beschreibung,
 * Schlagworte, Besuche, dann der älteste.
 */
function rankForKeeping(favs: Favorite[]): Favorite[] {
  const value = (f: Favorite): number =>
    (f.icon.mode === 'custom' ? 8 : 0) + (f.description ? 4 : 0) + (f.tags.length ? 2 : 0) + (f.alias ? 1 : 0);
  return [...favs].sort((a, b) => value(b) - value(a) || b.visitCount - a.visitCount || a.createdAt - b.createdAt);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}...`;
}
