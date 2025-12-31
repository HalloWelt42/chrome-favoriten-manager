# FavGrid - Feature-Spezifikation

## Status-Legende
- ✅ Implementiert
- 🔲 Geplant
- ❌ Entfernt

---

## Kernfunktionen

### Favoriten-Verwaltung
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Favoriten hinzufügen | ✅ | URL, Alias, Beschreibung, Tags |
| Favoriten bearbeiten | ✅ | Alle Felder editierbar |
| Favoriten löschen | ✅ | Mit Bestätigung |
| Favoriten duplizieren | ✅ | Kopie mit "(Kopie)" Suffix |
| Duplikat-Erkennung | ✅ | Warnung bei bereits vorhandener URL |
| Drag & Drop | ✅ | Umsortieren per Maus |
| Kontextmenü | ✅ | Rechtsklick für schnellen Zugriff |
| URL kopieren | ✅ | Im Kontextmenü |
| Favicon-Refresh | ✅ | Einzeln oder alle Icons aktualisieren |

### Gruppen
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Gruppen erstellen | ✅ | Name, Icon (Emoji), Farbe |
| Gruppen bearbeiten | ✅ | Name, Icon, Farbe ändern |
| Gruppen löschen | ✅ | Mit Bestätigung (nicht Standard-Gruppe) |
| Gruppen-Tabs | ✅ | Schneller Wechsel zwischen Gruppen |
| Gruppen-Farbe | ✅ | 16 Preset-Farben |
| Gruppen-Manager | ✅ | Zwei-Panel-Ansicht zum Verschieben |
| Drag & Drop Gruppen | ✅ | Reihenfolge ändern |

### Suche
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Instant-Suche | ✅ | Suche während der Eingabe |
| Suche in URL | ✅ | Auch URL wird durchsucht |
| Suche in Tags | ✅ | Tags werden durchsucht |
| Enter öffnet Treffer | ✅ | Ersten Treffer direkt öffnen |
| Web-Suche Fallback | ✅ | Google-Suche wenn keine Treffer |

### Sortierung
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Manuell | ✅ | Nach Position (Drag & Drop) |
| Name A-Z | ✅ | Alphabetisch aufsteigend |
| Name Z-A | ✅ | Alphabetisch absteigend |
| Datum (neueste) | ✅ | Neueste zuerst |
| Datum (älteste) | ✅ | Älteste zuerst |
| Meistbesucht | ✅ | Nach Besuchszähler |

### Tastenkürzel
| Taste | Status | Aktion |
|-------|--------|--------|
| 1-9 | ✅ | Favorit 1-9 öffnen |
| Ctrl+1-9 | ✅ | Im Hintergrund öffnen |
| Enter (Suche) | ✅ | Ersten Treffer öffnen |
| Escape | ✅ | Suche schließen |
| Pfeiltasten | ✅ | Seiten wechseln |

### Navigation
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Klick-Verhalten | ✅ | Standard: Neuer Tab oder Aktueller Tab |
| Mausrad-Navigation | ✅ | Seiten mit Mausrad wechseln |
| Swipe/Trackpad | ✅ | Seiten mit Gesten wechseln |
| Navigations-Pfeile | ✅ | Links/Rechts Pfeile anzeigen |

---

## Darstellung

### Themes
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dark Mode | ✅ | Dunkles Theme |
| Light Mode | ✅ | Helles Theme |
| System | ✅ | Folgt OS-Einstellung |
| Akzentfarbe | ✅ | 20 Material Design Farben wählbar |

### Hintergrund
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Gradient | ✅ | 16 harmonische Preset-Gradienten |
| Custom Gradient | ✅ | 2 Farben frei wählbar |
| Helligkeit | ✅ | 50-150% Anpassung |
| Farbe | ✅ | Beliebige Farbe |
| Bild (Dark Mode) | ✅ | Separates Bild für Dark |
| Bild (Light Mode) | ✅ | Separates Bild für Light |
| Bild-Upload | ✅ | Base64-kodiert |
| Bild-URL | ✅ | Externe URL |
| Blur | ✅ | 0-20px Weichzeichner |
| Overlay | ✅ | -100 bis +100 (dunkel/hell) |

### Grid
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Spalten | ✅ | 2-12 konfigurierbar |
| Zeilen | ✅ | 2-8 konfigurierbar |
| Icon-Größe | ✅ | 48-128px |
| Abstände | ✅ | 8-48px |
| Border-Radius | ✅ | 0-50px |
| Schatten | ✅ | Optional |

### Labels
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Anzeigen/Verstecken | ✅ | Toggle |
| Position | ✅ | Unter/Über Icon |
| Schriftgröße | ✅ | 10-18px |
| Schriftgewicht | ✅ | Light bis Bold |
| Schriftart | ✅ | 12 Fonts + Custom |
| Max-Länge | ✅ | Zeichenbegrenzung |

### Icons
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Favicon-Abruf | ✅ | Google Favicon API |
| Fallback-Icons | ✅ | iOS-Style generiert |
| Custom Icons | ✅ | Eigenes Bild hochladen |
| Icon-Refresh | ✅ | Einzeln oder alle |
| Transparenz | ✅ | 0-100% einstellbar |
| Hintergrundfarbe (Dark) | ✅ | Eigene Farbe für Dark Mode |
| Hintergrundfarbe (Light) | ✅ | Eigene Farbe für Light Mode |

### Einstellungen-UI
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Sticky Sidebar | ✅ | Navigation beim Scrollen sichtbar |
| Scrollbare Inhalte | ✅ | Bei vielen Optionen |
| Such-URL volle Breite | ✅ | Eingabe in eigener Zeile |
| Emoji-Picker | ✅ | Favoriten + 500+ Emojis scrollbar |

---

## Daten

### Backup
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Vollständiges Backup | ✅ | Alle Daten als JSON |
| Backup wiederherstellen | ✅ | Komplette Wiederherstellung |

### Export
| Format | Status | Beschreibung |
|--------|--------|--------------|
| JSON | ✅ | Strukturierte Daten |
| HTML | ✅ | Netscape Bookmark Format |
| CSV | ✅ | Tabellen-Format |
| OPML | ✅ | Feed-Reader Format |

### Import
| Format | Status | Beschreibung |
|--------|--------|--------------|
| JSON | ✅ | FavGrid-Format |
| HTML | ✅ | Browser-Lesezeichen |
| URL-Liste | ✅ | Textarea mit URLs |

