#!/usr/bin/env python3
"""Folha de conferência do kit: uma linha por clipe, na escala real do jogo, com a linha do chão.

Uso: python geradores/preview_player_kit.py DIR_DO_KIT SAIDA.png [--view front|side_l|back] [anim ...]
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("kit", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--view", default="side_l")
    parser.add_argument("anims", nargs="*")
    args = parser.parse_args()
    manifest = json.loads((args.kit / "manifest.json").read_text(encoding="utf-8"))
    names = args.anims or list(manifest["anims"])
    sizes = [manifest["anims"][n]["frameSize"] for n in names]
    width = max(s * manifest["anims"][n]["frames"] for n, s in zip(names, sizes))
    sheet = Image.new("RGBA", (width + 90, sum(sizes)), (70, 78, 92, 255))
    draw = ImageDraw.Draw(sheet)
    y = 0
    for name, size in zip(names, sizes):
        strip = Image.open(args.kit / f"{name}_{args.view}.png").convert("RGBA")
        ground = y + round(size * manifest["baselineRatio"])
        draw.line((0, ground, sheet.width, ground), fill=(120, 230, 140, 255))
        draw.text((2, y + 2), f"{name} {size}", fill=(255, 255, 255, 255))
        sheet.alpha_composite(strip, (90, y))
        y += size
    sheet.save(args.out)


if __name__ == "__main__":
    main()
