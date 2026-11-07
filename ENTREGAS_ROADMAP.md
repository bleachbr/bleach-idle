# Roadmap e Principais Entregas: Bleach Soul Survivor (Estilo PokéBonk)

A fonte única do plano executável, com caixas, é [docs/ROADMAP.md](docs/ROADMAP.md). Este arquivo é a visão de produto: não tem caixa de tarefa e não recebe item novo. O estado de hoje está em [docs/STATUS.md](docs/STATUS.md).

Este documento define o plano mestre de entregas do projeto, dividindo o escopo entre a **Versão 1 (MVP Focado e Fechado)** e a **Versão 2 (Expansão e Metaprogressão)**.

---

## 🎯 VERSÃO 1 (Entregável Imediato - MVP)

O objetivo central da Versão 1 é entregar uma experiência jogável completa, polida e autocontida: **uma partida do início ao fim com vitória ao derrotar o Chefe**.

### 1. Personagem Inicial: O Recruta Shinigami / Ichigo Shikai
* O jogador inicia como um jovem Shinigami recruta ou Ichigo Kurosaki (Shikai aprovado).
* Equipado inicialmente com sua **Asauchi** (katana básica com corte semicircular frontal automático) e canalização espiritual.
* Movimentação responsiva via **WASD / Setas** no teclado relativo ao ângulo da câmera orbital 360°.
* **Mecânica de Pulo (Tecla Espaço):** Salto vertical com física gravitacional acelerada ($v_y = 8.5\text{ m/s}, g = 24.0\text{ m/s}^2$) e sombra dinâmica atenuada projetada no solo, permitindo esquivar do contato físico de Hollows no chão.

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

### 4. Sistema de Level Up Dinâmico em Tempo Real (Sem Pausa / Sobrescrita)
* Coleta de partículas de **Reishi** deixadas pelos monstros derrotados.
* **Sem Congelamento do Jogo (No Pause):** A evolução não trava a tela nem interrompe a ação. Um banner flutuante compacto surge no HUD com até 3 opções.
* **Atalhos Rápidos `[1]`, `[2]`, `[3]` ou Clique:** O jogador escolhe instantaneamente no teclado sem precisar tirar a mão dos controles.
* **Mecânica de Sobrescrita de Poderes:** A nova escolha ativa **sobrescreve o poder anterior** (perde os poderes e itens passados), mantendo a jogabilidade focada e dinâmica.
* **Opção de Pular (`[0] / [P]`):** O jogador pode pular a escolha para manter sua build atual intacta sem nenhuma alteração.

### 5. O Confronto com o Chefe: Menos Grande (Gillian)
* Aos 8 minutos de sobrevivência (ou após derrotar uma meta de Hollows), o céu se abre em uma fenda (*Garganta*) e surge o **Menos Grande**.
* Escala $3.5\times$ maior que o jogador, contorno carmesim e ataque característico de **Cero Vermelho** com telegrafia no chão.
* **Instância Individual no Multiplayer:** O Boss é gerado individualmente para cada jogador testar sua maestria e concluir sua partida.
* **Condição de Vitória:** Derrotar o Menos Grande finaliza imediatamente a rodada, purificando a arena.

### 6. Arquitetura Multiplayer V1 (Mapa Único & Disputa de Reishi)
* **Entrada no Mesmo Mapa:** Todos os jogadores iniciam na mesma arena de Karakura Town.
* **Hollows Globais e Compartilhados:** A horda de monstros é comum a todos os jogadores presentes.
* **Distribuição de Reishi por DPS Winner:** Cada Hollow rastreia o histórico de contribuição de dano de todos os jogadores (`damageContributions`). Ao morrer, a bolinha de Reishi gerada pertence e é atraída **exclusivamente para o jogador que causou mais dano** naquele Hollow.
* **Chefe Final Instanciado:** Cada jogador enfrenta seu próprio Menos Grande no clímax da partida.

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
