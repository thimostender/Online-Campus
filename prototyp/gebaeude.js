'use strict';
// Gebäude Campus Mitte: vier Geschosse, gemeinsame Daten für den 2D-Lageplan und den 3D-Rundgang.
// Maße in Metern. Grundriss 60 × 20 m, Flur in der Mitte (z 8–12), Räume nördlich (z 0–8) und südlich (z 12–20),
// Treppenhaus mit Aufzug in der Mitte (x 26–34, Nordseite). Eingang im EG an der Südseite (x 28–32).
// raum_id verweist auf die buchbaren Räume in der Tabelle RAUM.

const GEBAEUDE = {
  breite: 60, tiefe: 20, flur: [8, 12], kern: { x1: 26, x2: 34, z1: 0, z2: 8 }, eingang: { x1: 28, x2: 32 },
  geschosse: [
    { nr: 0, name: 'Erdgeschoss', kurz: 'EG', raeume: [
      { name: 'Hörsaal A', raum_id: 3, seite: 'n', x1: 3, x2: 24, tuer: 21, art: 'hoersaal' },
      { name: 'Bibliothek', seite: 'n', x1: 36, x2: 57, tuer: 39, art: 'bibliothek' },
      { name: 'Studienbüro', seite: 's', x1: 3, x2: 13, tuer: 10, art: 'buero' },
      { name: 'WC', seite: 's', x1: 13, x2: 17, tuer: 15, art: 'wc' },
      { name: 'Foyer und Eingang', seite: 's', x1: 24, x2: 36, art: 'offen' },
      { name: 'Cafeteria', seite: 's', x1: 40, x2: 57, art: 'offen' },
    ] },
    { nr: 1, name: '1. Obergeschoss', kurz: '1. OG', raeume: [
      { name: 'PC-Labor 1.08', raum_id: 4, seite: 'n', x1: 3, x2: 16, tuer: 13, art: 'labor' },
      { name: 'Medienlabor 1.12', raum_id: 5, seite: 'n', x1: 38, x2: 51, tuer: 41, art: 'labor' },
      { name: 'IT-Support 1.02', seite: 's', x1: 3, x2: 11, tuer: 8, art: 'buero' },
      { name: 'Seminarraum 1.04', seite: 's', x1: 11, x2: 24, tuer: 21, art: 'seminar' },
      { name: 'WC', seite: 's', x1: 26, x2: 30, tuer: 28, art: 'wc' },
      { name: 'Lernzone', seite: 's', x1: 36, x2: 57, art: 'offen' },
    ] },
    { nr: 2, name: '2. Obergeschoss', kurz: '2. OG', raeume: [
      { name: 'Raum 2.10', seite: 'n', x1: 3, x2: 16, tuer: 13, art: 'seminar' },
      { name: 'Dozierendenzimmer 2.20', seite: 'n', x1: 38, x2: 50, tuer: 41, art: 'buero' },
      { name: 'Raum 2.04', raum_id: 1, seite: 's', x1: 3, x2: 16, tuer: 13, art: 'seminar' },
      { name: 'Prüfungsamt 2.06', seite: 's', x1: 16, x2: 24, tuer: 19, art: 'buero' },
      { name: 'WC', seite: 's', x1: 26, x2: 30, tuer: 28, art: 'wc' },
      { name: 'Raum 2.14', seite: 's', x1: 36, x2: 49, tuer: 39, art: 'seminar' },
    ] },
    { nr: 3, name: '3. Obergeschoss', kurz: '3. OG', raeume: [
      { name: 'Raum 3.05', seite: 'n', x1: 3, x2: 16, tuer: 13, art: 'seminar' },
      { name: 'Raum 3.11', raum_id: 2, seite: 'n', x1: 38, x2: 51, tuer: 41, art: 'seminar' },
      { name: 'Gruppenräume 3.01', seite: 's', x1: 3, x2: 14, tuer: 11, art: 'seminar' },
      { name: 'WC', seite: 's', x1: 26, x2: 30, tuer: 28, art: 'wc' },
      { name: 'Lounge', seite: 's', x1: 36, x2: 57, art: 'offen' },
    ] },
  ],
};
const ART_FARBE = { hoersaal: '#c7d2fe', seminar: '#ddd6fe', labor: '#bae6fd', buero: '#fde68a', bibliothek: '#bbf7d0', wc: '#e5e7eb', offen: '#fce7f3', kern: '#d1d5db' };
function raumBereich(r) { return { x1: r.x1, x2: r.x2, z1: r.seite === 'n' ? 0 : GEBAEUDE.flur[1], z2: r.seite === 'n' ? GEBAEUDE.flur[0] : GEBAEUDE.tiefe }; }
function findeRaum(raumId) {
  for (const g of GEBAEUDE.geschosse) { const r = g.raeume.find(x => x.raum_id === raumId); if (r) return { g, r }; }
  return null;
}
// Wegbeschreibung vom Eingang zum Raum
function wegbeschreibung(raumId) {
  const f = findeRaum(raumId);
  if (!f) return '';
  const { g, r } = f, mitte = (GEBAEUDE.kern.x1 + GEBAEUDE.kern.x2) / 2, richtung = (r.tuer ?? (r.x1 + r.x2) / 2) < mitte ? 'links' : 'rechts';
  const schritte = ['Durch den Haupteingang ins Foyer.'];
  if (g.nr > 0) schritte.push(`Geradeaus zum Treppenhaus mit Aufzug und ins ${g.name}.`);
  schritte.push(`Im Flur nach ${richtung} gehen. ${r.name} liegt auf der ${r.seite === 'n' ? (richtung === 'links' ? 'rechten' : 'linken') : (richtung === 'links' ? 'linken' : 'rechten')} Seite.`);
  return schritte.join(' ');
}

