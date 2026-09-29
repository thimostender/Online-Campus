'use strict';
// Hilfe-Assistent.
// 1. Persönliche Fragen (Fristen, Termine, Noten, ECTS) beantwortet er direkt aus den Daten.
// 2. Fachfragen beantwortet er aus Lehrmaterialien, FAQ und Service-Texten: Suche (BM25) über
//    MATERIAL_ABSCHNITT, Antwort aus den passendsten Sätzen, immer mit Quelle und Seite.
// 3. Ist ASSISTENT_KONFIG.llmEndpunkt gesetzt, gehen Frage und gefundene Abschnitte an ein
//    Sprachmodell auf dem eigenen Server (siehe server-assistent-beispiel.mjs). Der Schlüssel
//    liegt dort, nie im Browser. Die Rechte bleiben gleich: Das Modell sieht nur Abschnitte,
//    die die Person auch selbst öffnen darf.

const ASSISTENT_KONFIG = { llmEndpunkt: null }; // z. B. '/api/assistent'
const assistent = { offen: false, verlauf: [], denkt: false };

// ---------- Textaufbereitung ----------
const STOPP = new Set('der die das den dem des ein eine einer eines einem einen und oder aber auch als am an auf aus bei bis bin bist da damit dann dass du er es für fuer hat habe haben hier ich ihr im in ist ja kann kannst mal man mich mir mit muss nach nicht noch nur ob sich sie sind so über ueber um uns von vor war was welche welcher welches wenn wer wie wird wo zu zum zur mein meine meinen meiner meinem gibt geht bitte bedeutet bedeutung heisst gilt gelten steht stehen versteht wofuer welchen zwischen eigentlich genau wann wo wie wer warum wieso weshalb welches welchem do does i you my can should when where who why which erklär erklaer erkläre erklaere sag sage the a an of to is are and or what how'.split(' '));
function normalisiere(s) { return String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
function stamm(w) {
  for (const e of ['ungen', 'ung', 'heiten', 'heit', 'keiten', 'keit', 'en', 'er', 'es', 'em', 'e', 'n', 's']) {
    if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length);
  }
  return w;
}
function woerter(s) { return normalisiere(s).split(/[^a-z0-9§]+/).filter(w => w && !STOPP.has(w) && (w.length > 1 || /\d/.test(w))).map(stamm); }

// ---------- Wissensbasis (nur, was die Person sehen darf) ----------
function wissensbasis(u) {
  const jetzt = new Date(), docs = [];
  const kurse = kurseVon(u.id, true).map(k => k.id);
  db.material.filter(m => kurse.includes(m.kurs_id) && (u.rolle !== 'studierend' || D(m.sichtbar_ab) <= jetzt)).forEach(m => {
    db.abschnitt.filter(a => a.material_id === m.id).forEach(a => docs.push({
      text: a.text, quelle: `${m.titel}, Seite ${a.seite}`, unter: kursName(m.kurs_id),
      link: u.rolle === 'studierend' ? `#/module/${m.kurs_id}/materialien` : `#/kurse/${m.kurs_id}/materialien`, art: 'Material',
    }));
  });
  db.service.faq.forEach(f => docs.push({ text: f.frage + '\n' + f.antwort, antwort: f.antwort, quelle: 'Häufige Fragen', unter: f.frage, link: '#/service/formulare', art: 'FAQ' }));
  db.service.ansprechpersonen.forEach(a => docs.push({ text: `${a.name} ist zuständig für ${a.aufgabe}. E-Mail ${a.email}, Telefon ${a.telefon}, erreichbar ${a.zeiten}. Kontakt Ansprechpartner`, quelle: 'Ansprechpersonen', unter: a.name, link: '#/service/kontakt', art: 'Kontakt' }));
  kurseVon(u.id).forEach(k => { const m = modulVon(k); docs.push({ text: `${m.titel} (${m.kuerzel}): ${m.beschreibung}`, quelle: 'Modulbeschreibung', unter: m.kurztitel, link: u.rolle === 'studierend' ? `#/module/${k.id}` : `#/kurse/${k.id}`, art: 'Modul' }); });
  docs.forEach(d => { d.woerter = woerter(d.text + ' ' + d.unter); });
  return docs;
}

