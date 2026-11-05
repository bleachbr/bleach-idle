// Preferências do jogador neste navegador (R-14, ADR-001): uma chave só, bi.prefs, em JSON.
// O valor guardado é entrada não confiável (outra extensão ou o próprio jogador podem editá-lo):
// parsePrefs percorre a lista fixa de campos e copia só o que passa na validação.
// Os campos de escala, contraste, teclas e toque entram nos PRs seguintes da R-14.
import type { KV } from "./loreRead";

export const PREFS_KEY = "bi.prefs";
/** Chaves de antes da janela de opções. Durante uma versão continuam gravadas (ADR-001 §2.2). */
export const LEGACY_HD = "bi_hd";
export const LEGACY_MUTE = "bi_mute";

/** Movimento: "auto" segue o sistema (prefers-reduced-motion), "reduced" corta tremor e clarão, "full" mantém tudo. */
export type Motion = "auto" | "reduced" | "full";
export const MOTIONS: readonly Motion[] = ["auto", "reduced", "full"];

export type Prefs = {
  /** visual HD (desenho original) em vez de pixel art */
  hd: boolean;
  mute: boolean;
  motion: Motion;
};

export const DEFAULT_PREFS: Readonly<Prefs> = Object.freeze({ hd: false, mute: false, motion: "auto" });

const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isMotion = (v: unknown): v is Motion => typeof v === "string" && (MOTIONS as readonly string[]).includes(v);
const FIELDS: { readonly [K in keyof Prefs]: (v: unknown) => v is Prefs[K] } = { hd: isBool, mute: isBool, motion: isMotion };

/** Objeto novo com cada campo válido de `raw`; campo inválido ou ausente volta ao padrão. */
export function parsePrefs(raw: unknown): Prefs {
  const p: Prefs = { ...DEFAULT_PREFS };
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return p;
  for (const k of Object.keys(FIELDS) as (keyof Prefs)[]) {
    // só propriedade própria: chave fora da lista (inclusive __proto__) nunca é lida
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    const v: unknown = (raw as Record<string, unknown>)[k];
    if (FIELDS[k](v)) (p as Record<keyof Prefs, unknown>)[k] = v;
  }
  return p;
}

/** Primeira carga sem bi.prefs: aproveita o que o jogador já tinha escolhido nas chaves antigas. */
export function migrate(store: KV | null): Prefs {
  const old = (k: string) => { try { return store?.getItem(k) ?? null; } catch { return null; } };
  return { ...DEFAULT_PREFS, hd: old(LEGACY_HD) === "1", mute: old(LEGACY_MUTE) === "1" };
}

export function loadPrefs(store: KV | null): Prefs {
  let saved: string | null = null;
  try { saved = store?.getItem(PREFS_KEY) ?? null; } catch { /* bloqueado: usa as chaves antigas ou o padrão */ }
  if (saved === null) return migrate(store);
  try { return parsePrefs(JSON.parse(saved)); } catch { return { ...DEFAULT_PREFS }; }
}

/** Grava bi.prefs e, por compatibilidade com builds antigos, bi_hd e bi_mute. Sem armazenamento, vale só nesta sessão. */
export function savePrefs(store: KV | null, p: Prefs) {
  try {
    store?.setItem(PREFS_KEY, JSON.stringify(parsePrefs(p)));
    store?.setItem(LEGACY_HD, p.hd ? "1" : "0");
    store?.setItem(LEGACY_MUTE, p.mute ? "1" : "0");
  } catch { /* bloqueado ou cheio */ }
}
