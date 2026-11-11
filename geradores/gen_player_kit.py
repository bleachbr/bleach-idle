#!/usr/bin/env python3
"""Gera, pelo Codex CLI (`image_gen` interno), o kit completo de animações de um personagem jogável.

Cada animação sai em 3 imagens (frente, perfil esquerdo, costas). O perfil direito é o esquerdo
espelhado, como já acontece na caminhada. Cada imagem é uma grade 4x3 com 12 quadros: pedir uma
direção por imagem mantém o desenho mais consistente do que pedir a folha inteira de uma vez.

Saída em arts/codex/kit/<personagem>/ (fora do git). Depois: geradores/process_player_kit.py.
Os prompts não citam nomes de obras: o personagem é descrito pela aparência e pelas referências.
Quem é cada personagem e qual roteiro ele usa está em geradores/kit_cast.py.

Uso: python geradores/gen_player_kit.py [--char ID] [--workers N] [anim[:direção] ...]   (sem ids: tudo o que falta)
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from kit_cast import CAST
from player_kit_anims import DIRECTIONS

ROOT = Path(__file__).resolve().parent.parent
KIT_ROOT = ROOT / "arts" / "codex" / "kit"
DEFAULT_CHAR = "ichigo_shikai"

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
    "spacing, anticipation, follow-through and settle; hair, {garment} drag behind the movement with overlap. "
    "SCALE LOCK: the head has exactly the same size in all 12 cells and the character is about 60% of the cell height when "
    "standing; never zoom in or out. In every cell the character is centered and fully inside the cell with magenta "
    "padding on all sides, including the tip of the weapon and raised arms; nothing crosses a cell edge. Do not repeat a "
    "pose twice."
)


def raw_dir(char: str) -> Path:
    return KIT_ROOT / char


def refs(char: str) -> list[str]:
    return [f"src/assets/characters/{char}/{view}.png" for view in ("front", "side_l", "back")]


def build_image_prompt(char: str, anim_id: str, direction: str) -> str:
    cast = CAST[char]
    anim = cast["anims"][anim_id]
    beats = "\n".join(f"Frame {i}: {beat}" for i, beat in enumerate(anim["beats"], start=1))
    grid = GRID.format(garment=cast["garment"])
    view = DIRECTIONS[direction]
    if direction == "back" and cast.get("back_note"):
        view = f"{view} {cast['back_note']}"
    return (f"{cast['character']}\n\nVIEW: {view} Keep this exact view in all 12 frames; the character "
            f"never turns to another direction.\n\nACTION: {anim['summary']}\n{beats}\n"
            f"{anim.get('loop_note', '')}\n\n{grid}\n\n{STYLE}")


def build_codex_prompt(char: str, anim_id: str, direction: str, out_name: str) -> str:
    return ("Use your built-in image_gen tool to create exactly ONE image. The attached images are references from this "
            "game: they show THIS EXACT character from the front, left side and back; use them as the visual reference "
            "for image_gen. Do not write code to draw art. After generating, copy the resulting PNG from "
            f"$CODEX_HOME/generated_images/... to ./arts/codex/kit/{char}/{out_name} and reply only with the source path "
            f"and the final path.\n\nImage prompt:\n{build_image_prompt(char, anim_id, direction)}")


def run_job(task: tuple[str, str, str]) -> str:
    char, anim_id, direction = task
    out_name = f"{anim_id}_{direction}.png"
    out = raw_dir(char) / out_name
    if out.exists():
        return f"{char}/{out_name} já existe"
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT)]
    for ref in refs(char):
        cmd += ["-i", ref]
    with open(raw_dir(char) / f"log_{anim_id}_{direction}.txt", "w", encoding="utf-8") as log:
        subprocess.run([*cmd, "-"], input=build_codex_prompt(char, anim_id, direction, out_name), text=True,
                       encoding="utf-8", stdout=log, stderr=subprocess.STDOUT, shell=sys.platform == "win32")
    return f"{char}/{out_name}: {'ok' if out.exists() else 'FALHOU'}"


def parse_tasks(char: str, args: list[str]) -> list[tuple[str, str, str]]:
    if not args:
        return [(char, a, d) for a in CAST[char]["anims"] for d in DIRECTIONS]
    tasks = []
    for arg in args:
        anim_id, _, direction = arg.partition(":")
        tasks += [(char, anim_id, d) for d in ([direction] if direction else DIRECTIONS)]
    return tasks


def parse_options(args: list[str]) -> tuple[str, int, list[str]]:
    char, workers = DEFAULT_CHAR, 6
    while args[:1] in (["--char"], ["--workers"]):
        if args[0] == "--char":
            char = args[1]
        else:
            workers = int(args[1])
        args = args[2:]
    return char, workers, args


def main() -> None:
    char, workers, args = parse_options(sys.argv[1:])
    raw_dir(char).mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for result in pool.map(run_job, parse_tasks(char, args)):
            print(result, flush=True)


if __name__ == "__main__":
    main()
