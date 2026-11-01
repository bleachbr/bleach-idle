import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { matchMaker } from "@colyseus/core";
import { DEATH_EXP_LOSS, DEATH_GOLD_LOSS, INVASION, INVASION_DEATH, MONSTERS, chebyshev, inPZ, walkable } from "../../shared/src";
import { MAPS, SPAWNS, tileKey } from "../src/maps";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

// #39 (proposta): morrer para um Hollow da Invasão ativa não perde itens e perde metade da XP e do kan.
// A sala real começa a invasão (`startInvasion`, público) e o jogador com 1 de vida fica colado num invasor.
describe("morte na Invasão de Hollows (#39)", () => {
  let url: string;
  beforeAll(async () => { url = (await startTestServer()).url; });
  afterAll(async () => { await stopTestServer(); });

  const letters = () => Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  /** Entra no mundo, começa a invasão e põe o jogador com 1 de vida ao lado do invasor mais longe dos spawns
   * comuns de Karakura (assim quem mata é o Hollow da invasão, não um monstro da área). */
  async function dieToInvader(prep: (sp: any) => void = () => {}) {
    const client = new Client(url);
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login: `u_${Date.now().toString(36)}_${letters()}`, password: "password123" }));
    await once(lobby, "chars");
    const name = `Inva ${letters()}`, id = name.toLowerCase();
    lobby.send("create", { name, charId: "ichigo" });
    await once(lobby, "chars");
    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();
    const world = quiet(await client.join("world", { ticket }));
    const room = matchMaker.getRoomById(world.id) as any;
    await vi.waitFor(() => expect(room.state.players.get(id)).toBeDefined(), { timeout: 5000, interval: 25 });
    const sp = room.state.players.get(id);

    room.startInvasion();
    const invaders = [...room.state.monsters.values()].filter((m: any) => m.invader && !m.world && m.kind !== INVASION.leader);
    expect(invaders.length).toBeGreaterThan(0);

    // tile andável, fora da zona protegida e livre, ao lado de um invasor; o mais longe dos spawns comuns primeiro
    const m = MAPS.karakura;
    const spawns = SPAWNS.filter((s) => s.map === "karakura");
    const fromSpawns = (e: { x: number; y: number }) => Math.min(...spawns.map((s) => chebyshev(e.x, e.y, s.x, s.y) - s.radius));
    invaders.sort((a: any, b: any) => fromSpawns(b) - fromSpawns(a));
    let spot: { x: number; y: number } | undefined;
    let killer: any;
    for (const inv of invaders) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const x = inv.x + dx, y = inv.y + dy;
        if (walkable(m, x, y) && !inPZ(m, x, y) && !room.monsterAt.has(tileKey("karakura", x, y))) { spot = { x, y }; killer = inv; break; }
      }
      if (spot) break;
    }
    expect(spot).toBeDefined();

    // inventário cheio de poções: com a perda de 10% por espaço, algum espaço sumiria
    sp.inv = sp.inv.map(() => ({ id: "pocao_vida", qty: 5 }));
    const equipBefore = { ...sp.equip };
    sp.gold = 1000;
    const expBefore = sp.exp;
    prep(sp);
    sp.x = spot!.x; sp.y = spot!.y; sp.path = [];
    sp.hp = 1;

    const report = await once<{ exp: number; gold: number; items: string[]; by: string; invasion?: boolean }>(world, "death");
    // quem matou foi o invasor escolhido: se não for, a falha aponta a causa real em vez de "perdeu itens"
    expect(report.by).toBe(MONSTERS[killer.kind].name);
    return { world, sp, report, expBefore, equipBefore };
  }

  it("sem perda de itens e com metade da XP e do kan", async () => {
    const { world, sp, report, expBefore, equipBefore } = await dieToInvader();
    expect(report.invasion).toBe(true);
    expect(report.items).toEqual([]);
    expect(report.exp).toBe(Math.floor(expBefore * DEATH_EXP_LOSS * INVASION_DEATH.expMult));
    expect(report.gold).toBe(Math.floor(1000 * DEATH_GOLD_LOSS * INVASION_DEATH.goldMult));
    expect(sp.inv.every((s: any) => s?.id === "pocao_vida" && s.qty === 5)).toBe(true);
    expect({ ...sp.equip }).toEqual(equipBefore);
    await world.leave();
  });

  it("marcado por agressão (PvP) morre para a invasão com a penalidade comum", async () => {
    const { world, report, expBefore } = await dieToInvader((sp) => { sp.pvpUntil = Date.now() + 60_000; });
    expect(report.invasion).toBe(false);
    expect(report.exp).toBe(Math.floor(expBefore * DEATH_EXP_LOSS));
    expect(report.gold).toBe(Math.floor(1000 * DEATH_GOLD_LOSS));
    await world.leave();
  });
});
