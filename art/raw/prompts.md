# Prompts usados

Todos via `codex exec` (Codex CLI 0.160.1), ferramenta interna `image_gen`. Os prompts 02 a 05 foram enviados com `-i raw/01_ichigo_shikai_front_ref.png` como referência de estilo. Nenhum prompt cita nomes de Bleach: os personagens são descritos só pela aparência.

**Recusas: nenhuma.** Cada imagem saiu na 1ª tentativa (~1 min e ~17 a 40 mil tokens do Codex por imagem).

Histórico: a 1ª rodada era chibi (`raw/_chibi_descartado/`, prompt em `work/_chibi_p01.txt`). Ela foi abandonada quando o estilo mudou para proporções realistas; as outras 4 imagens chibi foram interrompidas antes de terminar.

## p01_ichigo_shikai_ref

```text
A single pixel-art game sprite of a young swordsman with REALISTIC adult body proportions (NOT chibi, NOT super-deformed, NOT big-headed): the head is about one sixth of the total body height, long legs, broad shoulders, lean athletic build, like the character sprites of classic top-down MMORPGs (Tibia, Ultima Online) or late-90s Western top-down RPGs. Front-facing (walking toward the camera), seen from a 3/4 top-down camera angle. Full body, standing idle, centered, occupying the central 70% of the canvas height with empty margin around.
Character: spiky messy bright orange hair, stern face, brown eyes. Black samurai-style kimono (shihakusho) with a white inner collar visible at the chest, white sash tied at the waist, wide black hakama trousers, white tabi socks and straw sandals. Strapped diagonally on his back, a huge cleaver-shaped sword: wide flat silver blade with no crossguard, hilt wrapped in white cloth; the blade visible above his right shoulder and beside his left leg.
Style: clean, readable pixel art designed to be downscaled to a 32x32 tile sprite: large flat color areas, a crisp 1-pixel dark outline in color #1a1822 around the silhouette, exactly one darker shade per color for shading, light from the top-left, no gradients, no anti-aliasing, no dithering, no noise texture, at most 16 colors on the character. Strong silhouette, few tiny details.
Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p02_ichigo_bankai

```text
The same young man as in the reference (same face, same spiky bright orange hair, brown eyes, stern look, same height and realistic proportions), single sprite, front-facing, standing idle, full body, centered, same size on the canvas as in the reference. Changed outfit (his power-up form): a long black coat reaching the ankles, open at the front, with a red inner lining visible along the edges and hem, black clothes underneath, no white sash, black sandals. In his right hand he holds a slim, entirely black katana, blade pointing down and slightly outward, with a small black crossguard shaped like a manji (four bent arms). No sword on the back.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density and same character scale on the canvas. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p03_rukia

```text
A DIFFERENT character in the exact same style as the reference: a petite young woman with realistic proportions, clearly shorter than the reference man (about 85% of his height), slim build. Front-facing, standing idle, full body, centered, same pixel scale as the reference. Short straight black hair cut at chin length, with one distinct strand of hair hanging down between her eyes over the nose. Violet eyes, calm serious expression. Black samurai-style kimono (shihakusho) with a white inner collar, white sash at the waist, black hakama, white tabi socks and straw sandals. A katana with a white hilt and white sheath tucked at her left hip.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density and same character scale on the canvas. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p04_hollow

```text
A monster enemy in the exact same pixel-art style as the reference: a large hulking humanoid spirit beast, front-facing, standing, full body, centered, about 1.4 times taller and much bulkier than the reference man, fitting entirely inside the central 80% of the canvas. Body entirely black with dark purple-gray shading, long arms with big claws, hunched posture. Its face is a white bone mask shaped like a skull, with dark eye holes and a wide grin of exposed sharp teeth. A clearly visible round hole goes straight through the center of its chest (the magenta background shows through the hole). Menacing, readable as a small game sprite.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density and same character scale on the canvas. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p05_walk

