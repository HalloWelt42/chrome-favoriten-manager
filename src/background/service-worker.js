/**
 * FavGrid Service Worker
 * Handles background tasks, context menus, and browser events
 */

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize storage with defaults
    await initializeStorage();
    console.log('FavGrid installed successfully');
  } else if (details.reason === 'update') {
    console.log('FavGrid updated to version', chrome.runtime.getManifest().version);
  }
});

// Initialize storage
async function initializeStorage() {
  const defaultSettings = {
    theme: 'dark',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
      blur: 0,
      overlay: 0
    },
    grid: {
      columns: 6,
      rows: 4,
      iconSize: 72,
      gap: 24,
      borderRadius: 16,
      showShadow: true
    },
    labels: {
      show: true,
      position: 'below',
      fontSize: 12,
      maxLength: 20
    },
    animations: {
      hover: true,
      pageTransition: 'slide',
      loadAnimation: true
    },
    search: {
      engine: 'https://www.google.com/search?q=%s',
      instantSearch: true,
      suggestions: false
    },
    navigation: {
      keyboard: true,
      mousewheel: true,
      swipe: true,
      showArrows: true
    },
    startup: {
      group: 'last',
      lastGroupId: null
    },
    backup: {
      autoBackup: false,
      frequency: 'weekly'
    }
  };

  const defaultGroup = {
    id: 'default',
    name: 'Favoriten',
    icon: '⭐',
    color: '#7f5af0',
    position: 0,
    isDefault: true,
    source: 'manual',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const data = await chrome.storage.local.get(['settings', 'groups', 'favorites']);
  
  if (!data.settings) {
    await chrome.storage.local.set({ settings: defaultSettings });
  }
  
  if (!data.groups || data.groups.length === 0) {
    await chrome.storage.local.set({ groups: [defaultGroup] });
  }
  
  if (!data.favorites) {
    await chrome.storage.local.set({ favorites: [] });
  }
}

// Context menu for adding current page
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-favgrid',
    title: 'Zu FavGrid hinzufügen',
    contexts: ['page', 'link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-to-favgrid') {
    const url = info.linkUrl || info.pageUrl;
    const title = tab?.title || '';
    
    if (url) {
      await addFavoriteFromContextMenu(url, title);
    }
  }
});

// Add favorite from context menu
async function addFavoriteFromContextMenu(url, title) {
  const data = await chrome.storage.local.get(['favorites', 'groups']);
  const favorites = data.favorites || [];
  const groups = data.groups || [];
  
  // Find default group
  const defaultGroup = groups.find(g => g.isDefault) || groups[0];
  
  if (!defaultGroup) {
    console.error('No default group found');
    return;
  }
  
  // Check if already exists
  const exists = favorites.some(f => f.url === url);
  if (exists) {
    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon-48.png',
      title: 'FavGrid',
      message: 'Diese Seite ist bereits in deinen Favoriten!'
    });
    return;
  }
  
  // Add new favorite
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
  
  // Notify user
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon-48.png',
    title: 'FavGrid',
    message: `"${newFavorite.alias}" wurde hinzugefügt!`
  });
}

// Generate UUID
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Handle messages from content scripts and popup
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

// Fetch page metadata
async function fetchPageInfo(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    
    const getMetaContent = (name) => {
      const meta = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return meta?.getAttribute('content') || '';
    };
    
    return {
      title: doc.title || '',
      description: getMetaContent('description') || getMetaContent('og:description'),
      image: getMetaContent('og:image'),
      siteName: getMetaContent('og:site_name'),
      type: getMetaContent('og:type')
    };
  } catch (e) {
    return { error: e.message };
  }
}


// Auto-backup (runs periodically if enabled)
chrome.alarms.create('autoBackup', { periodInMinutes: 1440 }); // Once per day

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoBackup') {
    const data = await chrome.storage.local.get('settings');
    if (data.settings?.backup?.autoBackup) {
      // Create backup in storage
      const allData = await chrome.storage.local.get(null);
      const backup = {
        date: new Date().toISOString(),
        data: allData
      };
      
      // Store last 5 backups
      const backups = (await chrome.storage.local.get('backups')).backups || [];
      backups.unshift(backup);
      if (backups.length > 5) backups.pop();
      
      await chrome.storage.local.set({ backups });
      console.log('Auto-backup created');
    }
  }
});

// Handle keyboard shortcut for quick add
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'add-current-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await addFavoriteFromContextMenu(tab.url, tab.title);
    }
  }
});

console.log('FavGrid Service Worker initialized');
