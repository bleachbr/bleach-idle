"""Regras puras da governança dos docs vivos.

Cada fato mora num arquivo. Este módulo só mede se a estrutura ainda fecha:
numeração, motivo da pendência, bloco de progresso e links relativos.
"""

from __future__ import annotations

import re
from pathlib import Path

PROGRESS_START = "<!-- docs:progress:start -->"
PROGRESS_END = "<!-- docs:progress:end -->"

DATE_RE = re.compile(r"\*\*Última atualização:\*\*\s*(\d{4}-\d{2}-\d{2})")
NUMBERED_HEADING_RE = re.compile(r"^##\s+(\d+)\.\s+(\S.*)$")
IMPACT_RE = re.compile(r"\*\*Impacto:\*\*\s*(alto|médio|baixo)\b")
REASON_RE = re.compile(r"\*\*Por que não resolvido aqui:\*\*\s*(\S.*)")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")

ALLOWED_REASONS = (
    "fora do escopo",
    "depende de terceiro",
    "decisão de outra pessoa",
    "falta evidência medida",
)

LIVING_DATES = (
    "docs/STATUS.md",
    "docs/ROADMAP.md",
    "docs/pendencias.md",
    "docs/aprendizados.md",
)


def _outside_fences(text: str):
    in_fence = False
    for line in text.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            yield line


def roadmap_sections(text: str) -> list[dict]:
    sections: list[dict] = []
    current: dict | None = None
    seen_heading = False
    stray = 0
    for line in _outside_fences(text):
        if line.startswith("## "):
            seen_heading = True
            current = {"title": line[3:].strip(), "open": 0, "done": 0}
            sections.append(current)
            continue
        stripped = line.strip()
        is_open = stripped.startswith("- [ ]")
        is_done = stripped.startswith("- [x]") or stripped.startswith("- [X]")
        if not (is_open or is_done):
            continue
        if not seen_heading or current is None:
            stray += 1
            continue
        if is_open:
            current["open"] += 1
        else:
            current["done"] += 1
    if stray:
        sections.append({"title": "__stray__", "open": stray, "done": 0})
    return sections


def render_progress(sections: list[dict]) -> str:
    visible = [item for item in sections if item["title"] != "__stray__"]
    total_open = sum(item["open"] for item in visible)
    total_done = sum(item["done"] for item in visible)
    lines = [
        PROGRESS_START,
        "Gerado por `make docs-sync` a partir das caixas de `docs/ROADMAP.md`. Não edite este bloco à mão.",
        "",
        "| Frente | Abertos | Entregues |",
        "|---|---:|---:|",
    ]
    for item in visible:
        title = item["title"].replace("|", "/")
        lines.append(f"| {title} | {item['open']} | {item['done']} |")
    lines.append(f"| **Total** | **{total_open}** | **{total_done}** |")
    lines.append(PROGRESS_END)
    return "\n".join(lines)


def replace_progress(status: str, block: str) -> str:
    start = status.find(PROGRESS_START)
    end = status.find(PROGRESS_END)
    if start < 0 or end < 0 or end < start:
        raise ValueError(
            "docs/STATUS.md sem o par <!-- docs:progress:start/end -->"
        )
    end += len(PROGRESS_END)
    return status[:start] + block + status[end:]


def progress_block(status: str) -> str:
    start = status.find(PROGRESS_START)
    end = status.find(PROGRESS_END)
    if start < 0 or end < 0 or end < start:
        return ""
    return status[start : end + len(PROGRESS_END)]


def _numbered_items(text: str) -> tuple[list[str], list[tuple[int, str, str]]]:
    errors: list[str] = []
    items: list[tuple[int, str, str]] = []
    current_number: int | None = None
    current_title = ""
    body: list[str] = []

    def flush() -> None:
        if current_number is None:
            return
        items.append((current_number, current_title, "\n".join(body)))

    for line in text.splitlines():
        match = NUMBERED_HEADING_RE.match(line)
        if match:
            flush()
            current_number = int(match.group(1))
            current_title = match.group(2).strip()
            body = []
            continue
        if line.startswith("## "):
            errors.append(f"heading sem número: {line}")
            flush()
            current_number = None
            body = []
            continue
        if current_number is not None:
            body.append(line)
    flush()
    seen: dict[int, str] = {}
    for number, title, _body in items:
        if number in seen:
            errors.append(
                f"número {number} repetido ({seen[number]!r} e {title!r})"
            )
        seen[number] = title
    return errors, items


def check_pendencias(text: str) -> list[str]:
    errors, items = _numbered_items(text)
    if not items:
        errors.append("docs/pendencias.md não tem item `## N. título`")
    for number, title, body in items:
        if not IMPACT_RE.search(body):
            errors.append(f"pendência {number} ({title}) sem **Impacto:** alto|médio|baixo")
        reason = REASON_RE.search(body)
        if reason is None:
            errors.append(f"pendência {number} ({title}) sem **Por que não resolvido aqui:**")
            continue
        reason_text = reason.group(1).lower()
        if not any(allowed in reason_text for allowed in ALLOWED_REASONS):
            allowed = ", ".join(ALLOWED_REASONS)
            errors.append(
                f"pendência {number} ({title}) com motivo fora da lista: {allowed}"
            )
    return errors


