'use strict';
// Kern: Speicher, Datenzugriff, Mitteilungen, Router, Layout, Aktionen.
// Die Ansichten stehen in ansichten.js.

const SPEICHER = 'online-campus-v1';
let db;
let panelOffen = false;
let panelFilter = 'alle';
let letzteBestaetigung = null; // { pid, versionId } nach einem Upload

// ---------- Speicher ----------
function heuteSchluessel() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function laden() {
  try {
    const s = JSON.parse(localStorage.getItem(SPEICHER));
    // Beispieldaten hängen am heutigen Tag. Am nächsten Tag neu erzeugen, damit Fristen stimmen.
    if (s && s.version === 1 && s.erzeugt === heuteSchluessel()) return s;
  } catch { /* privat oder gesperrt: dann ohne Speicher */ }
  return null;
}
function speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(db)); } catch { /* egal */ } }
function neuAufsetzen(sitzung = null) {
  db = erzeugeDaten(new Date());
  db.erzeugt = heuteSchluessel();
  db.sitzung = sitzung;
  speichern();
}

// ---------- Formatierung ----------
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WT_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const pad = n => String(n).padStart(2, '0');
const D = iso => new Date(iso);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDatum = (iso, wt = true) => { const d = D(iso); return (wt ? WT[d.getDay()] + ', ' : '') + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.'; };
const fmtDatumJ = iso => { const d = D(iso); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
const fmtZeit = iso => { const d = D(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtLang = d => WT_LANG[d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()];
const noteFmt = w => Number(w).toFixed(1).replace('.', ',');
function tagDiff(iso) { const a = D(iso); a.setHours(0, 0, 0, 0); const b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((a - b) / 864e5); }
function relTag(iso) {
  const n = tagDiff(iso);
  if (n === 0) return 'heute'; if (n === 1) return 'morgen'; if (n === -1) return 'gestern';
  if (n > 1 && n < 7) return 'in ' + n + ' Tagen'; if (n < 0 && n > -7) return 'vor ' + -n + ' Tagen';
  return fmtDatum(iso);
}
function relZeit(iso) {
  const min = (Date.now() - D(iso)) / 6e4;
  if (min < 1) return 'gerade eben';
  if (min < 60) return 'vor ' + Math.floor(min) + ' Min.';
  if (tagDiff(iso) === 0) return 'vor ' + Math.floor(min / 60) + ' Std.';
  if (tagDiff(iso) === -1) return 'gestern, ' + fmtZeit(iso);
  return fmtDatum(iso) + ', ' + fmtZeit(iso);
}
function countdown(iso) {
  const ms = D(iso) - Date.now();
  if (ms < 0) return { text: 'abgelaufen', kl: 'm-fehler' };
  const h = ms / 36e5;
  if (h < 48) return { text: 'noch ' + Math.max(1, Math.floor(h)) + ' Std.', kl: 'm-fehler' };
  const t = Math.floor(h / 24);
  return { text: 'noch ' + t + ' Tage', kl: t <= 3 ? 'm-fehler' : t <= 7 ? 'm-warn' : 'm-akzent' };
}
function bytes(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' GB';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' MB';
  return Math.max(1, Math.round(n / 1e3)) + ' KB';
}
const plural = (n, ein, mehr) => n + ' ' + (n === 1 ? ein : mehr);

// ---------- Symbole ----------
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  kalender: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  buch: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  hilfe: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>',
  glocke: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  suche: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  datei: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  uhr: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ort: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  stift: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  gruppe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  megafon: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
  warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  pfeil: '<path d="m9 6 6 6-6 6"/>',
  zurueck: '<path d="m15 6-6 6 6 6"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  mond: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  schloss: '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
};
const I = (n, cls = '') => `<svg class="svg ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const ANLASS_STIL = {
  aenderung: { icon: 'warn', kl: 'm-warn' },
  note: { icon: 'award', kl: 'm-gut' },
  eingang: { icon: 'check', kl: 'm-gut' },
  frist: { icon: 'uhr', kl: 'm-fehler' },
  material: { icon: 'datei', kl: 'm-info' },
  neuigkeit: { icon: 'megafon', kl: 'm-akzent' },
};
const FARBEN = ['#6d4ae6', '#0e9f6e', '#e0613a', '#2563eb', '#c2410c', '#be185d', '#0891b2'];

// ---------- Datenzugriff (folgt dem ER-Modell) ----------
const byId = (tab, id) => db[tab].find(x => x.id === id);
const ich = () => db && db.sitzung ? byId('user', db.sitzung) : null;
const rolle = () => ich()?.rolle;
const name = u => u ? [u.titel, u.vorname, u.nachname].filter(Boolean).join(' ') : 'Online-Campus';
const initialen = u => (u.vorname[0] + u.nachname[0]).toUpperCase();
const nextId = tab => db[tab].reduce((m, x) => Math.max(m, typeof x.id === 'number' ? x.id : 0), 0) + 1;

function gruppeVon(uid) {
  const m = db.gruppenmitglied.find(g => g.user_id === uid && !g.bis);
  return m ? byId('studiengruppe', m.gruppe_id) : null;
}
function kurseVon(uid) {
  const u = byId('user', uid);
  if (u.rolle === 'studierend') { const g = gruppeVon(uid); return db.kurs.filter(k => k.gruppe_id === g?.id); }
  if (u.rolle === 'lehrend') { const ids = db.lehrauftrag.filter(l => l.lehrender_id === uid).map(l => l.kurs_id); return db.kurs.filter(k => ids.includes(k.id)); }
  return db.kurs;
}
const modulVon = kurs => byId('modul', kurs.modul_id);
const kursName = kid => modulVon(byId('kurs', kid)).titel;
const farbeVon = kid => FARBEN[(byId('kurs', kid).modul_id - 1) % FARBEN.length];
const lehrendeVon = kid => db.lehrauftrag.filter(l => l.kurs_id === kid).map(l => byId('user', l.lehrender_id));
function studisVon(kid) {
  const k = byId('kurs', kid);
  return db.gruppenmitglied.filter(g => g.gruppe_id === k.gruppe_id && !g.bis).map(g => g.user_id);
}
function termineVon(kursIds, uid = null) {
  return db.termin.filter(t => kursIds.includes(t.kurs_id) || (uid && t.vertretung_id === uid)).sort((a, b) => D(a.beginn) - D(b.beginn));
}
const raumName = t => t.raum_id ? byId('raum', t.raum_id).bezeichnung : 'Online';
const pruefungenVon = kursIds => db.pruefung.filter(p => kursIds.includes(p.kurs_id)).sort((a, b) => D(a.frist) - D(b.frist));
const mitgliederVon = aid => db.abgabe_mitglied.filter(m => m.abgabe_id === aid).map(m => m.student_id);
function abgabeVon(pid, uid) {
  return db.abgabe.find(a => a.pruefung_id === pid && db.abgabe_mitglied.some(m => m.abgabe_id === a.id && m.student_id === uid));
}
const versionenVon = aid => db.abgabeversion.filter(v => v.abgabe_id === aid).sort((a, b) => a.nummer - b.nummer);
const noteVon = (pid, uid) => db.note.find(n => n.pruefung_id === pid && n.student_id === uid);
// Bewertet wird die letzte Version vor der Frist (Regel 1 im Konzept)
function zaehlendeVersion(aid) {
  const p = byId('pruefung', byId('abgabe', aid).pruefung_id);
  const vs = versionenVon(aid);
  const vorFrist = vs.filter(v => D(v.hochgeladen_am) <= D(p.frist));
  return (vorFrist.length ? vorFrist : vs).at(-1);
}
function statusVon(p, uid) {
  const n = noteVon(p.id, uid);
  if (n && n.freigegeben_am) return { code: 'bewertet', text: 'Bewertet', kl: 'm-gut' };
  const vorbei = D(p.frist) < new Date();
  const a = p.mit_upload ? abgabeVon(p.id, uid) : null;
  if (a) return vorbei ? { code: 'korrektur', text: a.verspaetet ? 'In Korrektur · verspätet' : 'In Korrektur', kl: 'm-info' } : { code: 'eingereicht', text: 'Eingereicht · ' + versionenVon(a.id).length + '. Version', kl: 'm-gut' };
  if (!p.mit_upload) return vorbei ? { code: 'korrektur', text: 'In Korrektur', kl: 'm-info' } : { code: 'klausur', text: 'Klausur vor Ort', kl: 'm-akzent' };
  if (vorbei) return { code: 'fehlt', text: 'Nicht abgegeben', kl: 'm-fehler' };
  return { code: 'offen', text: 'Noch nicht abgegeben', kl: tagDiff(p.frist) <= 7 ? 'm-warn' : '' };
}

// ---------- Mitteilungen ----------
function einstellungVon(uid, anlassId) {
  const a = ANLAESSE.find(x => x.id === anlassId);
  const eigen = db.einstellungen[uid]?.[anlassId] || {};
  const e = { ...a.std, ...eigen, campus: true };
  (a.pflicht || []).forEach(k => { e[k] = true; });
  return e;
}
// Legt eine Mitteilung an und stellt sie je nach Einstellung der Empfänger zu.
function sende({ absender = null, anlass, titel, text, kurs_id = null, gruppe_id = null, termin_id = null, pruefung_id = null, empfaenger, wichtig = false }) {
  const id = nextId('mitteilung');
  const jetzt = new Date().toISOString();
  db.mitteilung.push({ id, absender_id: absender, anlass, titel, text, kurs_id, gruppe_id, termin_id, pruefung_id, wichtig, erstellt_am: jetzt });
  const z = { campus: 0, push: 0, email: 0 };
  [...new Set(empfaenger)].forEach(uid => {
    const e = einstellungVon(uid, anlass);
    KANAELE.forEach(k => {
      if (e[k.id] || (wichtig && k.id === 'email')) {
        db.zustellung.push({ mitteilung_id: id, empfaenger_id: uid, kanal: k.id, gesendet_am: jetzt, gelesen_am: null });
        z[k.id]++;
      }
    });
  });
  speichern();
  return z;
}
const zustellText = z => `${z.campus}× im Campus · ${z.push}× Push · ${z.email}× E-Mail (simuliert)`;
function meineMitteilungen(uid) {
  return db.zustellung.filter(z => z.empfaenger_id === uid && z.kanal === 'campus')
    .map(z => ({ ...byId('mitteilung', z.mitteilung_id), gelesen: !!z.gelesen_am }))
    .sort((a, b) => D(b.erstellt_am) - D(a.erstellt_am));
}
const ungelesen = uid => meineMitteilungen(uid).filter(m => !m.gelesen).length;
function alsGelesen(uid, mid) {
  const jetzt = new Date().toISOString();
  db.zustellung.forEach(z => { if (z.empfaenger_id === uid && (mid == null || z.mitteilung_id === mid) && !z.gelesen_am) z.gelesen_am = jetzt; });
  speichern();
}
function zielVon(m) {
  const r = rolle();
  if (r !== 'studierend') return m.kurs_id && r === 'lehrend' ? `#/kurse/${m.kurs_id}` : '#/mitteilungen';
  if (!m.kurs_id) return '#/mitteilungen';
  return {
    aenderung: '#/stundenplan', note: `#/module/${m.kurs_id}/ergebnis`, material: `#/module/${m.kurs_id}/materialien`,
    eingang: `#/module/${m.kurs_id}/abgabe`, frist: `#/module/${m.kurs_id}/abgabe`, neuigkeit: `#/module/${m.kurs_id}`,
  }[m.anlass] || '#/mitteilungen';
}
const FILTER = { alle: null, neuigkeiten: ['neuigkeit', 'material'], aenderungen: ['aenderung', 'frist'], noten: ['note', 'eingang'] };
const filtere = (liste, f) => FILTER[f] ? liste.filter(m => FILTER[f].includes(m.anlass)) : liste;

// Simuliert den nächtlichen Server-Job: erinnert an Fristen in den nächsten 7 Tagen ohne Abgabe.
function fristErinnerungen() {
  db.user.filter(u => u.rolle === 'studierend').forEach(u => {
    pruefungenVon(kurseVon(u.id).map(k => k.id)).forEach(p => {
      const tage = tagDiff(p.frist);
      if (!p.mit_upload || tage < 0 || tage > 7 || abgabeVon(p.id, u.id)) return;
      const schon = db.mitteilung.some(m => m.anlass === 'frist' && m.pruefung_id === p.id && db.zustellung.some(z => z.mitteilung_id === m.id && z.empfaenger_id === u.id));
      if (schon) return;
      sende({ anlass: 'frist', titel: `Frist ${relTag(p.frist)}: ${kursName(p.kurs_id)}`, text: `${p.titel}. Abgabe bis ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr. Bisher ist nichts hochgeladen.`, kurs_id: p.kurs_id, pruefung_id: p.id, empfaenger: [u.id] });
    });
  });
}

// ---------- Router ----------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [pfad, query] = h.split('?');
  return { teile: pfad.split('/').filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(query || '') };
}
const NAV = {
  studierend: [['uebersicht', 'Übersicht', 'home'], ['stundenplan', 'Stundenplan', 'kalender'], ['module', 'Module', 'buch'], ['leistungen', 'Leistungen', 'award'], ['service', 'Service', 'hilfe']],
  lehrend: [['uebersicht', 'Übersicht', 'home'], ['kurse', 'Meine Module', 'buch'], ['korrektur', 'Korrektur', 'stift'], ['stundenplan', 'Stundenplan', 'kalender']],
  verwaltung: [['uebersicht', 'Übersicht', 'home'], ['gruppen', 'Gruppen & Semester', 'gruppe'], ['personen', 'Personen & Rollen', 'user'], ['planung', 'Stundenplanung', 'kalender'], ['pruefungsamt', 'Prüfungsamt', 'award'], ['nachrichten', 'Mitteilungen', 'megafon'], ['inhalte', 'Service-Inhalte', 'hilfe']],
};
const BEREICH = { studierend: 'Studierende', lehrend: 'Lehrende', verwaltung: 'Verwaltung' };

function render() {
  const app = document.getElementById('app');
  if (!ich()) { app.innerHTML = demoLeiste() + loginAnsicht(); document.title = 'Anmelden · Online-Campus'; return; }
  const { teile, q } = parseHash();
  let html;
  try { html = ANSICHTEN[rolle()](teile, q); }
  catch (e) { console.error(e); html = `<div class="karte leer"><h2>Seite nicht gefunden</h2><p><a href="#/uebersicht">Zur Übersicht</a></p></div>`; }
  app.innerHTML = demoLeiste() + layout(teile[0] || 'uebersicht', html);
  const h1 = app.querySelector('h1');
  document.title = (h1 ? h1.textContent + ' · ' : '') + 'Online-Campus';
}

function demoLeiste() {
  const s = db.sitzung;
  const knopf = (id, text) => `<button data-action="als" data-id="${id}" aria-pressed="${s === id}">${text}</button>`;
  return `<div class="demo"><b>Prototyp</b><span>Sicht wechseln:</span>
    ${knopf('s1', 'Lena · Studierende')}${knopf('l1', 'Prof. Brandt · Lehrende')}${knopf('v1', 'Petra Lange · Verwaltung')}
    <span class="rechts"><button data-action="thema" title="Hell / Dunkel">Hell / Dunkel</button><button data-action="zuruecksetzen">Daten zurücksetzen</button></span></div>`;
}

function layout(aktiv, inhalt) {
  const u = ich(), r = u.rolle, n = ungelesen(u.id);
  const nav = NAV[r];
  const aktivKey = nav.some(x => x[0] === aktiv) ? aktiv : (aktiv === 'module' ? 'module' : '');
  const zahlen = { korrektur: r === 'lehrend' ? offeneKorrekturen(u.id) : 0, pruefungsamt: r === 'verwaltung' ? db.note.filter(x => x.freigegeben_am && !x.bestaetigt_am).length : 0 };
  const links = nav.map(([k, t, i]) => `<a href="#/${k}" ${aktivKey === k ? 'aria-current="page"' : ''}>${I(i)}<span>${t}</span>${zahlen[k] ? `<span class="zahl">${zahlen[k]}</span>` : ''}</a>`).join('');
  const unter = nav.slice(0, 5).map(([k, t, i]) => `<a href="#/${k}" ${aktivKey === k ? 'aria-current="page"' : ''}>${I(i)}<span>${t.split(' ')[0]}</span></a>`).join('');
  const g = gruppeVon(u.id);
  return `<div class="app">
    <aside class="seitenleiste">
      <div class="marke"><div class="logo">OC</div><div>Online-Campus<small>Bereich ${BEREICH[r]}</small></div></div>
      <nav class="nav" aria-label="Hauptnavigation">${links}</nav>
      <p class="rolle-hinweis">Angemeldet als ${esc(name(u))}${g ? ' · ' + esc(g.name) : ''}</p>
    </aside>
    <div class="haupt">
      <header class="kopf">
        <a class="kopf-marke" href="#/uebersicht" aria-label="Online-Campus, zur Übersicht"><span class="logo">OC</span>Online-Campus</a>
        <form class="suche" data-form="suche" role="search">${I('suche')}<input name="q" type="search" placeholder="Module, Materialien, Hilfe durchsuchen" aria-label="Suche"></form>
        <div class="rechts">
          <button class="rund" data-action="glocke" aria-label="Mitteilungen, ${n} ungelesen" aria-expanded="${panelOffen}">${I('glocke')}${n ? `<span class="punkt">${n}</span>` : ''}</button>
          <a class="avatar" href="#/profil" aria-label="Profil">${initialen(u)}</a>
        </div>
        ${panelOffen ? mitteilungsPanel() : ''}
      </header>
      <main class="inhalt" id="inhalt">${inhalt}</main>
    </div>
  </div>
  <nav class="unterleiste" aria-label="Hauptnavigation mobil">${unter}</nav>`;
}

function mitteilungsPanel() {
  const u = ich();
  const liste = filtere(meineMitteilungen(u.id), panelFilter).slice(0, 8);
  const fk = (k, t) => `<button data-action="panel-filter" data-f="${k}" aria-pressed="${panelFilter === k}">${t}</button>`;
  return `<div class="panel" role="dialog" aria-label="Mitteilungen">
    <div class="panel-kopf"><h3 style="margin:0">Mitteilungen</h3><button class="knopf klein" data-action="alle-gelesen">Alle gelesen</button></div>
    <div class="filter">${fk('alle', 'Alle')}${fk('neuigkeiten', 'Neuigkeiten')}${fk('aenderungen', 'Änderungen')}${fk('noten', 'Noten & Abgaben')}</div>
    ${liste.map(mitteilungsEintrag).join('') || '<p class="leer">Keine Mitteilungen</p>'}
    <a class="mitteilung" href="#/mitteilungen" data-action="panel-zu" style="justify-content:center;font-weight:600;color:var(--akzent)">Alle Mitteilungen anzeigen</a>
  </div>`;
}
function mitteilungsEintrag(m) {
  const s = ANLASS_STIL[m.anlass] || ANLASS_STIL.neuigkeit;
  const abs = m.absender_id ? name(byId('user', m.absender_id)) : 'Online-Campus';
  return `<a class="mitteilung ${m.gelesen ? '' : 'neu'}" href="${zielVon(m)}" data-action="gelesen" data-id="${m.id}">
    <span class="symbol ${s.kl}">${I(s.icon)}</span>
    <span style="min-width:0"><span class="zeile dazwischen"><b>${esc(m.titel)}</b>${m.wichtig ? '<span class="marke-klein m-fehler">wichtig</span>' : ''}</span>
    <span class="klein leise" style="display:block">${esc(m.text)}</span>
    <span class="klein leise">${esc(abs)} · ${relZeit(m.erstellt_am)}</span></span></a>`;
}

// ---------- Meldungen und Dialog ----------
function toast(titel, klein = '') {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = esc(titel) + (klein ? `<small>${esc(klein)}</small>` : '');
  box.appendChild(t);
  setTimeout(() => t.remove(), 5200);
}
function dialog(html) { const d = document.getElementById('dialog'); d.innerHTML = html; d.showModal(); }
function dialogZu() { const d = document.getElementById('dialog'); if (d.open) d.close(); }
function herunterladen(dateiname, inhalt, typ) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = Object.assign(document.createElement('a'), { href: url, download: dateiname });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Ereignisse ----------
const AKTIONEN = {}, FORMULARE = {}, AENDERUNGEN = {};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) {
    if (panelOffen && !e.target.closest('.panel')) { panelOffen = false; render(); }
    return;
  }
  const fn = AKTIONEN[el.dataset.action];
  if (fn) fn(el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  FORMULARE[f.dataset.form]?.(f, new FormData(f));
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el) AENDERUNGEN[el.dataset.change]?.(el, e);
});
document.addEventListener('dragover', e => { const z = e.target.closest('.ablage'); if (z) { e.preventDefault(); z.classList.add('drueber'); } });
document.addEventListener('dragleave', e => { const z = e.target.closest('.ablage'); if (z) z.classList.remove('drueber'); });
document.addEventListener('drop', e => {
  const z = e.target.closest('.ablage');
  if (!z) return;
  e.preventDefault(); z.classList.remove('drueber');
  const input = z.querySelector('input[type=file]');
  input.files = e.dataTransfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelOffen) { panelOffen = false; render(); } });
