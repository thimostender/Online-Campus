'use strict';
// Beteiligung im Modul: Evaluation der Lehrenden, Umfragen und Chat.
// Anonymität: Wer teilgenommen hat (…_TEILNAHME) und was geantwortet wurde (…_ANTWORT / …_STIMME)
// liegen in getrennten Tabellen ohne Verbindung. Gespeichert wird nur das Datum, keine Uhrzeit.
// Die Sicherheitsregeln lassen eine Antwort nur zusammen mit einer neuen Teilnahme zu, also einmal je Person.

const EVAL_FRAGEN = [
  ['verstaendlich', 'Die Inhalte wurden verständlich erklärt.'],
  ['struktur', 'Die Veranstaltung war gut strukturiert.'],
  ['praxis', 'Der Bezug zur Praxis war erkennbar.'],
  ['material', 'Die Materialien im Campus waren hilfreich.'],
  ['betreuung', 'Fragen wurden gut beantwortet, auch außerhalb der Termine.'],
  ['gesamt', 'Insgesamt bin ich mit der Lehrveranstaltung zufrieden.'],
];
const EVAL_SKALA = ['trifft gar nicht zu', 'trifft eher nicht zu', 'teils, teils', 'trifft eher zu', 'trifft voll zu'];
const EVAL_MINDEST = 3; // Ergebnisse erst ab 3 Rückmeldungen sichtbar
const neueId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const nurDatum = () => lokal(new Date()).slice(0, 10);

// ---------- Evaluation ----------
// Offen ab der Hälfte der Präsenz- und Online-Termine bis Semesterende
function evaluationStand(kid) {
  const ts = db.termin.filter(t => t.kurs_id === kid && t.art !== 'Klausur' && t.status !== 'ausgefallen').sort((a, b) => D(a.beginn) - D(b.beginn));
  const vorbei = ts.filter(t => D(t.ende) < new Date()).length, haelfte = Math.ceil(ts.length / 2);
  const ab = ts.length ? ts[haelfte - 1].ende : null;
  return { gesamt: ts.length, vorbei, offen: ts.length > 0 && vorbei >= haelfte, ab };
}
const hatEvaluiert = (kid, uid) => db.evaluation_teilnahme.some(t => t.kurs_id === kid && t.student_id === uid);
const offeneEvaluationen = uid => kurseVon(uid).filter(k => evaluationStand(k.id).offen && !hatEvaluiert(k.id, uid));

function evaluationStudierend(kid) {
  const u = ich(), st = evaluationStand(kid), lehr = lehrendeVon(kid);
  if (hatEvaluiert(kid, u.id)) return `<div class="hinweis gut">${I('check')}<div><b>Danke für deine Rückmeldung.</b> Du hast diese Veranstaltung evaluiert. Deine Antworten sind anonym gespeichert, getrennt davon nur die Information, dass du teilgenommen hast.</div></div>`;
  if (!st.offen) return `<div class="hinweis">${I('uhr')}<div><b>Die Evaluation öffnet nach der Hälfte der Termine.</b> Bisher haben ${st.vorbei} von ${st.gesamt} Terminen stattgefunden${st.ab ? `, voraussichtlich ab ${fmtDatum(st.ab)}` : ''}. So kannst du die Veranstaltung fundiert beurteilen.</div></div>`;
  return `<form class="karte" data-form="evaluation" data-kid="${kid}">
    <h2>Evaluation: ${esc(lehr.map(l => name(l)).join(', '))}</h2>
    <p class="leise">Einmal je Modul, anonym. ${st.vorbei} von ${st.gesamt} Terminen haben stattgefunden. Die Lehrenden sehen Ergebnisse erst ab ${EVAL_MINDEST} Rückmeldungen und nie, wer was geantwortet hat.</p>
    <div class="tabelle-huelle"><table class="eval-tabelle"><thead><tr><th></th>${EVAL_SKALA.map((s, i) => `<th title="${s}">${i + 1}<br><span class="klein leise" style="text-transform:none;font-weight:400">${s}</span></th>`).join('')}<th>k. A.</th></tr></thead><tbody>
    ${EVAL_FRAGEN.map(([k, frage]) => `<tr><td>${esc(frage)}</td>${[1, 2, 3, 4, 5].map(w => `<td><input type="radio" name="${k}" value="${w}" aria-label="${esc(frage)}: ${EVAL_SKALA[w - 1]}" required></td>`).join('')}<td><input type="radio" name="${k}" value="0" aria-label="${esc(frage)}: keine Angabe"></td></tr>`).join('')}
    </tbody></table></div>
    <label class="feld abstand"><span>Was war besonders gut?</span><textarea name="gut" placeholder="freiwillig"></textarea></label>
    <label class="feld"><span>Was sollte besser werden?</span><textarea name="besser" placeholder="freiwillig"></textarea></label>
    <p class="klein leise">Bitte keine Namen oder Angaben in die Textfelder schreiben, an denen man dich erkennen kann.</p>
    <button class="knopf primaer">${I('check')} Evaluation abschicken</button>
  </form>`;
}
FORMULARE.evaluation = (f, fd) => {
  const u = ich(), kid = Number(f.dataset.kid);
  if (hatEvaluiert(kid, u.id)) { toast('Schon teilgenommen', 'Du kannst jedes Modul nur einmal evaluieren.'); return; }
  if (!evaluationStand(kid).offen) { toast('Evaluation noch nicht offen'); return; }
  const werte = Object.fromEntries(EVAL_FRAGEN.map(([k]) => [k, Number(fd.get(k) || 0)]));
  // Getrennt: Teilnahme (mit Person, ohne Antworten) und Antwort (ohne Person); beides nur mit Datum
  db.evaluation_teilnahme.push({ kurs_id: kid, student_id: u.id, am: nurDatum() });
  db.evaluation_antwort.push({ id: neueId(), kurs_id: kid, werte, gut: String(fd.get('gut') || '').trim(), besser: String(fd.get('besser') || '').trim(), am: nurDatum() });
  speichern(); render();
  toast('Evaluation abgeschickt', 'Danke! Deine Antworten sind anonym.');
};

