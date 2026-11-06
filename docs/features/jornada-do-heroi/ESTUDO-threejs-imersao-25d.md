# Estudo de Arquitetura: Three.js para Bleach Idle — Imersão 2.5D & Cinemáticas

- **Status:** Estudo Técnico & Especificação de Integração
- **Data:** 05/11/2026
- **Autor:** Waldir Junior & Antigravity (DeepMind)
- **Objetivo:** Avaliar a introdução do Three.js no cliente de Bleach Idle para animações cinematográficas, telas de entrada/lobby 3D e evolução do mundo para uma perspectiva 2.5D rica (estilo Pokémon Omega Ruby / Alpha Sapphire e HD-2D).

---

## 1. Por que Three.js no Bleach Idle?

Atualmente, o jogo roda em **Phaser 3** com canvas 2D. Embora funcional para pixel art estática, um canvas 2D impõe limites para:
1. **Perspectiva dinâmica e relevo:** Em Pokémon ORAS, as subidas de colina, pontes sobre rios e escadas têm profundidade real de câmera.
2. **Iluminação e Shaders de Reiatsu:** A pressão espiritual (Reiatsu) em Bleach é volumétrica (auras densas de chamas, relâmpagos e névoa espiritual), o que em 2D se resume a sprites ou partículas planas.
3. **Cinemáticas de Impacto:** O ápice de Bleach é o grito de *"Bankai!"* e a liberação da espada. Ter uma tela cinemática 3D sobreposta eleva o patamar emocional do jogador.

---

## 2. As Três Áreas de Aplicação com Three.js

### Área 1: Tela de Entrada e Seleção de Personagem 3D (Lobby Épico)
- **Conceito:**
  - Substitui a lista estática do `#lobby` por uma cena 3D interativa (ex: o portal Senkaimon com borboletas do inferno *Jigokuchō* voando, ou o topo da Colina do Sōkyoku).
  - O Recruta Shinigami aparece no centro em modelo 3D estilizado (cel-shaded / toon shader estilo anime).
  - O jogador pode girar o personagem 360°, alternar entre Masculino e Feminino, e ver a *Asauchi* na bainha.
  - Ao clicar em "Entrar no Mundo", o portão do Senkaimon se abre com partículas de luz e a câmera avança para dentro dele.

### Área 2: Cutscenes Cinemáticas de Bankai & Shikai (Overlay 3D)
- **Conceito:**
  - No gameplay diário, o jogador caça em modo idle. Mas quando atinge o rito de passagem ou usa a habilidade suprema:
  - Um canvas Three.js transparente sobrepõe o jogo por 1.5 a 2.0 segundos (sem travar a conexão do Colyseus).
  - A espada do jogador se materializa em close-up 3D com câmera orbital lenta, a frase de liberação (*"Kaishi"*) ecoa na tela com o Kanji original cortando o cenário, e uma explosão de partículas da cor elemental (ex: chamas para fogo, pétalas para Senbonzakura, gelo para Hyōrinmaru) preenche a tela antes de retornar ao combate.

### Área 3: O Mundo 2.5D (Estilo Pokémon ORAS / HD-2D)
- **Conceito:**
  - **Câmera:** `PerspectiveCamera` inclinada em ~60° com FOV baixo (30°-40°), eliminando distorção mas criando efeito real de diorama 2.5D.
  - **Chão e Relevo:** Malha 3D plana com elevações sutis (degraus, muros de pedra de Sekkiseki, margens de rios rebaixadas).
  - **Água Shader (Rio Onagawa em Karakura):** Água com leve distorção de reflexo e refração de luz.
  - **Personagens em Billboards:** Os sprites de pixel art e HD dos personagens e monstros são renderizados em planos 3D verticais que sempre encaram a câmera (*billboarding*). Isso mantém a arte de anime intacta enquanto ganha luz e sombra tridimensionais do cenário!

---

## 3. Arquitetura de Coexistência (Como integrar sem quebrar nada)

O Bleach Idle já possui um servidor autoritativo em Colyseus e 501 testes cobrindo lógica e gameplay. **O servidor não sabe nem se importa se o cliente desenha em 2D ou 3D**: ele só envia posições `(x, y)` em grade de 32px e eventos (`fx`, `chat`, `damage`).

### Estrutura de Camadas Proposta:

```text
+-------------------------------------------------------------+
| DOM UI (HTML/CSS: Chat, Inventário, Livro, Barra de Vida)   |
+-------------------------------------------------------------+
| THREE.JS OVERLAY (Cinemáticas de Bankai, Partículas, Títulos) |
+-------------------------------------------------------------+
| THREE.JS 2.5D RENDERER (Cenário ORAS + Billboards + Luzes)  |
|          [OU MODO CLÁSSICO PHASER 2D VIA BI.PREFS]          |
+-------------------------------------------------------------+
| COLYSEUS CLIENT & STATE (Posições X/Y, Mobs, Combate)       |
+-------------------------------------------------------------+
```

### Vantagens dessa Abordagem:
1. **Zero Risco de Regressão:** O jogador pode escolher nas Opções (`bi.prefs`) entre o modo Clássico 2D (baixo consumo de bateria) e o modo Imersivo 2.5D Three.js.
2. **Entrada Imediata:** Podemos começar usando Three.js primeiramente no **Lobby / Seleção de Personagem** e na **Cinemática de Bankai**, sem precisar refazer o renderizador de mapas inteiro de uma só vez.
3. **Compatibilidade com o ecossistema:** Vite compila Three.js perfeitamente com tree-shaking, mantendo o bundle leve.
