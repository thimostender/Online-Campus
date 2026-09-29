// Beispieldaten. Aufbau und Namen folgen dem ER-Modell (er-modell.mmd).
// Module nach der Modulstruktur Medien- und IT-Management (B.A.), Stand Januar 2023.
// Termine und Fristen werden relativ zum Erzeugungstag angelegt und wandern danach
// täglich mit (siehe datumVerschieben in app.js), damit Änderungen erhalten bleiben.

const ANLAESSE = [
  { id: 'aenderung', name: 'Termin neu, verlegt, Raum geändert, Ausfall', std: { campus: true, push: true, email: true } },
  { id: 'note', name: 'Note freigegeben', std: { campus: true, push: true, email: true } },
  { id: 'eingang', name: 'Abgabe eingegangen', std: { campus: true, push: false, email: true }, pflicht: ['email'] },
  { id: 'frist', name: 'Frist bald fällig', std: { campus: true, push: true, email: false } },
  { id: 'material', name: 'Neues Material', std: { campus: true, push: false, email: false } },
  { id: 'neuigkeit', name: 'Neuigkeiten von Lehrenden und Verwaltung', std: { campus: true, push: false, email: true } },
  { id: 'antrag', name: 'Entscheidung über einen Antrag', std: { campus: true, push: true, email: true } },
];
const KANAELE = [
  { id: 'campus', name: 'Im Campus' },
  { id: 'push', name: 'Push' },
  { id: 'email', name: 'E-Mail' },
];
const BEREICHE = {
  GRUND: 'Grundlagen', DESIGN: 'Mediendesign', MWG: 'Medienwissenschaftliche Grundlagen (M)', ITG: 'IT-wissenschaftliche Grundlagen (I)',
  KOMM: 'Kommunikationsmanagement mit digitalen Medien', FUNDM: 'Fundierung: Medien (M)', FUNDI: 'Fundierung: Informationstechnologie (I)',
  PROJ: 'Projekte', ANWM: 'Anwendungen: Medien (M)', ANWI: 'Anwendungen: Informationstechnologie (I)', WIRT: 'Wirtschaft', RECHT: 'Recht',
  ABSCHLUSS: 'Abschlussarbeit', PTP: 'Praxis-Transfer-Projekte',
};
const SCHWERPUNKTE = { M: 'Schwerpunkt Medien', I: 'Schwerpunkt IT' };

