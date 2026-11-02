// Cadeia de multiplicadores de dano do jogador (#36). O WorldRoom.hit usa trainedDmgMult e a ficha do
// personagem mostra attackDmgMult, para os dois não divergirem. No servidor o dano final é
//   rollDamage(ataque, estágio × força da técnica × trainedDmgMult × bestiário, defesa do alvo)
// tanto no golpe corpo a corpo (força 1) quanto nas técnicas; o bestiário e a defesa dependem do alvo.
import { setBonuses, type EquipSlot } from "./items";
import { rebirthBonus } from "./progress";
import { reiMult, zanMult } from "./training";

export interface DamageSource {
  zanjutsu: number; reiryoku: number; rebirths: number;
  equip: Partial<Record<EquipSlot, string>>;
}

/** Perícia (Zanjutsu no golpe, Reiryoku na técnica) × renascimento × conjuntos. */
export const trainedDmgMult = (p: DamageSource, skill: boolean) =>
  (skill ? reiMult(p.reiryoku) : zanMult(p.zanjutsu)) * rebirthBonus(p.rebirths).dmg * setBonuses(p.equip).total.dmg;

/** Tudo o que não depende do alvo nem da técnica: estágio × trainedDmgMult. */
export const attackDmgMult = (formDmgMult: number, p: DamageSource, skill: boolean) => formDmgMult * trainedDmgMult(p, skill);
