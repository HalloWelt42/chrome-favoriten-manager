/**
 * Lädt einen Kandidaten und prüft, ob wirklich ein brauchbares Bild ankommt.
 * Fehlerseiten, HTML statt Bild, Platzhalter und winzige Bilder fallen durch.
 */
import { fetchWithTimeout } from './net';
import type { IconCandidate, ProbedIcon } from './types';

const IMAGE_TIMEOUT_MS = 5000;
const MIN_BYTES = 40;
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_EDGE = 16;

const isSvgBlob = (blob: Blob, url: string): boolean => blob.type.includes('svg') || /\.svg(\?|#|$)/i.test(url);

async function looksLikeSvg(blob: Blob): Promise<boolean> {
  const head = await blob.slice(0, 512).text();
  return /<svg[\s>]/i.test(head);
}

/** Ermittelt die Bildmaße; null, wenn sich das Bild nicht dekodieren lässt. */
export async function measure(blob: Blob, vector: boolean): Promise<{ width: number; height: number } | null> {
  if (!vector) {
    try {
      const bitmap = await createImageBitmap(blob);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      return null;
    }
  }
  if (typeof Image === 'undefined') return { width: 512, height: 512 };
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // SVG ohne feste Maße meldet 0 oder 150x150; Vektoren skalieren ohnehin.
    return { width: Math.max(img.naturalWidth, 512), height: Math.max(img.naturalHeight, 512) };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function probeCandidate(candidate: IconCandidate, signal: AbortSignal): Promise<ProbedIcon | null> {
  const result = await fetchWithTimeout(candidate.url, IMAGE_TIMEOUT_MS, signal);
  if (!result || !result.response.ok) return null;
  const contentType = (result.response.headers.get('content-type') ?? '').toLowerCase();
  if (contentType.includes('html') || contentType.includes('json') || contentType.startsWith('text/plain')) return null;
  let blob = await result.response.blob();
  if (blob.size < MIN_BYTES || blob.size > MAX_BYTES) return null;
  let vector = isSvgBlob(blob, result.finalUrl);
  if (!vector && !contentType.startsWith('image/') && (await looksLikeSvg(blob))) vector = true;
  if (vector && !blob.type.includes('svg')) blob = new Blob([blob], { type: 'image/svg+xml' });
  const size = await measure(blob, vector);
  if (!size || Math.min(size.width, size.height) < MIN_EDGE) return null;
  return { candidate, blob, width: size.width, height: size.height, vector };
}

/** Bewertung: Vektor vor großem Rasterbild; Masken-Silhouetten und schiefe Formate abgewertet. */
export function iconScore(icon: ProbedIcon): number {
  if (icon.candidate.label === 'mask-icon') return 5;
  const edge = Math.min(icon.width, icon.height);
  const ratio = Math.max(icon.width, icon.height) / Math.max(1, edge);
  const base = icon.vector ? 600 : Math.min(edge, 512);
  const maskablePenalty = icon.candidate.label.includes('maskable') ? 0.8 : 1;
  const ratioPenalty = ratio > 1.25 ? 0.5 : 1;
  const originBonus = icon.candidate.origin === 'service' ? 0.9 : 1;
  return base * maskablePenalty * ratioPenalty * originBonus;
}

/** Ab dieser Bewertung gilt ein Icon als gut genug, um die Suche zu beenden. */
export const GOOD_SCORE = 64;
