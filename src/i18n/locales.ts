/** Erzeugt beim Build die _locales/<sprache>/messages.json aus messages.ts. */
import { de, en } from './messages';

type ChromeMessages = Record<string, { message: string }>;

function toChrome(messages: Record<string, string>): ChromeMessages {
  const out: ChromeMessages = {};
  for (const [key, message] of Object.entries(messages)) out[key] = { message };
  return out;
}

export function buildLocaleFiles(): Record<string, ChromeMessages> {
  return { de: toChrome(de), en: toChrome(en) };
}
