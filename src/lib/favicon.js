/**
 * FavGrid Favicon System v3.0
 * 
 * Lädt Favicons aus verschiedenen Quellen:
 * 1. HTML parsen (link rel="icon", manifest.json, meta tags)
 * 2. Statische bekannte Pfade
 * 3. Externe Services (DuckDuckGo, Google, etc.)
 * 
 * Features:
 * - HTML-Parsing findet alle deklarierten Icons
 * - Manifest.json wird geparst für PWA-Icons
 * - Einmal gefundene Quellen werden gecacht
 * - Bereits geladene Icons werden wiederverwendet
 */

const Favicon = {
  // Cache für bereits geladene Icons (Data-URLs)
  loadedCache: new Map(),
  
  // Geparste Quellen pro Origin (für Rotation)
  sourcesCache: new Map(),

  /**
   * Alle Icon-Quellen für eine URL finden (mit HTML-Parsing)
   * Wird einmal aufgerufen und dann gecacht
   */
  async discoverSources(url) {
    try {
      const urlObj = new URL(url);
      const origin = urlObj.origin;
      const hostname = urlObj.hostname;
      
      // Bereits geparst?
      if (this.sourcesCache.has(origin)) {
        console.log('[Favicon] Using cached sources for:', origin);
        return this.sourcesCache.get(origin);
      }
      
      console.log('[Favicon] Discovering sources for:', origin);
      
      const sources = [];
      
      // === STUFE 1: HTML parsen ===
      try {
        const htmlSources = await this.parseHtmlForIcons(url);
        sources.push(...htmlSources);
        console.log('[Favicon] Found', htmlSources.length, 'icons in HTML');
      } catch (e) {
        console.warn('[Favicon] HTML parsing failed:', e.message);
      }
      
      // === STUFE 2: Statische Pfade ===
      const staticPaths = this.getStaticPaths(origin);
      sources.push(...staticPaths);
      
      // === STUFE 3: Externe Services ===
      const services = this.getExternalServices(hostname);
      sources.push(...services);
      
      // === STUFE 4: Fallback ===
      sources.push({ url: null, name: 'Generiert', type: 'fallback' });
      
      // Duplikate entfernen (nach URL)
      const uniqueSources = [];
      const seenUrls = new Set();
      for (const src of sources) {
        const key = src.url || 'fallback';
        if (!seenUrls.has(key)) {
          seenUrls.add(key);
          uniqueSources.push(src);
        }
      }
      
      console.log('[Favicon] Total unique sources:', uniqueSources.length);
      
      // Cachen
      this.sourcesCache.set(origin, uniqueSources);
      
      return uniqueSources;
    } catch (e) {
      console.error('[Favicon] Discovery failed:', e);
      return this.getStaticSourcesOnly(url);
    }
  },

  /**
   * HTML der Seite parsen und alle Icon-Links extrahieren
   */
  async parseHtmlForIcons(url) {
    const sources = [];
    const origin = new URL(url).origin;
    
    // HTML fetchen
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parser erstellen
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // === LINK TAGS ===
    const linkSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
      'link[rel="mask-icon"]',
      'link[rel*="icon"]'
    ];
    
    for (const selector of linkSelectors) {
      const links = doc.querySelectorAll(selector);
      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href) continue;
        
        const iconUrl = this.resolveUrl(href, origin);
        const sizes = link.getAttribute('sizes') || '';
        const rel = link.getAttribute('rel') || '';
        const type = link.getAttribute('type') || '';
        
        // Name generieren
        let name = 'HTML';
        if (rel.includes('apple')) name = 'Apple';
        else if (rel.includes('mask')) name = 'Safari';
        else if (type.includes('svg')) name = 'SVG';
        
        if (sizes && sizes !== 'any') {
          name += ` ${sizes.split('x')[0]}`;
        } else if (type.includes('svg') || href.endsWith('.svg')) {
          name = 'SVG';
        }
        
        sources.push({
          url: iconUrl,
          name: name,
          type: 'html',
          sizes: sizes,
          priority: this.getSizePriority(sizes)
        });
      }
    }
    
    // === META TAGS (Microsoft) ===
    const msTileImage = doc.querySelector('meta[name="msapplication-TileImage"]');
    if (msTileImage) {
      const content = msTileImage.getAttribute('content');
      if (content) {
        sources.push({
          url: this.resolveUrl(content, origin),
          name: 'MS Tile',
          type: 'html',
          priority: 50
        });
      }
    }
    
    // === MANIFEST ===
    const manifestLink = doc.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const manifestHref = manifestLink.getAttribute('href');
      if (manifestHref) {
        try {
          const manifestUrl = this.resolveUrl(manifestHref, origin);
          const manifestSources = await this.parseManifest(manifestUrl, origin);
          sources.push(...manifestSources);
        } catch (e) {
          console.warn('[Favicon] Manifest parsing failed:', e.message);
        }
      }
    }
    
    // Nach Größe sortieren (größte zuerst)
    sources.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    return sources;
  },

  /**
   * Web App Manifest parsen
   */
  async parseManifest(manifestUrl, origin) {
    const sources = [];
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(manifestUrl, {
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return sources;
    
    const manifest = await response.json();
    
    if (manifest.icons && Array.isArray(manifest.icons)) {
      for (const icon of manifest.icons) {
        if (!icon.src) continue;
        
        const iconUrl = this.resolveUrl(icon.src, origin);
        const sizes = icon.sizes || '';
        const purpose = icon.purpose || '';
        
        let name = 'Manifest';
        if (sizes && sizes !== 'any') {
          name += ` ${sizes.split('x')[0]}`;
        }
        if (purpose.includes('maskable')) {
          name += ' Mask';
        }
        
        sources.push({
          url: iconUrl,
          name: name,
          type: 'manifest',
          sizes: sizes,
          priority: this.getSizePriority(sizes)
        });
      }
    }
    
    return sources;
  },

  /**
   * URL auflösen (relativ → absolut)
   */
  resolveUrl(href, origin) {
    if (!href) return null;
    if (href.startsWith('data:')) return href;
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return origin + href;
    return origin + '/' + href;
  },

  /**
   * Priorität nach Größe berechnen (größer = besser)
   */
  getSizePriority(sizes) {
    if (!sizes || sizes === 'any') return 100; // SVG ist top
    const match = sizes.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  },

  /**
   * Statische bekannte Pfade
   */
  getStaticPaths(origin) {
    const paths = [
      { path: '/favicon.svg', name: 'SVG' },
      { path: '/icon.svg', name: 'Icon SVG' },
      { path: '/apple-touch-icon.png', name: 'Apple' },
      { path: '/apple-touch-icon-precomposed.png', name: 'Apple Pre' },
      { path: '/apple-touch-icon-180x180.png', name: 'Apple 180' },
      { path: '/apple-touch-icon-152x152.png', name: 'Apple 152' },
      { path: '/android-chrome-512x512.png', name: 'Android 512' },
      { path: '/android-chrome-192x192.png', name: 'Android 192' },
      { path: '/icon-512x512.png', name: 'Icon 512' },
      { path: '/icon-192x192.png', name: 'Icon 192' },
      { path: '/icon-128x128.png', name: 'Icon 128' },
      { path: '/mstile-310x310.png', name: 'MS Tile 310' },
      { path: '/mstile-150x150.png', name: 'MS Tile 150' },
      { path: '/favicon-96x96.png', name: 'Favicon 96' },
      { path: '/favicon-32x32.png', name: 'Favicon 32' },
      { path: '/favicon.png', name: 'Favicon PNG' },
      { path: '/favicon.ico', name: 'Favicon ICO' },
      { path: '/assets/favicon.png', name: 'Assets' },
      { path: '/assets/icon.png', name: 'Assets Icon' },
      { path: '/images/favicon.png', name: 'Images' },
      { path: '/img/favicon.png', name: 'Img' },
      { path: '/static/favicon.png', name: 'Static' },
      { path: '/public/favicon.ico', name: 'Public' },
    ];
    
    return paths.map(p => ({
      url: origin + p.path,
      name: p.name,
      type: 'static'
    }));
  },

  /**
   * Externe Icon-Services
   */
  getExternalServices(hostname) {
    return [
      { url: `https://icons.duckduckgo.com/ip3/${hostname}.ico`, name: 'DuckDuckGo', type: 'service' },
      { url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`, name: 'Google 128', type: 'service' },
      { url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`, name: 'Google 64', type: 'service' },
      { url: `https://icon.horse/icon/${hostname}`, name: 'Icon Horse', type: 'service' },
    ];
  },

  /**
   * Nur statische Quellen (Fallback wenn HTML-Parsing fehlschlägt)
   */
  getStaticSourcesOnly(url) {
    try {
      const urlObj = new URL(url);
      return [
        ...this.getStaticPaths(urlObj.origin),
        ...this.getExternalServices(urlObj.hostname),
        { url: null, name: 'Generiert', type: 'fallback' }
      ];
    } catch {
      return [{ url: null, name: 'Generiert', type: 'fallback' }];
    }
  },

  /**
   * Cache für eine URL leeren (für Reset)
   */
  clearCacheForUrl(url) {
    try {
      const origin = new URL(url).origin;
      this.sourcesCache.delete(origin);
      
      // Auch geladene Icons für diese Origin löschen
      for (const key of this.loadedCache.keys()) {
        if (key.startsWith(origin)) {
          this.loadedCache.delete(key);
        }
      }
      
      console.log('[Favicon] Cache cleared for:', origin);
    } catch (e) {
      console.warn('[Favicon] Clear cache failed:', e);
    }
  },

  /**
   * Einzelne Quelle laden und als Data-URL zurückgeben
   * Nutzt Cache wenn bereits geladen
   */
  async fetchSource(source, originalUrl) {
    if (!source.url) {
      // Fallback generieren
      return {
        dataUrl: this.generateFallback(originalUrl),
        name: source.name,
        type: source.type
      };
    }
    
    // Bereits im Cache?
    if (this.loadedCache.has(source.url)) {
      console.log('[Favicon] Cache hit:', source.name);
      return {
        dataUrl: this.loadedCache.get(source.url),
        name: source.name + ' ✓',
        type: source.type,
        cached: true
      };
    }
    
    const dataUrl = await this.fetchAndConvert(source.url);
    if (dataUrl) {
      // In Cache speichern
      this.loadedCache.set(source.url, dataUrl);
      
      return {
        dataUrl,
        name: source.name,
        type: source.type,
        originalUrl: source.url
      };
    }
    
    return null;
  },

  /**
   * URL laden und zu Data-URL konvertieren
   */
  async fetchAndConvert(imageUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(imageUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'force-cache',
        credentials: 'omit',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      
      if (!response.ok) return null;
      
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('image') && !contentType.includes('octet-stream') && !contentType.includes('svg')) {
        return null;
      }
      
      const blob = await response.blob();
      
      if (blob.size < 50) return null;
      if (blob.size > 5 * 1024 * 1024) return null;
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  },

  /**
   * Buchstaben-Fallback generieren
   */
  generateFallback(url) {
    try {
      const hostname = new URL(url).hostname;
      const letter = hostname.replace(/^www\./, '').charAt(0).toUpperCase();
      
      const colors = [
        '#7f5af0', '#2cb67d', '#ff6b6b', '#4ecdc4', '#45b7d1',
        '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe'
      ];
      const colorIndex = hostname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
      const bgColor = colors[colorIndex];
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="${bgColor}"/>
        <text x="50" y="65" font-family="system-ui,-apple-system,sans-serif" font-size="50" font-weight="600" fill="white" text-anchor="middle">${letter}</text>
      </svg>`;
      
      return 'data:image/svg+xml;base64,' + btoa(svg);
    } catch {
      return 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#7f5af0"/><text x="50" y="65" font-family="sans-serif" font-size="50" fill="white" text-anchor="middle">?</text></svg>');
    }
  },

  /**
   * Schneller Google-Fallback für Grid-Anzeige
   */
  async get(url, forceRefresh = false) {
    try {
      const hostname = new URL(url).hostname;
      const cacheKey = `google_${hostname}`;
      
      if (!forceRefresh && this.loadedCache.has(cacheKey)) {
        return this.loadedCache.get(cacheKey);
      }
      
      const googleUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
      const dataUrl = await this.fetchAndConvert(googleUrl);
      
      if (dataUrl) {
        this.loadedCache.set(cacheKey, dataUrl);
        return dataUrl;
      }
      
      return this.generateFallback(url);
    } catch {
      return this.generateFallback(url);
    }
  }
};

// Alias für Kompatibilität
const FavGridFavicon = Favicon;