window.addEventListener('hashchange', () => { panelOffen = false; render(); window.scrollTo(0, 0); });

Object.assign(AKTIONEN, {
  als(el) { db.sitzung = el.dataset.id; letzteBestaetigung = null; speichern(); fristErinnerungen(); location.hash = '#/uebersicht'; render(); },
  zuruecksetzen() {
    if (!confirm('Alle Änderungen verwerfen und die Beispieldaten neu laden?')) return;
    neuAufsetzen(db.sitzung); fristErinnerungen(); render(); toast('Beispieldaten neu geladen');
  },
  thema() {
    const root = document.documentElement;
    const dunkel = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dunkel ? 'light' : 'dark';
    try { localStorage.setItem('oc-thema', root.dataset.theme); } catch { /* egal */ }
  },
  glocke(el, e) { e.stopPropagation(); panelOffen = !panelOffen; render(); },
  'panel-filter'(el, e) { e.stopPropagation(); panelFilter = el.dataset.f; render(); },
  'panel-zu'() { panelOffen = false; },
  'alle-gelesen'(el, e) { e.stopPropagation(); alsGelesen(ich().id); render(); },
  gelesen(el) {
    alsGelesen(ich().id, Number(el.dataset.id));
    panelOffen = false;
    if (location.hash === el.getAttribute('href')) render();
  },
  abmelden() { db.sitzung = null; speichern(); location.hash = ''; render(); },
  'dialog-zu'() { dialogZu(); },
});
FORMULARE.suche = (f, fd) => { location.hash = '#/suche?q=' + encodeURIComponent(fd.get('q') || ''); };