function evaluationErgebnis(kid) {
  const antworten = db.evaluation_antwort.filter(a => a.kurs_id === kid), studis = studisVon(kid).length, st = evaluationStand(kid);
  const teilnahmen = db.evaluation_teilnahme.filter(t => t.kurs_id === kid).length;
  const kopf = `<div class="zeile dazwischen" style="flex-wrap:wrap"><h2 style="margin:0">Evaluation</h2><span class="marke-klein ${st.offen ? 'm-gut' : ''}">${st.offen ? 'offen' : `öffnet${st.ab ? ' ab ' + fmtDatum(st.ab) : ''}`}</span></div>
    <p class="leise">${plural(teilnahmen, 'Rückmeldung', 'Rückmeldungen')} von ${studis} Studierenden (Rücklauf ${studis ? Math.round(teilnahmen / studis * 100) : 0} %). ${st.vorbei} von ${st.gesamt} Terminen haben stattgefunden.</p>`;
  if (antworten.length < EVAL_MINDEST) return `<section class="karte">${kopf}<div class="hinweis">${I('schloss')}<div>Ergebnisse erscheinen ab ${EVAL_MINDEST} Rückmeldungen, damit niemand anhand der Antworten erkennbar ist.</div></div></section>`;
  const zeilen = EVAL_FRAGEN.map(([k, frage]) => {
    const w = antworten.map(a => a.werte[k]).filter(x => x > 0), schnitt = w.length ? w.reduce((s, x) => s + x, 0) / w.length : 0;
    const verteilung = [1, 2, 3, 4, 5].map(z => w.filter(x => x === z).length);
    return `<li><div class="zeile dazwischen"><span>${esc(frage)}</span><b>${w.length ? schnitt.toFixed(1).replace('.', ',') : '–'}</b></div>
      <div class="eval-balken" role="img" aria-label="Verteilung: ${verteilung.map((n, i) => `${i + 1}: ${n}`).join(', ')}">${verteilung.map((n, i) => `<i style="flex:${n || 0.001};background:var(--eval-${i + 1})" title="${EVAL_SKALA[i]}: ${n}"></i>`).join('')}</div></li>`;
  }).join('');
  // Kommentare gemischt, ohne Datum, damit keine Reihenfolge verrät, wer schrieb
  const mischen = arr => arr.map(x => [pseudoHash(x + kid), x]).sort().map(x => x[1]);
  const gut = mischen(antworten.map(a => a.gut).filter(Boolean)), besser = mischen(antworten.map(a => a.besser).filter(Boolean));
  return `<section class="karte">${kopf}<p class="klein leise">Skala 1 = trifft gar nicht zu bis 5 = trifft voll zu. Balken: Verteilung der Antworten.</p><ul class="liste">${zeilen}</ul></section>
    <div class="raster raster-2 abstand"><section class="karte"><h3>Was war besonders gut?</h3><ul class="liste">${gut.map(t => `<li>„${esc(t)}“</li>`).join('') || '<li class="leer">Keine Kommentare</li>'}</ul></section>
    <section class="karte"><h3>Was sollte besser werden?</h3><ul class="liste">${besser.map(t => `<li>„${esc(t)}“</li>`).join('') || '<li class="leer">Keine Kommentare</li>'}</ul></section></div>`;
}
function vEvaluationen() {
  const kurse = db.kurs.filter(k => k.semester_id === aktSem().id);
  return `${kopfzeile('Evaluationen', `Lehrevaluation im ${esc(aktSem().bezeichnung)}. Durchschnitte erst ab ${EVAL_MINDEST} Rückmeldungen.`)}
  <section class="karte"><div class="tabelle-huelle"><table><thead><tr><th>Modul</th><th>Lehrende</th><th>Status</th><th>Rücklauf</th><th>Gesamteindruck</th></tr></thead><tbody>
  ${kurse.map(k => { const st = evaluationStand(k.id), a = db.evaluation_antwort.filter(x => x.kurs_id === k.id), n = db.evaluation_teilnahme.filter(t => t.kurs_id === k.id).length, s = studisVon(k.id).length;
    const g = a.map(x => x.werte.gesamt).filter(x => x > 0);
    return `<tr><td class="fett">${esc(kursName(k.id))}</td><td class="klein">${lehrendeVon(k.id).map(l => esc(name(l))).join(', ')}</td><td><span class="marke-klein ${st.offen ? 'm-gut' : ''}">${st.offen ? 'offen' : `ab ${st.ab ? fmtDatum(st.ab) : '–'}`}</span></td><td>${n} / ${s}</td>
      <td>${a.length >= EVAL_MINDEST && g.length ? `<b>${(g.reduce((x, y) => x + y, 0) / g.length).toFixed(1).replace('.', ',')}</b> <span class="klein leise">von 5</span>` : '<span class="leise klein">zu wenige</span>'}</td></tr>`; }).join('')}
  </tbody></table></div></section>`;
}

