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

  it("o modo Dev está desligado: a mensagem dev não tem handler, o Colyseus desconecta quem a envia e nada é concedido", async () => {
    const s1 = await entrar();
    let recebeuDevMode = false;
    s1.world.onMessage("devMode", () => (recebeuDevMode = true));
    const saiu = new Promise<number>((resolve) => s1.world.onLeave(resolve));

    s1.world.send("dev", { a: "gold" });
    s1.world.send("dev", { a: "level", n: 300 });

    expect(await saiu).not.toBe(1000); // desconexão com erro, não saída normal
    expect(recebeuDevMode).toBe(false);

    // reentra com a mesma conta: o personagem segue com o nível e o ouro iniciais
    const lobby = await s1.client.joinOrCreate("lobby", { action: "login", login: s1.login, password: SENHA });
    await once(lobby, "chars");
    const s2 = await abrirMundo(s1.client, lobby, s1.id);
    await s2.sincronizar();
    expect(s2.world.state.players.get(s1.id)?.level).toBe(START_LEVEL);
    expect(s2.inv()?.gold).toBe(START_KIT.gold);
    await s2.world.leave();
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
