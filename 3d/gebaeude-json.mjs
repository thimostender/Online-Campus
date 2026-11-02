// Liest GEBAEUDE aus prototyp/gebaeude.js und schreibt es als JSON für das Blender-Bauskript.
// Ein Gebäude, eine Wahrheit: Lageplan, Rundgang und 3D-Modell nutzen dieselben Daten.  node 3d/gebaeude-json.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync(new URL('../prototyp/gebaeude.js', import.meta.url), 'utf8');
const kontext = {}; vm.createContext(kontext);
vm.runInContext(code.split('// ---------- 2D-Lageplan')[0] + '\nthis.G = GEBAEUDE;', kontext);
writeFileSync(new URL('./gebaeude.json', import.meta.url), JSON.stringify(kontext.G, null, 1));
console.log('Geschosse', kontext.G.geschosse.length, 'Räume', kontext.G.geschosse.reduce((n, g) => n + g.raeume.length, 0));
