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
2. O arquivo [`src/characters.js`](../../src/characters.js) é atualizado automaticamente com o novo manifesto do personagem.
3. No jogo principal ([`src/main.js`](../../src/main.js)), o personagem aprovado passa a ser carregado como o jogador ativo, com texturas em alta resolução e nome/ícone no HUD!

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
