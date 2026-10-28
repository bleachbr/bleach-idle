// Ajuda dos scripts de teste: conta "bot_<nome>" (criada se não existir), personagem
// criado se preciso, ingresso pelo lobby e entrada no mundo.
import { DatabaseSync } from "node:sqlite";
import { Client, type Room } from "colyseus.js";

// o runner (scripts/test.ts) aponta para um servidor e um banco de teste por estas variáveis
export const URL = process.env.BI_URL ?? "ws://localhost:2567";
export const DB_FILE = process.env.DB_FILE ?? "bleach-idle.sqlite";
export const PASSWORD = "senha-de-teste";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
/** Uma verificação: imprime OK ou FALHOU (o runner conta as linhas FALHOU). */
export function ok(label: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? "OK    " : "FALHOU"} ${label}`);
}
/** Encerra o script com código de saída 1 se alguma verificação falhou. */
export function done(): never {
  process.exit(failures ? 1 : 0);
}

export function once<T = any>(room: Room, type: string, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sem mensagem "${type}"`)), ms);
    room.onMessage(type, (m: T) => { clearTimeout(timer); resolve(m); });
  });
}

const loginOf = (name: string) => "bot_" + name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);

export async function openLobby(login: string, password = PASSWORD) {
  const c = new Client(URL);
  let room: Room;
  try {
    room = await c.joinOrCreate("lobby", { action: "login", login, password });
  } catch {
    room = await c.joinOrCreate("lobby", { action: "register", login, password });
  }
  room.onMessage("*", () => {});
  room.onMessage("error", (m) => console.log("  lobby:", m.text));
  return { client: c, room };
}

/** Garante conta e personagem; `before` roda com o personagem já criado e fora do mundo. */
export async function play(name: string, charId = "ichigo", before?: (id: string) => void): Promise<Room<any>> {
  const { client, room } = await openLobby(loginOf(name));
  let chars = await once<any[]>(room, "chars");
  if (!chars.some((c) => c.id === name.toLowerCase())) {
    room.send("create", { name, charId });
    chars = await once<any[]>(room, "chars");
  }
  before?.(name.toLowerCase());
  room.send("play", { id: name.toLowerCase() });
  const { ticket } = await once<{ ticket: string }>(room, "ticket");
  await room.leave();
  const world = await client.join("world", { ticket });
  world.onMessage("*", () => {});
  return world;
}

/** Altera campos do save direto no banco (só para montar cenários de teste). */
export function patchSave(id: string, fields: Record<string, unknown>) {
  const db = new DatabaseSync(DB_FILE);
  const row = db.prepare("SELECT data FROM players WHERE id = ?").get(id) as { data: string };
  db.prepare("UPDATE players SET data = ? WHERE id = ?").run(JSON.stringify({ ...JSON.parse(row.data), ...fields }), id);
  db.close();
}
