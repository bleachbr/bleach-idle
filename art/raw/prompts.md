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

# Rodada 5: monstros de Hueco Mundo

Script `work/gen_hueco.sh`. Adjuchas e Gillian usaram a folha do Hollow (09) como referência de estilo e layout; o Arrancar usou a do Renji (11). Os três saíram na 1ª tentativa, sem recusas.

## p_23_adjuchas_walk

```text
A monster: a sleek, fast, wolf-like four-legged spirit beast. Black body with dark violet shading and white bone armor plates along the spine, long thin tail, sharp claws. Its head is a long white bone skull mask shaped like a wolf or lizard skull, with dark eye holes and bared teeth. A round hole goes straight through its chest/torso (magenta shows through it in front and side views).
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT (left side view), row 3 walking RIGHT (right side view), row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle with a clear stride. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge.
Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_24_gillian_walk

```text
A monster: a gigantic, very tall spirit giant shaped like a long narrow cone wrapped in a floor-length jet-black cloak, a ring of white spikes around the collar, and a white bone mask with a very long pointed nose and small round dark eye holes at the top. No visible arms; only small black feet peek out under the cloak while walking. It fills most of the cell height (tall and thin), slow heavy walk.
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT (left side view), row 3 walking RIGHT (right side view), row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle with a clear stride. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge.
Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_25_arrancar_walk

```text
A humanoid warrior with REALISTIC adult proportions (same height and proportions as the reference character, NOT chibi): messy pale blue hair, a fragment of white bone mask covering one side of the jaw, a white high-collared uniform jacket and white hakama trousers with a black sash, black shoes, a katana with a white hilt at the left hip, and a small round hole visible through the stomach in the front view.
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT (left side view), row 3 walking RIGHT (right side view), row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle with a clear stride. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge.
Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

# Rodada 6: Soul Society

Script `work/gen_soul.sh` (referência de estilo: 01). Os três saíram na 1ª tentativa. O chão é uma folha 2x2 de texturas; cada quarto vira um bloco 4x4 de tiles em `art/maps/build_maps.py`.

## p_26_ss_ground

```text
Make the image SQUARE. A 2x2 sheet of four SEAMLESS, TILEABLE ground textures for a top-down RPG, each filling its whole quarter edge to edge (no borders, no gaps, no objects): top-left: light grey stone paving slabs in an irregular Japanese courtyard pattern; top-right: packed light-brown dirt road with small pebbles; bottom-left: short green grass; bottom-right: raked white gravel of a zen garden with parallel lines. Flat top-down view, even lighting, no shadows from objects. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs.
```

## p_27_ss_building

```text
A single top-down 3/4 view pixel-art building for an RPG map: a traditional Japanese barracks hall of the Soul Society (Seireitei), wide rectangular footprint about 2:1.6, white plaster walls with dark wooden beams and a dark wooden sliding door in the middle of the front wall, a large dark blue-grey tiled roof with curved eaves covering most of the image (we see the roof from above at an angle and only the front wall below it). Centered, filling about 85% of the canvas. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no border, no grid lines.
```

## p_28_ss_props

```text
Make the image SQUARE. A 2x2 sheet of four separate top-down 3/4 view pixel-art map props, each centered in its own quarter with generous magenta padding, nothing crossing the quarter edges: top-left: a cherry blossom (sakura) tree with a full pink canopy and a dark trunk (tree about twice as tall as wide); top-right: a grey stone Japanese lantern (toro); bottom-left: a dark green pine tree; bottom-right: a long white Seireitei wall segment with a small dark tiled roof cap on top, seen from the front-top, filling the width of its quarter. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no border, no grid lines.
```

# Rodada 7: boneco de treino, Grand Fisher e Fishbone D

Script `work/gen_round7.sh`. Boneco com referência 01; Grand Fisher e Fishbone com a folha do Hollow (09). Os três na 1ª tentativa.

## p_29_dummy

```text
A single top-down 3/4 view pixel-art map object: a Japanese wooden training dummy for sword practice (a wooden post with crossed arms, a straw-wrapped torso tied with rope, a round straw head), standing upright, full object, centered, filling about 70% of the canvas height. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_30_grand_fisher_walk

