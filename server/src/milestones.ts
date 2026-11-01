// Marcos históricos do servidor (W-06): feitos únicos concedidos apenas ao primeiro jogador
// a alcançá-los, persistidos na tabela meta do SQLite com cache O(1) em memória.
import { SERVER_MILESTONES, titleText, type ServerMilestoneDef } from "../../shared/src";
import * as db from "./db";

export interface ServerMilestoneRecord {
  id: string;
  charId: string;
  name: string;
  charKind: string;
  at: number;
}

export interface ServerMilestoneView {
  id: string;
  name: string;
  desc: string;
  titleId: string;
  title: string;
  holder: string;
  charId: string;
  at: number;
}

const META_KEY = "server_milestones";
const BY_ID = new Map<string, ServerMilestoneDef>(SERVER_MILESTONES.map((m) => [m.id, m]));
const claimed = new Map<string, ServerMilestoneRecord>();
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  const saved = db.getMeta<Record<string, ServerMilestoneRecord>>(META_KEY) ?? {};
  for (const [id, rec] of Object.entries(saved)) {
    if (BY_ID.has(id) && rec && typeof rec.name === "string") {
      claimed.set(id, rec);
    }
  }
}

/** Registra o feito caso ninguém tenha conquistado ainda no servidor. Retorna a definição se inédito. */
export function claimServerMilestone(
  id: string,
  player: { id: string; name: string; charId: string },
  now = Date.now(),
): ServerMilestoneDef | null {
  ensureLoaded();
  const def = BY_ID.get(id);
  if (!def || claimed.has(id)) return null;
  const rec: ServerMilestoneRecord = {
    id,
    charId: player.id,
    name: player.name,
    charKind: player.charId,
    at: now,
  };
  claimed.set(id, rec);
  db.setMeta(META_KEY, Object.fromEntries(claimed));
  return def;
}

export function listServerMilestones(): ServerMilestoneView[] {
  ensureLoaded();
  return SERVER_MILESTONES.map((m) => {
    const rec = claimed.get(m.id);
    return {
      id: m.id,
      name: m.name,
      desc: m.desc,
      titleId: m.titleId,
      title: titleText(m.titleId),
      holder: rec?.name ?? "",
      charId: rec?.charKind ?? "",
      at: rec?.at ?? 0,
    };
  });
}

export function resetServerMilestonesCache(): void {
  claimed.clear();
  loaded = false;
}
