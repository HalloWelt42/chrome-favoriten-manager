/** Liest Titel und Beschreibung einer Seite (nur mit Zugriff auf Webseiten). */
import { fetchWithTimeout, readTextLimited } from '../icons/net';

export interface PageInfo {
  title: string;
  description: string;
}

export async function fetchPageInfo(url: string, signal: AbortSignal): Promise<PageInfo | null> {
  const page = await fetchWithTimeout(url, 6000, signal);
  if (!page || !page.response.ok) return null;
  const html = await readTextLimited(page.response, 256 * 1024);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = (selector: string): string => doc.querySelector(selector)?.getAttribute('content')?.trim() ?? '';
  const title = meta('meta[property="og:site_name"]') && !doc.title.trim() ? meta('meta[property="og:site_name"]') : doc.title.trim();
  return {
    title: title.replace(/\s+/g, ' '),
    description: (meta('meta[name="description"]') || meta('meta[property="og:description"]')).replace(/\s+/g, ' ')
  };
}
