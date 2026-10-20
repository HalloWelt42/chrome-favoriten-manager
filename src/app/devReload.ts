/**
 * Nur im Entwicklungsbuild: lädt die Seite neu, sobald ein neuer Build fertig ist.
 * Änderungen am Service Worker brauchen weiterhin ein Neuladen der Erweiterung.
 * Liest dazu die Datei build-stamp.json, die der Build bei jedem Durchlauf neu schreibt.
 */
declare const __DEV_BUILD__: boolean;

const INTERVAL_MS = 1000;

export function startDevReload(): void {
  if (!__DEV_BUILD__) return;
  let known: number | null = null;
  setInterval(async () => {
    try {
      const response = await fetch(chrome.runtime.getURL('build-stamp.json'), { cache: 'no-store' });
      const { stamp } = (await response.json()) as { stamp: number };
      if (known === null) known = stamp;
      else if (stamp !== known) location.reload();
    } catch {
      // Während des Schreibens kann die Datei kurz fehlen.
    }
  }, INTERVAL_MS);
}