```text
A monster: a huge, hunched, gorilla-like spirit beast with black fur and a white bone skull mask with a wide toothy grin; from the top of its head grows a long thin stalk ending in a small human-like doll lure, like an anglerfish. Long heavy arms with claws, round hole through the chest. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT (left side view), row 3 walking RIGHT (right side view), row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_31_fishbone_walk

```text
A monster: a tall, thin fish-like humanoid spirit with dark blue-grey skin, a white bone mask shaped like a fish skeleton head with a long jaw full of needle teeth, fin-like spikes along its back and forearms, long webbed claws, and a round hole through the chest. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT (left side view), row 3 walking RIGHT (right side view), row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

# Rodada 8: Bankai da Rukia e do Renji e três Hollows de Karakura

Script `work/gen_round8.sh`. Os Bankais são edições das folhas base (08 e 11); os Hollows usam a folha 09 como referência. Os cinco na 1ª tentativa.

## p_32_rukia_bankai_walk

```text
This is an EDIT of the attached sprite sheet: keep EXACTLY the same 4x4 layout, the same 16 cells, the same poses, the same body positions, the same scale, the same feet baseline, the same art style, the same outline (#1a1822) and the same solid magenta #FF00FF background. Row 1 walking down (front), row 2 walking left, row 3 walking right, row 4 walking up (back). Change ONLY what is described below, consistently in all 16 cells. Nothing may cross a cell edge. No text, no labels, no grid lines, no border. Her ice power-up form: her hair becomes pure white, her skin pale with a faint frosty blue tint, and her black kimono is replaced by a flowing pure white kimono with icy pale-blue edges and small ice crystals at the shoulders and hem; her katana is now pure white. Same face, same height and proportions.
```

## p_33_renji_bankai_walk

```text
This is an EDIT of the attached sprite sheet: keep EXACTLY the same 4x4 layout, the same 16 cells, the same poses, the same body positions, the same scale, the same feet baseline, the same art style, the same outline (#1a1822) and the same solid magenta #FF00FF background. Row 1 walking down (front), row 2 walking left, row 3 walking right, row 4 walking up (back). Change ONLY what is described below, consistently in all 16 cells. Nothing may cross a cell edge. No text, no labels, no grid lines, no border. His power-up form: a thick shaggy dark-red baboon fur mantle draped over his shoulders and back (with a white skull-like ornament at the collar), the black kimono underneath; his sword is replaced by a long segmented bone-white whip-sword held in his right hand and trailing behind him, kept close to the body so it does not cross the cell edges. Same red hair in a ponytail, bandana, tattoos and proportions.
```

## p_34_hollow_menor_walk

```text
A monster: a small, scrawny goblin-like spirit (about half the size of the reference monster) with grey-black skin, thin limbs, big claws, a cracked white bone mask with round eye holes and a toothy grin, and a small hole through its chest. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_35_hollow_rastejante_walk

```text
A monster: a long centipede-like spirit crawler with a segmented black body with dark-green shading, many thin legs, low to the ground, a white bone mask shaped like an insect skull with mandibles, and a hole through its front segment. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_36_hollow_acido_walk

```text
A monster: a bloated, toad-like spirit with dark olive-green warty skin, glowing yellow-green acid sacs on its back, a wide white bone mask with a huge frog mouth dripping green acid, short thick legs, and a hole through its belly. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

# Rodada 9: os outros cinco Hollows de Karakura

Script `work/gen_round9.sh` (referência 09). Os cinco na 1ª tentativa.

## p_37_hollow_sombrio_walk

```text
A monster: a ghostly, shadowy humanoid spirit made of tattered dark smoke-like rags with a grey-violet tint, a long thin white bone mask with narrow slit eyes, long thin arms ending in claws, floating legs that fade into wisps, and a hole through the chest. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_38_hollow_uivante_walk

```text
A monster: a hyena-like four-legged spirit with ragged orange-brown fur and dark stripes, a white bone mask shaped like a howling canine skull with an open mouth, a bushy tail, and a hole through its side. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_39_hollow_faminto_walk

```text
A monster: a gaunt, starving humanoid spirit with grey skin stretched over visible ribs, a huge drooling mouth on a white bone mask with many teeth, long clawed arms, a red-tinted glow inside the hole in its chest. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_40_hollow_encouracado_walk

```text
A monster: a heavy armored spirit like a giant armadillo-beetle standing on two thick legs, covered in steel-blue bone armor plates, a white bone helmet-like mask with small eye holes, huge armored fists, and a hole through the center of its chest plate. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_41_hollow_devorador_walk

```text
A monster: a hulking, obese spirit with dark crimson-black skin, a gigantic mouth across its belly lined with teeth, a small white bone mask on its head with three eye holes, stubby legs and long arms, and a hole through its upper chest. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

