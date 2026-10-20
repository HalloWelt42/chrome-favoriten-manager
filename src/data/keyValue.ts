/** Schnittstelle zum Schlüssel-Wert-Speicher; im Betrieb chrome.storage.local. */

export type ChangeListener = (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void;

export interface KeyValueStore {
  get(keys: readonly string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  onChanged(listener: ChangeListener): () => void;
}

export const chromeLocalStore: KeyValueStore = {
  get: (keys) => chrome.storage.local.get([...keys]),
  set: (items) => chrome.storage.local.set(items),
  onChanged(listener) {
    const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      if (area === 'local') listener(changes);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }
};

/** Speicher im Arbeitsspeicher für Tests. */
export function memoryStore(initial: Record<string, unknown> = {}): KeyValueStore {
  const data = new Map(Object.entries(structuredClone(initial)));
  const listeners = new Set<ChangeListener>();
  return {
    async get(keys) {
      const out: Record<string, unknown> = {};
      for (const k of keys) if (data.has(k)) out[k] = structuredClone(data.get(k));
      return out;
    },
    async set(items) {
      const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: data.get(k), newValue: structuredClone(v) };
        data.set(k, structuredClone(v));
      }
      listeners.forEach((l) => l(changes));
    },
    onChanged(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
