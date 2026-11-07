# 07 - Diretrizes Oficiais de Normalização de Sprites e Testes de Validação 360°

Este documento estabelece as **diretrizes arquiteturais e regras matemáticas obrigatórias** para o pipeline de geração, corte e validação de sprites do projeto **Bleach: Soul Survivor**.

---

## 1. O Problema: Inconsistência de Escala em Folhas de Arte 2D

Ao processar folhas brutas de sprites (ex: RPG Maker, Tibia ou rips da comunidade em `arts/` e `arts/walk8/`), é frequente que diferentes direções do mesmo personagem tenham sido desenhadas em **escalas visuais discrepantes**:

- **Frente (`front` / `down`)**: Muitas vezes desenhada com armas erguidas, cabelo detalhado ou postura expandida (ex: 425 px de altura).
- **Lados (`side` / `side_l`)**: Desenhada em passada lateral com espada na horizontal (ex: 375 px de altura).
- **Costas (`back` / `up`)**: Desenhada em ângulo ligeiramente picado, sem espada visível ou com traço menor (ex: 323 px de altura, **24% menor que a frente**).

### Efeito Colateral se Não Normalizado
Se o processador aplicar um fator de escala global ingênuo baseado no quadro mais alto, ao girar a câmera em 360° em torno do personagem, ele **encolherá drasticamente ao ser visto de costas** e expandirá ao virar de frente, quebrando a imersão em 3D/2.5D.

---

## 2. As 5 Regras de Ouro da Normalização Uniforme 360°

```
+-------------------------------------------------------------------+
|                        QUADRO 128 x 128 px                        |
|                                                                   |
|   y = 10 px  --------> [ TOPO DA CABEÇA / CABELO ]                |
|                        |                         |                |
|                        |   ALTURA NORMALIZADA:   |                |
|                        |     104 ~ 107 px        |                |
|                        | (Variação < 5% em 360°) |                |
|                        |                         |                |
|   y = 117 px --------> [ SOLO UNIVERSAL / PÉS ]  <--- BASELINE    |
|   y = 128 px --------> Margem de segurança de 8%                  |
+-------------------------------------------------------------------+
```

### Regra 1: Ancoragem de Solo Universal (`target_baseline_y`)
- Todo quadro exportado tem os pés ancorados com precisão subpixel na mesma linha horizontal:
  $$\text{baseline\_y} = \text{int}(\text{target\_size} \times 0.92) = 117\text{ px (em quadros 128}\times128)$$
- **Tolerância máxima de trepidação (jitter):** $\le 1\text{ px}$ entre todos os quadros da caminhada.

### Regra 2: Normalização de Altura por Direção (`dir_scales`)
- A escala não é calculada globalmente para a folha inteira. Em vez disso, cada direção tem sua altura máxima real analisada:
  $$\text{dir\_scale} = \min\left(\frac{\text{target\_char\_height}}{\text{dir\_max\_h}}, \frac{\text{target\_size} \times 0.88}{\text{dir\_max\_w}}\right)$$
  onde $\text{target\_char\_height} = \text{int}(\text{target\_size} \times 0.84) = 107\text{ px}$.
- Isso garante que a altura física do corpo de costas seja **idêntica** à altura de frente e dos lados.

### Regra 3: Preservação de Aspect Ratio Individual
- Cada direção preserva seu aspect ratio natural ($w/h$). A silhueta de perfil pode ser mais larga devido à passada aberta das pernas (ex: 69 px de largura), enquanto a de costas tem a largura anatômica do tronco (ex: 53 px), mantendo o mesmo volume 3D.

### Regra 4: Limpeza em Duplo Passo de Chroma Key e Despill
- O fundo magenta `#FF00FF` é removido via distância Euclidiana em RGB ($\text{dist} < 120$).
- É aplicado algoritmo de **Despill** nas bordas semi-transparentes ($R > G + 30$ e $B > G + 30$), atenuando halos roxos nas silhuetas.

### Regra 5: Ciclo de Passada Completo (`walk8`)
- Folhas de 8 quadros (`walk8`) cobrem o ciclo mecânico completo:
  - **Quadros 0 e 4**: Contato do calcanhar com o solo.
  - **Quadros 1 e 5**: Carga e absorção do peso do corpo.
  - **Quadros 2 e 6**: Passagem da perna oposta pelo centro de gravidade.
  - **Quadros 3 e 7**: Elevação e alcance do próximo passo.
- Cadência recomendada no Three.js: **10 a 12 FPS**.

---

## 3. Protocolo de Validação Automatizada (Quality Gate)

Nenhum asset pode ser promovido de `geradores/staging/` para `src/assets/characters/` sem passar por dois níveis de testes automatizados:

### Nível 1: Testes Unitários de Sprites (`geradores/validate_sprites.py`)
Executa análise estática de pixels nas imagens geradas:
1. `test_height_uniformity`: Falha se a variação de altura entre qualquer direção for $> 8\%$.
2. `test_foot_baseline_jitter`: Falha se os pés variarem $> 2\text{ px}$ entre quadros da passada.
3. `test_chroma_despill`: Falha se pixels residuais com matiz magenta forem detectados.
4. `test_files_and_atlas`: Garante integridade do `atlas.png` e manifesto JSON.

Comando:
```bash
python3 geradores/validate_sprites.py --name ichigo_shikai
# ou para staging:
python3 geradores/validate_sprites.py --name ichigo_shikai_w8 --staging
```

### Nível 2: Testes Visuais E2E em Navegador (`scratch/test_sprite_consistency_e2e.py`)
Utiliza **Playwright** para renderizar o Estúdio 360° no WebGL real do Three.js:
1. Rotação orbital em 0° (Costas), 90° (Perfil Dir), 180° (Frente), 270° (Perfil Esq).
2. Medição direta da caixa delimitadora do billboard projetado no viewport.
3. Asserção matemática: $\frac{|H_{\text{costas}} - H_{\text{frente}}|}{\max(H_{\text{costas}}, H_{\text{frente}})} < 0.08$ (Diferença real obtida: **2.14%**).

---

## 4. Comandos Disponíveis no Makefile

```bash
# Validar qualidade e uniformidade do Ichigo Shikai
make validate-sprites

# Executar validação visual E2E com Playwright
make test-sprites-e2e
```
