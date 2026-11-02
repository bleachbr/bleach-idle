// Quando o foco está num lugar onde a tecla é do campo, e não do jogo (R-14, RF-08).
// Antes só o <input> bloqueava: o <select> do local de caça deixava passar setas, dígitos, T e R,
// e os controles deslizantes do Auto Helper (que também são <input>) seguravam WASD até perder o foco.

/** Tipos de <input> que não recebem texto: com eles focados, os atalhos continuam valendo. */
const NOT_TEXT = new Set(["range", "checkbox", "radio", "button", "submit", "reset"]);

/** O que se lê do alvo do evento (o teste passa um objeto simples, sem DOM). */
type FocusTarget = { tagName?: unknown; type?: unknown; isContentEditable?: unknown };

/** true se a tecla deve ficar com o campo: texto, lista (`select`), `textarea` ou `[contenteditable]`. */
export function keyBelongsToField(target: unknown): boolean {
  if (typeof target !== "object" || target === null) return false;
  const t = target as FocusTarget;
  if (t.isContentEditable === true) return true;
  const tag = typeof t.tagName === "string" ? t.tagName.toUpperCase() : "";
  if (tag === "SELECT" || tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  return !NOT_TEXT.has(typeof t.type === "string" ? t.type.toLowerCase() : "text");
}
