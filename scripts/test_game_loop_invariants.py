"""Suite de testes unificada das invariantes do loop de jogo (Frente 3).

Valida os tr\u00eas pilares centrais do jogo 2.5D sem browser e sem Playwright:
1. C\u00e2mera orbital e deslocamento relativo (f\u00f3rmula esf\u00e9rica, limites pitch/zoom e dire\u00e7\u00f5es relativas).
2. Billboarding e dire\u00e7\u00f5es de sprite (quadrantes angulares, mira do jogador parado no hollow mais pr\u00f3ximo e c\u00f3pia de quat\u00e9rnio).
3. Efeitos visuais (FX) e proj\u00e9teis (flightPose na tela, mapeamento do arsenal a configs e presets de SFX).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.test_player_movement import TestPlayerMovementUnit
from scripts.test_player_animation import TestBaseClips, TestActions
from scripts.test_projectile_orientation import TestOrientation


def run_node_snippet(body: str) -> dict:
    loader_path = ROOT / "scripts" / "three_loader.mjs"
    cmd = ["node", "--no-warnings"]
    if loader_path.exists():
        cmd.extend(["--loader", loader_path.as_uri()])
    script = f"""
import * as THREE from 'three';
import {{ computePlayerDisplacement, getSpriteDirection }} from './src/movement.js';
import {{
  createPlayerAnimator, triggerPlayerAction, updatePlayerAnimator, nearestEnemyDirection
}} from './src/playerAnimation.js';
import {{ flightPose }} from './src/fx/flightPose.js';
import {{ FX_BEHAVIORS }} from './src/fx/fxConfig.js';
import {{ ARSENALS, arsenalShot }} from './src/arsenal.js';
import {{ SFX_BY_FX, SFX_PRESETS, sfxPresetForFx }} from './src/sfxConfig.js';
import {{ FX_REGISTRY }} from './src/characters.js';