// ---------- Umfragen ----------
const umfrageOffen = u => !u.beendet && (!u.endet_am || D(u.endet_am) > new Date());
const hatAbgestimmt = (uid, umfrageId) => db.umfrage_teilnahme.some(t => t.umfrage_id === umfrageId && t.student_id === uid);
const offeneUmfragen = uid => db.umfrage.filter(x => kurseVon(uid).some(k => k.id === x.kurs_id) && umfrageOffen(x) && !hatAbgestimmt(uid, x.id));
function umfrageErgebnis(x) {
  const stimmen = db.umfrage_stimme.filter(s => s.umfrage_id === x.id), gesamt = stimmen.length;
  return `<ul class="umfrage-ergebnis">${x.optionen.map((o, i) => { const n = stimmen.filter(s => s.option === i).length, p = gesamt ? Math.round(n / gesamt * 100) : 0;
    return `<li><div class="zeile dazwischen klein"><span>${esc(o)}</span><b>${p} % <span class="leise" style="font-weight:400">(${n})</span></b></div><div class="balken"><i style="width:${p}%"></i></div></li>`; }).join('')}</ul>
    <p class="klein leise" style="margin:6px 0 0">${plural(gesamt, 'Stimme', 'Stimmen')} · anonym</p>`;
}
function umfragenStudierend(kid) {
  const u = ich(), liste = db.umfrage.filter(x => x.kurs_id === kid).sort((a, b) => D(b.erstellt_am) - D(a.erstellt_am));
  if (!liste.length) return '<div class="karte leer">Noch keine Umfragen in diesem Modul.</div>';
  return liste.map(x => {
    const offen = umfrageOffen(x), abgestimmt = hatAbgestimmt(u.id, x.id);
    return `<section class="karte"><div class="zeile dazwischen oben" style="flex-wrap:wrap"><h3 style="margin:0">${esc(x.frage)}</h3><span class="marke-klein ${offen ? 'm-gut' : ''}">${offen ? (x.endet_am ? 'offen bis ' + fmtDatum(x.endet_am) : 'offen') : 'beendet'}</span></div>
      <p class="klein leise">${esc(name(byId('user', x.ersteller_id)))} · ${relZeit(x.erstellt_am)}</p>
      ${offen && !abgestimmt ? `<form data-form="abstimmen" data-id="${x.id}">${x.optionen.map((o, i) => `<label class="haken" style="margin:6px 0"><input type="radio" name="option" value="${i}" required> <span>${esc(o)}</span></label>`).join('')}
        <button class="knopf primaer abstand">Abstimmen</button><p class="klein leise" style="margin:6px 0 0">Anonym. Du kannst einmal abstimmen, danach siehst du das Ergebnis.</p></form>`
        : `${abgestimmt ? `<p class="marke-klein m-gut" style="margin-bottom:8px">${I('check')} Du hast abgestimmt</p>` : ''}${umfrageErgebnis(x)}`}
    </section>`;
  }).join('');
}
FORMULARE.abstimmen = (f, fd) => {
  const u = ich(), x = byId('umfrage', f.dataset.id) || db.umfrage.find(y => String(y.id) === f.dataset.id);
  if (!x || !umfrageOffen(x)) { toast('Die Umfrage ist beendet'); return; }
  if (hatAbgestimmt(u.id, x.id)) { toast('Schon abgestimmt', 'Jede Person kann einmal abstimmen.'); return; }
  db.umfrage_teilnahme.push({ umfrage_id: x.id, student_id: u.id, am: nurDatum() });
  db.umfrage_stimme.push({ id: neueId(), umfrage_id: x.id, option: Number(fd.get('option')) });
  speichern(); render(); toast('Stimme abgegeben', 'Anonym gezählt');
};
function umfragenLehrend(kid) {
  const liste = db.umfrage.filter(x => x.kurs_id === kid).sort((a, b) => D(b.erstellt_am) - D(a.erstellt_am));
  return `<section class="karte"><h2>Neue Umfrage</h2><form data-form="umfrage-neu" data-kid="${kid}">
      <label class="feld"><span>Frage</span><input name="frage" required placeholder="z. B. Welcher Nachholtermin passt euch?"></label>
      <label class="feld"><span>Antwortmöglichkeiten, eine pro Zeile (2 bis 6)</span><textarea name="optionen" required placeholder="Montag, 18 Uhr&#10;Mittwoch, 18 Uhr&#10;Samstag, 10 Uhr"></textarea></label>
      <label class="feld"><span>Läuft bis (freiwillig)</span><input type="datetime-local" name="endet"></label>
      <button class="knopf primaer">${I('megafon')} Umfrage starten und Gruppe benachrichtigen</button></form></section>
    ${liste.map(x => { const teil = db.umfrage_teilnahme.filter(t => t.umfrage_id === x.id).length, studis = studisVon(kid).length;
      return `<section class="karte"><div class="zeile dazwischen oben" style="flex-wrap:wrap"><h3 style="margin:0">${esc(x.frage)}</h3><span class="zeile" style="gap:6px"><span class="marke-klein ${umfrageOffen(x) ? 'm-gut' : ''}">${umfrageOffen(x) ? 'läuft' : 'beendet'}</span>${umfrageOffen(x) ? `<button class="knopf klein" data-action="umfrage-beenden" data-id="${x.id}">Beenden</button>` : ''}</span></div>
      <p class="klein leise">${teil} von ${studis} haben abgestimmt · ${relZeit(x.erstellt_am)}</p>${umfrageErgebnis(x)}</section>`; }).join('')}`;
}
FORMULARE['umfrage-neu'] = (f, fd) => {
  const u = ich(), kid = Number(f.dataset.kid);
  const optionen = String(fd.get('optionen')).split('\n').map(s => s.trim()).filter(Boolean);
  if (optionen.length < 2 || optionen.length > 6) { toast('Bitte 2 bis 6 Antwortmöglichkeiten angeben', 'Eine pro Zeile'); return; }
  const x = { id: neueId(), kurs_id: kid, ersteller_id: u.id, frage: String(fd.get('frage')).trim(), optionen, erstellt_am: new Date().toISOString(), endet_am: fd.get('endet') ? new Date(fd.get('endet')).toISOString() : null, beendet: false };
  db.umfrage.push(x);
  const z = sende({ absender: u.id, anlass: 'neuigkeit', titel: `Neue Umfrage: ${kursName(kid)}`, text: x.frage, kurs_id: kid, empfaenger: studisVon(kid), link: `#/module/${kid}/umfragen` });
  speichern(); render(); toast('Umfrage gestartet', zustellText(z));
};
AKTIONEN['umfrage-beenden'] = el => { const x = db.umfrage.find(y => String(y.id) === el.dataset.id); x.beendet = true; speichern(); render(); toast('Umfrage beendet', 'Die Studierenden sehen jetzt das Ergebnis.'); };