```text
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines or borders) of the SAME character as the reference (same orange hair, face, black kimono with white collar and white sash, huge cleaver sword on his back, same colors, same realistic proportions), walking, for a top-down 3/4 RPG overworld walking sheet (Tibia / RPG Maker style layout).
Row 1: walking DOWN toward the camera (front view). Row 2: walking LEFT (left side view). Row 3: walking RIGHT (right side view). Row 4: walking UP away from the camera (back view: back of the orange hair and the big sword on his back).
Each row is a 4-frame walk cycle: frame 1 left foot forward, frame 2 neutral, frame 3 right foot forward, frame 4 neutral. Body size never changes.
In every cell: character centered, full body inside the central 70% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells, nothing (hair, sword, sleeves) crosses a cell edge.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density and same character scale on the canvas. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

# Rodada 2: folhas de andar para o jogo (48 px), passo exagerado

Cada folha 4x4 foi enviada com `-i` apontando para a imagem de frente do próprio personagem (Renji: primeiro a 10 usando a 01 como referência de estilo, depois a 11 usando a 10). Todas saíram na 1ª tentativa, sem recusas.

## p06_shikai_walk2

```text
The SAME character as the reference (same orange spiky hair, face, black kimono with white collar and white sash, huge cleaver sword strapped on his back, same colors, same realistic proportions).
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines or borders), walking cycle for a top-down 3/4 RPG overworld (Tibia / RPG Maker style layout).
Row 1: walking DOWN toward the camera (front view). Row 2: walking LEFT (left side view). Row 3: walking RIGHT (right side view). Row 4: walking UP away from the camera (back view).
Each row is a 4-frame walk cycle with an EXAGGERATED, clearly readable stride: frame 1 left leg far forward and right arm swung forward, frame 2 legs together passing pose, frame 3 right leg far forward and left arm swung forward, frame 4 legs together passing pose. Legs must be clearly apart in frames 1 and 3, so the step is obvious even when the sprite is shrunk to 48 pixels. Body size never changes.
In every cell: character centered, full body inside the central 70% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells, nothing (hair, weapon, coat) crosses a cell edge.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p07_bankai_walk

```text
The SAME character as the reference (orange spiky hair, long black coat to the ankles with red inner lining, slim all-black katana held in the right hand pointing down, same realistic proportions). The coat flaps slightly with the stride.
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines or borders), walking cycle for a top-down 3/4 RPG overworld (Tibia / RPG Maker style layout).
Row 1: walking DOWN toward the camera (front view). Row 2: walking LEFT (left side view). Row 3: walking RIGHT (right side view). Row 4: walking UP away from the camera (back view).
Each row is a 4-frame walk cycle with an EXAGGERATED, clearly readable stride: frame 1 left leg far forward and right arm swung forward, frame 2 legs together passing pose, frame 3 right leg far forward and left arm swung forward, frame 4 legs together passing pose. Legs must be clearly apart in frames 1 and 3, so the step is obvious even when the sprite is shrunk to 48 pixels. Body size never changes.
In every cell: character centered, full body inside the central 70% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells, nothing (hair, weapon, coat) crosses a cell edge.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p08_rukia_walk

```text
The SAME character as the reference (petite young woman, short black chin-length hair with one strand between the eyes, violet eyes, black kimono with white collar, white sash, katana with white hilt and white sheath at her left hip, same realistic proportions).
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines or borders), walking cycle for a top-down 3/4 RPG overworld (Tibia / RPG Maker style layout).
Row 1: walking DOWN toward the camera (front view). Row 2: walking LEFT (left side view). Row 3: walking RIGHT (right side view). Row 4: walking UP away from the camera (back view).
Each row is a 4-frame walk cycle with an EXAGGERATED, clearly readable stride: frame 1 left leg far forward and right arm swung forward, frame 2 legs together passing pose, frame 3 right leg far forward and left arm swung forward, frame 4 legs together passing pose. Legs must be clearly apart in frames 1 and 3, so the step is obvious even when the sprite is shrunk to 48 pixels. Body size never changes.
In every cell: character centered, full body inside the central 70% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells, nothing (hair, weapon, coat) crosses a cell edge.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p09_hollow_walk

