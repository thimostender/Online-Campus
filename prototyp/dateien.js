'use strict';
// Dateispeicher im Browser (IndexedDB), PDF-Erzeugung für Beispieldateien, ZIP-Erzeugung
// und Textauslese hochgeladener Dateien für den Hilfe-Assistenten.
// Im fertigen Campus übernimmt das ein Objektspeicher auf dem Server.

const DATEISPEICHER = { name: 'online-campus-dateien', store: 'inhalte' };
const MAX_GESPEICHERT = 300e6; // größere Dateien nur als Metadaten (Browser-Speicher ist begrenzt)

function dbOeffnen() {
  return new Promise((ok, fehler) => {
    if (!('indexedDB' in window)) { fehler(new Error('kein IndexedDB')); return; }
    const r = indexedDB.open(DATEISPEICHER.name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(DATEISPEICHER.store);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
}
async function inhaltSpeichern(id, blob) {
  try {
    const d = await dbOeffnen();
    await new Promise((ok, fehler) => { const tx = d.transaction(DATEISPEICHER.store, 'readwrite'); tx.objectStore(DATEISPEICHER.store).put(blob, id); tx.oncomplete = ok; tx.onerror = () => fehler(tx.error); });
    return true;
  } catch { return false; }
}
async function inhaltLaden(id) {
  try {
    const d = await dbOeffnen();
    return await new Promise((ok, fehler) => { const r = d.transaction(DATEISPEICHER.store).objectStore(DATEISPEICHER.store).get(id); r.onsuccess = () => ok(r.result || null); r.onerror = () => fehler(r.error); });
  } catch { return null; }
}
async function alleInhalteLoeschen() {
  try { const d = await dbOeffnen(); await new Promise(ok => { const tx = d.transaction(DATEISPEICHER.store, 'readwrite'); tx.objectStore(DATEISPEICHER.store).clear(); tx.oncomplete = ok; tx.onerror = ok; }); } catch { /* egal */ }
}

// ---------- PDF erzeugen (nur Text, Helvetica, WinAnsi) ----------
function pdfAusText(titel, seiten, fussnote = '') {
  const umbruch = (text, breite = 88) => text.split('\n').flatMap(zeile => {
    if (!zeile.trim()) return [''];
    const woerter = zeile.split(' '), out = [];
    let z = '';
    woerter.forEach(w => { if ((z + ' ' + w).trim().length > breite) { out.push(z); z = w; } else z = (z + ' ' + w).trim(); });
    if (z) out.push(z);
    return out;
  });
  // WinAnsi: Latin-1 plus typografische Zeichen; alles andere wird ersetzt
  const ersatz = { '–': '\x96', '—': '\x97', '„': '\x84', '“': '\x93', '”': '\x94', '‘': '\x91', '’': '\x92', '…': '\x85', '€': '\x80', '•': '\x95', '·': '\xb7', '≤': '<=', '≥': '>=', '→': '->' };
  const kodiere = s => s.replace(/[–—„“”‘’…€•·≤≥→]/g, c => ersatz[c]).replace(/[^\x00-\xff]/g, '?').replace(/([\\()])/g, '\\$1');
  const zeilenJeSeite = 52, seitenInhalt = [];
  seiten.forEach((s, i) => {
    const zeilen = umbruch(s);
    for (let start = 0; start < zeilen.length || start === 0; start += zeilenJeSeite) {
      const teil = zeilen.slice(start, start + zeilenJeSeite);
      let ops = 'BT /F2 9 Tf 56 812 Td (' + kodiere(titel) + ') Tj ET\n';
      ops += 'BT /F1 11 Tf 14 TL 56 780 Td\n' + teil.map((z, j) => (j === 0 && start === 0 ? '/F2 11 Tf ' : j === 1 && start === 0 ? '/F1 11 Tf ' : '') + '(' + kodiere(z) + ') Tj T*').join('\n') + '\nET\n';
      ops += 'BT /F1 8 Tf 56 40 Td (' + kodiere(`${fussnote}Seite ${i + 1}`) + ') Tj ET';
      seitenInhalt.push(ops);
      if (start + zeilenJeSeite >= zeilen.length) break;
    }
  });
  const objekte = [];
  const add = s => { objekte.push(s); return objekte.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('PAGES');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kinder = seitenInhalt.map(ops => {
    const inhalt = add(`<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`);
    return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${inhalt} 0 R >>`);
  });
  objekte[1] = `<< /Type /Pages /Kids [${kinder.map(k => k + ' 0 R').join(' ')}] /Count ${kinder.length} >>`;
  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const versatz = [];
  objekte.forEach((o, i) => { versatz.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n` + versatz.map(v => String(v).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += `trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

// Erzeugt beim ersten Start die Inhalte aller Beispieldateien, damit Download, ZIP und Prüfsummen echt sind.
async function beispielDateienErzeugen() {
  const offen = db.datei.filter(d => d.erzeugen);
  if (!offen.length) return;
  for (const d of offen) {
    const e = d.erzeugen;
    let blob;
    if (e.art === 'material') {
      const t = MATERIAL_TEXTE[e.key];
      blob = pdfAusText(t.titel, t.seiten, 'Online-Campus · Beispielmaterial · ');
    } else {
      const u = byId('user', e.von);
      blob = pdfAusText(e.titel, [`${e.titel}\n\nvorgelegt von ${name(u)}, Matrikelnummer ${u.matrikelnummer}\n\nDies ist eine Beispielabgabe im Prototyp des Online-Campus. Im echten Betrieb steht hier die eingereichte Arbeit.`], 'Beispielabgabe · ');
    }
    d.groesse_bytes = blob.size;
    d.sha256 = (await sha256(blob)) || d.sha256;
    await inhaltSpeichern(d.id, blob);
    delete d.erzeugen;
  }
  speichern();
}

// ---------- ZIP (ohne Kompression, mit CRC-32) ----------
const CRC_TABELLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC_TABELLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
async function zipErstellen(eintraege) { // [{ name, blob }]
  const teile = [], verzeichnis = [];
  let versatz = 0;
  const enc = new TextEncoder();
  for (const e of eintraege) {
    const daten = new Uint8Array(await e.blob.arrayBuffer()), nameBytes = enc.encode(e.name), crc = crc32(daten);
    const kopf = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, daten.length, 4], [22, daten.length, 4], [26, nameBytes.length, 2], [28, 0, 2]]
      .forEach(([o, v, l]) => l === 4 ? kopf.setUint32(o, v, true) : kopf.setUint16(o, v, true));
    teile.push(kopf.buffer, nameBytes, daten);
    const z = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, daten.length, 4], [24, daten.length, 4], [28, nameBytes.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, versatz, 4]]
      .forEach(([o, v, l]) => l === 4 ? z.setUint32(o, v, true) : z.setUint16(o, v, true));
    verzeichnis.push(z.buffer, nameBytes);
    versatz += 30 + nameBytes.length + daten.length;
  }
  const groesse = verzeichnis.reduce((s, b) => s + b.byteLength, 0);
  const ende = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, eintraege.length, 2], [10, eintraege.length, 2], [12, groesse, 4], [16, versatz, 4], [20, 0, 2]]
    .forEach(([o, v, l]) => l === 4 ? ende.setUint32(o, v, true) : ende.setUint16(o, v, true));
  return new Blob([...teile, ...verzeichnis, ende.buffer], { type: 'application/zip' });
}

// ---------- Prüfsumme ----------
async function sha256(file) {
  // Große Dateien würden im Browser viel Speicher brauchen; der echte Server rechnet die Prüfsumme selbst.
  if (!window.crypto?.subtle || file.size > MAX_GESPEICHERT) return null;
  const h = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Textauslese für den Assistenten ----------
// Fügt umbrochene Zeilen wieder zu Sätzen zusammen. Überschriften, Aufzählungen und Zeilen mit
// Doppelpunkt am Ende bleiben eigene Zeilen, ein großer Zeilenabstand beginnt einen Absatz.
function zeilenZuText(zeilen, normal) {
  let text = '';
  zeilen.forEach((z, i) => {
    const t = z.text.replace(/[ \t]+/g, ' ').trim();
    if (!t) return;
    if (i === 0 || !text) { text = t; return; }
    const vorher = zeilen[i - 1].text.trim();
    const absatz = z.luecke > normal * 1.5;
    const eigeneZeile = /^([-–•]|\d+[.)] )/.test(t) || /[:]$/.test(vorher) || vorher.length < 45;
    text += absatz ? '\n\n' + t : eigeneZeile ? '\n' + t : ' ' + t;
  });
  return text.trim();
}
// Liefert [{ seite, text }] oder wirft einen Fehler mit verständlicher Meldung.
async function textAuslesen(file) {
  const endung = (file.name.split('.').pop() || '').toLowerCase();
  if (['txt', 'md'].includes(endung)) return [{ seite: 1, text: await file.text() }];
  if (endung !== 'pdf') throw new Error(`Aus .${endung}-Dateien kann der Assistent noch keinen Text lesen. PDF, TXT und MD funktionieren.`);
  const pdfjs = window.pdfjsLib;
  if (!pdfjs) throw new Error('Die PDF-Auslese ist nicht geladen.');
  pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const seiten = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const inhalt = await (await doc.getPage(i)).getTextContent();
    // Zeilen anhand der y-Position wieder zusammensetzen; großer Abstand = neuer Absatz
    const zeilen = [];
    let letztesY = null, abstaende = [];
    inhalt.items.forEach(it => {
      const y = it.transform[5];
      if (letztesY === null || Math.abs(y - letztesY) > 2) { zeilen.push({ text: it.str, luecke: letztesY === null ? 0 : letztesY - y }); if (letztesY !== null) abstaende.push(letztesY - y); }
      else zeilen[zeilen.length - 1].text += it.str;
      letztesY = y;
    });
    const normal = abstaende.filter(a => a > 0).sort((a, b) => a - b)[Math.floor(abstaende.length / 3)] || 14;
    seiten.push({ seite: i, text: zeilenZuText(zeilen, normal) });
  }
  if (!seiten.some(s => s.text.length > 20)) throw new Error('In diesem PDF steckt kein auslesbarer Text (vermutlich eingescannt). Für gescannte Dokumente bräuchte es eine Texterkennung.');
  return seiten;
}
