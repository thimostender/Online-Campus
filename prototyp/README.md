# Online-Campus – klickbarer Prototyp

Setzt Sitemap und ER-Modell aus `../Online-Campus_Sitemap-und-Datenmodell.pdf` um. Die Module folgen der
Modulstruktur Medien- und IT-Management (B.A.), Stand Januar 2023: 6 Semester, 180 ECTS, ab dem 2. Semester
Schwerpunkt Medien (M) oder IT (I), Praxistransfer-Projekte mit eigenem Thema in jedem Semester.
Die Beispielgruppe MIT-2025-A ist im 3. Semester: Lena, Mira und Sophie studieren Medien, Jonas und Can IT.
Reines HTML, CSS und JavaScript, ohne Build-Schritt.

## Starten

- **Online:** https://thimostender.github.io/Online-Campus/, mit gemeinsamer Datenbank (Firebase).
- **Lokal:** `node server.mjs`, dann http://localhost:4180. Nutzt dieselbe Datenbank.
- **Ohne Server:** http://localhost:4180/?lokal oder `index.html` doppelklicken und `?lokal` anhängen. Dann liegt alles nur im eigenen Browser.

### Gemeinsame Datenbank und Demo-Konten

Alle nutzen dieselbe Datenbank in Firebase (Projekt `online-campus-mit`, Region EU). Ändert Prof. Brandt einen Termin, sieht Lena das in ihrem Browser sofort, ohne neu zu laden. Wer die Benachrichtigungen des Browsers erlaubt, bekommt auch eine echte Push-Nachricht.

Oben in der dunklen Leiste meldet ihr euch mit einem Klick als eine der fiktiven Personen an. Über das Anmeldeformular geht es auch, mit der E-Mail der Person (zum Beispiel `lena.hoffmann@campus.example`) und dem Demo-Passwort **`Campus-d945cc52-Demo`**. Das Passwort ist absichtlich öffentlich: Es gibt nur ausgedachte Personen und Beispieldaten. Tragt deshalb **keine echten personenbezogenen Daten** ein.

**Daten zurücksetzen** geht nur als Petra Lange (Verwaltung) und löscht die Änderungen aller. Termine und Fristen werden dabei auf den heutigen Tag neu berechnet. Das empfiehlt sich vor jeder Präsentation.

## Vorführung in 7 Minuten

1. **Lena (Schwerpunkt Medien), Übersicht:** Änderungen im Stundenplan, nächster Termin, Fristen mit Countdown.
2. **Stundenplan:** Mittwochs hat Lena Medienkonzeption. Wechselt ihr über den Login zu Jonas (jonas.weber@campus.example, Schwerpunkt IT), steht zur selben Zeit Datenbanken im Plan.
3. **Leistungen:** ECTS aus echten Noten (65 von 180) und der Studienverlauf über 6 Semester, Module des eigenen Schwerpunkts mit „M“ bzw. „I“ markiert.
4. **Module › Medienkonvergenz und Social Media › Abgabe:** PDF hochladen. Ergebnis: Eingangsbestätigung mit SHA-256, die Datei lässt sich wieder herunterladen.
5. **Hilfe-Assistent** („Fragen“): „Wann ist meine nächste Abgabe?“, „Was ist ein indirekter Netzwerkeffekt?“, „Wie lange verjähren Mängelansprüche?“. Jede Antwort nennt ihre Quelle. Lena bekommt keine Antworten aus den Datenbank-Folien, Jonas schon: Der Assistent kennt nur die eigenen Kurse.
6. **Prof. Brandt (Lehrende) › Meine Module › Grundlagen Marketing:**
   - *Materialien:* ein eigenes PDF hochladen. Der Text wird sofort ausgelesen, zurück bei Lena beantwortet der Assistent Fragen dazu.
   - *Termine:* einen Termin anlegen. Die Raumkonflikt-Prüfung meldet sich, und die Gruppe wird benachrichtigt.