# Rodada 10: Metastacia e a segunda folha de ícones

Script `work/gen_round10.sh`. Metastacia com a folha do Hollow (09); ícones com a primeira folha de ícones (12). Os dois na 1ª tentativa. Os ícones 29 e 31 (medalha e bandeira) ficaram reservados para itens futuros.

## p_42_metastacia_walk

```text
A monster: a large insect-like spirit with a dark purple-black segmented body like a giant centipede standing upright, several long thin whip-like tentacles growing from its back and swaying, a white bone mask with a pointed beak-like face and two small red eyes, crab-like jointed legs, and a round hole through the chest. Menacing boss creature. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE creature walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the creature is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_43_item_icons2_4x4

```text
Make the image SQUARE. A 4x4 grid (4 rows, 4 columns, 16 equal square cells) of SIXTEEN different game item icons, one item per cell, each centered and fully inside its cell with magenta padding, same layout and scale as the reference icon sheet. In order, left to right, top to bottom: 1 a glowing pale-blue crystal shard; 2 a curled dark purple tentacle with suckers; 3 a white bone helmet with horns; 4 a pair of black ninja boots with white wraps; 5 a pair of dark navy wide hakama trousers with a white belt; 6 a katana with a black blade and a crescent-moon guard; 7 a silver ring with a glowing cyan gem; 8 a pendant necklace with a blue spiral talisman; 9 a large red potion bottle with a gold cap; 10 a large blue potion bottle with a gold cap; 11 a rolled paper scroll with a red seal; 12 a small bronze incense burner with green smoke; 13 a small wooden treasure box with a gold lock; 14 a gold medal with a red ribbon; 15 a white rice ball wrapped in seaweed; 16 a black flag with a white skull. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

# Rodada 11: Karakura com arte própria

Script `work/gen_karakura.sh`. Cada imagem usa a peça equivalente da Soul Society (26, 27 e 28) como referência. As três na 1ª tentativa. O asfalto veio granulado demais e é suavizado no `build_maps.py`.

## p_44_kk_ground

```text
Make the image SQUARE. A 2x2 sheet of four SEAMLESS, TILEABLE ground textures for a top-down RPG set in a modern Japanese town, each filling its whole quarter edge to edge (no borders, no gaps, no objects, no road markings): top-left: short green grass; top-right: dark grey asphalt; bottom-left: light grey square concrete sidewalk tiles; bottom-right: blue river water with small light ripples. Flat top-down view, even lighting. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs.
```

## p_45_kk_buildings

```text
Make the image SQUARE. A 2x2 sheet of four separate top-down 3/4 view pixel-art buildings of a modern Japanese suburban town, each centered in its own quarter with magenta padding, nothing crossing the quarter edges; in each we see a large roof from above at an angle and the front wall below it: top-left: a two-story Japanese family house with a red-brown tiled gable roof, cream walls, a front door and two windows; top-right: a small grey concrete apartment block with a flat grey roof with an AC unit, rows of windows and a glass entrance door; bottom-left: a small corner shop with a beige wall, a striped awning over a glass front and a flat roof; bottom-right: a traditional wooden Japanese house with a dark blue-grey tiled roof and sliding shoji doors. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no border, no grid lines.
```

## p_46_kk_props

```text
Make the image SQUARE. A 3x3 sheet of nine separate top-down 3/4 view pixel-art map props for a modern Japanese town, each centered in its own cell with generous magenta padding, nothing crossing the cell edges: 1 a round leafy green street tree (zelkova) with a brown trunk, taller than wide; 2 a round dark green bush; 3 a red drink vending machine; 4 a dark green tree with a slightly different round canopy; 5 a small wooden treasure chest with iron bands (storage chest); 6 a tall traditional Japanese gate (Senkaimon) made of white paper sliding doors framed in dark wood with a small tiled roof; 7 a light green tree with a lighter canopy; 8 a grey metal trash can; 9 a wooden park bench. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no border, no grid lines.
```

# Rodada 12: Hueco Mundo com arte própria

Script `work/gen_hueco2.sh`, com as peças da Soul Society (26 e 28) como referência. As duas na 1ª tentativa.

## p_47_hm_ground

