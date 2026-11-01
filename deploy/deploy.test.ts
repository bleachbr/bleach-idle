import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./deploy.sh", import.meta.url));
const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

describe("deploy VPS", () => {
  it.each(["main", "abc", "a".repeat(39), "a".repeat(41), "$(whoami)"])("rejeita revisão inválida %s antes de alterar o servidor", (revision) => {
    const result = spawnSync("bash", [script, revision], { encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(result.stderr).not.toContain("bleach-deploy.lock");
  });

  it("mantém o jogo local e os dados em volume próprio", () => {
    const compose = read("./compose.vps.yml");
    expect(compose).toContain('"127.0.0.1:2567:2567"');
    expect(compose).toContain("name: bleach-dados");
    expect(compose).toContain('BI_DEV: "0"');
    expect(compose).toContain('BI_DEBUG: "0"');
    expect(compose).not.toContain("80:80");
    expect(compose).not.toContain("443:443");
  });

  it("preserva WebSocket e substitui o cabeçalho de IP enviado pelo cliente", () => {
    const nginx = read("./nginx.conf");
    expect(nginx).toContain("proxy_set_header Upgrade $http_upgrade;");
    expect(nginx).toContain("proxy_set_header X-Forwarded-For $remote_addr;");
    expect(nginx).toContain("server_name www.bleach.acoplum.com;");
  });

  it("bootstrap só expõe o desafio ACME antes do certificado", () => {
    const nginx = read("./nginx.bootstrap.conf");
    expect(nginx).toContain("location /.well-known/acme-challenge/");
    expect(nginx).toContain("return 503;");
    expect(nginx).not.toContain("proxy_pass");
  });

  it("hook não recarrega nginx para certificado de outro site", () => {
    const hook = fileURLToPath(new URL("./renew-certificate.sh", import.meta.url));
    const result = spawnSync("bash", [hook], {
      env: { ...process.env, RENEWED_LINEAGE: "/etc/letsencrypt/live/outro-site" },
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("só publica push na main depois dos testes", () => {
    const workflow = read("../.github/workflows/ci.yml");
    expect(workflow).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(workflow).toContain("needs: test");
    expect(workflow).toContain("StrictHostKeyChecking=yes");
    expect(workflow).toContain("cancel-in-progress: false");
  });
});
