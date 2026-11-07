# Roadmap e Principais Entregas: Bleach Soul Survivor (Estilo PokéBonk)

Este documento define o plano mestre de entregas do projeto, dividindo o escopo entre a **Versão 1 (MVP Focado e Fechado)** e a **Versão 2 (Expansão e Metaprogressão)**.

---

## 🎯 VERSÃO 1 (Entregável Imediato - MVP)

O objetivo central da Versão 1 é entregar uma experiência jogável completa, polida e autocontida: **uma partida do início ao fim com vitória ao derrotar o Chefe**.

### 1. Personagem Inicial: O Recruta Shinigami
* O jogador inicia como um jovem Shinigami recruta da 13ª Divisão de Guarda da Corte.
* Equipado inicialmente com sua **Asauchi** (katana básica com corte semicircular frontal automático).
* Movimentação responsiva via **WASD / Setas** no teclado ou **Joystick Virtual** no mobile.

### 2. Cenário: Arena Fechada de Karakura Town
* Mapa fechado em formato de arena circular ($170\text{ m}$ de diâmetro), espelhado na arquitetura de terreno do PokéBonk:
  * Malha de altura 3D com texturas urbanas de asfalto (`ground.png`), muros/barricadas (`cliff.png`) e calçadão (`path.png`).
  * Props urbanos em atlas 2D billboard (postes de luz japoneses, máquinas de venda automática, cercas, crateras de destruição).
  * Limites físicos intransponíveis (barreira espiritual com fitas da Soul Society).

### 3. Invasão de Hollows e Hordas
* Sistema de horda de alta performance baseado em **Structure of Arrays (SoA)** capaz de processar centenas de entidades na tela simultaneamente.
* **Tipos de Monstros da V1:**
  1. **Fishbone D:** Hollow comum corpo a corpo, avança em bando.
  2. **Shrieker:** Hollow voador de aproximação rápida em zigue-zague.
  3. **Acidwire:** Hollow quadrúpede com projéteis ácidos de médio alcance.
  4. **Hollows Elites:** Versões maiores com contorno dourado via shader e mais vida.

### 4. Sistema de Level Up e Habilidades (3 Escolhas)
* Coleta de partículas de **Reishi** deixadas pelos monstros derrotados.
* A cada novo nível, pausa do jogo e exibição do modal com **3 cartas aleatórias**:
  * *Habilidades Ativas:* Corte de Asauchi, Hadō #4 Byakurai (raio elétrico perfurante), Hadō #31 Shakkahō (esfera de fogo explosiva), Bakudō #9 Geki (paralisia em área).
  * *Passivas:* Treinamento de Shunpo (velocidade), Densidade de Reiatsu (dano), Controle Espiritual (ímã de Reishi), Shihakusho Reforçado (defesa).

### 5. O Confronto com o Chefe: Menos Grande (Gillian)
* Aos 8 minutos de sobrevivência (ou após derrotar uma meta de Hollows), o céu se abre em uma fenda (*Garganta*) e surge o **Menos Grande**.
* Escala $3.5\times$ maior que o jogador, contorno carmesim e ataque característico de **Cero Vermelho** com telegrafia no chão.
* **Condição de Vitória:** Derrotar o Menos Grande finaliza imediatamente a rodada, purificando a arena.

### 6. Tela de Conclusão / Estatísticas da Partida
Ao vencer (ou ser derrotado), o jogo exibe um painel completo com:
* Tempo de sobrevivência.
* Nível final alcançado.
* Dano total infligido e DPS médio.
* Lista de habilidades escolhidas e nível de cada uma com o dano individual causado.
* Censo detalhado de monstros abatidos por tipo (ex: 412 Fishbone D, 184 Shrieker, etc.).
* Quantidade de itens e Reishi coletados.
* **Botões de Ação:**
  * **"Reiniciar Missão":** Inicia uma nova partida imediatamente.
  * **"Voltar ao Menu":** Retorna à tela inicial.

---

## 🚀 VERSÃO 2 (Expansões Futuras)

A Versão 2 transformará o núcleo estável da V1 em um jogo completo com múltiplos mundos e metaprogressão:

1. **Novos Mapas e Biomas:**
   * **Soul Society (Seireitei):** Ruas de pedra branca, muros tradicionais e portão Senkaimon.
   * **Hueco Mundo:** Deserto infinito de areia branca quartzo, árvores petrificadas e ruínas de Las Noches.
   * **Dangai:** Espaço dimensional de alta pressão com o perigo ambiental do Koutotsu (o Limpador).
2. **Sistema de Evolução dos Personagens:**
   * Liberação de **Shikai** no nível 15 e **Bankai** no nível 35 com transformações visuais no sprite.
3. **Novos Protagonistas Jogáveis:**
   * Ichigo Kurosaki, Rukia Kuchiki, Uryu Ishida, Yasutora Sado (Chad), Renji Abarai, Byakuya Kuchiki e Kenpachi Zaraki.
4. **Metaprogressão e Loja da Loja do Urahara:**
   * Uso do Reishi acumulado entre partidas para comprar melhorias permanentes de atributos.
5. **Modos Adicionais:**
   * Modo Infinito (Endless Survival).
   * Modo Desafio / Boss Rush contra os Espadas.

---

## 📚 Documentação Técnica de Apoio

Toda a fundamentação técnica e a engenharia reversa do PokéBonk estão documentadas na pasta [`docs/direcionamento/`](docs/direcionamento/):
* [`docs/direcionamento/01-engenharia-reversa-pokebonk.md`](docs/direcionamento/01-engenharia-reversa-pokebonk.md): Câmera, Three.js, shaders GLSL e SoA de 2200 entidades.
* [`docs/direcionamento/02-extracao-e-espelhamento-mapas.md`](docs/direcionamento/02-extracao-e-espelhamento-mapas.md): Como espelhar os mapas de terreno e props do PokéBonk na Arena de Karakura.
* [`docs/direcionamento/03-pipeline-sprites-bleach.md`](docs/direcionamento/03-pipeline-sprites-bleach.md): Estrutura de sprites 8-way, fontes clássicas (Bleach DS) e geração via harnesses.
* [`docs/direcionamento/04-arquitetura-v1-combate-e-telas.md`](docs/direcionamento/04-arquitetura-v1-combate-e-telas.md): Regras de combate, design das habilidades e layout da tela de fim de jogo.