def check_aprendizados(text: str) -> list[str]:
    errors, items = _numbered_items(text)
    if not items:
        errors.append("docs/aprendizados.md não tem item `## N. título`")
    for number, title, body in items:
        if "**Causa raiz:**" not in body:
            errors.append(f"aprendizado {number} ({title}) sem **Causa raiz:**")
        if "**Evidência:**" not in body:
            errors.append(f"aprendizado {number} ({title}) sem **Evidência:**")
    return errors


def check_date(text: str, label: str) -> list[str]:
    if DATE_RE.search(text):
        return []
    return [f"{label} sem **Última atualização:** YYYY-MM-DD"]


def check_entregas(text: str) -> list[str]:
    errors = []
    if "docs/ROADMAP.md" not in text:
        errors.append("ENTREGAS_ROADMAP.md não aponta para docs/ROADMAP.md")
    for line in _outside_fences(text):
        stripped = line.strip()
        if stripped.startswith("- [ ]") or stripped.startswith("- [x]") or stripped.startswith("- [X]"):
            errors.append(
                "ENTREGAS_ROADMAP.md voltou a ter caixa de roadmap; a fonte é docs/ROADMAP.md"
            )
            break
    return errors


def markdown_links(text: str) -> list[str]:
    visible = "\n".join(_outside_fences(text))
    return [match.group(1) for match in LINK_RE.finditer(visible)]


def check_links(root: Path, relative_files: list[str]) -> list[str]:
    errors = []
    for relative in relative_files:
        path = root / relative
        if not path.is_file():
            errors.append(f"arquivo esperado ausente: {relative}")
            continue
        text = path.read_text(encoding="utf-8")
        for target in markdown_links(text):
            if target.startswith("file:"):
                errors.append(
                    f"{relative} usa link file:// ({target}); use caminho relativo"
                )
                continue
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            clean = target.split("#", 1)[0]
            if not clean:
                continue
            resolved = (path.parent / clean).resolve()
            if not resolved.exists():
                errors.append(f"{relative} aponta para {target}, que não existe")
    return errors


def check_repo(root: Path) -> list[str]:
    errors: list[str] = []
    for relative in (*LIVING_DATES, "docs/_arquivo/changelog-entregas.md", "docs/README.md"):
        if not (root / relative).is_file():
            errors.append(f"arquivo esperado ausente: {relative}")
    if errors:
        return errors

    status = (root / "docs/STATUS.md").read_text(encoding="utf-8")
    roadmap = (root / "docs/ROADMAP.md").read_text(encoding="utf-8")
    pendencias = (root / "docs/pendencias.md").read_text(encoding="utf-8")
    aprendizados = (root / "docs/aprendizados.md").read_text(encoding="utf-8")
    entregas = (root / "ENTREGAS_ROADMAP.md").read_text(encoding="utf-8")
    changelog = (root / "docs/_arquivo/changelog-entregas.md").read_text(encoding="utf-8")
    docs_index = (root / "docs/README.md").read_text(encoding="utf-8")

    for relative in LIVING_DATES:
        errors.extend(check_date((root / relative).read_text(encoding="utf-8"), relative))

    sections = roadmap_sections(roadmap)
    if any(item["title"] == "__stray__" for item in sections):
        errors.append("docs/ROADMAP.md tem caixa fora de uma seção ##")
    expected = render_progress(sections)
    actual = progress_block(status)
    if actual != expected:
        errors.append(
            "bloco de progresso de docs/STATUS.md divergiu do ROADMAP; rode make docs-sync"
        )

    errors.extend(check_pendencias(pendencias))
    errors.extend(check_aprendizados(aprendizados))
    errors.extend(check_entregas(entregas))

    if not re.search(r"^##\s+\d{4}-\d{2}-\d{2}\b", changelog, re.M):
        errors.append("docs/_arquivo/changelog-entregas.md sem heading ## YYYY-MM-DD")

    for needle in ("STATUS.md", "ROADMAP.md", "pendencias.md", "aprendizados.md"):
        if needle not in docs_index:
            errors.append(f"docs/README.md não cita {needle}")

    scanned = [
        "AGENTS.md",
        "CLAUDE.md",
        "GEMINI.md",
        "README.md",
        "ENTREGAS_ROADMAP.md",
        ".github/copilot-instructions.md",
        "docs/README.md",
        "docs/STATUS.md",
        "docs/ROADMAP.md",
        "docs/pendencias.md",
        "docs/aprendizados.md",
        "docs/governanca/harness.md",
        "docs/_arquivo/changelog-entregas.md",
    ]
    for folder in (
        root / "docs" / "direcionamento",
        root / ".agents" / "skills",
        root / ".agents" / "rules",
        root / ".kiro" / "steering",
    ):
        if folder.is_dir():
            for path in sorted(folder.rglob("*.md")):
                scanned.append(str(path.relative_to(root)))
    errors.extend(check_links(root, scanned))
    return errors
