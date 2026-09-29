'use strict';
// Personalisierbare Übersicht: Jede Rolle hat einen Baukasten an Karten. Jede Person legt fest,
// welche Karten sie sieht, in welcher Reihenfolge und ob eine Karte doppelt breit ist.
// Gespeichert in den Einstellungen der Person (einstellungen/{uid}.uebersicht), also auf jedem Gerät gleich.

let uebersichtBearbeiten = false;

// Kopf einer Karte mit optionalem Link rechts
const kachelKopf = (titel, link, linkText) => `<div class="zeile dazwischen"><h2>${titel}</h2>${link ? `<a class="klein" href="${link}">${linkText}</a>` : ''}</div>`;
function wocheKompakt(eintraege) {
  if (!eintraege.length) return '<p class="leer">In den nächsten 7 Tagen steht nichts an.</p>';
  const nachTag = {};
  eintraege.forEach(e => { const k = D(e.zeit).toDateString(); (nachTag[k] = nachTag[k] || []).push(e); });
  return `<ul class="liste">${Object.entries(nachTag).map(([k, xs]) => `<li><b class="klein">${relTag(xs[0].zeit)[0].toUpperCase() + relTag(xs[0].zeit).slice(1)}, ${fmtDatum(xs[0].zeit)}</b>
    ${xs.map(e => `<a class="zeile klein" href="${e.link}" style="color:var(--text);text-decoration:none;margin-top:4px"><span class="marke-klein ${e.kl}" style="min-width:44px;justify-content:center">${e.zeitText}</span><span>${esc(e.text)}</span></a>`).join('')}</li>`).join('')}</ul>`;
}
function schnellzugriff(links) {
  return `<div class="schnell">${links.map(([href, icon, text, aktion]) => aktion ? `<button class="schnell-link" data-action="${aktion}">${I(icon)}<span>${text}</span></button>` : `<a class="schnell-link" href="${href}">${I(icon)}<span>${text}</span></a>`).join('')}</div>`;
}

