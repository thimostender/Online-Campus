'use strict';
// Menschen im 3D-Campus: aus Grundformen gebaut wie im Sportheim von Kassencapitano (freie Menschenmodelle in
// brauchbarer Qualität gibt es nicht). Die Plätze folgen den Möbeln aus 3d/bauen.py: wer sitzt, sitzt auf einem
// echten Stuhl. Sitzende und Stehende sind je Geschoss zu einem Netz verschmolzen, nur wenige laufen.
// Gruppen leute0 bis leute3 heben mit ihrem Geschoss ab, leuteA (Vorplatz) bleibt immer sichtbar.

function c3Menschen(THREE, verschmelzen) {
  // Fester Zufall: bei jedem Laden sitzen dieselben Leute an denselben Plätzen
  let saat = 20261102;
  const zufall = () => { saat = (saat + 0x6d2b79f5) | 0; let t = Math.imul(saat ^ (saat >>> 15), 1 | saat); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rund = (a, b) => a + zufall() * (b - a), dreh = l => l[Math.floor(zufall() * l.length)], ja = p => zufall() < p;
  const HAUT = [0xf1c6a5, 0xe0ac86, 0xc68a62, 0x9b6440, 0x6e4529, 0xf5d2b8];
  const HAAR = [0x2a1d14, 0x4a3020, 0x7a5532, 0x1a1a1a, 0xb38b5a, 0xc9a26b, 0x8c8c8c];
  const OBEN = [0x7c3aed, 0x2f5a46, 0xb33a3a, 0xd9a441, 0x3b6ea8, 0xe8e4da, 0x22252a, 0x5e6b7a, 0x8a5a2b, 0xf2f0ea, 0x1f2a44, 0x9c4f7a];
  const HOSE = [0x2c3e5c, 0x22252a, 0x4a4f55, 0x3a3226, 0x2b3a52, 0x6b5b45];
  const GH = 3.6, boden = n => n === 'A' ? 0 : n * GH + 0.3;

  // Licht: Himmel von oben, eine Hauptrichtung; drinnen gedämpfter als draußen
  const material = (luft, sonne) => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true }), richtung = new THREE.Vector3(0.45, 0.8, 0.4).normalize();
    m.userData = { luft: { value: new THREE.Vector3(...luft) }, sonneF: { value: new THREE.Vector3(...sonne) }, tag: [luft, sonne] };
    m.onBeforeCompile = s => {
      Object.assign(s.uniforms, { sonneR: { value: richtung }, luft: m.userData.luft, sonneF: m.userData.sonneF });
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vNw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvNw = normalize(mat3(modelMatrix) * normal);');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vNw; uniform vec3 sonneR, luft, sonneF;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 nw = normalize(vNw); diffuseColor.rgb *= luft * (0.72 + 0.28 * nw.y) + sonneF * max(dot(nw, sonneR), 0.0);');
    };
    return m;
  };
  const innen = material([0.86, 0.84, 0.82], [0.34, 0.32, 0.29]), aussen = material([0.62, 0.68, 0.78], [0.78, 0.72, 0.6]);

  function farbig(geo, farbe) {
    const g = geo.index ? geo.toNonIndexed() : geo, c = new THREE.Color(farbe), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g;
  }
  const kapsel = (r, l) => new THREE.CapsuleGeometry(r, l, 1, 6);
  const teile = liste => verschmelzen(liste.map(([geo, farbe, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1]) => farbig(geo.clone().scale(sx, sy, sz).translate(x, y, z), farbe)));

  // Eine Figur: Ursprung in der Hüfte, Blick nach +z; Gelenke als Gruppen, damit sie sitzen und laufen kann
  function figur(mat, t) {
    const g = new THREE.Group(), m = geo => new THREE.Mesh(geo, mat);
    const rumpf = [
      [new THREE.CylinderGeometry(0.15, 0.16, 0.24, 9), t.unten, 0, -0.04, 0, 1.05, 1, 0.8],
      [kapsel(0.17, 0.34), t.oben, 0, 0.32, 0, 1.12, 1, 0.72],
      [new THREE.SphereGeometry(0.075, 6, 4), t.oben, -0.2, 0.5, 0], [new THREE.SphereGeometry(0.075, 6, 4), t.oben, 0.2, 0.5, 0],
      [new THREE.CylinderGeometry(0.05, 0.055, 0.1, 6), t.haut, 0, 0.6, 0],
      [new THREE.SphereGeometry(0.112, 10, 7), t.haut, 0, 0.76, 0.005, 0.9, 1.08, 0.96],
      [new THREE.SphereGeometry(0.118, 10, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), t.haar, 0, 0.78, -0.01, 0.92, 1.05, 1],
    ];
    if (t.zopf) rumpf.push([new THREE.SphereGeometry(0.075, 8, 6), t.haar, 0, 0.7, -0.11, 0.9, 1.5, 0.8]);
    if (t.rucksack) rumpf.push([new THREE.BoxGeometry(0.27, 0.34, 0.13), t.rucksack, 0, 0.3, -0.19]);
    g.add(m(teile(rumpf)));
    const glied = (x, y, ober, unter, ende, endeY, endeFarbe) => {
      const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p);
      p.add(m(teile([[kapsel(ober[0], ober[1]), ober[2], 0, -ober[1] / 2 - ober[0] * 0.6, 0]])));
      const k = new THREE.Group(); k.position.y = -(ober[1] + ober[0] * 1.2); p.add(k);
      k.add(m(teile([[kapsel(unter[0], unter[1]), unter[2], 0, -unter[1] / 2 - unter[0] * 0.6, 0], [ende, endeFarbe, 0, endeY, ende.parameters?.depth ? 0.04 : 0]])));
      return [p, k];
    };
    const hand = () => new THREE.SphereGeometry(0.05, 6, 4), schuh = () => new THREE.BoxGeometry(0.1, 0.08, 0.25);
    const [armL, ellL] = glied(-0.215, 0.49, [0.05, 0.22, t.oben], [0.044, 0.2, t.kurz ? t.haut : t.oben], hand(), -0.285, t.haut);
    const [armR, ellR] = glied(0.215, 0.49, [0.05, 0.22, t.oben], [0.044, 0.2, t.kurz ? t.haut : t.oben], hand(), -0.285, t.haut);
    const [beinL, knieL] = glied(-0.09, -0.08, [0.074, 0.3, t.unten], [0.06, 0.3, t.unten], schuh(), -0.405, t.schuh);
    const [beinR, knieR] = glied(0.09, -0.08, [0.074, 0.3, t.unten], [0.06, 0.3, t.unten], schuh(), -0.405, t.schuh);
    armL.rotation.z = -0.08; armR.rotation.z = 0.08; ellL.rotation.x = ellR.rotation.x = -0.15;
    g.scale.setScalar(t.s);
    return { g, armL, armR, ellL, ellR, beinL, beinR, knieL, knieR, hoehe: 0.93 * t.s };
  }
  const typ = (extra = {}) => ({ s: rund(0.93, 1.06), haut: dreh(HAUT), haar: dreh(HAAR), oben: dreh(OBEN), unten: dreh(HOSE), schuh: dreh([0x1b1c1e, 0xe8e8e8, 0x6b4a2e, 0x2b2f36]), zopf: ja(0.35), kurz: ja(0.15), ...extra });
  const personal = () => typ({ oben: dreh([0x1f2a44, 0x3c4146, 0xf2f0ea, 0x5e6b7a, 0x22252a]), unten: dreh([0x22252a, 0x2c3e5c, 0x4a4f55]), kurz: false, rucksack: null });
  function laufen(f, phase, staerke) {
    const a = Math.sin(phase) * staerke;
    f.beinL.rotation.x = a; f.beinR.rotation.x = -a;
    f.knieL.rotation.x = Math.max(0, -Math.sin(phase)) * staerke * 1.6; f.knieR.rotation.x = Math.max(0, Math.sin(phase)) * staerke * 1.6;
    f.armL.rotation.x = -a * 0.8; f.armR.rotation.x = a * 0.8; f.ellL.rotation.x = f.ellR.rotation.x = -0.15 - staerke * 1.1;
  }

  // Bodenschatten als weicher Fleck
  const schattenT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), v = x.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, 'rgba(0,0,0,.42)'); v.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = v; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const schattenMat = new THREE.MeshBasicMaterial({ map: schattenT, transparent: true, depthWrite: false });
  const schattenGeo = new THREE.PlaneGeometry(0.85, 0.85).rotateX(-Math.PI / 2);

  const gruppen = {}, ruhend = {}, ticks = [];
  for (const k of ['leute0', 'leute1', 'leute2', 'leute3', 'leuteA']) { gruppen[k] = new THREE.Group(); gruppen[k].name = k; ruhend[k] = { geos: [], flecken: [] }; }
  const ziel = n => n === 'A' ? 'leuteA' : 'leute' + n;
  const matVon = n => n === 'A' ? aussen : innen;
  // Blickrichtung wie in bauen.py: 0 = Norden (-z), -π/2 = Westen; Figur schaut von Haus aus nach +z
  const drehung = blick => Math.PI - blick;
  const richtung = blick => [Math.sin(blick), -Math.cos(blick)];
  const ablegen = (n, obj) => { obj.updateMatrixWorld(true); obj.traverse(o => { if (o.isMesh) ruhend[ziel(n)].geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld)); }); };

  // Kleine Dinge auf dem Tisch, im Blick der Person
  const laptopGeo = teile([[new THREE.BoxGeometry(0.32, 0.016, 0.22), 0x3a3d42, 0, 0.008, 0], [new THREE.BoxGeometry(0.32, 0.21, 0.012), 0x2b2e33, 0, 0.11, 0.115], [new THREE.BoxGeometry(0.29, 0.18, 0.004), 0xa9c1e2, 0, 0.11, 0.108]]);
  const tasseGeo = teile([[new THREE.CylinderGeometry(0.04, 0.035, 0.09, 10), 0xf4f1ea, 0, 0.045, 0]]);
  const heftGeo = teile([[new THREE.BoxGeometry(0.21, 0.012, 0.29), dreh([0xf4f1ea, 0xe7d9b8]), 0, 0.006, 0]]);
  const ding = (n, geo, x, y, z, ry) => { const m = new THREE.Mesh(geo, matVon(n)); m.position.set(x, y, z); m.rotation.y = ry; ablegen(n, m); };

  function sitzt(n, x, z, blick, { sitzH = 0.47, tisch = null, abstand = 0.45, t = typ({ rucksack: null }) } = {}) {
    const f = figur(matVon(n), t), [dx, dz] = richtung(blick);
    f.beinL.rotation.x = f.beinR.rotation.x = -1.5; f.knieL.rotation.x = f.knieR.rotation.x = 1.45;
    if (tisch) { f.armL.rotation.x = f.armR.rotation.x = -0.5; f.ellL.rotation.x = f.ellR.rotation.x = -1.0; }
    else { f.armL.rotation.x = f.armR.rotation.x = -0.12; f.ellL.rotation.x = f.ellR.rotation.x = -1.3; }
    f.armL.rotation.z = -0.15; f.armR.rotation.z = 0.15;
    // etwas zurück zur Lehne, damit die Knie nicht im Tisch stecken
    f.g.position.set(x - dx * 0.06, boden(n) + sitzH, z - dz * 0.06); f.g.rotation.y = drehung(blick) + rund(-0.12, 0.12);
    ablegen(n, f.g);
    if (tisch) {
      const r = zufall(), px = x + dx * abstand, pz = z + dz * abstand, y = boden(n) + tisch;
      if (r < 0.55) ding(n, laptopGeo, px, y, pz, drehung(blick) + rund(-0.15, 0.15));
      else if (r < 0.8) ding(n, heftGeo, px, y, pz, drehung(blick) + rund(-0.4, 0.4));
      if (ja(0.3)) ding(n, tasseGeo, px + dz * 0.3, y, pz - dx * 0.3, 0);
    }
  }
  function steht(n, x, z, blick, t = typ(), geste = 0) {
    const f = figur(matVon(n), t);
    f.armL.rotation.x = rund(-0.2, 0.15); f.armR.rotation.x = rund(-0.2, 0.15);
    if (geste === 1) { f.armR.rotation.x = -1.0; f.ellR.rotation.x = -1.2; }                   // erklärt etwas
    if (geste === 2) { f.armR.rotation.x = -0.5; f.ellR.rotation.x = -1.6; f.armR.rotation.z = 0.4; } // Handy am Ohr
    f.g.position.set(x, (n === 'A' ? 0.01 : boden(n)) + f.hoehe, z); f.g.rotation.y = blick;
    ablegen(n, f.g); ruhend[ziel(n)].flecken.push([x, n === 'A' ? 0.02 : boden(n) + 0.012, z]);
  }
  const zu = (x, z, zx, zz) => Math.atan2(zx - x, zz - z);

  // Läufer: folgen einer Strecke hin und her (oder im Kreis), bleiben an den Enden kurz stehen
  function laeufer(n, strecke, { tempo = 1.25, rund_ = false, warten = 2.5, t = typ({ rucksack: ja(0.6) ? dreh([0x22252a, 0x7c3aed, 0x2f5a46, 0x8a5a2b, 0x3b6ea8]) : null }) } = {}) {
    const f = figur(matVon(n), t), y0 = (n === 'A' ? 0.01 : boden(n)) + f.hoehe;
    const fleck = new THREE.Mesh(schattenGeo, schattenMat); fleck.renderOrder = 1; gruppen[ziel(n)].add(fleck);
    gruppen[ziel(n)].add(f.g); f.g.position.set(strecke[0][0], y0, strecke[0][1]);
    let i = 1, schritt = 1, pause = rund(0, warten), phase = 0;
    ticks.push(dt => {
      if (pause > 0) { pause -= dt; laufen(f, 0, 0); }
      else {
        const [zx, zz] = strecke[i], dx = zx - f.g.position.x, dz = zz - f.g.position.z, d = Math.hypot(dx, dz), v = Math.min(tempo * dt, d);
        if (d > 0.01) {
          f.g.position.x += dx / d * v; f.g.position.z += dz / d * v;
          let u = Math.atan2(dx, dz) - f.g.rotation.y; u = Math.atan2(Math.sin(u), Math.cos(u)); f.g.rotation.y += u * Math.min(1, dt * 7);
          phase += dt * 6.4 * tempo / 1.25; laufen(f, phase, 0.34);
        }
        if (d < 0.05) {
          if (rund_) i = (i + 1) % strecke.length;
          else { if (i + schritt < 0 || i + schritt >= strecke.length) { schritt = -schritt; pause = warten; } i += schritt; }
        }
      }
      fleck.position.set(f.g.position.x, (n === 'A' ? 0.02 : boden(n) + 0.012), f.g.position.z);
    });
  }

  // --- Räume nach Art, Plätze wie in bauen.py -----------------------------------------------
  const G = GEBAEUDE;
  for (const g of G.geschosse) {
    const n = g.nr;
    for (const r of g.raeume) {
      const { x1, x2, z1, z2 } = raumBereich(r), nord = r.seite === 'n', mz = (z1 + z2) / 2, art = r.art, name = r.name;
      if (art === 'hoersaal') {
        steht(n, x1 + 1.25, 4.6, Math.PI / 2, personal(), 1);  // Dozentin am Pult
        for (let i = 0; i < 10; i++) {
          const xr = x1 + 4.0 + i * 1.55; if (xr > x2 - 1.0) break;
          for (let k = 0; k < 8; k++) { const zz = z1 + 1.0 + k * 0.72; if (zz > z2 - 2.0) break; if (ja(0.42 - i * 0.025)) sitzt(n, xr + 0.55, zz, -Math.PI / 2, { tisch: 0.75, abstand: 0.48 }); }
        }
      } else if (art === 'seminar') {
        const voll = { 'Seminarraum 1.04': 0.75, 'Raum 2.04': 0.55, 'Gruppenräume 3.01': 0.6, 'Raum 3.11': 0.45, 'Raum 2.14': 0.3 }[name] ?? 0;
        if (!voll) continue;
        if (voll > 0.5) steht(n, x1 + 1.1, mz + 0.8, Math.PI / 2, personal(), 1);
        for (let c = 0; c < 3; c++) for (let k = 0; k < 2; k++) {
          const xt = x1 + 3.2 + c * 3.2; if (xt > x2 - 1.5) break;
          const zt = mz + (k - 0.5) * 3.0;
          for (const dz of [-0.35, 0.35]) if (ja(voll)) sitzt(n, xt + 0.65, zt + dz, -Math.PI / 2, { tisch: 0.74, abstand: 0.42 });
        }
      } else if (art === 'labor') {
        const voll = name.startsWith('PC') ? 0.5 : 0.35;
        for (let c = 0; c < 3; c++) {
          const xt = x1 + 2.5 + c * 3.6; if (xt > x2 - 1.5) break;
          for (let k = 0; k < 3; k++) for (const dz of [-0.4, 0.4]) if (ja(voll)) sitzt(n, xt + 0.7, z1 + 1.6 + k * 2.4 + dz, -Math.PI / 2, { tisch: 0.74, abstand: 0.4 });
        }
      } else if (art === 'bibliothek') {
        for (const zt of [2.6, 5.4]) for (const dx of [-0.6, 0.6]) for (const s of [-1, 1]) if (ja(0.55)) sitzt(n, x1 + 4.0 + dx, zt + s * 0.75, s > 0 ? 0 : Math.PI, { tisch: 0.74, abstand: 0.42 });
        // Zwischen den Regalen: jemand sucht, jemand liest im Stehen
        steht(n, x1 + 8.5 + 1.05, 2.3, -Math.PI / 2 + 0.2, typ()); steht(n, x1 + 8.5 + 3 * 2.1 + 1.05, 4.6, Math.PI / 2, typ());
        laeufer(n, [[x1 + 6.5, 7.3], [x2 - 1.2, 7.3]], { tempo: 0.8, warten: 4 });
      } else if (art === 'buero') {
        const anzahl = Math.max(1, Math.min(3, Math.floor((x2 - x1) / 3.2))), zd = nord ? z1 + 1.1 : z2 - 1.1, zs = nord ? zd + 0.95 : zd - 0.95;
        for (let i = 0; i < anzahl; i++) if (i === 0 || ja(0.5)) sitzt(n, x1 + 1.8 + i * 3.2, zs, nord ? 0 : Math.PI, { sitzH: 0.48, t: personal() });
        if (name.startsWith('Studienbüro') || name.startsWith('Prüfungsamt')) steht(n, (x1 + x2) / 2, G.flur[1] + 2.15, Math.PI, typ());  // wartet am Tresen
        if (name.startsWith('Dozierenden')) for (const dx of [-1.2, 1.2]) sitzt(n, (x1 + x2) / 2 + dx, 5.0 + 0.85, 0, { tisch: 0.74, abstand: 0.45, t: personal() });
      } else if (art === 'offen' && name.startsWith('Foyer')) {
        steht(n, 26.8, 15.75, 0, personal());                         // Infotheke, dahinter
        steht(n, 27.2, 17.55, Math.PI + 0.15, typ(), 1);               // davor, fragt etwas
        steht(n, 32.4, 15.1, Math.PI + 0.1, typ()); steht(n, 33.5, 15.3, Math.PI - 0.15, typ());  // lesen die Anzeige
        sitzt(n, 34.0, 19.3, 0, { sitzH: 0.46 });
        steht(n, 35.1, 17.8, -Math.PI / 2, typ(), 2);                  // telefoniert
        laeufer(n, [[30.5, 19.6], [30.5, 10.6], [45, 10.2], [45, 15.6]], { tempo: 1.2, warten: 3 });
        laeufer(n, [[29.0, 10.0], [4.0, 10.0]], { tempo: 1.35, warten: 2 });
      } else if (art === 'offen' && name.startsWith('Cafeteria')) {
        for (let c = 0; c < 4; c++) for (let k = 0; k < 2; k++) {
          const xt = x1 + 2.0 + c * 3.4, zt = z1 + 2.2 + k * 3.4;
          for (const s of [-1, 1]) for (const dx of [-0.45, 0.45]) if (ja(0.42)) sitzt(n, xt + dx, zt + s * 0.75, s > 0 ? 0 : Math.PI, { sitzH: 0.48, tisch: 0.73, abstand: 0.38 });
        }
        steht(n, x2 - 1.75, mz - 0.5, Math.PI / 2, typ()); steht(n, x2 - 2.3, mz + 0.4, Math.PI / 2 - 0.2, typ());  // an der Theke
      } else if (art === 'offen' && name.startsWith('Lernzone')) {
        for (let c = 0; c < 4; c++) {
          const xt = x1 + 2.5 + c * 4.6;
          for (const dx of [-0.7, 0.7]) for (const s of [-1, 1]) if (ja(0.5)) sitzt(n, xt + dx, z1 + 3.0 + s * 0.8, s > 0 ? 0 : Math.PI, { tisch: 0.74, abstand: 0.45 });
          for (const dx of [-0.55, 0.55]) if (ja(0.3)) sitzt(n, xt + dx, z2 - 1.2 + 0.05, 0, { sitzH: 0.44 });
        }
        laeufer(n, [[4, 10.2], [56, 10.2]], { tempo: 1.2, warten: 3 });
      } else if (art === 'offen' && name.startsWith('Lounge')) {
        for (let c = 0; c < 3; c++) {
          const xt = x1 + 3.5 + c * 6.5;
          for (const dx of [-0.6, 0.6]) { if (ja(0.45)) sitzt(n, xt + dx, z1 + 2.2 - 0.05, Math.PI, { sitzH: 0.44 }); if (ja(0.45)) sitzt(n, xt + dx, z2 - 1.6 + 0.05, 0, { sitzH: 0.44 }); }
        }
      }
    }
  }
  laeufer(2, [[56, 9.8], [5, 9.8]], { tempo: 1.1, warten: 5 });
  laeufer(3, [[24.5, 10.3], [50, 10.3]], { tempo: 1.0, warten: 4 });

  // --- Vorplatz --------------------------------------------------------------------------
  const T = G.tiefe;
  laeufer('A', [[30.6, 51.2], [30.6, 36.2], [30.4, T + 4.4]], { tempo: 1.3, warten: 4 });
  laeufer('A', [[29.2, T + 4.6], [29.4, 36.4], [29.4, 51.0]], { tempo: 1.2, warten: 6 });
  laeufer('A', [[11, 33], [27, T + 5.5], [44, 27], [27, T + 5.5]], { tempo: 1.1, warten: 3 });
  for (const [x, z] of [[14.6, 25.8], [15.5, 26.6], [14.2, 26.9]]) steht('A', x, z, zu(x, z, 14.8, 26.45) + rund(-0.25, 0.25), typ({ rucksack: ja(0.5) ? 0x22252a : null }), ja(0.4) ? 1 : 0);
  steht('A', 36.5, T + 3.7, Math.PI, typ());                     // am Briefkasten
  steht('A', 42.5, T + 5.2, -0.6, typ(), 2);                     // telefoniert am Fahrradständer
  // Umgebung: Haltestelle, Weg vom Parkplatz, Nachbarhaus, Gehweg gegenüber, Picknickwiese
  steht('A', 41.2, 49.1, 0.1, typ()); steht('A', 42.6, 49.3, -0.2, typ(), 2); sitzt('A', 43.3, 48.7, Math.PI, { sitzH: 0.47 });
  laeufer('A', [[74, 31.3], [62, 29.8], [52, 29.6], [44, 27.5], [33, T + 5]], { tempo: 1.25, warten: 5 });
  laeufer('A', [[-19.5, 8.3], [-7.3, 8.3], [-7.3, 25.7], [8, 25.7], [22, 27.5]], { tempo: 1.2, warten: 6 });
  laeufer('A', [[-35, 61.6], [105, 61.6]], { tempo: 1.1, warten: 2 });
  laeufer('A', [[100, 50.7], [-30, 50.7]], { tempo: 1.3, warten: 2 });
  steht('A', 75.5, 31.6, Math.PI / 2, typ());                     // am Auto
  for (const [x, z, b] of [[-11.6, 17.4, 2.2], [-14.2, 18.8, -0.9], [-11.4, 25.2, 2.6]]) steht('A', x, z, b, typ({ rucksack: null }), ja(0.5) ? 1 : 0);

  // Verschmelzen je Gruppe: ein Netz für alle Ruhenden, ein Instanznetz für ihre Schatten
  for (const [k, { geos, flecken }] of Object.entries(ruhend)) {
    if (geos.length) gruppen[k].add(new THREE.Mesh(verschmelzen(geos), k === 'leuteA' ? aussen : innen));
    if (flecken.length) {
      const inst = new THREE.InstancedMesh(schattenGeo, schattenMat, flecken.length), o = new THREE.Object3D();
      flecken.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
      inst.renderOrder = 1; gruppen[k].add(inst);
    }
  }
  // Abend (0 = Tag, 1 = dunkel): drinnen wärmeres Lampenlicht, draußen nur noch Himmel und Laternen
  const abendFarbe = { innen: [[1.0, 0.86, 0.68], [0.25, 0.2, 0.12]], aussen: [[0.3, 0.33, 0.48], [0.18, 0.15, 0.1]] };
  function abend(a) {
    for (const [m, k] of [[innen, 'innen'], [aussen, 'aussen']]) {
      const [luft, sonne] = m.userData.tag, [l2, s2] = abendFarbe[k];
      m.userData.luft.value.set(...luft.map((v, i) => v + (v * l2[i] - v) * a));
      m.userData.sonneF.value.set(...sonne.map((v, i) => v + (s2[i] - v) * a));
    }
  }
  return { gruppen, abend, tick(dt) { for (const f of ticks) f(dt); } };
}
