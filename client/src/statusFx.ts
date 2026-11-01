// Visual dos efeitos de status (M2-06): o servidor decide quem está congelado, atordoado, lento ou
// sofrendo dano contínuo (statusFlags no estado, fx "status" e fx "dmg" com dot); aqui só se escolhe a
// cor do sprite, o ícone e o estilo do número. Sem Phaser, para poder testar.
import { STATUS_KINDS, type StatusKind } from "../../shared/src/combatStatus";

export { STATUS_KINDS };

/** tint: cor no sprite; icon: cor do ícone acima da barra de vida; text: cor do texto flutuante */
export const STATUS_LOOK: Record<StatusKind, { label: string; tint: number; icon: number; text: string }> = {
  freeze: { label: "Congelado", tint: 0x8fdcff, icon: 0x9fe8ff, text: "#bff4ff" },
  stun: { label: "Atordoado", tint: 0xfff08a, icon: 0xffe04a, text: "#ffe680" },
  slow: { label: "Lento", tint: 0xa8a0ff, icon: 0x8a7aff, text: "#c8bfff" },
  dot: { label: "Sangrando", tint: 0xff9a8a, icon: 0xff5a3a, text: "#ff8a5a" },
};

/** Lê `statusFlags` ("freeze,dot") só com os status conhecidos, sem repetir, na ordem de prioridade. */
export function parseStatusFlags(flags: unknown): StatusKind[] {
  if (typeof flags !== "string" || !flags) return [];
  const got = new Set(flags.split(","));
  return STATUS_KINDS.filter((k) => got.has(k));
}

/** Cor do sprite com status ativo, ou undefined (fica a cor normal do personagem ou do monstro). */
export function statusTint(kinds: readonly StatusKind[]): number | undefined {
  return kinds.length ? STATUS_LOOK[kinds[0]].tint : undefined;
}

/** Cor que o sprite deve ter agora: a do status, senão a da forma ou do monstro, senão nenhuma (0xffffff). */
export function desiredTint(kinds: readonly StatusKind[], baseTint: number | undefined): number {
  return statusTint(kinds) ?? baseTint ?? 0xffffff;
}

/** Número do dano contínuo (fx "dmg" com dot): menor e na cor do sangramento, sem o golpe de quem causou. */
export function dotHitStyle(fx: { dot?: boolean; v?: number }): { text: string; color: string } | undefined {
  if (!fx.dot || !fx.v) return undefined;
  return { text: String(fx.v), color: STATUS_LOOK.dot.text };
}
