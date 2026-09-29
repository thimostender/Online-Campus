# Online-Campus – klickbarer Prototyp

Setzt Sitemap und ER-Modell aus `../Online-Campus_Sitemap-und-Datenmodell.pdf` um. Die Module folgen der
Modulstruktur BWL (B.A.) der Berufsakademie Lüneburg (Stand 11.07.2023): 6 Semester, 180 ECTS,
Wahlfächer WF 1 Marketing und WF 2 Controlling, Praxistransfer-Projekte in jedem Semester.
Reines HTML, CSS und JavaScript, ohne Build-Schritt.

## Starten

- **Mit lokalem Server (empfohlen):** `node server.mjs`, dann http://localhost:4180 öffnen.
- **Ohne Server:** `index.html` doppelklicken. Alles funktioniert. Nur das Auslesen hochgeladener PDFs für den Assistenten kann je nach Browser eingeschränkt sein.
- **Mit Claude als Assistent:** siehe unten.
- **Online:** Den Ordner auf GitHub Pages oder Netlify stellen.

Oben in der dunklen Leiste wechselt ihr zwischen drei Sichten (Studierende, Lehrende, Verwaltung).
„Daten zurücksetzen“ lädt die Beispieldaten neu, das empfiehlt sich vor jeder Vorführung. Eigene Änderungen
bleiben sonst erhalten, auch über Nacht: Alle Termine und Fristen wandern jeden Tag mit, damit sie zum Datum passen.

## Vorführung in 7 Minuten

1. **Lena (Studierende), Übersicht:** Änderungen im Stundenplan, nächster Termin, Fristen mit Countdown.
2. **Leistungen:** ECTS aus echten Noten (65 von 180), Studienverlauf über 6 Semester, Wahlfach wählen.
3. **Module › Marketing-Grundlagen › Abgabe:** PDF hochladen. Ergebnis: Eingangsbestätigung mit SHA-256, die Datei lässt sich wieder herunterladen.
4. **Hilfe-Assistent** (Knopf „Fragen“): „Wann ist meine nächste Abgabe?“, „Welche Kündigungsfrist gilt nach 5 Jahren?“. Jede Antwort nennt ihre Quelle.
5. **Prof. Brandt (Lehrende) › Meine Module › Marketing-Grundlagen:**
   - *Materialien:* ein eigenes PDF hochladen. Der Text wird sofort ausgelesen, zurück bei Lena beantwortet der Assistent Fragen dazu.
   - *Termine:* einen Termin anlegen. Die Raumkonflikt-Prüfung meldet sich, und die Gruppe wird benachrichtigt.
6. **Dr. Petersen (über den Login: j.petersen@campus.example) › Korrektur › Arbeitsrecht:** bewerten, „Alle Dateien als ZIP“, Noten freigeben. Bei der Marketing-Hausarbeit ist das Bewerten gesperrt, bis die Frist abgelaufen ist.
7. **Petra Lange (Verwaltung):** im Prüfungsamt Noten bestätigen, danach steht bei Lena „endgültig“. Unter Stundenplanung Termine für alle Kurse anlegen und ändern, unter Service-Inhalte Ansprechpersonen und FAQ pflegen.

## Der Hilfe-Assistent

| Frage | Woher die Antwort kommt |
|---|---|
| Persönlich: Fristen, Termine, Klausuren, Noten, ECTS, Änderungen, Wahlfach, offene Korrekturen | direkt aus den Daten der angemeldeten Person |
| Fachlich: „Was ist das S-O-R-Modell?“, „Wie berechne ich die Break-even-Menge?“ | Suche (BM25) über die Abschnitte der Lehrmaterialien, FAQ, Ansprechpersonen und Modulbeschreibungen |

