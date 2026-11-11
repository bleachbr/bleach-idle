"""Catraca de SFX: poder/FX novo no arsenal precisa de som declarado."""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run_node(body: str) -> object:
    script = f"""
import {{ ARSENALS, arsenalShot }} from './src/arsenal.js';
import {{ SFX_BY_FX, SFX_GLOBAL_IDS, SFX_PRESETS, sfxPreset, sfxPresetForFx }} from './src/sfxConfig.js';
import {{ FX_REGISTRY }} from './src/characters.js';
const __r = (() => {{ {body} }})();
console.log(JSON.stringify(__r));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(proc.stdout.strip())


class TestSfxRegistry(unittest.TestCase):
    def test_global_combat_events_exist(self):
        data = run_node("return { ids: SFX_GLOBAL_IDS, presets: Object.keys(SFX_PRESETS) };")
        for event_id in data["ids"]:
            self.assertIn(event_id, data["presets"], event_id)
            self.assertTrue(run_node(f"return !!sfxPreset('{event_id}');"))

    def test_every_arsenal_shot_fx_has_sfx(self):
        missing = run_node("""
          const fxIds = Object.keys(ARSENALS).flatMap((c) =>
            ['getsuga', 'byakurai', 'shakkaho'].map((k) => arsenalShot(c, k).fx));
          return [...new Set(fxIds)].filter((fx) => !sfxPresetForFx(fx));
        """)
        self.assertEqual(missing, [], f"FX sem SFX_BY_FX: {missing}")

    def test_sfx_by_fx_keys_are_known_fx(self):
        unknown = run_node("""
          return Object.keys(SFX_BY_FX).filter((fx) => !FX_REGISTRY[fx]);
        """)
        self.assertEqual(unknown, [], f"SFX_BY_FX aponta FX inexistente: {unknown}")

    def test_presets_declare_kind_or_sample(self):
        bad = run_node("""
          return Object.entries(SFX_PRESETS)
            .filter(([, p]) => !p.kind && !p.sample)
            .map(([id]) => id);
        """)
        self.assertEqual(bad, [])

    def test_main_wires_combat_audio_hooks(self):
        main = (ROOT / "src/main.js").read_text(encoding="utf-8")
        for token in (
            "onSlashFire",
            "onSkillFire",
            "onEnemyHit",
            "onEnemyDeath",
            "onPlayerHurtSfx",
            "combatAudio.js",
        ):
            self.assertIn(token, main, token)

    def test_mute_toggle_unlocks_sfx_context(self):
        toggle = (ROOT / "src/musicToggle.js").read_text(encoding="utf-8")
        self.assertIn("unlockSfx", toggle)
        self.assertIn("from './sfx.js'", toggle)

    def test_ci_quality_runs_sfx_test(self):
        ci = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
        self.assertIn("scripts/test_sfx.py", ci)


if __name__ == "__main__":
    unittest.main()
