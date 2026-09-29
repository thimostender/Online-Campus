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
| `bauen.mjs`, `bauen-beamer.mjs` | Erzeugen die beiden PDFs neu (`node bauen.mjs`), brauchen Google Chrome |
| `firebase/` | Firebase-Projekt `online-campus-mit`: Sicherheitsregeln (`firestore.rules`), hochladen mit `firebase deploy --only firestore:rules` |
