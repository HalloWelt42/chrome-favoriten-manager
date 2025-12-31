/**
 * FavGrid Storage Library
 * Handles all data persistence using chrome.storage.local
 */

const FavGridStorage = {
  // Default settings
  defaultSettings: {
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
  },

  // Default group
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

  // Generate UUID
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Initialize storage with defaults
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

  // Get all data
  async getAll() {
    const data = await chrome.storage.local.get(['settings', 'groups', 'favorites']);
    return {
      settings: { ...this.defaultSettings, ...data.settings },
      groups: data.groups || [this.defaultGroup],
      favorites: data.favorites || []
    };
  },

  // Settings methods
  async getSettings() {
    const data = await chrome.storage.local.get('settings');
    return { ...this.defaultSettings, ...data.settings };
  },

  async updateSettings(updates) {
    const current = await this.getSettings();
    const merged = this.deepMerge(current, updates);
    await chrome.storage.local.set({ settings: merged });
    return merged;
  },

  // Deep merge helper
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

  // Groups methods
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
    
    // Don't delete default group
    if (id === defaultGroup?.id) return false;
    
    // Move favorites to default group
    const favorites = await this.getFavorites();
    const updatedFavorites = favorites.map(f => 
      f.groupId === id ? { ...f, groupId: defaultGroup.id } : f
    );
    
    groups = groups.filter(g => g.id !== id);
    
    await chrome.storage.local.set({ groups, favorites: updatedFavorites });
    return true;
  },

  async reorderGroups(orderedIds) {
    const groups = await this.getGroups();
    const reordered = orderedIds.map((id, index) => {
      const group = groups.find(g => g.id === id);
      return { ...group, position: index };
    });
    await chrome.storage.local.set({ groups: reordered });
    return reordered;
  },

  // Favorites methods
  async getFavorites() {
    const data = await chrome.storage.local.get('favorites');
    return data.favorites || [];
  },

  async getFavoritesByGroup(groupId) {
    const favorites = await this.getFavorites();
    return favorites
      .filter(f => f.groupId === groupId)
      .sort((a, b) => a.position - b.position);
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

  async moveFavorite(id, newGroupId, newPosition = null) {
    const favorites = await this.getFavorites();
    const favorite = favorites.find(f => f.id === id);
    
    if (!favorite) return null;
    
    // Update group
    favorite.groupId = newGroupId;
    favorite.updatedAt = Date.now();
    
    // Update position
    if (newPosition !== null) {
      favorite.position = newPosition;
    } else {
      const groupFavorites = favorites.filter(f => f.groupId === newGroupId && f.id !== id);
      favorite.position = groupFavorites.length;
    }
    
    await chrome.storage.local.set({ favorites });
    return favorite;
  },

  async reorderFavorites(groupId, orderedIds) {
    const favorites = await this.getFavorites();
    
    orderedIds.forEach((id, index) => {
      const fav = favorites.find(f => f.id === id);
      if (fav && fav.groupId === groupId) {
        fav.position = index;
      }
    });
    
    await chrome.storage.local.set({ favorites });
    return favorites.filter(f => f.groupId === groupId).sort((a, b) => a.position - b.position);
  },

  async incrementVisit(id) {
    const favorites = await this.getFavorites();
    const favorite = favorites.find(f => f.id === id);
    if (favorite) {
      favorite.visitCount++;
      favorite.lastVisited = Date.now();
      await chrome.storage.local.set({ favorites });
    }
  },

  // Search
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

  // Export methods
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
    
    for (const group of groups.sort((a, b) => a.position - b.position)) {
      const groupFavorites = favorites.filter(f => f.groupId === group.id);
      html += `    <DT><H3>${this.escapeHtml(group.name)}</H3>\n    <DL><p>\n`;
      
      for (const fav of groupFavorites.sort((a, b) => a.position - b.position)) {
        const name = fav.alias || new URL(fav.url).hostname;
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
    
    for (const group of groups.sort((a, b) => a.position - b.position)) {
      const groupFavorites = favorites.filter(f => f.groupId === group.id);
      md += `## ${group.icon} ${group.name}\n\n`;
      
      for (const fav of groupFavorites.sort((a, b) => a.position - b.position)) {
        const name = fav.alias || new URL(fav.url).hostname;
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

  // Import methods
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
      const dts = doc.querySelectorAll('DT');
      
      for (const dt of dts) {
        const anchor = dt.querySelector('A');
        if (anchor) {
          await this.addFavorite({
            url: anchor.href,
            alias: anchor.textContent,
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

  // Helper
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.FavGridStorage = FavGridStorage;
}

export default FavGridStorage;
