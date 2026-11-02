'use strict';
// Campus als 3D-Puppenhaus: Modell und Licht kommen aus Blender (3d/bauen.py), die Funktionen bleiben die
// bestehenden Seiten. Jeder Ort im Modell führt zur passenden Route; Hinweise kommen live aus db.
// Zusätzlicher Einstieg, kein Ersatz: ohne WebGL oder bei "Bewegung reduzieren" gibt es dieselben Orte als Liste.

const C3 = { laeuft: false };
const C3_ORDNER = 'campus3d/', C3_TEILER = 8, C3_GH = 3.6, C3_STAND = '?v=202611021420';
const C3_DATEIEN = ['campus.glb', ...['g0', 'g1', 'g2', 'g3', 'aussen', 'dach', 'anzeige'].map(n => `licht_${n}.jpg`)];
const c3y = n => n * C3_GH + 0.3;
const c3Raum = name => { for (const g of GEBAEUDE.geschosse) { const r = g.raeume.find(x => x.name.startsWith(name)); if (r) return { g: g.nr, r, b: raumBereich(r) }; } return null; };

// Orte: geschoss ('aussen' = immer sichtbar), Klickfläche [Breite, Höhe, Tiefe, x, y, z], Ziele je Rolle, Hinweis je Rolle
function c3Orte() {
  const u = ich(), r = u.rolle;
  const raum = (name, n) => { const f = c3Raum(name); const b = f.b; return [b.x2 - b.x1 - 0.4, 3.0, b.z2 - b.z1 - 0.4, (b.x1 + b.x2) / 2, c3y(n) + 1.5, (b.z1 + b.z2) / 2]; };
  const jetzt = new Date();
  const online = db.termin.find(t => !t.raum_id && t.status !== 'ausgefallen' && D(t.beginn) - 10 * 6e4 <= jetzt && D(t.ende) >= jetzt && typeof darfBeitreten === 'function' && darfBeitreten(t));
  const heute = db.termin.filter(t => fmtLang(D(t.beginn)) === fmtLang(jetzt) && D(t.ende) >= jetzt && t.status !== 'ausgefallen' && (r === 'verwaltung' || kurseVon(u.id).some(k => k.id === t.kurs_id))).sort((a, b) => D(a.beginn) - D(b.beginn));
  const offenAnw = r === 'lehrend' ? db.termin.filter(t => kurseVon(u.id).some(k => k.id === t.kurs_id) && erfassbar(t) && D(t.beginn) > Date.now() - 14 * 864e5 && db.anwesenheit.filter(a => a.termin_id === t.id).length < studisVon(t.kurs_id).length).length : 0;
  const fristBald = r === 'studierend' ? db.pruefung.filter(p => p.frist && kurseVon(u.id).some(k => k.id === p.kurs_id) && D(p.frist) > jetzt && D(p.frist) - jetzt < 3 * 864e5).length : 0;
  const un = ungelesen(u.id);
  const orte = {
    anzeige: { name: 'Anzeigetafel', ort: 'Foyer, Erdgeschoss', geschoss: 0, flaeche: [4.2, 2.6, 0.8, 33, c3y(0) + 1.75, 13.5],
      ziele: [['Übersicht', '#/uebersicht'], ['Stundenplan', r === 'verwaltung' ? '#/planung' : '#/stundenplan']],
      hinweis: heute.length ? `${plural(heute.length, 'Termin', 'Termine')} heute` : '' },
    hoersaal: { name: 'Hörsaal A', ort: 'Erdgeschoss', geschoss: 0, flaeche: raum('Hörsaal A', 0),
      ziele: online && r !== 'verwaltung' ? [[r === 'lehrend' ? 'Online-Raum starten' : 'Online-Vorlesung beitreten', `#/konferenz/${online.id}`], ['Stundenplan', '#/stundenplan']] : [['Stundenplan', r === 'verwaltung' ? '#/planung' : '#/stundenplan']],
      hinweis: online && r !== 'verwaltung' ? `Läuft jetzt: ${kursName(online.kurs_id)}` : '', leuchtet: !!online && r !== 'verwaltung' },
    bibliothek: { name: 'Bibliothek', ort: 'Erdgeschoss', geschoss: 0, flaeche: raum('Bibliothek', 0),
      ziele: r === 'studierend' ? [['Module und Material', '#/module']] : r === 'lehrend' ? [['Meine Module', '#/kurse']] : [['Inhalte', '#/inhalte']], hinweis: '' },
    studienbuero: r === 'lehrend' ? null : { name: 'Studienbüro', ort: 'Erdgeschoss', geschoss: 0, flaeche: raum('Studienbüro', 0),
      ziele: r === 'studierend' ? [['Meine Anträge', '#/service/antraege'], ['Neuer Antrag', '#/service']] : [['Anträge bearbeiten', '#/antraege']],
      hinweis: r === 'verwaltung' && offeneAntraege() ? `${offeneAntraege()} offen` : '' },
    infotheke: { name: 'Infotheke', ort: 'Foyer, Erdgeschoss', geschoss: 0, flaeche: [3.8, 1.6, 1.4, 26.8, c3y(0) + 0.8, 16.6],
      ziele: r === 'studierend' ? [['Service', '#/service'], ['Lageplan', '#/service/lageplan'], ['Rundgang in 3D', '#/service/lageplan3d']] : [['Suche', '#/suche'], ['Profil', '#/profil']], hinweis: '' },
    briefkasten: { name: 'Briefkasten', ort: 'Vorplatz', geschoss: 'aussen', flaeche: [1.0, 2.0, 0.9, 36.5, 1.0, 23],
      ziele: [['Mitteilungen', '#/mitteilungen'], ...(r === 'verwaltung' ? [['Mitteilung schreiben', '#/nachrichten']] : [])],
      hinweis: un ? `${un} ungelesen` : '' },
    pruefungsamt: { name: r === 'studierend' ? 'Prüfungsamt' : r === 'lehrend' ? 'Prüfungsamt · Korrektur' : 'Prüfungsamt', ort: '2. Obergeschoss, Raum 2.06', geschoss: 2, flaeche: raum('Prüfungsamt', 2),
      ziele: r === 'studierend' ? [['Leistungen', '#/leistungen']] : r === 'lehrend' ? [['Korrektur', '#/korrektur']] : [['Prüfungsamt', '#/pruefungsamt']],
      hinweis: r === 'lehrend' && offeneKorrekturen(u.id) ? `${offeneKorrekturen(u.id)} zu korrigieren` : r === 'verwaltung' ? (n => n ? `${n} zu bestätigen` : '')(db.note.filter(x => x.freigegeben_am && !x.bestaetigt_am).length) : fristBald ? `${plural(fristBald, 'Frist', 'Fristen')} in 3 Tagen` : '' },
    lehrerzimmer: r !== 'lehrend' ? null : { name: 'Dozierendenzimmer', ort: '2. Obergeschoss, Raum 2.20', geschoss: 2, flaeche: raum('Dozierendenzimmer', 2),
      ziele: [['Anwesenheit', '#/anwesenheit'], ['Meine Module', '#/kurse']], hinweis: offenAnw ? `${offenAnw} zu erfassen` : '' },
    verwaltung: r !== 'verwaltung' ? null : { name: 'Verwaltungsbüro', ort: '3. Obergeschoss, Raum 3.03', geschoss: 3, flaeche: raum('Verwaltung', 3),
      ziele: [['Personen & Rollen', '#/personen'], ['Gruppen & Semester', '#/gruppen'], ['Stundenplanung', '#/planung'], ['Evaluationen', '#/evaluationen'], ['Anwesenheit', '#/anwesenheit-uebersicht']], hinweis: '' },
  };
  for (const k of Object.keys(orte)) if (!orte[k]) delete orte[k];
  return { orte, heute, online };
}

