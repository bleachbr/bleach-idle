// Jogador-IA do Bleach Idle. NÃO é teste de integração/E2E/regressão: é uma IA jogando o jogo
// de verdade, como um jogador normal, e devolvendo feedback (bugs, UX, balanceamento, sugestões).
// Roda só na máquina local. Por padrão sobe 4 instâncias EM PARALELO (novato, explorador, grinder,
// caotico), cada uma com a própria conta/personagem (reaproveitados entre rodadas), por 15 minutos.
// Opcional: --retorno N adiciona uma fase em que cada instância sai, fica fora e volta (testa retorno
// de jogador, relatório offline e as novidades da main desde o último checkpoint).
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, AREAS, Memoria, PERSONAS, finalReview, type Finding, type Review } from "./agent.js";
import { Game, Player } from "./game.js";
import { MODEL, fmtCost, requireKey } from "./llm.js";
import { prepareSource, saveCheckpoint, fetchDeployedRevision } from "./source.js";

requireKey();
const arg = (name: string, def: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? (process.argv[i + 1] ?? def) : def; };
const flag = (name: string) => process.argv.includes(`--${name}`);
const num = (name: string, def: number) => { const v = Number(arg(name, String(def))); return Number.isFinite(v) && v >= 0 ? v : def; };
const MIN_EXPLORAR = num("explorar", 30); // minutos (padrão 30 min)
const MIN_RETORNO = num("retorno", 0);
const MIN_CICLO = Math.max(0.5, num("ciclo", 3)); // duração de cada visita na fase de retorno
const FORA_S = num("fora", 45); // segundos fora do jogo entre visitas
const FOCUS = arg("focus", "");
const TARGET_URL = arg("url", flag("prod") ? "https://bleach.acoplum.com" : "");
const ENABLE_DEV = flag("dev");
const COMPRESS_VIDEO = !flag("raw-video");
const PERSONAS_RUN = (arg("personas", Object.keys(PERSONAS).join(",")).split(",").map((p) => p.trim()).filter(Boolean));
const bad = PERSONAS_RUN.filter((p) => !(p in PERSONAS));
if (bad.length || !PERSONAS_RUN.length) { console.error(`persona inválida (${bad.join(", ")}). Use: ${Object.keys(PERSONAS).join(", ")}`); process.exit(1); }

