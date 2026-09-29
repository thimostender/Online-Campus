'use strict';
// Anwesenheitskontrolle je Termin. Lehrende erfassen, Studierende sehen nur die eigene, die Verwaltung wertet aus.
// Tabelle ANWESENHEIT: ein Eintrag je Termin und Person (Schlüssel termin_student).

const ANW_STATUS = {
  anwesend: { text: 'anwesend', kurz: 'A', kl: 'm-gut' },
  verspaetet: { text: 'verspätet', kurz: 'V', kl: 'm-warn' },
  entschuldigt: { text: 'entschuldigt', kurz: 'E', kl: 'm-info' },
  fehlt: { text: 'fehlt', kurz: 'F', kl: 'm-fehler' },
};
const ANW_GRENZE = 0.75; // Mindestquote, darunter Hinweis für die Verwaltung

const anwesenheitVon = (tid, uid) => db.anwesenheit.find(a => a.termin_id === tid && a.student_id === uid);
// Termine, für die Anwesenheit sinnvoll ist: keine Klausur, nicht ausgefallen, schon begonnen
const erfassbar = t => t.art !== 'Klausur' && t.status !== 'ausgefallen' && D(t.beginn) - 15 * 6e4 <= Date.now();
// Quote: anwesend und verspätet zählen, entschuldigt wird nicht mitgerechnet
function anwesenheitsQuote(uid, kursIds) {
  const ts = db.termin.filter(t => kursIds.includes(t.kurs_id) && erfassbar(t) && D(t.ende) < new Date());
  let da = 0, zaehlt = 0, offen = 0;
  ts.forEach(t => { const a = anwesenheitVon(t.id, uid); if (!a) { offen++; return; } if (a.status === 'entschuldigt') return; zaehlt++; if (a.status !== 'fehlt') da++; });
  return { quote: zaehlt ? da / zaehlt : null, da, zaehlt, offen, termine: ts.length };
}

// ---------- Lehrende: Erfassung je Termin ----------
function anwesenheitKnopf(t) {
  if (!erfassbar(t) || rolle() !== 'lehrend') return '';
  const erfasst = db.anwesenheit.filter(a => a.termin_id === t.id).length, gesamt = studisVon(t.kurs_id).length;
  return `<a class="knopf klein ${erfasst < gesamt && D(t.ende) - Date.now() < 3 * 3600e3 ? 'primaer' : ''}" href="#/anwesenheit/${t.id}">${I('check')} Anwesenheit${erfasst ? ` ${erfasst}/${gesamt}` : ''}</a>`;
}
function anwesenheitSeite(tid) {
  const u = ich(), t = byId('termin', tid);
  if (!t || !(u.rolle === 'verwaltung' || lehrendeVon(t.kurs_id).some(l => l.id === u.id) || t.vertretung_id === u.id)) throw new Error('kein Zugriff');
  const studis = studisVon(t.kurs_id).map(id => byId('user', id)), zurueck = u.rolle === 'lehrend' ? '#/anwesenheit' : `#/anwesenheit-uebersicht?kurs=${t.kurs_id}`;
  const zaehl = s => db.anwesenheit.filter(a => a.termin_id === tid && a.status === s).length;
  const kannErfassen = u.rolle !== 'studierend' && erfassbar(t);
  return `<a class="klein zeile" href="${zurueck}" style="gap:4px;margin-bottom:10px">${I('zurueck')} ${u.rolle === 'lehrend' ? 'Anwesenheit' : esc(kursName(t.kurs_id))}</a>
  ${kopfzeile(`Anwesenheit · ${esc(kursName(t.kurs_id))}`, `${fmtLang(D(t.beginn))}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} Uhr · ${esc(raumName(t))} · ${esc(byId('studiengruppe', byId('kurs', t.kurs_id).gruppe_id).name)}`)}
  <div class="zeile" style="flex-wrap:wrap;margin-bottom:14px">${Object.entries(ANW_STATUS).map(([k, s]) => `<span class="marke-klein ${s.kl}">${zaehl(k)} ${s.text}</span>`).join('')}<span class="marke-klein">${studis.length - db.anwesenheit.filter(a => a.termin_id === tid).length} offen</span>
    <span style="flex:1"></span>${kannErfassen ? `<button class="knopf" data-action="anw-alle" data-id="${tid}">${I('check')} Alle Offenen anwesend</button>` : ''}</div>
  ${!erfassbar(t) ? `<div class="hinweis" style="margin-bottom:14px">${I('uhr')}<div>Die Erfassung öffnet 15 Minuten vor Beginn.</div></div>` : ''}
  <section class="karte"><ul class="liste">${studis.map(x => {
    const a = anwesenheitVon(tid, x.id);
    return `<li class="zeile dazwischen" style="flex-wrap:wrap;gap:8px"><span style="flex:1 1 180px"><b>${esc(name(x))}</b><br><span class="klein leise">${esc(x.matrikelnummer)}${a ? ` · erfasst ${fmtZeit(a.erfasst_am)} Uhr` : ''}</span></span>
      <span class="anw-wahl" role="group" aria-label="Anwesenheit ${esc(name(x))}">${Object.entries(ANW_STATUS).map(([k, s]) => `<button class="${a?.status === k ? 'gewaehlt ' + s.kl : ''}" data-action="anw-setzen" data-termin="${tid}" data-student="${x.id}" data-status="${k}" aria-pressed="${a?.status === k}" ${kannErfassen ? '' : 'disabled'}>${s.text}</button>`).join('')}</span></li>`;
  }).join('')}</ul></section>
  <p class="klein leise abstand">Jeder Klick wird sofort gespeichert. Studierende sehen nur ihre eigene Anwesenheit, die Verwaltung wertet die Quoten aus.</p>`;
}
function anwesenheitSetzen(tid, sid, status) {
  const jetzt = new Date().toISOString(), a = anwesenheitVon(tid, sid);
  if (a) Object.assign(a, { status, erfasst_von: ich().id, erfasst_am: jetzt });
  else db.anwesenheit.push({ termin_id: tid, student_id: sid, status, erfasst_von: ich().id, erfasst_am: jetzt });
}
AKTIONEN['anw-setzen'] = el => { anwesenheitSetzen(Number(el.dataset.termin), el.dataset.student, el.dataset.status); speichern(); render(); };
AKTIONEN['anw-alle'] = el => {
  const tid = Number(el.dataset.id), t = byId('termin', tid);
  const offen = studisVon(t.kurs_id).filter(s => !anwesenheitVon(tid, s));
  offen.forEach(s => anwesenheitSetzen(tid, s, 'anwesend'));
  speichern(); render(); toast(`${plural(offen.length, 'Person', 'Personen')} als anwesend erfasst`);
};

