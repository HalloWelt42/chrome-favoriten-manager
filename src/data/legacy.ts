/**
 * Übernahme der Daten aus FavGrid 2.x/3.x (Schlüssel settings, groups, favorites in
 * chrome.storage.local). Eingebettete Bilder wandern in den Bildspeicher. Die alten
 * Schlüssel selbst werden nicht angefasst.
 */
import type { IconChoice, ImageSource, Library } from '../domain/types';
import type { AssetStore } from './assets';
import { isObj, normalizeLibrary, str } from './normalize';

export const LEGACY_KEYS = ['settings', 'groups', 'favorites'] as const;

export interface LegacyData {
  settings?: unknown;
  groups?: unknown;
  favorites?: unknown;
}

export function hasLegacyData(data: LegacyData): boolean {
  return Array.isArray(data.favorites) || Array.isArray(data.groups);
}

const LEGACY_FONT_FAMILIES: Record<string, string> = {
  'sf-pro': "'SF Pro Display', 'SF Pro Text', -apple-system, sans-serif",
  inter: "'Inter', sans-serif",
  roboto: "'Roboto', sans-serif",
  'open-sans': "'Open Sans', sans-serif",
  lato: "'Lato', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  poppins: "'Poppins', sans-serif",
  nunito: "'Nunito', sans-serif",
  'source-sans': "'Source Sans Pro', sans-serif",
  ubuntu: "'Ubuntu', sans-serif",
  'fira-sans': "'Fira Sans', sans-serif"
};

async function imageSource(value: unknown, assets: AssetStore): Promise<ImageSource> {
  const text = str(value).trim();
  if (!text) return null;
  if (text.startsWith('data:')) {
    const ref = await assets.putDataUrl(text);
    return ref ? { kind: 'asset', ref } : null;
  }
  return /^https?:\/\//i.test(text) ? { kind: 'url', url: text } : null;
}

async function convertSettings(raw: unknown, assets: AssetStore): Promise<Record<string, unknown>> {
  if (!isObj(raw)) return {};
  const bg = isObj(raw.background) ? raw.background : {};
  const labels = isObj(raw.labels) ? raw.labels : {};
  const startup = isObj(raw.startup) ? raw.startup : {};
  const type = str(bg.type, 'gradient');
  const value = str(bg.value);

  const imageDark = (await imageSource(bg.imageDark, assets)) ?? (type === 'image' ? await imageSource(value, assets) : null);
  const imageLight = await imageSource(bg.imageLight, assets);

  const fontKey = str(labels.fontFamily, 'system');
  const font = fontKey === 'system' ? 'system' : 'custom';
  const customFont = fontKey === 'custom' ? str(labels.customFont) : LEGACY_FONT_FAMILIES[fontKey] ?? str(labels.customFont);

  const startupGroup = str(startup.group, 'last');

  return {
    ...raw,
    tiles: raw.icons,
    background: {
      ...bg,
      gradient: type === 'gradient' && value ? value : undefined,
      color: type === 'color' ? value : undefined,
      imageDark,
      imageLight
    },
    labels: { ...labels, font, customFont },
    startup: {
      group: startupGroup === 'last' || startupGroup === 'default' ? startupGroup : { groupId: startupGroup },
      lastGroupId: startup.lastGroupId
    }
  };
}

async function convertIcon(fav: Record<string, unknown>, assets: AssetStore): Promise<IconChoice> {
  const custom = str(fav.customIcon);
  if (custom.startsWith('data:')) {
    const ref = await assets.putDataUrl(custom);
    if (ref) {
      const original = str(fav.faviconOriginal);
      const originalRef = original.startsWith('data:') ? await assets.putDataUrl(original) : null;
      return { mode: 'custom', ref, origin: fav.faviconProcessed === true ? 'edited' : 'legacy', originalRef };
    }
  }
  return { mode: 'auto', ref: null, origin: null, checkedAt: null };
}

/** Wandelt Altdaten in eine Bibliothek nach Schema 4. */
export async function convertLegacy(data: LegacyData, assets: AssetStore, defaultGroupName: string, now = Date.now()): Promise<Library> {
  const favorites = [];
  for (const raw of Array.isArray(data.favorites) ? data.favorites : []) {
    if (!isObj(raw)) continue;
    favorites.push({ ...raw, icon: await convertIcon(raw, assets) });
  }
  return normalizeLibrary(
    {
      settings: await convertSettings(data.settings, assets),
      groups: data.groups,
      favorites,
      trash: []
    },
    defaultGroupName,
    now
  );
}
