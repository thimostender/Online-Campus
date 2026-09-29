'use strict';
// Ansichten für Lehrende und Verwaltung (Sitemap: Bereich Lehrende, Bereich Verwaltung).

ANSICHTEN.lehrend = (t, q) => {
  switch (t[0] || 'uebersicht') {
    case 'uebersicht': return lUebersicht();
    case 'kurse': return t[1] ? lKurs(Number(t[1]), t[2] || 'termine') : lKurse();
    case 'korrektur': return t[1] ? lKorrektur(Number(t[1])) : lKorrekturen();
    case 'stundenplan': return stundenplan(q);
    case 'konferenz': return konferenz(Number(t[1]));
    case 'mitteilungen': return mitteilungenSeite(q);
    case 'profil': return profil();
    case 'suche': return suche(q.get('q') || '');
    default: throw new Error('unbekannt');
  }
};
ANSICHTEN.verwaltung = (t, q) => {
  switch (t[0] || 'uebersicht') {
    case 'uebersicht': return vUebersicht();
    case 'antraege': return vAntraege(t[1], q);
    case 'gruppen': return vGruppen();
    case 'personen': return vPersonen(q);
    case 'planung': return vPlanung();
    case 'pruefungsamt': return vPruefungsamt();
    case 'nachrichten': return vNachrichten();
    case 'inhalte': return vInhalte();
    case 'mitteilungen': return mitteilungenSeite(q);
    case 'profil': return profil();
    case 'suche': return suche(q.get('q') || '');
    default: throw new Error('unbekannt');
  }
};

// ---------- Lehrende: Hilfen ----------
function korrekturStand(p) {
  const studis = studisVon(p.kurs_id).filter(u => !ausnahmeFuer(p.id, u, 'ruecktritt'));
  const vorbei = D(p.frist) < new Date();
  const abgegeben = p.mit_upload ? studis.filter(s => abgabeVon(p.id, s)).length : (vorbei ? studis.length : 0);
  const bewertet = studis.filter(s => noteVon(p.id, s)).length;
  const frei = studis.filter(s => noteVon(p.id, s)?.freigegeben_am).length;
  return { studis: studis.length, abgegeben, bewertet, frei, vorbei };
}
function offeneKorrekturen(uid) {
  return pruefungenVon(kurseVon(uid).map(k => k.id)).reduce((n, p) => {
    const s = korrekturStand(p);
    return n + (s.vorbei ? s.abgegeben - s.bewertet : 0);
  }, 0);
}

// ---------- Lehrende: Übersicht ----------
function lUebersicht() {
  const u = ich(), kurse = kurseVon(u.id).map(k => k.id), jetzt = new Date();
  const naechste = termineVon(kurse, u.id).filter(t => D(t.ende) > jetzt).slice(0, 5);
  const korr = pruefungenVon(kurse).map(p => ({ p, s: korrekturStand(p) })).filter(x => x.s.vorbei && x.s.frei < x.s.abgegeben);
  const gesendet = db.mitteilung.filter(m => m.absender_id === u.id).sort((a, b) => D(b.erstellt_am) - D(a.erstellt_am)).slice(0, 4);
  return `${kopfzeile(`${gruss()}, ${esc(name(u))}`, `${fmtLang(jetzt)} · ${plural(kurse.length, 'Modul', 'Module')} im ${esc(aktSem().bezeichnung)}`)}
  <div class="raster raster-2">
    <section class="karte"><div class="zeile dazwischen"><h2>Nächste Vorlesungen</h2><a class="klein" href="#/stundenplan">Stundenplan</a></div>
      <ul class="liste">${naechste.map(t => `<li class="zeile dazwischen"><span><b>${esc(kursName(t.kurs_id))}</b>${t.vertretung_id === u.id ? ' <span class="marke-klein m-warn">du vertrittst</span>' : ''}<br><span class="klein leise">${fmtDatum(t.beginn)}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} · ${esc(raumName(t))} · ${esc(byId('studiengruppe', byId('kurs', t.kurs_id).gruppe_id).name)}</span></span>
        <span class="zeile" style="gap:6px">${konferenzKnopf(t)}${t.status === 'ausgefallen' ? '<span class="marke-klein m-fehler">fällt aus</span>' : t.status === 'verlegt' ? '<span class="marke-klein m-warn">geändert</span>' : `<button class="knopf klein" data-action="termin-aendern" data-id="${t.id}">Ändern</button>`}</span></li>`).join('') || '<li class="leer">Keine Termine</li>'}</ul></section>
    <section class="karte"><div class="zeile dazwischen"><h2>Offene Korrekturen</h2><a class="klein" href="#/korrektur">Alle</a></div>
      <ul class="liste">${korr.map(({ p, s }) => `<li><a href="#/korrektur/${p.id}" class="zeile dazwischen" style="color:var(--text);text-decoration:none"><span><b>${esc(kursName(p.kurs_id))}</b><br><span class="klein leise">${esc(p.art)} · Frist ${fmtDatum(p.frist)}</span></span>
        <span class="marke-klein ${s.bewertet < s.abgegeben ? 'm-warn' : 'm-info'}">${s.bewertet < s.abgegeben ? `${s.bewertet} von ${s.abgegeben} bewertet` : `${s.bewertet - s.frei} bereit zur Freigabe`}</span></a></li>`).join('') || '<li class="leer">Nichts offen</li>'}</ul></section>
    <section class="karte"><h2>Zuletzt von dir gesendet</h2><ul class="liste">${gesendet.map(m => `<li><b>${esc(m.titel)}</b><br><span class="klein leise">${relZeit(m.erstellt_am)} · ${zustellStatistik(m.id)}</span></li>`).join('') || '<li class="leer">Noch nichts gesendet</li>'}</ul></section>
    <section class="karte"><h2>So funktioniert es</h2><ul style="padding-left:18px;margin:0" class="klein">
      <li>Änderst du einen Termin, bekommt die Gruppe automatisch eine Mitteilung, je nach Einstellung auch per Push und E-Mail.</li>
      <li>Noten, die du einträgst, sind erst sichtbar, wenn du sie freigibst. So kannst du in Ruhe korrigieren.</li>
      <li>Nach deiner Freigabe bestätigt das Prüfungsamt die Noten endgültig.</li></ul></section>
  </div>`;
}
function zustellStatistik(mid) {
  const z = db.zustellung.filter(x => x.mitteilung_id === mid);
  const c = z.filter(x => x.kanal === 'campus');
  return `${c.length} Empfänger · ${c.filter(x => x.gelesen_am).length} gelesen · ${z.filter(x => x.kanal === 'push').length}× Push · ${z.filter(x => x.kanal === 'email').length}× E-Mail`;
}

