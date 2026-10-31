// Lobby: login, cadastro, lista e criação de personagens. Ao escolher um personagem,
// emite um ingresso de uso único que o cliente usa para entrar na sala "world".
import { Client, ServerError } from "@colyseus/core";
import { GameRoom } from "./GameRoom";
import type { IncomingMessage } from "node:http";
import {
  CHARS, own, START_LEVEL, START_KIT, INV_SIZE, DEPOT_SIZE, expForLevel, maxHp, maxRei, addItem, type Slot,
} from "../../shared/src";
import * as db from "./db";
import { HOME, TEMPLE } from "./maps";
import * as guilds from "./guilds";
import { hashPassword, verifyPassword, issueTicket, blocked, fail, clearFails } from "./auth";
import { clientIp } from "./clientIp";

const MAX_CHARS = 5;
const LOGIN_RE = /^[a-z0-9_]{3,20}$/;
const NAME_RE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ]{2,15}$/;

interface Auth { accountId: number; login: string; token?: string }

export function newCharacter(name: string, charId: string): db.SaveData {
  const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
  for (const s of START_KIT.inv) addItem(inv, s.id, s.qty);
  return {
    name, charId, level: START_LEVEL, exp: expForLevel(START_LEVEL),
    hp: maxHp(START_LEVEL), rei: maxRei(START_LEVEL), map: HOME.id, x: TEMPLE.x, y: TEMPLE.y,
    gold: START_KIT.gold, inv, depot: Array(DEPOT_SIZE).fill(null), equip: { ...START_KIT.equip },
  };
}

export class LobbyRoom extends GameRoom {
  maxClients = 1000;

  async onAuth(_client: Client, opts: any, req?: IncomingMessage): Promise<Auth> {
    const ip = `ip:${clientIp(req)}`;
    if (opts?.token) {
      const token = typeof opts.token === "string" ? opts.token : "";
      const acc = db.sessionAccount(token);
      if (!acc) throw new ServerError(401, "Sessão expirada. Entre de novo.");
      return { ...acc, token };
    }
    const login = typeof opts?.login === "string" ? opts.login.trim().toLowerCase() : "";
    const pass = typeof opts?.password === "string" ? opts.password : "";
    if (!LOGIN_RE.test(login)) throw new ServerError(400, "Login: de 3 a 20 caracteres (letras minúsculas, números ou _).");
    if (pass.length < 6 || pass.length > 72) throw new ServerError(400, "Senha: de 6 a 72 caracteres.");
    if (blocked(login) || blocked(ip)) throw new ServerError(429, "Muitas tentativas. Espere um minuto.");

    if (opts?.action === "register") {
      fail(ip); // conta como tentativa: limita criação de contas em massa pelo mesmo IP
      const id = db.createAccount(login, await hashPassword(pass));
      if (!id) throw new ServerError(409, "Esse login já existe.");
      return { accountId: id, login, token: opts.remember ? db.createSession(id) : undefined };
    }
    const acc = db.getAccount(login);
    if (!acc || !(await verifyPassword(pass, acc.pass))) {
      fail(login);
      fail(ip);
      throw new ServerError(401, "Login ou senha incorretos.");
    }
    clearFails(login);
    return { accountId: acc.id, login, token: opts.remember ? db.createSession(acc.id) : undefined };
  }

  onJoin(client: Client, _opts?: unknown, auth?: Auth) {
    if (!auth) throw new ServerError(401, "Sem login.");
    client.userData = auth;
    client.send("account", { login: auth.login, token: auth.token });
    this.sendChars(client);
  }

  onCreate() {
    this.handle("create", (c, m: { name: string; charId: string }) => {
      const { accountId } = c.userData as Auth;
      const name = (typeof m?.name === "string" ? m.name : "").trim().replace(/\s+/g, " ");
      if (!NAME_RE.test(name)) return c.send("error", { text: "Nome: de 3 a 16 letras (espaços permitidos)." });
      if (!own(CHARS, m?.charId)) return c.send("error", { text: "Escolha um personagem." });
      if (db.listChars(accountId).length >= MAX_CHARS) return c.send("error", { text: `Limite de ${MAX_CHARS} personagens por conta.` });
      if (!db.createChar(accountId, name.toLowerCase(), newCharacter(name, m.charId))) return c.send("error", { text: "Esse nome já está em uso." });
      this.sendChars(c);
    });
    this.handle("delete", (c, m: { id: string }) => {
      const { accountId } = c.userData as Auth;
      const id = typeof m?.id === "string" ? m.id : "";
      if (!db.deleteChar(accountId, id))
        return c.send("error", { text: "Não foi possível excluir. Se ele estiver caçando offline, entre e desligue o Auto Hunt antes." });
      guilds.leave(id); // sai da guilda (passa a liderança ou desfaz a guilda)
      this.sendChars(c);
    });
    this.handle("play", (c, m: { id: string }) => {
      const { accountId } = c.userData as Auth;
      const id = typeof m?.id === "string" ? m.id : "";
      const row = db.load(id);
      if (!row || row.accountId !== accountId) return c.send("error", { text: "Personagem não encontrado." });
      c.send("ticket", { ticket: issueTicket({ accountId, charId: row.id }) });
    });
    this.handle("password", async (c, m: { old: string; new: string }) => {
      const { accountId, login, token } = c.userData as Auth;
      const oldPw = typeof m?.old === "string" ? m.old : "";
      const newPw = typeof m?.new === "string" ? m.new : "";
      if (blocked(login)) return c.send("error", { text: "Muitas tentativas. Espere um minuto." });
      if (newPw.length < 6 || newPw.length > 72) return c.send("error", { text: "Nova senha: de 6 a 72 caracteres." });
      const acc = db.getAccount(login);
      if (!acc || acc.id !== accountId || !(await verifyPassword(oldPw, acc.pass))) {
        fail(login);
        return c.send("error", { text: "Senha atual incorreta." });
      }
      clearFails(login);
      db.setPassword(accountId, await hashPassword(newPw), token);
      c.send("passwordOk", {});
    });
    this.handle("logout", (c) => {
      const { token } = c.userData as Auth;
      if (token) db.deleteSession(token);
      c.leave();
    });
  }

  private sendChars(c: Client) {
    const { accountId } = c.userData as Auth;
    c.send("chars", db.listChars(accountId).map((r) => ({
      id: r.id, name: r.data.name, charId: r.data.charId, level: r.data.level,
      hunting: r.inWorld && (!!r.data.autoHunt || !!r.data.autoTrain),
    })));
  }
}
