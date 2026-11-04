// O jogador-IA: personas, memória entre sessões, reflexão periódica, cobertura de áreas e
// detecção de travamento. Tudo no estilo Cradle (percepção -> planejamento -> reflexão -> memória).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { askJson, png } from "./llm.js";
import type { Action } from "./game.js";

/** Cada persona joga com a própria conta e personagem (reaproveitados entre rodadas). */
export const accountOf = (persona: string) => ({ login: `ia_${persona}`, pass: "senha-de-teste-ia", char: `IA${persona[0].toUpperCase()}${persona.slice(1, 9)}` });

/** Áreas do jogo que um jogador normal deveria experimentar. O agente marca as que visitou. */
export const AREAS: Record<string, string> = {
  login: "criar conta e entrar",
  personagem: "escolher e criar personagem",
  tutorial: "entender o começo / tutorial / primeiras dicas",
  movimento: "andar pelo mapa",
  combate: "atacar um monstro até matar",
  tecnicas: "usar técnicas/habilidades",
  pocoes: "usar poção de cura/reiatsu",
  inventario: "abrir inventário e ver itens",
  equipar: "equipar um item",
  loja: "abrir loja de NPC e comprar/vender",
  npc: "falar com NPC / missão",
  viagem: "viajar entre mapas",
  livro: "abrir o Livro (bestiário, conquistas, diário)",
  ranking: "abrir o ranking",
  temporada: "abrir o passe de temporada",
  lojaCristais: "abrir a Loja de Cristais",
  autoHunt: "ligar caçada/treino automático",
  chat: "usar o chat e comandos (/ajuda)",
  morte: "morrer e ver a tela de morte",
  nivel: "subir de nível",
  som_visual: "mudar HD/pixel e som",
  celular: "layout em tela pequena/touch (se visível)",
};

export const PERSONAS: Record<string, string> = {
  novato: "Você é um jogador NOVATO que nunca viu o jogo. Não conhece os controles: descubra pela interface. Anote tudo que confunde.",
  explorador: "Você é um EXPLORADOR: quer ver todos os painéis, botões, mapas e NPCs antes de lutar muito.",
  grinder: "Você é um GRINDER/idle: quer progredir rápido, ligar automações, avaliar ritmo de XP, ouro e drops.",
  caotico: "Você é um TESTER CAÓTICO: clica rápido, abre e fecha painéis, aperta teclas estranhas, tenta ações fora de ordem e usa entradas esquisitas (textos longos, vazios, símbolos) para quebrar o jogo.",
};

export type Finding = { tipo: string; severidade: string; titulo: string; detalhe: string; passo: number; shot: string };
type Memory = { sessoes: number; aprendizados: string[]; achados: string[]; cobertura: Record<string, number> };

export class Memoria {
  data: Memory = { sessoes: 0, aprendizados: [], achados: [], cobertura: {} };
  constructor(private file: string) {
    if (existsSync(file)) try { this.data = { ...this.data, ...JSON.parse(readFileSync(file, "utf8")) }; } catch {}
  }
  save() { writeFileSync(this.file, JSON.stringify(this.data, null, 1)); }
}

const SYSTEM = `Você é um playtester de IA jogando "Bleach Idle" (MMORPG 2D top-down, idle/ativo, universo Bleach) pela TELA, como uma pessoa: só vê a captura 1280x720 e age com clique (x,y), texto ou tecla. Você começa na tela de login.
Jogue DE VERDADE e com propósito: aprenda os controles pela interface, mova-se, lute, use itens, painéis, lojas, NPCs, viagens. Ao entrar no mundo, crie personagem com o nome exato indicado. Outros testers de IA jogam no mesmo mundo ao mesmo tempo (nomes IA...): ignore-os, não os convide nem ataque.
REGRA CRÍTICA: você é um jogador COMUM em ambiente real. NUNCA clique em botões ou ferramentas de desenvolvimento ("DEV", painel dev, atalhos de admin). Progrida e teste estritamente pelas mecânicas naturais do jogo (combate, missões, NPCs, lojas, inventário, viagens, progressão orgânica).
Registre PROBLEMAS com precisão (só o que viu NESTE passo: captura, chat, estado ou erros):
- bug: quebrado, travado, sobreposto/cortado, "undefined/NaN", inconsistência numérica, erro de console/servidor;
- ux: confusão, falta de feedback, fluxo longo, alvo pequeno, falta de dica;
- melhoria: ideia concreta;  - balanceamento: XP/dano/ouro/progressão estranhos;  - texto: português, tom, termos.
Não repita achados já conhecidos. Seja específico: o que, onde, como reproduzir.
Se a tela não mudou depois da sua ação, tente outra coisa (clique em outro lugar, Escape, outra tecla).
Responda SOMENTE JSON:
{"pensamento":"curto","objetivo":"o que tenta agora","cobertura":["ids de áreas que você acabou de experimentar"],"achados":[{"tipo","severidade":"alta|media|baixa","titulo","detalhe"}],"acao":{"tipo":"click","alvo":N}|{"tipo":"click","x":0,"y":0}|{"tipo":"type","texto":""}|{"tipo":"key","tecla":"ArrowUp|Enter|Escape|1|2|3|Space|..."}|{"tipo":"hold","tecla":"ArrowRight","ms":800}|{"tipo":"wait","ms":1000}}
Prefira click por "alvo" (lista de elementos do contexto) para botões e campos de formulário; use x,y só no mapa/canvas. "type" digita no campo focado (clique antes). Para enviar formulário: key Enter ou clique no botão.`;

