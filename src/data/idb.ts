/**
 * Schmale Promise-Hülle um IndexedDB. Eine Datenbank für Bilder und Sicherungsstände;
 * beide Speicher sind von Seiten und Service Worker der Erweiterung aus erreichbar.
 */

const DB_NAME = 'favgrid';
const DB_VERSION = 1;

export const STORES = {
  assets: 'assets',
  snapshots: 'snapshots',
  meta: 'meta'
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.assets)) db.createObjectStore(STORES.assets, { keyPath: 'ref' });
      if (!db.objectStoreNames.contains(STORES.snapshots)) {
        const store = db.createObjectStore(STORES.snapshots, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  return promisify<T | undefined>(db.transaction(store).objectStore(store).get(key));
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return promisify<T[]>(db.transaction(store).objectStore(store).getAll());
}

export async function idbGetAllKeys(store: StoreName): Promise<IDBValidKey[]> {
  const db = await openDatabase();
  return promisify(db.transaction(store).objectStore(store).getAllKeys());
}

export async function idbPut(store: StoreName, value: unknown, key?: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value, key);
  await transactionDone(tx);
}

export async function idbDelete(store: StoreName, keys: IDBValidKey[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const key of keys) objectStore.delete(key);
  await transactionDone(tx);
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
  });
}
