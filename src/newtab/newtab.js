/**
 * FavGrid - Premium Speed Dial
 * Main Application Logic
 */

// ============================================
// Storage Module (inline for simplicity)
// ============================================
const Storage = {
  defaultSettings: {
    theme: 'dark',
    accentColor: '#7f5af0',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
      imageDark: '',
      imageLight: '',
      useDarkForLight: true,
      blur: 0,
      overlay: 0,
      customGradient: {
        color1: '#1a1a2e',
        color2: '#16213e'
      },
      brightness: 100
    },
    grid: {
      columns: 6,
      rows: 4,
      iconSize: 72,
      gap: 24,
      borderRadius: 16,
      showShadow: true
    },
    icons: {
      opacity: 100,
      bgDark: '#1a1a2e',
      bgLight: '#ffffff'
    },
    labels: {
      show: true,
      position: 'below',
      fontSize: 12,
      maxLength: 20,
      fontFamily: 'system',
      customFont: '',
      fontWeight: '500'
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
      showArrows: true,
      clickBehavior: 'newTab'
    },
    backup: {
      autoBackup: false,
      frequency: 'weekly'
    },
    startup: {
      group: 'last',
      lastGroupId: null
    }
  },

  defaultGroup: {
    id: 'default',
    name: 'Favoriten',
    icon: '⭐',
    color: '#7f5af0',
    position: 0,
    isDefault: true,
    source: 'manual',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  },

  async init() {
    const data = await chrome.storage.local.get(['settings', 'groups', 'favorites']);
    
    if (!data.settings) {
      await chrome.storage.local.set({ settings: this.defaultSettings });
    }
    
    if (!data.groups || data.groups.length === 0) {
      await chrome.storage.local.set({ groups: [this.defaultGroup] });
    }
    
    if (!data.favorites) {
      await chrome.storage.local.set({ favorites: [] });
    }
    
    return this.getAll();
  },

  async getAll() {
    const data = await chrome.storage.local.get(['settings', 'groups', 'favorites']);
    return {
      settings: this.deepMerge(this.defaultSettings, data.settings || {}),
      groups: data.groups || [this.defaultGroup],
      favorites: data.favorites || []
    };
  },

  async getSettings() {
    const data = await chrome.storage.local.get('settings');
    return this.deepMerge(this.defaultSettings, data.settings || {});
  },

  async updateSettings(updates) {
    const current = await this.getSettings();
    const merged = this.deepMerge(current, updates);
    await chrome.storage.local.set({ settings: merged });
    return merged;
  },

  async getGroups() {
    const data = await chrome.storage.local.get('groups');
    return data.groups || [this.defaultGroup];
  },

  async addGroup(group) {
    const groups = await this.getGroups();
    const newGroup = {
      id: this.generateId(),
      position: groups.length,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...group
    };
    groups.push(newGroup);
    await chrome.storage.local.set({ groups });
    return newGroup;
  },

  async updateGroup(id, updates) {
    const groups = await this.getGroups();
    const index = groups.findIndex(g => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updates, updatedAt: Date.now() };
      await chrome.storage.local.set({ groups });
      return groups[index];
    }
    return null;
  },

  async deleteGroup(id) {
    let groups = await this.getGroups();
    const defaultGroup = groups.find(g => g.isDefault);
    
    if (id === defaultGroup?.id) return false;
    
    const favorites = await this.getFavorites();
    const updatedFavorites = favorites.map(f => 
      f.groupId === id ? { ...f, groupId: defaultGroup.id } : f
    );
    
    groups = groups.filter(g => g.id !== id);
    
    await chrome.storage.local.set({ groups, favorites: updatedFavorites });
    return true;
  },

  async getFavorites() {
    const data = await chrome.storage.local.get('favorites');
    return data.favorites || [];
  },

  async getFavoritesByGroup(groupId) {
    const favorites = await this.getFavorites();
    return favorites
      .filter(f => f.groupId === groupId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  },

  async addFavorite(favorite) {
    const favorites = await this.getFavorites();
    const groupFavorites = favorites.filter(f => f.groupId === favorite.groupId);
    
    const newFavorite = {
      id: this.generateId(),
      alias: '',
      description: '',
      tags: [],
      favicon: '',
      customIcon: null,
      position: groupFavorites.length,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      visitCount: 0,
      lastVisited: null,
      ...favorite
    };
    
    favorites.push(newFavorite);
    await chrome.storage.local.set({ favorites });
    return newFavorite;
  },

  async updateFavorite(id, updates) {
    const favorites = await this.getFavorites();
    const index = favorites.findIndex(f => f.id === id);
    if (index !== -1) {
      favorites[index] = { ...favorites[index], ...updates, updatedAt: Date.now() };
      await chrome.storage.local.set({ favorites });
      return favorites[index];
    }
    return null;
  },

  async deleteFavorite(id) {
    let favorites = await this.getFavorites();
    favorites = favorites.filter(f => f.id !== id);
    await chrome.storage.local.set({ favorites });
    return true;
  },

  async moveFavorite(id, newGroupId) {
    const favorites = await this.getFavorites();
    const favorite = favorites.find(f => f.id === id);
    
    if (!favorite) return null;
    
    const groupFavorites = favorites.filter(f => f.groupId === newGroupId && f.id !== id);
    favorite.groupId = newGroupId;
    favorite.position = groupFavorites.length;
    favorite.updatedAt = Date.now();
    
    await chrome.storage.local.set({ favorites });
    return favorite;
  },

  async search(query) {
    if (!query || query.trim() === '') return [];
    
    const favorites = await this.getFavorites();
    const groups = await this.getGroups();
    const lowerQuery = query.toLowerCase();
    
    return favorites.filter(f => {
      const group = groups.find(g => g.id === f.groupId);
      const searchText = [
        f.url,
        f.alias,
        f.description,
        ...(f.tags || []),
        group?.name || ''
      ].join(' ').toLowerCase();
      
      return searchText.includes(lowerQuery);
    });
  },

  async exportJSON() {
    const data = await this.getAll();
    return JSON.stringify({
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data
    }, null, 2);
  },

  async exportHTML() {
    const { favorites, groups } = await this.getAll();
    
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>FavGrid Bookmarks</TITLE>
<H1>FavGrid Bookmarks</H1>
<DL><p>\n`;
    
    for (const group of groups.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
      const groupFavorites = favorites.filter(f => f.groupId === group.id);
      html += `    <DT><H3>${this.escapeHtml(group.name)}</H3>\n    <DL><p>\n`;
      
      for (const fav of groupFavorites.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
        const name = fav.alias || this.getHostname(fav.url);
        html += `        <DT><A HREF="${this.escapeHtml(fav.url)}" ADD_DATE="${Math.floor(fav.createdAt / 1000)}">${this.escapeHtml(name)}</A>\n`;
      }
      
      html += `    </DL><p>\n`;
    }
    
    html += `</DL><p>`;
    return html;
  },

  async exportCSV() {
    const { favorites, groups } = await this.getAll();
    
    let csv = '"URL","Alias","Description","Group","Tags","Created"\n';
    
    for (const fav of favorites) {
      const group = groups.find(g => g.id === fav.groupId);
      csv += `"${fav.url}","${fav.alias}","${fav.description}","${group?.name || ''}","${(fav.tags || []).join(',')}","${new Date(fav.createdAt).toISOString()}"\n`;
    }
    
    return csv;
  },

  async exportMarkdown() {
    const { favorites, groups } = await this.getAll();
    
    let md = `# FavGrid Export\n\n_Exported: ${new Date().toLocaleString()}_\n\n`;
    
    for (const group of groups.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
      const groupFavorites = favorites.filter(f => f.groupId === group.id);
      md += `## ${group.icon} ${group.name}\n\n`;
      
      for (const fav of groupFavorites.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
        const name = fav.alias || this.getHostname(fav.url);
        const desc = fav.description ? ` - ${fav.description}` : '';
        md += `- [${name}](${fav.url})${desc}\n`;
      }
      
      md += '\n';
    }
    
    return md;
  },

  async exportText() {
    const favorites = await this.getFavorites();
    return favorites.map(f => f.url).join('\n');
  },

  async importJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      
      if (imported.data) {
        const { favorites, groups, settings } = imported.data;
        
        if (groups) await chrome.storage.local.set({ groups });
        if (favorites) await chrome.storage.local.set({ favorites });
        if (settings) await chrome.storage.local.set({ settings });
        
        return { success: true, count: favorites?.length || 0 };
      }
      
      return { success: false, error: 'Invalid format' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async importHTML(htmlString) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const groups = await this.getGroups();
      const defaultGroup = groups.find(g => g.isDefault);
      
      let imported = 0;
      const anchors = doc.querySelectorAll('A');
      
      for (const anchor of anchors) {
        if (anchor.href && anchor.href.startsWith('http')) {
          await this.addFavorite({
            url: anchor.href,
            alias: anchor.textContent || '',
            groupId: defaultGroup.id
          });
          imported++;
        }
      }
      
      return { success: true, count: imported };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  getHostname(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
};

// ============================================
// Favicon Module
// ============================================
const Favicon = {
  colors: [
    '#7f5af0', '#2cb67d', '#ff8906', '#e53170', '#3da9fc',
    '#f25f4c', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'
  ],

  async get(url) {
    if (!url) return this.generateFallback(url);
    
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
      return this.generateFallback(url);
    }
  },

  generateFallback(url) {
    let letter = '?';
    let colorIndex = 0;
    
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      letter = hostname.charAt(0).toUpperCase();
      colorIndex = hostname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % this.colors.length;
    } catch {}

    const color = this.colors[colorIndex];
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="12" fill="${color}"/>
      <text x="32" y="42" font-family="sans-serif" font-size="32" font-weight="600" fill="white" text-anchor="middle">${letter}</text>
    </svg>`)}`;
  }
};

