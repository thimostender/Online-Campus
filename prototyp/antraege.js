'use strict';
// Online-Anträge: Studierende stellen sie mit PDF-Nachweis, das Studienbüro entscheidet.
// Eine Genehmigung wirkt sofort: verschobene Frist, entschuldigte Prüfung, angerechnetes Modul,
// reservierter Schnittplatz oder neue Anschrift. Tabellen: ANTRAG, PRUEFUNG_AUSNAHME, ANERKENNUNG, RAUM_RESERVIERUNG.

const ANTRAGSARTEN = {
  fristverlaengerung: {
    name: 'Antrag auf Fristverlängerung', kurz: 'Fristverlängerung',
    erklaerung: 'Für eine Abgabe mit Upload. Bei Krankheit bitte ein Attest beifügen.',
    felder: [
      { k: 'pruefung', typ: 'pruefung', label: 'Für welche Abgabe?', filter: p => p.mit_upload && D(p.frist) > new Date(Date.now() - 14 * 864e5) },
      { k: 'neue_frist', typ: 'date', label: 'Gewünschte neue Frist' },
      { k: 'begruendung', typ: 'textarea', label: 'Begründung' },
    ],
    anhang: { label: 'Nachweis, zum Beispiel ärztliches Attest', pflicht: false },
    wirkung: 'Die Frist wird nur für dich verschoben. Alle anderen behalten die ursprüngliche Frist.',
  },
  pruefungsunfaehigkeit: {
    name: 'Attest bei Prüfungsunfähigkeit', kurz: 'Prüfungsunfähigkeit',
    erklaerung: 'Wenn du eine Klausur oder Abgabe krankheitsbedingt nicht wahrnehmen kannst. Das Attest ist Pflicht.',
    felder: [
      { k: 'pruefung', typ: 'pruefung', label: 'Welche Prüfung?', filter: p => D(p.frist) > new Date(Date.now() - 7 * 864e5) },
      { k: 'von', typ: 'date', label: 'Krank von' },
      { k: 'bis', typ: 'date', label: 'Krank bis' },
    ],
    anhang: { label: 'Ärztliches Attest', pflicht: true },
    wirkung: 'Du bist von der Prüfung entschuldigt. Sie zählt nicht als Fehlversuch, du legst sie beim nächsten Termin ab.',
  },
  anerkennung: {
    name: 'Antrag auf Anerkennung von Leistungen', kurz: 'Anerkennung',
    erklaerung: 'Für Module, die du an einer anderen Hochschule oder in einer Ausbildung schon erbracht hast.',
    felder: [
      { k: 'modul', typ: 'modul', label: 'Welches Modul soll angerechnet werden?' },
      { k: 'einrichtung', typ: 'text', label: 'Wo wurde die Leistung erbracht?' },
      { k: 'note', typ: 'note', label: 'Note laut Nachweis' },
    ],
    anhang: { label: 'Leistungsnachweis (Zeugnis oder Transcript)', pflicht: true },
    wirkung: 'Das Modul wird mit der nachgewiesenen Note und seinen ECTS angerechnet.',
  },
  schnittplatz: {
    name: 'Reservierung Schnittplatz Medienlabor', kurz: 'Schnittplatz',
    erklaerung: 'Einen der Schnittplätze im Medienlabor 1.12 für die Postproduktion reservieren.',
    felder: [
      { k: 'datum', typ: 'date', label: 'Datum' },
      { k: 'von', typ: 'time', label: 'Von', wert: '10:00' },
      { k: 'bis', typ: 'time', label: 'Bis', wert: '14:00' },
      { k: 'zweck', typ: 'text', label: 'Wofür?', platzhalter: 'z. B. Schnitt Imagefilm Gruppe 1' },
    ],
    anhang: null,
    wirkung: 'Die Reservierung erscheint in deinem Stundenplan.',
  },
  adresse: {
    name: 'Adressänderung', kurz: 'Adressänderung',
    erklaerung: 'Deine Anschrift für Bescheinigungen und Post vom Studienbüro.',
    felder: [
      { k: 'strasse', typ: 'text', label: 'Straße und Hausnummer' },
      { k: 'plz', typ: 'text', label: 'Postleitzahl' },
      { k: 'ort', typ: 'text', label: 'Ort' },
    ],
    anhang: null,
    wirkung: 'Die neue Anschrift erscheint in deinem Profil und auf Bescheinigungen.',
  },
};
const ANTRAG_STATUS = {
  eingereicht: { text: 'Eingereicht', kl: 'm-info' },
  in_bearbeitung: { text: 'In Bearbeitung', kl: 'm-warn' },
  genehmigt: { text: 'Genehmigt', kl: 'm-gut' },
  abgelehnt: { text: 'Abgelehnt', kl: 'm-fehler' },
};
const MAX_ANHANG_MB = 20;

