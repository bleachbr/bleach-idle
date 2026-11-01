# ADR-002: Protocolo e interface do Codex (R-09)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Codex de lore](../PRD-codex-lore.md) §3, RF-04, RF-05 |

---

## 1. Contexto

- O cliente pede o Livro com a mensagem `book` (botão `#book-btn`, e a cada 5 s enquanto a aba Caçada estiver aberta). O servidor responde com o objeto inteiro: `bestiary`, `hunt`, `ach`, `missions` e `daily` (`registerBookMessages` em `server/src/WorldRoom.ts`). O handler já usa `this.handle`.
- O `#book` (`client/index.html`) tem 4 abas: Bestiário, Conquistas, Diário e Caçada. `bindBook` (`client/src/main.ts`) guarda a última resposta inteira (`data = d`) e redesenha a aba aberta a partir dela; trocar de aba não pede nada ao servidor. Cada aba é montada com `innerHTML` e `escHtml`.
- O tamanho da mensagem `book` nunca foi medido.

## 2. Decisão

### 2.1. Mensagem
- O `book` ganha o campo `codex: Record<string, number>` (id da ficha → parágrafos liberados), calculado por `codexUnlocked`. A carteira da conta é lida uma vez por pedido, como em `sendShop`; sem `accountId`, `owned` é `[]`.
- O resto do `book` não muda: o pedido periódico da aba Caçada continua trazendo o objeto inteiro, o que hoje também mantém as outras abas atualizadas (trocar de aba não pede nada ao servidor). Cortar esse pedido é outra otimização, fora do R-09.

### 2.2. Interface
- Quinta aba **Codex** no `#book`. Dentro dela, uma linha de seções (Personagens, Facções, Inimigos, Lugares, Eventos), cada uma com "parágrafos liberados/total".
- Lista de fichas da seção: retrato (`portraitCss` de `sprite`, quando houver), título e um trecho do primeiro parágrafo. Bloqueada: "???", silhueta (a classe `unknown` que o bestiário já usa) e a `hint`.
- Ficha aberta: título, retrato, os parágrafos liberados, um aviso "mais N parágrafos ao..." quando faltar algum, e as facções (personagem e inimigo) ou os membros (facção) como links para as fichas.
- Ficha de evento mostra os "Relatos" (`EVENT_LORE` daquele evento).
- Todo texto entra por `escHtml` ou `textContent`. O cliente busca cada ficha com `own(CODEX, id)` a partir dos ids que o servidor mandou.
- A seção e a ficha abertas ficam na memória enquanto o Livro está aberto. Não vão para o `localStorage`.

## 3. Alternativas

- **Mensagem própria `codex`:** separaria o Codex do resto do Livro, mas exige handler novo (com a regra de mensagens de `seguranca-servidor`) e um botão a mais. O Livro já é a janela de progresso. Rejeitado.
- **Calcular o desbloqueio no cliente:** o cliente já tem os mapas (`parseMap`) e recebe `owned` e `titles` em `shopData`, e poderia calcular a partir do bestiário do `book`. Rejeitado pela autoridade do servidor: a regra fica num lugar só, e o que o jogador vê vem do estado salvo, não de dados que o cliente junta.

## 4. Consequências

- **Positivas:** nenhum handler novo e nenhuma mudança no formato das outras partes do `book`.
- **Negativas:** o Codex vai em todo `book`, inclusive no pedido de 5 s da aba Caçada (no máximo 65 pares, poucos KB). O PR mede o `book` antes e depois e registra no `baseline.md`.
- **Compatibilidade:** cliente antigo ignora o campo `codex`. Cliente novo com servidor antigo vê o Codex vazio até o deploy.
- **Testes:**
  - cenário `progress`: o `book` traz `codex` com os 11 personagens, Gotei 13, Quincy e Fullbringer, Karakura e a invasão; a espécie abatida aparece no estágio 1; o mapa visitado aparece depois de uma viagem;
  - `robust` já manda lixo para `book`, que continua ignorando o conteúdo da mensagem.
