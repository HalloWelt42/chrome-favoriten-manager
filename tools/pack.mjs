/** Packt dist/ als Store-Paket nach store/favgrid-v<version>.zip. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const dist = join(ROOT, 'dist');
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
if (manifest.key || manifest.host_permissions) {
  console.error('dist/ ist kein Produktionsbuild (key oder feste Host-Rechte gefunden). Erst npm run build.');
  process.exit(1);
}
const out = join(ROOT, 'store');
mkdirSync(out, { recursive: true });
const file = join(out, `favgrid-v${manifest.version}.zip`);
if (existsSync(file)) rmSync(file);
execFileSync('zip', ['-r', '-q', file, '.', '-x', '*.DS_Store', '-x', '*.map', '-x', 'seed.json', '-x', 'build-stamp.json'], { cwd: dist });
console.log(file);
