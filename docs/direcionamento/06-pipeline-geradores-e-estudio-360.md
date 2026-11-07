# 06 - Pipeline de Geradores Internos e Estúdio 360° de Validação de Sprites

Este documento registra o funcionamento e o guia de uso das ferramentas internas criadas na pasta `geradores/`, projetadas para transformar imagens brutas de pixel art (com fundo magenta `#FF00FF`) em assets 2.5D otimizados, inspecioná-los em 360° com animação e instalá-los de forma oficial no jogo **Bleach: Soul Survivor**.

---

## 1. Arquitetura do Pipeline

```
[Artes Brutas em arts/] (ex: 06_ichigo_shikai_walk_v2.png)
       │
       ▼ (Passo 1: geradores/sprite_processor.py)
[Staging em geradores/staging/<id>/]
   ├── atlas.png
   ├── front.png, back.png, side.png, side_l.png
   ├── front_0..3.png, back_0..3.png (quadros de caminhada)
   └── manifest.json
       │
       ▼ (Passo 2: preview.html - Estúdio 360° no Navegador)
[Validação Visual em Tempo Real]
   ├── Rotação 360° da câmera orbital
   ├── Comparação A vs B (ex: Walk 4x4 vs Chibi)
   ├── Controle de Walk Cycle (FPS, play/pause, frames)
   └── Ajustes de escala e iluminação
       │
       ▼ (Passo 3: Clique em "Aprovar & Instalar no Jogo")
[Deploy Oficial nos Assets do Jogo]
   ├── src/assets/characters/<id>/
   └── src/characters.js (Registro de constantes PLAYABLE_CHARACTERS)
       │
       ▼
[Disponível no Jogo Oficial (src/main.js)]
```

---

## 1.1. Passo 0: Gerar as Folhas Brutas com o Codex (`geradores/gen_codex.py`)

As folhas brutas (fundo magenta) que faltam ao jogo saem do Codex CLI, pela ferramenta interna `image_gen`. Para cada asset, o script chama `codex exec -s workspace-write -C <raiz> -i <referências>`. A referência de estilo é sempre `src/assets/characters/ichigo_shikai/front.png`. Os Hollows e os efeitos também recebem a arte equivalente do Bleach Idle, que fica em `arts/ref/` e precisa ser copiada de `bleach-idle/art/raw/`. Os prompts exatos ficam em `geradores/prompts/<id>.txt`, e as imagens saem em `arts/codex/<id>_sheet.png`, fora do git. Os prompts descrevem os seres só pela aparência, sem citar nomes da obra.

```bash
python -I geradores/gen_codex.py            # gera tudo o que falta (pula o que já existe)
python -I geradores/gen_codex.py shrieker   # só um

# Hollows: folha 4x4 de caminhada
python -I -X utf8 geradores/sprite_processor.py -i arts/codex/fishbone_sheet.png -n fishbone -c monsters -t walk4x4
# Kidō: uma folha 4x4 com 4 animações, uma por linha
python -I -X utf8 geradores/sprite_processor.py -i arts/codex/fx_kido_sheet.png -n skill_byakurai -c fx -r 0 --fx-type skill
```

No Windows, use `-X utf8`: os `print` com emoji do processador quebram no console `cp1252`.

**Caminhada de 8 quadros (walk8, igual ao Ichigo).** A folha 4x4 tem só 4 quadros por direção, e dois deles são o mesmo neutro, então a passada fica dura. O comando `python -I geradores/gen_codex.py --walk8` pede ao Codex uma imagem 4x2 por direção (frente, esquerda e costas), com 8 poses diferentes num ciclo que fecha. A folha 4x4 do próprio monstro vai junto como referência de design. Depois o script monta `arts/codex/<id>_walk8_sheet.png` (8x4) e faz três correções:
- **Direita espelhada:** a direita é o espelho da esquerda.
- **Perfil desvirado:** o Codex às vezes vira o perfil numa linha da grade. Cada quadro é comparado com o 1º e com o espelho dele, e o que vier virado é desvirado (na rodada de 07/11 isso aconteceu com a 2ª linha do `shrieker`).
- **Ciclo girado:** o processador usa o 2º quadro como pose parada, e o validador mede a altura dela. O ciclo de cada direção é girado para que o quadro mais ereto fique em 2º; caso contrário, a pose parada pode cair no ponto mais baixo da passada e reprovar na uniformidade de altura. O loop não muda.

Montada a folha, o processamento é `sprite_processor.py -t walk8`.

