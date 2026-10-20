/** Bausteine der Icon-Suche. Jede Quelle liefert Kandidaten; der Prüfer lädt und bewertet sie. */
import type { IconOrigin } from '../domain/types';

export interface IconCandidate {
  /** Adresse des Bildes (http, https, data oder chrome-extension). */
  url: string;
  origin: IconOrigin;
  /** Kurze Beschreibung für die Auswahl, z. B. "apple-touch-icon 180". */
  label: string;
  /** Größe laut Seite (sizes-Attribut), 0 wenn unbekannt; 'any' bei SVG. */
  declaredSize: number | 'any';
}

/** Ein geladenes und als Bild bestätigtes Icon. */
export interface ProbedIcon {
  candidate: IconCandidate;
  blob: Blob;
  width: number;
  height: number;
  vector: boolean;
}

export interface DiscoveryContext {
  pageUrl: string;
  /** Darf FavGrid fremde Seiten abrufen (Host-Berechtigung erteilt)? */
  canFetchSites: boolean;
  /** Dürfen externe Icon-Dienste gefragt werden? */
  allowServices: boolean;
  signal: AbortSignal;
}

/** Eine Quelle für Icon-Kandidaten. Neue Quellen werden nur in der Registry eingetragen. */
export interface IconSource {
  readonly id: string;
  /** Reihenfolge bei der automatischen Suche: kleiner zuerst. */
  readonly priority: number;
  available(ctx: DiscoveryContext): boolean;
  discover(ctx: DiscoveryContext): Promise<IconCandidate[]>;
}
