"""Testes de proteção contra regressões em runtime, visibilidade da Lua e transição cinemática do prólogo.

Garante que:
1. A Lua do Bleach no Hueco Mundo esteja posicionada ao Norte (Z < -120), baixa no horizonte (25 <= Y <= 55) e imune à neblina (fog: false).
2. A transição cinemática do prólogo ative corretamente, crie o portal do Senkaimon, faça a Rukia recuar e o jogador avançar em direção ao portal.
3. Todas as propriedades de `window.debugGame` e manipuladores de evento estejam definidos e livres de ReferenceError.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def run_node_eval_prologue(expr: str) -> dict:
    root = repo_root()
    script = f"""
import * as THREE from 'three';
import {{
  startPrologue,
  updatePrologue,
  isPrologueActive,
  isPrologueCinematicTransition,
  startCinematicTransition,
  cancelPrologue
}} from './src/prologue.js';

global.document = global.document || {{
  createElement(tag) {{
    if (tag === 'canvas') {{
      return {{
        width: 128,
        height: 160,
        getContext: () => ({{
          fillStyle: '',
          shadowColor: '',
          shadowBlur: 0,
          fillRect: () => {{}},
          clearRect: () => {{}},
          fillText: () => {{}},
          roundRect: () => {{}},
          stroke: () => {{}},
          measureText: () => ({{ width: 60 }}),
          beginPath: () => {{}},
          arc: () => {{}},
          fill: () => {{}}
        }})
      }};
    }}
    return {{
      id: '',
      className: '',
      innerHTML: '',
      classList: {{ add: () => {{}}, remove: () => {{}}, contains: () => false }},
      appendChild: () => {{}}
    }};
  }},
  body: {{ appendChild: () => {{}} }},
  getElementById: () => ({{
    classList: {{ add: () => {{}}, remove: () => {{}} }},
    src: '',
    textContent: ''
  }}),
  addEventListener: () => {{}},
  removeEventListener: () => {{}}
}};

const __result = (() => {{
  {expr}
}})();

console.log(JSON.stringify(__result));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=root,
        check=True,
        capture_output=True,
        text=True
    )
    return json.loads(proc.stdout.strip())


class TestHuecoMundoMoonProtection(unittest.TestCase):
    def test_moon_config_north_and_low_horizon(self):
        root = repo_root()
        map_json_path = root / "src/assets/maps/hueco_mundo/map_data.json"
        with open(map_json_path, encoding="utf-8") as f:
            data = json.load(f)

        atmos = data.get("atmosphere", {})
        self.assertTrue(atmos.get("has_moon"), "O mapa Hueco Mundo deve ter has_moon: true")

        pos = atmos.get("moon_pos", [])
        self.assertEqual(len(pos), 3, "moon_pos deve ter 3 coordenadas [x, y, z]")

        # Deve estar ao Norte: Z fortemente negativo
        self.assertLess(pos[2], -120.0, "A lua deve ficar ao Norte (Z < -120)")
        # Deve estar centralizada ao Norte (|X| <= 20)
        self.assertLessEqual(abs(pos[0]), 20.0, "A lua deve estar centralizada ao Norte (|X| <= 20)")
        # Deve estar baixa no horizonte (entre 25m e 55m), não no topo do céu
        self.assertGreaterEqual(pos[1], 25.0, "Altitude da lua deve ser >= 25m")
        self.assertLessEqual(pos[1], 55.0, "Altitude da lua deve ser baixa no horizonte (<= 55m)")
        # Tamanho majestoso
        self.assertGreaterEqual(atmos.get("moon_size", 0), 40.0)

    def test_moon_mesh_immune_to_fog_and_named(self):
        root = repo_root()
        module_path = root / "src/maps/hueco_mundo.js"
        content = module_path.read_text(encoding="utf-8")

        self.assertIn("mesh.name = 'bleach_moon'", content)
        self.assertIn("fog: false", content, "O material da lua deve ter fog: false para não ser ocultado pela neblina")
        self.assertIn("depthWrite: false", content)


