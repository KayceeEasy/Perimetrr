// Local preview serves the same public allowlist as the production build.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { publicFiles } = require('./public-files.cjs');
const root = path.resolve(__dirname, '..');
const allowed = new Set(publicFiles(root));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function createPreviewServer() { return http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Invalid request'); return; }
  let file = pathname.replace(/^\/+/, '');
  if (!file || file.endsWith('/')) file += 'index.html';
  const knownTenantRoute = file.match(/^(?:tenant\/)?([A-Za-z0-9-]+)\/(command-center|hybrid)\/index\.html$/);
  if (!allowed.has(file) && knownTenantRoute) {
    res.writeHead(302, { Location: `/${knownTenantRoute[2]}/?tenant=${encodeURIComponent(knownTenantRoute[1])}` }); res.end(); return;
  }
  const exists = allowed.has(file);
  if (!exists) file = '404.html';
  res.writeHead(exists ? 200 : 404, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(path.join(root, file)).pipe(res);
}); }
module.exports = { createPreviewServer };
if (require.main === module) createPreviewServer().listen(Number(process.env.PORT || 4173), '127.0.0.1', () => process.stdout.write(`Perimetrr preview: http://127.0.0.1:${process.env.PORT || 4173}\n`));
