// Por que uma técnica não pode sair agora (#27). Decisão pura, na mesma ordem das travas do
// servidor (`trySkill` em WorldRoom.ts), para o chat dizer a causa certa em vez de
// "indisponível (recarga, reiatsu ou alcance)". O PvP (`cantAttack`) fica no servidor.

/** Auto Hunt guarda 30% do reiatsu máximo para a liberação. */
export const AUTO_REI_RESERVE = 0.3;

export interface SkillGateInput {
  now: number;
  /** falso quando atordoado (`canEntityAct`) */
  canAct: boolean;
  arenaCountdown: boolean;
  level: number;
  minLevel?: number;
  /** trava global entre técnicas */
  skillReadyAt: number;
  /** recarga desta técnica */
  techReadyAt: number;
  rei: number;
  maxRei: number;
  cost: number;
  auto: boolean;
  /** valor ou função: a função só roda se as travas baratas anteriores passarem */
  inPZ: boolean | (() => boolean);
  /** distância de Chebyshev até o alvo (valor ou função, como `inPZ`) */
  dist: number | (() => number);
  range: number;
}

export type SkillBlock =
  | { kind: "stunned" }
  | { kind: "countdown" }
  | { kind: "level"; min: number }
  | { kind: "cooldown"; ms: number }
  | { kind: "reiatsu"; need: number; have: number }
  | { kind: "pz" }
  | { kind: "reserve" }
  | { kind: "range"; dist: number; range: number };

/** `null` quando a técnica pode sair; senão, a primeira trava que a segura. */
export function skillBlock(s: SkillGateInput): SkillBlock | null {
  if (!s.canAct) return { kind: "stunned" };
  if (s.arenaCountdown) return { kind: "countdown" };
  if (s.level < (s.minLevel ?? 1)) return { kind: "level", min: s.minLevel ?? 1 };
  const readyAt = Math.max(s.skillReadyAt, s.techReadyAt);
  if (s.now < readyAt) return { kind: "cooldown", ms: readyAt - s.now };
  if (s.rei < s.cost) return { kind: "reiatsu", need: s.cost, have: s.rei };
  if (typeof s.inPZ === "function" ? s.inPZ() : s.inPZ) return { kind: "pz" };
  if (s.auto && s.rei - s.cost < s.maxRei * AUTO_REI_RESERVE) return { kind: "reserve" };
  const dist = typeof s.dist === "function" ? s.dist() : s.dist;
  if (dist > s.range) return { kind: "range", dist, range: s.range };
  return null;
}

export function skillBlockText(name: string, b: SkillBlock): string {
  switch (b.kind) {
    case "stunned": return `Atordoado: ${name} não sai agora.`;
    case "countdown": return "O duelo ainda não começou!";
    case "level": return `${name} se aprende no nível ${b.min}.`;
    case "cooldown": return `${name} em recarga (restam ${Math.ceil(b.ms / 1000)}s).`;
    case "reiatsu": return `Reiatsu insuficiente para ${name} (precisa ${b.need}, tem ${Math.floor(b.have)}).`;
    case "pz": return "Técnicas não funcionam em zona de proteção.";
    case "reserve": return `${name}: o Auto Hunt guarda reiatsu para a liberação.`;
    case "range": return `Alvo fora de alcance de ${name} (distância ${b.dist}, alcance ${b.range}).`;
  }
}
