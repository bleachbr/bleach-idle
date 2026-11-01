// Trilha contábil e auditoria econômica append-only (W-08).
// Rastreia criação, destruição e transferência de kan, cristais e itens (anti-dupe e suporte).
import { DatabaseSync } from "node:sqlite";

export type CurrencyType = "kan" | "crystals" | "item";

export interface AuditEntryInput {
  accountId?: number;
  charId: string;
  currency: CurrencyType;
  delta: number;
  balanceAfter?: number;
  reason: string;
  itemId?: string;
  details?: Record<string, unknown>;
  createdAt?: number;
}

export interface AuditRecord {
  id: number;
  accountId: number | null;
  charId: string;
  currency: CurrencyType;
  delta: number;
  balanceAfter: number | null;
  reason: string;
  itemId: string | null;
  details: Record<string, unknown> | null;
  createdAt: number;
}

export interface EconomyFlowSummary {
  totalIn: number;
  totalOut: number;
  netChange: number;
  byReason: Record<string, number>;
}

const db = new DatabaseSync(process.env.DB_FILE ?? "bleach-idle.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS economy_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    char_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    delta INTEGER NOT NULL,
    balance_after INTEGER,
    reason TEXT NOT NULL,
    item_id TEXT,
    details TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_economy_audit_char ON economy_audit(char_id);
  CREATE INDEX IF NOT EXISTS idx_economy_audit_currency ON economy_audit(currency);
  CREATE INDEX IF NOT EXISTS idx_economy_audit_created ON economy_audit(created_at);
`);

const insertStmt = db.prepare(`
  INSERT INTO economy_audit (account_id, char_id, currency, delta, balance_after, reason, item_id, details, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const listByCharStmt = db.prepare(`
  SELECT id, account_id, char_id, currency, delta, balance_after, reason, item_id, details, created_at
  FROM economy_audit
  WHERE char_id = ?
  ORDER BY created_at DESC, id DESC
  LIMIT ?
`);

const flowStmt = db.prepare(`
  SELECT delta, reason
  FROM economy_audit
  WHERE currency = 'kan' AND created_at >= ? AND created_at <= ?
`);

function parseRow(r: any): AuditRecord {
  return {
    id: r.id,
    accountId: r.account_id ?? null,
    charId: r.char_id,
    currency: r.currency as CurrencyType,
    delta: r.delta,
    balanceAfter: r.balance_after ?? null,
    reason: r.reason,
    itemId: r.item_id ?? null,
    details: r.details ? JSON.parse(r.details) : null,
    createdAt: r.created_at,
  };
}

export function recordAudit(entry: AuditEntryInput): number {
  const accountId = typeof entry.accountId === "number" ? entry.accountId : null;
  const balanceAfter = typeof entry.balanceAfter === "number" ? entry.balanceAfter : null;
  const itemId = typeof entry.itemId === "string" ? entry.itemId : null;
  const details = entry.details ? JSON.stringify(entry.details) : null;
  const createdAt = entry.createdAt ?? Date.now();

  const res = insertStmt.run(
    accountId,
    entry.charId,
    entry.currency,
    entry.delta,
    balanceAfter,
    entry.reason,
    itemId,
    details,
    createdAt,
  );
  return Number(res.lastInsertRowid);
}

export function getAuditTrail(charId: string, limit = 50): AuditRecord[] {
  const rows = listByCharStmt.all(charId, limit) as any[];
  return rows.map(parseRow);
}

export function queryEconomyFlow(since: number, until = Date.now()): EconomyFlowSummary {
  const rows = flowStmt.all(since, until) as { delta: number; reason: string }[];
  let totalIn = 0;
  let totalOut = 0;
  const byReason: Record<string, number> = {};

  for (const r of rows) {
    if (r.delta > 0) totalIn += r.delta;
    else totalOut += Math.abs(r.delta);

    byReason[r.reason] = (byReason[r.reason] ?? 0) + r.delta;
  }

  return {
    totalIn,
    totalOut,
    netChange: totalIn - totalOut,
    byReason,
  };
}

export function _resetAuditTableForTests(): void {
  db.exec("DELETE FROM economy_audit");
}

