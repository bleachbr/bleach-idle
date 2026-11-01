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

export class ChatBook {
  lines = empty<ChatLineData[]>(() => []);
  unread = empty(() => 0);
  active: ChatTab = "geral";
  /** última pessoa da conversa privada (quem mandou ou para quem mandei) */
  pmWith = "";
  private lastSentAt = Number.NEGATIVE_INFINITY;

  setActive(tab: ChatTab) {
    this.active = tab;
    this.unread[tab] = 0;
  }

  /** o jogador enviou algo pela caixa de chat (abre a janela de resposta) */
  sent(now: number) {
    this.lastSentAt = now;
  }

  /** Guarda a linha nas abas certas e devolve quais foram. `from`: remetente de uma mensagem privada. */
  add(kind: "chat" | "log", ch: string | undefined, line: ChatLineData, now: number, from = ""): ChatTab[] {
    const tab = tabOf(kind, ch);
    const tabs = [tab];
    if (kind === "log" && this.active !== tab && now - this.lastSentAt <= REPLY_WINDOW_MS) tabs.push(this.active);
    if (tab === "privado" && from) this.pmWith = from.startsWith("para ") ? from.slice(5) : from;
    for (const t of tabs) {
      const list = this.lines[t];
      list.push(line);
      if (list.length > CHAT_MAX) list.splice(0, list.length - CHAT_MAX);
      if (t !== this.active) this.unread[t]++;
    }
    return tabs;
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