// ============================================
// App State
// ============================================
const App = {
  settings: null,
  groups: [],
  favorites: [],
  currentGroupId: null,
  currentPage: 0,
  totalPages: 1,
  itemsPerPage: 24,
  searchMode: false,
  searchResults: [],
  editingFavorite: null,
  editingGroup: null,
  contextTarget: null,

  // DOM Elements
  elements: {},

  // ============================================
  // Initialization
  // ============================================
  async init() {
    await this.loadData();
    this.cacheElements();
    this.applySettings();
    this.renderGroups();
    this.selectFirstGroup();
    this.setupEventListeners();
    this.setupKeyboardNavigation();
    this.setupMouseWheelNavigation();
    this.setupSwipeNavigation();
    this.setupSystemThemeListener();
    this.setupGroupScrollButtons();
    this.setupLiveUpdate();
  },

  setupLiveUpdate() {
    // Refresh data when tab becomes visible
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        await this.refreshData();
      }
    });
    
    // Listen for storage changes from other tabs/popup
    // Use flag to ignore our own changes
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area === 'local' && !this._isOwnStorageUpdate) {
        await this.refreshData();
      }
    });
  },
  
  // Flag to prevent storage listener from reacting to our own updates
  _isOwnStorageUpdate: false,

  setupSystemThemeListener() {
    // Listen for system theme changes when using 'system' setting
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.settings.theme === 'system') {
        const theme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
      }
    });
  },

  async loadData() {
    const data = await Storage.init();
    this.settings = data.settings;
    this.groups = data.groups;
    this.favorites = data.favorites;
    this.itemsPerPage = this.settings.grid.columns * this.settings.grid.rows;
    
    // Initialize missing positions for favorites
    await this.ensureFavoritePositions();
  },
  
  async ensureFavoritePositions() {
    let needsSave = false;
    
    // Group favorites by groupId
    const groupedFavorites = {};
    for (const fav of this.favorites) {
      if (!groupedFavorites[fav.groupId]) {
        groupedFavorites[fav.groupId] = [];
      }
      groupedFavorites[fav.groupId].push(fav);
    }
    
    // Ensure each group's favorites have sequential positions
    for (const groupId of Object.keys(groupedFavorites)) {
      const groupFavs = groupedFavorites[groupId];
      // Sort by existing position, putting undefined at end
      groupFavs.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      
      for (let i = 0; i < groupFavs.length; i++) {
        if (groupFavs[i].position !== i) {
          groupFavs[i].position = i;
          needsSave = true;
        }
      }
    }
    
    if (needsSave) {
      this._isOwnStorageUpdate = true;
      await chrome.storage.local.set({ favorites: this.favorites });
      this._isOwnStorageUpdate = false;
    }
  },

  cacheElements() {
    this.elements = {
      app: document.getElementById('app'),
      background: document.getElementById('background'),
      backgroundOverlay: document.getElementById('background-overlay'),
      searchInput: document.getElementById('search-input'),
      searchClear: document.getElementById('search-clear'),
      groupTabs: document.getElementById('group-tabs'),
      addGroupBtn: document.getElementById('add-group-btn'),
      gridContainer: document.getElementById('grid-container'),
      favoritesGrid: document.getElementById('favorites-grid'),
      navLeft: document.getElementById('nav-left'),
      navRight: document.getElementById('nav-right'),
      pagination: document.getElementById('pagination'),
      addFavoriteBtn: document.getElementById('add-favorite-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      sortBtn: document.getElementById('sort-btn'),
      sortDropdown: document.getElementById('sort-dropdown'),
      refreshIconsBtn: document.getElementById('refresh-icons-btn'),
      contextMenu: document.getElementById('context-menu'),
      moveSubmenu: document.getElementById('move-submenu'),
      favoriteModal: document.getElementById('favorite-modal'),
      groupModal: document.getElementById('group-modal'),
      infoModal: document.getElementById('info-modal'),
      settingsModal: document.getElementById('settings-modal'),
      confirmModal: document.getElementById('confirm-modal'),
      toastContainer: document.getElementById('toast-container'),
      groupManagerModal: document.getElementById('group-manager-modal'),
      manageGroupsBtn: document.getElementById('manage-groups-btn')
    };
    
    // Default sort mode
    this.currentSort = 'manual';
  },

  // ============================================
  // Settings Application
  // ============================================
  applySettings() {
    const { settings } = this;
    
    // Theme - with system preference support
    let theme = settings.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Accent Color
    const accentColor = settings.accentColor || '#7f5af0';
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-primary', accentColor);
    
    // Background
    this.applyBackground();
    
    // CSS Variables
    document.documentElement.style.setProperty('--grid-columns', settings.grid.columns);
    document.documentElement.style.setProperty('--grid-rows', settings.grid.rows);
    document.documentElement.style.setProperty('--icon-size', `${settings.grid.iconSize}px`);
    document.documentElement.style.setProperty('--icon-gap', `${settings.grid.gap}px`);
    document.documentElement.style.setProperty('--icon-radius', `${settings.grid.borderRadius}px`);
    document.documentElement.style.setProperty('--label-font-size', `${settings.labels.fontSize}px`);
    document.documentElement.style.setProperty('--label-font-weight', settings.labels.fontWeight || '500');
    
    // Icon settings
    const iconSettings = settings.icons || { opacity: 100, bgDark: '#1a1a2e', bgLight: '#ffffff' };
    const iconOpacity = (iconSettings.opacity ?? 100) / 100;
    const iconBgHex = theme === 'light' ? (iconSettings.bgLight || '#ffffff') : (iconSettings.bgDark || '#1a1a2e');
    
    // Konvertiere Hex zu rgba für Transparenz-Effekt
    const iconBgRgba = this.hexToRgba(iconBgHex, iconOpacity);
    document.documentElement.style.setProperty('--icon-bg-color', iconBgRgba);
    
    // Font Family
    const fontFamily = this.getFontFamily(settings.labels.fontFamily, settings.labels.customFont);
    document.documentElement.style.setProperty('--label-font-family', fontFamily);
    
    // Recalculate items per page
    this.itemsPerPage = settings.grid.columns * settings.grid.rows;
  },
  
  // Hex-Farbe zu rgba konvertieren
  hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  },

  getFontFamily(fontKey, customFont) {
    const fontMap = {
      'system': "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
      'sf-pro': "'SF Pro Display', 'SF Pro Text', -apple-system, sans-serif",
      'inter': "'Inter', -apple-system, sans-serif",
      'roboto': "'Roboto', sans-serif",
      'open-sans': "'Open Sans', sans-serif",
      'lato': "'Lato', sans-serif",
      'montserrat': "'Montserrat', sans-serif",
      'poppins': "'Poppins', sans-serif",
      'nunito': "'Nunito', sans-serif",
      'source-sans': "'Source Sans Pro', sans-serif",
      'ubuntu': "'Ubuntu', sans-serif",
      'fira-sans': "'Fira Sans', sans-serif",
      'custom': customFont || "-apple-system, sans-serif"
    };
    return fontMap[fontKey] || fontMap['system'];
  },

  applyBackground() {
    const { background } = this.settings;
    const el = this.elements.background;
    const overlay = this.elements.backgroundOverlay;
    
    if (!el) {
      console.error('Background element not found!');
      return;
    }
    
    // Determine current theme
    let theme = this.settings.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Reset all background properties first
    el.style.background = '';
    el.style.backgroundImage = '';
    el.style.backgroundColor = '';
    el.classList.remove('has-image');
    
    // Apply background based on type
    if (background.type === 'gradient') {
      el.style.background = background.value;
    } else if (background.type === 'color') {
      el.style.backgroundColor = background.value;
    } else if (background.type === 'image') {
      // Determine which image to use based on theme
      let imageUrl = '';
      
      if (theme === 'light') {
        // Light mode: use light image, or dark image if useDarkForLight is true
        if (background.imageLight) {
          imageUrl = background.imageLight;
        } else if (background.useDarkForLight !== false && background.imageDark) {
          imageUrl = background.imageDark;
        } else if (background.value) {
          // Legacy: use value field
          imageUrl = background.value;
        }
      } else {
        // Dark mode: use dark image
        if (background.imageDark) {
          imageUrl = background.imageDark;
        } else if (background.value) {
          // Legacy: use value field
          imageUrl = background.value;
        }
      }
      
      if (imageUrl) {
        el.style.backgroundImage = `url(${imageUrl})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.classList.add('has-image');
      }
    }
    
    // Apply blur if set (only for images)
    el.style.filter = (background.type === 'image' && background.blur > 0) 
      ? `blur(${background.blur}px)` 
      : 'none';
    
    // Apply overlay (negative = black/darker, positive = white/lighter)
    if (overlay) {
      const overlayValue = background.overlay || 0;
      if (overlayValue < 0) {
        // Negative: black overlay (darker)
        overlay.style.background = `rgba(0, 0, 0, ${Math.abs(overlayValue) / 100})`;
      } else if (overlayValue > 0) {
        // Positive: white overlay (lighter)
        overlay.style.background = `rgba(255, 255, 255, ${overlayValue / 100})`;
      } else {
        overlay.style.background = 'transparent';
      }
    }
  },

  // ============================================
  // Groups
  // ============================================
  renderGroups() {
    const container = this.elements.groupTabs;
    container.innerHTML = '';
    
    const sortedGroups = [...this.groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    sortedGroups.forEach(group => {
      const count = this.favorites.filter(f => f.groupId === group.id).length;
      
      const tab = document.createElement('button');
      tab.className = `group-tab ${group.id === this.currentGroupId ? 'active' : ''}`;
      tab.dataset.groupId = group.id;
      tab.draggable = true;
      
      // Apply group color as CSS variable for this tab
      if (group.color) {
        tab.style.setProperty('--group-color', group.color);
      }
      
      tab.innerHTML = `
        <span class="icon">${group.icon}</span>
        <span class="name">${group.name}</span>
        <span class="count">${count}</span>
        <div class="group-tab-actions">
          <button class="group-tab-action edit-action" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          ${!group.isDefault ? `
          <button class="group-tab-action delete-action" title="Löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          ` : ''}
        </div>
      `;
      
      // Click to select
      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.group-tab-actions')) {
          this.selectGroup(group.id);
        }
      });
      
      // Double-click to edit
      tab.addEventListener('dblclick', () => this.openGroupModal(group));
      
      // Context menu
      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.openGroupModal(group);
      });
      
      // Quick-edit button
      tab.querySelector('.edit-action')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openGroupModal(group);
      });
      
      // Quick-delete button
      tab.querySelector('.delete-action')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.deleteGroup(group.id);
        await this.refreshData();
        this.showToast('Gruppe gelöscht');
      });
      
      // Drag & Drop for reordering
      tab.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/group-id', group.id);
        e.dataTransfer.effectAllowed = 'move';
        tab.classList.add('dragging');
        this.draggedGroupId = group.id;
      });
      
      tab.addEventListener('dragend', () => {
        tab.classList.remove('dragging');
        this.draggedGroupId = null;
      });
      
      tab.addEventListener('dragover', (e) => {
        // Only accept if dragging a group, not a favorite
        if (this.draggedGroupId && this.draggedGroupId !== group.id) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          tab.classList.add('drag-over');
        }
      });
      
      tab.addEventListener('dragleave', () => {
        tab.classList.remove('drag-over');
      });
      
      tab.addEventListener('drop', async (e) => {
        e.preventDefault();
        tab.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('application/group-id');
        if (draggedId && draggedId !== group.id && this.draggedGroupId) {
          await this.reorderGroups(draggedId, group.id);
        }
      });
      
      container.appendChild(tab);
    });
    
    // Check if scroll buttons are needed
    this.updateGroupScrollButtons();
  },

  async reorderGroups(draggedId, targetId) {
    this._isOwnStorageUpdate = true;
    
    try {
      const groups = [...this.groups].sort((a, b) => (a.position || 0) - (b.position || 0));
      const draggedIndex = groups.findIndex(g => g.id === draggedId);
      const targetIndex = groups.findIndex(g => g.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      // Remove dragged item and insert at target position
      const [draggedGroup] = groups.splice(draggedIndex, 1);
      groups.splice(targetIndex, 0, draggedGroup);
      
      // Update positions in array
      for (let i = 0; i < groups.length; i++) {
        groups[i].position = i;
        groups[i].updatedAt = Date.now();
      }
      
      // Save all changes in ONE storage call
      await chrome.storage.local.set({ groups });
      
      // Update local state
      this.groups = groups;
      this.renderGroups();
      this.showToast('Reihenfolge geändert');
    } finally {
      this._isOwnStorageUpdate = false;
    }
  },

  updateGroupScrollButtons() {
    const container = this.elements.groupTabs;
    const leftBtn = document.getElementById('group-scroll-left');
    const rightBtn = document.getElementById('group-scroll-right');
    
    if (!leftBtn || !rightBtn) return;
    
    const hasOverflow = container.scrollWidth > container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const scrollRight = container.scrollWidth - container.clientWidth - scrollLeft;
    
    leftBtn.classList.toggle('hidden', !hasOverflow || scrollLeft < 10);
    rightBtn.classList.toggle('hidden', !hasOverflow || scrollRight < 10);
  },

  setupGroupScrollButtons() {
    const container = this.elements.groupTabs;
    const leftBtn = document.getElementById('group-scroll-left');
    const rightBtn = document.getElementById('group-scroll-right');
    
    if (leftBtn) {
      leftBtn.addEventListener('click', () => {
        container.scrollBy({ left: -200, behavior: 'smooth' });
      });
    }
    
    if (rightBtn) {
      rightBtn.addEventListener('click', () => {
        container.scrollBy({ left: 200, behavior: 'smooth' });
      });
    }
    
    container.addEventListener('scroll', () => this.updateGroupScrollButtons());
    window.addEventListener('resize', () => this.updateGroupScrollButtons());
  },

  selectFirstGroup() {
    if (this.groups.length === 0) return;
    
    const sortedGroups = [...this.groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    let targetGroupId;
    
    const startupSetting = this.settings.startup?.group || 'last';
    
    if (startupSetting === 'last' && this.settings.startup?.lastGroupId) {
      // Use last viewed group if it still exists
      const lastGroup = this.groups.find(g => g.id === this.settings.startup.lastGroupId);
      targetGroupId = lastGroup?.id || sortedGroups[0].id;
    } else if (startupSetting === 'default') {
      // Use default group
      const defaultGroup = this.groups.find(g => g.isDefault);
      targetGroupId = defaultGroup?.id || sortedGroups[0].id;
    } else if (startupSetting !== 'last' && startupSetting !== 'default') {
      // Use specific group ID
      const specificGroup = this.groups.find(g => g.id === startupSetting);
      targetGroupId = specificGroup?.id || sortedGroups[0].id;
    } else {
      // Fallback to first group
      targetGroupId = sortedGroups[0].id;
    }
    
    this.selectGroup(targetGroupId);
  },

  selectGroup(groupId) {
    this.currentGroupId = groupId;
    this.currentPage = 0;
    this.searchMode = false;
    this.elements.searchInput.value = '';
    this.elements.searchClear.classList.add('hidden');
    
    // Save last group for startup
    this.saveSettingImmediate('startup.lastGroupId', groupId);
    
    // Update tabs
    document.querySelectorAll('.group-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.groupId === groupId);
    });
    
    this.renderFavorites();
  },

  // ============================================
  // Favorites Rendering
  // ============================================
  renderFavorites() {
    const grid = this.elements.favoritesGrid;
    
    let items;
    if (this.searchMode) {
      items = this.searchResults;
    } else {
      items = this.favorites.filter(f => f.groupId === this.currentGroupId);
      items = this.applySorting(items);
    }
    
    // Pagination
    this.totalPages = Math.max(1, Math.ceil(items.length / this.itemsPerPage));
    this.currentPage = Math.min(this.currentPage, this.totalPages - 1);
    
    const startIndex = this.currentPage * this.itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + this.itemsPerPage);
    
    // Render
    grid.innerHTML = '';
    
    if (pageItems.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-illustration">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="2" opacity="0.2"/>
              <rect x="35" y="30" width="50" height="60" rx="8" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <path d="M45 50h30M45 60h20M45 70h25" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
              <circle cx="85" cy="85" r="20" fill="var(--accent-primary)" opacity="0.2"/>
              <path d="M80 85h10M85 80v10" stroke="var(--accent-primary)" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>${this.searchMode ? 'Keine Ergebnisse' : 'Noch keine Favoriten'}</h3>
          <p>${this.searchMode ? 'Versuche einen anderen Suchbegriff.' : 'Füge deinen ersten Favoriten hinzu oder importiere Lesezeichen.'}</p>
          ${!this.searchMode ? `
            <div class="empty-actions">
              <button id="add-first-btn" class="btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Favorit hinzufügen
              </button>
              <button id="import-first-btn" class="btn-secondary">Importieren</button>
            </div>
          ` : ''}
        </div>
      `;
      
      // Add event listeners for empty state buttons
      if (!this.searchMode) {
        document.getElementById('add-first-btn')?.addEventListener('click', () => this.openFavoriteModal());
        document.getElementById('import-first-btn')?.addEventListener('click', () => {
          this.openSettingsModal();
          // Navigate to data tab
          setTimeout(() => {
            document.querySelector('[data-settings-tab="data"]')?.click();
          }, 100);
        });
      }
    } else {
      pageItems.forEach((fav, index) => {
        const item = this.createFavoriteElement(fav, index);
        grid.appendChild(item);
      });
    }
    
    this.renderPagination();
    this.updateNavigationArrows();
  },
  
  // Sortierung anwenden
  applySorting(items) {
    const sorted = [...items];
    
    switch (this.currentSort) {
      case 'name-asc':
        sorted.sort((a, b) => {
          const nameA = (a.alias || Storage.getHostname(a.url)).toLowerCase();
          const nameB = (b.alias || Storage.getHostname(b.url)).toLowerCase();
          return nameA.localeCompare(nameB, 'de');
        });
        break;
      case 'name-desc':
        sorted.sort((a, b) => {
          const nameA = (a.alias || Storage.getHostname(a.url)).toLowerCase();
          const nameB = (b.alias || Storage.getHostname(b.url)).toLowerCase();
          return nameB.localeCompare(nameA, 'de');
        });
        break;
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case 'visits-desc':
        sorted.sort((a, b) => (b.visits || 0) - (a.visits || 0));
        break;
      case 'manual':
      default:
        sorted.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
        break;
    }
    
    return sorted;
  },
  
  // Sichtbare Favoriten für Tastenkürzel
  getVisibleFavorites() {
    let items = this.favorites.filter(f => f.groupId === this.currentGroupId);
    items = this.applySorting(items);
    
    const startIndex = this.currentPage * this.itemsPerPage;
    return items.slice(startIndex, startIndex + this.itemsPerPage);
  },

  createFavoriteElement(favorite, index) {
    const item = document.createElement('a');
    item.className = `favorite-item ${this.settings.grid.showShadow ? 'has-shadow' : ''}`;
    item.href = favorite.url;
    item.dataset.favoriteId = favorite.id;
    item.style.animationDelay = `${index * 0.02}s`;
    item.draggable = true;
    
    const displayName = favorite.alias || Storage.getHostname(favorite.url);
    const truncatedName = displayName.length > this.settings.labels.maxLength 
      ? displayName.substring(0, this.settings.labels.maxLength) + '...'
      : displayName;
    
    const defaultGroup = this.groups.find(g => g.isDefault);
    const isInDefaultGroup = favorite.groupId === defaultGroup?.id;
    
    item.innerHTML = `
      <!-- Edit button - LEFT side -->
      <div class="quick-edit-left">
        <button class="quick-action edit-action" title="Bearbeiten">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
      
      <!-- Delete/Archive buttons - RIGHT side -->
      <div class="quick-edit-right">
        <button class="quick-action delete-action" title="Löschen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        ${!isInDefaultGroup ? `
        <button class="quick-action archive-action" title="Zu ${defaultGroup?.name || 'Favoriten'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
          </svg>
        </button>
        ` : ''}
      </div>
      
      <div class="favorite-icon">
        <img src="${favorite.customIcon || Favicon.generateFallback(favorite.url)}" 
             alt="${displayName}"
             onerror="this.src='${Favicon.generateFallback(favorite.url)}'">
        <div class="favorite-hover-actions">
          <button class="hover-action open-bg" title="Im Hintergrund öffnen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18M21 9H9"/>
            </svg>
          </button>
        </div>
      </div>
      ${this.settings.labels.show ? `<span class="favorite-label" title="${displayName}">${truncatedName}</span>` : ''}
    `;
    
    item.querySelector('.favorite-icon').title = `${displayName}\n${favorite.url}`;
    this.loadFavicon(item.querySelector('img'), favorite);
    
    // Click events
    item.addEventListener('click', (e) => this.handleFavoriteClick(e, favorite));
    item.addEventListener('contextmenu', (e) => this.handleFavoriteContextMenu(e, favorite));
    item.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        window.open(favorite.url, '_blank');
      }
    });
    
    // Drag & Drop for reordering
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/favorite-id', favorite.id);
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
      this.draggedFavoriteId = favorite.id;
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      this.draggedFavoriteId = null;
    });
    
    item.addEventListener('dragover', (e) => {
      if (this.draggedFavoriteId && this.draggedFavoriteId !== favorite.id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      }
    });
    
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    
    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('application/favorite-id');
      if (draggedId && draggedId !== favorite.id) {
        await this.reorderFavorites(draggedId, favorite.id);
      }
    });
    
    // Button handlers
    item.querySelector('.open-bg')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(favorite.url, '_blank');
      this.showToast('Im Hintergrund geöffnet');
    });
    
    item.querySelector('.edit-action')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openFavoriteModal(favorite);
    });
    
    item.querySelector('.delete-action')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await Storage.deleteFavorite(favorite.id);
      await this.refreshData();
      this.showToast('Gelöscht');
    });
    
    item.querySelector('.archive-action')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (defaultGroup) {
        await Storage.moveFavorite(favorite.id, defaultGroup.id);
        await this.refreshData();
        this.showToast(`Zu "${defaultGroup.name}" verschoben`);
      }
    });
    
    return item;
  },

  draggedFavoriteId: null,
  draggedGroupId: null,
  _managerDragging: false,
  _managerDropZonesReady: false,

  async reorderFavorites(draggedId, targetId) {
    // Prevent storage listener from reacting
    this._isOwnStorageUpdate = true;
    
    try {
      // Work with the actual favorites array, not a filtered copy
      const allFavorites = await Storage.getFavorites();
      const groupFavorites = allFavorites
        .filter(f => f.groupId === this.currentGroupId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const draggedIndex = groupFavorites.findIndex(f => f.id === draggedId);
      const targetIndex = groupFavorites.findIndex(f => f.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      // Reorder in the filtered array
      const [draggedItem] = groupFavorites.splice(draggedIndex, 1);
      groupFavorites.splice(targetIndex, 0, draggedItem);
      
      // Update positions in the main favorites array
      for (let i = 0; i < groupFavorites.length; i++) {
        const fav = allFavorites.find(f => f.id === groupFavorites[i].id);
        if (fav) {
          fav.position = i;
          fav.updatedAt = Date.now();
        }
      }
      
      // Save all changes in ONE storage call
      await chrome.storage.local.set({ favorites: allFavorites });
      
      // Update local state
      this.favorites = allFavorites;
      this.renderFavorites();
      this.showToast('Reihenfolge geändert');
    } finally {
      this._isOwnStorageUpdate = false;
    }
  },

  async loadFavicon(img, favorite) {
    if (favorite.customIcon) return;
    
    const favicon = await Favicon.get(favorite.url);
    img.src = favicon;
  },

  handleFavoriteClick(e, favorite) {
    e.preventDefault();
    
    const clickBehavior = this.settings.navigation?.clickBehavior || 'newTab';
    
    if (clickBehavior === 'newTab') {
      // Standard: Neuer Tab, Ctrl/Cmd = aktueller Tab
      if (e.ctrlKey || e.metaKey) {
        window.location.href = favorite.url;
      } else {
        window.open(favorite.url, '_blank');
      }
    } else {
      // Klassisch: Aktueller Tab, Ctrl/Cmd = neuer Tab
      if (e.ctrlKey || e.metaKey) {
        window.open(favorite.url, '_blank');
      } else {
        window.location.href = favorite.url;
      }
    }
    
    // Track visit
    Storage.updateFavorite(favorite.id, {
      visitCount: (favorite.visitCount || 0) + 1,
      lastVisited: Date.now()
    });
  },

  handleFavoriteContextMenu(e, favorite) {
    e.preventDefault();
    e.stopPropagation();
    
    this.contextTarget = favorite;
    this.showContextMenu(e.clientX, e.clientY);
  },

  // ============================================
  // Pagination
  // ============================================
  renderPagination() {
    const container = this.elements.pagination;
    container.innerHTML = '';
    
    if (this.totalPages <= 1) return;
    
    for (let i = 0; i < this.totalPages; i++) {
      const dot = document.createElement('button');
      dot.className = `page-dot ${i === this.currentPage ? 'active' : ''}`;
      dot.addEventListener('click', () => this.goToPage(i));
      container.appendChild(dot);
    }
  },

  updateNavigationArrows() {
    const showArrows = this.settings.navigation.showArrows && this.totalPages > 1;
    
    this.elements.navLeft.classList.toggle('hidden', !showArrows || this.currentPage === 0);
    this.elements.navRight.classList.toggle('hidden', !showArrows || this.currentPage >= this.totalPages - 1);
  },

  goToPage(page) {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) return;
    
    const direction = page > this.currentPage ? 'left' : 'right';
    const grid = this.elements.favoritesGrid;
    
    if (this.settings.animations.pageTransition === 'slide') {
      grid.classList.add(`slide-${direction}`);
      setTimeout(() => {
        this.currentPage = page;
        this.renderFavorites();
        grid.classList.remove(`slide-${direction}`);
      }, 200);
    } else if (this.settings.animations.pageTransition === 'fade') {
      grid.classList.add('fade-out');
      setTimeout(() => {
        this.currentPage = page;
        this.renderFavorites();
        grid.classList.remove('fade-out');
      }, 200);
    } else {
      this.currentPage = page;
      this.renderFavorites();
    }
  },

  nextPage() {
    this.goToPage(this.currentPage + 1);
  },

  prevPage() {
    this.goToPage(this.currentPage - 1);
  },

  // ============================================
  // Context Menu
  // ============================================
  showContextMenu(x, y) {
    const menu = this.elements.contextMenu;
    menu.classList.remove('hidden');
    
    // Position
    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 10;
    const maxY = window.innerHeight - rect.height - 10;
    
    menu.style.left = `${Math.min(x, maxX)}px`;
    menu.style.top = `${Math.min(y, maxY)}px`;
    
    // Build move submenu
    this.buildMoveSubmenu();
  },

  hideContextMenu() {
    this.elements.contextMenu.classList.add('hidden');
    this.elements.moveSubmenu.classList.add('hidden');
    this.contextTarget = null;
  },

  buildMoveSubmenu() {
    const submenu = this.elements.moveSubmenu;
    submenu.innerHTML = '';
    
    this.groups.forEach(group => {
      if (group.id === this.contextTarget?.groupId) return;
      
      const btn = document.createElement('button');
      btn.innerHTML = `<span>${group.icon}</span> ${group.name}`;
      btn.addEventListener('click', () => this.moveToGroup(group.id));
      submenu.appendChild(btn);
    });
  },

  showMoveSubmenu(button) {
    const submenu = this.elements.moveSubmenu;
    const rect = button.getBoundingClientRect();
    
    submenu.classList.remove('hidden');
    submenu.style.left = `${rect.right + 5}px`;
    submenu.style.top = `${rect.top}px`;
  },

  async moveToGroup(groupId) {
    if (!this.contextTarget) return;
    
    await Storage.moveFavorite(this.contextTarget.id, groupId);
    await this.refreshData();
    this.hideContextMenu();
    this.showToast('Favorit verschoben');
  },

  // ============================================
  // Search
  // ============================================
  async handleSearch(query) {
    const dropdown = document.getElementById('search-dropdown');
    const favoritesSection = document.getElementById('favorites-results');
    const favoritesList = document.getElementById('favorites-results-list');
    const queryDisplay = document.getElementById('search-query-display');
    
    if (!query || query.trim() === '') {
      dropdown.classList.add('hidden');
      this.searchMode = false;
      this.searchResults = [];
      this.elements.searchClear.classList.add('hidden');
      this.renderFavorites();
      return;
    }
    
    this.elements.searchClear.classList.remove('hidden');
    queryDisplay.textContent = query;
    
    // Check if it's a URL
    if (this.isValidUrl(query)) {
      dropdown.classList.add('hidden');
      return;
    }
    
    // Search favorites
    this.searchResults = await Storage.search(query);
    
    // Show dropdown with results
    dropdown.classList.remove('hidden');
    
    if (this.searchResults.length > 0) {
      favoritesSection.classList.remove('hidden');
      favoritesList.innerHTML = '';
      
      // Show max 8 results in dropdown
      const displayResults = this.searchResults.slice(0, 8);
      
      displayResults.forEach((fav, index) => {
        const group = this.groups.find(g => g.id === fav.groupId);
        const displayName = fav.alias || Storage.getHostname(fav.url);
        
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.dataset.index = index;
        item.innerHTML = `
          <img src="${Favicon.generateFallback(fav.url)}" alt="">
          <div class="search-result-info">
            <div class="search-result-title">${this.highlightMatch(displayName, query)}</div>
            <div class="search-result-url">${this.highlightMatch(fav.url, query)}</div>
          </div>
          ${group ? `<span class="search-result-group">${group.icon} ${group.name}</span>` : ''}
        `;
        
        item.addEventListener('click', () => {
          window.location.href = fav.url;
        });
        
        item.addEventListener('mouseenter', () => {
          document.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          this.selectedSearchIndex = index + 1; // +1 because web search is 0
        });
        
        // Load actual favicon
        Favicon.get(fav.url).then(src => {
          item.querySelector('img').src = src;
        });
        
        favoritesList.appendChild(item);
      });
      
      // Also update the grid to show only matches
      this.searchMode = true;
      this.currentPage = 0;
      this.renderFavorites();
    } else {
      favoritesSection.classList.add('hidden');
      this.searchMode = false;
      this.renderFavorites();
    }
  },

  highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  performExternalSearch(query) {
    const searchUrl = this.settings.search.engine.replace('%s', encodeURIComponent(query));
    window.location.href = searchUrl;
  },

  isValidUrl(string) {
    try {
      const url = string.startsWith('http') ? string : `https://${string}`;
      new URL(url);
      return string.includes('.');
    } catch {
      return false;
    }
  },

  selectedSearchIndex: 0,

  updateSearchSelection(items) {
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedSearchIndex - 1);
    });
    // Web search option
    document.getElementById('web-search-option')?.classList.toggle('selected', this.selectedSearchIndex === 0);
  },

  // ============================================
  // Modals
  // ============================================
  openFavoriteModal(favorite = null) {
    this.editingFavorite = favorite;
    const modal = this.elements.favoriteModal;
    const title = document.getElementById('favorite-modal-title');
    
    title.textContent = favorite ? 'Favorit bearbeiten' : 'Favorit hinzufügen';
    
    // Fill form
    document.getElementById('fav-url').value = favorite?.url || '';
    document.getElementById('fav-alias').value = favorite?.alias || '';
    document.getElementById('fav-description').value = favorite?.description || '';
    document.getElementById('fav-tags').value = (favorite?.tags || []).join(', ');
    
    // Group select
    const groupSelect = document.getElementById('fav-group');
    groupSelect.innerHTML = this.groups.map(g => 
      `<option value="${g.id}" ${g.id === (favorite?.groupId || this.currentGroupId) ? 'selected' : ''}>
        ${g.icon} ${g.name}
      </option>`
    ).join('');
    
    // Icon preview
    const preview = document.getElementById('icon-preview');
    if (favorite?.customIcon || favorite?.url) {
      preview.innerHTML = `<img src="${favorite.customIcon || Favicon.generateFallback(favorite.url)}">`;
    } else {
      preview.innerHTML = '';
    }
    
    modal.classList.remove('hidden');
    document.getElementById('fav-url').focus();
  },

  closeFavoriteModal() {
    this.elements.favoriteModal.classList.add('hidden');
    this.editingFavorite = null;
  },

  async saveFavorite() {
    const url = document.getElementById('fav-url').value.trim();
    const alias = document.getElementById('fav-alias').value.trim();
    const description = document.getElementById('fav-description').value.trim();
    const tagsStr = document.getElementById('fav-tags').value.trim();
    const groupId = document.getElementById('fav-group').value;
    
    if (!url) {
      this.showToast('Bitte gib eine URL ein', 'error');
      return;
    }
    
    // Validate URL
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      validUrl = 'https://' + url;
    }
    
    try {
      new URL(validUrl);
    } catch {
      this.showToast('Ungültige URL', 'error');
      return;
    }
    
    // Duplikat-Prüfung (nur bei neuen Favoriten)
    if (!this.editingFavorite) {
      const normalizedUrl = this.normalizeUrl(validUrl);
      const duplicate = this.favorites.find(f => this.normalizeUrl(f.url) === normalizedUrl);
      
      if (duplicate) {
        const dupName = duplicate.alias || Storage.getHostname(duplicate.url);
        const dupGroup = this.groups.find(g => g.id === duplicate.groupId);
        this.showToast(`URL existiert bereits: "${dupName}" in ${dupGroup?.name || 'Unbekannt'}`, 'error');
        return;
      }
    }
    
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    // Hole customIcon aus der Vorschau oder dem editingFavorite
    const iconPreview = document.getElementById('icon-preview').querySelector('img');
    let customIcon = null;
    if (this.editingFavorite?.customIcon) {
      customIcon = this.editingFavorite.customIcon;
    } else if (iconPreview && iconPreview.src.startsWith('data:')) {
      customIcon = iconPreview.src;
    }
    
    const data = {
      url: validUrl,
      alias,
      description,
      tags,
      groupId,
      customIcon
    };
    
    if (this.editingFavorite) {
      await Storage.updateFavorite(this.editingFavorite.id, data);
      this.showToast('Favorit aktualisiert');
    } else {
      await Storage.addFavorite(data);
      this.showToast('Favorit hinzugefügt');
    }
    
    this.closeFavoriteModal();
    await this.refreshData();
  },
  
  // URL normalisieren für Vergleich (entfernt trailing slash, www, etc.)
  normalizeUrl(url) {
    try {
      const u = new URL(url);
      let normalized = u.hostname.replace(/^www\./, '') + u.pathname;
      normalized = normalized.replace(/\/+$/, ''); // trailing slashes entfernen
      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  },

  openGroupModal(group = null) {
    this.editingGroup = group;
    const modal = this.elements.groupModal;
    const title = document.getElementById('group-modal-title');
    const deleteBtn = document.getElementById('delete-group-btn');
    
    title.textContent = group ? 'Gruppe bearbeiten' : 'Neue Gruppe';
    deleteBtn.style.display = group && !group.isDefault ? 'block' : 'none';
    
    document.getElementById('group-name').value = group?.name || '';
    document.getElementById('group-icon').value = group?.icon || '⭐';
    document.getElementById('group-color').value = group?.color || '#7f5af0';
    
    modal.classList.remove('hidden');
    document.getElementById('group-name').focus();
  },

  closeGroupModal() {
    this.elements.groupModal.classList.add('hidden');
    this.editingGroup = null;
  },

  async saveGroup() {
    const name = document.getElementById('group-name').value.trim();
    const icon = document.getElementById('group-icon').value || '⭐';
    const color = document.getElementById('group-color').value;
    
    if (!name) {
      this.showToast('Bitte gib einen Namen ein', 'error');
      return;
    }
    
    const data = { name, icon, color };
    
    if (this.editingGroup) {
      await Storage.updateGroup(this.editingGroup.id, data);
      this.showToast('Gruppe aktualisiert');
    } else {
      const newGroup = await Storage.addGroup(data);
      this.showToast('Gruppe erstellt');
      this.selectGroup(newGroup.id);
    }
    
    this.closeGroupModal();
    await this.refreshData();
  },

  async deleteGroup() {
    if (!this.editingGroup || this.editingGroup.isDefault) return;
    
    this.showConfirm(
      `Gruppe "${this.editingGroup.name}" wirklich löschen? Alle Favoriten werden in die Standardgruppe verschoben.`,
      async () => {
        await Storage.deleteGroup(this.editingGroup.id);
        this.closeGroupModal();
        await this.refreshData();
        this.selectFirstGroup();
        this.showToast('Gruppe gelöscht');
      }
    );
  },

  async openInfoModal(favorite) {
    const modal = this.elements.infoModal;
    const content = document.getElementById('info-content');
    
    content.innerHTML = `
      <div class="info-loading">
        <div class="spinner"></div>
        <p>Lade Informationen...</p>
      </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Basic info
    let html = `
      <div class="info-item">
        <label>URL</label>
        <p><a href="${favorite.url}" target="_blank">${favorite.url}</a></p>
      </div>
      <div class="info-item">
        <label>Name</label>
        <p>${favorite.alias || Storage.getHostname(favorite.url)}</p>
      </div>
    `;
    
    if (favorite.description) {
      html += `
        <div class="info-item">
          <label>Beschreibung</label>
          <p>${favorite.description}</p>
        </div>
      `;
    }
    
    if (favorite.tags?.length > 0) {
      html += `
        <div class="info-item">
          <label>Tags</label>
          <p>${favorite.tags.join(', ')}</p>
        </div>
      `;
    }
    
    html += `
      <div class="info-item">
        <label>Hinzugefügt</label>
        <p>${new Date(favorite.createdAt).toLocaleString()}</p>
      </div>
      <div class="info-item">
        <label>Besuche</label>
        <p>${favorite.visitCount || 0}</p>
      </div>
    `;
    
    if (favorite.lastVisited) {
      html += `
        <div class="info-item">
          <label>Zuletzt besucht</label>
          <p>${new Date(favorite.lastVisited).toLocaleString()}</p>
        </div>
      `;
    }
    
    html += `
      <div class="info-item">
        <label>Quelle</label>
        <p>${favorite.source === 'browser' ? 'Browser-Import' : 'Manuell'}</p>
      </div>
    `;
    
    content.innerHTML = html;
  },

  closeInfoModal() {
    this.elements.infoModal.classList.add('hidden');
  },

  openSettingsModal() {
    this.elements.settingsModal.classList.remove('hidden');
    this.populateSettingsForm();
    
    // Ensure gradient buttons show their colors
    document.querySelectorAll('.gradient-option').forEach(btn => {
      btn.style.background = btn.dataset.gradient;
    });
  },

  closeSettingsModal() {
    this.elements.settingsModal.classList.add('hidden');
  },

  populateSettingsForm() {
    const s = this.settings;
    
    // Appearance
    document.getElementById('setting-theme').value = s.theme;
    document.getElementById('setting-bg-type').value = s.background.type;
    this.updateBackgroundOptions();
    
    // Accent Color
    const accentColor = s.accentColor || '#7f5af0';
    document.querySelectorAll('#accent-color-palette .color-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === accentColor);
    });
    
    // Custom gradient colors
    const customGradient = s.background.customGradient || { color1: '#1a1a2e', color2: '#16213e' };
    document.getElementById('setting-gradient-color1').value = customGradient.color1;
    document.getElementById('setting-gradient-color2').value = customGradient.color2;
    document.getElementById('setting-gradient-brightness').value = s.background.brightness || 100;
    document.getElementById('gradient-brightness-value').textContent = `${s.background.brightness || 100}%`;
    
    if (s.background.type === 'color') {
      document.getElementById('setting-bg-color').value = s.background.value;
    } else if (s.background.type === 'image') {
      // Dark mode image
      const darkUrl = s.background.imageDark || s.background.value || '';
      document.getElementById('setting-bg-url-dark').value = darkUrl;
      this.updateBgPreview('dark', darkUrl);
      
      // Light mode image
      const lightUrl = s.background.imageLight || '';
      document.getElementById('setting-bg-url-light').value = lightUrl;
      this.updateBgPreview('light', lightUrl);
      
      // Use dark for light checkbox
      document.getElementById('setting-use-dark-for-light').checked = s.background.useDarkForLight !== false;
      
      // Blur and overlay
      document.getElementById('setting-bg-blur').value = s.background.blur || 0;
      document.getElementById('setting-bg-overlay').value = s.background.overlay || 0;
      document.getElementById('blur-value').textContent = `${s.background.blur || 0}px`;
      document.getElementById('overlay-value').textContent = s.background.overlay || 0;
    }
    
    // Mark active gradient
    document.querySelectorAll('.gradient-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gradient === s.background.value);
      btn.style.background = btn.dataset.gradient;
    });
    
    document.getElementById('setting-hover').checked = s.animations.hover;
    document.getElementById('setting-transition').value = s.animations.pageTransition;
    
    // Grid
    document.getElementById('setting-columns').value = s.grid.columns;
    document.getElementById('setting-rows').value = s.grid.rows;
    document.getElementById('setting-icon-size').value = s.grid.iconSize;
    document.getElementById('icon-size-value').textContent = `${s.grid.iconSize}px`;
    document.getElementById('setting-gap').value = s.grid.gap;
    document.getElementById('gap-value').textContent = `${s.grid.gap}px`;
    document.getElementById('setting-radius').value = s.grid.borderRadius;
    document.getElementById('radius-value').textContent = `${s.grid.borderRadius}px`;
    document.getElementById('setting-shadow').checked = s.grid.showShadow;
    
    // Icon background settings
    const iconSettings = s.icons || { opacity: 100, bgDark: '#1a1a2e', bgLight: '#ffffff' };
    document.getElementById('setting-icon-opacity').value = iconSettings.opacity ?? 100;
    document.getElementById('icon-opacity-value').textContent = `${iconSettings.opacity ?? 100}%`;
    document.getElementById('setting-icon-bg-dark').value = iconSettings.bgDark || '#1a1a2e';
    document.getElementById('setting-icon-bg-light').value = iconSettings.bgLight || '#ffffff';
    
    document.getElementById('setting-labels').checked = s.labels.show;
    document.getElementById('setting-label-pos').value = s.labels.position;
    document.getElementById('setting-font-size').value = s.labels.fontSize;
    document.getElementById('font-size-value').textContent = `${s.labels.fontSize}px`;
    document.getElementById('setting-max-chars').value = s.labels.maxLength;
    
    // Font settings
    document.getElementById('setting-font-family').value = s.labels.fontFamily || 'system';
    document.getElementById('setting-custom-font').value = s.labels.customFont || '';
    document.getElementById('setting-font-weight').value = s.labels.fontWeight || '500';
    document.getElementById('custom-font-row').style.display = s.labels.fontFamily === 'custom' ? 'flex' : 'none';
    
    // Search
    document.getElementById('setting-search-engine').value = s.search.engine;
    document.getElementById('setting-instant-search').checked = s.search.instantSearch;
    
    // Navigation
    document.getElementById('setting-click-behavior').value = s.navigation.clickBehavior || 'newTab';
    document.getElementById('setting-keyboard').checked = s.navigation.keyboard;
    document.getElementById('setting-mousewheel').checked = s.navigation.mousewheel;
    document.getElementById('setting-swipe').checked = s.navigation.swipe;
    document.getElementById('setting-arrows').checked = s.navigation.showArrows;
    
    // Startup settings
    const startupSelect = document.getElementById('setting-startup-group');
    if (startupSelect) {
      // Clear and repopulate options
      startupSelect.innerHTML = `
        <option value="last">Letzte Gruppe</option>
        <option value="default">Standard-Gruppe</option>
      `;
      // Add all groups as options
      const sortedGroups = [...this.groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      sortedGroups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = `${g.icon} ${g.name}`;
        startupSelect.appendChild(opt);
      });
      startupSelect.value = s.startup?.group || 'last';
    }
    
    // Group order list
    this.renderGroupOrderList();
  },

  renderGroupOrderList() {
    const container = document.getElementById('group-order-list');
    if (!container) return;
    
    const sortedGroups = [...this.groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    container.innerHTML = sortedGroups.map(group => `
      <div class="group-order-item" data-group-id="${group.id}" draggable="true">
        <span class="group-order-handle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="16" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="8" y1="18" x2="16" y2="18"/>
          </svg>
        </span>
        <span class="group-order-icon">${group.icon}</span>
        <span class="group-order-name">${group.name}</span>
        ${group.isDefault ? '<span class="group-order-default">Standard</span>' : ''}
      </div>
    `).join('');
    
    // Setup drag & drop
    let draggedOrderItemId = null;
    
    container.querySelectorAll('.group-order-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/group-order-id', item.dataset.groupId);
        item.classList.add('dragging');
        draggedOrderItemId = item.dataset.groupId;
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedOrderItemId = null;
      });
      
      item.addEventListener('dragover', (e) => {
        if (draggedOrderItemId && draggedOrderItemId !== item.dataset.groupId) {
          e.preventDefault();
          item.classList.add('drag-over');
        }
      });
      
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });
      
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('application/group-order-id');
        const targetId = item.dataset.groupId;
        if (draggedId && draggedId !== targetId) {
          await this.reorderGroups(draggedId, targetId);
          this.renderGroupOrderList();
        }
      });
    });
  },

  updateBackgroundOptions() {
    const type = document.getElementById('setting-bg-type').value;
    document.getElementById('bg-gradient-options').classList.toggle('hidden', type !== 'gradient');
    document.getElementById('bg-color-options').classList.toggle('hidden', type !== 'color');
    document.getElementById('bg-image-options').classList.toggle('hidden', type !== 'image');
  },
  
  updateBgPreview(mode, imageUrl) {
    const preview = document.getElementById(`bg-preview-${mode}`);
    if (preview) {
      if (imageUrl) {
        preview.style.backgroundImage = `url(${imageUrl})`;
        preview.style.display = 'block';
      } else {
        preview.style.backgroundImage = '';
        preview.style.display = 'none';
      }
    }
  },

  async saveSettingImmediate(key, value) {
    const keys = key.split('.');
    const update = {};
    let current = update;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    this.settings = await Storage.updateSettings(update);
    this.applySettings();
    this.renderFavorites();
  },

  showConfirm(message, onConfirm) {
    const modal = this.elements.confirmModal;
    document.getElementById('confirm-message').textContent = message;
    modal.classList.remove('hidden');
    
    this._confirmCallback = onConfirm;
  },

  closeConfirmModal(confirmed) {
    this.elements.confirmModal.classList.add('hidden');
    
    if (confirmed && this._confirmCallback) {
      this._confirmCallback();
    }
    this._confirmCallback = null;
  },

  // ============================================
  // Group Manager
  // ============================================
  managerLeftGroupId: null,
  managerRightGroupId: null,
  managerSelectedItems: new Set(),

  openGroupManager() {
    this.elements.groupManagerModal.classList.remove('hidden');
    this.managerSelectedItems.clear();
    this._managerDragging = false;
    
    // Populate group selectors
    const leftSelect = document.getElementById('manager-group-left');
    const rightSelect = document.getElementById('manager-group-right');
    
    const sortedGroups = [...this.groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    leftSelect.innerHTML = sortedGroups.map(g => 
      `<option value="${g.id}">${g.icon} ${g.name}</option>`
    ).join('');
    
    rightSelect.innerHTML = sortedGroups.map(g => 
      `<option value="${g.id}">${g.icon} ${g.name}</option>`
    ).join('');
    
    // Set initial selections (first two different groups)
    this.managerLeftGroupId = sortedGroups[0]?.id;
    this.managerRightGroupId = sortedGroups[1]?.id || sortedGroups[0]?.id;
    
    leftSelect.value = this.managerLeftGroupId;
    rightSelect.value = this.managerRightGroupId;
    
    // Setup drop zones ONCE per modal open
    if (!this._managerDropZonesReady) {
      this.setupManagerDropZones();
      this._managerDropZonesReady = true;
    }
    this.setupGroupManagerEvents();
    this.renderManagerPanels();
  },

  closeGroupManager() {
    this.elements.groupManagerModal.classList.add('hidden');
    this.managerSelectedItems.clear();
    this._managerDragging = false;
  },
  
  setupManagerDropZones() {
    ['left', 'right'].forEach(side => {
      const panel = document.getElementById(`panel-${side}-content`).closest('.group-panel');
      
      panel.addEventListener('dragover', (e) => {
        if (this._managerDragging) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          panel.classList.add('drag-over');
        }
      });
      
      panel.addEventListener('dragleave', (e) => {
        if (!panel.contains(e.relatedTarget)) {
          panel.classList.remove('drag-over');
        }
      });
      
      panel.addEventListener('drop', async (e) => {
        e.preventDefault();
        panel.classList.remove('drag-over');
        
        try {
          const dataStr = e.dataTransfer.getData('application/manager-items');
          if (!dataStr) return;
          
          const data = JSON.parse(dataStr);
          
          // Don't drop on same side
          if (data.fromSide === side) return;
          
          const targetGroupId = side === 'left' ? this.managerLeftGroupId : this.managerRightGroupId;
          
          // Move all selected items
          for (const id of data.ids) {
            await Storage.moveFavorite(id, targetGroupId);
          }
          
          this.managerSelectedItems.clear();
          await this.refreshData();
          this.renderManagerPanels();
          
          this.showToast(`${data.ids.length} Favorit(en) verschoben`);
        } catch (err) {
          console.error('Drop error:', err);
        }
      });
    });
  },

  setupGroupManagerEvents() {
    const leftSelect = document.getElementById('manager-group-left');
    const rightSelect = document.getElementById('manager-group-right');
    
    leftSelect.onchange = () => {
      this.managerLeftGroupId = leftSelect.value;
      this.managerSelectedItems.clear();
      this.renderManagerPanels();
    };
    
    rightSelect.onchange = () => {
      this.managerRightGroupId = rightSelect.value;
      this.managerSelectedItems.clear();
      this.renderManagerPanels();
    };
    
    // Move all buttons
    document.getElementById('move-all-right').onclick = () => this.moveAllItems('left', 'right');
    document.getElementById('move-all-left').onclick = () => this.moveAllItems('right', 'left');
    
    // Close button
    this.elements.groupManagerModal.querySelector('[data-action="close"]').onclick = () => this.closeGroupManager();
    this.elements.groupManagerModal.querySelector('.modal-close').onclick = () => this.closeGroupManager();
    this.elements.groupManagerModal.querySelector('.modal-backdrop').onclick = () => this.closeGroupManager();
  },

  renderManagerPanels() {
    this.renderManagerPanel('left', this.managerLeftGroupId);
    this.renderManagerPanel('right', this.managerRightGroupId);
  },

  renderManagerPanel(side, groupId) {
    const group = this.groups.find(g => g.id === groupId);
    const favorites = this.favorites
      .filter(f => f.groupId === groupId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    // Update header
    document.getElementById(`panel-${side}-icon`).textContent = group?.icon || '📁';
    document.getElementById(`panel-${side}-title`).textContent = group?.name || 'Unbekannt';
    document.getElementById(`panel-${side}-count`).textContent = favorites.length;
    
    // Render items
    const content = document.getElementById(`panel-${side}-content`);
    
    if (favorites.length === 0) {
      content.innerHTML = `
        <div class="panel-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <p>Keine Favoriten in dieser Gruppe</p>
        </div>
      `;
      return;
    }
    
    content.innerHTML = favorites.map(fav => {
      const displayName = fav.alias || Storage.getHostname(fav.url);
      const isSelected = this.managerSelectedItems.has(fav.id);
      return `
        <div class="panel-item ${isSelected ? 'selected' : ''}" 
             data-id="${fav.id}" 
             data-side="${side}"
             draggable="true">
          <img src="${Favicon.generateFallback(fav.url)}" alt="">
          <div class="panel-item-info">
            <div class="panel-item-title">${displayName}</div>
            <div class="panel-item-url">${fav.url}</div>
          </div>
          <span class="panel-item-source ${fav.source}">${fav.source === 'browser' ? 'Import' : 'Manuell'}</span>
        </div>
      `;
    }).join('');
    
    // Load favicons
    content.querySelectorAll('.panel-item').forEach(item => {
      const fav = favorites.find(f => f.id === item.dataset.id);
      if (fav) {
        Favicon.get(fav.url).then(src => {
          item.querySelector('img').src = src;
        });
      }
    });
    
    // Setup drag & drop and selection for items
    this.setupPanelItemEvents(content, side);
  },

  setupPanelItemEvents(container, side) {
    container.querySelectorAll('.panel-item').forEach(item => {
      // Click to select
      item.addEventListener('click', (e) => {
        const id = item.dataset.id;
        
        if (e.shiftKey) {
          // Multi-select with shift
          if (this.managerSelectedItems.has(id)) {
            this.managerSelectedItems.delete(id);
            item.classList.remove('selected');
          } else {
            this.managerSelectedItems.add(id);
            item.classList.add('selected');
          }
        } else {
          // Single select
          this.managerSelectedItems.clear();
          container.querySelectorAll('.panel-item').forEach(i => i.classList.remove('selected'));
          this.managerSelectedItems.add(id);
          item.classList.add('selected');
        }
      });
      
      // Drag start
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        
        // If dragging an unselected item, select only it
        if (!this.managerSelectedItems.has(item.dataset.id)) {
          this.managerSelectedItems.clear();
          container.querySelectorAll('.panel-item').forEach(i => i.classList.remove('selected'));
          this.managerSelectedItems.add(item.dataset.id);
          item.classList.add('selected');
        }
        
        e.dataTransfer.setData('application/manager-items', JSON.stringify({
          ids: Array.from(this.managerSelectedItems),
          fromSide: side
        }));
        e.dataTransfer.effectAllowed = 'move';
        this._managerDragging = true;
      });
      
      // Drag end
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        this._managerDragging = false;
      });
    });
  },

  async moveAllItems(fromSide, toSide) {
    const fromGroupId = fromSide === 'left' ? this.managerLeftGroupId : this.managerRightGroupId;
    const toGroupId = toSide === 'left' ? this.managerLeftGroupId : this.managerRightGroupId;
    
    if (fromGroupId === toGroupId) {
      this.showToast('Wähle zwei verschiedene Gruppen', 'error');
      return;
    }
    
    const itemsToMove = this.favorites.filter(f => f.groupId === fromGroupId);
    
    if (itemsToMove.length === 0) {
      this.showToast('Keine Favoriten zum Verschieben');
      return;
    }
    
    for (const fav of itemsToMove) {
      await Storage.moveFavorite(fav.id, toGroupId);
    }
    
    await this.refreshData();
    this.renderManagerPanels();
    this.showToast(`${itemsToMove.length} Favorit(en) verschoben`);
  },

  // ============================================
  // Toast Notifications
  // ============================================
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ============================================
  // Data Refresh
  // ============================================
  async refreshData() {
    const data = await Storage.getAll();
    this.settings = data.settings;
    this.groups = data.groups;
    this.favorites = data.favorites;
    this.renderGroups();
    this.renderFavorites();
  },

  // ============================================
  // Event Listeners
  // ============================================
  setupEventListeners() {
    // Search
    this.elements.searchInput.addEventListener('input', (e) => {
      if (this.settings.search.instantSearch) {
        this.handleSearch(e.target.value);
      }
    });
    
    this.elements.searchInput.addEventListener('focus', () => {
      const query = this.elements.searchInput.value;
      if (query) {
        this.handleSearch(query);
      }
    });
    
    this.elements.searchInput.addEventListener('keydown', (e) => {
      const dropdown = document.getElementById('search-dropdown');
      const items = dropdown.querySelectorAll('.search-result-item');
      const isDropdownVisible = !dropdown.classList.contains('hidden');
      
      if (e.key === 'ArrowDown' && isDropdownVisible) {
        e.preventDefault();
        this.selectedSearchIndex = Math.min(this.selectedSearchIndex + 1, items.length);
        this.updateSearchSelection(items);
      } else if (e.key === 'ArrowUp' && isDropdownVisible) {
        e.preventDefault();
        this.selectedSearchIndex = Math.max(this.selectedSearchIndex - 1, 0);
        this.updateSearchSelection(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        
        if (this.isValidUrl(query)) {
          // Direct URL eingegeben
          window.location.href = query.startsWith('http') ? query : `https://${query}`;
        } else if (this.searchResults.length > 0 && this.selectedSearchIndex > 0) {
          // Ausgewählten Favoriten öffnen
          window.location.href = this.searchResults[this.selectedSearchIndex - 1].url;
        } else if (this.searchResults.length > 0 && this.selectedSearchIndex === 0) {
          // Ersten Favoriten öffnen (Enter ohne Navigation)
          window.location.href = this.searchResults[0].url;
        } else {
          // Web-Suche
          this.performExternalSearch(query);
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.add('hidden');
        e.target.value = '';
        this.handleSearch('');
        e.target.blur();
      }
    });
    
    // Web search option click
    document.getElementById('web-search-option')?.addEventListener('click', () => {
      const query = this.elements.searchInput.value.trim();
      if (query) {
        this.performExternalSearch(query);
      }
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) {
        document.getElementById('search-dropdown')?.classList.add('hidden');
      }
    });
    
    this.elements.searchClear.addEventListener('click', () => {
      this.elements.searchInput.value = '';
      this.handleSearch('');
      document.getElementById('search-dropdown')?.classList.add('hidden');
    });
    
    // Navigation arrows
    this.elements.navLeft.addEventListener('click', () => this.prevPage());
    this.elements.navRight.addEventListener('click', () => this.nextPage());
    
    // Add buttons
    this.elements.addFavoriteBtn.addEventListener('click', () => this.openFavoriteModal());
    this.elements.addGroupBtn.addEventListener('click', () => this.openGroupModal());
    this.elements.settingsBtn.addEventListener('click', () => this.openSettingsModal());
    this.elements.manageGroupsBtn?.addEventListener('click', () => this.openGroupManager());
    
    // Sort dropdown
    this.elements.sortBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.sortDropdown?.classList.toggle('hidden');
    });
    
    this.elements.sortDropdown?.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const sortMode = btn.dataset.sort;
        this.currentSort = sortMode;
        
        // Update active state
        this.elements.sortDropdown.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.elements.sortDropdown.classList.add('hidden');
        this.renderFavorites();
        this.showToast(`Sortierung: ${btn.textContent.trim()}`);
      });
    });
    
    // Close sort dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sort-dropdown-wrapper')) {
        this.elements.sortDropdown?.classList.add('hidden');
      }
    });
    
    // Refresh icons button
    this.elements.refreshIconsBtn?.addEventListener('click', () => this.refreshAllFavicons());
    
    // Keyboard shortcuts (1-9 for favorites)
    document.addEventListener('keydown', (e) => {
      // Skip if in input or modal open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (document.querySelector('.modal:not(.hidden)')) return;
      
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const visibleFavorites = this.getVisibleFavorites();
        const favorite = visibleFavorites[num - 1];
        if (favorite) {
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+1-9: Open in background
            window.open(favorite.url, '_blank');
            this.showToast(`${num}: Im Hintergrund geöffnet`);
          } else {
            // 1-9: Open in current tab
            window.location.href = favorite.url;
          }
        }
      }
    });
    
    // Context menu
    document.addEventListener('click', () => this.hideContextMenu());
    
    this.elements.contextMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.dataset.action;
        
        switch (action) {
          case 'open':
            window.location.href = this.contextTarget.url;
            break;
          case 'open-new':
            window.open(this.contextTarget.url, '_blank');
            this.showToast('In neuem Tab geöffnet');
            break;
          case 'open-bg':
            window.open(this.contextTarget.url, '_blank');
            window.focus();
            this.showToast('Im Hintergrund geöffnet');
            break;
          case 'copy-url':
            await navigator.clipboard.writeText(this.contextTarget.url);
            this.showToast('URL kopiert');
            break;
          case 'edit':
            this.openFavoriteModal(this.contextTarget);
            break;
          case 'refresh-icon':
            await this.refreshFavicon(this.contextTarget);
            break;
          case 'info':
            this.openInfoModal(this.contextTarget);
            break;
          case 'move':
            e.stopPropagation();
            this.showMoveSubmenu(btn);
            return;
          case 'duplicate':
            this.duplicateFavorite(this.contextTarget);
            break;
          case 'delete':
            this.confirmDeleteFavorite(this.contextTarget);
            break;
        }
        
        this.hideContextMenu();
      });
    });
    
    // Modal events
    this.setupModalEvents();
    
    // Settings events
    this.setupSettingsEvents();
  },

  setupModalEvents() {
    // Close buttons
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
      });
    });
    
    // Favorite modal
    this.elements.favoriteModal.querySelector('[data-action="cancel"]')
      .addEventListener('click', () => this.closeFavoriteModal());
    this.elements.favoriteModal.querySelector('[data-action="save"]')
      .addEventListener('click', () => this.saveFavorite());
    
    document.getElementById('fetch-favicon').addEventListener('click', async () => {
      const url = document.getElementById('fav-url').value;
      if (url) {
        const favicon = await Favicon.get(url);
        document.getElementById('icon-preview').innerHTML = `<img src="${favicon}">`;
      }
    });
    
    document.getElementById('upload-icon').addEventListener('click', () => {
      document.getElementById('icon-upload').click();
    });
    
    document.getElementById('icon-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('icon-preview').innerHTML = `<img src="${e.target.result}">`;
          if (this.editingFavorite) {
            this.editingFavorite.customIcon = e.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Group modal
    this.elements.groupModal.querySelector('[data-action="cancel"]')
      .addEventListener('click', () => this.closeGroupModal());
    this.elements.groupModal.querySelector('[data-action="save"]')
      .addEventListener('click', () => this.saveGroup());
    this.elements.groupModal.querySelector('[data-action="delete"]')
      .addEventListener('click', () => this.deleteGroup());
    
    // Emoji picker - Favorites buttons
    document.querySelectorAll('.emoji-favorites button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('group-icon').value = btn.dataset.emoji;
      });
    });
    
    // Emoji picker - Scrollable text emojis
    const emojiPicker = document.querySelector('.emoji-picker');
    if (emojiPicker) {
      emojiPicker.addEventListener('click', (e) => {
        // Get clicked character
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) {
            range.setStart(range.startContainer, range.startOffset);
            range.setEnd(range.startContainer, range.startOffset + 2); // Emojis are 2 chars
            const emoji = range.toString().trim();
            if (emoji && emoji.length > 0) {
              document.getElementById('group-icon').value = emoji.charAt(0) + (emoji.charAt(1) || '');
            }
          }
        }
      });
    }
    
    // Color presets
    document.querySelectorAll('.color-presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('group-color').value = btn.dataset.color;
      });
    });
    
    // Info modal
    this.elements.infoModal.querySelector('[data-action="close"]')
      .addEventListener('click', () => this.closeInfoModal());
    
    // Settings modal
    this.elements.settingsModal.querySelector('[data-action="close"]')
      .addEventListener('click', () => this.closeSettingsModal());
    
    // Confirm modal
    this.elements.confirmModal.querySelector('[data-action="cancel"]')
      .addEventListener('click', () => this.closeConfirmModal(false));
    this.elements.confirmModal.querySelector('[data-action="confirm"]')
      .addEventListener('click', () => this.closeConfirmModal(true));
  },

  setupSettingsEvents() {
    // Settings navigation
    document.querySelectorAll('.settings-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`settings-${btn.dataset.section}`).classList.add('active');
      });
    });
    
    // Theme
    document.getElementById('setting-theme').addEventListener('change', (e) => {
      this.saveSettingImmediate('theme', e.target.value);
    });
    
    // Accent Color Palette
    document.querySelectorAll('#accent-color-palette .color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#accent-color-palette .color-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.saveSettingImmediate('accentColor', btn.dataset.color);
      });
    });
    
    // Gradient Brightness
    document.getElementById('setting-gradient-brightness')?.addEventListener('input', (e) => {
      document.getElementById('gradient-brightness-value').textContent = `${e.target.value}%`;
      this.saveSettingImmediate('background.brightness', parseInt(e.target.value));
    });
    
    // Custom Gradient
    document.getElementById('apply-custom-gradient')?.addEventListener('click', async () => {
      const color1 = document.getElementById('setting-gradient-color1').value;
      const color2 = document.getElementById('setting-gradient-color2').value;
      const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
      
      document.querySelectorAll('.gradient-option').forEach(b => b.classList.remove('active'));
      document.getElementById('setting-bg-type').value = 'gradient';
      this.updateBackgroundOptions();
      
      const current = await Storage.getSettings();
      current.background.type = 'gradient';
      current.background.value = gradient;
      current.background.customGradient = { color1, color2 };
      await chrome.storage.local.set({ settings: current });
      this.settings = current;
      this.applySettings();
      this.showToast('Eigener Verlauf angewendet');
    });
    
    // Background type
    document.getElementById('setting-bg-type').addEventListener('change', (e) => {
      this.updateBackgroundOptions();
      this.saveSettingImmediate('background.type', e.target.value);
    });
    
    // Gradients - save type and value together to avoid race condition
    document.querySelectorAll('.gradient-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.gradient-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('setting-bg-type').value = 'gradient';
        this.updateBackgroundOptions();
        
        // Save both type and value in one operation
        const current = await Storage.getSettings();
        current.background.type = 'gradient';
        current.background.value = btn.dataset.gradient;
        await chrome.storage.local.set({ settings: current });
        this.settings = current;
        this.applySettings();
      });
    });
    
    // Background color - save type and value together
    document.getElementById('setting-bg-color').addEventListener('input', async (e) => {
      document.getElementById('setting-bg-type').value = 'color';
      this.updateBackgroundOptions();
      
      const current = await Storage.getSettings();
      current.background.type = 'color';
      current.background.value = e.target.value;
      await chrome.storage.local.set({ settings: current });
      this.settings = current;
      this.applySettings();
    });
    
    // Background Mode Tabs
    document.querySelectorAll('.bg-mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.bg-mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const mode = tab.dataset.mode;
        document.getElementById('bg-dark-settings').classList.toggle('hidden', mode !== 'dark');
        document.getElementById('bg-light-settings').classList.toggle('hidden', mode !== 'light');
      });
    });
    
    // Dark mode image URL
    document.getElementById('setting-bg-url-dark')?.addEventListener('change', async (e) => {
      const current = await Storage.getSettings();
      current.background.type = 'image';
      current.background.imageDark = e.target.value;
      // Also set value for legacy support
      if (!current.background.value) {
        current.background.value = e.target.value;
      }
      await chrome.storage.local.set({ settings: current });
      this.settings = current;
      this.applySettings();
      this.updateBgPreview('dark', e.target.value);
    });
    
    // Dark mode image upload
    document.getElementById('upload-bg-btn-dark')?.addEventListener('click', () => {
      document.getElementById('bg-upload-dark').click();
    });
    
    document.getElementById('bg-upload-dark')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          document.getElementById('setting-bg-type').value = 'image';
          this.updateBackgroundOptions();
          
          const current = await Storage.getSettings();
          current.background.type = 'image';
          current.background.imageDark = evt.target.result;
          // Also set value for legacy support
          current.background.value = evt.target.result;
          await chrome.storage.local.set({ settings: current });
          this.settings = current;
          this.applySettings();
          this.updateBgPreview('dark', evt.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Light mode image URL
    document.getElementById('setting-bg-url-light')?.addEventListener('change', async (e) => {
      const current = await Storage.getSettings();
      current.background.type = 'image';
      current.background.imageLight = e.target.value;
      await chrome.storage.local.set({ settings: current });
      this.settings = current;
      this.applySettings();
      this.updateBgPreview('light', e.target.value);
    });
    
    // Light mode image upload
    document.getElementById('upload-bg-btn-light')?.addEventListener('click', () => {
      document.getElementById('bg-upload-light').click();
    });
    
    document.getElementById('bg-upload-light')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          document.getElementById('setting-bg-type').value = 'image';
          this.updateBackgroundOptions();
          
          const current = await Storage.getSettings();
          current.background.type = 'image';
          current.background.imageLight = evt.target.result;
          await chrome.storage.local.set({ settings: current });
          this.settings = current;
          this.applySettings();
          this.updateBgPreview('light', evt.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Use dark image for light mode checkbox
    document.getElementById('setting-use-dark-for-light')?.addEventListener('change', async (e) => {
      const current = await Storage.getSettings();
      current.background.useDarkForLight = e.target.checked;
      await chrome.storage.local.set({ settings: current });
      this.settings = current;
      this.applySettings();
    });
    
    document.getElementById('setting-bg-blur').addEventListener('input', (e) => {
      document.getElementById('blur-value').textContent = `${e.target.value}px`;
      this.saveSettingImmediate('background.blur', parseInt(e.target.value));
    });
    
    document.getElementById('setting-bg-overlay').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('overlay-value').textContent = val;
      this.saveSettingImmediate('background.overlay', val);
    });
    
    // Animations
    document.getElementById('setting-hover').addEventListener('change', (e) => {
      this.saveSettingImmediate('animations.hover', e.target.checked);
    });
    
    document.getElementById('setting-transition').addEventListener('change', (e) => {
      this.saveSettingImmediate('animations.pageTransition', e.target.value);
    });
    
    // Grid settings
    document.getElementById('setting-columns').addEventListener('change', (e) => {
      this.saveSettingImmediate('grid.columns', parseInt(e.target.value));
    });
    
    document.getElementById('setting-rows').addEventListener('change', (e) => {
      this.saveSettingImmediate('grid.rows', parseInt(e.target.value));
    });
    
    document.getElementById('setting-icon-size').addEventListener('input', (e) => {
      document.getElementById('icon-size-value').textContent = `${e.target.value}px`;
      this.saveSettingImmediate('grid.iconSize', parseInt(e.target.value));
    });
    
    document.getElementById('setting-gap').addEventListener('input', (e) => {
      document.getElementById('gap-value').textContent = `${e.target.value}px`;
      this.saveSettingImmediate('grid.gap', parseInt(e.target.value));
    });
    
    document.getElementById('setting-radius').addEventListener('input', (e) => {
      document.getElementById('radius-value').textContent = `${e.target.value}px`;
      this.saveSettingImmediate('grid.borderRadius', parseInt(e.target.value));
    });
    
    document.getElementById('setting-shadow').addEventListener('change', (e) => {
      this.saveSettingImmediate('grid.showShadow', e.target.checked);
    });
    
    // Icon background settings
    document.getElementById('setting-icon-opacity')?.addEventListener('input', (e) => {
      document.getElementById('icon-opacity-value').textContent = `${e.target.value}%`;
      this.saveSettingImmediate('icons.opacity', parseInt(e.target.value));
    });
    
    document.getElementById('setting-icon-bg-dark')?.addEventListener('change', (e) => {
      this.saveSettingImmediate('icons.bgDark', e.target.value);
    });
    
    document.getElementById('setting-icon-bg-light')?.addEventListener('change', (e) => {
      this.saveSettingImmediate('icons.bgLight', e.target.value);
    });
    
    // Labels
    document.getElementById('setting-labels').addEventListener('change', (e) => {
      this.saveSettingImmediate('labels.show', e.target.checked);
    });
    
    document.getElementById('setting-label-pos').addEventListener('change', (e) => {
      this.saveSettingImmediate('labels.position', e.target.value);
    });
    
    document.getElementById('setting-font-size').addEventListener('input', (e) => {
      document.getElementById('font-size-value').textContent = `${e.target.value}px`;
      this.saveSettingImmediate('labels.fontSize', parseInt(e.target.value));
    });
    
    document.getElementById('setting-max-chars').addEventListener('change', (e) => {
      this.saveSettingImmediate('labels.maxLength', parseInt(e.target.value));
    });
    
    // Font settings
    document.getElementById('setting-font-family').addEventListener('change', (e) => {
      const isCustom = e.target.value === 'custom';
      document.getElementById('custom-font-row').style.display = isCustom ? 'flex' : 'none';
      this.saveSettingImmediate('labels.fontFamily', e.target.value);
    });
    
    document.getElementById('setting-custom-font').addEventListener('change', (e) => {
      this.saveSettingImmediate('labels.customFont', e.target.value);
    });
    
    document.getElementById('setting-font-weight').addEventListener('change', (e) => {
      this.saveSettingImmediate('labels.fontWeight', e.target.value);
    });
    
    // Search
    document.getElementById('setting-search-engine').addEventListener('change', (e) => {
      this.saveSettingImmediate('search.engine', e.target.value);
    });
    
    document.querySelectorAll('.search-presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('setting-search-engine').value = btn.dataset.url;
        this.saveSettingImmediate('search.engine', btn.dataset.url);
      });
    });
    
    document.getElementById('setting-instant-search').addEventListener('change', (e) => {
      this.saveSettingImmediate('search.instantSearch', e.target.checked);
    });
    
    // Navigation
    document.getElementById('setting-click-behavior')?.addEventListener('change', (e) => {
      this.saveSettingImmediate('navigation.clickBehavior', e.target.value);
    });
    
    document.getElementById('setting-keyboard').addEventListener('change', (e) => {
      this.saveSettingImmediate('navigation.keyboard', e.target.checked);
    });
    
    document.getElementById('setting-mousewheel').addEventListener('change', (e) => {
      this.saveSettingImmediate('navigation.mousewheel', e.target.checked);
    });
    
    document.getElementById('setting-swipe').addEventListener('change', (e) => {
      this.saveSettingImmediate('navigation.swipe', e.target.checked);
    });
    
    document.getElementById('setting-arrows').addEventListener('change', (e) => {
      this.saveSettingImmediate('navigation.showArrows', e.target.checked);
    });
    
    // Startup settings
    document.getElementById('setting-startup-group')?.addEventListener('change', (e) => {
      this.saveSettingImmediate('startup.group', e.target.value);
    });
    
    // === DATA SECTION EVENT HANDLERS ===
    
    // Full Backup Export
    document.getElementById('export-full-backup')?.addEventListener('click', async () => {
      const data = await chrome.storage.local.get(['settings', 'groups', 'favorites']);
      const exportData = {
        version: '1.0',
        type: 'full-backup',
        exportedAt: new Date().toISOString(),
        settings: data.settings,
        groups: data.groups,
        favorites: data.favorites
      };
      
      const content = JSON.stringify(exportData, null, 2);
      const date = new Date().toISOString().split('T')[0];
      this.downloadFile(content, `favgrid-backup-${date}.json`, 'application/json');
      this.showToast('Backup erstellt');
    });
    
    // Full Backup Import
    document.getElementById('import-full-backup')?.addEventListener('click', () => {
      document.getElementById('import-backup-file').click();
    });
    
    document.getElementById('import-backup-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          if (importData.type !== 'full-backup' && !importData.favorites) {
            throw new Error('Ungültiges Backup-Format');
          }
          
          this.showConfirm(
            'Backup wiederherstellen? Alle aktuellen Daten werden überschrieben!',
            async () => {
              if (importData.settings) {
                await chrome.storage.local.set({ settings: importData.settings });
              }
              if (importData.groups) {
                await chrome.storage.local.set({ groups: importData.groups });
              }
              if (importData.favorites) {
                await chrome.storage.local.set({ favorites: importData.favorites });
              }
              
              await this.refreshData();
              this.applySettings();
              this.showToast('Backup wiederhergestellt');
            }
          );
        } catch (err) {
          this.showToast('Fehler: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    
    // Export Format Buttons (Favoriten only)
    document.querySelectorAll('.export-format-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const format = btn.dataset.format;
        let content, filename, type;
        
        switch (format) {
          case 'json':
            content = await Storage.exportJSON();
            filename = 'favgrid-favoriten.json';
            type = 'application/json';
            break;
          case 'html':
            content = await Storage.exportHTML();
            filename = 'favgrid-bookmarks.html';
            type = 'text/html';
            break;
          case 'csv':
            content = await Storage.exportCSV();
            filename = 'favgrid-favoriten.csv';
            type = 'text/csv';
            break;
          case 'opml':
            content = await this.exportOPML();
            filename = 'favgrid-favoriten.opml';
            type = 'text/x-opml';
            break;
        }
        
        if (content) {
          this.downloadFile(content, filename, type);
          this.showToast(`Export als ${format.toUpperCase()} erfolgreich`);
        }
      });
    });
    
    // Import Buttons
    document.getElementById('import-json-btn')?.addEventListener('click', () => {
      const input = document.getElementById('import-file');
      input.accept = '.json';
      input.click();
    });
    
    document.getElementById('import-html-btn')?.addEventListener('click', () => {
      const input = document.getElementById('import-file');
      input.accept = '.html,.htm';
      input.click();
    });
    
    document.getElementById('import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        let result;
        
        if (file.name.endsWith('.json')) {
          result = await Storage.importJSON(content);
        } else {
          result = await Storage.importHTML(content);
        }
        
        if (result.success) {
          await this.refreshData();
          this.showToast(`${result.count} Favoriten importiert`);
        } else {
          this.showToast(result.error, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    
    // URL List Functions
    document.getElementById('export-url-list')?.addEventListener('click', async () => {
      const urls = this.favorites.map(f => f.url).join('\n');
      document.getElementById('url-list-textarea').value = urls;
      this.showToast(`${this.favorites.length} URLs in Liste geschrieben`);
    });
    
    document.getElementById('import-url-list')?.addEventListener('click', async () => {
      const textarea = document.getElementById('url-list-textarea');
      const text = textarea.value.trim();
      
      if (!text) {
        this.showToast('Keine URLs eingegeben', 'error');
        return;
      }
      
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const urlPattern = /^https?:\/\/.+/i;
      const validUrls = lines.filter(l => urlPattern.test(l));
      
      if (validUrls.length === 0) {
        this.showToast('Keine gültigen URLs gefunden', 'error');
        return;
      }
      
      const defaultGroup = this.groups.find(g => g.isDefault) || this.groups[0];
      let imported = 0;
      
      for (const url of validUrls) {
        // Check if URL already exists
        const exists = this.favorites.some(f => f.url === url);
        if (!exists) {
          await Storage.addFavorite({
            url: url,
            alias: '',
            groupId: defaultGroup.id
          });
          imported++;
        }
      }
      
      await this.refreshData();
      textarea.value = '';
      this.showToast(`${imported} neue URLs importiert (${validUrls.length - imported} übersprungen)`);
    });
    
    document.getElementById('clear-url-list')?.addEventListener('click', () => {
      document.getElementById('url-list-textarea').value = '';
    });
    
    // Clear Favorites
    document.getElementById('clear-favorites-btn')?.addEventListener('click', () => {
      this.showConfirm(
        'Alle Favoriten wirklich löschen? Gruppen und Einstellungen bleiben erhalten.',
        async () => {
          await chrome.storage.local.set({ favorites: [] });
          await this.refreshData();
          this.showToast('Alle Favoriten gelöscht');
        }
      );
    });
    
    // Reset All
    document.getElementById('reset-all-btn')?.addEventListener('click', () => {
      this.showConfirm(
        'Alle Daten wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!',
        async () => {
          await chrome.storage.local.clear();
          location.reload();
        }
      );
    });
  },
  
  // OPML Export
  async exportOPML() {
    const groups = this.groups;
    const favorites = this.favorites;
    
    let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>FavGrid Export</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
`;
    
    for (const group of groups.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
      const groupFavs = favorites.filter(f => f.groupId === group.id);
      if (groupFavs.length > 0) {
        opml += `    <outline text="${this.escapeXml(group.name)}" title="${this.escapeXml(group.name)}">\n`;
        for (const fav of groupFavs) {
          const title = fav.alias || Storage.getHostname(fav.url);
          opml += `      <outline type="link" text="${this.escapeXml(title)}" url="${this.escapeXml(fav.url)}"/>\n`;
        }
        opml += `    </outline>\n`;
      }
    }
    
    opml += `  </body>
</opml>`;
    
    return opml;
  },
  
  escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Skip if in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!this.settings.navigation.keyboard) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          this.prevPage();
          break;
        case 'ArrowRight':
          this.nextPage();
          break;
        case 'ArrowUp':
          this.prevPage();
          break;
        case 'ArrowDown':
          this.nextPage();
          break;
        case '/':
          e.preventDefault();
          this.elements.searchInput.focus();
          break;
        case 'Escape':
          this.hideContextMenu();
          document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
          break;
      }
    });
  },

  setupMouseWheelNavigation() {
    let wheelTimeout;
    
    this.elements.gridContainer.addEventListener('wheel', (e) => {
      if (!this.settings.navigation.mousewheel) return;
      
      e.preventDefault();
      
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (e.deltaY > 0 || e.deltaX > 0) {
          this.nextPage();
        } else {
          this.prevPage();
        }
      }, 50);
    }, { passive: false });
  },

  setupSwipeNavigation() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    this.elements.gridContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    this.elements.gridContainer.addEventListener('touchend', (e) => {
      if (!this.settings.navigation.swipe) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.prevPage();
        } else {
          this.nextPage();
        }
      }
    }, { passive: true });
  },

  // ============================================
  // Utility Functions
  // ============================================
  async refreshFavicon(favorite) {
    this.showToast('Lade Icon...');
    const newFavicon = await Favicon.get(favorite.url, true); // force refresh
    await Storage.updateFavorite(favorite.id, { favicon: newFavicon, customIcon: null });
    await this.refreshData();
    this.showToast('Icon aktualisiert');
  },

  async refreshAllFavicons() {
    this.showToast('Aktualisiere alle Icons...');
    let updated = 0;
    
    for (const fav of this.favorites) {
      if (!fav.customIcon) {
        const newFavicon = await Favicon.get(fav.url, true);
        await Storage.updateFavorite(fav.id, { favicon: newFavicon });
        updated++;
      }
    }
    
    await this.refreshData();
    this.showToast(`${updated} Icons aktualisiert`);
  },

  async duplicateFavorite(favorite) {
    await Storage.addFavorite({
      ...favorite,
      id: undefined,
      alias: `${favorite.alias || Storage.getHostname(favorite.url)} (Kopie)`,
      createdAt: undefined,
      updatedAt: undefined
    });
    await this.refreshData();
    this.showToast('Favorit dupliziert');
  },

  confirmDeleteFavorite(favorite) {
    const name = favorite.alias || Storage.getHostname(favorite.url);
    this.showConfirm(
      `"${name}" wirklich löschen?`,
      async () => {
        await Storage.deleteFavorite(favorite.id);
        await this.refreshData();
        this.showToast('Favorit gelöscht');
      }
    );
  },

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ============================================
// Initialize App
// ============================================
window.FavGrid = App;
document.addEventListener('DOMContentLoaded', () => App.init());
