"""Catraca de tamanho do JS em src/.

Função: no máximo 20 linhas de código no corpo. Arquivo: menos de 500 linhas.
O inventário ao lado deste arquivo guarda quem já passou do teto. Valor novo
acima do teto reprova. Valor declarado não sobe. Quem volta ao teto sai do
inventário. Quando main já tem o inventário, o teto de cada chave é o número
de lá: editar o JSON para acompanhar o crescimento não passa.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

FUNCTION_CEILING = 20
FILE_CEILING = 500


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def inventory_path(root: Path) -> Path:
    return root / "scripts" / "lint" / "size_inventory.json"


def js_files(root: Path) -> list[Path]:
    src = root / "src"
    if not src.is_dir():
        return []
    return sorted(path for path in src.rglob("*.js") if path.is_file())


def file_line_count(source: str) -> int:
    if source == "":
        return 0
    return len(source.splitlines())


def code_line_numbers(source: str) -> set[int]:
    """Linhas com código. Comentário e linha em branco ficam de fora. String conta."""
    numbers: set[int] = set()
    line = 1
    mode = "code"
    line_has_code = False
    i = 0
    while i < len(source):
        char = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if char == "\n":
            if line_has_code:
                numbers.add(line)
            if mode == "line-comment":
                mode = "code"
            line += 1
            line_has_code = False
            i += 1
            continue
        if mode == "line-comment":
            i += 1
            continue
        if mode == "block-comment":
            if char == "*" and nxt == "/":
                mode = "code"
                i += 2
                continue
            i += 1
            continue
        if mode == "string":
            line_has_code = True
            if char == "\\":
                i += 2
                continue
            if char == quote:
                mode = "code"
            i += 1
            continue
        if mode == "template":
            line_has_code = True
            if char == "\\":
                i += 2
                continue
            if char == "`":
                mode = "code"
                i += 1
                continue
            if char == "$" and nxt == "{":
                mode = "code"
                i += 2
                continue
            i += 1
            continue
        if char == "/" and nxt == "/":
            mode = "line-comment"
            i += 2
            continue
        if char == "/" and nxt == "*":
            mode = "block-comment"
            i += 2
            continue
        if char in ("'", '"'):
            quote = char
            mode = "string"
            line_has_code = True
            i += 1
            continue
        if char == "`":
            mode = "template"
            line_has_code = True
            i += 1
            continue
        if not char.isspace():
            line_has_code = True
        i += 1
    if line_has_code:
        numbers.add(line)
    return numbers


def _is_ident_char(char: str) -> bool:
    return char.isalnum() or char in ("_", "$")


def _read_ident(source: str, index: int) -> tuple[str, int]:
    start = index
    while index < len(source) and _is_ident_char(source[index]):
        index += 1
    return source[start:index], index


def _matching_brace(source: str, open_index: int) -> int:
    depth = 0
    i = open_index
    mode = "code"
    quote = ""
    while i < len(source):
        char = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if mode == "line-comment":
            if char == "\n":
                mode = "code"
            i += 1
            continue
        if mode == "block-comment":
            if char == "*" and nxt == "/":
                mode = "code"
                i += 2
                continue
            i += 1
            continue
        if mode == "string":
            if char == "\\":
                i += 2
                continue
            if char == quote:
                mode = "code"
            i += 1
            continue
        if mode == "template":
            if char == "\\":
                i += 2
                continue
            if char == "`":
                mode = "code"
            elif char == "$" and nxt == "{":
                mode = "code"
                depth += 1
                i += 2
                continue
            i += 1
            continue
        if char == "/" and nxt == "/":
            mode = "line-comment"
            i += 2
            continue
        if char == "/" and nxt == "*":
            mode = "block-comment"
            i += 2
            continue
        if char in ("'", '"'):
            quote = char
            mode = "string"
            i += 1
            continue
        if char == "`":
            mode = "template"
            i += 1
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def _line_col(source: str, index: int) -> tuple[int, int]:
    line = source.count("\n", 0, index) + 1
    col = index - source.rfind("\n", 0, index) - 1
    return line, col


def _skip_ws_and_comments(source: str, index: int) -> int:
    while index < len(source):
        if source[index].isspace():
            index += 1
            continue
        if source.startswith("//", index):
            end = source.find("\n", index)
            index = len(source) if end < 0 else end + 1
            continue
        if source.startswith("/*", index):
            end = source.find("*/", index + 2)
            index = len(source) if end < 0 else end + 2
            continue
        break
    return index


def _arrow_name(source: str, arrow_index: int) -> str | None:
    """Nome só quando a seta é `nome = ... =>` ou `nome: ... =>`."""
    index = arrow_index - 1
    while index >= 0 and source[index].isspace():
        index -= 1
    if index >= 0 and source[index] == ")":
        depth = 1
        index -= 1
        while index >= 0 and depth:
            if source[index] == ")":
                depth += 1
            elif source[index] == "(":
                depth -= 1
            index -= 1
    elif index >= 0 and _is_ident_char(source[index]):
        while index >= 0 and _is_ident_char(source[index]):
            index -= 1
    else:
        return None
    while index >= 0 and source[index].isspace():
        index -= 1
    if index >= 4 and source[index - 4 : index + 1] == "async":
        before = source[index - 5] if index >= 5 else ""
        if not _is_ident_char(before):
            index -= 5
            while index >= 0 and source[index].isspace():
                index -= 1
    if index < 0 or source[index] not in ("=", ":"):
        return None
    index -= 1
    while index >= 0 and source[index].isspace():
        index -= 1
    end = index + 1
    while index >= 0 and _is_ident_char(source[index]):
        index -= 1
    name = source[index + 1 : end]
    if not name or name == "async":
        return None
    return name


def _code_after(line_text: str, col: int) -> bool:
    rest = line_text[col + 1 :]
    i = 0
    while i < len(rest):
        if rest.startswith("//", i):
            return False
        if rest.startswith("/*", i):
            end = rest.find("*/", i + 2)
            if end < 0:
                return False
            i = end + 2
            continue
        if not rest[i].isspace():
            return True
        i += 1
    return False


def _body_lines(source: str, code_lines: set[int], open_index: int, close_index: int) -> int:
    open_line, open_col = _line_col(source, open_index)
    close_line, _ = _line_col(source, close_index)
    lines = source.splitlines()
    count = 0
    for number in range(open_line, close_line + 1):
        if number not in code_lines:
            continue
        if number == open_line and not _code_after(lines[number - 1], open_col):
            continue
        count += 1
    return count


def measure_functions(source: str) -> dict[str, int]:
    """Nome qualificado → linhas de código do corpo. Inclui aninhada no pai."""
    code_lines = code_line_numbers(source)
    found: list[tuple[str, int]] = []
    seen: dict[str, int] = {}
    stack: list[tuple[str, int]] = []
    i = 0
    mode = "code"
    quote = ""
    while i < len(source):
        while stack and i > stack[-1][1]:
            stack.pop()
        char = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if char == "\n" and mode == "line-comment":
            mode = "code"
        if mode == "line-comment":
            i += 1
            continue
        if mode == "block-comment":
            if char == "*" and nxt == "/":
                mode = "code"
                i += 2
            else:
                i += 1
            continue
        if mode == "string":
            if char == "\\":
                i += 2
                continue
            if char == quote:
                mode = "code"
            i += 1
            continue
        if mode == "template":
            if char == "\\":
                i += 2
                continue
            if char == "`":
                mode = "code"
            i += 1
            continue
        if char == "/" and nxt == "/":
            mode = "line-comment"
            i += 2
            continue
        if char == "/" and nxt == "*":
            mode = "block-comment"
            i += 2
            continue
        if char in ("'", '"'):
            quote = char
            mode = "string"
            i += 1
            continue
        if char == "`":
            mode = "template"
            i += 1
            continue
        name, open_index = _function_at(source, i)
        if open_index < 0:
            i += 1
            continue
        close_index = _matching_brace(source, open_index)
        if close_index < 0:
            i += 1
            continue
        qualified = _qualify(name, source, i, stack, seen)
        found.append((qualified, _body_lines(source, code_lines, open_index, close_index)))
        stack.append((qualified.split(".")[-1].split("#")[0], close_index))
        i = open_index + 1
    return dict(found)


def _qualify(name: str | None, source: str, index: int, stack: list[tuple[str, int]], seen: dict[str, int]) -> str:
    leaf = name or f"<anon>@{source.count(chr(10), 0, index) + 1}"
    parent = ".".join(item[0] for item in stack)
    full = f"{parent}.{leaf}" if parent else leaf
    seen[full] = seen.get(full, 0) + 1
    if seen[full] == 1:
        return full
    return f"{full}#{seen[full]}"


def _function_at(source: str, index: int) -> tuple[str | None, int]:
    if source.startswith("function", index):
        before = source[index - 1] if index else ""
        after = source[index + 8] if index + 8 < len(source) else ""
        if _is_ident_char(before) or _is_ident_char(after):
            return None, -1
        return _function_keyword(source, index + 8)
    if source.startswith("=>", index):
        return _arrow_function(source, index)
    return None, -1


def _function_keyword(source: str, index: int) -> tuple[str | None, int]:
    index = _skip_ws_and_comments(source, index)
    name = None
    if index < len(source) and _is_ident_char(source[index]):
        name, index = _read_ident(source, index)
        index = _skip_ws_and_comments(source, index)
    if index >= len(source) or source[index] != "(":
        return None, -1
    index = _matching_paren(source, index)
    if index < 0:
        return None, -1
    index = _skip_ws_and_comments(source, index + 1)
    if index >= len(source) or source[index] != "{":
        return None, -1
    return name, index


def _arrow_function(source: str, index: int) -> tuple[str | None, int]:
    body = _skip_ws_and_comments(source, index + 2)
    if body >= len(source) or source[body] != "{":
        return None, -1
    return _arrow_name(source, index), body


def _matching_paren(source: str, open_index: int) -> int:
    depth = 0
    i = open_index
    while i < len(source):
        char = source[i]
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def measure_tree(root: Path) -> tuple[dict[str, int], dict[str, int]]:
    files: dict[str, int] = {}
    functions: dict[str, int] = {}
    for path in js_files(root):
        source = path.read_text(encoding="utf-8")
        relative = path.relative_to(root).as_posix()
        count = file_line_count(source)
        if count >= FILE_CEILING:
            files[relative] = count
        for name, lines in measure_functions(source).items():
            if lines > FUNCTION_CEILING:
                functions[f"{relative}::{name}"] = lines
    return files, functions


def load_inventory(root: Path) -> dict[str, dict[str, int]]:
    path = inventory_path(root)
    if not path.is_file():
        return {"files": {}, "functions": {}}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {
        "files": {key: int(value) for key, value in raw.get("files", {}).items()},
        "functions": {key: int(value) for key, value in raw.get("functions", {}).items()},
    }


def inventory_on_main(root: Path) -> dict[str, dict[str, int]] | None:
    result = subprocess.run(
        ["git", "show", "main:scripts/lint/size_inventory.json"],
        cwd=root,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None
    raw = json.loads(result.stdout)
    return {
        "files": {key: int(value) for key, value in raw.get("files", {}).items()},
        "functions": {key: int(value) for key, value in raw.get("functions", {}).items()},
    }


def _ratchet(kind: str, found: dict[str, int], declared: dict[str, int], allowed: dict[str, int] | None) -> list[str]:
    errors: list[str] = []
    for key, measured in sorted(found.items()):
        ceiling = allowed.get(key) if allowed is not None and key in (allowed or {}) else None
        if allowed is not None and (ceiling is None or measured > ceiling):
            shown = FILE_CEILING if kind == "arquivo" else FUNCTION_CEILING
            cap = ceiling if ceiling is not None else shown
            errors.append(f"{kind} {key} tem {measured} linhas; o teto herdado da main é {cap}")
            continue
        if key not in declared:
            errors.append(f"{kind} acima do teto sem inventário: {key} tem {measured} linhas")
        elif measured > declared[key]:
            errors.append(f"{kind} {key} cresceu de {declared[key]} para {measured}")
        elif measured < declared[key]:
            errors.append(
                f"{kind} {key} desceu para {measured}; o inventário ainda diz {declared[key]}"
            )
    for key in sorted(set(declared) - set(found)):
        errors.append(f"{kind} {key} saiu do teto; tire a chave do inventário")
    return errors


def check_size(root: Path) -> list[str]:
    files, functions = measure_tree(root)
    declared = load_inventory(root)
    main_inventory = inventory_on_main(root)
    allowed_files = main_inventory["files"] if main_inventory else None
    allowed_functions = main_inventory["functions"] if main_inventory else None
    errors = _ratchet("arquivo", files, declared["files"], allowed_files)
    errors.extend(_ratchet("função", functions, declared["functions"], allowed_functions))
    return errors


def main() -> int:
    root = repo_root()
    errors = check_size(root)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("size-check ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