export type StepReply = { pensamento?: string; objetivo?: string; cobertura?: string[]; achados?: Omit<Finding, "passo" | "shot">[]; acao?: Action };

export class Agent {
  history: string[] = [];
  findings: Finding[] = [];
  covered = new Set<string>();
  objective = "entrar no jogo";
  private lastHash = "";
  private same = 0;
  private sessionNotes: string[] = [];

  /** Orientação da fase atual (explorar ou retorno), com tempo restante; definida pelo orquestrador. */
  phase = "";
  /** O que mudou na main desde o último checkpoint. */
  changelog = "";
  accountExists = false;

  acct: ReturnType<typeof accountOf>;

  constructor(private persona: string, private focus: string, private mem: Memoria) { this.acct = accountOf(persona); }

  /** Percepção + decisão de um passo. Devolve a ação a executar. */
  async step(n: number, shot: Buffer, ctx: string, shotFile: string, remaining: string): Promise<StepReply> {
    const hash = createHash("md5").update(shot).digest("hex");
    this.same = hash === this.lastHash ? this.same + 1 : 0;
    this.lastHash = hash;
    const known = [...this.mem.data.achados, ...this.findings.map((f) => f.titulo)].slice(-60);
    const text = [
      `Persona: ${PERSONAS[this.persona]}`,
      this.focus ? `Foco desta sessão: ${this.focus}` : "",
      `Passo ${n} (${remaining}). Conta: login "${this.acct.login}", senha "${this.acct.pass}". Nome do personagem: "${this.acct.char}". ${this.accountExists ? "A conta e o personagem JÁ EXISTEM de sessões anteriores: apenas entre (login) e jogue o personagem existente; só crie se o login falhar." : "Conta nova: crie a conta e o personagem; se a conta já existir, faça login direto."}`,
      `FASE: ${this.phase}`,
      `Novidades do código testado (testar quando fizer sentido; se algo descrito aqui não existir ou não funcionar, registre, MENOS o que o AVISO do texto disser que ainda não está no ar):\n${this.changelog.slice(0, 3000)}`,
      `Objetivo atual: ${this.objective}`,
      this.same >= 2 ? `ATENÇÃO: a tela está IGUAL há ${this.same} passos. Se não é esperado (ex.: caçando), mude de estratégia e registre como possível bug/UX se parecer travado.` : "",
      `Áreas ainda não experimentadas: ${Object.keys(AREAS).filter((a) => !this.covered.has(a) && !(this.mem.data.cobertura[a] > 0)).map((a) => `${a} (${AREAS[a]})`).join("; ") || "todas"}`,
      `O que você já aprendeu dos controles:\n${[...this.mem.data.aprendizados, ...this.sessionNotes].slice(-25).join("\n") || "(nada ainda)"}`,
      `Achados já conhecidos (NÃO repetir): ${known.join(" | ") || "(nenhum)"}`,
      `Últimas ações:\n${this.history.slice(-8).join("\n") || "(nenhuma)"}`,
      `Contexto técnico (não visível na tela):\n${ctx}`,
    ].filter(Boolean).join("\n\n");
    const r = await askJson<StepReply>(SYSTEM, [{ text }, png(shot)]);
    for (const f of r.achados ?? []) {
      if (!f?.titulo) continue;
      const titulo = String(f.titulo).slice(0, 120);
      if (known.some((k) => k.toLowerCase() === titulo.toLowerCase())) continue;
      this.findings.push({ tipo: String(f.tipo ?? "ux"), severidade: String(f.severidade ?? "media"), titulo, detalhe: String(f.detalhe ?? "").slice(0, 600), passo: n, shot: shotFile });
    }
    for (const a of r.cobertura ?? []) if (a in AREAS) this.covered.add(a);
    if (r.objetivo) this.objective = String(r.objetivo).slice(0, 150);
    return r;
  }