function c3Moeglich() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function campusSeite(q) {
  const { orte } = c3Orte(), drei = c3Moeglich();
  const liste = Object.entries(orte).map(([k, o]) => `<li><button class="c3-ortknopf" data-action="c3-ort" data-ort="${k}"><b>${esc(o.name)}</b><span class="klein leise">${esc(o.ort)}</span>${o.hinweis ? `<span class="marke-klein m-akzent">${esc(o.hinweis)}</span>` : ''}</button></li>`).join('');
  if (drei) setTimeout(() => campusStarten(q.get('ort')), 0);
  return `${kopfzeile('Campus in 3D', 'Klicke einen Ort an. Geschosse lassen sich abheben, um hineinzusehen.')}
  ${drei ? `<div class="c3-buehne" id="c3-buehne">
    <canvas id="c3-leinwand" aria-hidden="true"></canvas>
    <div class="c3-stifte" id="c3-stifte"></div>
    <div class="c3-raumname" id="c3-raumname" hidden></div>
    <div class="c3-geschosse" role="group" aria-label="Geschoss wählen">${['Haus', 'EG', '1. OG', '2. OG', '3. OG'].map((t, i) => `<button data-action="c3-geschoss" data-n="${i === 0 ? 4 : i - 1}" aria-pressed="false">${t}</button>`).join('')}</div>
    <div class="c3-tafel" id="c3-tafel" hidden></div>
    <div class="c3-laden" id="c3-laden">Campus wird geladen … <span id="c3-prozent"></span></div>
  </div>` : `<div class="hinweis" style="margin-bottom:14px">${I('info')}<div>Die 3D-Ansicht ist hier ausgeschaltet (Bewegung reduzieren oder kein WebGL). Alle Orte stehen unten als Liste.</div></div>`}
  <section class="karte abstand"><h2>Orte im Campus</h2><ul class="c3-liste">${liste}</ul></section>`;
}