// ---------- Wirkungen, die überall gelten ----------
function ausnahmeFuer(pid, uid, art) { return db.pruefung_ausnahme.find(x => x.pruefung_id === pid && x.student_id === uid && x.art === art); }
function fristFuer(p, uid) {
  if (!uid) return p.frist;
  const a = ausnahmeFuer(p.id, uid, 'frist');
  return a && D(a.neue_frist) > D(p.frist) ? a.neue_frist : p.frist;
}
// Prüfung mit der persönlichen Frist der Person (für Ansichten der Studierenden)
function persPruefung(p, uid) { if (!p) return p; const f = fristFuer(p, uid); return f === p.frist ? p : { ...p, frist: f, frist_original: p.frist }; }
const reservierungenVon = uid => db.raum_reservierung.filter(r => r.user_id === uid);

// ---------- Studierende: Formular ----------
function antragFormular(art) {
  const def = ANTRAGSARTEN[art], u = ich();
  if (!def) throw new Error('unbekannte Antragsart');
  const kurse = kurseVon(u.id).map(k => k.id);
  const feld = f => {
    const lbl = `<span>${esc(f.label)}</span>`;
    if (f.typ === 'pruefung') {
      const ps = pruefungenVon(kurse, u.id).filter(f.filter).filter(p => statusVon(p, u.id).code !== 'bewertet');
      return `<label class="feld">${lbl}<select name="${f.k}" required>${ps.map(p => `<option value="${p.id}">${esc(kursName(p.kurs_id))}: ${esc(p.art)}, ${fmtDatum(p.frist)}</option>`).join('') || '<option value="">Keine passende Prüfung</option>'}</select></label>`;
    }
    if (f.typ === 'modul') {
      const offen = db.modul.filter(m => m.ects && modulStand(m, u.id).text === 'geplant' && (!m.schwerpunkt || m.schwerpunkt === schwerpunktVon(u.id)) && !db.anerkennung.some(a => a.user_id === u.id && a.modul_id === m.id));
      return `<label class="feld">${lbl}<select name="${f.k}" required>${offen.map(m => `<option value="${m.id}">${esc(m.nr)} ${esc(m.titel)} (${m.plansemester}. Semester, ${m.ects} ECTS)</option>`).join('')}</select></label>`;
    }
    if (f.typ === 'note') return `<label class="feld">${lbl}<select name="${f.k}">${NOTENSTUFEN.filter(w => w <= 4).map(w => `<option value="${w}">${noteFmt(w)}</option>`).join('')}</select></label>`;
    if (f.typ === 'textarea') return `<label class="feld" style="grid-column:1/-1">${lbl}<textarea name="${f.k}" required></textarea></label>`;
    const wert = f.wert || (f.typ === 'date' ? lokal(new Date(Date.now() + 7 * 864e5)).slice(0, 10) : '');
    return `<label class="feld">${lbl}<input type="${f.typ}" name="${f.k}" value="${esc(wert)}" placeholder="${esc(f.platzhalter || '')}" required></label>`;
  };
  return `<a class="klein zeile" href="#/service/formulare" style="gap:4px;margin-bottom:10px">${I('zurueck')} Formulare</a>
  ${kopfzeile(esc(def.name), esc(def.erklaerung))}
  <form class="karte" data-form="antrag" data-art="${art}">
    <div class="raster raster-2" style="gap:0 16px">${def.felder.map(feld).join('')}</div>
    ${def.anhang ? `<label class="ablage" style="margin-top:4px">
      <input type="file" name="anhang" accept=".pdf,application/pdf" data-change="anhang-gewaehlt" ${def.anhang.pflicht ? 'required' : ''}>
      <span style="color:var(--akzent)">${I('upload')}</span>
      <p class="fett" style="margin:8px 0 2px">${esc(def.anhang.label)} ${def.anhang.pflicht ? '' : '<span class="leise">(freiwillig)</span>'}</p>
      <p class="klein leise" style="margin:0">PDF bis ${MAX_ANHANG_MB} MB · hierher ziehen oder auswählen</p>
      <div id="anhangwahl" class="abstand"></div></label>` : ''}
    <div class="hinweis abstand">${I('info')}<div class="klein"><b>Was passiert danach?</b> Das Studienbüro prüft deinen Antrag, meist innerhalb von zwei Werktagen. Über die Entscheidung bekommst du eine Mitteilung. ${esc(def.wirkung)}</div></div>
    <label class="haken abstand"><input type="checkbox" required> <span>Ich bestätige, dass meine Angaben stimmen.</span></label>
    <div class="zeile abstand"><button class="knopf primaer">${I('pfeil')} Antrag abschicken</button><a class="knopf" href="#/service/formulare">Abbrechen</a></div>
  </form>`;
}
AENDERUNGEN['anhang-gewaehlt'] = el => {
  const f = el.files[0], box = document.getElementById('anhangwahl');
  if (!f) { box.innerHTML = ''; return; }
  const fehler = !/\.pdf$/i.test(f.name) ? 'Bitte eine PDF-Datei wählen. Fotos vom Attest kannst du zum Beispiel mit der Scan-Funktion deines Handys als PDF speichern.' : f.size > MAX_ANHANG_MB * 1e6 ? `Die Datei ist ${bytes(f.size)} groß, erlaubt sind ${MAX_ANHANG_MB} MB.` : null;
  box.innerHTML = fehler ? `<div class="hinweis fehler" style="text-align:left">${I('warn')}<div>${fehler}</div></div>` : `<span class="marke-klein m-gut">${I('datei')} ${esc(f.name)} · ${bytes(f.size)}</span>`;
};
FORMULARE.antrag = async (f, fd) => {
  const u = ich(), art = f.dataset.art, def = ANTRAGSARTEN[art];
  const daten = Object.fromEntries(def.felder.map(x => [x.k, String(fd.get(x.k) || '').trim()]));
  if (art === 'schnittplatz' && daten.bis <= daten.von) { toast('Das Ende muss nach dem Beginn liegen'); return; }
  if (art === 'pruefungsunfaehigkeit' && daten.bis < daten.von) { toast('„Krank bis“ liegt vor „Krank von“'); return; }
  let datei_id = null;
  const anhang = fd.get('anhang');
  if (anhang && anhang.name) {
    if (!/\.pdf$/i.test(anhang.name) || anhang.size > MAX_ANHANG_MB * 1e6) { toast('Anhang passt nicht', `Nur PDF bis ${MAX_ANHANG_MB} MB`); return; }
    const jetzt = new Date().toISOString();
    const d = { id: 'd' + (db.datei.length + 1) + '-' + Date.now(), dateiname: anhang.name, mime_typ: 'application/pdf', groesse_bytes: anhang.size, sha256: (await sha256(anhang)) || pseudoHash(anhang.name + jetzt), hochgeladen_von: u.id, hochgeladen_am: jetzt };
    d.ohne_inhalt = !(await inhaltSpeichern(d.id, anhang, [u.id, ...db.user.filter(x => x.rolle === 'verwaltung').map(x => x.id)]));
    db.datei.push(d); datei_id = d.id;
  } else if (def.anhang?.pflicht) { toast('Bitte den Nachweis als PDF anhängen'); return; }
  const antrag = { id: nextId('antrag'), antragsteller_id: u.id, art, status: 'eingereicht', daten, datei_id, eingereicht_am: new Date().toISOString(), bearbeitet_von: null, entschieden_am: null, bescheid: '' };
  db.antrag.push(antrag);
  // Das Studienbüro bekommt eine Mitteilung, die Person eine Eingangsbestätigung
  sende({ absender: u.id, anlass: 'neuigkeit', titel: `Neuer Antrag: ${def.kurz}`, text: `${name(u)} hat einen Antrag gestellt (${antragZusammenfassung(antrag)}).`, empfaenger: db.user.filter(x => x.rolle === 'verwaltung').map(x => x.id) });
  sende({ anlass: 'eingang', titel: `Antrag eingegangen: ${def.kurz}`, text: `Dein Antrag ist am ${fmtDatum(antrag.eingereicht_am)} um ${fmtZeit(antrag.eingereicht_am)} Uhr eingegangen. Du bekommst Bescheid, sobald er entschieden ist.`, empfaenger: [u.id] });
  speichern();
  location.hash = `#/service/antraege/${antrag.id}`;
  toast('Antrag abgeschickt', 'Eingangsbestätigung per E-Mail (simuliert)');
};