```text
Make the image SQUARE. A 2x2 sheet of four SEAMLESS, TILEABLE ground textures for a top-down RPG set in an endless white desert under a dark night sky (moonlit, cool blue-grey tint), each filling its whole quarter edge to edge (no borders, no gaps, no objects): top-left: smooth pale grey-white sand; top-right: pale grey-white sand with soft wind ripples; bottom-left: cracked pale stone ruins floor; bottom-right: pale sand with scattered small white bone fragments. Flat top-down view, even cool moonlight lighting. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs.
```

## p_48_hm_props

```text
Make the image SQUARE. A 3x3 sheet of nine separate top-down 3/4 view pixel-art map props for a white desert of the spirit world under moonlight (pale, cool colors), each centered in its own cell with generous magenta padding, nothing crossing the cell edges: 1 a dead tree made of white quartz crystal with bare branching limbs, taller than wide; 2 a large pale grey boulder; 3 a cluster of two pale grey rocks; 4 a small flat pale grey rock; 5 a tall white stone ruin pillar, intact, taller than wide; 6 a broken white stone ruin pillar, only the lower half standing with rubble; 7 a vertical black rift tearing open in the air with jagged edges and a faint purple glow inside (a dimensional portal), taller than wide; 8 a large white animal skull half buried in sand; 9 a dead white crystal tree, smaller and twisted. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no border, no grid lines.
```

# Rodada 13: Las Noches

Script `work/gen_lasnoches.sh`. Monstros com a folha do Arrancar (25) como referência; tileset com as peças da Soul Society (26 e 28). Os seis na 1ª tentativa. O portal reaproveita a fenda da Garganta (48).

## p_49_arrancar_numeros_walk

```text
A humanoid warrior spirit: a pale-skinned soldier in a white hakama-style uniform with a black sash and black trim, a short white jacket, a fragment of a white bone mask covering the left jaw, a small hole through the stomach, holding a plain katana with a black handle. Lean and menacing. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_50_exequias_walk

```text
A humanoid executioner spirit: a tall figure wrapped in a long white hooded cloak with black trim reaching the ground, the face hidden by a smooth white bone mask with a single vertical slit, carrying a long black scythe-like blade on a pole, a hole through the chest visible between the cloak flaps. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_51_fraccion_walk

```text
A humanoid brute spirit: a very muscular bald giant in a torn white uniform with black trim, a white bone mask fragment like a horned helmet on top of the head, huge spiked bone gauntlets on both fists, a hole through the upper chest, heavy stomping walk. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_52_privaron_walk

```text
A humanoid boss spirit: an imposing tall warrior in an elegant long white coat with black lining and black trim flowing behind him, a white bone mask fragment shaped like a crown of spikes on his head, long dark hair, a glowing teal number tattoo on his neck, holding a large ornate black and silver sword, a hole through the chest. Regal and dangerous, final boss look. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_53_ln_ground

```text
Make the image SQUARE. A 2x2 sheet of four SEAMLESS, TILEABLE floor textures for a top-down RPG set inside a vast white desert palace at night, each filling its whole quarter edge to edge (no borders, no gaps, no objects): top-left: polished white marble floor tiles with faint grey veins; top-right: dark charcoal grey marble floor tiles; bottom-left: long dark red carpet with a thin gold border pattern running vertically; bottom-right: pale grey-white desert sand. Flat top-down view, cool moonlit lighting. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs.
```

## p_54_ln_props

```text
Make the image SQUARE. A 3x3 sheet of nine separate top-down 3/4 view pixel-art map props for the interior of an enormous white palace in a desert of the spirit world, each centered in its own cell with generous magenta padding, nothing crossing the cell edges: 1 a tall smooth white cylindrical pillar with a simple base and capital; 2 a thick white palace wall block seen from the front-top (square, plain, with a thin grey line pattern); 3 a tall black iron brazier with a cold teal flame; 4 a white stone throne with a high back; 5 a large crescent-moon-shaped window frame in white stone showing a black night sky; 6 a pile of white rubble and broken marble; 7 a dark grey stone statue of a hooded figure on a pedestal; 8 a tall narrow white banner hanging on a black pole; 9 a small white marble bench. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no border, no grid lines.
```

# Rodada 14: fundo da tela de login

Script `work/gen_login.sh`, com o chão da Soul Society (26) como referência de estilo. Na 1ª tentativa. Vai para `client/public/assets/login_bg.jpg` reduzido a 1280 px (JPEG, 160 KB).

