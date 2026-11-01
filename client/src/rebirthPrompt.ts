// Texto da janela de renascimento (issue #35). Só explica: quem decide é o handler "rebirth" do
// WorldRoom.ts (nível mínimo, 6 s fora de combate e o limite de 250), com as mesmas regras de shared/.
import { START_LEVEL, rebirthBonus, rebirthLevel } from "../../shared/src";

/** limite de renascimentos aceito pelo servidor (WorldRoom.registerRebirthMessages) */
const REBIRTH_MAX = 250;

export interface RebirthPrompt {
  title: string;
  /** o servidor aceitaria pelo que o cliente sabe (o combate só o servidor confere) */
  ready: boolean;
  reset: string;
  keeps: string;
  bonus: string[];
  requirements: { text: string; ok: boolean }[];
  note: string;
  next: string;
}

const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;

export function rebirthPrompt(p: { level: number; rebirths: number }): RebirthPrompt {
  const need = rebirthLevel(p.rebirths);
  const now = rebirthBonus(p.rebirths), after = rebirthBonus(p.rebirths + 1);
  const levelOk = p.level >= need;
  return {
    title: `Renascer (${p.rebirths + 1}º)`,
    ready: levelOk && p.rebirths < REBIRTH_MAX,
    reset: `Você volta ao nível ${START_LEVEL} e vai para a praça de Karakura.`,
    keeps: "Você mantém itens, equipamento, kan, forja, bestiário, conquistas e habilidades.",
    bonus: [`XP: ${pct(now.exp)} → ${pct(after.exp)}`, `Dano: ${pct(now.dmg)} → ${pct(after.dmg)}`, `Vida: ${pct(now.hp)} → ${pct(after.hp)}`],
    requirements: [{ text: `Nível ${need} (você está no ${p.level})`, ok: levelOk }],
    // o cliente não sabe quando foi o último golpe: só avisa da regra (6 s no WorldRoom.ts)
    note: "Fique 6 segundos fora de combate antes de confirmar.",
    next: `O renascimento seguinte pede o nível ${rebirthLevel(p.rebirths + 1)}.`,
  };
}
