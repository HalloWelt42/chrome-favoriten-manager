/**
 * Tastatur auf der Neuer-Tab-Seite: Pfeile blättern, "/" springt in die Suche,
 * 1-9 öffnet die Favoriten der aktuellen Seite (wie ein Klick, Strg/Cmd kehrt das Ziel um).
 */
import { menu } from '../ui/menu.svelte';
import { app } from './state.svelte';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export function useKeyboard(): () => void {
  const onKey = (event: KeyboardEvent): void => {
    if (!app.library || app.dialog || isTyping(event.target)) return;
    if (event.key === '/') {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('#search-input')?.focus();
      return;
    }
    if (event.key === 'Escape') {
      menu.close();
      if (app.settingsOpen) void app.commitSettings().then(() => (app.settingsOpen = false));
      return;
    }
    if (!app.settings.navigation.keyboard || event.altKey) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') app.nextPage();
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') app.prevPage();
    else if (/^[1-9]$/.test(event.key)) {
      const fav = app.pageSlice.items[Number(event.key) - 1];
      if (!fav) return;
      app.openFavorite(fav, event);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
