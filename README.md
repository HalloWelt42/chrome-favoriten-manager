# FavGrid - Premium Speed Dial

Speed Dial für die Neuer-Tab-Seite in Chromium-Browsern: Favoriten als App-Icons in Gruppen, mit Glas-Optik, eigenem Hintergrund und Suche. Alles bleibt lokal.

## Was FavGrid kann

- **Gruppen** mit Emoji und Farbe, per Ziehen sortierbar; Favoriten lassen sich auf eine Gruppe ziehen
- **Nichts geht verloren**: Löschen legt in den Papierkorb (mit Rückgängig), dazu automatische Sicherungsstände (stündlich bei Änderungen und vor jedem riskanten Schritt), die sich jederzeit zurückholen lassen
- **Icon-Suche**, die auch Dienste im eigenen Netz erkennt: liest die Seite selbst (inklusive Port und Unterpfad), das Web-App-Manifest, feste Pfade wie `/favicon.ico` und den Favicon-Speicher des Browsers; externe Icon-Dienste nur für öffentliche Seiten. Im Bearbeiten-Fenster stehen alle gefundenen Icons zur Auswahl, dazu Hochladen und "Weiß entfernen"
- **Gruppen verwalten**: zwei Spalten zum Verschieben, Mehrfachauswahl, Doppelte finden und aufräumen
- **Suche** über Name, Adresse, Beschreibung, Schlagworte und Gruppe; zugleich Adresszeile und Websuche
- **Einstellungen** als feste Leiste mit Live-Vorschau: Raster, Kacheln, Beschriftung, Hintergrund (Verlauf, Farbe, Bild je Modus), Akzentfarbe, Schriftgröße der Bedienung
- **Sichern und Einspielen**: Vollsicherung inklusive Bilder, Lesezeichen-HTML (Ordner werden zu Gruppen), Adresslisten, Sicherungen älterer FavGrid-Fassungen; Ausgabe als HTML, CSV, Markdown, OPML und Adressliste
- Deutsch und Englisch, dunkel, hell oder nach System

## Entwicklung

Voraussetzung: Node.js 22.

```bash
npm install
```

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsbuild nach `dist-dev/`, baut bei jeder Änderung neu; offene FavGrid-Seiten laden sich selbst neu |
| `npm run build` | Produktionsbuild nach `dist/` |
| `npm run check` | Typprüfung |
| `npm test` | Einheitentests (inklusive Übernahme eines echten Altbestands, falls vorhanden) |
| `npm run e2e` | Browsertests mit geladener Erweiterung |
| `npm run pack` | Store-Paket aus `dist/` nach `store/` |
| `npm run altdaten` | Stand der installierten FavGrid-Fassung aus Brave lesen (nur lesend) |

Der Entwicklungsbuild heißt "FavGrid Dev", hat eine feste Erweiterungs-ID und übernimmt beim ersten Start den mit `npm run altdaten` gelesenen Stand. Er lässt sich neben der Store-Fassung als entpackte Erweiterung laden (`dist-dev/`).

### Aufbau

| Ordner | Inhalt |
|---|---|
| `src/domain` | Datenmodell und reine Fachlogik (Gruppen, Favoriten, Papierkorb, Sortierung, Suche) |
| `src/data` | Speicherzugriff mit browserweiter Sperre, Prüfung und Reparatur, Übernahme alter Daten, Bildspeicher, Sicherungsstände, Ein- und Ausgabe |
| `src/icons` | Icon-Quellen, Prüfen und Bewerten von Kandidaten, Bildbearbeitung |
| `src/app` | Anwendungsfälle für alle Oberflächen, Hintergrundsuche nach Icons |
| `src/newtab`, `src/popup`, `src/donate` | Oberflächen (Svelte) |
| `src/background` | Service Worker: Kontextmenü, Tastenkürzel, Wartung |
| `src/i18n` | Alle Texte; daraus entstehen beim Build die Sprachdateien |

Die Version steht nur in `version.json`. Der Git-Hook in `tools/git-hooks` zählt sie bei jedem Commit hoch (`git config core.hooksPath tools/git-hooks`).

## Berechtigungen

| Berechtigung | Zweck |
|---|---|
| `storage`, `unlimitedStorage` | Favoriten, Einstellungen und Bilder lokal speichern |
| `activeTab` | Aktuelle Seite über das Popup oder Tastenkürzel hinzufügen |
| `contextMenus` | Rechtsklick-Menü "Zu FavGrid hinzufügen" |
| `notifications` | Bestätigung beim Hinzufügen über das Kontextmenü |
| `alarms` | Tägliches Aufräumen alter Sicherungsstände |
| `search` | Websuche über die Suchmaschine des Browsers |
| `favicon` | Favicons aus dem Speicher des Browsers |
| Webseitenzugriff (optional) | Nur nach Zustimmung: Seiten abrufen, um ihre Icons und Titel zu finden |

## Datenschutz

Alle Daten bleiben im Browser. Kein Konto, kein Tracking, keine Werbung. Details in der [Datenschutzerklärung](PRIVACY.md).

## Unterstützen

- [Ko-fi](https://ko-fi.com/HalloWelt42)
- BTC: `bc1qnd599khdkv3v3npmj9ufxzf6h4fzanny2acwqr`
- DOGE: `DL7tuiYCqm3xQjMDXChdxeQxqUGMACn1ZV`
- ETH: `0x8A28fc47bFFFA03C8f685fa0836E2dBe1CA14F27`

## Lizenz

Nicht-kommerzielle Nutzung, siehe [LICENSE](LICENSE).

(c) 2025-2026 [HalloWelt42](https://github.com/HalloWelt42)
