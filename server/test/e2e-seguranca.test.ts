import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "colyseus.js";
import { START_LEVEL, START_KIT } from "../../shared/src";
import { startTestServer, stopTestServer, once } from "./helpers/testServer";

// Regressões de segurança, contra o servidor real em memória. Cada teste falhava no código anterior.
describe("E2E: segurança do servidor", () => {
  let url: string;

  beforeAll(async () => {
    url = (await startTestServer()).url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  const letras = (n = 5) => Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  const SENHA = "senha_de_teste_1";

  /** Cria conta e personagem novos e devolve o necessário para jogar e para reentrar com a mesma conta. */
  async function registrar() {
    const client = new Client(url);
    const login = `seg_${Date.now().toString(36)}_${letras(4)}`;
    const lobby = await client.joinOrCreate("lobby", { action: "register", login, password: SENHA });
    await once(lobby, "chars");
    const nome = `Seg ${letras(5)}`;
    lobby.send("create", { name: nome, charId: "ichigo" });
    await once(lobby, "chars");
    return { client, lobby, login, id: nome.toLowerCase() };
  }

  async function abrirMundo(client: Client, lobby: Awaited<ReturnType<typeof registrar>>["lobby"], id: string) {
    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();
    const world = await client.join("world", { ticket });
    // sem onMessage("*"): o curinga dispara no lugar do listener específico e o `once` nunca resolveria
    for (const tipo of ["log", "tutorial", "chat", "account", "fx", "dailyReady", "season", "crystals", "death", "market"]) world.onMessage(tipo, () => {});
    // o servidor envia `quests` e `inv` ao entrar e a cada mudança: guarda sempre a última
    let missoes: { active: Record<string, number> } | undefined;
    let inv: { gold: number } | undefined;
    world.onMessage("quests", (m) => (missoes = m));
    world.onMessage("inv", (m) => (inv = m));
    /** O servidor entrega as mensagens na ordem em que as produziu: quando o `time` volta, tudo o que veio antes já chegou. */
    const sincronizar = async () => {
      const volta = once(world, "time");
      world.send("time");
      await volta;
    };
    return { world, sincronizar, missoes: () => missoes, inv: () => inv };
  }

  async function entrar() {
    const r = await registrar();
    return { ...(await abrirMundo(r.client, r.lobby, r.id)), ...r };
  }

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])("o lobby recusa criar personagem com charId %s", async (charId) => {
    const client = new Client(url);
    const lobby = await client.joinOrCreate("lobby", { action: "register", login: `lob_${Date.now().toString(36)}_${letras(4)}`, password: "senha_de_teste_1" });
    await once(lobby, "chars");

    const resposta = once<{ text: string }>(lobby, "error");
    lobby.send("create", { name: `Mau ${letras(4)}`, charId });
    expect((await resposta).text).toBe("Escolha um personagem.");

    // nenhum personagem foi gravado: a lista continua vazia
    const lista = once<unknown[]>(lobby, "chars");
    lobby.send("create", { name: `Bom ${letras(4)}`, charId: "ichigo" });
    expect(await lista).toHaveLength(1);
    await lobby.leave();
  });

  it("o cliente real envia devHello ao entrar: com o modo Dev desligado isso NÃO pode desconectá-lo", async () => {
    const { world, sincronizar } = await entrar();
    let recebeuDevMode = false;
    world.onMessage("devMode", () => (recebeuDevMode = true));
    let saiu: number | undefined;
    world.onLeave((code) => (saiu = code));

    world.send("devHello");
    await sincronizar(); // se o servidor tivesse desconectado, o `time` nunca voltaria

    expect(recebeuDevMode).toBe(false);
    expect(saiu).toBeUndefined();
    await world.leave();
  });

  it("o modo Dev está desligado: a mensagem dev desconecta quem a envia (4002) e nada é concedido", async () => {
    const s1 = await entrar();
    const saiu = new Promise<number>((resolve) => s1.world.onLeave(resolve));

    s1.world.send("dev", { a: "gold" });
    s1.world.send("dev", { a: "level", n: 300 });
    expect(await saiu).toBe(4002); // WS_CLOSE_WITH_ERROR do Colyseus para mensagem sem handler

    // reentra com a mesma conta: o personagem segue com o nível e o ouro iniciais
    const lobby = await s1.client.joinOrCreate("lobby", { action: "login", login: s1.login, password: SENHA });
    await once(lobby, "chars");
    const s2 = await abrirMundo(s1.client, lobby, s1.id);
    await s2.sincronizar();
    expect(s2.world.state.players.get(s1.id)?.level).toBe(START_LEVEL);
    expect(s2.inv()?.gold).toBe(START_KIT.gold);
    await s2.world.leave();
  });

  it.each(["__proto__", "__defineGetter__", "__defineSetter__"])("o tipo de mensagem %s não derruba o servidor (nem desconecta ninguém além de quem o envia)", async (tipo) => {
    const vitima = await entrar();
    const atacante = await entrar();
    const saiu = new Promise<number>((resolve) => atacante.world.onLeave(resolve));

    atacante.world.send(tipo);
    expect(await saiu).toBe(4002);

    await vitima.sincronizar(); // o servidor continua vivo e respondendo para os outros
    await vitima.world.leave();
  });

  it("o lobby também sobrevive ao tipo de mensagem __proto__", async () => {
    const r = await registrar();
    const saiu = new Promise<number>((resolve) => r.lobby.onLeave(resolve));
    r.lobby.send("__proto__");
    expect(await saiu).toBe(4002);

    const outro = await registrar(); // o servidor segue aceitando contas novas
    expect(outro.id).toBeTruthy();
  });

  it("um personagem salvo com charId envenenado (de antes da correção) abre o mundo como ichigo", async () => {
    const r = await registrar();
    const { DatabaseSync } = await import("node:sqlite");
    // o helper usa o mesmo banco em memória do processo; a gravação passa pelo db do servidor
    const db = await import("../src/db");
    const row = db.load(r.id)!;
    db.save(r.id, { ...row.data, charId: "constructor" }, false);

    const w = await abrirMundo(r.client, r.lobby, r.id);
    await w.sincronizar();
    expect(w.world.state.players.get(r.id)?.charId).toBe("ichigo");
    void DatabaseSync;
    await w.world.leave();
  });

  it("um save com missão fantasma (de antes da correção) é limpo ao carregar", async () => {
    const r = await registrar();
    const db = await import("../src/db");
    const row = db.load(r.id)!;
    db.save(r.id, { ...row.data, quests: { active: { undefined: 0, patrulha: 2 }, done: [] } }, false);

    const w = await abrirMundo(r.client, r.lobby, r.id);
    await w.sincronizar();
    expect(Object.keys(w.missoes()?.active ?? {})).toEqual(["patrulha"]);
    await w.world.leave();
  });

  it("questAccept com id válido aceita a missão (garante que o teste abaixo enxerga o efeito)", async () => {
    const { world, sincronizar, missoes } = await entrar();
    world.send("questAccept", { id: "patrulha" });
    await sincronizar();
    expect(Object.keys(missoes()?.active ?? {})).toEqual(["patrulha"]);
    await world.leave();
  });

  it.each(["constructor", "__proto__", "toString"])("questAccept com id %s não cria missão fantasma", async (id) => {
    const { world, sincronizar, missoes } = await entrar();
    world.send("questAccept", { id });
    world.send("questTurnIn", { id });
    world.send("questAbandon", { id });
    await sincronizar();
    expect(missoes()).toBeDefined(); // a mensagem inicial chegou, então a ausência de chaves é real
    expect(Object.keys(missoes()?.active ?? {})).toEqual([]);
    await world.leave();
  });
});
