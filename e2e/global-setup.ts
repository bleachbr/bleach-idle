// Sobe o jogo para os testes: gera o build do cliente numa pasta temporária (não mexe no client/dist de quem
// desenvolve) e liga o servidor do jogo servindo esse build, com banco temporário. Devolve o teardown.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./playwright.config";

const root = fileURLToPath(new URL("..", import.meta.url));

function build(outDir: string) {
  // o Vite direto pelo node: sem shell (npm.cmd no Windows pediria shell: true)
  const vite = join(root, "node_modules", "vite", "bin", "vite.js");
  const r = spawnSync(process.execPath, [vite, "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "warn"], { cwd: join(root, "client"), stdio: "inherit" });
  if (r.status !== 0) throw new Error(`build do cliente falhou (código ${r.status})`);
}

function startServer(tmp: string): Promise<ChildProcess> {
  const env = {
    ...process.env,
    PORT: String(PORT),
    STATIC_DIR: join(tmp, "dist"),
    DB_FILE: join(tmp, "e2e.sqlite"),
    // o fluxo do evento narrado usa debugInvasion; os limites de login e de contas por IP não podem barrar os testes
    BI_DEBUG: "1",
    LOGIN_MAX_FAILS_IP: "1000000",
    REGISTER_MAX_IP: "1000000",
    // invasão e chefe mundial só quando o teste pedir
    INVASION_FIRST_MS: "999999999",
    WORLDBOSS_FIRST_MS: "999999999",
  };
  const p = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], { cwd: join(root, "server"), env });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { p.kill(); reject(new Error("o servidor não subiu em 30 s")); }, 30_000);
    let log = "";
    const feed = (d: Buffer) => {
      log += d.toString();
      if (log.includes("Servidor do mundo")) { clearTimeout(timer); resolve(p); }
    };
    p.stdout.on("data", feed);
    p.stderr.on("data", feed);
    p.on("exit", (code) => { clearTimeout(timer); reject(new Error(`o servidor saiu (código ${code}) antes de subir:\n${log}`)); });
  });
}

export default async function globalSetup() {
  const tmp = mkdtempSync(join(tmpdir(), "bleach-e2e-"));
  build(join(tmp, "dist"));
  const server = await startServer(tmp);
  server.removeAllListeners("exit");
  return async () => {
    server.kill();
    await new Promise((r) => server.once("exit", r).once("error", r));
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
}
