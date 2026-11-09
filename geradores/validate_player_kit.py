#!/usr/bin/env python3
"""Gate do kit de animações: nada entra em src/assets sem passar (direcionamento/07 e 17).

Confere, em cada tira: se está completa, se os pés estão na baseline, se sobrou magenta e se a arte
não encosta na borda do quadro (seria um pedaço cortado na tela).
Uso: python geradores/validate_player_kit.py [--dir CAMINHO]
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from player_kit_anims import ANIMS

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIR = ROOT / "src" / "assets" / "characters" / "ichigo_shikai" / "anims"
VIEWS = ("front", "side_l", "back")
BASELINE_TOLERANCE_PX = 2
MAGENTA_LIMIT = 8


def frames_of(strip: np.ndarray, size: int) -> list[np.ndarray]:
    return [strip[:, i * size:(i + 1) * size] for i in range(strip.shape[1] // size)]


def check_frame(frame: np.ndarray, baseline: int, label: str) -> list[str]:
    alpha = frame[..., 3] > 0
    if not alpha.any():
        return [f"{label}: quadro vazio"]
    errors = []
    dark = alpha & (frame[..., :3].max(axis=2) < 85)
    columns = np.where(dark.any(axis=0))[0] if dark.any() else np.where(alpha.any(axis=0))[0]
    feet = np.where(alpha[:, max(0, columns[0] - 6):columns[-1] + 7].any(axis=1))[0][-1] + 1
    if abs(int(feet) - baseline) > BASELINE_TOLERANCE_PX:
        errors.append(f"{label}: pés em {feet}, baseline {baseline}")
    if alpha[0].any() or alpha[:, 0].any() or alpha[:, -1].any():
        errors.append(f"{label}: arte encosta na borda do quadro")
    r, g, b = (frame[..., i].astype(int) for i in range(3))
    magenta = alpha & (r > 170) & (b > 140) & (r - g > 90) & (b - g > 70)
    if magenta.sum() > MAGENTA_LIMIT:
        errors.append(f"{label}: {magenta.sum()} pixels magenta")
    return errors


def check_anim(kit: Path, anim: str, clip: dict, baseline_ratio: float) -> list[str]:
    errors = []
    size = clip["frameSize"]
    for view in VIEWS:
        path = kit / f"{anim}_{view}.png"
        if not path.exists():
            errors.append(f"{path.name}: não existe")
            continue
        strip = np.asarray(Image.open(path).convert("RGBA"))
        if strip.shape[0] != size or strip.shape[1] != size * clip["frames"]:
            errors.append(f"{path.name}: dimensões {strip.shape[:2]}")
            continue
        for i, frame in enumerate(frames_of(strip, size)):
            errors += check_frame(frame, round(size * baseline_ratio), f"{anim}_{view}#{i + 1}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", type=Path, default=DEFAULT_DIR)
    args = parser.parse_args()
    manifest = json.loads((args.dir / "manifest.json").read_text(encoding="utf-8"))
    errors = [f"{a}: fora do manifesto" for a in ANIMS if a not in manifest["anims"]]
    for anim, clip in manifest["anims"].items():
        errors += check_anim(args.dir, anim, clip, manifest["baselineRatio"])
    print("\n".join(errors) if errors else f"kit ok: {len(manifest['anims'])} clipes, {len(VIEWS)} vistas")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
