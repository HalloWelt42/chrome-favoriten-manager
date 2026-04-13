/**
 * FavGrid - Premium Speed Dial
 * Main Application Logic
 */

// ============================================
// Storage Module - Extern geladen aus ../lib/storage.js
// Favicon Module - Extern geladen aus ../lib/favicon.js
// ============================================

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
  
  // Icon-Quellen Rotation
  iconSources: [],
  iconSourceIndex: -1,
  iconSourceName: '',
  iconSourcesDiscovered: false,
  originalCustomIcon: null, // Das Icon vor dem Blättern

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
      searchInput: document.getElementById('search-input'),
      searchClear: document.getElementById('search-clear'),
      groupTabs: document.getElementById('group-tabs'),
      addGroupBtn: document.getElementById('add-group-btn'),
      gridContainer: document.getElementById('grid-container'),
      favoritesGrid: document.getElementById('favorites-grid'),
      navLeft: document.getElementById('nav-left'),
      navRight: document.getElementById('nav-right'),
      pagination: document.getElementById('pagination'),
      settingsBtn: document.getElementById('settings-btn'),
      sortBtn: document.getElementById('sort-btn'),
      sortDropdown: document.getElementById('sort-dropdown'),
      themeToggleBtn: document.getElementById('theme-toggle-btn'),
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
    document.documentElement.style.setProperty('--icon-radius', `${settings.grid.borderRadius}%`);
    document.documentElement.style.setProperty('--icon-image-radius', `${settings.grid.imageRadius || 0}%`);
    document.documentElement.style.setProperty('--label-font-size', `${settings.labels.fontSize}px`);
    document.documentElement.style.setProperty('--label-font-weight', settings.labels.fontWeight || '500');
    
    // Label-Farbe basierend auf Theme
    const labelColor = theme === 'light' 
      ? (settings.labels.colorLight || '#1a1a2e') 
      : (settings.labels.colorDark || '#ffffff');
    document.documentElement.style.setProperty('--label-color', labelColor);
    
    // Icon settings mit Glassmorphism
    const iconSettings = settings.icons || { 
      opacity: 60, 
      bgDark: '#1a1a2e', 
      bgLight: '#ffffff',
      glassBlur: 10,
      glassBorder: 15,
      glassShadow: 20
    };
    const iconOpacity = (iconSettings.opacity ?? 60) / 100;
    const iconBgHex = theme === 'light' ? (iconSettings.bgLight || '#ffffff') : (iconSettings.bgDark || '#1a1a2e');
    
    // Konvertiere Hex zu rgba für Transparenz-Effekt
    const iconBgRgba = this.hexToRgba(iconBgHex, iconOpacity);
    document.documentElement.style.setProperty('--icon-bg-color', iconBgRgba);
    
    // Glassmorphism CSS-Variablen
    const glassBlur = iconSettings.glassBlur ?? 10;
    const glassBorder = (iconSettings.glassBorder ?? 15) / 100;
    const glassShadow = (iconSettings.glassShadow ?? 20) / 100;
    
    document.documentElement.style.setProperty('--glass-blur', `${glassBlur}px`);
    document.documentElement.style.setProperty('--glass-border-opacity', glassBorder);
    document.documentElement.style.setProperty('--glass-shadow-opacity', glassShadow);
    
    // Font Family
    const fontFamily = this.getFontFamily(settings.labels.fontFamily, settings.labels.customFont);
    document.documentElement.style.setProperty('--label-font-family', fontFamily);
    
    // Recalculate items per page
    this.itemsPerPage = settings.grid.columns * settings.grid.rows;

    // Preview aktualisieren
    if (typeof updatePreview === 'function') updatePreview();
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
    
    if (!el) {
      console.error('Background element not found!');
      return;
    }
    
    // Determine current theme
    let theme = this.settings.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Reset komplett
    el.style.cssText = '';
    el.classList.remove('has-image');

    // Apply background based on type
    if (background.type === 'gradient') {
      el.style.background = background.value;
    } else if (background.type === 'color') {
      el.style.background = background.value;
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
    
    // Blur und Helligkeit nur bei Bildern
    if (background.type === 'image') {
      const filters = [];
      if (Number(background.blur) > 0) {
        filters.push(`blur(${Number(background.blur)}px)`);
      }
      const brightness = Number(background.brightness) || 100;
      if (brightness !== 100) {
        filters.push(`brightness(${brightness / 100})`);
      }
      el.style.filter = filters.length > 0 ? filters.join(' ') : '';
    }


    // Preview-Hintergrund sofort aktualisieren
    if (typeof updatePreview === 'function') updatePreview();
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
          <button class="group-tab-action edit-action" title="${t('edit')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          ${!group.isDefault ? `
          <button class="group-tab-action delete-action" title="${t('delete')}">
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
        this.showToast(t('groupDeleted'));
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
      this.showToast(t('orderChanged'));
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
    
    // Save last group for startup and popup preselection
    this.saveSettingImmediate('startup.lastGroupId', groupId);
    chrome.storage.local.set({ lastSelectedGroupId: groupId });
    
    // Update tabs
    document.querySelectorAll('.group-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.groupId === groupId);
    });
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
    
    // Pagination - Add-Icon zählt als 1 Element auf Seite 1
    const addIconOnPage = !this.searchMode && this.currentPage === 0 ? 1 : 0;
    const effectiveItemsPerPage = this.itemsPerPage - addIconOnPage;
    
    this.totalPages = Math.max(1, Math.ceil((items.length + (this.searchMode ? 0 : 1)) / this.itemsPerPage));
    this.currentPage = Math.min(this.currentPage, this.totalPages - 1);
    
    const startIndex = this.currentPage === 0 ? 0 : (this.currentPage * this.itemsPerPage) - 1;
    const pageItems = items.slice(startIndex, startIndex + effectiveItemsPerPage);
    
    // Render
    grid.innerHTML = '';
    
    // Add-Icon als erstes Element (nur auf Seite 1, nicht im Suchmodus)
    if (!this.searchMode && this.currentPage === 0) {
      const addItem = this.createAddElement();
      grid.appendChild(addItem);
    }
    
    // Favoriten rendern
    if (this.searchMode && pageItems.length === 0) {
      // Nur im Suchmodus: "Keine Ergebnisse" anzeigen
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-illustration">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="2" opacity="0.2"/>
              <path d="M45 50h30M45 60h20M45 70h25" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
            </svg>
          </div>
          <h3>${t('noResults')}</h3>
          <p>${t('noResultsDesc')}.</p>
        </div>
      `;
    } else {
      pageItems.forEach((fav, index) => {
        const item = this.createFavoriteElement(fav, index + addIconOnPage);
        grid.appendChild(item);
      });
    }
    
    this.renderPagination();
    this.updateNavigationArrows();
  },
  
  // Add-Element erstellen (Plus-Icon im Grid)
  createAddElement() {
    const item = document.createElement('div');
    item.className = 'add-favorite-grid-item';
    item.title = t('addNewFavorite');
    
    item.innerHTML = `
      <div class="favorite-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      ${this.settings.labels.show ? '<span class="favorite-label">' + t('add') + '</span>' : ''}
    `;
    
    item.addEventListener('click', () => this.openFavoriteModal());
    
    return item;
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
    // animate-in Klasse für Einblend-Animation, wird nach Animation entfernt
    item.className = `favorite-item animate-in ${this.settings.grid.showShadow ? 'has-shadow' : ''}`;
    item.href = favorite.url;
    item.dataset.favoriteId = favorite.id;
    item.draggable = true;
    
    // Animation entfernen nach Abschluss (damit backdrop-filter funktioniert)
    setTimeout(() => {
      item.classList.remove('animate-in');
    }, 400 + (index * 20)); // Animation-Dauer + Delay
    
    const displayName = favorite.alias || Storage.getHostname(favorite.url);
    const truncatedName = displayName.length > this.settings.labels.maxLength 
      ? displayName.substring(0, this.settings.labels.maxLength) + '...'
      : displayName;
    
    const defaultGroup = this.groups.find(g => g.isDefault);
    const isInDefaultGroup = favorite.groupId === defaultGroup?.id;
    
    // Icon-Quelle bestimmen: customIcon oder Google-Fallback
    let iconSrc = favorite.customIcon;
    if (!iconSrc) {
      try {
        const hostname = new URL(favorite.url).hostname;
        iconSrc = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
      } catch {
        iconSrc = Favicon.generateFallback(favorite.url);
      }
    }
    
    item.innerHTML = `
      <!-- Edit button - LEFT side -->
      <div class="quick-edit-left">
        <button class="quick-action edit-action" title="${t('edit')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
      
      <!-- Delete/Archive buttons - RIGHT side -->
      <div class="quick-edit-right">
        <button class="quick-action delete-action" title="${t('delete')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        ${!isInDefaultGroup ? `
        <button class="quick-action archive-action" title="${t('moveTo')} ${defaultGroup?.name || t('favorites')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
          </svg>
        </button>
        ` : ''}
      </div>
      
      <div class="favorite-icon">
        <img src="${iconSrc}" 
             alt="${displayName}"
             onerror="this.src='${Favicon.generateFallback(favorite.url)}'">
        <div class="favorite-hover-actions">
          <button class="hover-action open-bg" title="${t('openInBackground')}">
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
    // Kein loadFavicon mehr nötig - Google URL ist bereits im src
    
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
      this.showToast(t('openedInBg'));
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
      this.showToast(t('deleted'));
    });
    
    item.querySelector('.archive-action')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (defaultGroup) {
        await Storage.moveFavorite(favorite.id, defaultGroup.id);
        await this.refreshData();
        this.showToast(t('movedTo', [defaultGroup.name]));
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
      this.showToast(t('orderChanged'));
    } finally {
      this._isOwnStorageUpdate = false;
    }
  },

  async loadFavicon(img, favorite) {
    // Wenn bereits ein customIcon gespeichert ist, nichts tun
    if (favorite.customIcon) return;
    
    // Schneller Google-Fallback für Anzeige (keine Speicherung!)
    try {
      const hostname = new URL(favorite.url).hostname;
      img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
      img.src = Favicon.generateFallback(favorite.url);
    }
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
    
    const maxVisibleDots = 10;
    
    if (this.totalPages <= maxVisibleDots) {
      // Normale Punkte für wenige Seiten
      for (let i = 0; i < this.totalPages; i++) {
        const dot = document.createElement('button');
        dot.className = `page-dot ${i === this.currentPage ? 'active' : ''}`;
        dot.addEventListener('click', () => this.goToPage(i));
        container.appendChild(dot);
      }
    } else {
      // Kompakte Darstellung: 1 2 3 ... [current-1] [current] [current+1] ... n-2 n-1 n
      const pagesToShow = new Set();
      
      // Erste 3
      pagesToShow.add(0);
      pagesToShow.add(1);
      pagesToShow.add(2);
      
      // Letzte 3
      pagesToShow.add(this.totalPages - 3);
      pagesToShow.add(this.totalPages - 2);
      pagesToShow.add(this.totalPages - 1);
      
      // Aktuelle ± 1
      if (this.currentPage > 0) pagesToShow.add(this.currentPage - 1);
      pagesToShow.add(this.currentPage);
      if (this.currentPage < this.totalPages - 1) pagesToShow.add(this.currentPage + 1);
      
      // Sortieren und rendern
      const sortedPages = [...pagesToShow].filter(p => p >= 0 && p < this.totalPages).sort((a, b) => a - b);
      
      let lastPage = -1;
      for (const page of sortedPages) {
        // Ellipse einfügen wenn Lücke > 1
        if (lastPage !== -1 && page - lastPage > 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'page-ellipsis';
          ellipsis.textContent = '…';
          container.appendChild(ellipsis);
        }
        
        const dot = document.createElement('button');
        dot.className = `page-dot ${page === this.currentPage ? 'active' : ''}`;
        dot.title = `Seite ${page + 1}`;
        dot.addEventListener('click', () => this.goToPage(page));
        container.appendChild(dot);
        
        lastPage = page;
      }
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
    this.showToast(t('favoriteMoved'));
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
        
        // Icon-Quelle: customIcon oder schneller Google-Fallback
        let iconSrc;
        if (fav.customIcon) {
          iconSrc = fav.customIcon;
        } else {
          try {
            const hostname = new URL(fav.url).hostname;
            iconSrc = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
          } catch {
            iconSrc = Favicon.generateFallback(fav.url);
          }
        }
        
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.dataset.index = index;
        item.innerHTML = `
          <img src="${iconSrc}" alt="">
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
    chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
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
    
    title.textContent = favorite ? t('editFavorite') : t('addFavorite');
    
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
    const iconSrc = favorite?.customIcon || favorite?.favicon || (favorite?.url ? Favicon.generateFallback(favorite.url) : null);
    
    if (iconSrc) {
      preview.innerHTML = `<img src="${iconSrc}">`;
      this.updateIconInfo(iconSrc, favorite);
    } else {
      preview.innerHTML = '';
      this.updateIconInfo(null, favorite);
    }
    
    // Reset-Button anzeigen wenn Original vorhanden
    const resetBtn = document.getElementById('reset-icon');
    if (resetBtn) {
      resetBtn.classList.toggle('hidden', !favorite?.faviconOriginal);
    }
    
    // Icon-Quellen für Rotation initialisieren
    if (favorite?.url) {
      this.initIconSources(favorite.url);
    }
    
    // Weiß-Schwelle Slider zurücksetzen
    const thresholdSlider = document.getElementById('white-threshold');
    const thresholdValue = document.getElementById('white-threshold-value');
    if (thresholdSlider) thresholdSlider.value = 245;
    if (thresholdValue) thresholdValue.textContent = '245';
    
    modal.classList.remove('hidden');
    document.getElementById('fav-url').focus();
  },
  
  // Icon-Info aktualisieren (Typ-Badge, Größe)
  updateIconInfo(iconSrc, favorite = null) {
    const typeBadge = document.getElementById('icon-type-badge');
    const sizeInfo = document.getElementById('icon-size-info');
    
    if (!iconSrc) {
      if (typeBadge) typeBadge.textContent = '-';
      if (sizeInfo) sizeInfo.textContent = '';
      return;
    }
    
    // Typ ermitteln
    let type = 'UNK';
    let badgeClass = '';
    
    if (iconSrc.startsWith('data:image/png')) {
      type = 'PNG';
      badgeClass = 'badge-png';
    } else if (iconSrc.startsWith('data:image/svg')) {
      type = 'SVG';
      badgeClass = 'badge-svg';
    } else if (iconSrc.startsWith('data:image/jpeg') || iconSrc.startsWith('data:image/jpg')) {
      type = 'JPG';
      badgeClass = 'badge-jpg';
    } else if (iconSrc.startsWith('data:image/webp')) {
      type = 'WEBP';
      badgeClass = 'badge-webp';
    } else if (iconSrc.startsWith('data:image/x-icon') || iconSrc.includes('.ico')) {
      type = 'ICO';
      badgeClass = 'badge-ico';
    } else if (iconSrc.startsWith('data:')) {
      type = 'IMG';
    }
    
    // Badge für verarbeitetes Icon
    if (favorite?.faviconProcessed) {
      type = type + ' ✓';
      badgeClass = 'badge-processed';
    }
    
    // Source-Name anhängen wenn vorhanden
    if (this.iconSourceName) {
      type = `${this.iconSourceName} ▶`;
      badgeClass = 'badge-clickable';
    }
    
    if (typeBadge) {
      typeBadge.textContent = type;
      typeBadge.className = 'icon-type-badge ' + badgeClass;
    }
    
    // Größe ermitteln (async für Bilder)
    if (sizeInfo && iconSrc.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        sizeInfo.textContent = `${img.width} × ${img.height}`;
      };
      img.src = iconSrc;
    } else if (sizeInfo) {
      sizeInfo.textContent = '';
    }
  },
  
  // Icon-Quellen initialisieren (nur Index zurücksetzen)
  initIconSources(url) {
    this.iconSources = [];
    this.iconSourceIndex = -1;
    this.iconSourceName = '';
    this.iconSourcesDiscovered = false;
    // Original-Icon für diese Session speichern
    this.originalCustomIcon = this.editingFavorite?.customIcon || null;
  },
  
  // Icon-Quellen Reset (Cache leeren, neu entdecken)
  async resetIconSources() {
    const url = this.editingFavorite?.url || document.getElementById('fav-url')?.value?.trim();
    if (!url) {
      this.showToast(t('noUrlAvailable'), 'error');
      return;
    }
    
    // URL normalisieren
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Cache leeren
    Favicon.clearCacheForUrl(normalizedUrl);
    
    // State zurücksetzen - ABER originalCustomIcon behalten!
    this.iconSources = [];
    this.iconSourceIndex = -1;
    this.iconSourceName = '';
    this.iconSourcesDiscovered = false;
    // originalCustomIcon wird NICHT zurückgesetzt!
    
    this.showToast(t('iconCacheCleared'), 'info');
    
    // Direkt erste Quelle laden
    await this.nextIconSource();
  },
  
  // Nächste Icon-Quelle laden
  async nextIconSource() {
    // URL aus editingFavorite oder aus dem Input-Feld
    let url = this.editingFavorite?.url;
    if (!url) {
      url = document.getElementById('fav-url')?.value?.trim();
    }
    
    if (!url) {
      this.showToast(t('enterUrlFirst'), 'error');
      return;
    }
    
    // URL normalisieren
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const preview = document.getElementById('icon-preview');
    if (!preview) return;
    
    // Quellen entdecken falls noch nicht geschehen
    if (!this.iconSourcesDiscovered) {
      const typeBadge = document.getElementById('icon-type-badge');
      if (typeBadge) {
        typeBadge.textContent = t('scanning');
        typeBadge.className = 'icon-type-badge badge-loading';
      }
      
      // Basis-Quellen laden
      const baseSources = await Favicon.discoverSources(url);
      
      // Aktuelles/eigenes Icon als ERSTE Quelle hinzufügen (falls vorhanden)
      this.iconSources = [];
      
      // Das originale customIcon des Favoriten (bevor Rotation begann)
      const originalIcon = this.originalCustomIcon;
      if (originalIcon && originalIcon.startsWith('data:')) {
        this.iconSources.push({
          url: 'current',
          name: 'Aktuell',
          type: 'custom',
          dataUrl: originalIcon
        });
      }
      
      // Dann die entdeckten Quellen
      this.iconSources.push(...baseSources);
      
      this.iconSourcesDiscovered = true;
      this.iconSourceIndex = -1;
      
      this.showToast(t('sourcesFound', [String(this.iconSources.length)]), 'success');
    }
    
    // Schutz vor Endlosschleife
    const maxAttempts = this.iconSources.length;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      // Zum nächsten Index
      this.iconSourceIndex++;
      if (this.iconSourceIndex >= this.iconSources.length) {
        this.iconSourceIndex = 0; // Zurück zum Anfang
      }
      
      const source = this.iconSources[this.iconSourceIndex];
      this.iconSourceName = source.name;
      
      // Zeige Ladezustand
      const typeBadge = document.getElementById('icon-type-badge');
      if (typeBadge) {
        typeBadge.textContent = `${source.name} ⏳`;
        typeBadge.className = 'icon-type-badge badge-loading';
      }
      
      // Spezialfall: Eigenes/aktuelles Icon (bereits als dataUrl vorhanden)
      if (source.type === 'custom' && source.dataUrl) {
        preview.innerHTML = `<img src="${source.dataUrl}">`;
        this.iconSourceName = source.name;
        
        const counter = `${this.iconSourceIndex + 1}/${this.iconSources.length}`;
        if (typeBadge) {
          typeBadge.textContent = `${source.name} ▶ ${counter}`;
          typeBadge.className = 'icon-type-badge badge-clickable';
        }
        
        // Größe anzeigen
        this.updateIconInfoSize(source.dataUrl);
        
        if (this.editingFavorite) {
          this.editingFavorite.customIcon = source.dataUrl;
        }
        return;
      }
      
      // Quelle laden
      const result = await Favicon.fetchSource(source, url);
      
      if (result) {
        // Vorschau aktualisieren
        preview.innerHTML = `<img src="${result.dataUrl}">`;
        this.iconSourceName = result.name;
        
        // Zähler anzeigen
        const counter = `${this.iconSourceIndex + 1}/${this.iconSources.length}`;
        if (typeBadge) {
          typeBadge.textContent = `${result.name} ▶ ${counter}`;
          typeBadge.className = 'icon-type-badge badge-clickable';
        }
        
        // Größe anzeigen
        this.updateIconInfoSize(result.dataUrl);
        
        // Temporär speichern (wird erst beim Speichern-Klick persistiert)
        if (this.editingFavorite) {
          this.editingFavorite.customIcon = result.dataUrl;
        }
        return; // Erfolgreich
      }
      
      attempts++;
    }
    
    // Keine Quelle hat funktioniert
    this.showToast(t('noIconSources'), 'error');
    this.iconSourceName = '';
  },
  
  // Nur Größen-Info aktualisieren (ohne Badge zu überschreiben)
  updateIconInfoSize(iconSrc) {
    const sizeInfo = document.getElementById('icon-size-info');
    if (sizeInfo && iconSrc && iconSrc.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        sizeInfo.textContent = `${img.width} × ${img.height}`;
      };
      img.src = iconSrc;
    }
  },
  
  // Weißen Hintergrund entfernen (Schwellenwert einstellbar)
  // Behandelt das Ergebnis wie ein manuell hochgeladenes customIcon
  async removeWhiteBackground() {
    const preview = document.getElementById('icon-preview');
    const img = preview?.querySelector('img');
    
    if (!img || !img.src) {
      this.showToast(t('noIconAvailable'), 'error');
      return;
    }
    
    // Schwellenwert aus Slider holen
    const threshold = parseInt(document.getElementById('white-threshold')?.value || 245);
    
    this.showToast(t('processingThreshold', [threshold]));
    
    try {
      // Immer vom Original arbeiten, damit man mehrfach testen kann
      let sourceDataUrl = this.editingFavorite?.faviconOriginal || img.src;
      
      // 1. Bild als Data-URL laden (egal ob extern oder bereits Data-URL)
      if (!sourceDataUrl.startsWith('data:')) {
        sourceDataUrl = await this.imageUrlToDataUrl(sourceDataUrl);
        
        if (!sourceDataUrl) {
          this.showToast(t('imageLoadFailed'), 'error');
          return;
        }
      }
      
      // 2. Original sichern (nur beim ersten Mal)
      if (!this.editingFavorite?.faviconOriginal) {
        if (this.editingFavorite) {
          this.editingFavorite.faviconOriginal = sourceDataUrl;
        }
      }
      
      // 3. Weiß transparent machen mit einstellbarem Schwellenwert
      const processedDataUrl = await this.processImageTransparency(sourceDataUrl, threshold);
      
      if (!processedDataUrl) {
        this.showToast(t('imageProcessFailed'), 'error');
        return;
      }
      
      // 4. Wie beim Upload behandeln: Preview + customIcon setzen
      preview.innerHTML = `<img src="${processedDataUrl}">`;
      this.updateIconInfo(processedDataUrl, this.editingFavorite);
      
      if (this.editingFavorite) {
        this.editingFavorite.customIcon = processedDataUrl;
        this.editingFavorite.faviconProcessed = true;
      }
      
      // Reset-Button anzeigen
      document.getElementById('reset-icon')?.classList.remove('hidden');
      
      this.showToast(t('whiteRemovedThreshold', [threshold]));
      
    } catch (err) {
      console.error('Fehler beim Entfernen des Hintergrunds:', err);
      this.showToast(t('imageError'), 'error');
    }
  },
  
  // URL zu Data-URL konvertieren (für jede Bild-URL)
  async imageUrlToDataUrl(url) {
    try {
      const response = await fetch(url, {
        credentials: 'omit' // Keine Auth-Dialoge
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Bild-Fetch fehlgeschlagen:', e);
      return null;
    }
  },
  
  // Bild verarbeiten: Weiß (≥threshold) → Transparent
  processImageTransparency(src, threshold = 245) {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 128;
          canvas.height = img.height || 128;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Jeden Pixel prüfen
          let changedPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Weiß-Bereich: alle Kanäle >= Schwellenwert
            if (r >= threshold && g >= threshold && b >= threshold) {
              data[i + 3] = 0; // Alpha auf 0 (transparent)
              changedPixels++;
            }
          }
          
          console.log(`Transparenz (≥${threshold}): ${changedPixels} Pixel verändert`);
          
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          console.error('Canvas-Verarbeitung fehlgeschlagen:', e);
          resolve(null);
        }
      };
      
      img.onerror = (e) => {
        console.error('Bild konnte nicht geladen werden:', e);
        resolve(null);
      };
      
      // Timeout nach 10 Sekunden
      setTimeout(() => {
        console.warn('Bild-Laden Timeout');
        resolve(null);
      }, 10000);
      
      img.src = src;
    });
  },
  
  // Favicon als Data-URL laden (holt erst Favicon-URL, dann konvertiert)
  async fetchFaviconAsDataUrl(url) {
    const faviconUrl = await Favicon.get(url);
    
    // Wenn bereits Data-URL (z.B. generierter Fallback), direkt zurückgeben
    if (faviconUrl.startsWith('data:')) {
      return faviconUrl;
    }
    
    // Externe URL zu Data-URL konvertieren
    const dataUrl = await this.imageUrlToDataUrl(faviconUrl);
    return dataUrl || Favicon.generateFallback(url);
  },
  
  // Original-Icon wiederherstellen
  resetIcon() {
    if (!this.editingFavorite?.faviconOriginal) {
      this.showToast(t('noOriginal'), 'error');
      return;
    }
    
    const preview = document.getElementById('icon-preview');
    const img = preview?.querySelector('img');
    
    if (img) {
      img.src = this.editingFavorite.faviconOriginal;
    }
    
    // Processed-Flag entfernen
    this.editingFavorite.faviconProcessed = false;
    
    // Info aktualisieren
    this.updateIconInfo(this.editingFavorite.faviconOriginal, this.editingFavorite);
    
    // Reset-Button verstecken
    document.getElementById('reset-icon')?.classList.add('hidden');
    
    this.showToast(t('originalRestored'));
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
      this.showToast(t('errorUrlRequired'), 'error');
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
      this.showToast(t('errorInvalidUrl'), 'error');
      return;
    }
    
    // Duplikat-Prüfung (nur bei neuen Favoriten)
    if (!this.editingFavorite) {
      // Exakt gleiche URL? → Blockieren
      const exactDuplicate = this.favorites.find(f => f.url === validUrl);
      if (exactDuplicate) {
        const dupName = exactDuplicate.alias || Storage.getHostname(exactDuplicate.url);
        const dupGroup = this.groups.find(g => g.id === exactDuplicate.groupId);
        this.showToast(t('urlExistsAlready') + `: "${dupName}" ${t('inGroup')} ${dupGroup?.name || t('unknown')}`, 'error');
        return;
      }
      
      // Ähnliche URL (normalisiert gleich)? → Warnung, aber erlauben
      const normalizedUrl = this.normalizeUrl(validUrl);
      const similarDuplicate = this.favorites.find(f => this.normalizeUrl(f.url) === normalizedUrl);
      if (similarDuplicate) {
        const dupName = similarDuplicate.alias || Storage.getHostname(similarDuplicate.url);
        const dupGroup = this.groups.find(g => g.id === similarDuplicate.groupId);
        this.showToast(`⚠️ ` + t('similarUrlExists') + `: "${dupName}" ${t('inGroup')} ${dupGroup?.name || t('unknown')}`, 'warning');
        // Nicht return - trotzdem hinzufügen
      }
    }
    
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    // Hole Icon aus der Vorschau
    const iconPreview = document.getElementById('icon-preview').querySelector('img');
    let customIcon = null;
    let faviconOriginal = this.editingFavorite?.faviconOriginal || null;
    let faviconProcessed = this.editingFavorite?.faviconProcessed || false;
    
    if (iconPreview && iconPreview.src.startsWith('data:')) {
      customIcon = iconPreview.src;
    } else if (this.editingFavorite?.customIcon) {
      customIcon = this.editingFavorite.customIcon;
    }
    
    const data = {
      url: validUrl,
      alias,
      description,
      tags,
      groupId,
      customIcon,
      faviconOriginal,
      faviconProcessed
    };
    
    if (this.editingFavorite) {
      await Storage.updateFavorite(this.editingFavorite.id, data);
      this.showToast(t('favoriteUpdated'));
    } else {
      await Storage.addFavorite(data);
      this.showToast(t('favoriteAdded'));
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
    
    title.textContent = group ? t('editGroup') : t('newGroup');
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
      this.showToast(t('errorNameRequired'), 'error');
      return;
    }
    
    const data = { name, icon, color };
    
    if (this.editingGroup) {
      await Storage.updateGroup(this.editingGroup.id, data);
      this.showToast(t('groupUpdated'));
    } else {
      const newGroup = await Storage.addGroup(data);
      this.showToast(t('groupCreated'));
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
        this.showToast(t('groupDeleted'));
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
        <p>${favorite.source === 'browser' ? t('browserImport') : t('manual')}</p>
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
    
    // Appearance - Background Type
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
      
      // Blur und Helligkeit
      document.getElementById('setting-bg-blur').value = s.background.blur || 0;
      document.getElementById('blur-value').textContent = `${s.background.blur || 0}px`;
      document.getElementById('setting-gradient-brightness').value = s.background.brightness || 100;
      document.getElementById('gradient-brightness-value').textContent = `${s.background.brightness || 100}%`;
    }
    
    // Mark active gradient
    document.querySelectorAll('.gradient-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gradient === s.background.value);
      btn.style.background = btn.dataset.gradient;
    });
    
    document.getElementById('setting-transition').value = s.animations.pageTransition;
    
    // Grid
    document.getElementById('setting-columns').value = s.grid.columns;
    document.getElementById('setting-rows').value = s.grid.rows;
    document.getElementById('setting-icon-size').value = s.grid.iconSize;
    document.getElementById('icon-size-value').textContent = `${s.grid.iconSize}px`;
    document.getElementById('setting-gap').value = s.grid.gap;
    document.getElementById('gap-value').textContent = `${s.grid.gap}px`;
    document.getElementById('setting-radius').value = s.grid.borderRadius;
    document.getElementById('radius-value').textContent = `${s.grid.borderRadius}%`;
    document.getElementById('setting-image-radius').value = s.grid.imageRadius || 0;
    document.getElementById('image-radius-value').textContent = `${s.grid.imageRadius || 0}%`;
    document.getElementById('setting-shadow').checked = s.grid.showShadow;
    
    // Icon background settings
    const iconSettings = s.icons || { opacity: 60, bgDark: '#1a1a2e', bgLight: '#ffffff', glassBlur: 10, glassBorder: 15, glassShadow: 20 };
    document.getElementById('setting-icon-opacity').value = iconSettings.opacity ?? 60;
    document.getElementById('icon-opacity-value').textContent = `${iconSettings.opacity ?? 60}%`;
    document.getElementById('setting-icon-bg-dark').value = iconSettings.bgDark || '#1a1a2e';
    document.getElementById('setting-icon-bg-light').value = iconSettings.bgLight || '#ffffff';
    
    // Glassmorphism-Einstellungen laden
    const glassBlurEl = document.getElementById('setting-glass-blur');
    const glassBorderEl = document.getElementById('setting-glass-border');
    const glassShadowEl = document.getElementById('setting-glass-shadow');
    
    if (glassBlurEl) {
      glassBlurEl.value = iconSettings.glassBlur ?? 10;
      document.getElementById('glass-blur-value').textContent = `${iconSettings.glassBlur ?? 10}px`;
    }
    if (glassBorderEl) {
      glassBorderEl.value = iconSettings.glassBorder ?? 15;
      document.getElementById('glass-border-value').textContent = `${iconSettings.glassBorder ?? 15}%`;
    }
    if (glassShadowEl) {
      glassShadowEl.value = iconSettings.glassShadow ?? 20;
      document.getElementById('glass-shadow-value').textContent = `${iconSettings.glassShadow ?? 20}%`;
    }
    
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
    
    // Label colors
    document.getElementById('setting-label-color-dark').value = s.labels.colorDark || '#ffffff';
    document.getElementById('setting-label-color-light').value = s.labels.colorLight || '#1a1a2e';
    
    // Search
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

  // Debounce Timer für Settings
  _settingsSaveTimeout: null,
  _pendingSettingsUpdate: {},

  // Settings mit Debounce speichern (1 Sekunde Verzögerung)
  async saveSettingImmediate(key, value) {
    const keys = key.split('.');
    let current = this._pendingSettingsUpdate;
    
    // Update in pending sammeln
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    // Lokales Settings-Objekt sofort aktualisieren für UI
    current = this.settings;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    // UI sofort aktualisieren
    this.applySettings();
    this.renderFavorites();
    
    // Debounced speichern (1 Sekunde)
    clearTimeout(this._settingsSaveTimeout);
    this._settingsSaveTimeout = setTimeout(async () => {
      if (Object.keys(this._pendingSettingsUpdate).length > 0) {
        this._isOwnStorageUpdate = true;
        this.settings = await Storage.updateSettings(this._pendingSettingsUpdate);
        this._pendingSettingsUpdate = {};
        this._isOwnStorageUpdate = false;
      }
    }, 1000);
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
          
          this.showToast(t('xFavoritesMoved', [String(data.ids.length)]));
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
    document.getElementById(`panel-${side}-title`).textContent = group?.name || t('unknown');
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
      
      // Icon-Quelle: customIcon oder schneller Google-Fallback
      let iconSrc;
      if (fav.customIcon) {
        iconSrc = fav.customIcon;
      } else {
        try {
          const hostname = new URL(fav.url).hostname;
          iconSrc = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        } catch {
          iconSrc = Favicon.generateFallback(fav.url);
        }
      }
      
      return `
        <div class="panel-item ${isSelected ? 'selected' : ''}" 
             data-id="${fav.id}" 
             data-side="${side}"
             draggable="true">
          <img src="${iconSrc}" alt="">
          <div class="panel-item-info">
            <div class="panel-item-title">${displayName}</div>
            <div class="panel-item-url">${fav.url}</div>
          </div>
          <span class="panel-item-source ${fav.source}">${fav.source === 'browser' ? 'Import' : 'Manuell'}</span>
        </div>
      `;
    }).join('');
    
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
      this.showToast(t('selectDifferentGroups'), 'error');
      return;
    }
    
    const itemsToMove = this.favorites.filter(f => f.groupId === fromGroupId);
    
    if (itemsToMove.length === 0) {
      this.showToast(t('noFavoritesToMove'));
      return;
    }
    
    for (const fav of itemsToMove) {
      await Storage.moveFavorite(fav.id, toGroupId);
    }
    
    await this.refreshData();
    this.renderManagerPanels();
    this.showToast(t('xFavoritesMoved', [String(itemsToMove.length)]));
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
    
    // Buttons
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
        this.showToast(t('sorting') + ': ' + btn.textContent.trim());
      });
    });
    
    // Close sort dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sort-dropdown-wrapper')) {
        this.elements.sortDropdown?.classList.add('hidden');
      }
    });
    
    // Theme toggle button
    this.elements.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());
    
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
            this.showToast(`${num}: ` + t('openedInBg'));
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
            this.showToast(t('openedInNewTab'));
            break;
          case 'open-bg':
            window.open(this.contextTarget.url, '_blank');
            window.focus();
            this.showToast(t('openedInBg'));
            break;
          case 'copy-url':
            await navigator.clipboard.writeText(this.contextTarget.url);
            this.showToast(t('urlCopied'));
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
        this.showToast(t('loadingFavicon'));
        const faviconDataUrl = await this.fetchFaviconAsDataUrl(url);
        document.getElementById('icon-preview').innerHTML = `<img src="${faviconDataUrl}">`;
        this.updateIconInfo(faviconDataUrl, this.editingFavorite);
        // Reset-Status zurücksetzen bei neuem Favicon
        if (this.editingFavorite) {
          this.editingFavorite.faviconOriginal = null;
          this.editingFavorite.faviconProcessed = false;
          this.editingFavorite.customIcon = faviconDataUrl;
        }
        document.getElementById('reset-icon')?.classList.add('hidden');
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
          this.updateIconInfo(e.target.result, this.editingFavorite);
          if (this.editingFavorite) {
            this.editingFavorite.customIcon = e.target.result;
            // Reset-Status zurücksetzen bei neuem Upload
            this.editingFavorite.faviconOriginal = null;
            this.editingFavorite.faviconProcessed = false;
          }
          document.getElementById('reset-icon')?.classList.add('hidden');
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Icon-Tools: Weiß-Schwelle Slider
    document.getElementById('white-threshold')?.addEventListener('input', (e) => {
      document.getElementById('white-threshold-value').textContent = e.target.value;
    });
    
    // Icon-Tools: Weiß entfernen und Zurücksetzen
    document.getElementById('remove-white-bg')?.addEventListener('click', () => {
      this.removeWhiteBackground();
    });
    
    document.getElementById('reset-icon')?.addEventListener('click', () => {
      this.resetIcon();
    });
    
    // Icon-Badge Klick: Nächste Quelle laden
    document.getElementById('icon-type-badge')?.addEventListener('click', () => {
      this.nextIconSource();
    });
    
    // Rescan-Button: Cache leeren und neu scannen
    document.getElementById('rescan-icons')?.addEventListener('click', () => {
      this.resetIconSources();
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
    document.querySelectorAll('.settings-nav-item[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`settings-${btn.dataset.section}`).classList.add('active');
      });
    });
    
    // Donate button → opens donate page in new tab
    document.getElementById('donate-btn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/donate/donate.html') });
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
    // Helligkeit (nur Bilder)
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
      this.showToast(t('customGradientApplied'));
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
    
    // Animations
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
      document.getElementById('radius-value').textContent = `${e.target.value}%`;
      this.saveSettingImmediate('grid.borderRadius', parseInt(e.target.value));
    });
    
    document.getElementById('setting-image-radius').addEventListener('input', (e) => {
      document.getElementById('image-radius-value').textContent = `${e.target.value}%`;
      this.saveSettingImmediate('grid.imageRadius', parseInt(e.target.value));
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
    
    // Glassmorphism-Einstellungen
    document.getElementById('setting-glass-blur')?.addEventListener('input', (e) => {
      document.getElementById('glass-blur-value').textContent = `${e.target.value}px`;
      this.saveSettingImmediate('icons.glassBlur', parseInt(e.target.value));
    });
    
    document.getElementById('setting-glass-border')?.addEventListener('input', (e) => {
      document.getElementById('glass-border-value').textContent = `${e.target.value}%`;
      this.saveSettingImmediate('icons.glassBorder', parseInt(e.target.value));
    });
    
    document.getElementById('setting-glass-shadow')?.addEventListener('input', (e) => {
      document.getElementById('glass-shadow-value').textContent = `${e.target.value}%`;
      this.saveSettingImmediate('icons.glassShadow', parseInt(e.target.value));
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
    
    // Label colors
    document.getElementById('setting-label-color-dark').addEventListener('change', (e) => {
      this.saveSettingImmediate('labels.colorDark', e.target.value);
    });
    
    document.getElementById('setting-label-color-light').addEventListener('change', (e) => {
      this.saveSettingImmediate('labels.colorLight', e.target.value);
    });
    
    // Search
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
      this.showToast(t('backupCreated'));
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
            throw new Error('Invalid backup format');
          }
          
          this.showConfirm(
            t('confirmReset'),
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
              this.showToast(t('backupRestored'));
            }
          );
        } catch (err) {
          this.showToast(t('errorPrefix') + ': ' + err.message, 'error');
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
          this.showToast(t('exportFormatSuccess', [format.toUpperCase()]));
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
          this.showToast(t('xFavoritesImported', [String(result.count)]));
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
      this.showToast(t('xUrlsExported', [String(this.favorites.length)]));
    });
    
    document.getElementById('import-url-list')?.addEventListener('click', async () => {
      const textarea = document.getElementById('url-list-textarea');
      const text = textarea.value.trim();
      
      if (!text) {
        this.showToast(t('noUrlsEntered'), 'error');
        return;
      }
      
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const urlPattern = /^https?:\/\/.+/i;
      const validUrls = lines.filter(l => urlPattern.test(l));
      
      if (validUrls.length === 0) {
        this.showToast(t('errorInvalidUrl'), 'error');
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
        t('confirmDelete'),
        async () => {
          await chrome.storage.local.set({ favorites: [] });
          await this.refreshData();
          this.showToast(t('favoriteDeleted'));
        }
      );
    });
    
    // Reset All
    document.getElementById('reset-all-btn')?.addEventListener('click', () => {
      this.showConfirm(
        t('confirmReset'),
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
    this.showToast(t('loadingFavicon'));
    const newFavicon = await Favicon.get(favorite.url, true); // force refresh
    await Storage.updateFavorite(favorite.id, { 
      customIcon: newFavicon,
      faviconOriginal: null,
      faviconProcessed: false
    });
    await this.refreshData();
    this.showToast(t('refreshIcon'));
  },

  // Theme zwischen Light/Dark wechseln
  toggleTheme() {
    // Aktuelles effektives Theme ermitteln (aus DOM, da könnte auch 'system' aufgelöst sein)
    const currentEffectiveTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentEffectiveTheme === 'dark' ? 'light' : 'dark';
    
    // In Settings speichern (überschreibt 'system' mit expliziter Wahl)
    this.settings.theme = newTheme;
    Storage.updateSettings({ theme: newTheme });
    
    // Settings anwenden (setzt Theme, Background, Label-Farben etc.)
    this.applySettings();
    
    this.showToast(newTheme === 'dark' ? t('darkMode') : t('lightMode'));
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
    this.showToast(t('favoriteDuplicated'));
  },

  confirmDeleteFavorite(favorite) {
    const name = favorite.alias || Storage.getHostname(favorite.url);
    this.showConfirm(
      `"${name}" wirklich löschen?`,
      async () => {
        await Storage.deleteFavorite(favorite.id);
        await this.refreshData();
        this.showToast(t('favoriteDeleted'));
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
// Material Design Farbpalette
// ============================================
const MDColorPicker = {
  colors: [
    // Red
    '#ffebee','#ffcdd2','#ef9a9a','#e57373','#ef5350','#f44336','#e53935','#d32f2f','#c62828','#b71c1c','#ff8a80','#ff5252','#ff1744','#d50000',
    // Pink
    '#fce4ec','#f8bbd0','#f48fb1','#f06292','#ec407a','#e91e63','#d81b60','#c2185b','#ad1457','#880e4f','#ff80ab','#ff4081','#f50057','#c51162',
    // Purple
    '#f3e5f5','#e1bee7','#ce93d8','#ba68c8','#ab47bc','#9c27b0','#8e24aa','#7b1fa2','#6a1b9a','#4a148c','#ea80fc','#e040fb','#d500f9','#aa00ff',
    // Deep Purple
    '#ede7f6','#d1c4e9','#b39ddb','#9575cd','#7e57c2','#673ab7','#5e35b1','#512da8','#4527a0','#311b92','#b388ff','#7c4dff','#651fff','#6200ea',
    // Indigo
    '#e8eaf6','#c5cae9','#9fa8da','#7986cb','#5c6bc0','#3f51b5','#3949ab','#303f9f','#283593','#1a237e','#8c9eff','#536dfe','#3d5afe','#304ffe',
    // Blue
    '#e3f2fd','#bbdefb','#90caf9','#64b5f6','#42a5f5','#2196f3','#1e88e5','#1976d2','#1565c0','#0d47a1','#82b1ff','#448aff','#2979ff','#2962ff',
    // Light Blue
    '#e1f5fe','#b3e5fc','#81d4fa','#4fc3f7','#29b6f6','#03a9f4','#039be5','#0288d1','#0277bd','#01579b','#80d8ff','#40c4ff','#00b0ff','#0091ea',
    // Cyan
    '#e0f7fa','#b2ebf2','#80deea','#4dd0e1','#26c6da','#00bcd4','#00acc1','#0097a7','#00838f','#006064','#84ffff','#18ffff','#00e5ff','#00b8d4',
    // Teal
    '#e0f2f1','#b2dfdb','#80cbc4','#4db6ac','#26a69a','#009688','#00897b','#00796b','#00695c','#004d40','#a7ffeb','#64ffda','#1de9b6','#00bfa5',
    // Green
    '#e8f5e9','#c8e6c9','#a5d6a7','#81c784','#66bb6a','#4caf50','#43a047','#388e3c','#2e7d32','#1b5e20','#b9f6ca','#69f0ae','#00e676','#00c853',
    // Light Green
    '#f1f8e9','#dcedc8','#c5e1a5','#aed581','#9ccc65','#8bc34a','#7cb342','#689f38','#558b2f','#33691e','#ccff90','#b2ff59','#76ff03','#64dd17',
    // Lime
    '#f9fbe7','#f0f4c3','#e6ee9c','#dce775','#d4e157','#cddc39','#c0ca33','#afb42b','#9e9d24','#827717','#f4ff81','#eeff41','#c6ff00','#aeea00',
    // Yellow
    '#fffde7','#fff9c4','#fff59d','#fff176','#ffee58','#ffeb3b','#fdd835','#fbc02d','#f9a825','#f57f17','#ffff8d','#ffff00','#ffea00','#ffd600',
    // Amber
    '#fff8e1','#ffecb3','#ffe082','#ffd54f','#ffca28','#ffc107','#ffb300','#ffa000','#ff8f00','#ff6f00','#ffe57f','#ffd740','#ffc400','#ffab00',
    // Orange
    '#fff3e0','#ffe0b2','#ffcc80','#ffb74d','#ffa726','#ff9800','#fb8c00','#f57c00','#ef6c00','#e65100','#ffd180','#ffab40','#ff9100','#ff6d00',
    // Deep Orange
    '#fbe9e7','#ffccbc','#ffab91','#ff8a65','#ff7043','#ff5722','#f4511e','#e64a19','#d84315','#bf360c','#ff9e80','#ff6e40','#ff3d00','#dd2c00',
    // Brown
    '#efebe9','#d7ccc8','#bcaaa4','#a1887f','#8d6e63','#795548','#6d4c41','#5d4037','#4e342e','#3e2723','#3e2723','#3e2723','#3e2723','#3e2723',
    // Grey
    '#fafafa','#f5f5f5','#eeeeee','#e0e0e0','#bdbdbd','#9e9e9e','#757575','#616161','#424242','#212121','#000000','#ffffff','#000000','#ffffff'
  ],

  activeSwatch: null,
  callback: null,

  init() {
    const grid = document.getElementById('md-color-grid');
    if (!grid) return;

    this.colors.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'md-color-cell';
      btn.style.background = color;
      btn.dataset.color = color;
      btn.addEventListener('click', () => this.select(color));
      grid.appendChild(btn);
    });

    document.getElementById('md-color-picker-backdrop')
      ?.addEventListener('click', () => this.close());

    // Alle .color-swatch Buttons initialisieren + .value Kompatibilität
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      // .value Property damit bestehender Code weiterhin funktioniert
      Object.defineProperty(swatch, 'value', {
        get() { return this.dataset.color; },
        set(v) { this.dataset.color = v; this.style.background = v; }
      });
      swatch.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(swatch);
      });
    });
  },

  open(swatch) {
    this.activeSwatch = swatch;
    const currentColor = swatch.dataset.color;

    // Aktive Farbe markieren
    document.querySelectorAll('.md-color-cell').forEach(cell => {
      cell.classList.toggle('selected', cell.dataset.color === currentColor);
    });

    document.getElementById('md-color-picker-overlay').classList.remove('hidden');
  },

  select(color) {
    if (this.activeSwatch) {
      this.activeSwatch.style.background = color;
      this.activeSwatch.dataset.color = color;
      // Change-Event simulieren damit bestehende Listener reagieren
      this.activeSwatch.value = color;
      this.activeSwatch.dispatchEvent(new Event('input', { bubbles: true }));
      this.activeSwatch.dispatchEvent(new Event('change', { bubbles: true }));
    }
    this.close();
  },

  close() {
    document.getElementById('md-color-picker-overlay').classList.add('hidden');
    this.activeSwatch = null;
  }
};

