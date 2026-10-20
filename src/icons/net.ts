/**
 * Abrufe fremder Webseiten: immer mit Zeitlimit, ohne Anmeldedaten, mit Größenbremse.
 *
 * Seiten der Erweiterung rufen fremde Adressen nie selbst ab, sondern über den Service Worker.
 * Grund: Bei einem Abruf aus einem Dokument wertet Chromium die Antwortköpfe
 * "Link: ...; rel=preload/modulepreload" aus und versucht, die dort genannten Skripte der
 * fremden Seite vorzuladen. Die Richtlinie der Erweiterung blockt das, hinterlässt aber für
 * jedes Skript Fehlermeldungen. Im Service Worker gibt es kein Dokument, dort bleibt der
 * Abruf folgenlos. Adressen der Erweiterung selbst (etwa das Browser-Favicon) gehen direkt.
 */

export interface RemoteRequest {
  url: string;
  timeoutMs: number;
  maxBytes: number;
  /** Bei HTML nach dem Kopf aufhören: Icons, Manifest und Titel stehen dort. */
  stopAfterHead?: boolean;
}

export interface RemoteResponse {
  ok: boolean;
  status: number;
  /** Adresse nach Weiterleitungen. */
  finalUrl: string;
  /** Inhaltstyp ohne Parameter, kleingeschrieben; leer, wenn der Server keinen nennt. */
  contentType: string;
  /** Gelesene Bytes, höchstens maxBytes. */
  body: Uint8Array<ArrayBuffer>;
  /** true, wenn der Inhalt größer als maxBytes war und deshalb abgeschnitten wurde. */
  exceeded: boolean;
}

/** Obergrenzen, die der Service Worker unabhängig von der Anfrage durchsetzt. */
const LIMITS = { timeoutMs: 15_000, maxBytes: 8 * 1024 * 1024 };
const PORT_NAME = 'favgrid:remote-fetch';

const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url);

/** Ruft eine Adresse ab; aus Seiten heraus über den Service Worker (siehe oben). */
export function fetchRemote(request: RemoteRequest, signal: AbortSignal): Promise<RemoteResponse | null> {
  const inDocument = typeof document !== 'undefined';
  return inDocument && isWebUrl(request.url) ? viaServiceWorker(request, signal) : fetchDirect(request, signal);
}

/** Dekodiert gelesene Bytes als UTF-8-Text. */
export function decodeText(body: Uint8Array): string {
  return new TextDecoder().decode(body);
}

/** Löst eine Adresse relativ zur tatsächlich geladenen Seite auf (nach Weiterleitungen). */
export function resolveAgainst(href: string, base: string): string | null {
  try {
    return new URL(href.trim(), base).href;
  } catch {
    return null;
  }
}

/** Im Service Worker einmal beim Start aufrufen: beantwortet die Abrufe der Seiten. */
export function serveRemoteFetches(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME || port.sender?.id !== chrome.runtime.id) return;
    const controller = new AbortController();
    port.onDisconnect.addListener(() => controller.abort());
    port.onMessage.addListener(async (message: unknown) => {
      const request = parseRequest(message);
      const result = request ? await fetchDirect(request, controller.signal) : null;
      if (controller.signal.aborted) return;
      try {
        port.postMessage(result ? toWire(result) : null);
      } catch {
        // Seite inzwischen geschlossen.
      }
    });
  });
}

async function fetchDirect(request: RemoteRequest, signal: AbortSignal): Promise<RemoteResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(request.timeoutMs, LIMITS.timeoutMs));
  const onAbort = (): void => controller.abort();
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(request.url, { credentials: 'omit', redirect: 'follow', signal: controller.signal, cache: 'no-cache' });
    const maxBytes = Math.min(request.maxBytes, LIMITS.maxBytes);
    // Fehlerseiten werden nicht gelesen; die Aufrufer brauchen dann nur den Status.
    const { body, exceeded } = response.ok ? await readLimited(response, maxBytes, request.stopAfterHead === true) : { body: new Uint8Array(0), exceeded: false };
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url || request.url,
      contentType: (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase(),
      body,
      exceeded
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

/** Liest höchstens maxBytes, damit riesige Antworten die Suche nicht lähmen. */
async function readLimited(response: Response, maxBytes: number, stopAfterHead: boolean): Promise<{ body: Uint8Array<ArrayBuffer>; exceeded: boolean }> {
  if (!response.body) return { body: new Uint8Array(0), exceeded: false };
  const reader = response.body.getReader();
  const decoder = stopAfterHead ? new TextDecoder() : null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  let exceeded = false;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.byteLength;
      if (total > maxBytes) {
        exceeded = true;
        break;
      }
      if (decoder) {
        text += decoder.decode(value, { stream: true });
        if (/<\/head>|<body[\s>]/i.test(text)) break;
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
  const body = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, body.length - offset);
    body.set(part, offset);
    offset += part.length;
    if (offset >= body.length) break;
  }
  return { body, exceeded };
}

function viaServiceWorker(request: RemoteRequest, signal: AbortSignal): Promise<RemoteResponse | null> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(null);
    let port: chrome.runtime.Port;
    try {
      port = chrome.runtime.connect({ name: PORT_NAME });
    } catch {
      return resolve(null);
    }
    let settled = false;
    const finish = (value: RemoteResponse | null): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      resolve(value);
    };
    const onAbort = (): void => {
      port.disconnect();
      finish(null);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    port.onMessage.addListener((wire: unknown) => {
      port.disconnect();
      finish(fromWire(wire));
    });
    port.onDisconnect.addListener(() => finish(null));
    port.postMessage(request);
  });
}

function parseRequest(message: unknown): RemoteRequest | null {
  if (typeof message !== 'object' || message === null) return null;
  const m = message as Record<string, unknown>;
  if (typeof m.url !== 'string' || !isWebUrl(m.url)) return null;
  if (typeof m.timeoutMs !== 'number' || typeof m.maxBytes !== 'number') return null;
  if (m.stopAfterHead !== undefined && typeof m.stopAfterHead !== 'boolean') return null;
  return { url: m.url, timeoutMs: m.timeoutMs, maxBytes: m.maxBytes, stopAfterHead: m.stopAfterHead === true };
}

/** Nachrichten zwischen Seite und Service Worker sind JSON: Bytes reisen als Base64. */
interface WireResponse extends Omit<RemoteResponse, 'body'> {
  body: string;
}

function toWire(response: RemoteResponse): WireResponse {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < response.body.length; i += step) {
    binary += String.fromCharCode(...response.body.subarray(i, i + step));
  }
  return { ...response, body: btoa(binary) };
}

function fromWire(wire: unknown): RemoteResponse | null {
  if (typeof wire !== 'object' || wire === null) return null;
  const w = wire as WireResponse;
  if (typeof w.body !== 'string' || typeof w.finalUrl !== 'string') return null;
  const binary = atob(w.body);
  const body = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) body[i] = binary.charCodeAt(i);
  return { ok: w.ok === true, status: Number(w.status) || 0, finalUrl: w.finalUrl, contentType: String(w.contentType ?? ''), body, exceeded: w.exceeded === true };
}
