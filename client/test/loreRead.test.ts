import { describe, it, expect } from "vitest";
import { LORE_READ_KEY, loadLoreRead, markLoreRead, type KV } from "../src/loreRead";

// #38: as crônicas lidas ficam marcadas neste navegador (localStorage), sem estado no servidor.
const memory = (init: Record<string, string> = {}): KV & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (Object.hasOwn(data, k) ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};
const blocked: KV = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

describe("crônicas lidas (#38)", () => {
  it("começa vazio e guarda a crônica lida", () => {
    const s = memory();
    expect(loadLoreRead(s).size).toBe(0);
    expect(markLoreRead(s, "lore_karakura").has("lore_karakura")).toBe(true);
    expect([...loadLoreRead(s)]).toEqual(["lore_karakura"]);
  });

  it("marcar duas vezes não repete", () => {
    const s = memory();
    markLoreRead(s, "lore_karakura");
    markLoreRead(s, "lore_karakura");
    expect(JSON.parse(s.data[LORE_READ_KEY])).toEqual(["lore_karakura"]);
  });

  it("ignora valor corrompido, id fora do catálogo, id que não é crônica e chave de protótipo", () => {
    expect(loadLoreRead(memory({ [LORE_READ_KEY]: "{não é json" })).size).toBe(0);
    expect(loadLoreRead(memory({ [LORE_READ_KEY]: JSON.stringify({ lore_karakura: 1 }) })).size).toBe(0);
    const s = memory({ [LORE_READ_KEY]: JSON.stringify(["lore_karakura", "aura_negra", "constructor", "__proto__", 7, null]) });
    expect([...loadLoreRead(s)]).toEqual(["lore_karakura"]);
    expect(markLoreRead(memory(), "constructor").size).toBe(0);
  });

  it("com o armazenamento bloqueado, não lança e vale só na sessão", () => {
    expect(loadLoreRead(blocked).size).toBe(0);
    expect(loadLoreRead(null).size).toBe(0);
    expect(markLoreRead(blocked, "lore_karakura").has("lore_karakura")).toBe(true);
  });
});
