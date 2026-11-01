// Motor declarativo de fases de chefes (W-04), reutilizável pelo Chefe Mundial e por Dungeons (M4-02).
import type { SkillStatusDef } from "./combatStatus";

export interface BossPhaseDef {
  phase: number;
  /** fração de HP em que a fase dispara (ex.: 0.70 = 70% da vida máxima) */
  hpPct: number;
  label: string;
  shout: string;
  /** multiplicador sobre o poder de ataque base do chefe */
  atkMult: number;
  /** multiplicador sobre a defesa base do chefe */
  defMult: number;
  /** multiplicador sobre o stepMs base do chefe (< 1 deixa mais rápido) */
  stepMult: number;
  /** pulso de controle de grupo aplicado aos jogadores próximos na mudança de fase */
  aoeStatus?: SkillStatusDef;
  aoeRadius?: number;
}

export const BOSS_PHASES: Record<string, BossPhaseDef[]> = {
  grand_fisher: [
    {
      phase: 1,
      hpPct: 0.5,
      label: "Isca Transmorfa",
      shout: "Grand Fisher revelou a Isca Transmorfa e entrou em frenesi!",
      atkMult: 1.25,
      defMult: 1.1,
      stepMult: 0.85,
      aoeStatus: { kind: "slow", durationMs: 2500, slowMult: 1.4 },
      aoeRadius: 3,
    },
  ],
  gillian: [
    {
      phase: 1,
      hpPct: 0.5,
      label: "Cero de Menos Grande",
      shout: "Menos Grande concentrou um Cero carmesim na máscara!",
      atkMult: 1.3,
      defMult: 1.15,
      stepMult: 0.9,
      aoeStatus: { kind: "slow", durationMs: 3000, slowMult: 1.5 },
      aoeRadius: 4,
    },
  ],
  privaron: [
    {
      phase: 1,
      hpPct: 0.5,
      label: "Resurrección Ancestral",
      shout: "Privaron Espada liberou sua Resurrección Ancestral!",
      atkMult: 1.35,
      defMult: 1.2,
      stepMult: 0.85,
      aoeStatus: { kind: "dot", durationMs: 3000, tickMs: 1000, dotRatio: 0.15 },
      aoeRadius: 3,
    },
  ],
  ayon: [
    {
      phase: 1,
      hpPct: 0.65,
      label: "El Ciervo Desperto",
      shout: "Ayon rugiu e expandiu a massa muscular (Fase 1: El Ciervo)!",
      atkMult: 1.25,
      defMult: 1.15,
      stepMult: 0.9,
    },
    {
      phase: 2,
      hpPct: 0.3,
      label: "Fúria Quimérica",
      shout: "Ayon entrou em Fúria Quimérica: o chão de Karakura Falsa treme!",
      atkMult: 1.5,
      defMult: 1.25,
      stepMult: 0.8,
      aoeStatus: { kind: "stun", durationMs: 1200 },
      aoeRadius: 3,
    },
  ],
  menos_anciao: [
    {
      phase: 1,
      hpPct: 0.65,
      label: "Reiatsu Abissal",
      shout: "Menos Ancião rasgou o Garganta com Reiatsu Abissal (Fase 1)!",
      atkMult: 1.25,
      defMult: 1.15,
      stepMult: 0.9,
      aoeStatus: { kind: "slow", durationMs: 3000, slowMult: 1.5 },
      aoeRadius: 5,
    },
    {
      phase: 2,
      hpPct: 0.3,
      label: "Colapso do Garganta",
      shout: "Menos Ancião iniciou o Colapso do Garganta (Fase Final)!",
      atkMult: 1.5,
      defMult: 1.3,
      stepMult: 0.8,
      aoeStatus: { kind: "stun", durationMs: 1500 },
      aoeRadius: 5,
    },
  ],
  yhwach: [
    {
      phase: 1,
      hpPct: 0.7,
      label: "Auswählen",
      shout: "Yhwach ergueu a mão para o céu: AUSWÄHLEN (Fase 1)!",
      atkMult: 1.3,
      defMult: 1.2,
      stepMult: 0.9,
      aoeStatus: { kind: "slow", durationMs: 3000, slowMult: 1.5 },
      aoeRadius: 4,
    },
    {
      phase: 2,
      hpPct: 0.35,
      label: "The Almighty",
      shout: "Yhwach abriu os olhos: O TODO-PODEROSO (The Almighty)!",
      atkMult: 1.6,
      defMult: 1.35,
      stepMult: 0.8,
      aoeStatus: { kind: "stun", durationMs: 1500 },
      aoeRadius: 5,
    },
  ],
};

export function evaluateBossPhase(
  kind: string,
  currentPhase: number,
  hp: number,
  maxHp: number,
): BossPhaseDef | null {
  if (hp <= 0 || maxHp <= 0) return null;
  const phases = BOSS_PHASES[kind];
  if (!phases || !phases.length) return null;
  const ratio = hp / maxHp;
  let reached: BossPhaseDef | null = null;
  for (const p of phases) {
    if (p.phase > currentPhase && ratio <= p.hpPct) {
      reached = p;
    }
  }
  return reached;
}
