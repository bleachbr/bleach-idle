import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sanitizeMailItem,
  sanitizeMailPayload,
  getMailInbox,
  getUnreadMailCount,
  resetMailInbox,
  bindMail,
  requestMailList,
  requestMailTake,
} from "../src/mail";

describe("correio interno no cliente (mail.ts)", () => {
  beforeEach(() => {
    resetMailInbox();
  });

  describe("sanitização de itens individuais (Zero-Trust)", () => {
    it("retorna MailItem válido quando dados estão corretos", () => {
      const item = sanitizeMailItem({
        id: 1,
        to: "hero",
        from: "Sistema",
        subject: "Recompensa",
        body: "Parabéns pelo progresso!",
        gold: 500,
        items: [{ id: "pocao_hp", qty: 2 }],
        createdAt: 1700000000000,
        read: false,
      });

      expect(item).toEqual({
        id: 1,
        to: "hero",
        from: "Sistema",
        subject: "Recompensa",
        body: "Parabéns pelo progresso!",
        gold: 500,
        items: [{ id: "pocao_hp", qty: 2 }],
        createdAt: 1700000000000,
        read: false,
      });
    });

    it("rejeita entradas nulas, não objetos ou com id inválido", () => {
      expect(sanitizeMailItem(null)).toBeNull();
      expect(sanitizeMailItem(undefined)).toBeNull();
      expect(sanitizeMailItem("carta")).toBeNull();
      expect(sanitizeMailItem({ id: 0 })).toBeNull();
      expect(sanitizeMailItem({ id: -5 })).toBeNull();
      expect(sanitizeMailItem({ id: "1" })).toBeNull();
      expect(sanitizeMailItem({ id: 1.5 })).toBeNull();
    });

    it("limpa slots inválidos ou corrompidos nos anexos de itens", () => {
      const item = sanitizeMailItem({
        id: 10,
        items: [
          null,
          { id: "pocao", qty: 3 },
          { id: 123, qty: 1 },
          { id: "espada", qty: -1 },
          { id: "escudo", qty: 0 },
          { id: "arco", qty: 2.9 },
        ],
      });

      expect(item).not.toBeNull();
      expect(item?.items).toEqual([
        { id: "pocao", qty: 3 },
        { id: "arco", qty: 2 },
      ]);
    });

    it("normaliza strings, ouro negativo e booleano de leitura", () => {
      const item = sanitizeMailItem({
        id: 2,
        gold: -100,
        read: 1,
      });

      expect(item).not.toBeNull();
      expect(item?.gold).toBe(0);
      expect(item?.read).toBe(true);
      expect(item?.to).toBe("");
      expect(item?.from).toBe("");
      expect(item?.subject).toBe("");
      expect(item?.body).toBe("");
    });
  });

  describe("sanitização do payload completo", () => {
    it("extrai lista de cartas e descarta itens inválidos", () => {
      const inbox = sanitizeMailPayload({
        inbox: [
          { id: 1, from: "Admin", subject: "Aviso", gold: 10 },
          null,
          { id: -1 },
          { id: 2, from: "Mercado", subject: "Venda", gold: 0 },
        ],
      });

      expect(inbox).toHaveLength(2);
      expect(inbox[0].id).toBe(1);
      expect(inbox[1].id).toBe(2);
    });

    it("retorna lista vazia se msg for nula ou inbox não for array", () => {
      expect(sanitizeMailPayload(null)).toEqual([]);
      expect(sanitizeMailPayload({})).toEqual([]);
      expect(sanitizeMailPayload({ inbox: "invalido" })).toEqual([]);
    });
  });

  describe("bindMail e integração com sala do Colyseus", () => {
    it("registra o handler 'mail' na sala e atualiza o estado local", () => {
      const handlers = new Map<string, (msg: unknown) => void>();
      const mockRoom: any = {
        onMessage: vi.fn((type: string, cb: (msg: unknown) => void) => {
          handlers.set(type, cb);
        }),
        send: vi.fn(),
      };

      const onUpdate = vi.fn();
      bindMail(mockRoom, onUpdate);

      expect(mockRoom.onMessage).toHaveBeenCalledWith("mail", expect.any(Function));

      // Dispara mensagem "mail" recebida da sala
      const mailHandler = handlers.get("mail");
      expect(mailHandler).toBeDefined();

      mailHandler!({
        inbox: [
          { id: 1, from: "Urahara", subject: "Novos itens", read: false },
          { id: 2, from: "Yoruichi", subject: "Treino", read: true },
        ],
      });

      expect(getMailInbox()).toHaveLength(2);
      expect(getUnreadMailCount()).toBe(1);
      expect(onUpdate).toHaveBeenCalledWith(getMailInbox());
    });

    it("envia mensagens mailList e mailTake com validação", () => {
      const mockRoom: any = {
        onMessage: vi.fn(),
        send: vi.fn(),
      };

      requestMailList(mockRoom);
      expect(mockRoom.send).toHaveBeenCalledWith("mailList");

      requestMailTake(mockRoom, 42);
      expect(mockRoom.send).toHaveBeenCalledWith("mailTake", { id: 42 });

      // ID inválido não dispara envio
      requestMailTake(mockRoom, 0);
      requestMailTake(mockRoom, -1);
      requestMailTake(mockRoom, 1.5);
      expect(mockRoom.send).toHaveBeenCalledTimes(2);
    });
  });
});
