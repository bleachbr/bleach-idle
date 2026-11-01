import { describe, it, expect, beforeEach } from "vitest";

process.env.DB_FILE = ":memory:";

const db = await import("../src/db");
const auth = await import("../src/auth");

describe("M5-01 e M5-02: Rate limit persistente em SQLite e recuperação de senha assinada", () => {
  beforeEach(() => {
    auth.clearFails("rukia_test");
    auth.clearFails("ip:198.51.100.7");
    auth.clearFails("reg:198.51.100.7");
  });

  it("persiste o contador de falhas em auth_limits no SQLite (M5-02)", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) {
      auth.fail("rukia_test", t0);
    }
    expect(auth.blocked("rukia_test", t0)).toBe(true);

    // Verifica que a linha foi persistida no SQLite (sobrevive a reinício do processo)
    const row = db.getAuthLimit("rukia_test");
    expect(row).toEqual({ n: 5, since: t0 });

    // Limpar ou expirar remove do SQLite
    expect(auth.blocked("rukia_test", t0 + 60_001)).toBe(false);
    expect(db.getAuthLimit("rukia_test")).toBeUndefined();
  });

  it("emite token assinado de recuperação, valida assinatura/expiração e consome apenas uma vez (M5-01)", async () => {
    const t0 = 1_700_000_000_000;
    const oldHash = await auth.hashPassword("senha-antiga-123");
    const accountId = db.createAccount("byakuya_rec", oldHash)!;
    expect(accountId).toBeGreaterThan(0);

    // Associa e-mail de recuperação e cria uma sessão ativa
    db.setAccountEmail(accountId, "byakuya@gotei13.jp");
    expect(db.getAccount("byakuya_rec")?.email).toBe("byakuya@gotei13.jp");
    const sessionToken = db.createSession(accountId);
    expect(db.sessionAccount(sessionToken)?.accountId).toBe(accountId);

    // Emite token de recuperação assinado
    const resetToken = auth.issueResetToken("byakuya_rec", t0);
    expect(typeof resetToken).toBe("string");

    // 1. Token adulterado na assinatura é rejeitado
    const tampered = resetToken! + "x";
    const newHash = await auth.hashPassword("nova-senha-456");
    expect(auth.consumeResetToken(tampered, newHash, t0 + 1_000)).toBeNull();

    // 2. Token expirado (> 15 min) não altera a senha
    expect(auth.consumeResetToken(resetToken!, newHash, t0 + 15 * 60_000 + 1)).toBeNull();

    // 3. Emite novo token e consome dentro da janela (5 min depois)
    const validToken = auth.issueResetToken("byakuya_rec", t0)!;
    const consumed = auth.consumeResetToken(validToken, newHash, t0 + 5 * 60_000);
    expect(consumed).toEqual({ accountId, login: "byakuya_rec" });

    // 4. Reutilização do mesmo token falha (uso único)
    expect(auth.consumeResetToken(validToken, newHash, t0 + 5 * 60_000 + 100)).toBeNull();

    // 5. Senha antiga não funciona mais, nova senha funciona e sessão anterior foi revogada
    const updatedAcc = db.getAccount("byakuya_rec")!;
    expect(await auth.verifyPassword("senha-antiga-123", updatedAcc.pass)).toBe(false);
    expect(await auth.verifyPassword("nova-senha-456", updatedAcc.pass)).toBe(true);
    expect(db.sessionAccount(sessionToken)).toBeUndefined();
  });
});
