import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.css':'text/css; charset=utf-8', '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml' };

createServer(async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const safePath = normalize(requestPath === '/' ? '/index.html' : requestPath).replace(/^[/\\]+/, '');
  const filePath = resolve(root, safePath);
  if (!filePath.startsWith(root.endsWith(sep) ? root : root + sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }); response.end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Prototype available on http://0.0.0.0:${port}`));
