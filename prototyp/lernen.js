'use strict';
// Lernsystem: Lernkarten und Quizfragen aus den Unterlagen der Lehrenden (lernkarten.js).
// Lehrende geben Vorschläge frei (lernkarten_freigabe), erst dann sehen Studierende sie.
// Wiederholung nach dem Leitner-System: fünf Fächer, gewusste Karten wandern ein Fach weiter und kommen
// später wieder (1, 2, 4, 8, 16 Tage), nicht gewusste fangen vorne an. Stand je Person in lernstand.

const LERN_INTERVALLE = [0, 1, 2, 4, 8, 16];
const LERN_SITZUNG = 15, LERN_QUIZ = 10;
let LERNEN = null; // laufende Sitzung: { kid, modus, ids, i, aufgedeckt, wahl, gewusst }

const lernTabellen = () => { db.lernkarten_freigabe ||= []; db.lernstand ||= []; };
function lernSatz(kid) { const k = byId('kurs', kid); return (k && typeof LERNKARTEN !== 'undefined' && LERNKARTEN[modulVon(k).kuerzel]) || null; }
function lernFreigabe(kid) { lernTabellen(); return db.lernkarten_freigabe.find(f => f.kurs_id === kid) || null; }
function lernStatus(kid, id) { const f = lernFreigabe(kid); return f?.freigegeben?.includes(id) ? 'frei' : f?.abgelehnt?.includes(id) ? 'abgelehnt' : 'vorschlag'; }
function lernKarten(kid, nurFrei = true) { const s = lernSatz(kid); return s ? s.karten.filter(k => !nurFrei || lernStatus(kid, k.id) === 'frei') : []; }
function lernKarte(kid, id) { return lernSatz(kid)?.karten.find(k => k.id === id); }
function meinLernstand(uid, anlegen = false) {
  lernTabellen();
  let l = db.lernstand.find(x => x.user_id === uid);
  if (!l && anlegen) { l = { user_id: uid, karten: {} }; db.lernstand.push(l); }
  return l || { user_id: uid, karten: {} };
}
const lernHeute = () => nurDatum();
const lernPlusTage = n => { const d = new Date(); d.setDate(d.getDate() + n); return lokal(d).slice(0, 10); };
function lernZahlen(kid, uid) {
  const karten = lernKarten(kid), st = meinLernstand(uid).karten, h = lernHeute();
  const neu = karten.filter(k => !st[k.id]).length, faellig = karten.filter(k => st[k.id] && st[k.id].faellig <= h).length;
  const sicher = karten.filter(k => (st[k.id]?.box || 0) >= 3).length, gesehen = karten.length - neu;
  return { gesamt: karten.length, neu, faellig, sicher, gesehen };
}
// Antwortmöglichkeiten fest gemischt (je Karte immer gleich, damit ein Neuzeichnen nichts verschiebt)
function lernOptionen(k) { return [k.richtig, ...k.falsch].map((t, i) => ({ t, richtig: i === 0, s: pseudoHash(k.id + t) })).sort((a, b) => a.s < b.s ? -1 : 1); }
// Foliensätze in Reihenfolge (Object.entries stellt den Schlüssel „10“ als Zahl sonst vor „01“)
const lernQuellen = s => Object.entries(s.quellen).sort(([a], [b]) => a.localeCompare(b));
const lernQuelle = (kid, k) => `${esc(k.nr)} · ${esc(lernSatz(kid).quellen[k.nr])} · Folie ${k.seite}`;

