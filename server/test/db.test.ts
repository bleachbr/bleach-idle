import { describe, it, expect, beforeAll } from "vitest";

// Define DB_FILE antes de importar o módulo do banco
process.env.DB_FILE = ":memory:";

describe("db", () => {
  let dbModule: typeof import("../src/db");

  beforeAll(async () => {
    dbModule = await import("../src/db");
  });

  describe("contas e sessões", () => {
    it("cria conta e impede login duplicado", () => {
      const accId1 = dbModule.createAccount("usuario_teste", "hash_pw");
      expect(accId1).toBeTypeOf("number");

      // Login duplicado retorna null
      const accId2 = dbModule.createAccount("usuario_teste", "outro_hash");
      expect(accId2).toBeNull();
    });

    it("busca conta por login", () => {
      dbModule.createAccount("busca_teste", "hash_busca");
      const acc = dbModule.getAccount("busca_teste");
      expect(acc).toBeDefined();
      expect(acc?.login).toBe("busca_teste");
      expect(acc?.pass).toBe("hash_busca");
    });

    it("gerencia sessões de 'lembrar login'", () => {
      const accId = dbModule.createAccount("sessao_user", "hash")!;
      const token = dbModule.createSession(accId);
      expect(typeof token).toBe("string");

      const session = dbModule.sessionAccount(token);
      expect(session).toEqual({ accountId: accId, login: "sessao_user" });

      dbModule.deleteSession(token);
      expect(dbModule.sessionAccount(token)).toBeUndefined();
    });
  });

  describe("personagens", () => {
    const baseSaveData = {
      name: "Ichigo Bot",
      charId: "ichigo",
      level: 8,
      exp: 4200,
      hp: 220,
      rei: 104,
      x: 30,
      y: 20,
    };

    it("cria e lista personagens de uma conta", () => {
      const accId = dbModule.createAccount("player_acc", "hash")!;
      const ok = dbModule.createChar(accId, "ichigo bot", baseSaveData);
      expect(ok).toBe(true);

      const chars = dbModule.listChars(accId);
      expect(chars).toHaveLength(1);
      expect(chars[0].id).toBe("ichigo bot");
      expect(chars[0].data.level).toBe(8);
    });

    it("impede criar personagem com nome já existente", () => {
      const accId1 = dbModule.createAccount("acc1", "hash")!;
      const accId2 = dbModule.createAccount("acc2", "hash")!;

      expect(dbModule.createChar(accId1, "nome duplicado", baseSaveData)).toBe(true);
      expect(dbModule.createChar(accId2, "nome duplicado", baseSaveData)).toBe(false);
    });

    it("salva e atualiza dados do personagem", () => {
      const accId = dbModule.createAccount("save_acc", "hash")!;
      dbModule.createChar(accId, "salvador", baseSaveData);

      const updatedData = { ...baseSaveData, level: 9, exp: 5500 };
      dbModule.save("salvador", updatedData, true);

      const loaded = dbModule.load("salvador");
      expect(loaded?.data.level).toBe(9);
      expect(loaded?.inWorld).toBe(true);
    });

    it("saveMany grava múltiplos personagens numa única transação", () => {
      const accId = dbModule.createAccount("bulk_acc", "hash")!;
      dbModule.createChar(accId, "char_a", baseSaveData);
      dbModule.createChar(accId, "char_b", baseSaveData);

      dbModule.saveMany([
        { id: "char_a", data: { ...baseSaveData, level: 10 }, inWorld: true },
        { id: "char_b", data: { ...baseSaveData, level: 12 }, inWorld: false },
      ]);

      expect(dbModule.load("char_a")?.data.level).toBe(10);
      expect(dbModule.load("char_a")?.inWorld).toBe(true);
      expect(dbModule.load("char_b")?.data.level).toBe(12);
      expect(dbModule.load("char_b")?.inWorld).toBe(false);
    });

    it("impede deletar personagem se estiver in_world", () => {
      const accId = dbModule.createAccount("del_acc", "hash")!;
      dbModule.createChar(accId, "hunt_ativo", baseSaveData);
      dbModule.setInWorld("hunt_ativo", true);

      // Não pode deletar se inWorld == true
      const deletedWhileHunting = dbModule.deleteChar(accId, "hunt_ativo");
      expect(deletedWhileHunting).toBe(false);

      // Pode deletar depois que sair do mundo
      dbModule.setInWorld("hunt_ativo", false);
      const deletedAfterLeave = dbModule.deleteChar(accId, "hunt_ativo");
      expect(deletedAfterLeave).toBe(true);
    });
  });
});
