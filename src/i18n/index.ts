/**
 * Übersetzung. Texte stehen in messages.ts (Deutsch ist die Schlüsselquelle, Englisch muss
 * dieselben Schlüssel haben). Im Betrieb liest chrome.i18n die daraus erzeugten
 * _locales-Dateien; ohne Erweiterungsumgebung (Tests) gilt der deutsche Text.
 */
import { de } from './messages';

export type MessageKey = keyof typeof de;

function substitute(text: string, subs: string[]): string {
  return text.replace(/\$(\d)/g, (_, n: string) => subs[Number(n) - 1] ?? '');
}

export function t(key: MessageKey, ...subs: (string | number)[]): string {
  const values = subs.map(String);
  const fromBrowser = typeof chrome !== 'undefined' && chrome.i18n?.getMessage ? chrome.i18n.getMessage(key, values) : '';
  return fromBrowser || substitute(de[key], values);
}

export function uiLanguage(): string {
  return typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage ? chrome.i18n.getUILanguage() : 'de';
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(uiLanguage(), { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatNumber(value: number): string {
  return value.toLocaleString(uiLanguage());
}