const KACHELN = {
  studierend: [
    { id: 'aenderungen', titel: 'Änderungen im Stundenplan', breit: true, render: u => {
      const liste = termineVon(kurseVon(u.id).map(k => k.id)).filter(t => (t.status !== 'geplant' || t.vertretung_id) && D(t.ende) > new Date() && tagDiff(t.beginn) <= 14);
      if (!liste.length) return null;
      return `<div class="zeile" style="gap:8px;color:var(--warn)">${I('warn')}<h2 style="margin:0;color:var(--text)">${plural(liste.length, 'Änderung', 'Änderungen')} in deinem Stundenplan</h2></div>
        <ul class="liste" style="margin-top:6px">${liste.map(t => `<li style="padding:6px 0;border:0"><a href="#/stundenplan?w=${wochenVersatz(t.beginn)}">${fmtDatum(t.beginn)}, ${fmtZeit(t.beginn)} · ${esc(kursName(t.kurs_id))}</a>: ${esc(t.hinweis || t.status)}</li>`).join('')}</ul>`;
    } },
    { id: 'naechster', titel: 'Nächster Termin', render: u => { const t = termineVon(kurseVon(u.id).map(k => k.id)).find(x => D(x.ende) > new Date() && x.status !== 'ausgefallen'); return `<h2>Nächster Termin</h2>${t ? terminGross(t) : '<p class="leer">Keine anstehenden Termine</p>'}`; } },
    { id: 'fristen', titel: 'Nächste Abgaben und Prüfungen', render: u => {
      const fristen = pruefungenVon(kurseVon(u.id).map(k => k.id), u.id).filter(p => D(p.frist) > new Date() && statusVon(p, u.id).code !== 'entschuldigt');
      return `${kachelKopf('Nächste Abgaben und Prüfungen', '#/leistungen', 'Alle')}<ul class="liste">${fristen.map(p => fristZeile(p, u.id)).join('') || '<li class="leer">Keine offenen Fristen</li>'}</ul>`;
    } },
    { id: 'beteiligung', titel: 'Offene Umfragen und Evaluationen', render: u => {
      const us = offeneUmfragen(u.id), es = offeneEvaluationen(u.id);
      if (!us.length && !es.length) return null;
      return `<h2>Deine Meinung ist gefragt</h2><ul class="liste">${us.map(x => `<li><a class="zeile dazwischen" href="#/module/${x.kurs_id}/umfragen" style="color:var(--text);text-decoration:none"><span><b>Umfrage</b> · ${esc(kursName(x.kurs_id))}<br><span class="klein leise">${esc(x.frage)}</span></span><span class="marke-klein m-akzent">abstimmen</span></a></li>`).join('')}
        ${es.map(k => `<li><a class="zeile dazwischen" href="#/module/${k.id}/evaluation" style="color:var(--text);text-decoration:none"><span><b>Evaluation</b> · ${esc(kursName(k.id))}<br><span class="klein leise">${esc(lehrendeVon(k.id).map(l => name(l)).join(', '))} · anonym, etwa 2 Minuten</span></span><span class="marke-klein m-akzent">bewerten</span></a></li>`).join('')}</ul>`;
    } },
    { id: 'neu', titel: 'Neu für dich', render: u => { const neu = meineMitteilungen(u.id).filter(m => !m.gelesen).slice(0, 4); return `${kachelKopf('Neu für dich', '#/mitteilungen', 'Alle Mitteilungen')}${neu.length ? `<div style="margin:0 -20px -18px">${neu.map(mitteilungsEintrag).join('')}</div>` : '<p class="leer">Du hast alles gelesen.</p>'}`; } },
    { id: 'stand', titel: 'Dein Stand (ECTS)', render: u => {
      const st = ectsStand(u.id);
      return `${kachelKopf('Dein Stand', '#/leistungen', 'Leistungen')}
        <div class="zeile dazwischen"><span class="gross-zahl">${st.endgueltig} <span class="leise" style="font-size:16px;font-weight:600">von ${st.gesamt} ECTS</span></span>${st.schnittGesamt ? `<span class="marke-klein m-akzent">Schnitt ${noteFmt(st.schnittGesamt)}</span>` : ''}</div>
        <div class="balken abstand"><i style="width:${(st.endgueltig / st.gesamt) * 100}%"></i></div>
        <p class="klein leise abstand" style="margin-bottom:0">${st.vorlaeufig ? `Dazu ${st.vorlaeufig} ECTS mit vorläufiger Note. ` : ''}Die Zahl zählt nur Noten, die das Prüfungsamt endgültig bestätigt hat.</p>`;
    } },
    { id: 'woche', titel: 'Die nächsten 7 Tage', aus: true, render: u => {
      const kurse = kurseVon(u.id).map(k => k.id), jetzt = new Date(), bis = new Date(Date.now() + 7 * 864e5);
      const e = [
        ...termineVon(kurse).filter(t => D(t.ende) > jetzt && D(t.beginn) < bis).map(t => ({ zeit: t.beginn, zeitText: fmtZeit(t.beginn), text: `${kursName(t.kurs_id)} · ${raumName(t)}${t.status === 'ausgefallen' ? ' · fällt aus' : ''}`, kl: t.status === 'ausgefallen' ? 'm-fehler' : t.status === 'verlegt' ? 'm-warn' : 'm-akzent', link: !t.raum_id ? `#/konferenz/${t.id}` : `#/module/${t.kurs_id}/termine` })),
        ...pruefungenVon(kurse, u.id).filter(p => D(p.frist) > jetzt && D(p.frist) < bis).map(p => ({ zeit: p.frist, zeitText: 'Frist', text: `${kursName(p.kurs_id)}: ${p.art}`, kl: 'm-fehler', link: `#/module/${p.kurs_id}/abgabe` })),
        ...reservierungenVon(u.id).filter(r => D(r.ende) > jetzt && D(r.beginn) < bis).map(r => ({ zeit: r.beginn, zeitText: fmtZeit(r.beginn), text: 'Schnittplatz reserviert', kl: 'm-gut', link: `#/service/antraege/${r.antrag_id}` })),
      ].sort((a, b) => D(a.zeit) - D(b.zeit));
      return `${kachelKopf('Die nächsten 7 Tage', '#/stundenplan?ansicht=monat', 'Monatsansicht')}${wocheKompakt(e)}`;
    } },
    { id: 'noten', titel: 'Letzte Noten', aus: true, render: u => {
      const ns = db.note.filter(n => n.student_id === u.id && n.freigegeben_am).sort((a, b) => D(b.freigegeben_am) - D(a.freigegeben_am)).slice(0, 4);
      return `${kachelKopf('Letzte Noten', '#/leistungen', 'Alle')}<ul class="liste">${ns.map(n => { const p = byId('pruefung', n.pruefung_id); return `<li class="zeile dazwischen"><a href="#/module/${p.kurs_id}/ergebnis">${esc(kursName(p.kurs_id))}</a><span><b class="note">${noteFmt(n.wert)}</b> <span class="klein leise">${n.bestaetigt_am ? 'endgültig' : 'vorläufig'}</span></span></li>`; }).join('') || '<li class="leer">Noch keine Noten</li>'}</ul>`;
    } },
    { id: 'antraege', titel: 'Meine Anträge', aus: true, render: u => {
      const as = db.antrag.filter(a => a.antragsteller_id === u.id).sort((a, b) => D(b.eingereicht_am) - D(a.eingereicht_am)).slice(0, 4);
      return `${kachelKopf('Meine Anträge', '#/service/formulare', 'Neuer Antrag')}<ul class="liste">${as.map(a => `<li><a class="zeile dazwischen" href="#/service/antraege/${a.id}" style="color:var(--text);text-decoration:none"><span>${esc(ANTRAGSARTEN[a.art].kurz)}<br><span class="klein leise">${fmtDatum(a.eingereicht_am)}</span></span><span class="marke-klein ${ANTRAG_STATUS[a.status].kl}">${ANTRAG_STATUS[a.status].text}</span></a></li>`).join('') || '<li class="leer">Keine Anträge</li>'}</ul>`;
    } },
    { id: 'schnell', titel: 'Schnellzugriff', aus: true, render: () => `<h2>Schnellzugriff</h2>${schnellzugriff([['#/stundenplan?ansicht=monat', 'kalender', 'Monatsplan'], ['#/module', 'buch', 'Module'], ['#/service/formulare', 'datei', 'Antrag stellen'], ['', 'download', 'Kalender-Abo', 'ical'], ['#/service/lageplan', 'ort', 'Lageplan'], ['#/service/kontakt', 'user', 'Kontakt']])}` },
    { id: 'assistent', titel: 'Frag den Assistenten', aus: true, render: () => `<h2>Frag den Assistenten</h2><form data-form="kachel-frage" class="zeile"><input name="frage" class="knopf" style="flex:1;text-align:left;font-weight:400;min-width:0" placeholder="z. B. Wann ist meine nächste Abgabe?" aria-label="Frage an den Assistenten" required><button class="knopf primaer" aria-label="Fragen">${I('pfeil')}</button></form><p class="klein leise" style="margin:8px 0 0">Antwortet aus deinen Daten und Lehrmaterialien, mit Quelle.</p>` },
  ],
  lehrend: [
    { id: 'vorlesungen', titel: 'Nächste Vorlesungen', render: u => {
      const liste = termineVon(kurseVon(u.id).map(k => k.id), u.id).filter(t => D(t.ende) > new Date()).slice(0, 5);
      return `${kachelKopf('Nächste Vorlesungen', '#/stundenplan', 'Stundenplan')}<ul class="liste">${liste.map(t => `<li class="zeile dazwischen" style="flex-wrap:wrap"><span><b>${esc(kursName(t.kurs_id))}</b>${t.vertretung_id === u.id ? ' <span class="marke-klein m-warn">du vertrittst</span>' : ''}<br><span class="klein leise">${fmtDatum(t.beginn)}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} · ${esc(raumName(t))} · ${esc(byId('studiengruppe', byId('kurs', t.kurs_id).gruppe_id).name)}</span></span>
        <span class="zeile" style="gap:6px">${anwesenheitKnopf(t)}${konferenzKnopf(t)}${t.status === 'ausgefallen' ? '<span class="marke-klein m-fehler">fällt aus</span>' : t.status === 'verlegt' ? '<span class="marke-klein m-warn">geändert</span>' : `<button class="knopf klein" data-action="termin-aendern" data-id="${t.id}">Ändern</button>`}</span></li>`).join('') || '<li class="leer">Keine Termine</li>'}</ul>`;
    } },
    { id: 'korrekturen', titel: 'Offene Korrekturen', render: u => {
      const korr = pruefungenVon(kurseVon(u.id).map(k => k.id)).map(p => ({ p, s: korrekturStand(p) })).filter(x => x.s.vorbei && x.s.frei < x.s.abgegeben);
      return `${kachelKopf('Offene Korrekturen', '#/korrektur', 'Alle')}<ul class="liste">${korr.map(({ p, s }) => `<li><a href="#/korrektur/${p.id}" class="zeile dazwischen" style="color:var(--text);text-decoration:none"><span><b>${esc(kursName(p.kurs_id))}</b><br><span class="klein leise">${esc(p.art)} · Frist ${fmtDatum(p.frist)}</span></span>
        <span class="marke-klein ${s.bewertet < s.abgegeben ? 'm-warn' : 'm-info'}">${s.bewertet < s.abgegeben ? `${s.bewertet} von ${s.abgegeben} bewertet` : `${s.bewertet - s.frei} bereit zur Freigabe`}</span></a></li>`).join('') || '<li class="leer">Nichts offen</li>'}</ul>`;
    } },
    { id: 'gesendet', titel: 'Zuletzt von dir gesendet', render: u => { const g = db.mitteilung.filter(m => m.absender_id === u.id).sort((a, b) => D(b.erstellt_am) - D(a.erstellt_am)).slice(0, 4); return `<h2>Zuletzt von dir gesendet</h2><ul class="liste">${g.map(m => `<li><b>${esc(m.titel)}</b><br><span class="klein leise">${relZeit(m.erstellt_am)} · ${zustellStatistik(m.id)}</span></li>`).join('') || '<li class="leer">Noch nichts gesendet</li>'}</ul>`; } },
    { id: 'woche', titel: 'Die nächsten 7 Tage', aus: true, render: u => {
      const jetzt = new Date(), bis = new Date(Date.now() + 7 * 864e5);
      const e = termineVon(kurseVon(u.id).map(k => k.id), u.id).filter(t => D(t.ende) > jetzt && D(t.beginn) < bis).map(t => ({ zeit: t.beginn, zeitText: fmtZeit(t.beginn), text: `${kursName(t.kurs_id)} · ${raumName(t)}`, kl: t.status === 'ausgefallen' ? 'm-fehler' : 'm-akzent', link: !t.raum_id ? `#/konferenz/${t.id}` : `#/kurse/${t.kurs_id}` }));
      return `${kachelKopf('Die nächsten 7 Tage', '#/stundenplan?ansicht=monat', 'Monatsansicht')}${wocheKompakt(e)}`;
    } },
    { id: 'schnell', titel: 'Schnellzugriff', aus: true, render: u => `<h2>Schnellzugriff</h2>${schnellzugriff([...kurseVon(u.id).slice(0, 2).map(k => [`#/kurse/${k.id}/materialien`, 'upload', `Material ${modulVon(k).kuerzel}`]), ['#/korrektur', 'stift', 'Korrektur'], ['#/stundenplan?ansicht=monat', 'kalender', 'Monatsplan'], ['', 'download', 'Kalender-Abo', 'ical']])}` },
    { id: 'hilfe', titel: 'So funktioniert es', render: () => `<h2>So funktioniert es</h2><ul style="padding-left:18px;margin:0" class="klein">
      <li>Änderst du einen Termin, bekommt die Gruppe automatisch eine Mitteilung, je nach Einstellung auch per Push und E-Mail.</li>
      <li>Noten, die du einträgst, sind erst sichtbar, wenn du sie freigibst. So kannst du in Ruhe korrigieren.</li>
      <li>Nach deiner Freigabe bestätigt das Prüfungsamt die Noten endgültig.</li></ul>` },
  ],
  verwaltung: [
    { id: 'zahlen', titel: 'Kennzahlen', breit: true, render: () => {
      const jetzt = new Date(), offen = db.note.filter(n => n.freigegeben_am && !n.bestaetigt_am).length, konflikte = raumKonflikte().length;
      const zahl = (z, text, link, leise) => `<a class="kennzahl" href="${link}"><span class="gross-zahl ${leise ? 'leise' : ''}">${z}</span><span class="klein leise">${text}</span></a>`;
      return `<h2>Kennzahlen</h2><div class="kennzahlen">${zahl(offeneAntraege(), 'offene Anträge', '#/antraege', !offeneAntraege())}${zahl(offen, 'Noten zur Bestätigung', '#/pruefungsamt', !offen)}${zahl(konflikte, konflikte ? 'Raumkonflikte' : 'keine Raumkonflikte', '#/planung', !konflikte)}${zahl(db.user.filter(x => x.rolle === 'studierend' && x.aktiv).length, 'Studierende aktiv', '#/personen?rolle=studierend')}${zahl(db.mitteilung.filter(m => (jetzt - D(m.erstellt_am)) < 7 * 864e5).length, 'Mitteilungen in 7 Tagen', '#/nachrichten')}</div>`;
    } },
    { id: 'antraege', titel: 'Offene Anträge', render: () => {
      const as = db.antrag.filter(a => ['eingereicht', 'in_bearbeitung'].includes(a.status)).sort((a, b) => D(a.eingereicht_am) - D(b.eingereicht_am)).slice(0, 5);
      return `${kachelKopf('Offene Anträge', '#/antraege', 'Alle')}<ul class="liste">${as.map(a => `<li><a class="zeile dazwischen" href="#/antraege/${a.id}" style="color:var(--text);text-decoration:none"><span><b>${esc(ANTRAGSARTEN[a.art].kurz)}</b> · ${esc(name(byId('user', a.antragsteller_id)))}<br><span class="klein leise">${esc(antragZusammenfassung(a))}</span></span><span class="marke-klein ${ANTRAG_STATUS[a.status].kl}">${ANTRAG_STATUS[a.status].text}</span></a></li>`).join('') || '<li class="leer">Keine offenen Anträge</li>'}</ul>`;
    } },
    { id: 'bestaetigen', titel: 'Noten zur Bestätigung', render: () => {
      const ns = db.note.filter(n => n.freigegeben_am && !n.bestaetigt_am);
      const nachPruefung = {}; ns.forEach(n => { nachPruefung[n.pruefung_id] = (nachPruefung[n.pruefung_id] || 0) + 1; });
      return `${kachelKopf('Noten zur Bestätigung', '#/pruefungsamt', 'Prüfungsamt')}<ul class="liste">${Object.entries(nachPruefung).map(([pid, n]) => { const p = byId('pruefung', Number(pid)); return `<li class="zeile dazwischen"><span>${esc(kursName(p.kurs_id))}<br><span class="klein leise">${esc(p.art)}</span></span><span class="marke-klein m-warn">${plural(n, 'Note', 'Noten')}</span></li>`; }).join('') || '<li class="leer">Alles bestätigt</li>'}</ul>`;
    } },
    { id: 'protokoll', titel: 'Zustellprotokoll E-Mail und Push', breit: true, render: () => {
      const pr = db.zustellung.filter(z => z.kanal !== 'campus').sort((a, b) => D(b.gesendet_am) - D(a.gesendet_am)).slice(0, 8);
      return `<h2>Zustellprotokoll E-Mail und Push</h2><p class="klein leise">Nachweis, wer wann über welchen Kanal benachrichtigt wurde. Im Prototyp simuliert.</p>
        <div class="tabelle-huelle"><table><thead><tr><th>Zeit</th><th>Empfänger</th><th>Kanal</th><th>Mitteilung</th></tr></thead><tbody>
        ${pr.map(z => { const m = byId('mitteilung', z.mitteilung_id); return `<tr><td class="klein">${relZeit(z.gesendet_am)}</td><td>${esc(name(byId('user', z.empfaenger_id)))}</td><td><span class="marke-klein ${z.kanal === 'push' ? 'm-akzent' : 'm-info'}">${z.kanal === 'push' ? 'Push' : 'E-Mail'}</span></td><td>${esc(m?.titel || '')}</td></tr>`; }).join('') || '<tr><td colspan="4" class="leer">Noch keine Zustellungen per E-Mail oder Push.</td></tr>'}</tbody></table></div>`;
    } },
    { id: 'schnell', titel: 'Schnellzugriff', aus: true, render: () => `<h2>Schnellzugriff</h2>${schnellzugriff([['#/nachrichten', 'megafon', 'Mitteilung an alle'], ['#/planung', 'kalender', 'Termin anlegen'], ['#/inhalte', 'hilfe', 'FAQ pflegen'], ['#/personen', 'user', 'Personen']])}` },
  ],
};