const base = fileURLToPath(new URL("..", import.meta.url));
const runsDir = join(base, "runs");
mkdirSync(runsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const runDir = join(runsDir, stamp);

const dbFile = join(runsDir, "jogo.sqlite"); // contas persistentes entre rodadas locais
// servidor remoto: o changelog é o do que ele está rodando (/release), não o da main (#342)
const deployed = TARGET_URL ? await fetchDeployedRevision(TARGET_URL) : undefined;
if (TARGET_URL) console.log(deployed ? `revisão publicada em ${TARGET_URL}: ${deployed.slice(0, 7)}` : `aviso: não consegui ler ${TARGET_URL}/release; o changelog será o da main, com aviso`);
const src = prepareSource(runsDir, flag("local"), TARGET_URL, deployed);
console.log(`código: ${src.origem} @ ${src.sha.slice(0, 7)}${src.previous ? ` (checkpoint ${src.previous.slice(0, 7)})` : " (sem checkpoint)"}`);

const game = new Game(src.dir, dbFile, TARGET_URL, ENABLE_DEV, COMPRESS_VIDEO);
const fmt = (ms: number) => `${Math.max(0, Math.round(ms / 1000))} s`;
const ord: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

type Result = { persona: string; agent: Agent; player: Player; review: Review; visitas: string[]; n: number; memory: Memoria; reused: boolean };

/** Uma instância: joga a fase de exploração e, se pedido, a de retorno, e dá o parecer. */
async function runPersona(persona: string): Promise<Result> {
  const outDir = join(runDir, persona);
  mkdirSync(join(outDir, "screenshots"), { recursive: true });
  const memory = new Memoria(join(runsDir, `memoria-${persona}.json`));
  const reused = memory.data.sessoes > 0 && (TARGET_URL ? true : existsSync(dbFile));
  const agent = new Agent(persona, FOCUS, memory);
  agent.changelog = src.changelog;
  agent.accountExists = reused;
  const player = new Player(game);
  const lastShots: Buffer[] = [];
  const visitas: string[] = [];
  let n = 0;
  const tag = persona.padEnd(10);

  /** Joga durante `durationMs` (contados após abrir o navegador), com reflexão a cada 10 passos. */
  const play = async (label: string, durationMs: number, videoName: string) => {
    await player.openSession(join(outDir, "video", videoName));
    const deadline = Date.now() + durationMs;
    let local = 0;
    while (Date.now() < deadline) {
      n++; local++;
      try {
        const shot = await player.screenshot();
        const file = `screenshots/passo-${String(n).padStart(3, "0")}.png`;
        writeFileSync(join(outDir, file), shot);
        lastShots.push(shot);
        if (lastShots.length > 3) lastShots.shift();
        const ctx = await player.context(agent.acct.char);
        const reply = await agent.step(n, shot, ctx, file, `${label}, restam ${fmt(deadline - Date.now())}`);
        const did = await player.act(reply.acao).catch((e) => `falhou: ${e.message}`);
        agent.record(n, did, reply);
        console.log(`[${tag}] ${label} passo ${n}: ${did} · ${agent.findings.length} achados · ${agent.covered.size}/${Object.keys(AREAS).length} áreas`);
        if (local % 10 === 0) await agent.reflect(n);
        await player.page.waitForTimeout(300);
      } catch (e: any) {
        console.log(`[${tag}] passo ${n}: ${e.message}`);
        await player.page.waitForTimeout(3000).catch(() => {});
      }
    }
  };

  try {
    if (MIN_EXPLORAR > 0) {
      agent.phase = "EXPLORAR. Jogue por inteiro e explore TUDO: todos os painéis, lojas, NPCs, mapas, combate, técnicas, itens, automações, segundo o seu perfil. Cubra as áreas que faltam.";
      await play("explorar", MIN_EXPLORAR * 60_000, "explorar");
      await player.closeSession("sair");
    }
    const fim = Date.now() + MIN_RETORNO * 60_000;
    for (let c = 1; MIN_RETORNO > 0 && Date.now() < fim; c++) {
      const abrupto = c % 2 === 0;
      const duracao = Math.min(MIN_CICLO * 60_000, fim - Date.now());
      agent.phase = c === 1
        ? "RETORNO. Você é um jogador que VOLTA ao jogo depois de um tempo: confira se o personagem, inventário, nível, mapa e progresso estão como deixou, se apareceu relatório/mensagem de tempo offline e se está coerente. Depois TESTE AS NOVIDADES da main listadas acima (jogando normalmente, pelas mecânicas naturais do jogo). Antes de terminar a visita, ligue a caçada/treino automático para acumular progresso offline."
        : `RETORNO (visita ${c}). Confira o que aconteceu enquanto esteve fora (relatório offline, XP/ouro/itens coerentes?), se a sessão restaurou direito e continue testando as novidades da main pelas mecânicas naturais do jogo. Antes de terminar a visita, ligue a caçada/treino automático.`;
      await play(`retorno ${c}`, duracao, `retorno-${c}`);
      visitas.push(`Visita ${c}: saída ${abrupto ? "abrupta (aba fechada)" : "pela interface"}, ${FORA_S} s fora`);
      await player.closeSession(abrupto ? "abrupto" : "sair");
      if (Date.now() + FORA_S * 1000 >= fim) break;
      await new Promise((r) => setTimeout(r, FORA_S * 1000));
    }
  } catch (e: any) {
    console.error(`[${tag}] erro: ${e.message}`);
    await player.closeSession("abrupto");
  }
  let review: Review = {};
  try { review = await finalReview(agent, [...player.allErrors, ...game.serverErrors], lastShots); }
  catch (e: any) { console.log(`[${tag}] parecer falhou: ${e.message}`); }
  agent.commit();
  return { persona, agent, player, review, visitas, n, memory, reused };
}

const list = (xs?: string[]) => (xs?.length ? xs.map((x) => `- ${x}`).join("\n") : "-");
const sortF = (fs: Finding[]) => [...fs].sort((a, b) => (ord[a.severidade] ?? 1) - (ord[b.severidade] ?? 1));

function reportOf(r: Result): string {
  const { agent, review, memory } = r;
  const notas = review.notas ? Object.entries(review.notas).map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v}/10 |`).join("\n") : "";
  const found = sortF(agent.findings);
  return [
    `# ${r.persona} — ${stamp}`,
    "",
    `Modelo: ${MODEL} · Passos: ${r.n} · ${MIN_EXPLORAR} min explorar${MIN_RETORNO ? ` + ${MIN_RETORNO} min retorno` : ""} · Sessão #${memory.data.sessoes} · conta ${r.reused ? "reaproveitada" : "nova"}${FOCUS ? ` · Foco: ${FOCUS}` : ""}`,
    "",
    "> Achados de IA são hipóteses: reproduza antes de corrigir. Vídeos em `video/`.",
    "",
    "## Parecer do jogador",
    "",
    review.resumo ?? "(parecer indisponível)",
    "",
    ...(notas ? ["| Critério | Nota |", "| :--- | :--- |", notas, ""] : []),
    `**Voltaria a jogar?** ${review.voltariaJogar ?? "-"}`,
    "",
    "### O que gostou", list(review.gostei), "",
    "### Frustrações", list(review.frustracoes), "",
    "### Sugestões priorizadas", "",
    ...(review.sugestoes?.length ? review.sugestoes.map((s, i) => `${i + 1}. **${s.titulo}** (impacto ${s.impacto}, esforço ${s.esforco}): ${s.porque}`) : ["-"]),
    "",
    `## Achados (${found.length})`,
    "",
    ...(found.length ? found.map((f, i) => `### ${i + 1}. [${f.severidade}] ${f.tipo}: ${f.titulo}\n${f.detalhe}\n\nPasso ${f.passo} · ![passo ${f.passo}](${f.shot})\n`) : ["Nenhum.\n"]),
    "## Visitas de retorno", "", ...(r.visitas.length ? r.visitas.map((v) => `- ${v}`) : ["-"]), "",
    "## Cobertura", "",
    ...Object.entries(AREAS).map(([id, d]) => `- [${r.agent.covered.has(id) ? "x" : " "}] ${id}: ${d}`),
    "",
    `## Erros de console (${r.player.allErrors.length})`, "",
    ...[...new Set(r.player.allErrors)].slice(0, 30).map((e) => `- ${e}`),
    "",
    "## Trilha de ações", "", ...agent.history.map((h) => `- ${h}`), "",
  ].join("\n");
}

