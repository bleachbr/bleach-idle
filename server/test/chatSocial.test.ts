import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { matchMaker } from "@colyseus/core";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";
import { addItem } from "../../shared/src/items";

describe("F-24: Chat social, aliases e throttle de avisos repetitivos", () => {
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

  async function createPlayerAndJoin(charName = `Social ${randomLetters(4)}`) {
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
    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = quiet(await client.join("world", { ticket }));
    return { client, world, charName: id };
  }

  function waitForPm(room: any, text: string) {
    return new Promise<{ from: string; text: string; ch: string }>((resolve) => {
      room.onMessage("chat", (m: any) => {
        if (m.ch === "pm" && m.text === text) resolve(m);
      });
    });
  }

  it("aliases /s, /w, /msg e /tell enviam mensagem privada corretamente", async () => {
    const p1 = await createPlayerAndJoin();
    const p2 = await createPlayerAndJoin();

    // p1 envia /w para p2
    const pmPromise1 = waitForPm(p2.world, "Olá via whisper");
    p1.world.send("chat", { text: `/w ${p2.charName}, Olá via whisper` });
    const pm1 = await pmPromise1;
    expect(pm1.from.toLowerCase()).toBe(p1.charName.toLowerCase());
    expect(pm1.text).toBe("Olá via whisper");
    expect(pm1.ch).toBe("pm");

    // p2 responde via /s
    const pmPromise2 = waitForPm(p1.world, "Olá via sussurro");
    p2.world.send("chat", { text: `/s ${p1.charName}, Olá via sussurro` });
    const pm2 = await pmPromise2;
    expect(pm2.from.toLowerCase()).toBe(p2.charName.toLowerCase());
    expect(pm2.text).toBe("Olá via sussurro");
    expect(pm2.ch).toBe("pm");

    // p1 envia /msg
    const pmPromise3 = waitForPm(p2.world, "Olá via msg");
    p1.world.send("chat", { text: `/msg ${p2.charName}, Olá via msg` });
    const pm3 = await pmPromise3;
    expect(pm3.text).toBe("Olá via msg");

    // p2 responde via /tell
    const pmPromise4 = waitForPm(p1.world, "Olá via tell");
    p2.world.send("chat", { text: `/tell ${p1.charName}, Olá via tell` });
    const pm4 = await pmPromise4;
    expect(pm4.text).toBe("Olá via tell");
  });

  it("comando /rank abre ranking com o mesmo payload de /ranking", async () => {
    const { world } = await createPlayerAndJoin();
    const rankingPromise = once<any>(world, "ranking");
    world.send("chat", { text: "/rank" });
    const data = await rankingPromise;
    expect(data).toHaveProperty("nivel");
  });

  it("subcomando /guilda listar é reconhecido sem erro de subcomando desconhecido", async () => {
    const { world } = await createPlayerAndJoin();
    const logPromise = once<{ text: string }>(world, "log");
    world.send("chat", { text: "/guilda listar" });
    const log = await logPromise;
    expect(log.text).not.toContain("Subcomando de guilda desconhecido");
  });

  it("recusa repetitiva de poção cheia é throttled (não envia mensagens repetidas no mesmo segundo)", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    await vi.waitFor(() => expect(serverRoom.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });
    const p = serverRoom.state.players.get(charName);
    p.hp = p.maxHp;
    addItem(p.inv, "pocao_vida", 5);

    const logs: string[] = [];
    world.onMessage("log", (m: { text: string }) => logs.push(m.text));

    // Envia uso de poção de cura com HP já cheio duas vezes em sequência rápida
    world.send("skill", { slot: 2 });
    world.send("skill", { slot: 2 });

    await vi.waitFor(() => expect(logs.length).toBeGreaterThan(0), { timeout: 2000 });

    // Apenas a primeira recusa deve ter sido enviada
    const hpRefusals = logs.filter((l) => l.includes("HP cheio"));
    expect(hpRefusals.length).toBe(1);
  });

  it("aviso repetitivo de inventário cheio ao desequipar é throttled", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    await vi.waitFor(() => expect(serverRoom.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });
    const p = serverRoom.state.players.get(charName);

    // Enche todo o inventário
    for (let i = 0; i < 20; i++) {
      p.inv[i] = { id: "pocao_vida", qty: 1 };
    }
    p.equip.weapon = "espada_arrancar";

    const logs: string[] = [];
    world.onMessage("log", (m: { text: string }) => logs.push(m.text));

    // Tenta desequipar com inventário cheio duas vezes
    world.send("unequip", { slot: "weapon" });
    world.send("unequip", { slot: "weapon" });

    await vi.waitFor(() => expect(logs.length).toBeGreaterThan(0), { timeout: 2000 });

    const invFullLogs = logs.filter((l) => l === "Inventário cheio.");
    expect(invFullLogs.length).toBe(1);
  });
});