// ---------- Lehrende: Meine Module ----------
function lKurse() {
  const u = ich();
  return `${kopfzeile('Meine Module', esc(aktSem().bezeichnung))}
  <div class="raster raster-2">${kurseVon(u.id).map(k => {
    const m = modulVon(k), g = byId('studiengruppe', k.gruppe_id), p = db.pruefung.filter(x => x.kurs_id === k.id);
    const nt = termineVon([k.id]).find(t => D(t.ende) > new Date() && t.status !== 'ausgefallen');
    return `<a class="karte modul-karte" href="#/kurse/${k.id}"><div class="zeile oben"><span class="kuerzel" style="background:${farbeVon(k.id)}">${esc(m.kuerzel)}</span>
      <div><h3 style="margin:0">${esc(m.titel)}</h3><p class="klein leise" style="margin:0">${esc(g.name)} · ${plural(studisVon(k.id).length, 'Person', 'Personen')} · ${ectsText(m)}</p></div></div>
      <p class="klein abstand" style="margin-bottom:0">${nt ? `Nächster Termin: ${fmtDatum(nt.beginn)}, ${fmtZeit(nt.beginn)} · ${esc(raumName(nt))}` : 'Keine weiteren Termine'}<br>
      <span class="leise">${p.map(x => `${esc(x.art)} bis ${fmtDatum(x.frist)}`).join(' · ') || 'Keine Prüfung angelegt'}</span></p></a>`;
  }).join('')}</div>`;
}
function lKurs(kid, tab) {
  const u = ich(), k = byId('kurs', kid);
  if (!k || !kurseVon(u.id).some(x => x.id === kid)) throw new Error('kein Zugriff');
  const m = modulVon(k), g = byId('studiengruppe', k.gruppe_id);
  const reiter = [['termine', 'Termine'], ['materialien', 'Materialien'], ['pruefungen', 'Prüfungen'], ['mitteilung', 'Mitteilung an die Gruppe']];
  const inhalt = {
    termine: () => `${terminFormular(kid)}<section class="karte"><p class="leise">Legst du einen Termin an oder änderst ihn, bekommt ${esc(g.name)} automatisch eine Mitteilung.</p><div class="tabelle-huelle"><table>
      <thead><tr><th>Datum</th><th>Zeit</th><th>Ort</th><th>Status</th><th></th></tr></thead><tbody>
      ${termineVon([kid]).map(t => { const vorbei = D(t.ende) < new Date(); return `<tr style="${vorbei ? 'opacity:.5' : ''}"><td>${fmtDatum(t.beginn)}</td><td>${fmtZeit(t.beginn)}–${fmtZeit(t.ende)}</td><td>${esc(raumName(t))}</td>
        <td>${t.status === 'ausgefallen' ? '<span class="marke-klein m-fehler">fällt aus</span>' : t.status === 'verlegt' ? '<span class="marke-klein m-warn">geändert</span>' : '<span class="klein leise">geplant</span>'} <span class="klein leise">${esc(t.hinweis || '')}</span></td>
        <td style="text-align:right;white-space:nowrap">${vorbei ? '' : `${konferenzKnopf(t)} <button class="knopf klein" data-action="termin-aendern" data-id="${t.id}">${I('stift')} Ändern</button>`}</td></tr>`; }).join('')}
      </tbody></table></div></section>`,
    materialien: () => `<section class="karte"><h2>Material hochladen</h2>
      <form data-form="material" data-kid="${kid}" class="raster raster-2" style="align-items:end">
        <label class="feld" style="margin:0"><span>Datei</span><input type="file" name="datei" required></label>
        <label class="feld" style="margin:0"><span>Titel</span><input name="titel" placeholder="z. B. Folien 3: Preispolitik" required></label>
        <label class="feld" style="margin:0"><span>Sichtbar ab</span><input type="datetime-local" name="ab" value="${lokal(new Date())}"></label>
        <label class="haken" style="margin-bottom:10px"><input type="checkbox" name="melden" checked> Gruppe benachrichtigen</label>
        <div><button class="knopf primaer">${I('upload')} Hochladen</button></div>
      </form></section>${materialListe(kid, true)}`,
    pruefungen: () => `${db.pruefung.filter(p => p.kurs_id === kid).map(p => { const s = korrekturStand(p); return `<section class="karte"><div class="zeile dazwischen" style="flex-wrap:wrap;gap:8px">
        <div><h3 style="margin:0">${esc(p.titel)}</h3><p class="klein leise" style="margin:0">${esc(p.art)} · ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr · ${p.mit_upload ? `Upload ${esc(p.formate)}, bis ${mb(p)}` : 'ohne Upload'}${p.gruppenarbeit ? ' · Gruppenarbeit' : ''}</p></div>
        <a class="knopf klein" href="#/korrektur/${p.id}">Korrektur · ${s.abgegeben}/${s.studis} abgegeben</a></div></section>`; }).join('')}
      <section class="karte"><h2>Prüfung anlegen</h2>
      <form data-form="pruefung" data-kid="${kid}"><div class="raster raster-2">
        <label class="feld"><span>Art</span><select name="art">${['Hausarbeit', 'Klausur', 'Projekt', 'Referat', 'PTP'].map(a => `<option>${a}</option>`).join('')}</select></label>
        <label class="feld"><span>Titel</span><input name="titel" required placeholder="z. B. Hausarbeit: Preisstrategie"></label>
        <label class="feld"><span>Frist bzw. Termin</span><input type="datetime-local" name="frist" required></label>
        <label class="feld"><span>Erlaubte Formate</span><input name="formate" value="pdf"></label>
        <label class="feld"><span>Maximale Dateigröße (MB)</span><input type="number" name="max_mb" value="100" min="1" max="2000"></label>
        <div><label class="haken"><input type="checkbox" name="mit_upload" checked> Abgabe per Upload</label><label class="haken" style="margin-top:8px"><input type="checkbox" name="gruppenarbeit"> Gruppenarbeit</label></div>
      </div><button class="knopf primaer">Prüfung anlegen</button></form></section>`,
    mitteilung: () => `<section class="karte"><h2>Mitteilung an ${esc(g.name)}</h2>
      <form data-form="lmitteilung" data-kid="${kid}">
        <label class="feld"><span>Betreff</span><input name="titel" required placeholder="z. B. Bitte Laptop mitbringen"></label>
        <label class="feld"><span>Text</span><textarea name="text" required></textarea></label>
        <button class="knopf primaer">${I('megafon')} Senden</button>
        <p class="klein leise abstand" style="margin-bottom:0">Zugestellt wird im Campus und je nach Einstellung der Studierenden zusätzlich per Push oder E-Mail.</p>
      </form></section>`,
  }[tab];
  if (!inhalt) throw new Error('unbekannter Reiter');
  return `<a class="klein zeile" href="#/kurse" style="gap:4px;margin-bottom:10px">${I('zurueck')} Meine Module</a>
    <div class="zeile oben"><span class="kuerzel" style="background:${farbeVon(kid)};width:52px;height:52px">${esc(m.kuerzel)}</span>
    <div><h1>${esc(m.titel)}</h1><p class="leise" style="margin:0">${esc(g.name)} · ${plural(studisVon(kid).length, 'Person', 'Personen')} · ${ectsText(m)}</p></div></div>
    <nav class="reiter">${reiter.map(([k2, t2]) => `<a href="#/kurse/${kid}/${k2}" ${tab === k2 ? 'aria-current="page"' : ''}>${t2}</a>`).join('')}</nav>${inhalt()}`;
}
const lokal = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

