import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { matchMaker } from "@colyseus/core";
import { BOSS_PHASES } from "../../shared/src";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

describe("grito de fase de chefe", () => {
  let url: string;
  beforeAll(async () => { url = (await startTestServer()).url; });
  afterAll(async () => { await stopTestServer(); });

  it("diz qual é o chefe, para o cliente de outro mapa poder ignorar o tremor", async () => {
    const client = new Client(url);
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login: `gritochefe${Date.now().toString(36)}`, password: "password123" }));
    await once(lobby, "chars");
    lobby.send("create", { name: "Ouve Grito", charId: "ichigo" });
    await once(lobby, "chars");
    lobby.send("play", { id: "ouve grito" });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();
    const world = quiet(await client.join("world", { ticket }));
    const events: any[] = [];
    world.onMessage("fx", (fx: any) => { if (fx.t === "event") events.push(fx); });
    await vi.waitFor(() => expect(world.state.players.get("ouve grito")).toBeDefined(), { timeout: 5000, interval: 25 });

    const serverRoom = matchMaker.getRoomById(world.id) as any;
    const boss = [...serverRoom.state.monsters.values()].find((m: any) => BOSS_PHASES[m.kind]) as any;
    expect(boss, "o mundo precisa ter um chefe com fases").toBeDefined();
    boss.hp = Math.floor(boss.maxHp * BOSS_PHASES[boss.kind][0].hpPct) - 1;
    serverRoom.checkBossPhase(boss, Date.now());

    await vi.waitFor(() => expect(events.length).toBeGreaterThan(0), { timeout: 5000, interval: 25 });
    expect(events[0].id).toBe(boss.id);
    await world.leave();
  });
});
