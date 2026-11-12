#!/usr/bin/env python3
"""Normaliza as folhas brutas dos clipes dos hollows (arts/codex/hollows) em tiras prontas para o jogo.

Saída: src/assets/monsters/<hollow>/clips/<clip>_<front|side_l|back>.png (tira de 12 quadros) e
manifest.json. A vista `side` é o `side_l` espelhado pela UV, como no kit do jogador.

A régua é o quadro 1, que o roteiro fixa como a pose parada da caminhada: ele passa a medir os
mesmos 107 px do walk8, e a imagem inteira usa essa escala. O monstro não tem uma mancha de cor
estável como o cabelo do jogador, e a caixa de um golpe ou de uma queda mediria a pose, não o corpo.

Com `hollow:clip`, processa só aquele clipe e o acrescenta ao manifesto que já existe, sem tocar
nas outras tiras (os brutos delas podem nem estar nesta máquina).

Uso: python geradores/process_hollow_clips.py [hollow[:clip] ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from hollow_clip_anims import HOLLOWS
from process_player_kit import (BASELINE_RATIO, BODY_HEIGHT, COLS, ROWS, compose_strip, compress, despill,
                                fit_frame_size, key_out_magenta, rgba_premultiply, slice_cells, unpremultiply)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "arts" / "codex" / "hollows"
ASSETS = ROOT / "src" / "assets" / "monsters"
VIEWS = {"front": "front", "left": "side_l", "back": "back"}
FOOT_BAND = 0.15  # fração de baixo da figura que define o centro: os pés, não o braço esticado


def figure_height(cell: np.ndarray) -> int:
    rows = np.where(key_out_magenta(cell).any(axis=1))[0]
    return int(rows[-1] - rows[0] + 1)


def anchor(mask: np.ndarray) -> tuple[float, int]:
    """Centro horizontal da faixa dos pés e a linha do chão do quadro."""
    rows = np.where(mask.any(axis=1))[0]
    band = mask[rows[-1] - max(1, int((rows[-1] - rows[0]) * FOOT_BAND)):rows[-1] + 1]
    return float(np.nonzero(band)[1].mean()), int(rows[-1])


def edge_despill(rgba: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Despill só no contorno. O Shrieker é roxo: o despill do jogador, aplicado ao corpo todo,
    trata o roxo como resíduo de magenta e deixa o monstro cinza."""
    inner = mask.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
        inner &= np.roll(mask, (dy, dx), axis=(0, 1))
    cleaned = despill(rgba)
    return np.where((mask & ~inner)[..., None], cleaned, rgba)


def render_frame(cell: np.ndarray, scale: float) -> tuple[Image.Image, float, float]:
    mask = key_out_magenta(cell)
    centre, feet = anchor(mask)
    rgba = Image.fromarray(edge_despill(np.dstack([cell, (mask * 255).astype(np.uint8)]), mask))
    size = (max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale)))
    resized = Image.fromarray(rgba_premultiply(np.asarray(rgba))).resize(size, Image.Resampling.LANCZOS)
    return Image.fromarray(unpremultiply(np.asarray(resized))), centre * scale, (feet + 1) * scale


def process_clip(hollow: str, clip_id: str, out: Path, report: list[str]) -> dict:
    per_view = {}
    for view in VIEWS:
        cells = slice_cells(Image.open(RAW / f"{hollow}_{clip_id}_{view}.png"))
        empty = [i + 1 for i, c in enumerate(cells) if c.shape[0] < 4]
        if empty:
            report.append(f"VAZIO {hollow}_{clip_id}_{view}: quadros {empty}")
        scale = BODY_HEIGHT / figure_height(cells[0])
        per_view[view] = [render_frame(c, scale) for c in cells]
        report.append(f"{hollow}_{clip_id}_{view}: escala {scale:.3f}")
    size = max(fit_frame_size(frames) for frames in per_view.values())
    for view, frames in per_view.items():
        compress(compose_strip(frames, size)).save(out / f"{clip_id}_{VIEWS[view]}.png", optimize=True)
    spec = HOLLOWS[hollow]["clips"][clip_id]
    return {"fps": spec["fps"], "loop": spec["loop"], "frames": COLS * ROWS, "frameSize": size}


def process_hollow(hollow: str, report: list[str], only: str = "") -> None:
    out = ASSETS / hollow / "clips"
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "manifest.json"
    catalog = json.loads(manifest_path.read_text(encoding="utf-8"))["anims"] if only and manifest_path.exists() else {}
    for clip_id in [only] if only else HOLLOWS[hollow]["clips"]:
        if all((RAW / f"{hollow}_{clip_id}_{view}.png").exists() for view in VIEWS):
            catalog[clip_id] = process_clip(hollow, clip_id, out, report)
        else:
            report.append(f"FALTA {hollow}_{clip_id}")
    manifest = {"id": hollow, "baselineRatio": BASELINE_RATIO, "baseFrameSize": 128, "anims": catalog}
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    report: list[str] = []
    for arg in sys.argv[1:] or list(HOLLOWS):
        hollow, _, only = arg.partition(":")
        process_hollow(hollow, report, only)
    print("\n".join(report))


if __name__ == "__main__":
    main()
