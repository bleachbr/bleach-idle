"""Falha se a governança dos docs vivos estiver incoerente."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import governanca


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def main() -> int:
    errors = governanca.check_repo(repo_root())
    if not errors:
        print("docs-check ok")
        return 0
    print(f"docs-check: {len(errors)} erro(s)")
    for error in errors:
        print(f"- {error}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