## p_55_login_bg

```text
Make the image WIDE (landscape, about 16:9). A moody pixel-art illustration for a game title screen: a quiet modern Japanese town at night seen from a rooftop, rows of tiled roofs and small apartment blocks with a few lit windows, utility poles and wires, a huge pale full moon low in a deep blue-violet sky, and on distant rooftops the dark silhouettes of two masked monster spirits with glowing white bone masks watching the town. In the foreground on the right, the small dark silhouette of a young swordsman in a black kimono holding a very large sword over his shoulder, seen from behind, looking at the town. Lots of dark empty sky in the upper left (space for a login box). Clean pixel art, limited palette of deep blues and violets with pale moonlight highlights, crisp pixels, no text, no logo, no letters, no UI.
```

# Rodada 15: Dangai

Script `work/gen_dangai.sh`, com as peças da Soul Society (26 e 28) como referência. As duas na 1ª tentativa. Os roxos fortes do portal e das bandeiras eram apagados junto com o fundo magenta; os objetos do Dangai agora usam `remove_bg_flood` (só apaga o magenta ligado às bordas).

## p_56_dg_ground

```text
Make the image SQUARE. A 2x2 sheet of four SEAMLESS, TILEABLE floor textures for a top-down RPG set in a surreal dimensional corridor between worlds, each filling its whole quarter edge to edge (no borders, no gaps, no objects): top-left: dark violet stone floor with faint glowing purple cracks; top-right: deep purple swirling energy floor with darker streaks (like a flowing river of spirit energy, walkable); bottom-left: ancient dark grey stone tiles with small engraved runes glowing faint teal; bottom-right: polished black obsidian floor with violet reflections. Flat top-down view, eerie purple lighting. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs.
```

## p_57_dg_props

```text
Make the image SQUARE. A 3x3 sheet of nine separate top-down 3/4 view pixel-art map props for a surreal dark dimensional corridor between worlds, each centered in its own cell with generous magenta padding, nothing crossing the cell edges: 1 a tall twisted dark stone pillar wrapped in glowing purple veins; 2 a block of dark violet rock wall (square, for building walls); 3 a floating teal spirit flame on a small black stone pedestal; 4 a large circular stone gate with a swirling purple portal inside; 5 a cluster of jagged black crystal shards; 6 a broken stone archway; 7 a hanging tattered black and purple banner on a pole; 8 a small stone altar with a glowing white orb; 9 a pile of old bones and a cracked white mask. Style: clean pixel art matching the attached reference image (same pixel density, crisp dark outline #1a1822 around objects, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering), seen from a 3/4 top-down RPG camera angle like classic top-down MMORPGs. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no shadow, no text, no labels, no border, no grid lines.
```

# Rodada 16: kit de interface

Script `work/gen_ui.sh`, com a primeira folha de ícones (12) como referência. As quatro na 1ª tentativa. Processadas por `art/ui.py` para `client/public/assets/ui/`.

## p_58_ui_panel

```text
Make the image SQUARE. ONE game UI window frame filling about 90% of the image: a rectangular panel with a thick ornate border made of black lacquered wood with a thin white-silver inner line and a thin crimson outer line, four decorative corner pieces shaped like silver Japanese sword guards (tsuba), the long edges plain and repeating (so they can be stretched), and a flat solid very dark navy-black interior (#14121c) with no pattern. Symmetric. Style: crisp pixel art matching the attached reference image (same pixel density, dark outline #1a1822, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering). Theme: the elegant black-and-white uniform of Japanese soul reapers: deep black lacquer, clean white and silver trim, small crimson accents. Flat front view (UI, not a scene). Background: 100% solid flat magenta #FF00FF around the elements, no gradient, no shadow, no text, no letters, no labels.
```

## p_59_ui_buttons

```text
Make the image SQUARE. A 2x3 grid (2 columns, 3 rows) of SIX wide rectangular game UI buttons with no text, each centered in its cell with magenta padding, all the same size, about 4 times wider than tall, with flat interiors and plain stretchable middles: left column = PRIMARY buttons: row 1 a crimson red lacquer button with a white-silver rim (normal), row 2 the same brighter and glowing (hover), row 3 the same darker and pressed in. Right column = SECONDARY buttons: row 1 a black lacquer button with a silver rim (normal), row 2 the same lighter (hover), row 3 the same darker pressed in. Style: crisp pixel art matching the attached reference image (same pixel density, dark outline #1a1822, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering). Theme: the elegant black-and-white uniform of Japanese soul reapers: deep black lacquer, clean white and silver trim, small crimson accents. Flat front view (UI, not a scene). Background: 100% solid flat magenta #FF00FF around the elements, no gradient, no shadow, no text, no letters, no labels.
```

