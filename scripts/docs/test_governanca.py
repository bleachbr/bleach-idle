"""Testes do checker. Um caso quebrado tem que falhar sem o código de governança."""

from __future__ import annotations

import io
import json
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import governanca
import session_hint


ROADMAP = textwrap.dedent(
    """\
    # Roadmap

    **Última atualização:** 2026-11-07

    ```
    - [ ] isto está numa cerca e não conta
    ```

    ## Frente A

    - [x] feito
    - [ ] aberto

    ## Radar

    Nenhum pedido triado.
    """
)

STATUS = textwrap.dedent(
    """\
    # Status

    **Última atualização:** 2026-11-07

    <!-- docs:progress:start -->
    velho
    <!-- docs:progress:end -->
    """
)


class RoadmapTests(unittest.TestCase):
    def test_ignora_caixa_dentro_de_cerca_e_secao_sem_caixa(self):
        sections = governanca.roadmap_sections(ROADMAP)
        self.assertEqual(
            [(item["title"], item["open"], item["done"]) for item in sections],
            [("Frente A", 1, 1), ("Radar", 0, 0)],
        )

    def test_caixa_antes_da_primeira_secao_e_erro(self):
        sections = governanca.roadmap_sections("- [ ] solta\n\n## Frente\n")
        self.assertTrue(any(item["title"] == "__stray__" and item["open"] == 1 for item in sections))

    def test_sync_substitui_o_bloco_e_nao_o_resto(self):
        block = governanca.render_progress(governanca.roadmap_sections(ROADMAP))
        updated = governanca.replace_progress(STATUS, block)
        self.assertIn("| Frente A | 1 | 1 |", updated)
        self.assertIn("| Radar | 0 | 0 |", updated)
        self.assertIn("| **Total** | **1** | **1** |", updated)
        self.assertIn("**Última atualização:** 2026-11-07", updated)
        self.assertNotIn("velho", updated)

    def test_status_sem_marcador_falha(self):
        with self.assertRaises(ValueError):
            governanca.replace_progress("# Status\n", "bloco")


class ItemTests(unittest.TestCase):
    def test_pendencia_sem_motivo_fechado_falha(self):
        text = "## 1. CI mentiroso\n\n**Impacto:** alto (jobs impossíveis)\n"
        errors = governanca.check_pendencias(text)
        self.assertTrue(any("Por que não resolvido" in error for error in errors))

    def test_pendencia_com_motivo_da_lista_passa(self):
        text = (
            "## 1. CI mentiroso\n\n"
            "**Impacto:** alto (jobs impossíveis)\n\n"
            "**Por que não resolvido aqui:** fora do escopo — governança primeiro.\n"
        )
        self.assertEqual(governanca.check_pendencias(text), [])

    def test_numero_repetido_falha(self):
        text = (
            "## 1. Um\n\n**Impacto:** baixo (ruído)\n\n"
            "**Por que não resolvido aqui:** depende de terceiro.\n\n"
            "## 1. Dois\n\n**Impacto:** baixo (ruído)\n\n"
            "**Por que não resolvido aqui:** depende de terceiro.\n"
        )
        errors = governanca.check_pendencias(text)
        self.assertTrue(any("repetido" in error for error in errors))

    def test_aprendizado_sem_evidencia_falha(self):
        text = "## 1. Escala\n\n**Causa raiz:** folhas com alturas diferentes.\n"
        errors = governanca.check_aprendizados(text)
        self.assertTrue(any("Evidência" in error for error in errors))

    def test_entregas_com_caixa_falha(self):
        errors = governanca.check_entregas(
            "A fonte está em docs/ROADMAP.md.\n\n- [ ] ainda aqui\n"
        )
        self.assertTrue(errors)

    def test_entregas_so_com_ponte_passa(self):
        self.assertEqual(
            governanca.check_entregas("A fonte única do plano é docs/ROADMAP.md.\n"),
            [],
        )


