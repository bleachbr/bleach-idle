import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { matchMaker } from "@colyseus/core";
import { Client } from "colyseus.js";
import { expForLevel, techniqueFor, maxForm, addItem, ITEMS } from "../../shared/src";
import * as db from "../src/db";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

const BONECO = { x: 38, y: 9 };

describe("JH-06: Desafio do Tenshintai, Despertar da Bankai e Exame de Capitão (server)", () => {
  let url: string;

  beforeAll(async () => {
    url = (await startTestServer()).url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  const randomLetters = (len = 4) =>
    Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  async function setupPlayerInWorld(charId: string, level = 100, map = "soul", x = BONECO.x, y = BONECO.y + 1) {
    const client = new Client(url);
    const login = `user_${Date.now().toString(36)}_${randomLetters()}`;
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login, password: "password123" }));
    await once(lobby, "chars");

    const charName = `Gotei ${randomLetters()}`;
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

  it("rejeita início do Tenshintai para personagens de nível insuficiente ou não promovidos a oficial", async () => {
    // Recruta nível 99 promovido
    const { world, worldRoom, player: p1 } = await setupPlayerInWorld("recruta_m", 99);
    worldRoom.promoteToOfficer(p1);
    const okLowLevel = worldRoom.startTenshintai(p1);
    expect(okLowLevel).toBe(false);

    // Recruta nível 100 sem promoção a oficial
    const { world: w2, worldRoom: wr2, player: p2 } = await setupPlayerInWorld("recruta_m", 100);
    p2.prog.promotedRank = false;
    const okNoOfficer = wr2.startTenshintai(p2);
    expect(okNoOfficer).toBe(false);

    await world.leave();
    await w2.leave();
  });

  it("inicia Desafio do Tenshintai consumindo o artefato e invocando o espírito da Zanpakutō", async () => {
    const { world, worldRoom, player, id, charName } = await setupPlayerInWorld("recruta_m", 100);

    // Promove a oficial primeiro
    worldRoom.promoteToOfficer(player);
    expect(player.prog.promotedRank).toBe(true);

    // Dá o artefato Tenshintai
    addItem(player.inv, "tenshintai", 1);
    expect(player.inv.some((s: any) => s?.id === "tenshintai")).toBe(true);

    const chatMsgs: any[] = [];
    world.onMessage("chat", (m: any) => chatMsgs.push(m));

    // Inicia o Tenshintai
    const started = worldRoom.startTenshintai(player);
    expect(started).toBe(true);

    // O artefato foi consumido do inventário
    expect(player.inv.some((s: any) => s?.id === "tenshintai")).toBe(false);

    // Monstro do espírito materializado foi criado
    const monsterId = `tenshintai_${player.id}`;
    const spiritMonster = worldRoom.state.monsters.get(monsterId);
    expect(spiritMonster).toBeDefined();
    expect(spiritMonster.kind).toBe("espirito_zanpakuto");
    expect(spiritMonster.owner).toBe(player.id);
    expect(spiritMonster.hp).toBeGreaterThan(0);

    // Broadcast do evento de materialização no chat
    await vi.waitFor(() => {
      const foundChat = chatMsgs.find(
        (c) => c.ch === "lore" && c.text.includes(`O Tenshintai reagiu à Reiatsu de ${charName}!`)
      );
      expect(foundChat).toBeDefined();
    }, { timeout: 3000, interval: 25 });

    await world.leave();
  });

  it("derrotar o espírito da Zanpakutō desperta a Bankai, ativa aura, técnica suprema e libera forma Bankai", async () => {
    const { world, worldRoom, player, charName } = await setupPlayerInWorld("recruta_m", 100);
    worldRoom.promoteToOfficer(player);

    const chatMsgs: any[] = [];
    world.onMessage("chat", (m: any) => chatMsgs.push(m));

    // Inicia o Tenshintai
    worldRoom.startTenshintai(player);
    const monsterId = `tenshintai_${player.id}`;
    const spiritMonster = worldRoom.state.monsters.get(monsterId);
    expect(spiritMonster).toBeDefined();

    // Antes de derrotar o espírito
    expect(player.prog.bankaiAwakened).toBeFalsy();
    expect(maxForm(player.charId, player.level, player.prog)).toBe(0);

    // Mata o monstro da projeção do Tenshintai
    worldRoom.killMonster(spiritMonster, player);

    // Espírito é removido do mundo
    expect(worldRoom.state.monsters.get(monsterId)).toBeUndefined();

    // Bankai despertada com sucesso!
    expect(player.prog.bankaiAwakened).toBe(true);
    expect((player.look as any).aura).toBe("bankai");

    // Chat anuncia solenemente o despertar da Bankai
    const z = player.prog.zanpakuto;
    expect(z).toBeDefined();
    await vi.waitFor(() => {
      const foundLore = chatMsgs.find(
        (c) => c.ch === "lore" && c.text.includes(`${charName} liberou sua Bankai: "${z.bankaiName}"!`)
      );
      expect(foundLore).toBeDefined();
    }, { timeout: 3000, interval: 25 });

    // Técnica suprema da Bankai liberada no slot 6 (índice 3 de TECH_SLOTS)
    const slot6Tech = techniqueFor(player.charId, 3, player.form, z, player.prog);
    expect(slot6Tech).toBeDefined();
    expect(slot6Tech?.name).toBe(z.bankaiSkill?.name);
    expect(slot6Tech?.mult).toBeGreaterThanOrEqual(8.0);
    expect(slot6Tech?.cost).toBe(z.bankaiSkill?.reiCost);

    // Forma Bankai liberada para transformação (maxForm = 1)
    expect(maxForm(player.charId, player.level, player.prog)).toBe(1);

    await world.leave();
  });

  it("exame de capitão rejeita quem não despertou Bankai e promove com sucesso quem despertou", async () => {
    const { world, worldRoom, player, charName } = await setupPlayerInWorld("recruta_m", 100);
    worldRoom.promoteToOfficer(player);

    // Sem Bankai: reprovado no exame de capitão
    expect(player.prog.bankaiAwakened).toBeFalsy();
    const failed = worldRoom.promoteToCaptain(player);
    expect(failed).toBe(false);
    expect(player.prog.captainRank).toBeFalsy();

    // Desperta a Bankai
    worldRoom.awakenBankai(player);
    expect(player.prog.bankaiAwakened).toBe(true);

    const chatMsgs: any[] = [];
    world.onMessage("chat", (m: any) => chatMsgs.push(m));

    // Agora realiza o Exame de Aptidão de Capitão
    const promoted = worldRoom.promoteToCaptain(player);
    expect(promoted).toBe(true);

    // Patente militar e viagem dimensional concedidas
    expect(player.prog.captainRank).toBe(true);
    expect(player.prog.dimensionalTravel).toBe(true);
    expect(player.prog.militaryRank).toBe("capitao");

    // Uniforme Haori Branco de Capitão concedido e visual atualizado
    expect(player.inv.some((s: any) => s?.id === "haori") || player.equip.armor === "haori").toBe(true);
    expect((player.look as any).outfit).toBe("haori");
    expect((player.look as any).aura).toBe("bankai");

    // Broadcast oficial diante da 1ª Divisão
    await vi.waitFor(() => {
      const foundLore = chatMsgs.find(
        (c) => c.ch === "lore" && c.text.includes(`${charName} foi aprovado no Exame de Aptidão de Capitão`)
      );
      expect(foundLore).toBeDefined();
    }, { timeout: 3000, interval: 25 });

    await world.leave();
  });

  it("viagem dimensional para o Palácio Real (Reiōkyū) é restrita a Capitães", async () => {
    const { world, worldRoom, player } = await setupPlayerInWorld("recruta_m", 100);
    worldRoom.promoteToOfficer(player);
    worldRoom.awakenBankai(player);

    player.gold = 50000;
    const initialMap = player.map;

    const logMsgs: string[] = [];
    world.onMessage("log", (m: any) => logMsgs.push(m.text));

    // Oficial com Bankai mas sem patente de Capitão tenta viajar para Reiōkyū
    world.send("travel", { dest: "reiokyu" });

    await vi.waitFor(() => {
      const blocked = logMsgs.find((t) => t.includes("Apenas Capitães do Gotei 13"));
      expect(blocked).toBeDefined();
    }, { timeout: 3000, interval: 25 });
    expect(player.map).toBe(initialMap);

    // Promove a Capitão
    worldRoom.promoteToCaptain(player);
    expect(player.prog.captainRank).toBe(true);

    // Agora viaja para Reiōkyū
    world.send("travel", { dest: "reiokyu" });

    await vi.waitFor(() => {
      expect(player.map).toBe("soul");
      const arrived = logMsgs.find((t) => t.includes("Viajou para Palácio Real"));
      expect(arrived).toBeDefined();
    }, { timeout: 3000, interval: 25 });

    await world.leave();
  });

  it("mensagens de rede 'tenshintai' e 'captainExam' acionam os fluxos corretamente", async () => {
    const { world, worldRoom, player } = await setupPlayerInWorld("recruta_m", 100);
    worldRoom.promoteToOfficer(player);

    // Envia mensagem 'tenshintai' pelo cliente
    world.send("tenshintai");
    await vi.waitFor(() => {
      const monster = worldRoom.state.monsters.get(`tenshintai_${player.id}`);
      expect(monster).toBeDefined();
    }, { timeout: 3000, interval: 25 });

    // Derrota o monstro para despertar Bankai
    const monster = worldRoom.state.monsters.get(`tenshintai_${player.id}`);
    worldRoom.killMonster(monster, player);
    expect(player.prog.bankaiAwakened).toBe(true);

    // Envia mensagem 'captainExam' pelo cliente
    world.send("captainExam");
    await vi.waitFor(() => {
      expect(player.prog.captainRank).toBe(true);
      expect((player.look as any).outfit).toBe("haori");
    }, { timeout: 3000, interval: 25 });

    await world.leave();
  });
});
