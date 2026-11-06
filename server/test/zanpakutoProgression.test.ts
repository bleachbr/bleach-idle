import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { matchMaker } from "@colyseus/core";
import { Client } from "colyseus.js";
import { expForLevel, formatZanpakutoRelease, techniqueFor } from "../../shared/src";
import * as db from "../src/db";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

const BONECO = { x: 38, y: 9 }; // Spawn do boneco em soul.tmj

describe("JH-03: Despertar da Shikai e Progressão Militar (server)", () => {
  let url: string;

  beforeAll(async () => {
    url = (await startTestServer()).url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  const randomLetters = (len = 4) =>
    Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  async function setupPlayerInWorld(charId: string, level = 30, map = "soul", x = BONECO.x, y = BONECO.y + 1) {
    const client = new Client(url);
    const login = `user_${Date.now().toString(36)}_${randomLetters()}`;
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login, password: "password123" }));
    await once(lobby, "chars");

    const charName = `Oficial ${randomLetters()}`;
    lobby.send("create", { name: charName, charId });
    await once(lobby, "chars");

    const id = charName.toLowerCase();
    const row = db.load(id)!;
    row.data.level = level;
    row.data.exp = expForLevel(level);
    row.data.map = map;
    row.data.x = x;
    row.data.y = y;
    db.save(id, row.data, false);

    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = quiet(await client.join("world", { ticket }));
    await vi.waitFor(() => expect(world.state.players.get(id)).toBeDefined(), { timeout: 5000, interval: 25 });

    const rooms = await matchMaker.query({ name: "world" });
    const worldRoom = matchMaker.getRoomById(rooms[0].roomId) as any;
    const player = worldRoom.state.players.get(id);

    return { client, world, worldRoom, player, id, charName };
  }

  it("promoteToOfficer desperta a Shikai, atribui a Zanpakutō, promove a patente e transmite no chat/fx", async () => {
    const { world, worldRoom, player, charName } = await setupPlayerInWorld("recruta_m", 30);

    const chatMsgs: any[] = [];
    const fxEvents: any[] = [];
    world.onMessage("chat", (m: any) => chatMsgs.push(m));
    world.onMessage("fx", (m: any) => {
      if (m.t === "event") fxEvents.push(m);
    });

    // Antes da promoção: sem Zanpakutō e sem patente promovida
    expect(player.prog.zanpakuto).toBeUndefined();
    expect(player.prog.promotedRank).toBeFalsy();

    // Executa a promoção militar
    const z = worldRoom.promoteToOfficer(player);

    expect(z).toBeDefined();
    expect(player.prog.zanpakuto).toEqual(z);
    expect(player.prog.promotedRank).toBe(true);

    const releasePhrase = formatZanpakutoRelease(z);

    // Transmissão no chat de lore
    await vi.waitFor(() => {
      const foundChat = chatMsgs.find(
        (c) => c.ch === "lore" && c.text.includes(`${charName} despertou sua Shikai: "${releasePhrase}"!`)
      );
      expect(foundChat).toBeDefined();

      const foundFx = fxEvents.find((f) => f.text === releasePhrase);
      expect(foundFx).toBeDefined();
    }, { timeout: 3000, interval: 25 });

    // Técnica atribuída no slot 4 (tecla 4, índice 1 de TECH_SLOTS)
    const tech4 = techniqueFor(player.charId, 1, player.form, player.prog.zanpakuto);
    expect(tech4).toBeDefined();
    expect(tech4?.name).toBe(z.shikaiSkill.name);
    expect(tech4?.cost).toBe(z.shikaiSkill.reiCost);

    await world.leave();
  });

  it("após o despertar da Shikai, a trava de XP do nível 30 é removida e o recruta sobe para o nível 31+", async () => {
    const { world, worldRoom, player } = await setupPlayerInWorld("recruta_m", 30);

    // Antes da promoção: ganho de XP é travado no nível 30
    worldRoom.gainExp(player, 1000, "Treino");
    expect(player.level).toBe(30);
    expect(player.exp).toBe(expForLevel(30));

    // Desperta a Shikai / promoção
    worldRoom.promoteToOfficer(player);
    expect(player.prog.promotedRank).toBe(true);

    // Agora ganha XP para o nível 31
    const expFor31 = expForLevel(31) - expForLevel(30);
    worldRoom.gainExp(player, expFor31 + 200, "Exame de Graduação");

    await vi.waitFor(() => expect(player.level).toBeGreaterThanOrEqual(31), { timeout: 3000, interval: 25 });
    expect(player.exp).toBeGreaterThan(expForLevel(30));

    await world.leave();
  });

  it("recruta promovido pode disparar a técnica da Shikai no slot 4 consumindo reiatsu e ativando recarga", async () => {
    const { world, worldRoom, player, id } = await setupPlayerInWorld("recruta_m", 30);

    // Promove o recruta
    const z = worldRoom.promoteToOfficer(player);

    let bonecoId = "";
    await vi.waitFor(() => {
      for (const [mid, mo] of world.state.monsters.entries()) {
        if (mo.kind === "boneco" && mo.map === "soul" && mo.x === BONECO.x && mo.y === BONECO.y) bonecoId = mid;
      }
      expect(bonecoId).not.toBe("");
    }, { timeout: 5000, interval: 25 });

    world.send("target", { id: bonecoId });
    await vi.waitFor(() => expect(world.state.players.get(id)?.targetId).toBe(bonecoId), { timeout: 5000, interval: 25 });

    // Garante que o jogador tem reiatsu cheia
    player.rei = player.maxRei = 200;

    const skillFxList: any[] = [];
    world.onMessage("fx", (m: any) => {
      if (m.t === "skill") skillFxList.push(m);
    });

    const initialRei = player.rei;

    // Dispara a habilidade na tecla / slot 4
    world.send("skill", { slot: 4 });

    await vi.waitFor(() => {
      expect(player.rei).toBe(initialRei - z.shikaiSkill.reiCost);
      expect(player.techReady[1]).toBeGreaterThan(Date.now());
      expect(skillFxList.some((s) => s.name === z.shikaiSkill.name)).toBe(true);
    }, { timeout: 3000, interval: 25 });

    await world.leave();
  });

  it("handler promoteToOfficer via mensagem do cliente desperta a Shikai com sucesso", async () => {
    const { world, player } = await setupPlayerInWorld("recruta_f", 30);

    expect(player.prog.promotedRank).toBeFalsy();
    expect(player.prog.zanpakuto).toBeUndefined();

    // Cliente envia a mensagem promoteToOfficer
    world.send("promoteToOfficer");

    await vi.waitFor(() => {
      expect(player.prog.promotedRank).toBe(true);
      expect(player.prog.zanpakuto).toBeDefined();
    }, { timeout: 3000, interval: 25 });

    await world.leave();
  });

  it("promoteToOfficer preserva a Zanpakutō caso o jogador já possua uma gerada", async () => {
    const { world, worldRoom, player } = await setupPlayerInWorld("recruta_m", 30);

    const firstZ = worldRoom.promoteToOfficer(player);
    const secondZ = worldRoom.promoteToOfficer(player);

    expect(secondZ).toEqual(firstZ);
    expect(player.prog.zanpakuto).toBe(firstZ);

    await world.leave();
  });
});