// BM25 mit Teilwort-Treffern, damit „Kündigung“ auch „Kündigungsschutzklage“ findet
function wissensSuche(frage, docs, anzahl = 4) {
  const q = [...new Set(woerter(frage))];
  if (!q.length || !docs.length) return [];
  const N = docs.length, mittel = docs.reduce((s, d) => s + d.woerter.length, 0) / N, k1 = 1.2, b = 0.75;
  // Exakte Treffer zählen voll, Teilwort-Treffer höchstens einmal halb
  const treffer = (d, t) => { let exakt = 0, teil = 0; d.woerter.forEach(w => { if (w === t) exakt++; else if (t.length >= 5 && w.length >= 5 && (w.startsWith(t) || t.startsWith(w))) teil = 0.5; }); return exakt + teil; };
  // Lehrmaterial vor allgemeinen Modulbeschreibungen bevorzugen
  const gewicht = { Material: 1.25, FAQ: 1, Kontakt: 1, Modul: 0.6 };
  const df = Object.fromEntries(q.map(t => [t, docs.filter(d => treffer(d, t) > 0).length]));
  return docs.map(d => {
    let score = 0;
    q.forEach(t => {
      const tf = treffer(d, t);
      if (!tf) return;
      const idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * d.woerter.length / mittel));
    });
    score *= gewicht[d.art] || 1;
    return { ...d, score, abdeckung: q.filter(t => treffer(d, t) > 0).length / q.length };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, anzahl);
}
// Die Sätze eines Abschnitts, die am meisten Suchwörter enthalten, in Originalreihenfolge
function kernsaetze(text, frage, max = 3) {
  const q = new Set(woerter(frage));
  const geschuetzt = text.replace(/\b(Abs|Nr|S|bzw|ca|vgl|Aufl|al|z\. B|u\. a|[A-ZÄÖÜ])\./g, '$1\u2024');
  const saetze = geschuetzt.split(/\n+|(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„(])/).map(s => s.replace(/\u2024/g, '.').trim()).filter(s => s.length > 12);
  const bewertet = saetze.map((s, i) => ({ s, i, p: woerter(s).filter(w => q.has(w) || [...q].some(t => t.length >= 5 && w.length >= 5 && (w.startsWith(t) || t.startsWith(w)))).length }));
  const beste = bewertet.filter(x => x.p > 0).sort((a, b) => b.p - a.p).slice(0, max).sort((a, b) => a.i - b.i);
  // Folgesatz mitnehmen, wenn der beste Satz mit Doppelpunkt endet (Aufzählung, Formel)
  const erg = beste.map(x => x.s);
  beste.forEach(x => { if (x.s.endsWith(':') && saetze[x.i + 1] && !erg.includes(saetze[x.i + 1])) erg.splice(erg.indexOf(x.s) + 1, 0, saetze[x.i + 1]); });
  return erg.length ? erg : saetze.slice(0, 2);
}