AKTIONEN['termin-aendern'] = el => {
  const t = byId('termin', Number(el.dataset.id));
  dialog(`<form data-form="termin" data-id="${t.id}"><div class="dialog-inhalt"><h2>Termin ändern</h2>
    <p class="leise">${esc(kursName(t.kurs_id))} · ${fmtLang(D(t.beginn))}, ${fmtZeit(t.beginn)} Uhr</p>
    <label class="feld"><span>Was ändert sich?</span><select name="status">
      <option value="verlegt">Raum oder Zeit ändert sich</option><option value="ausgefallen">Termin fällt aus</option></select></label>
    <div class="raster raster-2" style="gap:12px">
      <label class="feld"><span>Raum</span><select name="raum"><option value="">Online</option>${db.raum.map(r => `<option value="${r.id}" ${r.id === t.raum_id ? 'selected' : ''}>${esc(r.bezeichnung)} (${r.plaetze} Plätze)</option>`).join('')}</select></label>
      <label class="feld"><span>Datum</span><input type="date" name="datum" value="${lokal(t.beginn).slice(0, 10)}"></label>
      <label class="feld"><span>Beginn</span><input type="time" name="von" value="${fmtZeit(t.beginn)}"></label>
      <label class="feld"><span>Ende</span><input type="time" name="bis" value="${fmtZeit(t.ende)}"></label>
    </div>
    <label class="feld"><span>Grund (erscheint in der Mitteilung)</span><input name="grund" placeholder="z. B. Beamer defekt"></label>
    <div class="hinweis">${I('megafon')}<div class="klein">${esc(byId('studiengruppe', byId('kurs', t.kurs_id).gruppe_id).name)} bekommt sofort eine Mitteilung. Wer es eingestellt hat, zusätzlich per Push und E-Mail.</div></div>
    </div><div class="dialog-fuss"><button type="button" class="knopf" data-action="dialog-zu">Abbrechen</button><button class="knopf primaer">Ändern und benachrichtigen</button></div></form>`);
};
FORMULARE.termin = (f, fd) => {
  const u = ich(), t = byId('termin', Number(f.dataset.id));
  const vorher = { raum: raumName(t), beginn: t.beginn, ende: t.ende, raum_id: t.raum_id, art: t.art, online_link: t.online_link };
  const status = fd.get('status'), grund = String(fd.get('grund') || '').trim();
  let hinweis;
  if (status === 'ausgefallen') {
    t.status = 'ausgefallen';
    hinweis = 'Fällt aus' + (grund ? ': ' + grund : '');
  } else {
    const datum = fd.get('datum');
    t.beginn = new Date(`${datum}T${fd.get('von')}`).toISOString();
    t.ende = new Date(`${datum}T${fd.get('bis')}`).toISOString();
    t.raum_id = fd.get('raum') ? Number(fd.get('raum')) : null;
    t.art = t.raum_id ? (t.art === 'Online' ? 'Vorlesung' : t.art) : 'Online';
    t.online_link = t.raum_id ? null : 'https://meet.example/' + byId('modul', byId('kurs', t.kurs_id).modul_id).kuerzel.toLowerCase();
    const konflikt = raumKonflikt(t.raum_id, t.beginn, t.ende, t.id);
    if (konflikt && !confirm(`${raumName(t)} ist zu dieser Zeit schon belegt: ${kursName(konflikt.kurs_id)}, ${fmtZeit(konflikt.beginn)}–${fmtZeit(konflikt.ende)} Uhr. Trotzdem speichern?`)) {
      Object.assign(t, { beginn: vorher.beginn, ende: vorher.ende, raum_id: vorher.raum_id, art: vorher.art, online_link: vorher.online_link });
      return;
    }
    t.status = 'verlegt';
    const teile = [];
    if (raumName(t) !== vorher.raum) teile.push(`Raum geändert: statt ${vorher.raum} jetzt ${raumName(t)}`);
    if (t.beginn !== vorher.beginn || t.ende !== vorher.ende) teile.push(`neue Zeit: ${fmtDatum(t.beginn)}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} Uhr`);
    if (!teile.length) { toast('Nichts geändert'); return; }
    hinweis = teile.join(', ') + (grund ? '. Grund: ' + grund : '');
  }
  t.hinweis = hinweis;
  const z = sende({ absender: u.id, anlass: 'aenderung', titel: `${status === 'ausgefallen' ? 'Ausfall' : 'Änderung'}: ${kursName(t.kurs_id)} am ${fmtDatum(vorher.beginn)}`, text: hinweis, kurs_id: t.kurs_id, termin_id: t.id, empfaenger: studisVon(t.kurs_id) });
  speichern(); dialogZu(); render();
  toast('Termin geändert, Gruppe benachrichtigt', zustellText(z));
};
FORMULARE.material = async (f, fd) => {
  const u = ich(), kid = Number(f.dataset.kid), datei = fd.get('datei');
  const jetzt = new Date().toISOString(), ab = fd.get('ab') ? new Date(fd.get('ab')).toISOString() : jetzt;
  const d = { id: 'd' + (db.datei.length + 1) + '-' + Date.now(), dateiname: datei.name, mime_typ: datei.type || 'application/octet-stream', groesse_bytes: datei.size, sha256: (await sha256(datei)) || pseudoHash(datei.name + jetzt), hochgeladen_von: u.id, hochgeladen_am: jetzt };
  d.ohne_inhalt = !(datei.size <= MAX_GESPEICHERT && await inhaltSpeichern(d.id, datei, null));
  db.datei.push(d);
  const mat = { id: nextId('material'), kurs_id: kid, datei_id: d.id, titel: fd.get('titel'), sichtbar_ab: ab, text_status: 'wird ausgelesen' };
  db.material.push(mat);
  materialAuslesen(mat, datei);
  let info = D(ab) > new Date() ? `sichtbar ab ${fmtDatum(ab)}, ${fmtZeit(ab)} Uhr` : 'sofort sichtbar';
  if (fd.get('melden') && D(ab) <= new Date()) {
    const z = sende({ absender: u.id, anlass: 'material', titel: `Neues Material in ${kursName(kid)}`, text: `${fd.get('titel')} ist online.`, kurs_id: kid, empfaenger: studisVon(kid) });
    info += ' · ' + zustellText(z);
  }
  speichern(); render(); toast('Material hochgeladen', info);
};
// Liest den Text aus und legt ihn als Abschnitte (MATERIAL_ABSCHNITT) für den Assistenten ab
async function materialAuslesen(mat, datei) {
  try {
    const seiten = await textAuslesen(datei);
    let n = 0;
    seiten.forEach(sei => zerlegeInAbschnitte(sei.text).forEach(text => { db.abschnitt.push({ id: nextId('abschnitt'), material_id: mat.id, seite: sei.seite, text }); n++; }));
    mat.text_status = 'ausgelesen';
    toast('Für den Assistenten ausgelesen', `${mat.titel}: ${plural(n, 'Abschnitt', 'Abschnitte')} aus ${plural(seiten.length, 'Seite', 'Seiten')}`);
  } catch (e) {
    mat.text_status = e.message || 'Auslesen fehlgeschlagen';
  }
  speichern(); render();
}
FORMULARE.pruefung = (f, fd) => {
  const kid = Number(f.dataset.kid), mit = !!fd.get('mit_upload');
  db.pruefung.push({ id: nextId('pruefung'), kurs_id: kid, art: fd.get('art'), titel: fd.get('titel'), frist: new Date(fd.get('frist')).toISOString(), mit_upload: mit, gruppenarbeit: !!fd.get('gruppenarbeit'), max_mb: mit ? Number(fd.get('max_mb')) : 0, formate: mit ? String(fd.get('formate')).toLowerCase() : '', gewicht: 1 });
  speichern(); render(); toast('Prüfung angelegt', 'Sie erscheint sofort im Stundenplan und in der Modulseite der Studierenden.');
};
FORMULARE.lmitteilung = (f, fd) => {
  const kid = Number(f.dataset.kid);
  const z = sende({ absender: ich().id, anlass: 'neuigkeit', titel: `${kursName(kid)}: ${fd.get('titel')}`, text: fd.get('text'), kurs_id: kid, empfaenger: studisVon(kid) });
  f.reset(); toast('Mitteilung gesendet', zustellText(z));
};

