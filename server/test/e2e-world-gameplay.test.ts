import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client, type Room } from "colyseus.js";
import { startTestServer, stopTestServer, once, sleep } from "./helpers/testServer";

describe("E2E: World Gameplay", () => {
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

  async function createPlayerAndJoin(charName = `Gamer ${randomLetters(4)}`) {
    const client = new Client(url);
    const login = `user_${Date.now().toString(36)}_${randomLetters(4)}`;

    const lobby = await client.joinOrCreate("lobby", {
      action: "register",
      login,
      password: "password123",
    });

    await once(lobby, "chars");
    lobby.send("create", { name: charName, charId: "ichigo" });
    await once(lobby, "chars");
    lobby.send("play", { id: charName.toLowerCase() });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = await client.join("world", { ticket });
    world.onMessage("*", () => {}); // evita avisos de tipo não registrado
    return { client, world, charName: charName.toLowerCase() };
  }

  it("recebe kit inicial e inventário ao entrar no mundo", async () => {
    const { world, charName } = await createPlayerAndJoin();

    // Aguarda sincronização do estado
    await sleep(200);

    const me = world.state.players.get(charName);
    expect(me).toBeDefined();
    expect(me.name).toBeTruthy();
    expect(me.level).toBe(8);

    await world.leave();
  });

  it("permite desequipar e equipar itens", async () => {
    const { world } = await createPlayerAndJoin();

    // Aguarda o inv inicial emitido ao entrar no mundo
    await once<any>(world, "inv");

    // Desequipa o elmo (bandana)
    const invPromise1 = once<any>(world, "inv");
    world.send("unequip", { slot: "head" });
    const invAfterUnequip = await invPromise1;
    expect(invAfterUnequip.equip.head).toBeUndefined();

    // Bandana deve ter ido para o inventário
    const bandanaSlotIndex = invAfterUnequip.inv.findIndex((s: any) => s?.id === "bandana");
    expect(bandanaSlotIndex).toBeGreaterThanOrEqual(0);

    // Equipa novamente
    const invPromise2 = once<any>(world, "inv");
    world.send("equip", { index: bandanaSlotIndex });
    const invAfterReequip = await invPromise2;
    expect(invAfterReequip.equip.head).toBe("bandana");

    await world.leave();
  });

  it("transmite mensagens de chat para os jogadores conectados", async () => {
    const playerA = await createPlayerAndJoin();
    const playerB = await createPlayerAndJoin();

    const receivedChatPromise = new Promise<{ from: string; text: string }>((resolve) => {
      playerB.world.onMessage("chat", (m: { from: string; text: string }) => {
        if (m.text === "Bankai ativado!") resolve(m);
      });
    });

    playerA.world.send("chat", { text: "Bankai ativado!" });

    const msg = await receivedChatPromise;
    expect(msg.text).toBe("Bankai ativado!");

    await playerA.world.leave();
    await playerB.world.leave();
  });

  it("atualiza configurações de automação (Auto Helper)", async () => {
    const { world, charName } = await createPlayerAndJoin();

    world.send("auto", { autoTarget: true, autoHunt: true, autoHeal: 60 });
    await sleep(200);

    const me = world.state.players.get(charName);
    expect(me.autoTarget).toBe(true);
    expect(me.autoHunt).toBe(true);
    expect(me.autoHeal).toBe(60);

    await world.leave();
  });
});
