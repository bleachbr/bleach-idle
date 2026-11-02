// Texto do ranking quando a aba está vazia (#37): diz como aquela aba pontua de verdade,
// conforme o filtro e a ordem de `buildRanking` (server/src/ranking.ts).
import { TRAVEL, DANGAI, PVP_MIN_LEVEL, GUILD_COST, GUILD_MIN_LEVEL, bestiaryStages, own } from "../../shared/src";

const GENERIC = "Ninguém aqui ainda.";
const dangaiLevel = TRAVEL.find((t) => t.id === "dangai")?.minLevel ?? 1;
const [s1, s2, s3] = bestiaryStages("");
const [b1, b2, b3] = bestiaryStages("grand_fisher");

const EMPTY: Record<string, string> = {
  // frags: só sobe ao derrotar jogador fora da Arena (o KO do duelo encerra antes de contar)
  abates: `Conta quem derrota outros jogadores em PvP no mundo aberto (a partir do nível ${PVP_MIN_LEVEL}). Duelo da Arena não conta. Ninguém pontuou ainda.`,
  guildas: `Guildas ordenadas pela soma dos abates em PvP dos membros (empate: soma dos níveis). Funde uma com /guilda criar Nome (${GUILD_COST} kan, nível ${GUILD_MIN_LEVEL}+) ou aceite um convite.`,
  conquistas: "Ordena por conquistas desbloqueadas. Veja as suas e o que falta no Livro, aba Conquistas.",
  bestiario: `Soma os estágios do bestiário: ${s1}, ${s2} e ${s3} abates de um mesmo monstro liberam um estágio cada (chefes: ${b1}, ${b2} e ${b3}). Acompanhe no Livro.`,
  dangai: `Recorde do andar mais fundo no Dangai. Vá pelo Viajar (a partir do nível ${dangaiLevel}) e limpe cada andar em até ${DANGAI.timeMs / 60_000} min.`,
};

export function rankingEmptyText(tab: string): string {
  return own(EMPTY, tab) ?? GENERIC;
}
