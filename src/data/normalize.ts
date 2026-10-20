/**
 * Prüft und repariert eine gespeicherte Bibliothek. Kaputte oder fehlende Felder bekommen
 * Vorgaben, verwaiste Favoriten landen in der Standardgruppe, Positionen werden lückenlos.
 * Es wird nie etwas verworfen, das sich noch retten lässt.
 */
import { newId } from '../domain/ids';
import {
  BACKGROUND_TYPES,
  CLICK_BEHAVIORS,
  createDefaultSettings,
  FONT_WEIGHTS,
  LABEL_FONTS,
  LABEL_POSITIONS,
  PAGE_TRANSITIONS,
  RANGES,
  SORT_MODES,
  THEME_MODES,
  UI_SCALES,
  type Range
} from '../domain/settingsSpec';
import {
  SCHEMA_VERSION,
  type Favorite,
  type FavoriteSource,
  type Group,
  type IconChoice,
  type IconOrigin,
  type ImageSource,
  type Library,
  type Settings,
  type StartupGroup,
  type TrashEntry
} from '../domain/types';

type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Obj => (isObj(v) ? v : {});
export const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const timestamp = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);

function num(v: unknown, fallback: number, range?: Range): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return range ? Math.min(range.max, Math.max(range.min, Math.round(n))) : n;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function color(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
}

const ICON_ORIGINS: readonly IconOrigin[] = ['page', 'manifest', 'well-known', 'browser', 'service', 'upload', 'edited', 'legacy'];
const FAVORITE_SOURCES: readonly FavoriteSource[] = ['manual', 'browser', 'import'];
const isRef = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);

export function normalizeIcon(raw: unknown): IconChoice {
  const icon = obj(raw);
  if (icon.mode === 'custom' && isRef(icon.ref)) {
    return {
      mode: 'custom',
      ref: icon.ref,
      origin: oneOf(icon.origin, ICON_ORIGINS, 'upload'),
      originalRef: isRef(icon.originalRef) ? icon.originalRef : null
    };
  }
  return {
    mode: 'auto',
    ref: isRef(icon.ref) ? icon.ref : null,
    origin: icon.origin ? oneOf(icon.origin, ICON_ORIGINS, 'page') : null,
    checkedAt: typeof icon.checkedAt === 'number' ? icon.checkedAt : null
  };
}

export function normalizeFavorite(raw: unknown, now: number): Favorite | null {
  const f = obj(raw);
  const url = str(f.url).trim();
  if (!url) return null;
  const createdAt = timestamp(f.createdAt, now);
  return {
    id: str(f.id) || newId(),
    url,
    alias: str(f.alias),
    description: str(f.description),
    tags: Array.isArray(f.tags) ? f.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '') : [],
    groupId: str(f.groupId),
    position: num(f.position, Number.MAX_SAFE_INTEGER),
    icon: normalizeIcon(f.icon),
    source: oneOf(f.source, FAVORITE_SOURCES, 'manual'),
    createdAt,
    updatedAt: timestamp(f.updatedAt, createdAt),
    visitCount: Math.max(0, Math.trunc(num(f.visitCount, 0))),
    lastVisited: typeof f.lastVisited === 'number' && f.lastVisited > 0 ? f.lastVisited : null
  };
}

export function normalizeGroup(raw: unknown, now: number): Group | null {
  const g = obj(raw);
  const id = str(g.id);
  if (!id) return null;
  return {
    id,
    name: str(g.name).trim() || '?',
    icon: str(g.icon) || '⭐',
    color: color(g.color, '#7f5af0'),
    position: num(g.position, Number.MAX_SAFE_INTEGER),
    isDefault: g.isDefault === true,
    createdAt: timestamp(g.createdAt, now),
    updatedAt: timestamp(g.updatedAt, now)
  };
}