// Konfiguration der Person, ergänzt um neu hinzugekommene Karten
function uebersichtKonfig(u) {
  const karten = KACHELN[u.rolle], gespeichert = db.einstellungen?.[u.id]?.uebersicht;
  const standard = { reihenfolge: karten.map(k => k.id), aus: karten.filter(k => k.aus).map(k => k.id), breit: karten.filter(k => k.breit).map(k => k.id) };
  if (!gespeichert) return standard;
  const reihenfolge = [...gespeichert.reihenfolge.filter(id => karten.some(k => k.id === id)), ...karten.map(k => k.id).filter(id => !gespeichert.reihenfolge.includes(id))];
  const neu = karten.filter(k => !gespeichert.reihenfolge.includes(k.id));
  return { reihenfolge, aus: [...(gespeichert.aus || []), ...neu.filter(k => k.aus).map(k => k.id)], breit: gespeichert.breit || [] };
}
function uebersichtSpeichern(u, konfig) {
  db.einstellungen[u.id] = { ...(db.einstellungen[u.id] || {}), uebersicht: konfig };
  speichern();
}

function uebersichtSeite(unterzeile) {
  const u = ich(), karten = KACHELN[u.rolle], k = uebersichtKonfig(u), bearb = uebersichtBearbeiten;
  const sichtbar = k.reihenfolge.filter(id => !k.aus.includes(id));
  const kachel = (id, i) => {
    const def = karten.find(x => x.id === id);
    let inhalt = def.render(u);
    if (inhalt === null && !bearb) return '';
    if (inhalt === null) inhalt = `<h2>${esc(def.titel)}</h2><p class="leer">Zurzeit nichts anzuzeigen. Die Karte erscheint, sobald es etwas gibt.</p>`;
    const breit = k.breit.includes(id);
    return `<section class="karte kachel ${breit ? 'breit' : ''} ${bearb ? 'bearbeiten' : ''}" data-kachel="${id}" ${bearb ? 'draggable="true"' : ''}>
      ${bearb ? `<div class="kachel-leiste" aria-label="Karte ${esc(def.titel)} anpassen">
        <span class="griff" title="Ziehen zum Verschieben" aria-hidden="true">⠿</span><span class="klein fett" style="flex:1">${esc(def.titel)}</span>
        <button class="rund mini" data-action="kachel-hoch" data-id="${id}" aria-label="Nach vorne" ${i === 0 ? 'disabled' : ''}>${I('zurueck', 'hoch')}</button>
        <button class="rund mini" data-action="kachel-runter" data-id="${id}" aria-label="Nach hinten" ${i === sichtbar.length - 1 ? 'disabled' : ''}>${I('pfeil', 'runter')}</button>
        <button class="knopf klein" data-action="kachel-breite" data-id="${id}">${breit ? 'Schmal' : 'Breit'}</button>
        <button class="knopf klein gefahr" data-action="kachel-aus" data-id="${id}">Ausblenden</button></div>` : ''}
      <div class="kachel-inhalt">${inhalt}</div></section>`;
  };
  const versteckt = k.reihenfolge.filter(id => k.aus.includes(id));
  return `<div class="zeile dazwischen oben" style="flex-wrap:wrap;gap:10px">
      <div>${kopfzeile(`${gruss()}, ${esc(u.rolle === 'lehrend' ? name(u) : u.vorname)}`, unterzeile)}</div>
      ${bearb ? `<div class="zeile"><button class="knopf" data-action="kachel-standard">Standard</button><button class="knopf primaer" data-action="uebersicht-fertig">${I('check')} Fertig</button></div>`
        : `<button class="knopf" data-action="uebersicht-anpassen">${I('stift')} Übersicht anpassen</button>`}
    </div>
    ${bearb ? `<div class="hinweis" style="margin-bottom:16px">${I('info')}<div class="klein">Karten ziehen oder mit den Pfeilen umsortieren, auf „Breit“ stellen oder ausblenden. Die Einstellung gilt auf allen deinen Geräten.</div></div>` : ''}
    <div class="raster raster-2 kacheln">${sichtbar.map(kachel).join('')}</div>
    ${bearb ? `<section class="karte abstand"><h2>Weitere Karten</h2>${versteckt.length ? `<div class="zeile" style="flex-wrap:wrap;gap:8px">${versteckt.map(id => `<button class="knopf" data-action="kachel-an" data-id="${id}">${I('plus')} ${esc(karten.find(x => x.id === id).titel)}</button>`).join('')}</div>` : '<p class="leise" style="margin:0">Alle Karten sind eingeblendet.</p>'}</section>` : ''}`;
}

