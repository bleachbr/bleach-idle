import { beforeEach, describe, expect, it } from "vitest";
import { COSMETIC, SERVER_MILESTONES, titleText } from "../../shared/src";

process.env.DB_FILE = ":memory:";

describe("W-06: Títulos e marcos de servidor por feitos", () => {
  let db: typeof import("../src/db");
  let milestones: typeof import("../src/milestones");
  let ranking: typeof import("../src/ranking");

  beforeEach(async () => {
    db = await import("../src/db");
    milestones = await import("../src/milestones");
    ranking = await import("../src/ranking");
    db.setMeta("server_milestones", {});
    milestones.resetServerMilestonesCache();
    ranking.resetRankingCache();
  });

  it("define todos os marcos do servidor com títulos cosméticos válidos no catálogo", () => {
    expect(SERVER_MILESTONES.length).toBeGreaterThanOrEqual(6);
    for (const m of SERVER_MILESTONES) {
      expect(COSMETIC[m.titleId]).toBeDefined();
      expect(COSMETIC[m.titleId].kind).toBe("title");
      expect(COSMETIC[m.titleId].season).toBe(true);
      expect(titleText(m.titleId).length).toBeGreaterThan(3);
    }
  });

  it("concede o marco apenas ao primeiro jogador e persiste no SQLite mesmo após limpar o cache", () => {
    const first = milestones.claimServerMilestone(
      "first_bankai",
      { id: "ichigo", name: "Ichigo", charId: "ichigo" },
      1_700_000_000_000,
    );
    expect(first).not.toBeNull();
    expect(first?.id).toBe("first_bankai");
    expect(first?.titleId).toBe("tit_primeiro_bankai");

    // Segundo jogador tentando o mesmo feito não recebe o marco
    const second = milestones.claimServerMilestone(
      "first_bankai",
      { id: "byakuya", name: "Byakuya", charId: "byakuya" },
      1_700_000_005_000,
    );
    expect(second).toBeNull();

    // Simula reinício do servidor limpando o cache em memória e lendo do SQLite (meta)
    milestones.resetServerMilestonesCache();
    const list = milestones.listServerMilestones();
    const bankai = list.find((m) => m.id === "first_bankai");
    expect(bankai).toMatchObject({
      id: "first_bankai",
      holder: "Ichigo",
      charId: "ichigo",
      at: 1_700_000_000_000,
      title: "Primeiro Bankai",
    });

    // Outra tentativa após reinício continua bloqueada
    const afterRestart = milestones.claimServerMilestone(
      "first_bankai",
      { id: "renji", name: "Renji", charId: "ichigo" },
      1_700_000_010_000,
    );
    expect(afterRestart).toBeNull();
  });

  it("inclui os marcos do servidor no payload do ranking", () => {
    milestones.claimServerMilestone("first_yhwach", { id: "uryu", name: "Uryu", charId: "uryu" }, 1_700_000_100_000);
    const r = ranking.buildRanking([]);
    expect(Array.isArray(r.marcos)).toBe(true);
    const regicida = r.marcos.find((m) => m.id === "first_yhwach");
    expect(regicida?.holder).toBe("Uryu");
  });
});
