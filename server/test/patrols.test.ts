import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { matchMaker } from "@colyseus/core";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

describe("W-13: Patrulhas idle de Hollows (fluxo no servidor)", () => {
  let url: string;

  beforeAll(async () => {
    const s = await startTestServer();
    url = s.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  const randomLetters = (len = 5) =>
    Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  async function createPlayerAndJoin(charName = `Gamer ${randomLetters(4)}`, beforePlay?: (id: string) => void) {
    const client = new Client(url);
    const login = `user_${Date.now().toString(36)}_${randomLetters(4)}`;

    const lobby = quiet(
      await client.joinOrCreate("lobby", {
        action: "register",
        login,
        password: "password123",
      })
    );

    await once(lobby, "chars");
    lobby.send("create", { name: charName, charId: "ichigo" });
    await once(lobby, "chars");
    const id = charName.toLowerCase();
    beforePlay?.(id);
    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = quiet(await client.join("world", { ticket }));
    return { client, world, charName: charName.toLowerCase() };
  }

  it("inicia patrulha, bloqueia sobreposição e cancela", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    expect(serverRoom).toBeDefined();

    await vi.waitFor(() => expect(serverRoom.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });
    const sp = serverRoom.state.players.get(charName);

    // Inicia patrulha válida
    const patrolDataPromise = once<any>(world, "patrolData");
    world.send("patrolStart", { sectorId: "karakura_periferia", durationHours: 4 });
    const pData = await patrolDataPromise;

    expect(pData.patrol).toBeDefined();
    expect(pData.patrol.sectorId).toBe("karakura_periferia");
    expect(pData.patrol.durationHours).toBe(4);
    expect(sp.prog.patrol).toBeDefined();
    expect(sp.prog.patrol.sectorId).toBe("karakura_periferia");

    // Tenta iniciar outra por cima (deve ser bloqueada)
    world.send("patrolStart", { sectorId: "karakura_periferia", durationHours: 1 });
    await new Promise((r) => setTimeout(r, 60));
    expect(sp.prog.patrol.durationHours).toBe(4);

    // Cancela a patrulha
    const cancelPromise = once<any>(world, "patrolData");
    world.send("patrolCancel");
    const cData = await cancelPromise;

    expect(cData.patrol).toBeNull();
    expect(sp.prog.patrol).toBeNull();

    await world.leave();
  });

  it("bloqueia início em setor de nível superior ao do personagem", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    const sp = serverRoom.state.players.get(charName);
    sp.level = 5;

    // Deserto do Hueco Mundo exige nível 60
    world.send("patrolStart", { sectorId: "deserto_hueco_mundo", durationHours: 1 });
    await new Promise((r) => setTimeout(r, 60));

    expect(sp.prog.patrol).toBeUndefined();

    await world.leave();
  });

  it("concede EXP, Kan e Fragmentos ao resgatar patrulha concluída", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    const sp = serverRoom.state.players.get(charName);

    const initialGold = sp.gold;
    const initialFrags = sp.frags ?? 0;
    const initialExp = sp.exp;

    // Inicia patrulha de 1h
    const startPromise = once<any>(world, "patrolData");
    world.send("patrolStart", { sectorId: "karakura_periferia", durationHours: 1 });
    await startPromise;

    expect(sp.prog.patrol).toBeDefined();

    // Avança o relógio da patrulha para simular que 1h se passou
    sp.prog.patrol.completedAt = Date.now() - 1000;

    // Resgata recompensa
    const claimPromise = once<any>(world, "patrolData");
    world.send("patrolClaim");
    const claimedData = await claimPromise;

    expect(claimedData.patrol).toBeNull();
    expect(sp.prog.patrol).toBeNull();
    expect(sp.gold).toBeGreaterThan(initialGold);
    expect(sp.exp).toBeGreaterThan(initialExp);
    expect(sp.frags).toBeGreaterThanOrEqual(initialFrags + 1);

    await world.leave();
  });
});
