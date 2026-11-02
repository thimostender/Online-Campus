# Online-Campus

Konzept und klickbarer Prototyp für einen neuen Online-Campus mit integrierter Lernplattform.
Uni-Projekt, Studiengang Medien- und IT-Management.

**Prototyp ausprobieren:** https://thimostender.github.io/Online-Campus/. Alle nutzen eine gemeinsame Datenbank (Firebase). Mit einem Klick meldet ihr euch als eine der fiktiven Personen an. Details, Demo-Passwort und Vorführung: [prototyp/README.md](prototyp/README.md)

## Inhalt

| Datei / Ordner | Was |
|---|---|
| `prototyp/` | Klickbarer Prototyp (HTML, CSS, JavaScript, ohne Server). Anleitung und Vorführung: [prototyp/README.md](prototyp/README.md) |
| `Online-Campus_Sitemap-und-Datenmodell.pdf` | Handout: Sitemap, Navigationskonzept, Benachrichtigungsregeln, ER-Modell, Annahmen |
| `Online-Campus_Datenmodell_Beamer.pdf` | ER-Modell in drei Folien (16:9) für die Präsentation |
| `*.mmd` | Diagramme als Mermaid-Code, bearbeitbar in [mermaid.ai](https://mermaid.ai) |
| `Online-Campus_Vorfuehrung.pdf` | Drehbuch für die Präsentation (rund 12 Minuten, alle drei Rollen); vorher als Verwaltung „Vorführung vorbereiten“ drücken. Quelle: `vorfuehrung/drehbuch.html`, bauen mit `node vorfuehrung/bauen.mjs` |
| `bauen.mjs`, `bauen-beamer.mjs` | Erzeugen die beiden PDFs neu (`node bauen.mjs`), brauchen Google Chrome |
| `prototyp/campus3d.js`, `prototyp/campus3d-menschen.js`, `prototyp/campus3d/` | „Campus in 3D“: Puppenhaus-Modell (GLB + Lichtkarten), Menschen im Browser erzeugt, abends (oder per Knopf, `#/campus?zeit=abend`) mit Licht in den Fenstern, jeder Ort führt zur passenden Seite, Hinweise live. Lizenzen: [prototyp/campus3d/LIZENZEN.md](prototyp/campus3d/LIZENZEN.md) |
| `prototyp/lernen.js`, `prototyp/lernkarten.js` | Lernsystem: Lernkarten und Quiz aus den Foliensätzen (Medienkonzeption, mit Zustimmung des Dozenten), Freigabe durch Lehrende, Wiederholung nach Leitner. Die Original-PDFs liegen nicht im Repository |
| `3d/` | Bauen des 3D-Modells: `node 3d/gebaeude-json.mjs`, `node 3d/schilder.mjs`, dann Blender: `Blender -b -P 3d/bauen.py -- --backen prototyp/campus3d --samples 128`, danach `zsh 3d/nachbearbeiten.sh` (Texturen 1K, WebP, Draco; Probebild: `-- --probe 3d/proben/haus.png --ansicht haus`). Die CC0-Quellen (`3d/quellen/`) liegen nicht im Repository, siehe LIZENZEN.md |
| `firebase/` | Firebase-Projekt `online-campus-mit`: Sicherheitsregeln (`firestore.rules`), hochladen mit `firebase deploy --only firestore:rules` |
