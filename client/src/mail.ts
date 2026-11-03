// Correio interno (W-07) no cliente: recepção, sanitização de payload e estado da caixa de entrada.
import type { Room } from "colyseus.js";
import type { MailItem, Slot } from "../../shared/src";

let currentInbox: MailItem[] = [];

/** Sanitiza um item individual de correio recebido da rede (Zero-Trust). */
export function sanitizeMailItem(raw: unknown): MailItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "number" && Number.isInteger(r.id) ? r.id : 0;
  if (id <= 0) return null;

  const to = typeof r.to === "string" ? r.to : "";
  const from = typeof r.from === "string" ? r.from : "";
  const subject = typeof r.subject === "string" ? r.subject : "";
  const body = typeof r.body === "string" ? r.body : "";
  const gold = typeof r.gold === "number" && Number.isInteger(r.gold) && r.gold >= 0 ? r.gold : 0;

  const items: Slot[] = Array.isArray(r.items)
    ? r.items
        .filter((s): s is { id: string; qty: number } =>
          Boolean(s && typeof s === "object" && typeof (s as any).id === "string" && typeof (s as any).qty === "number" && (s as any).qty > 0)
        )
        .map((s) => ({ id: s.id, qty: Math.floor(s.qty) }))
    : [];

  const createdAt = typeof r.createdAt === "number" && Number.isFinite(r.createdAt) ? r.createdAt : 0;
  const read = Boolean(r.read);

  return { id, to, from, subject, body, gold, items, createdAt, read };
}

/** Sanitiza o payload da mensagem de correio `{ inbox: [...] }`. */
export function sanitizeMailPayload(msg: unknown): MailItem[] {
  if (!msg || typeof msg !== "object") return [];
  const inbox = (msg as Record<string, unknown>).inbox;
  if (!Array.isArray(inbox)) return [];
  return inbox.map(sanitizeMailItem).filter((m): m is MailItem => m !== null);
}

/** Retorna a lista atual de cartas da caixa de entrada em cache. */
export function getMailInbox(): MailItem[] {
  return [...currentInbox];
}

/** Retorna a contagem de cartas não lidas. */
export function getUnreadMailCount(): number {
  return currentInbox.filter((m) => !m.read).length;
}

/** Reseta o cache de correio local (ex.: na troca de personagem). */
export function resetMailInbox(): void {
  currentInbox = [];
}

/**
 * Registra o handler de mensagem "mail" na sala do Colyseus.
 * Sanitiza o payload de entrada e atualiza o cache local.
 */
export function bindMail(room: Room<any>, onUpdate?: (inbox: MailItem[]) => void): () => void {
  const handler = (msg: unknown) => {
    currentInbox = sanitizeMailPayload(msg);
    onUpdate?.(currentInbox);
  };

  room.onMessage("mail", handler);

  return () => {
    // Caso a sala permita desregistro no futuro
  };
}

/** Solicita ao servidor a listagem de cartas (mensagens silenciosas / UI futura). */
export function requestMailList(room: Room<any>): void {
  room.send("mailList");
}

/** Solicita ao servidor a retirada do anexo de uma carta. */
export function requestMailTake(room: Room<any>, id: number): void {
  if (typeof id === "number" && Number.isInteger(id) && id > 0) {
    room.send("mailTake", { id });
  }
}
