// Estado de cada card do Passe de Temporada (#34). O card pronto vira botão e manda o mesmo
// seasonClaim do botão de cima: o servidor pega todos os prêmios liberados de uma vez.
export interface PassProgress { pts: number; perTier: number; tiers: number; claimed: number }
export interface TierCard {
  /** número do nível no card ("5+" no card dos níveis além do último) */
  label: string;
  cls: "got" | "ready" | "";
  /** clicar no card resgata */
  claimable: boolean;
  /** tooltip do card */
  hint: string;
}

const prizes = (n: number) => (n === 1 ? "o prêmio liberado" : `os ${n} prêmios liberados`);

export function passTierCards(st: PassProgress): TierCard[] {
  const tier = Math.floor(st.pts / st.perTier);
  const open = Math.max(0, tier - st.claimed);
  const claimHint = `Clique para pegar ${prizes(open)}`;
  const lockHint = (t: number) => `Libera no nível ${t} do passe: faltam ${t * st.perTier - st.pts} pontos`;
  const cards: TierCard[] = [];
  for (let t = 1; t <= st.tiers; t++) {
    if (t <= st.claimed) cards.push({ label: `${t}`, cls: "got", claimable: false, hint: `Prêmio do nível ${t} já pego` });
    else if (t <= tier) cards.push({ label: `${t}`, cls: "ready", claimable: true, hint: claimHint });
    else cards.push({ label: `${t}`, cls: "", claimable: false, hint: lockHint(t) });
  }
  const extra = tier > st.tiers && tier > st.claimed;
  cards.push({
    label: `${st.tiers}+`,
    cls: extra ? "ready" : "",
    claimable: extra,
    hint: extra ? claimHint : lockHint(Math.max(tier, st.tiers) + 1),
  });
  return cards;
}
