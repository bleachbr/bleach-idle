import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { matchMaker } from "@colyseus/core";
import { Client } from "colyseus.js";
import { expForLevel, isRecruit, CHARS, ITEMS } from "../../shared/src";
import * as db from "../src/db";
import { newCharacter } from "../src/LobbyRoom";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

describe("JH-01 e JH-02: Criação e Progressão do Recruta Shinigami", () => {
  let url: string;

  beforeAll(async () => {
    const s = await startTestServer();
    url = s.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  const randomLetters = (len = 4) =>
    Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  describe("JH-01: Criação de Recruta Shinigami", () => {
    it("newCharacter cria recruta_m com espada Asauchi e Shihakusho", () => {
      const data = newCharacter("Renato", "recruta_m");
      expect(data.charId).toBe("recruta_m");
      expect(data.name).toBe("Renato");
      expect(data.equip.weapon).toBe("asauchi");
      expect(data.equip.armor).toBe("shihakusho");
      expect(data.equip.legs).toBe("hakama");
      expect(data.equip.boots).toBe("waraji");
      expect(ITEMS.asauchi).toBeDefined();
      expect(ITEMS.shihakusho).toBeDefined();
    });

    it("newCharacter cria recruta_f com espada Asauchi e Shihakusho", () => {
      const data = newCharacter("Renata", "recruta_f");
      expect(data.charId).toBe("recruta_f");
      expect(data.name).toBe("Renata");
      expect(data.equip.weapon).toBe("asauchi");
      expect(data.equip.armor).toBe("shihakusho");
    });

    it("criação via Lobby registra recruta e persiste no banco", async () => {
      const client = new Client(url);
      const login = `rec_${Date.now().toString(36)}_${randomLetters()}`;
      const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login, password: "password123" }));
      await once(lobby, "chars");

      const charName = `Rec ${randomLetters()}`;
      lobby.send("create", { name: charName, charId: "recruta_m" });
      const charsMsg = await once<any[]>(lobby, "chars");
      const found = charsMsg.find((c: any) => c.name === charName);
      expect(found).toBeDefined();
      expect(found.charId).toBe("recruta_m");

      const saved = db.load(charName.toLowerCase());
      expect(saved).toBeDefined();
      expect(saved?.data.equip.weapon).toBe("asauchi");
      expect(saved?.data.equip.armor).toBe("shihakusho");

      await lobby.leave();
    });
  });

  describe("JH-02: Trava de XP no Nível 30 e Convocação do Seireitei", () => {
    async function setupPlayerInWorld(charId: string, level = 29, expOffset = -50) {
      const client = new Client(url);
      const login = `test_${Date.now().toString(36)}_${randomLetters()}`;
      const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login, password: "password123" }));
      await once(lobby, "chars");

      const charName = `Hero ${randomLetters()}`;
      lobby.send("create", { name: charName, charId });
      await once(lobby, "chars");

      const id = charName.toLowerCase();
      // Ajusta o nível e XP antes de entrar no mundo
      const row = db.load(id)!;
      const targetExp = expForLevel(level) + expOffset;
      row.data.level = level;
      row.data.exp = targetExp;
      db.save(id, row.data);

      lobby.send("play", { id });
      const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
      await lobby.leave();

      const world = quiet(await client.join("world", { ticket }));
      await vi.waitFor(() => expect(world.state.players.get(id)).toBeDefined(), { timeout: 5000, interval: 25 });

      const rooms = await matchMaker.query({ name: "world" });
      const worldRoom = matchMaker.getRoomById(rooms[0].roomId) as any;
      const player = worldRoom.state.players.get(id);

      return { client, world, worldRoom, player, id };
    }

    it("ao atingir o nível 30 como recruta, o XP trava em expForLevel(30) e emite log e fx de convocação", async () => {
      const { world, worldRoom, player, id } = await setupPlayerInWorld("recruta_m", 29, expForLevel(30) - expForLevel(29) - 100);

      const logs: string[] = [];
      const fxList: any[] = [];
      world.onMessage("log", (m: { text: string }) => logs.push(m.text));
      world.onMessage("fx", (m: any) => fxList.push(m));

      // Ganha XP suficiente para ultrapassar o nível 30
      worldRoom.gainExp(player, 1000, "Hollow");

      await vi.waitFor(() => expect(player.level).toBe(30), { timeout: 3000, interval: 25 });

      // O XP trava rigidamente em expForLevel(30)
      expect(player.exp).toBe(expForLevel(30));
      expect(player.prog.seireiteiSummoned).toBe(true);

      // Notificação no chat e efeito visual emitidos
      await vi.waitFor(() => {
        expect(logs.some((t) => t.includes("Convocação do Seireitei: Apresente-se no Senkaimon!"))).toBe(true);
        expect(fxList.some((f) => f.t === "event" && f.text === "Convocação do Seireitei: Apresente-se no Senkaimon!")).toBe(true);
      }, { timeout: 3000, interval: 25 });

      // Ao tentar ganhar mais XP como recruta não promovido, XP permanece travado e não ganha nada
      const logCountBefore = logs.length;
      worldRoom.gainExp(player, 500, "Hollow");

      expect(player.level).toBe(30);
      expect(player.exp).toBe(expForLevel(30));
      // Não re-emite o evento de convocação nem soma XP
      expect(logs.slice(logCountBefore).some((t) => t.includes("Convocação do Seireitei"))).toBe(false);

      await world.leave();
    });

    it("recruta promovido (promotedRank = true) não é travado no nível 30 e progride normalmente", async () => {
      const { world, worldRoom, player } = await setupPlayerInWorld("recruta_f", 29, expForLevel(30) - expForLevel(29) - 50);

      // Seta promoção de patente
      player.prog.promotedRank = true;

      // Ganha XP suficiente para nível 30 e além (nível 31)
      const expNeededFor31 = expForLevel(31) - expForLevel(29);
      worldRoom.gainExp(player, expNeededFor31 + 500, "Exame Seireitei");

      await vi.waitFor(() => expect(player.level).toBeGreaterThanOrEqual(31), { timeout: 3000, interval: 25 });
      expect(player.exp).toBeGreaterThan(expForLevel(30));

      await world.leave();
    });

    it("personagens veteranos (ex: Ichigo) não sofrem trava de recruta no nível 30", async () => {
      const { world, worldRoom, player } = await setupPlayerInWorld("ichigo", 29, expForLevel(30) - expForLevel(29) - 50);

      const logs: string[] = [];
      world.onMessage("log", (m: { text: string }) => logs.push(m.text));

      const expNeededFor31 = expForLevel(31) - expForLevel(29);
      worldRoom.gainExp(player, expNeededFor31 + 500, "Treino Kisuke");

      await vi.waitFor(() => expect(player.level).toBeGreaterThanOrEqual(31), { timeout: 3000, interval: 25 });
      expect(logs.some((t) => t.includes("Convocação do Seireitei"))).toBe(false);

      await world.leave();
    });
  });
});
