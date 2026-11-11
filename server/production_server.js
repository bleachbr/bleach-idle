// Static + API process for production (replaces nginx-only image).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerTelemetryAndMultiplayerRoutes } from './telemetry_orchestrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 2567);
const STATIC_ROOT = path.resolve(process.env.STATIC_ROOT || path.join(ROOT, 'dist'));
const ASSETS_ROOT = path.resolve(process.env.ASSETS_ROOT || path.join(ROOT, 'src', 'assets'));
const MUSIC_ROOT = path.resolve(process.env.MUSIC_ROOT || path.join(ROOT, 'arts', 'music'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
  '.map': 'application/json'
};

const apiRoutes = [];

registerTelemetryAndMultiplayerRoutes({
  middlewares: {
    use(routePath, handler) {
      apiRoutes.push({ routePath, handler });
    }
  }
});

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.end(text);
}

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const full = path.resolve(root, '.' + decoded);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (full !== root && !full.startsWith(prefix)) return null;
  return full;
}

function tryFile(filePath, res) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function findApiHandler(pathname) {
  return apiRoutes.find((r) => pathname === r.routePath || pathname.startsWith(r.routePath + '/'));
}

function serveStatic(pathname, res) {
  if (pathname.startsWith('/src/assets/')) {
    const rel = pathname.slice('/src/assets'.length);
    if (tryFile(safeJoin(ASSETS_ROOT, rel), res)) return;
    return sendText(res, 404, 'not found');
  }
  if (pathname.startsWith('/arts/music/')) {
    const rel = pathname.slice('/arts/music'.length);
    if (tryFile(safeJoin(MUSIC_ROOT, rel), res)) return;
    return sendText(res, 404, 'not found');
  }
  if (tryFile(safeJoin(STATIC_ROOT, pathname), res)) return;
  if (pathname === '/' || !path.extname(pathname)) {
    if (tryFile(path.join(STATIC_ROOT, 'index.html'), res)) return;
  }
  sendText(res, 404, 'not found');
}

function handleRequest(req, res) {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/healthz') return sendText(res, 200, 'ok\n');
  const api = findApiHandler(pathname);
  if (api) return api.handler(req, res);
  return serveStatic(pathname, res);
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[production_server] listening on :${PORT} static=${STATIC_ROOT}`);
});