function antragZusammenfassung(a) {
  const d = a.daten;
  switch (a.art) {
    case 'fristverlaengerung': { const p = byId('pruefung', Number(d.pruefung)); return `${kursName(p.kurs_id)}, neue Frist ${fmtDatumJ(d.neue_frist + 'T12:00')}`; }
    case 'pruefungsunfaehigkeit': { const p = byId('pruefung', Number(d.pruefung)); return `${kursName(p.kurs_id)}, krank ${fmtDatum(d.von + 'T12:00', false)} bis ${fmtDatum(d.bis + 'T12:00', false)}`; }
    case 'anerkennung': return `${byId('modul', Number(d.modul)).kurztitel}, Note ${noteFmt(d.note)}`;
    case 'schnittplatz': return `${fmtDatum(d.datum + 'T12:00')}, ${d.von}–${d.bis} Uhr`;
    case 'adresse': return `${d.strasse}, ${d.plz} ${d.ort}`;
    default: return '';
  }
}
function antragFelderTabelle(a) {
  const def = ANTRAGSARTEN[a.art], d = a.daten;
  const wert = f => {
    const v = d[f.k];
    if (f.typ === 'pruefung') { const p = byId('pruefung', Number(v)); return p ? `${esc(kursName(p.kurs_id))}: ${esc(p.titel)} (Frist ${fmtDatum(p.frist)}, ${fmtZeit(p.frist)} Uhr)` : '–'; }
    if (f.typ === 'modul') { const m = byId('modul', Number(v)); return m ? `${esc(m.nr)} ${esc(m.titel)} · ${m.ects} ECTS` : '–'; }
    if (f.typ === 'note') return noteFmt(v);
    if (f.typ === 'date') return fmtDatumJ(v + 'T12:00');
    return esc(v).replace(/\n/g, '<br>');
  };
  return `<div class="tabelle-huelle"><table><tbody>${def.felder.map(f => `<tr><th style="width:38%">${esc(f.label)}</th><td>${wert(f)}</td></tr>`).join('')}
    ${a.datei_id ? `<tr><th>Nachweis</th><td><a href="#" data-action="datei-laden" data-id="${a.datei_id}">${I('datei')} ${esc(byId('datei', a.datei_id).dateiname)}</a> <span class="klein leise">${bytes(byId('datei', a.datei_id).groesse_bytes)}</span></td></tr>` : ''}
  </tbody></table></div>`;
}