// ---------- Bearbeiten ----------
function kachelAendern(fn) { const u = ich(), k = uebersichtKonfig(u); fn(k); uebersichtSpeichern(u, k); render(); }
function verschieben(k, id, richtung) {
  const sichtbar = k.reihenfolge.filter(x => !k.aus.includes(x)), i = sichtbar.indexOf(id), ziel = sichtbar[i + richtung];
  if (!ziel) return;
  const a = k.reihenfolge.indexOf(id), b = k.reihenfolge.indexOf(ziel);
  [k.reihenfolge[a], k.reihenfolge[b]] = [k.reihenfolge[b], k.reihenfolge[a]];
}
Object.assign(AKTIONEN, {
  'uebersicht-anpassen'() { uebersichtBearbeiten = true; render(); },
  'uebersicht-fertig'() { uebersichtBearbeiten = false; render(); toast('Übersicht gespeichert'); },
  'kachel-hoch'(el) { kachelAendern(k => verschieben(k, el.dataset.id, -1)); },
  'kachel-runter'(el) { kachelAendern(k => verschieben(k, el.dataset.id, 1)); },
  'kachel-breite'(el) { kachelAendern(k => { k.breit = k.breit.includes(el.dataset.id) ? k.breit.filter(x => x !== el.dataset.id) : [...k.breit, el.dataset.id]; }); },
  'kachel-aus'(el) { kachelAendern(k => { k.aus = [...new Set([...k.aus, el.dataset.id])]; }); },
  'kachel-an'(el) {
    // Eingeblendete Karte ans Ende der sichtbaren Karten stellen
    kachelAendern(k => { k.aus = k.aus.filter(x => x !== el.dataset.id); k.reihenfolge = [...k.reihenfolge.filter(x => x !== el.dataset.id), el.dataset.id]; });
  },
  'kachel-standard'() { const u = ich(); if (db.einstellungen[u.id]) delete db.einstellungen[u.id].uebersicht; speichern(); render(); toast('Standard wiederhergestellt'); },
});
FORMULARE['kachel-frage'] = (f, fd) => { assistent.offen = true; assistentFragen(fd.get('frage')); };

