/**
 * Startet ein Test-Chromium mit der gebauten Erweiterung in einem Profil unter .test-daten.
 * Liefert Kontext, Erweiterungs-ID und Hilfen zum Einspielen von Altdaten.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = resolve(import.meta.dirname, '../..');
export const TEST_DIR = join(ROOT, '.test-daten');

function findChromium() {
  if (process.env.FAVGRID_CHROMIUM) return process.env.FAVGRID_CHROMIUM;
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  const dirs = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const dir of dirs) {
    const app = join(cache, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    if (existsSync(app)) return app;
  }
  throw new Error('Kein Test-Chromium gefunden (FAVGRID_CHROMIUM setzen)');
}

export async function launch({ dist = join(ROOT, 'dist'), fresh = true, headless = true } = {}) {
  const profile = join(TEST_DIR, 'profil');
  if (fresh) rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: findChromium(),
    headless: false,
    viewport: { width: 1600, height: 950 },
    args: [
      ...(headless ? ['--headless=new'] : []),
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--lang=de-DE'
    ]
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  return { context, worker, extensionId, url: (path) => `chrome-extension://${extensionId}/${path}` };
}

/** Ersetzt den Speicher der Erweiterung durch Altdaten (wie FavGrid 3.1.1 sie hinterlässt). */
export async function seedLegacy(worker, legacy) {
  await worker.evaluate(async (data) => {
    await chrome.storage.local.clear();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('favgrid');
      req.onsuccess = req.onerror = req.onblocked = () => resolve(undefined);
    });
    await chrome.storage.local.set(data);
  }, legacy);
}

/** Sammelt Konsolenfehler, Ausnahmen und fehlgeschlagene Anfragen einer Seite. */
export function watchErrors(page, sink) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') sink.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => sink.push(`[ausnahme] ${err.message}`));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.startsWith('chrome-extension://')) sink.push(`[anfrage] ${url} ${req.failure()?.errorText}`);
  });
}