// ---------- Studierende: Meine Anträge ----------
function meineAntraege(id) {
  const u = ich(), liste = db.antrag.filter(a => a.antragsteller_id === u.id).sort((a, b) => D(b.eingereicht_am) - D(a.eingereicht_am));
  const a = id ? liste.find(x => x.id === Number(id)) : null;
  if (id && !a) throw new Error('kein Zugriff');
  if (a) {
    const def = ANTRAGSARTEN[a.art], st = ANTRAG_STATUS[a.status];
    return `<a class="klein zeile" href="#/service/antraege" style="gap:4px;margin-bottom:10px">${I('zurueck')} Meine Anträge</a>
    ${kopfzeile(esc(def.name), `Eingereicht am ${fmtDatumJ(a.eingereicht_am)} um ${fmtZeit(a.eingereicht_am)} Uhr · Antragsnummer ${a.id}`)}
    <div class="raster raster-2">
      <section class="karte"><div class="zeile dazwischen"><h2 style="margin:0">Deine Angaben</h2><span class="marke-klein ${st.kl}">${st.text}</span></div><div class="abstand">${antragFelderTabelle(a)}</div></section>
      <section class="karte"><h2>Verlauf</h2><ul class="liste">
        <li class="zeile">${I('check')}<span>Eingegangen · ${fmtDatum(a.eingereicht_am)}, ${fmtZeit(a.eingereicht_am)}</span></li>
        ${a.status !== 'eingereicht' ? `<li class="zeile">${I('uhr')}<span>Vom Studienbüro in Bearbeitung genommen</span></li>` : '<li class="zeile leise">' + I('uhr') + '<span>Wartet auf Bearbeitung durch das Studienbüro</span></li>'}
        ${a.entschieden_am ? `<li class="zeile">${I(a.status === 'genehmigt' ? 'check' : 'warn')}<span><b>${st.text}</b> · ${fmtDatum(a.entschieden_am)}, ${fmtZeit(a.entschieden_am)} · ${esc(name(byId('user', a.bearbeitet_von)))}</span></li>` : ''}
      </ul>
      ${a.entschieden_am ? `<div class="hinweis ${a.status === 'genehmigt' ? 'gut' : 'fehler'} abstand">${I(a.status === 'genehmigt' ? 'check' : 'info')}<div>${esc(a.bescheid || (a.status === 'genehmigt' ? def.wirkung : ''))}</div></div>
        <button class="knopf abstand" data-action="bescheid" data-id="${a.id}">${I('download')} Bescheid als PDF</button>` : ''}</section>
    </div>`;
  }
  return `${kopfzeile('Meine Anträge', 'Alles, was du online beim Studienbüro beantragt hast.')}
  <section class="karte">${liste.length ? `<ul class="liste">${liste.map(x => { const st = ANTRAG_STATUS[x.status]; return `<li><a href="#/service/antraege/${x.id}" class="zeile dazwischen" style="color:var(--text);text-decoration:none;flex-wrap:wrap"><span><b>${esc(ANTRAGSARTEN[x.art].name)}</b><br><span class="klein leise">${esc(antragZusammenfassung(x))} · ${fmtDatum(x.eingereicht_am)}</span></span><span class="marke-klein ${st.kl}">${st.text}</span></a></li>`; }).join('')}</ul>` : '<p class="leer">Noch keine Anträge. <a href="#/service/formulare">Zu den Formularen</a></p>'}</section>`;
}
AKTIONEN.bescheid = (el, e) => {
  e?.preventDefault?.();
  const a = byId('antrag', Number(el.dataset.id)), u = byId('user', a.antragsteller_id), def = ANTRAGSARTEN[a.art];
  const text = `Bescheid zu Ihrem Antrag Nr. ${a.id}

${name(u)}, Matrikelnummer ${u.matrikelnummer}
Antrag: ${def.name}
Eingereicht am ${fmtDatumJ(a.eingereicht_am)}
Angaben: ${antragZusammenfassung(a)}

Entscheidung: ${ANTRAG_STATUS[a.status].text} am ${fmtDatumJ(a.entschieden_am)}

${a.bescheid || def.wirkung}

Studienbüro, ${name(byId('user', a.bearbeitet_von))}
Dieser Bescheid wurde elektronisch erstellt. Prototyp, nicht rechtsgültig.`;
  herunterladen(`Bescheid_Antrag_${a.id}.pdf`, pdfAusText(`Bescheid Antrag ${a.id}`, [text], 'Online-Campus · Studienbüro · '), 'application/pdf');
};

