import { describe, it, expect } from "vitest";

process.env.DB_FILE = ":memory:";

const mailbox = await import("../src/mailbox");

const T0 = 1_700_000_000_000;

describe("W-07: correio interno (mailbox)", () => {
  it("entrega carta com anexos, lista só as do destinatário e conta não lidas", () => {
    const id = mailbox.send("ichigo", "Sistema", "Prêmio", "Parabéns!", { gold: 500, items: [{ id: "pocao_vida", qty: 3 }] }, T0);
    mailbox.send("rukia", "Sistema", "Outro", "Não é seu", {}, T0);

    const inbox = mailbox.list("ichigo", T0 + 1000);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ id, from: "Sistema", subject: "Prêmio", gold: 500, items: [{ id: "pocao_vida", qty: 3 }], read: false });
    expect(mailbox.unreadCount("ichigo", T0 + 1000)).toBe(1);

    mailbox.markRead(id, "ichigo");
    expect(mailbox.unreadCount("ichigo", T0 + 1000)).toBe(0);
  });

  it("retirada é atômica e de uso único: segunda tentativa e outro dono não recebem nada", () => {
    const id = mailbox.send("renji", "Mercado", "Anúncio expirado", "Item devolvido", { items: [{ id: "onigiri", qty: 1 }] }, T0);

    expect(mailbox.take(id, "byakuya")).toBeUndefined();
    const first = mailbox.take(id, "renji");
    expect(first?.items).toEqual([{ id: "onigiri", qty: 1 }]);
    expect(mailbox.take(id, "renji")).toBeUndefined();
    expect(mailbox.list("renji", T0)).toHaveLength(0);
  });

  it("cartas expiram em 30 dias e a caixa de entrada tem limite", () => {
    mailbox.send("sado", "Sistema", "Antiga", "x", {}, T0);
    expect(mailbox.list("sado", T0 + mailbox.MAIL_TTL_MS - 1)).toHaveLength(1);
    expect(mailbox.list("sado", T0 + mailbox.MAIL_TTL_MS)).toHaveLength(0);

    for (let i = 0; i < mailbox.MAX_INBOX + 5; i++) mailbox.send("ishida", "Sistema", `n${i}`, "x", {}, T0 + i);
    expect(mailbox.list("ishida", T0 + 1000)).toHaveLength(mailbox.MAX_INBOX);
    expect(mailbox.list("ishida", T0 + 1000).some((m) => m.subject === "n0")).toBe(false);
  });
});