async function campusStarten(startOrt) {
  campusBeenden();
  const leinwand = document.getElementById('c3-leinwand'); if (!leinwand) return;
  // geschoss -1: noch keins gesetzt, damit das erste Setzen (auch per Direktlink) immer greift
  const S = C3; S.laeuft = true; S.geschoss = -1; S.lauf = Symbol('lauf'); const lauf = S.lauf;
  const prozent = document.getElementById('c3-prozent');
  let THREE, OrbitControls, GLTFLoader, DRACOLoader, RoomEnvironment, mergeGeometries;
  try {
    THREE = await import('three');
    [{ OrbitControls }, { GLTFLoader }, { DRACOLoader }, { RoomEnvironment }, { mergeGeometries }] = await Promise.all([
      import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'), import('three/addons/environments/RoomEnvironment.js'),
      import('three/addons/utils/BufferGeometryUtils.js')]);
  } catch (e) { console.error(e); c3Fehler('3D-Bibliothek nicht erreichbar. Bitte Internetverbindung prüfen.'); return; }
  if (S.lauf !== lauf) return;
  S.THREE = THREE;
  // Diffuses Licht steckt in den Lichtkarten; die Umgebung liefert nur Spiegelungen
  if (!THREE.ShaderChunk.__c3) { THREE.ShaderChunk.lights_fragment_maps = THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );', ''); THREE.ShaderChunk.__c3 = true; }

  const renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
  const szene = new THREE.Scene();
  szene.background = new THREE.Color(0xbcd3e6); szene.fog = new THREE.Fog(0xbcd3e6, 140, 320);
  const pmrem = new THREE.PMREMGenerator(renderer);
  szene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; szene.environmentIntensity = 0.35;
  const kamera = new THREE.PerspectiveCamera(36, 1, 0.3, 600);
  const steuer = new OrbitControls(kamera, leinwand);
  steuer.enableDamping = true; steuer.dampingFactor = 0.08; steuer.minDistance = 6; steuer.maxDistance = 150;
  steuer.maxPolarAngle = 1.38; steuer.screenSpacePanning = false;
  steuer.zoomSpeed = 2.4; steuer.rotateSpeed = 0.8; steuer.panSpeed = 1.2;
  // Eigene Bewegung hat Vorrang: eine laufende Kamerafahrt bricht sofort ab
  steuer.addEventListener('start', () => { C3.flug = null; C3.intro = false; });
  leinwand.addEventListener('wheel', () => { C3.flug = null; C3.intro = false; }, { passive: true });
  Object.assign(S, { renderer, szene, kamera, steuer });

  // Modell und Lichtkarten laden; Fortschritt aus den Bytes des GLB
  const lader = new THREE.TextureLoader(), draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const gl = new GLTFLoader().setDRACOLoader(draco);
  const stand = C3_STAND;
  let gltf;
  try {
    gltf = await gl.loadAsync(C3_ORDNER + 'campus.glb' + stand, e => { if (e.total && prozent) prozent.textContent = Math.round(e.loaded / e.total * 100) + ' %'; });
  } catch (e) { console.error(e); c3Fehler('Das 3D-Modell konnte nicht geladen werden.'); return; }
  if (S.lauf !== lauf) return;
  const namen = new Set(); gltf.scene.traverse(o => { if (o.isMesh) namen.add(c3Einheit(o, gltf.scene)); });
  const karten = {};
  await Promise.all([...namen].filter(n => !/^(laub|fenster|m\d)/.test(n)).map(async n => {
    try {
      const t = await lader.loadAsync(`${C3_ORDNER}licht_${n}.jpg${stand}`);
      t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.channel = 1; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      karten[n] = t;
    } catch { /* Einheit ohne Lichtkarte */ }
  }));
  if (S.lauf !== lauf) return;

  // Anzeigetafel als Leinwand, die live die Termine von heute zeigt
  const tafelBild = document.createElement('canvas'); tafelBild.width = 1280; tafelBild.height = 720;
  const tafelT = new THREE.CanvasTexture(tafelBild); tafelT.colorSpace = THREE.SRGBColorSpace; tafelT.flipY = false;
  S.tafelBild = tafelBild; S.tafelT = tafelT;

  S.einheiten = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const name = c3Einheit(o, gltf.scene), alt = o.material;
    (S.einheiten[name] ||= []).push(o);
    for (const k of ['map', 'normalMap', 'roughnessMap']) if (alt[k]) alt[k].anisotropy = 8;
    if (name.startsWith('fenster')) o.material = new THREE.MeshPhysicalMaterial({ color: 0x9fb4bd, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.3, envMapIntensity: 1.6, depthWrite: false });
    else if (name === 'anzeige') o.material = new THREE.MeshBasicMaterial({ map: tafelT, toneMapped: false });
    else if (o.geometry.attributes.color) o.material = new THREE.MeshBasicMaterial({ map: alt.map, color: new THREE.Color(alt.color).multiplyScalar(C3_TEILER), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
    else if (karten[name]) {
      const m = alt.clone(); m.lightMap = karten[name]; m.lightMapIntensity = C3_TEILER * Math.PI; m.side = THREE.FrontSide;
      if (m.emissiveMap) m.emissiveIntensity = 0.6;
      o.material = m;
    }
  });
  szene.add(gltf.scene);
  // Hintergrundgelände bis zum Horizont, damit der Rand des Modells nicht sichtbar wird
  const weit = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshBasicMaterial({ color: 0x8aa86a }));
  weit.rotation.x = -Math.PI / 2; weit.position.set(30, -0.05, 10); szene.add(weit);
  // Menschen (campus3d-menschen.js): je Geschoss eine Gruppe, die wie die Möbel mit abhebt
  if (typeof c3Menschen === 'function') {
    S.menschen = c3Menschen(THREE, mergeGeometries);
    for (const [n, g] of Object.entries(S.menschen.gruppen)) { szene.add(g); S.einheiten[n] = [g]; }
  }

  // Ausgangslage je Einheit für das Abheben der Geschosse
  S.basisY = {}; for (const [n, liste] of Object.entries(S.einheiten)) S.basisY[n] = liste[0].position.y;

  // Hörsaaltür leuchtet bei laufender Online-Vorlesung
  const tuer = c3Raum('Hörsaal A');
  S.leuchte = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.3, 0.22), new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.0, toneMapped: false }));
  S.leuchte.position.set(tuer.r.tuer, c3y(0) + 1.15, 7.92); szene.add(S.leuchte);

  // Klickflächen, Rahmen, Stifte
  S.treffer = []; S.orte = {};
  S.rahmen = new THREE.LineBasicMaterial({ color: 0x7c3aed });
  S.strahl = new THREE.Raycaster(); S.zeiger = new THREE.Vector2();
  c3OrteAufbauen();
  const ro = new ResizeObserver(() => c3Groesse()); ro.observe(leinwand.parentElement); S.ro = ro; c3Groesse();

  // Zeigen und Klicken
  let runter = null;
  leinwand.addEventListener('pointerdown', e => { runter = [e.clientX, e.clientY]; });
  leinwand.addEventListener('pointermove', e => { const k = c3OrtAm(e); c3Hover(k); leinwand.style.cursor = k ? 'pointer' : ''; if (e.pointerType === 'mouse') c3RaumZeigen(k ? null : e); });
  leinwand.addEventListener('pointerleave', () => c3RaumZeigen(null));
  leinwand.addEventListener('pointerup', e => {
    if (runter && Math.hypot(e.clientX - runter[0], e.clientY - runter[1]) < 6) {
      const k = c3OrtAm(e);
      if (k) c3Oeffnen(k);
      else if (e.pointerType !== 'mouse') { c3RaumZeigen(e); clearTimeout(S.raumUhr); S.raumUhr = setTimeout(() => c3RaumZeigen(null), 2200); }  // Touch: Name kurz zeigen
    }
    runter = null;
  });
  S.taste = e => { if (!C3.laeuft || e.target.closest('input, textarea')) return; if (/^[0-3]$/.test(e.key)) c3Geschoss(Number(e.key)); if (e.key === 'h' || e.key === 'H') c3Geschoss(4); if (e.key === 'Escape') c3TafelZu(); };
  document.addEventListener('keydown', S.taste);

  c3Anzeige();
  const lade = document.getElementById('c3-laden'); if (lade) lade.hidden = true;
  if (startOrt && S.orte[startOrt]) c3Oeffnen(startOrt, true);
  else if (!sessionStorage.getItem('c3-intro')) {
    // Ankommen: von der Straße auf das Haus zu, dann heben die oberen Geschosse ab. Einmal je Sitzung.
    try { sessionStorage.setItem('c3-intro', '1'); } catch { /* privates Fenster */ }
    c3Geschoss(4, true); kamera.position.set(30.5, 1.9, 78); steuer.target.set(30, 6, 20); S.intro = true;
    c3Fahren([68, 40, 64], [30, 1, 9], { dauer: 3600, mitte: [76, 9, 74], fertig: () => { S.intro = false; c3Geschoss(0); } });
  } else { c3Geschoss(0, true); kamera.position.set(68, 40, 64); steuer.target.set(30, 1, 9); }

  // Bildrate messen (für die Gegenprobe), Schleife
  let letzte = performance.now(), bilder = 0, fensterStart = letzte;
  renderer.setAnimationLoop(t => {
    if (!C3.laeuft) return;
    const dt = Math.min(0.05, (t - letzte) / 1000); letzte = t; bilder++;
    if (t - fensterStart > 1000) { window.__campusFps = Math.round(bilder * 1000 / (t - fensterStart)); bilder = 0; fensterStart = t; }
    c3Animieren(dt, t); steuer.update(); renderer.render(szene, kamera); c3StifteSetzen();
  });
}

