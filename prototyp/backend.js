'use strict';
// Anbindung an Firebase (Authentication + Firestore).
// Prinzip: Der Campus arbeitet weiter mit dem Zwischenspeicher `db`. Nach dem Anmelden kommen die
// Daten aus Firestore (nur, was die Regeln dieser Person erlauben) und bleiben über Echtzeit-Abos
// aktuell. `speichern()` schreibt alle Änderungen gegenüber dem letzten Stand zurück.
// Ohne Firebase (oder mit ?lokal in der Adresse) läuft alles wie bisher nur im Browser.

const FIREBASE_KONFIG = {
  apiKey: 'AIzaSyBQBfUUYxZRvrCaptccG1_LnK27HKyM-_w',
  authDomain: 'online-campus-mit.firebaseapp.com',
  projectId: 'online-campus-mit',
  storageBucket: 'online-campus-mit.firebasestorage.app',
  messagingSenderId: '486047562424',
  appId: '1:486047562424:web:49da49f89ab3459d42924d',
};
// Gemeinsames Passwort der fiktiven Demo-Konten (Prototyp, keine echten Personen)
const DEMO_PASSWORT = 'Campus-d945cc52-Demo';

const BACKEND = { aktiv: false, fs: null, auth: null, abos: [], stand: {}, geladen: false, schreibt: false };
// Tabellen mit zusammengesetztem Schlüssel statt eigener ID
const SCHLUESSEL = {
  gruppenmitglied: r => `${r.user_id}_${r.gruppe_id}`,
  lehrauftrag: r => `${r.kurs_id}_${r.lehrender_id}`,
  abgabe_mitglied: r => `${r.abgabe_id}_${r.student_id}`,
  zustellung: r => `${r.mitteilung_id}_${r.empfaenger_id}_${r.kanal}`,
  schwerpunkt_wahl: r => r.user_id,
  pruefung_ausnahme: r => `${r.pruefung_id}_${r.student_id}_${r.art}`,
  evaluation_teilnahme: r => `${r.kurs_id}_${r.student_id}`,
  umfrage_teilnahme: r => `${r.umfrage_id}_${r.student_id}`,
};
const TABELLEN = ['user', 'studiengang', 'studiengruppe', 'gruppenmitglied', 'schwerpunkt_wahl', 'semester', 'vorlesungsfreie_zeit', 'modul', 'kurs', 'lehrauftrag', 'raum', 'termin', 'datei', 'material', 'abschnitt', 'pruefung', 'abgabe', 'abgabe_mitglied', 'abgabeversion', 'note', 'pruefung_ausnahme', 'anerkennung', 'raum_reservierung', 'antrag', 'mitteilung', 'zustellung', 'evaluation_teilnahme', 'evaluation_antwort', 'umfrage', 'umfrage_teilnahme', 'umfrage_stimme', 'chat_nachricht'];
const docId = (tab, r) => SCHLUESSEL[tab] ? SCHLUESSEL[tab](r) : String(r.id);
// JSON mit fester Feldreihenfolge: Firestore liefert Felder in eigener Reihenfolge zurück,
// ein Vergleich ohne Sortierung hielte unveränderte Dokumente für geändert
function stabil(wert) {
  if (Array.isArray(wert)) return '[' + wert.map(stabil).join(',') + ']';
  if (wert && typeof wert === 'object') return '{' + Object.keys(wert).sort().filter(k => wert[k] !== undefined).map(k => JSON.stringify(k) + ':' + stabil(wert[k])).join(',') + '}';
  return JSON.stringify(wert ?? null);
}
const fingerabdruck = (tab, r) => stabil(zuDokument(tab, r));
// Felder, die nur für die Regeln da sind
function zuDokument(tab, r) {
  const d = JSON.parse(JSON.stringify(r));
  if (tab === 'note') d.freigegeben = !!r.freigegeben_am;
  return d;
}
function ausDokument(tab, d) { const r = { ...d }; if (tab === 'note') delete r.freigegeben; return r; }

