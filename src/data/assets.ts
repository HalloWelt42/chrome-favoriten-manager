/**
 * Bildspeicher: inhaltsadressiert (SHA-256), dadurch ohne Doppelte und gefahrlos aus
 * mehreren Tabs zugleich beschreibbar. Gelöscht wird nur über collectGarbage, und nur,
 * was weder die Bibliothek noch ein Sicherungsstand noch referenziert.
 */
import type { AssetRef } from '../domain/types';
import { idbDelete, idbGet, idbGetAllKeys, idbPut, STORES } from './idb';

interface AssetRecord {
  ref: AssetRef;
  blob: Blob;
  type: string;
  size: number;
  createdAt: number;
}

export interface AssetStore {
  putBlob(blob: Blob): Promise<AssetRef>;
  putDataUrl(dataUrl: string): Promise<AssetRef | null>;
  get(ref: AssetRef): Promise<Blob | null>;
  has(ref: AssetRef): Promise<boolean>;
  allRefs(): Promise<AssetRef[]>;
  remove(refs: AssetRef[]): Promise<void>;
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Wandelt eine Data-URL in einen Blob. Liefert null bei kaputter Eingabe. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]*)((?:;[^;,]*)*?)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const type = match[1] || 'application/octet-stream';
  const payload = match[4] ?? '';
  try {
    if (match[3]) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type });
    }
    return new Blob([decodeURIComponent(payload)], { type });
  } catch {
    return null;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export class IndexedDbAssetStore implements AssetStore {
  async putBlob(blob: Blob): Promise<AssetRef> {
    const buffer = await blob.arrayBuffer();
    const ref = await sha256Hex(buffer);
    if (!(await this.has(ref))) {
      const record: AssetRecord = {
        ref,
        blob: new Blob([buffer], { type: blob.type }),
        type: blob.type,
        size: buffer.byteLength,
        createdAt: Date.now()
      };
      await idbPut(STORES.assets, record);
    }
    return ref;
  }

  async putDataUrl(dataUrl: string): Promise<AssetRef | null> {
    const blob = dataUrlToBlob(dataUrl);
    return blob && blob.size > 0 ? this.putBlob(blob) : null;
  }

  async get(ref: AssetRef): Promise<Blob | null> {
    const record = await idbGet<AssetRecord>(STORES.assets, ref);
    return record?.blob ?? null;
  }

  async has(ref: AssetRef): Promise<boolean> {
    return (await idbGet<AssetRecord>(STORES.assets, ref)) !== undefined;
  }

  async allRefs(): Promise<AssetRef[]> {
    return (await idbGetAllKeys(STORES.assets)).map(String);
  }

  async remove(refs: AssetRef[]): Promise<void> {
    await idbDelete(STORES.assets, refs);
  }
}

export const assetStore: AssetStore = new IndexedDbAssetStore();
