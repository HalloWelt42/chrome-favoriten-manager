/** Hilfen rund um Adressen von Favoriten. */

/** Ergänzt fehlendes Protokoll und prüft die Adresse. Liefert null bei ungültiger Eingabe. */
export function normalizeInputUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:', 'file:', 'ftp:'].includes(url.protocol)) return null;
    if (url.protocol !== 'file:' && !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Schlüssel für die Erkennung doppelter Favoriten: ohne Protokoll, www, Endschrägstrich, Groß/klein. */
export function duplicateKey(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '').toLowerCase();
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Kurzer Anzeigename aus der Adresse: Host mit Port, ohne www. */
export function displayHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
}

/** Ursprung inklusive Port, z. B. http://192.168.1.10:8080 */
export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const PRIVATE_HOST_PATTERNS: readonly RegExp[] = [
  /^localhost$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
  /\.(local|lan|home|internal|intranet|localhost|test|mac|fritz\.box)$/i,
  /^[^.]+$/ // Rechnername ohne Punkt
];

/** Liegt die Adresse im eigenen Netz? Dann helfen externe Icon-Dienste nicht. */
export function isPrivateHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return true;
  }
}

/** Kann die Seite überhaupt aus einer Erweiterung geöffnet werden? */
export function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
