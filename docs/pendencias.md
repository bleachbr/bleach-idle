# Pendências

Dívida aberta. Item resolvido sai daqui e vira entrada em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md). O número não se reusa.

**Última atualização:** 2026-11-11

Registrar aqui é a saída, não o default. Antes, tente resolver na branch aberta. O motivo precisa conter uma destas frases: `fora do escopo`, `depende de terceiro`, `decisão de outra pessoa`, `falta evidência medida`.

## 3. Teste de jogo não é alvo

**Impacto:** médio (regressão de câmera, sprite e FX só aparece se alguém lembrar do script)

**Por que não resolvido aqui:** falta evidência medida — `scratch/` está no `.gitignore`, então não dá para promover aqueles scripts a gate sem ver o que eles exigem de browser e de asset local. O `make validate-sprites` cobre uma fatia (Ichigo, altura, baseline, despill) e não o loop.

Não abrir um segundo checklist para isto no roadmap: é a caixa correspondente da frente 3.

## 11. `updateEnemies` roda duas vezes por quadro em combate

`updateGame` chama `updateCombatLoop`, que chama `updateEnemies`, e depois chama `updateEnemies` de novo (`src/main.js`). Na prática os hollows andam com o dobro da velocidade configurada, e o balanceamento de hoje foi feito em cima disso. O ataque e a morte dos hollows novos rodam num laço à parte (`updateHollowAttacks`) para não tocar os clipes em velocidade dupla.

**Impacto:** médio (toda velocidade de hollow em `src/hollowTypes.js` e no boss vale o dobro do número escrito)

**Por que não resolvido aqui:** decisão de outra pessoa — tirar a segunda chamada deixa a horda duas vezes mais lenta, e rebalancear velocidade e spawn é decisão de design, não desta entrega.

## 12. `scripts/test_endless_evolution.py` falha no Windows por codificação

O teste lê a saída do Node sem `encoding="utf-8"`, então no Windows `Capitão` chega como `CapitÃ£o` e `test_reiatsu_score_and_ranks` falha. Em Linux, como no CI, passa.

**Impacto:** baixo (só quem roda a suíte no Windows vê o vermelho)

**Por que não resolvido aqui:** fora do escopo — o teste é de reiatsu, e a correção é uma linha que merece commit próprio.

## 13. Horda e dano multiplayer ainda são locais por cliente

A presença (posição, nick, personagem) sincroniza pela sala `hueco-mundo-arena`, mas cada navegador continua spawando e matando a própria horda. O ranking de dano compartilhado no orquestrador existe, porém o combate autoritativo e o drop de Reishi por maior dano ainda não atravessam a rede.

**Impacto:** médio (dois jogadores se veem, mas não disputam o mesmo hollow)

**Por que não resolvido aqui:** fora do escopo — esta branch fecha a causa raiz de “não funciona no domínio / não se veem”; netcode de combate compartilhado é outra entrega.
