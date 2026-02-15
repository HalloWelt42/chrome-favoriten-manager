/**
 * FavGrid Service Worker v3.0.2
 * Standalone – kein importScripts, keine DOM-Abhängigkeiten
 */

// ============================================
// Inline Utilities (kein importScripts nötig)
// ============================================
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const DEFAULT_GROUP = {
  id: 'default',
  name: 'Favoriten',
  icon: '⭐',
  color: '#7f5af0',
  position: 0,
  isDefault: true,
  source: 'manual'
};

// ============================================
// Installation & Update
// ============================================
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await initializeStorage();
    console.log('FavGrid installed successfully');
  } else if (details.reason === 'update') {
    console.log('FavGrid updated to version', chrome.runtime.getManifest().version);
  }
  
  // Context Menu erstellen
  chrome.contextMenus.create({
    id: 'add-to-favgrid',
    title: 'Zu FavGrid hinzufügen',
    contexts: ['page', 'link']
  });
});

// ============================================
// Storage Initialisierung
// ============================================
async function initializeStorage() {
  const data = await chrome.storage.local.get(['groups', 'favorites']);
  
  if (!data.groups || data.groups.length === 0) {
    await chrome.storage.local.set({
      groups: [{ ...DEFAULT_GROUP, createdAt: Date.now(), updatedAt: Date.now() }]
    });
  }
  
  if (!data.favorites) {
    await chrome.storage.local.set({ favorites: [] });
  }
}

// ============================================
// Context Menu Handler
// ============================================
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-to-favgrid') {
    const url = info.linkUrl || info.pageUrl;
    const title = tab?.title || '';
    
    if (url) {
      await addFavoriteFromContextMenu(url, title);
    }
  }
});

// ============================================
// Favorit hinzufügen (Context Menu / Popup)
// ============================================
async function addFavoriteFromContextMenu(url, title) {
  const data = await chrome.storage.local.get(['favorites', 'groups']);
  const favorites = data.favorites || [];
  const groups = data.groups || [];
  
  const defaultGroup = groups.find(g => g.isDefault) || groups[0];
  
  if (!defaultGroup) {
    console.error('No default group found');
    return;
  }
  
  // Prüfen ob bereits vorhanden
  if (favorites.some(f => f.url === url)) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon-48.png',
      title: 'FavGrid',
      message: 'Diese Seite ist bereits in deinen Favoriten!'
    });
    return;
  }
  
  const newFavorite = {
    id: generateId(),
    url: url,
    alias: title || new URL(url).hostname,
    description: '',
    tags: [],
    favicon: '',
    customIcon: null,
    groupId: defaultGroup.id,
    position: favorites.filter(f => f.groupId === defaultGroup.id).length,
    source: 'manual',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    visitCount: 0,
    lastVisited: null
  };
  
  favorites.push(newFavorite);
  await chrome.storage.local.set({ favorites });
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon-48.png',
    title: 'FavGrid',
    message: `"${newFavorite.alias}" wurde hinzugefügt!`
  });
}

// ============================================
// Message Handler
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'addFavorite':
      addFavoriteFromContextMenu(request.url, request.title)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
      
    case 'getPageInfo':
      fetchPageInfo(request.url)
        .then(info => sendResponse(info))
        .catch(err => sendResponse({ error: err.message }));
      return true;
  }
});

// ============================================
// Page Info abrufen
// ============================================
async function fetchPageInfo(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    const getTitle = () => {
      const match = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      return match ? match[1].trim() : '';
    };
    
    const getMetaContent = (name) => {
      const regex = new RegExp(
        `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']` +
        `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'
      );
      const match = text.match(regex);
      return (match ? (match[1] || match[2]) : '').trim();
    };
    
    return {
      title: getTitle(),
      description: getMetaContent('description') || getMetaContent('og:description'),
      image: getMetaContent('og:image'),
      siteName: getMetaContent('og:site_name'),
      type: getMetaContent('og:type')
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================
// Auto-Backup (täglich)
// ============================================
chrome.alarms.create('autoBackup', { periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoBackup') {
    const data = await chrome.storage.local.get('settings');
    if (data.settings?.backup?.autoBackup) {
      const allData = await chrome.storage.local.get(null);
      const backup = {
        date: new Date().toISOString(),
        data: allData
      };
      
      const backups = (await chrome.storage.local.get('backups')).backups || [];
      backups.unshift(backup);
      if (backups.length > 5) backups.pop();
      
      await chrome.storage.local.set({ backups });
      console.log('Auto-backup created');
    }
  }
});

// ============================================
// Keyboard Shortcut Handler
// ============================================
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'add-current-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await addFavoriteFromContextMenu(tab.url, tab.title);
    }
  }
});

console.log('FavGrid Service Worker initialized');
