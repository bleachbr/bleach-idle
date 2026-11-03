import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "colyseus.js";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

describe("F-25: Comando /ajuda categorizado e paginação (#184)", () => {
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

  async function createPlayerAndJoin() {
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
    const charName = `Ajuda ${randomLetters(4)}`;
    lobby.send("create", { name: charName, charId: "ichigo" });
    await once(lobby, "chars");
    const id = charName.toLowerCase();
    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = quiet(await client.join("world", { ticket }));
    return { client, world, charName: id };
  }

  it("/ajuda auto retorna comandos específicos de automação", async () => {
    const { world } = await createPlayerAndJoin();
    const messages: string[] = [];
    world.onMessage("chat", (m: { text: string; ch?: string }) => {
      if (m.ch === "sys") messages.push(m.text);
    });

    world.send("chat", { text: "/ajuda auto" });
    await new Promise((r) => setTimeout(r, 200));

    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m) => m.includes("Auto Hunt"))).toBe(true);
    expect(messages.some((m) => m.includes("Automação"))).toBe(true);
    // Não deve conter comandos de guilda neste subfiltro
    expect(messages.every((m) => !m.includes("/guilda criar"))).toBe(true);
  });

  it("/ajuda social retorna comandos de comunicação e mensagens privadas", async () => {
    const { world } = await createPlayerAndJoin();
    const messages: string[] = [];
    world.onMessage("chat", (m: { text: string; ch?: string }) => {
      if (m.ch === "sys") messages.push(m.text);
    });

    world.send("chat", { text: "/ajuda social" });
    await new Promise((r) => setTimeout(r, 200));

    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m) => m.includes("/w"))).toBe(true);
    expect(messages.some((m) => m.includes("Social"))).toBe(true);
    // Não deve conter /arena neste subfiltro
    expect(messages.every((m) => !m.includes("/arena"))).toBe(true);
  });
});
