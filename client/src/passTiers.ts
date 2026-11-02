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
  /** texto curto visível no card: o tooltip não aparece no toque, no teclado nem no leitor de tela */
  note: string;
  /** nome acessível do card (nível, estado e o que falta) */
  aria: string;
}

const prizes = (n: number) => (n === 1 ? "o prêmio liberado" : `os ${n} prêmios liberados`);

export function passTierCards(st: PassProgress): TierCard[] {
  const tier = Math.floor(st.pts / st.perTier);
  const open = Math.max(0, tier - st.claimed);
  const claimHint = `Clique para pegar ${prizes(open)}`;
  const missing = (t: number) => t * st.perTier - st.pts;
  const lockHint = (t: number) => `Libera no nível ${t} do passe: faltam ${missing(t)} pontos`;
  const ready = (label: string): TierCard =>
    ({ label, cls: "ready", claimable: true, hint: claimHint, note: "toque para pegar", aria: `Nível ${label}, pronto. ${claimHint}` });
  const locked = (label: string, t: number): TierCard =>
    ({ label, cls: "", claimable: false, hint: lockHint(t), note: `faltam ${missing(t)} pts`, aria: `Nível ${label}, bloqueado. ${lockHint(t)}` });
  const cards: TierCard[] = [];
  for (let t = 1; t <= st.tiers; t++) {
    if (t <= st.claimed) cards.push({ label: `${t}`, cls: "got", claimable: false, hint: `Prêmio do nível ${t} já pego`, note: "", aria: `Nível ${t}, já pego` });
    else if (t <= tier) cards.push(ready(`${t}`));
    else cards.push(locked(`${t}`, t));
  }
  // o card "N+" só acende se houver prêmio além do último nível ainda por pegar
  const extra = tier > st.tiers && tier > st.claimed;
  cards.push(extra ? ready(`${st.tiers}+`) : locked(`${st.tiers}+`, Math.max(tier, st.tiers) + 1));
  return cards;
}
