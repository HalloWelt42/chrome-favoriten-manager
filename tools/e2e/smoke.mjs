/**
 * Rauchtest: Altdaten einspielen, Neuer-Tab öffnen, Übernahme prüfen, wichtige Abläufe
 * durchklicken, Bildschirmfotos ablegen. Alles bleibt unter .test-daten.
 *
 * Aufruf: node tools/e2e/smoke.mjs [altdaten.json]
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, seedLegacy, TEST_DIR, watchErrors } from './browser.mjs';

const legacyFile = process.argv[2] ?? join(TEST_DIR, 'echt-3.1.1.json');
const shots = join(TEST_DIR, 'bilder');
mkdirSync(shots, { recursive: true });

const errors = [];
const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FEHLT'} ${name}${detail ? ` - ${detail}` : ''}`);
}

const { context, worker, url } = await launch();
try {
  const legacy = JSON.parse(readFileSync(legacyFile, 'utf8'));
  await seedLegacy(worker, legacy);

  const page = await context.newPage();
  watchErrors(page, errors);
  const started = Date.now();
  await page.goto(url('newtab/index.html'));
  await page.waitForSelector('.tile', { timeout: 30000 });
  check('Seite lädt mit Altdaten', true, `${Date.now() - started} ms`);

  const stored = await worker.evaluate(async () => {
    const { library } = await chrome.storage.local.get('library');
    const old = await chrome.storage.local.get(['favorites', 'groups', 'settings']);
    return {
      favorites: library?.favorites.length,
      groups: library?.groups.length,
      custom: library?.favorites.filter((f) => f.icon.mode === 'custom').length,
      oldFavorites: old.favorites?.length,
      bg: library?.settings.background.imageDark?.kind
    };
  });
  check('Alle Favoriten übernommen', stored.favorites === legacy.favorites.length, `${stored.favorites}/${legacy.favorites.length}`);
  check('Alle Gruppen übernommen', stored.groups === legacy.groups.length);
  check('Altdaten unangetastet', stored.oldFavorites === legacy.favorites.length);
  check('Hintergrundbild übernommen', stored.bg === 'asset');

  const tabs = await page.locator('.groupbar .tab').count();
  check('Gruppenleiste zeigt alle Gruppen', tabs === legacy.groups.length, String(tabs));
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(shots, '01-start.png') });

  // Löschen und Rückgängig
  const before = await page.locator('.tile').count();
  const firstName = await page.locator('.tile .label').first().textContent();
  await page.locator('.tile').first().hover();
  await page.locator('.tile .action.trash').first().click();
  await page.waitForSelector('.toast .action');
  await page.screenshot({ path: join(shots, '02-geloescht.png') });
  const trashBadge = await page.locator('.bottombar .badge').textContent().catch(() => '');
  check('Löschen legt in den Papierkorb', trashBadge?.trim() === '1', `Zähler ${trashBadge}`);
  await page.locator('.toast .action').click();
  await page.waitForTimeout(500);
  const afterUndo = await page.locator('.tile .label').first().textContent();
  check('Rückgängig stellt an alter Stelle wieder her', afterUndo === firstName, `${firstName} -> ${afterUndo}`);
  check('Anzahl Kacheln gleich', (await page.locator('.tile').count()) === before);

  // Suche
  await page.locator('#search-input').fill('zeit');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(shots, '03-suche.png') });
  check('Suche zeigt Treffer', (await page.locator('.dropdown li').count()) > 1);
  await page.locator('#search-input').fill('');

  // Gruppe wechseln
  await page.locator('.groupbar .tab', { hasText: 'Selfhosted' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shots, '04-selfhosted.png') });

  // Bearbeiten-Dialog
  await page.locator('.tile').first().hover();
  await page.locator('.tile .action.edit').first().click();
  await page.waitForSelector('.dialog');
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(shots, '05-bearbeiten.png') });
  await page.keyboard.press('Escape');

  // Einstellungen
  await page.locator('.bottombar .icon-btn').first().click();
  await page.waitForSelector('aside.panel');
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(shots, '06-einstellungen.png') });
  for (const [index, name] of ['raster', 'beschriftung', 'verhalten', 'icons', 'daten', 'info'].entries()) {
    await page.locator('aside.panel .tabs button').nth(index + 1).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(shots, `07-einstellungen-${name}.png`) });
  }
  await page.locator('aside.panel .close').click();

  // Verwaltung und Doppelte
  await page.locator('.bottombar .icon-btn').nth(3).click();
  await page.waitForSelector('.dialog');
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(shots, '08-verwaltung.png') });
  await page.locator('.dialog .segmented button').nth(1).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shots, '09-doppelte.png') });
  await page.keyboard.press('Escape');

  // Papierkorb und Sicherungsstände
  await page.locator('.bottombar .icon-btn').nth(4).click();
  await page.waitForSelector('.dialog');
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(shots, '10-papierkorb.png') });
  await page.locator('.dialog header .extra button').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, '11-sicherungsstaende.png') });
  const snapshotRows = await page.locator('.dialog li').count();
  check('Sicherungsstand der Altdaten vorhanden', snapshotRows >= 1, String(snapshotRows));
  await page.keyboard.press('Escape');

  // Popup
  const popup = await context.newPage();
  watchErrors(popup, errors);
  await popup.setViewportSize({ width: 380, height: 420 });
  await popup.goto(url('popup/index.html'));
  await popup.waitForTimeout(600);
  await popup.screenshot({ path: join(shots, '12-popup.png') });

  // Spendenseite
  const donate = await context.newPage();
  watchErrors(donate, errors);
  await donate.goto(url('donate/index.html'));
  await donate.waitForTimeout(400);
  await donate.screenshot({ path: join(shots, '13-spenden.png') });

  const relevant = errors.filter((e) => !e.includes('favgrid.invalid'));
  check('Keine Konsolenfehler', relevant.length === 0, relevant.slice(0, 10).join(' | '));
} catch (error) {
  console.error(error);
  check('Ablauf ohne Ausnahme', false, String(error));
} finally {
  await context.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Prüfungen bestanden`);
if (errors.length) console.log('Meldungen:\n' + errors.join('\n'));
process.exit(failed.length ? 1 : 0);