let results: Result[] = [];
let started = false;
try {
  await game.startServers();
  started = true;
  console.log(`jogo no ar · ${PERSONAS_RUN.length} instâncias em paralelo (${PERSONAS_RUN.join(", ")}) · ${MIN_EXPLORAR}${MIN_RETORNO ? ` + ${MIN_RETORNO}` : ""} min · ${MODEL}${TARGET_URL ? ` · alvo: ${TARGET_URL}` : ""}`);
  results = await Promise.all(PERSONAS_RUN.map(runPersona));
} catch (e: any) {
  console.error("erro na rodada:", e.message);
} finally {
  await game.stop();
}
if (started && src.checkpointConfiavel) saveCheckpoint(runsDir, src.sha);
else if (started) console.log("checkpoint não gravado: a revisão publicada era desconhecida, então a main não vale como código testado");

// ---------- relatórios ----------
for (const r of results) writeFileSync(join(runDir, r.persona, "relatorio.md"), reportOf(r));

// consolida: achados de todas as personas, agrupando os repetidos por título (mais de uma persona = mais confiável)
const merged = new Map<string, { f: Finding; quem: string[] }>();
for (const r of results) for (const f of r.agent.findings) {
  const k = f.titulo.toLowerCase();
  const m = merged.get(k);
  if (m) { if (!m.quem.includes(r.persona)) m.quem.push(r.persona); } else merged.set(k, { f: { ...f, shot: `${r.persona}/${f.shot}` }, quem: [r.persona] });
}
const all = [...merged.values()].sort((a, b) => (ord[a.f.severidade] ?? 1) - (ord[b.f.severidade] ?? 1) || b.quem.length - a.quem.length);
const cover = Object.keys(AREAS).map((id) => `| ${id} | ${results.map((r) => (r.agent.covered.has(id) ? "x" : "")).join(" | ")} |`);
const sum = [
  `# Jogador-IA — rodada ${stamp}`,
  "",
  `Modelo: ${MODEL} · ${PERSONAS_RUN.length} instâncias paralelas · ${MIN_EXPLORAR}${MIN_RETORNO ? ` + ${MIN_RETORNO}` : ""} min · Código: ${src.origem} @ ${src.sha.slice(0, 7)}`,
  `Uso e custo estimado: ${fmtCost()}`,
  "",
  "> Achados de IA são hipóteses: reproduza antes de corrigir.",
  "",
  "## Pareceres",
  "",
  `| Persona | ${["onboarding", "clareza_da_interface", "combate", "progressao", "feedback_visual_sonoro", "diversao", "estabilidade"].map((k) => k.replace(/_/g, " ")).join(" | ")} | Achados | Relatório |`,
  `| :--- | ${Array(9).fill(":---").join(" | ")} |`,
  ...results.map((r) => `| ${r.persona} | ${["onboarding", "clareza_da_interface", "combate", "progressao", "feedback_visual_sonoro", "diversao", "estabilidade"].map((k) => r.review.notas?.[k] ?? "-").join(" | ")} | ${r.agent.findings.length} | [abrir](${r.persona}/relatorio.md) |`),
  "",
  ...results.flatMap((r) => [`**${r.persona}:** ${r.review.resumo ?? "(sem parecer)"}`, ""]),
  `## Achados consolidados (${all.length})`,
  "",
  ...(all.length ? all.map(({ f, quem }, i) => `${i + 1}. **[${f.severidade}] ${f.tipo}: ${f.titulo}** — ${f.detalhe} _(${quem.join(", ")}${quem.length > 1 ? ": visto por mais de uma persona" : ""}; [captura](${f.shot}))_`) : ["Nenhum."]),
  "",
  "## Cobertura por persona",
  "",
  `| Área | ${results.map((r) => r.persona).join(" | ")} |`,
  `| :--- | ${results.map(() => ":---").join(" | ")} |`,
  ...cover,
  "",
  `## Novidades até ${src.sha.slice(0, 7)}`,
  "",
  "```",
  src.changelog,
  "```",
  "",
  `## Erros do servidor (${game.serverErrors.length})`,
  "",
  ...[...new Set(game.serverErrors)].slice(0, 20).map((e) => `- ${e}`),
  "",
].join("\n");
mkdirSync(runDir, { recursive: true });
writeFileSync(join(runDir, "relatorio.md"), sum);
console.log(`uso: ${fmtCost()}`);
console.log(`relatório: ${join(runDir, "relatorio.md")}`);
process.exit(0);