// ---------- Studierende: Reiter „Lernen“ ----------
function sLernen(kid) {
  const u = ich(), karten = lernKarten(kid);
  if (!lernSatz(kid)) return '<div class="karte leer">Für dieses Modul gibt es noch keine Lernkarten.</div>';
  if (!karten.length) return `<div class="karte"><h2>Lernen</h2><p class="leise">Die Lehrenden prüfen die Lernkarten zu diesem Modul gerade. Sobald sie freigegeben sind, erscheinen sie hier.</p></div>`;
  if (LERNEN && LERNEN.kid === kid) return lernSitzungAnsicht(kid);
  const z = lernZahlen(kid, u.id), st = meinLernstand(u.id).karten, s = lernSatz(kid);
  const anstehend = Math.min(LERN_SITZUNG, z.faellig + z.neu);
  const themen = lernQuellen(s).map(([nr, titel]) => {
    const ks = karten.filter(k => k.nr === nr); if (!ks.length) return '';
    const sicher = ks.filter(k => (st[k.id]?.box || 0) >= 3).length;
    return `<li class="zeile dazwischen" style="gap:12px"><span style="min-width:0"><b class="klein">${esc(nr)} · ${esc(titel)}</b><span class="klein leise" style="display:block">${plural(ks.length, 'Karte', 'Karten')} · ${sicher} sicher</span>
      <span class="fortschritt" style="display:block;margin-top:6px;max-width:260px" aria-hidden="true"><i style="width:${Math.round(sicher / ks.length * 100)}%"></i></span></span>
      <button class="knopf klein" data-action="lernen-start" data-kid="${kid}" data-modus="thema" data-nr="${esc(nr)}">Üben</button></li>`;
  }).join('');
  return `<div class="raster raster-2">
    <section class="karte"><h2>Heute lernen</h2>
      <p class="lern-zahl"><b>${z.faellig}</b> fällig · <b>${z.neu}</b> neu</p>
      <div class="fortschritt" role="progressbar" aria-label="Sicher gewusst" aria-valuemin="0" aria-valuemax="${z.gesamt}" aria-valuenow="${z.sicher}"><i style="width:${Math.round(z.sicher / z.gesamt * 100)}%"></i></div>
      <p class="klein leise">${z.sicher} von ${z.gesamt} Karten sicher gewusst, ${z.gesehen} schon einmal gelernt.</p>
      <div class="zeile" style="flex-wrap:wrap;gap:8px">${anstehend ? `<button class="knopf primaer" data-action="lernen-start" data-kid="${kid}" data-modus="faellig">${I('buch')} ${plural(anstehend, 'Karte', 'Karten')} lernen</button>` : '<span class="marke-klein m-gut">Für heute alles gelernt</span>'}
        <button class="knopf" data-action="lernen-start" data-kid="${kid}" data-modus="quiz">${I('check')} Quiz mit ${LERN_QUIZ} Fragen</button></div>
    </section>
    <section class="karte"><h2>So funktioniert es</h2>
      <p class="klein">Jede Karte stammt aus den Foliensätzen der Lehrenden und nennt Foliensatz und Folie. Die Lehrenden haben sie geprüft und freigegeben.</p>
      <p class="klein">Was du weißt, kommt erst nach 1, 2, 4, 8 und 16 Tagen wieder. Was du nicht wusstest, wiederholst du gleich noch einmal. So lernst du vor allem, was noch nicht sitzt.</p>
      <p class="klein leise">Tastatur: Leertaste deckt auf, 1 bis 3 bewerten, bei Quizfragen 1 bis 4 wählen.</p></section>
  </div>
  <section class="karte abstand"><h2>Nach Foliensatz üben</h2><ul class="liste">${themen}</ul></section>`;
}