// ---------- 2D-Lageplan je Geschoss ----------
function lageplanSvg(geschossNr, markiert) {
  const g = GEBAEUDE.geschosse[geschossNr], m = 10, B = GEBAEUDE.breite * m, T = GEBAEUDE.tiefe * m;
  const k = GEBAEUDE.kern;
  const rechteck = (x1, z1, x2, z2, farbe, extra = '') => `<rect x="${x1 * m}" y="${z1 * m}" width="${(x2 - x1) * m}" height="${(z2 - z1) * m}" fill="${farbe}" ${extra}/>`;
  const text = (x, z, t, gross = 12, fett = 600) => `<text x="${x * m}" y="${z * m}" text-anchor="middle" dominant-baseline="middle" font-size="${gross}" font-weight="${fett}">${esc(t)}</text>`;
  const raeume = g.raeume.map(r => {
    const b = raumBereich(r), aktiv = r.raum_id && r.raum_id === markiert;
    const tuer = r.tuer != null ? rechteck(r.tuer - 0.6, r.seite === 'n' ? b.z2 - 0.25 : b.z1 - 0.05, r.tuer + 0.6, r.seite === 'n' ? b.z2 + 0.05 : b.z1 + 0.25, 'var(--flaeche)') : '';
    const name = r.name.length > 14 && (b.x2 - b.x1) < 12 ? r.name.replace(' ', '\n') : r.name;
    const zeilen = name.split('\n');
    return `<g class="lp-raum ${aktiv ? 'aktiv' : ''} ${r.raum_id ? 'buchbar' : ''}">${rechteck(b.x1, b.z1, b.x2, b.z2, aktiv ? 'var(--akzent)' : ART_FARBE[r.art], r.art === 'offen' ? 'stroke-dasharray="6 4"' : '')}${tuer}
      ${zeilen.map((z, i) => text((b.x1 + b.x2) / 2, (b.z1 + b.z2) / 2 + (i - (zeilen.length - 1) / 2) * 1.6, z, 12)).join('')}</g>`;
  }).join('');
  const kern = `<g class="lp-raum kern">${rechteck(k.x1, k.z1, k.x2, k.z2, ART_FARBE.kern)}${text((k.x1 + k.x2) / 2, 3, 'Treppe', 11)}${text((k.x1 + k.x2) / 2, 5, 'und Aufzug', 11)}</g>`;
  const eingang = g.nr === 0 ? `<g>${rechteck(GEBAEUDE.eingang.x1, GEBAEUDE.tiefe - 0.3, GEBAEUDE.eingang.x2, GEBAEUDE.tiefe + 0.3, 'var(--gut)')}${text(30, GEBAEUDE.tiefe + 1.6, 'Haupteingang', 11, 700)}</g>` : '';
  return `<svg class="lageplan" viewBox="-10 -10 ${B + 20} ${T + 40}" role="img" aria-label="Lageplan ${esc(g.name)}">
    <rect x="0" y="0" width="${B}" height="${T}" fill="var(--flaeche)" stroke="var(--text-2)" stroke-width="3"/>
    ${rechteck(0, GEBAEUDE.flur[0], GEBAEUDE.breite, GEBAEUDE.flur[1], 'var(--flaeche-2)')}${text(8, 10, 'Flur', 11, 500)}
    ${raeume}${kern}${eingang}</svg>`;
}

