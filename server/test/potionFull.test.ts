import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

// #41: com HP ou reiatsu cheios, a poção era recusada só com "Não dá para usar ... agora" no chat;
// o jogador não sabia se era estoque, recarga ou barra cheia. O servidor diz o motivo e manda um
// texto flutuante (fx "deny") só para quem tentou
describe("poção com a barra cheia (#41)", () => {
  let url: string;
  beforeAll(async () => { url = (await startTestServer()).url; });
  afterAll(async () => { await stopTestServer(); });

  async function join(name: string) {
    const client = new Client(url);
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login: `pocao_${Date.now().toString(36)}`, password: "password123" }));
    await once(lobby, "chars");
    lobby.send("create", { name, charId: "ichigo" });
    await once(lobby, "chars");
    lobby.send("play", { id: name.toLowerCase() });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();
    return quiet(await client.join("world", { ticket }));
  }

  it("HP cheio e reiatsu cheio dão motivo no chat e texto flutuante", async () => {
    const world = await join("Pocao Ana");
    const id = "pocao ana";
    const fx: any[] = [], logs: string[] = [];
    world.onMessage("fx", (m) => fx.push(m));
    world.onMessage("log", (m: { text: string }) => logs.push(m.text));
    // personagem novo nasce com as barras cheias e o kit tem as duas poções
    await vi.waitFor(() => {
      const me = world.state.players.get(id);
      expect(me && me.hp === me.maxHp && me.rei === me.maxRei).toBe(true);
    }, { timeout: 5000, interval: 25 });

    world.send("skill", { slot: 2 });
    await vi.waitFor(() => expect(fx).toContainEqual({ t: "deny", id, text: "HP cheio!" }), { timeout: 5000, interval: 25 });
    expect(logs.some((l) => l.includes("HP cheio"))).toBe(true);

    world.send("skill", { slot: 3 });
    await vi.waitFor(() => expect(fx).toContainEqual({ t: "deny", id, text: "Reiatsu cheio!" }), { timeout: 5000, interval: 25 });
    expect(logs.some((l) => l.includes("Reiatsu cheio"))).toBe(true);
    await world.leave();
  });
});
