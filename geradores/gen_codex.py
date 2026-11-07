#!/usr/bin/env python3
"""Gera as folhas brutas (fundo magenta) que faltam ao jogo, pelo Codex CLI (`image_gen` interno).

Saída em arts/codex/ (fora do git). Depois, cada folha passa por geradores/sprite_processor.py,
que leva o resultado para geradores/staging/ e o Estúdio 360° (preview.html) aprova.

Formatos esperados pelo processador:
- Monstros: folha 4x4 de caminhada (--type walk4x4). Linha 1 frente, 2 perfil esquerdo,
  3 perfil direito, 4 costas; colunas: passo esquerdo, neutro, passo direito, neutro.
- FX: folha 4x4 (--category fx --row N); cada linha é uma animação de 4 quadros.

Os prompts não citam nomes de obras: os seres são descritos só pela aparência.
Uso: python geradores/gen_codex.py [id ...]   (sem ids: todos os que faltam)
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "arts" / "codex"
PROMPTS = ROOT / "geradores" / "prompts"
STYLE_REF = "src/assets/characters/ichigo_shikai/front.png"

STYLE = ("Style: match the attached reference sprite EXACTLY in art style: same pixel-art rendering, same 3/4 top-down "
         "camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the "
         "top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta "
         "#FF00FF, no floor, no ground shadow, no text, no labels, no grid lines, no border.")

WALK = ("Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines) of ONE "
        "creature walking, for a top-down 3/4 RPG overworld. Row 1: walking DOWN toward the camera (front view). Row 2: "
        "walking LEFT (left side view, facing left). Row 3: walking RIGHT (right side view, facing right). Row 4: walking UP "
        "away from the camera (back view). Each row is a 4-frame walk cycle with a clear, exaggerated stride: frame 1 left "
        "step, frame 2 neutral, frame 3 right step, frame 4 neutral. Body size never changes. In every cell the creature is "
        "centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline "
        "in all 16 cells; nothing crosses a cell edge.")

# id -> (descrição, referências extras de design, tipo)
JOBS = {
    "fishbone": (
        "A monster: a tall, thin fish-like humanoid spirit with dark blue-grey skin, a white bone mask shaped like a fish "
        "skeleton head with a long jaw full of needle teeth, fin-like spikes along its back and forearms, long webbed claws, "
        "and a round hole through the chest (the magenta background shows through it). About as tall as the reference man.",
        ["arts/ref/31_fishbone_walk.png"], "walk"),
    "shrieker": (
        "A monster: a winged bat-like spirit that walks hunched on its hind legs, black leathery body with dark purple-gray "
        "shading, large ragged bat wings folded half-open behind its shoulders, long thin arms with hooked claws, a white "
        "bone mask shaped like a screaming bat skull with glowing orange eye holes and a wide open mouth, and a round hole "
        "through its chest. Slightly shorter than the reference man, but wider because of the wings.",
        [], "walk"),
    "acidwire": (
        "A monster: a lanky serpent-humanoid spirit with a long segmented snake-like lower body that it slithers on, glossy "
        "dark green scales with sickly yellow-green markings, thin arms ending in dripping acid claws, glowing lime-green acid "
        "drops falling from its jaw, a narrow white bone mask shaped like a snake skull with slit eye holes, and a round hole "
        "through its chest. About as tall as the reference man. Its 'walk' is a slither: the tail coils and sways step by step.",
        [], "walk"),
    "menos": (
        "A monster: a gigantic, very tall spirit giant shaped like a long narrow cone wrapped in a floor-length jet-black "
        "cloak, a ring of white spikes around the collar, and a white bone mask with a very long pointed nose and small round "
        "dark eye holes at the top. No visible arms; only small black feet peek out under the cloak while walking. It fills "
        "most of the cell height (tall and thin), slow heavy walk.",
        ["arts/ref/24_gillian_walk.png"], "walk"),
    "fx_kido": (
        "Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines) of "
        "magic spell visual effects for a top-down action game. Each row is ONE 4-frame animation read left to right "
        "(appear, grow, peak, dissipate), centered in each cell, fully inside the central 80% of the cell with magenta "
        "padding, nothing crosses a cell edge.\n"
        "Row 1: a fast thin bolt of white-blue lightning shot horizontally to the right, a crackling zig-zag beam with a "
        "bright white core, cyan glow and small sparks; it stretches out over the 4 frames and breaks into sparks in the last.\n"
        "Row 2: the impact of that lightning bolt: a small white-cyan electric burst with radiating jagged sparks, growing "
        "then fading into scattered sparks.\n"
        "Row 3: a round ball of crimson-red spirit fire flying to the right, a glowing orange-white core inside a red sphere "
        "with a short flame trail behind it; it pulses bigger over the frames.\n"
        "Row 4: the explosion of that fireball: a round red-orange blast with a white-hot center, flame tongues and dark red "
        "embers, expanding then breaking into embers and smoke puffs.",
        ["arts/ref/63_fx_skills.png"], "fx"),
}


def job(id_: str) -> str:
    out = OUT / f"{id_}_sheet.png"
    if out.exists():
        return f"{out.name} já existe"
    desc, refs, kind = JOBS[id_]
    body = f"{desc} {WALK}" if kind == "walk" else desc
    prompt = ("Use your built-in image_gen tool to create exactly ONE image. The attached images are STYLE references from this "
              "game (the first is the art style to match; any others show the intended creature or effect design); use them as "
              "the visual reference for image_gen. Do not write code to draw art. After generating, copy the resulting PNG from "
              f"$CODEX_HOME/generated_images/... to ./arts/codex/{out.name} and reply only with the source path and the final "
              f"path.\n\nImage prompt:\n{body} {STYLE}")
    (PROMPTS / f"{id_}.txt").write_text(prompt, encoding="utf-8")
    images = [STYLE_REF, *refs]
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT)]
    for img in images:
        cmd += ["-i", img]
    with open(OUT / f"log_{id_}.txt", "w", encoding="utf-8") as log:
        subprocess.run([*cmd, "-"], input=prompt, text=True, stdout=log, stderr=subprocess.STDOUT,
                       shell=sys.platform == "win32")
    return f"{out.name}: {'ok' if out.exists() else 'FALHOU'}"


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    PROMPTS.mkdir(parents=True, exist_ok=True)
    ids = sys.argv[1:] or list(JOBS)
    with ThreadPoolExecutor(max_workers=5) as ex:
        for r in ex.map(job, ids):
            print(r, flush=True)
