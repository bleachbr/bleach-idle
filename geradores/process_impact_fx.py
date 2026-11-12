#!/usr/bin/env python3
"""Normaliza as folhas brutas dos impactos (arts/codex/impacts) em quadros prontos para o jogo.

Saída: src/assets/fx/<hit>/frame_0..7.png (128 px), atlas.png e manifest.json, lido por
src/fx/impactFx.js. A célula inteira vira o quadro na mesma escala, então o estouro cresce e
encolhe como foi desenhado. O verde do fundo sai por "verdice" (g acima de r e b), que preserva o
ciano do Getsuga e da flecha Quincy; o resto de verde na borda é puxado para o tom vizinho.

Uso: python geradores/process_impact_fx.py [hit_id ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from impact_fx import COLS, IMPACTS, ROWS

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "arts" / "codex" / "impacts"
ASSETS = ROOT / "src" / "assets" / "fx"
SIZE = 128
SOLID, CLEAR = 60, 140  # verdice (g - max(r, b)) onde o pixel é todo efeito / todo fundo
EDGE_MARGIN = 2  # px da borda do quadro que precisam ficar vazios


def key_out_green(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb.astype(np.float32)
    other = np.maximum(rgb[..., 0], rgb[..., 2])
    greenness = rgb[..., 1] - other
    alpha = np.clip((CLEAR - greenness) / (CLEAR - SOLID), 0, 1)
    rgb[..., 1] = np.where(greenness > 0, other, rgb[..., 1])  # despill: o efeito não tem verde
    return np.dstack([rgb, alpha * 255])


def to_frame(cell: np.ndarray) -> Image.Image:
    rgba = key_out_green(cell)
    a = rgba[..., 3:] / 255
    small = Image.fromarray(np.dstack([rgba[..., :3] * a, rgba[..., 3:]]).astype(np.uint8))
    small = np.asarray(small.resize((SIZE, SIZE), Image.Resampling.BOX)).astype(np.float32)
    alpha = small[..., 3:]
    rgb = np.where(alpha > 0, small[..., :3] * 255 / np.maximum(alpha, 1), 0)
    alpha = np.where(alpha < 24, 0, alpha)  # sem véu quase transparente em volta do estouro
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha]).astype(np.uint8))


def cells(sheet: Image.Image) -> list[np.ndarray]:
    arr = np.asarray(sheet.convert("RGB"))
    h, w = arr.shape[0] // ROWS, arr.shape[1] // COLS
    side = min(h, w)
    out = []
    for r in range(ROWS):
        for c in range(COLS):
            y, x = r * h + (h - side) // 2, c * w + (w - side) // 2
            out.append(arr[y:y + side, x:x + side])
    return out


def check(hit: str, frames: list[Image.Image]) -> list[str]:
    problems = []
    for i, frame in enumerate(frames):
        a = np.asarray(frame)[..., 3]
        if i < len(frames) - 1 and not a.any():
            problems.append(f"{hit}: quadro {i} vazio")
        if a[:EDGE_MARGIN].any() or a[-EDGE_MARGIN:].any() or a[:, :EDGE_MARGIN].any() or a[:, -EDGE_MARGIN:].any():
            problems.append(f"{hit}: quadro {i} encosta na borda")
    return problems


def process(hit: str) -> list[str]:
    raw = RAW / f"{hit}.png"
    if not raw.exists():
        return [f"FALTA {hit}"]
    frames = [to_frame(c) for c in cells(Image.open(raw))]
    out = ASSETS / hit
    out.mkdir(parents=True, exist_ok=True)
    atlas = Image.new("RGBA", (SIZE * len(frames), SIZE))
    for i, frame in enumerate(frames):
        frame.save(out / f"frame_{i}.png", optimize=True)
        atlas.paste(frame, (i * SIZE, 0))
    atlas.save(out / "atlas.png", optimize=True)
    manifest = {"id": hit, "name": hit.replace("_", " ").title(), "category": "fx", "type": "impact",
                "source": f"arts/codex/impacts/{hit}.png", "targetSize": SIZE, "frameCount": len(frames),
                "fps": IMPACTS[hit]["fps"], "blendMode": "additive"}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return check(hit, frames) or [f"{hit}: ok"]


def main() -> None:
    for hit in sys.argv[1:] or list(IMPACTS):
        print("\n".join(process(hit)))


if __name__ == "__main__":
    main()