// ---------- Persönliche Fragen ----------
function erwaehntesModul(frage, kurse) {
  const n = normalisiere(frage);
  return kurse.find(k => { const m = modulVon(k); return [m.kuerzel, m.kurztitel, m.titel].some(x => n.includes(normalisiere(x))) || woerter(m.kurztitel).some(w => w.length >= 6 && woerter(frage).includes(w)); });
}
const htmlListe = eintraege => `<ul>${eintraege.map(e => `<li>${e}</li>`).join('')}</ul>`;
function persoenlicheAntwort(frage, u) {
  const n = normalisiere(frage), kurse = kurseVon(u.id), jetzt = new Date();
  const modul = erwaehntesModul(frage, kurse);
  const kursIds = modul ? [modul.id] : kurse.map(k => k.id);
  const fach = /\b(was ist|was sind|was bedeutet|erklaer|definier|wie berechne|wie funktioniert|unterschied|warum|beispiel|zustaendig)/.test(n);
  if (fach) return null;
  // Persönlicher Bezug: „meine“, „ich“, „heute“ … oder „wann“ zusammen mit Klausur, Abgabe, Vorlesung
  const persoenlich = /\b(mein|meine|meinen|meiner|meinem|ich|mir|mich|hab|habe|naechste|naechsten|naechster|heute|morgen|woche|wir|uns|unsere)\b/.test(n)
    || /\bwann\b.*\b(klausur|pruefung|abgabe|vorlesung|termin|seminar)/.test(n) || /^(noten|termine|fristen|stundenplan)\??$/.test(n.trim());
  if (!persoenlich) return null;
  const s = u.rolle === 'studierend';
  const modulLink = k => s ? `#/module/${k}` : `#/kurse/${k}`;

  if (/\b(abgabe\w*|frist|fristen|deadline\w*|faellig\w*|einreich\w*|hausarbeit|projekt)\b/.test(n) && s) {
    const ps = pruefungenVon(kursIds).filter(p => D(p.frist) > jetzt && p.mit_upload);
    if (!ps.length) return { html: modul ? `In <b>${esc(modul && kursName(modul.id))}</b> steht keine offene Abgabe an.` : 'Du hast gerade keine offenen Abgaben.' };
    return { html: `${ps.length === 1 ? 'Deine nächste Abgabe' : 'Deine nächsten Abgaben'}:${htmlListe(ps.map(p => { const st = statusVon(p, u.id); return `<a href="#/module/${p.kurs_id}/abgabe">${esc(kursName(p.kurs_id))}</a>: ${esc(p.art)} bis ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr (${countdown(p.frist).text}) · ${esc(st.text)}`; }))}`, quellen: [{ quelle: 'Deine Prüfungen', link: '#/leistungen' }] };
  }
  if (/klausur|pruefung/.test(n)) {
    const ps = pruefungenVon(kursIds).filter(p => D(p.frist) > jetzt && (/klausur/.test(n) ? !p.mit_upload : true));
    if (!ps.length) return { html: 'In diesem Semester steht keine weitere Klausur an.' };
    return { html: `Anstehende ${/klausur/.test(n) ? 'Klausuren' : 'Prüfungen'}:${htmlListe(ps.map(p => { const t = db.termin.find(x => x.kurs_id === p.kurs_id && x.art === 'Klausur' && Math.abs(D(x.beginn) - D(p.frist)) < 864e5); return `<a href="${modulLink(p.kurs_id)}">${esc(kursName(p.kurs_id))}</a>: ${esc(p.art)} am ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr${t ? ' · ' + esc(raumName(t)) : ''}`; }))}` };
  }
  if (/(note|ergebnis|bewert|bestanden)/.test(n) && s) {
    const ns = db.note.filter(x => x.student_id === u.id && x.freigegeben_am && kursIds.includes(byId('pruefung', x.pruefung_id).kurs_id));
    const offen = pruefungenVon(kursIds).filter(p => statusVon(p, u.id).code === 'korrektur');
    let html = ns.length ? `Deine Noten ${modul ? 'in ' + esc(kursName(modul.id)) : 'in diesem Semester'}:${htmlListe(ns.map(x => { const p = byId('pruefung', x.pruefung_id); return `<a href="#/module/${p.kurs_id}/ergebnis">${esc(kursName(p.kurs_id))}</a>: <b>${noteFmt(x.wert)}</b> (${x.bestaetigt_am ? 'endgültig' : 'vorläufig'})`; }))}` : 'Für dieses Semester ist noch keine Note freigegeben. ';
    if (offen.length) html += `In Korrektur: ${offen.map(p => esc(kursName(p.kurs_id))).join(', ')}. Du bekommst eine Mitteilung, sobald die Note freigegeben ist.`;
    return { html, quellen: [{ quelle: 'Leistungen', link: '#/leistungen' }] };
  }
  if (/(ects|credit|leistungspunkt|wie weit|stand)/.test(n) && s) {
    const st = ectsStand(u.id);
    return { html: `Du hast <b>${st.endgueltig} von ${st.gesamt} ECTS</b> endgültig erreicht${st.vorlaeufig ? `, dazu ${st.vorlaeufig} ECTS mit vorläufiger Note` : ''}. ${st.schnittGesamt ? `Dein Durchschnitt über alle Semester liegt bei ${noteFmt(st.schnittGesamt)}.` : ''}`, quellen: [{ quelle: 'Studienverlauf', link: '#/leistungen' }] };
  }
  if (/(schwerpunkt|medien oder it|wahl)/.test(n) && s) {
    const sp = schwerpunktVon(u.id), anderer = sp === 'M' ? 'I' : 'M';
    const eigene = db.modul.filter(m => m.schwerpunkt === sp).map(m => esc(m.kurztitel));
    return { html: `Du studierst im <b>${SCHWERPUNKTE[sp]}</b>. Dazu gehören ${eigene.length} eigene Module, zum Beispiel ${eigene.slice(0, 4).join(', ')}. Die Module im ${SCHWERPUNKTE[anderer]} laufen parallel, alle übrigen besucht ihr gemeinsam. <a href="#/leistungen">Zum Studienverlauf</a>` };
  }
  if (/(aenderung|ausfall|faellt aus|verlegt|vertretung)/.test(n)) {
    const ts = termineVon(kursIds, u.id).filter(t => D(t.ende) > jetzt && (t.status !== 'geplant' || t.vertretung_id)).slice(0, 5);
    return { html: ts.length ? `Aktuelle Änderungen:${htmlListe(ts.map(t => `${fmtDatum(t.beginn)}, ${fmtZeit(t.beginn)} · <a href="${modulLink(t.kurs_id)}">${esc(kursName(t.kurs_id))}</a>: ${esc(t.hinweis || t.status)}`))}` : 'Es gibt gerade keine Änderungen in deinem Stundenplan.', quellen: [{ quelle: 'Stundenplan', link: '#/stundenplan' }] };
  }
  if (/\b(heute|morgen|woche|stundenplan|vorlesung\w*|termin\w*|raum|wann|wo)\b/.test(n)) {
    const ziel = /morgen/.test(n) ? 1 : /heute/.test(n) ? 0 : null;
    let ts = termineVon(kursIds, u.id).filter(t => D(t.ende) > jetzt);
    if (ziel !== null) ts = ts.filter(t => tagDiff(t.beginn) === ziel);
    else if (/woche/.test(n)) ts = ts.filter(t => tagDiff(t.beginn) < 7);
    else ts = ts.slice(0, 3);
    if (!ts.length) return { html: ziel === 0 ? 'Heute hast du keine Veranstaltung mehr.' : ziel === 1 ? 'Morgen hast du keine Veranstaltung.' : 'Keine anstehenden Termine gefunden.' };
    return { html: htmlListe(ts.map(t => `${relTag(t.beginn)}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} · <a href="${modulLink(t.kurs_id)}">${esc(kursName(t.kurs_id))}</a> · ${t.raum_id ? `<a href="#/service/lageplan?raum=${t.raum_id}">${esc(raumName(t))}</a>` : 'Online'}${t.status === 'ausgefallen' ? ' · <b>fällt aus</b>' : t.status === 'verlegt' ? ' · <b>geändert</b>' : ''}`)), quellen: [{ quelle: 'Stundenplan', link: '#/stundenplan' }] };
  }
  if (/(korrektur|korrigier|bewerten)/.test(n) && u.rolle === 'lehrend') {
    const ps = pruefungenVon(kursIds).map(p => ({ p, st: korrekturStand(p) })).filter(x => x.st.vorbei && x.st.frei < x.st.abgegeben);
    return { html: ps.length ? `Offen:${htmlListe(ps.map(({ p, st }) => `<a href="#/korrektur/${p.id}">${esc(kursName(p.kurs_id))}</a>: ${st.bewertet} von ${st.abgegeben} bewertet, ${st.frei} freigegeben`))}` : 'Du hast keine offenen Korrekturen.' };
  }
  return null;
}

