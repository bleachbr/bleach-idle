// Busca segura em tabelas de dados (CHARS, ITEMS, QUEST_BY_ID, COSMETIC...) com chave vinda do cliente.
// Essas tabelas são objetos comuns: TABELA["constructor"] e TABELA["__proto__"] existem e são "verdadeiros".
// Nunca indexe uma tabela direto com texto vindo da rede; passe por aqui.

/** Entrada da tabela só se a chave for texto e propriedade própria; senão, undefined. */
export function own<T>(table: Readonly<Record<string, T>>, key: unknown): T | undefined {
  return typeof key === "string" && Object.hasOwn(table, key) ? table[key] : undefined;
}

/** A chave é texto e propriedade própria do objeto (substitui `chave in objeto`, que enxerga o protótipo). */
export function isOwnKey(obj: object, key: unknown): key is string {
  return typeof key === "string" && Object.hasOwn(obj, key);
}
