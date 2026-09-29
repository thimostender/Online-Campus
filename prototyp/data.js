// Beispieldaten. Aufbau und Namen folgen dem ER-Modell (er-modell.mmd).
// Termine und Fristen werden relativ zum heutigen Tag erzeugt, damit die
// Vorführung an jedem Tag sinnvoll aussieht.

const ANLAESSE = [
  { id: 'aenderung', name: 'Termin verlegt, Raum geändert, Ausfall', std: { campus: true, push: true, email: true } },
  { id: 'note', name: 'Note freigegeben', std: { campus: true, push: true, email: true } },
  { id: 'eingang', name: 'Abgabe eingegangen', std: { campus: true, push: false, email: true }, pflicht: ['email'] },
  { id: 'frist', name: 'Frist bald fällig', std: { campus: true, push: true, email: false } },
  { id: 'material', name: 'Neues Material', std: { campus: true, push: false, email: false } },
  { id: 'neuigkeit', name: 'Neuigkeiten von Lehrenden und Verwaltung', std: { campus: true, push: false, email: true } },
];
const KANAELE = [
  { id: 'campus', name: 'Im Campus' },
  { id: 'push', name: 'Push' },
  { id: 'email', name: 'E-Mail' },
];

function erzeugeDaten(heute = new Date()) {
  const tag = (versatz, h = 0, m = 0) => {
    const d = new Date(heute);
    d.setHours(h, m, 0, 0);
    d.setDate(d.getDate() + versatz);
    return d.toISOString();
  };
  // Montag der aktuellen Woche
  const wt = (heute.getDay() + 6) % 7;
  const mo = (woche, plus, h, m) => tag(-wt + woche * 7 + plus, h, m);

  const user = [
    { id: 's1', vorname: 'Lena', nachname: 'Hoffmann', email: 'lena.hoffmann@campus.example', rolle: 'studierend', matrikelnummer: '2025-0142', aktiv: true },
    { id: 's2', vorname: 'Jonas', nachname: 'Weber', email: 'jonas.weber@campus.example', rolle: 'studierend', matrikelnummer: '2025-0157', aktiv: true },
    { id: 's3', vorname: 'Mira', nachname: 'Schulz', email: 'mira.schulz@campus.example', rolle: 'studierend', matrikelnummer: '2025-0163', aktiv: true },
    { id: 's4', vorname: 'Can', nachname: 'Yilmaz', email: 'can.yilmaz@campus.example', rolle: 'studierend', matrikelnummer: '2025-0171', aktiv: true },
    { id: 's5', vorname: 'Sophie', nachname: 'Krüger', email: 'sophie.krueger@campus.example', rolle: 'studierend', matrikelnummer: '2025-0188', aktiv: true },
    { id: 'l1', vorname: 'Katrin', nachname: 'Brandt', titel: 'Prof. Dr.', email: 'k.brandt@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l2', vorname: 'Martin', nachname: 'Keller', titel: 'Dr.', email: 'm.keller@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l3', vorname: 'Sabine', nachname: 'Ohlsen', titel: '', email: 's.ohlsen@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'v1', vorname: 'Petra', nachname: 'Lange', email: 'p.lange@campus.example', rolle: 'verwaltung', aktiv: true },
  ];

  const studiengang = [{ id: 1, name: 'Betriebswirtschaft', abschluss: 'Bachelor', ects_gesamt: 180 }];
  const studiengruppe = [{ id: 1, studiengang_id: 1, name: 'BWL-2025-A', standort: 'Campus Mitte' }];
  const gruppenmitglied = ['s1', 's2', 's3', 's4', 's5'].map(u => ({ user_id: u, gruppe_id: 1, von: '2025-09-01', bis: null }));
  const semester = [{ id: 1, bezeichnung: 'WiSe 2026/27', beginn: '2026-09-01', ende: '2027-02-28' }];
  const vorlesungsfreie_zeit = [
    { id: 1, semester_id: 1, bezeichnung: 'Weihnachtspause', beginn: '2026-12-21', ende: '2027-01-03' },
    { id: 2, semester_id: 1, bezeichnung: 'Prüfungsfreie Zeit', beginn: '2027-02-15', ende: '2027-02-28' },
  ];

  const modul = [
    { id: 1, kuerzel: 'MKT', titel: 'Marketing', ects: 5, beschreibung: 'Marktanalyse, Zielgruppen, Marketing-Mix und digitale Kanäle. Anwendung an einem Fallbeispiel aus dem eigenen Betrieb.' },
    { id: 2, kuerzel: 'KLR', titel: 'Kosten- und Leistungsrechnung', ects: 5, beschreibung: 'Kostenarten-, Kostenstellen- und Kostenträgerrechnung, Deckungsbeitragsrechnung und Break-even-Analyse.' },
    { id: 3, kuerzel: 'WIN', titel: 'Wirtschaftsinformatik', ects: 6, beschreibung: 'Geschäftsprozesse modellieren, Datenbanken entwerfen, ein kleines Informationssystem im Team konzipieren.' },
    { id: 4, kuerzel: 'PER', titel: 'Personalmanagement', ects: 5, beschreibung: 'Personalplanung, -gewinnung und -entwicklung, Arbeitsrecht im Überblick.' },
    { id: 5, kuerzel: 'WAR', titel: 'Wissenschaftliches Arbeiten', ects: 3, beschreibung: 'Recherche, Zitieren, Aufbau einer Hausarbeit, Umgang mit Quellen.' },
  ];
  const kurs = modul.map(m => ({ id: m.id, modul_id: m.id, gruppe_id: 1, semester_id: 1 }));
  const lehrauftrag = [
    { kurs_id: 1, lehrender_id: 'l1', rolle: 'verantwortlich' },
    { kurs_id: 2, lehrender_id: 'l2', rolle: 'verantwortlich' },
    { kurs_id: 3, lehrender_id: 'l3', rolle: 'verantwortlich' },
    { kurs_id: 4, lehrender_id: 'l1', rolle: 'verantwortlich' },
    { kurs_id: 5, lehrender_id: 'l2', rolle: 'verantwortlich' },
  ];
  const raum = [
    { id: 1, standort: 'Campus Mitte', bezeichnung: 'Raum 2.04', plaetze: 30, x: 20, y: 20, w: 120, h: 80 },
    { id: 2, standort: 'Campus Mitte', bezeichnung: 'Raum 3.11', plaetze: 28, x: 150, y: 20, w: 120, h: 80 },
    { id: 3, standort: 'Campus Mitte', bezeichnung: 'Hörsaal A', plaetze: 120, x: 20, y: 110, w: 250, h: 90 },
    { id: 4, standort: 'Campus Mitte', bezeichnung: 'PC-Labor 1.08', plaetze: 24, x: 280, y: 20, w: 120, h: 180 },
  ];

  // Wiederkehrender Plan: Mo MKT, Mi WIN/PER im Wechsel, Sa KLR (jede zweite Woche WAR)
  const termin = [];
  let tid = 1;
  for (let w = -2; w <= 6; w++) {
    termin.push({ id: tid++, kurs_id: 1, raum_id: 1, vertretung_id: null, beginn: mo(w, 0, 18, 0), ende: mo(w, 0, 21, 15), art: 'Vorlesung', online_link: null, status: 'geplant' });
    termin.push({ id: tid++, kurs_id: w % 2 ? 4 : 3, raum_id: w % 2 ? 2 : 4, vertretung_id: null, beginn: mo(w, 2, 18, 0), ende: mo(w, 2, 21, 15), art: 'Vorlesung', online_link: null, status: 'geplant' });
    if (w % 2 === 0) termin.push({ id: tid++, kurs_id: 2, raum_id: 3, vertretung_id: null, beginn: mo(w, 5, 9, 0), ende: mo(w, 5, 14, 30), art: 'Vorlesung', online_link: null, status: 'geplant' });
    else termin.push({ id: tid++, kurs_id: 5, raum_id: null, vertretung_id: null, beginn: mo(w, 5, 9, 0), ende: mo(w, 5, 12, 15), art: 'Online', online_link: 'https://meet.example/war', status: 'geplant' });
  }
  // Änderungen, die in der Vorführung auffallen sollen
  const mittwoch = termin.find(t => t.beginn === mo(0, 2, 18, 0));
  mittwoch.status = 'verlegt'; mittwoch.raum_id = 2; mittwoch.hinweis = 'Raum geändert: statt PC-Labor 1.08 jetzt Raum 3.11';
  const naechsterMo = termin.find(t => t.beginn === mo(1, 0, 18, 0));
  naechsterMo.status = 'ausgefallen'; naechsterMo.hinweis = 'Fällt krankheitsbedingt aus, Nachholtermin folgt';
  const vertretung = termin.find(t => t.beginn === mo(2, 0, 18, 0));
  vertretung.vertretung_id = 'l2'; vertretung.hinweis = 'Vertretung durch Dr. Martin Keller';
  // Klausur KLR
  termin.push({ id: tid++, kurs_id: 2, raum_id: 3, vertretung_id: null, beginn: tag(20, 9, 0), ende: tag(20, 11, 0), art: 'Klausur', online_link: null, status: 'geplant' });

  const datei = [];
  const neueDatei = (name, mime, groesse, von, am) => {
    const d = { id: 'd' + (datei.length + 1), dateiname: name, mime_typ: mime, groesse_bytes: groesse, sha256: pseudoHash(name + am), hochgeladen_von: von, hochgeladen_am: am };
    datei.push(d); return d.id;
  };
  const material = [
    { id: 1, kurs_id: 1, datei_id: neueDatei('MKT_01_Einfuehrung.pdf', 'application/pdf', 2_400_000, 'l1', tag(-20)), titel: 'Folien 1: Einführung und Marktanalyse', sichtbar_ab: tag(-20) },
    { id: 2, kurs_id: 1, datei_id: neueDatei('MKT_02_Zielgruppen.pdf', 'application/pdf', 3_100_000, 'l1', tag(-6)), titel: 'Folien 2: Zielgruppen und Personas', sichtbar_ab: tag(-6) },
    { id: 3, kurs_id: 1, datei_id: neueDatei('MKT_Aufgabenstellung_Hausarbeit.pdf', 'application/pdf', 410_000, 'l1', tag(-14)), titel: 'Aufgabenstellung Hausarbeit', sichtbar_ab: tag(-14) },
    { id: 4, kurs_id: 2, datei_id: neueDatei('KLR_Skript.pdf', 'application/pdf', 5_800_000, 'l2', tag(-25)), titel: 'Skript Kosten- und Leistungsrechnung', sichtbar_ab: tag(-25) },
    { id: 5, kurs_id: 2, datei_id: neueDatei('KLR_Uebungsklausur.pdf', 'application/pdf', 900_000, 'l2', tag(-1)), titel: 'Übungsklausur mit Lösungen', sichtbar_ab: tag(-1) },
    { id: 6, kurs_id: 3, datei_id: neueDatei('WIN_Projektauftrag.pdf', 'application/pdf', 650_000, 'l3', tag(-21)), titel: 'Projektauftrag Gruppenprojekt', sichtbar_ab: tag(-21) },
    { id: 7, kurs_id: 3, datei_id: neueDatei('WIN_ER-Modellierung.pdf', 'application/pdf', 1_900_000, 'l3', tag(-9)), titel: 'Folien: ER-Modellierung', sichtbar_ab: tag(-9) },
    { id: 8, kurs_id: 4, datei_id: neueDatei('PER_Folien_komplett.pdf', 'application/pdf', 7_200_000, 'l1', tag(-40)), titel: 'Folien komplett', sichtbar_ab: tag(-40) },
    { id: 9, kurs_id: 5, datei_id: neueDatei('WAR_Zitierleitfaden.pdf', 'application/pdf', 520_000, 'l2', tag(-30)), titel: 'Leitfaden Zitieren (APA 7)', sichtbar_ab: tag(-30) },
  ];

  const pruefung = [
    { id: 1, kurs_id: 1, art: 'Hausarbeit', titel: 'Hausarbeit: Marketingkonzept für den eigenen Betrieb', frist: tag(9, 23, 59), mit_upload: true, gruppenarbeit: false, max_mb: 100, formate: 'pdf', gewicht: 1 },
    { id: 2, kurs_id: 2, art: 'Klausur', titel: 'Klausur KLR (120 Minuten)', frist: tag(20, 9, 0), mit_upload: false, gruppenarbeit: false, max_mb: 0, formate: '', gewicht: 1 },
    { id: 3, kurs_id: 3, art: 'Projekt', titel: 'Gruppenprojekt: Konzept eines Informationssystems', frist: tag(3, 23, 59), mit_upload: true, gruppenarbeit: true, max_mb: 2000, formate: 'pdf, zip, mp4', gewicht: 1 },
    { id: 4, kurs_id: 4, art: 'Referat', titel: 'Referat mit Handout', frist: tag(-35, 18, 0), mit_upload: true, gruppenarbeit: false, max_mb: 100, formate: 'pdf, pptx', gewicht: 1 },
    { id: 5, kurs_id: 5, art: 'Hausarbeit', titel: 'Kurz-Hausarbeit: Literaturrecherche', frist: tag(-12, 23, 59), mit_upload: true, gruppenarbeit: false, max_mb: 100, formate: 'pdf, docx', gewicht: 1 },
  ];

  const abgabe = [], abgabe_mitglied = [], abgabeversion = [], note = [];
  const neueAbgabe = (pid, mitglieder, versionen, verspaetet = false) => {
    const id = abgabe.length + 1;
    const letzte = versionen[versionen.length - 1];
    abgabe.push({ id, pruefung_id: pid, status: 'eingereicht', eingereicht_am: letzte.am, verspaetet, erklaerung_am: letzte.am });
    mitglieder.forEach(u => abgabe_mitglied.push({ abgabe_id: id, student_id: u }));
    versionen.forEach((v, i) => abgabeversion.push({ id: abgabeversion.length + 1, abgabe_id: id, nummer: i + 1, datei_id: neueDatei(v.name, v.mime || 'application/pdf', v.groesse, v.von, v.am), hochgeladen_am: v.am }));
    return id;
  };
  // PER: alle abgegeben, bewertet, freigegeben; für Lena auch bestätigt
  const perNoten = { s1: 1.7, s2: 2.0, s3: 1.3, s4: 2.7, s5: 2.3 };
  Object.entries(perNoten).forEach(([u, wert]) => {
    const a = neueAbgabe(4, [u], [{ name: `Referat_Handout_${u}.pdf`, groesse: 1_200_000, von: u, am: tag(-36, 20, 10) }]);
    abgabe[a - 1].status = 'bewertet';
    note.push({ id: note.length + 1, pruefung_id: 4, student_id: u, abgabe_id: a, wert, feedback: u === 's1' ? 'Sehr klarer Aufbau und gut gewählte Praxisbeispiele. Beim Handout fehlen die Quellenangaben auf Folie 4, deshalb nicht 1,3.' : 'Solide Leistung.', bewertet_von: 'l1', freigegeben_am: tag(-20), bestaetigt_am: u === 's1' || u === 's3' ? tag(-15) : null });
  });
  // WAR: abgegeben, von Dr. Keller bewertet, aber noch nicht freigegeben
  ['s1', 's2', 's3', 's4'].forEach((u, i) => {
    const a = neueAbgabe(5, [u], [{ name: `Literaturrecherche_${u}.pdf`, groesse: 800_000 + i * 50_000, von: u, am: tag(-13 + (u === 's4' ? 2 : 0), 21, 30) }], u === 's4');
    if (u === 's1' || u === 's2') note.push({ id: note.length + 1, pruefung_id: 5, student_id: u, abgabe_id: a, wert: u === 's1' ? 2.3 : 1.7, feedback: 'Bewertung im Entwurf.', bewertet_von: 'l2', freigegeben_am: null, bestaetigt_am: null });
  });
  // WIN: Gruppe Lena + Jonas hat Version 1 hochgeladen
  neueAbgabe(3, ['s1', 's2'], [{ name: 'WIN_Gruppe1_Konzept_v1.pdf', groesse: 4_600_000, von: 's2', am: tag(-2, 22, 5) }]);
  neueAbgabe(3, ['s3', 's4', 's5'], [
    { name: 'WIN_Gruppe2_Konzept.pdf', groesse: 3_900_000, von: 's3', am: tag(-3, 19, 40) },
    { name: 'WIN_Gruppe2_Demo.mp4', mime: 'video/mp4', groesse: 812_000_000, von: 's5', am: tag(-1, 23, 12) },
  ]);

  const mitteilung = [], zustellung = [];
  const alleStudis = ['s1', 's2', 's3', 's4', 's5'];
  const neueMitteilung = (m, empfaenger, gelesen = []) => {
    const id = mitteilung.length + 1;
    mitteilung.push({ id, kurs_id: null, gruppe_id: null, termin_id: null, wichtig: false, ...m });
    empfaenger.forEach(u => zustellung.push({ mitteilung_id: id, empfaenger_id: u, kanal: 'campus', gesendet_am: m.erstellt_am, gelesen_am: gelesen.includes(u) ? m.erstellt_am : null }));
  };
  neueMitteilung({ absender_id: 'v1', anlass: 'neuigkeit', titel: 'Bibliothek samstags länger geöffnet', text: 'Ab sofort hat die Bibliothek samstags bis 18 Uhr geöffnet, auch während der Prüfungsphase.', erstellt_am: tag(-8, 10, 0), gruppe_id: null }, alleStudis, alleStudis);
  neueMitteilung({ absender_id: 'l1', anlass: 'note', titel: 'Note freigegeben: Personalmanagement', text: 'Für dein Referat liegt eine Note vor. Du findest sie im Modul unter Ergebnis.', erstellt_am: tag(-20, 16, 0), kurs_id: 4 }, alleStudis, alleStudis);
  neueMitteilung({ absender_id: 'l1', anlass: 'material', titel: 'Neues Material in Marketing', text: 'Folien 2: Zielgruppen und Personas sind online.', erstellt_am: tag(-6, 12, 0), kurs_id: 1 }, alleStudis, ['s2', 's3']);
  neueMitteilung({ absender_id: 'l3', anlass: 'aenderung', titel: 'Raumänderung Wirtschaftsinformatik', text: mittwoch.hinweis + '. Grund: Das PC-Labor wird gewartet.', erstellt_am: tag(-1, 17, 5), kurs_id: 3, termin_id: mittwoch.id }, alleStudis, []);
  neueMitteilung({ absender_id: 'l2', anlass: 'material', titel: 'Übungsklausur KLR online', text: 'Die Übungsklausur mit Lösungen liegt unter Materialien.', erstellt_am: tag(-1, 9, 30), kurs_id: 2 }, alleStudis, []);
  neueMitteilung({ absender_id: 'l1', anlass: 'aenderung', titel: 'Marketing fällt nächsten Montag aus', text: naechsterMo.hinweis + '.', erstellt_am: tag(0, 8, 15), kurs_id: 1, termin_id: naechsterMo.id }, alleStudis, []);

  const service = {
    ansprechpersonen: [
      { name: 'Petra Lange', aufgabe: 'Studienbüro: Anmeldung, Bescheinigungen, Fristverlängerung', email: 'studienbuero@campus.example', telefon: '040 123 456-10', zeiten: 'Mo–Do 9–16 Uhr, Fr 9–13 Uhr' },
      { name: 'Thomas Reimers', aufgabe: 'Prüfungsamt: Noten, Wiederholungsprüfungen, Anerkennung', email: 'pruefungsamt@campus.example', telefon: '040 123 456-20', zeiten: 'Di und Do 10–15 Uhr' },
      { name: 'IT-Support', aufgabe: 'Zugang, Passwort, Probleme beim Hochladen', email: 'it@campus.example', telefon: '040 123 456-99', zeiten: 'Mo–Fr 8–20 Uhr, Sa 8–14 Uhr' },
    ],
    faq: [
      { frage: 'Mein Upload bricht ab. Was nun?', antwort: 'Der Upload läuft in Teilen und setzt nach einem Abbruch an derselben Stelle fort. Lade die Seite einfach neu und wähle dieselbe Datei. Was bis zur Frist hochgeladen war, zählt.' },
      { frage: 'Kann ich nach dem Einreichen noch etwas ändern?', antwort: 'Ja, bis zur Frist. Jeder Upload wird eine neue Version, frühere Versionen bleiben erhalten. Bewertet wird die letzte Version vor der Frist.' },
      { frage: 'Warum steht die Note nicht in der E-Mail?', antwort: 'Noten sind personenbezogene Daten. Die E-Mail enthält nur einen Hinweis, die Note selbst siehst du nach der Anmeldung.' },
      { frage: 'Was bedeutet „vorläufig“ bei meiner Note?', antwort: 'Die Lehrenden haben die Note freigegeben, das Prüfungsamt hat sie aber noch nicht endgültig bestätigt. Auf Bescheinigungen erscheinen nur bestätigte Noten.' },
      { frage: 'Wie bekomme ich den Stundenplan in meinen Kalender?', antwort: 'Unter Stundenplan auf „Kalender abonnieren“ tippen. Änderungen erscheinen dann automatisch in Outlook, Google oder Apple Kalender.' },
    ],
    formulare: ['Antrag auf Fristverlängerung', 'Antrag auf Anerkennung von Leistungen', 'Attest bei Prüfungsunfähigkeit', 'Adressänderung'],
  };

  const einstellungen = {};
  return { version: 1, user, studiengang, studiengruppe, gruppenmitglied, semester, vorlesungsfreie_zeit, modul, kurs, lehrauftrag, raum, termin, datei, material, pruefung, abgabe, abgabe_mitglied, abgabeversion, note, mitteilung, zustellung, einstellungen, service, protokoll: [] };
}

// Stabiler Platzhalter für Beispieldateien. Echte Uploads bekommen einen echten SHA-256.
function pseudoHash(text) {
  let h = 0x811c9dc5, out = '';
  for (let r = 0; r < 8; r++) {
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i) + r; h = Math.imul(h, 16777619) >>> 0; }
    out += h.toString(16).padStart(8, '0');
  }
  return out;
}