function backendStarten() {
  if (!window.firebase || new URLSearchParams(location.search).has('lokal')) return false;
  firebase.initializeApp(FIREBASE_KONFIG);
  BACKEND.fs = firebase.firestore();
  BACKEND.auth = firebase.auth();
  BACKEND.aktiv = true;
  BACKEND.auth.onAuthStateChanged(async nutzer => {
    abosBeenden();
    if (!nutzer) { db = erzeugeDaten(new Date()); db.sitzung = null; BACKEND.geladen = false; render(); return; }
    // Zwischenspeicher leeren: Platzhalter der Anmeldeseite oder Daten der vorherigen Sitzung
    // dürfen nicht als ungespeicherte Änderungen gelten und zum Server geschrieben werden
    TABELLEN.forEach(tab => { db[tab] = []; });
    db.einstellungen = {};
    BACKEND.geladen = false;
    db.sitzung = nutzer.uid;
    zeigeLaden('Daten werden geladen …');
    try { await abosStarten(nutzer.uid); }
    catch (e) { console.error(e); toast('Laden fehlgeschlagen', e.message); }
    BACKEND.geladen = true;
    if (!db.user.some(u => u.id === nutzer.uid)) {
      document.getElementById('app').innerHTML = demoLeiste() + `<div class="login"><div class="karte login-karte"><h2>Datenbank ist leer</h2><p>In der gemeinsamen Datenbank liegen gerade keine Daten, zum Beispiel weil ein Zurücksetzen unterbrochen wurde.</p><p>„Mit Beispieldaten füllen“ stellt den Ausgangsstand her, mit Terminen und Fristen passend zu heute. Das dauert etwa eine halbe Minute, bitte die Seite so lange offen lassen.</p>
        <p>${nutzer.uid === 'v1' ? '<button class="knopf primaer" data-action="backend-befuellen">Mit Beispieldaten füllen</button>' : 'Bitte als Petra Lange (Verwaltung) anmelden und die Datenbank füllen.'}</p><button class="knopf" data-action="abmelden">Abmelden</button></div></div>`;
      return;
    }
    fristErinnerungen();
    render();
  });
  return true;
}
function zeigeLaden(text) { document.getElementById('app').innerHTML = demoLeiste() + `<div class="login"><p class="leise">${esc(text)}</p></div>`; }