function lernSitzungAnsicht(kid) {
  const L = LERNEN, gesamt = L.ids.length;
  if (L.i >= gesamt) {
    const z = lernZahlen(kid, ich().id), morgen = lernKarten(kid).filter(k => { const s = meinLernstand(ich().id).karten[k.id]; return s && s.faellig <= lernPlusTage(1); }).length;
    return `<section class="karte lern-karte"><h2>Geschafft</h2>
      <p class="lern-zahl"><b>${L.gewusst}</b> von ${gesamt} ${L.modus === 'quiz' ? 'Fragen richtig' : 'Karten gewusst'}</p>
      <p class="leise">${z.sicher} von ${z.gesamt} Karten sitzen jetzt sicher. Bis morgen ${morgen === 1 ? 'ist eine Karte' : `sind ${morgen} Karten`} zur Wiederholung fällig.</p>
      <div class="zeile" style="flex-wrap:wrap;gap:8px"><button class="knopf primaer" data-action="lernen-ende">Zur Übersicht</button><button class="knopf" data-action="lernen-start" data-kid="${kid}" data-modus="quiz">Noch ein Quiz</button></div></section>`;
  }
  const k = lernKarte(kid, L.ids[L.i]), quiz = !!k.richtig;
  let unten;
  if (quiz) {
    const opt = lernOptionen(k), gewaehlt = L.wahl !== null;
    unten = `<div class="lern-optionen" role="group" aria-label="Antwortmöglichkeiten">${opt.map((o, i) => {
      const kl = !gewaehlt ? '' : o.richtig ? 'richtig' : i === L.wahl ? 'falsch' : 'aus';
      return `<button class="lern-option ${kl}" data-action="lernen-wahl" data-i="${i}" ${gewaehlt ? 'disabled' : ''}><span class="lern-taste" aria-hidden="true">${i + 1}</span>${esc(o.t)}${gewaehlt && o.richtig ? '<span class="visually-hidden"> (richtig)</span>' : ''}${kl === 'falsch' ? '<span class="visually-hidden"> (deine Wahl, falsch)</span>' : ''}</button>`;
    }).join('')}</div>
    ${gewaehlt ? `<div class="hinweis abstand" role="status">${I(opt[L.wahl].richtig ? 'check' : 'info')}<div><b>${opt[L.wahl].richtig ? 'Richtig.' : 'Nicht ganz.'}</b> ${esc(k.erklaerung)}</div></div>
      <div class="zeile abstand"><button class="knopf primaer" data-action="lernen-weiter" autofocus>Weiter</button></div>` : ''}`;
  } else if (!L.aufgedeckt) {
    unten = `<button class="knopf primaer" data-action="lernen-aufdecken" autofocus>Antwort zeigen</button>`;
  } else {
    unten = `<div class="lern-antwort" role="status">${esc(k.antwort)}</div>
      <p class="klein leise">Wie gut wusstest du es?</p>
      <div class="lern-bewertung" role="group" aria-label="Selbsteinschätzung">
        <button class="knopf" data-action="lernen-bewerten" data-wert="0"><span class="lern-taste" aria-hidden="true">1</span>Nicht gewusst</button>
        <button class="knopf" data-action="lernen-bewerten" data-wert="1"><span class="lern-taste" aria-hidden="true">2</span>Fast</button>
        <button class="knopf primaer" data-action="lernen-bewerten" data-wert="2"><span class="lern-taste" aria-hidden="true">3</span>Gewusst</button></div>`;
  }
  return `<section class="karte lern-karte">
    <div class="zeile dazwischen" style="flex-wrap:wrap"><span class="klein leise">${L.modus === 'quiz' ? 'Quiz' : 'Lernkarte'} ${L.i + 1} von ${gesamt}</span><button class="knopf klein" data-action="lernen-ende">Beenden</button></div>
    <div class="fortschritt abstand" aria-hidden="true"><i style="width:${Math.round(L.i / gesamt * 100)}%"></i></div>
    <p class="klein lern-quelle">${lernQuelle(kid, k)}</p>
    <h2 class="lern-frage">${esc(k.frage)}</h2>
    ${unten}</section>`;
}