// Übersicht für Lehrende: eigene Termine der letzten 14 Tage und von heute, offene zuerst
function lAnwesenheit() {
  const u = ich(), kursIds = kurseVon(u.id).map(k => k.id), ab = Date.now() - 14 * 864e5;
  const ts = db.termin.filter(t => (kursIds.includes(t.kurs_id) || t.vertretung_id === u.id) && erfassbar(t) && D(t.beginn) >= ab).sort((a, b) => D(b.beginn) - D(a.beginn));
  const zeile = t => { const erfasst = db.anwesenheit.filter(a => a.termin_id === t.id).length, gesamt = studisVon(t.kurs_id).length, offen = erfasst < gesamt;
    return `<li class="zeile dazwischen" style="flex-wrap:wrap;gap:8px"><span style="flex:1 1 220px"><b>${esc(kursName(t.kurs_id))}</b><br><span class="klein leise">${fmtLang(D(t.beginn))}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} Uhr · ${esc(raumName(t))}</span></span>
      <span class="marke-klein ${offen ? 'm-warn' : 'm-gut'}">${erfasst} / ${gesamt} erfasst</span><a class="knopf klein ${offen ? 'primaer' : ''}" href="#/anwesenheit/${t.id}">${I('check')} ${offen ? 'Erfassen' : 'Ansehen'}</a></li>`; };
  const offen = ts.filter(t => db.anwesenheit.filter(a => a.termin_id === t.id).length < studisVon(t.kurs_id).length);
  return `${kopfzeile('Anwesenheit', 'Wer war da? Je Termin mit einem Klick erfassen. Die Erfassung öffnet 15 Minuten vor Beginn, die Verwaltung sieht die Quoten.')}
  ${offen.length ? `<section class="karte"><h2>Noch zu erfassen</h2><ul class="liste">${offen.map(zeile).join('')}</ul></section>` : `<div class="hinweis" style="margin-bottom:14px">${I('check')}<div>Alle Termine der letzten 14 Tage sind erfasst.</div></div>`}
  <section class="karte abstand"><h2>Letzte 14 Tage</h2>${ts.length ? `<ul class="liste">${ts.map(zeile).join('')}</ul>` : '<p class="leise">Keine Termine in den letzten 14 Tagen.</p>'}</section>`;
}

// Spalte für Terminlisten (Studierende: eigene Anwesenheit)
function anwesenheitMarke(t, uid) {
  const a = anwesenheitVon(t.id, uid);
  if (a) return `<span class="marke-klein ${ANW_STATUS[a.status].kl}">${ANW_STATUS[a.status].text}</span>`;
  return erfassbar(t) && D(t.ende) < new Date() ? '<span class="klein leise">nicht erfasst</span>' : '';
}

