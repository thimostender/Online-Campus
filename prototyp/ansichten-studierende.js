'use strict';
// Ansichten für Studierende (Sitemap: Übersicht, Stundenplan, Module, Leistungen, Service)
// plus Mitteilungen, Profil, Suche und Login, die alle Rollen nutzen.

const ANSICHTEN = {};

ANSICHTEN.studierend = (t, q) => {
  switch (t[0] || 'uebersicht') {
    case 'uebersicht': return sUebersicht();
    case 'stundenplan': return stundenplan(q);
    case 'module': return t[1] ? sModul(Number(t[1]), t[2] || 'ueberblick') : sModule();
    case 'leistungen': return sLeistungen();
    case 'service': return t[1] === 'antrag' ? antragFormular(t[2]) : t[1] === 'antraege' ? meineAntraege(t[2]) : sService(t[1] || 'lageplan', q);
    case 'konferenz': return konferenz(Number(t[1]));
    case 'mitteilungen': return mitteilungenSeite(q);
    case 'profil': return profil();
    case 'suche': return suche(q.get('q') || '');
    default: throw new Error('unbekannt');
  }
};

// ---------- Übersicht ----------
function gruss() { const h = new Date().getHours(); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend'; }
function kopfzeile(titel, unter = '') { return `<h1>${titel}</h1>${unter ? `<p class="unterzeile">${unter}</p>` : ''}`; }

function sUebersicht() {
  const u = ich(), kurse = kurseVon(u.id).map(k => k.id), jetzt = new Date();
  const termine = termineVon(kurse);
  const naechster = termine.find(t => D(t.ende) > jetzt && t.status !== 'ausgefallen');
  const aenderungen = termine.filter(t => t.status !== 'geplant' || t.vertretung_id).filter(t => D(t.ende) > jetzt && tagDiff(t.beginn) <= 14);
  const fristen = pruefungenVon(kurse, u.id).filter(p => D(p.frist) > jetzt && statusVon(p, u.id).code !== 'entschuldigt');
  const neu = meineMitteilungen(u.id).filter(m => !m.gelesen).slice(0, 4);
  const stand = ectsStand(u.id);

  return `${kopfzeile(`${gruss()}, ${esc(u.vorname)}`, `${fmtLang(jetzt)} · ${esc(gruppeVon(u.id).name)} · ${SCHWERPUNKTE[schwerpunktVon(u.id)] || ''} · ${esc(aktSem().bezeichnung)}`)}
  ${aenderungen.length ? `<div class="hinweis warn" style="margin-bottom:16px">${I('warn')}<div><b>${plural(aenderungen.length, 'Änderung', 'Änderungen')} in deinem Stundenplan</b>
    <ul class="liste" style="margin-top:6px">${aenderungen.map(t => `<li style="padding:6px 0;border:0"><a href="#/stundenplan?w=${wochenVersatz(t.beginn)}">${fmtDatum(t.beginn)}, ${fmtZeit(t.beginn)} · ${esc(kursName(t.kurs_id))}</a>: ${esc(t.hinweis || t.status)}</li>`).join('')}</ul></div></div>` : ''}
  <div class="raster raster-2">
    <section class="karte">
      <h2>Nächster Termin</h2>
      ${naechster ? terminGross(naechster) : '<p class="leer">Keine anstehenden Termine</p>'}
    </section>
    <section class="karte">
      <div class="zeile dazwischen"><h2>Nächste Abgaben und Prüfungen</h2><a class="klein" href="#/leistungen">Alle</a></div>
      <ul class="liste">${fristen.map(p => fristZeile(p, u.id)).join('') || '<li class="leer">Keine offenen Fristen</li>'}</ul>
    </section>
    <section class="karte">
      <div class="zeile dazwischen"><h2>Neu für dich</h2><a class="klein" href="#/mitteilungen">Alle Mitteilungen</a></div>
      ${neu.length ? `<div style="margin:0 -20px -18px">${neu.map(mitteilungsEintrag).join('')}</div>` : '<p class="leer">Du hast alles gelesen.</p>'}
    </section>
    <section class="karte">
      <div class="zeile dazwischen"><h2>Dein Stand</h2><a class="klein" href="#/leistungen">Leistungen</a></div>
      <div class="zeile dazwischen"><span class="gross-zahl">${stand.endgueltig} <span class="leise" style="font-size:16px;font-weight:600">von ${stand.gesamt} ECTS</span></span>
      ${stand.schnitt ? `<span class="marke-klein m-akzent">Schnitt ${noteFmt(stand.schnitt)}</span>` : ''}</div>
      <div class="balken abstand"><i style="width:${(stand.endgueltig / stand.gesamt) * 100}%"></i></div>
      <p class="klein leise abstand">${stand.vorlaeufig ? `Dazu ${stand.vorlaeufig} ECTS mit vorläufiger Note. ` : ''}Die Zahl zählt nur Noten, die das Prüfungsamt endgültig bestätigt hat.</p>
    </section>
  </div>`;
}
function wochenVersatz(iso) {
  const montag = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  return Math.round((montag(D(iso)) - montag(new Date())) / (7 * 864e5));
}
function terminGross(t) {
  const d = D(t.beginn), lehr = t.vertretung_id ? byId('user', t.vertretung_id) : lehrendeVon(t.kurs_id)[0];
  const ziel = rolle() === 'studierend' ? `#/module/${t.kurs_id}/termine` : `#/kurse/${t.kurs_id}`;
  return `<div class="termin-gross">
    <div class="datum-block"><span>${WT[d.getDay()]}</span><b>${d.getDate()}</b><span>${MON[d.getMonth()].slice(0, 3)}</span></div>
    <div style="min-width:0">
      <a href="${ziel}" class="fett" style="font-size:17px;color:var(--text)">${esc(kursName(t.kurs_id))}</a>
      <p class="leise" style="margin:2px 0 8px">${relTag(t.beginn)[0].toUpperCase() + relTag(t.beginn).slice(1)}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} Uhr · ${esc(t.art)}</p>
      <div class="zeile klein">${I('ort')}<span>${t.raum_id ? `<a href="#/service/lageplan?raum=${t.raum_id}">${esc(raumName(t))}</a>, ${esc(byId('raum', t.raum_id).standort)}` : 'Online per Videokonferenz'}</span></div>
      <div class="zeile klein" style="margin-top:4px">${I('user')}<span>${esc(name(lehr))}</span>${t.vertretung_id ? '<span class="marke-klein m-warn">Vertretung</span>' : ''}</div>
      ${t.status === 'verlegt' ? `<p class="marke-klein m-warn umbruch" style="margin-top:8px">${esc(t.hinweis)}</p>` : ''}
      ${!t.raum_id ? `<div style="margin-top:10px">${konferenzKnopf(t, false)}</div>` : ''}
    </div></div>`;
}
function fristZeile(p, uid) {
  const c = countdown(p.frist), s = statusVon(p, uid);
  return `<li><a class="frist" href="#/module/${p.kurs_id}/${p.mit_upload ? 'abgabe' : 'pruefung'}" style="color:var(--text);text-decoration:none">
    <span class="uhr ${c.kl}">${c.text}</span>
    <span style="min-width:0;flex:1"><b style="display:block">${esc(kursName(p.kurs_id))}</b><span class="klein leise">${esc(p.art)} · ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr</span></span>
    <span class="marke-klein ${s.kl}">${esc(s.text)}</span></a></li>`;
}

// ---------- Stundenplan (auch für Lehrende) ----------
function stundenplan(q) {
  const u = ich(), ansicht = q.get('ansicht') || 'woche', w = Number(q.get('w') || 0);
  const kurse = kurseVon(u.id).map(k => k.id);
  const termine = termineVon(kurse, u.id);
  const fristen = rolle() === 'studierend' ? pruefungenVon(kurse, u.id).filter(p => p.mit_upload && statusVon(p, u.id).code !== 'entschuldigt') : [];
  const reserv = rolle() === 'studierend' ? reservierungenVon(u.id) : [];
  const montag = new Date(); montag.setHours(0, 0, 0, 0); montag.setDate(montag.getDate() - ((montag.getDay() + 6) % 7) + w * 7);
  const tage = [...Array(6)].map((_, i) => { const d = new Date(montag); d.setDate(d.getDate() + i); return d; });
  const gleich = (a, b) => a.toDateString() === b.toDateString();
  const frei = d => db.vorlesungsfreie_zeit.find(v => d >= new Date(v.beginn + 'T00:00') && d <= new Date(v.ende + 'T23:59'));
  const link = (extra) => `#/stundenplan?${new URLSearchParams({ ansicht, w, ...extra })}`;

  const kopf = `<div class="zeile dazwischen" style="flex-wrap:wrap;gap:12px;margin-bottom:18px">
    <div class="umschalter" role="group" aria-label="Ansicht">
      <button data-action="gehe" data-ziel="${link({ ansicht: 'woche' })}" aria-pressed="${ansicht === 'woche'}">Woche</button>
      <button data-action="gehe" data-ziel="${link({ ansicht: 'liste' })}" aria-pressed="${ansicht === 'liste'}">Liste</button>
    </div>
    ${ansicht === 'woche' ? `<div class="zeile">
      <a class="knopf klein" href="${link({ w: w - 1 })}" aria-label="Vorherige Woche">${I('zurueck')}</a>
      <a class="knopf klein" href="${link({ w: 0 })}">${w === 0 ? 'Diese Woche' : 'Heute'}</a>
      <a class="knopf klein" href="${link({ w: w + 1 })}" aria-label="Nächste Woche">${I('pfeil')}</a>
      <span class="fett" style="margin-left:6px">${fmtDatum(tage[0].toISOString(), false)} – ${fmtDatum(tage[5].toISOString(), false)}</span></div>` : ''}
    <button class="knopf" data-action="ical">${I('kalender')} Kalender abonnieren</button>
  </div>`;

  let inhalt;
  if (ansicht === 'woche') {
    inhalt = `<div class="woche">${tage.map(d => {
      const ts = termine.filter(t => gleich(D(t.beginn), d));
      const fs = fristen.filter(p => gleich(D(p.frist), d));
      const fz = frei(d);
      const leer = !ts.length && !fs.length && !fz && !reserv.some(r => gleich(D(r.beginn), d));
      return `<div class="tag ${gleich(d, new Date()) ? 'heute' : ''} ${leer ? 'leer-tag' : ''}">
        <div class="tag-kopf">${WT[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${gleich(d, new Date()) ? ' · heute' : ''}</div>
        ${fz ? `<div class="ereignis frei"><b>${esc(fz.bezeichnung)}</b>vorlesungsfrei</div>` : ''}
        ${ts.map(ereignis).join('')}
        ${reserv.filter(r => gleich(D(r.beginn), d)).map(r => `<a class="ereignis frei" href="#/service/antraege/${r.antrag_id}"><b>Schnittplatz reserviert</b>${fmtZeit(r.beginn)}–${fmtZeit(r.ende)} · ${esc(byId('raum', r.raum_id).bezeichnung)}</a>`).join('')}
        ${fs.map(p => `<a class="ereignis fristtermin" href="#/module/${p.kurs_id}/abgabe"><b>Frist: ${esc(kursName(p.kurs_id))}</b>${esc(p.art)} bis ${fmtZeit(p.frist)} Uhr</a>`).join('')}
        ${leer ? '<span class="klein leise">frei</span>' : ''}
      </div>`;
    }).join('')}</div>
    <p class="klein leise abstand zeile" style="flex-wrap:wrap;gap:14px">
      <span class="marke-klein m-akzent">Vorlesung</span><span class="marke-klein m-info">Klausur</span><span class="marke-klein m-warn">geändert</span><span class="marke-klein m-fehler">fällt aus</span><span class="marke-klein">Abgabefrist</span></p>`;
  } else {
    const ab = new Date(); ab.setHours(0, 0, 0, 0);
    const alles = [
      ...termine.filter(t => D(t.beginn) >= ab).map(t => ({ zeit: t.beginn, html: ereignis(t) })),
      ...fristen.filter(p => D(p.frist) >= ab).map(p => ({ zeit: p.frist, html: `<a class="ereignis fristtermin" href="#/module/${p.kurs_id}/abgabe"><b>Frist: ${esc(kursName(p.kurs_id))}</b>${esc(p.titel)} · bis ${fmtZeit(p.frist)} Uhr</a>` })),
    ].sort((a, b) => D(a.zeit) - D(b.zeit)).slice(0, 30);
    const nachTag = {};
    alles.forEach(x => { const k = D(x.zeit).toDateString(); (nachTag[k] = nachTag[k] || []).push(x); });
    inhalt = `<div class="karte">${Object.entries(nachTag).map(([k, xs]) => `<div style="margin-bottom:14px"><h3>${fmtLang(new Date(k))} <span class="leise klein">· ${relTag(xs[0].zeit)}</span></h3>${xs.map(x => x.html).join('')}</div>`).join('') || '<p class="leer">Keine Termine</p>'}</div>`;
  }

  return `${kopfzeile('Stundenplan', rolle() === 'studierend' ? `Alle Vorlesungen und Abgabefristen von ${esc(gruppeVon(u.id).name)} in einer Ansicht.` : 'Deine Lehrveranstaltungen und Vertretungen.')}
    ${kopf}${inhalt}
    <section class="karte abstand"><h2>Vorlesungsfreie Zeiten ${esc(aktSem().bezeichnung)}</h2>
      <ul class="liste">${db.vorlesungsfreie_zeit.map(v => `<li class="zeile dazwischen"><span>${esc(v.bezeichnung)}</span><span class="leise">${fmtDatumJ(v.beginn)} – ${fmtDatumJ(v.ende)}</span></li>`).join('')}</ul></section>`;
}
function ereignis(t) {
  const kl = t.status === 'ausgefallen' ? 'ausgefallen' : t.status === 'verlegt' ? 'verlegt' : t.art === 'Klausur' ? 'klausur' : '';
  const ziel = !t.raum_id && t.status !== 'ausgefallen' && rolle() !== 'verwaltung' ? `#/konferenz/${t.id}` : rolle() === 'studierend' ? `#/module/${t.kurs_id}/termine` : rolle() === 'lehrend' ? `#/kurse/${t.kurs_id}` : '#/planung';
  const marke = t.status === 'ausgefallen' ? '<span class="marke-klein m-fehler">fällt aus</span>' : t.status === 'verlegt' ? '<span class="marke-klein m-warn">geändert</span>' : t.vertretung_id ? '<span class="marke-klein m-warn">Vertretung</span>' : '';
  return `<a class="ereignis ${kl}" href="${ziel}" title="${esc(t.hinweis || '')}"><b>${esc(kursName(t.kurs_id))}</b>${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} · ${esc(raumName(t))}${t.art === 'Klausur' ? ' · Klausur' : ''} ${marke}</a>`;
}
AKTIONEN.gehe = el => { location.hash = el.dataset.ziel; };
AKTIONEN.ical = () => {
  const u = ich();
  dialog(`<div class="dialog-inhalt"><h2>Kalender abonnieren</h2>
    <p>Im fertigen Campus bekommst du eine persönliche Abo-Adresse. Outlook, Google oder Apple Kalender holen Änderungen dann automatisch ab, auch Raumänderungen und Ausfälle.</p>
    <p class="pruefsumme" style="background:var(--flaeche-2);padding:10px;border-radius:10px">webcal://campus.example/ical/${esc(u.id)}-${pseudoHash(u.id).slice(0, 16)}.ics</p>
    <p class="klein leise">Im Prototyp gibt es statt des Abos eine Datei mit allen Terminen und Fristen, die du einmalig importieren kannst.</p></div>
    <div class="dialog-fuss"><button class="knopf" data-action="dialog-zu">Schließen</button><button class="knopf primaer" data-action="ical-laden">${I('download')} Datei herunterladen</button></div>`);
};
AKTIONEN['ical-laden'] = () => {
  const u = ich(), kurse = kurseVon(u.id).map(k => k.id);
  const z = iso => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const txt = s => String(s).replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ev = [];
  termineVon(kurse, u.id).forEach(t => ev.push(['BEGIN:VEVENT', `UID:termin-${t.id}@campus.example`, `DTSTAMP:${z(new Date().toISOString())}`, `DTSTART:${z(t.beginn)}`, `DTEND:${z(t.ende)}`,
    `SUMMARY:${txt(kursName(t.kurs_id) + (t.art === 'Klausur' ? ' (Klausur)' : ''))}`, `LOCATION:${txt(raumName(t))}`, `STATUS:${t.status === 'ausgefallen' ? 'CANCELLED' : 'CONFIRMED'}`,
    ...(t.hinweis ? [`DESCRIPTION:${txt(t.hinweis)}`] : []), 'END:VEVENT']));
  if (u.rolle === 'studierend') pruefungenVon(kurse, u.id).filter(p => p.mit_upload).forEach(p => ev.push(['BEGIN:VEVENT', `UID:frist-${p.id}@campus.example`, `DTSTAMP:${z(new Date().toISOString())}`,
    `DTSTART:${z(new Date(D(p.frist) - 30 * 6e4).toISOString())}`, `DTEND:${z(p.frist)}`, `SUMMARY:${txt('Abgabefrist ' + kursName(p.kurs_id))}`, `DESCRIPTION:${txt(p.titel)}`, 'END:VEVENT']));
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Online-Campus//Prototyp//DE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Online-Campus', ...ev.flat(), 'END:VCALENDAR'].join('\r\n');
  herunterladen('online-campus-stundenplan.ics', ics, 'text/calendar');
  dialogZu();
  toast('Kalenderdatei heruntergeladen', `${ev.length} Einträge`);
};

// ---------- Module ----------
function naechsteFrist(kid) { const p = pruefungenVon([kid], ich().id).filter(x => D(x.frist) > new Date())[0]; return p ? D(p.frist) : null; }
function sModule() {
  const u = ich();
  // Nach der nächsten Frist sortiert, nicht alphabetisch (Idee aus der ersten Sitemap)
  const kurse = kurseVon(u.id).sort((a, b) => (naechsteFrist(a.id) || Infinity) - (naechsteFrist(b.id) || Infinity));
  return `${kopfzeile('Module', `${esc(aktSem().bezeichnung)} · sortiert nach der nächsten Frist · <a href="#/leistungen">frühere Semester im Studienverlauf</a>`)}
  <div class="raster raster-2">${kurse.map(k => {
    const m = modulVon(k), p = persPruefung(db.pruefung.find(x => x.kurs_id === k.id), u.id), s = p ? statusVon(p, u.id) : null;
    const c = p && D(p.frist) > new Date() ? countdown(p.frist) : null;
    const nt = termineVon([k.id]).find(t => D(t.ende) > new Date() && t.status !== 'ausgefallen');
    const neuMat = db.material.filter(x => x.kurs_id === k.id && tagDiff(x.sichtbar_ab) >= -7 && D(x.sichtbar_ab) <= new Date()).length;
    return `<a class="karte modul-karte" href="#/module/${k.id}">
      <div class="zeile oben"><span class="kuerzel" style="background:${farbeVon(k.id)}">${esc(m.kuerzel)}</span>
        <div style="min-width:0;flex:1"><h3 style="margin:0">${esc(m.titel)}</h3><p class="klein leise" style="margin:0">${ectsText(m)} · ${lehrendeVon(k.id).map(l => esc(name(l))).join(', ')}</p></div>
        ${neuMat ? `<span class="marke-klein m-info">${neuMat} neu</span>` : ''}</div>
      <div class="zeile dazwischen abstand" style="flex-wrap:wrap;gap:6px">
        <span class="klein">${p ? esc(p.art) + (c ? ` · <b>${c.text}</b>` : '') : ''}</span>
        ${s ? `<span class="marke-klein ${s.kl}">${esc(s.text)}</span>` : ''}</div>
      <p class="klein leise" style="margin:8px 0 0">${nt ? `Nächster Termin: ${fmtDatum(nt.beginn)}, ${fmtZeit(nt.beginn)} Uhr · ${esc(raumName(nt))}` : 'Keine weiteren Termine'}</p>
    </a>`;
  }).join('')}</div>`;
}

function sModul(kid, tab) {
  const u = ich(), k = byId('kurs', kid);
  if (!k || !kurseVon(u.id, true).some(x => x.id === kid)) throw new Error('kein Zugriff');
  const m = modulVon(k), lehr = lehrendeVon(kid), p = persPruefung(db.pruefung.find(x => x.kurs_id === kid), u.id);
  const frueher = k.semester_id !== aktSem().id;
  const reiter = [['ueberblick', 'Überblick'], ['termine', 'Termine'], ['materialien', 'Materialien'], ['pruefung', 'Prüfung'], ['abgabe', 'Abgabe'], ['ergebnis', 'Ergebnis']];
  const inhalt = {
    ueberblick: () => `<div class="raster raster-2">
      <section class="karte"><h2>Worum es geht</h2><p>${esc(m.beschreibung)}</p><p class="klein leise">${esc(BEREICHE[m.bereich])} · ${m.ue} Unterrichtseinheiten · ${m.workload ? m.workload + ' Stunden Workload · ' : ''}${ectsText(m)} · Kürzel ${esc(m.kuerzel)}</p></section>
      <section class="karte"><h2>Lehrende</h2><ul class="liste">${lehr.map(l => `<li class="zeile"><span class="avatar" style="width:36px;height:36px;font-size:13px">${initialen(l)}</span><span><b>${esc(name(l))}</b><br><a class="klein" href="mailto:${esc(l.email)}">${esc(l.email)}</a></span></li>`).join('')}</ul></section>
      <section class="karte"><h2>Prüfung</h2>${p ? `<p><b>${esc(p.art)}</b>: ${esc(p.titel)}</p><p class="klein leise">${p.mit_upload ? 'Abgabe' : 'Termin'} ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr</p><a class="knopf klein" href="#/module/${kid}/${p.mit_upload ? 'abgabe' : 'pruefung'}">${p.mit_upload ? 'Zur Abgabe' : 'Details'}</a>` : '<p class="leise">Keine Prüfung hinterlegt</p>'}</section>
      <section class="karte"><h2>Nächster Termin</h2>${(() => { const t = termineVon([kid]).find(x => D(x.ende) > new Date() && x.status !== 'ausgefallen'); return t ? terminGross(t) : '<p class="leise">Keine weiteren Termine</p>'; })()}</section>
    </div>`,
    termine: () => `<section class="karte"><div class="tabelle-huelle"><table><thead><tr><th>Datum</th><th>Zeit</th><th>Ort</th><th>Art</th><th>Status</th><th></th></tr></thead><tbody>
      ${termineVon([kid]).map(t => `<tr style="${D(t.ende) < new Date() ? 'opacity:.55' : ''}"><td>${fmtDatum(t.beginn)}</td><td>${fmtZeit(t.beginn)}–${fmtZeit(t.ende)}</td><td>${t.raum_id ? `<a href="#/service/lageplan?raum=${t.raum_id}">${esc(raumName(t))}</a>` : 'Online'}</td><td>${esc(t.art)}</td>
      <td>${t.status === 'ausgefallen' ? '<span class="marke-klein m-fehler">fällt aus</span>' : t.status === 'verlegt' ? '<span class="marke-klein m-warn">geändert</span>' : t.vertretung_id ? '<span class="marke-klein m-warn">Vertretung</span>' : '<span class="leise klein">wie geplant</span>'} <span class="klein leise">${esc(t.hinweis || '')}</span></td><td style="text-align:right">${D(t.ende) > new Date() ? konferenzKnopf(t) : ''}</td></tr>`).join('')}
      </tbody></table></div></section>`,
    materialien: () => materialListe(kid, false),
    pruefung: () => p ? `<section class="karte"><h2>${esc(p.titel)}</h2>
      <div class="tabelle-huelle"><table><tbody>
        <tr><th>Art</th><td>${esc(p.art)}${p.gruppenarbeit ? ' · Gruppenarbeit' : ''}</td></tr>
        <tr><th>${p.mit_upload ? 'Abgabefrist' : 'Termin'}</th><td>${fmtLang(D(p.frist))}, ${fmtZeit(p.frist)} Uhr ${D(p.frist) > new Date() ? `<span class="marke-klein ${countdown(p.frist).kl}">${countdown(p.frist).text}</span>` : ''}</td></tr>
        ${p.mit_upload ? `<tr><th>Abgabe</th><td>Upload im Campus · ${esc(p.formate.toUpperCase())} · bis ${p.max_mb >= 1000 ? (p.max_mb / 1000).toString().replace('.', ',') + ' GB' : p.max_mb + ' MB'} je Datei</td></tr>` : `<tr><th>Ort</th><td>${(() => { const t = db.termin.find(x => x.kurs_id === kid && x.art === 'Klausur'); return t ? esc(raumName(t)) : 'wird bekannt gegeben'; })()}</td></tr>`}
        <tr><th>Gewicht</th><td>${Math.round(p.gewicht * 100)} % der Modulnote</td></tr>
      </tbody></table></div>
      ${p.mit_upload ? `<div class="hinweis abstand">${I('info')}<div>Du kannst bis zur Frist beliebig oft neue Versionen hochladen. Bewertet wird die letzte Version vor der Frist. Hilfe zu Aufbau und Zitieren findest du unter <a href="#/service/wissenschaft">Wissenschaftliches Arbeiten</a>.</div></div>` : ''}
      </section>` : '<div class="karte leer">Keine Prüfung hinterlegt</div>',
    abgabe: () => sAbgabe(kid, p),
    ergebnis: () => sErgebnis(p),
  }[tab];
  if (!inhalt) throw new Error('unbekannter Reiter');
  return `<a class="klein zeile" href="${frueher ? '#/leistungen' : '#/module'}" style="gap:4px;margin-bottom:10px">${I('zurueck')} ${frueher ? 'Studienverlauf' : 'Module'}</a>
    <div class="zeile oben"><span class="kuerzel" style="background:${farbeVon(kid)};width:52px;height:52px">${esc(m.kuerzel)}</span>
    <div><h1>${esc(m.titel)}</h1><p class="leise" style="margin:0">${m.nr ? 'Modul ' + esc(m.nr) + ' · ' : ''}${m.ects ? m.ects + ' ECTS · ' : ''}${lehr.map(l => esc(name(l))).join(', ')} · ${esc(byId('semester', k.semester_id).bezeichnung)}${frueher ? ' <span class="marke-klein">abgeschlossen</span>' : ''}</p></div></div>
    <nav class="reiter" aria-label="Bereiche des Moduls">${reiter.map(([k2, t2]) => `<a href="#/module/${kid}/${k2}" ${tab === k2 ? 'aria-current="page"' : ''}>${t2}</a>`).join('')}</nav>
    ${inhalt()}`;
}
function materialListe(kid, lehrend) {
  const jetzt = new Date();
  const liste = db.material.filter(x => x.kurs_id === kid && (lehrend || D(x.sichtbar_ab) <= jetzt)).sort((a, b) => D(b.sichtbar_ab) - D(a.sichtbar_ab));
  return `<section class="karte"><ul class="liste">${liste.map(x => {
    const d = byId('datei', x.datei_id);
    const neu = tagDiff(x.sichtbar_ab) >= -7 && D(x.sichtbar_ab) <= jetzt;
    return `<li class="zeile"><span class="symbol m-info" style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center">${I('datei')}</span>
      <span style="flex:1;min-width:0"><b>${esc(x.titel)}</b> ${neu ? '<span class="marke-klein m-info">neu</span>' : ''}${D(x.sichtbar_ab) > jetzt ? `<span class="marke-klein m-warn">sichtbar ab ${fmtDatum(x.sichtbar_ab)}, ${fmtZeit(x.sichtbar_ab)}</span>` : ''}<br>
      <span class="klein leise">${esc(d.dateiname)} · ${bytes(d.groesse_bytes)} · ${fmtDatumJ(x.sichtbar_ab)}</span>
      ${lehrend ? `<br><span class="klein ${x.text_status === 'ausgelesen' ? 'leise' : x.text_status === 'wird ausgelesen' ? 'leise' : 'fehlertext'}">${I('chat', 'klein-svg')} Assistent: ${x.text_status === 'ausgelesen' ? plural(db.abschnitt.filter(a => a.material_id === x.id).length, 'Abschnitt', 'Abschnitte') + ' durchsuchbar' : esc(x.text_status || 'nicht ausgelesen')}</span>` : ''}</span>
      <button class="knopf klein" data-action="datei-laden" data-id="${d.id}">${I('download')}<span>Laden</span></button></li>`;
  }).join('') || '<li class="leer">Noch keine Materialien</li>'}</ul></section>`;
}
AKTIONEN.platzhalter = el => toast(el.dataset.text || 'Im Prototyp nur angedeutet');
AKTIONEN['datei-laden'] = (el, e) => { e.preventDefault(); dateiHerunterladen(el.dataset.id); };

// ---------- Abgabe ----------
const mb = p => p.max_mb >= 1000 ? (p.max_mb / 1000).toString().replace('.', ',') + ' GB' : p.max_mb + ' MB';
function sAbgabe(kid, p) {
  const u = ich();
  if (!p || !p.mit_upload) {
    return `<div class="hinweis">${I('info')}<div>In diesem Modul gibt es keine Abgabe über den Campus. ${p ? `Die Prüfung ist eine ${esc(p.art)} am ${fmtDatum(p.frist)} um ${fmtZeit(p.frist)} Uhr.` : ''}</div></div>`;
  }
  const a = abgabeVon(p.id, u.id), vs = a ? versionenVon(a.id) : [];
  const n = noteVon(p.id, u.id), bewertet = n && n.freigegeben_am;
  const abgelaufen = D(p.frist) < new Date();
  const c = countdown(p.frist);
  const zaehlt = a ? zaehlendeVersion(a.id) : null;
  const mitschueler = studisVon(kid).filter(x => x !== u.id).map(x => byId('user', x));
  const lb = letzteBestaetigung && letzteBestaetigung.pid === p.id ? db.abgabeversion.find(v => v.id === letzteBestaetigung.versionId) : null;

  return `${lb ? bestaetigungKarte(p, a, lb) : ''}
  <section class="karte">
    <div class="zeile dazwischen" style="flex-wrap:wrap;gap:10px">
      <div><h2 style="margin-bottom:2px">${esc(p.titel)}</h2><p class="leise" style="margin:0">Frist: ${fmtLang(D(p.frist))}, ${fmtZeit(p.frist)} Uhr</p></div>
      <span class="uhr ${c.kl}" style="font-size:15px;padding:8px 12px">${c.text}</span>
    </div>
    <div class="zeile abstand klein leise" style="flex-wrap:wrap;gap:16px">
      <span class="zeile" style="gap:6px">${I('datei')} ${esc(p.formate.toUpperCase())}</span>
      <span class="zeile" style="gap:6px">${I('upload')} bis ${mb(p)} je Datei</span>
      ${p.gruppenarbeit ? `<span class="zeile" style="gap:6px">${I('gruppe')} Gruppenarbeit${a ? ': ' + mitgliederVon(a.id).map(x => esc(byId('user', x).vorname)).join(', ') : ''}</span>` : ''}
    </div>
  </section>

  ${vs.length ? `<section class="karte"><h2>Deine Versionen</h2><div class="tabelle-huelle"><table>
    <thead><tr><th>Version</th><th>Datei</th><th>Hochgeladen</th><th>Prüfsumme (SHA-256)</th></tr></thead><tbody>
    ${vs.slice().reverse().map(v => { const d = byId('datei', v.datei_id); return `<tr>
      <td><b>${v.nummer}</b> ${zaehlt && zaehlt.id === v.id ? '<span class="marke-klein m-gut">zählt</span>' : ''}${D(v.hochgeladen_am) > D(p.frist) ? '<span class="marke-klein m-fehler">verspätet</span>' : ''}</td>
      <td><a href="#" data-action="datei-laden" data-id="${d.id}">${d.mime_typ.startsWith('video') ? I('video') : ''} ${esc(d.dateiname)}</a><br><span class="klein leise">${bytes(d.groesse_bytes)}</span></td>
      <td>${fmtDatum(v.hochgeladen_am)}, ${fmtZeit(v.hochgeladen_am)} Uhr<br><span class="klein leise">von ${esc(byId('user', d.hochgeladen_von).vorname)}</span></td>
      <td class="pruefsumme" title="${d.sha256}">${d.sha256.slice(0, 16)}…</td></tr>`; }).join('')}
    </tbody></table></div></section>` : ''}

  ${bewertet ? `<div class="hinweis gut">${I('check')}<div>Diese Abgabe ist bewertet. <a href="#/module/${kid}/ergebnis">Zum Ergebnis</a></div></div>` : `
  <section class="karte">
    <h2>${vs.length ? 'Neue Version hochladen' : 'Abgabe hochladen'}</h2>
    ${abgelaufen ? `<div class="hinweis fehler" style="margin-bottom:14px">${I('warn')}<div><b>Die Frist ist abgelaufen.</b> Du kannst noch hochladen, die Version wird aber als verspätet markiert. Bei triftigem Grund: <a href="#/service/formulare">Antrag auf Fristverlängerung</a>.</div></div>` : ''}
    <form data-form="abgabe" data-pid="${p.id}">
      <label class="ablage" id="ablage">
        <input type="file" name="datei" data-change="datei-gewaehlt" data-pid="${p.id}" accept="${p.formate.split(',').map(f => '.' + f.trim()).join(',')}">
        <span style="color:var(--akzent)">${I('upload')}</span>
        <p class="fett" style="margin:8px 0 2px">Datei hierher ziehen oder auswählen</p>
        <p class="klein leise" style="margin:0">${esc(p.formate.toUpperCase())} · bis ${mb(p)} · große Dateien werden in Teilen übertragen und setzen nach einem Abbruch fort</p>
        <div id="dateiwahl" class="abstand"></div>
      </label>
      <div id="fortschritt" class="abstand" hidden><div class="zeile dazwischen klein"><span id="fortschritt-text">Wird übertragen …</span><span id="fortschritt-prozent">0 %</span></div><div class="fortschritt" style="margin-top:6px"><i id="fortschritt-balken" style="width:0"></i></div></div>
      ${p.gruppenarbeit && !a ? `<fieldset class="abstand" style="border:1px solid var(--rand);border-radius:12px;padding:12px 14px"><legend class="fett klein" style="padding:0 6px">Wer gehört zur Gruppe?</legend>
        <label class="haken"><input type="checkbox" checked disabled> ${esc(name(u))} (du)</label>
        ${mitschueler.map(x => `<label class="haken" style="margin-top:6px"><input type="checkbox" name="mitglied" value="${x.id}" ${abgabeVon(p.id, x.id) ? 'disabled' : ''}> ${esc(name(x))} ${abgabeVon(p.id, x.id) ? '<span class="klein leise">(schon in einer Gruppe)</span>' : ''}</label>`).join('')}
        <p class="klein leise" style="margin:8px 0 0">Alle Mitglieder sehen die Abgabe, können neue Versionen hochladen und bekommen die Eingangsbestätigung.</p></fieldset>` : ''}
      <label class="haken abstand"><input type="checkbox" name="erklaerung" required>
        <span>${p.gruppenarbeit ? 'Wir versichern' : 'Ich versichere'}, dass ${p.gruppenarbeit ? 'wir die Arbeit selbstständig verfasst' : 'ich die Arbeit selbstständig verfasst'} und alle Quellen angegeben ${p.gruppenarbeit ? 'haben' : 'habe'}. <span class="leise klein">Die Erklärung wird mit Zeitstempel gespeichert.</span></span></label>
      <div class="zeile abstand"><button class="knopf primaer" type="submit" id="einreichen">${I('upload')} ${vs.length ? `Version ${vs.length + 1} einreichen` : 'Einreichen'}</button></div>
    </form>
  </section>`}`;
}
function bestaetigungKarte(p, a, v) {
  const d = byId('datei', v.datei_id);
  return `<section class="bestaetigung" style="margin-bottom:16px" role="status">
    <div class="zeile"><span style="color:var(--gut)">${I('check')}</span><h2 style="margin:0">Abgabe eingegangen</h2></div>
    <p class="abstand" style="margin-bottom:6px">Version ${v.nummer} von <b>${esc(d.dateiname)}</b> (${bytes(d.groesse_bytes)}) ist am ${fmtDatum(v.hochgeladen_am)} um ${fmtZeit(v.hochgeladen_am)}:${pad(D(v.hochgeladen_am).getSeconds())} Uhr eingegangen${D(v.hochgeladen_am) > D(p.frist) ? ', <b>nach der Frist</b>' : ', vor der Frist'}.</p>
    <p class="klein" style="margin-bottom:4px">Prüfsumme (SHA-256), belegt, dass die Datei unverändert ist:</p>
    <p class="pruefsumme">${d.sha256}</p>
    <p class="klein leise" style="margin:6px 0 0">Eine Bestätigung ging per E-Mail an ${mitgliederVon(a.id).map(x => esc(name(byId('user', x)))).join(', ')}.</p>
  </section>`;
}
function dateiPruefen(p, f) {
  const endung = (f.name.split('.').pop() || '').toLowerCase();
  const erlaubt = p.formate.split(',').map(x => x.trim().toLowerCase());
  if (!erlaubt.includes(endung)) return `Das Format .${esc(endung)} ist hier nicht erlaubt. Erlaubt: ${esc(p.formate.toUpperCase())}. Speichere die Datei zum Beispiel als PDF und versuche es erneut.`;
  if (f.size > p.max_mb * 1e6) return `Die Datei ist ${bytes(f.size)} groß, erlaubt sind ${mb(p)}. Verkleinere sie (zum Beispiel Bilder komprimieren) oder teile sie auf.`;
  return null;
}
AENDERUNGEN['datei-gewaehlt'] = el => {
  const p = byId('pruefung', Number(el.dataset.pid)), f = el.files[0], box = document.getElementById('dateiwahl');
  if (!f) { box.innerHTML = ''; return; }
  const fehler = dateiPruefen(p, f);
  box.innerHTML = fehler ? `<div class="hinweis fehler" style="text-align:left">${I('warn')}<div>${fehler}</div></div>`
    : `<span class="marke-klein m-gut">${I('datei')} ${esc(f.name)} · ${bytes(f.size)}</span>`;
};
FORMULARE.abgabe = async (form, fd) => {
  const u = ich(), p = byId('pruefung', Number(form.dataset.pid)), f = fd.get('datei');
  if (!f || !f.name) { toast('Bitte zuerst eine Datei auswählen'); return; }
  const fehler = dateiPruefen(p, f);
  if (fehler) { toast('Datei passt nicht', fehler.replace(/<[^>]+>/g, '')); return; }
  const knopf = document.getElementById('einreichen'); knopf.disabled = true;
  const box = document.getElementById('fortschritt'); box.hidden = false;
  // Übertragung in Teilen von 8 MB (simuliert)
  const teile = Math.max(1, Math.ceil(f.size / 8e6)), schritte = Math.min(teile, 24);
  const hashVersprechen = sha256(f);
  for (let i = 1; i <= schritte; i++) {
    await sleep(900 / schritte + 20);
    const pz = Math.round((i / schritte) * 100);
    document.getElementById('fortschritt-balken').style.width = pz + '%';
    document.getElementById('fortschritt-prozent').textContent = pz + ' %';
    document.getElementById('fortschritt-text').textContent = teile > 1 ? `Teil ${Math.ceil((i / schritte) * teile)} von ${teile} übertragen` : 'Wird übertragen …';
  }
  document.getElementById('fortschritt-text').textContent = 'Prüfsumme wird berechnet …';
  const hash = (await hashVersprechen) || pseudoHash(f.name + f.size + Date.now());
  const jetzt = new Date().toISOString();
  const kid = p.kurs_id;
  let a = abgabeVon(p.id, u.id);
  if (!a) {
    a = { id: nextId('abgabe'), pruefung_id: p.id, status: 'eingereicht', eingereicht_am: jetzt, verspaetet: false, erklaerung_am: jetzt };
    db.abgabe.push(a);
    [u.id, ...fd.getAll('mitglied')].forEach(s => db.abgabe_mitglied.push({ abgabe_id: a.id, student_id: s }));
  }
  const datei = { id: 'd' + (db.datei.length + 1) + '-' + Date.now(), dateiname: f.name, mime_typ: f.type || 'application/octet-stream', groesse_bytes: f.size, sha256: hash, hochgeladen_von: u.id, hochgeladen_am: jetzt };
  const lesende = [...new Set([...mitgliederVon(a.id), ...lehrendeVon(p.kurs_id).map(l => l.id), ...db.user.filter(x => x.rolle === 'verwaltung').map(x => x.id)])];
  datei.ohne_inhalt = !(f.size <= MAX_GESPEICHERT && await inhaltSpeichern(datei.id, f, lesende));
  db.datei.push(datei);
  const version = { id: nextId('abgabeversion'), abgabe_id: a.id, nummer: versionenVon(a.id).length + 1, datei_id: datei.id, hochgeladen_am: jetzt };
  db.abgabeversion.push(version);
  // Serverzeit entscheidet über „verspätet“, nicht der Browser (Regel 2 im Konzept)
  Object.assign(a, { status: 'eingereicht', eingereicht_am: jetzt, verspaetet: D(jetzt) > D(fristFuer(p, u.id)), erklaerung_am: jetzt });
  sende({ anlass: 'eingang', titel: `Abgabe eingegangen: ${kursName(kid)}`, text: `Version ${version.nummer}, ${f.name}, ${fmtDatum(jetzt)} ${fmtZeit(jetzt)} Uhr. Prüfsumme ${hash.slice(0, 12)}…`, kurs_id: kid, pruefung_id: p.id, empfaenger: mitgliederVon(a.id) });
  letzteBestaetigung = { pid: p.id, versionId: version.id };
  speichern();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Abgabe eingegangen', `Version ${version.nummer} · Bestätigung per E-Mail`);
};

// ---------- Ergebnis ----------
function sErgebnis(p) {
  const u = ich();
  if (!p) return '<div class="karte leer">Keine Prüfung hinterlegt</div>';
  const n = noteVon(p.id, u.id), s = statusVon(p, u.id);
  if (n && n.freigegeben_am) {
    const bestanden = n.wert <= 4;
    return `<section class="karte"><div class="zeile" style="gap:20px;flex-wrap:wrap">
      <div class="datum-block" style="min-width:110px;padding:14px"><span>Note</span><b style="font-size:40px">${noteFmt(n.wert)}</b><span>${bestanden ? 'bestanden' : 'nicht bestanden'}</span></div>
      <div style="flex:1;min-width:220px"><h2 style="margin-bottom:4px">${esc(p.titel)}</h2>
        <p style="margin:0 0 8px">${n.bestaetigt_am ? `<span class="marke-klein m-gut">endgültig</span> vom Prüfungsamt bestätigt am ${fmtDatumJ(n.bestaetigt_am)}` : '<span class="marke-klein m-warn">vorläufig</span> vom Prüfungsamt noch nicht bestätigt'}</p>
        <p class="klein leise" style="margin:0">Bewertet von ${esc(name(byId('user', n.bewertet_von)))} · freigegeben am ${fmtDatumJ(n.freigegeben_am)}</p></div></div>
      ${n.feedback ? `<div class="abstand" style="border-left:3px solid var(--akzent);padding:4px 0 4px 14px"><p class="klein fett leise" style="margin-bottom:4px">Feedback</p><p style="margin:0">${esc(n.feedback)}</p></div>` : ''}
    </section>`;
  }
  const txt = { korrektur: 'Deine Leistung ist in Korrektur. Sobald die Note freigegeben ist, bekommst du eine Mitteilung.', eingereicht: 'Deine Abgabe ist eingegangen. Bewertet wird nach der Frist.', fehlt: 'Für diese Prüfung liegt keine Abgabe vor.', offen: 'Noch nichts abgegeben.', klausur: 'Die Klausur hat noch nicht stattgefunden.' }[s.code];
  return `<div class="hinweis ${s.code === 'fehlt' ? 'fehler' : ''}">${I(s.code === 'fehlt' ? 'warn' : 'uhr')}<div><b>${esc(s.text)}</b><br>${txt}</div></div>`;
}

// ---------- Leistungen ----------
function ectsStand(uid) {
  const ges = byId('studiengang', gruppeVon(uid).studiengang_id).ects_gesamt, sem = aktSem().id;
  let endgueltig = 0, vorlaeufig = 0, summe = 0, gewichte = 0, summeSem = 0, gewSem = 0;
  kurseVon(uid, true).forEach(k => {
    const m = modulVon(k);
    db.pruefung.filter(p => p.kurs_id === k.id).forEach(p => {
      const n = noteVon(p.id, uid);
      if (!n || !n.freigegeben_am) return;
      if (m.ects) { summe += n.wert * m.ects; gewichte += m.ects; }
      if (m.ects && k.semester_id === sem) { summeSem += n.wert * m.ects; gewSem += m.ects; }
      if (n.wert <= 4) { if (n.bestaetigt_am) endgueltig += m.ects; else vorlaeufig += m.ects; }
    });
  });
  db.anerkennung.filter(a => a.user_id === uid).forEach(a => { const m = byId('modul', a.modul_id); endgueltig += m.ects; summe += a.wert * m.ects; gewichte += m.ects; });
  return { gesamt: ges, endgueltig, vorlaeufig, schnitt: gewSem ? summeSem / gewSem : null, schnittGesamt: gewichte ? summe / gewichte : null };
}
// Stand eines Moduls im Studienverlauf
function modulStand(m, uid) {
  const an = db.anerkennung.find(a => a.user_id === uid && a.modul_id === m.id);
  if (an) return { kl: 'm-gut', text: `${noteFmt(an.wert)} · anerkannt` };
  const k = kurseVon(uid, true).find(x => x.modul_id === m.id);
  if (!k) return { kl: '', text: 'geplant' };
  const p = db.pruefung.find(x => x.kurs_id === k.id), n = p && noteVon(p.id, uid);
  if (n && n.freigegeben_am) return { kurs: k, note: n, kl: n.wert > 4 ? 'm-fehler' : n.bestaetigt_am ? 'm-gut' : 'm-warn', text: `${noteFmt(n.wert)} · ${n.bestaetigt_am ? 'endgültig' : 'vorläufig'}` };
  return k.semester_id === aktSem().id ? { kurs: k, kl: 'm-info', text: 'läuft' } : { kurs: k, kl: 'm-fehler', text: 'offen' };
}
function studienverlauf(u) {
  const sg = byId('studiengang', gruppeVon(u.id).studiengang_id), sp = schwerpunktVon(u.id);
  const semName = n => { const k = kurseVon(u.id, true).find(x => modulVon(x).plansemester === n); return k ? byId('semester', k.semester_id).bezeichnung : ''; };
  const aktuellesPlansemester = Math.max(...kurseVon(u.id).map(k => modulVon(k).plansemester));
  const zeile = m => { const st = modulStand(m, u.id); const inhalt = `<span class="kuerzel" style="width:34px;height:34px;font-size:10.5px;border-radius:9px;background:${FARBEN[(m.id - 1) % FARBEN.length]}">${esc(m.kuerzel)}</span>
      <span style="flex:1;min-width:0"><span class="klein fett" style="display:block">${esc(m.kurztitel)}${m.schwerpunkt ? ` <span class="marke-klein m-akzent">${m.schwerpunkt}</span>` : ''}</span><span class="klein leise">${m.ects ? m.ects + ' ECTS' : m.ue + ' UE, ohne eigene ECTS'}</span></span>
      <span class="marke-klein ${st.kl}">${esc(st.text)}</span>`;
    return `<li>${st.kurs ? `<a class="zeile" href="#/module/${st.kurs.id}${st.note ? '/ergebnis' : ''}" style="color:var(--text);text-decoration:none">${inhalt}</a>` : `<div class="zeile" style="opacity:.75">${inhalt}</div>`}</li>`;
  };
  const karten = [1, 2, 3, 4, 5, 6].map(n => {
    // Module des eigenen Schwerpunkts plus alle gemeinsamen Module
    const mods = db.modul.filter(m => m.plansemester === n && (!m.schwerpunkt || m.schwerpunkt === sp));
    const cp = mods.reduce((s, m) => s + m.ects, 0);
    return `<section class="karte" style="${n === aktuellesPlansemester ? 'border-color:var(--akzent);box-shadow:0 0 0 1px var(--akzent)' : ''}">
      <div class="zeile dazwischen"><h3 style="margin:0">${n}. Semester</h3><span class="klein leise">${cp} ECTS</span></div>
      <p class="klein leise" style="margin:0 0 8px">${esc(semName(n)) || (n > aktuellesPlansemester ? 'geplant' : '')}${n === aktuellesPlansemester ? ' · <b style="color:var(--akzent)">aktuell</b>' : ''}</p>
      <ul class="liste">${mods.filter(m => m.bereich !== 'PTP').map(zeile).join('')}${mods.filter(m => m.bereich === 'PTP').map(zeile).join('')}</ul></section>`;
  }).join('');
  return `<section class="abstand"><div class="zeile dazwischen" style="flex-wrap:wrap;margin:22px 0 10px"><h2 style="margin:0">Studienverlauf ${esc(sg.name)} (${esc(sg.abschluss)})</h2>
    <span class="klein leise">${sg.semester} Semester · ${sg.ects_gesamt} ECTS${sp ? ` · <b>${SCHWERPUNKTE[sp]}</b> seit dem 2. Semester` : ''}</span></div>
    <p class="klein leise" style="margin:0 0 12px">Module mit <span class="marke-klein m-akzent">${sp || 'M'}</span> gehören zu deinem Schwerpunkt, alle anderen besucht ihr gemeinsam. Die Parallelmodule des anderen Schwerpunkts sind ausgeblendet.</p>
    <div class="raster raster-3">${karten}</div></section>`;
}
function sLeistungen() {
  const u = ich(), kurse = kurseVon(u.id).map(k => k.id), st = ectsStand(u.id);
  const ps = pruefungenVon(kurse, u.id);
  const offen = ps.filter(p => ['offen', 'eingereicht', 'klausur'].includes(statusVon(p, u.id).code)).length;
  return `${kopfzeile('Leistungen', 'Prüfungen dieses Semesters, Noten und der ganze Studienverlauf.')}
  <div class="raster raster-3">
    <section class="karte"><p class="klein leise" style="margin:0">ECTS endgültig</p><p class="gross-zahl" style="margin:4px 0 10px">${st.endgueltig} <span class="leise" style="font-size:15px">/ ${st.gesamt}</span></p><div class="balken"><i style="width:${(st.endgueltig / st.gesamt) * 100}%"></i></div>${st.vorlaeufig ? `<p class="klein leise" style="margin:8px 0 0">+ ${st.vorlaeufig} ECTS vorläufig</p>` : ''}</section>
    <section class="karte"><p class="klein leise" style="margin:0">Durchschnitt</p><p class="gross-zahl" style="margin:4px 0 6px">${st.schnittGesamt ? noteFmt(st.schnittGesamt) : '–'}</p><p class="klein leise" style="margin:0">über alle Semester, nach ECTS gewichtet${st.schnitt ? ` · dieses Semester ${noteFmt(st.schnitt)}` : ''}</p></section>
    <section class="karte"><p class="klein leise" style="margin:0">Noch offen</p><p class="gross-zahl" style="margin:4px 0 6px">${offen}</p><p class="klein leise" style="margin:0">Prüfungen im ${esc(aktSem().bezeichnung)}</p></section>
  </div>
  <section class="karte abstand"><h2>Prüfungen ${esc(aktSem().bezeichnung)}</h2><div class="tabelle-huelle"><table>
    <thead><tr><th>Modul</th><th>Prüfung</th><th>Frist / Termin</th><th>Status</th><th>Note</th></tr></thead><tbody>
    ${ps.map(p => { const s = statusVon(p, u.id), n = noteVon(p.id, u.id), sichtbar = n && n.freigegeben_am; return `<tr>
      <td><a href="#/module/${p.kurs_id}" class="fett">${esc(kursName(p.kurs_id))}</a></td><td>${esc(p.art)}</td>
      <td>${fmtDatum(p.frist)}, ${fmtZeit(p.frist)}</td><td><span class="marke-klein ${s.kl}">${esc(s.text)}</span></td>
      <td>${sichtbar ? `<a href="#/module/${p.kurs_id}/ergebnis" class="note">${noteFmt(n.wert)}</a> <span class="klein leise">${n.bestaetigt_am ? 'endgültig' : 'vorläufig'}</span>` : '<span class="leise">–</span>'}</td></tr>`; }).join('')}
    </tbody></table></div></section>
  ${studienverlauf(u)}
  <section class="karte abstand"><h2>Bescheinigungen</h2><p class="leise">Werden sofort erzeugt und lassen sich als PDF speichern. Auf der Notenbescheinigung stehen nur endgültig bestätigte Noten.</p>
    <div class="zeile" style="flex-wrap:wrap"><button class="knopf" data-action="bescheinigung" data-art="noten">${I('download')} Notenbescheinigung</button><button class="knopf" data-action="bescheinigung" data-art="studium">${I('download')} Studienbescheinigung</button></div></section>`;
}
AKTIONEN.bescheinigung = el => {
  const u = ich(), g = gruppeVon(u.id), sg = byId('studiengang', g.studiengang_id);
  const noten = el.dataset.art === 'noten', st = ectsStand(u.id);
  const zeilen = kurseVon(u.id, true).flatMap(k => db.pruefung.filter(p => p.kurs_id === k.id).map(p => ({ k, m: modulVon(k), p, n: noteVon(p.id, u.id) }))).filter(x => x.n && x.n.bestaetigt_am)
    .sort((a, b) => a.k.semester_id - b.k.semester_id || (parseInt(a.m.nr) || 99) - (parseInt(b.m.nr) || 99));
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><title>${noten ? 'Notenbescheinigung' : 'Studienbescheinigung'}</title>
  <style>body{font:11pt/1.5 Georgia,serif;max-width:680px;margin:40px auto;color:#111}h1{font-size:20pt}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ccc;padding:5px;text-align:left}.klein{font-size:9pt;color:#555}</style>
  <p class="klein">${esc(sg.einrichtung)} · Online-Campus · Prototyp, nicht rechtsgültig</p>
  <h1>${noten ? 'Notenbescheinigung' : 'Studienbescheinigung'}</h1>
  <p>${esc(name(u))}, Matrikelnummer ${esc(u.matrikelnummer)}, ist im ${esc(aktSem().bezeichnung)} im Studiengang ${esc(sg.name)} (${esc(sg.abschluss)}), Studiengruppe ${esc(g.name)}, eingeschrieben.</p>
  ${noten ? `<table><tr><th>Nr.</th><th>Modul</th><th>Semester</th><th>ECTS</th><th>Note</th></tr>${zeilen.map(x => `<tr><td>${esc(x.m.nr)}</td><td>${esc(x.m.titel)}</td><td>${esc(byId('semester', x.k.semester_id).bezeichnung)}</td><td>${x.m.ects || '–'}</td><td>${noteFmt(x.n.wert)}</td></tr>`).join('') || '<tr><td colspan="5">Keine endgültig bestätigten Noten</td></tr>'}</table>
  <p>Erworbene ECTS: <b>${st.endgueltig} von ${st.gesamt}</b>${st.schnittGesamt ? ` · Durchschnitt ${noteFmt(st.schnittGesamt)}` : ''}</p>
  <p class="klein">Aufgeführt sind nur vom Prüfungsamt endgültig bestätigte Noten.</p>` : ''}
  <p class="klein">Erstellt am ${fmtDatumJ(new Date().toISOString())} · Prüfcode ${pseudoHash(u.id + Date.now()).slice(0, 12).toUpperCase()}</p>
  <script>print()<\/script></html>`;
  const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  if (!w) toast('Bitte Pop-ups für diese Seite erlauben');
};

// ---------- Service ----------
function sService(tab, q) {
  const s = db.service;
  const reiter = [['lageplan', 'Lageplan und Räume'], ['kontakt', 'Ansprechpersonen'], ['wissenschaft', 'Wissenschaftliches Arbeiten'], ['formulare', 'Formulare und FAQ'], ['antraege', 'Meine Anträge']];
  const aktivRaum = Number(q.get('raum')) || null;
  const inhalt = {
    lageplan: () => `<div class="raster raster-2">
      <section class="karte"><h2>Campus Mitte, 2. und 3. OG</h2>
        <svg class="lageplan" viewBox="0 0 420 220" role="img" aria-label="Lageplan">${db.raum.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8" class="${r.id === aktivRaum ? 'aktiv' : ''}"/><text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 4}" text-anchor="middle">${esc(r.bezeichnung)}</text>`).join('')}</svg>
        <p class="klein leise abstand">Musterstraße 1 · Eingang über den Hof, Aufzug links neben der Treppe. Barrierefreier Zugang über die Rampe am Haupteingang.</p></section>
      <section class="karte"><h2>Räume</h2><ul class="liste">${db.raum.map(r => `<li class="zeile dazwischen"><a href="#/service/lageplan?raum=${r.id}" class="${r.id === aktivRaum ? 'fett' : ''}">${I('ort')} ${esc(r.bezeichnung)}</a><span class="klein leise">${r.plaetze} Plätze</span></li>`).join('')}</ul></section></div>`,
    kontakt: () => `<div class="raster raster-3">${s.ansprechpersonen.map(a => `<section class="karte"><h3>${esc(a.name)}</h3><p class="klein">${esc(a.aufgabe)}</p>
      <p class="klein" style="margin:0"><a href="mailto:${esc(a.email)}">${esc(a.email)}</a><br>${esc(a.telefon)}<br><span class="leise">${esc(a.zeiten)}</span></p></section>`).join('')}</div>`,
    wissenschaft: () => `<div class="raster raster-2">
      <section class="karte"><h2>Kurzleitfaden Hausarbeit</h2><ol style="padding-left:18px;margin:0">
        <li><b>Aufbau:</b> Deckblatt, Inhaltsverzeichnis, Einleitung mit Fragestellung, Hauptteil, Fazit, Literaturverzeichnis, Eigenständigkeitserklärung.</li>
        <li><b>Umfang:</b> Hausarbeit 12–15 Seiten, Kurz-Hausarbeit 6–8 Seiten, ohne Verzeichnisse.</li>
        <li><b>Format:</b> Schrift 12 pt, Zeilenabstand 1,5, Ränder 2,5 cm, Seitenzahlen.</li>
        <li><b>Zitieren:</b> einheitlich nach APA 7. Jede Aussage aus einer Quelle braucht einen Beleg.</li>
        <li><b>Abgabe:</b> als PDF im Modul unter Abgabe. Die Erklärung setzt du beim Hochladen per Häkchen.</li></ol></section>
      <section class="karte"><h2>Vorlagen zum Herunterladen</h2><ul class="liste">
        <li class="zeile dazwischen"><span>${I('datei')} Vorlage Hausarbeit (Word)</span><button class="knopf klein" data-action="vorlage" data-art="hausarbeit">${I('download')} Laden</button></li>
        <li class="zeile dazwischen"><span>${I('datei')} Deckblatt (Word)</span><button class="knopf klein" data-action="vorlage" data-art="deckblatt">${I('download')} Laden</button></li>
        <li class="zeile dazwischen"><span>${I('datei')} Leitfaden Zitieren (APA 7)</span><button class="knopf klein" data-action="platzhalter" data-text="Der Leitfaden liegt im Modul Praxistransfer 1 unter Materialien (Studienverlauf, 1. Semester).">${I('download')} Laden</button></li>
      </ul></section></div>`,
    formulare: () => `<div class="raster raster-2">
      <section class="karte"><h2>Online-Anträge</h2><p class="klein leise">Direkt an das Studienbüro, mit PDF-Nachweis. Den Stand siehst du unter <a href="#/service/antraege">Meine Anträge</a>.</p><ul class="liste">${s.formulare.map(k => `<li class="zeile dazwischen" style="flex-wrap:wrap"><span style="flex:1 1 200px"><b>${esc(ANTRAGSARTEN[k].name)}</b><br><span class="klein leise">${esc(ANTRAGSARTEN[k].erklaerung)}</span></span><a class="knopf klein" href="#/service/antrag/${k}">Online stellen</a></li>`).join('')}</ul></section>
      <section class="karte"><h2>Häufige Fragen</h2>${s.faq.map(f => `<details style="border-top:1px solid var(--rand);padding:10px 0"><summary class="fett" style="cursor:pointer">${esc(f.frage)}</summary><p style="margin:8px 0 0">${esc(f.antwort)}</p></details>`).join('')}</section></div>`,
  }[tab];
  if (!inhalt) throw new Error('unbekannter Reiter');
  return `${kopfzeile('Service', 'Alles rund ums Studium, was nicht zu einem Modul gehört.')}
    <nav class="reiter" aria-label="Service-Bereiche">${reiter.map(([k, t]) => `<a href="#/service/${k}" ${tab === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>${inhalt()}`;
}
AKTIONEN.vorlage = el => {
  const u = ich(), deck = el.dataset.art === 'deckblatt';
  // RTF öffnet sich direkt in Word, Pages und LibreOffice.
  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24
\\qc\\b\\fs32 Titel der Arbeit\\b0\\fs24\\par\\par
Hausarbeit im Modul [Modul]\\par bei [Lehrende]\\par\\par
vorgelegt von ${u.vorname} ${u.nachname}\\par Matrikelnummer ${u.matrikelnummer || ''}\\par Studiengruppe ${gruppeVon(u.id)?.name || ''}\\par\\par Abgabedatum: [Datum]\\par
${deck ? '' : `\\page\\ql\\b Inhaltsverzeichnis\\b0\\par\\par\\b 1 Einleitung\\b0\\par Fragestellung und Vorgehen.\\par\\par\\b 2 Hauptteil\\b0\\par\\par\\b 3 Fazit\\b0\\par\\par\\b Literaturverzeichnis\\b0\\par Nachname, V. (Jahr). Titel. Verlag.\\par`}}`;
  herunterladen(deck ? 'Deckblatt.rtf' : 'Vorlage_Hausarbeit.rtf', rtf, 'application/rtf');
  toast('Vorlage heruntergeladen', 'Öffnet sich in Word, Pages oder LibreOffice');
};

// ---------- Mitteilungen (alle Rollen) ----------
function mitteilungenSeite(q) {
  const u = ich(), f = q.get('f') || 'alle';
  const liste = filtere(meineMitteilungen(u.id), f);
  const fk = (k, t) => `<button data-action="gehe" data-ziel="#/mitteilungen?f=${k}" aria-pressed="${f === k}">${t}</button>`;
  return `${kopfzeile('Mitteilungen', 'Neuigkeiten, Änderungen, Noten und Eingangsbestätigungen an einem Ort.')}
    <section class="karte" style="padding:0;overflow:hidden">
      <div class="zeile dazwischen" style="padding:14px 16px 4px;flex-wrap:wrap"><div class="filter" style="padding:0">${fk('alle', 'Alle')}${fk('neuigkeiten', 'Neuigkeiten')}${fk('aenderungen', 'Änderungen')}${fk('noten', 'Noten & Abgaben')}</div>
      <button class="knopf klein" data-action="alle-gelesen">Alle als gelesen markieren</button></div>
      <div style="margin-top:10px">${liste.map(mitteilungsEintrag).join('') || '<p class="leer">Keine Mitteilungen</p>'}</div>
    </section>
    <p class="klein leise abstand">Wie du benachrichtigt wirst, legst du im <a href="#/profil">Profil</a> fest.</p>`;
}

// ---------- Profil (alle Rollen) ----------
function profil() {
  const u = ich(), g = gruppeVon(u.id);
  const rolleText = { studierend: 'Studierende', lehrend: 'Lehrende', verwaltung: 'Verwaltung' }[u.rolle];
  return `${kopfzeile('Profil')}
  <div class="raster raster-2">
    <section class="karte"><h2>Persönliche Daten</h2><div class="tabelle-huelle"><table><tbody>
      <tr><th>Name</th><td>${esc(name(u))}</td></tr><tr><th>E-Mail</th><td>${esc(u.email)}</td></tr><tr><th>Rolle</th><td>${rolleText}</td></tr>
      ${u.matrikelnummer ? `<tr><th>Matrikelnummer</th><td>${esc(u.matrikelnummer)}</td></tr>` : ''}${u.adresse ? `<tr><th>Anschrift</th><td>${esc(u.adresse.strasse)}, ${esc(u.adresse.plz)} ${esc(u.adresse.ort)}</td></tr>` : ''}${g ? `<tr><th>Studiengruppe</th><td>${esc(g.name)} · ${esc(g.standort)}</td></tr>` : ''}
    </tbody></table></div><p class="klein leise abstand">Anschrift ändern: <a href="#/service/antrag/adresse">Online-Antrag Adressänderung</a>.</p></section>
    <section class="karte"><h2>Anmeldung und Sicherheit</h2>
      <p class="zeile">${I('schloss')} ${u.rolle === 'studierend' ? 'Anmeldung mit E-Mail und Passwort' : 'Anmeldung mit Passwort und Zwei-Faktor-Code'}</p>
      <div class="zeile" style="flex-wrap:wrap"><button class="knopf" data-action="platzhalter" data-text="Im Prototyp gibt es keine echten Passwörter.">Passwort ändern</button><button class="knopf gefahr" data-action="abmelden">Abmelden</button></div></section>
  </div>
  <section class="karte abstand"><h2>Benachrichtigungen</h2>
    <p class="leise">Lege je Anlass fest, wie du informiert wirst. Im Campus (Glocke) erscheint immer alles. Push setzt voraus, dass du den Campus als App auf dem Handy installiert hast.</p>
    <div class="tabelle-huelle"><table class="matrix"><thead><tr><th>Anlass</th>${KANAELE.map(k => `<th>${k.name}</th>`).join('')}</tr></thead><tbody>
    ${ANLAESSE.map(a => { const e = einstellungVon(u.id, a.id); return `<tr><td>${esc(a.name)}${a.pflicht ? '<br><span class="klein leise">E-Mail ist hier Pflicht, sie dient als Nachweis</span>' : ''}</td>
      ${KANAELE.map(k => { const fest = k.id === 'campus' || (a.pflicht || []).includes(k.id); return `<td><input type="checkbox" aria-label="${esc(a.name)}: ${k.name}" data-change="einstellung" data-anlass="${a.id}" data-kanal="${k.id}" ${e[k.id] ? 'checked' : ''} ${fest ? 'disabled' : ''}></td>`; }).join('')}</tr>`; }).join('')}
    </tbody></table></div>
    <div class="hinweis abstand">${I('info')}<div>Noten stehen nie im Text einer E-Mail oder Push-Nachricht, nur der Hinweis, dass eine Note vorliegt. Die Note selbst siehst du erst nach der Anmeldung.</div></div>
  </section>`;
}
AENDERUNGEN.einstellung = el => {
  const u = ich();
  db.einstellungen[u.id] = db.einstellungen[u.id] || {};
  db.einstellungen[u.id][el.dataset.anlass] = { ...(db.einstellungen[u.id][el.dataset.anlass] || {}), [el.dataset.kanal]: el.checked };
  speichern();
  toast('Gespeichert', `${ANLAESSE.find(a => a.id === el.dataset.anlass).name}: ${KANAELE.find(k => k.id === el.dataset.kanal).name} ${el.checked ? 'an' : 'aus'}`);
};

// ---------- Suche (alle Rollen) ----------
function suche(begriff) {
  const u = ich(), b = begriff.trim().toLowerCase();
  const kurse = kurseVon(u.id, true);
  const passt = (...s) => s.some(x => String(x || '').toLowerCase().includes(b));
  const basis = rolle() === 'studierend' ? '#/module/' : '#/kurse/';
  const treffer = b.length < 2 ? [] : [
    ...kurse.filter(k => passt(modulVon(k).titel, modulVon(k).kuerzel, modulVon(k).beschreibung)).map(k => ({ typ: 'Modul', titel: modulVon(k).titel, link: basis + k.id })),
    ...db.material.filter(m => kurse.some(k => k.id === m.kurs_id) && passt(m.titel, byId('datei', m.datei_id).dateiname)).map(m => ({ typ: 'Material', titel: m.titel, unter: kursName(m.kurs_id), link: rolle() === 'studierend' ? `#/module/${m.kurs_id}/materialien` : `#/kurse/${m.kurs_id}/materialien` })),
    ...db.service.faq.filter(f => passt(f.frage, f.antwort)).map(f => ({ typ: 'Hilfe', titel: f.frage, unter: f.antwort, link: '#/service/formulare' })),
    ...db.service.ansprechpersonen.filter(a => passt(a.name, a.aufgabe)).map(a => ({ typ: 'Kontakt', titel: a.name, unter: a.aufgabe, link: '#/service/kontakt' })),
    ...db.raum.filter(r => passt(r.bezeichnung)).map(r => ({ typ: 'Raum', titel: r.bezeichnung, link: '#/service/lageplan?raum=' + r.id })),
  ];
  return `${kopfzeile('Suche', b ? `${plural(treffer.length, 'Treffer', 'Treffer')} für „${esc(begriff)}“` : 'Suchbegriff eingeben')}
    <form data-form="suche" class="zeile" style="margin-bottom:16px;max-width:520px"><input name="q" type="search" value="${esc(begriff)}" class="knopf" style="flex:1;text-align:left;font-weight:400" aria-label="Suchbegriff" autofocus><button class="knopf primaer">Suchen</button></form>
    <section class="karte"><ul class="liste">${treffer.map(t => `<li><a href="${t.link}" class="zeile oben" style="color:var(--text);text-decoration:none"><span class="marke-klein m-akzent">${t.typ}</span><span><b>${esc(t.titel)}</b>${t.unter ? `<br><span class="klein leise">${esc(t.unter)}</span>` : ''}</span></a></li>`).join('') || `<li class="leer">${b ? 'Nichts gefunden. Versuch es mit einem anderen Begriff oder frag den <a href="#/service/kontakt">Support</a>.' : ''}</li>`}</ul></section>`;
}

// ---------- Login ----------
function loginAnsicht() {
  const personen = [['s1', 'Studierende', 'Schwerpunkt Medien: Stundenplan, Abgaben, Noten'], ['s2', 'Studierende', 'Schwerpunkt IT, gleiche Projektgruppe wie Lena'], ['l1', 'Lehrende', 'Termine ändern, Material hochladen, korrigieren'], ['v1', 'Verwaltung', 'Noten bestätigen, Mitteilungen an alle']];
  return `<div class="login"><div class="login-karte">
    <div class="marke" style="padding:0 0 18px;font-size:20px"><div class="logo">OC</div><div>Online-Campus<small>Studium, Stundenplan und Prüfungen an einem Ort</small></div></div>
    <div class="raster raster-2">
      <section class="karte"><h2>Anmelden</h2>
        <form data-form="login">
          <label class="feld"><span>E-Mail</span><input name="email" type="email" autocomplete="username" placeholder="vorname.nachname@campus.example" required></label>
          <label class="feld"><span>Passwort</span><input name="passwort" type="password" autocomplete="current-password" placeholder="${BACKEND.aktiv ? 'Passwort' : 'Im Prototyp beliebig'}"></label>
          <button class="knopf primaer" style="width:100%">Anmelden</button>
          <p class="klein abstand" style="margin-bottom:0"><a href="#" data-action="platzhalter" data-text="Im fertigen Campus kommt hier ein Code per E-Mail, kein Link. Links werden von Mail-Scannern oft schon vorab geöffnet.">Passwort vergessen?</a></p>
        </form></section>
      <section class="karte"><h2>Oder direkt als …</h2><p class="klein leise">Prototyp: Wähle eine Person, um den Campus aus ihrer Sicht zu sehen.${BACKEND.aktiv ? ' Alle teilen eine gemeinsame Datenbank: Was eine Person ändert, sehen die anderen sofort.' : ''}</p>
        <div class="raster" style="gap:8px">${personen.map(([id, r, t]) => { const u = byId('user', id); return `<button class="person" data-action="als" data-id="${id}"><span class="avatar">${initialen(u)}</span><span><b>${esc(name(u))}</b> <span class="marke-klein">${r}</span><br><span class="klein leise">${t}</span></span></button>`; }).join('')}</div></section>
    </div></div></div>`;
}
FORMULARE.login = async (f, fd) => {
  if (BACKEND.aktiv) {
    try { await BACKEND.auth.signInWithEmailAndPassword(String(fd.get('email')).trim(), String(fd.get('passwort'))); }
    catch (e) { toast('Anmeldung fehlgeschlagen', ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(e.code) ? 'E-Mail oder Passwort stimmen nicht.' : e.message); }
    return;
  }
  const u = db.user.find(x => x.email.toLowerCase() === String(fd.get('email')).trim().toLowerCase());
  if (!u) { toast('Diese E-Mail kennen wir nicht', 'Beispiel: lena.hoffmann@campus.example'); return; }
  AKTIONEN.als({ dataset: { id: u.id } });
};