function lernMerken(kid, id, wert) {
  const st = meinLernstand(ich().id, true).karten, alt = st[id]?.box || 0;
  const box = wert === 2 ? Math.min(5, alt + 1) : wert === 1 ? Math.max(1, alt) : 1;
  st[id] = { box, faellig: wert === 0 ? lernHeute() : lernPlusTage(LERN_INTERVALLE[box]), zuletzt: new Date().toISOString() };
  if (wert === 2) LERNEN.gewusst++;
  speichern();
}
const lernMischen = (liste, saat) => liste.map(x => [pseudoHash(saat + x), x]).sort().map(x => x[1]);
AKTIONEN['lernen-start'] = el => {
  const kid = Number(el.dataset.kid), modus = el.dataset.modus, karten = lernKarten(kid), st = meinLernstand(ich().id).karten, h = lernHeute(), saat = String(Date.now());
  let ids;
  if (modus === 'quiz') ids = lernMischen(karten.filter(k => k.richtig).map(k => k.id), saat).slice(0, LERN_QUIZ);
  else if (modus === 'thema') ids = lernMischen(karten.filter(k => k.nr === el.dataset.nr).map(k => k.id), saat).slice(0, 20);
  else ids = [...karten.filter(k => st[k.id] && st[k.id].faellig <= h).map(k => k.id), ...karten.filter(k => !st[k.id]).map(k => k.id)].slice(0, LERN_SITZUNG);
  if (!ids.length) { toast('Nichts zu lernen', 'Für heute ist alles erledigt.'); return; }
  LERNEN = { kid, modus, ids, i: 0, aufgedeckt: false, wahl: null, gewusst: 0, nochmal: new Set() };
  if (!location.hash.endsWith('/lernen')) location.hash = `#/module/${kid}/lernen`; else render();
};
AKTIONEN['lernen-aufdecken'] = () => { LERNEN.aufgedeckt = true; render(); document.querySelector('.lern-bewertung button:last-child')?.focus(); };
AKTIONEN['lernen-bewerten'] = el => {
  const L = LERNEN, id = L.ids[L.i], wert = Number(el.dataset.wert);
  lernMerken(L.kid, id, wert);
  // Nicht Gewusstes kommt in derselben Sitzung einmal wieder
  if (wert === 0 && !L.nochmal.has(id)) { L.nochmal.add(id); L.ids.push(id); }
  L.i++; L.aufgedeckt = false; render(); document.querySelector('.lern-karte button[data-action="lernen-aufdecken"], .lern-karte .knopf.primaer')?.focus();
};
AKTIONEN['lernen-wahl'] = el => {
  const L = LERNEN, k = lernKarte(L.kid, L.ids[L.i]), i = Number(el.dataset.i);
  L.wahl = i; lernMerken(L.kid, k.id, lernOptionen(k)[i].richtig ? 2 : 0); render();
  document.querySelector('[data-action="lernen-weiter"]')?.focus();
};
AKTIONEN['lernen-weiter'] = () => { LERNEN.i++; LERNEN.wahl = null; render(); document.querySelector('.lern-option')?.focus(); };
AKTIONEN['lernen-ende'] = () => { LERNEN = null; render(); };
document.addEventListener('keydown', e => {
  if (!LERNEN || !location.hash.endsWith('/lernen') || e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const klick = sel => { const b = document.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); b.click(); } };
  if (e.key === ' ' && document.querySelector('[data-action="lernen-aufdecken"]')) klick('[data-action="lernen-aufdecken"]');
  else if (/^[1-3]$/.test(e.key) && document.querySelector('.lern-bewertung')) klick(`.lern-bewertung button[data-wert="${Number(e.key) - 1}"]`);
  else if (/^[1-4]$/.test(e.key) && document.querySelector('.lern-option:not([disabled])')) klick(`.lern-option[data-i="${Number(e.key) - 1}"]`);
});
window.addEventListener('hashchange', () => { if (LERNEN && !location.hash.startsWith(`#/module/${LERNEN.kid}/lernen`)) LERNEN = null; });

