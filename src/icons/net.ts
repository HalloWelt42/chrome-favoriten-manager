/** Netzzugriffe der Icon-Suche: immer mit Zeitlimit, ohne Anmeldedaten, ohne Ausnahmen nach außen. */

export interface FetchResult {
  response: Response;
  finalUrl: string;
}

export async function fetchWithTimeout(url: string, timeoutMs: number, signal: AbortSignal): Promise<FetchResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = (): void => controller.abort();
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(url, { credentials: 'omit', redirect: 'follow', signal: controller.signal, cache: 'no-cache' });
    return { response, finalUrl: response.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

/** Liest höchstens maxBytes Text, damit riesige Seiten die Suche nicht lähmen. */
export async function readTextLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      total += value.byteLength;
      text += decoder.decode(value, { stream: true });
      // Icons stehen im Kopf; danach muss nicht weitergelesen werden.
      if (/<\/head>|<body[\s>]/i.test(text)) break;
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
  return text;
}

/** Löst eine Adresse relativ zur tatsächlich geladenen Seite auf (nach Weiterleitungen). */
export function resolveAgainst(href: string, base: string): string | null {
  try {
    return new URL(href.trim(), base).href;
  } catch {
    return null;
  }
}
