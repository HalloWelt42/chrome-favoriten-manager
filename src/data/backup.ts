/**
 * Vollsicherung als Datei und Einlesen fremder Dateien.
 *
 * Einlesen läuft zweistufig: parseImportFile erkennt das Format und liefert eine Vorschau,
 * erst applyImport schreibt. Vollsicherungen ersetzen die Bibliothek (mit Sicherungsstand
 * davor), Lesezeichen und Adresslisten werden ergänzt, Doppelte übersprungen.
 */
import { addFavorite, addGroup, defaultGroup } from '../domain/library';
import type { AssetRef, Library } from '../domain/types';
import { duplicateKey, normalizeInputUrl } from '../domain/urls';
import { blobToDataUrl, type AssetStore } from './assets';
import { convertLegacy, hasLegacyData, type LegacyData } from './legacy';
import { isObj } from './normalize';
import { libraryRefs } from './snapshots';

export const BACKUP_FORMAT = 'favgrid-backup';
export const BACKUP_FORMAT_VERSION = 4;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  library: Library;
  assets: Record<AssetRef, string>;
}

export async function createBackup(library: Library, assets: AssetStore, appVersion: string): Promise<BackupFile> {
  const embedded: Record<AssetRef, string> = {};
  for (const ref of libraryRefs(library)) {
    const blob = await assets.get(ref);
    if (blob) embedded[ref] = await blobToDataUrl(blob);
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    library,
    assets: embedded
  };
}

export interface BookmarkItem {
  url: string;
  title: string;
  /** Ordnerpfad, innerster Ordner zuletzt; leer für Einträge ohne Ordner. */
  folder: string[];
}

export type ImportCandidate =
  | { kind: 'backup'; backup: BackupFile; favoriteCount: number; groupCount: number }
  | { kind: 'legacy'; data: LegacyData; favoriteCount: number; groupCount: number }
  | { kind: 'bookmarks'; items: BookmarkItem[] };

export class ImportError extends Error {
  constructor(public readonly code: 'unknown-format' | 'empty' | 'invalid-json') {
    super(code);
  }
}

/** Erkennt Vollsicherungen (neu und alt), Lesezeichen-HTML und Adresslisten. */
export function parseImportFile(text: string, fileName: string): ImportCandidate {
  const trimmed = text.trim();
  if (!trimmed) throw new ImportError('empty');
  if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('{')) return parseJson(trimmed);
  if (/<a\s/i.test(trimmed)) return { kind: 'bookmarks', items: parseBookmarkHtml(trimmed) };
  return { kind: 'bookmarks', items: parseUrlList(trimmed) };
}

function parseJson(text: string): ImportCandidate {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('invalid-json');
  }
  if (!isObj(data)) throw new ImportError('unknown-format');
  if (data.format === BACKUP_FORMAT && isObj(data.library)) {
    const backup = data as unknown as BackupFile;
    const lib = backup.library as Partial<Library>;
    return {
      kind: 'backup',
      backup,
      favoriteCount: Array.isArray(lib.favorites) ? lib.favorites.length : 0,
      groupCount: Array.isArray(lib.groups) ? lib.groups.length : 0
    };
  }
  // Alte Formate: { type: 'full-backup', settings, groups, favorites } oder { data: { ... } }
  const legacy = (isObj(data.data) ? data.data : data) as LegacyData;
  if (hasLegacyData(legacy)) {
    return {
      kind: 'legacy',
      data: legacy,
      favoriteCount: Array.isArray(legacy.favorites) ? legacy.favorites.length : 0,
      groupCount: Array.isArray(legacy.groups) ? legacy.groups.length : 0
    };
  }
  throw new ImportError('unknown-format');
}

/** Liest Lesezeichen-HTML (Netscape-Format) samt Ordnerstruktur. */
export function parseBookmarkHtml(html: string): BookmarkItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const items: BookmarkItem[] = [];
  const walk = (list: Element, path: string[]): void => {
    for (const dt of Array.from(list.children)) {
      if (dt.tagName !== 'DT') continue;
      const link = dt.querySelector(':scope > a');
      const heading = dt.querySelector(':scope > h3');
      if (link) {
        const url = normalizeInputUrl(link.getAttribute('href') ?? '');
        if (url) items.push({ url, title: (link.textContent ?? '').trim(), folder: path });
      } else if (heading) {
        const sub = dt.querySelector(':scope > dl');
        if (sub) walk(sub, [...path, (heading.textContent ?? '').trim()]);
      }
    }
  };
  const root = doc.querySelector('dl');
  if (root) walk(root, []);
  // Fallback für flache oder ungewöhnliche Dateien.
  if (items.length === 0) {
    for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
      const url = normalizeInputUrl(a.getAttribute('href') ?? '');
      if (url) items.push({ url, title: (a.textContent ?? '').trim(), folder: [] });
    }
  }
  return items;
}