class LinkTests(unittest.TestCase):
    def test_link_relativo_quebrado_falha(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            docs = root / "docs"
            docs.mkdir()
            (docs / "README.md").write_text("[status](STATUS.md)\n", encoding="utf-8")
            errors = governanca.check_links(root, ["docs/README.md"])
            self.assertTrue(any("STATUS.md" in error for error in errors))

    def test_link_file_absoluto_falha(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "README.md").write_text(
                "[jogo](file:///tmp/src/main.js)\n",
                encoding="utf-8",
            )
            errors = governanca.check_links(root, ["README.md"])
            self.assertTrue(any("file://" in error for error in errors))

    def test_link_que_existe_passa(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            docs = root / "docs"
            docs.mkdir()
            (docs / "STATUS.md").write_text("ok\n", encoding="utf-8")
            (docs / "README.md").write_text(
                "[status](STATUS.md) e [web](https://example.com).\n",
                encoding="utf-8",
            )
            self.assertEqual(governanca.check_links(root, ["docs/README.md"]), [])


class ClaudeStopTests(unittest.TestCase):
    def test_stop_hook_active_so_em_objeto_com_booleano_true(self):
        self.assertTrue(session_hint.stop_hook_active('{"stop_hook_active": true}'))
        self.assertFalse(session_hint.stop_hook_active(""))
        self.assertFalse(session_hint.stop_hook_active("lixo"))
        self.assertFalse(session_hint.stop_hook_active("true"))
        self.assertFalse(session_hint.stop_hook_active("[]"))
        self.assertFalse(session_hint.stop_hook_active('{"stop_hook_active": false}'))
        self.assertFalse(session_hint.stop_hook_active('{"stop_hook_active": "true"}'))

    def test_claude_stop_body_leva_o_aviso_em_additional_context(self):
        payload = json.loads(session_hint.claude_stop_body("aviso"))
        hook = payload["hookSpecificOutput"]
        self.assertEqual(hook["hookEventName"], "Stop")
        self.assertEqual(hook["additionalContext"], "aviso")
        self.assertNotIn("decision", payload)

    def test_claude_stop_sem_texto_nao_escreve(self):
        buf = io.StringIO()
        with patch("sys.stdout", buf):
            session_hint.emit("", "claude-stop")
        self.assertEqual(buf.getvalue(), "")

    def _run_stop(self, stdin_text: str, aviso: str) -> tuple[int, str]:
        stdin = io.StringIO(stdin_text)
        stdin.isatty = lambda: False
        buf = io.StringIO()
        argv = ["session_hint.py", "--event", "stop", "--format", "claude-stop"]
        with (
            patch("sys.argv", argv),
            patch("sys.stdin", stdin),
            patch("sys.stdout", buf),
            patch("session_hint.stop_text", return_value=aviso),
        ):
            code = session_hint.main()
        return code, buf.getvalue()

    def test_stop_hook_active_cala_mesmo_com_aviso(self):
        code, out = self._run_stop('{"stop_hook_active": true}\n', "aviso")
        self.assertEqual(code, 0)
        self.assertEqual(out, "")

    def test_aviso_sai_como_json_de_stop(self):
        code, out = self._run_stop("{}\n", "aviso")
        self.assertEqual(code, 0)
        payload = json.loads(out)
        self.assertEqual(payload["hookSpecificOutput"]["additionalContext"], "aviso")
        self.assertEqual(payload["hookSpecificOutput"]["hookEventName"], "Stop")

    def test_settings_do_stop_usa_claude_stop(self):
        root = Path(__file__).resolve().parents[2]
        settings = json.loads((root / ".claude/settings.json").read_text(encoding="utf-8"))
        start = settings["hooks"]["SessionStart"][0]["hooks"][0]["command"]
        stop = settings["hooks"]["Stop"][0]["hooks"][0]["command"]
        self.assertIn("--format text", start)
        self.assertIn("--format claude-stop", stop)
        self.assertNotIn("--format text", stop)


class AntigravityStopTests(unittest.TestCase):
    def test_execution_num_so_inteiro(self):
        self.assertEqual(session_hint.antigravity_execution_num('{"executionNum": 1}'), 1)
        self.assertEqual(session_hint.antigravity_execution_num('{"executionNum": 2}'), 2)
        self.assertIsNone(session_hint.antigravity_execution_num(""))
        self.assertIsNone(session_hint.antigravity_execution_num("lixo"))
        self.assertIsNone(session_hint.antigravity_execution_num("[]"))
        self.assertIsNone(session_hint.antigravity_execution_num('{"executionNum": true}'))
        self.assertIsNone(session_hint.antigravity_execution_num('{"executionNum": "1"}'))

    def test_corpo_separa_stop_de_continue(self):
        quiet = json.loads(session_hint.antigravity_stop_body(""))
        loud = json.loads(session_hint.antigravity_stop_body("aviso"))
        self.assertEqual(quiet, {"decision": "stop"})
        self.assertEqual(loud["decision"], "continue")
        self.assertEqual(loud["reason"], "aviso")
        self.assertNotIn("injectSteps", loud)

    def test_session_start_continua_inject_steps(self):
        buf = io.StringIO()
        with patch("sys.stdout", buf):
            session_hint.emit("estado", "antigravity")
        payload = json.loads(buf.getvalue())
        self.assertEqual(payload["injectSteps"], [{"userMessage": "estado"}])

    def _run_stop(self, stdin_text: str, aviso: str) -> tuple[int, str]:
        stdin = io.StringIO(stdin_text)
        stdin.isatty = lambda: False
        buf = io.StringIO()
        argv = ["session_hint.py", "--event", "stop", "--format", "antigravity-stop"]
        with (
            patch("sys.argv", argv),
            patch("sys.stdin", stdin),
            patch("sys.stdout", buf),
            patch("session_hint.stop_text", return_value=aviso),
        ):
            code = session_hint.main()
        return code, buf.getvalue()

    def test_aviso_vira_continue(self):
        code, out = self._run_stop('{"executionNum": 1}\n', "aviso")
        self.assertEqual(code, 0)
        payload = json.loads(out)
        self.assertEqual(payload["decision"], "continue")
        self.assertEqual(payload["reason"], "aviso")
        self.assertNotIn("injectSteps", payload)

    def test_execution_num_acima_de_um_forca_stop(self):
        code, out = self._run_stop('{"executionNum": 2}\n', "aviso")
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out), {"decision": "stop"})

    def test_sem_aviso_decide_stop(self):
        code, out = self._run_stop("{}\n", "")
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out), {"decision": "stop"})

    def test_hooks_separam_session_start_de_stop(self):
        root = Path(__file__).resolve().parents[2]
        hooks = json.loads((root / ".agents/hooks.json").read_text(encoding="utf-8"))
        group = hooks["docs-session"]
        start = group["SessionStart"][0]["command"]
        stop = group["Stop"][0]["command"]
        self.assertIn("--format antigravity", start)
        self.assertNotIn("antigravity-stop", start)
        self.assertIn("--format antigravity-stop", stop)


if __name__ == "__main__":
    unittest.main()
