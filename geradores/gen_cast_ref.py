#!/usr/bin/env python3
"""Cria as poses de referência (frente, perfil esquerdo, costas) de um personagem do elenco que
ainda não tem caminhada no repositório. O kit (gen_player_kit.py) usa essas três imagens como
modelo do personagem.

O Codex desenha as três vistas paradas numa imagem só, lado a lado. Aqui elas são separadas por
mancha, levadas aos 107 px de altura da norma (direcionamento/07) e postas num quadro de 128 com os
pés na baseline. Saída: src/assets/characters/<id>/{front,side_l,side,back}.png.

Uso: python geradores/gen_cast_ref.py ID        (gera a imagem bruta se faltar, depois corta)
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

from kit_cast import CAST
from process_player_kit import BASELINE_RATIO, BODY_HEIGHT, MIN_BLOB_PIXELS, key_out_magenta, label_blobs, render_frame

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "arts" / "codex" / "refs"
STYLE_REFS = ["src/assets/characters/ichigo_shikai/front.png", "src/assets/characters/ishida/front.png"]
VIEWS = ("front", "side_l", "back")

LAYOUT = (
    "FORMAT: LANDSCAPE image, 3:2 aspect, ONE row of 3 equal cells side by side (no visible grid lines), the same "
    "character standing still in a neutral relaxed pose in all three: cell 1 seen from the FRONT facing the camera, cell 2 "
    "seen from his LEFT SIDE facing the left of the image, cell 3 seen from BEHIND facing away. Identical scale, head size "
    "and feet baseline in the three cells; the character is about 60% of the cell height and fully inside each cell with "
    "magenta padding. Same 3/4 top-down camera angle as the references."
)

STYLE = (
    "STYLE: match the attached reference sprites EXACTLY: same pixel-art rendering, same dark outline color #1a1822 and "
    "thickness, same flat shading with light from the top-left, same pixel density. No gradients, no anti-aliasing, no "
    "effects, no shadow on the floor. BACKGROUND: 100% solid flat magenta #FF00FF, no text, no labels, no border."
)


def generate(char: str, out: Path) -> None:
    prompt = ("Use your built-in image_gen tool to create exactly ONE image. The attached images are STYLE references from "
              "this game (other characters, drawn in the art style to match); use them as the visual reference for "
              "image_gen. Do not write code to draw art. After generating, copy the resulting PNG from "
              f"$CODEX_HOME/generated_images/... to ./arts/codex/refs/{out.name} and reply only with the source path and "
              f"the final path.\n\nImage prompt:\n{CAST[char]['character']}\n\n{LAYOUT}\n\n{STYLE}")
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT)]
    for ref in STYLE_REFS:
        cmd += ["-i", ref]
    with open(RAW / f"log_{char}.txt", "w", encoding="utf-8") as log:
        subprocess.run([*cmd, "-"], input=prompt, text=True, encoding="utf-8", stdout=log,
                       stderr=subprocess.STDOUT, shell=sys.platform == "win32")


def split_views(sheet: Image.Image) -> list[np.ndarray]:
    """Três figuras, da esquerda para a direita, cada uma com todas as manchas da sua terça parte."""
    rgb = np.asarray(sheet.convert("RGB"))
    third = sheet.width / 3
    groups: list[list[np.ndarray]] = [[], [], []]
    for blob in label_blobs(key_out_magenta(rgb)):
        if len(blob) >= MIN_BLOB_PIXELS:
            groups[min(2, int(blob[:, 1].mean() // third))].append(blob)
    cells = []
    for blobs in groups:
        points = np.concatenate(blobs)
        (y0, x0), (y1, x1) = points.min(axis=0), points.max(axis=0)
        cell = np.full((y1 - y0 + 3, x1 - x0 + 3, 3), (255, 0, 255), dtype=np.uint8)
        cell[points[:, 0] - y0 + 1, points[:, 1] - x0 + 1] = rgb[points[:, 0], points[:, 1]]
        cells.append(cell)
    return cells


def place(cell: np.ndarray, size: int = 128) -> Image.Image:
    img, cx, feet = render_frame(cell, BODY_HEIGHT / (cell.shape[0] - 2))
    frame = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    frame.paste(img, (round(size / 2 - cx), round(size * BASELINE_RATIO - feet)), img)
    return frame


def main() -> None:
    char = sys.argv[1]
    RAW.mkdir(parents=True, exist_ok=True)
    raw = RAW / f"{char}_turnaround.png"
    if not raw.exists():
        generate(char, raw)
    out = ROOT / "src" / "assets" / "characters" / char
    out.mkdir(parents=True, exist_ok=True)
    frames = dict(zip(VIEWS, map(place, split_views(Image.open(raw)))))
    frames["side"] = ImageOps.mirror(frames["side_l"])
    for view, frame in frames.items():
        frame.save(out / f"{view}.png")
    print(f"{char}: referências em {out}")


if __name__ == "__main__":
    main()
