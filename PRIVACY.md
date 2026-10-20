# FavGrid - Datenschutzerklärung / Privacy Policy

*Letzte Aktualisierung / Last updated: 2026-10-20*

---

## Deutsch

### Überblick

FavGrid ist eine Browser-Erweiterung, die **ausschließlich lokal** auf deinem Gerät arbeitet. Es werden **keine Daten an externe Server übertragen**, keine Analysen durchgeführt und kein Tracking eingesetzt.

### Welche Daten werden gespeichert?

Alle Daten werden ausschließlich lokal im Browser gespeichert (Storage API und IndexedDB der Erweiterung):

- **Lesezeichen-Daten**: URLs, Titel, benutzerdefinierte Aliase und Beschreibungen
- **Bilder**: Icons und Hintergrundbilder
- **Papierkorb und Sicherungsstände**: gelöschte Einträge und automatische Kopien der Sammlung
- **Einstellungen**: Design, Layout, Farben, Schriftarten und sonstige Anpassungen
- **Gruppen-Organisation**: Namen, Icons, Farben und Sortierung deiner Gruppen

### Externe Netzwerkanfragen

Netzwerkanfragen gibt es nur, wenn du FavGrid den optionalen Zugriff auf Webseiten erlaubt hast:

- **Icon- und Titelabruf**: Direkt von den Seiten deiner Favoriten
- **Icon-Dienste** (abschaltbar): Google Favicons (`google.com/s2/favicons`) und DuckDuckGo Icons (`icons.duckduckgo.com`) - nur für öffentliche Adressen, nie für Adressen im eigenen Netz

Es werden **keine Daten an Server des Entwicklers** gesendet.

### Datenspeicherung & Löschung

- Daten verbleiben **ausschließlich auf deinem Gerät**
- Daten werden gelöscht bei: Deinstallation der Erweiterung, Löschen der Browserdaten oder manueller Zurücksetzung in den Einstellungen
- Export (JSON/HTML/CSV/OPML/Markdown/URL-Liste) erstellt lokale Dateien auf deinem Gerät

### Berechtigungen

| Berechtigung | Zweck |
|---|---|
| `storage` | Lokale Speicherung von Lesezeichen und Einstellungen |
| `activeTab` | Aktuelle Seite als Lesezeichen hinzufügen |
| `unlimitedStorage` | Bilder und Sicherungsstände ohne Speicherlimit |
| `contextMenus` | Rechtsklick-Menü "Zu FavGrid hinzufügen" |
| `notifications` | Bestätigungen beim Hinzufügen von Lesezeichen |
| `alarms` | Tägliches Aufräumen alter Sicherungsstände |
| `search` | Websuche über die Suchmaschine des Browsers |
| `favicon` | Favicons aus dem Speicher des Browsers |
| Webseitenzugriff (optional) | Nur nach Zustimmung: Icons und Titel direkt von Webseiten laden |

### Drittanbieter-Dienste

FavGrid verwendet **keine** Analyse-, Werbe- oder Tracking-Dienste. Die einzigen externen Anfragen dienen dem Abruf von Favicon-Bildern (siehe oben).

### Deine Rechte

- **Volle Kontrolle**: Export aller Daten jederzeit als JSON, HTML, CSV, OPML, Markdown oder URL-Liste
- **Löschung**: Alle Daten über die Einstellungen zurücksetzen oder Erweiterung deinstallieren
- **Transparenz**: Der vollständige Quellcode ist auf [GitHub](https://github.com/HalloWelt42/chrome-favoriten-manager) einsehbar

### Kontakt

Bei Fragen zum Datenschutz: [GitHub Issues](https://github.com/HalloWelt42/chrome-favoriten-manager/issues)

---

## English

### Overview

FavGrid is a browser extension that operates **entirely locally** on your device. **No data is transmitted to external servers**, no analytics are collected, and no tracking is used.

### What data is stored?

All data is stored exclusively locally in the browser (the extension's Storage API and IndexedDB):

- **Bookmark data**: URLs, titles, custom aliases, and descriptions
- **Images**: Icons and background images
- **Trash and snapshots**: deleted entries and automatic copies of the collection
- **Settings**: Theme, layout, colors, fonts, and other customizations
- **Group organization**: Names, icons, colors, and sort order of your groups

### External network requests

Network requests only happen after you allowed the optional access to web pages:

- **Icon and title fetching**: Directly from the pages of your favorites
- **Icon services** (can be switched off): Google Favicons (`google.com/s2/favicons`) and DuckDuckGo Icons (`icons.duckduckgo.com`) - only for public addresses, never for addresses in your own network

**No data is sent to the developer's servers.**

### Data retention & deletion

- Data remains **exclusively on your device**
- Data is deleted when: uninstalling the extension, clearing browser data, or manual reset in settings
- Export (JSON/HTML/CSV/OPML/Markdown/URL list) creates local files on your device

### Permissions

| Permission | Purpose |
|---|---|
| `storage` | Local storage of bookmarks and settings |
| `activeTab` | Add current page as bookmark |
| `unlimitedStorage` | Images and snapshots without storage limit |
| `contextMenus` | Right-click "Add to FavGrid" menu |
| `notifications` | Confirmation when adding bookmarks |
| `alarms` | Daily cleanup of old snapshots |
| `search` | Web search through the browser's search engine |
| `favicon` | Favicons from the browser's cache |
| Access to web pages (optional) | Only after consent: load icons and titles directly from web pages |

### Third-party services

FavGrid uses **no** analytics, advertising, or tracking services. The only external requests are for fetching favicon images (see above).

### Your rights

- **Full control**: Export all data anytime as JSON, HTML, CSV, OPML, Markdown, or URL list
- **Deletion**: Reset all data via settings or uninstall the extension
- **Transparency**: Full source code available on [GitHub](https://github.com/HalloWelt42/chrome-favoriten-manager)

### Contact

For privacy questions: [GitHub Issues](https://github.com/HalloWelt42/chrome-favoriten-manager/issues)