  record(n: number, did: string, r: StepReply) {
    this.history.push(`${n}. ${did} — ${String(r.pensamento ?? "").slice(0, 120)}`);
  }

  /** Reflexão (a cada ~10 passos): extrai aprendizados e escolhe o próximo objetivo. */
  async reflect(n: number) {
    const r = await askJson<{ aprendizados?: string[]; objetivo?: string }>(
      `Você revisa o progresso de um playtester de IA. Com base nas ações recentes, extraia FATOS curtos e úteis sobre controles e funcionamento do jogo (ex.: "WASD move", "clicar no monstro ataca") e escolha o PRÓXIMO objetivo para cobrir áreas não testadas. Responda JSON: {"aprendizados":["..."],"objetivo":"..."}`,
      [{ text: `Persona: ${PERSONAS[this.persona]}\nÁreas cobertas: ${[...this.covered].join(", ") || "nenhuma"}\nÁreas restantes: ${Object.keys(AREAS).filter((a) => !this.covered.has(a)).join(", ")}\nAções recentes:\n${this.history.slice(-12).join("\n")}\nAprendizados atuais:\n${this.sessionNotes.slice(-10).join("\n")}` }],
      0.3,
    ).catch(() => ({} as any));
    for (const a of r.aprendizados ?? []) if (typeof a === "string" && !this.sessionNotes.includes(a)) this.sessionNotes.push(a.slice(0, 160));
    if (r.objetivo) this.objective = String(r.objetivo).slice(0, 150);
    console.log(`  reflexão @${n}: objetivo → ${this.objective}`);
  }

  /** Persiste o que vale para as próximas sessões. */
  commit() {
    const d = this.mem.data;
    d.sessoes++;
    d.aprendizados = [...new Set([...d.aprendizados, ...this.sessionNotes])].slice(-40);
    d.achados = [...new Set([...d.achados, ...this.findings.map((f) => f.titulo)])].slice(-200);
    for (const a of this.covered) d.cobertura[a] = (d.cobertura[a] ?? 0) + 1;
    this.mem.save();
  }
}

export type Review = {
  resumo?: string;
  notas?: Record<string, number>;
  melhorou?: string[];
  gostei?: string[];
  frustracoes?: string[];
  sugestoes?: { titulo: string; porque: string; impacto: string; esforco: string }[];
  voltariaJogar?: string;
};

/** Parecer final do "jogador": notas, o que gostou, frustrações e sugestões priorizadas. */
export async function finalReview(agent: Agent, errors: string[], lastShots: Buffer[]): Promise<Review> {
  return askJson<Review>(
    `Você acabou de jogar "Bleach Idle" como a persona descrita e agora dá o PARECER FINAL de jogador e de designer de jogos, em português do Brasil, honesto e específico (nada de elogio vago).
Responda JSON: {"resumo":"3-5 frases sobre a experiência","notas":{"onboarding":0-10,"clareza_da_interface":0-10,"combate":0-10,"progressao":0-10,"feedback_visual_sonoro":0-10,"diversao":0-10,"estabilidade":0-10},"gostei":["..."],"frustracoes":["..."],"sugestoes":[{"titulo","porque","impacto":"alto|medio|baixo","esforco":"alto|medio|baixo"}] (ordene por impacto/esforço, 5 a 10 itens),"voltariaJogar":"sim/não e por quê"}`,
    [{ text: `Persona: ${PERSONAS[(agent as any).persona]}\nPassos: ${agent.history.length}\nÁreas cobertas: ${[...agent.covered].join(", ")}\nAchados:\n${agent.findings.map((f) => `- [${f.severidade}] ${f.tipo}: ${f.titulo} — ${f.detalhe}`).join("\n") || "(nenhum)"}\nTrilha:\n${agent.history.join("\n")}\nErros de console/servidor únicos: ${[...new Set(errors)].slice(0, 15).join(" || ") || "nenhum"}` }, ...lastShots.map(png)],
    0.5,
  );
}
