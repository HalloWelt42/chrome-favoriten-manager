/**
 * FavGrid Popup Script
 * Nutzt zentrale Storage-Konfiguration aus storage.js
 */

// Storage wird über <script src="../lib/storage.js"> im HTML geladen
// Falls nicht vorhanden, Fallback:
if (typeof generateId === 'undefined') {
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Aktuellen Tab holen
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || '';
    const currentTitle = tab?.title || '';
    
    console.log('Current tab:', currentUrl, currentTitle);
    
    // URL-Anzeige aktualisieren
    const urlDisplay = document.getElementById('current-url');
    const addButton = document.getElementById('add-current');
    
    if (currentUrl && currentUrl.startsWith('http')) {
      try {
        urlDisplay.textContent = new URL(currentUrl).hostname;
      } catch {
        urlDisplay.textContent = currentUrl.substring(0, 30) + '...';
      }
    } else {
      urlDisplay.textContent = t('cannotAddPage');
      addButton.disabled = true;
      addButton.style.opacity = '0.5';
      addButton.style.cursor = 'not-allowed';
    }
    
    // Stats, Gruppen und letzte Auswahl laden
    let data = await chrome.storage.local.get(['favorites', 'groups', 'lastSelectedGroupId']);
    let favorites = data.favorites || [];
    let groups = data.groups || [];
    let lastSelectedGroupId = data.lastSelectedGroupId || null;
    
    // Default-Gruppe initialisieren falls keine existiert
    if (groups.length === 0) {
      const defaultGroup = {
        id: 'default',
        name: chrome.i18n.getMessage('favorites') || 'Favoriten',
        icon: '⭐',
        color: '#7f5af0',
        position: 0,
        isDefault: true,
        source: 'manual',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      groups = [defaultGroup];
      await chrome.storage.local.set({ groups });
      console.log('Created default group');
    }
    
    // Stats aktualisieren
    document.getElementById('total-favorites').textContent = favorites.length;
    document.getElementById('total-groups').textContent = groups.length;
    
    // Gruppen-Dropdown befüllen
    const groupSelect = document.getElementById('target-group');
    const defaultGroup = groups.find(g => g.isDefault) || groups[0];
    // Letzte Gruppe vorauswählen, sonst Default
    const preselectedId = lastSelectedGroupId && groups.some(g => g.id === lastSelectedGroupId)
      ? lastSelectedGroupId
      : defaultGroup?.id;

    groupSelect.innerHTML = '';
    groups.sort((a, b) => a.position - b.position).forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = `${group.icon} ${group.name}`;
      if (group.id === preselectedId) option.selected = true;
      groupSelect.appendChild(option);
    });
    
    // Aktuelle Seite hinzufügen
    addButton.addEventListener('click', async () => {
      if (!currentUrl || !currentUrl.startsWith('http')) {
        showToast(t('cannotAddPage'), true);
        return;
      }
      
      try {
        // Favoriten neu laden für aktuellen Stand
        const freshData = await chrome.storage.local.get(['favorites']);
        const currentFavorites = freshData.favorites || [];
        
        // Prüfen ob bereits vorhanden
        const exists = currentFavorites.some(f => f.url === currentUrl);
        if (exists) {
          showToast(t('alreadyInFavorites'), true);
          return;
        }
        
        const groupId = groupSelect.value;
        const groupFavorites = currentFavorites.filter(f => f.groupId === groupId);
        
        // Neuen Favorit erstellen (nutzt zentrale oder lokale generateId)
        const newFavorite = {
          id: (typeof Storage !== 'undefined' && Storage.generateId) ? Storage.generateId() : generateId(),
          url: currentUrl,
          alias: currentTitle || new URL(currentUrl).hostname,
          description: '',
          tags: [],
          favicon: '',
          customIcon: null,
          groupId: groupId,
          position: groupFavorites.length,
          source: 'manual',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          visitCount: 0,
          lastVisited: null
        };
        
        currentFavorites.push(newFavorite);
        await chrome.storage.local.set({
          favorites: currentFavorites,
          lastSelectedGroupId: groupId
        });
        
        console.log('Added favorite:', newFavorite);
        showToast(t('favoriteAdded') + ' ✓');
        
        // Stats aktualisieren
        document.getElementById('total-favorites').textContent = currentFavorites.length;
        
        // Button deaktivieren um Doppel-Hinzufügen zu verhindern
        addButton.disabled = true;
        addButton.style.opacity = '0.5';
        
        // Popup nach kurzer Verzögerung schließen
        setTimeout(() => window.close(), 1200);
        
      } catch (err) {
        console.error('Error adding favorite:', err);
        showToast(t('errorPrefix') + ': ' + err.message, true);
      }
    });
    
    // New Tab öffnen
    document.getElementById('open-newtab').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/newtab/newtab.html') });
      window.close();
    });
    
    // Donate-Seite öffnen
    document.getElementById('open-donate').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/donate/donate.html') });
      window.close();
    });
    
  } catch (err) {
    console.error('Popup initialization error:', err);
    document.getElementById('current-url').textContent = t('errorLoading');
  }
});

/**
 * Zeigt Toast-Nachricht an
 * @param {string} message - Nachricht
 * @param {boolean} isError - Fehler-Styling
 */
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.toggle('error', isError);
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}
