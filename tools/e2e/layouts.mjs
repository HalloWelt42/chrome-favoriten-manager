/** Bildschirmfotos in mehreren Fenstergrößen, dunkel und hell, mit echten Daten. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, seedLegacy, TEST_DIR, watchErrors } from './browser.mjs';

const SIZES = [[1920, 1080], [1280, 800], [900, 700]];
const errors = [];
const { context, worker, url } = await launch();
await seedLegacy(worker, JSON.parse(readFileSync(join(TEST_DIR, 'echt-3.1.1.json'), 'utf8')));
const page = await context.newPage();
watchErrors(page, errors);
await page.goto(url('newtab/index.html'));
await page.waitForSelector('.tile');
let overflow = [];
for (const theme of ['dark', 'light']) {
  if (theme === 'light') {
    await page.locator('.bottombar .icon-btn').nth(2).click();
    await page.waitForTimeout(600);
  }
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(TEST_DIR, 'bilder', `40-${theme}-${w}.png`) });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
    if (wide) overflow.push(`${theme} ${w}`);
    await page.locator('.bottombar .icon-btn').first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(TEST_DIR, 'bilder', `41-${theme}-${w}-einstellungen.png`) });
    await page.locator('aside.panel .close').click();
  }
}
console.log(overflow.length ? `Überlauf: ${overflow.join(', ')}` : 'Kein Überlauf');
console.log(errors.filter((e) => !/Failed to load/.test(e)).join('\n') || 'Keine Fehler');
await context.close();
