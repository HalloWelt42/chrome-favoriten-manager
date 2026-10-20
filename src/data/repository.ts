/**
 * Zugriff auf die Bibliothek. Einziger Ort, der sie liest und schreibt.
 *
 * - Jede Änderung läuft über mutate(): unter einer browserweiten Sperre (Web Locks) wird
 *   der aktuelle Stand gelesen, geändert, geprüft und als Ganzes geschrieben. Dadurch
 *   gehen keine Änderungen verloren, wenn mehrere Tabs, das Popup und der Service Worker
 *   gleichzeitig schreiben.
 * - Vor riskanten Vorgängen und regelmäßig entsteht ein Sicherungsstand.
 * - Beim ersten Start werden Altdaten übernommen; vorher wird ihr Rohzustand gesichert.
 */
import type { Library } from '../domain/types';
import type { AssetStore } from './assets';
import type { KeyValueStore } from './keyValue';
import { convertLegacy, hasLegacyData, LEGACY_KEYS, type LegacyData } from './legacy';
import { normalizeLibrary } from './normalize';
import {
  AUTO_SNAPSHOT_INTERVAL_MS,
  createSnapshot,
  lastSnapshotTime,
  pruneSnapshots,
  type SnapshotPayload,
  type SnapshotReason
} from './snapshots';

export const LIBRARY_KEY = 'library';
const LOCK_NAME = 'favgrid-library';

export interface SnapshotService {
  create(reason: SnapshotReason, payload: SnapshotPayload): Promise<unknown>;
  lastTime(reason: SnapshotReason): Promise<number>;
  prune(): Promise<unknown>;
}

export const idbSnapshotService: SnapshotService = {
  create: (reason, payload) => createSnapshot(reason, payload),
  lastTime: (reason) => lastSnapshotTime(reason),
  prune: () => pruneSnapshots()
};

export type LockRunner = <T>(fn: () => Promise<T>) => Promise<T>;

/** Browserweite Sperre über Web Locks; ohne diese API eine Warteschlange je Kontext. */
export function createLock(): LockRunner {
  let chain: Promise<unknown> = Promise.resolve();
  return <T>(fn: () => Promise<T>): Promise<T> => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(LOCK_NAME, fn) as Promise<T>;
    }
    const run = chain.then(fn, fn);
    chain = run.catch(() => undefined);
    return run;
  };
}

export interface RepositoryOptions {
  kv: KeyValueStore;
  assets: AssetStore;
  snapshots: SnapshotService;
  defaultGroupName: () => string;
  now?: () => number;
  lock?: LockRunner;
}

export interface MutateOptions {
  /** Erzwingt vorher einen Sicherungsstand mit diesem Grund. */
  snapshot?: SnapshotReason;
  /** Kein automatischer Stand (z. B. für Besuchszähler). */
  quiet?: boolean;
}

export type LibraryListener = (library: Library) => void;

export class LibraryRepository {
  private readonly now: () => number;
  private readonly lock: LockRunner;

  constructor(private readonly options: RepositoryOptions) {
    this.now = options.now ?? Date.now;
    this.lock = options.lock ?? createLock();
  }

  /** Liest die Bibliothek; übernimmt beim ersten Mal Altdaten oder legt eine leere an. */
  async load(): Promise<Library> {
    const stored = await this.options.kv.get([LIBRARY_KEY]);
    if (stored[LIBRARY_KEY] !== undefined) return this.normalize(stored[LIBRARY_KEY]);
    return this.lock(() => this.loadLocked());
  }

  /** Nur unter der Sperre aufrufen (Web Locks sind nicht wiedereintrittsfähig). */
  private async loadLocked(): Promise<Library> {
    const stored = await this.options.kv.get([LIBRARY_KEY]);
    if (stored[LIBRARY_KEY] !== undefined) return this.normalize(stored[LIBRARY_KEY]);
    const legacy = (await this.options.kv.get(LEGACY_KEYS)) as LegacyData;
    let library: Library;
    if (hasLegacyData(legacy)) {
      await this.options.snapshots.create('migration', { kind: 'legacy', data: legacy });
      library = await convertLegacy(legacy, this.options.assets, this.options.defaultGroupName(), this.now());
    } else {
      library = this.normalize(undefined);
    }
    await this.options.kv.set({ [LIBRARY_KEY]: library });
    return library;
  }

  /**
   * Ändert die Bibliothek atomar. fn bekommt eine frische Arbeitskopie und darf sie direkt
   * verändern; ihr Rückgabewert wird durchgereicht.
   */
  async mutate<T>(fn: (draft: Library) => T, options: MutateOptions = {}): Promise<{ result: T; library: Library }> {
    return this.lock(async () => {
      const current = await this.loadLocked();
      await this.snapshotIfDue(current, options);
      const draft = structuredClone(current);
      const result = fn(draft);
      const library = this.normalize({ ...draft, updatedAt: this.now() });
      await this.options.kv.set({ [LIBRARY_KEY]: library });
      return { result, library };
    });
  }

  /** Ersetzt die ganze Bibliothek (Import, Wiederherstellen); vorher immer ein Sicherungsstand. */
  async replace(next: unknown, reason: SnapshotReason): Promise<Library> {
    const { library } = await this.mutate(
      (draft) => {
        const normalized = this.normalize(next);
        Object.assign(draft, normalized);
      },
      { snapshot: reason }
    );
    return library;
  }

  /** Legt sofort einen Sicherungsstand des aktuellen Zustands an. */
  async snapshotNow(reason: SnapshotReason): Promise<void> {
    const current = await this.load();
    await this.options.snapshots.create(reason, { kind: 'library', library: current });
  }

  subscribe(listener: LibraryListener): () => void {
    return this.options.kv.onChanged((changes) => {
      const change = changes[LIBRARY_KEY];
      if (change?.newValue !== undefined) listener(this.normalize(change.newValue));
    });
  }

  private normalize(raw: unknown): Library {
    return normalizeLibrary(raw, this.options.defaultGroupName(), this.now());
  }

  private async snapshotIfDue(current: Library, options: MutateOptions): Promise<void> {
    if (options.snapshot) {
      await this.options.snapshots.create(options.snapshot, { kind: 'library', library: current });
      await this.options.snapshots.prune();
      return;
    }
    if (options.quiet) return;
    const last = await this.options.snapshots.lastTime('auto');
    if (this.now() - last < AUTO_SNAPSHOT_INTERVAL_MS) return;
    await this.options.snapshots.create('auto', { kind: 'library', library: current });
    await this.options.snapshots.prune();
  }
}
