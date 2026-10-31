import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.DB_FILE = ":memory:";

describe("ranking incremental (F-09)", () => {
  let db: typeof import("../src/db");
  let ranking: typeof import("../src/ranking");

  beforeEach(async () => {
    db = await import("../src/db");
    ranking = await import("../src/ranking");
    ranking.resetRankingCache();
  });

  const baseSave = (name: string, level: number, exp: number, frags = 0, dgBest = 0) => ({
    name,
    charId: "ichigo",
    level,
    exp,
    hp: 200,
    rei: 100,
    x: 10,
    y: 10,
    frags,
    rebirths: 0,
    prog: {
      bestiary: { hollow_menor: 100 },
      ach: frags > 0 ? ["first_kill"] : [],
      daily: { last: "", streak: 0 },
      kills: 100,
      bossKills: 0,
      tut: [],
      dgBest,
    },
  });

  it("reconstrói o ranking sem varrer db.allChars() após a carga inicial e reflete saves, online e exclusões", () => {
    const accId = db.createAccount(`rk_${Date.now()}`, "hash")!;
    db.createChar(accId, "rk_offline", baseSave("RkOffline", 20, 50_000, 2, 5));
    db.createChar(accId, "rk_temp", baseSave("RkTemp", 15, 20_000, 0, 0));

    // Primeira construção semeia o índice em memória
    const r1 = ranking.buildRanking([]);
    expect(r1.nivel.some((x) => x.name === "RkOffline" && x.level === 20)).toBe(true);

    // Espiona db.allChars: atualizações incrementais e novas reconstruções NÃO devem varrer a tabela SQLite
    const spyAll = vi.spyOn(db, "allChars");

    // Atualiza save de rk_offline e remove rk_temp
    db.save("rk_offline", baseSave("RkOffline", 35, 250_000, 4, 12), false);
    db.deleteChar(accId, "rk_temp");

    // Jogador online no estado da sala sobrepõe o valor salvo sem precisar ir ao disco
    const livePlayer = {
      id: "rk_offline",
      name: "RkOffline",
      charId: "ichigo",
      level: 40,
      exp: 400_000,
      frags: 5,
      rebirths: 1,
      power: 950,
      prog: { bestiary: { hollow_menor: 500 }, ach: ["a1", "a2"], dgBest: 18 },
    };

    const r2 = ranking.buildRanking([livePlayer]);
    expect(spyAll).not.toHaveBeenCalled();

    const top = r2.nivel.find((x) => x.name === "RkOffline");
    expect(top?.level).toBe(40);
    expect(top?.rebirths).toBe(1);
    expect(r2.nivel.some((x) => x.name === "RkTemp")).toBe(false);
    expect(r2.dangai.some((x) => x.name === "RkOffline" && x.dg === 18)).toBe(true);

    spyAll.mockRestore();
  });
});