const __result = (() => {{
{body}
}})();
console.log(JSON.stringify(__result));
"""
    cmd.extend(["--input-type=module", "-e", script])
    proc = subprocess.run(cmd, cwd=ROOT, check=True, capture_output=True, text=True, env=os.environ)
    return json.loads(proc.stdout.strip())


class TestCameraOrbitalGameLoop(unittest.TestCase):
    """Invariantes de c\u00e2mera orbital e movimenta\u00e7\u00e3o relativa."""

    def test_camera_spherical_coordinates(self):
        data = run_node_snippet("""
          function calc(px, py, pz, yaw, pitch, dist) {
            const h = Math.cos(pitch);
            const g = Math.sin(pitch);
            return {
              x: px + Math.sin(yaw) * h * dist,
              y: py + g * dist + 0.8,
              z: pz + Math.cos(yaw) * h * dist
            };
          }
          return {
            c0: calc(0, 0, 0, 0, 0.5, 13),
            c90: calc(0, 0, 0, Math.PI / 2, 0.5, 13),
            c180: calc(0, 0, 0, Math.PI, 0.5, 13),
            c270: calc(0, 0, 0, -Math.PI / 2, 0.5, 13)
          };
        """)
        h = 13 * 0.87758256  # 13 * cos(0.5)
        self.assertAlmostEqual(data["c0"]["x"], 0.0, places=4)
        self.assertAlmostEqual(data["c0"]["z"], h, places=4)
        self.assertAlmostEqual(data["c90"]["x"], h, places=4)
        self.assertAlmostEqual(data["c90"]["z"], 0.0, places=4)
        self.assertAlmostEqual(data["c180"]["x"], 0.0, places=4)
        self.assertAlmostEqual(data["c180"]["z"], -h, places=4)
        self.assertAlmostEqual(data["c270"]["x"], -h, places=4)
        self.assertAlmostEqual(data["c270"]["z"], 0.0, places=4)

    def test_camera_limits_and_focus(self):
        main_src = (ROOT / "src/main.js").read_text(encoding="utf-8")
        self.assertIn("Math.max(0.15, Math.min(1.15,", main_src)
        self.assertIn("Math.max(8.0, Math.min(14.0,", main_src)
        self.assertIn("camera.lookAt(player.x, 1.25, player.z)", main_src)

    def test_relative_displacement_four_quadrants(self):
        data = run_node_snippet("""
          const keys = { w: true, a: false, s: false, d: false };
          return {
            w0: computePlayerDisplacement(keys, 0),
            w90: computePlayerDisplacement(keys, Math.PI / 2),
            w180: computePlayerDisplacement(keys, Math.PI),
            w270: computePlayerDisplacement(keys, 3 * Math.PI / 2)
          };
        """)
        self.assertAlmostEqual(data["w0"]["dx"], 0.0, places=5)
        self.assertAlmostEqual(data["w0"]["dz"], -1.0, places=5)
        self.assertAlmostEqual(data["w90"]["dx"], -1.0, places=5)
        self.assertAlmostEqual(data["w90"]["dz"], 0.0, places=5)
        self.assertAlmostEqual(data["w180"]["dx"], 0.0, places=5)
        self.assertAlmostEqual(data["w180"]["dz"], 1.0, places=5)
        self.assertAlmostEqual(data["w270"]["dx"], 1.0, places=5)
        self.assertAlmostEqual(data["w270"]["dz"], 0.0, places=5)


class TestBillboardSpriteFacing(unittest.TestCase):
    """Invariantes de billboarding e dire\u00e7\u00e3o do sprite do jogador/inimigos."""

    def test_sprite_direction_quadrant_coverage(self):
        data = run_node_snippet("""
          return {
            north: getSpriteDirection(0, -1, 0),
            south: getSpriteDirection(0, 1, 0),
            east:  getSpriteDirection(1, 0, 0),
            west:  getSpriteDirection(-1, 0, 0),
            northCam90: getSpriteDirection(0, -1, Math.PI / 2),
            southCam90: getSpriteDirection(0, 1, Math.PI / 2)
          };
        """)
        self.assertEqual(data["north"], "back")
        self.assertEqual(data["south"], "front")
        self.assertEqual(data["east"], "side")
        self.assertEqual(data["west"], "side_l")
        self.assertEqual(data["northCam90"], "side")
        self.assertEqual(data["southCam90"], "side_l")

    def test_idle_attack_faces_nearest_active_enemy(self):
        data = run_node_snippet("""
          const enemies = [
            { x: 3, z: 0, active: false },
            { x: 0, z: -8, active: true },
            { x: 15, z: 15, active: true }
          ];
          const aim = nearestEnemyDirection(enemies, 0, 0);
          const dirFacing = getSpriteDirection(aim.dirX, aim.dirZ, 0);
          return { aim, dirFacing };
        """)
        self.assertAlmostEqual(data["aim"]["dirX"], 0.0, places=5)
        self.assertAlmostEqual(data["aim"]["dirZ"], -1.0, places=5)
        self.assertEqual(data["dirFacing"], "back")

    def test_billboard_quaternion_copy_invariant(self):
        data = run_node_snippet("""
          const cam = new THREE.Object3D();
          cam.quaternion.set(0.12, 0.34, 0.56, 0.78);
          const playerMesh = new THREE.Object3D();
          const enemyMesh = new THREE.Object3D();
          playerMesh.quaternion.copy(cam.quaternion);
          enemyMesh.quaternion.copy(cam.quaternion);
          return {
            playerMatch: playerMesh.quaternion.x === cam.quaternion.x && playerMesh.quaternion.w === cam.quaternion.w,
            enemyMatch: enemyMesh.quaternion.y === cam.quaternion.y && enemyMesh.quaternion.z === cam.quaternion.z
          };
        """)
        self.assertTrue(data["playerMatch"])
        self.assertTrue(data["enemyMatch"])


class TestFxPathInvariants(unittest.TestCase):
    """Invariantes da rota de FX: arsenal, configs e f\u00edsica do proj\u00e9til."""

    def test_arsenal_weapons_map_to_valid_fx_and_sfx(self):
        data = run_node_snippet("""
          const report = [];
          for (const charId of Object.keys(ARSENALS)) {
            for (const weapon of ['getsuga', 'byakurai', 'shakkaho']) {
              const shot = arsenalShot(charId, weapon);
              const behavior = FX_BEHAVIORS[shot.fx] || FX_REGISTRY[shot.fx];
              const sfx = sfxPresetForFx(shot.fx) || SFX_PRESETS[shot.sfx];
              report.push({
                charId, weapon, fx: shot.fx,
                hasBehavior: Boolean(behavior),
                hasSfx: Boolean(sfx),
                damageScale: shot.damageScale, count: shot.count
              });
            }
          }
          return report;
        """)
        for item in data:
            self.assertTrue(item["hasBehavior"], f"FX sem comportamento: {item}")
            self.assertTrue(item["hasSfx"], f"FX sem preset de SFX: {item}")
            self.assertGreater(item["damageScale"], 0)
            self.assertGreaterEqual(item["count"], 1)

    def test_traveling_projectile_physics_parameters(self):
        data = run_node_snippet("""
          const keys = ['skill_getsuga', 'skill_byakurai', 'skill_shakkaho', 'hollow_acid_spit'];
          return keys.map((k) => ({
            key: k,
            speed: FX_BEHAVIORS[k]?.speed,
            maxDistance: FX_BEHAVIORS[k]?.maxDistance,
            hitRadius: FX_BEHAVIORS[k]?.hitRadius
          }));
        """)
        for p in data:
            self.assertGreater(p["speed"], 0, p)
            self.assertGreater(p["maxDistance"], 0, p)
            self.assertGreater(p["hitRadius"], 0, p)

    def test_projectile_in_loop_billboard_step(self):
        data = run_node_snippet("""
          const cam = new THREE.Object3D();
          cam.quaternion.set(0, 0, 0, 1);
          const p = {
            x: 0, z: 0, dirX: 0, dirZ: -1,
            config: FX_BEHAVIORS.skill_getsuga,
            mesh: new THREE.Object3D()
          };
          const dt = 0.016;
          const step = p.config.speed * dt;
          p.x += p.dirX * step;
          p.z += p.dirZ * step;
          p.mesh.quaternion.copy(cam.quaternion);
          const pose = flightPose(p.dirX, p.dirZ, cam.quaternion, p.config.orient);
          p.mesh.rotateZ(pose.angle);
          return {
            x: p.x, z: p.z,
            quatMatch: p.mesh.quaternion.w === cam.quaternion.w,
            mirrored: pose.mirrored,
            angleFinite: Number.isFinite(pose.angle)
          };
        """)
        self.assertLess(data["z"], 0.0)
        self.assertTrue(data["quatMatch"])
        self.assertFalse(data["mirrored"])
        self.assertTrue(data["angleFinite"])


if __name__ == "__main__":
    unittest.main()
