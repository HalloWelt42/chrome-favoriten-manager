/**
 * Sicherungsstände: vollständige Kopien der Bibliothek in IndexedDB, gzip-gepackt.
 * Entstehen automatisch (höchstens stündlich bei Änderungen), vor jedem riskanten Vorgang
 * und einmalig vor der Übernahme alter Daten.
 */
import { newId } from '../domain/ids';
import type { AssetRef, Library } from '../domain/types';
import { idbDelete, idbGet, idbGetAll, idbPut, STORES } from './idb';

export type SnapshotReason =
  | 'auto'          // regelmäßig bei Änderungen
  | 'migration'     // Rohdaten der Vorgängerfassung vor der Übernahme
  | 'before-import'
  | 'before-restore'
  | 'before-purge'  // vor endgültigem Löschen aus dem Papierkorb
  | 'before-reset'
  | 'manual';

export type SnapshotPayload = { kind: 'library'; library: Library } | { kind: 'legacy'; data: unknown };

export interface SnapshotInfo {
  id: string;
  createdAt: number;
  reason: SnapshotReason;
  favoriteCount: number;
  groupCount: number;
  trashCount: number;
  assetRefs: AssetRef[];
  bytes: number;
}

interface SnapshotRecord extends SnapshotInfo {
  data: Blob;
}

/** Abstand zwischen zwei automatischen Ständen. */
export const AUTO_SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;

/** Aufbewahrung: die letzten N automatischen Stände, dazu je Tag einer für D Tage. */
export const RETENTION = {
  recentAuto: 24,
  dailyDays: 60,
  eventDays: 60,
  eventMin: 20
} as const;

async function gzip(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

async function gunzip(blob: Blob): Promise<string> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function libraryRefs(library: Library): AssetRef[] {
  const refs = new Set<AssetRef>();
  const addIcon = (icon: Library['favorites'][number]['icon']): void => {
    if (icon.ref) refs.add(icon.ref);
    if (icon.mode === 'custom' && icon.originalRef) refs.add(icon.originalRef);
  };
  for (const f of library.favorites) addIcon(f.icon);
  for (const e of library.trash) {
    if (e.kind === 'favorite') addIcon(e.favorite.icon);
    else e.favorites.forEach((f) => addIcon(f.icon));
  }
  for (const img of [library.settings.background.imageDark, library.settings.background.imageLight]) {
    if (img?.kind === 'asset') refs.add(img.ref);
  }
  return [...refs];
}

export { libraryRefs };

export async function createSnapshot(reason: SnapshotReason, payload: SnapshotPayload, now = Date.now()): Promise<SnapshotInfo> {
  const json = JSON.stringify(payload);
  const data = await gzip(json);
  const library = payload.kind === 'library' ? payload.library : null;
  const legacy = payload.kind === 'legacy' && typeof payload.data === 'object' && payload.data !== null
    ? (payload.data as { favorites?: unknown[]; groups?: unknown[] })
    : null;
  const info: SnapshotInfo = {
    id: newId(),
    createdAt: now,
    reason,
    favoriteCount: library?.favorites.length ?? (Array.isArray(legacy?.favorites) ? legacy.favorites.length : 0),
    groupCount: library?.groups.length ?? (Array.isArray(legacy?.groups) ? legacy.groups.length : 0),
    trashCount: library?.trash.length ?? 0,
    assetRefs: library ? libraryRefs(library) : [],
    bytes: data.size
  };
  const record: SnapshotRecord = { ...info, data };
  await idbPut(STORES.snapshots, record);
  await idbPut(STORES.meta, now, lastTimeKey(reason));
  return info;
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
  const records = await idbGetAll<SnapshotRecord>(STORES.snapshots);
  return records
    .map(({ data: _data, ...info }) => info)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function readSnapshot(id: string): Promise<SnapshotPayload | null> {
  const record = await idbGet<SnapshotRecord>(STORES.snapshots, id);
  if (!record) return null;
  return JSON.parse(await gunzip(record.data)) as SnapshotPayload;
}

export async function deleteSnapshots(ids: string[]): Promise<void> {
  await idbDelete(STORES.snapshots, ids);
}

const lastTimeKey = (reason: SnapshotReason): string => `lastSnapshot:${reason}`;

export async function lastSnapshotTime(reason: SnapshotReason): Promise<number> {
  return (await idbGet<number>(STORES.meta, lastTimeKey(reason))) ?? 0;
}

/**
 * Bestimmt, welche Stände wegfallen. Der Migrationsstand bleibt immer.
 * Automatische: die neuesten N, dazu der jeweils neueste eines Tages für D Tage.
 * Ereignisstände (vor Import usw.): D Tage, mindestens aber die neuesten M.
 */
export function selectExpired(list: SnapshotInfo[], now = Date.now()): string[] {
  const day = 24 * 60 * 60 * 1000;
  const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
  const keep = new Set<string>();
  const autos = sorted.filter((s) => s.reason === 'auto');
  autos.slice(0, RETENTION.recentAuto).forEach((s) => keep.add(s.id));
  const seenDays = new Set<number>();
  for (const s of autos) {
    if (now - s.createdAt > RETENTION.dailyDays * day) continue;
    const dayKey = Math.floor(s.createdAt / day);
    if (!seenDays.has(dayKey)) {
      seenDays.add(dayKey);
      keep.add(s.id);
    }
  }
  const events = sorted.filter((s) => s.reason !== 'auto' && s.reason !== 'migration');
  events.forEach((s, i) => {
    if (i < RETENTION.eventMin || now - s.createdAt <= RETENTION.eventDays * day) keep.add(s.id);
  });
  sorted.filter((s) => s.reason === 'migration').forEach((s) => keep.add(s.id));
  return sorted.filter((s) => !keep.has(s.id)).map((s) => s.id);
}

export async function pruneSnapshots(now = Date.now()): Promise<number> {
  const expired = selectExpired(await listSnapshots(), now);
  await deleteSnapshots(expired);
  return expired.length;
}
