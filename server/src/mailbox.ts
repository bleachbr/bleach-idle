// Correio interno: cartas por personagem com anexos opcionais (kan e itens), guardadas no SQLite.
// Entrega recompensas, itens de anúncios expirados do mercado e avisos do sistema, mesmo offline.
import { DatabaseSync } from "node:sqlite";
import type { Slot } from "../../shared/src";

export const MAIL_TTL_MS = 30 * 24 * 3600_000;
export const MAX_INBOX = 50; // por personagem: as mais antigas saem quando passa disso

export interface Attachment { gold?: number; items?: Slot[] }
export interface Mail { id: number; to: string; from: string; subject: string; body: string; gold: number; items: Slot[]; createdAt: number; read: boolean }

const db = new DatabaseSync(process.env.DB_FILE ?? "bleach-idle.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS mailbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_char TEXT NOT NULL,
    from_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    gold INTEGER NOT NULL DEFAULT 0,
    items TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS mailbox_to ON mailbox(to_char);
`);

const row = (r: any): Mail => ({
  id: r.id, to: r.to_char, from: r.from_name, subject: r.subject, body: r.body,
  gold: r.gold, items: JSON.parse(r.items), createdAt: r.created_at, read: !!r.read,
});

export function send(to: string, from: string, subject: string, body: string, attach: Attachment = {}, now = Date.now()): number {
  const id = Number(db.prepare("INSERT INTO mailbox (to_char, from_name, subject, body, gold, items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(to, from, subject, body, attach.gold ?? 0, JSON.stringify(attach.items ?? []), now).lastInsertRowid);
  db.prepare("DELETE FROM mailbox WHERE to_char = ? AND id NOT IN (SELECT id FROM mailbox WHERE to_char = ? ORDER BY created_at DESC, id DESC LIMIT ?)")
    .run(to, to, MAX_INBOX);
  return id;
}

export function list(to: string, now = Date.now()): Mail[] {
  return (db.prepare("SELECT * FROM mailbox WHERE to_char = ? AND created_at > ? ORDER BY created_at DESC, id DESC").all(to, now - MAIL_TTL_MS) as any[]).map(row);
}

export function unreadCount(to: string, now = Date.now()): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM mailbox WHERE to_char = ? AND read = 0 AND created_at > ?").get(to, now - MAIL_TTL_MS) as { n: number }).n;
}

export function get(id: number, to: string, now = Date.now()): Mail | undefined {
  const r = db.prepare("SELECT * FROM mailbox WHERE id = ? AND to_char = ? AND created_at > ?").get(id, to, now - MAIL_TTL_MS);
  return r ? row(r) : undefined;
}

export function markRead(id: number, to: string): void {
  db.prepare("UPDATE mailbox SET read = 1 WHERE id = ? AND to_char = ?").run(id, to);
}

/** Remove a carta e a devolve, só para o dono e só uma vez (impede retirar o anexo duas vezes). */
export function take(id: number, to: string): Mail | undefined {
  const mail = get(id, to, 0);
  if (!mail) return undefined;
  return db.prepare("DELETE FROM mailbox WHERE id = ? AND to_char = ?").run(id, to).changes > 0 ? mail : undefined;
}

export function purgeExpired(now = Date.now()): void {
  db.prepare("DELETE FROM mailbox WHERE created_at <= ?").run(now - MAIL_TTL_MS);
}
