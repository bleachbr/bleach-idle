// Servidor HTTP do jogo em produção: entrega o cliente pronto (client/dist) e /healthz.
// O WebSocket do Colyseus usa este mesmo servidor e porta, então em produção basta um
// endereço (atrás de um proxy com HTTPS, como o Caddy do docker-compose).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".tmj": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

export const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' ws: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": CSP_HEADER,
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
};

export function createHttpServer(status: () => Record<string, unknown>) {
  const root = process.env.STATIC_DIR ?? fileURLToPath(new URL("../../client/dist/", import.meta.url));

  async function handler(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/healthz") {
      res.writeHead(200, { ...SECURITY_HEADERS, "content-type": "application/json", "cache-control": "no-store" });
      return res.end(JSON.stringify({ ok: true, ...status() }));
    }
    // arquivo estático; caminhos desconhecidos caem no index.html
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
    if (rel.includes("..")) { res.writeHead(400, SECURITY_HEADERS); return res.end(); }
    let file = join(root, rel || "index.html");
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    } catch {
      file = join(root, "index.html");
    }
    try {
      const body = await readFile(file);
      const ext = extname(file);
      // arquivos com hash no nome (assets do Vite) podem ficar em cache por muito tempo
      const immutable = /[.-][A-Za-z0-9_-]{8,}\.(js|css)$/.test(file);
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        "content-type": TYPES[ext] ?? "application/octet-stream",
        "cache-control": immutable ? "public, max-age=31536000, immutable" : ext === ".html" || file.endsWith("sw.js") ? "no-cache" : "public, max-age=3600",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" });
      res.end("Cliente não encontrado. Rode `npm run build` antes de `npm start`.");
    }
  }

  return createServer((req, res) => { handler(req, res).catch(() => { res.writeHead(500, SECURITY_HEADERS); res.end(); }); });
}
