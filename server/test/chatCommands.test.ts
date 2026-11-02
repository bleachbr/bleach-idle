import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { matchMaker } from "@colyseus/core";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

describe("Lote 2: Comandos de automação, chat e aliases no servidor", () => {
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

  async function createPlayerAndJoin(charName = `ChatCmd ${randomLetters(4)}`) {
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

  function waitForLog(room: any, filter: (text: string) => boolean, ms = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout aguardando log esperado")), ms);
      const off = room.onMessage("log", (m: { text: string }) => {
        if (filter(m.text)) {
          clearTimeout(timer);
          if (typeof off === "function") off();
          resolve(m.text);
        }
      });
    });
  }

  it("comando /autohunt e /hunt ligam e desligam o Auto Hunt", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    await vi.waitFor(() => expect(serverRoom.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });
    const p = serverRoom.state.players.get(charName);

    expect(p.autoHunt).toBe(false);

    // /autohunt liga
    const logPromise1 = waitForLog(world, (t) => t.includes("Auto Hunt ligado"));
    world.send("chat", { text: "/autohunt" });
    const log1 = await logPromise1;
    expect(p.autoHunt).toBe(true);
    expect(log1).toContain("Auto Hunt ligado");

    // /autohunt desliga
    const logPromise2 = waitForLog(world, (t) => t.includes("Auto Hunt desligado"));
    world.send("chat", { text: "/autohunt" });
    const log2 = await logPromise2;
    expect(p.autoHunt).toBe(false);
    expect(log2).toContain("Auto Hunt desligado");

    // /hunt on liga explicitamente
    world.send("chat", { text: "/hunt on" });
    await vi.waitFor(() => expect(p.autoHunt).toBe(true), { timeout: 2000 });
  });

  it("comando /helper e /auto gerenciam automação e retornam status", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    await vi.waitFor(() => expect(serverRoom.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });
    const p = serverRoom.state.players.get(charName);

    const logPromise = once<{ text: string }>(world, "log");
    world.send("chat", { text: "/helper" });
    const log = await logPromise;
    expect(log.text).toContain("Auto Helper");

    world.send("chat", { text: "/helper on" });
    await vi.waitFor(() => {
      expect(p.autoHunt).toBe(true);
      expect(p.autoTarget).toBe(true);
    }, { timeout: 2000 });

    world.send("chat", { text: "/helper off" });
    await vi.waitFor(() => {
      expect(p.autoHunt).toBe(false);
      expect(p.autoTarget).toBe(false);
    }, { timeout: 2000 });
  });

  it("comando /patrulha permite iniciar patrulha e listar setores sem interface gráfica", async () => {
    const { world, charName } = await createPlayerAndJoin();
    const serverRoom = matchMaker.getRoomById(world.id) as any;
    await vi.waitFor(() => expect(serverRoom.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });
    const p = serverRoom.state.players.get(charName);

    // /patrulha sem patrulha ativa explica como usar /patrulha iniciar
    const logPromise1 = waitForLog(world, (t) => t.includes("/patrulha iniciar"));
    world.send("chat", { text: "/patrulha" });
    const log1 = await logPromise1;
    expect(log1).toContain("/patrulha iniciar");
    expect(log1).not.toContain("Abra a interface de patrulhas");

    // /patrulha iniciar inicia a patrulha
    const patrolDataPromise = once<any>(world, "patrolData");
    world.send("chat", { text: "/patrulha iniciar karakura_periferia 1" });
    const pData = await patrolDataPromise;
    expect(pData.patrol).toBeDefined();
    await vi.waitFor(() => expect(p.prog.patrol).toBeDefined(), { timeout: 3000, interval: 25 });
    expect(p.prog.patrol.sectorId).toBe("karakura_periferia");

    // /patrulha com patrulha ativa mostra o status e tempo restante
    const logPromise2 = waitForLog(world, (t) => t.includes("restantes"));
    world.send("chat", { text: "/patrulha" });
    const log2 = await logPromise2;
    expect(log2).toContain("restantes");
  });

  it("comando /cronicas exibe lore da semana atual", async () => {
    const { world } = await createPlayerAndJoin();
    const logPromise = once<{ text: string }>(world, "log");
    world.send("chat", { text: "/cronicas" });
    const log = await logPromise;
    expect(log.text).toContain("Crônica da semana");
  });

  it("comando /livro envia dados do livro (bestiário, diário, conquistas)", async () => {
    const { world } = await createPlayerAndJoin();
    const bookPromise = once<any>(world, "book");
    world.send("chat", { text: "/livro" });
    const bookData = await bookPromise;
    expect(bookData.bestiary).toBeDefined();
    expect(bookData.missions).toBeDefined();
  });

  it("comando /ajuda lista novos comandos de automação e livros", async () => {
    const { world } = await createPlayerAndJoin();
    const received: string[] = [];
    world.onMessage("chat", (m: { text: string; ch?: string }) => {
      if (m.ch === "sys") received.push(m.text);
    });

    world.send("chat", { text: "/ajuda" });
    await vi.waitFor(() => expect(received.length).toBeGreaterThan(3), { timeout: 3000 });
    const joined = received.join("\n");
    expect(joined).toContain("/autohunt");
    expect(joined).toContain("/patrulha");
    expect(joined).toContain("/cronicas");
  });
});