```text
The SAME monster as the reference (hulking black humanoid spirit beast with dark purple-gray shading, white skull bone mask with grinning teeth, round hole through the chest, long clawed arms, hunched). Heavy lumbering walk. Back view (row 4) shows the hunched black back and the back of the mask.
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines or borders), walking cycle for a top-down 3/4 RPG overworld (Tibia / RPG Maker style layout).
Row 1: walking DOWN toward the camera (front view). Row 2: walking LEFT (left side view). Row 3: walking RIGHT (right side view). Row 4: walking UP away from the camera (back view).
Each row is a 4-frame walk cycle with an EXAGGERATED, clearly readable stride: frame 1 left leg far forward and right arm swung forward, frame 2 legs together passing pose, frame 3 right leg far forward and left arm swung forward, frame 4 legs together passing pose. Legs must be clearly apart in frames 1 and 3, so the step is obvious even when the sprite is shrunk to 48 pixels. Body size never changes.
In every cell: character centered, full body inside the central 70% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells, nothing (hair, weapon, coat) crosses a cell edge.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p10_renji

```text
A DIFFERENT character in the exact same style as the reference: a tall lean young man with realistic proportions (slightly taller than the reference man), front-facing, standing idle, full body, centered, same pixel scale as the reference. Long bright red hair tied up in a high spiky ponytail, a white bandana tied around his forehead, black jagged tribal tattoos on his forehead above the eyebrows and on his neck, fierce grin, brown eyes. Black samurai-style kimono (shihakusho) with white inner collar, white sash, black hakama, white tabi socks and straw sandals. In his right hand a katana with a red hilt, blade pointing down.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

## p11_renji_walk