## p_60_ui_parts

```text
Make the image SQUARE. A 2x2 grid of four separate game UI parts, each centered in its cell with magenta padding: top-left: an empty square inventory slot, recessed dark navy-black interior with a thin silver bevel and black outline; top-right: the same inventory slot highlighted with a glowing light-blue spirit-energy border; bottom-left: a long horizontal empty status bar frame (about 6 times wider than tall) with a black lacquer border, silver trim and a dark empty interior; bottom-right: a small horizontal title plate (about 4 times wider than tall) in black lacquer with silver trim and a tiny crimson knot ornament in the middle top. Style: crisp pixel art matching the attached reference image (same pixel density, dark outline #1a1822, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering). Theme: the elegant black-and-white uniform of Japanese soul reapers: deep black lacquer, clean white and silver trim, small crimson accents. Flat front view (UI, not a scene). Background: 100% solid flat magenta #FF00FF around the elements, no gradient, no shadow, no text, no letters, no labels.
```

## p_61_ui_icons

```text
Make the image SQUARE. A 4x4 grid (4 rows, 4 columns, 16 equal square cells) of SIXTEEN different small game menu icons, one per cell, centered with magenta padding, same scale and style as the reference icon sheet, mostly white-silver with crimson and light-blue accents. In order, left to right, top to bottom: 1 an open book; 2 a trophy cup; 3 a speaker with sound waves; 4 a speaker crossed out (muted); 5 two curved arrows forming a circle (swap); 6 a scroll with a red seal (quests); 7 a blacksmith hammer over an anvil (forge); 8 a stack of gold coins with a square hole (market); 9 a swirling portal ring (travel); 10 a treasure chest (storage); 11 three small people silhouettes (party); 12 a hanging war banner (guild); 13 a gear cog (settings); 14 a crossed katana pair (combat); 15 a glowing star (rebirth); 16 an hourglass (daily). Style: crisp pixel art matching the attached reference image (same pixel density, dark outline #1a1822, one-shade shading with light from the top-left, no gradients, no anti-aliasing, no dithering). Theme: the elegant black-and-white uniform of Japanese soul reapers: deep black lacquer, clean white and silver trim, small crimson accents. Flat front view (UI, not a scene). Background: 100% solid flat magenta #FF00FF around the elements, no gradient, no shadow, no text, no letters, no labels.
```

# Rodada 17: efeitos animados

Script `work/gen_fx.sh`. Três folhas 4x4 (uma linha por efeito, 4 quadros), processadas por `art/fx.py`. Todas na 1ª tentativa.

## p_62_fx_combat

```text
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of animated visual effects: each ROW is ONE effect animated over 4 frames from left to right (start, grow, peak, fade). In every cell the effect is centered and fully inside the cell with magenta padding; nothing crosses a cell edge; no characters, no ground. Row 1: a fast sword slash: a curved white crescent arc with a light-blue edge sweeping across, appearing, at full size, then thinning and vanishing. Row 2: a hit impact: a small white and yellow star-burst spark with flying sparks, expanding then fading. Row 3: a defeated spirit monster dissolving: a dark purple-black smoke cloud with small white bone mask fragments, puffing out then fading to wisps. Row 4: a level-up: a vertical pillar of golden light with rising sparkles, growing taller, brightest, then fading. Style: crisp pixel art matching the attached reference image (same pixel density, dark outline #1a1822 only where it helps, no anti-aliasing, no dithering, no gradients), bright saturated glowing colors for magical energy, for a top-down RPG. Background: 100% solid flat magenta #FF00FF, no text, no labels, no grid lines.
```

## p_63_fx_skills