/** Eine Adresse je Zeile; leere und ungültige Zeilen fallen weg. */
export function parseUrlList(text: string): BookmarkItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    // Adressen enthalten keine Leerzeichen; so fallen Notizen und Überschriften heraus.
    .filter((line) => line !== '' && !/\s/.test(line))
    .map((line) => normalizeInputUrl(line))
    .filter((url): url is string => url !== null && /^https?:/i.test(url))
    .map((url) => ({ url, title: '', folder: [] }));
}

export interface MergePlan {
  /** Neue Favoriten je Zielgruppe; Gruppen mit createName werden neu angelegt. */
  targets: { groupId: string | null; createName: string | null; items: BookmarkItem[] }[];
  added: number;
  skipped: number;
}

/**
 * Plant das Ergänzen von Lesezeichen: Doppelte (auch untereinander) fallen weg.
 * Mit useFolders wird je innerstem Ordner eine Gruppe benutzt oder angelegt.
 */
export function planMerge(lib: Library, items: BookmarkItem[], targetGroupId: string, useFolders: boolean): MergePlan {
  const known = new Set(lib.favorites.map((f) => duplicateKey(f.url)));
  const groupsByName = new Map(lib.groups.map((g) => [g.name.toLowerCase(), g.id]));
  const targets = new Map<string, MergePlan['targets'][number]>();
  let skipped = 0;
  for (const item of items) {
    const key = duplicateKey(item.url);
    if (known.has(key)) {
      skipped += 1;
      continue;
    }
    known.add(key);
    const folder = useFolders ? item.folder.at(-1) ?? '' : '';
    const existing = folder ? groupsByName.get(folder.toLowerCase()) : targetGroupId;
    const mapKey = folder ? `folder:${folder.toLowerCase()}` : `group:${targetGroupId}`;
    let target = targets.get(mapKey);
    if (!target) {
      target = { groupId: existing ?? null, createName: existing ? null : folder, items: [] };
      targets.set(mapKey, target);
    }
    target.items.push(item);
  }
  const list = [...targets.values()];
  return { targets: list, added: list.reduce((n, t) => n + t.items.length, 0), skipped };
}

/** Führt einen Plan auf einer Arbeitskopie aus. */
export function applyMerge(lib: Library, plan: MergePlan, newGroupIcon: string, newGroupColor: string, now: number): number {
  // Der Plan stammt aus einem älteren Stand; beim Schreiben noch einmal auf Doppelte prüfen.
  const known = new Set(lib.favorites.map((f) => duplicateKey(f.url)));
  let added = 0;
  for (const target of plan.targets) {
    const items = target.items.filter((item) => !known.has(duplicateKey(item.url)));
    if (items.length === 0) continue;
    const existingGroup = target.groupId && lib.groups.some((g) => g.id === target.groupId) ? target.groupId : null;
    const groupId = existingGroup
      ?? (target.createName ? addGroup(lib, { name: target.createName, icon: newGroupIcon, color: newGroupColor }, now).id : defaultGroup(lib).id);
    for (const item of items) {
      known.add(duplicateKey(item.url));
      addFavorite(lib, { url: item.url, alias: item.title, groupId, source: 'import' }, now);
      added += 1;
    }
  }
  return added;
}

/** Bereitet eine Vollsicherung zum Ersetzen vor: Bilder in den Bildspeicher, Altdaten umwandeln. */
export async function prepareReplacement(
  candidate: Extract<ImportCandidate, { kind: 'backup' | 'legacy' }>,
  assets: AssetStore,
  defaultGroupName: string
): Promise<unknown> {
  if (candidate.kind === 'legacy') return convertLegacy(candidate.data, assets, defaultGroupName);
  for (const dataUrl of Object.values(candidate.backup.assets ?? {})) {
    if (typeof dataUrl === 'string') await assets.putDataUrl(dataUrl);
  }
  return candidate.backup.library;
}
