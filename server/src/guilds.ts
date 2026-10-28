// Guildas no SQLite: a guilda, os membros (com cargo) e o banco de kan.
import { DatabaseSync } from "node:sqlite";

export interface Guild { id: number; name: string; tag: string; leader: string; bank: number }
export interface Member { charId: string; rank: "lider" | "membro"; joinedAt: number }

const db = new DatabaseSync(process.env.DB_FILE ?? "bleach-idle.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS guilds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    tag TEXT NOT NULL,
    leader TEXT NOT NULL,
    bank INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS guild_members (
    char_id TEXT PRIMARY KEY,
    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    rank TEXT NOT NULL,
    joined_at INTEGER NOT NULL
  );
`);

/** Tag a partir do nome: iniciais das palavras (ou começo da palavra), até 4 letras. */
export function tagOf(name: string): string {
  const words = name.trim().split(/\s+/);
  const t = words.length > 1 ? words.map((w) => w[0]).join("") : words[0].slice(0, 4);
  return t.slice(0, 4).toUpperCase();
}

export function createGuild(name: string, leader: string): Guild | undefined {
  try {
    const r = db.prepare("INSERT INTO guilds (name, tag, leader, bank, created_at) VALUES (?, ?, ?, 0, ?)").run(name, tagOf(name), leader, Date.now());
    const id = Number(r.lastInsertRowid);
    addMember(id, leader, "lider");
    return get(id);
  } catch {
    return undefined; // nome repetido
  }
}

export function get(id: number): Guild | undefined {
  return db.prepare("SELECT id, name, tag, leader, bank FROM guilds WHERE id = ?").get(id) as Guild | undefined;
}

export function guildOf(charId: string): Guild | undefined {
  const r = db.prepare("SELECT guild_id FROM guild_members WHERE char_id = ?").get(charId) as { guild_id: number } | undefined;
  return r ? get(r.guild_id) : undefined;
}

export function members(guildId: number): Member[] {
  return (db.prepare("SELECT char_id, rank, joined_at FROM guild_members WHERE guild_id = ? ORDER BY joined_at").all(guildId) as any[])
    .map((r) => ({ charId: r.char_id, rank: r.rank, joinedAt: r.joined_at }));
}

export function addMember(guildId: number, charId: string, rank: Member["rank"] = "membro") {
  db.prepare("INSERT OR REPLACE INTO guild_members (char_id, guild_id, rank, joined_at) VALUES (?, ?, ?, ?)").run(charId, guildId, rank, Date.now());
}

export function removeMember(charId: string) {
  db.prepare("DELETE FROM guild_members WHERE char_id = ?").run(charId);
}

export function setLeader(guildId: number, charId: string) {
  db.exec("BEGIN");
  db.prepare("UPDATE guild_members SET rank = 'membro' WHERE guild_id = ?").run(guildId);
  db.prepare("UPDATE guild_members SET rank = 'lider' WHERE char_id = ?").run(charId);
  db.prepare("UPDATE guilds SET leader = ? WHERE id = ?").run(charId, guildId);
  db.exec("COMMIT");
}

export function deleteGuild(id: number) {
  db.prepare("DELETE FROM guild_members WHERE guild_id = ?").run(id);
  db.prepare("DELETE FROM guilds WHERE id = ?").run(id);
}

/** Soma `delta` ao banco; recusa se ficaria negativo. */
export function addBank(id: number, delta: number): boolean {
  return db.prepare("UPDATE guilds SET bank = bank + ? WHERE id = ? AND bank + ? >= 0").run(delta, id, delta).changes > 0;
}

export function all(): Guild[] {
  return db.prepare("SELECT id, name, tag, leader, bank FROM guilds").all() as unknown as Guild[];
}

export function memberMap(): Map<string, number> {
  return new Map((db.prepare("SELECT char_id, guild_id FROM guild_members").all() as any[]).map((r) => [r.char_id, r.guild_id]));
}

/** Sai da guilda. Se era o líder, a liderança passa ao membro mais antigo; se era o
 * último, a guilda acaba e o banco volta para quem saiu (`refund`). */
export function leave(charId: string): { guild?: Guild; newLeader?: string; disbanded: boolean; refund: number } {
  const g = guildOf(charId);
  if (!g) return { disbanded: false, refund: 0 };
  removeMember(charId);
  const rest = members(g.id);
  if (!rest.length) {
    deleteGuild(g.id);
    return { guild: g, disbanded: true, refund: g.bank };
  }
  if (g.leader === charId) {
    setLeader(g.id, rest[0].charId);
    return { guild: g, newLeader: rest[0].charId, disbanded: false, refund: 0 };
  }
  return { guild: g, disbanded: false, refund: 0 };
}
