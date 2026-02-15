# FavGrid – Datenschutzerklärung / Privacy Policy

*Letzte Aktualisierung / Last updated: 2025-02-14*

---

## 🇩🇪 Deutsch

### Überblick

FavGrid ist eine Browser-Erweiterung, die **ausschließlich lokal** auf deinem Gerät arbeitet. Es werden **keine Daten an externe Server übertragen**, keine Analysen durchgeführt und kein Tracking eingesetzt.

### Welche Daten werden gespeichert?

Alle Daten werden ausschließlich in der lokalen Chrome Storage API deines Browsers gespeichert:

- **Lesezeichen-Daten**: URLs, Titel, benutzerdefinierte Aliase und Beschreibungen
- **Favicon-Bilder**: Zwischengespeichert von den jeweiligen Webseiten als Data-URLs
- **Einstellungen**: Theme, Layout, Farben, Schriftarten und sonstige Anpassungen
- **Gruppen-Organisation**: Namen, Icons, Farben und Sortierung deiner Gruppen

### Externe Netzwerkanfragen

FavGrid führt folgende Netzwerkanfragen durch – **ausschließlich auf Nutzeraktion**:

- **Favicon-Abruf**: Direkt von den jeweiligen Webseiten, um Icons für deine Lesezeichen zu laden
- **Favicon-Dienste**: Google Favicons (`google.com/s2/favicons`), DuckDuckGo Icons (`icons.duckduckgo.com`), Icon Horse (`icon.horse`) – als Fallback, wenn kein direktes Icon gefunden wird

Es werden **keine Daten an Server des Entwicklers** gesendet.

### Datenspeicherung & Löschung

- Daten verbleiben **ausschließlich auf deinem Gerät**
- Daten werden gelöscht bei: Deinstallation der Erweiterung, Löschen der Browserdaten oder manueller Zurücksetzung in den Einstellungen
- Export (JSON/HTML/CSV/OPML) erstellt lokale Dateien auf deinem Gerät

### Berechtigungen

| Berechtigung | Zweck |
|---|---|
| `storage` | Lokale Speicherung von Lesezeichen und Einstellungen |
| `activeTab` | Aktuelle Seite als Lesezeichen hinzufügen |
| `tabs` | Tab-Titel für neue Lesezeichen auslesen |
| `contextMenus` | Rechtsklick-Menü „Zu FavGrid hinzufügen" |
| `notifications` | Bestätigungen beim Hinzufügen von Lesezeichen |
| `host_permissions` | Favicon-Bilder direkt von Webseiten laden |

### Drittanbieter-Dienste

FavGrid verwendet **keine** Analyse-, Werbe- oder Tracking-Dienste. Die einzigen externen Anfragen dienen dem Abruf von Favicon-Bildern (siehe oben).

### Deine Rechte

- **Volle Kontrolle**: Export aller Daten jederzeit als JSON, HTML, CSV oder OPML
- **Löschung**: Alle Daten über die Einstellungen zurücksetzen oder Erweiterung deinstallieren
- **Transparenz**: Der vollständige Quellcode ist auf [GitHub](https://github.com/HalloWelt42/chrome-favoriten-manager) einsehbar

### Kontakt

Bei Fragen zum Datenschutz: [GitHub Issues](https://github.com/HalloWelt42/chrome-favoriten-manager/issues)

---

## 🇬🇧 English

### Overview

FavGrid is a browser extension that operates **entirely locally** on your device. **No data is transmitted to external servers**, no analytics are collected, and no tracking is used.

### What data is stored?

All data is stored exclusively in your browser's local Chrome Storage API:

- **Bookmark data**: URLs, titles, custom aliases, and descriptions
- **Favicon images**: Cached from the respective websites as data URLs
- **Settings**: Theme, layout, colors, fonts, and other customizations
- **Group organization**: Names, icons, colors, and sort order of your groups

### External network requests

FavGrid makes the following network requests – **only on user action**:

- **Favicon fetching**: Directly from the respective websites to load icons for your bookmarks
- **Favicon services**: Google Favicons (`google.com/s2/favicons`), DuckDuckGo Icons (`icons.duckduckgo.com`), Icon Horse (`icon.horse`) – as fallback when no direct icon is found

**No data is sent to the developer's servers.**

### Data retention & deletion

- Data remains **exclusively on your device**
- Data is deleted when: uninstalling the extension, clearing browser data, or manual reset in settings
- Export (JSON/HTML/CSV/OPML) creates local files on your device

### Permissions

| Permission | Purpose |
|---|---|
| `storage` | Local storage of bookmarks and settings |
| `activeTab` | Add current page as bookmark |
| `tabs` | Read tab title for new bookmarks |
| `contextMenus` | Right-click "Add to FavGrid" menu |
| `notifications` | Confirmation when adding bookmarks |
| `host_permissions` | Load favicon images directly from websites |

### Third-party services

FavGrid uses **no** analytics, advertising, or tracking services. The only external requests are for fetching favicon images (see above).

### Your rights

- **Full control**: Export all data anytime as JSON, HTML, CSV, or OPML
- **Deletion**: Reset all data via settings or uninstall the extension
- **Transparency**: Full source code available on [GitHub](https://github.com/HalloWelt42/chrome-favoriten-manager)

### Contact

For privacy questions: [GitHub Issues](https://github.com/HalloWelt42/chrome-favoriten-manager/issues)