```text
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of animated visual effects: each ROW is ONE effect animated over 4 frames from left to right (start, grow, peak, fade). In every cell the effect is centered and fully inside the cell with magenta padding; nothing crosses a cell edge; no characters, no ground. Row 1: a big crescent-shaped wave of sword energy, bright light-blue and white with a thin dark outline, flying horizontally to the right (it grows from a thin sliver to a large crescent, then breaks into fading streaks). Row 2: an icy burst: white and cyan ice crystals and snowflakes exploding outward from the center in a ring, then shimmering and fading. Row 3: a red-orange energy bolt shaped like a snake's open fanged jaw lunging to the right, growing then fading into sparks. Row 4: a healing effect: soft green and white sparkles and small plus signs rising upward in a column, then fading. Style: crisp pixel art matching the attached reference image (same pixel density, dark outline #1a1822 only where it helps, no anti-aliasing, no dithering, no gradients), bright saturated glowing colors for magical energy, for a top-down RPG. Background: 100% solid flat magenta #FF00FF, no text, no labels, no grid lines.
```

## p_64_fx_aura

```text
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of animated visual effects: each ROW is ONE effect animated over 4 frames from left to right (start, grow, peak, fade). In every cell the effect is centered and fully inside the cell with magenta padding; nothing crosses a cell edge; no characters, no ground. Each row is a LOOPING aura of spirit energy flames rising around an EMPTY center where a standing person would be (leave the middle of each cell empty magenta, the flames form a tall oval ring around it, taller than wide), animated over 4 frames that loop smoothly. Row 1: black flames with a glowing crimson red edge. Row 2: white and pale cyan flames with tiny snowflakes. Row 3: crimson red flames with orange tips. Row 4: bright light-blue flames. Style: crisp pixel art matching the attached reference image (same pixel density, dark outline #1a1822 only where it helps, no anti-aliasing, no dithering, no gradients), bright saturated glowing colors for magical energy, for a top-down RPG. Background: 100% solid flat magenta #FF00FF, no text, no labels, no grid lines.
```

# Rodada 18: Ishida e Sado

Script `work/gen_chars2.sh`, com a folha do Ichigo (06) como referência. Os cinco na 1ª tentativa.

## p_65_ishida_walk

```text
A slim young archer in a pristine white high-collared uniform with a long white cape and thin blue trim, a small blue cross emblem on the chest, neat straight black hair, rectangular glasses, white gloves, holding a glowing light-blue energy bow made of spirit particles in his left hand. Calm and precise. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle with clearly alternating legs and arms. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same realistic (not chibi) body proportions, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_66_ishida_power_walk

```text
The same slim young archer in a white high-collared uniform with long white cape and blue trim, glasses and black hair, but in a powered-up form: a huge glowing light-blue bow shaped like spread wings floats behind him, and a faint blue glow surrounds him. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle with clearly alternating legs and arms. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same realistic (not chibi) body proportions, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_67_sado_walk

