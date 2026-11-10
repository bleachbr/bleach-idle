#!/usr/bin/env python3
"""Gera, pelo Codex CLI (`image_gen` interno), os clipes de ataque e morte dos hollows.

Mesmo formato do kit do jogador (direcionamento/17): uma imagem por clipe e por vista, grade 4x3
paisagem com 12 quadros. O perfil direito é o esquerdo espelhado pelo jogo. As referências são as
poses paradas da caminhada já normalizada, então o design não muda entre caminhada e golpe.

Saída em arts/codex/hollows/ (fora do git). Depois: geradores/process_hollow_clips.py.
Uso: python geradores/gen_hollow_clips.py [--workers N] [hollow[:clip[:vista]] ...]   (sem ids: tudo o que falta)
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from hollow_clip_anims import DIRECTIONS, HOLLOWS

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "arts" / "codex" / "hollows"
REF_VIEWS = ("front", "side_l", "back")

STYLE = (
    "STYLE: match the attached references EXACTLY: same pixel-art rendering, same 3/4 top-down camera angle, same dark "
    "outline color #1a1822 and thickness, same flat shading with light from the top-left, same pixel density. No "
    "gradients, no anti-aliasing, no dithering, no motion blur, no speed lines, no energy effects, no slash trails, no "
    "dust, no blood, no shadow on the floor: visual effects are added separately by the game engine. BACKGROUND: 100% "
    "solid flat magenta #FF00FF in every cell, no floor, no text, no numbers, no labels, no grid lines, no border."
)

GRID = (
    "FORMAT: LANDSCAPE image, 3:2 aspect. A 4x3 grid (4 columns, 3 rows, 12 equal cells, no visible grid lines) showing ONE "
    "continuous 12-frame animation read left to right, top row first. Each frame is a small, clearly different step from "
    "the previous one, with anticipation, follow-through and settle; wings, tail and tendrils drag behind the movement. "
    "SCALE LOCK: the mask has exactly the same size in all 12 cells and the creature is about 60% of the cell height when "
    "standing; never zoom in or out. In every cell the creature is centered and fully inside the cell with magenta padding "
    "on all sides; nothing crosses a cell edge. Do not repeat a pose twice, except where a frame says so."
)


def refs(hollow: str) -> list[str]:
    return [f"src/assets/monsters/{hollow}/{view}.png" for view in REF_VIEWS]


def build_image_prompt(hollow: str, clip_id: str, view: str) -> str:
    spec = HOLLOWS[hollow]
    clip = spec["clips"][clip_id]
    beats = "\n".join(f"Frame {i}: {beat}" for i, beat in enumerate(clip["beats"], start=1))
    return (f"{spec['creature']}\n\nVIEW: {DIRECTIONS[view]} Keep this exact view in all 12 frames; the creature never "
            f"turns to another direction.\n\nACTION: {clip['summary']}\n{beats}\n\n{GRID}\n\n{STYLE}")


def build_codex_prompt(hollow: str, clip_id: str, view: str, out_name: str) -> str:
    return ("Use your built-in image_gen tool to create exactly ONE image. The attached images are references from this "
            "game: they show THIS EXACT creature from the front, left side and back; use them as the visual reference for "
            "image_gen. Do not write code to draw art. After generating, copy the resulting PNG from "
            f"$CODEX_HOME/generated_images/... to ./arts/codex/hollows/{out_name} and reply only with the source path and "
            f"the final path.\n\nImage prompt:\n{build_image_prompt(hollow, clip_id, view)}")


def run_job(task: tuple[str, str, str]) -> str:
    hollow, clip_id, view = task
    out_name = f"{hollow}_{clip_id}_{view}.png"
    if (OUT / out_name).exists():
        return f"{out_name} já existe"
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT)]
    for ref in refs(hollow):
        cmd += ["-i", ref]
    with open(OUT / f"log_{hollow}_{clip_id}_{view}.txt", "w", encoding="utf-8") as log:
        subprocess.run([*cmd, "-"], input=build_codex_prompt(hollow, clip_id, view, out_name), text=True,
                       encoding="utf-8", stdout=log, stderr=subprocess.STDOUT, shell=sys.platform == "win32")
    return f"{out_name}: {'ok' if (OUT / out_name).exists() else 'FALHOU'}"


def expand(arg: str) -> list[tuple[str, str, str]]:
    hollow, _, rest = arg.partition(":")
    clip_id, _, view = rest.partition(":")
    clips = [clip_id] if clip_id else list(HOLLOWS[hollow]["clips"])
    return [(hollow, c, v) for c in clips for v in ([view] if view else DIRECTIONS)]


def main() -> None:
    args = sys.argv[1:]
    workers = 6
    if args[:1] == ["--workers"]:
        workers, args = int(args[1]), args[2:]
    OUT.mkdir(parents=True, exist_ok=True)
    tasks = [t for arg in (args or list(HOLLOWS)) for t in expand(arg)]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for result in pool.map(run_job, tasks):
            print(result, flush=True)


if __name__ == "__main__":
    main()
