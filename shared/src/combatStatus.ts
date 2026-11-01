// Motor determinístico de status e controle de grupo por tick (M2-01..05).

export type StatusKind = "freeze" | "slow" | "dot" | "stun";

export interface SkillStatusDef {
  kind: StatusKind;
  durationMs: number;
  /** multiplicador de stepMs durante slow (ex.: 1.5 = +50% no tempo de cada passo) */
  slowMult?: number;
  /** fração do dano inicial causada por tick de DoT (ex.: 0.2 = 20% por segundo) */
  dotRatio?: number;
  /** intervalo entre ticks de DoT (padrão: 1000 ms) */
  tickMs?: number;
}

export interface ActiveStatus {
  kind: StatusKind;
  until: number;
  fromId: string;
  slowMult?: number;
  dotDmg?: number;
  nextTickAt?: number;
  tickMs?: number;
}

export type StatusMap = Partial<Record<StatusKind, ActiveStatus>>;

const STATUS_ORDER: StatusKind[] = ["freeze", "stun", "slow", "dot"];

export function applyStatus(
  statuses: StatusMap,
  def: SkillStatusDef,
  fromId: string,
  baseDmg: number,
  now: number,
): ActiveStatus {
  const prev = statuses[def.kind];
  const until = Math.max(prev?.until ?? 0, now + def.durationMs);
  const tickMs = def.tickMs ?? 1000;
  const dotDmg =
    def.kind === "dot"
      ? Math.max(prev?.dotDmg ?? 0, Math.max(1, Math.round(baseDmg * (def.dotRatio ?? 0.2))))
      : undefined;
  const slowMult = def.kind === "slow" ? Math.max(prev?.slowMult ?? 1, def.slowMult ?? 1.5) : undefined;
  const nextTickAt =
    def.kind === "dot" ? (prev && prev.until > now && prev.nextTickAt ? prev.nextTickAt : now + tickMs) : undefined;

  const entry: ActiveStatus = {
    kind: def.kind,
    until,
    fromId,
    slowMult,
    dotDmg,
    nextTickAt,
    tickMs: def.kind === "dot" ? tickMs : undefined,
  };
  statuses[def.kind] = entry;
  return entry;
}

export function tickStatuses(
  statuses: StatusMap,
  now: number,
): { dotDamage: number; dotFromId: string; expired: StatusKind[] } {
  let dotDamage = 0;
  let dotFromId = "";
  const expired: StatusKind[] = [];

  const dot = statuses.dot;
  if (dot && dot.dotDmg && dot.nextTickAt && dot.tickMs) {
    while (now >= dot.nextTickAt && dot.nextTickAt <= dot.until) {
      dotDamage += dot.dotDmg;
      dotFromId = dot.fromId;
      dot.nextTickAt += dot.tickMs;
    }
  }

  for (const kind of STATUS_ORDER) {
    const st = statuses[kind];
    if (st && now >= st.until) {
      delete statuses[kind];
      expired.push(kind);
    }
  }

  return { dotDamage, dotFromId, expired };
}

export function canEntityMove(statuses: StatusMap, now: number): boolean {
  const freeze = statuses.freeze;
  if (freeze && now < freeze.until) return false;
  const stun = statuses.stun;
  if (stun && now < stun.until) return false;
  return true;
}

export function canEntityAct(statuses: StatusMap, now: number): boolean {
  const stun = statuses.stun;
  if (stun && now < stun.until) return false;
  return true;
}

export function effectiveStepMs(baseStepMs: number, statuses: StatusMap, now: number): number {
  const slow = statuses.slow;
  if (slow && now < slow.until && slow.slowMult && slow.slowMult > 1) {
    return Math.round(baseStepMs * slow.slowMult);
  }
  return baseStepMs;
}

export function formatStatusFlags(statuses: StatusMap, now: number): string {
  const active: StatusKind[] = [];
  for (const kind of STATUS_ORDER) {
    const st = statuses[kind];
    if (st && now < st.until) active.push(kind);
  }
  return active.join(",");
}

export function clearStatuses(statuses: StatusMap): void {
  for (const kind of STATUS_ORDER) delete statuses[kind];
}
