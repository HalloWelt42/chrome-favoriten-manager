/**
 * Liefert für Bildverweise eine anzeigbare Objekt-Adresse. Reaktiv: solange das Bild noch
 * geladen wird, kommt null, danach die Adresse. Jeder Verweis wird nur einmal geladen.
 */
import { SvelteMap } from 'svelte/reactivity';
import { assetStore } from '../data/assets';
import type { AssetRef } from '../domain/types';

class AssetUrlCache {
  private readonly urls = new SvelteMap<AssetRef, string | false>();
  private readonly loading = new Set<AssetRef>();

  /** Adresse des Bildes, null solange es lädt, false wenn es fehlt. */
  url(ref: AssetRef | null | undefined): string | null | false {
    if (!ref) return false;
    const known = this.urls.get(ref);
    if (known !== undefined) return known;
    if (!this.loading.has(ref)) {
      this.loading.add(ref);
      void assetStore.get(ref).then((blob) => {
        this.urls.set(ref, blob ? URL.createObjectURL(blob) : false);
        this.loading.delete(ref);
      });
    }
    return null;
  }
}

export const assetUrls = new AssetUrlCache();
