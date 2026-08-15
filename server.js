// Local development server (zero dependencies) simulating Vercel Edge & Static files
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import middleware from './middleware.js';
import fotdHandler from './api/fotd.js';
import geoHandler from './api/geo.js';
import proxyHandler from './api/proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  // Create Web Request object compatible with Edge runtime
  const webHeaders = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) webHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  // Local simulated geo headers for Madison, WI (Culver's homeland) if not present
  if (!webHeaders.has('x-vercel-ip-latitude')) {
    webHeaders.set('x-vercel-ip-latitude', '43.0731');
    webHeaders.set('x-vercel-ip-longitude', '-89.4012');
    webHeaders.set('x-vercel-ip-city', 'Madison');
    webHeaders.set('x-vercel-ip-country-region', 'WI');
    webHeaders.set('x-vercel-ip-country', 'US');
  }

  const webRequest = new Request(url.toString(), {
    method: req.method,
    headers: webHeaders
  });
  webRequest.nextUrl = url;

  // Run Edge Middleware
  const middlewareRes = middleware(webRequest);
  if (middlewareRes instanceof Response) {
    res.writeHead(middlewareRes.status, Object.fromEntries(middlewareRes.headers.entries()));
    const body = await middlewareRes.text();
    res.end(body);
    return;
  }

  // Handle Edge APIs
  if (url.pathname === '/api/fotd') {
    const apiRes = await fotdHandler(webRequest);
    res.writeHead(apiRes.status, Object.fromEntries(apiRes.headers.entries()));
    const body = await apiRes.text();
    res.end(body);
    return;
  }

  if (url.pathname === '/api/geo') {
    const apiRes = await geoHandler(webRequest);
    res.writeHead(apiRes.status, Object.fromEntries(apiRes.headers.entries()));
    const body = await apiRes.text();
    res.end(body);
    return;
  }

  if (url.pathname === '/api/proxy') {
    const apiRes = await proxyHandler(webRequest);
    res.writeHead(apiRes.status, Object.fromEntries(apiRes.headers.entries()));
    const body = await apiRes.text();
    res.end(body);
    return;
  }

  // Serve static files from public/
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🍦 Culver's Flavor of the Day (vfotd) running at http://localhost:${PORT}`);
});
