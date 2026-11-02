// Zeichnet Schilder, Leinwand und Türschilder für das 3D-Campusmodell als Bilder (nur erfundene Beispieltexte).
//   node 3d/schilder.mjs
// Playwright kommt aus dem Kassencapitano-Projekt (nur Werkzeug zum Bauen, wird nicht ausgeliefert).
import { chromium } from '/Users/thimostender/Projekte/vereinskasse-saas/node_modules/playwright/index.mjs';
import { readFileSync, mkdirSync } from 'node:fs';

const ZIEL = new URL('./quellen/schilder/', import.meta.url);
mkdirSync(ZIEL, { recursive: true });
const G = JSON.parse(readFileSync(new URL('./gebaeude.json', import.meta.url), 'utf8'));
const LILA = '#4c1d95', HELL = '#f5f3ff', AKZENT = '#a78bfa';
const BASIS = `<style>*{box-sizing:border-box;margin:0}html,body{background:transparent}body{font-family:-apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;overflow:hidden}</style>`;
const logo = (g) => `<div style="width:${g}px;height:${g}px;border-radius:${g * 0.22}px;background:linear-gradient(135deg,#7c3aed,#4c1d95);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${g * 0.42}px;letter-spacing:-1px">OC</div>`;

// Türschilder: ein Atlas, je Raum eine Zelle 512 × 128, Reihenfolge wie in gebaeude.json
export const RAUMLISTE = G.geschosse.flatMap((g) => g.raeume.filter((r) => r.art !== 'offen').map((r) => `${g.nr}|${r.name}`));
const SPALTEN = 4, ZEILEN = Math.ceil(RAUMLISTE.length / SPALTEN);

const BILDER = {
  campus_schild: [1600, 420, `<div style="height:420px;background:${LILA};color:#fff;display:flex;align-items:center;gap:60px;padding:0 90px;border-bottom:26px solid ${AKZENT}">
    ${logo(230)}<div><div style="font-size:150px;font-weight:800;letter-spacing:-3px;line-height:1">Online-Campus</div>
    <div style="font-size:52px;opacity:.85;margin-top:18px">Medien- und IT-Management · Campus Mitte</div></div></div>`],
  leinwand: [1600, 900, `<div style="width:1600px;height:900px;background:#fff;padding:90px 110px;color:#1f1b2e">
    <div style="display:flex;justify-content:space-between;align-items:center">${logo(110)}<div style="font-size:34px;color:#6b7280">Sitzung 5 · Medienkonzeption</div></div>
    <div style="font-size:96px;font-weight:800;margin-top:80px;letter-spacing:-2px;color:${LILA}">Von der Idee zum Konzept</div>
    <div style="font-size:48px;margin-top:50px;line-height:1.6">• Zielgruppe und Nutzen klären<br>• Format und Kanal wählen<br>• Ablauf und Budget planen</div>
    <div style="position:absolute;right:110px;bottom:90px;width:420px;height:260px;border-radius:24px;background:linear-gradient(135deg,#ede9fe,#c4b5fd)"></div></div>`],
  whiteboard: [1000, 600, `<div style="width:1000px;height:600px;background:#fafaf7;border:16px solid #b9bcc4;padding:40px 50px;color:#1e3a8a;font-size:46px;font-weight:600;line-height:1.35">
    Projektplan WiSe<br><span style="color:#b91c1c">Abgabe PT3: Freitag</span><br><span style="font-size:36px;color:#374151">1. Recherche → 2. Konzept → 3. Pitch</span>
    <svg width="380" height="160" style="position:absolute;right:60px;bottom:50px"><g fill="none" stroke="#1e3a8a" stroke-width="6"><rect x="10" y="40" width="100" height="70" rx="10"/><rect x="140" y="40" width="100" height="70" rx="10"/><rect x="270" y="40" width="100" height="70" rx="10"/><path d="M110 75h30M240 75h30"/></g></svg></div>`],
  anzeige: [1280, 720, `<div style="width:1280px;height:720px;background:#14111f;color:#fff;padding:60px 70px">
    <div style="display:flex;gap:30px;align-items:center">${logo(90)}<div style="font-size:64px;font-weight:800">Heute im Campus</div></div>
    <div style="margin-top:50px;font-size:40px;line-height:1.9;color:#ddd6fe">08:30 Medienkonzeption · Hörsaal A<br>11:00 Datenbanken · PC-Labor 1.08<br>14:15 Grundlagen Marketing · Raum 2.04</div></div>`],
  tuerschilder: [512 * SPALTEN, 128 * ZEILEN, `<div style="display:grid;grid-template-columns:repeat(${SPALTEN},512px);grid-auto-rows:128px">
    ${RAUMLISTE.map((k) => { const n = k.split('|')[1]; return `<div style="background:#fff;border-left:22px solid ${LILA};display:flex;align-items:center;padding:0 30px;font-size:${n.length > 18 ? 44 : 54}px;font-weight:700;color:#1f1b2e;white-space:nowrap">${n}</div>`; }).join('')}</div>`],
  geschoss: [1024, 256, `<div style="display:grid;grid-template-columns:repeat(4,256px);height:256px">${['EG', '1. OG', '2. OG', '3. OG'].map((t) => `<div style="background:${LILA};color:#fff;display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:800;border:10px solid ${HELL}">${t}</div>`).join('')}</div>`],
};

const browser = await chromium.launch();
const seite = await browser.newPage();
for (const [name, [b, h, html]] of Object.entries(BILDER)) {
  await seite.setViewportSize({ width: b, height: h });
  await seite.setContent(`<!doctype html><meta charset="utf-8">${BASIS}<body style="position:relative">${html}</body>`);
  await seite.screenshot({ path: new URL(`${name}.png`, ZIEL).pathname, omitBackground: true });
  console.log('Bild', name, b, h);
}
await browser.close();
console.log('Türschilder', RAUMLISTE.length, 'Zellen', SPALTEN, '×', ZEILEN);