// Liest alle Tabellen, die diese Rolle sehen darf, und hält sie per Echtzeit-Abo aktuell
async function abosStarten(uid) {
  const fs = BACKEND.fs;
  const profil = (await fs.collection('user').doc(uid).get()).data();
  const r = profil?.rolle;
  const abfrage = tab => {
    const c = fs.collection(tab);
    if (tab === 'zustellung' && r !== 'verwaltung') return c.where('empfaenger_id', '==', uid);
    if (tab === 'note' && r === 'studierend') return c.where('student_id', '==', uid).where('freigegeben', '==', true);
    if (tab === 'antrag' && r === 'studierend') return c.where('antragsteller_id', '==', uid);
    if (tab === 'antrag' && r !== 'verwaltung') return null;
    // Evaluationsantworten sehen Studierende nie; ihre Teilnahme nur selbst
    if (tab === 'evaluation_antwort' && r === 'studierend') return null;
    if (tab === 'evaluation_teilnahme' && r === 'studierend') return c.where('student_id', '==', uid);
    return c;
  };
  const ersteLadung = TABELLEN.map(tab => new Promise((ok, fehler) => {
    const q = abfrage(tab);
    if (!q) { db[tab] = []; BACKEND.stand[tab] = {}; ok(); return; }
    let erst = true;
    BACKEND.abos.push(q.onSnapshot(snap => {
      tabelleUebernehmen(tab, snap.docs.map(d => ausDokument(tab, d.data())));
      if (erst) { erst = false; ok(); } else neuZeichnen(snap.docChanges().filter(c => !c.doc.metadata.hasPendingWrites).length);
    }, e => { if (erst) { erst = false; console.warn(tab, e.message); db[tab] = []; ok(); } }));
  }));
  // Einzelne Dokumente: Einstellungen aller Personen, Service-Inhalte
  BACKEND.abos.push(fs.collection('einstellungen').onSnapshot(snap => { db.einstellungen = Object.fromEntries(snap.docs.map(d => [d.id, d.data()])); Object.entries(db.einstellungen).forEach(([id, e]) => { BACKEND.stand['einstellungen:' + id] = stabil(e); }); }));
  ersteLadung.push(new Promise(ok => { let erst = true; BACKEND.abos.push(fs.collection('service').doc('inhalte').onSnapshot(d => { if (d.exists) { db.service = d.data(); BACKEND.stand.service = stabil(db.service); } if (erst) { erst = false; ok(); } else neuZeichnen(1); }, () => ok())); }));
  await Promise.all(ersteLadung);
}
// Übernimmt den Serverstand einer Tabelle. Vorhandene Objekte werden an Ort und Stelle aktualisiert,
// damit laufende Abläufe (Upload, Textauslese) weiter mit denselben Objekten arbeiten. Eigene Änderungen,
// die noch nicht geschrieben sind (weicht vom letzten Stand ab), bleiben erhalten.
function tabelleUebernehmen(tab, zeilen) {
  const stand = BACKEND.stand[tab] || {}, vorher = new Map((db[tab] || []).map(r => [docId(tab, r), r]));
  const offen = new Set([...vorher].filter(([id, r]) => stand[id] !== fingerabdruck(tab, r)).map(([id]) => id));
  const neu = [], neuerStand = {};
  zeilen.forEach(z => {
    const id = docId(tab, z), alt = vorher.get(id);
    neuerStand[id] = fingerabdruck(tab, z);
    if (alt && offen.has(id)) { neu.push(alt); return; }
    if (alt) { Object.keys(alt).forEach(k => { if (!(k in z)) delete alt[k]; }); Object.assign(alt, z); neu.push(alt); }
    else neu.push(z);
  });
  // Lokal neu angelegte Zeilen, die der Server noch nicht kennt
  offen.forEach(id => { if (!(id in neuerStand)) { neu.push(vorher.get(id)); } });
  db[tab] = neu;
  BACKEND.stand[tab] = neuerStand;
}
function abosBeenden() { BACKEND.abos.forEach(stop => stop()); BACKEND.abos = []; BACKEND.stand = {}; }

// Änderungen anderer: neu zeichnen, aber nie mitten in einer Eingabe, einem Upload oder einer Konferenz
let zeichnenGeplant = null;
function neuZeichnen(anzahl) {
  if (!anzahl || !BACKEND.geladen) return;
  clearTimeout(zeichnenGeplant);
  zeichnenGeplant = setTimeout(function versuche() {
    const fokus = document.activeElement;
    const beschaeftigt = (fokus && fokus.matches('input, textarea, select') && fokus.closest('#inhalt, dialog'))
      || document.getElementById('dialog')?.open || location.hash.startsWith('#/konferenz/')
      || document.querySelector('#fortschritt:not([hidden])');
    // Im Chat nur den Verlauf auffrischen, damit eine angefangene Nachricht nicht verloren geht
    if (/\/chat$/.test(location.hash) && chatAktualisieren()) { pushBenachrichtigen(); return; }
    if (location.hash.startsWith('#/service/lageplan3d')) return;
    if (beschaeftigt) { zeichnenGeplant = setTimeout(versuche, 1500); return; }
    render();
    pushBenachrichtigen();
  }, 250);
}
// Echte Browser-Benachrichtigung für neue Push-Zustellungen an die angemeldete Person
let gemeldet = new Set();
function pushBenachrichtigen() {
  const u = ich();
  if (!u || !('Notification' in window) || Notification.permission !== 'granted') return;
  const neu = db.mitteilung.filter(m => db.zustellung.some(z => z.mitteilung_id === m.id && z.empfaenger_id === u.id && z.kanal === 'push' && !z.gelesen_am) && Date.now() - D(m.erstellt_am) < 5 * 6e4 && !gemeldet.has(m.id));
  neu.forEach(m => { gemeldet.add(m.id); new Notification(m.titel, { body: m.text, tag: 'campus-' + m.id }); });
}

