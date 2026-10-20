/**
 * Ablauftests bis zum Schreiben: Hinzufügen, Icon wählen, Gruppe löschen und
 * wiederherstellen, Umsortieren, Einstellungen dauerhaft, Sicherungsstand zurückholen,
 * Adressliste einspielen, Papierkorb leeren, zweiter Tab sieht Änderungen live.
 *
 * Vorher: npx vite build --mode e2e   Aufruf: node tools/e2e/flows.mjs
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { launch, seedLegacy, TEST_DIR, watchErrors } from './browser.mjs';

const svg = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${color}"/></svg>`;
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<html><head><title>Testdienst</title><meta name="description" content="Ein Dienst zum Testen"><link rel="icon" href="/a.svg"><link rel="apple-touch-icon" href="/b.svg"></head></html>');
  } else if (path === '/a.svg' || path === '/b.svg') {
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    res.end(svg(path === '/a.svg' ? '#e53935' : '#1e88e5'));
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(41010, '127.0.0.1');
const SITE = 'http://127.0.0.1:41010/';

const checks = [];
const errors = [];
function check(name, ok, detail = '') {
  checks.push(ok);
  console.log(`${ok ? 'OK  ' : 'FEHLT'} ${name}${detail ? ` - ${detail}` : ''}`);
}

const { context, worker, url } = await launch({ dist: join(TEST_DIR, 'dist-e2e') });
const lib = () => worker.evaluate(async () => (await chrome.storage.local.get('library')).library);
const shot = (page, name) => page.screenshot({ path: join(TEST_DIR, 'bilder', `${name}.png`) });

try {
  await seedLegacy(worker, JSON.parse(readFileSync(join(TEST_DIR, 'echt-3.1.1.json'), 'utf8')));
  const page = await context.newPage();
  watchErrors(page, errors);
  await page.goto(url('newtab/index.html'));
  await page.waitForSelector('.tile');
  await page.locator('.hint-bar button', { hasText: 'Nicht jetzt' }).click().catch(() => undefined);

  // Neu laden: wie schnell steht die Seite ohne Übernahme?
  const t0 = Date.now();
  await page.reload();
  await page.waitForSelector('.tile');
  check('Neuladen mit 3138 Favoriten schnell', Date.now() - t0 < 1500, `${Date.now() - t0} ms`);

  // Zweiter Tab für Live-Abgleich
  const other = await context.newPage();
  watchErrors(other, errors);
  await other.goto(url('newtab/index.html'));
  await other.waitForSelector('.tile');

  // 1. Hinzufügen mit Titel und Icon von der Seite
  await page.locator('.groupbar .tab', { hasText: 'Zeitz' }).click();
  await page.locator('.grid .add').click();
  await page.locator('.dialog input[type=text]').first().fill(SITE);
  await page.locator('.dialog input[type=text]').nth(1).click();
  await page.waitForTimeout(800);
  const autoName = await page.locator('.dialog input[type=text]').nth(1).inputValue();
  check('Name wird von der Seite geholt', autoName === 'Testdienst', autoName);
  await page.locator('.dialog footer button', { hasText: 'Speichern' }).click();
  await page.waitForTimeout(2500);
  let data = await lib();
  const added = data.favorites.find((f) => f.url === SITE);
  check('Favorit gespeichert', !!added);
  check('Icon automatisch gefunden', !!added?.icon.ref, added?.icon.origin ?? '');
  check('Zweiter Tab sieht neuen Favoriten', (await other.locator('.groupbar .tab', { hasText: 'Zeitz' }).locator('.count').textContent()) === '2');

  // 2. Icon im Dialog wählen
  const tile = page.locator('.tile', { hasText: 'Testdienst' });
  await tile.hover();
  await tile.locator('.action.edit').click();
  await page.locator('.dialog button', { hasText: 'Icons suchen' }).click();
  await page.waitForSelector('.candidate');
  const candidates = await page.locator('.candidate').count();
  check('Icon-Galerie zeigt Kandidaten', candidates >= 2, String(candidates));
  await shot(page, '30-icon-galerie');
  await page.locator('.candidate').nth(1).click();
  await page.locator('.dialog footer button', { hasText: 'Speichern' }).click();
  await page.waitForTimeout(500);
  data = await lib();
  const chosen = data.favorites.find((f) => f.url === SITE);
  check('Gewähltes Icon ist eigenes Icon', chosen?.icon.mode === 'custom' && chosen.icon.ref !== added?.icon.ref);

  // 3. Gruppe anlegen, Favorit hinein, Gruppe in den Papierkorb, wiederherstellen
  await page.locator('.groupbar > .icon-btn').last().click();
  await page.locator('.dialog input[type=text]').fill('Testgruppe');
  await page.locator('.dialog footer button', { hasText: 'Speichern' }).click();
  await page.waitForTimeout(400);
  await page.locator('.groupbar .tab', { hasText: 'Zeitz' }).click();
  await page.locator('.tile', { hasText: 'Testdienst' }).click({ button: 'right' });
  await page.locator('.menu button', { hasText: 'Verschieben nach' }).hover();
  await page.locator('.menu.sub button', { hasText: 'Testgruppe' }).click();
  await page.waitForTimeout(400);
  data = await lib();
  const group = data.groups.find((g) => g.name === 'Testgruppe');
  check('Favorit verschoben', data.favorites.find((f) => f.url === SITE)?.groupId === group?.id);
  await page.locator('.groupbar .tab', { hasText: 'Testgruppe' }).click({ button: 'right' });
  await page.locator('.menu button', { hasText: 'Gruppe in den Papierkorb' }).click();
  await page.locator('.dialog footer button', { hasText: 'Gruppe in den Papierkorb' }).click();
  await page.waitForTimeout(400);
  data = await lib();
  check('Gruppe samt Favorit im Papierkorb', !data.groups.some((g) => g.name === 'Testgruppe') && data.trash.some((e) => e.kind === 'group' && e.favorites.length === 1));
  await page.locator('.bottombar .icon-btn').nth(4).click();
  await page.locator('.dialog li button', { hasText: 'Wiederherstellen' }).first().click();
  await page.waitForTimeout(400);
  data = await lib();
  const back = data.groups.find((g) => g.name === 'Testgruppe');
  check('Gruppe mit Favorit wiederhergestellt', !!back && data.favorites.some((f) => f.url === SITE && f.groupId === back.id));
  await page.keyboard.press('Escape');

  // 4. Umsortieren per Ziehen (eigene Reihenfolge)
  await page.locator('.groupbar .tab', { hasText: 'Selfhosted' }).click();
  await page.waitForTimeout(300);
  const before = await page.locator('.tile .label').allTextContents();
  await page.locator('.tile').nth(0).dragTo(page.locator('.tile').nth(2));
  await page.waitForTimeout(500);
  const after = await page.locator('.tile .label').allTextContents();
  check('Ziehen sortiert um', after[2] === before[0] && after[0] === before[1], `${before.slice(0, 3)} -> ${after.slice(0, 3)}`);

  // 5. Einstellung bleibt nach Neuladen
  await page.locator('.bottombar .icon-btn').first().click();
  await page.locator('aside.panel .tabs button', { hasText: 'Raster' }).click();
  const slider = page.locator('aside.panel input[type=range]').first();
  await slider.fill('7');
  await page.locator('aside.panel .close').click();
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForSelector('.tile');
  data = await lib();
  check('Spaltenzahl gespeichert', data.settings.grid.columns === 7, String(data.settings.grid.columns));

  // 6. Sicherungsstand zurückholen
  const countBefore = data.favorites.length;
  await page.locator('.bottombar .icon-btn').nth(4).click();
  await page.locator('.dialog header .extra button').click();
  await page.locator('.dialog footer button', { hasText: 'Jetzt sichern' }).click();
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.locator('.tile').first().hover();
  await page.locator('.tile .action.trash').first().click();
  await page.waitForTimeout(300);
  check('Favorit gelöscht', (await lib()).favorites.length === countBefore - 1);
  await page.locator('.bottombar .icon-btn').nth(4).click();
  await page.locator('.dialog header .extra button').click();
  await page.waitForTimeout(400);
  await page.locator('.dialog li', { hasText: 'Von Hand' }).locator('button').click();
  await page.locator('.dialog li button', { hasText: 'Ja, zurückholen' }).click();
  await page.waitForTimeout(800);
  data = await lib();
  check('Sicherungsstand zurückgeholt', data.favorites.length === countBefore, `${data.favorites.length}/${countBefore}`);
  await page.keyboard.press('Escape');

  // 7. Adressliste einspielen
  await page.locator('.bottombar .icon-btn').first().click();
  await page.locator('aside.panel .tabs button', { hasText: 'Daten' }).click();
  await page.locator('aside.panel textarea').fill(`https://example.org/neu-eins\nhttps://example.org/neu-zwei\n${SITE}\nkeine adresse`);
  await page.locator('aside.panel button', { hasText: 'Prüfen' }).click();
  const summary = await page.locator('aside.panel .preview').textContent();
  check('Vorschau zählt neu und doppelt', /2 neu, 1 schon vorhanden/.test(summary ?? ''), summary?.slice(0, 90));
  await page.locator('aside.panel .preview button', { hasText: 'Ergänzen' }).click();
  await page.waitForTimeout(500);
  data = await lib();
  check('Adressen ergänzt', data.favorites.filter((f) => f.url.startsWith('https://example.org/neu-')).length === 2);
  await page.locator('aside.panel .close').click();

  // 8. Papierkorb endgültig leeren (mit Bestätigung)
  await page.locator('.tile').first().hover();
  await page.locator('.tile .action.trash').first().click();
  await page.locator('.bottombar .icon-btn').nth(4).click();
  await page.locator('.dialog footer button', { hasText: 'Papierkorb leeren' }).click();
  await shot(page, '31-papierkorb-leeren');
  await page.locator('.dialog .confirm button', { hasText: 'Endgültig entfernen' }).click();
  await page.waitForTimeout(500);
  data = await lib();
  check('Papierkorb leer', data.trash.length === 0);
  const snaps = await page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open('favgrid'); q.onsuccess = () => r(q.result); });
    return new Promise((r) => { const q = db.transaction('snapshots').objectStore('snapshots').getAll(); q.onsuccess = () => r(q.result.map((s) => s.reason)); });
  });
  check('Vorher Sicherungsstand angelegt', snaps.includes('before-purge'), snaps.join(','));

  const relevant = errors.filter((e) => !/Failed to load resource|favgrid\.invalid/.test(e));
  check('Keine Konsolenfehler', relevant.length === 0, relevant.slice(0, 5).join(' | '));
} catch (error) {
  console.error(String(error).split('\n').slice(0, 4).join(' / '));
  await shot(context.pages().at(-2) ?? context.pages()[0], 'flows-fehler').catch(() => undefined);
  console.log('Meldungen:\n' + errors.filter((e) => !/Failed to load resource/.test(e)).join('\n'));
  checks.push(false);
} finally {
  await context.close();
  server.close();
}
const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
