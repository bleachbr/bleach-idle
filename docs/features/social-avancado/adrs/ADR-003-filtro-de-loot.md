# ADR-003: Filtro de loot do Auto Helper (M3-03)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Social avançado](../PRD-social-avancado.md) §3.3 |

---

## 1. Contexto

`giveLoot` (`server/src/WorldRoom.ts`) põe todo item no inventário com `addItem`. O que não coube vai para `overflow`; com `autoSell`, o loot puro (`isPureLoot`) do overflow vira kan, e o resto vai para uma sacola no chão. As preferências do Auto Helper chegam pela mensagem `auto` (cada campo validado por `typeof`) e ficam no save (`SaveData`, `fromSave`, `toSave`).

## 2. Decisão

- Campo novo no personagem e no save: `lootRules: Record<string, "sell" | "ignore">`. Item sem regra é "pegar". Padrão `{}` em `fromSave`, que também descarta chave fora de `ITEMS` (`own`) e valor fora da lista, então save antigo ou adulterado carrega igual. Não vai para o schema sincronizado (é preferência de um jogador só).
- Mensagem nova `lootRules { rules }` em `this.handle`:
  - aceita só chaves que existem em `ITEMS` (`own(ITEMS, chave)`) e valores `"take"`, `"sell"` ou `"ignore"` (`"take"` apaga a regra);
  - no máximo uma entrada por item do catálogo; objeto com mais chaves que `ITEMS` é recusado;
  - substitui a regra inteira (o cliente manda o mapa todo).
- Função pura `applyLootRules(items, rules)` em `shared/src/` devolve `{ take, sell, ignored }`. `giveLoot` chama antes do `addItem`:
  - `sell` vira kan pelo `ITEMS[id].sell` na hora;
  - `ignored` some (não vira sacola: o jogador pediu para não pegar);
  - `take` segue o caminho de hoje, inclusive o `autoSell` do overflow.
- Kan vendido pelo filtro entra no relatório da caçada (`p.hunt.gold`) como a Auto Venda. Os contadores de itens da caçada (`p.hunt.items` e o `offItems` do relatório offline) passam a contar **depois** do filtro: item ignorado ou vendido não aparece como obtido.
- **Itens de missão:** item pedido por uma missão de coleta ativa do personagem (`goal.type === "collect"`, hoje `fragmento`, `garra` e `tentaculo`) é sempre pego, mesmo com regra de vender ou ignorar. O atalho "Vender todo loot puro" avisa isso na tela. Sem essa regra, o atalho venderia o item e a missão nunca terminaria.
- Cliente: na janela do Auto Helper, lista dos itens já vistos (bestiário e inventário) com as três opções e os dois atalhos do PRD.

Não encontrei exploit de kan: todo `sell` do catálogo é menor que o `buy`, e vender a distância já existe na Auto Venda.

## 3. Consequências

- **Positivas:** a regra é por item e vale online e offline, porque `giveLoot` é o mesmo nos dois casos. A função pura tem teste com tabela de loot fixa.
- **Negativas:** `giveLoot` fica um pouco maior. A venda automática ainda não entra na auditoria (`giveLoot` não audita hoje); fica como pendência do W-08.
- **Testes:** `applyLootRules` (pegar, vender, ignorar, item sem regra, item de missão de coleta ativa), validação da mensagem e do `fromSave` com chave de protótipo e valor inválido, save antigo sem `lootRules`, relatório offline sem o item ignorado, cenário `lootfilter`.
