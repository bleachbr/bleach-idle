# Bleach: Soul Survivor (Shinigami Bonk)

> Um jogo Survivor 3D no navegador inspirado na engenharia e estilo visual de **[PokéBonk](https://pokebonk.com)**, ambientado no universo do anime **Bleach**.

---

## 📌 Visão Geral do Projeto

O **Bleach: Soul Survivor** une a consagrada fórmula de ação roguelite (*bullet heaven / survivor*) ao universo de Bleach. O jogo roda diretamente no navegador utilizando **Three.js** com renderização 2.5D híbrida: personagens em **Pixel Art 8-direcional** com shaders customizados de contorno, flash e dissolução sobre um terreno 3D com malha de altura e props urbanos.

* **Stack Técnico:** WebGL 2.0 / Three.js, GLSL Custom Shaders, Web Audio API, Data-Oriented Design (SoA).
* **Compatibilidade:** Navegadores desktop (Chrome, Firefox, Safari, Edge) e mobile (controles touch com joystick virtual).

---

## Roadmap de entregas

O plano aberto está em **[`docs/ROADMAP.md`](docs/ROADMAP.md)**. [`ENTREGAS_ROADMAP.md`](ENTREGAS_ROADMAP.md) só aponta para lá. Estado de hoje: [`docs/STATUS.md`](docs/STATUS.md).

## Agentes

O contrato para Claude, Antigravity, Kiro e Grok é [`AGENTS.md`](AGENTS.md). Quem lê cada arquivo está em [`docs/governanca/harness.md`](docs/governanca/harness.md). Tamanho de função e de arquivo do JS, e o desacoplamento entre módulos, estão nesse contrato. O gate é `make size-check`.

## 🗺️ Visão que o roadmap detalha

O plano completo de desenvolvimento está em **[`docs/ROADMAP.md`](docs/ROADMAP.md)**:

* **Versão 1 (MVP - Foco Atual):**
  * O jogador inicia como um **Recruta Shinigami** em uma **Arena Fechada em Karakura Town**.
  * Sobrevivência contra ondas crescentes de Hollows (Fishbone D, Shrieker, Acidwire e Elites).
  * Coleta de Reishi e evolução de habilidades ativas (Asauchi, Byakurai, Shakkahō) e passivas a cada Level Up (3 cartas).
  * Confronto final contra o Chefe **Menos Grande (Gillian)**.
  * Vitória ao derrotar o Chefe com exibição da **Tela de Estatísticas Detalhadas** (tempo, dano, kills por monstro, skills escolhidas) e retorno ao menu.
* **Versão 2 (Expansões Futuras):**
  * Progressão para novos mapas (Soul Society, Hueco Mundo, Dangai).
  * Evolução de Shikai e Bankai.
  * Novos personagens jogáveis (Ichigo, Rukia, Ishida, Byakuya, Kenpachi).
  * Metaprogressão permanente na Loja do Urahara.

---

## 📖 Documentação Técnica na pasta `docs/`

Toda a engenharia reversa do PokéBonk e as diretrizes do projeto estão documentadas em **[`docs/direcionamento/`](docs/direcionamento/)**:

1. [**01 - Engenharia Reversa do PokéBonk**](docs/direcionamento/01-engenharia-reversa-pokebonk.md): Análise de câmera (FOV 70°, pitch 0.45 rad, distância 9), shaders de billboard (`uLean = 0.35`), contorno de cores e arquitetura SoA para 2.200 entidades.
2. [**02 - Extração e Espelhamento de Mapas**](docs/direcionamento/02-extracao-e-espelhamento-mapas.md): Como o PokéBonk constrói mapas e terrenos (`atlas.json`, `atlas.png`, `ground.png`, `cliff.png`) e a replicação para a Arena de Karakura.
3. [**03 - Pipeline de Sprites e Animações**](docs/direcionamento/03-pipeline-sprites-bleach.md): Estrutura 8-way, fontes clássicas de sprites (Bleach DS: The Blade of Fate / Dark Souls) e geração via IA/harnesses (Grok, Claude, Kiro).
4. [**04 - Arquitetura da Versão 1: Combate e Telas**](docs/direcionamento/04-arquitetura-v1-combate-e-telas.md): Regras de gameplay, habilidades da V1, mecânicas do chefe Menos Grande e layout da tela de fim de jogo.