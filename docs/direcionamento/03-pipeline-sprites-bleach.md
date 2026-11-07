# 03 - Pipeline de Sprites e Animações: Bleach Pixel Art 8-Way

Este documento explica como os sprites do PokéBonk são estruturados, como extrair os mesmos padrões e como gerar/obter os sprites de **Bleach** no mesmo estilo visual (pixel art com 8 direções e iluminação 3D).

---

## 1. Como o PokéBonk Organiza seus Sprites

O PokéBonk obtém seus spritesheets do formato **Pokémon Mystery Dungeon (PMD)**, hospedados em:
`https://pokebonk.com/assets/pmd/<id>.png`

### 1.1. Anatomia do Spritesheet
* Uma única imagem PNG por personagem contendo todos os quadros de animação:
  * **Linha 0 a 7:** Animação de `Walk` (Caminhada/Corrida) para as 8 direções (Sul, Sudoeste, Oeste, Noroeste, Norte, Nordeste, Leste, Sudeste).
  * **Linhas seguintes:** Animações de `Idle`, `Attack` (Golpe físico/Zanpakuto) e `Hurt` (Dano).
* **Dimensões:** Quadros padronizados (geralmente $48 \times 48$, $64 \times 64$ ou $96 \times 96$ pixels).
* **Ponto de Pivô:** O pé do personagem é alinhado no centro inferior do quadro.

### 1.2. Mapeamento de UV no InstancedMesh
O shader recebe os atributos de instância:
* `iUV` = `vec4(u_min, v_min, u_max, v_max)` correspondente ao frame atual da animação e à direção do personagem calculada pela câmera:
```javascript
// Cálculo do frame no spritesheet
const frameX = currentAnimFrame;
const frameY = currentDirectionRow; // 0 a 7
const u0 = (frameX * frameWidth) / sheetWidth;
const v0 = (frameY * frameHeight) / sheetHeight;
const u1 = u0 + frameWidth / sheetWidth;
const v1 = v0 + frameHeight / sheetHeight;
```

---

## 2. Estratégia de Obtenção de Sprites de Bleach

Para obter sprites de Bleach com a mesma qualidade e proporção do PokéBonk, temos duas abordagens complementares:

### Abordagem A: Fontes Oficiais de Jogos Clássicos (Bleach DS)
Os jogos de Nintendo DS da franquia Bleach possuem os melhores sprites 2D em pixel art já criados na indústria:
1. **Bleach: The Blade of Fate (DS - Desenvolvido pela lendária Treasure)**
2. **Bleach: Dark Souls (DS)**
3. **Jump Ultimate Stars (DS)**

* **Por que são perfeitos?**
  * Têm exatamente a resolução e contraste necessários para renderização com filtro *Nearest* em 3D.
  * Possuem todas as animações: corrida, ataques de Zanpakuto normais e especiais, reações de dano e poses de vitória/Bankai.
  * Personagens prontos disponíveis:
    * **Recruta / Shinigami Genérico:** Shinigamis de suporte da Gotei 13 com Shihakusho padrão.
    * **Hollows:** Fishbone D, Shrieker, Acidwire, Menos Grande (Gillian), Hollows menores.
    * **Protagonistas e Capitães:** Ichigo, Rukia, Renji, Byakuya, Kenpachi, Chad, Ishida.

* **Onde encontrar os sheets descompactados:**
  * [The Spriters Resource - Seção Bleach DS](https://www.spriters-resource.com/ds_dsi/bleachds/)
  * Repositórios de preservação de spritesheets da comunidade M.U.G.E.N. e DS Ripping.

---

### Abordagem B: Geração e Complementação via IAs (Harnesses: Grok, Claude, Kiro, PixelLab)

Quando for necessário criar inimigos ou variações inexistentes nos jogos clássicos (ex: variações de cores de Hollows elites, animações específicas de recruta com lança ou kido):

#### Prompt Padronizado para Geração de Spritesheet:
```
Pixel art sprite sheet of a Bleach anime Shinigami recruit in black shihakusho holding a katana, 
8-directional walking animation and idle animation, 32-bit color palette, sharp black outlines, 
transparent background, formatted on a clean grid, retro GBA/DS fighting game style, 48x48 pixel frames.
```

#### Ferramentas de Automação para Empacotamento:
* **TexturePacker / Free-Texture-Packer (CLI):** Junta todos os quadros PNG avulsos em um único atlas `.png` com o correspondente arquivo `.json` de coordenadas UV.
* **Aseprite (CLI):** Script de conversão em lote para redimensionamento e recorte de caixas delimitadoras (*trim*).

---

## 3. Especificação dos Sprites para a Versão 1

Na **Versão 1 (MVP)**, o jogo necessita dos seguintes spritesheets:

### 3.1. Jogador: Recruta Shinigami
* **Visual:** Jovem membro da 13ª Divisão, vestindo Shihakusho preto tradicional sem insígnias de oficial, portando uma Asauchi / Katana básica.
* **Animações Requeridas:**
  1. `idle` (4 quadros em loop)
  2. `walk` (8 direções, 6 a 8 quadros cada)
  3. `slash` (ataque de corte rápido para 4 direções principais)
  4. `kido_cast` (pose de canalização com uma das mãos estendidas)
  5. `hurt` (2 quadros de impacto)

### 3.2. Mobs Comuns: Hollows Básicos
1. **Fishbone D:** O clássico Hollow peixe-humanoide com máscara branca e ossos salientes (ataque corpo a corpo rápido, vida baixa).
2. **Shrieker:** Hollow com asas estilo gárgula que voa rápido e se aproxima em zigue-zague.
3. **Acidwire:** Hollow quadrúpede com rabo chicote que cospe ácido.

### 3.3. Inimigo Elite: Menos Menor / Adjuchas
* Monstro de porte médio com chifres longos, contorno dourado via shader e vida 5x maior que a dos mobs comuns.

### 3.4. Chefe da Versão 1: Menos Grande (Gillian)
* **Visual:** O colossal Hollow preto de túnica longa, nariz pontudo e máscara branca icônica de Bleach.
* **Escala no Mundo 3D:** $3.5\times$ maior que o jogador.
* **Efeitos de Shader:** Contorno vermelho carmesim (`outlineCode = 2.0`).
* **Habilidade Especial:** Disparo de **Cero** (telegrafia com feixe vermelho no chão antes da explosão de dano massivo).
