// Baut aus vorlage.html + *.mmd das PDF.  Aufruf: node bauen.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let html = readFileSync('vorlage.html', 'utf8')
  .replace('%%SITEMAP_STUDIERENDE%%', esc(readFileSync('sitemap-studierende.mmd', 'utf8')))
  .replace('%%SITEMAP_LEHRENDE%%', esc(readFileSync('sitemap-lehrende.mmd', 'utf8')))
  .replace('%%SITEMAP_VERWALTUNG%%', esc(readFileSync('sitemap-verwaltung.mmd', 'utf8')))
  .replace('%%ER_MODELL%%', esc(readFileSync('er-modell.mmd', 'utf8')));
writeFileSync('.bau.html', html);
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000',
  '--print-to-pdf=Online-Campus_Sitemap-und-Datenmodell.pdf', 'file://' + process.cwd() + '/.bau.html'
], { stdio: 'inherit' });
console.log('fertig');