// ---------- Antwort ----------
async function beantworte(frage) {
  const u = ich();
  const direkt = persoenlicheAntwort(frage, u);
  if (direkt) return direkt;
  const funde = wissensSuche(frage, wissensbasis(u));
  const gut = funde.filter(f => f.score >= 1.2 && f.abdeckung >= 0.34);
  if (!gut.length) {
    return { html: `Dazu habe ich in deinen Unterlagen nichts gefunden. Versuch es mit anderen Begriffen, zum Beispiel dem Fachbegriff aus der Vorlesung. Bei organisatorischen Fragen hilft das <a href="#/service/kontakt">Studienbüro</a>.` };
  }
  if (ASSISTENT_KONFIG.llmEndpunkt) {
    try {
      const r = await fetch(ASSISTENT_KONFIG.llmEndpunkt, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frage, abschnitte: gut.map(f => ({ quelle: f.quelle, modul: f.unter, text: f.text })) }) });
      if (r.ok) { const j = await r.json(); return { html: esc(j.antwort).replace(/\n/g, '<br>'), quellen: gut.slice(0, 3) }; }
    } catch { /* ohne Modell weiter mit der Auszugs-Antwort */ }
  }
  const beste = gut[0];
  const saetze = kernsaetze(beste.antwort || beste.text, frage);
  return {
    html: `${beste.art === 'Material' ? `Laut <b>${esc(beste.quelle)}</b> (${esc(beste.unter)}):` : beste.art === 'FAQ' ? `Aus den häufigen Fragen („${esc(beste.unter)}“):` : `${esc(beste.quelle)}:`}<blockquote>${saetze.map(esc).join('<br>')}</blockquote>`,
    quellen: gut.slice(0, 3),
  };
}

