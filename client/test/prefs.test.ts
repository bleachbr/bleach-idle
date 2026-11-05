import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, LEGACY_HD, LEGACY_MUTE, PREFS_KEY, loadPrefs, migrate, parsePrefs, savePrefs } from "../src/prefs";
import type { KV } from "../src/loreRead";

// R-14 (ADR-001): preferências numa chave só, validadas campo a campo, com migração das chaves antigas.
const memory = (init: Record<string, string> = {}): KV & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (Object.hasOwn(data, k) ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};
const blocked: KV = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

describe("parsePrefs", () => {
  it("copia os campos válidos", () => {
    expect(parsePrefs({ hd: true, mute: true })).toEqual({ ...DEFAULT_PREFS, hd: true, mute: true });
  });

  it("campo inválido ou ausente volta ao padrão sem descartar o resto", () => {
    expect(parsePrefs({ hd: "1", mute: true })).toEqual({ ...DEFAULT_PREFS, mute: true });
    expect(parsePrefs({ hd: true })).toEqual({ ...DEFAULT_PREFS, hd: true });
    expect(parsePrefs({ mute: 1, extra: true })).toEqual(DEFAULT_PREFS);
  });

  it("motion aceita só os três valores da lista", () => {
    for (const m of ["auto", "reduced", "full"]) expect(parsePrefs({ motion: m }).motion).toBe(m);
    for (const m of ["", "REDUCED", "none", 1, true, null, {}, ["reduced"]]) expect(parsePrefs({ motion: m }).motion).toBe("auto");
    expect(parsePrefs({ hd: true, motion: "x" })).toEqual({ ...DEFAULT_PREFS, hd: true });
  });

  it("valor que não é objeto vira o padrão", () => {
    for (const raw of [null, undefined, 7, "hd", true, [true, true]]) expect(parsePrefs(raw)).toEqual(DEFAULT_PREFS);
  });

  it("ignora __proto__ e constructor vindos do JSON.parse", () => {
    // o literal JS { __proto__: x } troca o protótipo; só o JSON.parse cria a chave própria
    const p = parsePrefs(JSON.parse('{"__proto__": {"hd": true, "mute": true}, "constructor": {"hd": true}}'));
    expect(p).toEqual(DEFAULT_PREFS);
    expect(Object.getPrototypeOf(p)).toBe(Object.prototype);
    expect(Object.keys(p).sort()).toEqual(["hd", "motion", "mute"]);
  });

  it("devolve um objeto novo, nunca o padrão congelado", () => {
    const p = parsePrefs(null);
    p.hd = true;
    expect(DEFAULT_PREFS.hd).toBe(false);
  });
});

describe("migração e armazenamento", () => {
  it("primeira carga lê bi_hd e bi_mute", () => {
    expect(loadPrefs(memory({ [LEGACY_HD]: "1", [LEGACY_MUTE]: "1" }))).toEqual({ ...DEFAULT_PREFS, hd: true, mute: true });
    expect(loadPrefs(memory({ [LEGACY_HD]: "0" }))).toEqual(DEFAULT_PREFS);
    expect(migrate(memory())).toEqual(DEFAULT_PREFS);
  });

  it("com bi.prefs gravado, as chaves antigas não mandam mais", () => {
    const s = memory({ [PREFS_KEY]: JSON.stringify({ hd: false, mute: true }), [LEGACY_HD]: "1", [LEGACY_MUTE]: "0" });
    expect(loadPrefs(s)).toEqual({ ...DEFAULT_PREFS, mute: true });
  });

  it("bi.prefs corrompido vira o padrão", () => {
    expect(loadPrefs(memory({ [PREFS_KEY]: "{não é json", [LEGACY_HD]: "1" }))).toEqual(DEFAULT_PREFS);
  });

  it("gravar escreve bi.prefs e regrava as chaves antigas para builds antigos", () => {
    const s = memory();
    savePrefs(s, { hd: true, mute: false });
    expect(JSON.parse(s.data[PREFS_KEY])).toEqual({ ...DEFAULT_PREFS, hd: true });
    expect(s.data[LEGACY_HD]).toBe("1");
    expect(s.data[LEGACY_MUTE]).toBe("0");
    expect(loadPrefs(s)).toEqual({ ...DEFAULT_PREFS, hd: true });
  });

  it("com o armazenamento bloqueado, não lança e usa o padrão", () => {
    expect(loadPrefs(blocked)).toEqual(DEFAULT_PREFS);
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(() => savePrefs(blocked, { hd: true, mute: true })).not.toThrow();
  });
});