function c3Einheit(o, wurzel) { let p = o; while (p && p.parent !== wurzel) p = p.parent; return (p?.name || o.name).replace(/\.\d+$/, '').replace(/_\d+$/, ''); }
function c3Fehler(text) { const l = document.getElementById('c3-laden'); if (l) { l.hidden = false; l.textContent = text; } }

function c3OrteAufbauen() {
  const S = C3, THREE = S.THREE, { orte } = c3Orte();
  for (const o of Object.values(S.orte)) { S.szene.remove(o.hit); S.szene.remove(o.linie); o.stift?.remove(); }
  S.treffer = []; S.orte = {};
  const stifte = document.getElementById('c3-stifte'); if (!stifte) return;
  for (const [k, o] of Object.entries(orte)) {
    const [b, h, t, x, y, z] = o.flaeche;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(x, y, z); hit.userData.ort = k; S.szene.add(hit); S.treffer.push(hit);
    const linie = new THREE.LineSegments(new THREE.EdgesGeometry(hit.geometry), S.rahmen); linie.position.copy(hit.position); linie.visible = false; S.szene.add(linie);
    const stift = document.createElement('button'); stift.type = 'button'; stift.className = 'c3-stift'; stift.tabIndex = -1; stift.setAttribute('aria-hidden', 'true');
    stift.innerHTML = `<span>${esc(o.name)}</span>${o.hinweis ? `<em>${esc(o.hinweis)}</em>` : ''}`;
    stift.addEventListener('click', () => c3Oeffnen(k));
    stift.addEventListener('pointerenter', () => c3Hover(k)); stift.addEventListener('pointerleave', () => c3Hover(null));
    stifte.append(stift);
    S.orte[k] = { ...o, hit, linie, stift, anker: new THREE.Vector3(x, y + h / 2 + 0.6, z) };
  }
  if (S.leuchte) S.leuchtet = !!orte.hoersaal?.leuchtet;
}

