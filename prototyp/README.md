# Online-Campus – klickbarer Prototyp

Setzt Sitemap und ER-Modell aus `../Online-Campus_Sitemap-und-Datenmodell.pdf` um.
Reines HTML, CSS und JavaScript, ohne Server, ohne Datenbank, ohne Installation.

## Starten

- **Einfach:** `index.html` doppelklicken (Chrome, Edge, Safari oder Firefox).
- **Mit lokalem Server:** `node server.mjs`, dann http://localhost:4180 öffnen.
- **Online stellen:** Den Ordner auf GitHub Pages oder Netlify hochladen. Es gibt keinen Build-Schritt.

Oben in der dunklen Leiste wechselt ihr zwischen den drei Sichten (Studierende, Lehrende, Verwaltung).
„Daten zurücksetzen“ lädt die Beispieldaten neu. Das ist vor jeder Vorführung sinnvoll.

## Vorführung in 5 Minuten

1. **Lena (Studierende):** Die Übersicht zeigt Änderungen im Stundenplan, den nächsten Termin und Fristen mit Countdown.
2. **Module › Marketing › Abgabe:** Eine PDF hochladen. Das erzeugt eine Eingangsbestätigung mit Zeitstempel und SHA-256-Prüfsumme, die Glocke zählt hoch.
3. **Sicht wechseln zu Prof. Brandt:** Unter Meine Module › Marketing einen Termin ändern. Die Meldung zeigt, wie viele Personen per Campus, Push und E-Mail benachrichtigt wurden.
4. **Korrektur › Hausarbeit Marketing:** Lenas Upload bewerten. Die Note bleibt unsichtbar, bis „Noten freigeben“ geklickt wird.
5. **Zurück zu Lena:** Die Glocke zeigt die Raumänderung und die Note, im Modul unter Ergebnis steht sie als „vorläufig“.
6. **Petra Lange (Verwaltung):** Im Prüfungsamt bestätigen. Bei Lena steht jetzt „endgültig“, und die Note erscheint auf der Notenbescheinigung.

## Aufbau

| Datei | Inhalt |
|---|---|
| `data.js` | Beispieldaten. Tabellen und Felder heißen wie im ER-Modell (`abgabe`, `abgabeversion`, `note.freigegeben_am` …). |
| `app.js` | Speicher, Datenzugriff, Mitteilungs-Logik (`sende()`), Router, Layout |
| `ansichten-studierende.js` | Übersicht, Stundenplan, Module, Abgabe, Leistungen, Service, Profil, Suche, Login |
| `ansichten-personal.js` | Bereich Lehrende (Termine, Material, Prüfungen, Korrektur) und Verwaltung |
| `styles.css` | Farben als Variablen, Hell- und Dunkelmodus, mobil mit Leiste unten |

## Was echt ist und was simuliert

**Echt:** Datei prüfen (Format, Größe), SHA-256 der hochgeladenen Datei, Fristlogik (letzte Version vor der Frist zählt,
verspätet wird markiert), Freigabe und Bestätigung von Noten, Benachrichtigungs-Einstellungen je Anlass und Kanal,
Kalenderdatei (.ics), Word-Vorlagen (.rtf), Bescheinigung zum Drucken, Raumkonflikt-Prüfung.

**Simuliert:** Anmeldung (jedes Passwort geht), E-Mail und Push (nur gezählt und protokolliert), Übertragung in Teilen
(Fortschrittsbalken), Dateiinhalte (nur Metadaten werden gespeichert), Datenhaltung (im Browser, `localStorage`).
Die Beispieldaten werden jeden Tag neu erzeugt, damit Fristen und Termine zum aktuellen Datum passen.

## Für die Umsetzung im nächsten Semester

Die Logik in `app.js` (Abschnitt „Datenzugriff“ und „Mitteilungen“) entspricht dem, was ein Server tun muss.
Beim Umbau ersetzt ihr `db` durch Datenbankabfragen und `sende()` durch einen echten Versand. Die Ansichten bleiben weitgehend gleich.
