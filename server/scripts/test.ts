// Runner dos testes: sobe um servidor isolado (porta 2577, banco temporário), roda todos
// os cenários e conta as verificações. Sai com código 1 se alguma falhar.
// Uso: npm run test:scripts   (na raiz)   ou   npx tsx scripts/test.ts [cenário ...]  (em server/)
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 2577;
const serverDir = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bleach-test-"));
const env = { ...process.env, PORT: String(PORT), DB_FILE: join(tmp, "test.sqlite"), BI_URL: `ws://localhost:${PORT}`, LOGIN_MAX_FAILS_IP: "1000000", INVASION_FIRST_MS: "999999999", BI_DEBUG: "1" };
const ALL = ["mapcheck", "robust", "accounts", "bankai", "outfit", "items", "death", "social", "social2", "quests", "training", "bags", "market", "progress", "forge", "hunt", "invasion", "lasnoches", "account2", "rebirth", "dangai", "helper", "evolucao", "loja", "skull", "bot", "spawncount", "restart"];
const only = process.argv.slice(2);
const scenarios = only.length ? only : ALL;

let passed = 0;
let failed = 0;
const failures: string[] = [];

const node = (args: string[]) => spawn(process.execPath, ["--import", "tsx", ...args], { cwd: serverDir, env });

function lines(p: ChildProcess, onLine: (l: string) => void) {
  let buf = "";
  const feed = (d: Buffer) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) { onLine(buf.slice(0, i).replace(/\r$/, "")); buf = buf.slice(i + 1); }
  };
  p.stdout!.on("data", feed);
  p.stderr!.on("data", feed);
}

function startServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const p = node(["src/index.ts"]);
    const timer = setTimeout(() => reject(new Error("servidor não subiu em 30 s")), 30_000);
    lines(p, (l) => {
      if (l.includes("Servidor do mundo")) { clearTimeout(timer); resolve(p); }
      // exceção num handler: o servidor sobrevive (onUncaughtException), mas é um bug
      if (l.includes("] erro em ")) record("servidor", `FALHOU ${l.trim()}`);
    });
    p.on("exit", (code) => reject(new Error(`servidor saiu (${code})`)));
  });
}

/** Roda um cenário; com `until`, devolve assim que essa linha aparecer (o processo segue vivo). */
function scenario(name: string, args: string[] = [], until?: string): Promise<void> {
  return new Promise((resolve) => {
    const p = node([`scripts/${name}.ts`, ...args]);
    const timer = setTimeout(() => { record(name, "FALHOU tempo esgotado (300 s)"); p.kill(); }, 300_000);
    let sawCheck = false;
    lines(p, (l) => {
      if (/^(OK|FALHOU)\b/.test(l)) { sawCheck = true; record(name, l); }
      else if (/Error|rror:/.test(l) && !/ExperimentalWarning|colyseus\.js/.test(l)) console.log(`  [${name}] ${l}`);
      if (until && l.includes(until)) { clearTimeout(timer); resolve(); }
    });
    p.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !sawCheck) record(name, `FALHOU saiu com código ${code} sem verificações`);
      resolve();
    });
  });
}

function record(name: string, line: string) {
  const okLine = line.startsWith("OK");
  okLine ? passed++ : failed++;
  if (!okLine) failures.push(`[${name}] ${line}`);
  console.log(`  ${okLine ? "✓" : "✗"} [${name}] ${line.replace(/^(OK|FALHOU)\s+/, "")}`);
}

let server = await startServer();
console.log(`servidor de teste em ws://localhost:${PORT} (banco em ${tmp})`);
for (const s of scenarios) {
  if (s !== "restart") {
    await scenario(s);
    continue;
  }
  // retomada: A caça offline, B fica online; derruba o servidor sem aviso e sobe de novo
  await scenario("restart", ["antes"], "pode derrubar");
  server.kill("SIGKILL");
  await new Promise((r) => setTimeout(r, 1500));
  server = await startServer();
  await scenario("restart", ["depois"]);
}
server.kill("SIGKILL");
await new Promise((r) => setTimeout(r, 500));
try { rmSync(tmp, { recursive: true, force: true }); } catch {}

console.log(`\n${passed} verificações OK, ${failed} falharam`);
for (const f of failures) console.log(`  ${f}`);
process.exit(failed ? 1 : 0);
