#!/usr/bin/env python3
"""Normaliza as folhas brutas dos impactos e do voo dos projéteis (arts/codex/impacts) em quadros prontos para o jogo.

Saída: src/assets/fx/<hit>/frame_0..7.png (128 px), atlas.png e manifest.json, lido por
src/fx/impactFx.js. A célula inteira vira o quadro na mesma escala, então o estouro cresce e
encolhe como foi desenhado. O verde do fundo sai por "verdice" (g acima de r e b), que preserva o
ciano do Getsuga e da flecha Quincy; o resto de verde na borda é puxado para o tom vizinho.

O voo dos projéteis é diferente: os quadros antigos ocupavam a célula inteira (6 a 121 px), e o
plano do jogo foi calibrado para isso. Os 8 quadros são cortados pela caixa que une todos eles e
escalados juntos para caber nessa área, então o voo não pulsa nem treme. O manifesto da pasta e a
entrada no FX_REGISTRY (src/characters.js) recebem frameCount, fps e a fonte nova.

Uso: python geradores/process_impact_fx.py [id ...]   (sem ids: todos os impactos)
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from impact_fx import COLS, IMPACTS, PROJECTILES, ROWS

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "arts" / "codex" / "impacts"
ASSETS = ROOT / "src" / "assets" / "fx"
SIZE = 128
SOLID, CLEAR = 60, 140  # verdice (g - max(r, b)) onde o pixel é todo efeito / todo fundo
EDGE_MARGIN = 2  # px da borda do quadro que precisam ficar vazios
FLIGHT_BOX = 115  # lado da área que o voo antigo ocupava (6 a 121 px)
REGISTRY = ROOT / "src" / "characters.js"


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


def shrink(rgba: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    """Reduz com média pré-multiplicada, para a borda não escurecer nem ganhar véu."""
    a = rgba[..., 3:] / 255
    small = Image.fromarray(np.dstack([rgba[..., :3] * a, rgba[..., 3:]]).astype(np.uint8)).resize(size, Image.Resampling.BOX)
    small = np.asarray(small).astype(np.float32)
    alpha = small[..., 3:]
    rgb = np.where(alpha > 0, small[..., :3] * 255 / np.maximum(alpha, 1), 0)
    return np.dstack([np.clip(rgb, 0, 255), np.where(alpha < 24, 0, alpha)]).astype(np.uint8)


def flight_frames(raw_cells: list[np.ndarray]) -> list[Image.Image]:
    keyed = [key_out_green(c) for c in raw_cells]
    union = np.zeros(keyed[0].shape[:2], bool)
    for k in keyed:
        union |= k[..., 3] > 24
    ys, xs = np.nonzero(union)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    scale = FLIGHT_BOX / max(y1 - y0, x1 - x0)
    size = (max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale)))
    frames = []
    for k in keyed:
        canvas = Image.new("RGBA", (SIZE, SIZE))
        canvas.paste(Image.fromarray(shrink(k[y0:y1, x0:x1], size)), ((SIZE - size[0]) // 2, (SIZE - size[1]) // 2))
        frames.append(canvas)
    return frames


def update_registry(fx_id: str, fps: int, frames: int) -> None:
    text = REGISTRY.read_text(encoding="utf-8")
    start = text.index(f'"{fx_id}": {{')
    end = text.index("}", text.index("worldScale", start))
    block = re.sub(r'"frameCount": \d+', f'"frameCount": {frames}', text[start:end])
    block = re.sub(r'"fps": \d+', f'"fps": {fps}', block)
    block = re.sub(r'"source": "[^"]*"', f'"source": "arts/codex/impacts/{fx_id}.png"', block)
    REGISTRY.write_text(text[:start] + block + text[end:], encoding="utf-8", newline="\n")


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


def save_frames(out: Path, frames: list[Image.Image]) -> None:
    out.mkdir(parents=True, exist_ok=True)
    atlas = Image.new("RGBA", (SIZE * len(frames), SIZE))
    for i, frame in enumerate(frames):
        frame.save(out / f"frame_{i}.png", optimize=True)
        atlas.paste(frame, (i * SIZE, 0))
    atlas.save(out / "atlas.png", optimize=True)


def process_flight(fx_id: str, raw: Path) -> list[str]:
    frames = flight_frames(cells(Image.open(raw)))
    out = ASSETS / fx_id
    save_frames(out, frames)
    manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    fps = PROJECTILES[fx_id]["fps"]
    manifest.update({"source": f"arts/codex/impacts/{fx_id}.png", "frameCount": len(frames), "fps": fps})
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8", newline="\n")
    update_registry(fx_id, fps, len(frames))
    return check(fx_id, frames) or [f"{fx_id}: ok"]


def process(hit: str) -> list[str]:
    raw = RAW / f"{hit}.png"
    if not raw.exists():
        return [f"FALTA {hit}"]
    if hit in PROJECTILES:
        return process_flight(hit, raw)
    frames = [to_frame(c) for c in cells(Image.open(raw))]
    out = ASSETS / hit
    save_frames(out, frames)
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
