import { describe, it, expect } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { createHttpServer } from "../src/http.js";

const rootFile = (rel: string) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");

describe("CSP e cabeçalhos de segurança no Caddy e no servidor HTTP (F-06)", () => {
  it("deploy/Caddyfile declara Content-Security-Policy, X-Content-Type-Options, Referrer-Policy e X-Frame-Options", () => {
    const caddy = rootFile("deploy/Caddyfile");
    expect(caddy).toMatch(/Content-Security-Policy/i);
    expect(caddy).toMatch(/default-src\s+'self'/);
    expect(caddy).toMatch(/script-src\s+'self'/);
    expect(caddy).toMatch(/object-src\s+'none'/);
    expect(caddy).toMatch(/frame-ancestors\s+'none'/);
    expect(caddy).toMatch(/X-Content-Type-Options\s+"?nosniff"?/i);
    expect(caddy).toMatch(/Referrer-Policy\s+"?strict-origin-when-cross-origin"?/i);
    expect(caddy).toMatch(/X-Frame-Options\s+"?DENY"?/i);
  });

  it("createHttpServer envia cabeçalhos de segurança em /, /healthz e 400, e serve .webp/.jpg com MIME correto sob nosniff", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bi-http-test-"));
    writeFileSync(join(dir, "index.html"), "<!doctype html><title>ok</title>");
    writeFileSync(join(dir, "sprite.webp"), "RIFF");
    writeFileSync(join(dir, "bg.jpg"), "JFIF");

    const prevStatic = process.env.STATIC_DIR;
    process.env.STATIC_DIR = dir;
    const srv = createHttpServer(() => ({ players: 0 }));
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const port = (srv.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      const htmlRes = await fetch(`${base}/`);
      expect(htmlRes.status).toBe(200);
      const csp = htmlRes.headers.get("content-security-policy") ?? "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(htmlRes.headers.get("x-content-type-options")).toBe("nosniff");
      expect(htmlRes.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(htmlRes.headers.get("x-frame-options")).toBe("DENY");

      const healthRes = await fetch(`${base}/healthz`);
      expect(healthRes.status).toBe(200);
      expect(healthRes.headers.get("x-content-type-options")).toBe("nosniff");

      const webpRes = await fetch(`${base}/sprite.webp`);
      expect(webpRes.status).toBe(200);
      expect(webpRes.headers.get("content-type")).toBe("image/webp");

      const jpgRes = await fetch(`${base}/bg.jpg`);
      expect(jpgRes.status).toBe(200);
      expect(jpgRes.headers.get("content-type")).toBe("image/jpeg");
    } finally {
      if (prevStatic === undefined) delete process.env.STATIC_DIR;
      else process.env.STATIC_DIR = prevStatic;
      await new Promise<void>((resolve) => srv.close(() => resolve()));
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