class TestPrologueCinematicTransition(unittest.TestCase):
    def test_cinematic_transition_states_and_positions(self):
        res = run_node_eval_prologue("""
            const scene = new THREE.Scene();
            const loader = {
                load: () => ({ colorSpace: '', magFilter: '', minFilter: '' })
            };
            const player = { x: 0.85, y: 0, z: 0, isMoving: true };
            const playerMesh = {
                position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
                quaternion: { copy: () => {} },
                material: { map: null }
            };
            const camera = {
                position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
                quaternion: { copy: () => {} },
                lookAt: () => {}
            };
            const dangaiMap = {
                terrainMesh: { material: { map: { offset: { set: () => {}, y: 0 } } } },
                propGroup: { children: [] }
            };

            const initialActive = isPrologueActive();
            startPrologue({
                scene,
                loader,
                dangaiMap,
                getHeightFn: () => 0,
                onComplete: () => {}
            });
            const startedActive = isPrologueActive();
            const initialCinematic = isPrologueCinematicTransition();

            // Dispara a transição cinemática
            startCinematicTransition();
            const cinematicActive = isPrologueCinematicTransition();

            // Executa meio ciclo cinemático
            updatePrologue(0.7, { camera, player, playerMesh, dangaiMap, spriteTextures: {} });

            const playerX_half = player.x;
            const playerZ_half = player.z;

            // Busca portal na cena
            let portalFound = false;
            scene.traverse(obj => {
                if (obj.name === 'senkaimon_portal_group') portalFound = true;
            });

            cancelPrologue();

            return {
                initialActive,
                startedActive,
                initialCinematic,
                cinematicActive,
                portalFound,
                playerZ_half,
                playerAdvancedForward: playerZ_half < -2.0,
                playerCenteredX: playerX_half < 0.85
            };
        """)
        self.assertFalse(res["initialActive"])
        self.assertTrue(res["startedActive"])
        self.assertFalse(res["initialCinematic"])
        self.assertTrue(res["cinematicActive"])
        self.assertTrue(res["portalFound"], "O portal do Senkaimon deve ser instanciado na cena")
        self.assertTrue(res["playerAdvancedForward"], "O jogador deve avançar para a frente (Z negativo) em direção ao portal")
        self.assertTrue(res["playerCenteredX"], "O jogador deve se centralizar em X para atravessar o portal")


class TestRuntimeReferenceSafety(unittest.TestCase):
    def test_main_js_no_unbound_references(self):
        root = repo_root()
        main_path = root / "src/main.js"
        content = main_path.read_text(encoding="utf-8")

        # Verifica se referências antigas foram devidamente mapeadas
        self.assertNotIn("selectBannerOption,", content)
        self.assertNotIn("skipLevelUp()", content)
        self.assertIn("selectOptionIndex", content)
        self.assertIn("finishLevelUp", content)
        self.assertIn("selectBannerOption: selectOptionIndex", content)
        self.assertIn("skipLevelUp: finishLevelUp", content)


class TestAudioSystemProtection(unittest.TestCase):
    def test_audio_files_exist_and_non_empty(self):
        root = repo_root()
        login_bgm = root / "arts/music/All Bleach Openings (1-16).mp3"
        hueco_bgm = root / "arts/music/Number One (Vocal Version).mp3"

        self.assertTrue(login_bgm.exists(), "All Bleach Openings (1-16).mp3 deve existir")
        self.assertGreater(login_bgm.stat().st_size, 1_000_000, "All Bleach Openings deve ser maior que 1MB")

        self.assertTrue(hueco_bgm.exists(), "Number One (Vocal Version).mp3 deve existir")
        self.assertGreater(hueco_bgm.stat().st_size, 1_000_000, "Number One deve ser maior que 1MB")

    def test_audio_module_logic_and_lifecycle(self):
        root = repo_root()
        script = """
let created = [];
class MockAudio {
  constructor(src) {
    this.src = src;
    this.loop = false;
    this.volume = 1;
    this.paused = true;
    this.currentTime = 0;
    created.push(this);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
global.Audio = MockAudio;
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

import { playLoginBGM, stopMusic, playHuecoMundoBGM, getCurrentTrack } from './src/audio.js';

playLoginBGM();
const t1 = getCurrentTrack();
const a1 = created[created.length - 1];
const loop1 = a1.loop;
const src1 = a1.src;

stopMusic();
const t2 = getCurrentTrack();

playHuecoMundoBGM();
const t3 = getCurrentTrack();
const a2 = created[created.length - 1];
const loop2 = a2.loop;
const src2 = a2.src;

console.log(JSON.stringify({
  t1, loop1, src1,
  t2,
  t3, loop2, src2
}));
"""
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            cwd=root,
            check=True,
            capture_output=True,
            text=True
        )
        res = json.loads(proc.stdout.strip())
        self.assertEqual(res["t1"], "login")
        self.assertTrue(res["loop1"], "Música de login deve tocar em loop")
        self.assertIn("All Bleach Openings", res["src1"])

        self.assertIsNone(res["t2"], "stopMusic deve anular a faixa atual")

        self.assertEqual(res["t3"], "huecoMundo")
        self.assertFalse(res["loop2"], "Música do Hueco Mundo não deve ficar em loop (tocar 1 vez)")
        self.assertIn("Number One", res["src2"])

    def test_audio_lifecycle_hooks_in_game(self):
        root = repo_root()
        main_content = (root / "src/main.js").read_text(encoding="utf-8")
        menu_content = (root / "src/menu.js").read_text(encoding="utf-8")

        self.assertIn("playLoginBGM", menu_content, "showLoginMenu deve chamar playLoginBGM")
        self.assertIn("stopMusic", main_content, "startGame deve chamar stopMusic")
        self.assertIn("playHuecoMundoBGM", main_content, "onPrologueCompleted deve chamar playHuecoMundoBGM")


if __name__ == "__main__":
    unittest.main()
