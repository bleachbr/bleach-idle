// Crônicas já lidas na Loja de Cristais (#38). O servidor não guarda leitura (o título vem da compra),
// então a marca fica neste navegador, em localStorage, como o bi.releaseSeen das novidades: vale para
// todas as contas do aparelho e some se o jogador limpar os dados do site. É só um aviso visual.
import { COSMETIC, own } from "../../shared/src";

export const LORE_READ_KEY = "bi.loreRead";

/** O que se usa do localStorage (o teste passa um objeto em memória). */
export type KV = Pick<Storage, "getItem" | "setItem">;

/** localStorage, ou null se o navegador bloquear o acesso (o próprio acesso pode lançar). */
export const browserStore = (): KV | null => { try { return localStorage; } catch { return null; } };

/** Só ids de crônica do catálogo: o valor guardado pode estar velho, corrompido ou editado à mão. */
const isLore = (id: unknown): id is string => own(COSMETIC, id)?.kind === "lore";

export function loadLoreRead(store: KV | null): Set<string> {
  try {
    const list: unknown = JSON.parse(store?.getItem(LORE_READ_KEY) ?? "[]");
    return new Set(Array.isArray(list) ? list.filter(isLore) : []);
  } catch {
    return new Set();
  }
}

/** Marca a crônica em `read` e tenta gravar; sem armazenamento, a marca vale só nesta sessão. */
export function markLoreRead(store: KV | null, id: string, read = loadLoreRead(store)): Set<string> {
  if (!isLore(id) || read.has(id)) return read;
  read.add(id);
  try { store?.setItem(LORE_READ_KEY, JSON.stringify([...read])); } catch { /* bloqueado ou cheio */ }
  return read;
}
