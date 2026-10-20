/**
 * Teiländerungen an den Einstellungen. Abschnitte (background, grid, ...) werden feldweise
 * zusammengeführt, Felder selbst immer als Ganzes ersetzt. So bleiben Werte wie ein
 * Bildverweis oder die Startgruppe atomar und vermischen sich nie mit dem alten Wert.
 */
import type { Settings } from './types';

export type SettingsPatch = {
  [K in keyof Settings]?: Settings[K] extends string ? Settings[K] : Partial<Settings[K]>;
};

export function applySettingsPatch(target: Partial<Settings> | Settings, patch: SettingsPatch): void {
  const out = target as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key];
    if (value && typeof value === 'object' && current && typeof current === 'object') {
      Object.assign(current, structuredClone(value));
    } else {
      out[key] = structuredClone(value);
    }
  }
}
