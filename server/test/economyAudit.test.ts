import { describe, it, expect, beforeEach } from "vitest";

process.env.DB_FILE = ":memory:";

const audit = await import("../src/economyAudit");

const T0 = 1_700_000_000_000;

describe("W-08: Auditoria de economia (trilha imutável e anti-dupe)", () => {
  beforeEach(() => {
    audit._resetAuditTableForTests();
  });

  it("registra movimentações de kan e cristais com saldo resultante e motivo", () => {
    const id1 = audit.recordAudit({
      accountId: 1,
      charId: "ichigo",
      currency: "kan",
      delta: -500,
      balanceAfter: 1500,
      reason: "market_buy",
      details: { listingId: 42, seller: "renji", item: "onigiri" },
      createdAt: T0,
    });
    expect(id1).toBeGreaterThan(0);

    const id2 = audit.recordAudit({
      accountId: 1,
      charId: "ichigo",
      currency: "crystals",
      delta: 10,
      balanceAfter: 40,
      reason: "daily_reward",
      createdAt: T0 + 1000,
    });
    expect(id2).toBeGreaterThan(id1);

    const trail = audit.getAuditTrail("ichigo");
    expect(trail).toHaveLength(2);
    // Ordenado do mais recente para o mais antigo
    expect(trail[0]).toMatchObject({
      currency: "crystals",
      delta: 10,
      balanceAfter: 40,
      reason: "daily_reward",
    });
    expect(trail[1]).toMatchObject({
      currency: "kan",
      delta: -500,
      balanceAfter: 1500,
      reason: "market_buy",
      details: { listingId: 42, seller: "renji", item: "onigiri" },
    });
  });

  it("registra transferência de itens (anúncios, compras e retiradas do correio)", () => {
    audit.recordAudit({
      accountId: 2,
      charId: "renji",
      currency: "item",
      delta: -1,
      reason: "market_sell",
      itemId: "espada_shikai",
      details: { price: 2000 },
      createdAt: T0,
    });

    const trail = audit.getAuditTrail("renji");
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      charId: "renji",
      currency: "item",
      delta: -1,
      reason: "market_sell",
      itemId: "espada_shikai",
      details: { price: 2000 },
    });
  });

  it("calcula fluxo econômico agregado (ganhos vs drenos de kan por motivo)", () => {
    audit.recordAudit({
      charId: "sado",
      currency: "kan",
      delta: 1000,
      balanceAfter: 1000,
      reason: "quest_reward",
      createdAt: T0 + 100,
    });
    audit.recordAudit({
      charId: "sado",
      currency: "kan",
      delta: -200,
      balanceAfter: 800,
      reason: "forge_fee",
      createdAt: T0 + 200,
    });
    audit.recordAudit({
      charId: "rukia",
      currency: "kan",
      delta: -50,
      balanceAfter: 450,
      reason: "forge_fee",
      createdAt: T0 + 300,
    });

    const flow = audit.queryEconomyFlow(T0, T0 + 500);
    expect(flow.totalIn).toBe(1000);
    expect(flow.totalOut).toBe(250);
    expect(flow.netChange).toBe(750);
    expect(flow.byReason["forge_fee"]).toBe(-250);
    expect(flow.byReason["quest_reward"]).toBe(1000);
  });
});