// ---------- 3D-Rundgang aus Ich-Perspektive (three.js) ----------
const DREI = { laeuft: false };
function lageplan3dSeite(zielRaumId) {
  const ziel = zielRaumId ? findeRaum(zielRaumId) : null;
  setTimeout(() => rundgangStarten(zielRaumId), 0);
  return `<a class="klein zeile" href="#/service/lageplan${zielRaumId ? '?raum=' + zielRaumId : ''}" style="gap:4px;margin-bottom:10px">${I('zurueck')} Lageplan</a>
  ${kopfzeile('Rundgang in 3D', ziel ? `Wegführung zu ${esc(ziel.r.name)} im ${esc(ziel.g.name)}` : 'Durch das Gebäude laufen, alle vier Geschosse')}
  <div class="dreid-huelle" id="dreid-huelle">
    <div id="dreid" class="dreid"><p class="leer" style="color:#ccc;padding-top:30%">3D-Ansicht wird geladen …</p></div>
    <div class="dreid-hud" id="dreid-hud"></div>
    <canvas class="dreid-karte" id="dreid-karte" width="180" height="70" aria-hidden="true"></canvas>
    <div class="dreid-geschosse" role="group" aria-label="Geschoss wählen">${GEBAEUDE.geschosse.map(g => `<button data-action="drei-geschoss" data-nr="${g.nr}">${g.kurz}</button>`).join('')}</div>
    <div class="dreid-start" id="dreid-start"><div><b>Klicken zum Starten</b><br><span class="klein">Umsehen mit der Maus, laufen mit W A S D oder den Pfeiltasten, Umschalt zum Rennen, Esc zum Beenden. Am Treppenhaus mit E das Geschoss wechseln. Auf dem Handy: links ziehen zum Laufen, rechts zum Umsehen.</span></div></div>
  </div>
  <div class="zeile abstand" style="flex-wrap:wrap;gap:8px"><span class="klein leise">Ziel wählen:</span>${db.raum.map(r => `<a class="knopf klein ${r.id === zielRaumId ? 'primaer' : ''}" href="#/service/lageplan3d?raum=${r.id}">${esc(r.bezeichnung)}</a>`).join('')}<a class="knopf klein" href="#/service/lageplan3d">Ohne Ziel</a></div>`;
}