function normalizeTrashEntry(raw: unknown, now: number): TrashEntry | null {
  const e = obj(raw);
  const id = str(e.id) || newId();
  const deletedAt = timestamp(e.deletedAt, now);
  if (e.kind === 'favorite') {
    const favorite = normalizeFavorite(e.favorite, now);
    return favorite ? { id, kind: 'favorite', deletedAt, favorite } : null;
  }
  if (e.kind === 'group') {
    const group = normalizeGroup(e.group, now);
    if (!group) return null;
    const favorites = Array.isArray(e.favorites)
      ? e.favorites.map((f) => normalizeFavorite(f, now)).filter((f): f is Favorite => f !== null)
      : [];
    return { id, kind: 'group', deletedAt, group: { ...group, isDefault: false }, favorites };
  }
  return null;
}

function normalizeImageSource(raw: unknown): ImageSource {
  const s = obj(raw);
  if (s.kind === 'asset' && isRef(s.ref)) return { kind: 'asset', ref: s.ref };
  if (s.kind === 'url' && typeof s.url === 'string' && s.url.trim()) return { kind: 'url', url: s.url.trim() };
  return null;
}

function normalizeStartup(raw: unknown): StartupGroup {
  if (raw === 'last' || raw === 'default') return raw;
  const s = obj(raw);
  return typeof s.groupId === 'string' && s.groupId ? { groupId: s.groupId } : 'last';
}

export function normalizeSettings(raw: unknown): Settings {
  const d = createDefaultSettings();
  const s = obj(raw);
  const bg = obj(s.background);
  const grid = obj(s.grid);
  const tiles = obj(s.tiles);
  const labels = obj(s.labels);
  const nav = obj(s.navigation);
  const startup = obj(s.startup);
  const customGradient = obj(bg.customGradient);
  return {
    theme: oneOf(s.theme, THEME_MODES, d.theme),
    accentColor: color(s.accentColor, d.accentColor),
    uiScale: oneOf(s.uiScale, UI_SCALES, d.uiScale),
    background: {
      type: oneOf(bg.type, BACKGROUND_TYPES, d.background.type),
      gradient: str(bg.gradient) || d.background.gradient,
      color: color(bg.color, d.background.color),
      customGradient: {
        color1: color(customGradient.color1, d.background.customGradient.color1),
        color2: color(customGradient.color2, d.background.customGradient.color2)
      },
      imageDark: normalizeImageSource(bg.imageDark),
      imageLight: normalizeImageSource(bg.imageLight),
      useDarkForLight: bool(bg.useDarkForLight, d.background.useDarkForLight),
      blur: num(bg.blur, d.background.blur, RANGES.backgroundBlur),
      brightness: num(bg.brightness, d.background.brightness, RANGES.backgroundBrightness)
    },
    grid: {
      columns: num(grid.columns, d.grid.columns, RANGES.columns),
      rows: num(grid.rows, d.grid.rows, RANGES.rows),
      iconSize: num(grid.iconSize, d.grid.iconSize, RANGES.iconSize),
      gap: num(grid.gap, d.grid.gap, RANGES.gap),
      borderRadius: num(grid.borderRadius, d.grid.borderRadius, RANGES.borderRadius),
      imageRadius: num(grid.imageRadius, d.grid.imageRadius, RANGES.imageRadius),
      showShadow: bool(grid.showShadow, d.grid.showShadow)
    },
    tiles: {
      opacity: num(tiles.opacity, d.tiles.opacity, RANGES.tileOpacity),
      bgDark: color(tiles.bgDark, d.tiles.bgDark),
      bgLight: color(tiles.bgLight, d.tiles.bgLight),
      glassBlur: num(tiles.glassBlur, d.tiles.glassBlur, RANGES.glassBlur),
      glassBorder: num(tiles.glassBorder, d.tiles.glassBorder, RANGES.glassBorder),
      glassShadow: num(tiles.glassShadow, d.tiles.glassShadow, RANGES.glassShadow)
    },
    labels: {
      show: bool(labels.show, d.labels.show),
      position: oneOf(labels.position, LABEL_POSITIONS, d.labels.position),
      fontSize: num(labels.fontSize, d.labels.fontSize, RANGES.labelFontSize),
      maxLength: num(labels.maxLength, d.labels.maxLength, RANGES.labelMaxLength),
      font: oneOf(labels.font, LABEL_FONTS, d.labels.font),
      customFont: str(labels.customFont),
      fontWeight: oneOf(labels.fontWeight, FONT_WEIGHTS, d.labels.fontWeight),
      colorDark: color(labels.colorDark, d.labels.colorDark),
      colorLight: color(labels.colorLight, d.labels.colorLight)
    },
    animations: { pageTransition: oneOf(obj(s.animations).pageTransition, PAGE_TRANSITIONS, d.animations.pageTransition) },
    search: { instantSearch: bool(obj(s.search).instantSearch, d.search.instantSearch) },
    navigation: {
      keyboard: bool(nav.keyboard, d.navigation.keyboard),
      mousewheel: bool(nav.mousewheel, d.navigation.mousewheel),
      swipe: bool(nav.swipe, d.navigation.swipe),
      showArrows: bool(nav.showArrows, d.navigation.showArrows),
      clickBehavior: oneOf(nav.clickBehavior, CLICK_BEHAVIORS, d.navigation.clickBehavior)
    },
    startup: {
      group: normalizeStartup(startup.group),
      lastGroupId: typeof startup.lastGroupId === 'string' ? startup.lastGroupId : null
    },
    view: { sort: oneOf(obj(s.view).sort, SORT_MODES, d.view.sort) },
    icons: {
      autoDetect: bool(obj(s.icons).autoDetect, d.icons.autoDetect),
      useExternalServices: bool(obj(s.icons).useExternalServices, d.icons.useExternalServices),
      hintDismissed: bool(obj(s.icons).hintDismissed, d.icons.hintDismissed)
    }
  };
}

