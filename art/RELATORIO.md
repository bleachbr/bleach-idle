# Relatório: teste de sprites com o Codex

Data: 27/10/2026 · Ferramenta: Codex CLI 0.160.1, `image_gen` interno · Pós-processamento: `process.py` (Python + Pillow)

## Mudança de escopo durante o teste
O handoff pedia chibi. No meio do teste, a direção mudou para **pixel art com proporções realistas** (cabeça com ~1/6 da altura, estilo Tibia ou Ultima Online). O sprite chibi de referência já tinha saído bom na 1ª tentativa; está guardado em `raw/_chibi_descartado/`. Todo o resto foi refeito em estilo realista.

## Tentativas e recusas
| Imagem | Tentativas | Recusa | Observação |
|---|---|---|---|
| Ichigo Shikai, frente (referência) | 1 | não | fiel; a espada parece "dividida" (cabo de um lado, lâmina do outro) |
| Ichigo Bankai | 1 | não | casaco com forro vermelho e katana preta ok; a guarda em manji virou uma cruz simples |
| Rukia | 1 | não | cabelo na altura do queixo, mecha entre os olhos, olhos violeta e espada branca: tudo certo |
| Hollow | 1 | não | máscara de osso, dentes e buraco no peito: excelente |
| Ichigo, andar 4x4 (4 direções × 4 frames) | 1 | não | identidade estável nas 16 células |

Nenhum prompt citou nomes de Bleach, só a aparência. Não houve nenhuma recusa.

## O que ficou fiel
- **Nos brutos em alta resolução, a fidelidade e a coerência são muito boas.** Usar a referência via `-i` funcionou: os 4 personagens seguem o mesmo traço, proporção, contorno e luz.
- **Folha de andar:** cabelo, faixa, gola e espada iguais nas 16 células; vista de costas e de perfil corretas; a espada troca de lado de forma coerente (está presa nas costas).
- **Depois do processamento:** todos os sprites têm 32x32 (Hollow 64x64), até 13 cores por personagem, contorno externo de 1 px `#1a1822` e paleta mestra de 32 cores compartilhada.

## O que ficou incoerente ou fraco
1. **O realista em 32x32 perde o rosto.** Com o corpo em ~30 px, a cabeça tem 5 a 6 px: o rosto vira 2 ou 3 pixels de pele. Em 32 px o personagem se reconhece pelo **cabelo + roupa + arma**, não pelo rosto. A versão em 48 px (`preview48.png`) lê bem melhor.
2. **O preto se funde ao contorno.** Kimono preto com contorno quase preto vira uma silhueta só. Rukia (toda de preto, cabelo preto) é a que mais sofre. Solução: clarear o preto do kimono para um cinza-azulado escuro na paleta mestra, ou usar um contorno colorido (seletivo).
3. **O passo é tímido.** A diferença entre os frames do andar é pequena; em 32 px, a perna mal se mexe. Um prompt pedindo "exaggerated stride" provavelmente resolve.
4. **A redução é automática, não é pixel art de verdade.** O gerador desenha "estilo pixel" em ~1000 px, não numa grade real de 32 px. O script faz média de área + quantização; o resultado é limpo, mas não tem o acabamento de um pixel artist (sem clusters escolhidos à mão, sem olhos de 1 px posicionados).
5. **Não usei nearest-neighbor puro na redução**, apesar de estar na especificação: a partir de 1000 px ele gera ruído. Usei média de área + limiar de alpha + quantização, o que também garante a ausência de anti-aliasing no resultado final.
6. **Os detalhes de arma se perdem:** a guarda em manji do Bankai não existe em 32 px.

## O fluxo é viável para ~20 personagens com 4 direções e animações?
**Para gerar: sim.** Cada folha leva ~1 min e saiu certa de primeira. Uma estimativa por personagem: referência + andar 4x4 + ataque (4 folhas 2x2) + golpe/transformação ≈ 6 a 8 imagens ≈ 10 a 15 min de geração, com algumas refeitas. Para 20 personagens, isso dá poucos dias de trabalho, não semanas.

**Para a qualidade final em 32x32 realista: só com ressalvas.** O gargalo não é a IA, é a resolução. Três caminhos, em ordem de recomendação:
1. **Sprites de personagem em 48x48 (ou 64x64) sobre tiles de 32x32**, como o Tibia faz com criaturas grandes: o sprite "transborda" o tile para cima. Mantém o estilo realista legível e o fluxo continua 100% automático. **Recomendo este.**
2. **32x32 com IA como base + retoque à mão** (um pixel artist corrigindo rosto, contorno e passo): fica ótimo, mas custa algo como US$ 5 a 15 por folha em vez de US$ 10 a 50 por personagem do zero.
3. **Voltar a um estilo de cabeça maior** (meio-termo entre chibi e realista): 32x32 fica legível sem retoque.

Ajustes para a próxima rodada: preto do kimono → `#2a2838`, passo exagerado no prompt, reforçar a guarda em manji.

## Arquivos
- `raw/`: imagens originais do Codex + `prompts.md` (prompts exatos e histórico).
- `sprites/`: PNGs finais 32x32 (Hollow 64x64), frames de andar `ichigo_shikai_<direção>_<0-3>.png` e `ichigo_shikai_walk_sheet.png`.
- `sprites48/`: a mesma coisa em 48x48, para comparar.
- `preview.png` (8x) e `preview48.png` (6x): todos os personagens sobre grama em tiles; à direita, as 4 direções paradas.
- `walk.gif`: andar nas 4 direções, lado a lado, 8x.
- `process.py`: o pós-processamento, que pode ser reexecutado (`python process.py`).

## Proposta de stack para o protótipo
- **Cliente:** Phaser 3 + TypeScript + Vite. Phaser já traz tilemap (lê mapas do **Tiled**, que é gratuito), câmera, input (teclado, clique e toque) e animação de spritesheet. PixiJS é só renderizador e exigiria montar tudo isso à mão.
- **Servidor:** Node + TypeScript com **Colyseus** (salas, sincronização de estado e reconexão prontos sobre WebSocket). É **autoritativo**: o cliente só manda intenções ("andar para X", "atacar alvo"), e o servidor simula combate, XP e loot num tick fixo (~10 Hz). Isso fecha a porta para a maioria das trapaças.
- **Hunt offline:** sai de graça desse desenho. O personagem é uma entidade do servidor; quando o socket cai, o Auto Helper continua rodando a mesma lógica de IA no tick. O cliente, ao reconectar, só recebe o estado.
- **Dados:** SQLite no protótipo, Postgres no beta (mesmo código via Prisma ou Drizzle).
- **Código compartilhado:** fórmulas de dano e XP e definições de itens e monstros num pacote `shared/` usado pelos dois lados.
