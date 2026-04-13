/**
 * FavGrid i18n Helper v1.0
 * Wrapper für chrome.i18n.getMessage()
 * Übersetzt HTML-Elemente mit data-i18n Attributen
 */

// Übersetzungsfunktion – gibt den übersetzten String zurück oder Fallback
function t(key, substitutions) {
  if (!key) return '';
  const msg = chrome.i18n.getMessage(key, substitutions);
  return msg || key;
}

// HTML-Elemente automatisch übersetzen
function applyI18n(root = document) {
  // textContent
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });

  // placeholder
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.placeholder = msg;
  });

  // title (tooltip)
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.title = msg;
  });

  // HTML lang-Attribut setzen
  const lang = chrome.i18n.getUILanguage().split('-')[0] || 'de';
  document.documentElement.lang = lang;
}

// Auto-Init wenn DOM geladen
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => applyI18n());
} else {
  applyI18n();
}
