// Senhas (scrypt), ingressos de entrada no mundo e limite de tentativas.
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

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

// ---------- limite de tentativas (por login, falhas por IP e criação de contas por IP) ----------

const WINDOW_MS = 60_000;
const REGISTER_WINDOW_MS = 3_600_000; // 1 hora para criação de contas por IP
const MAX_FAILS = 5; // por login
// por IP: mais folgado, várias pessoas podem dividir o mesmo IP (os testes usam um valor alto,
// porque todos os bots entram do mesmo endereço)
const MAX_FAILS_IP = Number(process.env.LOGIN_MAX_FAILS_IP ?? 30);
const maxRegisterIp = () => Number(process.env.REGISTER_MAX_IP ?? 5);
const fails = new Map<string, { n: number; since: number }>();

const windowForKey = (key: string) => (key.startsWith("reg:") ? REGISTER_WINDOW_MS : WINDOW_MS);
const limitForKey = (key: string) =>
  key.startsWith("reg:") ? maxRegisterIp() : key.startsWith("ip:") ? MAX_FAILS_IP : MAX_FAILS;

export function blocked(key: string, now = Date.now()): boolean {
  const f = fails.get(key);
  if (!f) return false;
  if (now - f.since > windowForKey(key)) { fails.delete(key); return false; }
  return f.n >= limitForKey(key);
}

export function fail(key: string, now = Date.now()) {
  const f = fails.get(key);
  if (!f || now - f.since > windowForKey(key)) fails.set(key, { n: 1, since: now });
  else f.n++;
}

export function clearFails(key: string) {
  fails.delete(key);
}