// ---------- Lehrende: Korrektur ----------
function lKorrekturen() {
  const u = ich(), ps = pruefungenVon(kurseVon(u.id).map(k => k.id));
  return `${kopfzeile('Korrektur', 'Abgaben sichten, bewerten und Noten freigeben.')}
  <section class="karte"><div class="tabelle-huelle"><table><thead><tr><th>Modul</th><th>Prüfung</th><th>Frist</th><th>Abgegeben</th><th>Bewertet</th><th>Freigegeben</th><th></th></tr></thead><tbody>
  ${ps.map(p => { const s = korrekturStand(p); return `<tr><td class="fett">${esc(kursName(p.kurs_id))}</td><td>${esc(p.art)}</td><td>${fmtDatum(p.frist)} ${s.vorbei ? '' : `<span class="marke-klein ${countdown(p.frist).kl}">${countdown(p.frist).text}</span>`}</td>
    <td>${s.abgegeben} / ${s.studis}</td><td>${s.bewertet}</td><td>${s.frei}</td><td style="text-align:right"><a class="knopf klein" href="#/korrektur/${p.id}">Öffnen</a></td></tr>`; }).join('')}
  </tbody></table></div></section>`;
}
function lKorrektur(pid) {
  const p = byId('pruefung', pid);
  if (!p || !kurseVon(ich().id).some(k => k.id === p.kurs_id)) throw new Error('kein Zugriff');
  const s = korrekturStand(p), studis = studisVon(p.kurs_id).map(x => byId('user', x));
  const bereit = studis.filter(x => { const n = noteVon(pid, x.id); return n && !n.freigegeben_am; }).length;
  return `<a class="klein zeile" href="#/korrektur" style="gap:4px;margin-bottom:10px">${I('zurueck')} Korrektur</a>
  ${kopfzeile(esc(p.titel), `${esc(kursName(p.kurs_id))} · ${esc(p.art)} · Frist ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr`)}
  <div class="zeile" style="flex-wrap:wrap;margin-bottom:16px">
    <span class="marke-klein">${s.abgegeben} von ${s.studis} abgegeben</span><span class="marke-klein m-info">${s.bewertet} bewertet</span><span class="marke-klein m-gut">${s.frei} freigegeben</span>
    <span style="flex:1"></span>
    ${p.mit_upload ? `<button class="knopf" data-action="zip" data-pid="${pid}" ${s.abgegeben ? '' : 'disabled'}>${I('download')} Alle Dateien als ZIP</button>` : ''}
    <button class="knopf primaer" data-action="freigeben" data-pid="${pid}" ${bereit ? '' : 'disabled'}>${I('check')} ${bereit ? `${plural(bereit, 'Note', 'Noten')} freigeben` : 'Nichts freizugeben'}</button>
  </div>
  ${!s.vorbei ? `<div class="hinweis" style="margin-bottom:16px">${I('uhr')}<div>Die Frist läuft noch (${countdown(p.frist).text}). Bis dahin können Studierende neue Versionen hochladen. <b>Bewerten ist ab ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr möglich</b>, dann steht fest, welche Version zählt.</div></div>` : ''}
  <section class="karte"><div class="tabelle-huelle"><table><thead><tr><th>Name</th><th>Abgabe</th><th>Zählende Version</th><th>Note</th><th></th></tr></thead><tbody>
  ${studis.map(x => {
    const a = p.mit_upload ? abgabeVon(pid, x.id) : null, n = noteVon(pid, x.id);
    const v = a ? zaehlendeVersion(a.id) : null, d = v ? byId('datei', v.datei_id) : null;
    const abgabeTxt = rt ? '<span class="marke-klein m-info">entschuldigt (Attest)</span>' : (fx !== p.frist ? `<span class="marke-klein m-warn">Frist bis ${fmtDatum(fx)}</span><br>` : '') + (!p.mit_upload ? '<span class="klein leise">Klausur</span>' : a ? (a.verspaetet ? '<span class="marke-klein m-fehler">verspätet</span>' : '<span class="marke-klein m-gut">pünktlich</span>') + (mitgliederVon(a.id).length > 1 ? `<br><span class="klein leise">Gruppe: ${mitgliederVon(a.id).map(y => esc(byId('user', y).vorname)).join(', ')}</span>` : '') : D(fx) < new Date() ? '<span class="marke-klein m-fehler">fehlt</span>' : '<span class="klein leise">noch nicht</span>');
    // Regel: bewertet wird erst nach der Frist, dann stehen alle Versionen fest
    const rt = ausnahmeFuer(pid, x.id, 'ruecktritt'), fx = fristFuer(p, x.id);
    const kannBewerten = !rt && D(fx) < new Date() && (p.mit_upload ? !!a : true) && !(n && n.freigegeben_am);
    return `<tr><td><b>${esc(name(x))}</b><br><span class="klein leise">${esc(x.matrikelnummer)}</span></td><td>${abgabeTxt}</td>
      <td>${d ? `<a href="#" data-action="datei-laden" data-id="${d.id}">${esc(d.dateiname)}</a><br><span class="klein leise">V${v.nummer} · ${bytes(d.groesse_bytes)} · ${fmtDatum(v.hochgeladen_am)}, ${fmtZeit(v.hochgeladen_am)}</span>` : '<span class="leise">–</span>'}</td>
      <td>${n ? `<span class="note">${noteFmt(n.wert)}</span> <span class="marke-klein ${n.bestaetigt_am ? 'm-gut' : n.freigegeben_am ? 'm-info' : 'm-warn'}">${n.bestaetigt_am ? 'endgültig' : n.freigegeben_am ? 'freigegeben' : 'Entwurf'}</span>` : '<span class="leise">–</span>'}</td>
      <td style="text-align:right">${kannBewerten ? `<button class="knopf klein" data-action="bewerten" data-pid="${pid}" data-uid="${x.id}">${I('stift')} ${n ? 'Ändern' : 'Bewerten'}</button>` : n && n.freigegeben_am ? '<span class="klein leise">Änderung nur über das Prüfungsamt</span>' : ''}</td></tr>`;
  }).join('')}
  </tbody></table></div></section>`;
}
const NOTENSTUFEN = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0];
AKTIONEN.bewerten = el => {
  const pid = Number(el.dataset.pid), uid = el.dataset.uid, p = byId('pruefung', pid), x = byId('user', uid), n = noteVon(pid, uid);
  const a = p.mit_upload ? abgabeVon(pid, uid) : null;
  dialog(`<form data-form="note" data-pid="${pid}" data-uid="${uid}"><div class="dialog-inhalt"><h2>${esc(name(x))} bewerten</h2>
    <p class="leise">${esc(p.titel)}</p>
    ${a ? `<div class="hinweis" style="margin-bottom:14px">${I('datei')}<div class="klein">Zählende Version: <b>${esc(byId('datei', zaehlendeVersion(a.id).datei_id).dateiname)}</b> (V${zaehlendeVersion(a.id).nummer} von ${versionenVon(a.id).length})${a.verspaetet ? ' · <b>verspätet</b>' : ''}<br>Erklärung zur Eigenständigkeit abgegeben am ${fmtDatum(a.erklaerung_am)}, ${fmtZeit(a.erklaerung_am)} Uhr</div></div>` : ''}
    <label class="feld"><span>Note</span><select name="wert">${NOTENSTUFEN.map(w => `<option value="${w}" ${n && n.wert === w ? 'selected' : ''}>${noteFmt(w)}${w === 5 ? ' (nicht bestanden)' : ''}</option>`).join('')}</select></label>
    <label class="feld"><span>Feedback für ${esc(x.vorname)}</span><textarea name="feedback" placeholder="Was war gut, was fehlt zur besseren Note?">${esc(n?.feedback === 'Bewertung im Entwurf.' ? '' : n?.feedback || '')}</textarea></label>
    <p class="klein leise" style="margin:0">Die Note bleibt unsichtbar, bis du sie freigibst.</p>
    </div><div class="dialog-fuss"><button type="button" class="knopf" data-action="dialog-zu">Abbrechen</button><button class="knopf primaer">Als Entwurf speichern</button></div></form>`);
};
FORMULARE.note = (f, fd) => {
  const pid = Number(f.dataset.pid), uid = f.dataset.uid, p = byId('pruefung', pid);
  const a = p.mit_upload ? abgabeVon(pid, uid) : null;
  let n = noteVon(pid, uid);
  if (!n) { n = { id: nextId('note'), pruefung_id: pid, student_id: uid, abgabe_id: a ? a.id : null, freigegeben_am: null, bestaetigt_am: null }; db.note.push(n); }
  Object.assign(n, { wert: Number(fd.get('wert')), feedback: String(fd.get('feedback') || '').trim(), bewertet_von: ich().id });
  if (a && mitgliederVon(a.id).every(s => noteVon(pid, s))) a.status = 'bewertet';
  speichern(); dialogZu(); render(); toast('Bewertung gespeichert', 'Noch nicht sichtbar für Studierende');
};
AKTIONEN.freigeben = el => {
  const pid = Number(el.dataset.pid), p = byId('pruefung', pid);
  const offen = db.note.filter(n => n.pruefung_id === pid && !n.freigegeben_am);
  if (!offen.length || !confirm(`${plural(offen.length, 'Note', 'Noten')} freigeben? Danach sehen die Studierenden sie und bekommen eine Mitteilung. Ändern geht dann nur noch über das Prüfungsamt.`)) return;
  const jetzt = new Date().toISOString();
  offen.forEach(n => { n.freigegeben_am = jetzt; });
  // Eine Mitteilung an alle Betroffenen; der Text nennt keine Note
  const z = sende({ absender: ich().id, anlass: 'note', titel: `Note freigegeben: ${kursName(p.kurs_id)}`, text: `Für „${p.titel}“ liegt deine Note vor. Du siehst sie nach der Anmeldung unter Ergebnis.`, kurs_id: p.kurs_id, pruefung_id: pid, empfaenger: offen.map(n => n.student_id) });
  speichern(); render(); toast(`${plural(offen.length, 'Note', 'Noten')} freigegeben`, zustellText(z));
};