- **Hochgeladene Lehrmaterialien** (PDF, TXT, MD) werden im Browser mit pdf.js ausgelesen und in Abschnitte mit Seitenzahl zerlegt (Tabelle `abschnitt`, im ER-Modell `MATERIAL_ABSCHNITT`). Danach sind sie sofort durchsuchbar. Den Stand sehen Lehrende in der Materialliste. Eingescannte PDFs ohne Text werden erkannt und gemeldet.
- **Rechte:** Der Assistent durchsucht nur Material der eigenen Kurse und erst ab dem Freigabedatum. Abgaben von Studierenden werden nie ausgelesen.
- **Ohne Sprachmodell** besteht die Antwort aus den passendsten Sätzen der besten Fundstelle, mit Quelle.
- **Mit Claude:** `npm install @anthropic-ai/sdk`, dann `ANTHROPIC_API_KEY=… node server-assistent-beispiel.mjs`. Der Prototyp erkennt den Server selbst, im Kopf des Assistenten steht dann „mit Claude“. Claude bekommt nur die gefundenen Abschnitte, formuliert daraus eine Antwort und nennt die Quellen. Der Schlüssel bleibt auf dem Server. Jede Frage kostet dabei echtes Geld (Modell `claude-opus-5-5`).
- **Später:** Das Feld `embedding` im ER-Modell ist für eine Suche nach Bedeutung vorgesehen, dann findet „Kündigungsschutz“ auch „Schutz vor Entlassung“.

## Aufbau

| Datei | Inhalt |
|---|---|
| `data.js` | Beispieldaten und Modulstruktur. Tabellen und Felder heißen wie im ER-Modell. |
| `material-texte.js` | Inhalte der Beispiel-Lehrmaterialien, daraus entstehen beim ersten Start echte PDFs |
| `app.js` | Speicher, Datenzugriff, Mitteilungen (`sende()`), Router, Layout |
| `dateien.js` | Dateispeicher (IndexedDB), PDF-Erzeugung, ZIP, SHA-256, Textauslese |
| `assistent.js` | Hilfe-Assistent: persönliche Antworten, Suche, Oberfläche, Anschluss an ein Sprachmodell |
| `ansichten-studierende.js` | Übersicht, Stundenplan, Module, Abgabe, Leistungen und Studienverlauf, Service, Profil, Suche, Login |
| `ansichten-personal.js` | Lehrende (Termine, Material, Prüfungen, Korrektur, ZIP) und Verwaltung (Planung, Prüfungsamt, Mitteilungen, Inhalte) |
| `server.mjs` / `server-assistent-beispiel.mjs` | lokaler Server, einmal ohne, einmal mit Claude |
| `vendor/` | pdf.js 3.11 (Apache-Lizenz), lokal, damit die Vorführung ohne Internet läuft |

## Was echt ist und was simuliert

**Echt:**
- Dateien speichern und herunterladen, Prüfung von Format und Größe, SHA-256.
- Fristlogik: Die letzte Version vor der Frist zählt, später Eingereichtes wird als verspätet markiert, bewertet wird ab Fristende.
- Freigabe und Bestätigung von Noten, ZIP mit Übersicht und Prüfsummen.
- Termine anlegen und ändern mit Raumkonflikt-Prüfung, Benachrichtigungs-Einstellungen je Anlass und Kanal.
- Kalenderdatei (.ics), Word-Vorlagen (.rtf), Bescheinigungen, Textauslese und Suche des Assistenten.

**Simuliert:**
- Anmeldung: Jedes Passwort geht.
- E-Mail und Push werden nur gezählt und protokolliert.
- Die Übertragung in Teilen ist nur ein Fortschrittsbalken.
- Alles liegt im Browser (localStorage und IndexedDB). Dateien über 300 MB werden nur als Metadaten gespeichert.

## Für die Umsetzung im nächsten Semester

Die Logik in `app.js` (Abschnitte „Datenzugriff“ und „Mitteilungen“) und `assistent.js` entspricht dem, was ein Server
tun muss. Beim Umbau ersetzt ihr `db` durch Datenbankabfragen, `inhaltSpeichern()` durch einen Objektspeicher und
`sende()` durch echten Versand. Die Ansichten bleiben weitgehend gleich.
