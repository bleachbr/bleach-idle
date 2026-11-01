# ADR-001: Catálogo do Codex e regras de desbloqueio (R-09)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Codex de lore](../PRD-codex-lore.md) §3, RF-01 a RF-03, RF-06 |

---

## 1. Contexto

- O progresso de longo prazo fica em `Progress` (`shared/src/progress.ts`), salvo por personagem no JSON de `players.data`: `bestiary` (abates por espécie), `ach`, `titles`, `dgBest`, `peak` (maior nível já alcançado), `chronicle`, entre outros. Não há campo de lore lido nem de mapa visitado.
- O renascimento devolve o nível a `START_LEVEL` (8), mas `prog.peak` fica.
- As regras do bestiário são funções puras em `shared` (`bestiaryStage`, `bestiaryStages`), usadas pelo servidor e conferidas no cenário `progress`.
- **Mapas e espécies.** Os spawns vêm do Tiled. Várias espécies nascem em mais de um mapa: quatro das cinco espécies da Soul Society também nascem em Karakura, e a escada do Dangai usa espécies de Karakura, Hueco Mundo e Las Noches. O Dangai não tem spawn fixo.
- **Troca de mapa.** Viagem (pela janela ou pelo portal, a mesma mensagem `travel`), voltar à cidade, o Auto Helper indo caçar, o Dangai, a arena e o renascimento passam por `WorldRoom.teleport`. A morte põe o personagem de volta em Karakura direto (`p.map = HOME.id`), e Karakura já é sempre liberada. Na entrada no mundo (inclusive a volta da caçada offline), `fromSave` define `p.map`.
- **Títulos.** Hoje só `awardMilestone` grava em `prog.titles` (títulos de marco do servidor), e grava também na carteira da conta. Os títulos das Crônicas Semanais (`reward.titleId` em `CHRONICLES`) ainda não são entregues por nenhum código; isso é do M1-06. O título de uma crônica da Loja vem do próprio item, na carteira.
- `shared/src/data.ts` é zona de atrito (as duas pessoas mexem). `MonsterDef` e `CharDef` não têm campo de texto.

## 2. Decisão

### 2.1. Catálogo em módulo próprio
- `shared/src/codex.ts`, separado de `data.ts`, para não aumentar a zona de atrito e para o texto não pesar no tipo dos monstros.
- `CODEX: Record<string, CodexEntry>`, indexado pelo id (o cliente lê com `own(CODEX, id)`). Tipo da ficha:
  ```ts
  type CodexSection = "char" | "faction" | "enemy" | "place" | "event";
  interface CodexEntry {
    id: string;            // "char:ichigo", "enemy:hollow_menor", "place:soul", "event:invasion"
    section: CodexSection;
    title: string;
    sprite?: string;       // retrato (portraitCss) de uma folha que já existe
    factions?: string[];   // ids de ficha "faction:*" (personagem e inimigo)
    text: string[];        // parágrafos, na ordem em que são liberados
    hint: string;          // como liberar, mostrado enquanto bloqueada
    unlock: CodexRule;
  }
  ```
- `CodexRule` é uma união fechada, uma variante por regra da PRD §3.2:
  - `{ k: "always" }`
  - `{ k: "char", char }`: apresentação sempre; para o personagem jogando, parágrafos = 1 + quantos `FORM_LEVELS` são ≤ `peak`
  - `{ k: "bestiary", kind }`: 1 parágrafo no estágio 1, 2 no estágio 3
  - `{ k: "map", map }`: o mapa está em `maps`
  - `{ k: "title", titleId }`: o título está em `titles` ou em `owned`
  - `{ k: "owned", cosmeticId }`: a conta tem o cosmético
  - `{ k: "faction", faction }`: 1º parágrafo quando um membro conta (§2.2); os outros quando um membro está com a ficha completa
- As fichas de inimigo e de personagem são geradas a partir de tabelas de texto por id (`ENEMY_TEXT: Record<string, ...>`), cruzadas com `BESTIARY_KINDS()` e `CHARS`. O teste (RF-06) falha se faltar texto para uma espécie, personagem, mapa, Crônica Semanal ou crônica da Loja, então conteúdo novo não entra sem ficha.

### 2.2. Membros das facções
Um membro conta para a facção quando a ficha dele tem pelo menos o número de parágrafos da coluna "a partir de". Para personagem, o 1º parágrafo é a apresentação e o parágrafo k+2 é o estágio de `FORM_LEVELS[k]` (o 2º é a forma base, o 4º é a do nível 30, o 5º a do nível 60); para inimigo, 1 parágrafo é o estágio 1 do bestiário.

| Facção | Membros (a partir de quantos parágrafos) |
| :--- | :--- |
| Gotei 13 | Rukia, Renji, Hitsugaya, Byakuya, Kenpachi, Yoruichi, Ukitake e Shunsui (1); Ichigo, como Shinigami Substituto (1) |
| Quincy | Ishida (1) |
| Fullbringer | Sado (1), como em `data.ts`; o texto trata com cuidado, porque o poder dele na obra é discutido |
| Visored | Ichigo (4: forma Visored, nível 30) |
| Wandenreich | Soldado do Wandenreich, Sternritter, Sternritter em Vollständig, Yhwach (1); Ishida (5: forma Sternritter, nível 60) |
| Hollows | os 8 Hollows, Fishbone D, Grand Fisher, Metastacia (1) |
| Menos | Adjuchas, Menos Grande (Gillian), Vasto Lorde, Menos Ancião (1) |
| Arrancar | Arrancar, Arrancar Números, Exequias, Fracción, Fracción de Espada, Arrancar em Resurrección, Privaron Espada, Ayon (1) |

