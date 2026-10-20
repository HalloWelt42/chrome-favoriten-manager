/** Liest Titel und Beschreibung einer Seite (nur mit Zugriff auf Webseiten). */
import { decodeText, fetchRemote } from '../icons/net';

export interface PageInfo {
  title: string;
  description: string;
}

export async function fetchPageInfo(url: string, signal: AbortSignal): Promise<PageInfo | null> {
  const page = await fetchRemote({ url, timeoutMs: 6000, maxBytes: 256 * 1024, stopAfterHead: true }, signal);
  if (!page || !page.ok) return null;
  const doc = new DOMParser().parseFromString(decodeText(page.body), 'text/html');
  const meta = (selector: string): string => doc.querySelector(selector)?.getAttribute('content')?.trim() ?? '';
  const title = meta('meta[property="og:site_name"]') && !doc.title.trim() ? meta('meta[property="og:site_name"]') : doc.title.trim();
  return {
    title: title.replace(/\s+/g, ' '),
    description: (meta('meta[name="description"]') || meta('meta[property="og:description"]')).replace(/\s+/g, ' ')
  };
}
