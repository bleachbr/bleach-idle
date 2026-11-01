import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { matchMaker } from "@colyseus/core";
import { chebyshev, INTERACT_RANGE, walkable } from "../../shared/src";
import { MAPS } from "../src/maps";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

// #26: clicar no depot de longe guarda a intenção (`pendingInteract`) até o caminho acabar. Se o jogador
// muda de ideia e clica perto do Kisuke, a intenção velha abria o depot quando ele parava ali, porque na
// praça de Karakura o depot (14,12) e a loja (18,12) ficam a 2 tiles de (16,13).
describe("intenção de interagir some quando o jogador escolhe outra ação (#26)", () => {
  let url: string;
  beforeAll(async () => { url = (await startTestServer()).url; });
  afterAll(async () => { await stopTestServer(); });

  const letters = () => Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  async function join() {
    const client = new Client(url);
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login: `u_${Date.now().toString(36)}_${letters()}`, password: "password123" }));
    await once(lobby, "chars");
    const name = `Kisu ${letters()}`;
    lobby.send("create", { name, charId: "ichigo" });
    await once(lobby, "chars");
    lobby.send("play", { id: name.toLowerCase() });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();
    const world = quiet(await client.join("world", { ticket }));
    const room = matchMaker.getRoomById(world.id) as any;
    await vi.waitFor(() => expect(room.state.players.get(name.toLowerCase())).toBeDefined(), { timeout: 5000, interval: 25 });
    return { world, room, sp: room.state.players.get(name.toLowerCase()) };
  }

  it("clicar no depot e depois andar para perto do Kisuke não abre o depot", async () => {
    const { world, room, sp } = await join();
    const m = MAPS.karakura, depot = m.depot!;
    const start = { x: 10, y: 16 }, dest = { x: 16, y: 13 };
    expect(sp.map).toBe("karakura");
    expect(walkable(m, start.x, start.y) && walkable(m, dest.x, dest.y)).toBe(true);
    expect(chebyshev(start.x, start.y, depot.x, depot.y)).toBeGreaterThan(INTERACT_RANGE);
    expect(chebyshev(dest.x, dest.y, depot.x, depot.y)).toBeLessThanOrEqual(INTERACT_RANGE);

    // conta janelas abertas e ticks deste jogador no próprio servidor: espera por tick, não por tempo
    const opened: string[] = [];
    const realOpen = room.open.bind(room);
    room.open = (p: any, kind: string) => { if (p === sp) opened.push(kind); return realOpen(p, kind); };
    let ticks = 0;
    const realUpdate = room.updatePlayer.bind(room);
    room.updatePlayer = (p: any, now: number) => { if (p === sp) ticks++; return realUpdate(p, now); };

    sp.x = start.x; sp.y = start.y; sp.path = [];
    world.send("interact", { kind: "depot" });
    await vi.waitFor(() => expect(sp.pendingInteract).toBe("depot"), { timeout: 5000, interval: 25 });
    world.send("move", dest);
    await vi.waitFor(() => expect([sp.x, sp.y, sp.path.length]).toEqual([dest.x, dest.y, 0]), { timeout: 5000, interval: 25 });
    // o tick seguinte à chegada é o que abriria a janela pendente; dois para sobrar
    const at = ticks;
    await vi.waitFor(() => expect(ticks).toBeGreaterThanOrEqual(at + 2), { timeout: 5000, interval: 25 });
    expect(opened).toEqual([]);
    expect(sp.pendingInteract).toBe("");
    await world.leave();
  });
});
