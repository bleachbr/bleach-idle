// Sobe o jogo para os testes: gera o build do cliente numa pasta temporária (não mexe no client/dist de quem
// desenvolve) e liga o servidor do jogo servindo esse build, com banco temporário. Devolve o teardown.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./port";

const root = fileURLToPath(new URL("..", import.meta.url));
/** a saída do servidor fica em e2e/test-results/, que o CI sobe como artefato quando algo falha */
const SERVER_LOG = fileURLToPath(new URL("./test-results/server.log", import.meta.url));

/** O ambiente de quem roda, sem o que faria o teste mexer em coisa real: pasta de backup, outro servidor, modo Dev. */
function cleanEnv() {
  const env = { ...process.env };
  for (const k of ["BACKUP_DIR", "VITE_SERVER", "BI_DEV", "TRUST_PROXY", "DB_FILE", "STATIC_DIR", "PORT"]) delete env[k];
  return env;
}

function build(outDir: string) {
  // o Vite direto pelo node: sem shell (npm.cmd no Windows pediria shell: true)
  const vite = join(root, "node_modules", "vite", "bin", "vite.js");
  const r = spawnSync(process.execPath, [vite, "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "warn"],
    { cwd: join(root, "client"), stdio: "inherit", env: cleanEnv(), timeout: 180_000 });
  if (r.status !== 0) throw new Error(`build do cliente falhou (código ${r.status}${r.error ? `, ${r.error.message}` : ""})`);
}

function startServer(tmp: string): Promise<ChildProcess> {
  const env = {
    ...cleanEnv(),
    PORT: String(PORT),
    STATIC_DIR: join(tmp, "dist"),
    DB_FILE: join(tmp, "e2e.sqlite"),
    // o fluxo do evento narrado usa debugInvasion; os limites de login e de contas por IP não podem barrar os testes
    BI_DEBUG: "1",
    // Somente a captura opt-in dos mapas precisa de nível 150 e imortalidade.
    // O servidor/banco são temporários; o fluxo E2E padrão mantém Dev desligado.
    BI_DEV: process.env.BI_MAP_PREVIEW === "1" || process.env.BI_DEV === "1" ? "1" : "0",
    LOGIN_MAX_FAILS_IP: "1000000",
    REGISTER_MAX_IP: "1000000",
    // invasão e chefe mundial só quando o teste pedir
    INVASION_FIRST_MS: "999999999",
    WORLDBOSS_FIRST_MS: "999999999",
  };
  mkdirSync(join(SERVER_LOG, ".."), { recursive: true });
  const file = createWriteStream(SERVER_LOG);
  const p = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], { cwd: join(root, "server"), env });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { p.kill(); reject(new Error(`o servidor não subiu em 30 s (log em ${SERVER_LOG})`)); }, 30_000);
    let log = "";
    const feed = (d: Buffer) => {
      file.write(d);
      if (log.length < 64_000) log += d.toString();
      if (log.includes("Servidor do mundo")) { clearTimeout(timer); resolve(p); }
    };
    p.stdout.on("data", feed);
    p.stderr.on("data", feed);
    p.once("exit", (code) => { clearTimeout(timer); reject(new Error(`o servidor saiu (código ${code}) antes de subir:\n${log}`)); });
  });
}

/** Mata o servidor e espera ele sair, sem travar se ele já tinha caído no meio dos testes. */
async function stop(p: ChildProcess) {
  if (p.exitCode !== null || p.signalCode !== null) return;
  const exited = new Promise((r) => p.once("exit", r).once("error", r));
  p.kill();
  await Promise.race([exited, new Promise((r) => setTimeout(r, 10_000))]);
}

export default async function globalSetup() {
  const tmp = mkdtempSync(join(tmpdir(), "bleach-e2e-"));
  const clean = () => rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  let server: ChildProcess;
  try {
    build(join(tmp, "dist"));
    server = await startServer(tmp);
  } catch (e) {
    clean(); // falhou no meio (porta ocupada, build quebrado): não deixa a pasta para trás
    throw e;
  }
  server.removeAllListeners("exit");
  return async () => {
    await stop(server);
    clean();
  };
}