```text
The SAME character as the reference (tall young man, long red hair in a high spiky ponytail, white bandana, black tribal tattoos on forehead, black kimono with white collar and white sash, katana with red hilt sheathed at the left hip while walking, same realistic proportions).
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines or borders), walking cycle for a top-down 3/4 RPG overworld (Tibia / RPG Maker style layout).
Row 1: walking DOWN toward the camera (front view). Row 2: walking LEFT (left side view). Row 3: walking RIGHT (right side view). Row 4: walking UP away from the camera (back view).
Each row is a 4-frame walk cycle with an EXAGGERATED, clearly readable stride: frame 1 left leg far forward and right arm swung forward, frame 2 legs together passing pose, frame 3 right leg far forward and left arm swung forward, frame 4 legs together passing pose. Legs must be clearly apart in frames 1 and 3, so the step is obvious even when the sprite is shrunk to 48 pixels. Body size never changes.
In every cell: character centered, full body inside the central 70% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells, nothing (hair, weapon, coat) crosses a cell edge.
Style: match the attached reference image EXACTLY in art style: same pixel-art rendering, same REALISTIC adult body proportions (head about one sixth of body height, NOT chibi, NOT big-headed), same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering, at most 16 colors on the character. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

# Rodada 3: ícones de itens e NPC da loja

Os dois prompts foram enviados com `-i raw/01_ichigo_shikai_front_ref.png` como referência de estilo. Ambos saíram na 1ª tentativa, sem recusas; os 16 ícones vieram na ordem pedida.

## p12_items

```text
Make the image SQUARE. A 4x4 sheet of 16 RPG inventory item icons (4 rows, 4 columns, 16 equal square cells, no visible grid lines), each item centered in its cell, filling about 60% of the cell, with generous magenta padding, nothing crossing a cell edge. Each icon is a single object seen from a slight top-down 3/4 angle, bold readable silhouette that still reads at 32x32 pixels.
Row 1: (1) small round glass flask with bright red liquid and cork; (2) small round glass flask with bright blue glowing liquid and cork; (3) a jagged white bone shard, a broken piece of a skull mask; (4) a single curved black monster claw with a purple sheen.
Row 2: (5) a glowing cyan crystal shard; (6) a folded white cloth headband; (7) a white bone skull mask with dark eye holes and teeth; (8) a folded black kimono with a white collar.
Row 3: (9) a folded white long coat (haori) with a black diamond pattern at the hem; (10) folded wide black pleated trousers (hakama); (11) a pair of straw sandals (waraji) with white straps; (12) a katana in a black sheath with a dark wrapped hilt and square guard, diagonal.
Row 4: (13) a crude sword made of black claw and bone, diagonal; (14) a silver ring with a glowing blue gem; (15) a small round paper talisman amulet with a red cord and a soul flame symbol; (16) a small stack of three gold coins with square holes in the middle.
Style: match the attached reference image in art style: same pixel-art rendering, same outline color #1a1822 (1 pixel), one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no numbers, no border, no UI, no grid lines.
```

## p13_urahara

```text
A DIFFERENT character in the exact same style as the reference: a tall lanky shopkeeper man with REALISTIC adult proportions (head about one sixth of body height, NOT chibi), front-facing, standing idle, full body, centered, same pixel scale as the reference. Messy shoulder-length light blond hair, a little stubble, half-closed relaxed eyes, sly smile. A green-and-white vertically striped bucket hat shading his eyes. Dark green long jacket (haori) with a white diamond pattern along the bottom hem, worn over a black kimono. Wooden geta sandals. He holds a closed white folding fan in one hand and a plain wooden walking cane in the other.
Same realistic proportions, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left. No gradients, no anti-aliasing, no dithering, at most 16 colors.
Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI.
```

# Rodada 4: visual por equipamento (haori e máscara)

Edições das folhas de andar 06/08/11 (`-i` com a folha base como imagem a editar) e, para haori + máscara, da folha com haori. Script: `work/gen_outfits.sh`. As 9 saíram na 1ª tentativa, sem recusas, mantendo poses e posições das células.

## p_14_ichigo_haori_walk (o mesmo texto para Rukia e Renji)

```text
This is an EDIT of the attached sprite sheet: keep EXACTLY the same 4x4 layout, the same 16 cells, the same poses, the same body positions, the same scale, the same feet baseline, the same art style, the same colors, the same outline (#1a1822) and the same solid magenta #FF00FF background. Row 1 walking down (front), row 2 walking left, row 3 walking right, row 4 walking up (back). Change ONLY what is described below, consistently in all 16 cells; do not change the face, hair, weapon or body. Nothing may cross a cell edge. No text, no labels, no grid lines, no border.
Add a white captain coat (haori) worn over the black kimono: open at the front, short wide sleeves, reaching just below the knees, plain white with a row of black diamond (lozenge) shapes along the bottom hem. Front view shows the black kimono and white sash in the opening of the coat; side views show the coat profile; back view (row 4) shows the white back of the coat.
```

## p_17_ichigo_mask_walk (o mesmo texto para Rukia e Renji)

```text
This is an EDIT of the attached sprite sheet: keep EXACTLY the same 4x4 layout, the same 16 cells, the same poses, the same body positions, the same scale, the same feet baseline, the same art style, the same colors, the same outline (#1a1822) and the same solid magenta #FF00FF background. Row 1 walking down (front), row 2 walking left, row 3 walking right, row 4 walking up (back). Change ONLY what is described below, consistently in all 16 cells; do not change the face, hair, weapon or body. Nothing may cross a cell edge. No text, no labels, no grid lines, no border.
Add a white bone mask (like a hollow monster skull mask) covering the whole face: front view shows the white mask with two black eye holes and a grinning row of teeth at the mouth; side views show the mask in profile covering the face; back view (row 4) shows only a thin white edge of the mask at the sides of the head, hair unchanged.
```
