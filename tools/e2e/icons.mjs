/**
 * Test der Icon-Suche gegen lokale Server: gleiche IP, verschiedene Ports und Unterpfade,
 * Manifest-Icons, nur /favicon.ico, gar kein Icon. Jeder Dienst muss sein eigenes Icon bekommen.
 *
 * Vorher: npx vite build --mode e2e   Aufruf: node tools/e2e/icons.mjs
 */
import { createServer } from 'node:http';
import { crc32, deflateSync } from 'node:zlib';
import { join } from 'node:path';
import { launch, TEST_DIR, watchErrors } from './browser.mjs';

const svg = (color, letter) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${color}"/><text x="32" y="44" font-size="36" text-anchor="middle" fill="#fff">${letter}</text></svg>`;

/** 64x64 PNG in einer Farbe, ohne Bibliotheken erzeugt. */
function png(r, g, b) {
  const width = 64;
  const raw = Buffer.alloc((width * 3 + 1) * width);
  for (let y = 0; y < width; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) raw.set([r, g, b], y * (width * 3 + 1) + 1 + x * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(width, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Seiten je Port: Pfad -> [Inhaltstyp, Inhalt] */
const SITES = {
  // Port A: zwei Dienste unter Unterpfaden mit relativen Icon-Pfaden
  41001: {
    '/app1/': ['text/html', '<html><head><title>App Eins</title><link rel="icon" href="icon.svg"></head><body></body></html>'],
    '/app1/icon.svg': ['image/svg+xml', svg('#e53935', 'A')],
    '/app2/': ['text/html', '<html><head><title>App Zwei</title><link rel="icon" href="./icon.svg"></head><body></body></html>'],
    '/app2/icon.svg': ['image/svg+xml', svg('#43a047', 'B')],
    '/favicon.ico': ['image/png', png(120, 120, 120)]
  },
  // Port B: nur Manifest
  41002: {
    '/': ['text/html', '<html><head><title>Mit Manifest</title><link rel="manifest" href="/site.webmanifest"></head><body></body></html>'],
    '/site.webmanifest': ['application/json', JSON.stringify({ icons: [{ src: 'icons/192.png', sizes: '192x192', type: 'image/png' }] })],
    '/icons/192.png': ['image/png', png(30, 136, 229)]
  },
  // Port C: nur /favicon.ico, Seite ohne Angaben
  41003: {
    '/': ['text/html', '<html><head><title>Nur Favicon</title></head><body></body></html>'],
    '/favicon.ico': ['image/png', png(251, 140, 0)]
  },
  // Port D: gar nichts
  41004: {
    '/': ['text/html', '<html><head><title>Ohne Icon</title></head><body></body></html>']
  },
  // Port E: Weiterleitung, Icon relativ zur Zielseite
  41005: {
    '/': ['redirect', '/start/index.html'],
    '/start/index.html': ['text/html', '<html><head><link rel="apple-touch-icon" sizes="180x180" href="touch.png"></head></html>'],
    '/start/touch.png': ['image/png', png(142, 36, 170)]
  }
};

const servers = Object.entries(SITES).map(([port, routes]) => {
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    const route = routes[path];
    if (!route) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('nicht da');
      return;
    }
    if (route[0] === 'redirect') {
      res.writeHead(302, { location: route[1] });
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': route[0] });
    res.end(route[1]);
  });
  server.listen(Number(port), '127.0.0.1');
  return server;
});

const CASES = [
  { url: 'http://127.0.0.1:41001/app1/', expect: 'own', name: 'Unterpfad 1' },
  { url: 'http://127.0.0.1:41001/app2/', expect: 'own', name: 'Unterpfad 2' },
  { url: 'http://127.0.0.1:41002/', expect: 'own', name: 'Manifest' },
  { url: 'http://127.0.0.1:41003/', expect: 'own', name: 'Nur favicon.ico' },
  { url: 'http://127.0.0.1:41004/', expect: 'none', name: 'Ohne Icon' },
  { url: 'http://127.0.0.1:41005/', expect: 'own', name: 'Weiterleitung' }
];

const checks = [];
const errors = [];
const { context, worker, url } = await launch({ dist: join(TEST_DIR, 'dist-e2e') });
try {
  // Bibliothek mit den Testfällen anlegen
  await worker.evaluate(async (cases) => {
    await chrome.storage.local.clear();
    const now = Date.now();
    await chrome.storage.local.set({
      library: {
        schemaVersion: 4,
        groups: [{ id: 'default', name: 'Test', icon: '⭐', color: '#7f5af0', position: 0, isDefault: true, createdAt: now, updatedAt: now }],
        favorites: cases.map((c, i) => ({
          id: `f${i}`, url: c.url, alias: c.name, description: '', tags: [], groupId: 'default', position: i,
          icon: { mode: 'auto', ref: null, origin: null, checkedAt: null }, source: 'manual',
          createdAt: now, updatedAt: now, visitCount: 0, lastVisited: null
        })),
        trash: [],
        settings: {},
        updatedAt: now
      }
    });
  }, CASES);

  const page = await context.newPage();
  watchErrors(page, errors);
  await page.goto(url('newtab/index.html'));
  // Warten, bis die Suche alle Fälle bearbeitet hat
  let library;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    library = await worker.evaluate(async () => (await chrome.storage.local.get('library')).library);
    if (library.favorites.every((f) => f.icon.checkedAt)) break;
  }
  await page.screenshot({ path: join(TEST_DIR, 'bilder', '20-icons.png') });

  const hashes = await page.evaluate(async (refs) => {
    const out = {};
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('favgrid');
      r.onsuccess = () => resolve(r.result);
    });
    for (const ref of refs) {
      const rec = await new Promise((resolve) => {
        const req = db.transaction('assets').objectStore('assets').get(ref);
        req.onsuccess = () => resolve(req.result);
      });
      out[ref] = rec ? rec.type : null;
    }
    return out;
  }, library.favorites.map((f) => f.icon.ref).filter(Boolean));

  const refs = new Map();
  for (const [i, c] of CASES.entries()) {
    const fav = library.favorites.find((f) => f.id === `f${i}`);
    const ok = c.expect === 'none' ? fav.icon.ref === null && fav.icon.checkedAt !== null : !!fav.icon.ref;
    checks.push(ok);
    console.log(`${ok ? 'OK  ' : 'FEHLT'} ${c.name}: ${fav.icon.ref ? `${fav.icon.origin} ${hashes[fav.icon.ref]}` : 'kein Icon'}`);
    if (fav.icon.ref) refs.set(c.name, fav.icon.ref);
  }
  const distinct = new Set(refs.values()).size === refs.size;
  checks.push(distinct);
  console.log(`${distinct ? 'OK  ' : 'FEHLT'} Jeder Dienst hat ein eigenes Icon (${new Set(refs.values()).size}/${refs.size})`);
  const relevant = errors.filter((e) => !/Failed to load resource|favgrid\.invalid/.test(e));
  checks.push(relevant.length === 0);
  console.log(`${relevant.length === 0 ? 'OK  ' : 'FEHLT'} Keine Konsolenfehler ${relevant.join(' | ')}`);
} finally {
  await context.close();
  servers.forEach((s) => s.close());
}
const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