// ---------- Lehrende: Reiter „Lernkarten“ (Vorschläge prüfen und freigeben) ----------
function lernkartenLehrend(kid) {
  const s = lernSatz(kid); if (!s) return '<div class="karte leer">Für dieses Modul gibt es noch keine Lernkarten.</div>';
  const alle = s.karten, zahl = st => alle.filter(k => lernStatus(kid, k.id) === st).length, vorschlaege = zahl('vorschlag');
  const zeile = k => {
    const st = lernStatus(kid, k.id);
    return `<li class="lern-pruef"><div style="min-width:0"><span class="klein leise">${k.richtig ? 'Quizfrage' : 'Lernkarte'} · Folie ${k.seite}</span><b style="display:block">${esc(k.frage)}</b>
      <span class="klein">${k.richtig ? `Richtig: ${esc(k.richtig)} · Falsch: ${k.falsch.map(esc).join(' / ')}` : esc(k.antwort)}</span></div>
      <div class="zeile" style="gap:6px;flex:none;align-items:center"><span class="marke-klein ${st === 'frei' ? 'm-gut' : st === 'abgelehnt' ? 'm-fehler' : 'm-warn'}">${st === 'frei' ? 'freigegeben' : st === 'abgelehnt' ? 'abgelehnt' : 'Vorschlag'}</span>
      ${st !== 'frei' ? `<button class="knopf klein" data-action="karte-status" data-kid="${kid}" data-id="${k.id}" data-status="frei" aria-label="Freigeben: ${esc(k.frage)}">Freigeben</button>` : ''}
      ${st !== 'abgelehnt' ? `<button class="knopf klein" data-action="karte-status" data-kid="${kid}" data-id="${k.id}" data-status="abgelehnt" aria-label="Ablehnen: ${esc(k.frage)}">Ablehnen</button>` : ''}</div></li>`;
  };
  // Vorschläge zuerst, dann nach Foliensatz
  const gruppen = lernQuellen(s).map(([nr, titel]) => {
    const ks = alle.filter(k => k.nr === nr); if (!ks.length) return '';
    const offen = ks.filter(k => lernStatus(kid, k.id) === 'vorschlag').length;
    return `<details class="karte abstand" ${offen ? 'open' : ''}><summary><b>${esc(nr)} · ${esc(titel)}</b> <span class="klein leise">${plural(ks.length, 'Karte', 'Karten')}${offen ? ` · ${offen} zu prüfen` : ''}</span></summary><ul class="liste">${ks.map(zeile).join('')}</ul></details>`;
  }).join('');
  return `<section class="karte"><div class="zeile dazwischen" style="flex-wrap:wrap;gap:10px"><div><h2 style="margin:0">Lernkarten</h2>
    <p class="leise" style="margin:4px 0 0">${zahl('frei')} freigegeben · ${vorschlaege} Vorschläge · ${zahl('abgelehnt')} abgelehnt</p></div>
    ${vorschlaege ? `<button class="knopf primaer" data-action="karten-alle-frei" data-kid="${kid}">Alle ${vorschlaege} Vorschläge freigeben</button>` : ''}</div>
    <p class="klein leise abstand" style="margin-bottom:0">Die Karten sind aus euren Foliensätzen erzeugt und nennen jeweils die Folie. Studierende sehen nur, was ihr freigebt. Abgelehnte Karten bleiben hier sichtbar und lassen sich später doch noch freigeben.</p></section>
    ${gruppen}`;
}
function lernFreigabeSetzen(kid, ids, status) {
  lernTabellen();
  let f = lernFreigabe(kid);
  if (!f) { f = { kurs_id: kid, freigegeben: [], abgelehnt: [] }; db.lernkarten_freigabe.push(f); }
  f.freigegeben = (f.freigegeben || []).filter(x => !ids.includes(x)); f.abgelehnt = (f.abgelehnt || []).filter(x => !ids.includes(x));
  if (status === 'frei') f.freigegeben.push(...ids); else if (status === 'abgelehnt') f.abgelehnt.push(...ids);
  speichern(); render();
}
AKTIONEN['karte-status'] = el => lernFreigabeSetzen(Number(el.dataset.kid), [el.dataset.id], el.dataset.status);
AKTIONEN['karten-alle-frei'] = el => {
  const kid = Number(el.dataset.kid), ids = lernKarten(kid, false).filter(k => lernStatus(kid, k.id) === 'vorschlag').map(k => k.id);
  lernFreigabeSetzen(kid, ids, 'frei'); toast('Freigegeben', `${plural(ids.length, 'Karte', 'Karten')} sind jetzt für die Studierenden sichtbar.`);
};

// ---------- Karte für die Übersicht der Studierenden ----------
function lernenKachel(u) {
  const kurse = kurseVon(u.id).filter(k => lernKarten(k.id).length);
  if (!kurse.length) return null;
  const zeilen = kurse.map(k => ({ k, z: lernZahlen(k.id, u.id) }));
  return `<div class="zeile dazwischen"><h2>Lernen</h2></div><ul class="liste">${zeilen.map(({ k, z }) => `<li><a class="zeile dazwischen" href="#/module/${k.id}/lernen" style="color:var(--text);text-decoration:none;gap:10px">
    <span><b class="klein">${esc(kursName(k.id))}</b><span class="klein leise" style="display:block">${z.faellig} fällig · ${z.neu} neu · ${z.sicher} von ${z.gesamt} sicher</span></span>
    <span class="marke-klein ${z.faellig + z.neu ? 'm-akzent' : 'm-gut'}">${z.faellig + z.neu ? 'lernen' : 'erledigt'}</span></a></li>`).join('')}</ul>`;
}
