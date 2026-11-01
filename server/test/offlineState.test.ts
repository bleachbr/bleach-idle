import { describe, it, expect } from "vitest";
import { snapshotOffline, restoreOffline, type OfflineFields } from "../src/offlineState";

const fresh = (): OfflineFields => ({
  offlineSince: 0, expAtLeave: 0, goldAtLeave: 0, zanAtLeave: 0, reiAtLeave: 0,
  offKills: 0, offKinds: {}, offItems: {}, offlineDeaths: [],
});

describe("W-05: estado offline persistido", () => {
  it("ida e volta pelo save preserva Zanjutsu/Reiryoku de saída e abates por tipo", () => {
    const p = fresh();
    Object.assign(p, { offlineSince: 1000, expAtLeave: 50, goldAtLeave: 7, zanAtLeave: 12, reiAtLeave: 9, offKills: 3, offKinds: { adjuchas: 3 }, offItems: { onigiri: 2 } });

    const saved = JSON.parse(JSON.stringify(snapshotOffline(p)));
    const back = fresh();
    restoreOffline(back, saved);

    expect(back).toMatchObject({ zanAtLeave: 12, reiAtLeave: 9, offKills: 3, offKinds: { adjuchas: 3 }, offItems: { onigiri: 2 }, offlineSince: 1000 });
  });

  it("save antigo sem os campos novos carrega com padrões e usa o estado atual como saída", () => {
    const back = fresh();
    restoreOffline(back, { since: 5, expAtLeave: 1, goldAtLeave: 2 }, { zan: 20, rei: 8 });
    expect(back.zanAtLeave).toBe(20); // sem isso o relatório mostraria o nível inteiro como ganho
    expect(back.reiAtLeave).toBe(8);
    expect(back.offKinds).toEqual({});
  });
});