// Schreibt alles, was sich gegenüber dem letzten Stand geändert hat
let schreibWarteschlange = Promise.resolve();
function backendSpeichern() {
  if (!BACKEND.aktiv || !BACKEND.geladen || !db.sitzung) return;
  schreibWarteschlange = schreibWarteschlange.then(schreibeUnterschiede).catch(e => {
    console.error(e);
    toast('Speichern fehlgeschlagen', e.code === 'permission-denied' ? 'Dafür fehlt dieser Rolle die Berechtigung.' : e.message);
  });
  return schreibWarteschlange;
}
async function schreibeUnterschiede() {
  const fs = BACKEND.fs, ops = [];
  TABELLEN.forEach(tab => {
    const alt = BACKEND.stand[tab] || {};
    (db[tab] || []).forEach(r => {
      const id = docId(tab, r), abdruck = fingerabdruck(tab, r);
      // Kein Löschen, nur weil eine Zeile lokal fehlt: Das könnte ein veralteter Stand sein.
      if (alt[id] !== abdruck) ops.push({ ref: fs.collection(tab).doc(id), daten: JSON.parse(JSON.stringify(zuDokument(tab, r))), fertig: () => { (BACKEND.stand[tab] = BACKEND.stand[tab] || {})[id] = abdruck; }, name: `${tab}/${id}` });
    });
  });
  const u = ich();
  if (u && db.einstellungen?.[u.id] && stabil(db.einstellungen[u.id]) !== BACKEND.stand['einstellungen:' + u.id]) {
    const abdruck = stabil(db.einstellungen[u.id]);
    ops.push({ ref: fs.collection('einstellungen').doc(u.id), daten: db.einstellungen[u.id], fertig: () => { BACKEND.stand['einstellungen:' + u.id] = abdruck; }, name: 'einstellungen' });
  }
  if (db.service && stabil(db.service) !== BACKEND.stand.service) {
    const abdruck = stabil(db.service);
    ops.push({ ref: fs.collection('service').doc('inhalte'), daten: db.service, fertig: () => { BACKEND.stand.service = abdruck; }, name: 'service' });
  }
  const abgelehnt = [];
  for (let i = 0; i < ops.length; i += 400) {
    const teil = ops.slice(i, i + 400), b = fs.batch();
    teil.forEach(op => b.set(op.ref, op.daten));
    try { await b.commit(); teil.forEach(op => op.fertig()); }
    catch (e) {
      // Einzeln nachschreiben, damit ein abgelehntes Dokument nicht alle anderen blockiert
      for (const op of teil) {
        try { await op.ref.set(op.daten); op.fertig(); }
        catch (e2) { abgelehnt.push(op.name); op.fertig(); console.warn('Nicht gespeichert:', op.name, e2.code); }
      }
    }
  }
  if (abgelehnt.length) toast('Teilweise nicht gespeichert', `${plural(abgelehnt.length, 'Eintrag', 'Einträge')} ohne Berechtigung: ${abgelehnt.slice(0, 3).join(', ')}`);
}

