// Kleiner statischer Server für die Vorschau:  node server.mjs  →  http://localhost:4180
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const typen = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer(async (req, res) => {
  const pfad = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const datei = join(root, pfad.endsWith('/') ? pfad + 'index.html' : pfad);
    const inhalt = await readFile(datei);
    res.writeHead(200, { 'Content-Type': typen[extname(datei)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(inhalt);
  } catch { res.writeHead(404); res.end('Nicht gefunden'); }
}).listen(4180, () => console.log('Online-Campus: http://localhost:4180'));
