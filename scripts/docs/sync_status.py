"""Reescreve o bloco de progresso de docs/STATUS.md a partir do ROADMAP."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import governanca


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def sync(root: Path | None = None) -> str:
    root = root or repo_root()
    roadmap = (root / "docs/ROADMAP.md").read_text(encoding="utf-8")
    status_path = root / "docs/STATUS.md"
    status = status_path.read_text(encoding="utf-8")
    block = governanca.render_progress(governanca.roadmap_sections(roadmap))
    updated = governanca.replace_progress(status, block)
    if updated != status:
        status_path.write_text(updated, encoding="utf-8")
    return block


def main() -> int:
    sync()
    return 0


if __name__ == "__main__":
    sys.exit(main())