// ---------- Verwaltung ----------
function raumKonflikte() {
  const ts = db.termin.filter(t => t.raum_id && t.status !== 'ausgefallen');
  const k = [];
  ts.forEach((a, i) => ts.slice(i + 1).forEach(b => { if (a.raum_id === b.raum_id && D(a.beginn) < D(b.ende) && D(b.beginn) < D(a.ende)) k.push([a, b]); }));
  return k;
}
function vUebersicht() {
  const u = ich(), jetzt = new Date();
  const studis = db.user.filter(x => x.rolle === 'studierend' && x.aktiv).length;
  const offen = db.note.filter(n => n.freigegeben_am && !n.bestaetigt_am).length;
  const konflikte = raumKonflikte().length;
  const woche = db.mitteilung.filter(m => (jetzt - D(m.erstellt_am)) < 7 * 864e5).length;
  const karte = (zahl, text, link, kl = '') => `<a class="karte modul-karte" href="${link}"><p class="gross-zahl ${kl}" style="margin:0">${zahl}</p><p class="leise" style="margin:4px 0 0">${text}</p></a>`;
  const protokoll = db.zustellung.filter(z => z.kanal !== 'campus').sort((a, b) => D(b.gesendet_am) - D(a.gesendet_am)).slice(0, 10);
  return `${kopfzeile(`${gruss()}, ${esc(u.vorname)}`, `${fmtLang(jetzt)} · ${esc(aktSem().bezeichnung)}`)}
  <div class="raster" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    ${karte(studis, 'Studierende aktiv', '#/personen?rolle=studierend')}
    ${karte(db.kurs.length, 'Kurse im Semester', '#/gruppen')}
    ${karte(offen, 'Noten warten auf Bestätigung', '#/pruefungsamt', offen ? '' : 'leise')}
    ${karte(konflikte, konflikte ? 'Raumkonflikte' : 'Keine Raumkonflikte', '#/planung', konflikte ? '' : 'leise')}
    ${karte(woche, 'Mitteilungen in 7 Tagen', '#/nachrichten')}
  </div>
  <section class="karte abstand"><h2>Zustellprotokoll E-Mail und Push</h2><p class="klein leise">Nachweis, wer wann über welchen Kanal benachrichtigt wurde. Im Prototyp simuliert.</p>
    <div class="tabelle-huelle"><table><thead><tr><th>Zeit</th><th>Empfänger</th><th>Kanal</th><th>Mitteilung</th></tr></thead><tbody>
    ${protokoll.map(z => { const m = byId('mitteilung', z.mitteilung_id); return `<tr><td class="klein">${relZeit(z.gesendet_am)}</td><td>${esc(name(byId('user', z.empfaenger_id)))}</td><td><span class="marke-klein ${z.kanal === 'push' ? 'm-akzent' : 'm-info'}">${z.kanal === 'push' ? 'Push' : 'E-Mail'}</span></td><td>${esc(m.titel)}</td></tr>`; }).join('') || '<tr><td colspan="4" class="leer">Noch keine Zustellungen per E-Mail oder Push. Ändere als Lehrende einen Termin, dann erscheinen sie hier.</td></tr>'}
    </tbody></table></div></section>`;
}
function vGruppen() {
  const sem = aktSem();
  return `${kopfzeile('Gruppen & Semester')}
  <section class="karte"><h2>Studiengruppen</h2><div class="tabelle-huelle"><table><thead><tr><th>Gruppe</th><th>Studiengang</th><th>Standort</th><th>Mitglieder</th><th>Kurse ${esc(sem.bezeichnung)}</th></tr></thead><tbody>
    ${db.studiengruppe.map(g => `<tr><td class="fett">${esc(g.name)}</td><td>${esc(byId('studiengang', g.studiengang_id).name)} (${esc(byId('studiengang', g.studiengang_id).abschluss)})</td><td>${esc(g.standort)}</td>
      <td>${db.gruppenmitglied.filter(m => m.gruppe_id === g.id && !m.bis).length}</td><td>${db.kurs.filter(k => k.gruppe_id === g.id).map(k => esc(modulVon(k).kuerzel)).join(', ')}</td></tr>`).join('')}
  </tbody></table></div></section>
  <div class="raster raster-2 abstand">
    <section class="karte"><h2>${esc(sem.bezeichnung)}</h2><p>${fmtDatumJ(sem.beginn)} – ${fmtDatumJ(sem.ende)}</p>
      <h3>Vorlesungsfreie Zeiten</h3><ul class="liste">${db.vorlesungsfreie_zeit.map(v => `<li class="zeile dazwischen"><span>${esc(v.bezeichnung)}</span><span class="leise">${fmtDatumJ(v.beginn)} – ${fmtDatumJ(v.ende)}</span></li>`).join('')}</ul></section>
    <section class="karte"><h2>Mitglieder ${esc(db.studiengruppe[0].name)}</h2><ul class="liste">${db.gruppenmitglied.filter(m => m.gruppe_id === 1).map(m => { const x = byId('user', m.user_id); return `<li class="zeile dazwischen"><span>${esc(name(x))} <span class="marke-klein m-akzent">${esc(SCHWERPUNKTE[schwerpunktVon(x.id)] || '')}</span></span><span class="klein leise">seit ${fmtDatumJ(m.von)}</span></li>`; }).join('')}</ul>
      <p class="klein leise abstand" style="margin:0">Die Mitgliedschaft hat ein Von- und Bis-Datum. So lassen sich Gruppenwechsel und Wiederholer abbilden, ohne alte Noten zu verlieren.</p></section>
  </div>`;
}
function vPersonen(q) {
  const f = q.get('rolle') || '';
  const liste = db.user.filter(x => !f || x.rolle === f);
  const fk = (k, t) => `<button data-action="gehe" data-ziel="#/personen${k ? '?rolle=' + k : ''}" aria-pressed="${f === k}">${t}</button>`;
  const rt = { studierend: ['Studierende', 'm-akzent'], lehrend: ['Lehrende', 'm-info'], verwaltung: ['Verwaltung', 'm-warn'] };
  return `${kopfzeile('Personen & Rollen', 'Rechte hängen an der Rolle, nicht an der einzelnen Person.')}
  <section class="karte"><div class="filter" style="padding:0 0 12px">${fk('', 'Alle')}${fk('studierend', 'Studierende')}${fk('lehrend', 'Lehrende')}${fk('verwaltung', 'Verwaltung')}</div>
  <div class="tabelle-huelle"><table><thead><tr><th>Name</th><th>Rolle</th><th>E-Mail</th><th>Zuordnung</th><th>Status</th></tr></thead><tbody>
  ${liste.map(x => `<tr><td class="fett">${esc(name(x))}</td><td><span class="marke-klein ${rt[x.rolle][1]}">${rt[x.rolle][0]}</span></td><td class="klein">${esc(x.email)}</td>
    <td class="klein">${x.rolle === 'studierend' ? esc(gruppeVon(x.id)?.name || '–') + ' · ' + esc(x.matrikelnummer) : x.rolle === 'lehrend' ? kurseVon(x.id).map(k => esc(modulVon(k).kuerzel)).join(', ') : 'Studienbüro'}</td>
    <td><span class="marke-klein m-gut">aktiv</span></td></tr>`).join('')}
  </tbody></table></div></section>`;
}
function vPlanung() {
  const ab = new Date(); ab.setHours(0, 0, 0, 0);
  const bis = new Date(ab); bis.setDate(bis.getDate() + 14);
  const konflikte = raumKonflikte(), inKonflikt = new Set(konflikte.flat().map(t => t.id));
  const liste = db.termin.filter(t => D(t.beginn) >= ab && D(t.beginn) < bis).sort((a, b) => D(a.beginn) - D(b.beginn));
  return `${kopfzeile('Stundenplanung', 'Termine anlegen und ändern. Raumkonflikte prüft das System vor dem Speichern.')}
  ${terminFormular(null)}
  ${konflikte.length ? `<div class="hinweis fehler" style="margin-bottom:16px">${I('warn')}<div><b>${plural(konflikte.length, 'Raumkonflikt', 'Raumkonflikte')}</b><br>${konflikte.map(([a, b]) => `${esc(raumName(a))}, ${fmtDatum(a.beginn)}: ${esc(kursName(a.kurs_id))} und ${esc(kursName(b.kurs_id))}`).join('<br>')}</div></div>` : `<div class="hinweis gut" style="margin-bottom:16px">${I('check')}<div>Keine Raumkonflikte. Das System prüft das bei jeder Änderung automatisch.</div></div>`}
  <section class="karte"><div class="tabelle-huelle"><table><thead><tr><th>Datum</th><th>Zeit</th><th>Modul</th><th>Gruppe</th><th>Raum</th><th>Lehrende</th><th>Status</th><th></th></tr></thead><tbody>
  ${liste.map(t => `<tr style="${inKonflikt.has(t.id) ? 'background:var(--fehler-hell)' : ''}"><td>${fmtDatum(t.beginn)}</td><td>${fmtZeit(t.beginn)}–${fmtZeit(t.ende)}</td><td class="fett">${esc(kursName(t.kurs_id))}</td>
    <td>${esc(byId('studiengruppe', byId('kurs', t.kurs_id).gruppe_id).name)}</td><td>${esc(raumName(t))}</td><td class="klein">${esc(name(t.vertretung_id ? byId('user', t.vertretung_id) : lehrendeVon(t.kurs_id)[0]))}</td>
    <td>${t.status === 'ausgefallen' ? '<span class="marke-klein m-fehler">fällt aus</span>' : t.status === 'verlegt' ? '<span class="marke-klein m-warn">geändert</span>' : t.vertretung_id ? '<span class="marke-klein m-warn">Vertretung</span>' : '<span class="klein leise">geplant</span>'}</td>
    <td style="text-align:right">${t.status === 'ausgefallen' ? '' : `<button class="knopf klein" data-action="termin-aendern" data-id="${t.id}">Ändern</button>`}</td></tr>`).join('')}
  </tbody></table></div></section>`;
}
function vPruefungsamt() {
  const offen = db.note.filter(n => n.freigegeben_am && !n.bestaetigt_am).sort((a, b) => D(a.freigegeben_am) - D(b.freigegeben_am));
  const fertig = db.note.filter(n => n.bestaetigt_am).sort((a, b) => D(b.bestaetigt_am) - D(a.bestaetigt_am)).slice(0, 8);
  const zeile = (n, knopf) => { const p = byId('pruefung', n.pruefung_id), x = byId('user', n.student_id); return `<tr><td class="fett">${esc(name(x))}<br><span class="klein leise">${esc(x.matrikelnummer)}</span></td><td>${esc(kursName(p.kurs_id))}<br><span class="klein leise">${esc(p.art)}</span></td>
    <td class="note">${noteFmt(n.wert)}</td><td class="klein">${esc(name(byId('user', n.bewertet_von)))}<br>${knopf ? 'freigegeben ' + fmtDatumJ(n.freigegeben_am) : 'bestätigt ' + fmtDatumJ(n.bestaetigt_am)}</td>
    <td style="text-align:right">${knopf ? `<button class="knopf klein" data-action="bestaetigen" data-id="${n.id}">${I('check')} Bestätigen</button>` : '<span class="marke-klein m-gut">endgültig</span>'}</td></tr>`; };
  return `${kopfzeile('Prüfungsamt', 'Freigegebene Noten endgültig bestätigen. Erst dann erscheinen sie auf Bescheinigungen.')}
  <section class="karte"><div class="zeile dazwischen"><h2>Warten auf Bestätigung (${offen.length})</h2>${offen.length ? '<button class="knopf primaer klein" data-action="bestaetigen" data-id="alle">Alle bestätigen</button>' : ''}</div>
    <div class="tabelle-huelle"><table><thead><tr><th>Person</th><th>Modul</th><th>Note</th><th>Bewertet von</th><th></th></tr></thead><tbody>${offen.map(n => zeile(n, true)).join('') || '<tr><td colspan="5" class="leer">Alles bestätigt</td></tr>'}</tbody></table></div></section>
  <section class="karte"><h2>Zuletzt bestätigt</h2><div class="tabelle-huelle"><table><tbody>${fertig.map(n => zeile(n, false)).join('')}</tbody></table></div></section>`;
}
AKTIONEN.bestaetigen = el => {
  const jetzt = new Date().toISOString();
  const liste = el.dataset.id === 'alle' ? db.note.filter(n => n.freigegeben_am && !n.bestaetigt_am) : [byId('note', Number(el.dataset.id))];
  liste.forEach(n => { n.bestaetigt_am = jetzt; });
  speichern(); render(); toast(`${plural(liste.length, 'Note', 'Noten')} endgültig bestätigt`, 'Die Studierenden sehen jetzt „endgültig“ statt „vorläufig“.');
};
function vNachrichten() {
  const gesendet = db.mitteilung.slice().sort((a, b) => D(b.erstellt_am) - D(a.erstellt_am)).slice(0, 12);
  return `${kopfzeile('Mitteilungen', 'Neuigkeiten an alle oder an einzelne Gruppen senden.')}
  <div class="raster raster-2">
  <section class="karte"><h2>Neue Mitteilung</h2><form data-form="vmitteilung">
    <label class="feld"><span>An</span><select name="an"><option value="studis">Alle Studierenden</option>${db.studiengruppe.map(g => `<option value="g${g.id}">Gruppe ${esc(g.name)}</option>`).join('')}<option value="lehrende">Alle Lehrenden</option><option value="alle">Alle</option></select></label>
    <label class="feld"><span>Betreff</span><input name="titel" required placeholder="z. B. Campus am Samstag geschlossen"></label>
    <label class="feld"><span>Text</span><textarea name="text" required></textarea></label>
    <label class="haken" style="margin-bottom:14px"><input type="checkbox" name="wichtig"><span>Wichtig: auch per E-Mail an alle, die E-Mails abbestellt haben<br><span class="klein leise">Nur für Pflichtinformationen wie Schließungen oder Fristen der Prüfungsordnung.</span></span></label>
    <button class="knopf primaer">${I('megafon')} Senden</button></form></section>
  <section class="karte"><h2>Gesendet</h2><ul class="liste">${gesendet.map(m => `<li><div class="zeile dazwischen"><b>${esc(m.titel)}</b>${m.wichtig ? '<span class="marke-klein m-fehler">wichtig</span>' : ''}</div><span class="klein leise">${esc(name(m.absender_id ? byId('user', m.absender_id) : null))} · ${relZeit(m.erstellt_am)}<br>${zustellStatistik(m.id)}</span></li>`).join('')}</ul></section>
  </div>`;
}
FORMULARE.vmitteilung = (f, fd) => {
  const an = fd.get('an');
  const empfaenger = an === 'studis' ? db.user.filter(x => x.rolle === 'studierend').map(x => x.id)
    : an === 'lehrende' ? db.user.filter(x => x.rolle === 'lehrend').map(x => x.id)
      : an === 'alle' ? db.user.filter(x => x.id !== ich().id).map(x => x.id)
        : db.gruppenmitglied.filter(m => m.gruppe_id === Number(an.slice(1)) && !m.bis).map(m => m.user_id);
  const z = sende({ absender: ich().id, anlass: 'neuigkeit', titel: fd.get('titel'), text: fd.get('text'), gruppe_id: an.startsWith('g') ? Number(an.slice(1)) : null, empfaenger, wichtig: !!fd.get('wichtig') });
  render(); toast('Mitteilung gesendet', zustellText(z));
};
function vInhalte() {
  const s = db.service;
  return `${kopfzeile('Service-Inhalte', 'Was Studierende unter Service sehen, pflegt das Studienbüro hier selbst, ohne IT.')}
  <div class="raster raster-2">
  <section class="karte"><h2>Häufige Fragen</h2><ul class="liste">${s.faq.map((f, i) => `<li class="zeile dazwischen oben"><span><b>${esc(f.frage)}</b><br><span class="klein leise">${esc(f.antwort)}</span></span><button class="knopf klein gefahr" data-action="faq-loeschen" data-i="${i}" aria-label="Frage löschen">Entfernen</button></li>`).join('')}</ul>
    <form data-form="faq" class="abstand"><label class="feld"><span>Neue Frage</span><input name="frage" required></label><label class="feld"><span>Antwort</span><textarea name="antwort" required></textarea></label><button class="knopf primaer">Hinzufügen</button></form></section>
  <section class="karte"><h2>Ansprechpersonen</h2><ul class="liste">${s.ansprechpersonen.map(a => `<li class="zeile dazwischen oben" style="flex-wrap:wrap"><span style="min-width:0;flex:1 1 220px"><b>${esc(a.name)}</b><br><span class="klein leise">${esc(a.aufgabe)}<br>${esc(a.email)} · ${esc(a.telefon)} · ${esc(a.zeiten)}</span></span>
      <span class="zeile" style="gap:6px"><button class="knopf klein" data-action="kontakt-bearbeiten" data-id="${a.id}">Bearbeiten</button><button class="knopf klein gefahr" data-action="kontakt-loeschen" data-id="${a.id}">Entfernen</button></span></li>`).join('')}</ul>
    <button class="knopf abstand" data-action="kontakt-bearbeiten" data-id="neu">${I('plus')} Ansprechperson hinzufügen</button></section>
  </div>`;
}
FORMULARE.faq = (f, fd) => { db.service.faq.push({ frage: fd.get('frage'), antwort: fd.get('antwort') }); speichern(); render(); toast('Frage hinzugefügt', 'Sofort sichtbar unter Service › Formulare und FAQ'); };
AKTIONEN['faq-loeschen'] = el => { db.service.faq.splice(Number(el.dataset.i), 1); speichern(); render(); toast('Frage entfernt'); };