- Os 27 inimigos estão em exatamente uma facção; o teste confere.
- Com isso, a Visored só abre no nível 30 do Ichigo, e a Wandenreich não abre no começo pelo Ishida.

### 2.3. Mapas visitados
- `Progress.maps?: string[]`, sem repetição e só com ids de `MAP_IDS`.
- `teleport` acrescenta o mapa de destino; `fromSave` acrescenta o mapa onde o personagem entra (cobre o save antigo sem o campo). A arena usa o mapa do Dangai (`ARENA_SPAWN_P1/P2`), então um duelo libera o Dangai; não vaza nada, porque o nível mínimo da arena e o da viagem ao Dangai são os dois 20.
- Karakura é sempre liberada pela regra, então o campo nunca precisa começar preenchido.

### 2.4. Desbloqueio puro
- `codexUnlocked(ctx: CodexCtx): Record<string, number>` devolve, para cada ficha liberada, quantos parágrafos estão abertos (fichas bloqueadas ficam de fora).
- `CodexCtx` tem: `charId`, `peak`, `bestiary`, `maps`, `titles` e `owned` (carteira da conta; `[]` quando não há `accountId`, como em `sendShop`).
- Facção é calculada por último, com a tabela da §2.2.
- A função não lê relógio nem estado global; o teste passa progressos fixos.

### 2.5. Texto no bundle
- O texto inteiro vai para o cliente junto com o `shared`. O servidor manda só os ids liberados e a quantidade de parágrafos.
- Quem abrir o código-fonte do cliente lê as fichas bloqueadas. É o mesmo que já acontece com `MONSTERS` (nome de todo monstro está no bundle e aparece sobre ele no mapa) e com as crônicas da loja, e não dá vantagem de jogo. Mandar o texto pela rede só quando liberado esconderia a história, mas aumentaria o `book` em dezenas de KB e duplicaria o texto entre servidor e cliente.

## 3. Alternativas

- **Campo `lore` em `MonsterDef` e `CharDef`:** texto junto do dado, mas aumenta `data.ts` (zona de atrito) e mistura texto longo com números de balanceamento. Rejeitado.
- **Lugar liberado por abate de espécie que nasce no mapa:** dispensaria o campo novo, mas vaza: um Hollow Faminto morto em Karakura liberaria a Soul Society, um Fishbone liberaria Hueco Mundo, e o Dangai liberaria Hueco Mundo e Las Noches. Só com espécies exclusivas de cada mapa funcionaria, e a única exclusiva da Soul Society é a Metastacia, um chefe. Rejeitado.
- **Lugar liberado pelo nível mínimo da viagem** (`peak ≥ minLevel` em `TRAVEL`): sem campo novo e retroativo para quem já jogou, mas libera por poder viajar, não por ter estado lá (o Dangai e a Karakura Falsa abririam só pelo nível). Rejeitado; `prog.maps` custa um campo opcional e diz o que o personagem fez.
- **Estágio do personagem pelo nível atual:** quem renasce voltaria a ver só a apresentação. Rejeitado em favor de `peak`.
- **Guardar fichas lidas no save (`prog.codex`):** permitiria "ficha nova" e recompensa por leitura, mas cria um campo e um handler (`codexRead`) que a regra de desbloqueio não precisa. Rejeitado para a primeira entrega; volta se a recompensa por seção (PRD §7) for aceita.

## 4. Consequências

- **Positivas:** um campo opcional no save e nenhum handler novo; a regra fica testável sem servidor; conteúdo novo (monstro, personagem, mapa) quebra o teste até ganhar ficha.
- **Negativas:** quem já tem progresso vê as fichas de inimigo liberadas de uma vez na primeira abertura (não há "ficha nova"). Os lugares de quem já jogou só se liberam quando o personagem voltar a eles, porque o registro começa no deploy do RF-03. As 5 Crônicas Semanais esperam o M1-06.
- **Segurança:** o servidor calcula tudo a partir do próprio estado; o cliente só lê ids e números. Os ids vêm do catálogo fixo, e o cliente busca a ficha com `own(CODEX, id)`. `prog.maps` só recebe ids que o servidor já validou (o destino do `teleport`).
- **Testes:** cobertura do catálogo, ids únicos, toda ficha com `hint`, e `codexUnlocked` para:
  - personagem novo: os 11 personagens (2 parágrafos no próprio, 1 nos outros), Gotei 13, Quincy e Fullbringer (Visored e Wandenreich fechadas), Karakura e a invasão;
  - `peak` 60 com nível atual 8 (renascido): 5 parágrafos no próprio; Ishida com `peak` 60 abre a Wandenreich, Ichigo com `peak` 30 abre a Visored;
  - estágios do bestiário 1 e 3;
  - mapa visitado e não visitado;
  - título de crônica em `titles`, em `owned` e em nenhum dos dois;
  - crônica da Loja comprada;
  - facção de inimigo aberta por um membro, e o 2º parágrafo dela com um membro completo;
  - os 27 inimigos em exatamente uma facção.
