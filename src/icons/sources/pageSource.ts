/**
 * Liest die Seite selbst: link rel=icon / apple-touch-icon / mask-icon, das Web-App-Manifest
 * und msapplication-TileImage. Relative Pfade werden gegen die tatsächlich geladene Adresse
 * aufgelöst, damit Dienste unter Unterpfaden oder Ports ihr eigenes Icon bekommen.
 */
import { fetchWithTimeout, readTextLimited, resolveAgainst } from '../net';
import type { DiscoveryContext, IconCandidate, IconSource } from '../types';

const PAGE_TIMEOUT_MS = 6000;
const MANIFEST_TIMEOUT_MS = 4000;
const MAX_HTML_BYTES = 512 * 1024;

export function parseSizes(sizes: string | null | undefined): number | 'any' {
  if (!sizes) return 0;
  if (/\bany\b/i.test(sizes)) return 'any';
  let best = 0;
  for (const match of sizes.matchAll(/(\d+)\s*x\s*(\d+)/gi)) {
    best = Math.max(best, Math.min(Number(match[1]), Number(match[2])));
  }
  return best;
}

/** Wertet das HTML aus; exportiert für Tests. */
export function iconsFromHtml(html: string, baseUrl: string): { candidates: IconCandidate[]; manifestUrl: string | null } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const base = resolveAgainst(doc.querySelector('base[href]')?.getAttribute('href') ?? '', baseUrl) ?? baseUrl;
  const candidates: IconCandidate[] = [];

  for (const link of Array.from(doc.querySelectorAll('link[rel][href]'))) {
    const rel = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
    const href = link.getAttribute('href') ?? '';
    const url = resolveAgainst(href, base);
    if (!url) continue;
    const type = (link.getAttribute('type') ?? '').toLowerCase();
    const isSvg = type.includes('svg') || /\.svg(\?|#|$)/i.test(url);
    const sizes = parseSizes(link.getAttribute('sizes'));
    if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) {
      candidates.push({ url, origin: 'page', label: `apple-touch-icon${sizes ? ` ${sizes}` : ''}`, declaredSize: sizes || 180 });
    } else if (rel.includes('icon') || rel.includes('shortcut')) {
      candidates.push({ url, origin: 'page', label: isSvg ? 'SVG' : `icon${sizes ? ` ${sizes}` : ''}`, declaredSize: isSvg ? 'any' : sizes });
    } else if (rel.includes('mask-icon')) {
      // Einfarbige Silhouette: nur als letzte Wahl.
      candidates.push({ url, origin: 'page', label: 'mask-icon', declaredSize: 1 });
    }
  }

  const tile = doc.querySelector('meta[name="msapplication-TileImage" i]')?.getAttribute('content');
  const tileUrl = tile ? resolveAgainst(tile, base) : null;
  if (tileUrl) candidates.push({ url: tileUrl, origin: 'page', label: 'tile', declaredSize: 144 });

  const manifestHref = doc.querySelector('link[rel="manifest" i][href]')?.getAttribute('href');
  return { candidates, manifestUrl: manifestHref ? resolveAgainst(manifestHref, base) : null };
}

interface ManifestIcon {
  src?: unknown;
  sizes?: unknown;
  type?: unknown;
  purpose?: unknown;
}

export function iconsFromManifest(manifest: unknown, manifestUrl: string): IconCandidate[] {
  const icons = (manifest as { icons?: unknown })?.icons;
  if (!Array.isArray(icons)) return [];
  const out: IconCandidate[] = [];
  for (const icon of icons as ManifestIcon[]) {
    if (typeof icon.src !== 'string') continue;
    const purpose = typeof icon.purpose === 'string' ? icon.purpose.toLowerCase() : 'any';
    if (purpose.includes('monochrome') && !purpose.includes('any')) continue;
    const url = resolveAgainst(icon.src, manifestUrl);
    if (!url) continue;
    const isSvg = (typeof icon.type === 'string' && icon.type.includes('svg')) || /\.svg(\?|#|$)/i.test(url);
    const sizes = isSvg ? 'any' : parseSizes(typeof icon.sizes === 'string' ? icon.sizes : '');
    const maskable = purpose.includes('maskable') && !purpose.includes('any');
    out.push({ url, origin: 'manifest', label: `manifest${sizes ? ` ${sizes}` : ''}${maskable ? ' maskable' : ''}`, declaredSize: sizes });
  }
  return out;
}

export const pageSource: IconSource = {
  id: 'page',
  priority: 10,
  available: (ctx) => ctx.canFetchSites && /^https?:/i.test(ctx.pageUrl),
  async discover(ctx: DiscoveryContext): Promise<IconCandidate[]> {
    const page = await fetchWithTimeout(ctx.pageUrl, PAGE_TIMEOUT_MS, ctx.signal);
    if (!page || !page.response.ok) return [];
    const contentType = page.response.headers.get('content-type') ?? '';
    if (contentType && !contentType.includes('html')) return [];
    const html = await readTextLimited(page.response, MAX_HTML_BYTES);
    const { candidates, manifestUrl } = iconsFromHtml(html, page.finalUrl);
    if (manifestUrl) {
      const manifest = await fetchWithTimeout(manifestUrl, MANIFEST_TIMEOUT_MS, ctx.signal);
      if (manifest?.response.ok) {
        try {
          candidates.push(...iconsFromManifest(await manifest.response.json(), manifest.finalUrl));
        } catch {
          // Kaputtes Manifest: die übrigen Kandidaten reichen.
        }
      }
    }
    return candidates;
  }
};
