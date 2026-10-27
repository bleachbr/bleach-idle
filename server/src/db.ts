// Contas, sessões e personagens em SQLite (node:sqlite, embutido no Node 22.13+).
// No beta, trocar por Postgres mantendo esta mesma interface.
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import type { Slot, EquipSlot } from "../../shared/src";

export interface SaveData {
  name: string;
  charId: string;
  level: number;
  exp: number;
  hp: number;
  rei: number;
  x: number;
  y: number;
  gold?: number;
  inv?: (Slot | null)[];
  depot?: (Slot | null)[];
  equip?: Partial<Record<EquipSlot, string>>;
  autoTarget?: boolean;
  autoHunt?: boolean;
  autoHeal?: number;
  /** presente enquanto o personagem caça offline (para o relatório e o limite de 12 h) */
  offline?: { since: number; expAtLeave: number; goldAtLeave: number; deaths?: import("./schema").DeathReport[] };
}

export interface CharRow {
  id: string;
  accountId: number | null;
  data: SaveData;
  /** 1 = o personagem deve existir no mundo (online ou caçando offline). É o que o
   * servidor lê ao reiniciar para retomar as hunts offline. */
  inWorld: boolean;
  updatedAt: number;
}

const SESSION_DAYS = 30;

const db = new DatabaseSync(process.env.DB_FILE ?? "bleach-idle.sqlite");
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    pass TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);
`);
// migração da tabela do protótipo anterior (personagens sem conta ficam órfãos)
const cols = (db.prepare("PRAGMA table_info(players)").all() as { name: string }[]).map((c) => c.name);
if (!cols.includes("account_id")) db.exec("ALTER TABLE players ADD COLUMN account_id INTEGER REFERENCES accounts(id)");
if (!cols.includes("in_world")) db.exec("ALTER TABLE players ADD COLUMN in_world INTEGER NOT NULL DEFAULT 0");
db.exec("CREATE INDEX IF NOT EXISTS players_account ON players(account_id)");

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// ---------- contas ----------

export function createAccount(login: string, passHash: string): number | null {
  try {
    const r = db.prepare("INSERT INTO accounts (login, pass, created_at) VALUES (?, ?, ?)").run(login, passHash, Date.now());
    return Number(r.lastInsertRowid);
  } catch {
    return null; // login já existe (UNIQUE)
  }
}

export function getAccount(login: string): { id: number; login: string; pass: string } | undefined {
  return db.prepare("SELECT id, login, pass FROM accounts WHERE login = ?").get(login) as any;
}

/** Cria uma sessão para "lembrar login"; só o hash do token fica no banco. */
export function createSession(accountId: number): string {
  const token = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)")
    .run(sha(token), accountId, Date.now() + SESSION_DAYS * 86400_000);
  return token;
}

export function sessionAccount(token: string): { accountId: number; login: string } | undefined {
  const row = db.prepare(
    "SELECT a.id AS id, a.login AS login, s.expires_at AS exp FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?",
  ).get(sha(token)) as { id: number; login: string; exp: number } | undefined;
  if (!row || row.exp < Date.now()) return undefined;
  return { accountId: row.id, login: row.login };
}

export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(token));
}

// ---------- personagens ----------

const rowOf = (r: any): CharRow => ({
  id: r.id, accountId: r.account_id, data: JSON.parse(r.data), inWorld: !!r.in_world, updatedAt: r.updated_at,
});

export function listChars(accountId: number): CharRow[] {
  return (db.prepare("SELECT * FROM players WHERE account_id = ? ORDER BY updated_at DESC").all(accountId) as any[]).map(rowOf);
}

export function createChar(accountId: number, id: string, data: SaveData): boolean {
  try {
    db.prepare("INSERT INTO players (id, account_id, data, in_world, updated_at) VALUES (?, ?, ?, 0, ?)")
      .run(id, accountId, JSON.stringify(data), Date.now());
    return true;
  } catch {
    return false; // nome já usado
  }
}

export function deleteChar(accountId: number, id: string): boolean {
  return db.prepare("DELETE FROM players WHERE id = ? AND account_id = ? AND in_world = 0").run(id, accountId).changes > 0;
}

export function load(id: string): CharRow | undefined {
  const r = db.prepare("SELECT * FROM players WHERE id = ?").get(id);
  return r ? rowOf(r) : undefined;
}

const putStmt = db.prepare("UPDATE players SET data = ?, in_world = ?, updated_at = ? WHERE id = ?");

export function save(id: string, data: SaveData, inWorld: boolean): void {
  putStmt.run(JSON.stringify(data), inWorld ? 1 : 0, Date.now(), id);
}

/** Vários saves numa transação só: ou grava todos, ou nenhum. */
export function saveMany(list: { id: string; data: SaveData; inWorld: boolean }[]): void {
  if (!list.length) return;
  db.exec("BEGIN");
  try {
    const now = Date.now();
    for (const s of list) putStmt.run(JSON.stringify(s.data), s.inWorld ? 1 : 0, now, s.id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function loadInWorld(): CharRow[] {
  return (db.prepare("SELECT * FROM players WHERE in_world = 1").all() as any[]).map(rowOf);
}

export function setInWorld(id: string, inWorld: boolean) {
  db.prepare("UPDATE players SET in_world = ? WHERE id = ?").run(inWorld ? 1 : 0, id);
}
