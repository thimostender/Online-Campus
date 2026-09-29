// Beispieldaten. Aufbau und Namen folgen dem ER-Modell (er-modell.mmd).
// Module nach der Modulstruktur BWL (B.A.), Berufsakademie Lüneburg, Stand 11.07.2023.
// Termine und Fristen werden relativ zum Erzeugungstag angelegt und wandern danach
// täglich mit (siehe datumVerschieben in app.js), damit Änderungen erhalten bleiben.

const ANLAESSE = [
  { id: 'aenderung', name: 'Termin neu, verlegt, Raum geändert, Ausfall', std: { campus: true, push: true, email: true } },
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
const BEREICHE = {
  KOMM: 'Kommunikation in Wissenschaft und Praxis', PROP: 'Propädeutik', WERT: 'Wertschöpfung', MGMT: 'Management',
  SBWL: 'Spezielle Betriebswirtschaftslehre', VWL: 'Volkswirtschaftslehre', RECHT: 'Recht', PTP: 'Praxis-Transfer-Projekte', ABSCHLUSS: 'Abschlussarbeit',
};
const WAHLFAECHER = { 1: 'WF 1 · Marketing', 2: 'WF 2 · Controlling' };

// Modulstruktur: [Nr., Kürzel, Titel, Kurztitel, Bereich, Plansemester, UE, Workload, CP, Wahlfach]
const MODULSTRUKTUR = [
  ['1', 'MWA', 'Methoden des wissenschaftlichen Arbeitens', '', 'KOMM', 1],
  ['2', 'BEB', 'Business English Basics', '', 'KOMM', 2],
  ['3', 'BEP', 'Business English Presentation Skills and Communication', 'Business English Presentation', 'KOMM', 3],
  ['4', 'EBW', 'Einführung in die Betriebswirtschaftslehre', 'Einführung in die BWL', 'PROP', 1],
  ['5', 'MAT', 'Mathematik', '', 'PROP', 1],
  ['6', 'STA', 'Beschreibende und schließende Statistik', 'Statistik', 'PROP', 2],
  ['7', 'FIB', 'Finanzbuchhaltung', '', 'WERT', 1],
  ['8', 'LBS', 'Leistungsbeschaffung', '', 'WERT', 2],
  ['9', 'LES', 'Leistungserstellung', '', 'WERT', 2],
  ['10', 'KOR', 'Kostenrechnung', '', 'WERT', 3],
  ['11', 'BIL', 'Bilanzierung', '', 'WERT', 3],
  ['12', 'MKG', 'Verhaltens- und Informationsgrundlagen des Marketing', 'Marketing-Grundlagen', 'WERT', 3],
  ['13', 'IUF', 'Investition und Finanzierung', '', 'WERT', 4],
  ['14', 'PEW', 'Personalwirtschaft', '', 'WERT', 4],
  ['15', 'TWW', 'Theorien der Wirtschaftswissenschaften', '', 'WERT', 5],
  ['16', 'BST', 'Betriebswirtschaftliche Steuerlehre', 'Steuerlehre', 'WERT', 6],
  ['17', 'DEU', 'Digitale Entscheidungsunterstützung – Operations Research und Business Intelligence', 'Digitale Entscheidungsunterstützung', 'MGMT', 3],
  ['18', 'WET', 'Wirtschaftsethik', '', 'MGMT', 4],
  ['19', 'KMC', 'Kostenmanagement und Controlling', '', 'MGMT', 4],
  ['20', 'MPB', 'Marketingpolitiken B2C und B2B', '', 'MGMT', 4],
  ['21', 'PAP', 'Projektanalyse und Projektplanung', '', 'MGMT', 4],
  ['22', 'PDK', 'Projektdurchführung und Projektkontrolle', '', 'MGMT', 5],
  ['23', 'HRM', 'Human Resource Management und Führung', 'HRM und Führung', 'MGMT', 5],
  ['24', 'ORG', 'Organisation', '', 'MGMT', 5],
  ['25 (1)', 'MFM', 'Anwendung und Erprobung qualitativer und quantitativer Marktforschungsmethoden', 'Marktforschungsmethoden', 'SBWL', 5, 40, 150, 5, 1],
  ['26 (1)', 'SMM', 'Strategisches Marketingmanagement', '', 'SBWL', 6, 40, 150, 5, 1],
  ['27 (1)', 'INM', 'Innovationsmanagement', '', 'SBWL', 6, 40, 150, 5, 1],
  ['25 (2)', 'SCO', 'Strategisches Controlling', '', 'SBWL', 5, 40, 150, 5, 2],
  ['26 (2)', 'OCO', 'Operatives Controlling', '', 'SBWL', 6, 40, 150, 5, 2],
  ['27 (2)', 'BCO', 'Bereichs-Controlling', '', 'SBWL', 6, 40, 150, 5, 2],
  ['28', 'MIK', 'Mikroökonomie', '', 'VWL', 1],
  ['29', 'MAK', 'Makroökonomie', '', 'VWL', 2],
  ['30', 'WSP', 'Wirtschafts- und Sozialpolitik', '', 'VWL', 5],
  ['31', 'VOK', 'Verhaltensökonomie', '', 'VWL', 6],
  ['32', 'GRW', 'Grundlagen Recht der Wirtschaft', '', 'RECHT', 1],
  ['33', 'VRW', 'Vertiefung Recht der Wirtschaft', '', 'RECHT', 2],
  ['34', 'ARB', 'Arbeitsrecht', '', 'RECHT', 3],
  ['35', 'BAK', 'Bachelorarbeit und Kolloquium', '', 'ABSCHLUSS', 6, 0, 300, 10],
  ...[1, 2, 3, 4, 5, 6].map(n => ['', 'PT' + n, `Praxistransfer des ${n}. Semesters`, `Praxistransfer ${n}`, 'PTP', n, 30, 0, 0]),
];
const BESCHREIBUNG = {
  BEP: 'Präsentieren und Verhandeln auf Englisch: Aufbau von Präsentationen, Signposting, Umgang mit Fragen, Meetings und E-Mails im Geschäftsalltag.',
  KOR: 'Kostenarten-, Kostenstellen- und Kostenträgerrechnung, Betriebsabrechnungsbogen, Deckungsbeitragsrechnung und Break-even-Analyse.',
  BIL: 'Jahresabschluss nach HGB: Aufbau von Bilanz und GuV, Ansatz- und Bewertungsvorschriften, Grundsätze ordnungsmäßiger Buchführung.',
  MKG: 'Käuferverhalten, S-O-R-Modell, Kaufentscheidungstypen und die Methoden der Marktforschung als Grundlage für Marketingentscheidungen.',
  DEU: 'Lineare Optimierung und Simplex-Verfahren, Business Intelligence, ETL-Prozess und Dashboards. Gruppenprojekt zu einem Dashboard für den Praxisbetrieb.',
  ARB: 'Individualarbeitsrecht: Arbeitsvertrag, Pflichten, Urlaub, Kündigungsfristen und Kündigungsschutz, Grundzüge des kollektiven Arbeitsrechts.',
  PT3: 'Transfer der Inhalte des 3. Semesters auf eine Fragestellung im Ausbildungsbetrieb, dokumentiert im Praxistransferbericht.',
};

function erzeugeDaten(heute = new Date()) {
  const tag = (versatz, h = 0, m = 0) => { const d = new Date(heute); d.setHours(h, m, 0, 0); d.setDate(d.getDate() + versatz); return d.toISOString(); };
  const wt = (heute.getDay() + 6) % 7; // Montag der aktuellen Woche
  const mo = (woche, plus, h, m) => tag(-wt + woche * 7 + plus, h, m);
  const zufall = text => parseInt(pseudoHash(text).slice(0, 8), 16) / 0xffffffff; // stabil, nicht zufällig

  const user = [
    { id: 's1', vorname: 'Lena', nachname: 'Hoffmann', email: 'lena.hoffmann@campus.example', rolle: 'studierend', matrikelnummer: '2025-0142', aktiv: true },
    { id: 's2', vorname: 'Jonas', nachname: 'Weber', email: 'jonas.weber@campus.example', rolle: 'studierend', matrikelnummer: '2025-0157', aktiv: true },
    { id: 's3', vorname: 'Mira', nachname: 'Schulz', email: 'mira.schulz@campus.example', rolle: 'studierend', matrikelnummer: '2025-0163', aktiv: true },
    { id: 's4', vorname: 'Can', nachname: 'Yilmaz', email: 'can.yilmaz@campus.example', rolle: 'studierend', matrikelnummer: '2025-0171', aktiv: true },
    { id: 's5', vorname: 'Sophie', nachname: 'Krüger', email: 'sophie.krueger@campus.example', rolle: 'studierend', matrikelnummer: '2025-0188', aktiv: true },
    { id: 'l1', vorname: 'Katrin', nachname: 'Brandt', titel: 'Prof. Dr.', email: 'k.brandt@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l2', vorname: 'Martin', nachname: 'Keller', titel: 'Dr.', email: 'm.keller@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l3', vorname: 'Sabine', nachname: 'Ohlsen', titel: '', email: 's.ohlsen@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l4', vorname: 'Emily', nachname: 'Carter', titel: '', email: 'e.carter@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'l5', vorname: 'Jan', nachname: 'Petersen', titel: 'Dr.', email: 'j.petersen@campus.example', rolle: 'lehrend', aktiv: true },
    { id: 'v1', vorname: 'Petra', nachname: 'Lange', email: 'p.lange@campus.example', rolle: 'verwaltung', aktiv: true },
  ];
  const studis = ['s1', 's2', 's3', 's4', 's5'];

  const studiengang = [{ id: 1, name: 'Betriebswirtschaftslehre', abschluss: 'Bachelor of Arts', einrichtung: 'Berufsakademie Lüneburg', ects_gesamt: 180, semester: 6 }];
  const studiengruppe = [{ id: 1, studiengang_id: 1, name: 'BWL-2025-A', standort: 'Lüneburg' }];
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

  const modul = MODULSTRUKTUR.map(([nr, kuerzel, titel, kurz, bereich, plansemester, ue = 40, workload = 150, ects = 5, wahlfach = null], i) => ({
    id: i + 1, nr, kuerzel, titel, kurztitel: kurz || titel, bereich, plansemester, ue, workload, ects, wahlfach,
    beschreibung: BESCHREIBUNG[kuerzel] || `Modul ${nr ? nr + ' ' : ''}im Bereich ${BEREICHE[bereich]}, vorgesehen im ${plansemester}. Semester.`,
  }));
  const M = k => modul.find(m => m.kuerzel === k).id;

  // Kurse: Semester 1 und 2 abgeschlossen, Semester 3 aktuell. Kurs-ID = Modul-ID im aktuellen Semester,
  // damit Links wie #/module/12 lesbar bleiben; frühere Kurse bekommen IDs ab 100.
  const kurs = [], lehrauftrag = [];
  const aktuelle = ['BEP', 'KOR', 'BIL', 'MKG', 'DEU', 'ARB', 'PT3'];
  const lehrende = { BEP: 'l4', KOR: 'l2', BIL: 'l2', MKG: 'l1', DEU: 'l3', ARB: 'l5', PT3: 'l1' };
  aktuelle.forEach(k => { kurs.push({ id: M(k), modul_id: M(k), gruppe_id: 1, semester_id: 3 }); lehrauftrag.push({ kurs_id: M(k), lehrender_id: lehrende[k], rolle: 'verantwortlich' }); });
  const frueher = modul.filter(m => m.plansemester <= 2);
  const reihum = ['l1', 'l2', 'l5', 'l3', 'l4'];
  frueher.forEach((m, i) => { const id = 100 + i; kurs.push({ id, modul_id: m.id, gruppe_id: 1, semester_id: m.plansemester }); lehrauftrag.push({ kurs_id: id, lehrender_id: reihum[i % 5], rolle: 'verantwortlich' }); });

  const raum = [
    { id: 1, standort: 'Lüneburg', bezeichnung: 'Raum 2.04', plaetze: 30, x: 20, y: 20, w: 120, h: 80 },
    { id: 2, standort: 'Lüneburg', bezeichnung: 'Raum 3.11', plaetze: 28, x: 150, y: 20, w: 120, h: 80 },
    { id: 3, standort: 'Lüneburg', bezeichnung: 'Hörsaal A', plaetze: 120, x: 20, y: 110, w: 250, h: 90 },
    { id: 4, standort: 'Lüneburg', bezeichnung: 'PC-Labor 1.08', plaetze: 24, x: 280, y: 20, w: 120, h: 180 },
  ];

  // Wochenplan: Mo Marketing, Di Kostenrechnung/Bilanzierung, Mi DEU/Arbeitsrecht, Do Business English online,
  // Sa jede zweite Woche Begleitseminar Praxistransfer (online)
  const termin = [];
  let tid = 1;
  const neu = (k, raum_id, beginn, ende, art = 'Vorlesung') => { const t = { id: tid++, kurs_id: M(k), raum_id, vertretung_id: null, beginn, ende, art, online_link: raum_id ? null : 'https://meet.example/' + k.toLowerCase(), status: 'geplant' }; termin.push(t); return t; };
  for (let w = -2; w <= 8; w++) {
    neu('MKG', 1, mo(w, 0, 18, 0), mo(w, 0, 21, 15));
    neu(w % 2 ? 'BIL' : 'KOR', 3, mo(w, 1, 18, 0), mo(w, 1, 21, 15));
    w % 2 ? neu('ARB', 2, mo(w, 2, 18, 0), mo(w, 2, 21, 15)) : neu('DEU', 4, mo(w, 2, 18, 0), mo(w, 2, 21, 15));
    neu('BEP', null, mo(w, 3, 18, 0), mo(w, 3, 19, 30), 'Online');
    if (w % 2) neu('PT3', null, mo(w, 5, 9, 0), mo(w, 5, 12, 15), 'Online');
  }
  const finde = (k, iso) => termin.find(t => t.kurs_id === M(k) && t.beginn === iso);
  const mittwoch = finde('DEU', mo(0, 2, 18, 0));
  mittwoch.status = 'verlegt'; mittwoch.raum_id = 2; mittwoch.hinweis = 'Raum geändert: statt PC-Labor 1.08 jetzt Raum 3.11';
  const naechsterMo = finde('MKG', mo(1, 0, 18, 0));
  naechsterMo.status = 'ausgefallen'; naechsterMo.hinweis = 'Fällt krankheitsbedingt aus, Nachholtermin folgt';
  const vertretung = finde('MKG', mo(2, 0, 18, 0));
  vertretung.vertretung_id = 'l2'; vertretung.hinweis = 'Vertretung durch Dr. Martin Keller';
  neu('KOR', 3, tag(20, 9, 0), tag(20, 11, 0), 'Klausur');
  neu('BIL', 3, tag(34, 9, 0), tag(34, 11, 0), 'Klausur');

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
  neuesMaterial('MKG', 'mkg1', 'MKG_01_Kaeuferverhalten.pdf', 'l1', tag(-20));
  neuesMaterial('MKG', 'mkg2', 'MKG_02_Marktforschung.pdf', 'l1', tag(-6));
  neuesMaterial('MKG', 'mkgHa', 'MKG_Aufgabenstellung_Hausarbeit.pdf', 'l1', tag(-14));
  neuesMaterial('KOR', 'kor1', 'KOR_Skript_Kap1-3.pdf', 'l2', tag(-25));
  neuesMaterial('KOR', 'kor2', 'KOR_Uebungsklausur.pdf', 'l2', tag(-1));
  neuesMaterial('BIL', 'bil1', 'BIL_Bilanz_HGB.pdf', 'l2', tag(-18));
  neuesMaterial('DEU', 'deu1', 'DEU_Lineare_Optimierung.pdf', 'l3', tag(-21));
  neuesMaterial('DEU', 'deu2', 'DEU_Business_Intelligence.pdf', 'l3', tag(-9));
  neuesMaterial('ARB', 'arb1', 'ARB_Kuendigung.pdf', 'l5', tag(-26));
  neuesMaterial('BEP', 'bep1', 'BEP_Presentation_Skills.pdf', 'l4', tag(-24));
  neuesMaterial('PT3', 'ptp1', 'PTP_Leitfaden_Bericht.pdf', 'l1', tag(-26));
  neuesMaterial(kurs.find(k => k.modul_id === M('MWA')).id, 'mwa1', 'MWA_Zitieren_APA7.pdf', 'l1', '2025-09-15T08:00:00.000Z');

  // Prüfungen im aktuellen Semester
  const pruefung = [];
  const neuePruefung = (k, p) => { const id = pruefung.length + 1; pruefung.push({ id, kurs_id: M(k), gruppenarbeit: false, gewicht: 1, ...p }); return id; };
  const pMKG = neuePruefung('MKG', { art: 'Hausarbeit', titel: 'Hausarbeit: Käuferverhalten in der Zielgruppe des Praxisbetriebs', frist: tag(9, 23, 59), mit_upload: true, max_mb: 100, formate: 'pdf' });
  neuePruefung('KOR', { art: 'Klausur', titel: 'Klausur Kostenrechnung (120 Minuten)', frist: tag(20, 9, 0), mit_upload: false, max_mb: 0, formate: '' });
  const pDEU = neuePruefung('DEU', { art: 'Projekt', titel: 'Gruppenprojekt: Dashboard-Konzept für den Praxisbetrieb', frist: tag(3, 23, 59), mit_upload: true, gruppenarbeit: true, max_mb: 2000, formate: 'pdf, zip, mp4' });
  const pBEP = neuePruefung('BEP', { art: 'Referat', titel: 'Presentation with handout', frist: tag(-18, 18, 0), mit_upload: true, max_mb: 100, formate: 'pdf, pptx' });
  const pARB = neuePruefung('ARB', { art: 'Hausarbeit', titel: 'Fallbearbeitung: Kündigung und Kündigungsschutz', frist: tag(-12, 23, 59), mit_upload: true, max_mb: 100, formate: 'pdf, docx' });
  neuePruefung('BIL', { art: 'Klausur', titel: 'Klausur Bilanzierung (90 Minuten)', frist: tag(34, 9, 0), mit_upload: false, max_mb: 0, formate: '' });
  neuePruefung('PT3', { art: 'PTP', titel: 'Praxistransferbericht 3. Semester', frist: tag(45, 23, 59), mit_upload: true, max_mb: 100, formate: 'pdf' });
  void pMKG; void pDEU;

  const abgabe = [], abgabe_mitglied = [], abgabeversion = [], note = [];
  const neueAbgabe = (pid, mitglieder, versionen, verspaetet = false) => {
    const id = abgabe.length + 1, letzte = versionen[versionen.length - 1];
    abgabe.push({ id, pruefung_id: pid, status: 'eingereicht', eingereicht_am: letzte.am, verspaetet, erklaerung_am: letzte.am });
    mitglieder.forEach(u => abgabe_mitglied.push({ abgabe_id: id, student_id: u }));
    versionen.forEach((v, i) => abgabeversion.push({ id: abgabeversion.length + 1, abgabe_id: id, nummer: i + 1, datei_id: neueDatei(v.name, v.mime || 'application/pdf', v.groesse || 0, v.von, v.am, v.ohneInhalt ? { ohne_inhalt: true } : { erzeugen: { art: 'abgabe', titel: v.titel || v.name, von: v.von } }), hochgeladen_am: v.am }));
    return id;
  };
  // BEP: alle abgegeben, bewertet, freigegeben; für Lena und Mira schon bestätigt
  const bepNoten = { s1: 1.7, s2: 2.0, s3: 1.3, s4: 2.7, s5: 2.3 };
  Object.entries(bepNoten).forEach(([u, wert]) => {
    const a = neueAbgabe(pBEP, [u], [{ name: `Presentation_Handout_${u}.pdf`, von: u, am: tag(-19, 20, 10), titel: 'Presentation handout' }]);
    abgabe[a - 1].status = 'bewertet';
    note.push({ id: note.length + 1, pruefung_id: pBEP, student_id: u, abgabe_id: a, wert, feedback: u === 's1' ? 'Very clear structure and good use of signposting. Your handout is missing the sources on page 2, therefore not 1.3.' : 'Solid presentation.', bewertet_von: 'l4', freigegeben_am: tag(-9), bestaetigt_am: u === 's1' || u === 's3' ? tag(-4) : null });
  });
  // ARB: abgegeben, von Dr. Petersen teilweise bewertet (Entwurf, noch nicht freigegeben)
  ['s1', 's2', 's3', 's4'].forEach(u => {
    const a = neueAbgabe(pARB, [u], [{ name: `Fallbearbeitung_Arbeitsrecht_${u}.pdf`, von: u, am: tag(-13 + (u === 's4' ? 2 : 0), 21, 30), titel: 'Fallbearbeitung Arbeitsrecht' }], u === 's4');
    if (u === 's1' || u === 's2') note.push({ id: note.length + 1, pruefung_id: pARB, student_id: u, abgabe_id: a, wert: u === 's1' ? 2.3 : 1.7, feedback: u === 's1' ? 'Kündigungsfrist richtig berechnet. Die Prüfung der sozialen Rechtfertigung nach § 1 KSchG ist zu knapp.' : 'Gute, vollständige Prüfung.', bewertet_von: 'l5', freigegeben_am: null, bestaetigt_am: null });
  });
  // DEU: Gruppe Lena + Jonas hat Version 1 hochgeladen, Gruppe 2 zwei Dateien (Video nur als Metadaten)
  neueAbgabe(pDEU, ['s1', 's2'], [{ name: 'DEU_Gruppe1_Dashboard-Konzept_v1.pdf', von: 's2', am: tag(-2, 22, 5), titel: 'Dashboard-Konzept Gruppe 1' }]);
  neueAbgabe(pDEU, ['s3', 's4', 's5'], [
    { name: 'DEU_Gruppe2_Konzept.pdf', von: 's3', am: tag(-3, 19, 40), titel: 'Dashboard-Konzept Gruppe 2' },
    { name: 'DEU_Gruppe2_Demo.mp4', mime: 'video/mp4', groesse: 812_000_000, von: 's5', am: tag(-1, 23, 12), ohneInhalt: true },
  ]);

  // Frühere Semester: je Kurs eine Prüfung mit bestätigter Note für alle
  const lenaNoten = { MWA: 1.3, EBW: 2.0, MAT: 2.7, FIB: 1.7, MIK: 2.3, GRW: 2.0, PT1: 1.7, BEB: 1.3, STA: 3.0, LBS: 2.0, LES: 1.7, MAK: 2.3, VRW: 2.7, PT2: 1.3 };
  const stufen = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7];
  kurs.filter(k => k.id >= 100).forEach(k => {
    const m = modul.find(x => x.id === k.modul_id), sem = semester.find(s => s.id === k.semester_id);
    const art = m.bereich === 'PTP' ? 'PTP' : ['MWA'].includes(m.kuerzel) ? 'Hausarbeit' : m.kuerzel === 'BEB' ? 'Referat' : 'Klausur';
    const frist = new Date(sem.ende + 'T09:00:00'); frist.setDate(frist.getDate() - 20 - (k.id % 10));
    const pid = pruefung.length + 1;
    pruefung.push({ id: pid, kurs_id: k.id, art, titel: `${art} ${m.kurztitel}`, frist: frist.toISOString(), mit_upload: false, gruppenarbeit: false, max_mb: 0, formate: '', gewicht: 1, historisch: true });
    const freigabe = new Date(frist); freigabe.setDate(freigabe.getDate() + 21);
    const bestaetigt = new Date(freigabe); bestaetigt.setDate(bestaetigt.getDate() + 7);
    studis.forEach(u => {
      const wert = u === 's1' ? lenaNoten[m.kuerzel] : stufen[Math.floor(zufall(u + m.kuerzel) * stufen.length)];
      note.push({ id: note.length + 1, pruefung_id: pid, student_id: u, abgabe_id: null, wert, feedback: '', bewertet_von: lehrauftrag.find(l => l.kurs_id === k.id).lehrender_id, freigegeben_am: freigabe.toISOString(), bestaetigt_am: bestaetigt.toISOString() });
    });
  });

  const wahlpflicht_wahl = [{ user_id: 's3', wahlfach: 1, gewaehlt_am: tag(-4, 20, 0) }];

  const mitteilung = [], zustellung = [];
  const neueMitteilung = (m, empfaenger, gelesen = []) => {
    const id = mitteilung.length + 1;
    mitteilung.push({ id, kurs_id: null, gruppe_id: null, termin_id: null, pruefung_id: null, wichtig: false, ...m });
    empfaenger.forEach(u => zustellung.push({ mitteilung_id: id, empfaenger_id: u, kanal: 'campus', gesendet_am: m.erstellt_am, gelesen_am: gelesen.includes(u) ? m.erstellt_am : null }));
  };
  neueMitteilung({ absender_id: 'v1', anlass: 'neuigkeit', titel: 'Bibliothek samstags länger geöffnet', text: 'Ab sofort hat die Bibliothek samstags bis 18 Uhr geöffnet, auch während der Prüfungsphase.', erstellt_am: tag(-8, 10, 0) }, studis, studis);
  neueMitteilung({ absender_id: 'l4', anlass: 'note', titel: 'Note freigegeben: Business English Presentation', text: 'Für deine Präsentation liegt eine Note vor. Du findest sie im Modul unter Ergebnis.', erstellt_am: tag(-9, 16, 0), kurs_id: M('BEP'), pruefung_id: pBEP }, studis, studis);
  neueMitteilung({ absender_id: 'l1', anlass: 'material', titel: 'Neues Material in Marketing-Grundlagen', text: 'Folien 2: Marktforschung – Primär- und Sekundärforschung sind online.', erstellt_am: tag(-6, 12, 0), kurs_id: M('MKG') }, studis, ['s2', 's3']);
  neueMitteilung({ absender_id: 'l3', anlass: 'aenderung', titel: 'Raumänderung Digitale Entscheidungsunterstützung', text: mittwoch.hinweis + '. Grund: Das PC-Labor wird gewartet.', erstellt_am: tag(-1, 17, 5), kurs_id: M('DEU'), termin_id: mittwoch.id }, studis, []);
  neueMitteilung({ absender_id: 'l2', anlass: 'material', titel: 'Übungsklausur Kostenrechnung online', text: 'Die Übungsklausur mit Lösungen liegt unter Materialien.', erstellt_am: tag(-1, 9, 30), kurs_id: M('KOR') }, studis, []);
  neueMitteilung({ absender_id: 'l1', anlass: 'aenderung', titel: 'Marketing-Grundlagen fällt nächsten Montag aus', text: naechsterMo.hinweis + '.', erstellt_am: tag(0, 8, 15), kurs_id: M('MKG'), termin_id: naechsterMo.id }, studis, []);

  const service = {
    ansprechpersonen: [
      { id: 1, name: 'Petra Lange', aufgabe: 'Studienbüro: Anmeldung, Bescheinigungen, Fristverlängerung', email: 'studienbuero@campus.example', telefon: '04131 123 456-10', zeiten: 'Mo–Do 9–16 Uhr, Fr 9–13 Uhr' },
      { id: 2, name: 'Thomas Reimers', aufgabe: 'Prüfungsamt: Noten, Wiederholungsprüfungen, Anerkennung', email: 'pruefungsamt@campus.example', telefon: '04131 123 456-20', zeiten: 'Di und Do 10–15 Uhr' },
      { id: 3, name: 'IT-Support', aufgabe: 'Zugang, Passwort, Probleme beim Hochladen', email: 'it@campus.example', telefon: '04131 123 456-99', zeiten: 'Mo–Fr 8–20 Uhr, Sa 8–14 Uhr' },
    ],
    faq: [
      { frage: 'Mein Upload bricht ab. Was nun?', antwort: 'Der Upload läuft in Teilen und setzt nach einem Abbruch an derselben Stelle fort. Lade die Seite einfach neu und wähle dieselbe Datei. Was bis zur Frist hochgeladen war, zählt.' },
      { frage: 'Kann ich nach dem Einreichen noch etwas ändern?', antwort: 'Ja, bis zur Frist. Jeder Upload wird eine neue Version, frühere Versionen bleiben erhalten. Bewertet wird die letzte Version vor der Frist.' },
      { frage: 'Warum steht die Note nicht in der E-Mail?', antwort: 'Noten sind personenbezogene Daten. Die E-Mail enthält nur einen Hinweis, die Note selbst siehst du nach der Anmeldung.' },
      { frage: 'Was bedeutet „vorläufig“ bei meiner Note?', antwort: 'Die Lehrenden haben die Note freigegeben, das Prüfungsamt hat sie aber noch nicht endgültig bestätigt. Auf Bescheinigungen erscheinen nur bestätigte Noten.' },
      { frage: 'Wie bekomme ich den Stundenplan in meinen Kalender?', antwort: 'Unter Stundenplan auf „Kalender abonnieren“ tippen. Änderungen erscheinen dann automatisch in Outlook, Google oder Apple Kalender.' },
      { frage: 'Wann und wie wähle ich mein Wahlfach?', antwort: 'Ab dem 5. Semester belegst du entweder WF 1 Marketing oder WF 2 Controlling. Die Wahl triffst du unter Leistungen im Studienverlauf, spätestens bis zum Ende des 4. Semesters.' },
      { frage: 'Was ist ein Praxistransfer-Projekt?', antwort: 'In jedem Semester verbindest du die Inhalte mit einer Fragestellung aus deinem Ausbildungsbetrieb und schreibst dazu einen Praxistransferbericht. Den Leitfaden findest du im Modul Praxistransfer.' },
    ],
    formulare: ['Antrag auf Fristverlängerung', 'Antrag auf Anerkennung von Leistungen', 'Attest bei Prüfungsunfähigkeit', 'Adressänderung'],
  };

  return { version: 2, user, studiengang, studiengruppe, gruppenmitglied, semester, vorlesungsfreie_zeit, modul, kurs, lehrauftrag, raum, termin, datei, material, abschnitt, pruefung, abgabe, abgabe_mitglied, abgabeversion, note, wahlpflicht_wahl, mitteilung, zustellung, einstellungen: {}, service };
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