// ============================================
// Preview synchronisieren
// ============================================
function updatePreview() {
  const mirror = document.getElementById('preview-bg-mirror');
  const bg = document.getElementById('background');
  const previewImg = document.getElementById('preview-icon-img');
  const previewTile = document.querySelector('.preview-icon-tile');

  // Hintergrund 1:1 vom Background-Element kopieren
  if (mirror && bg) {
    // Alles zurücksetzen
    mirror.style.cssText = '';
    mirror.style.position = 'absolute';
    mirror.style.inset = '0';
    mirror.style.borderRadius = '12px';

    // Direkt die gesetzten Inline-Styles kopieren
    if (bg.style.backgroundImage) {
      mirror.style.backgroundImage = bg.style.backgroundImage;
      mirror.style.backgroundSize = 'cover';
      mirror.style.backgroundPosition = 'center';
    } else if (bg.style.background) {
      mirror.style.background = bg.style.background;
    } else if (bg.style.backgroundColor) {
      mirror.style.backgroundColor = bg.style.backgroundColor;
    }

    // Filter (Blur/Overlay) auch kopieren
    if (bg.style.filter) {
      mirror.style.filter = bg.style.filter;
    }
  }

  // Schatten-Toggle
  if (previewImg && App.settings) {
    previewImg.classList.toggle('no-shadow', !App.settings.grid.showShadow);
  }

  // Label-Position
  if (previewTile && App.settings) {
    const pos = App.settings.labels?.position || 'below';
    previewTile.classList.toggle('label-above', pos === 'above');
  }
}

// ============================================
// Initialize App
// ============================================
window.FavGrid = App;
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  MDColorPicker.init();
  // Preview bei jeder Aenderung synchronisieren
  setTimeout(updatePreview, 500);
  const bgObserver = new MutationObserver(updatePreview);
  const bgEl = document.getElementById('background');
  if (bgEl) bgObserver.observe(bgEl, { attributes: true, attributeFilter: ['style', 'class'] });
});