```text
A very tall, broad and muscular young man with dark brown skin and wavy dark brown hair covering his eyes, wearing a loose red and black Hawaiian-style shirt open over a white tank top and dark jeans; his right arm is covered in black armor with red and white stripes from the shoulder to the fist. Calm, heavy steps. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle with clearly alternating legs and arms. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same realistic (not chibi) body proportions, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_68_sado_power_walk

```text
The same very tall, broad and muscular young man with dark brown skin and wavy hair covering his eyes, red and black shirt and dark jeans, but powered up: BOTH arms are covered in bulky black armor with red and white stripes, the left arm armor is white with black stripes and a shield-like shoulder, and a faint red glow surrounds him. Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of ONE character walking, same layout as the reference: row 1 walking DOWN toward the camera (front view), row 2 walking LEFT, row 3 walking RIGHT, row 4 walking UP away from the camera (back view). Each row is a 4-frame walk cycle with clearly alternating legs and arms. In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 16 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in art style: same pixel-art rendering, same 3/4 top-down camera angle, same realistic (not chibi) body proportions, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no gradient, no floor, no ground shadow, no text, no labels, no border, no UI, no grid lines.
```

## p_69_fx_skills2

```text
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of animated visual effects: each ROW is ONE effect animated over 4 frames from left to right (start, grow, peak, fade). In every cell the effect is centered and fully inside the cell with magenta padding; no characters, no ground. Row 1: a thin glowing light-blue spirit-energy arrow flying to the right with a sparkling trail. Row 2: a rain of many small light-blue energy arrows falling in a burst, then fading. Row 3: a huge black and red armored fist punch shockwave expanding to the right, with a white impact ring. Row 4: a big round blast of white light with a red core exploding outward, then fading into sparks. Style: crisp pixel art matching the reference, bright glowing colors, no anti-aliasing. Background: 100% solid flat magenta #FF00FF, no text.
```

# Rodada 19: andar com 8 quadros, ataques dos inimigos e liberação

Ciclos de 8 quadros por direção: uma imagem 4x2 para frente, lado esquerdo e costas (o lado direito é espelhado). `work/gen_walk8.sh` faz os personagens e `gen_walk8_mobs.py` faz os inimigos, com a descrição original de cada um. `walk8.py` monta a folha 8x4 que `process.py` usa no lugar da 4x4. Os prompts de cada um ficam em `work/p_w8_*.txt`.

**Refeitas:**
- **Ichigo e Ichigo Bankai, de frente:** a espada trocava de mão ou aparecia duplicada; o pedido passou a exigir que a arma fique no mesmo lugar.
- **Rukia de lado:** a espada trocava de lado.
- **Sado Diablo de lado:** os braços trocavam.

**Faltaram,** porque o Codex atingiu o limite de uso: Gillian (a vista de frente), Fracción e Privaron. Seguem com 4 quadros.

## exemplo: p_w8_ichigo_shikai_down

```text
The character: Ichigo, a young swordsman with spiky orange hair in a black shinigami kimono (shihakusho) with a white sash, carrying a huge cleaver-like zanpakuto with a white blade strapped diagonally on his back (the hilt over his right shoulder). Walking DOWN toward the camera (front view). Make the image SQUARE. A 4x2 grid (4 columns, 2 rows, 8 equal square cells) showing ONE smooth 8-frame walk cycle, read left to right on row 1 then left to right on row 2: frame 1 right foot forward touching the ground (contact), frame 2 weight on the right foot with the body slightly lower, frame 3 passing pose with the left leg lifted and moving forward, frame 4 left leg reaching forward with the body slightly higher, frame 5 left foot forward touching the ground (contact), frame 6 weight on the left foot with the body slightly lower, frame 7 passing pose with the right leg lifted and moving forward, frame 8 right leg reaching forward with the body slightly higher. Arms swing opposite to the legs. Every frame must be clearly different. Weapons, capes and accessories stay on the SAME side and in the same hand in ALL 8 frames (never switch hands, never duplicate the weapon). In every cell the character is centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 8 cells; nothing crosses a cell edge. Style: match the attached reference sprite sheet EXACTLY in character design, colors and art style: same pixel-art rendering, same 3/4 top-down camera angle, same realistic (not chibi) proportions, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no floor, no shadow, no text, no labels, no grid lines.
```

## p_70_fx_mobs

```text
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of animated visual effects: each ROW is ONE effect animated over 4 frames from left to right (start, grow, peak, fade). In every cell the effect is centered and fully inside the cell with magenta padding; no characters, no ground. Row 1: three parallel claw scratch marks slashing diagonally, dark red with white edges, appearing then fading. Row 2: a monster bite: two rows of white sharp fangs snapping shut with a small dark red splash. Row 3: a glob of bright green acid spit flying to the right and splashing into droplets. Row 4: a powerful red energy beam (cero) shooting horizontally to the right from a glowing red orb, thick at the peak, then fading. Style: crisp pixel art matching the reference, bright glowing colors, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no text.
```

## p_71_fx_release

```text
Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells) of animated visual effects: each ROW is ONE effect animated over 4 frames from left to right (start, grow, peak, fade). In every cell the effect is centered and fully inside the cell with magenta padding; no characters, no ground. Row 1: a huge explosion of black and crimson spirit energy bursting outward in a ring with a tall column in the middle (a powerful transformation release). Row 2: the same release in white and pale cyan with ice shards. Row 3: the same release in crimson red and orange flames. Row 4: the same release in bright light-blue energy. Style: crisp pixel art matching the reference, bright glowing colors, no anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no text.
```

# Rodada R-01: Yoruichi, Ukitake e Shunsui (31/10/2026)

Script `art/gen_r01.py` (Python, porque o Windows não tem bash; os textos de estilo e ciclo são cópia dos de `work/gen_walk8.sh`, script local fora do git). As três bases usaram `walk8/byakuya_down.png` como referência de estilo; cada estágio usou a base do próprio personagem. As descrições de cada estágio estão no dicionário `BASES`/`STAGES` do script. As 45 imagens (15 estágios x frente, perfil e costas) saíram na 1ª tentativa, sem recusas, com cerca de 24 mil tokens do Codex por imagem.