// ---------- Termine anlegen (Lehrende im eigenen Kurs, Verwaltung für alle Kurse) ----------
function raumKonflikt(raumId, beginn, ende, ohneId = null) {
  if (!raumId) return null;
  return db.termin.find(t => t.id !== ohneId && t.raum_id === raumId && t.status !== 'ausgefallen' && D(t.beginn) < D(ende) && D(beginn) < D(t.ende)) || null;
}
function terminFormular(kid) {
  const kurse = kid ? [byId('kurs', kid)] : db.kurs.filter(k => k.semester_id === aktSem().id);
  const morgen = new Date(); morgen.setDate(morgen.getDate() + 1);
  return `<details class="karte" style="margin-bottom:16px"><summary class="fett" style="cursor:pointer">${I('plus', 'klein-svg')} Neuen Termin anlegen</summary>
    <form data-form="termin-neu" class="abstand"><div class="raster raster-3" style="gap:12px">
      ${kid ? `<input type="hidden" name="kurs" value="${kid}">` : `<label class="feld"><span>Kurs</span><select name="kurs">${kurse.map(k => `<option value="${k.id}">${esc(kursName(k.id))} · ${esc(byId('studiengruppe', k.gruppe_id).name)}</option>`).join('')}</select></label>`}
      <label class="feld"><span>Art</span><select name="art"><option>Vorlesung</option><option>Übung</option><option>Klausur</option><option>Sprechstunde</option></select></label>
      <label class="feld"><span>Raum</span><select name="raum"><option value="">Online</option>${db.raum.map(r => `<option value="${r.id}">${esc(r.bezeichnung)} (${r.plaetze} Plätze)</option>`).join('')}</select></label>
      <label class="feld"><span>Datum</span><input type="date" name="datum" value="${lokal(morgen).slice(0, 10)}" required></label>
      <label class="feld"><span>Beginn</span><input type="time" name="von" value="18:00" required></label>
      <label class="feld"><span>Ende</span><input type="time" name="bis" value="21:15" required></label>
      <label class="feld"><span>Wiederholen</span><select name="wochen"><option value="1">nur einmal</option><option value="2">2 Wochen lang wöchentlich</option><option value="4">4 Wochen lang wöchentlich</option><option value="8">8 Wochen lang wöchentlich</option></select></label>
    </div><button class="knopf primaer">Anlegen und Gruppe benachrichtigen</button></form></details>`;
}
FORMULARE['termin-neu'] = (f, fd) => {
  const u = ich(), kid = Number(fd.get('kurs')), raumId = fd.get('raum') ? Number(fd.get('raum')) : null, art = fd.get('art');
  const neue = [];
  for (let w = 0; w < Number(fd.get('wochen')); w++) {
    const beginn = new Date(`${fd.get('datum')}T${fd.get('von')}`), ende = new Date(`${fd.get('datum')}T${fd.get('bis')}`);
    beginn.setDate(beginn.getDate() + 7 * w); ende.setDate(ende.getDate() + 7 * w);
    if (ende <= beginn) { toast('Das Ende muss nach dem Beginn liegen'); return; }
    neue.push({ beginn: beginn.toISOString(), ende: ende.toISOString() });
  }
  const konflikte = neue.map(t => raumKonflikt(raumId, t.beginn, t.ende)).filter(Boolean);
  if (konflikte.length && !confirm(`Raumkonflikt an ${plural(konflikte.length, 'Termin', 'Terminen')}, zum Beispiel ${fmtDatum(konflikte[0].beginn)} mit ${kursName(konflikte[0].kurs_id)}. Trotzdem anlegen?`)) return;
  neue.forEach(t => db.termin.push({ id: nextId('termin'), kurs_id: kid, raum_id: raumId, vertretung_id: null, beginn: t.beginn, ende: t.ende, art: raumId ? art : 'Online', online_link: raumId ? null : 'https://meet.example/' + modulVon(byId('kurs', kid)).kuerzel.toLowerCase(), status: 'geplant', hinweis: 'Neuer Termin' }));
  const erster = neue[0];
  const text = `${art} ${neue.length > 1 ? `ab ${fmtDatum(erster.beginn)}, ${neue.length}× wöchentlich` : `am ${fmtDatum(erster.beginn)}`}, ${fmtZeit(erster.beginn)}–${fmtZeit(erster.ende)} Uhr, ${raumId ? byId('raum', raumId).bezeichnung : 'online'}.`;
  const z = sende({ absender: u.id, anlass: 'aenderung', titel: `Neuer Termin: ${kursName(kid)}`, text, kurs_id: kid, empfaenger: studisVon(kid) });
  speichern(); render(); toast(neue.length > 1 ? `${neue.length} Termine angelegt` : 'Termin angelegt', zustellText(z));
};

