import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

describe("Lote 4: Tutorial de Primeiros Passos no Servidor", () => {
  let url: string;

  beforeAll(async () => {
    const s = await startTestServer();
    url = s.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  const letters = () => Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  async function createPlayerAndJoin() {
    const client = new Client(url);
    const login = `u_${Date.now().toString(36)}_${letters()}`;

    const lobby = quiet(
      await client.joinOrCreate("lobby", {
        action: "register",
        login,
        password: "password123",
      })
    );

    await once(lobby, "chars");
    const charName = `Tut ${letters()}`;
    lobby.send("create", { name: charName, charId: "ichigo" });
    await once(lobby, "chars");
    const id = charName.toLowerCase();
    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = quiet(await client.join("world", { ticket }));
    return { client, world, charName: id };
  }

  it("mensagem 'tutorial' envia id, text e done para cada passo ao atualizar progresso", async () => {
    const { world } = await createPlayerAndJoin();

    type TutorialStepMsg = { id: string; text: string; done: boolean };
    const history: TutorialStepMsg[][] = [];
    world.onMessage("tutorial", (steps: TutorialStepMsg[]) => {
      if (Array.isArray(steps)) history.push(steps);
    });

    world.send("auto", { autoHunt: true });

    await vi.waitFor(
      () => {
        const last = history[history.length - 1];
        expect(last).toBeDefined();
        const autoStep = last.find((s) => s.id === "auto");
        expect(autoStep?.done).toBe(true);
      },
      { timeout: 5000, interval: 25 }
    );

    const latest = history[history.length - 1];
    expect(latest.length).toBeGreaterThan(0);

    const autoStep = latest.find((s) => s.id === "auto");
    expect(autoStep).toBeDefined();
    expect(autoStep?.text).toContain("Auto Hunt");
    expect(autoStep?.done).toBe(true);

    const dailyStep = latest.find((s) => s.id === "daily");
    expect(dailyStep).toBeDefined();
    expect(dailyStep?.text).toContain("livro");
    expect(dailyStep?.done).toBe(false);
  });
});
