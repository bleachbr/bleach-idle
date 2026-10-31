// Contas, sessões e personagens em SQLite (node:sqlite, embutido no Node 22.13+).
// No beta, trocar por Postgres mantendo esta mesma interface.
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import type { Slot, EquipSlot, QuestState } from "../../shared/src";

export interface SaveData {
  name: string;
  charId: string;
  level: number;
  exp: number;
  hp: number;
  rei: number;
  /** mapa (ausente em saves antigos = Karakura) */
  map?: string;
  x: number;
  y: number;
  gold?: number;
  inv?: (Slot | null)[];
  depot?: (Slot | null)[];
  equip?: Partial<Record<EquipSlot, string>>;
  frags?: number;
  skullUntil?: number;
  rebirths?: number;
  autoTrain?: boolean;
  autoSell?: boolean;
  ignore?: string[];
  zanjutsu?: number;
  zanTries?: number;
  reiryoku?: number;
  reiTries?: number;
  quests?: QuestState;
  prog?: import("../../shared/src").Progress;
  forge?: Partial<Record<EquipSlot, number>>;
  expBoostUntil?: number;
  lootBoostUntil?: number;
  autoTarget?: boolean;
  autoHunt?: boolean;
  autoHeal?: number;
  huntSpot?: string;
  autoReturn?: boolean;
  autoRei?: number;
  autoBankai?: boolean;
  autoBox?: boolean;
  autoRestock?: boolean;
  /** cosméticos equipados neste personagem */
  cos?: import("../../shared/src").CosEquip;
  /** presente enquanto o personagem caça offline (para o relatório e o limite de 12 h) */
  offline?: { since: number; expAtLeave: number; goldAtLeave: number; zanAtLeave?: number; reiAtLeave?: number; deaths?: import("./schema").DeathReport[]; kills?: number; items?: Record<string, number> };
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
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
// migração da tabela do protótipo anterior (personagens sem conta ficam órfãos)
const cols = (db.prepare("PRAGMA table_info(players)").all() as { name: string }[]).map((c) => c.name);
if (!cols.includes("account_id")) db.exec("ALTER TABLE players ADD COLUMN account_id INTEGER REFERENCES accounts(id)");
if (!cols.includes("in_world")) db.exec("ALTER TABLE players ADD COLUMN in_world INTEGER NOT NULL DEFAULT 0");
db.exec("CREATE INDEX IF NOT EXISTS players_account ON players(account_id)");

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// Códigos estendidos do SQLite: 1555 = SQLITE_CONSTRAINT_PRIMARYKEY, 2067 = SQLITE_CONSTRAINT_UNIQUE
const SQLITE_UNIQUE_CODES = new Set([1555, 2067]);

function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { errcode?: unknown; message?: unknown };
  if (typeof e.errcode === "number" && SQLITE_UNIQUE_CODES.has(e.errcode)) return true;
  return typeof e.message === "string" && e.message.startsWith("UNIQUE constraint failed:");
}

// ---------- contas ----------

export function createAccount(login: string, passHash: string): number | null {
  try {
    const r = db.prepare("INSERT INTO accounts (login, pass, created_at) VALUES (?, ?, ?)").run(login, passHash, Date.now());
    return Number(r.lastInsertRowid);
  } catch (err) {
    if (isUniqueConstraintError(err)) return null; // login já existe (UNIQUE)
    throw err;
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

/** Troca a senha e derruba as sessões lembradas (menos a atual, se houver). */
export function setPassword(accountId: number, passHash: string, keepToken?: string) {
  db.prepare("UPDATE accounts SET pass = ? WHERE id = ?").run(passHash, accountId);
  db.prepare("DELETE FROM sessions WHERE account_id = ? AND token_hash != ?").run(accountId, keepToken ? sha(keepToken) : "");
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
  } catch (err) {
    if (isUniqueConstraintError(err)) return false; // nome já usado (PRIMARY KEY)
    throw err;
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

/** Estado avulso do mundo (ex.: parties), em JSON. */
export function getMeta<T>(key: string): T | undefined {
  const r = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
  return r ? JSON.parse(r.value) : undefined;
}

export function setMeta(key: string, value: unknown) {
  db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value));
}

/** Todos os personagens (para o ranking). */
export function allChars(): CharRow[] {
  return (db.prepare("SELECT * FROM players WHERE account_id IS NOT NULL").all() as any[]).map(rowOf);
}

export function loadInWorld(): CharRow[] {
  return (db.prepare("SELECT * FROM players WHERE in_world = 1").all() as any[]).map(rowOf);
}

export function setInWorld(id: string, inWorld: boolean) {
  db.prepare("UPDATE players SET in_world = ? WHERE id = ?").run(inWorld ? 1 : 0, id);
}

/** Cópia consistente do banco (funciona com o jogo rodando). */
export function backup(file: string) {
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
}

// ---------- cristais (moeda da conta) ----------

db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    crystals INTEGER NOT NULL DEFAULT 0,
    owned TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS crystal_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    at INTEGER NOT NULL
  );
`);

export interface Wallet { crystals: number; owned: string[] }

export function wallet(accountId: number): Wallet {
  const r = db.prepare("SELECT crystals, owned FROM wallets WHERE account_id = ?").get(accountId) as { crystals: number; owned: string } | undefined;
  return r ? { crystals: r.crystals, owned: JSON.parse(r.owned) } : { crystals: 0, owned: [] };
}

/** Muda o saldo (positivo = ganhar, negativo = gastar) e, se vier, marca um cosmético como da conta.
 * Tudo numa transação com registro no histórico; falha (null) se o saldo não der ou o item já for da conta. */
export function changeCrystals(accountId: number, delta: number, reason: string, own?: string): Wallet | null {
  db.exec("BEGIN IMMEDIATE");
  try {
    const w = wallet(accountId);
    if (w.crystals + delta < 0 || (own && w.owned.includes(own))) { db.exec("ROLLBACK"); return null; }
    w.crystals += delta;
    if (own) w.owned.push(own);
    db.prepare("INSERT INTO wallets (account_id, crystals, owned) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET crystals = excluded.crystals, owned = excluded.owned")
      .run(accountId, w.crystals, JSON.stringify(w.owned));
    db.prepare("INSERT INTO crystal_log (account_id, delta, reason, at) VALUES (?, ?, ?, ?)").run(accountId, delta, reason, Date.now());
    db.exec("COMMIT");
    return w;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
