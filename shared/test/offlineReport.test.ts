import { describe, it, expect } from "vitest";
import { buildOfflineReport, OFFLINE_MAX_MS, type OfflineReportInput } from "../src/offlineReport";

const H = 3600_000;
const T0 = 1_700_000_000_000;

const base = (over: Partial<OfflineReportInput> = {}): OfflineReportInput => ({
  since: T0,
  now: T0 + 2 * H,
  expAtLeave: 1000, exp: 5000,
  goldAtLeave: 200, gold: 900,
  zanAtLeave: 3, zan: 5,
  reiAtLeave: 1, rei: 1,
  level: 40,
  kinds: { hollow_menor: 30, adjuchas: 10, fishbone: 5, arrancar: 3, gillian: 1, hollow_sombrio: 2 },
  items: { pocao_vida: 4, pedra_reishi: 1 },
  deaths: [],
  ...over,
});

describe("W-05: relatório de caçada offline v2", () => {
  it("resume abates por monstro (top 5 ordenado), itens estruturados e taxas por hora", () => {
    const r = buildOfflineReport(base());
    expect(r.kills).toBe(51);
    expect(r.topKills.map((k) => k.kind)).toEqual(["hollow_menor", "adjuchas", "fishbone", "arrancar", "hollow_sombrio"]);
    expect(r.topKills[0]).toMatchObject({ kind: "hollow_menor", name: "Hollow Menor", n: 30 });
    expect(r.otherKinds).toBe(1);
    expect(r.items[0]).toMatchObject({ id: "pocao_vida", qty: 4 });
    expect(r.huntMinutes).toBe(120);
    expect(r.killsPerHour).toBe(25.5);
    expect(r.expPerHour).toBe(2000);
    expect(r.exp).toBe(4000);
    expect(r.gold).toBe(700);
    expect(r.stopped).toBe(false);
  });

  it("limita a caçada a 12 h e avisa que parou, em vez de contar o tempo todo longe", () => {
    const r = buildOfflineReport(base({ now: T0 + 30 * H }));
    expect(OFFLINE_MAX_MS).toBe(12 * H);
    expect(r.awayMinutes).toBe(30 * 60);
    expect(r.huntMinutes).toBe(12 * 60);
    expect(r.stopped).toBe(true);
    expect(r.killsPerHour).toBe(4.3); // 51 abates em 12 h, 1 casa decimal
  });

  it("separa o custo das mortes do ganho líquido de kan e XP", () => {
    const deaths = [
      { by: "Grand Fisher", exp: 300, gold: 80, items: ["Poção"], protected: false, at: T0 + H },
      { by: "Arrancar", exp: 0, gold: 0, items: [], protected: true, at: T0 + H + 60_000 },
    ];
    const r = buildOfflineReport(base({ deaths }));
    expect(r.deathCount).toBe(2);
    expect(r.expLost).toBe(300);
    expect(r.goldLost).toBe(80);
    expect(r.deaths[0].by).toBe("Grand Fisher");
    expect(r.gold).toBe(700);
  });

  it("tolera tipo de monstro removido do catálogo e relógio atrasado", () => {
    const r = buildOfflineReport(base({ kinds: { monstro_sumido: 2 }, now: T0 - 5000 }));
    expect(r.topKills[0].name).toBe("monstro_sumido");
    expect(r.huntMinutes).toBe(0);
    expect(r.killsPerHour).toBe(0);
  });
});
