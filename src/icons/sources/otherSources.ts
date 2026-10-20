/**
 * Weitere Quellen: feste Pfade am Ursprung, der Favicon-Zwischenspeicher des Browsers und
 * externe Dienste. Externe Dienste bekommen Host samt Port und werden für Adressen im
 * eigenen Netz nie gefragt (sie kennen diese nicht und liefern nur ein Ersatzbild).
 */
import { isPrivateHost, originOf } from '../../domain/urls';
import type { DiscoveryContext, IconCandidate, IconSource } from '../types';

export const wellKnownSource: IconSource = {
  id: 'well-known',
  priority: 20,
  available: (ctx) => ctx.canFetchSites && /^https?:/i.test(ctx.pageUrl),
  async discover(ctx: DiscoveryContext): Promise<IconCandidate[]> {
    const origin = originOf(ctx.pageUrl);
    if (!origin) return [];
    return [
      { url: `${origin}/apple-touch-icon.png`, origin: 'well-known', label: '/apple-touch-icon.png', declaredSize: 180 },
      { url: `${origin}/favicon.svg`, origin: 'well-known', label: '/favicon.svg', declaredSize: 'any' },
      { url: `${origin}/favicon.ico`, origin: 'well-known', label: '/favicon.ico', declaredSize: 0 },
      { url: `${origin}/favicon.png`, origin: 'well-known', label: '/favicon.png', declaredSize: 0 }
    ];
  }
};

/** Favicon, das der Browser beim letzten Besuch der Seite gespeichert hat. */
export function browserFaviconUrl(pageUrl: string, size: number): string {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', String(size));
  return url.href;
}

export const browserSource: IconSource = {
  id: 'browser',
  priority: 30,
  available: () => typeof chrome !== 'undefined' && !!chrome.runtime?.getURL,
  async discover(ctx: DiscoveryContext): Promise<IconCandidate[]> {
    return [{ url: browserFaviconUrl(ctx.pageUrl, 64), origin: 'browser', label: '', declaredSize: 0 }];
  }
};

export const serviceSource: IconSource = {
  id: 'service',
  priority: 40,
  available: (ctx) => ctx.canFetchSites && ctx.allowServices && /^https?:/i.test(ctx.pageUrl) && !isPrivateHost(ctx.pageUrl),
  async discover(ctx: DiscoveryContext): Promise<IconCandidate[]> {
    const host = new URL(ctx.pageUrl).host;
    const encoded = encodeURIComponent(host);
    return [
      { url: `https://www.google.com/s2/favicons?domain=${encoded}&sz=128`, origin: 'service', label: '1', declaredSize: 0 },
      { url: `https://icons.duckduckgo.com/ip3/${encoded}.ico`, origin: 'service', label: '2', declaredSize: 0 }
    ];
  }
};