7. **Dr. Petersen (Login j.petersen@campus.example) › Korrektur › Grundlagen Recht:** bewerten, „Alle Dateien als ZIP“, Noten freigeben. Bei der Social-Media-Hausarbeit ist das Bewerten gesperrt, bis die Frist abgelaufen ist.
8. **Petra Lange (Verwaltung):** im Prüfungsamt Noten bestätigen, danach steht bei Lena „endgültig“. Unter Stundenplanung Termine für alle Kurse anlegen und ändern, unter Service-Inhalte Ansprechpersonen und FAQ pflegen.
9. **Online-Antrag:** Lena stellt unter Service › Formulare eine Fristverlängerung mit PDF-Attest. Petra Lange genehmigt sie unter Anträge. Danach hat nur Lena die neue Frist, und der Bescheid lässt sich als PDF laden.
10. **Online-Vorlesung:** Bei einem Online-Termin (zum Beispiel der Ringvorlesung) auf „Jetzt beitreten“ bzw. als Lehrende „Online-Raum starten“ klicken. Es öffnet sich eine Jitsi-Konferenz direkt im Campus.

**Zum Zusammenspiel zeigen:** Zwei Browserfenster nebeneinander öffnen, eines privat, links als Prof. Brandt und rechts als Lena. Ändert links einen Termin, dann erscheint die Mitteilung rechts sofort.

## Der Hilfe-Assistent

| Frage | Woher die Antwort kommt |
|---|---|
| Persönlich: Fristen, Termine, Klausuren, Noten, ECTS, Änderungen, Schwerpunkt, offene Korrekturen | direkt aus den Daten der angemeldeten Person |
| Fachlich: „Was ist das S-O-R-Modell?“, „Was ist die dritte Normalform?“ | Suche (BM25) über die Abschnitte der Lehrmaterialien, FAQ, Ansprechpersonen und Modulbeschreibungen |

- **Hochgeladene Lehrmaterialien** (PDF, TXT, MD) werden im Browser mit pdf.js ausgelesen und in Abschnitte mit Seitenzahl zerlegt (Tabelle `abschnitt`, im ER-Modell `MATERIAL_ABSCHNITT`). Danach sind sie sofort durchsuchbar. Den Stand sehen Lehrende in der Materialliste. Eingescannte PDFs ohne Text werden erkannt und gemeldet.
- **Rechte:** Der Assistent durchsucht nur Material der eigenen Kurse und erst ab dem Freigabedatum. Abgaben von Studierenden werden nie ausgelesen.
- **Ohne Sprachmodell** besteht die Antwort aus den passendsten Sätzen der besten Fundstelle, mit Quelle.
- **Mit Claude:** `npm install @anthropic-ai/sdk`, dann `ANTHROPIC_API_KEY=… node server-assistent-beispiel.mjs`. Der Prototyp erkennt den Server selbst, im Kopf des Assistenten steht dann „mit Claude“. Claude bekommt nur die gefundenen Abschnitte, formuliert daraus eine Antwort und nennt die Quellen. Der Schlüssel bleibt auf dem Server. Jede Frage kostet dabei echtes Geld (Modell `claude-opus-5-5`).
- **Später:** Das Feld `embedding` im ER-Modell ist für eine Suche nach Bedeutung vorgesehen, dann findet „Gewährleistung“ auch „Mängelrechte“.

## Aufbau

| Datei | Inhalt |
|---|---|
| `data.js` | Beispieldaten und Modulstruktur M-IT. Tabellen und Felder heißen wie im ER-Modell. |
| `material-texte.js` | Inhalte der Beispiel-Lehrmaterialien, daraus entstehen beim ersten Start echte PDFs |
| `app.js` | Speicher, Datenzugriff, Mitteilungen (`sende()`), Router, Layout |
| `dateien.js` | Dateispeicher (IndexedDB), PDF-Erzeugung, ZIP, SHA-256, Textauslese |
| `assistent.js` | Hilfe-Assistent: persönliche Antworten, Suche, Oberfläche, Anschluss an ein Sprachmodell |
| `ansichten-studierende.js` | Übersicht, Stundenplan, Module, Abgabe, Leistungen und Studienverlauf mit Schwerpunkt, Service, Profil, Suche, Login |
| `ansichten-personal.js` | Lehrende (Termine, Material, Prüfungen, Korrektur, ZIP) und Verwaltung (Planung, Prüfungsamt, Mitteilungen, Inhalte) |
| `backend.js` | Firebase: Anmeldung, Laden mit Echtzeit-Abos, Speichern der Änderungen, Dateien, Befüllen mit Beispieldaten |
| `antraege.js` | Online-Anträge: Formulare, Meine Anträge, Posteingang der Verwaltung, Wirkungen |
| `konferenz.js` | Videokonferenz mit Jitsi Meet, Technik-Test |
| `server.mjs` / `server-assistent-beispiel.mjs` | lokaler Server, einmal ohne, einmal mit Claude |
| `vendor/` | pdf.js 3.11 (Apache-Lizenz), lokal, damit die Vorführung ohne Internet läuft |

