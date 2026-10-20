/**
 * Service Worker: Kontextmenü, Tastenkürzel, tägliche Wartung. Er übernimmt außerdem
 * gleich nach Installation oder Update die Altdaten, damit kein Tab darauf warten muss.
 */
import { addFavoriteIfNew } from '../app/commands';
import { seedDevStorage } from '../app/devSeed';
import { assetStore, repository } from '../app/services';
import { collectGarbage } from '../data/maintenance';
import { defaultGroup } from '../domain/library';
import { isWebUrl } from '../domain/urls';
import { favoriteName } from '../domain/views';
import { t } from '../i18n';

const MENU_ID = 'add-to-favgrid';
const MAINTENANCE_ALARM = 'maintenance';
const MAINTENANCE_PERIOD_MIN = 24 * 60;

async function setup(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_ID, title: t('addToFavGrid'), contexts: ['page', 'link'] });
  await chrome.alarms.clear(MAINTENANCE_ALARM);
  await chrome.alarms.create(MAINTENANCE_ALARM, { delayInMinutes: 5, periodInMinutes: MAINTENANCE_PERIOD_MIN });
  try {
    await seedDevStorage();
    await repository.load();
  } catch (error) {
    console.warn('[FavGrid] Laden beim Start fehlgeschlagen', error);
  }
}

chrome.runtime.onInstalled.addListener(() => void setup());
chrome.runtime.onStartup.addListener(() => void setup());

function notify(message: string): void {
  chrome.notifications.create({ type: 'basic', iconUrl: 'assets/icons/icon-48.png', title: 'FavGrid', message });
}

async function addPage(url: string | undefined, title: string | undefined): Promise<void> {
  if (!url || !isWebUrl(url)) {
    notify(t('popupCannotAdd'));
    return;
  }
  const library = await repository.load();
  const last = library.settings.startup.lastGroupId;
  const group = library.groups.find((g) => g.id === last) ?? defaultGroup(library);
  const result = await addFavoriteIfNew({ url, alias: title ?? '', groupId: group.id });
  if (result.added) notify(t('notifyAdded', favoriteName(result.added), group.name));
  else if (result.existing) notify(t('notifyExists', favoriteName(result.existing)));
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = info.linkUrl ?? info.pageUrl;
  const title = info.linkUrl ? (info.selectionText ?? '') : tab?.title;
  void addPage(url, title);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'add-current-page') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await addPage(tab?.url, tab?.title);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== MAINTENANCE_ALARM) return;
  try {
    const removed = await collectGarbage(repository, assetStore);
    if (removed > 0) console.log(`[FavGrid] ${removed} ungenutzte Bilder entfernt`);
  } catch (error) {
    console.warn('[FavGrid] Wartung fehlgeschlagen', error);
  }
});