// ---------- Chat im Modul ----------
function chatSeite(kid) {
  return `<section class="karte chat"><div class="zeile dazwischen"><h2 style="margin:0">Chat ${esc(kursName(kid))}</h2><span class="klein leise">${plural(studisVon(kid).length, 'Person', 'Personen')} und ${lehrendeVon(kid).map(l => esc(name(l))).join(', ')}</span></div>
    <div class="chat-verlauf" id="chat-verlauf" data-kid="${kid}" aria-live="polite">${chatNachrichten(kid)}</div>
    <form class="chat-eingabe" data-form="chat" data-kid="${kid}"><input name="text" placeholder="Nachricht an den Kurs …" autocomplete="off" maxlength="1000" aria-label="Nachricht" required><button class="knopf primaer" aria-label="Senden">${I('pfeil')}</button></form>
    <p class="klein leise" style="margin:6px 0 0">Sichtbar für alle im Kurs. Für Persönliches bitte die E-Mail der Lehrenden nutzen.</p></section>`;
}
function chatNachrichten(kid) {
  const u = ich(), liste = db.chat_nachricht.filter(n => n.kurs_id === kid).sort((a, b) => D(a.erstellt_am) - D(b.erstellt_am)).slice(-200);
  if (!liste.length) return '<p class="leer">Noch keine Nachrichten. Schreib die erste!</p>';
  let letzterTag = '';
  return liste.map(n => {
    const autor = byId('user', n.autor_id), eigen = n.autor_id === u.id, tag = D(n.erstellt_am).toDateString();
    const trenner = tag !== letzterTag ? `<div class="chat-tag">${relTag(n.erstellt_am)[0].toUpperCase() + relTag(n.erstellt_am).slice(1)}</div>` : '';
    letzterTag = tag;
    return `${trenner}<div class="chat-nachricht ${eigen ? 'eigen' : ''} ${autor?.rolle === 'lehrend' ? 'lehrend' : ''}">
      ${eigen ? '' : `<span class="chat-autor">${esc(autor ? name(autor) : 'Unbekannt')}${autor?.rolle === 'lehrend' ? ' <span class="marke-klein m-akzent">Lehrende</span>' : ''}</span>`}
      <span class="chat-text">${esc(n.text)}</span><span class="chat-zeit">${fmtZeit(n.erstellt_am)}</span></div>`;
  }).join('');
}
function chatAktualisieren() {
  const v = document.getElementById('chat-verlauf');
  if (!v) return false;
  const unten = v.scrollHeight - v.scrollTop - v.clientHeight < 60;
  v.innerHTML = chatNachrichten(Number(v.dataset.kid));
  if (unten) v.scrollTop = v.scrollHeight;
  return true;
}
FORMULARE.chat = (f, fd) => {
  const text = String(fd.get('text') || '').trim();
  if (!text) return;
  db.chat_nachricht.push({ id: neueId(), kurs_id: Number(f.dataset.kid), autor_id: ich().id, text, erstellt_am: new Date().toISOString() });
  speichern();
  f.reset(); chatAktualisieren();
  const v = document.getElementById('chat-verlauf'); if (v) v.scrollTop = v.scrollHeight;
  f.querySelector('input').focus();
};
// Nach dem Öffnen des Chats ans Ende scrollen
window.addEventListener('hashchange', () => setTimeout(() => { const v = document.getElementById('chat-verlauf'); if (v) v.scrollTop = v.scrollHeight; }, 50));
