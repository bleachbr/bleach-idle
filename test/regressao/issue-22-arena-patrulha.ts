// Regressão da issue #22: o servidor manda `arenaData`, `arenaMatchFound`, `arenaResult` e `patrolData`,
// mas o cliente não registrava handler e o colyseus.js avisava no console
// ("onMessage() not registered for type ..."). Roda o jogo de verdade (servidor isolado + Vite) no Chromium:
// cadastro, lobby e comandos no chat pela tela. Só a preparação usa o `window.__bi` do modo Dev
// (subir ao nível 20 da Arena e ler o nível no estado). Toda espera é por condição na página, nunca por tempo.
// Duas provas: os frames do WebSocket mostram que `patrolData` e `arenaData` chegaram de fato, e o console
// não pode ter o aviso de handler ausente para nenhum dos quatro tipos.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CLIENT_PORT, Game, VIEW } from "../src/game.js";

const ROOT = resolve(import.meta.dirname, "../..");
const WATCHED = ["arenaData", "arenaMatchFound", "arenaResult", "patrolData"];
const TIMEOUT = 20_000;

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "bi-regressao-22-"));
  const game = new Game(ROOT, join(dir, "jogo.sqlite"));
  const unregistered: string[] = [];
  // quantas vezes cada tipo chegou pelo WebSocket (o tipo vai como texto dentro do frame msgpack)
  const received = new Map<string, number>(WATCHED.map((w) => [w, 0]));
  try {
    await game.startServers();
    const ctx = await game.browser.newContext({ viewport: VIEW });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      const t = m.text();
      if (t.includes("onMessage() not registered for type")) unregistered.push(t);
    });
    page.on("websocket", (ws) => ws.on("framereceived", ({ payload }) => {
      const text = typeof payload === "string" ? payload : payload.toString("latin1");
      for (const w of WATCHED) if (text.includes(w)) received.set(w, received.get(w)! + 1);
    }));

    // cadastro e personagem novo
    await page.goto(`http://localhost:${CLIENT_PORT}/?login`);
    await page.fill("#login-name", "regressao22");
    await page.fill("#login-pass", "senha-de-teste");
    await page.click('#auth-form button[value="register"]');
    await page.waitForSelector("#lobby:not([hidden])", { timeout: TIMEOUT });
    await page.fill("#new-name", "Regressao");
    await page.click('#create-form button[type="submit"]');
    await page.click("#char-list .char-row button.primary", { timeout: TIMEOUT });
    await page.waitForFunction(() => !!(window as any).__bi?.room, null, { timeout: TIMEOUT });

    const chat = async (text: string) => {
      await page.focus("#chatin");
      await page.fill("#chatin", text);
      await page.press("#chatin", "Enter");
    };
    const waitLog = (needle: string) =>
      page.waitForFunction((n) => document.querySelector("#chatlog")?.textContent?.includes(n), needle, { timeout: TIMEOUT });

    // nível mínimo da Arena (20) pelo modo Dev (`__bi`), ligado só no servidor de teste
    await page.evaluate(() => (window as any).__bi.room.send("dev", { a: "level", n: 20 }));
    await page.waitForFunction(() => {
      const bi = (window as any).__bi;
      return [...bi.room.state.players.values()].some((p: any) => p.name === "Regressao" && p.level >= 20);
    }, null, { timeout: TIMEOUT });

    await chat("/patrulha"); // log + patrolData
    await waitLog("Nenhuma patrulha em andamento");
    await chat("/arena entrar"); // log + arenaData
    await waitLog("Entrou na fila da Arena");
    await chat("/arena sair"); // log + arenaData
    await waitLog("Você saiu da fila da Arena");
    // barreira: o servidor responde na ordem; quando este log chega, os dados acima já chegaram
    await chat("/arena");
    await waitLog("Arena 1v1:");

    const hits = unregistered.filter((t) => WATCHED.some((w) => new RegExp(`\\b${w}\\b`).test(t)));
    const others = unregistered.filter((t) => !hits.includes(t));
    if (others.length) console.log(`(fora do escopo da #22) outros avisos: ${others.join(" | ")}`);
    // sem as mensagens chegando, a ausência de aviso não provaria nada (ex.: texto do colyseus.js mudou)
    const missing = ["patrolData", "arenaData"].filter((w) => !received.get(w));
    if (missing.length) {
      console.error(`FALHOU: o teste não viu chegar ${missing.join(", ")}; a ausência de aviso não prova nada.`);
      process.exitCode = 1;
    } else if (hits.length) {
      console.error(`FALHOU: mensagens sem handler no cliente:\n  ${hits.join("\n  ")}`);
      process.exitCode = 1;
    } else {
      console.log(`OK: patrolData (${received.get("patrolData")}x) e arenaData (${received.get("arenaData")}x) chegaram, sem aviso de handler ausente.`);
    }
  } finally {
    await game.stop();
    // o servidor pode ainda estar fechando o -wal/-shm do SQLite
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
