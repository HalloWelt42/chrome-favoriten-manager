/**
 * Datenmodell von FavGrid (Schema 4).
 *
 * Die Bibliothek ist die einzige Wahrheit für Favoriten, Gruppen, Papierkorb und
 * Einstellungen. Bilder (Icons, Hintergründe) liegen nicht in der Bibliothek, sondern
 * inhaltsadressiert im Bildspeicher; die Bibliothek verweist nur über ihren Hash darauf.
 */

export const SCHEMA_VERSION = 4;

/** Verweis auf ein Bild im Bildspeicher (SHA-256 des Inhalts, hex). */
export type AssetRef = string;

export type FavoriteSource = 'manual' | 'browser' | 'import';

/** Herkunft eines Icons, für die Anzeige im Bearbeiten-Dialog. */
export type IconOrigin =
  | 'page'          // link rel=icon / apple-touch-icon im HTML der Seite
  | 'manifest'      // Web-App-Manifest der Seite
  | 'well-known'    // feste Pfade wie /favicon.ico
  | 'browser'       // Favicon-Zwischenspeicher des Browsers
  | 'service'       // externer Icon-Dienst
  | 'upload'        // vom Nutzer hochgeladen
  | 'edited'        // vom Nutzer bearbeitet (z. B. Weiß entfernt)
  | 'legacy';       // aus einer älteren Fassung übernommen

/**
 * Icon eines Favoriten.
 * - auto: FavGrid sucht selbst; ref ist das zuletzt gefundene Bild (oder null).
 * - custom: vom Nutzer festgelegt; wird nie automatisch überschrieben.
 */
export type IconChoice =
  | { mode: 'auto'; ref: AssetRef | null; origin: IconOrigin | null; checkedAt: number | null }
  | { mode: 'custom'; ref: AssetRef; origin: IconOrigin; originalRef: AssetRef | null };

export interface Favorite {
  id: string;
  url: string;
  alias: string;
  description: string;
  tags: string[];
  groupId: string;
  position: number;
  icon: IconChoice;
  source: FavoriteSource;
  createdAt: number;
  updatedAt: number;
  visitCount: number;
  lastVisited: number | null;
}

export interface Group {
  id: string;
  name: string;
  /** Emoji als Gruppensymbol. */
  icon: string;
  color: string;
  position: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TrashEntry =
  | {
      id: string;
      kind: 'favorite';
      deletedAt: number;
      favorite: Favorite;
    }
  | {
      id: string;
      kind: 'group';
      deletedAt: number;
      group: Group;
      favorites: Favorite[];
    };

export type ThemeMode = 'dark' | 'light' | 'system';
export type UiScale = 'normal' | 'large' | 'xlarge';
export type BackgroundType = 'gradient' | 'color' | 'image';
export type PageTransition = 'slide' | 'fade' | 'none';
export type LabelPosition = 'below' | 'above';
export type LabelFont = 'barlow' | 'system' | 'custom';
export type FontWeight = '300' | '400' | '500' | '600' | '700';
export type ClickBehavior = 'newTab' | 'sameTab';
export type SortMode = 'manual' | 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc' | 'visits-desc';
export type StartupGroup = 'last' | 'default' | { groupId: string };

/** Bild für den Hintergrund: hochgeladen (Bildspeicher) oder per Adresse. */
export type ImageSource = { kind: 'asset'; ref: AssetRef } | { kind: 'url'; url: string } | null;

export interface Settings {
  theme: ThemeMode;
  accentColor: string;
  uiScale: UiScale;
  background: {
    type: BackgroundType;
    gradient: string;
    color: string;
    customGradient: { color1: string; color2: string };
    imageDark: ImageSource;
    imageLight: ImageSource;
    useDarkForLight: boolean;
    blur: number;
    brightness: number;
  };
  grid: {
    columns: number;
    rows: number;
    iconSize: number;
    gap: number;
    borderRadius: number;
    imageRadius: number;
    showShadow: boolean;
  };
  tiles: {
    opacity: number;
    bgDark: string;
    bgLight: string;
    glassBlur: number;
    glassBorder: number;
    glassShadow: number;
  };
  labels: {
    show: boolean;
    position: LabelPosition;
    fontSize: number;
    maxLength: number;
    font: LabelFont;
    customFont: string;
    fontWeight: FontWeight;
    colorDark: string;
    colorLight: string;
  };
  animations: { pageTransition: PageTransition };
  search: { instantSearch: boolean };
  navigation: {
    keyboard: boolean;
    mousewheel: boolean;
    swipe: boolean;
    showArrows: boolean;
    clickBehavior: ClickBehavior;
  };
  startup: { group: StartupGroup; lastGroupId: string | null };
  view: { sort: SortMode };
  icons: { autoDetect: boolean; useExternalServices: boolean; hintDismissed: boolean };
}

export interface Library {
  schemaVersion: typeof SCHEMA_VERSION;
  settings: Settings;
  groups: Group[];
  favorites: Favorite[];
  trash: TrashEntry[];
  updatedAt: number;
}
