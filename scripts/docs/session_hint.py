"""Lembrete de sessão para Claude, Antigravity e Kiro.

Não marca caixa. stdout vazio quando não há nada a dizer, exceto o Stop
do Antigravity, que sempre emite decision.
`--format text` é texto puro. `--format antigravity` emite injectSteps.
`--format claude-stop` emite hookSpecificOutput.additionalContext, ou nada
se o stdin tiver stop_hook_active true.
`--format antigravity-stop` emite decision continue/stop. injectSteps nesse
evento é ignorado. executionNum maior que 1 força stop.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import governanca

CODE_PREFIXES = (
    "src/",
    "geradores/",
    "index.html",
    "preview.html",
    "vite.config.js",
)
DOC_PATHS = (
    "docs/ROADMAP.md",
    "docs/STATUS.md",
    "docs/pendencias.md",
    "docs/aprendizados.md",
    "docs/_arquivo/changelog-entregas.md",
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _git(root: Path, args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return ""
    return result.stdout


def _paths_from_status(porcelain: str) -> list[str]:
    paths = []
    for line in porcelain.splitlines():
        if len(line) < 4:
            continue
        raw = line[3:]
        if " -> " in raw:
            raw = raw.split(" -> ", 1)[1]
        paths.append(raw.strip())
    return paths


def changed_paths(root: Path) -> list[str]:
    paths = _paths_from_status(_git(root, ["status", "--porcelain"]))
    base = _git(root, ["merge-base", "HEAD", "main"]).strip()
    if base:
        committed = _git(root, ["diff", "--name-only", f"{base}..HEAD"])
        paths.extend(line.strip() for line in committed.splitlines() if line.strip())
    return paths


def _touches(path: str, prefixes: tuple[str, ...]) -> bool:
    return any(path == prefix or path.startswith(prefix) for prefix in prefixes)


def start_text(root: Path) -> str:
    branch = _git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).strip() or "(sem branch)"
    roadmap = (root / "docs/ROADMAP.md").read_text(encoding="utf-8")
    sections = [
        item
        for item in governanca.roadmap_sections(roadmap)
        if item["title"] != "__stray__"
    ]
    opened = sum(item["open"] for item in sections)
    done = sum(item["done"] for item in sections)
    status = (root / "docs/STATUS.md").read_text(encoding="utf-8")
    date = governanca.DATE_RE.search(status)
    updated = date.group(1) if date else "sem data"
    return (
        "Estado da sessão (bleachbr)\n"
        f"Branch: {branch}\n"
        f"Roadmap: {opened} abertos, {done} entregues (docs/ROADMAP.md)\n"
        f"STATUS: {updated}\n"
        "Leia só o trecho que a tarefa pede. Ao mudar estado do jogo ou da doc viva, "
        "use a skill fechamento-sessao e rode `make docs-sync` e `make docs-check`."
    )


def stop_text(root: Path) -> str:
    paths = changed_paths(root)
    code_changed = any(_touches(path, CODE_PREFIXES) for path in paths)
    docs_changed = any(path in DOC_PATHS for path in paths)
    if not code_changed or docs_changed:
        return ""
    return (
        "Código do jogo mudou e nenhum doc vivo mudou com ele "
        "(docs/ROADMAP.md, docs/STATUS.md, docs/pendencias.md, "
        "docs/aprendizados.md, docs/_arquivo/changelog-entregas.md). "
        "Rode a skill fechamento-sessao. Se o estado do produto não mudou, "
        "diga isso na resposta e não invente uma entrega."
    )


def stop_hook_active(raw: str) -> bool:
    if not raw.strip():
        return False
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return False
    if not isinstance(payload, dict):
        return False
    return payload.get("stop_hook_active") is True


def antigravity_execution_num(raw: str) -> int | None:
    if not raw.strip():
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    number = payload.get("executionNum")
    if isinstance(number, bool) or not isinstance(number, int):
        return None
    return number


def antigravity_stop_body(text: str) -> str:
    if not text:
        payload = {"decision": "stop"}
    else:
        payload = {"decision": "continue", "reason": text}
    return json.dumps(payload, ensure_ascii=False)


def claude_stop_body(text: str) -> str:
    return json.dumps(
        {
            "hookSpecificOutput": {
                "hookEventName": "Stop",
                "additionalContext": text,
            }
        },
        ensure_ascii=False,
    )


def emit(text: str, fmt: str) -> None:
    if fmt == "antigravity":
        payload: dict = {}
        if text:
            payload = {"injectSteps": [{"userMessage": text}]}
        sys.stdout.write(json.dumps(payload, ensure_ascii=False))
        return
    if fmt == "antigravity-stop":
        sys.stdout.write(antigravity_stop_body(text))
        return
    if fmt == "claude-stop":
        if text:
            sys.stdout.write(claude_stop_body(text))
        return
    if text:
        sys.stdout.write(text if text.endswith("\n") else text + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", choices=("start", "stop"), required=True)
    parser.add_argument(
        "--format",
        choices=("text", "antigravity", "claude-stop", "antigravity-stop"),
        default="text",
    )
    args = parser.parse_args()
    continued = False
    if not sys.stdin.isatty() and args.format in ("claude-stop", "antigravity-stop"):
        raw = sys.stdin.read()
        if args.format == "claude-stop" and stop_hook_active(raw):
            return 0
        number = antigravity_execution_num(raw)
        continued = number is not None and number > 1
    root = repo_root()
    try:
        text = start_text(root) if args.event == "start" else stop_text(root)
    except OSError:
        text = ""
    if args.format == "antigravity-stop" and continued:
        text = ""
    emit(text, args.format)
    return 0


if __name__ == "__main__":
    sys.exit(main())