// ---------- Verwaltung: Auswertung ----------
function vAnwesenheit(q) {
  const kurse = db.kurs.filter(k => k.semester_id === aktSem().id), kid = Number(q.get('kurs')) || null;
  if (kid) return vAnwesenheitKurs(kid);
  const studis = db.user.filter(u => u.rolle === 'studierend');
  const zeilen = studis.map(s => ({ s, q: anwesenheitsQuote(s.id, kurseVon(s.id).map(k => k.id)) })).sort((a, b) => (a.q.quote ?? 1) - (b.q.quote ?? 1));
  return `${kopfzeile('Anwesenheit', `${esc(aktSem().bezeichnung)} · Mindestquote ${ANW_GRENZE * 100} %. Entschuldigte Termine zählen nicht mit.`)}
  <div class="raster raster-2">
    <section class="karte"><h2>Nach Modul</h2><div class="tabelle-huelle"><table><thead><tr><th>Modul</th><th>Termine erfasst</th><th>Quote</th><th></th></tr></thead><tbody>
    ${kurse.map(k => { const ts = db.termin.filter(t => t.kurs_id === k.id && erfassbar(t) && D(t.ende) < new Date()), ids = studisVon(k.id);
      let da = 0, zaehlt = 0; ts.forEach(t => ids.forEach(s => { const a = anwesenheitVon(t.id, s); if (a && a.status !== 'entschuldigt') { zaehlt++; if (a.status !== 'fehlt') da++; } }));
      const erfasst = ts.filter(t => db.anwesenheit.some(a => a.termin_id === t.id)).length, quote = zaehlt ? da / zaehlt : null;
      return `<tr><td class="fett">${esc(kursName(k.id))}</td><td>${erfasst} / ${ts.length}${erfasst < ts.length ? ' <span class="marke-klein m-warn">offen</span>' : ''}</td><td>${quote === null ? '–' : `<b>${Math.round(quote * 100)} %</b>`}</td><td><a class="knopf klein" href="#/anwesenheit-uebersicht?kurs=${k.id}">Details</a></td></tr>`; }).join('')}
    </tbody></table></div></section>
    <section class="karte"><h2>Nach Person</h2><ul class="liste">${zeilen.map(({ s, q: qu }) => `<li class="zeile dazwischen"><span><b>${esc(name(s))}</b><br><span class="klein leise">${qu.da} von ${qu.zaehlt} Terminen${qu.offen ? ` · ${qu.offen} nicht erfasst` : ''}</span></span>
      ${qu.quote === null ? '<span class="klein leise">–</span>' : `<span class="marke-klein ${qu.quote < ANW_GRENZE ? 'm-fehler' : 'm-gut'}">${Math.round(qu.quote * 100)} %${qu.quote < ANW_GRENZE ? ' · unter Grenze' : ''}</span>`}</li>`).join('')}</ul></section>
  </div>`;
}
function vAnwesenheitKurs(kid) {
  const ts = db.termin.filter(t => t.kurs_id === kid && erfassbar(t)).sort((a, b) => D(a.beginn) - D(b.beginn)), studis = studisVon(kid).map(id => byId('user', id));
  return `<a class="klein zeile" href="#/anwesenheit-uebersicht" style="gap:4px;margin-bottom:10px">${I('zurueck')} Anwesenheit</a>
  ${kopfzeile(`Anwesenheit · ${esc(kursName(kid))}`, `${lehrendeVon(kid).map(l => esc(name(l))).join(', ')} · A = anwesend, V = verspätet, E = entschuldigt, F = fehlt`)}
  <section class="karte"><div class="tabelle-huelle"><table class="anw-matrix"><thead><tr><th>Person</th>${ts.map(t => `<th><a href="#/anwesenheit/${t.id}">${pad(D(t.beginn).getDate())}.${pad(D(t.beginn).getMonth() + 1)}.</a></th>`).join('')}<th>Quote</th></tr></thead><tbody>
  ${studis.map(s => { const qu = anwesenheitsQuote(s.id, [kid]);
    return `<tr><td class="fett">${esc(name(s))}</td>${ts.map(t => { const a = anwesenheitVon(t.id, s.id); return `<td>${a ? `<span class="marke-klein ${ANW_STATUS[a.status].kl}" title="${ANW_STATUS[a.status].text}">${ANW_STATUS[a.status].kurz}</span>` : '<span class="leise">·</span>'}</td>`; }).join('')}
      <td>${qu.quote === null ? '–' : `<span class="marke-klein ${qu.quote < ANW_GRENZE ? 'm-fehler' : 'm-gut'}">${Math.round(qu.quote * 100)} %</span>`}</td></tr>`; }).join('')}
  </tbody></table></div></section>`;
}
