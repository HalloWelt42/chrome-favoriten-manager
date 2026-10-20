/** Manifest der Erweiterung; Version kommt aus version.json, Texte aus den Sprachdateien. */

export interface ManifestOptions {
  version: string;
  versionName: string;
  dev: boolean;
}

export function createManifest({ version, versionName, dev }: ManifestOptions): chrome.runtime.ManifestV3 {
  return {
    manifest_version: 3,
    name: dev ? '__MSG_extNameDev__' : '__MSG_extName__',
    version,
    version_name: versionName,
    description: '__MSG_extDescription__',
    default_locale: 'de',
    icons: {
      16: 'assets/icons/icon-16.png',
      32: 'assets/icons/icon-32.png',
      48: 'assets/icons/icon-48.png',
      128: 'assets/icons/icon-128.png'
    },
    action: {
      default_popup: 'popup/index.html',
      default_icon: { 16: 'assets/icons/icon-16.png', 32: 'assets/icons/icon-32.png' },
      default_title: '__MSG_extName__'
    },
    chrome_url_overrides: { newtab: 'newtab/index.html' },
    background: { service_worker: 'service-worker.js', type: 'module' },
    permissions: ['storage', 'unlimitedStorage', 'activeTab', 'contextMenus', 'notifications', 'alarms', 'search', 'favicon'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    commands: {
      'add-current-page': { description: '__MSG_commandAddCurrentPage__' }
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; img-src 'self' https: http: data: blob:;"
    }
  };
}