async function rundgangStarten(zielRaumId) {
  rundgangBeenden();
  const box = document.getElementById('dreid');
  if (!box) return;
  let THREE;
  try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'); }
  catch { box.innerHTML = `<div class="hinweis fehler" style="margin:20px">${I('warn')}<div>Die 3D-Bibliothek konnte nicht geladen werden. Bitte die Internetverbindung prüfen.</div></div>`; return; }
  if (!document.getElementById('dreid')) return;
  box.innerHTML = '';
  const ziel = zielRaumId ? findeRaum(zielRaumId) : null;
  const S = DREI;
  Object.assign(S, { laeuft: true, THREE, geschoss: 0, gier: 0, nick: 0, pos: { x: 30, z: 18.5 }, tasten: {}, waende: [], touch: {}, letzteZeit: performance.now(), ziel, pfeile: null });
  const w = box.clientWidth, h = box.clientHeight;
  S.renderer = new THREE.WebGLRenderer({ antialias: true });
  S.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  S.renderer.setSize(w, h);
  box.appendChild(S.renderer.domElement);
  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color('#dbeafe');
  S.scene.fog = new THREE.Fog('#dbeafe', 25, 70);
  S.kamera = new THREE.PerspectiveCamera(70, w / h, 0.1, 200);
  S.scene.add(new THREE.HemisphereLight('#ffffff', '#9ca3af', 1.1));
  const sonne = new THREE.DirectionalLight('#ffffff', 0.8); sonne.position.set(20, 30, 10); S.scene.add(sonne);
  S.gruppe = new THREE.Group(); S.scene.add(S.gruppe);
  geschossBauen(0);
  steuerungAnbinden();
  S.renderer.setAnimationLoop(schritt);
}
function textTafel(text, breite = 3, hoehe = 0.6, hintergrund = '#4c1d95', schrift = '#ffffff') {
  const THREE = DREI.THREE, c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * hoehe / breite);
  const g = c.getContext('2d'); g.fillStyle = hintergrund; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = schrift; g.font = `600 ${Math.round(c.height * 0.5)}px -apple-system, Helvetica, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2, c.width - 20);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  // Zwei einseitige Flächen Rücken an Rücken: von jeder Seite richtig herum lesbar, nie gespiegelt
  const geo = new THREE.PlaneGeometry(breite, hoehe), stoff = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });
  const tafel = new THREE.Group(), vorn = new THREE.Mesh(geo, stoff), hinten = new THREE.Mesh(geo, stoff);
  hinten.rotation.y = Math.PI; tafel.add(vorn, hinten);
  return tafel;
}
function geschossBauen(nr) {
  const S = DREI, THREE = S.THREE, G = GEBAEUDE, g = G.geschosse[nr];
  S.gruppe.clear(); S.waende = []; S.geschoss = nr; S.pfeile = null;
  const HOEHE = 3.2, DICKE = 0.16;
  const mat = f => new THREE.MeshLambertMaterial({ color: f });
  const wand = (x1, z1, x2, z2, farbe = '#f8fafc') => {
    const lang = Math.hypot(x2 - x1, z2 - z1); if (lang < 0.05) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 === x2 ? DICKE : lang, HOEHE, z1 === z2 ? DICKE : lang), mat(farbe));
    m.position.set((x1 + x2) / 2, HOEHE / 2, (z1 + z2) / 2); S.gruppe.add(m);
    S.waende.push({ x1: Math.min(x1, x2) - DICKE / 2, x2: Math.max(x1, x2) + DICKE / 2, z1: Math.min(z1, z2) - DICKE / 2, z2: Math.max(z1, z2) + DICKE / 2 });
  };
  // Boden, Decke, Außenwände (Eingang im EG offen)
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(G.breite, G.tiefe), mat('#e7e5e4')); boden.rotation.x = -Math.PI / 2; boden.position.set(G.breite / 2, 0, G.tiefe / 2); S.gruppe.add(boden);
  const flur = new THREE.Mesh(new THREE.PlaneGeometry(G.breite, G.flur[1] - G.flur[0]), mat('#cbd5e1')); flur.rotation.x = -Math.PI / 2; flur.position.set(G.breite / 2, 0.01, (G.flur[0] + G.flur[1]) / 2); S.gruppe.add(flur);
  const decke = new THREE.Mesh(new THREE.PlaneGeometry(G.breite, G.tiefe), mat('#f5f5f4')); decke.rotation.x = Math.PI / 2; decke.position.set(G.breite / 2, HOEHE, G.tiefe / 2); S.gruppe.add(decke);
  wand(0, 0, G.breite, 0, '#e2e8f0'); wand(0, 0, 0, G.tiefe, '#e2e8f0'); wand(G.breite, 0, G.breite, G.tiefe, '#e2e8f0');
  if (nr === 0) { wand(0, G.tiefe, G.eingang.x1, G.tiefe, '#e2e8f0'); wand(G.eingang.x2, G.tiefe, G.breite, G.tiefe, '#e2e8f0'); const t = textTafel('Haupteingang', 3, 0.5, '#15803d'); t.position.set(30, 2.9, G.tiefe - 0.1); S.gruppe.add(t); }
  else wand(0, G.tiefe, G.breite, G.tiefe, '#e2e8f0');
  // Treppenhaus mit Aufzug (offen zum Flur)
  const k = G.kern;
  wand(k.x1 + 0.08, k.z1, k.x1 + 0.08, k.z2, '#cbd5e1'); wand(k.x2 - 0.08, k.z1, k.x2 - 0.08, k.z2, '#cbd5e1');
  const kernBoden = new THREE.Mesh(new THREE.PlaneGeometry(k.x2 - k.x1, k.z2 - k.z1), mat(ART_FARBE.kern)); kernBoden.rotation.x = -Math.PI / 2; kernBoden.position.set((k.x1 + k.x2) / 2, 0.02, (k.z1 + k.z2) / 2); S.gruppe.add(kernBoden);
  // Stufen als Andeutung
  for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18 * (i + 1), 0.5), mat('#9ca3af')); st.position.set(k.x1 + 1.8, 0.09 * (i + 1), 1 + i * 0.5); S.gruppe.add(st); }
  const aufzug = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.1), mat('#94a3b8')); aufzug.position.set(k.x2 - 2, 1.2, 0.2); S.gruppe.add(aufzug);
  const kt = textTafel(`Treppe und Aufzug · ${g.kurz}`, 4, 0.55, '#374151'); kt.position.set((k.x1 + k.x2) / 2, 2.8, k.z2 - 0.05); S.gruppe.add(kt);
  const et = textTafel('Geschoss wechseln: Taste E', 3.4, 0.4, '#6d28d9'); et.position.set((k.x1 + k.x2) / 2, 2.3, k.z2 - 0.05); S.gruppe.add(et);
  // Räume: Seitenwände und Wand zum Flur mit Türöffnung
  g.raeume.forEach(r => {
    const b = raumBereich(r), flurZ = r.seite === 'n' ? b.z2 : b.z1, aussen = r.seite === 'n' ? b.z1 : b.z2;
    const tint = new THREE.Mesh(new THREE.PlaneGeometry(b.x2 - b.x1, b.z2 - b.z1), mat(ART_FARBE[r.art])); tint.rotation.x = -Math.PI / 2; tint.position.set((b.x1 + b.x2) / 2, 0.015, (b.z1 + b.z2) / 2); S.gruppe.add(tint);
    if (r.art === 'offen') { const t = textTafel(r.name, 4, 0.6, '#be185d'); t.position.set((b.x1 + b.x2) / 2, 2.8, flurZ + (r.seite === 'n' ? -0.3 : 0.3)); S.gruppe.add(t); return; }
    wand(b.x1 + 0.08, aussen, b.x1 + 0.08, flurZ); wand(b.x2 - 0.08, aussen, b.x2 - 0.08, flurZ);
    wand(b.x1, flurZ, r.tuer - 0.6, flurZ); wand(r.tuer + 0.6, flurZ, b.x2, flurZ);
    // Türsturz und Schild zum Flur
    const sturz = new THREE.Mesh(new THREE.BoxGeometry(1.2, HOEHE - 2.2, DICKE), mat('#f8fafc')); sturz.position.set(r.tuer, 2.2 + (HOEHE - 2.2) / 2, flurZ); S.gruppe.add(sturz);
    const aktiv = S.ziel && S.ziel.r === r;
    const schild = textTafel(r.name, Math.max(2, r.name.length * 0.16), 0.45, aktiv ? '#6d28d9' : '#1f2937');
    schild.position.set(r.tuer + (r.name.length * 0.08 + 1.2), 2.4, flurZ + (r.seite === 'n' ? 0.1 : -0.1)); S.gruppe.add(schild);
    // Einrichtung als Andeutung (ohne Kollision)
    if (['hoersaal', 'seminar', 'labor'].includes(r.art)) {
      const reihen = Math.floor((b.z2 - b.z1 - 3) / 1.6), breite = b.x2 - b.x1 - 3;
      for (let i = 0; i < reihen; i++) { const tisch = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.75, 0.6), mat(r.art === 'labor' ? '#475569' : '#a8a29e')); tisch.position.set((b.x1 + b.x2) / 2, 0.375, (r.seite === 'n' ? b.z1 + 2.5 : b.z2 - 2.5) + (r.seite === 'n' ? i : -i) * 1.6); S.gruppe.add(tisch); }
      const tafel = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6, breite), 1.4, 0.05), mat('#ffffff')); tafel.position.set((b.x1 + b.x2) / 2, 1.7, r.seite === 'n' ? b.z1 + 0.15 : b.z2 - 0.15); S.gruppe.add(tafel);
    }
  });
  kartenHintergrund();
}
// Wegpunkte zum Ziel (auf diesem Geschoss Tür, sonst Treppenhaus)
function wegZiel() {
  const S = DREI, z = S.ziel;
  if (!z) return null;
  const flurMitte = (GEBAEUDE.flur[0] + GEBAEUDE.flur[1]) / 2;
  if (z.g.nr !== S.geschoss) return { punkte: [{ x: 30, z: flurMitte }, { x: 30, z: 6 }], text: `Ziel ${z.r.name} im ${z.g.name}: zum Treppenhaus und mit E wechseln`, istKern: true };
  const b = raumBereich(z.r), tuer = { x: z.r.tuer, z: z.r.seite === 'n' ? b.z2 : b.z1 }, innen = { x: z.r.tuer, z: (b.z1 + b.z2) / 2 };
  return { punkte: [{ x: tuer.x, z: flurMitte }, tuer, innen], text: `Ziel: ${z.r.name}`, bereich: b };
}
function pfeileZeichnen() {
  const S = DREI, THREE = S.THREE, weg = wegZiel();
  if (S.pfeile) { S.gruppe.remove(S.pfeile); S.pfeile = null; }
  if (!weg) return weg;
  const flurMitte = (GEBAEUDE.flur[0] + GEBAEUDE.flur[1]) / 2;
  const start = { x: S.pos.x, z: (S.pos.z > GEBAEUDE.flur[0] - 0.5 && S.pos.z < GEBAEUDE.flur[1] + 0.5) ? S.pos.z : flurMitte };
  const punkte = [start, ...weg.punkte], grp = new THREE.Group(), matP = new THREE.MeshBasicMaterial({ color: '#7c3aed' });
  for (let i = 0; i < punkte.length - 1; i++) {
    const a = punkte[i], b = punkte[i + 1], lang = Math.hypot(b.x - a.x, b.z - a.z), n = Math.floor(lang / 1.2);
    for (let j = 1; j <= n; j++) {
      const t = j / (n + 1), p = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), matP);
      p.position.set(a.x + (b.x - a.x) * t, 0.06, a.z + (b.z - a.z) * t); p.rotation.set(Math.PI / 2, Math.atan2(b.x - a.x, b.z - a.z), 0, 'YXZ'); grp.add(p);
    }
  }
  S.pfeile = grp; S.gruppe.add(grp);
  return weg;
}
function steuerungAnbinden() {
  const S = DREI, el = S.renderer.domElement, start = document.getElementById('dreid-start');
  const beginnen = () => { start.hidden = true; if (!matchMedia('(pointer: coarse)').matches) el.requestPointerLock?.(); };
  start.addEventListener('click', beginnen);
  el.addEventListener('click', () => { if (!matchMedia('(pointer: coarse)').matches && document.pointerLockElement !== el) el.requestPointerLock?.(); });
  S.maus = e => { if (document.pointerLockElement !== el) return; S.gier -= e.movementX * 0.0025; S.nick = Math.max(-1.2, Math.min(1.2, S.nick - e.movementY * 0.0025)); };
  S.taste = e => {
    if (!S.laeuft || e.target.closest?.('input, textarea')) return;
    const runter = e.type === 'keydown';
    S.tasten[e.code] = runter;
    if (runter && e.code === 'KeyE' && imKern()) geschossMenue();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  };
  document.addEventListener('mousemove', S.maus);
  document.addEventListener('keydown', S.taste);
  document.addEventListener('keyup', S.taste);
  // Touch: linke Hälfte laufen, rechte Hälfte umsehen
  const huelle = document.getElementById('dreid-huelle');
  S.tStart = e => { start.hidden = true; for (const t of e.changedTouches) { const links = t.clientX < huelle.getBoundingClientRect().left + huelle.clientWidth / 2; S.touch[t.identifier] = { links, x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY }; } };
  S.tBewegen = e => { e.preventDefault(); for (const t of e.changedTouches) { const s = S.touch[t.identifier]; if (!s) continue; if (!s.links) { S.gier -= (t.clientX - s.x) * 0.005; S.nick = Math.max(-1.2, Math.min(1.2, S.nick - (t.clientY - s.y) * 0.005)); } s.x = t.clientX; s.y = t.clientY; } };
  S.tEnde = e => { for (const t of e.changedTouches) delete S.touch[t.identifier]; };
  huelle.addEventListener('touchstart', S.tStart, { passive: true });
  huelle.addEventListener('touchmove', S.tBewegen, { passive: false });
  huelle.addEventListener('touchend', S.tEnde);
  S.groesse = () => { const b = document.getElementById('dreid'); if (!b) return; S.kamera.aspect = b.clientWidth / b.clientHeight; S.kamera.updateProjectionMatrix(); S.renderer.setSize(b.clientWidth, b.clientHeight); };
  window.addEventListener('resize', S.groesse);
}
const imKern = () => { const k = GEBAEUDE.kern; return DREI.pos.x > k.x1 && DREI.pos.x < k.x2 && DREI.pos.z < k.z2 + 3; };
function geschossMenue() {
  const hud = document.getElementById('dreid-hud');
  document.exitPointerLock?.();
  hud.innerHTML = `<div class="dreid-menue"><b>Wohin?</b>${GEBAEUDE.geschosse.map(g => `<button class="knopf ${g.nr === DREI.geschoss ? '' : 'primaer'}" data-action="drei-geschoss" data-nr="${g.nr}" ${g.nr === DREI.geschoss ? 'disabled' : ''}>${g.name}</button>`).join('')}</div>`;
  DREI.menue = true;
}
AKTIONEN['drei-geschoss'] = el => {
  const S = DREI; if (!S.laeuft) return;
  const nr = Number(el.dataset.nr);
  geschossBauen(nr);
  // Aus dem Treppenhaus in den Flur treten
  Object.assign(S.pos, { x: 30, z: 9.5 }); S.gier = S.ziel && S.ziel.g.nr === nr ? ((S.ziel.r.tuer < 30) ? Math.PI / 2 : -Math.PI / 2) : Math.PI; S.nick = 0;
  S.menue = false; document.getElementById('dreid-start').hidden = true;
  if (!matchMedia('(pointer: coarse)').matches) S.renderer.domElement.requestPointerLock?.();
};
function kollidiert(x, z) {
  const r = 0.3, G = GEBAEUDE;
  if (x < r || x > G.breite - r || z < r) return true;
  if (z > G.tiefe - r && !(DREI.geschoss === 0 && x > G.eingang.x1 && x < G.eingang.x2)) return true;
  if (z > G.tiefe + 2) return true;
  return DREI.waende.some(w => x > w.x1 - r && x < w.x2 + r && z > w.z1 - r && z < w.z2 + r);
}
function schritt(zeit) {
  const S = DREI;
  if (!S.laeuft || !document.getElementById('dreid')) { rundgangBeenden(); return; }
  const dt = Math.min(0.05, (zeit - S.letzteZeit) / 1000); S.letzteZeit = zeit;
  const t = S.tasten, tempo = (t.ShiftLeft || t.ShiftRight ? 4.5 : 2.4) * dt;
  let vor = (t.KeyW || t.ArrowUp ? 1 : 0) - (t.KeyS || t.ArrowDown ? 1 : 0), seit = (t.KeyD ? 1 : 0) - (t.KeyA ? 1 : 0);
  if (t.ArrowLeft) S.gier += 1.8 * dt; if (t.ArrowRight) S.gier -= 1.8 * dt;
  const stick = Object.values(S.touch).find(s => s.links);
  if (stick) { vor += Math.max(-1, Math.min(1, -(stick.y - stick.y0) / 60)); seit += Math.max(-1, Math.min(1, (stick.x - stick.x0) / 60)); }
  if (vor || seit) {
    const sin = Math.sin(S.gier), cos = Math.cos(S.gier);
    const dx = (-sin * vor + cos * seit) * tempo, dz = (-cos * vor - sin * seit) * tempo;
    if (!kollidiert(S.pos.x + dx, S.pos.z)) S.pos.x += dx;
    if (!kollidiert(S.pos.x, S.pos.z + dz)) S.pos.z += dz;
  }
  S.kamera.position.set(S.pos.x, 1.65, S.pos.z);
  S.kamera.rotation.set(S.nick, S.gier, 0, 'YXZ');
  // Wegführung zweimal pro Sekunde aktualisieren
  if (!S.naechsteAnzeige || zeit > S.naechsteAnzeige) { S.naechsteAnzeige = zeit + 500; anzeigeAktualisieren(); }
  karteZeichnen();
  S.renderer.render(S.scene, S.kamera);
}
function anzeigeAktualisieren() {
  const S = DREI, hud = document.getElementById('dreid-hud');
  if (!hud || S.menue) return;
  const weg = pfeileZeichnen(), g = GEBAEUDE.geschosse[S.geschoss];
  let text = `<b>${g.name}</b>`;
  if (weg) {
    const b = weg.bereich;
    if (b && S.pos.x > b.x1 && S.pos.x < b.x2 && S.pos.z > b.z1 && S.pos.z < b.z2) text += ` · <span class="dreid-ok">Angekommen: ${esc(S.ziel.r.name)}</span>`;
    else { const ziel = weg.punkte[weg.punkte.length - 1]; text += ` · ${esc(weg.text)} · noch ${Math.round(Math.hypot(ziel.x - S.pos.x, ziel.z - S.pos.z))} m`; }
  }
  if (imKern()) text += ' · <b>E</b> drücken zum Geschoss wechseln';
  hud.innerHTML = `<div class="dreid-info">${text}</div>`;
}
function kartenHintergrund() {
  const c = document.getElementById('dreid-karte'); if (!c) return;
  const g = c.getContext('2d'), s = c.width / GEBAEUDE.breite, geschoss = GEBAEUDE.geschosse[DREI.geschoss];
  const bild = document.createElement('canvas'); bild.width = c.width; bild.height = c.height; const b = bild.getContext('2d');
  b.fillStyle = 'rgba(255,255,255,.92)'; b.fillRect(0, 0, bild.width, bild.height);
  b.fillStyle = '#e2e8f0'; b.fillRect(0, GEBAEUDE.flur[0] * s, bild.width, (GEBAEUDE.flur[1] - GEBAEUDE.flur[0]) * s);
  geschoss.raeume.forEach(r => { const br = raumBereich(r); b.fillStyle = DREI.ziel && DREI.ziel.r === r ? '#7c3aed' : ART_FARBE[r.art]; b.fillRect(br.x1 * s + 0.5, br.z1 * s + 0.5, (br.x2 - br.x1) * s - 1, (br.z2 - br.z1) * s - 1); });
  const k = GEBAEUDE.kern; b.fillStyle = '#9ca3af'; b.fillRect(k.x1 * s, k.z1 * s, (k.x2 - k.x1) * s, (k.z2 - k.z1) * s);
  DREI.kartenBild = bild; g.drawImage(bild, 0, 0);
}
function karteZeichnen() {
  const c = document.getElementById('dreid-karte'); if (!c || !DREI.kartenBild) return;
  const g = c.getContext('2d'), s = c.width / GEBAEUDE.breite, S = DREI;
  g.drawImage(S.kartenBild, 0, 0);
  g.save(); g.translate(S.pos.x * s, S.pos.z * s); g.rotate(-S.gier);
  g.fillStyle = '#dc2626'; g.beginPath(); g.moveTo(0, -5); g.lineTo(3.5, 4); g.lineTo(-3.5, 4); g.closePath(); g.fill(); g.restore();
}
function rundgangBeenden() {
  const S = DREI;
  if (!S.renderer) { S.laeuft = false; return; }
  S.laeuft = false;
  S.renderer.setAnimationLoop(null);
  S.renderer.dispose();
  S.renderer.domElement.remove();
  document.removeEventListener('mousemove', S.maus);
  document.removeEventListener('keydown', S.taste);
  document.removeEventListener('keyup', S.taste);
  window.removeEventListener('resize', S.groesse);
  if (document.pointerLockElement) document.exitPointerLock();
  S.renderer = null;
}
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/service/lageplan3d')) rundgangBeenden(); });
