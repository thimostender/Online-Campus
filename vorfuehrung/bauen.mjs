// Baut das Drehbuch als PDF.  Aufruf: node vorfuehrung/bauen.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const hier = dirname(fileURLToPath(import.meta.url));
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-pdf-header-footer',
  '--print-to-pdf=' + join(hier, '..', 'Online-Campus_Vorfuehrung.pdf'), 'file://' + join(hier, 'drehbuch.html')], { stdio: 'ignore' });
console.log('fertig');
