/**
 * Build der Erweiterung: drei Seiten (Neuer Tab, Popup, Spenden) und der Service Worker.
 * Manifest und Sprachdateien entstehen beim Build aus version.json und src/i18n,
 * damit es für Version und Texte jeweils nur eine Quelle gibt.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type Plugin } from 'vite';
import { createManifest } from './src/manifest';
import { buildLocaleFiles } from './src/i18n/locales';

interface VersionFile {
  version: string;
  id: string;
  voll: string;
}

const root = resolve(__dirname, 'src');

function readVersion(): VersionFile {
  return JSON.parse(readFileSync(resolve(__dirname, 'version.json'), 'utf8')) as VersionFile;
}

/** Schreibt manifest.json und _locales/* in die Ausgabe. */
function extensionFiles(dev: boolean, grantSiteAccess: boolean): Plugin {
  return {
    name: 'favgrid-extension-files',
    generateBundle() {
      const version = readVersion();
      const manifest = createManifest({ version: version.version, versionName: version.voll, dev, grantSiteAccess });
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(manifest, null, 2) });
      for (const [locale, messages] of Object.entries(buildLocaleFiles())) {
        this.emitFile({ type: 'asset', fileName: `_locales/${locale}/messages.json`, source: JSON.stringify(messages, null, 2) });
      }
      if (dev) {
        // Die Seiten lesen diese Datei und laden sich bei einem neuen Build selbst neu.
        this.emitFile({ type: 'asset', fileName: 'build-stamp.json', source: JSON.stringify({ stamp: Date.now() }) });
        // Startbestand aus tools/altdaten-auslesen.mjs, nur lokal, nie im Repo.
        const seed = resolve(__dirname, '.test-daten/seed.json');
        if (existsSync(seed)) this.emitFile({ type: 'asset', fileName: 'seed.json', source: readFileSync(seed) });
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const dev = mode === 'development';
  // Nur für automatische Tests: Zugriff auf Webseiten ist dort schon bei Installation erteilt.
  const e2e = mode === 'e2e';
  return {
    root,
    publicDir: resolve(__dirname, 'public'),
    base: './',
    plugins: [svelte(), extensionFiles(dev, e2e)],
    define: {
      __DEV_BUILD__: JSON.stringify(dev)
    },
    build: {
      outDir: resolve(__dirname, dev ? 'dist-dev' : e2e ? '.test-daten/dist-e2e' : 'dist'),
      emptyOutDir: true,
      target: 'chrome120',
      sourcemap: dev,
      minify: !dev,
      modulePreload: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        input: {
          newtab: resolve(root, 'newtab/index.html'),
          popup: resolve(root, 'popup/index.html'),
          donate: resolve(root, 'donate/index.html'),
          'service-worker': resolve(root, 'background/service-worker.ts')
        },
        output: {
          entryFileNames: (chunk) => (chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js'),
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    }
  };
});
