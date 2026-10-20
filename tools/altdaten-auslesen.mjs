/**
 * Liest die Daten der installierten FavGrid-Fassung aus dem Brave-Profil (nur lesend:
 * es wird eine Kopie der Speicherdateien ausgewertet) und legt sie als JSON ab.
 *
 * Aufruf: node tools/altdaten-auslesen.mjs [ziel.json] [erweiterungs-id] [profilordner]
 * Vorgabe: .test-daten/seed.json aus der Store-Fassung im Brave-Standardprofil.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ClassicLevel } from 'classic-level';

const ROOT = resolve(import.meta.dirname, '..');
const target = resolve(process.argv[2] ?? join(ROOT, '.test-daten/seed.json'));
const extensionId = process.argv[3] ?? 'geejnpkdghbagijcpenmpaggcpbcancg';
const profile = process.argv[4] ?? join(homedir(), 'Library/Application Support/BraveSoftware/Brave-Browser/Default');
const source = join(profile, 'Local Extension Settings', extensionId);

if (!existsSync(source)) {
  console.error(`Kein Speicher gefunden: ${source}`);
  process.exit(1);
}

const copy = join(ROOT, '.test-daten', `leveldb-kopie-${Date.now()}`);
mkdirSync(dirname(target), { recursive: true });
cpSync(source, copy, { recursive: true });
rmSync(join(copy, 'LOCK'), { force: true });

const db = new ClassicLevel(copy, { keyEncoding: 'utf8', valueEncoding: 'utf8' });
const data = {};
for await (const [key, value] of db.iterator()) {
  try {
    data[key] = JSON.parse(value);
  } catch {
    data[key] = value;
  }
}
await db.close();
rmSync(copy, { recursive: true, force: true });

writeFileSync(target, JSON.stringify(data));
const favorites = Array.isArray(data.favorites) ? data.favorites.length : 0;
const groups = Array.isArray(data.groups) ? data.groups.length : 0;
console.log(`${favorites} Favoriten, ${groups} Gruppen -> ${target}`);
