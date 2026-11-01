// Moderação de chat, filtro anti-spam/flood e comandos de GM (M3-05 — Portão G2).
import * as db from "./db";

export interface MuteRecord {
  charId: string;
  until: number;
  reason: string;
  by: string;
}

export type ChatCheckResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

interface ChatWindow {
  times: number[];
  lastText: string;
  lastAt: number;
  repeats: number;
  strikes: number;
}

const META_KEY = "chat_mutes";
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_MSGS = 5;
const REPEAT_WINDOW_MS = 30_000;
const MAX_IDENTICAL_REPEATS = 2;
const AUTO_MUTE_STRIKES = 3;
const AUTO_MUTE_MS = 60_000;
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]+/g;

const mutes = new Map<string, MuteRecord>();
const windows = new Map<string, ChatWindow>();
let loaded = false;

function ensureLoaded(now = Date.now()): void {
  if (loaded) return;
  loaded = true;
  const saved = db.getMeta<Record<string, MuteRecord>>(META_KEY) ?? {};
  for (const [id, rec] of Object.entries(saved)) {
    if (rec && typeof rec.until === "number" && rec.until > now) {
      mutes.set(id, rec);
    }
  }
}

function persistMutes(now = Date.now()): void {
  for (const [id, rec] of mutes) {
    if (rec.until <= now) mutes.delete(id);
  }
  db.setMeta(META_KEY, Object.fromEntries(mutes));
}

export function sanitizeChatText(raw: unknown, maxLen = 200): string {
  if (typeof raw !== "string") return "";
  return raw.replace(CONTROL_CHARS_RE, "").trim().slice(0, maxLen);
}

/** Verifica se o personagem possui permissão de GM definida em `GM_CHARS`. */
export function isGm(charId: string): boolean {
  const raw = process.env.GM_CHARS ?? "";
  if (!raw.trim()) return false;
  const id = charId.trim().toLowerCase();
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .some((entry) => entry.length > 0 && entry === id);
}

export function activeMute(charId: string, now = Date.now()): MuteRecord | null {
  ensureLoaded(now);
  const id = charId.toLowerCase();
  const rec = mutes.get(id);
  if (!rec) return null;
  if (rec.until <= now) {
    mutes.delete(id);
    persistMutes(now);
    return null;
  }
  return rec;
}

export function mutePlayer(
  targetId: string,
  durationMs: number,
  reason = "moderação",
  by = "GM",
  now = Date.now(),
): MuteRecord {
  ensureLoaded(now);
  const id = targetId.trim().toLowerCase();
  const clampedMs = Math.max(10_000, Math.min(7 * 24 * 3600_000, Math.round(durationMs)));
  const rec: MuteRecord = {
    charId: id,
    until: now + clampedMs,
    reason: sanitizeChatText(reason, 80) || "moderação",
    by,
  };
  mutes.set(id, rec);
  persistMutes(now);
  return rec;
}

export function unmutePlayer(targetId: string, now = Date.now()): boolean {
  ensureLoaded(now);
  const id = targetId.trim().toLowerCase();
  if (!mutes.delete(id)) return false;
  persistMutes(now);
  return true;
}

function formatMuteMessage(rec: MuteRecord, now: number): string {
  const secs = Math.max(1, Math.ceil((rec.until - now) / 1000));
  const timeStr = secs >= 60 ? `${Math.ceil(secs / 60)} min` : `${secs} s`;
  return `Você está silenciado por mais ${timeStr} (${rec.reason}).`;
}

/** Valida silenciamento, flood e repetição para qualquer canal de chat. */
export function checkChatMessage(charId: string, rawText: unknown, now = Date.now()): ChatCheckResult {
  const text = sanitizeChatText(rawText);
  if (!text) return { ok: false, reason: "" };

  const id = charId.toLowerCase();
  const muted = activeMute(id, now);
  if (muted) {
    return { ok: false, reason: formatMuteMessage(muted, now) };
  }

  let w = windows.get(id);
  if (!w) {
    w = { times: [], lastText: "", lastAt: 0, repeats: 0, strikes: 0 };
    windows.set(id, w);
  }
  w.times = w.times.filter((t) => now - t < RATE_WINDOW_MS);

  const registerStrike = (msg: string): ChatCheckResult => {
    w!.strikes++;
    if (w!.strikes >= AUTO_MUTE_STRIKES) {
      w!.strikes = 0;
      const rec = mutePlayer(id, AUTO_MUTE_MS, "excesso de spam", "sistema", now);
      return { ok: false, reason: formatMuteMessage(rec, now) };
    }
    return { ok: false, reason: msg };
  };

  if (w.times.length >= RATE_MAX_MSGS) {
    return registerStrike("Calma! Você está enviando mensagens rápido demais.");
  }

  const normalized = text.toLowerCase();
  if (normalized === w.lastText && now - w.lastAt < REPEAT_WINDOW_MS) {
    if (w.repeats >= MAX_IDENTICAL_REPEATS) {
      return registerStrike("Evite enviar mensagens repetidas em sequência.");
    }
    w.repeats++;
  } else {
    w.lastText = normalized;
    w.repeats = 1;
  }

  w.lastAt = now;
  w.times.push(now);
  w.strikes = 0;
  return { ok: true, text };
}

export function resetModerationState(): void {
  mutes.clear();
  windows.clear();
  loaded = false;
}
