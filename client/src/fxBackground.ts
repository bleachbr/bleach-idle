// Com a aba oculta o navegador para de pedir quadros, mas o WebSocket segue entregando efeitos. Efeito visual só
// some ao fim de uma animação, que depende de quadro: criado nesse período, ele acumula até a volta.
// Aqui fica a decisão de quando não criar e o som, que continua. Sem Phaser, para poder testar.

/** Sem quadro por mais que isso, efeito novo só acumularia (também freia a criação se os quadros ficarem lentos). */
export const STALL_MS = 250;

export class FrameGate {
  private last: number;

  constructor(private readonly now: () => number, private readonly hidden: () => boolean) {
    this.last = now();
  }

  /** Chamar a cada quadro desenhado. */
  frame() {
    this.last = this.now();
  }

  /** Verdadeiro quando um efeito criado agora não teria quadro para animar e sumir. */
  stalled() {
    return this.hidden() || this.now() - this.last > STALL_MS;
  }
}

export type FxSoundName = "die" | "chime" | "event" | "hurt" | "hit" | "loot" | "heal" | "deny" | "level" | "bankai" | "skill";

/** Som de um efeito: só do que envolve você, o próprio personagem ou o seu alvo. */
export function fxSound(fx: { t: string; id?: string; v?: number; from?: string; dot?: boolean }, myId: string, targetId: string | undefined): FxSoundName | undefined {
  const mine = fx.id === myId;
  switch (fx.t) {
    case "die": return fx.id !== undefined && fx.id === targetId ? "die" : undefined;
    case "book": return "chime";
    case "event": return "event";
    case "dmg":
      // dano contínuo: sem som (tocaria a cada segundo enquanto durar)
      if (!fx.v || fx.dot) return undefined;
      return mine ? "hurt" : fx.id !== undefined && fx.id === targetId ? "hit" : undefined;
    case "loot":
    case "heal":
    case "deny":
    case "level":
      return mine ? fx.t : undefined;
    case "form": return mine && fx.v ? "bankai" : undefined;
    case "skill": return fx.from === myId ? "skill" : undefined;
    default: return undefined;
  }
}
