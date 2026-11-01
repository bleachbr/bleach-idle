import { describe, it, expect, beforeEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  issueTicket,
  consumeTicket,
  blocked,
  fail,
  clearFails,
} from "../src/auth";

describe("auth", () => {
  describe("passwords (scrypt)", () => {
    it("gera hash válido e verifica senha correta", async () => {
      const hash = await hashPassword("senha-secreta-123");
      expect(hash.startsWith("scrypt$")).toBe(true);

      const ok = await verifyPassword("senha-secreta-123", hash);
      expect(ok).toBe(true);
    });

    it("rejeita senha incorreta", async () => {
      const hash = await hashPassword("senha-correta");
      const ok = await verifyPassword("senha-errada", hash);
      expect(ok).toBe(false);
    });

    it("gera salts diferentes para a mesma senha", async () => {
      const hash1 = await hashPassword("mesma-senha");
      const hash2 = await hashPassword("mesma-senha");
      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword("mesma-senha", hash1)).toBe(true);
      expect(await verifyPassword("mesma-senha", hash2)).toBe(true);
    });
  });

  describe("tickets de entrada", () => {
    it("emite ingresso e consome com sucesso apenas uma vez", () => {
      const ticketId = issueTicket({ accountId: 1, charId: "ichigo" });
      expect(typeof ticketId).toBe("string");

      const consumed = consumeTicket(ticketId);
      expect(consumed).toEqual({ accountId: 1, charId: "ichigo" });

      // Segunda tentativa não deve funcionar (uso único)
      const secondTry = consumeTicket(ticketId);
      expect(secondTry).toBeUndefined();
    });

    it("retorna undefined para ticket inexistente", () => {
      expect(consumeTicket("ticket_invalido")).toBeUndefined();
      expect(consumeTicket(null)).toBeUndefined();
    });
  });

  describe("rate limiting (tentativas falhas)", () => {
    const testUser = "login_test_123";

    beforeEach(() => {
      clearFails(testUser);
      clearFails(`ip:127.0.0.1`);
    });

    it("bloqueia login após 5 falhas", () => {
      expect(blocked(testUser)).toBe(false);

      for (let i = 0; i < 4; i++) {
        fail(testUser);
        expect(blocked(testUser)).toBe(false);
      }

      fail(testUser); // 5ª falha
      expect(blocked(testUser)).toBe(true);
    });

    it("clearFails reseta o bloqueio", () => {
      for (let i = 0; i < 5; i++) fail(testUser);
      expect(blocked(testUser)).toBe(true);

      clearFails(testUser);
      expect(blocked(testUser)).toBe(false);
    });

    it("isola limite de criação de contas por IP (reg:) em janela de 1h sem misturar com falhas de login (ip:)", () => {
      const regKey = "reg:203.0.113.10";
      const ipKey = "ip:203.0.113.10";
      clearFails(regKey);
      clearFails(ipKey);

      const t0 = 1_700_000_000_000;
      for (let i = 0; i < 4; i++) {
        fail(regKey, t0);
        expect(blocked(regKey, t0)).toBe(false);
      }
      fail(regKey, t0); // 5ª conta criada no mesmo IP
      expect(blocked(regKey, t0)).toBe(true);
      // Login normal pelo mesmo IP não foi bloqueado pelo limite de cadastro
      expect(blocked(ipKey, t0)).toBe(false);
      // Após 2 minutos ainda está bloqueado para criar conta (janela é de 1 hora, não 1 minuto)
      expect(blocked(regKey, t0 + 120_000)).toBe(true);
      // Após 1 hora + 1 ms o bloqueio expira
      expect(blocked(regKey, t0 + 3_600_001)).toBe(false);
    });
  });
});
