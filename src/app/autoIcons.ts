/**
 * Automatische Icon-Suche im Hintergrund der Neuer-Tab-Seite.
 * Arbeitet nur Favoriten ab, die kein eigenes Icon haben, wenige gleichzeitig, und schreibt
 * Ergebnisse gesammelt in einem Rutsch. Ein selbst gewähltes Icon wird nie überschrieben.
 */
import { applyAutoIcon } from '../domain/library';
import type { Favorite, IconChoice, IconOrigin } from '../domain/types';
import { shrinkForStorage } from '../icons/imageOps';
import { hasSiteAccess } from '../icons/permissions';
import { findBestIcon } from '../icons/resolver';
import { assetStore, repository } from './services';

const CONCURRENCY = 4;
const FLUSH_DELAY_MS = 1200;
/** Ohne Fund wird frühestens nach dieser Zeit erneut gesucht. */
export const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

type AutoIcon = Extract<IconChoice, { mode: 'auto' }>;

export interface AutoIconOptions {
  allowServices: boolean;
}

export function needsAutoIcon(fav: Favorite, now = Date.now()): boolean {
  if (fav.icon.mode !== 'auto' || fav.icon.ref) return false;
  return fav.icon.checkedAt === null || now - fav.icon.checkedAt > RETRY_AFTER_MS;
}

/** Sucht ein Icon für eine Adresse und legt es im Bildspeicher ab. */
export async function resolveAutoIcon(url: string, options: AutoIconOptions, signal: AbortSignal): Promise<AutoIcon> {
  const best = await findBestIcon({
    pageUrl: url,
    canFetchSites: await hasSiteAccess(),
    allowServices: options.allowServices,
    signal
  });
  if (!best) return { mode: 'auto', ref: null, origin: null, checkedAt: Date.now() };
  const ref = await assetStore.putBlob(await shrinkForStorage(best.blob, best.vector));
  return { mode: 'auto', ref, origin: best.candidate.origin as IconOrigin, checkedAt: Date.now() };
}

export class AutoIconQueue {
  private readonly waiting = new Map<string, Favorite>();
  private readonly running = new Set<string>();
  private readonly results = new Map<string, { url: string; icon: AutoIcon }>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly abort = new AbortController();
  private progressListener: ((pending: number) => void) | null = null;

  constructor(private readonly options: () => AutoIconOptions) {}

  /** Nimmt Favoriten auf; vorn stehende werden zuerst bearbeitet. force sucht auch bei vorhandenem Ergebnis. */
  enqueue(favorites: readonly Favorite[], force = false): void {
    for (const fav of favorites) {
      if (this.running.has(fav.id) || this.waiting.has(fav.id)) continue;
      if (fav.icon.mode !== 'auto') continue;
      if (!force && !needsAutoIcon(fav)) continue;
      this.waiting.set(fav.id, fav);
    }
    this.pump();
  }

  get pending(): number {
    return this.waiting.size + this.running.size;
  }

  onProgress(listener: (pending: number) => void): void {
    this.progressListener = listener;
  }

  dispose(): void {
    this.abort.abort();
    this.waiting.clear();
  }

  private pump(): void {
    this.progressListener?.(this.pending);
    while (this.running.size < CONCURRENCY && this.waiting.size > 0) {
      const [id, fav] = this.waiting.entries().next().value as [string, Favorite];
      this.waiting.delete(id);
      this.running.add(id);
      void this.work(fav).finally(() => {
        this.running.delete(id);
        this.pump();
      });
    }
  }

  private async work(fav: Favorite): Promise<void> {
    if (this.abort.signal.aborted) return;
    try {
      const icon = await resolveAutoIcon(fav.url, this.options(), this.abort.signal);
      this.results.set(fav.id, { url: fav.url, icon });
      this.scheduleFlush();
    } catch {
      // Einzelne Fehlschläge stören die übrigen nicht.
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, FLUSH_DELAY_MS);
  }

  private async flush(): Promise<void> {
    if (this.results.size === 0) return;
    const batch = new Map(this.results);
    this.results.clear();
    await repository.mutate((draft) => {
      for (const [id, { url, icon }] of batch) applyAutoIcon(draft, id, url, icon);
    }, { quiet: true });
  }
}
