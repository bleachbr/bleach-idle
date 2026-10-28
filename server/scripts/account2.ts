// Troca de senha no lobby e /ignorar no chat.
import { Client } from "colyseus.js";
import { play, sleep, once, ok, done, URL, PASSWORD } from "./lib";

// troca de senha: conta só deste cenário
const login = `senha_${Date.now() % 100000}`;
const c = new Client(URL);
let lobby = await c.joinOrCreate("lobby", { action: "register", login, password: PASSWORD, remember: true });
const token = (await once<{ token: string }>(lobby, "account")).token;
lobby.send("password", { old: "errada-123", new: "nova-senha-1" });
ok("senha atual errada é recusada", (await once<{ text: string }>(lobby, "error")).text.includes("incorreta"));
lobby.send("password", { old: PASSWORD, new: "nova-senha-1" });
await once(lobby, "passwordOk");
ok("troca com a senha certa", true);
await lobby.leave();
let oldFails = false;
try { await c.joinOrCreate("lobby", { login, password: PASSWORD }); } catch { oldFails = true; }
ok("a senha antiga não entra mais", oldFails);
lobby = await c.joinOrCreate("lobby", { login, password: "nova-senha-1" });
ok("a nova entra", !!(await once(lobby, "account")));
await lobby.leave();
let tokenOk = false;
try { const r = await c.joinOrCreate("lobby", { token }); tokenOk = true; await r.leave(); } catch { /* derrubada */ }
ok("a sessão lembrada que fez a troca continua valendo", tokenOk);

// /ignorar
const a = await play("Ignora Ana");
const b = await play("Ignora Beto");
const got: string[] = [];
b.onMessage("chat", (m) => got.push(`${m.ch ?? ""}|${m.from}|${m.text}`));
const blog: string[] = [];
b.onMessage("log", (m) => blog.push(m.text));
b.send("chat", { text: "/ignorar Ignora Ana" });
await sleep(300);
ok("ignorar confirma", blog.some((l) => l.startsWith("Ignorando Ignora Ana")));
a.send("chat", { text: "oi publico" });
a.send("chat", { text: "/pm Ignora Beto, oi privado" });
await sleep(400);
ok("quem ignora não recebe chat público nem PM", !got.some((l) => l.includes("oi publico") || l.includes("oi privado")));
b.send("chat", { text: "/ignorar Ignora Ana" });
await sleep(200);
a.send("chat", { text: "oi de novo" });
await sleep(400);
ok("ignorar de novo desfaz", got.some((l) => l.includes("oi de novo")));
for (const r of [a, b]) await r.leave();
done();
