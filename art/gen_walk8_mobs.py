"""Ciclos de andar de 8 quadros para os inimigos, pelo Codex.

Reaproveita a descrição original de cada monstro (art/work/p_<n>_<id>_walk.txt) e a folha 4x4 dele
como referência. Gera frente, lado esquerdo e costas em art/raw/walk8/ (o lado direito sai espelhado
em walk8.py). Uso: python gen_walk8_mobs.py [id ...]   (sem ids: todos os que faltam)
"""
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ART = Path(__file__).resolve().parent
RAW = ART / "raw"
WORK = ART / "work"
OUT = RAW / "walk8"

# id -> folha original (referência e descrição)
MOBS = {
    "hollow_menor": "34", "hollow_rastejante": "35", "hollow_acido": "36", "hollow_sombrio": "37",
    "hollow_uivante": "38", "hollow_faminto": "39", "hollow_encouracado": "40", "hollow_devorador": "41",
    "fishbone": "31", "grand_fisher": "30", "adjuchas": "23", "gillian": "24", "arrancar": "25",
    "metastacia": "42", "arrancar_numeros": "49", "exequias": "50", "fraccion": "51", "privaron": "52",
}

STYLE = ("Style: match the attached reference sprite sheet EXACTLY in creature design, colors and art style: same pixel-art "
         "rendering, same 3/4 top-down camera angle, same outline thickness and dark outline color #1a1822, same one-shade "
         "shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: "
         "100% solid flat magenta #FF00FF, no floor, no shadow, no text, no labels, no grid lines.")
CYCLE = ("Make the image SQUARE. A 4x2 grid (4 columns, 2 rows, 8 equal square cells) showing ONE smooth 8-frame walk cycle of "
         "this creature, read left to right on row 1 then on row 2: the legs (two or four, as the creature has) alternate step "
         "by step through contact, weight, passing and reaching poses, the body bobs slightly down and up, arms, claws, tails "
         "and tentacles sway with the motion. Every frame must be clearly different, and the cycle must loop smoothly from frame "
         "8 back to frame 1. Body parts and held weapons stay on the same side in all frames. In every cell the creature is "
         "centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline in "
         "all 8 cells; nothing crosses a cell edge.")
DIRS = {"down": "Walking DOWN toward the camera (front view).", "left": "Walking LEFT (left side view, facing left).",
        "up": "Walking UP away from the camera (back view)."}


def description(num: str, id_: str) -> str:
    text = (WORK / f"p_{num}_{id_}_walk.txt").read_text(encoding="utf-8").split("Image prompt:", 1)[1]
    # só a criatura: a frase antes das instruções de layout ("Make the image SQUARE...")
    return re.split(r"\s*Make the image SQUARE", text.strip(), maxsplit=1)[0].strip()


def job(id_: str, d: str):
    num = MOBS[id_]
    out = OUT / f"{id_}_{d}.png"
    if out.exists():
        return f"{out.name} já existe"
    ref = next(RAW.glob(f"{num}_{id_}_walk.png"))
    prompt = (f"Use your built-in image_gen tool to create exactly ONE image. The attached image is a STYLE AND CREATURE REFERENCE "
              f"from this game; use it as the visual reference for image_gen. Do not write code to draw art. After generating, copy "
              f"the resulting PNG from $CODEX_HOME/generated_images/... to ./raw/walk8/{out.name} and reply only with the source "
              f"path and the final path.\n\nImage prompt:\n{description(num, id_)} {DIRS[d]} {CYCLE} {STYLE}")
    (WORK / f"p_w8_{id_}_{d}.txt").write_text(prompt, encoding="utf-8")
    with open(WORK / f"log_w8_{id_}_{d}.txt", "w", encoding="utf-8") as log:
        subprocess.run(["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ART), "-i", str(ref.relative_to(ART)), "-"],
                       input=prompt, text=True, stdout=log, stderr=subprocess.STDOUT, shell=sys.platform == "win32")
    return f"{out.name}: {'ok' if out.exists() else 'FALHOU'}"


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    ids = sys.argv[1:] or list(MOBS)
    with ThreadPoolExecutor(max_workers=9) as ex:
        for r in ex.map(lambda a: job(*a), [(i, d) for i in ids for d in DIRS]):
            print(r, flush=True)
