/**
 * Nur im Entwicklungsbuild: Ist der Speicher der Dev-Fassung noch leer, werden die mit
 * tools/altdaten-auslesen.mjs gewonnenen Altdaten eingespielt. Danach läuft dieselbe
 * Übernahme wie beim echten Update von 3.x.
 */
import { LIBRARY_KEY } from '../data/repository';
import { LEGACY_KEYS } from '../data/legacy';

declare const __DEV_BUILD__: boolean;

export async function seedDevStorage(): Promise<void> {
  if (!__DEV_BUILD__) return;
  const present = await chrome.storage.local.get([LIBRARY_KEY, ...LEGACY_KEYS]);
  if (Object.keys(present).length > 0) return;
  try {
    const response = await fetch(chrome.runtime.getURL('seed.json'));
    if (!response.ok) return;
    const seed = (await response.json()) as Record<string, unknown>;
    const legacy = Object.fromEntries(LEGACY_KEYS.filter((k) => seed[k] !== undefined).map((k) => [k, seed[k]]));
    await chrome.storage.local.set(legacy);
    console.log('[FavGrid] Startbestand für die Entwicklung eingespielt');
  } catch {
    // Ohne Startbestand beginnt die Dev-Fassung leer.
  }
}