// ---------- Oberfläche ----------
function assistentVorschlaege() {
  const r = rolle();
  if (r === 'studierend') return schwerpunktVon(ich().id) === 'I'
    ? ['Wann ist meine nächste Abgabe?', 'Was ist die dritte Normalform?', 'Was bedeutet die CIA-Triade?', 'Wie lange verjähren Mängelansprüche?', 'Wie viele ECTS habe ich?']
    : ['Wann ist meine nächste Abgabe?', 'Was habe ich morgen?', 'Was ist ein indirekter Netzwerkeffekt?', 'Wie lange verjähren Mängelansprüche?', 'Wie viele ECTS habe ich?'];
  if (r === 'lehrend') return ['Was muss ich noch korrigieren?', 'Wann ist meine nächste Vorlesung?', 'Was gehört in den Praxistransferbericht zum Projektmanagement?'];
  return ['Wer ist für Fristverlängerungen zuständig?', 'Was bedeutet vorläufig bei einer Note?'];
}
function assistentRendern() {
  const box = document.getElementById('assistent');
  if (!box) return;
  if (!ich()) { box.innerHTML = ''; return; }
  if (!assistent.offen) {
    box.innerHTML = `<button class="assistent-knopf" data-action="assistent-auf" aria-label="Hilfe-Assistent öffnen">${I('chat')}<span>Fragen</span></button>`;
    return;
  }
  const leer = !assistent.verlauf.length;
  box.innerHTML = `<section class="assistent" role="dialog" aria-label="Hilfe-Assistent">
    <header class="assistent-kopf"><span class="zeile">${I('chat')}<b>Hilfe-Assistent</b>${ASSISTENT_KONFIG.llmEndpunkt ? '<span class="marke-klein m-akzent">mit Claude</span>' : ''}</span><button class="rund" style="width:34px;height:34px" data-action="assistent-zu" aria-label="Schließen">${I('x')}</button></header>
    <div class="assistent-verlauf" id="assistent-verlauf" aria-live="polite">
      ${leer ? `<div class="blase bot">Hallo ${esc(ich().vorname)}! Ich beantworte Fragen zu deinen Terminen, Fristen und Noten und durchsuche die Lehrmaterialien deiner Module. Jede Antwort nennt die Quelle.</div>
        <div class="vorschlaege">${assistentVorschlaege().map(v => `<button data-action="assistent-frage" data-frage="${esc(v)}">${esc(v)}</button>`).join('')}</div>` : ''}
      ${assistent.verlauf.map(m => `<div class="blase ${m.von}">${m.html}${m.quellen?.length ? `<div class="quellen">${m.quellen.map(q => `<a href="${q.link}" data-action="assistent-link">${I('datei')}${esc(q.quelle)}</a>`).join('')}</div>` : ''}</div>`).join('')}
      ${assistent.denkt ? '<div class="blase bot leise">Suche in deinen Unterlagen …</div>' : ''}
    </div>
    <form class="assistent-eingabe" data-form="assistent"><input name="frage" placeholder="Frage stellen …" autocomplete="off" aria-label="Frage an den Assistenten" required><button class="knopf primaer" aria-label="Senden">${I('pfeil')}</button></form>
    <p class="assistent-hinweis">Antworten stammen aus deinen Daten und Unterlagen. Im Zweifel gilt das Original.</p>
  </section>`;
  const v = document.getElementById('assistent-verlauf'); v.scrollTop = v.scrollHeight;
  box.querySelector('input[name=frage]')?.focus();
}
async function assistentFragen(frage) {
  frage = String(frage || '').trim();
  if (!frage) return;
  assistent.verlauf.push({ von: 'ich', html: esc(frage) });
  assistent.denkt = true; assistentRendern();
  let antwort;
  try { antwort = await beantworte(frage); } catch (e) { console.error(e); antwort = { html: 'Da ist etwas schiefgelaufen. Versuch es bitte noch einmal.' }; }
  assistent.denkt = false;
  assistent.verlauf.push({ von: 'bot', ...antwort });
  assistentRendern();
}
AKTIONEN['assistent-auf'] = () => { assistent.offen = true; assistentRendern(); };
AKTIONEN['assistent-zu'] = () => { assistent.offen = false; assistentRendern(); };
AKTIONEN['assistent-frage'] = el => assistentFragen(el.dataset.frage);
AKTIONEN['assistent-link'] = () => { if (matchMedia('(max-width: 860px)').matches) { assistent.offen = false; setTimeout(assistentRendern, 0); } };
FORMULARE.assistent = (f, fd) => assistentFragen(fd.get('frage'));

// Läuft der Prototyp über server-assistent-beispiel.mjs, antwortet Claude; sonst die lokale Auszugs-Antwort.
fetch('api/assistent/bereit').then(r => r.ok ? r.json() : null).then(j => { if (j?.bereit) { ASSISTENT_KONFIG.llmEndpunkt = 'api/assistent'; assistentRendern(); } }).catch(() => { /* ohne Server: lokal */ });
