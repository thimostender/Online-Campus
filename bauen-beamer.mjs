// Baut das Beamer-PDF (16:9) aus beamer-vorlage.html + er-teil*.mmd.  Aufruf: node bauen-beamer.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Die Titelzeile im Mermaid-Kopf steht auf der Folie schon als Überschrift
// Für die Folie: waagerecht anordnen und Kommentare weglassen, damit die Schrift groß bleibt
const WICHTIG = new Set(['schwerpunkt', 'plansemester', 'name', 'titel', 'rolle', 'status', 'frist', 'art', 'wert', 'freigegeben_am', 'bestaetigt_am', 'sha256', 'nummer', 'verspaetet', 'anlass', 'kanal', 'gelesen_am', 'beginn', 'ende', 'von', 'bis', 'ects', 'bezeichnung', 'gruppenarbeit', 'wichtig', 'aktiv', 'erklaerung_am', 'sichtbar_ab']);
const nurWichtiges = text => text.split('\n').filter(z => {
  const m = z.match(/^\s{4}\w+ (\w+)(?: (PK|FK|UK))?/);
  return !m || m[2] || WICHTIG.has(m[1]);
}).join('\n');
const teil = f => esc(nurWichtiges(readFileSync(f, 'utf8')).replace(/^---[\s\S]*?---\n/, '')
  .replace('erDiagram\n', 'erDiagram\n  direction LR\n')
  .replace(/^(\s+\w+ \w+(?: (?:PK|FK|UK))?) "[^"]*"$/gm, '$1'));
const html = readFileSync('beamer-vorlage.html', 'utf8')
  .replace('%%TEIL1%%', teil('er-teil1-personen-lehrangebot.mmd'))
  .replace('%%TEIL2%%', teil('er-teil2-pruefen-abgaben.mmd'))
  .replace('%%TEIL3%%', teil('er-teil3-kommunikation.mmd'));
writeFileSync('.beamer.html', html);
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000',
  '--print-to-pdf=Online-Campus_Datenmodell_Beamer.pdf', 'file://' + process.cwd() + '/.beamer.html'], { stdio: 'ignore' });
console.log('fertig');