// ---------- ZIP aller zählenden Versionen ----------
AKTIONEN.zip = async el => {
  const p = byId('pruefung', Number(el.dataset.pid));
  const abgaben = db.abgabe.filter(a => a.pruefung_id === p.id);
  const eintraege = [], fehlend = [];
  for (const a of abgaben) {
    const v = zaehlendeVersion(a.id), d = byId('datei', v.datei_id), blob = await inhaltLaden(d.id);
    const namen = mitgliederVon(a.id).map(s => { const x = byId('user', s); return `${x.nachname}_${x.matrikelnummer}`; }).join('+');
    const ordnerName = `${namen}/V${v.nummer}_${d.dateiname}`;
    if (blob) eintraege.push({ name: ordnerName, blob }); else fehlend.push(`${ordnerName} (${bytes(d.groesse_bytes)}, im Prototyp nicht gespeichert)`);
    // Weitere Dateien derselben Version-Runde (z. B. Video zur Gruppenarbeit) mitnehmen
    versionenVon(a.id).filter(x => x.id !== v.id && D(x.hochgeladen_am) <= D(p.frist)).forEach(x => { const dx = byId('datei', x.datei_id); if (dx.ohne_inhalt) fehlend.push(`${namen}/V${x.nummer}_${dx.dateiname} (${bytes(dx.groesse_bytes)}, im Prototyp nicht gespeichert)`); });
  }
  const liste = [`Abgaben: ${p.titel}`, `Modul: ${kursName(p.kurs_id)}`, `Frist: ${fmtDatumJ(p.frist)} ${fmtZeit(p.frist)}`, `Erstellt: ${fmtDatumJ(new Date().toISOString())}`, '', ...abgaben.map(a => { const v = zaehlendeVersion(a.id), d = byId('datei', v.datei_id); return `${mitgliederVon(a.id).map(s => name(byId('user', s))).join(', ')}: V${v.nummer} ${d.dateiname} · ${a.verspaetet ? 'verspätet' : 'pünktlich'} · SHA-256 ${d.sha256}`; }), ...(fehlend.length ? ['', 'Nicht enthalten:', ...fehlend] : [])].join('\r\n');
  eintraege.unshift({ name: '_Uebersicht.txt', blob: new Blob([liste], { type: 'text/plain' }) });
  const zip = await zipErstellen(eintraege);
  herunterladen(`Abgaben_${modulVon(byId('kurs', p.kurs_id)).kuerzel}_${fmtDatumJ(p.frist)}.zip`, zip, 'application/zip');
  toast('ZIP erstellt', `${plural(eintraege.length - 1, 'Datei', 'Dateien')} und eine Übersicht mit Prüfsummen${fehlend.length ? ` · ${fehlend.length} zu groß für den Prototyp` : ''}`);
};

