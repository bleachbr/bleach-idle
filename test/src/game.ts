// Sobe o jogo como caixa-preta (servidor isolado + Vite) e controla o navegador.
// O agente nunca recebe nada além do que uma pessoa veria; o estado técnico (`window.__bi`,
// só existe em dev) vai como contexto auxiliar para detectar inconsistências.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export const VIEW = { width: 1280, height: 720 };
export const SERVER_PORT = 2578;
export const CLIENT_PORT = 5183;

export type Action =
  | { tipo: "click"; x?: number; y?: number; alvo?: number }
  | { tipo: "type"; texto: string }
  | { tipo: "key"; tecla: string }
  | { tipo: "hold"; tecla: string; ms: number }
  | { tipo: "wait"; ms: number };

function waitFor(p: ChildProcess, needle: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`"${needle}" não apareceu em ${ms / 1000} s`)), ms);
    const feed = (d: Buffer) => { if (d.toString().includes(needle)) { clearTimeout(timer); resolve(); } };
    p.stdout!.on("data", feed);
    p.stderr!.on("data", feed);
    p.on("exit", (c) => reject(new Error(`processo saiu (${c})`)));
  });
}

export class Game {
  private procs: ChildProcess[] = [];
  browser!: Browser;
  serverErrors: string[] = [];
  baseUrl: string;

  /** `srcDir`: raiz do código do jogo (checkout da main ou a árvore local); `dbFile`: banco persistente das contas de teste; `targetUrl`: URL remota alternativa (ex.: https://bleach.acoplum.com); `enableDev`: habilita modo Dev local (padrão desligado); `compressVideo`: comprime para MP4 WhatsApp e apaga o WebM original (padrão true). */
  constructor(private srcDir: string, private dbFile: string, public targetUrl = "", public enableDev = false, public compressVideo = true) {
    this.baseUrl = targetUrl ? targetUrl.replace(/\/+$/, "") : `http://localhost:${CLIENT_PORT}`;
  }

  async startServers() {
    if (this.targetUrl) {
      this.browser = await chromium.launch();
      return;
    }
    // não repassa a chave do Gemini aos processos do jogo
    const env = { ...process.env, GEMINI_API_KEY: "" };
    const devFlag = this.enableDev ? "1" : "0";
    const server = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
      cwd: join(this.srcDir, "server"),
      env: { ...env, PORT: String(SERVER_PORT), DB_FILE: this.dbFile, LOGIN_MAX_FAILS_IP: "1000000", INVASION_FIRST_MS: "999999999", WORLDBOSS_FIRST_MS: "999999999", BI_DEBUG: devFlag, BI_DEV: devFlag },
    });
    this.procs.push(server);
    server.stdout!.on("data", (d: Buffer) => this.logServer(d));
    server.stderr!.on("data", (d: Buffer) => this.logServer(d));
    await waitFor(server, "Servidor do mundo", 30_000);
    const viteCfg = join(dirname(this.dbFile), "vite.config.mjs");
    writeFileSync(viteCfg, `export default { root: ${JSON.stringify(join(this.srcDir, "client"))}, server: { fs: { strict: false } } };\n`);
    const vite = spawn("npx", ["vite", "--config", viteCfg, "--port", String(CLIENT_PORT), "--strictPort"], {
      cwd: join(this.srcDir, "client"), env: { ...env, VITE_SERVER: `ws://localhost:${SERVER_PORT}` },
    });
    this.procs.push(vite);
    await waitFor(vite, "Local:", 30_000);
    this.browser = await chromium.launch();
  }

  private logServer(d: Buffer) {
    for (const l of d.toString().split("\n")) if (l.includes("] erro em ")) this.serverErrors.push(l.trim().slice(0, 300));
  }

  async stop() {
    await this.browser?.close().catch(() => {});
    this.procs.forEach((p) => p.kill());
  }
}

/** Comprime um vídeo WebM do Playwright para MP4 otimizado para WhatsApp (H.264/AAC, sob 180MB) e remove o original. */
export function compressVideoToMp4(rawWebmPath: string, targetMp4Path: string): boolean {
  if (!existsSync(rawWebmPath)) return false;
  try {
    execFileSync("ffmpeg", [
      "-y",
      "-i", rawWebmPath,
      "-c:v", "libx264",
      "-crf", "26",
      "-preset", "faster",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      targetMp4Path,
    ], { stdio: "ignore" });
    if (existsSync(targetMp4Path) && statSync(targetMp4Path).size > 0) {
      unlinkSync(rawWebmPath);
      const parentDir = dirname(rawWebmPath);
      try { rmSync(parentDir, { recursive: true, force: true }); } catch {}
      console.log(`vídeo comprimido (WhatsApp MP4): ${targetMp4Path} (${(statSync(targetMp4Path).size / 1e6).toFixed(1)} MB)`);
      return true;
    }
  } catch (err: any) {
    console.warn(`aviso: falha ao comprimir vídeo com ffmpeg (${err.message}). Mantendo original.`);
  }
  return false;
}

/** Um jogador-IA: navegador próprio (contexto isolado), com seus erros de console. */
export class Player {
  private ctx?: BrowserContext;
  page!: Page;
  consoleErrors: string[] = [];
  allErrors: string[] = [];
  /** Elementos interativos visíveis (numerados) no último contexto: alternativa a clicar por coordenada. */
  private targets: { x: number; y: number }[] = [];

  constructor(private game: Game) {}

