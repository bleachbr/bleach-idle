// O servidor tem uma sala só para todos os mapas: um fx de outro mapa chega aqui também.
// Por isso o efeito é filtrado antes de nascer: número, animação, flash e tremor saem direto na cena
// (fora do container da view), e as coordenadas dos mapas se sobrepõem.
export type FxEntity = { t: string; id?: string; from?: string };

/** O efeito é do mapa que o jogador está vendo? `mapOf` devolve o mapa da entidade, ou undefined se ela não está no estado. */
export function fxInCurrentMap(fx: FxEntity, myId: string, mapId: string, mapOf: (id: string) => string | undefined): boolean {
  // só esmaece o sprite, que está dentro do container: quem chega ao mapa ainda consta no anterior e precisa do esmaecer
  if (fx.t === "tp") return true;
  const id = fx.id ?? fx.from;
  // sem entidade é aviso global; o próprio jogador vale sempre, pois o estado troca de mapa um quadro antes da cena
  if (!id || id === myId) return true;
  const map = mapOf(id);
  return map === undefined || map === mapId;
}
