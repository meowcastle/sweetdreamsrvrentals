#!/usr/bin/env node
// Local dev server: serves the static site (.dc.html files, images, sd-*.js)
// from the project root and proxies /api/* to the backend container. The
// site's own code calls fetch('/api/...') with relative paths, so the
// frontend and the API must be reached through the same origin for a
// browser to actually exercise the real login/booking/pricing flows -
// pointing a browser straight at "Sweet Dreams RV.dc.html" as a file:// URL,
// or serving it from a bare static server on its own port, both break that.
//
// Also runs containerized as the compose "web" service (see
// docker-compose.yml), bind-mounting the repo root instead of copying it
// into an image - static content updates (like a git pull) take effect
// immediately with no rebuild, same as running this directly on a host.
// API_HOST defaults to 'localhost' for that host-run case; the web service
// overrides it to 'app' (the compose service name) since containers don't
// share a loopback with each other.
//
// Usage:
//   docker compose up -d --build   # backend + Postgres, port 3000
//   node scripts/dev-server.js     # this, port 4321
//   open http://localhost:4321/Sweet%20Dreams%20RV.dc.html
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 4321;
const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 3000;

// Only the static site lives at the root; everything else here is backend
// source, tests, scripts, or config that must never be served over HTTP.
const BLOCKED_PREFIXES = ['/backend/', '/tests/', '/.git/', '/scripts/', '/node_modules/', '/_ds/'];

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
  '.ico': 'image/x-icon', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxyReq = http.request(
      { host: API_HOST, port: API_PORT, path: req.url, method: req.method, headers: req.headers },
      (proxyRes) => { res.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(res); },
    );
    proxyReq.on('error', () => { res.writeHead(502); res.end('backend unreachable - is docker compose up?'); });
    req.pipe(proxyReq);
    return;
  }

  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (BLOCKED_PREFIXES.some((p) => urlPath.startsWith(p)) || urlPath.includes('..')) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  if (urlPath.startsWith('/.env')) { res.writeHead(403); res.end('forbidden'); return; }

  const filePath = path.join(ROOT, urlPath === '/' ? '/Sweet Dreams RV.dc.html' : urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + urlPath); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Dev server on http://localhost:${PORT} (proxying /api to :${API_PORT})`);
  console.log(`  Customer site: http://localhost:${PORT}/Sweet%20Dreams%20RV.dc.html`);
  console.log(`  Admin:         http://localhost:${PORT}/Sweet%20Dreams%20Admin.dc.html`);
  console.log(`  Pricing:       http://localhost:${PORT}/Sweet%20Dreams%20Pricing.dc.html`);
});
