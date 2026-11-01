# PRD: Codex de lore no Livro (R-09)

| Metadado | Detalhe |
| :--- | :--- |
| **Feature** | Aba "Codex" no Livro, com fichas de personagens, facções, inimigos, lugares e eventos, liberadas pelo que o personagem já fez |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026; falta a aprovação das duas pessoas para "Aceito" |
| **Item do roadmap** | R-09 (fila do Rafael, `roadmap-duplas.md`) |
| **ADRs** | [ADR-001 catálogo e regras de desbloqueio](adrs/ADR-001-catalogo-e-desbloqueio.md) · [ADR-002 protocolo e interface](adrs/ADR-002-protocolo-e-interface.md) |

---

## 1. Problema

Conferido no código da `main` em 01/11/2026:

- **O jogo tem quase nenhum texto de mundo dentro dele.**
  - `MonsterDef` (`shared/src/data.ts`) não tem descrição: as 27 espécies do bestiário mostram nome, retrato, abates, vida, XP e loot.
  - `CharDef` não tem biografia nem facção. A história de cada um dos 11 personagens está só em comentários de código ("Shikai → Bankai → ..."), que não chegam ao jogador.
  - Os 7 mapas não têm descrição (`TravelDest` tem só nome, nível e custo).
- **O texto que existe está espalhado e some.**
  - As 5 crônicas da Loja de Cristais (`kind: "lore"` em `shared/src/shop.ts`) só se leem na loja, depois de comprar.
  - As 15 linhas de lore dos eventos (`EVENT_LORE`, `shared/src/events.ts`) passam no chat e não ficam guardadas.
  - As 5 Crônicas Semanais (`shared/src/chronicles.ts`) ainda não aparecem em lugar nenhum: nenhum código do cliente ou do servidor usa `CHRONICLES` (o M1-04 e o M1-07 é que vão mostrá-las).
- **Facção não existe como dado.** Shinigami, Quincy, Fullbringer, Visored, Hollow, Menos, Arrancar e Wandenreich aparecem só em nomes e comentários.

## 2. Objetivos

1. Uma aba **Codex** no Livro, com fichas em cinco seções: Personagens, Facções, Inimigos, Lugares e Eventos.
2. Fichas **liberadas pelo que o personagem já fez**, quase tudo a partir do progresso que já é salvo (bestiário, maior nível, títulos), mais o registro dos mapas visitados.
3. Guardar num lugar só o texto que hoje some (lore dos eventos) e o que hoje fica preso na loja (crônicas compradas).
4. Contador de parágrafos liberados por seção, para dar motivo de explorar.

Fora do escopo:
- Arte nova (retratos, ilustrações). As fichas usam os retratos de sprite que já existem (`portraitCss`).
- Recompensa por completar seções. Fica como ponto aberto (§7).
- Busca de texto, favoritos, áudio.

## 3. Regras de produto

### 3.1. Seções e fichas
- **Personagens (11):** uma ficha por personagem jogável, com um parágrafo de apresentação e um parágrafo por estágio da evolução (5 estágios, `FORM_LEVELS = [1, 10, 30, 60, 100]`): 6 parágrafos.
- **Facções (8):** Gotei 13 (Shinigami), Quincy, Fullbringer, Visored, Hollows, Menos, Arrancar, Wandenreich. Cada ficha lista os personagens e inimigos daquela facção; membro ainda bloqueado aparece como "???". Um personagem pode estar em mais de uma facção, e às vezes só a partir de um estágio (o Ichigo conta para os Visored só depois da forma Visored). A tabela de membros fica no ADR-001 §2.2 e precisa do aceite das duas pessoas.
- **Inimigos (27):** uma ficha por espécie do bestiário (`BESTIARY_KINDS`), com dois parágrafos.
- **Lugares (7):** um por mapa (`MAP_IDS`: karakura, soul, hueco, lasnoches, dangai, falsa, wandenreich).
- **Eventos (12):** invasão de Hollows, chefe mundial (Menos Ancião), as 5 Crônicas Semanais e as 5 crônicas da Loja de Cristais.

### 3.2. O que libera cada ficha
Tudo calculado no servidor, a partir do progresso do personagem que está jogando:

| Seção | Fica visível | Parágrafos liberados |
| :--- | :--- | :--- |
| Personagens | sempre (os 11 aparecem na criação de personagem) | o personagem jogando: 1 + quantos `FORM_LEVELS` são ≤ `prog.peak` (maior nível já alcançado, que não volta com o renascimento); os outros: só a apresentação |
| Facções | quando pelo menos um membro conta para ela (tabela no ADR-001 §2.2) | 1º parágrafo: um membro conta; os outros: um membro com a ficha completa |
| Inimigos | estágio 1 do bestiário daquela espécie | 1 no estágio 1, 2 no estágio 3 (o 3º estágio de chefe pede 15 abates; o do Menos Ancião, 15 eventos) |
| Lugares | Karakura: sempre; os outros: o personagem já esteve no mapa | todos |
| Eventos | invasão: sempre; chefe mundial: 1 abate do Menos Ancião; Crônica Semanal: o título dela em `prog.titles` ou na carteira da conta; crônica da Loja: comprada pela conta | todos |