// Modulstruktur: [Nr., Kürzel, Titel, Kurztitel, Bereich, Plansemester, Schwerpunkt, UE, Workload, CP]
const PTP_THEMEN = ['Wissenschaftliches Arbeiten, digitale Kompetenz', 'Selbstmanagement, digitale Kompetenz', 'Projektmanagement', 'Interdisziplinarität', 'Schriftliche Ergebnispräsentation, digitale Kompetenz', 'Mediale Ergebnispräsentation, digitale Kompetenz'];
const MODULSTRUKTUR = [
  ['1', 'GMI', 'Geschichte der Medien und der Informationstechnologie', 'Geschichte der Medien und IT', 'GRUND', 1],
  ['2', 'EIM', 'Einführung Informationsmanagement', '', 'GRUND', 1],
  ['3', 'WMI', 'Wirtschaftswissenschaften im Medien- und IT-Bereich', 'Wirtschaftswissenschaften', 'GRUND', 2],
  ['4', 'RAB', 'Rechnerarchitektur und Betriebssysteme', '', 'GRUND', 1],
  ['5', 'NST', 'Netzwerk- und Servertechnologie', '', 'GRUND', 1],
  ['6', 'KTH', 'Kommunikationstheorien', '', 'GRUND', 1],
  ['7', 'GDE', 'Grafik-Design', '', 'DESIGN', 1],
  ['8', 'ONM', 'Online-Medien', '', 'DESIGN', 2],
  ['9', 'AVM', 'Audiovisuelle Medien / Postproduktion', '', 'DESIGN', 3],
  ['10 (M)', 'MPS', 'Medienpsychologie', '', 'MWG', 2, 'M'],
  ['11 (M)', 'MKO', 'Medienkonzeption', '', 'MWG', 3, 'M'],
  ['10 (I)', 'PSE', 'Programmierung / Softwareentwicklung', '', 'ITG', 2, 'I'],
  ['11 (I)', 'DBK', 'Datenbanken', '', 'ITG', 3, 'I'],
  ['12', 'PRE', 'Public Relations', '', 'KOMM', 2],
  ['13', 'MSP', 'Medienkonvergenz / Social Media / Plattformökonomie', 'Medienkonvergenz und Social Media', 'KOMM', 3],
  ['14', 'RVD', 'Ringvorlesung: Datenkommunikation, CMS, SEO, IT-Sicherheit', 'Ringvorlesung IT-Sicherheit, CMS, SEO', 'KOMM', 3],
  ['15', 'IVI', 'Informationsvisualisierung', '', 'KOMM', 5],
  ['16', 'RVO', 'Ringvorlesung: Organisations- / Unternehmenskommunikation', 'Ringvorlesung Unternehmenskommunikation', 'KOMM', 6],
  ['17 (M)', 'SKO', 'Strategische Kommunikation', '', 'FUNDM', 4, 'M'],
  ['18 (M)', 'DST', 'Digitale Strategien', '', 'FUNDM', 5, 'M'],
  ['19 (M)', 'IDT', 'Innovationsmanagement und Design Thinking', 'Innovation und Design Thinking', 'FUNDM', 5, 'M'],
  ['17 (I)', 'SAI', 'Systemanalyse / Systemintegration', '', 'FUNDI', 4, 'I'],
  ['18 (I)', 'DAP', 'Datenanalyse und Prozessanalyse', '', 'FUNDI', 5, 'I'],
  ['19 (I)', 'ALG', 'Algorithmen und Datenstrukturen', '', 'FUNDI', 5, 'I'],
  ['20', 'PPL', 'Projektplanung', '', 'PROJ', 4],
  ['21', 'PDF', 'Projektdurchführung', '', 'PROJ', 5],
  ['22 (M)', 'IMP', 'Interdisziplinäre Medienproduktion / Digital Storytelling', 'Medienproduktion / Digital Storytelling', 'ANWM', 5, 'M'],
  ['23 (M)', 'MOD', 'Motion Design', '', 'ANWM', 6, 'M'],
  ['24 (M)', 'TXD', 'Textdesign', '', 'ANWM', 6, 'M'],
  ['22 (I)', 'IPE', 'Interdisziplinäre Projektentwicklung', '', 'ANWI', 5, 'I'],
  ['23 (I)', 'CPS', 'Corporate Publishing-Systeme', '', 'ANWI', 6, 'I'],
  ['24 (I)', 'ELW', 'E-Learning Systeme / Wissensmanagement', 'E-Learning und Wissensmanagement', 'ANWI', 6, 'I'],
  ['25', 'BUB', 'Grundlagen Buchhaltung und Bilanzierung', 'Buchhaltung und Bilanzierung', 'WIRT', 2],
  ['26', 'MOK', 'Medienökonomie', '', 'WIRT', 2],
  ['27', 'GMA', 'Grundlagen Marketing', '', 'WIRT', 3],
  ['28', 'EFM', 'Empirische Forschungsmethoden', '', 'WIRT', 4],
  ['29', 'IUF', 'Investition und Finanzierung', '', 'WIRT', 4],
  ['30', 'KRC', 'Grundlagen Kostenrechnung und Controlling', 'Kostenrechnung und Controlling', 'WIRT', 4],
  ['31', 'OUP', 'Grundlagen Organisation und Personal', 'Organisation und Personal', 'WIRT', 5],
  ['32', 'GRW', 'Grundlagen Recht der Wirtschaft', '', 'RECHT', 3],
  ['33', 'VRW', 'Vertiefung Recht der Wirtschaft', '', 'RECHT', 4],
  ['34', 'MIR', 'Medien- und IT-Recht', '', 'RECHT', 6],
  ['35', 'BAR', 'Bachelorarbeit', '', 'ABSCHLUSS', 6, null, 0, 300, 10],
  ...[1, 2, 3, 4, 5, 6].map(n => ['', 'PT' + n, `Praxistransfer des ${n}. Semesters (${PTP_THEMEN[n - 1]})`, `Praxistransfer ${n}`, 'PTP', n, null, 30, 0, 0]),
];
const BESCHREIBUNG = {
  AVM: 'Arbeitsschritte der Postproduktion: Schnitt, Farbkorrektur und Color Grading, Tonmischung und Export. Gruppenprojekt: Imagefilm für einen Praxisbetrieb.',
  MKO: 'Aufbau von Medienkonzepten vom Briefing über Ziele, Personas und Kernbotschaft bis zu Medienmix, Zeitplan und Erfolgskontrolle.',
  DBK: 'Relationales Modell, ER-Modellierung, Schlüssel und Beziehungen, Normalisierung bis zur 3. Normalform und Grundlagen von SQL.',
  MSP: 'Medienkonvergenz, Plattformen und zweiseitige Märkte, Netzwerkeffekte, Social-Media-Kennzahlen und Strategien für Unternehmen.',
  RVD: 'Ringvorlesung mit wechselnden Lehrenden: Datenkommunikation, Content-Management-Systeme, Suchmaschinenoptimierung und IT-Sicherheit.',
  GMA: 'Käuferverhalten, S-O-R-Modell, Kaufentscheidungstypen und die Methoden der Marktforschung als Grundlage für Marketingentscheidungen.',
  GRW: 'Grundlagen des Bürgerlichen Rechts für die Praxis: Rechtsgeschäfte, Geschäftsfähigkeit, Vertragsschluss, Kaufvertrag und Mängelrechte.',
  PT3: 'Transfer der Semesterinhalte auf ein reales Projekt im Ausbildungsbetrieb, Schwerpunkt Projektmanagement, dokumentiert im Praxistransferbericht.',
};

