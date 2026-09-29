// Vorlage: Hilfe-Assistent mit Claude als Sprachmodell.
// Liefert den Prototyp aus (wie server.mjs) und beantwortet zusätzlich POST /api/assistent.
//
// Ablauf: Der Browser sucht selbst die passenden Abschnitte aus den Lehrmaterialien, die die
// Person sehen darf, und schickt nur diese mit. Claude formuliert daraus eine Antwort und nennt
// die Quellen. Der API-Schlüssel bleibt hier auf dem Server und gelangt nie in den Browser.
//
// Start:
//   npm install @anthropic-ai/sdk
//   ANTHROPIC_API_KEY=… node server-assistent-beispiel.mjs      → http://localhost:4180
// (oder vorher `ant auth login`, dann ist keine Umgebungsvariable nötig)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const root = fileURLToPath(new URL('.', import.meta.url));
const typen = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

// Fester Systemtext: bleibt gleich und wird deshalb zwischengespeichert (Prompt-Caching)
const SYSTEM = `Du bist der Hilfe-Assistent eines Online-Campus für berufsbegleitend Studierende (BWL, Bachelor).
Beantworte die Frage ausschließlich mit den mitgelieferten Abschnitten aus Lehrmaterialien, FAQ und Service-Texten.
Regeln:
- Antworte auf Deutsch, kurz und verständlich, höchstens fünf Sätze oder eine kurze Liste. Fachfragen auf Englisch beantwortest du auf Englisch.
- Belege jede Aussage mit der Nummer des Abschnitts in eckigen Klammern, zum Beispiel [2].
- Steht die Antwort nicht in den Abschnitten, sag das offen und erfinde nichts. Verweise dann auf die Lehrenden oder das Studienbüro.
- Gib keine Rechtsberatung für den Einzelfall; erkläre, was im Material steht.`;

async function beantworte({ frage, abschnitte }) {
  const kontext = abschnitte.map((a, i) => `[${i + 1}] ${a.quelle} (${a.modul})\n${a.text}`).join('\n\n');
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 2000,
    output_config: { effort: 'low' }, // kurze Auskunft aus vorgegebenen Texten, kein langes Nachdenken nötig
    // Lehnt das Modell eine Anfrage aus Sicherheitsgründen ab, übernimmt automatisch ein passendes Modell
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Abschnitte:\n\n${kontext}\n\nFrage: ${frage}` }],
  });
  if (response.stop_reason === 'refusal') return 'Dazu kann ich keine Auskunft geben. Wende dich bitte an die Lehrenden oder das Studienbüro.';
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

function jsonLesen(req) {
  return new Promise((ok, fehler) => {
    let daten = '';
    req.on('data', c => { daten += c; if (daten.length > 200_000) { fehler(new Error('zu groß')); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(daten)); } catch (e) { fehler(e); } });
  });
}

createServer(async (req, res) => {
  const pfad = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  if (pfad === '/api/assistent/bereit') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"bereit":true}'); return; }
  if (pfad === '/api/assistent' && req.method === 'POST') {
    try {
      const { frage, abschnitte } = await jsonLesen(req);
      if (typeof frage !== 'string' || !Array.isArray(abschnitte) || !abschnitte.length) throw new Error('Frage und Abschnitte fehlen');
      const antwort = await beantworte({ frage: frage.slice(0, 1000), abschnitte: abschnitte.slice(0, 6) });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ antwort }));
    } catch (e) {
      // Typisierte Fehler des SDK unterscheiden: Überlastung kann der Browser später erneut versuchen
      const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 400;
      console.error('Assistent:', e.message);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ fehler: 'Der Assistent ist gerade nicht erreichbar.' }));
    }
    return;
  }
  try {
    const datei = join(root, pfad.endsWith('/') ? pfad + 'index.html' : pfad);
    const inhalt = await readFile(datei);
    res.writeHead(200, { 'Content-Type': typen[extname(datei)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(inhalt);
  } catch { res.writeHead(404); res.end('Nicht gefunden'); }
}).listen(4180, () => console.log('Online-Campus mit Claude-Assistent: http://localhost:4180'));
