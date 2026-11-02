// Atalhos de teclado do HUD em DOM. Os de combate e movimento (WASD, Tab, T, R, 1-9) ficam no
// GameScene.bindKeys; as teclas daqui não podem repetir as de lá.

/** I (inventário) e B (bolsa), como na maioria dos MMOs. */
export const INVENTORY_KEYS: readonly string[] = ["KeyI", "KeyB"];

type KeyLike = Pick<KeyboardEvent, "code" | "repeat" | "ctrlKey" | "metaKey" | "altKey">;

/** Tecla do inventário sem modificador: Ctrl+B, Cmd+I e afins continuam sendo do navegador. */
export const isInventoryKey = (e: KeyLike) =>
  INVENTORY_KEYS.includes(e.code) && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey;

/** Foco num campo de texto (chat, mercado, select do Auto Helper): a tecla é texto, não atalho. */
export const isTypingTarget = (t: { tagName?: string; isContentEditable?: boolean } | null) =>
  !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || !!t.isContentEditable);