function erzeugeDaten(heute = new Date()) {
  const tag = (versatz, h = 0, m = 0) => { const d = new Date(heute); d.setHours(h, m, 0, 0); d.setDate(d.getDate() + versatz); return d.toISOString(); };
  const wt = (heute.getDay() + 6) % 7; // Montag der aktuellen Woche
  const mo = (woche, plus, h, m) => tag(-wt + woche * 7 + plus, h, m);
  const zufall = text => parseInt(pseudoHash(text).slice(0, 8), 16) / 0xffffffff; // stabil, nicht zufällig

  const user = [
    { id: 's1', vorname: 'Lena', nachname: 'Hoffmann', email: 'lena.hoffmann@campus.example', rolle: 'studierend', matrikelnummer: '2025-0142', aktiv: true, adresse: { strasse: 'Am Sande 12', plz: '21335', ort: 'Lüneburg' } },
    { id: 's2', vorname: 'Jonas', nachname: 'Weber', email: 'jonas.weber@campus.example', rolle: 'studierend', matrikelnummer: '2025-0157', aktiv: true },
    { id: 's3', vorname: 'Mira', nachname: 'Schulz', email: 'mira.schulz@campus.example', rolle: 'studierend', matrikelnummer: '2025-0163', aktiv: true },
    { id: 's4', vorname: 'Can', nachname: 'Yilmaz', email: 'can.yilmaz@campus.example', rolle: 'studierend', matrikelnummer: '2025-0171', aktiv: true },
    { id: 's5', vorname: 'Sophie', nachname: 'Krüger', email: 'sophie.krueger@campus.example', rolle: 'studierend', matrikelnummer: '2025-0188', aktiv: true },
    { id: 'l1', vorname: 'Katrin', nachname: 'Brandt', titel: 'Prof. Dr.', email: 'k.brandt@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l2', vorname: 'Martin', nachname: 'Keller', titel: 'Dr.', email: 'm.keller@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l3', vorname: 'Sabine', nachname: 'Ohlsen', titel: '', email: 's.ohlsen@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l4', vorname: 'Jana', nachname: 'Carstens', titel: '', email: 'j.carstens@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l5', vorname: 'Jan', nachname: 'Petersen', titel: 'Dr.', email: 'j.petersen@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'v1', vorname: 'Petra', nachname: 'Lange', email: 'p.lange@campus.example', rolle: 'verwaltung', aktiv: true },
  ];
  const studis = ['s1', 's2', 's3', 's4', 's5'];
  // Schwerpunkt ab dem 2. Semester: Lena, Mira, Sophie Medien; Jonas und Can IT
  const schwerpunkt_wahl = [['s1', 'M'], ['s2', 'I'], ['s3', 'M'], ['s4', 'I'], ['s5', 'M']].map(([u, s]) => ({ user_id: u, schwerpunkt: s, gewaehlt_am: '2026-02-10T10:00:00.000Z', historisch: true }));
  const spVon = u => schwerpunkt_wahl.find(w => w.user_id === u).schwerpunkt;

  const studiengang = [{ id: 1, name: 'Medien- und IT-Management', abschluss: 'Bachelor of Arts', einrichtung: 'VWA / Berufsakademie', ects_gesamt: 180, semester: 6 }];
  const studiengruppe = [{ id: 1, studiengang_id: 1, name: 'MIT-2025-A', standort: 'Campus Mitte' }];
  const gruppenmitglied = studis.map(u => ({ user_id: u, gruppe_id: 1, von: '2025-09-01', bis: null }));
  const semester = [
    { id: 1, bezeichnung: 'WiSe 2025/26', beginn: '2025-09-01', ende: '2026-02-28' },
    { id: 2, bezeichnung: 'SoSe 2026', beginn: '2026-03-01', ende: '2026-08-31' },
    { id: 3, bezeichnung: 'WiSe 2026/27', beginn: '2026-09-01', ende: '2027-02-28' },
    { id: 4, bezeichnung: 'SoSe 2027', beginn: '2027-03-01', ende: '2027-08-31' },
  ];
  const vorlesungsfreie_zeit = [
    { id: 1, semester_id: 3, bezeichnung: 'Weihnachtspause', beginn: '2026-12-21', ende: '2027-01-03' },
    { id: 2, semester_id: 3, bezeichnung: 'Prüfungsfreie Zeit', beginn: '2027-02-15', ende: '2027-02-28' },
  ];

  const modul = MODULSTRUKTUR.map(([nr, kuerzel, titel, kurz, bereich, plansemester, schwerpunkt = null, ue = 40, workload = 150, ects = 5], i) => ({
    id: i + 1, nr, kuerzel, titel, kurztitel: kurz || titel, bereich, plansemester, schwerpunkt, ue, workload, ects,
    beschreibung: BESCHREIBUNG[kuerzel] || `Modul ${nr ? nr + ' ' : ''}im Bereich ${BEREICHE[bereich]}, vorgesehen im ${plansemester}. Semester.`,
  }));
  const M = k => modul.find(m => m.kuerzel === k).id;

  // Kurse: Semester 1 und 2 abgeschlossen, Semester 3 aktuell. Kurs-ID = Modul-ID im aktuellen Semester,
  // frühere Kurse bekommen IDs ab 100. Kurse eines Schwerpunkts besuchen nur dessen Studierende.
  const kurs = [], lehrauftrag = [];
  const lehrende = { AVM: ['l4'], MKO: ['l4'], DBK: ['l2'], MSP: ['l3'], RVD: ['l2', 'l3'], GMA: ['l1'], GRW: ['l5'], PT3: ['l1'] };
  Object.entries(lehrende).forEach(([k, ls]) => {
    const m = modul.find(x => x.kuerzel === k);
    kurs.push({ id: m.id, modul_id: m.id, gruppe_id: 1, semester_id: 3, schwerpunkt: m.schwerpunkt });
    ls.forEach((l, i) => lehrauftrag.push({ kurs_id: m.id, lehrender_id: l, rolle: i ? 'mitwirkend' : 'verantwortlich' }));
  });
  const reihum = ['l1', 'l2', 'l5', 'l3', 'l4'];
  modul.filter(m => m.plansemester <= 2).forEach((m, i) => {
    const id = 100 + i;
    kurs.push({ id, modul_id: m.id, gruppe_id: 1, semester_id: m.plansemester, schwerpunkt: m.schwerpunkt });
    lehrauftrag.push({ kurs_id: id, lehrender_id: reihum[i % 5], rolle: 'verantwortlich' });
  });

  const raum = [
    { id: 1, standort: 'Campus Mitte', bezeichnung: 'Raum 2.04', plaetze: 30, x: 20, y: 20, w: 120, h: 80 },
    { id: 2, standort: 'Campus Mitte', bezeichnung: 'Raum 3.11', plaetze: 28, x: 150, y: 20, w: 120, h: 80 },
    { id: 3, standort: 'Campus Mitte', bezeichnung: 'Hörsaal A', plaetze: 120, x: 20, y: 110, w: 250, h: 90 },
    { id: 4, standort: 'Campus Mitte', bezeichnung: 'PC-Labor 1.08', plaetze: 24, x: 280, y: 20, w: 120, h: 85 },
    { id: 5, standort: 'Campus Mitte', bezeichnung: 'Medienlabor 1.12', plaetze: 16, x: 280, y: 115, w: 120, h: 85 },
  ];

  // Wochenplan: Mo Marketing, Di Medienkonvergenz/Recht im Wechsel, Mi parallel Medienkonzeption (M) und
  // Datenbanken (I), Do Ringvorlesung online, Sa Postproduktion im Medienlabor bzw. Praxistransfer-Seminar online
  const termin = [];
  let tid = 1;
  const neu = (k, raum_id, beginn, ende, art = 'Vorlesung') => { const t = { id: tid++, kurs_id: M(k), raum_id, vertretung_id: null, beginn, ende, art, online_link: raum_id ? null : 'https://meet.example/' + k.toLowerCase(), status: 'geplant' }; termin.push(t); return t; };
  for (let w = -2; w <= 8; w++) {
    neu('GMA', 1, mo(w, 0, 18, 0), mo(w, 0, 21, 15));
    neu(w % 2 ? 'GRW' : 'MSP', 3, mo(w, 1, 18, 0), mo(w, 1, 21, 15));
    neu('MKO', 2, mo(w, 2, 18, 0), mo(w, 2, 21, 15));
    neu('DBK', 4, mo(w, 2, 18, 0), mo(w, 2, 21, 15));
    neu('RVD', null, mo(w, 3, 18, 0), mo(w, 3, 19, 30), 'Online');
    if (w % 2) neu('PT3', null, mo(w, 5, 9, 0), mo(w, 5, 12, 15), 'Online'); else neu('AVM', 5, mo(w, 5, 9, 0), mo(w, 5, 14, 30));
  }
  const finde = (k, iso) => termin.find(t => t.kurs_id === M(k) && t.beginn === iso);
  const mittwoch = finde('MKO', mo(0, 2, 18, 0));
  mittwoch.status = 'verlegt'; mittwoch.raum_id = 1; mittwoch.hinweis = 'Raum geändert: statt Raum 3.11 jetzt Raum 2.04';
  const naechsterMo = finde('GMA', mo(1, 0, 18, 0));
  naechsterMo.status = 'ausgefallen'; naechsterMo.hinweis = 'Fällt krankheitsbedingt aus, Nachholtermin folgt';
  const vertretung = finde('GMA', mo(2, 0, 18, 0));
  vertretung.vertretung_id = 'l2'; vertretung.hinweis = 'Vertretung durch Dr. Martin Keller';
  neu('GMA', 3, tag(20, 9, 0), tag(20, 11, 0), 'Klausur');
  neu('DBK', 4, tag(34, 9, 0), tag(34, 10, 30), 'Klausur');

  // Dateien: nur Metadaten. Die Inhalte (echte PDFs) erzeugt dateien.js beim ersten Start im Browser-Speicher.
  const datei = [];
  const neueDatei = (name, mime, groesse, von, am, extra = {}) => { const d = { id: 'd' + (datei.length + 1), dateiname: name, mime_typ: mime, groesse_bytes: groesse, sha256: pseudoHash(name + am), hochgeladen_von: von, hochgeladen_am: am, ...extra }; datei.push(d); return d.id; };

  const material = [], abschnitt = [];
  const neuesMaterial = (k, key, dateiname, von, am) => {
    const id = material.length + 1;
    const m = { id, kurs_id: typeof k === 'number' ? k : M(k), datei_id: neueDatei(dateiname, 'application/pdf', 0, von, am, { erzeugen: { art: 'material', key } }), titel: MATERIAL_TEXTE[key].titel, sichtbar_ab: am, text_status: 'ausgelesen' };
    material.push(m);
    MATERIAL_TEXTE[key].seiten.forEach((s, i) => zerlegeInAbschnitte(s).forEach(text => abschnitt.push({ id: abschnitt.length + 1, material_id: id, seite: i + 1, text })));
  };
  neuesMaterial('GMA', 'gma1', 'GMA_01_Kaeuferverhalten.pdf', 'l1', tag(-20));
  neuesMaterial('GMA', 'gma2', 'GMA_02_Marktforschung.pdf', 'l1', tag(-6));
  neuesMaterial('MSP', 'msp1', 'MSP_Plattformoekonomie.pdf', 'l3', tag(-15));
  neuesMaterial('MSP', 'mspHa', 'MSP_Aufgabenstellung_Hausarbeit.pdf', 'l3', tag(-14));
  neuesMaterial('AVM', 'avm1', 'AVM_Postproduktion.pdf', 'l4', tag(-22));
  neuesMaterial('RVD', 'rvl1', 'RVD_IT-Sicherheit_CMS_SEO.pdf', 'l2', tag(-24));
  neuesMaterial('GRW', 'grw1', 'GRW_Vertrag_Maengelrechte.pdf', 'l5', tag(-26));
  neuesMaterial('MKO', 'mko1', 'MKO_Leitfaden_Medienkonzept.pdf', 'l4', tag(-19));
  neuesMaterial('DBK', 'dbk1', 'DBK_ER-Modell_Normalisierung.pdf', 'l2', tag(-17));
  neuesMaterial('DBK', 'dbk2', 'DBK_Uebungsklausur.pdf', 'l2', tag(-1));
  neuesMaterial('PT3', 'ptp3', 'PTP3_Leitfaden_Projektmanagement.pdf', 'l1', tag(-26));
  neuesMaterial(kurs.find(k => k.modul_id === M('PT1')).id, 'mwa1', 'PTP1_Zitieren_APA7.pdf', 'l1', '2025-09-15T08:00:00.000Z');

  // Prüfungen im aktuellen Semester
  const pruefung = [];
  const neuePruefung = (k, p) => { const id = pruefung.length + 1; pruefung.push({ id, kurs_id: M(k), gruppenarbeit: false, gewicht: 1, ...p }); return id; };
  neuePruefung('MSP', { art: 'Hausarbeit', titel: 'Hausarbeit: Social-Media-Strategie für den Praxisbetrieb', frist: tag(9, 23, 59), mit_upload: true, max_mb: 100, formate: 'pdf' });
  const pAVM = neuePruefung('AVM', { art: 'Projekt', titel: 'Gruppenprojekt: Imagefilm für einen Praxisbetrieb', frist: tag(3, 23, 59), mit_upload: true, gruppenarbeit: true, max_mb: 2000, formate: 'pdf, zip, mp4' });
  const pRVD = neuePruefung('RVD', { art: 'Referat', titel: 'Referat mit Handout zu einem Thema der Ringvorlesung', frist: tag(-18, 18, 0), mit_upload: true, max_mb: 100, formate: 'pdf, pptx' });
  const pGRW = neuePruefung('GRW', { art: 'Hausarbeit', titel: 'Fallbearbeitung: Kaufvertrag und Mängelrechte', frist: tag(-12, 23, 59), mit_upload: true, max_mb: 100, formate: 'pdf, docx' });
  neuePruefung('GMA', { art: 'Klausur', titel: 'Klausur Grundlagen Marketing (90 Minuten)', frist: tag(20, 9, 0), mit_upload: false, max_mb: 0, formate: '' });
  neuePruefung('MKO', { art: 'Projekt', titel: 'Medienkonzept für eine Kampagne des Praxisbetriebs', frist: tag(30, 23, 59), mit_upload: true, max_mb: 100, formate: 'pdf' });
  neuePruefung('DBK', { art: 'Klausur', titel: 'Klausur Datenbanken (90 Minuten)', frist: tag(34, 9, 0), mit_upload: false, max_mb: 0, formate: '' });
  // Frist gestern abgelaufen: Prof. Brandt kann sofort bewerten und freigeben (zum Ausprobieren)
  const pPT3 = neuePruefung('PT3', { art: 'PTP', titel: 'Praxistransferbericht 3. Semester (Projektmanagement)', frist: tag(-1, 23, 59), mit_upload: true, max_mb: 100, formate: 'pdf' });

  const abgabe = [], abgabe_mitglied = [], abgabeversion = [], note = [];
  const neueAbgabe = (pid, mitglieder, versionen, verspaetet = false) => {
    const id = abgabe.length + 1, letzte = versionen[versionen.length - 1];
    abgabe.push({ id, pruefung_id: pid, status: 'eingereicht', eingereicht_am: letzte.am, verspaetet, erklaerung_am: letzte.am });
    mitglieder.forEach(u => abgabe_mitglied.push({ abgabe_id: id, student_id: u }));
    versionen.forEach((v, i) => abgabeversion.push({ id: abgabeversion.length + 1, abgabe_id: id, nummer: i + 1, datei_id: neueDatei(v.name, v.mime || 'application/pdf', v.groesse || 0, v.von, v.am, v.ohneInhalt ? { ohne_inhalt: true } : { erzeugen: { art: 'abgabe', titel: v.titel || v.name, von: v.von } }), hochgeladen_am: v.am }));
    return id;
  };
  // Ringvorlesung: alle abgegeben, bewertet, freigegeben; für Lena und Mira schon bestätigt
  const rvdNoten = { s1: 1.7, s2: 2.0, s3: 1.3, s4: 2.7, s5: 2.3 };
  Object.entries(rvdNoten).forEach(([u, wert]) => {
    const a = neueAbgabe(pRVD, [u], [{ name: `Referat_Handout_${u}.pdf`, von: u, am: tag(-19, 20, 10), titel: 'Referat Ringvorlesung: Handout' }]);
    abgabe[a - 1].status = 'bewertet';
    note.push({ id: note.length + 1, pruefung_id: pRVD, student_id: u, abgabe_id: a, wert, feedback: u === 's1' ? 'Sehr anschaulich erklärt, wie Phishing abläuft und warum Zwei-Faktor-Authentifizierung hilft. Im Handout fehlen die Quellen auf Seite 2, deshalb nicht 1,3.' : 'Solides Referat.', bewertet_von: 'l2', freigegeben_am: tag(-9), bestaetigt_am: u === 's1' || u === 's3' ? tag(-4) : null });
  });
  // Recht: abgegeben, von Dr. Petersen teilweise bewertet (Entwurf, noch nicht freigegeben)
  ['s1', 's2', 's3', 's4'].forEach(u => {
    const a = neueAbgabe(pGRW, [u], [{ name: `Fallbearbeitung_Recht_${u}.pdf`, von: u, am: tag(-13 + (u === 's4' ? 2 : 0), 21, 30), titel: 'Fallbearbeitung Kaufvertrag und Mängelrechte' }], u === 's4');
    if (u === 's1' || u === 's2') note.push({ id: note.length + 1, pruefung_id: pGRW, student_id: u, abgabe_id: a, wert: u === 's1' ? 2.3 : 1.7, feedback: u === 's1' ? 'Vertragsschluss sauber geprüft. Beim Vorrang der Nacherfüllung fehlt die Fristsetzung.' : 'Gute, vollständige Prüfung.', bewertet_von: 'l5', freigegeben_am: null, bestaetigt_am: null });
  });
  // Postproduktion: interdisziplinäre Gruppen aus Medien und IT
  neueAbgabe(pAVM, ['s1', 's2'], [{ name: 'AVM_Gruppe1_Konzept_Drehplan_v1.pdf', von: 's2', am: tag(-2, 22, 5), titel: 'Imagefilm Gruppe 1: Konzept und Drehplan' }]);
  neueAbgabe(pAVM, ['s3', 's4', 's5'], [
    { name: 'AVM_Gruppe2_Konzept.pdf', von: 's3', am: tag(-3, 19, 40), titel: 'Imagefilm Gruppe 2: Konzept' },
    { name: 'AVM_Gruppe2_Imagefilm.mp4', mime: 'video/mp4', groesse: 812_000_000, von: 's5', am: tag(-1, 23, 12), ohneInhalt: true },
  ]);

  // Praxistransfer 3: vier Berichte, einer verspätet, Sophie hat nichts abgegeben. Noch keine Noten.
  [['s1', -2, 'Projektmanagement bei der Einführung eines neuen Intranets'], ['s2', -1, 'Migration des Ticketsystems im IT-Service'], ['s3', -3, 'Relaunch des Instagram-Auftritts'], ['s4', 0, 'Planung einer Hausmesse']].forEach(([u, t, thema]) => {
    neueAbgabe(pPT3, [u], [{ name: `Praxistransferbericht_3_${u}.pdf`, von: u, am: tag(t, t === 0 ? 8 : 21, 40), titel: `Praxistransferbericht: ${thema}` }], t === 0);
  });

  // Frühere Semester: je Kurs eine Prüfung mit bestätigter Note (nur für Studierende des passenden Schwerpunkts)
  const lenaNoten = { GMI: 1.7, EIM: 2.0, RAB: 2.7, NST: 3.0, KTH: 1.3, GDE: 1.7, PT1: 1.3, WMI: 2.3, ONM: 1.7, MPS: 1.3, PRE: 1.7, BUB: 2.7, MOK: 2.0, PT2: 1.7 };
  const stufen = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7];
  kurs.filter(k => k.id >= 100).forEach(k => {
    const m = modul.find(x => x.id === k.modul_id), sem = semester.find(s => s.id === k.semester_id);
    const art = m.bereich === 'PTP' ? 'PTP' : m.kuerzel === 'GDE' || m.kuerzel === 'ONM' ? 'Projekt' : ['KTH', 'PRE'].includes(m.kuerzel) ? 'Hausarbeit' : 'Klausur';
    const frist = new Date(sem.ende + 'T09:00:00'); frist.setDate(frist.getDate() - 20 - (k.id % 10));
    const pid = pruefung.length + 1;
    pruefung.push({ id: pid, kurs_id: k.id, art, titel: `${art} ${m.kurztitel}`, frist: frist.toISOString(), mit_upload: false, gruppenarbeit: false, max_mb: 0, formate: '', gewicht: 1, historisch: true });
    const freigabe = new Date(frist); freigabe.setDate(freigabe.getDate() + 21);
    const bestaetigt = new Date(freigabe); bestaetigt.setDate(bestaetigt.getDate() + 7);
    studis.filter(u => !k.schwerpunkt || spVon(u) === k.schwerpunkt).forEach(u => {
      const wert = u === 's1' ? lenaNoten[m.kuerzel] : stufen[Math.floor(zufall(u + m.kuerzel) * stufen.length)];
      note.push({ id: note.length + 1, pruefung_id: pid, student_id: u, abgabe_id: null, wert, feedback: '', bewertet_von: lehrauftrag.find(l => l.kurs_id === k.id).lehrender_id, freigegeben_am: freigabe.toISOString(), bestaetigt_am: bestaetigt.toISOString(), historisch: true });
    });
  });

  const mitteilung = [], zustellung = [];
  const neueMitteilung = (m, empfaenger, gelesen = []) => {
    const id = mitteilung.length + 1;
    mitteilung.push({ id, kurs_id: null, gruppe_id: null, termin_id: null, pruefung_id: null, wichtig: false, ...m });
    empfaenger.forEach(u => zustellung.push({ mitteilung_id: id, empfaenger_id: u, kanal: 'campus', gesendet_am: m.erstellt_am, gelesen_am: gelesen.includes(u) ? m.erstellt_am : null }));
  };
  const medien = studis.filter(u => spVon(u) === 'M');
  neueMitteilung({ absender_id: 'v1', anlass: 'neuigkeit', titel: 'Medienlabor samstags länger geöffnet', text: 'Für die Postproduktion ist das Medienlabor 1.12 ab sofort samstags bis 18 Uhr geöffnet. Schnittplätze bitte im Studienbüro reservieren.', erstellt_am: tag(-8, 10, 0) }, studis, studis);
  neueMitteilung({ absender_id: 'l2', anlass: 'note', titel: 'Note freigegeben: Ringvorlesung IT-Sicherheit, CMS, SEO', text: 'Für dein Referat liegt eine Note vor. Du findest sie im Modul unter Ergebnis.', erstellt_am: tag(-9, 16, 0), kurs_id: M('RVD'), pruefung_id: pRVD }, studis, studis);
  neueMitteilung({ absender_id: 'l1', anlass: 'material', titel: 'Neues Material in Grundlagen Marketing', text: 'Folien 2: Marktforschung – Primär- und Sekundärforschung sind online.', erstellt_am: tag(-6, 12, 0), kurs_id: M('GMA') }, studis, ['s2', 's3']);
  neueMitteilung({ absender_id: 'l4', anlass: 'aenderung', titel: 'Raumänderung Medienkonzeption', text: mittwoch.hinweis + '. Grund: Raum 3.11 wird für eine Prüfung gebraucht.', erstellt_am: tag(-1, 17, 5), kurs_id: M('MKO'), termin_id: mittwoch.id }, medien, []);
  neueMitteilung({ absender_id: 'l2', anlass: 'material', titel: 'Übungsklausur Datenbanken online', text: 'Die Übungsklausur mit Lösungen liegt unter Materialien.', erstellt_am: tag(-1, 9, 30), kurs_id: M('DBK') }, studis.filter(u => spVon(u) === 'I'), []);
  neueMitteilung({ absender_id: 'l1', anlass: 'aenderung', titel: 'Grundlagen Marketing fällt nächsten Montag aus', text: naechsterMo.hinweis + '.', erstellt_am: tag(0, 8, 15), kurs_id: M('GMA'), termin_id: naechsterMo.id }, studis, []);

  const service = {
    ansprechpersonen: [
      { id: 1, name: 'Petra Lange', aufgabe: 'Studienbüro: Anmeldung, Bescheinigungen, Fristverlängerung', email: 'studienbuero@campus.example', telefon: '0123 456 789-10', zeiten: 'Mo–Do 9–16 Uhr, Fr 9–13 Uhr' },
      { id: 2, name: 'Thomas Reimers', aufgabe: 'Prüfungsamt: Noten, Wiederholungsprüfungen, Anerkennung', email: 'pruefungsamt@campus.example', telefon: '0123 456 789-20', zeiten: 'Di und Do 10–15 Uhr' },
      { id: 3, name: 'IT-Support und Medienlabor', aufgabe: 'Zugang, Passwort, Probleme beim Hochladen, Reservierung der Schnittplätze', email: 'it@campus.example', telefon: '0123 456 789-99', zeiten: 'Mo–Fr 8–20 Uhr, Sa 8–14 Uhr' },
    ],
    faq: [
      { frage: 'Mein Upload bricht ab. Was nun?', antwort: 'Der Upload läuft in Teilen und setzt nach einem Abbruch an derselben Stelle fort. Lade die Seite einfach neu und wähle dieselbe Datei. Was bis zur Frist hochgeladen war, zählt.' },
      { frage: 'Kann ich nach dem Einreichen noch etwas ändern?', antwort: 'Ja, bis zur Frist. Jeder Upload wird eine neue Version, frühere Versionen bleiben erhalten. Bewertet wird die letzte Version vor der Frist.' },
      { frage: 'Warum steht die Note nicht in der E-Mail?', antwort: 'Noten sind personenbezogene Daten. Die E-Mail enthält nur einen Hinweis, die Note selbst siehst du nach der Anmeldung.' },
      { frage: 'Was bedeutet „vorläufig“ bei meiner Note?', antwort: 'Die Lehrenden haben die Note freigegeben, das Prüfungsamt hat sie aber noch nicht endgültig bestätigt. Auf Bescheinigungen erscheinen nur bestätigte Noten.' },
      { frage: 'Wie bekomme ich den Stundenplan in meinen Kalender?', antwort: 'Unter Stundenplan auf „Kalender abonnieren“ tippen. Änderungen erscheinen dann automatisch in Outlook, Google oder Apple Kalender.' },
      { frage: 'Was unterscheidet die Schwerpunkte Medien und IT?', antwort: 'Ab dem 2. Semester studierst du im Schwerpunkt Medien (M) oder IT (I). Etwa jedes sechste Modul läuft dann getrennt, zum Beispiel Medienkonzeption (M) oder Datenbanken (I); alle anderen Module und die Praxistransfer-Projekte besucht ihr gemeinsam. Deinen Schwerpunkt siehst du unter Leistungen im Studienverlauf.' },
      { frage: 'Was ist ein Praxistransfer-Projekt?', antwort: 'In jedem Semester verbindest du die Inhalte mit einer Fragestellung aus deinem Ausbildungsbetrieb und schreibst dazu einen Praxistransferbericht. Jedes Semester hat ein eigenes Thema, im 3. Semester Projektmanagement.' },
    ],
    formulare: ['fristverlaengerung', 'pruefungsunfaehigkeit', 'anerkennung', 'schnittplatz', 'adresse'],
  };

  // Anträge: zwei offene im Posteingang des Studienbüros, einer von Lena schon genehmigt
  const antrag = [], pruefung_ausnahme = [], anerkennung = [], raum_reservierung = [];
  const pMSP = pruefung.find(p => p.kurs_id === M('MSP')).id;
  const attest = neueDatei('Attest_Yilmaz.pdf', 'application/pdf', 0, 's4', tag(-1, 19, 20), { erzeugen: { art: 'abgabe', titel: 'Ärztliche Arbeitsunfähigkeitsbescheinigung (Beispiel)', von: 's4' } });
  antrag.push({ id: 1, antragsteller_id: 's4', art: 'fristverlaengerung', status: 'eingereicht', daten: { pruefung: String(pMSP), neue_frist: tag(16).slice(0, 10), begruendung: 'Ich war vom 21. bis 28. September krankgeschrieben und konnte in dieser Zeit nicht an der Hausarbeit arbeiten. Das Attest liegt bei.' }, datei_id: attest, eingereicht_am: tag(-1, 19, 22), bearbeitet_von: null, entschieden_am: null, bescheid: '' });
  antrag.push({ id: 2, antragsteller_id: 's3', art: 'schnittplatz', status: 'eingereicht', daten: { datum: tag(4).slice(0, 10), von: '10:00', bis: '13:00', zweck: 'Feinschnitt Imagefilm Gruppe 2' }, datei_id: null, eingereicht_am: tag(0, 7, 45), bearbeitet_von: null, entschieden_am: null, bescheid: '' });
  antrag.push({ id: 3, antragsteller_id: 's1', art: 'schnittplatz', status: 'genehmigt', daten: { datum: tag(2).slice(0, 10), von: '15:00', bis: '18:00', zweck: 'Rohschnitt Imagefilm Gruppe 1' }, datei_id: null, eingereicht_am: tag(-3, 11, 5), bearbeitet_von: 'v1', entschieden_am: tag(-2, 9, 30), bescheid: 'Schnittplatz 2 ist für euch reserviert. Bitte den Schlüssel im Studienbüro abholen.' });
  raum_reservierung.push({ id: 1, raum_id: 5, user_id: 's1', beginn: tag(2, 15, 0), ende: tag(2, 18, 0), zweck: 'Rohschnitt Imagefilm Gruppe 1', antrag_id: 3 });
  neueMitteilung({ absender_id: 'v1', anlass: 'antrag', titel: 'Antrag genehmigt: Schnittplatz', text: 'Schnittplatz 2 ist für euch reserviert. Bitte den Schlüssel im Studienbüro abholen.', erstellt_am: tag(-2, 9, 30), link: '#/service/antraege/3' }, ['s1'], ['s1']);
  neueMitteilung({ absender_id: 's4', anlass: 'neuigkeit', titel: 'Neuer Antrag: Fristverlängerung', text: 'Can Yilmaz hat einen Antrag gestellt (Medienkonvergenz und Social Media).', erstellt_am: tag(-1, 19, 22), link: '#/antraege/1' }, ['v1']);
  neueMitteilung({ absender_id: 's3', anlass: 'neuigkeit', titel: 'Neuer Antrag: Schnittplatz', text: 'Mira Schulz möchte einen Schnittplatz im Medienlabor reservieren.', erstellt_am: tag(0, 7, 45), link: '#/antraege/2' }, ['v1']);

  return { version: 4, antrag, pruefung_ausnahme, anerkennung, raum_reservierung, user, studiengang, studiengruppe, gruppenmitglied, semester, vorlesungsfreie_zeit, modul, kurs, lehrauftrag, raum, termin, datei, material, abschnitt, pruefung, abgabe, abgabe_mitglied, abgabeversion, note, schwerpunkt_wahl, mitteilung, zustellung, einstellungen: {}, service };
}

// Zerlegt Text in Abschnitte von etwa 500 bis 900 Zeichen entlang der Absätze (für die Suche des Assistenten).
function zerlegeInAbschnitte(text) {
  const absaetze = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const teile = [];
  let aktuell = '';
  absaetze.forEach(a => {
    if (aktuell && (aktuell.length + a.length) > 900) { teile.push(aktuell); aktuell = ''; }
    aktuell = aktuell ? aktuell + '\n\n' + a : a;
  });
  if (aktuell) teile.push(aktuell);
  return teile;
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
