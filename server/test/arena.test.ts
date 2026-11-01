import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import * as db from "../src/db";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";
import {
  enqueue,
  dequeue,
  isInQueue,
  isInDuel,
  getQueueStatus,
  matchmake,
  createDuel,
  getDuelByPlayer,
  getActiveDuels,
  resolveDuel,
  applyArenaProgress,
  _resetForTests,
} from "../src/arenaManager";
import {
  calculateEloChange,
  getArenaTier,
  matchmakingTolerance,
  validateStepInterval,
  newArenaProgress,
  DEFAULT_ARENA_RATING,
  ARENA_COUNTDOWN_SEC,
  ARENA_MATCH_TIMEOUT_SEC,
  ARENA_WIN_GOLD,
  ARENA_WIN_SEASON_PTS,
} from "../../shared/src/arena";

describe("W-01: Arena Manager e Pareamento Ranqueado (Servidor)", () => {
  beforeEach(() => {
    _resetForTests();
  });

  it("enfileira e desenfileira jogadores na busca por partida", () => {
    expect(isInQueue("p1")).toBe(false);
    expect(enqueue({ playerId: "p1", name: "Ichigo", rating: 1000, queuedAt: 1000 })).toBe(true);
    expect(isInQueue("p1")).toBe(true);

    // Tentativa duplicada é rejeitada
    expect(enqueue({ playerId: "p1", name: "Ichigo", rating: 1000, queuedAt: 1050 })).toBe(false);

    const status = getQueueStatus("p1", 5000);
    expect(status.inQueue).toBe(true);
    expect(status.elapsedSec).toBe(4);
    expect(status.tolerance).toBe(100);

    expect(dequeue("p1")).toBe(true);
    expect(isInQueue("p1")).toBe(false);
    expect(getQueueStatus("p1")).toEqual({ inQueue: false });
  });

  it("pareia adversários dentro da janela de tolerância de Elo", () => {
    const t0 = 10_000;
    enqueue({ playerId: "p1", name: "Ichigo", rating: 1000, queuedAt: t0 });
    enqueue({ playerId: "p2", name: "Renji", rating: 1080, queuedAt: t0 });

    const matches = matchmake(t0);
    expect(matches).toHaveLength(1);
    expect(matches[0][0].playerId).toBe("p1");
    expect(matches[0][1].playerId).toBe("p2");

    // Ambos saem da fila após serem pareados
    expect(isInQueue("p1")).toBe(false);
    expect(isInQueue("p2")).toBe(false);
  });

  it("expande tolerância e só pareia jogadores distantes após tempo de espera", () => {
    const t0 = 10_000;
    enqueue({ playerId: "p1", name: "Ichigo", rating: 1000, queuedAt: t0 });
    enqueue({ playerId: "p2", name: "Byakuya", rating: 1250, queuedAt: t0 }); // diff = 250

    // No instante t0 (espera = 0s, tol = 100): não pareia
    expect(matchmake(t0)).toHaveLength(0);

    // Após 15s (tol = 150): ainda não alcança 250
    expect(matchmake(t0 + 15_000)).toHaveLength(0);

    // Após 30s (tol = 250): agora emparelha!
    const matches = matchmake(t0 + 30_000);
    expect(matches).toHaveLength(1);
    expect(matches[0][0].playerId).toBe("p1");
    expect(matches[0][1].playerId).toBe("p2");
  });

  it("cria duelo em contagem regressiva e isola duelistas de novas filas", () => {
    const t0 = 100_000;
    const e1 = { playerId: "p1", name: "Ichigo", rating: 1000, queuedAt: t0 };
    const e2 = { playerId: "p2", name: "Renji", rating: 1050, queuedAt: t0 };

    const duel = createDuel(e1, e2, t0);
    expect(duel.id).toBeDefined();
    expect(duel.state).toBe("countdown");
    expect(duel.countdownUntil).toBe(t0 + ARENA_COUNTDOWN_SEC * 1000);
    expect(duel.timeoutUntil).toBe(t0 + ARENA_MATCH_TIMEOUT_SEC * 1000);

    expect(isInDuel("p1")).toBe(true);
    expect(isInDuel("p2")).toBe(true);
    expect(getDuelByPlayer("p1")?.id).toBe(duel.id);
    expect(getDuelByPlayer("p2")?.id).toBe(duel.id);
    expect(getActiveDuels()).toHaveLength(1);

    // Jogador em duelo não pode entrar na fila
    expect(enqueue(e1)).toBe(false);
  });

  it("resolve duelo por nocaute (KO) com cálculo simétrico de Elo e recompensas", () => {
    const t0 = 100_000;
    const e1 = { playerId: "p1", name: "Ichigo", rating: 1000, queuedAt: t0 };
    const e2 = { playerId: "p2", name: "Renji", rating: 1000, queuedAt: t0 };
    const duel = createDuel(e1, e2, t0);

    const prog1 = newArenaProgress();
    const prog2 = newArenaProgress();

    // Ichigo vence Renji por KO
    const res = resolveDuel(duel.id, "p1", "ko");
    expect(res).toBeDefined();
    expect(res?.winnerId).toBe("p1");
    expect(res?.reason).toBe("ko");
    expect(res?.p1Outcome).toBe("win");
    expect(res?.p2Outcome).toBe("loss");
    expect(res?.p1Delta).toBe(16);
    expect(res?.p2Delta).toBe(-16);
    expect(res?.p1NewRating).toBe(1016);
    expect(res?.p2NewRating).toBe(984);
    expect(res?.goldReward).toBe(ARENA_WIN_GOLD);
    expect(res?.seasonPts).toBe(ARENA_WIN_SEASON_PTS);

    // Aplica progresso aos combatentes
    applyArenaProgress(prog1, res!.p1Outcome, res!.p1NewRating);
    expect(prog1.rating).toBe(1016);
    expect(prog1.bestRating).toBe(1016);
    expect(prog1.wins).toBe(1);
    expect(prog1.streak).toBe(1);

    applyArenaProgress(prog2, res!.p2Outcome, res!.p2NewRating);
    expect(prog2.rating).toBe(984);
    expect(prog2.losses).toBe(1);
    expect(prog2.streak).toBe(0);

    // Duelo e jogadores são desmapeados
    expect(isInDuel("p1")).toBe(false);
    expect(isInDuel("p2")).toBe(false);
    expect(getActiveDuels()).toHaveLength(0);
  });

  it("resolve duelo por desistência (forfeit) concedendo vitória ao remanescente", () => {
    const t0 = 100_000;
    const e1 = { playerId: "p1", name: "Ichigo", rating: 1100, queuedAt: t0 };
    const e2 = { playerId: "p2", name: "Renji", rating: 1100, queuedAt: t0 };
    const duel = createDuel(e1, e2, t0);

    // Renji desiste (/arena desistir ou desconexão)
    const res = resolveDuel(duel.id, "p1", "forfeit");
    expect(res?.winnerId).toBe("p1");
    expect(res?.reason).toBe("forfeit");
    expect(res?.p1Outcome).toBe("win");
    expect(res?.p2Outcome).toBe("loss");
    expect(res?.p1Delta).toBeGreaterThan(0);
    expect(isInDuel("p1")).toBe(false);
  });

  it("resolve empate por tempo limite (timeout) sem alteração de rating para notas iguais", () => {
    const t0 = 100_000;
    const e1 = { playerId: "p1", name: "Ichigo", rating: 1000, queuedAt: t0 };
    const e2 = { playerId: "p2", name: "Renji", rating: 1000, queuedAt: t0 };
    const duel = createDuel(e1, e2, t0);

    const res = resolveDuel(duel.id, null, "timeout");
    expect(res?.winnerId).toBeNull();
    expect(res?.reason).toBe("timeout");
    expect(res?.p1Outcome).toBe("draw");
    expect(res?.p2Outcome).toBe("draw");
    expect(res?.p1Delta).toBe(0);
    expect(res?.p2Delta).toBe(0);
  });
});

