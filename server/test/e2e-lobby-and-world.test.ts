import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client, type Room } from "colyseus.js";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

describe("E2E: Lobby e World", () => {
  let url: string;

  beforeAll(async () => {
    const s = await startTestServer();
    url = s.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  const err = async (p: Promise<unknown>) => {
    try {
      await p;
      return "";
    } catch (e: any) {
      return e.message as string;
    }
  };

  it("permite cadastro, login e emissão de token de sessão", async () => {
    const client = new Client(url);
    const login = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const room = quiet(await client.joinOrCreate("lobby", {
      action: "register",
      login,
      password: "segredo_forte_123",
      remember: true,
    }));

    const acc = await once<{ login: string; token?: string }>(room, "account");
    expect(acc.login).toBe(login);
    expect(acc.token).toBeTypeOf("string");

    await room.leave();

    // Login via token de sessão
    const tokenRoom = quiet(await client.joinOrCreate("lobby", { token: acc.token }));
    const tokenAcc = await once<{ login: string }>(tokenRoom, "account");
    expect(tokenAcc.login).toBe(login);
    await tokenRoom.leave();
  });

  it("rejeita cadastro com login duplicado ou senha curta", async () => {
    const client = new Client(url);
    const login = `dup_${Date.now().toString(36)}`;

    // Primeiro cadastro
    const r1 = quiet(await client.joinOrCreate("lobby", { action: "register", login, password: "senha_valida_123" }));
    await r1.leave();

    // Segundo cadastro com mesmo login
    const errorDup = await err(client.joinOrCreate("lobby", { action: "register", login, password: "senha_valida_123" }));
    expect(errorDup).toContain("já existe");

    // Senha curta (< 6 chars)
    const errorShort = await err(client.joinOrCreate("lobby", { action: "register", login: "outro_user", password: "123" }));
    expect(errorShort).toContain("Senha");
  });

  const randomLetters = (len = 4) =>
    Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

  it("cria personagem, emite ticket e entra no mundo", async () => {
    const client = new Client(url);
    const login = `play_${Date.now().toString(36)}`;
    const charName = `Hero ${randomLetters(5)}`;

    const lobby = quiet(await client.joinOrCreate("lobby", {
      action: "register",
      login,
      password: "senha_valida_123",
    }));

    // Aguarda lista inicial de chars
    await once<any[]>(lobby, "chars");

    // Cria personagem
    lobby.send("create", { name: charName, charId: "ichigo" });
    const charsAfterCreate = await once<any[]>(lobby, "chars");
    expect(charsAfterCreate.some((c) => c.name.toLowerCase() === charName.toLowerCase())).toBe(true);

    // Solicita ticket para jogar
    lobby.send("play", { id: charName.toLowerCase() });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    expect(ticket).toBeTypeOf("string");

    await lobby.leave();

    // Conecta no World usando o ticket emitido
    const world = quiet(await client.join("world", { ticket }));
    expect(world.id).toBeTruthy();

    await world.leave();
  });

  it("rejeita ingresso inválido no mundo", async () => {
    const client = new Client(url);
    const error = await err(client.join("world", { ticket: "ingresso_falso_123" }));
    expect(error).toContain("Ingresso");
  });

  it("desconecta primeira janela com código 4001 quando mesma conta entra de outro lugar", async () => {
    const client = new Client(url);
    const login = `multi_${Date.now().toString(36)}`;
    const charName = `Clone ${randomLetters(5)}`;

    // Cria conta e char
    const lobby1 = quiet(await client.joinOrCreate("lobby", { action: "register", login, password: "senha_valida_123" }));
    await once(lobby1, "chars");
    lobby1.send("create", { name: charName, charId: "ichigo" });
    await once(lobby1, "chars");
    lobby1.send("play", { id: charName.toLowerCase() });
    const { ticket: t1 } = await once<{ ticket: string }>(lobby1, "ticket");
    await lobby1.leave();

    // Primeira conexão no mundo
    const world1 = quiet(await client.join("world", { ticket: t1 }));
    let leaveCode = 0;
    world1.onLeave((code) => {
      leaveCode = code;
    });

    // Pede novo ticket com a mesma conta
    const lobby2 = quiet(await client.joinOrCreate("lobby", { action: "login", login, password: "senha_valida_123" }));
    await once(lobby2, "chars");
    lobby2.send("play", { id: charName.toLowerCase() });
    const { ticket: t2 } = await once<{ ticket: string }>(lobby2, "ticket");
    await lobby2.leave();

    // Segunda conexão no mundo para o mesmo personagem
    const world2 = quiet(await client.join("world", { ticket: t2 }));

    // A primeira janela deve ter caído com código 4001 (espera o fechamento, não um tempo fixo)
    await vi.waitFor(() => expect(leaveCode).toBe(4001), { timeout: 5000, interval: 25 });

    await world2.leave();
  });
});
