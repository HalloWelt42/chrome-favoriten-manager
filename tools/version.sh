#!/usr/bin/env bash
# Zählt die Version in version.json hoch und vergibt eine neue Build-ID.
# Aufruf: tools/version.sh [patch|minor|major|id]
set -euo pipefail
cd "$(dirname "$0")/.."
art="${1:-patch}"
node - "$art" <<'JS'
const fs = require('fs');
const art = process.argv[2];
const v = JSON.parse(fs.readFileSync('version.json', 'utf8'));
let [major, minor, patch] = v.version.split('.').map(Number);
if (art === 'major') { major += 1; minor = 0; patch = 0; }
else if (art === 'minor') { minor += 1; patch = 0; }
else if (art === 'patch') { patch += 1; }
else if (art !== 'id') { console.error('Unbekannte Art: ' + art); process.exit(1); }
const id = require('crypto').randomBytes(3).toString('hex');
const version = `${major}.${minor}.${patch}`;
fs.writeFileSync('version.json', JSON.stringify({ version, id, voll: `v${version}-${id}` }, null, 2) + '\n');
console.log(`v${version}-${id}`);
JS
