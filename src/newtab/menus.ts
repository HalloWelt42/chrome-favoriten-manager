/** Kontextmenüs für Favoriten und Gruppen. */
import * as commands from '../app/commands';
import type { Favorite, Group } from '../domain/types';
import { t } from '../i18n';
import type { MenuItem } from '../ui/menu.svelte';
import { toasts } from '../ui/toasts.svelte';
import { app } from './state.svelte';

export function favoriteMenu(fav: Favorite): MenuItem[] {
  const moveTargets = app.groups
    .filter((g) => g.id !== fav.groupId)
    .map<MenuItem>((g) => ({
      label: `${g.icon} ${g.name}`,
      icon: 'fa-solid fa-folder',
      run: () => app.run(() => commands.moveFavorites([fav.id], g.id), t('toastMovedTo', g.name))
    }));
  const items: MenuItem[] = [
    { label: t('menuOpen'), icon: 'fa-solid fa-arrow-up-right-from-square', run: () => void (window.location.href = fav.url) },
    { label: t('menuOpenNewTab'), icon: 'fa-regular fa-window-restore', run: () => void chrome.tabs.create({ url: fav.url, active: true }) },
    { label: t('menuOpenBackground'), icon: 'fa-solid fa-layer-group', run: () => app.openInBackground(fav) },
    { label: t('menuCopyUrl'), icon: 'fa-regular fa-copy', run: () => copyUrl(fav.url) },
    { label: t('menuEdit'), icon: 'fa-solid fa-pen', separatorBefore: true, run: () => editFavorite(fav) },
    { label: t('menuChooseIcon'), icon: 'fa-regular fa-image', run: () => editFavorite(fav, true) }
  ];
  if (fav.icon.mode === 'auto') {
    items.push({
      label: t('menuRefreshIcon'),
      icon: 'fa-solid fa-rotate',
      title: t('menuRefreshIconTitle'),
      run: () => {
        app.autoIcons.enqueue([fav], true);
        toasts.show(t('toastIconSearchStarted'), 'info');
      }
    });
  }
  if (moveTargets.length > 0) items.push({ label: t('menuMoveTo'), icon: 'fa-solid fa-folder-open', submenu: moveTargets });
  items.push(
    { label: t('menuDuplicate'), icon: 'fa-regular fa-clone', run: () => app.run(() => commands.duplicateFavorite(fav.id), t('toastDuplicated')) },
    { label: t('menuInfo'), icon: 'fa-solid fa-circle-info', run: () => void (app.dialog = { kind: 'info', favoriteId: fav.id }) },
    { label: t('menuTrash'), icon: 'fa-regular fa-trash-can', danger: true, separatorBefore: true, run: () => app.trashFavorites([fav.id]) }
  );
  return items;
}

export function groupMenu(group: Group): MenuItem[] {
  const items: MenuItem[] = [
    { label: t('menuEditGroup'), icon: 'fa-solid fa-pen', run: () => void (app.dialog = { kind: 'group', groupId: group.id }) },
    { label: t('menuAddFavoriteHere'), icon: 'fa-solid fa-plus', run: () => void (app.dialog = { kind: 'favorite', favoriteId: null, groupId: group.id }) },
    { label: t('menuManageGroups'), icon: 'fa-solid fa-right-left', run: () => void (app.dialog = { kind: 'manager', tab: 'move' }) }
  ];
  if (!group.isDefault) {
    items.push({
      label: t('menuTrashGroup'),
      icon: 'fa-regular fa-trash-can',
      danger: true,
      separatorBefore: true,
      run: () => confirmTrashGroup(group)
    });
  }
  return items;
}

export function editFavorite(fav: Favorite, focusIcons = false): void {
  app.dialog = { kind: 'favorite', favoriteId: fav.id, groupId: fav.groupId, focusIcons };
}

export function confirmTrashGroup(group: Group): void {
  const count = app.counts.get(group.id) ?? 0;
  app.confirm({
    title: t('confirmTrashGroupTitle'),
    message: t('confirmTrashGroupMessage', group.name, count),
    confirmLabel: t('menuTrashGroup'),
    danger: false,
    onConfirm: () => app.trashGroup(group)
  });
}

async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toasts.show(t('toastUrlCopied'));
  } catch {
    toasts.error(t('errorGeneric'));
  }
}