Rodada de 07/11/2026 (Codex CLI 0.160.1): as 5 folhas saíram na 1ª tentativa, sem recusas e em cerca de 3 min no total, com os 5 jobs em paralelo. Foram os Hollows `fishbone`, `shrieker`, `acidwire` e `menos`, mais `fx_kido`. A `fx_kido` se divide em `skill_byakurai` (linha 0), `hit_byakurai` (1), `skill_shakkaho` (2) e `hit_shakkaho` (3). Depois vieram as 12 imagens de 8 quadros (4 Hollows x 3 direções), também na 1ª tentativa, e os 4 Hollows passaram a usar `walk8` a 10 fps. Os quatro passam no `validate_sprites.py`: altura 360° com variação de até 0,93%, jitter dos pés de 0 px e nenhum vazamento de magenta. Tudo está em `geradores/staging/`, aguardando aprovação no Estúdio 360°.

---

## 2. Passo 1: O Motor de Processamento (`geradores/sprite_processor.py`)

O script Python CLI processa qualquer folha de sprites ou imagem única:

### Principais Recursos:
1. **Chroma Key Despill:** Remove o fundo magenta (`#FF00FF`) com tolerância ajustável e reduz o sangramento de borda roxa/fringe.
2. **Fatiamento 4x4 (Walk Cycle):**
   * Linha 0: Frente (Down / caminhando em direção à câmera)
   * Linha 1: Perfil Esquerdo (Left)
   * Linha 2: Perfil Direito (Right)
   * Linha 3: Costas (Up / caminhando para o fundo)
   * 4 colunas: Passo esquerdo, Neutro, Passo direito, Neutro.
3. **Alinhamento de Baseline dos Pés:** Calcula o ponto de contato do chão para todos os quadros e alinha a base, eliminando trepidação (jitter) durante a animação.
4. **Modo Imagem Única (`single_front`):** Para referências estáticas como o Chibi, gera os lados espelhados e silhueta traseira para teste.

### Comandos de Exemplo:
```bash
# Processar folha de caminhada 4x4 do Ichigo Shikai
python3 geradores/sprite_processor.py \
  --input arts/06_ichigo_shikai_walk_v2.png \
  --name ichigo_shikai \
  --category characters

# Processar referência frontal Chibi
python3 geradores/sprite_processor.py \
  --input arts/_chibi_descartado/01_ichigo_shikai_front_ref.png \
  --name ichigo_chibi \
  --category characters \
  --type single_front
```

---

## 3. Passo 2: Estúdio 360° Interativo (`http://localhost:5173/preview.html`)

O Estúdio 360° roda diretamente no navegador e reproduz fielmente as condições do Three.js do jogo principal:

* **Inspeção Orbital:** Rotação livre via clique e arraste do mouse, slider de 0° a 360° ou botões rápidos (Costas 0°, Lado Direito 90°, Frente 180°, Lado Esquerdo 270°).
* **Modo Comparativo A vs B:** Ative a caixa *"Modo Comparativo Lado a Lado"* para colocar dois modelos no mesmo solo 3D e comparar suas proporções e leitura visual.
* **Diagnóstico em Tempo Real:** Mostra resolução do quadro, direção ativa do sprite (`front`, `back`, `side`, `side_l`), quadro de passo e status (STAGING ou INSTALADO).
* **Walk Cycle Studio:** Ajuste a velocidade da passada (2 a 16 FPS), congele quadros para inspecionar poses de ataque ou marcha.

---

## 4. Passo 3: Aprovação e Registro no Jogo (`src/characters.js`)

Ao clicar em **"✓ APROVAR & INSTALAR NO JOGO"** no estúdio:
1. A API `/api/staging/approve` (configurada no Vite) copia a pasta de staging para `src/assets/characters/<id>/`.
2. O arquivo [`src/characters.js`](file:///Users/wjunior/projetos/outros/cursos-online-treinamento/v4/bleachbr/src/characters.js) é atualizado automaticamente com o novo manifesto do personagem.
3. No jogo principal ([`src/main.js`](file:///Users/wjunior/projetos/outros/cursos-online-treinamento/v4/bleachbr/src/main.js)), o personagem aprovado passa a ser carregado como o jogador ativo, com texturas em alta resolução e nome/ícone no HUD!

---

## 5. Estrutura de Diretórios Oficial em `src/assets/`

```
src/assets/
├── characters/
│   └── ichigo_shikai/
│       ├── atlas.png
│       ├── front.png, back.png, side.png, side_l.png
│       ├── front_0..3.png, back_0..3.png, side_0..3.png, side_l_0..3.png
│       └── manifest.json
├── monsters/
│   ├── fishbone/
│   ├── shrieker/
│   ├── acidwire/
│   └── menos/
├── props/
└── fx/
```
