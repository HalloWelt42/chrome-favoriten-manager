/** Prüft den Entwicklungsbuild: frisches Profil, Startbestand wird von selbst übernommen. */
import { join, resolve } from 'node:path';
import { launch, watchErrors } from './browser.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const errors = [];
const { context, worker, url } = await launch({ dist: join(ROOT, 'dist-dev') });
let ok = false;
try {
  const page = await context.newPage();
  watchErrors(page, errors);
  await page.goto(url('newtab/index.html'));
  await page.waitForSelector('.tile', { timeout: 30000 });
  const lib = await worker.evaluate(async () => (await chrome.storage.local.get('library')).library);
  const name = await worker.evaluate(() => chrome.runtime.getManifest().name);
  console.log(`Name: ${name}, Favoriten: ${lib?.favorites.length}, Gruppen: ${lib?.groups.length}`);
  ok = lib?.favorites.length > 3000 && errors.filter((e) => !/Failed to load resource/.test(e)).length === 0;
} finally {
  await context.close();
}
if (errors.length) console.log(errors.join('\n'));
console.log(ok ? 'OK   Startbestand übernommen' : 'FEHLT Startbestand');
process.exit(ok ? 0 : 1);