## Online-Anträge

| Antrag | Nachweis | Wirkung bei Genehmigung |
|---|---|---|
| Fristverlängerung | PDF freiwillig | neue Frist nur für diese Person, auch in Korrektur und ZIP berücksichtigt |
| Attest bei Prüfungsunfähigkeit | PDF Pflicht | Prüfung gilt als entschuldigt, kein Fehlversuch |
| Anerkennung von Leistungen | PDF Pflicht | Modul wird mit Note und ECTS angerechnet |
| Reservierung Schnittplatz | – | Reservierung im Stundenplan, vorher Prüfung auf Belegung |
| Adressänderung | – | neue Anschrift im Profil |

Eine Ablehnung braucht eine Begründung. Die Person bekommt eine Mitteilung, den Stand sieht sie unter Service › Meine Anträge, den Bescheid kann sie als PDF laden.

## Videokonferenz (Jitsi Meet)

Jeder Online-Termin hat einen eigenen, nicht erratbaren Raum auf `meet.jit.si`. Studierende kommen ab 15 Minuten vor Beginn hinein, Lehrende jederzeit. Vorher lassen sich Kamera und Mikrofon testen.

**Einschränkungen des kostenlosen Servers:** Eingebettete Konferenzen enden nach 5 Minuten, im eigenen Tab („In eigenem Tab öffnen“) gibt es keine Grenze. Die erste Person im Raum muss sich bei Jitsi anmelden (Google, GitHub oder Facebook) und wird Moderator. Für den echten Betrieb bräuchte es einen eigenen Jitsi-Server oder ein JaaS-Konto; im Code ist dann nur `JITSI_DOMAIN` in `konferenz.js` zu ändern.

## Was echt ist und was simuliert

**Echt:**
- Dateien speichern und herunterladen, Prüfung von Format und Größe, SHA-256.
- Fristlogik: Die letzte Version vor der Frist zählt, später Eingereichtes wird als verspätet markiert, bewertet wird ab Fristende.
- Freigabe und Bestätigung von Noten, ZIP mit Übersicht und Prüfsummen.
- Termine anlegen und ändern mit Raumkonflikt-Prüfung, Benachrichtigungs-Einstellungen je Anlass und Kanal.
- Kalenderdatei (.ics), Word-Vorlagen (.rtf), Bescheinigungen, Textauslese und Suche des Assistenten.

**Echt, mit Server:** Anmeldung (Firebase Authentication), gemeinsame Datenbank mit Echtzeit-Aktualisierung (Firestore), Zugriffsrechte als Sicherheitsregeln (`../firebase/firestore.rules`), Online-Anträge, Videokonferenz, Browser-Benachrichtigungen.

**Vereinfacht:**
- E-Mails werden nur protokolliert (Zustellprotokoll der Verwaltung), weil die Demo-Adressen erfunden sind.
- Dateien liegen in Stücken in Firestore statt in einem Dateispeicher. Das geht bis 15 MB je Datei, größere werden nur als Metadaten gespeichert. Ein echter Dateispeicher (Firebase Storage) bräuchte den Blaze-Tarif.
- Metadaten von Abgaben (Dateiname, Zeitpunkt) sind für alle Angemeldeten lesbar, die Inhalte nur für die Berechtigten.
- Die Übertragung in Teilen ist nur ein Fortschrittsbalken.

## Für die Umsetzung im nächsten Semester

Die Logik in `app.js` (Abschnitte „Datenzugriff“ und „Mitteilungen“) und `assistent.js` entspricht dem, was ein Server
tun muss. Beim Umbau ersetzt ihr `db` durch Datenbankabfragen, `inhaltSpeichern()` durch einen Objektspeicher und
`sende()` durch echten Versand. Die Ansichten bleiben weitgehend gleich.
