/**
 * FavGrid Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || '';
    const currentTitle = tab?.title || '';
    
    console.log('Current tab:', currentUrl, currentTitle);
    
    // Update current URL display
    const urlDisplay = document.getElementById('current-url');
    const addButton = document.getElementById('add-current');
    
    if (currentUrl && currentUrl.startsWith('http')) {
      try {
        urlDisplay.textContent = new URL(currentUrl).hostname;
      } catch {
        urlDisplay.textContent = currentUrl.substring(0, 30) + '...';
      }
    } else {
      urlDisplay.textContent = 'Diese Seite kann nicht hinzugefügt werden';
      addButton.disabled = true;
      addButton.style.opacity = '0.5';
      addButton.style.cursor = 'not-allowed';
    }
    
    // Load stats and groups
    let data = await chrome.storage.local.get(['favorites', 'groups']);
    let favorites = data.favorites || [];
    let groups = data.groups || [];
    
    // Initialize default group if none exists
    if (groups.length === 0) {
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
      groups = [defaultGroup];
      await chrome.storage.local.set({ groups });
      console.log('Created default group');
    }
    
    // Update stats
    document.getElementById('total-favorites').textContent = favorites.length;
    document.getElementById('total-groups').textContent = groups.length;
    
    // Populate group select
    const groupSelect = document.getElementById('target-group');
    const defaultGroup = groups.find(g => g.isDefault) || groups[0];
    
    groupSelect.innerHTML = ''; // Clear first
    groups.sort((a, b) => a.position - b.position).forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = `${group.icon} ${group.name}`;
      if (group.id === defaultGroup?.id) option.selected = true;
      groupSelect.appendChild(option);
    });
    
    // Add current page
    addButton.addEventListener('click', async () => {
      if (!currentUrl || !currentUrl.startsWith('http')) {
        showToast('Diese Seite kann nicht hinzugefügt werden', true);
        return;
      }
      
      try {
        // Reload favorites to get current state
        const freshData = await chrome.storage.local.get(['favorites']);
        const currentFavorites = freshData.favorites || [];
        
        // Check if already exists
        const exists = currentFavorites.some(f => f.url === currentUrl);
        if (exists) {
          showToast('Diese Seite ist bereits in deinen Favoriten!', true);
          return;
        }
        
        const groupId = groupSelect.value;
        const groupFavorites = currentFavorites.filter(f => f.groupId === groupId);
        
        const newFavorite = {
          id: generateId(),
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
        await chrome.storage.local.set({ favorites: currentFavorites });
        
        console.log('Added favorite:', newFavorite);
        showToast('Favorit hinzugefügt! ✓');
        
        // Update stats
        document.getElementById('total-favorites').textContent = currentFavorites.length;
        
        // Disable button to prevent double-add
        addButton.disabled = true;
        addButton.style.opacity = '0.5';
        
        // Close popup after short delay
        setTimeout(() => window.close(), 1200);
        
      } catch (err) {
        console.error('Error adding favorite:', err);
        showToast('Fehler: ' + err.message, true);
      }
    });
    
    // Open new tab
    document.getElementById('open-newtab').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/newtab/newtab.html') });
      window.close();
    });
    
    // Open settings
    document.getElementById('open-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    
  } catch (err) {
    console.error('Popup initialization error:', err);
    document.getElementById('current-url').textContent = 'Fehler beim Laden';
  }
});

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.toggle('error', isError);
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}