function c3Groesse() {
  const S = C3, el = document.getElementById('c3-leinwand'); if (!el || !S.renderer) return;
  const w = el.parentElement.clientWidth, h = el.parentElement.clientHeight;
  S.renderer.setSize(w, h, false); S.kamera.aspect = w / h; S.kamera.updateProjectionMatrix();
}

function c3OrtAm(e) {
  const S = C3, r = e.target.getBoundingClientRect();
  S.zeiger.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  S.strahl.setFromCamera(S.zeiger, S.kamera);
  const sichtbar = S.treffer.filter(h => c3OrtSichtbar(S.orte[h.userData.ort]));
  return S.strahl.intersectObjects(sichtbar, false)[0]?.object.userData.ort || null;
}
const c3OrtSichtbar = o => o && (o.geschoss === 'aussen' || C3.geschoss === 4 || o.geschoss === C3.geschoss);
// Raumname unter dem Zeiger: Strahl gegen die Bodenebene des sichtbaren Geschosses, Raum aus GEBAEUDE
function c3RaumAm(e) {
  const S = C3, THREE = S.THREE, g = S.geschoss; if (g < 0 || g > 3) return null;
  const r = e.target.getBoundingClientRect ? S.renderer.domElement.getBoundingClientRect() : null; if (!r) return null;
  S.zeiger.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  S.strahl.setFromCamera(S.zeiger, S.kamera);
  const p = new THREE.Vector3(); if (!S.strahl.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -c3y(g)), p)) return null;
  const G = GEBAEUDE, x = p.x, z = p.z; if (x < 0 || x > G.breite || z < 0 || z > G.tiefe) return null;
  const r_ = G.geschosse[g].raeume.find(q => { const b = raumBereich(q); return x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2; });
  if (r_) return { name: r_.name, b: raumBereich(r_), g };
  if (z >= G.flur[0] && z <= G.flur[1]) return { name: 'Flur', b: { x1: 0, x2: G.breite, z1: G.flur[0], z2: G.flur[1] }, g };
  const k = G.kern; if (x >= k.x1 && x <= k.x2 && z <= k.z2) return { name: 'Treppenhaus und Aufzug', b: { x1: k.x1, x2: k.x2, z1: k.z1, z2: k.z2 }, g };
  return null;
}
function c3RaumZeigen(e) {
  const S = C3, schild = document.getElementById('c3-raumname'); if (!schild || !S.THREE) return;
  const raum = e ? c3RaumAm(e) : null;
  if (!S.raumRahmen) {
    // Halbdurchsichtige Bodenfläche statt Linie: WebGL zeichnet Linien nur ein Pixel breit
    S.raumRahmen = new S.THREE.Mesh(new S.THREE.PlaneGeometry(1, 1), new S.THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }));
    S.raumRahmen.rotation.x = -Math.PI / 2; S.raumRahmen.renderOrder = 5; S.szene.add(S.raumRahmen);
  }
  if (!raum) { schild.hidden = true; S.raumRahmen.visible = false; S.raumAktuell = null; return; }
  const r = S.renderer.domElement.getBoundingClientRect();
  schild.hidden = false; schild.textContent = raum.name;
  schild.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
  const schluessel = raum.g + raum.name;
  if (S.raumAktuell !== schluessel) {
    const { x1, x2, z1, z2 } = raum.b, y = c3y(raum.g) + 0.03;
    S.raumRahmen.scale.set(x2 - x1, z2 - z1, 1); S.raumRahmen.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    S.raumAktuell = schluessel;
  }
  S.raumRahmen.visible = true;
}
function c3Hover(k) { for (const [key, o] of Object.entries(C3.orte)) { o.linie.visible = key === k && c3OrtSichtbar(o); o.stift.classList.toggle('aktiv', key === k); } }