// Ausdrückliches Löschen einer Zeile (lokal und auf dem Server)
function zeileLoeschen(tab, zeile) {
  db[tab] = db[tab].filter(r => r !== zeile);
  if (!BACKEND.aktiv) return;
  const id = docId(tab, zeile);
  delete BACKEND.stand[tab]?.[id];
  BACKEND.fs.collection(tab).doc(id).delete().catch(e => toast('Löschen fehlgeschlagen', e.message));
}

// ---------- Dateien in Firestore (Stücke zu 700 KB) ----------
const STUECK = 700_000, MAX_FIRESTORE_DATEI = 15e6;
async function backendInhaltSpeichern(id, blob, leser = null) {
  if (blob.size > MAX_FIRESTORE_DATEI) return false;
  const bytes = new Uint8Array(await blob.arrayBuffer()), fs = BACKEND.fs, teile = Math.max(1, Math.ceil(bytes.length / STUECK));
  await fs.collection('datei_inhalt').doc(id).set({ teile, groesse: bytes.length, typ: blob.type || 'application/octet-stream', leser });
  for (let i = 0; i < teile; i++) {
    let bin = '';
    const stueck = bytes.subarray(i * STUECK, (i + 1) * STUECK);
    for (let j = 0; j < stueck.length; j += 8192) bin += String.fromCharCode.apply(null, stueck.subarray(j, j + 8192));
    await fs.collection('datei_inhalt').doc(id).collection('teile').doc(String(i)).set({ daten: btoa(bin) });
  }
  return true;
}
async function backendInhaltLaden(id) {
  const fs = BACKEND.fs, kopf = await fs.collection('datei_inhalt').doc(id).get();
  if (!kopf.exists) return null;
  const { teile, typ } = kopf.data(), stuecke = [];
  for (let i = 0; i < teile; i++) {
    const bin = atob((await fs.collection('datei_inhalt').doc(id).collection('teile').doc(String(i)).get()).data().daten);
    const arr = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
    stuecke.push(arr);
  }
  return new Blob(stuecke, { type: typ });
}

// ---------- Beispieldaten in Firestore schreiben (nur Verwaltung) ----------
async function backendBefuellen() {
  const fs = BACKEND.fs;
  // Echtzeit-Abos zuerst beenden: sonst zeichnet jede Löschung die Seite neu und bremst alles aus
  abosBeenden();
  BACKEND.geladen = false;
  const alle = [...TABELLEN, 'einstellungen', 'service'];
  // Parallel löschen, in Paketen zu 400
  const loeschen = async docs => { const pakete = []; for (let i = 0; i < docs.length; i += 400) { const b = fs.batch(); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); pakete.push(b.commit()); } await Promise.all(pakete); };
  for (let i = 0; i < alle.length; i++) {
    zeigeLaden(`Alte Daten werden gelöscht … ${Math.round((i / alle.length) * 60)} %`);
    await loeschen((await fs.collection(alle[i]).get()).docs);
  }
  const inhalte = (await fs.collection('datei_inhalt').get()).docs;
  zeigeLaden(`Alte Dateien werden gelöscht … ${inhalte.length} Dateien`);
  const teile = (await Promise.all(inhalte.map(d => d.ref.collection('teile').get()))).flatMap(s => s.docs);
  await loeschen([...teile, ...inhalte]);
  zeigeLaden('Beispieldaten werden geschrieben … 70 %');
  db = { ...erzeugeDaten(new Date()), sitzung: 'v1' };
  BACKEND.stand = {};
  BACKEND.geladen = true;
  await schreibeUnterschiede();
  zeigeLaden('Beispieldateien werden erzeugt … 85 %');
  await beispielDateienErzeugen();
  await schreibeUnterschiede();
  await abosStarten('v1');
  render();
  toast('Datenbank neu befüllt', `${TABELLEN.reduce((s, t) => s + (db[t]?.length || 0), 0)} Einträge`);
}
AKTIONEN['backend-befuellen'] = () => backendBefuellen().catch(e => { console.error(e); toast('Befüllen fehlgeschlagen', e.message); });