// ---------- Verwaltung: Posteingang ----------
const offeneAntraege = () => db.antrag.filter(a => a.status === 'eingereicht' || a.status === 'in_bearbeitung').length;
function vAntraege(id, q) {
  if (id) return vAntrag(Number(id));
  const f = q.get('f') || 'offen';
  const liste = db.antrag.filter(a => f === 'alle' || (f === 'offen' ? ['eingereicht', 'in_bearbeitung'].includes(a.status) : ['genehmigt', 'abgelehnt'].includes(a.status))).sort((a, b) => D(a.eingereicht_am) - D(b.eingereicht_am));
  const fk = (k, t) => `<button data-action="gehe" data-ziel="#/antraege?f=${k}" aria-pressed="${f === k}">${t}</button>`;
  return `${kopfzeile('Anträge', 'Online gestellte Anträge prüfen und entscheiden. Eine Genehmigung wirkt sofort im Campus.')}
  <section class="karte"><div class="filter" style="padding:0 0 12px">${fk('offen', `Offen (${offeneAntraege()})`)}${fk('erledigt', 'Entschieden')}${fk('alle', 'Alle')}</div>
  <div class="tabelle-huelle"><table><thead><tr><th>Eingang</th><th>Person</th><th>Antrag</th><th>Angaben</th><th>Nachweis</th><th>Status</th></tr></thead><tbody>
  ${liste.map(a => { const u = byId('user', a.antragsteller_id), st = ANTRAG_STATUS[a.status]; return `<tr style="cursor:pointer" data-action="gehe" data-ziel="#/antraege/${a.id}">
    <td class="klein">${fmtDatum(a.eingereicht_am)}<br>${fmtZeit(a.eingereicht_am)}</td><td class="fett">${esc(name(u))}</td><td>${esc(ANTRAGSARTEN[a.art].kurz)}</td>
    <td class="klein">${esc(antragZusammenfassung(a))}</td><td>${a.datei_id ? I('datei') : '<span class="leise">–</span>'}</td><td><span class="marke-klein ${st.kl}">${st.text}</span></td></tr>`; }).join('') || '<tr><td colspan="6" class="leer">Keine Anträge</td></tr>'}
  </tbody></table></div></section>`;
}
function antragPruefhinweise(a) {
  const d = a.daten, h = [];
  if (a.art === 'schnittplatz') {
    const beginn = new Date(`${d.datum}T${d.von}`).toISOString(), ende = new Date(`${d.datum}T${d.bis}`).toISOString();
    const k = raumKonflikt(5, beginn, ende) || db.raum_reservierung.find(r => r.raum_id === 5 && D(r.beginn) < D(ende) && D(beginn) < D(r.ende));
    h.push(k ? `<div class="hinweis fehler">${I('warn')}<div>Das Medienlabor ist zu dieser Zeit belegt: ${k.kurs_id ? esc(kursName(k.kurs_id)) : 'Reservierung von ' + esc(name(byId('user', k.user_id)))}, ${fmtZeit(k.beginn)}–${fmtZeit(k.ende)} Uhr.</div></div>` : `<div class="hinweis gut">${I('check')}<div>Das Medienlabor ist zu dieser Zeit frei.</div></div>`);
  }
  if (a.art === 'fristverlaengerung') {
    const p = byId('pruefung', Number(d.pruefung)), tage = Math.round((new Date(d.neue_frist + 'T23:59') - D(p.frist)) / 864e5);
    h.push(`<div class="hinweis ${tage > 14 ? 'warn' : ''}">${I('uhr')}<div>Verlängerung um ${plural(tage, 'Tag', 'Tage')}${tage > 14 ? ', ungewöhnlich lang' : ''}. ${a.datei_id ? 'Ein Nachweis liegt bei.' : 'Kein Nachweis beigefügt.'}</div></div>`);
  }
  if (a.art === 'anerkennung') {
    const m = byId('modul', Number(d.modul));
    h.push(`<div class="hinweis">${I('info')}<div>Modul ${esc(m.nr)} ist im ${m.plansemester}. Semester vorgesehen und bringt ${m.ects} ECTS. Bitte Inhalt und Umfang mit dem Nachweis vergleichen.</div></div>`);
  }
  return h.join('');
}
function vAntrag(id) {
  const a = byId('antrag', id);
  if (!a) throw new Error('unbekannt');
  const u = byId('user', a.antragsteller_id), def = ANTRAGSARTEN[a.art], st = ANTRAG_STATUS[a.status], offen = ['eingereicht', 'in_bearbeitung'].includes(a.status);
  return `<a class="klein zeile" href="#/antraege" style="gap:4px;margin-bottom:10px">${I('zurueck')} Anträge</a>
  ${kopfzeile(`${esc(def.name)} · Nr. ${a.id}`, `${esc(name(u))}, Matrikelnummer ${esc(u.matrikelnummer)} · ${esc(gruppeVon(u.id)?.name || '')} · eingereicht ${fmtDatum(a.eingereicht_am)}, ${fmtZeit(a.eingereicht_am)} Uhr`)}
  <div class="raster raster-2">
    <section class="karte"><div class="zeile dazwischen"><h2 style="margin:0">Angaben</h2><span class="marke-klein ${st.kl}">${st.text}</span></div><div class="abstand">${antragFelderTabelle(a)}</div>
      <div class="abstand">${antragPruefhinweise(a)}</div></section>
    <section class="karte">${offen ? `<h2>Entscheidung</h2>
      <p class="klein leise">Bei Genehmigung: ${esc(def.wirkung)}</p>
      ${a.status === 'eingereicht' ? `<button class="knopf klein" data-action="antrag-bearbeiten" data-id="${a.id}" style="margin-bottom:12px">In Bearbeitung nehmen</button>` : ''}
      <form data-form="antrag-entscheiden" data-id="${a.id}">
        <label class="feld"><span>Begründung für den Bescheid</span><textarea name="bescheid" placeholder="Bei Ablehnung Pflicht. Bei Genehmigung optional."></textarea></label>
        <div class="zeile" style="flex-wrap:wrap"><button class="knopf primaer" name="entscheidung" value="genehmigt">${I('check')} Genehmigen</button><button class="knopf gefahr" name="entscheidung" value="abgelehnt">Ablehnen</button></div>
      </form>` : `<h2>Entschieden</h2><p><span class="marke-klein ${st.kl}">${st.text}</span> am ${fmtDatumJ(a.entschieden_am)} von ${esc(name(byId('user', a.bearbeitet_von)))}</p><p>${esc(a.bescheid || def.wirkung)}</p><button class="knopf" data-action="bescheid" data-id="${a.id}">${I('download')} Bescheid als PDF</button>`}</section>
  </div>`;
}
AKTIONEN['antrag-bearbeiten'] = el => { const a = byId('antrag', Number(el.dataset.id)); a.status = 'in_bearbeitung'; a.bearbeitet_von = ich().id; speichern(); render(); toast('In Bearbeitung', 'Die Person sieht den neuen Stand in „Meine Anträge“'); };
FORMULARE['antrag-entscheiden'] = (f, fd, ereignis) => {
  const a = byId('antrag', Number(f.dataset.id)), def = ANTRAGSARTEN[a.art];
  const entscheidung = ereignis?.submitter?.value || fd.get('entscheidung') || 'genehmigt';
  const bescheid = String(fd.get('bescheid') || '').trim();
  if (entscheidung === 'abgelehnt' && !bescheid) { toast('Bitte eine Begründung für die Ablehnung eintragen'); return; }
  if (entscheidung === 'genehmigt') {
    const fehler = antragWirkungAnwenden(a);
    if (fehler) { toast('Genehmigung nicht möglich', fehler); return; }
  }
  Object.assign(a, { status: entscheidung, bescheid, bearbeitet_von: ich().id, entschieden_am: new Date().toISOString() });
  const z = sende({ absender: ich().id, anlass: 'antrag', titel: `Antrag ${entscheidung === 'genehmigt' ? 'genehmigt' : 'abgelehnt'}: ${def.kurz}`, text: bescheid || def.wirkung, empfaenger: [a.antragsteller_id] });
  speichern(); render();
  toast(`Antrag ${entscheidung}`, zustellText(z));
};
// Setzt die Genehmigung im Campus um; liefert einen Fehlertext, wenn das nicht geht
function antragWirkungAnwenden(a) {
  const d = a.daten, uid = a.antragsteller_id;
  switch (a.art) {
    case 'fristverlaengerung': {
      db.pruefung_ausnahme = db.pruefung_ausnahme.filter(x => !(x.pruefung_id === Number(d.pruefung) && x.student_id === uid && x.art === 'frist'));
      db.pruefung_ausnahme.push({ pruefung_id: Number(d.pruefung), student_id: uid, art: 'frist', neue_frist: new Date(d.neue_frist + 'T23:59').toISOString(), antrag_id: a.id });
      return null;
    }
    case 'pruefungsunfaehigkeit':
      db.pruefung_ausnahme.push({ pruefung_id: Number(d.pruefung), student_id: uid, art: 'ruecktritt', neue_frist: null, antrag_id: a.id });
      return null;
    case 'anerkennung':
      db.anerkennung.push({ id: nextId('anerkennung'), user_id: uid, modul_id: Number(d.modul), wert: Number(d.note), einrichtung: d.einrichtung, antrag_id: a.id, anerkannt_am: new Date().toISOString() });
      return null;
    case 'schnittplatz': {
      const beginn = new Date(`${d.datum}T${d.von}`).toISOString(), ende = new Date(`${d.datum}T${d.bis}`).toISOString();
      if (raumKonflikt(5, beginn, ende) || db.raum_reservierung.some(r => r.raum_id === 5 && D(r.beginn) < D(ende) && D(beginn) < D(r.ende))) return 'Das Medienlabor ist zu dieser Zeit belegt. Bitte ablehnen und einen anderen Termin vorschlagen.';
      db.raum_reservierung.push({ id: nextId('raum_reservierung'), raum_id: 5, user_id: uid, beginn, ende, zweck: d.zweck, antrag_id: a.id });
      return null;
    }
    case 'adresse':
      byId('user', uid).adresse = { strasse: d.strasse, plz: d.plz, ort: d.ort };
      return null;
    default: return 'Unbekannte Antragsart';
  }
}
