# Diretriz de Arte, Sprites e Cenários 2.5D (Padrão Anime & Pokémon ORAS)

- **Status:** Especificação Oficial de Direção de Arte
- **Data:** 05/11/2026
- **Autor:** Waldir Junior & Antigravity (DeepMind)
- **Benchmark Visual:** *Pokémon Omega Ruby / Alpha Sapphire (3DS)*, *Bleach: Dark Souls / Blade Battlers* e *Octopath Traveler (HD-2D)*.

---

## 1. Diagnóstico: Por que os sprites e mapas atuais parecem fracos?

Ao auditar os arquivos em `art/`, `client/public/assets/sprites/` e `art/RELATORIO.md`, identificamos 4 problemas estruturais:

1. **Redução Automática Destrutiva (Downscaling sem Clusterização):**
   - As imagens eram geradas em ~1024 px e reduzidas matematicamente para 32 px/48 px por média de área. Isso gera "ruído de pixel", manchas borradas e rostos que viram 2 pixels indecifráveis.
2. **O "Preto no Preto" (Falta de Contorno Seletivo):**
   - Em Bleach, a maioria dos Shinigamis veste *Shihakushō* preto e muitos têm cabelo escuro (Rukia, Byakuya, Shunsui). Com contornos pretos (`#000000` ou `#1a1822`), o personagem vira uma silhueta escura amorfa sem leitura de braços, pernas ou bainha.
3. **Animação Tímida / Rígida (Falta de Secondary Motion):**
   - Os spritesheets atuais possuem passos rígidos onde só os pés se movem ligeiramente. Falta balanço de quadril, inclinação de torso, e principalmente **movimento secundário** (*secondary motion*): o balanço do tecido da manga, da faixa branca (*Obi*), do *Haori* e do cabelo.
4. **Cenários com Mistura de Linguagens:**
   - Havia assets medievais com pedras rústicas misturados a asfalto japonês moderno e texturas com vazamento de cor magenta/roxa nos recortes de transparência.

---

## 2. A Nova Bíblia Visual

### 2.1. Escala e Proporção Canônica (Proporção 2.5D - 48x48 px e 64x64 px)
* **Tiles do Mundo:** Células base de **32x32 px**.
* **Personagens Humanos / Shinigamis:** Sprites de **48x48 px** (altura de ~38-42 px úteis).
  - O personagem "transborda" o tile para cima (ocupando 1 tile de largura por ~1.3 tile de altura), exatamente como os treinadores em Pokémon ORAS e Tibia moderno. Isso garante espaço para:
    - Rosto com olhos expressivos e cabelo volumoso.
    - Decote branco do *Shitagi* contrastando com o *Shihakushō*.
    - Bainha e empunhadura da *Zanpakutō* visíveis na cintura.
* **Monstros Médios & Tenentes:** Sprites de **64x64 px**.
* **Menos Grande (Gillian) & Chefes:** Sprites de **96x96 px** ou **128x128 px** com presença imponente na tela.

---

### 2.2. Paleta & Contorno Seletivo (Adeus ao "Preto no Preto")
Para dar vida e profundidade aos trajes pretos de Shinigami:
* **Preto do Shihakushō:** Nunca usar `#000000`. Usar degradê tonal de **Cinza-Azulado Profundo**:
  - Sombra: `#1a182a`
  - Base: `#2d2b42`
  - Iluminação superior: `#484468`
* **Faixas e Detalhes Brancos (*Obi* e *Shitagi*):**
  - Base: `#e8eaf2` com sombras lavanda/azuladas (`#a6a9c7`).
* **Contorno Seletivo (Color-Bleed Outlines):**
  - O contorno não é preto puro. A linha externa que delimita o braço contra o tronco usa um tom mais escuro da própria cor vizinha, permitindo distinguir os membros com clareza mesmo em 48 px.

---

### 2.3. Ciclo de Animação Fluida (8 Frames de Caminhada)

Em vez de 4 frames travados, cada direção (Baixo, Esquerda, Direita, Cima) segue o ciclo canônico de 8 quadros com dinamismo:

```text
Frame 0: Pouso Pé Esquerdo (Contato) - Torso ligeiramente abaixado (-1 px)
Frame 1: Passagem Neutra - Cabelo e mangas começam a subir
Frame 2: Extensão Pé Direito - Braço oposto avança, bainha balança
Frame 3: Pouso Pé Direito (Contato) - Torso ligeiramente abaixado (-1 px)
Frame 4: Passagem Neutra - Cabelo e mangas descem
Frame 5: Extensão Pé Esquerdo - Braço oposto avança
Frame 6-7: Ciclo de amortecimento e balanço do Haori
```

* **Regra de Ouro:** A bainha da espada e a ponta do cachecol/faixa **sempre têm 1 frame de atraso** (*drag / follow-through*) em relação ao passo do corpo. Isso dá a sensação imediata de peso e fluidez de anime.

---

## 3. Direção dos Cenários 2.5D (Karakura, Rukongai, Hueco Mundo)

Para atingir o visual coeso de Pokémon Omega Ruby:

1. **Camada 1: Chão Contínuo Orgânico (`ground`)**
   - Asfalto com marcações de faixa de pedestres, sarjetas de concreto cinza claro e grama com folhas estilizadas.
   - Rios com 3 zonas de cor: margem rasa esmeralda translúcida, leito central azul profundo e linha de espuma branca suave nos contornos das pedras.
2. **Camada 2: Relevos e Desníveis 2.5D (`cliffs & stairs`)**
   - Muros de contenção com textura de pedras empilhadas ou concreto japonês.
   - Escadarias com chanfro lateral e sombra projetada à direita (ângulo fixo de luz solar a 45° norte-noroeste).
3. **Camada 3: Props com Y-Sorting e Iluminação Natural (`props`)**
   - **Casas:** Arquitetura consistente (residências de subúrbio em Karakura; casas de madeira com telhado de telha japonesa em Rukongai).
   - **Vegetação:** Árvores com copas volumétricas em camadas de sombra (Zelkova e Cerejeiras em flor).
   - **Baús de Tesouro:** Design temático por bioma (baú de madeira com reforço de ferro em Karakura, baú lacrado com talismã Kido em Rukongai, urna de quartzo em Hueco Mundo).
