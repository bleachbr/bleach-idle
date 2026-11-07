"""A função nova acima de 20 linhas de código tem que falhar sem entrada no inventário."""

from __future__ import annotations

import json
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import js_size


def _write_repo(root: Path, source: str, inventory: dict | None = None) -> None:
    src = root / "src"
    src.mkdir(parents=True)
    (src / "game.js").write_text(source, encoding="utf-8")
    if inventory is not None:
        path = js_size.inventory_path(root)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(inventory), encoding="utf-8")


class MeasureTests(unittest.TestCase):
    def test_comentario_e_linha_vazia_nao_contam(self):
        source = textwrap.dedent(
            """\
            function keep() {
              // comentario
              const shown = 1;

              return shown;
            }
            """
        )
        self.assertEqual(js_size.measure_functions(source), {"keep": 3})

    def test_function_dentro_de_string_nao_conta(self):
        source = 'const text = "function fake() { return 1; }";\nfunction real() {\\n  return 1;\\n}\\n'
        # the second function is real; the string must not invent fake
        names = set(js_size.measure_functions(source))
        self.assertIn("real", names)
        self.assertNotIn("fake", names)

    def test_seta_com_bloco_conta_e_expressao_nao(self):
        source = textwrap.dedent(
            """\
            const short = (n) => n + 1;
            const block = (n) => {
              return n + 1;
            };
            """
        )
        self.assertEqual(set(js_size.measure_functions(source)), {"block"})

    def test_aninhada_entra_na_conta_do_pai(self):
        source = textwrap.dedent(
            """\
            function outer() {
              function inner() {
                return 1;
              }
              return inner();
            }
            """
        )
        measured = js_size.measure_functions(source)
        self.assertEqual(measured["outer.inner"], 2)
        self.assertGreater(measured["outer"], measured["outer.inner"])


class RatchetTests(unittest.TestCase):
    def test_funcao_nova_acima_do_teto_falha(self):
        body = "\n".join(f"  const n{i} = {i};" for i in range(21))
        source = f"function grown() {{\n{body}\n}}\n"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write_repo(root, source, {"files": {}, "functions": {}})
            errors = js_size.check_size(root)
        self.assertTrue(any("acima do teto sem inventário" in error and "grown" in error for error in errors))

    def test_funcao_declarada_que_cresce_falha(self):
        body = "\n".join(f"  const n{i} = {i};" for i in range(22))
        source = f"function grown() {{\n{body}\n}}\n"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write_repo(
                root,
                source,
                {"files": {}, "functions": {"src/game.js::grown": 21}},
            )
            errors = js_size.check_size(root)
        self.assertTrue(any("cresceu" in error for error in errors))

    def test_inventario_que_nao_desceu_falha(self):
        source = "function grown() {\n  return 1;\n}\n"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write_repo(
                root,
                source,
                {"files": {}, "functions": {"src/game.js::grown": 30}},
            )
            errors = js_size.check_size(root)
        self.assertTrue(any("saiu do teto" in error for error in errors))

    def test_arquivo_novo_com_500_linhas_falha(self):
        source = "const n = 1;\n" * 500
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write_repo(root, source, {"files": {}, "functions": {}})
            errors = js_size.check_size(root)
        self.assertTrue(any("arquivo acima do teto sem inventário" in error for error in errors))

    def test_no_teto_passa(self):
        body = "\n".join(f"  const n{i} = {i};" for i in range(19))
        source = f"function ok() {{\n{body}\n}}\n"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write_repo(root, source, {"files": {}, "functions": {}})
            self.assertEqual(js_size.check_size(root), [])

    def test_numero_maior_que_o_herdado_falha(self):
        errors = js_size._ratchet("função", {"a": 30}, {"a": 30}, {"a": 22})
        self.assertTrue(any("herdado da main" in error for error in errors))

    def test_repositorio_atual_respeita_o_inventario(self):
        self.assertEqual(js_size.check_size(js_size.repo_root()), [])


if __name__ == "__main__":
    unittest.main()
