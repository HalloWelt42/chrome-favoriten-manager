/**
 * Icon-Suche über alle registrierten Quellen.
 * - discoverIcons: alle Kandidaten laden und bewerten (für die Auswahl im Dialog).
 * - findBestIcon: Quellen der Reihe nach, Abbruch beim ersten guten Treffer (automatisch).
 */
import { sha256Hex } from '../data/assets';
import { browserFaviconUrl, browserSource, serviceSource, wellKnownSource } from './sources/otherSources';
import { pageSource } from './sources/pageSource';
import { GOOD_SCORE, iconScore, probeCandidate } from './probe';
import type { DiscoveryContext, IconCandidate, IconSource, ProbedIcon } from './types';

export const ICON_SOURCES: readonly IconSource[] = [pageSource, wellKnownSource, browserSource, serviceSource]
  .slice()
  .sort((a, b) => a.priority - b.priority);

/**
 * Der Browser liefert für unbekannte Seiten ein Standard-Weltkugel-Bild. Dessen Fingerabdruck
 * wird einmal ermittelt, damit es nie als echtes Icon gilt.
 */
let browserPlaceholderHash: string | null = null;

/** Nur ein Erfolg wird gemerkt; schlägt die Ermittlung fehl, wird es beim nächsten Mal neu versucht. */
async function placeholderHash(signal: AbortSignal): Promise<string | null> {
  if (browserPlaceholderHash) return browserPlaceholderHash;
  try {
    const candidate: IconCandidate = { url: browserFaviconUrl('https://favgrid.invalid/', 64), origin: 'browser', label: '', declaredSize: 0 };
    const probed = await probeCandidate(candidate, signal);
    if (probed) browserPlaceholderHash = await sha256Hex(await probed.blob.arrayBuffer());
  } catch {
    // Ohne Fingerabdruck kein Browser-Icon (siehe isPlaceholder).
  }
  return browserPlaceholderHash;
}

/** Ohne bekannten Fingerabdruck wird ein Browser-Icon vorsichtshalber verworfen. */
async function isPlaceholder(icon: ProbedIcon, signal: AbortSignal): Promise<boolean> {
  if (icon.candidate.origin !== 'browser') return false;
  const placeholder = await placeholderHash(signal);
  return placeholder === null || placeholder === (await sha256Hex(await icon.blob.arrayBuffer()));
}

async function probeAll(candidates: IconCandidate[], ctx: DiscoveryContext): Promise<ProbedIcon[]> {
  const seenUrls = new Set<string>();
  const unique = candidates.filter((c) => !seenUrls.has(c.url) && seenUrls.add(c.url));
  const results = await Promise.all(unique.map((c) => probeCandidate(c, ctx.signal)));
  const out: ProbedIcon[] = [];
  for (const icon of results) {
    if (icon && !(await isPlaceholder(icon, ctx.signal))) out.push(icon);
  }
  return out;
}

async function dedupeByContent(icons: ProbedIcon[]): Promise<ProbedIcon[]> {
  const seen = new Set<string>();
  const out: ProbedIcon[] = [];
  for (const icon of icons) {
    const hash = await sha256Hex(await icon.blob.arrayBuffer());
    if (!seen.has(hash)) {
      seen.add(hash);
      out.push(icon);
    }
  }
  return out;
}

const byScore = (a: ProbedIcon, b: ProbedIcon): number => iconScore(b) - iconScore(a);

/** Alle brauchbaren Icons aller Quellen, bestes zuerst, ohne inhaltsgleiche Doppel. */
export async function discoverIcons(ctx: DiscoveryContext, sources: readonly IconSource[] = ICON_SOURCES): Promise<ProbedIcon[]> {
  const lists = await Promise.all(
    sources.filter((s) => s.available(ctx)).map((s) => s.discover(ctx).catch(() => [] as IconCandidate[]))
  );
  const probed = await probeAll(lists.flat(), ctx);
  return dedupeByContent(probed.sort(byScore));
}

/** Bestes Icon in Quellenreihenfolge; die Suche endet, sobald eine Quelle ein gutes liefert. */
export async function findBestIcon(ctx: DiscoveryContext, sources: readonly IconSource[] = ICON_SOURCES): Promise<ProbedIcon | null> {
  let best: ProbedIcon | null = null;
  for (const source of sources) {
    if (ctx.signal.aborted) break;
    if (!source.available(ctx)) continue;
    const candidates = await source.discover(ctx).catch(() => [] as IconCandidate[]);
    const probed = (await probeAll(candidates, ctx)).sort(byScore);
    const top = probed[0];
    if (top && (!best || iconScore(top) > iconScore(best))) best = top;
    if (best && iconScore(best) >= GOOD_SCORE) break;
  }
  return best;
}
