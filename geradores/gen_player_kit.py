#!/usr/bin/env python3
"""Gera, pelo Codex CLI (`image_gen` interno), o kit completo de animações do personagem principal.

Cada animação sai em 3 imagens (frente, perfil esquerdo, costas). O perfil direito é o esquerdo
espelhado, como já acontece na caminhada. Cada imagem é uma grade 4x3 com 12 quadros: pedir uma
direção por imagem mantém o desenho mais consistente do que pedir a folha inteira de uma vez.

Saída em arts/codex/kit/ (fora do git). Depois: geradores/process_player_kit.py.
Os prompts não citam nomes de obras: o personagem é descrito pela aparência e pelas referências.

Uso: python geradores/gen_player_kit.py [--workers N] [anim[:direção] ...]   (sem ids: tudo o que falta)
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from player_kit_anims import ANIMS, DIRECTIONS

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "arts" / "codex" / "kit"
REF_DIR = "src/assets/characters/ichigo_shikai"
REFS = [f"{REF_DIR}/front.png", f"{REF_DIR}/side_l.png", f"{REF_DIR}/back.png"]

CHARACTER = (
    "THE CHARACTER (identical in every frame, copied from the attached reference sprites): a young man with short spiky "
    "bright orange hair, black kimono-style robe with wide black hakama trousers, white sash at the waist, white socks "
    "and straw sandals, a brown diagonal strap across the chest. His weapon is a huge cleaver-shaped greatsword as long "
    "as his body, with a broad white-silver blade, a short black wrapped handle and no guard. When a beat says the sword "
    "is on his back, it hangs diagonally behind him exactly as in the references. Same proportions and head size always."
)

STYLE = (
    "STYLE: match the attached references EXACTLY: same pixel-art rendering, same 3/4 top-down camera angle, same dark "
    "outline color #1a1822 and thickness, same flat shading with light from the top-left, same pixel density. No "
    "gradients, no anti-aliasing, no dithering, no motion blur, no speed lines, no energy effects, no slash trails, no "
    "dust, no shadow on the floor unless the beat explicitly asks: visual effects are added separately by the game engine. "
    "BACKGROUND: 100% solid flat magenta #FF00FF in every cell, no floor, no text, no numbers, no labels, no grid lines, "
    "no border."
)

GRID = (
    "FORMAT: LANDSCAPE image, 3:2 aspect. A 4x3 grid (4 columns, 3 rows, 12 equal cells, no visible grid lines) showing ONE "
    "continuous 12-frame animation read left to right, top row first. This is professional hand-keyed animation: each "
    "frame is a small, clearly different step from the previous one, so that it reads smoothly when played back, with "
    "spacing, anticipation, follow-through and settle; hair, robe sleeves and hakama drag behind the movement with overlap. "
    "SCALE LOCK: the head has exactly the same size in all 12 cells and the character is about 60% of the cell height when "
    "standing; never zoom in or out. In every cell the character is centered and fully inside the cell with magenta "
    "padding on all sides, including the tip of the sword and raised arms; nothing crosses a cell edge. Do not repeat a "
    "pose twice."
)


def build_image_prompt(anim_id: str, direction: str) -> str:
    anim = ANIMS[anim_id]
    beats = "\n".join(f"Frame {i}: {beat}" for i, beat in enumerate(anim["beats"], start=1))
    return (f"{CHARACTER}\n\nVIEW: {DIRECTIONS[direction]} Keep this exact view in all 12 frames; the character never "
            f"turns to another direction.\n\nACTION: {anim['summary']}\n{beats}\n"
            f"{anim.get('loop_note', '')}\n\n{GRID}\n\n{STYLE}")


def build_codex_prompt(anim_id: str, direction: str, out_name: str) -> str:
    return ("Use your built-in image_gen tool to create exactly ONE image. The attached images are references from this "
            "game: they show THIS EXACT character from the front, left side and back; use them as the visual reference "
            "for image_gen. Do not write code to draw art. After generating, copy the resulting PNG from "
            f"$CODEX_HOME/generated_images/... to ./arts/codex/kit/{out_name} and reply only with the source path and "
            f"the final path.\n\nImage prompt:\n{build_image_prompt(anim_id, direction)}")


def run_job(task: tuple[str, str]) -> str:
    anim_id, direction = task
    out_name = f"{anim_id}_{direction}.png"
    out = OUT / out_name
    if out.exists():
        return f"{out_name} já existe"
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT)]
    for ref in REFS:
        cmd += ["-i", ref]
    with open(OUT / f"log_{anim_id}_{direction}.txt", "w", encoding="utf-8") as log:
        subprocess.run([*cmd, "-"], input=build_codex_prompt(anim_id, direction, out_name), text=True, encoding="utf-8",
                       stdout=log, stderr=subprocess.STDOUT, shell=sys.platform == "win32")
    return f"{out_name}: {'ok' if out.exists() else 'FALHOU'}"


def parse_tasks(args: list[str]) -> list[tuple[str, str]]:
    if not args:
        return [(a, d) for a in ANIMS for d in DIRECTIONS]
    tasks = []
    for arg in args:
        anim_id, _, direction = arg.partition(":")
        tasks += [(anim_id, d) for d in ([direction] if direction else DIRECTIONS)]
    return tasks


def main() -> None:
    args = sys.argv[1:]
    workers = 6
    if args[:1] == ["--workers"]:
        workers, args = int(args[1]), args[2:]
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for result in pool.map(run_job, parse_tasks(args)):
            print(result, flush=True)


if __name__ == "__main__":
    main()
