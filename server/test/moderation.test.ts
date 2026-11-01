import { beforeEach, describe, expect, it } from "vitest";

process.env.DB_FILE = ":memory:";

describe("M3-05: Moderação de chat, filtro de spam e comandos de GM", () => {
  let db: typeof import("../src/db");
  let mod: typeof import("../src/moderation");

  beforeEach(async () => {
    db = await import("../src/db");
    mod = await import("../src/moderation");
    db.setMeta("chat_mutes", {});
    mod.resetModerationState();
    delete process.env.GM_CHARS;
  });

  it("sanitiza caracteres de controle e permite mensagens normais", () => {
    const r = mod.checkChatMessage("ichigo", "  Olá\u0000\u0007 mundo!  ", 1_000_000);
    expect(r).toEqual({ ok: true, text: "Olá mundo!" });
  });

  it("bloqueia a 3ª mensagem idêntica seguida em menos de 30s", () => {
    expect(mod.checkChatMessage("ichigo", "vendo espada", 1_000_000).ok).toBe(true);
    expect(mod.checkChatMessage("ichigo", "vendo espada", 1_001_000).ok).toBe(true);
    const third = mod.checkChatMessage("ichigo", "vendo espada", 1_002_000);
    expect(third.ok).toBe(false);
    expect(third.reason).toContain("repetidas");
  });

  it("bloqueia flood acima de 5 mensagens em 10s e aplica auto-mute na 3ª infração", () => {
    const base = 2_000_000;
    for (let i = 0; i < 5; i++) {
      expect(mod.checkChatMessage("byakuya", `msg ${i}`, base + i * 500).ok).toBe(true);
    }
    // 1ª e 2ª infrações de flood: bloqueia com aviso
    const f1 = mod.checkChatMessage("byakuya", "msg 5", base + 3000);
    expect(f1.ok).toBe(false);
    const f2 = mod.checkChatMessage("byakuya", "msg 6", base + 3500);
    expect(f2.ok).toBe(false);

    // 3ª infração seguida: aplica auto-mute de 60s
    const f3 = mod.checkChatMessage("byakuya", "msg 7", base + 4000);
    expect(f3.ok).toBe(false);
    expect(f3.reason).toContain("silenciado");

    // Mesmo após a janela de 10s passar, continua silenciado até 60s
    const duringMute = mod.checkChatMessage("byakuya", "msg 8", base + 20_000);
    expect(duringMute.ok).toBe(false);
    expect(duringMute.reason).toContain("silenciado");

    // Após 60s do auto-mute, volta a falar normalmente
    const afterMute = mod.checkChatMessage("byakuya", "msg 9", base + 65_000);
    expect(afterMute.ok).toBe(true);
  });

  it("persiste silenciamento manual no SQLite e valida autorização de GM (GM_CHARS)", () => {
    expect(mod.isGm("waldir")).toBe(false);
    process.env.GM_CHARS = "Waldir, Rafael";
    expect(mod.isGm("waldir")).toBe(true);
    expect(mod.isGm("rafael")).toBe(true);
    expect(mod.isGm("ichigo")).toBe(false);

    const now = 5_000_000;
    mod.mutePlayer("kenpachi", 15 * 60_000, "ofensa no chat", "Waldir", now);

    // Simula reinício do servidor limpando o estado em memória
    mod.resetModerationState();
    const blocked = mod.checkChatMessage("kenpachi", "oi", now + 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain("ofensa no chat");

    expect(mod.unmutePlayer("kenpachi")).toBe(true);
    expect(mod.checkChatMessage("kenpachi", "oi", now + 61_000).ok).toBe(true);
  });
});