- Ficha bloqueada aparece como "???" com uma dica de como liberar ("Derrote 25 Hollows Sombrios", "Viaje até Las Noches").
- O texto das linhas de lore dos eventos (`EVENT_LORE`) entra na ficha do evento como "Relatos".
- Personagem recém-criado vê: os 11 personagens (apresentação, e 2 parágrafos do próprio), 3 facções (Gotei 13, Quincy e Fullbringer, abertas pela apresentação dos personagens jogáveis), Karakura e a invasão.

## 4. Requisitos funcionais

| ID | Requisito |
| :--- | :--- |
| RF-01 | Catálogo `shared/src/codex.ts`: `CODEX: Record<string, CodexEntry>` com id, seção, título, facções, parágrafos, dica e regra de desbloqueio (ADR-001) |
| RF-02 | Função pura `codexUnlocked(ctx)` que recebe o progresso e devolve, para cada ficha liberada, quantos parágrafos estão abertos |
| RF-03 | Registro dos mapas visitados em `prog.maps` (campo opcional), gravado na troca de mapa e na entrada no mundo |
| RF-04 | O servidor manda os liberados junto com a mensagem `book` (ADR-002); o texto vem do catálogo, que já está no cliente |
| RF-05 | Aba Codex no `#book` com as cinco seções, contador por seção, ficha aberta em leitura e dica de desbloqueio |
| RF-06 | Teste que garante uma ficha para cada personagem, espécie do bestiário, mapa, Crônica Semanal e crônica da Loja |

## 5. Requisitos não funcionais

- **Servidor autoritativo, sem handler novo.** O desbloqueio é calculado no servidor dentro do `book`, que já passa por `this.handle` (limite de mensagens). O cliente não escolhe o que está liberado.
- **Um campo opcional novo no save:** `prog.maps?: string[]`. Save antigo sem o campo carrega normalmente e começa com o mapa onde o personagem está. O resto usa o que já é salvo: `prog.bestiary`, `prog.peak`, `prog.titles` e a carteira da conta.
- **Texto no catálogo do `shared`.** O texto inteiro vai no bundle do cliente, como `MONSTERS` e as crônicas da loja já vão. Quem abrir o código-fonte lê as fichas bloqueadas; isso é aceito (é história do mundo, não vantagem de jogo), e o ADR-001 explica.
- **Tamanho da mensagem.** O `book` hoje vai inteiro a cada pedido e a cada 5 s com a aba Caçada aberta. O Codex soma no máximo 65 pares `id → parágrafos` (11 + 8 + 27 + 7 + 12). O PR mede o `book` antes e depois e registra no `baseline.md`.
- **Texto em pt-BR, fiel à obra**, no tom das crônicas que já existem (frases curtas, sem spoiler além do que o estágio libera). O texto é conteúdo novo e passa pela revisão da outra pessoa no PR.
- **Conteúdo novo pede ficha.** O PR do catálogo acrescenta o passo "ficha no Codex" na skill `adicionar-conteudo` (e no `verificar-catalogo.mts`, se couber), porque o teste do RF-06 passa a falhar sem ela.
- **Testes:** Vitest em `shared/test/codex.test.ts` para o catálogo (cobertura e ids únicos) e para `codexUnlocked` com progressos fixos; cenário `progress` estendido para conferir o Codex no `book`, o mapa visitado e o parágrafo que não some com o renascimento.

## 6. Ordem sugerida de entrega

Cada linha é um PR:

1. **Mapas visitados** (RF-03), com teste. É pequeno e começa a registrar antes de o Codex existir.
2. **Catálogo e regras** (RF-01, RF-02, RF-06) com o texto de Personagens e Inimigos, e o envio no `book` (RF-04).
3. **Aba Codex** no cliente (RF-05).
4. **Texto de Facções, Lugares e Eventos.**

## 7. Pontos em aberto

1. **Recompensa por seção completa?** Por exemplo, um título novo ao liberar todas as fichas de Inimigos. A proposta é não pôr na primeira entrega e decidir com o Waldir, porque mexe na economia de títulos e pediria registrar fichas lidas.
2. **Estágios dos outros personagens:** a proposta libera só a apresentação dos personagens que você não está jogando. Alternativa: usar o maior `peak` entre os personagens da conta, o que exige ler os outros saves.
3. **Crônicas Semanais dependem do M1-06** (Waldir), que é quem vai entregar o título da crônica. Hoje nenhum código põe esses títulos em `prog.titles`. Até o M1-06, essas 5 fichas ficam bloqueadas para todos; o resto do Codex não depende dele.
