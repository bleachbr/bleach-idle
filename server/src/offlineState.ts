// Ida e volta do estado da caçada offline pelo save (W-05), num só lugar para os três pontos de uso
// (saída do jogador, retomada no boot do servidor e volta ao mundo).
import type { SaveData } from "./db";
import type { DeathReport } from "./schema";

export interface OfflineFields {
  offlineSince: number;
  expAtLeave: number;
  goldAtLeave: number;
  zanAtLeave: number;
  reiAtLeave: number;
  offKills: number;
  offKinds: Record<string, number>;
  offItems: Record<string, number>;
  offlineDeaths: DeathReport[];
}

type Saved = NonNullable<SaveData["offline"]>;

export function snapshotOffline(p: OfflineFields): Saved {
  return {
    since: p.offlineSince, expAtLeave: p.expAtLeave, goldAtLeave: p.goldAtLeave,
    zanAtLeave: p.zanAtLeave, reiAtLeave: p.reiAtLeave,
    deaths: p.offlineDeaths, kills: p.offKills, kinds: p.offKinds, items: p.offItems,
  };
}

/** `now` serve a saves antigos sem Zanjutsu/Reiryoku de saída: sem ele o relatório contaria o nível inteiro como ganho. */
export function restoreOffline(p: OfflineFields, saved: Partial<Saved> & { since: number; expAtLeave: number; goldAtLeave: number }, now?: { zan: number; rei: number }): void {
  p.offlineSince = saved.since;
  p.expAtLeave = saved.expAtLeave;
  p.goldAtLeave = saved.goldAtLeave;
  p.zanAtLeave = saved.zanAtLeave ?? now?.zan ?? 0;
  p.reiAtLeave = saved.reiAtLeave ?? now?.rei ?? 0;
  p.offlineDeaths = saved.deaths ?? [];
  p.offKills = saved.kills ?? 0;
  p.offKinds = saved.kinds ?? {};
  p.offItems = saved.items ?? {};
}
