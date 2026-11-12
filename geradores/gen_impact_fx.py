#!/usr/bin/env python3
"""Gera, pelo Codex CLI (`image_gen` interno), as folhas dos impactos e do voo dos projéteis (geradores/impact_fx.py).

Uma imagem por efeito: grade 4x2 com 8 quadros sobre verde puro. A referência é o voo antigo da
mesma habilidade, para manter a paleta e o traço que o jogador já conhece.

Saída em arts/codex/impacts/ (fora do git), com o nome do id. Depois: geradores/process_impact_fx.py.
Uso: python geradores/gen_impact_fx.py [--workers N] [id ...]   (sem ids: todos os impactos e projéteis que faltam)
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from impact_fx import IMPACTS, PROJECTILES

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "arts" / "codex" / "impacts"

GRID = (
    "FORMAT: LANDSCAPE image, 2:1 aspect. A 4x2 grid (4 columns, 2 rows, 8 equal square cells, no visible grid lines) "
    "showing ONE continuous 8-frame impact animation read left to right, top row first. Frame 1 is the very first instant "
    "of contact (small and bright), frames 2-3 are the biggest, brightest burst, frames 4-6 break apart and spread, "
    "frames 7-8 are thin fading remnants, and frame 8 is almost empty. The burst is centered in every cell, seen in the "
    "same 3/4 top-down game camera, and always stays fully inside its cell with background padding on all sides; nothing "
    "crosses a cell edge. No character, no creature, no weapon, no hand: only the energy effect."
)

FLIGHT_GRID = (
    "FORMAT: LANDSCAPE image, 2:1 aspect. A 4x2 grid (4 columns, 2 rows, 8 equal square cells, no visible grid lines) "
    "showing ONE seamless LOOPING 8-frame flight animation read left to right, top row first; frame 8 flows straight "
    "back into frame 1. SIZE LOCK: the effect has the same size and the same position in all 8 cells, centered, flying "
    "toward the RIGHT of the image in a side view; only its inner details move. It always stays fully inside its cell "
    "with background padding on all sides; nothing crosses a cell edge. No impact, no explosion, no fade-out, no "
    "character, no creature, no weapon, no hand: only the flying energy effect."
)

STYLE = (
    "STYLE: match the attached reference EXACTLY: the same crisp pixel-art rendering, the same palette, the same dark "
    "outline color and thickness, the same pixel density, hard pixel edges. No anti-aliasing, no soft glow halo, no "
    "gradients into the background. BACKGROUND: 100% solid flat pure green #00FF00 in every cell, no floor, no shadow, "
    "no text, no numbers, no labels, no grid lines, no border. Never use green in the effect itself."
)


def build_image_prompt(fx_id: str) -> str:
    if fx_id in PROJECTILES:
        spec = PROJECTILES[fx_id]
        return (f"A 2D game projectile visual effect: {spec['look']} (exactly as in the attached reference). "
                f"ANIMATION: {spec['motion']}.\n\n{FLIGHT_GRID}\n\n{STYLE}")
    spec = IMPACTS[fx_id]
    return (f"A 2D game hit-impact visual effect. The energy looks like {spec['look']} (exactly as in the attached "
            f"reference). ANIMATION: {spec['burst']}.\n\n{GRID}\n\n{STYLE}")


def build_codex_prompt(fx_id: str) -> str:
    return ("Use your built-in image_gen tool to create exactly ONE image. The attached image is a reference from this "
            "game: the current in-flight sprite of the same attack; use it as the visual reference for image_gen. Do not "
            "write code to draw art. After generating, copy the resulting PNG from $CODEX_HOME/generated_images/... to "
            f"./arts/codex/impacts/{fx_id}.png and reply only with the source path and the final path.\n\n"
            f"Image prompt:\n{build_image_prompt(fx_id)}")


def reference(fx_id: str) -> str:
    return f"src/assets/fx/{fx_id if fx_id in PROJECTILES else IMPACTS[fx_id]['ref']}/atlas.png"


def run_job(hit_id: str) -> str:
    out = OUT / f"{hit_id}.png"
    if out.exists():
        return f"{out.name} já existe"
    ref = reference(hit_id)
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT), "-i", ref, "-"]
    with open(OUT / f"log_{hit_id}.txt", "w", encoding="utf-8") as log:
        subprocess.run(cmd, input=build_codex_prompt(hit_id), text=True, encoding="utf-8", stdout=log,
                       stderr=subprocess.STDOUT, shell=sys.platform == "win32")
    return f"{out.name}: {'ok' if out.exists() else 'FALHOU'}"


def main() -> None:
    args = sys.argv[1:]
    workers = 6
    if args[:1] == ["--workers"]:
        workers, args = int(args[1]), args[2:]
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for result in pool.map(run_job, args or [*IMPACTS, *PROJECTILES]):
            print(result, flush=True)


if __name__ == "__main__":
    main()