describe("E2E: Arena 1v1 Handlers de Rede e Ciclo de Vida", () => {
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

  async function createPlayerAndJoin(charName = `Duelist ${randomLetters(4)}`, level = 20) {
    const client = new Client(url);
    const login = `user_${Date.now().toString(36)}_${randomLetters(4)}`;

    const lobby = quiet(await client.joinOrCreate("lobby", {
      action: "register",
      login,
      password: "password123",
    }));

    await once(lobby, "chars");
    lobby.send("create", { name: charName, charId: "ichigo" });
    await once(lobby, "chars");
    const id = charName.toLowerCase();

    // Ajusta nível no banco antes de entrar no mundo
    const row = db.load(id);
    if (row) {
      row.data.level = level;
      db.save(id, row.data, false);
    }

    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = quiet(await client.join("world", { ticket }));
    return { client, world, charName: id };
  }

  it("responde arenaInfo com dados do jogador e status fora da fila", async () => {
    const { world, charName } = await createPlayerAndJoin(`info${randomLetters(3)}`, 25);
    await vi.waitFor(() => expect(world.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });

    world.send("arenaInfo");
    const data = await once<any>(world, "arenaData");
    expect(data.rating).toBe(1000);
    expect(data.tier.id).toBe("bronze");
    expect(data.wins).toBe(0);
    expect(data.queue.inQueue).toBe(false);

    await world.leave();
  });

  it("bloqueia entrada na fila para personagens abaixo do nível 20", async () => {
    const { world, charName } = await createPlayerAndJoin(`low${randomLetters(3)}`, 10);
    await vi.waitFor(() => expect(world.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });

    world.send("arenaQueue");
    const logMsg = await once<any>(world, "log");
    expect(logMsg.text).toContain("nível 20");

    await world.leave();
  });

  it("enfileira e sai da fila com confirmação de estado em arenaData", async () => {
    const { world, charName } = await createPlayerAndJoin(`q${randomLetters(4)}`, 25);
    await vi.waitFor(() => expect(world.state.players.get(charName)).toBeDefined(), { timeout: 5000, interval: 25 });

    world.send("arenaQueue");
    const enqueuedData = await once<any>(world, "arenaData");
    expect(enqueuedData.queue.inQueue).toBe(true);

    world.send("arenaLeaveQueue");
    const leftData = await once<any>(world, "arenaData");
    expect(leftData.queue.inQueue).toBe(false);

    await world.leave();
  });

  it("pareia dois jogadores, inicia contagem regressiva e resolve por rendição", async () => {
    const p1 = await createPlayerAndJoin(`first${randomLetters(3)}`, 25);
    const p2 = await createPlayerAndJoin(`secnd${randomLetters(3)}`, 25);

    await vi.waitFor(() => {
      expect(p1.world.state.players.get(p1.charName)).toBeDefined();
      expect(p2.world.state.players.get(p2.charName)).toBeDefined();
    }, { timeout: 5000, interval: 25 });

    // Registra listeners antes de enviar para não perder a mensagem no tick do servidor
    const p1MatchPromise = once<any>(p1.world, "arenaMatchFound", 5000);
    const p2MatchPromise = once<any>(p2.world, "arenaMatchFound", 5000);

    // Ambos entram na fila
    p1.world.send("arenaQueue");
    p2.world.send("arenaQueue");

    const [match1, match2] = await Promise.all([p1MatchPromise, p2MatchPromise]);

    expect(match1.duelId).toBe(match2.duelId);
    expect(match1.countdownSec).toBe(3);

    // Jogadores são teleportados para Dangai na arena
    await vi.waitFor(() => {
      const ent1 = p1.world.state.players.get(p1.charName);
      const ent2 = p2.world.state.players.get(p2.charName);
      expect(ent1?.map).toBe("dangai");
      expect(ent2?.map).toBe("dangai");
    }, { timeout: 5000, interval: 25 });

    // Registra listener de resultado antes da rendição
    const resultPromise = once<any>(p1.world, "arenaResult", 5000);

    // p2 desiste (ou desconecta)
    p2.world.send("arenaSurrender");

    const result1 = await resultPromise;
    expect(result1.winnerName).toBe(p1.charName);

    await p1.world.leave();
    await p2.world.leave();
  });
});
