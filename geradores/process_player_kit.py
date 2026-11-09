#!/usr/bin/env python3
"""Normaliza as folhas brutas do kit (arts/codex/kit) em tiras prontas para o jogo.

Saída: <out>/<anim>_<front|side_l|back>.png (uma tira horizontal de 12 quadros) e manifest.json.
A vista `side` não existe em disco: o jogo espelha `side_l` pela UV, como a caminhada faz na folha.

Por que não reutiliza o sprite_processor: lá a escala vem da maior caixa da direção. Num ataque, a
caixa inclui a espada, então o corpo encolheria justo no golpe. Aqui a régua é o cabelo laranja, que
tem o mesmo tamanho em qualquer pose. Assim o corpo mantém a escala da caminhada em todas as animações.

Uso: python geradores/process_player_kit.py [--out DIR]
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from player_kit_anims import ANIMS

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "arts" / "codex" / "kit"
DEFAULT_OUT = ROOT / "geradores" / "staging" / "ichigo_shikai_kit"

COLS, ROWS = 4, 3
BODY_HEIGHT = 107  # altura do corpo parado num quadro de 128, a mesma da caminhada (direcionamento/07)
BASELINE_RATIO = 117 / 128
FRAME_SIZES = (128, 160, 192, 224, 256)
VIEWS = {"front": "front", "left": "side_l", "back": "back"}
MARGIN = 4
MIN_BLOB_PIXELS = 12  # ruído da imagem; um dedo ou a ponta da espada têm bem mais do que isso


def key_out_magenta(rgb: np.ndarray) -> np.ndarray:
    """Máscara do personagem. O magenta da IA varia, então vale a dominância de R e B sobre G."""
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return ~((r > 150) & (b > 120) & (r - g > 70) & (b - g > 50))


def despill(rgba: np.ndarray) -> np.ndarray:
    """Tira o resíduo magenta das bordas sem mexer no laranja do cabelo, que tem pouco azul."""
    out = rgba.astype(np.float32)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    spill = (b > g + 12) & (r > g + 12)
    limit = np.maximum(g, 26.0)
    out[..., 0] = np.where(spill, np.minimum(r, limit), r)
    out[..., 2] = np.where(spill, np.minimum(b, limit), b)
    return out.astype(np.uint8)


def label_blobs(mask: np.ndarray) -> list[np.ndarray]:
    """Componentes conexas (8 vizinhos), cada uma como matriz Nx2 de (y, x)."""
    pending = {(int(y), int(x)) for y, x in zip(*np.nonzero(mask))}
    blobs = []
    while pending:
        stack = [pending.pop()]
        points = []
        while stack:
            y, x = stack.pop()
            points.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    near = (y + dy, x + dx)
                    if near in pending:
                        pending.remove(near)
                        stack.append(near)
        blobs.append(np.array(points))
    return blobs


def slice_cells(sheet: Image.Image) -> list[np.ndarray]:
    """Separa os quadros por mancha, não só pela grade: a espada pode cruzar a linha da célula.
    A mancha inteira vai para a célula do seu centro; quem fica de fora vira magenta."""
    rgb = np.asarray(sheet.convert("RGB"))
    cw, ch = sheet.width // COLS, sheet.height // ROWS
    groups: list[list[np.ndarray]] = [[] for _ in range(COLS * ROWS)]
    for blob in label_blobs(key_out_magenta(rgb)):
        if len(blob) < MIN_BLOB_PIXELS:
            continue
        row, col = blob.mean(axis=0)
        groups[min(ROWS - 1, int(row // ch)) * COLS + min(COLS - 1, int(col // cw))].append(blob)
    return [cell_from_blobs(rgb, blobs) for blobs in groups]


def cell_from_blobs(rgb: np.ndarray, blobs: list[np.ndarray]) -> np.ndarray:
    points = np.concatenate(blobs)
    y0, x0 = points.min(axis=0)
    y1, x1 = points.max(axis=0)
    cell = np.zeros((y1 - y0 + 3, x1 - x0 + 3, 3), dtype=np.uint8)
    cell[...] = (255, 0, 255)
    ys, xs = points[:, 0], points[:, 1]
    cell[ys - y0 + 1, xs - x0 + 1] = rgb[ys, xs]
    return cell


def hair_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return (r > 190) & (g > 80) & (g < 170) & (b < 70) & (r - b > 130)


def hair_size(cell: np.ndarray) -> float:
    """Raiz da área da maior mancha laranja. A pele tem tons parecidos, mas nunca forma a maior mancha,
    e a área varia menos que a altura quando a cabeça inclina."""
    return float(np.sqrt(largest_blob_area(hair_mask(cell))))


def largest_blob_area(mask: np.ndarray) -> int:
    pending = {(int(y), int(x)) for y, x in zip(*np.nonzero(mask))}
    best = 0
    while pending:
        stack = [pending.pop()]
        area = 0
        while stack:
            y, x = stack.pop()
            area += 1
            for near in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if near in pending:
                    pending.remove(near)
                    stack.append(near)
        best = max(best, area)
    return best


def body_columns(mask: np.ndarray, rgb: np.ndarray) -> tuple[int, int, float]:
    """Faixa e centro horizontais do hakama e do quimono (pixels escuros), que ignoram a lâmina clara."""
    dark = mask & (rgb.max(axis=2) < 85)
    columns = np.where(dark.sum(axis=0) >= 4)[0]
    if not len(columns):
        columns = np.where(mask.any(axis=0))[0]
    centre = float(np.nonzero(dark)[1].mean()) if dark.any() else float(columns.mean())
    return int(columns[0]), int(columns[-1]), centre


def feet_row(mask: np.ndarray, x0: int, x1: int) -> int:
    """Linha mais baixa só sob o corpo, para a ponta da espada não virar o chão do quadro."""
    rows = np.where(mask[:, max(0, x0 - 6):x1 + 7].any(axis=1))[0]
    return int(rows[-1])


def sheet_cell_limit(view: str, anim_id: str) -> int:
    return int(Image.open(RAW / f"{anim_id}_{view}.png").width / COLS * 1.5)


def render_frame(cell: np.ndarray, scale: float) -> tuple[Image.Image, float, float]:
    """Devolve o quadro escalado e o âncora (centro do corpo, pés) nas coordenadas dele."""
    mask = key_out_magenta(cell)
    x0, x1, centre = body_columns(mask, cell)
    feet = feet_row(mask, x0, x1)
    rgba = np.dstack([cell, (mask * 255).astype(np.uint8)])
    img = Image.fromarray(despill(rgba))
    size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
    premult = Image.fromarray(rgba_premultiply(np.asarray(img))).resize(size, Image.Resampling.LANCZOS)
    return Image.fromarray(unpremultiply(np.asarray(premult))), centre * scale, (feet + 1) * scale


def rgba_premultiply(rgba: np.ndarray) -> np.ndarray:
    out = rgba.astype(np.float32)
    out[..., :3] *= out[..., 3:4] / 255
    return out.astype(np.uint8)


def unpremultiply(rgba: np.ndarray) -> np.ndarray:
    """Interpola sem puxar a cor do fundo e volta a borda dura de pixel art."""
    out = rgba.astype(np.float32)
    alpha = np.maximum(out[..., 3:4], 1)
    out[..., :3] = np.clip(out[..., :3] * 255 / alpha, 0, 255)
    out[..., 3] = (out[..., 3] >= 110) * 255
    return out.astype(np.uint8)


def direction_rulers() -> dict[str, float]:
    """px de cabelo a alcançar por vista: o cabelo do idle quando o corpo parado mede BODY_HEIGHT."""
    rulers = {}
    for view in VIEWS:
        cells = slice_cells(Image.open(RAW / f"idle_{view}.png"))
        ratios = []
        for cell in cells:
            rows = np.where(key_out_magenta(cell).any(axis=1))[0]
            ratios.append(hair_size(cell) / (rows[-1] - rows[0] + 1))
        rulers[view] = float(np.median(ratios)) * BODY_HEIGHT
    return rulers


def fit_frame_size(frames: list[tuple[Image.Image, float, float]]) -> int:
    """Menor quadro em que a arte cabe com os pés na baseline e o corpo centrado."""
    needed = 0.0
    for img, cx, feet in frames:
        ys, xs = np.nonzero(np.asarray(img)[..., 3])
        if not len(xs):
            continue
        half = max(cx - xs.min(), xs.max() + 1 - cx) + MARGIN
        needed = max(needed, half * 2, (feet - ys.min() + MARGIN) / BASELINE_RATIO)
    for size in FRAME_SIZES:
        if size >= needed:
            return size
    return FRAME_SIZES[-1]


def compose_strip(frames: list[tuple[Image.Image, float, float]], size: int) -> Image.Image:
    baseline = round(size * BASELINE_RATIO)
    strip = Image.new("RGBA", (size * len(frames), size), (0, 0, 0, 0))
    for i, (img, cx, feet) in enumerate(frames):
        cell = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        cell.paste(img, (round(size / 2 - cx), round(baseline - feet)), img)
        strip.paste(cell, (i * size, 0))
    return strip


def compress(strip: Image.Image) -> Image.Image:
    """Paleta de 8 bits: com dezenas de tiras, o PNG RGBA pesaria várias vezes mais no download."""
    return strip.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)


def process_anim(anim_id: str, rulers: dict[str, float], out: Path, report: list[str]) -> dict:
    per_view = {}
    for view in VIEWS:
        cells = slice_cells(Image.open(RAW / f"{anim_id}_{view}.png"))
        merged = [i + 1 for i, c in enumerate(cells) if c.shape[1] > sheet_cell_limit(view, anim_id)]
        if merged:
            report.append(f"FUNDIDO {anim_id}_{view}: quadros {merged} largos demais, dois personagens encostados?")
        sizes = [h for h in map(hair_size, cells) if h]
        scale = rulers[view] / float(np.median(sizes))
        per_view[view] = [render_frame(c, scale) for c in cells]
        report.append(f"{anim_id}_{view}: escala {scale:.3f}")
    size = max(fit_frame_size(frames) for frames in per_view.values())
    for view, frames in per_view.items():
        compress(compose_strip(frames, size)).save(out / f"{anim_id}_{VIEWS[view]}.png", optimize=True)
    spec = ANIMS[anim_id]
    return {"fps": spec["fps"], "loop": spec["loop"], "frames": COLS * ROWS, "frameSize": size}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    rulers = direction_rulers()
    report: list[str] = [f"régua de cabelo por vista: {rulers}"]
    catalog = {}
    for anim_id in ANIMS:
        if all((RAW / f"{anim_id}_{view}.png").exists() for view in VIEWS):
            catalog[anim_id] = process_anim(anim_id, rulers, args.out, report)
        else:
            report.append(f"FALTA {anim_id}")
    manifest = {"id": "ichigo_shikai", "baselineRatio": BASELINE_RATIO, "baseFrameSize": 128, "anims": catalog}
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
