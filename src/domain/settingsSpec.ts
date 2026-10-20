/**
 * Einzige Quelle für Vorgaben, Grenzen und Auswahlwerte der Einstellungen.
 * Normalisierung (Datenschicht) und Regler (Oberfläche) lesen beide von hier.
 */
import type {
  ClickBehavior,
  FontWeight,
  LabelFont,
  LabelPosition,
  PageTransition,
  Settings,
  SortMode,
  ThemeMode,
  UiScale,
  BackgroundType
} from './types';

export interface Range {
  min: number;
  max: number;
  step: number;
}

export const RANGES = {
  columns: { min: 2, max: 14, step: 1 },
  rows: { min: 1, max: 10, step: 1 },
  iconSize: { min: 40, max: 160, step: 1 },
  gap: { min: 0, max: 64, step: 1 },
  borderRadius: { min: 0, max: 50, step: 1 },
  imageRadius: { min: 0, max: 50, step: 1 },
  tileOpacity: { min: 0, max: 100, step: 1 },
  glassBlur: { min: 0, max: 30, step: 1 },
  glassBorder: { min: 0, max: 50, step: 1 },
  glassShadow: { min: 0, max: 50, step: 1 },
  labelFontSize: { min: 10, max: 24, step: 1 },
  labelMaxLength: { min: 6, max: 80, step: 1 },
  backgroundBlur: { min: 0, max: 20, step: 1 },
  backgroundBrightness: { min: 30, max: 150, step: 1 }
} as const satisfies Record<string, Range>;

export const THEME_MODES: readonly ThemeMode[] = ['dark', 'light', 'system'];
export const UI_SCALES: readonly UiScale[] = ['normal', 'large', 'xlarge'];
export const BACKGROUND_TYPES: readonly BackgroundType[] = ['gradient', 'color', 'image'];
export const PAGE_TRANSITIONS: readonly PageTransition[] = ['slide', 'fade', 'none'];
export const LABEL_POSITIONS: readonly LabelPosition[] = ['below', 'above'];
export const LABEL_FONTS: readonly LabelFont[] = ['barlow', 'system', 'custom'];
export const FONT_WEIGHTS: readonly FontWeight[] = ['300', '400', '500', '600', '700'];
export const CLICK_BEHAVIORS: readonly ClickBehavior[] = ['newTab', 'sameTab'];
export const SORT_MODES: readonly SortMode[] = ['manual', 'name-asc', 'name-desc', 'date-desc', 'date-asc', 'visits-desc'];

/** Schriftgröße der Bedienelemente je Stufe (Grundschrift in px). */
export const UI_SCALE_PX: Record<UiScale, number> = { normal: 17, large: 19, xlarge: 21 };

export const DEFAULT_ACCENT = '#7f5af0';

export const DEFAULT_GRADIENT = 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)';

/** Vorgefertigte Verläufe für den Hintergrund. */
export const GRADIENT_PRESETS: readonly string[] = [
  DEFAULT_GRADIENT,
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(135deg, #232526 0%, #414345 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #000428 0%, #004e92 100%)',
  'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
  'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #5f72bd 0%, #9b23ea 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
];

export function createDefaultSettings(): Settings {
  return {
    theme: 'dark',
    accentColor: DEFAULT_ACCENT,
    uiScale: 'normal',
    background: {
      type: 'gradient',
      gradient: DEFAULT_GRADIENT,
      color: '#1a1a2e',
      customGradient: { color1: '#1a1a2e', color2: '#16213e' },
      imageDark: null,
      imageLight: null,
      useDarkForLight: true,
      blur: 0,
      brightness: 100
    },
    grid: {
      columns: 6,
      rows: 4,
      iconSize: 72,
      gap: 24,
      borderRadius: 16,
      imageRadius: 0,
      showShadow: true
    },
    tiles: {
      opacity: 60,
      bgDark: '#1a1a2e',
      bgLight: '#ffffff',
      glassBlur: 10,
      glassBorder: 15,
      glassShadow: 20
    },
    labels: {
      show: true,
      position: 'below',
      fontSize: 15,
      maxLength: 20,
      font: 'barlow',
      customFont: '',
      fontWeight: '500',
      colorDark: '#ffffff',
      colorLight: '#1a1a2e'
    },
    animations: { pageTransition: 'slide' },
    search: { instantSearch: true },
    navigation: {
      keyboard: true,
      mousewheel: true,
      swipe: true,
      showArrows: true,
      clickBehavior: 'newTab'
    },
    startup: { group: 'last', lastGroupId: null },
    view: { sort: 'manual' },
    icons: { autoDetect: true, useExternalServices: true, hintDismissed: false }
  };
}
