#!/usr/bin/env python3
"""Gate dos clipes dos hollows: o mesmo do kit do jogador (pés na baseline, sem magenta, sem corte
na borda, tira completa), aplicado a src/assets/monsters/<hollow>/clips.

Uso: python geradores/validate_hollow_clips.py [hollow ...]
"""
import json
import sys
from pathlib import Path

from hollow_clip_anims import HOLLOWS
from validate_player_kit import check_anim

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "src" / "assets" / "monsters"


def check_hollow(hollow: str) -> list[str]:
    clips_dir = ASSETS / hollow / "clips"
    manifest_path = clips_dir / "manifest.json"
    if not manifest_path.exists():
        return [f"{hollow}: sem manifest.json"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors = [f"{hollow}_{c}: fora do manifesto" for c in HOLLOWS[hollow]["clips"] if c not in manifest["anims"]]
    for clip_id, clip in manifest["anims"].items():
        errors += [f"{hollow}: {e}" for e in check_anim(clips_dir, clip_id, clip, manifest["baselineRatio"])]
    return errors


def main() -> int:
    hollows = sys.argv[1:] or list(HOLLOWS)
    errors = [e for h in hollows for e in check_hollow(h)]
    print("\n".join(errors) if errors else f"clipes ok: {', '.join(hollows)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