// Ziehen und Ablegen (nur im Bearbeiten-Modus)
let gezogen = null;
document.addEventListener('dragstart', e => { const k = e.target.closest?.('.kachel.bearbeiten'); if (!k) return; gezogen = k.dataset.kachel; k.classList.add('zieht'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', gezogen); });
document.addEventListener('dragend', e => { e.target.closest?.('.kachel')?.classList.remove('zieht'); document.querySelectorAll('.kachel.ziel').forEach(x => x.classList.remove('ziel')); gezogen = null; });
document.addEventListener('dragover', e => { const k = e.target.closest?.('.kachel.bearbeiten'); if (!k || !gezogen) return; e.preventDefault(); document.querySelectorAll('.kachel.ziel').forEach(x => x !== k && x.classList.remove('ziel')); k.classList.add('ziel'); });
document.addEventListener('drop', e => {
  const k = e.target.closest?.('.kachel.bearbeiten');
  if (!k || !gezogen || k.dataset.kachel === gezogen) return;
  e.preventDefault();
  const ziel = k.dataset.kachel, id = gezogen;
  kachelAendern(konf => { konf.reihenfolge = konf.reihenfolge.filter(x => x !== id); konf.reihenfolge.splice(konf.reihenfolge.indexOf(ziel), 0, id); });
});
