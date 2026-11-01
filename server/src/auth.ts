// Senhas (scrypt), ingressos de entrada no mundo, tokens de recuperação e limite de tentativas persistente.
import { scrypt, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import * as db from "./db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const got = await scryptAsync(pw, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(got, expected);
}

// ---------- ingresso: o lobby emite, o mundo consome (uso único, 60 s) ----------

export interface Ticket { accountId: number; charId: string }
const tickets = new Map<string, Ticket & { exp: number }>();

export function issueTicket(t: Ticket): string {
  const id = randomBytes(24).toString("base64url");
  tickets.set(id, { ...t, exp: Date.now() + 60_000 });
  return id;
}

export function consumeTicket(id: unknown): Ticket | undefined {
  if (typeof id !== "string") return undefined;
  const t = tickets.get(id);
  tickets.delete(id);
  for (const [k, v] of tickets) if (v.exp < Date.now()) tickets.delete(k); // limpeza
  return t && t.exp >= Date.now() ? { accountId: t.accountId, charId: t.charId } : undefined;
}

// ---------- limite de tentativas persistente em SQLite (M5-02) ----------

const WINDOW_MS = 60_000;
const REGISTER_WINDOW_MS = 3_600_000; // 1 hora para criação de contas por IP
const MAX_FAILS = 5; // por login
// por IP: mais folgado, várias pessoas podem dividir o mesmo IP (os testes usam um valor alto,
// porque todos os bots entram do mesmo endereço)
const MAX_FAILS_IP = Number(process.env.LOGIN_MAX_FAILS_IP ?? 30);
const maxRegisterIp = () => Number(process.env.REGISTER_MAX_IP ?? 5);

const windowForKey = (key: string) => (key.startsWith("reg:") ? REGISTER_WINDOW_MS : WINDOW_MS);
const limitForKey = (key: string) =>
  key.startsWith("reg:") ? maxRegisterIp() : key.startsWith("ip:") ? MAX_FAILS_IP : MAX_FAILS;

export function blocked(key: string, now = Date.now()): boolean {
  const f = db.getAuthLimit(key);
  if (!f) return false;
  if (now - f.since > windowForKey(key)) {
    db.deleteAuthLimit(key);
    return false;
  }
  return f.n >= limitForKey(key);
}

export function fail(key: string, now = Date.now()) {
  const f = db.getAuthLimit(key);
  if (!f || now - f.since > windowForKey(key)) db.setAuthLimit(key, 1, now);
  else db.setAuthLimit(key, f.n + 1, f.since);
}

export function clearFails(key: string) {
  db.deleteAuthLimit(key);
}

// ---------- token assinado de recuperação de senha (M5-01: 15 min, uso único) ----------

const RESET_TTL_MS = 15 * 60_000;

function resetSecret(): string {
  if (process.env.RESET_TOKEN_SECRET) return process.env.RESET_TOKEN_SECRET;
  const saved = db.getMeta<string>("reset_token_secret");
  if (saved) return saved;
  const generated = randomBytes(32).toString("base64url");
  db.setMeta("reset_token_secret", generated);
  return generated;
}

function signPayload(payload: string): Buffer {
  return createHmac("sha256", resetSecret()).update(payload).digest();
}

export function issueResetToken(login: string, now = Date.now()): string | null {
  const cleanLogin = typeof login === "string" ? login.trim().toLowerCase() : "";
  if (!cleanLogin) return null;
  const acc = db.getAccount(cleanLogin);
  if (!acc) return null;
  const exp = now + RESET_TTL_MS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${acc.id}.${exp}.${nonce}`;
  const sig = signPayload(payload).toString("base64url");
  db.saveResetNonce(nonce, acc.id, exp, now);
  return `${payload}.${sig}`;
}

export function consumeResetToken(
  token: unknown,
  newPassHash: string,
  now = Date.now(),
): { accountId: number; login: string } | null {
  if (typeof token !== "string" || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [idStr, expStr, nonce, sigB64] = parts;
  const accountId = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isInteger(accountId) || accountId <= 0 || !Number.isInteger(exp) || !nonce || !sigB64) return null;
  if (exp < now) return null;

  const payload = `${accountId}.${exp}.${nonce}`;
  const expectedSig = signPayload(payload);
  let gotSig: Buffer;
  try {
    gotSig = Buffer.from(sigB64, "base64url");
  } catch {
    return null;
  }
  if (gotSig.length !== expectedSig.length || !timingSafeEqual(gotSig, expectedSig)) return null;

  const acc = db.getAccountById(accountId);
  if (!acc) return null;
  if (!db.consumeResetNonce(nonce, accountId, now)) return null;

  db.setPassword(accountId, newPassHash);
  clearFails(acc.login);
  return { accountId: acc.id, login: acc.login };
}
