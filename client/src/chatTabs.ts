// Abas do chat (M3-02, ADR-002 do Social avançado): qual aba recebe cada mensagem, o histórico de cada uma,
// as não lidas e o comando que o texto ganha ao sair por uma aba. Sem DOM: main.ts desenha.
// O servidor não muda: o canal já vem na mensagem ("chat" com ch, ou "log").

export type ChatTab = "geral" | "combate" | "party" | "guilda" | "privado";
export const CHAT_TABS: { id: ChatTab; label: string }[] = [
  { id: "geral", label: "Geral" },
  { id: "combate", label: "Combate" },
  { id: "party", label: "Party" },
  { id: "guilda", label: "Guilda" },
  { id: "privado", label: "Privado" },
];
const TAB_IDS = CHAT_TABS.map((t) => t.id);

/** linhas guardadas por aba (como o #chatlog único de antes) */
export const CHAT_MAX = 200;
/** o "log" que chega até aqui depois de enviar algo é tratado como resposta e aparece também na aba aberta */
export const REPLY_WINDOW_MS = 2000;

export interface ChatLineData { text: string; cls: string }

/** canal do servidor -> aba; canal desconhecido vai para Geral (o servidor pode criar canal novo) */
const BY_CHANNEL: ReadonlyMap<string, ChatTab> = new Map([["pm", "privado"], ["party", "party"], ["guild", "guilda"]]);

export function tabOf(kind: "chat" | "log", ch?: string): ChatTab {
  if (kind === "log") return "combate";
  return (ch && BY_CHANNEL.get(ch)) || "geral";
}

/** aba salva no navegador: só uma das cinco, senão Geral */
export function parseTab(raw: unknown): ChatTab {
  return TAB_IDS.find((t) => t === raw) ?? "geral";
}

const empty = <T>(v: () => T) => Object.fromEntries(TAB_IDS.map((t) => [t, v()])) as Record<ChatTab, T>;

/** Destinatário de "/pm Nome, texto" como o servidor lê (até a vírgula; sem vírgula, a 1ª palavra). */
export function pmTarget(text: string): string {
  const m = /^\/pm\s+(.*)$/i.exec(text.trim());
  if (!m) return "";
  const rest = m[1];
  const i = rest.indexOf(",");
  return (i >= 0 ? rest.slice(0, i) : rest.split(" ")[0]).trim();
}

export class ChatBook {
  lines = empty<ChatLineData[]>(() => []);
  unread = empty(() => 0);
  active: ChatTab = "geral";
  /** última pessoa da conversa privada (quem mandou ou para quem mandei) */
  pmWith = "";
  private lastSentAt = Number.NEGATIVE_INFINITY;
  /** destinatários de /pm enviados e ainda sem eco (minúsculas): só o eco "para Nome" deles conta como meu */
  private pendingPm = new Set<string>();

  setActive(tab: ChatTab) {
    this.active = tab;
    this.unread[tab] = 0;
  }

  /** o jogador enviou `text` pela caixa de chat (abre a janela de resposta e guarda o destinatário de /pm) */
  sent(now: number, text = "") {
    this.lastSentAt = now;
    const to = pmTarget(text);
    if (to) {
      // eco que nunca vem (destinatário offline): não deixa a lista crescer
      if (this.pendingPm.size >= 10) this.pendingPm.clear();
      this.pendingPm.add(to.toLowerCase());
    }
  }

  /** Guarda a linha nas abas certas e devolve quais foram. `from`: remetente de uma mensagem privada. */
  add(kind: "chat" | "log", ch: string | undefined, line: ChatLineData, now: number, from = ""): ChatTab[] {
    const tab = tabOf(kind, ch);
    const tabs = [tab];
    // resposta do que o jogador acabou de enviar: o log (comando, moderação), o chat de sistema (/ajuda) e,
    // falando pela aba Combate, o próprio eco no chat local. Party, guilda e privado de outros ficam nas abas deles
    const reply = kind === "log" || ch === "sys" || (this.active === "combate" && tab === "geral");
    if (reply && this.active !== tab && now - this.lastSentAt <= REPLY_WINDOW_MS) tabs.push(this.active);
    if (tab === "privado" && from) this.pmWith = this.pmPartner(from);
    for (const t of tabs) {
      const list = this.lines[t];
      list.push(line);
      if (list.length > CHAT_MAX) list.splice(0, list.length - CHAT_MAX);
      if (t !== this.active) this.unread[t]++;
    }
    return tabs;
  }

  /** Com quem é a conversa: o eco do meu /pm chega como "para Nome", mas um jogador pode se chamar "para Nome"
   * (nome aceita espaço); só tira o "para " se eu mandei mesmo um /pm para esse Nome. */
  private pmPartner(from: string): string {
    if (!from.startsWith("para ")) return from;
    const to = from.slice(5);
    if (!this.pendingPm.delete(to.toLowerCase())) return from;
    return to;
  }

  /** Aviso do próprio cliente (não veio do servidor): só na aba aberta. */
  notice(line: ChatLineData) {
    const list = this.lines[this.active];
    list.push(line);
    if (list.length > CHAT_MAX) list.splice(0, list.length - CHAT_MAX);
  }

  /** Texto que vai para o servidor pela aba aberta. O servidor valida como sempre (comando, moderação). */
  outgoing(text: string): { text: string } | { error: string } {
    const t = text.trim();
    if (t.startsWith("/")) return { text: t };
    if (this.active === "party") return { text: `/p ${t}` };
    if (this.active === "guilda") return { text: `/g ${t}` };
    if (this.active === "privado") {
      if (!this.pmWith) return { error: "Ninguém na conversa ainda. Escreva /pm Nome, mensagem." };
      return { text: `/pm ${this.pmWith}, ${t}` };
    }
    return { text: t };
  }
}