export function createDefaultGroup(name: string, now: number): Group {
  return { id: 'default', name, icon: '⭐', color: '#7f5af0', position: 0, isDefault: true, createdAt: now, updatedAt: now };
}

/** Repariert die Bibliothek; defaultGroupName wird nur gebraucht, wenn gar keine Gruppe existiert. */
export function normalizeLibrary(raw: unknown, defaultGroupName: string, now = Date.now()): Library {
  const r = obj(raw);
  const seenGroupIds = new Set<string>();
  const groups: Group[] = [];
  for (const g of Array.isArray(r.groups) ? r.groups : []) {
    const group = normalizeGroup(g, now);
    if (!group || seenGroupIds.has(group.id)) continue;
    seenGroupIds.add(group.id);
    groups.push(group);
  }
  if (groups.length === 0) groups.push(createDefaultGroup(defaultGroupName, now));
  // Genau eine Standardgruppe.
  const defaults = groups.filter((g) => g.isDefault);
  const theDefault = defaults[0] ?? [...groups].sort((a, b) => a.position - b.position)[0]!;
  for (const g of groups) g.isDefault = g === theDefault;

  const seenFavoriteIds = new Set<string>();
  const favorites: Favorite[] = [];
  for (const f of Array.isArray(r.favorites) ? r.favorites : []) {
    const fav = normalizeFavorite(f, now);
    if (!fav) continue;
    if (seenFavoriteIds.has(fav.id)) fav.id = newId();
    seenFavoriteIds.add(fav.id);
    if (!seenGroupIds.has(fav.groupId)) fav.groupId = theDefault.id;
    favorites.push(fav);
  }

  const trash = (Array.isArray(r.trash) ? r.trash : [])
    .map((e) => normalizeTrashEntry(e, now))
    .filter((e): e is TrashEntry => e !== null);

  // Positionen lückenlos, stabile Reihenfolge bei Gleichstand.
  groups.sort((a, b) => a.position - b.position).forEach((g, i) => (g.position = i));
  const perGroup = new Map<string, Favorite[]>();
  for (const f of favorites) {
    const list = perGroup.get(f.groupId);
    if (list) list.push(f);
    else perGroup.set(f.groupId, [f]);
  }
  for (const list of perGroup.values()) list.sort((a, b) => a.position - b.position).forEach((f, i) => (f.position = i));

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: normalizeSettings(r.settings),
    groups,
    favorites,
    trash,
    updatedAt: timestamp(r.updatedAt, now)
  };
}
