// Eventos narrados (R-12): a invasão de Hollows e o chefe mundial ganham uma linha de lore no chat
// e um banner no topo da tela. O servidor decide a fase e o fim; o cliente só mostra.
// Os avisos de sistema com números (vida, XP, minutos) continuam no WorldRoom; aqui fica só a história.

export type EventKind = "invasion" | "worldBoss";

export type EventPhase =
  | "invStart" | "invWon" | "invLost"
  | "bossWarn" | "bossSpawn" | "bossKilled" | "bossGone";

/** Mensagem `event` do servidor: banner da fase até `until` (hora do servidor, em ms). Um banner por tipo de evento.
 * `left` (ms que faltam, medido no envio) deixa o cliente contar pelo relógio dele, sem depender da sincronia de hora. */
export interface EventBanner {
  kind: EventKind;
  phase: EventPhase;
  until: number;
  left: number;
}

/** Quanto tempo o banner de desfecho (vitória, derrota, fuga) fica na tela. */
export const EVENT_END_MS = 8000;

/** Título e subtítulo do banner de cada fase; `clock` liga a contagem regressiva até `until`, com esse rótulo.
 * O chefe mundial é sempre o Menos Ancião (WORLD_BOSS.kind): se ele mudar, mude os textos daqui. */
export const EVENT_BANNER: Record<EventPhase, { kind: EventKind; title: string; text: string; clock?: string }> = {
  invStart: { kind: "invasion", title: "Invasão de Hollows", text: "Os Hollows cercam a praça de Karakura", clock: "termina em" },
  invWon: { kind: "invasion", title: "Invasão repelida", text: "A Garganta se fechou" },
  invLost: { kind: "invasion", title: "A invasão terminou", text: "Os Hollows voltaram para Hueco Mundo" },
  bossWarn: { kind: "worldBoss", title: "O céu de Karakura racha", text: "O chefe mundial está chegando", clock: "chega em" },
  bossSpawn: { kind: "worldBoss", title: "Chefe mundial", text: "O Menos Ancião está perto da praça de Karakura", clock: "vai embora em" },
  bossKilled: { kind: "worldBoss", title: "Menos Ancião derrotado", text: "Karakura respira de novo" },
  bossGone: { kind: "worldBoss", title: "O Menos Ancião foi embora", text: "Ele voltou para o deserto branco" },
};

/** Linhas de lore do chat. Frases curtas, sem números de jogo: os números ficam no aviso de sistema. */
export const EVENT_LORE: Record<EventPhase, string[]> = {
  invStart: [
    "Uma Garganta se rasga sobre a praça. O cheiro de fome chega antes dos Hollows.",
    "A borboleta do inferno traz o aviso da 13ª Divisão: a parede entre os mundos cedeu sobre Karakura.",
    "Na loja, o Kisuke baixa o chapéu: \"Vieram atrás das almas da praça. Cuidem delas por mim.\"",
  ],
  invWon: [
    "A Garganta se fecha com um estalo seco. As almas da praça podem seguir em paz.",
    "Os últimos Hollows se desfazem em reishi. Karakura volta a dormir sem saber de nada.",
  ],
  invLost: [
    "Os Hollows que sobraram recuam pela Garganta, ainda com fome. Eles vão voltar.",
    "A fenda no céu se fecha sozinha. Do outro lado, alguém conta quantos não voltaram.",
  ],
  bossWarn: [
    "O céu de Karakura racha como vidro. Algo antigo empurra a Garganta por dentro.",
    "Os Hollows pequenos fogem da praça. Eles sabem o que está vindo.",
  ],
  bossSpawn: [
    "O Menos Ancião atravessa a Garganta. Dizem que ele devorou mil Hollows e lembra o nome de cada um.",
    "Uma sombra cobre a praça inteira. O Menos Ancião olha para baixo como quem escolhe o jantar.",
  ],
  bossKilled: [
    "A máscara do Menos Ancião se parte. O reiatsu que ele roubou cai sobre a cidade como neve.",
    "O gigante desaba em pó branco. Por um instante, dá para ouvir as almas que ele tinha engolido.",
  ],
  bossGone: [
    "O Menos Ancião recua para o deserto branco, mais faminto do que chegou.",
    "A Garganta engole o gigante de volta. A fome dele fica no ar mais um pouco.",
  ],
};

/** A n-ésima linha de lore da fase, em rodízio (n vem de um contador do servidor). */
export function eventLore(phase: EventPhase, n: number): string {
  const lines = EVENT_LORE[phase];
  const i = Number.isInteger(n) ? ((n % lines.length) + lines.length) % lines.length : 0;
  return lines[i];
}
