/**
 * FavGrid Favicon Library
 * Handles favicon fetching, caching, and fallback generation
 */

const FavGridFavicon = {
  // Favicon service URLs (fallback chain)
  services: [
    (url) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=128`,
    (url) => `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=128`,
    (url) => `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`
  ],

  // Color palette for generated icons
  colors: [
    '#7f5af0', '#2cb67d', '#ff8906', '#e53170', '#3da9fc',
    '#f25f4c', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#ffeaa7', '#dfe6e9', '#6c5ce7', '#a29bfe', '#fd79a8',
    '#00b894', '#00cec9', '#0984e3', '#6c5ce7', '#e17055'
  ],

  // Cache for favicons
  cache: new Map(),

  /**
   * Get favicon for a URL with fallback chain
   */
  async getFavicon(url) {
    if (!url) return this.generateFallback(url);
    
    // Check cache first
    const cacheKey = new URL(url).hostname;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Try each service in order
    for (const serviceUrl of this.services) {
      try {
        const faviconUrl = serviceUrl(url);
        const isValid = await this.validateImage(faviconUrl);
        
        if (isValid) {
          this.cache.set(cacheKey, faviconUrl);
          return faviconUrl;
        }
      } catch (e) {
        continue;
      }
    }

    // Generate fallback if all services fail
    const fallback = this.generateFallback(url);
    this.cache.set(cacheKey, fallback);
    return fallback;
  },

  /**
   * Validate that an image URL is accessible
   */
  async validateImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width > 1 && img.height > 1);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // Timeout after 3 seconds
      setTimeout(() => resolve(false), 3000);
    });
  },

  /**
   * Generate a fallback icon with first letter and color
   */
  generateFallback(url) {
    let letter = '?';
    let colorIndex = 0;
    
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      letter = hostname.charAt(0).toUpperCase();
      
      // Generate consistent color based on hostname
      colorIndex = hostname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % this.colors.length;
    } catch (e) {
      // Keep defaults
    }

    const color = this.colors[colorIndex];
    const svg = this.createSVGIcon(letter, color);
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  },

  /**
   * Create an iOS-style SVG icon with letter
   */
  createSVGIcon(letter, bgColor) {
    const darkColor = this.darkenColor(bgColor, 25);
    const lightColor = this.lightenColor(bgColor, 15);
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${lightColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${darkColor};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#grad)"/>
      <rect x="0" y="0" width="64" height="32" rx="14" fill="white" fill-opacity="0.15"/>
      <text x="32" y="43" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" font-size="34" font-weight="600" fill="white" text-anchor="middle" filter="url(#shadow)">${letter}</text>
    </svg>`;
  },

  /**
   * Lighten a hex color
   */
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min((num >> 16) + amt, 255);
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
    const B = Math.min((num & 0x0000FF) + amt, 255);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  },

  /**
   * Darken a hex color
   */
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  },

  /**
   * Convert image URL to base64 for storage
   */
  async toBase64(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(url); // Return original URL if conversion fails
        }
      };
      
      img.onerror = () => resolve(url);
      img.src = url;
    });
  },

  /**
   * Get high-resolution favicon using multiple sizes
   */
  async getHighResFavicon(url) {
    const sizes = [128, 64, 48, 32];
    
    for (const size of sizes) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=${size}`;
      const isValid = await this.validateImage(faviconUrl);
      if (isValid) return faviconUrl;
    }
    
    return this.getFavicon(url);
  },

  /**
   * Clear favicon cache
   */
  clearCache() {
    this.cache.clear();
  },

  /**
   * Refresh favicon for a specific URL
   */
  async refreshFavicon(url) {
    const cacheKey = new URL(url).hostname;
    this.cache.delete(cacheKey);
    return this.getFavicon(url);
  }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.FavGridFavicon = FavGridFavicon;
}

export default FavGridFavicon;