function c3StifteSetzen() {
  const S = C3, el = document.getElementById('c3-leinwand'); if (!el) return;
  const w = el.clientWidth, h = el.clientHeight, v = new S.THREE.Vector3();
  for (const o of Object.values(S.orte)) {
    v.copy(o.anker).project(S.kamera);
    const zeigen = !S.intro && c3OrtSichtbar(o) && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
    o.stift.style.display = zeigen ? '' : 'none';
    if (zeigen) o.stift.style.transform = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px)`;
  }
}

// Geschoss wählen: alles darüber hebt ab und verschwindet; 4 = ganzes Haus mit Dach
function c3Geschoss(n, sofort = false) {
  const S = C3; S.geschoss = n;
  document.querySelectorAll('[data-action="c3-geschoss"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.n) === n)));
  S.ziele = {};
  for (const name of Object.keys(S.einheiten)) {
    const t = /^(g|m|laub|fenster|leute)(\d)$/.exec(name), ueber = name === 'dach' ? n < 4 : t ? Number(t[2]) > n : false;
    S.ziele[name] = ueber ? 24 : 0;
    if (sofort) for (const o of S.einheiten[name]) { o.position.y = S.basisY[name] + S.ziele[name]; o.visible = !ueber; }
    else if (!ueber) for (const o of S.einheiten[name]) o.visible = true;
  }
  c3Hover(null); if (S.raumRahmen) S.raumRahmen.visible = false;
}

function c3Animieren(dt, t) {
  const S = C3;
  for (const [name, ziel] of Object.entries(S.ziele || {})) {
    for (const o of S.einheiten[name]) {
      const soll = S.basisY[name] + ziel, d = soll - o.position.y;
      if (Math.abs(d) > 0.01) o.position.y += d * Math.min(1, dt * 7);
      else o.position.y = soll;
      if (ziel > 0 && o.position.y - S.basisY[name] > ziel - 1) o.visible = false;
    }
  }
  if (S.flug) {
    const f = S.flug, p = Math.min(1, (performance.now() - f.start) / f.dauer), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    if (f.mitte) {  // Bogen statt gerader Linie (quadratische Bézierkurve)
      const a = (1 - e) ** 2, b = 2 * (1 - e) * e, c = e * e;
      S.kamera.position.set(a * f.von.x + b * f.mitte.x + c * f.nach.x, a * f.von.y + b * f.mitte.y + c * f.nach.y, a * f.von.z + b * f.mitte.z + c * f.nach.z);
    } else S.kamera.position.lerpVectors(f.von, f.nach, e);
    S.steuer.target.lerpVectors(f.vonZ, f.nachZ, e);
    if (p >= 1) { S.flug = null; f.fertig?.(); }
  }
  S.menschen?.tick(dt);
  S.leuchte.material.opacity = S.leuchtet && S.geschoss === 0 ? 0.45 + 0.35 * Math.sin(t / 380) : 0;
}

function c3Fahren(pos, ziel, { dauer = 850, mitte = null, fertig = null } = {}) {
  const S = C3, THREE = S.THREE;
  S.flug = { von: S.kamera.position.clone(), nach: new THREE.Vector3(...pos), vonZ: S.steuer.target.clone(), nachZ: new THREE.Vector3(...ziel), start: performance.now(), dauer, mitte: mitte && new THREE.Vector3(...mitte), fertig };
}

function c3Oeffnen(k, sofort = false) {
  const S = C3, o = S.orte[k]; if (!o) return;
  S.intro = false;
  const n = o.geschoss === 'aussen' ? Math.max(0, S.geschoss) : o.geschoss;
  if (n !== S.geschoss) c3Geschoss(n, sofort);
  // Blick steil von schräg oben (rund 58°), Abstand nach Raumgröße: so sieht man den ganzen Raum und nicht die Fassade darunter
  const [b, , t, x, y, z] = o.flaeche, boden = y - 1.2;
  const abstand = o.geschoss === 'aussen' ? 14 : Math.min(42, Math.max(20, Math.max(b, t * 2) * 1.25 + 6));
  const neig = 1.0, hor = abstand * Math.cos(neig), richtung = [0.34, 0.94];
  const pos = [x + richtung[0] * hor, boden + abstand * Math.sin(neig), z + richtung[1] * hor], ziel = [x, boden, z];
  if (sofort) { S.kamera.position.set(...pos); S.steuer.target.set(...ziel); } else c3Fahren(pos, ziel);
  const tafel = document.getElementById('c3-tafel'); if (!tafel) return;
  tafel.hidden = false;
  tafel.innerHTML = `<div class="zeile dazwischen"><div><b>${esc(o.name)}</b><br><span class="klein leise">${esc(o.ort)}</span></div><button class="knopf klein" data-action="c3-zu" aria-label="Schließen">✕</button></div>
    ${o.hinweis ? `<p class="abstand"><span class="marke-klein m-akzent">${esc(o.hinweis)}</span></p>` : ''}
    <div class="c3-ziele">${o.ziele.map(([text, ziel], i) => `<a class="knopf ${i ? '' : 'primaer'}" href="${ziel}">${esc(text)}</a>`).join('')}</div>`;
  tafel.querySelector('a')?.focus({ preventScroll: true });
}
function c3TafelZu() { const t = document.getElementById('c3-tafel'); if (t) t.hidden = true; }

// Anzeigetafel im Foyer: Termine von heute, wie auf der Übersicht
function c3Anzeige() {
  const S = C3; if (!S.tafelBild) return;
  const g = S.tafelBild.getContext('2d'), { heute } = c3Orte();
  g.fillStyle = '#14111f'; g.fillRect(0, 0, 1280, 720);
  g.fillStyle = '#7c3aed'; g.beginPath(); g.roundRect(70, 60, 90, 90, 20); g.fill();
  g.fillStyle = '#fff'; g.font = '800 40px -apple-system, Helvetica, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OC', 115, 106);
  g.textAlign = 'left'; g.font = '800 62px -apple-system, Helvetica, Arial'; g.fillText('Heute im Campus', 190, 106);
  g.font = '500 30px -apple-system, Helvetica, Arial'; g.fillStyle = '#a78bfa'; g.fillText(fmtLang(new Date()), 190, 160);
  g.font = '600 40px -apple-system, Helvetica, Arial';
  if (!heute.length) { g.fillStyle = '#ddd6fe'; g.fillText('Heute keine Termine mehr.', 70, 290); }
  heute.slice(0, 6).forEach((t, i) => {
    const y = 270 + i * 72;
    g.fillStyle = '#a78bfa'; g.fillText(fmtZeit(t.beginn), 70, y);
    g.fillStyle = '#fff'; g.fillText(kursName(t.kurs_id).slice(0, 34), 220, y);
    g.fillStyle = '#c4b5fd'; g.textAlign = 'right'; g.fillText(t.raum_id ? raumName(t) : 'Online', 1210, y); g.textAlign = 'left';
  });
  S.tafelT.needsUpdate = true;
}

// Von der Echtzeit-Synchronisierung aufgerufen: Hinweise und Anzeige neu, Szene bleibt stehen
function campusAktualisieren() {
  if (!C3.laeuft) return false;
  c3OrteAufbauen(); c3Anzeige(); c3Geschoss(C3.geschoss, true);
  const liste = document.querySelector('.c3-liste');
  if (liste) liste.innerHTML = Object.entries(c3Orte().orte).map(([k, o]) => `<li><button class="c3-ortknopf" data-action="c3-ort" data-ort="${k}"><b>${esc(o.name)}</b><span class="klein leise">${esc(o.ort)}</span>${o.hinweis ? `<span class="marke-klein m-akzent">${esc(o.hinweis)}</span>` : ''}</button></li>`).join('');
  return true;
}

function campusBeenden() {
  const S = C3; if (!S.renderer) { S.laeuft = false; return; }
  S.laeuft = false; S.lauf = null;
  S.renderer.setAnimationLoop(null); S.ro?.disconnect(); document.removeEventListener('keydown', S.taste);
  S.szene.traverse(o => { o.geometry?.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { for (const k of ['map', 'lightMap', 'normalMap', 'roughnessMap']) x[k]?.dispose(); x.dispose(); }); });
  S.renderer.dispose(); S.renderer = null; S.menschen = null; S.orte = {}; S.einheiten = {}; S.raumRahmen = null; S.raumAktuell = null;
}

AKTIONEN['c3-geschoss'] = el => c3Geschoss(Number(el.dataset.n));
AKTIONEN['c3-zu'] = () => c3TafelZu();
AKTIONEN['c3-ort'] = el => {
  if (C3.laeuft && C3.orte[el.dataset.ort]) { document.getElementById('c3-buehne')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); c3Oeffnen(el.dataset.ort); return; }
  const o = c3Orte().orte[el.dataset.ort]; if (o) location.hash = o.ziele[0][1];
};
// Vorladen, sobald jemand den Weg in den Campus ansteuert (Zeiger, Finger, Tastatur): Modell und Lichtkarten
// liegen dann schon im Browser-Speicher, wenn die Seite öffnet. Nicht bei "Datensparen".
function campusVorladen() {
  if (C3.vorgeladen || navigator.connection?.saveData || !c3Moeglich()) return;
  C3.vorgeladen = true;
  import('three').catch(() => {});
  for (const d of C3_DATEIEN) fetch(C3_ORDNER + d + C3_STAND, { priority: 'low' }).catch(() => {});
}
for (const art of ['pointerover', 'touchstart', 'focusin']) document.addEventListener(art, e => { if (e.target.closest?.('a[href^="#/campus"]')) campusVorladen(); }, { passive: true });
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/campus')) campusBeenden(); });
