// Teste de contas: cadastro, login errado, limite de tentativas, sessão lembrada,
// nome duplicado, ingresso inválido e o mesmo personagem entrando duas vezes.
import { Client } from "colyseus.js";
import { URL, openLobby, once, play, sleep, ok, done } from "./lib";

const err = async (p: Promise<unknown>) => { try { await p; return ""; } catch (e: any) { return e.message as string; } };
const login = `t_${Date.now().toString(36)}`;
const c = new Client(URL);

// cadastro com "lembrar": vem um token
const reg = await c.joinOrCreate("lobby", { action: "register", login, password: "segredo1", remember: true });
const acc = await once<{ login: string; token?: string }>(reg, "account");
ok("cadastro devolve token de sessão", !!acc.token);
await reg.leave();
ok("login repetido é recusado", (await err(c.joinOrCreate("lobby", { action: "register", login, password: "segredo1" }))).includes("já existe"));
ok("senha curta é recusada", (await err(c.joinOrCreate("lobby", { action: "login", login, password: "123" }))).includes("Senha"));
for (let i = 0; i < 5; i++) await err(c.joinOrCreate("lobby", { action: "login", login, password: "errada!!" }));
ok("6ª senha errada bloqueia por 1 min", (await err(c.joinOrCreate("lobby", { action: "login", login, password: "segredo1" }))).includes("Muitas tentativas"));
const viaToken = await c.joinOrCreate("lobby", { token: acc.token });
ok("token entra sem senha mesmo bloqueado", (await once<{ login: string }>(viaToken, "account")).login === login);
await viaToken.leave();
ok("token inválido é recusado", (await err(c.joinOrCreate("lobby", { token: "xyz" }))).includes("Sessão"));

// nome de personagem duplicado entre contas
const a = await play("Nome Unico");
await a.leave();
const { room: other } = await openLobby("bot_outra");
await once(other, "chars");
other.send("create", { name: "Nome Unico", charId: "rukia" });
ok("nome de personagem já usado é recusado", (await once<{ text: string }>(other, "error")).text.includes("em uso"));
other.send("play", { id: "nome unico" });
ok("não joga personagem de outra conta", (await once<{ text: string }>(other, "error")).text.includes("não encontrado"));
await other.leave();
ok("mundo recusa ingresso falso", (await err(c.join("world", { ticket: "falso" }))).includes("Ingresso"));

// mesmo personagem duas vezes: a sessão nova assume, a antiga cai
const first = await play("Duas Janelas");
let firstLeft = 0;
first.onLeave((code) => (firstLeft = code));
const second = await play("Duas Janelas");
await sleep(500);
ok("segunda janela assume e a primeira cai (código 4001)", firstLeft === 4001 && second.state.players.get("duas janelas")?.online === true);
await second.leave();
done();