// ---------- Ansprechpersonen pflegen ----------
AKTIONEN['kontakt-bearbeiten'] = el => {
  const a = el.dataset.id === 'neu' ? { id: 'neu', name: '', aufgabe: '', email: '', telefon: '', zeiten: '' } : db.service.ansprechpersonen.find(x => x.id === Number(el.dataset.id));
  const feld = (k, t, typ = 'text') => `<label class="feld"><span>${t}</span><input name="${k}" type="${typ}" value="${esc(a[k])}" ${k === 'name' || k === 'aufgabe' ? 'required' : ''}></label>`;
  dialog(`<form data-form="kontakt" data-id="${a.id}"><div class="dialog-inhalt"><h2>${a.id === 'neu' ? 'Ansprechperson hinzufügen' : 'Ansprechperson bearbeiten'}</h2>
    ${feld('name', 'Name oder Stelle')}${feld('aufgabe', 'Zuständig für')}${feld('email', 'E-Mail', 'email')}${feld('telefon', 'Telefon')}${feld('zeiten', 'Erreichbar')}
    </div><div class="dialog-fuss"><button type="button" class="knopf" data-action="dialog-zu">Abbrechen</button><button class="knopf primaer">Speichern</button></div></form>`);
};
FORMULARE.kontakt = (f, fd) => {
  const daten = Object.fromEntries(['name', 'aufgabe', 'email', 'telefon', 'zeiten'].map(k => [k, String(fd.get(k) || '').trim()]));
  if (f.dataset.id === 'neu') db.service.ansprechpersonen.push({ id: db.service.ansprechpersonen.reduce((m, x) => Math.max(m, x.id), 0) + 1, ...daten });
  else Object.assign(db.service.ansprechpersonen.find(x => x.id === Number(f.dataset.id)), daten);
  speichern(); dialogZu(); render(); toast('Gespeichert', 'Sofort sichtbar unter Service › Ansprechpersonen');
};
AKTIONEN['kontakt-loeschen'] = el => {
  const a = db.service.ansprechpersonen.find(x => x.id === Number(el.dataset.id));
  if (!confirm(`${a.name} entfernen?`)) return;
  db.service.ansprechpersonen = db.service.ansprechpersonen.filter(x => x !== a);
  speichern(); render(); toast('Ansprechperson entfernt');
};
