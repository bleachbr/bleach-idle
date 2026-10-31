---
name: adicionar-conteudo
description: Passo a passo para adicionar conteúdo ao Bleach Idle sem esquecer nenhum arquivo - personagem jogável, monstro, item ou equipamento, mapa e missão. Use quando for criar ou alterar qualquer um deles, ou ao revisar PR de conteúdo.
---

# Adicionar conteúdo

O conteúdo vive em `shared/` (dados), `client/` (arte e efeitos), `server/` (spawn e regras), `art/` (geração dos sprites) e nos mapas Tiled. Os dois últimos commits de conteúdo (Byakuya e Kenpachi; Karakura Falsa e Wandenreich) tocaram de 7 a 15 arquivos de código cada, além de mais de 100 imagens. Esquecer um deles gera erro só em tempo de execução.

Regra de ouro: **não renomeie ids existentes** (item, monstro, personagem, mapa). Os saves guardam esses ids, e `fromSave` só tem reserva para `charId` e `map`.

## Personagem jogável
1. Arte: arquivos em `art/raw/` (prompts em `art/raw/prompts.md`); entradas em `art/process.py` (`GAME_SPRITES`, `PLAYER_IDS`; `LOOSE` quando o estágio tem pedaços soltos, como pétalas); `art/hd.py` para a versão HD.
2. `shared/src/data.ts`: uma entrada em `SPRITES` para cada forma (`cols: 8` nos sprites de 8 quadros) e o personagem em `CHARS`, com 5 formas nos níveis de `FORM_LEVELS` (1, 10, 30, 60, 100) e as técnicas.
3. `client/src/GameScene.ts`: as tabelas por personagem `RELEASE`, `AURA`, `CHAR_TINT` e `SKILL_FX`.
4. `client/src/theme.css` (grade de seleção `#chars`), `server/scripts/evolucao.ts` (cenário) e a lista do README.

## Monstro
1. Arte e `SPRITES` em `data.ts` (`frame: 48` ou `96`; `cols: 8`).
2. `MONSTERS` em `data.ts` (não existe campo de nível: a dificuldade vem de vida, ataque e defesa).
3. `LOOT` em `shared/src/items.ts`: todo monstro que não é boneco precisa de tabela.
4. Spawn: objeto `spawn` na camada `logica` do mapa no Tiled, com as propriedades `monstro`, `raio` e `quantidade`.
5. Confira o ritmo de XP com `cd server && npx tsx scripts/balance.ts [personagem] [nível]`.

## Item ou equipamento
1. Ícone: as folhas de ícones 4x4 são juntadas por `art/process.py` (`ICON_SHEETS`, hoje 3 folhas). O campo `icon` é o índice na folha.
2. Entrada em `items` (`shared/src/items.ts`): `id`, `name`, `icon`, `sell`, `stack`, e para equipamento `slot`, `atk`, `def`, `hp`, `rei`, `minLevel`.
3. À venda: id em `SHOP` **e** campo `buy`. Conjunto com bônus: `SETS`.
4. Fonte do item: `LOOT` ou recompensa de missão.
5. Teste em `shared/test/items.test.ts` quando houver regra nova.

## Mapa
1. Id em `MAP_IDS` (`shared/src/map.ts`) e o `.tmj` em `client/public/maps/` (Tiled 1.10+, tileset embutido).
2. Camada `logica`: `pz`, `depot`, `loja`, `portal`, `chegada` (o nome é o id do destino), `spawn`, `arena`; `templo` só em Karakura.
3. Destino em `TRAVEL` (`shared/src/social.ts`), com `minLevel` e `cost`. Partículas do mapa em `AMBIENT` (`GameScene.ts`).
4. **Depois de editar no Tiled, nunca rode `art/maps/build_maps.py`**: ele sobrescreve os mapas. `build_endgame.py` lê as edições e pode rodar de novo.
5. `cd server && npx tsx scripts/mapcheck.ts`.

## Missão
Entrada em `QUESTS` (`shared/src/quests.ts`) com monstros e itens que já existem; `QUEST_BY_ID` é gerado sozinho.

## Antes do PR
```bash
npx tsx .claude/skills/adicionar-conteudo/scripts/verificar-catalogo.mts   # referências quebradas
npm run typecheck && npm test
cd server && npx tsx scripts/mapcheck.ts                                   # se mexeu em mapa
cd server && npx tsx scripts/test.ts <cenário>                             # o cenário do conteúdo
```
Atualize README (lista do que o jogo tem), `docs/roadmap.md` e, se aprendeu algo, `docs/aprendizados.md`.

O `verificar-catalogo.mts` separa ERRO (id, sprite ou item que não existe; falha o comando) de AVISO (conferir se é intencional). Em 31/10/2026 ele reporta 0 erros e 3 avisos: `menos_anciao` sem `LOOT` e sem spawn (chefe de evento) e `boneco` sem versão HD.
