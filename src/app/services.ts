/** Verdrahtung der Dienste für alle Teile der Erweiterung (Seiten und Service Worker). */
import { assetStore } from '../data/assets';
import { chromeLocalStore } from '../data/keyValue';
import { idbSnapshotService, LibraryRepository } from '../data/repository';
import { t } from '../i18n';

export const repository = new LibraryRepository({
  kv: chromeLocalStore,
  assets: assetStore,
  snapshots: idbSnapshotService,
  defaultGroupName: () => t('defaultGroupName')
});

export { assetStore };

export function appVersion(): string {
  const manifest = chrome.runtime.getManifest();
  return manifest.version_name ?? manifest.version;
}