  /** Abre uma sessão nova do navegador (como um jogador que volta), gravando vídeo em `videoDir`. */
  async openSession(videoDir: string) {
    this.ctx = await this.game.browser.newContext({ viewport: VIEW, recordVideo: { dir: videoDir, size: VIEW } });
    this.page = await this.ctx.newPage();
    const note = (t: string) => { this.consoleErrors.push(t); this.allErrors.push(t); };
    this.page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") note(`[${m.type()}] ${m.text().slice(0, 200)}`); });
    this.page.on("pageerror", (e) => note(`[pageerror] ${String(e.message).slice(0, 200)}`));
    await this.page.goto(`${this.game.baseUrl}/?login`);
    await this.page.waitForTimeout(1500);
  }

  /** "sair": usa os botões do jogo (trocar de personagem e sair da conta); "abrupto": fecha a aba (queda de conexão). */
  async closeSession(mode: "sair" | "abrupto") {
    if (mode === "sair") {
      await this.page?.evaluate(() => (document.querySelector("#exit-btn") as HTMLElement | null)?.click()).catch(() => {});
      await this.page?.waitForTimeout(1500);
      await this.page?.evaluate(() => (document.querySelector("#logout-btn") as HTMLElement | null)?.click()).catch(() => {});
      await this.page?.waitForTimeout(800);
    }
    const video = this.page?.video();
    await this.ctx?.close().catch(() => {}); // finaliza o vídeo
    this.ctx = undefined;
    const rawPath = await video?.path().catch(() => null);
    if (rawPath && existsSync(rawPath) && this.game.compressVideo) {
      const targetMp4 = `${dirname(rawPath)}.mp4`;
      compressVideoToMp4(rawPath, targetMp4);
    }
  }

  async screenshot() { return this.page.screenshot({ type: "png" }); }

  async act(a: Action | undefined): Promise<string> {
    const clamp = (n: unknown, max: number) => Math.max(0, Math.min(max - 1, Math.round(Number(n) || 0)));
    const p = this.page;
    if (!a || typeof a !== "object") return "sem ação válida";
    switch (a.tipo) {
      case "click": {
        const t = typeof a.alvo === "number" ? this.targets[a.alvo] : undefined;
        if (t) { await p.mouse.click(t.x, t.y); return `click alvo ${a.alvo} (${t.x},${t.y})`; }
        const x = clamp(a.x, VIEW.width), y = clamp(a.y, VIEW.height); await p.mouse.click(x, y); return `click ${x},${y}`; }
      case "type": { const t = String(a.texto ?? "").slice(0, 200); await p.keyboard.type(t, { delay: 20 }); return `type "${t}"`; }
      case "key": { const k = String(a.tecla ?? "").slice(0, 20); await p.keyboard.press(k); return `key ${k}`; }
      case "hold": { const k = String(a.tecla ?? "").slice(0, 20); const ms = Math.min(3000, Number(a.ms) || 500); await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); return `hold ${k} ${ms}ms`; }
      case "wait": { const ms = Math.min(5000, Number(a.ms) || 1000); await p.waitForTimeout(ms); return `wait ${ms}ms`; }
      default: return "ação desconhecida";
    }
  }

  /** Estado do personagem (via __bi), chat recente e erros novos desde a última chamada. */
  async context(charName: string): Promise<string> {
    const game = await this.page.evaluate((name) => {
      const bi = (window as any).__bi;
      if (!bi) return "jogo ainda não iniciou (login/lobby)";
      const me = [...bi.room.state.players.values()].find((p: any) => p.name === name) as any;
      if (!me) return "personagem não encontrado no estado";
      const keys = ["level", "exp", "hp", "maxHp", "rei", "maxRei", "x", "y", "targetId", "autoHunt", "autoTarget"];
      return JSON.stringify(Object.fromEntries(keys.map((k) => [k, me[k]]))) + ` | monstros: ${bi.room.state.monsters?.size ?? "?"}`;
    }, charName).catch(() => "estado indisponível");
    const chat = await this.page.evaluate(() => [...document.querySelectorAll("#chatlog > *")].slice(-6).map((e) => e.textContent).join(" / ")).catch(() => "");
    const els = await this.page.evaluate(() => {
      const out: { x: number; y: number; d: string }[] = [];
      for (const e of document.querySelectorAll<HTMLElement>("button, a, input, select, textarea, summary, [role=button], [onclick]")) {
        const r = e.getBoundingClientRect();
        const st = getComputedStyle(e);
        if (r.width < 4 || r.height < 4 || st.visibility === "hidden" || st.display === "none" || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        const label = (e.innerText || (e as HTMLInputElement).placeholder || e.title || e.getAttribute("aria-label") || e.id || e.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
        out.push({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), d: `${e.tagName.toLowerCase()}${(e as HTMLInputElement).type ? `[${(e as HTMLInputElement).type}]` : ""} "${label}"` });
      }
      return out.slice(0, 40);
    }).catch(() => []);
    this.targets = els;
    const elsTxt = els.map((e, i) => `${i}: ${e.d} @${e.x},${e.y}`).join("\n");
    const errs = this.consoleErrors.splice(0).slice(-5);
    const srv = this.game.serverErrors.slice(-3);
    return `estado: ${game}\nchat recente: ${chat || "(vazio)"}\nelementos clicáveis (use {"tipo":"click","alvo":N}; o mapa do jogo é canvas: use x,y):\n${elsTxt || "(nenhum)"}\nerros de console: ${errs.length ? errs.join(" || ") : "nenhum"}\nerros do servidor: ${srv.length ? srv.join(" || ") : "nenhum"}`;
  }
}
