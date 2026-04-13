/**
 * FavGrid - Zentrales Storage Modul
 * Enthält alle Default-Werte und Storage-Operationen
 * WICHTIG: Diese Datei ist die einzige Quelle für defaultSettings und generateId
 */

// ============================================
// Zentrale Konfiguration
// ============================================
const StorageConfig = {
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
      imageRadius: 0,      // Bild-Rundung in %
      showShadow: true
    },
    icons: {
      opacity: 60,           // Standard: 60% für Glaseffekt
      bgDark: '#1a1a2e',
      bgLight: '#ffffff',
      // Glassmorphism-Einstellungen
      glassBlur: 10,         // Blur in px
      glassBorder: 15,       // Border-Opacity in %
      glassShadow: 20        // Shadow-Opacity in %
    },
    labels: {
      show: true,
      position: 'below',
      fontSize: 12,
      maxLength: 20,
      fontFamily: 'system',
      customFont: '',
      fontWeight: '500',
      colorDark: '#ffffff',   // Label-Farbe im Dark Mode
      colorLight: '#1a1a2e'   // Label-Farbe im Light Mode
    },
    animations: {
      pageTransition: 'slide'
    },
    search: {
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
  }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Generiert eine UUID v4
 * @returns {string} UUID
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Deep Merge für Objekte
 * @param {Object} target - Ziel-Objekt
 * @param {Object} source - Quell-Objekt
 * @returns {Object} Gemergtes Objekt
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Extrahiert Hostname aus URL
 * @param {string} url - URL
 * @returns {string} Hostname
 */
function getHostname(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// ============================================
// Storage API
// ============================================
const Storage = {
  // Konfiguration exportieren
  defaultSettings: StorageConfig.defaultSettings,
  defaultGroup: StorageConfig.defaultGroup,
  
  // Utility-Funktionen exportieren
  generateId,
  deepMerge,
  getHostname,

  /**
   * Initialisiert Storage mit Defaults
   */
  async init() {
    const data = await chrome.storage.local.get(['settings', 'groups', 'favorites']);
    
    if (!data.settings) {
      await chrome.storage.local.set({ settings: StorageConfig.defaultSettings });
    }
    
    if (!data.groups || data.groups.length === 0) {
      await chrome.storage.local.set({ groups: [{ ...StorageConfig.defaultGroup, createdAt: Date.now(), updatedAt: Date.now() }] });
    }
    
    if (!data.favorites) {
      await chrome.storage.local.set({ favorites: [] });
    }
    
    return this.getAll();
  },

  /**
   * Holt alle Daten
   */
  async getAll() {
    const data = await chrome.storage.local.get(['settings', 'groups', 'favorites']);
    return {
      settings: deepMerge(StorageConfig.defaultSettings, data.settings || {}),
      groups: data.groups || [StorageConfig.defaultGroup],
      favorites: data.favorites || []
    };
  },

  /**
   * Holt Settings
   */
  async getSettings() {
    const data = await chrome.storage.local.get('settings');
    return deepMerge(StorageConfig.defaultSettings, data.settings || {});
  },

  /**
   * Aktualisiert Settings
   */
  async updateSettings(updates) {
    const current = await this.getSettings();
    const merged = deepMerge(current, updates);
    await chrome.storage.local.set({ settings: merged });
    return merged;
  },

  /**
   * Holt alle Gruppen
   */
  async getGroups() {
    const data = await chrome.storage.local.get('groups');
    return data.groups || [StorageConfig.defaultGroup];
  },

  /**
   * Fügt neue Gruppe hinzu
   */
  async addGroup(group) {
    const groups = await this.getGroups();
    const newGroup = {
      id: generateId(),
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

  /**
   * Aktualisiert Gruppe
   */
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

  /**
   * Löscht Gruppe (verschiebt Favoriten zur Default-Gruppe)
   */
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

  /**
   * Holt alle Favoriten
   */
  async getFavorites() {
    const data = await chrome.storage.local.get('favorites');
    return data.favorites || [];
  },

  /**
   * Holt Favoriten einer Gruppe
   */
  async getFavoritesByGroup(groupId) {
    const favorites = await this.getFavorites();
    return favorites
      .filter(f => f.groupId === groupId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  },

  /**
   * Fügt Favorit hinzu
   */
  async addFavorite(favorite) {
    const favorites = await this.getFavorites();
    const groupFavorites = favorites.filter(f => f.groupId === favorite.groupId);
    
    const newFavorite = {
      id: generateId(),
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

  /**
   * Aktualisiert Favorit
   */
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

  /**
   * Löscht Favorit
   */
  async deleteFavorite(id) {
    let favorites = await this.getFavorites();
    favorites = favorites.filter(f => f.id !== id);
    await chrome.storage.local.set({ favorites });
    return true;
  },

  /**
   * Verschiebt Favorit in andere Gruppe
   */
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

  /**
   * Sucht in Favoriten
   */
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

  // ============================================
  // Export/Import Funktionen
  // ============================================

  /**
   * Exportiert als JSON (Vollbackup)
   * Format: { version, exportDate, data: { settings, groups, favorites } }
   */
  async exportJSON() {
    const data = await this.getAll();
    return JSON.stringify({
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data
    }, null, 2);
  },

  /**
   * Exportiert als HTML (Lesezeichen-Format)
   */
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

  /**
   * Exportiert als CSV
   */
  async exportCSV() {
    const { favorites, groups } = await this.getAll();
    
    let csv = '"URL","Alias","Description","Group","Tags","Created"\n';
    
    for (const fav of favorites) {
      const group = groups.find(g => g.id === fav.groupId);
      csv += `"${fav.url}","${fav.alias}","${fav.description}","${group?.name || ''}","${(fav.tags || []).join(',')}","${new Date(fav.createdAt).toISOString()}"\n`;
    }
    
    return csv;
  },

  /**
   * Exportiert als Markdown
   */
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

  /**
   * Exportiert als Text (nur URLs)
   */
  async exportText() {
    const favorites = await this.getFavorites();
    return favorites.map(f => f.url).join('\n');
  },

  /**
   * Importiert JSON
   * Erwartet Format: { data: { favorites, groups, settings } }
   */
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

  /**
   * Importiert HTML-Lesezeichen
   */
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

  /**
   * Escaped HTML-Zeichen
   */
  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// Export für verschiedene Kontexte
if (typeof window !== 'undefined') {
  window.Storage = Storage;
  window.generateId = generateId;
}

if (typeof module !== 'undefined') {
  module.exports = { Storage, generateId, StorageConfig };
}
