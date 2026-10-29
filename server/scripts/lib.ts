// Ajuda dos scripts de teste: conta "bot_<nome>" (criada se não existir), personagem
// criado se preciso, ingresso pelo lobby e entrada no mundo.
import { DatabaseSync } from "node:sqlite";
import { Client, type Room } from "colyseus.js";
import { ACHIEVEMENTS, TUTORIAL, newProgress, dayKey } from "../../shared/src";

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

/** Garante conta e personagem; `before` roda com o personagem já criado e fora do mundo;
 * `setup` registra handlers logo ao entrar (para não perder as mensagens iniciais). */
export async function play(name: string, charId = "ichigo", before?: (id: string) => void, setup?: (r: Room<any>) => void): Promise<Room<any>> {
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
  setup?.(world);
  return world;
}

/** Entra e já escuta o relatório da hunt offline, que o servidor manda logo na entrada
 * (registrar depois do play() às vezes perdia a mensagem e o teste travava). */
export async function playWithReport(name: string, charId = "ichigo"): Promise<{ room: Room<any>; report: Promise<any> }> {
  let got!: (m: any) => void;
  const report = new Promise<any>((res) => (got = res));
  const room = await play(name, charId, undefined, (r) => r.onMessage("offline", got));
  return { room, report };
}

/** Altera campos do save direto no banco (só para montar cenários de teste). */
export function patchSave(id: string, fields: Record<string, unknown>) {
  const db = new DatabaseSync(DB_FILE);
  const row = db.prepare("SELECT data FROM players WHERE id = ?").get(id) as { data: string };
  const data = { ...JSON.parse(row.data), ...fields };
  // conquistas e primeiros passos pagam kan e itens: sem isso as contas de dinheiro dos cenários mudam.
  // Quem testa conquistas passa o próprio `prog`.
  // As missões diárias do dia vêm vazias: senão o Auto Hunt priorizaria o monstro sorteado e
  // mudaria o comportamento dos cenários. Quem testa conquistas, guia ou diárias passa o próprio `prog`.
  if (!("prog" in fields)) data.prog = {
    ...newProgress(), ...data.prog, ach: ACHIEVEMENTS.map((a) => a.id), tut: TUTORIAL.map((t) => t.id),
    dm: { day: dayKey(Date.now()), list: [], bonus: true },
  };
  db.prepare("UPDATE players SET data = ? WHERE id = ?").run(JSON.stringify(data), id);
  db.close();
}

/** Põe cristais na conta dona do personagem direto no banco (a compra com dinheiro ainda não existe). */
export function grantCrystals(charId: string, n: number) {
  const db = new DatabaseSync(DB_FILE);
  const { account_id } = db.prepare("SELECT account_id FROM players WHERE id = ?").get(charId) as { account_id: number };
  db.prepare("INSERT INTO wallets (account_id, crystals) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET crystals = crystals + excluded.crystals").run(account_id, n);
  db.close();
}
