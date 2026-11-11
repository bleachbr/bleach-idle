"""Testes da orientação do desenho do projétil na tela (`orientToFlight` em `src/fx/fxManager.js`), via Node."""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Câmera orbital como a do jogo: alta, inclinada para baixo, girando em yaw. Para cada direção de
# voo, mede o ângulo na tela do voo e o ângulo para onde aponta o eixo +X do desenho.
SCRIPT = """
import * as THREE from 'three';
import { orientToFlight } from './src/fx/fxManager.js';
const out = [];
for (const yaw of [0, 1.1, 2.5, -2.0]) {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 500);
  cam.position.set(Math.sin(yaw) * 13, 7, Math.cos(yaw) * 13);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  for (let k = 0; k < 8; k++) {
    const ang = k * Math.PI / 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    const p = { mesh, dirX: Math.cos(ang), dirZ: Math.sin(ang), config: { orient: __ORIENT__ } };
    mesh.quaternion.copy(cam.quaternion);
    orientToFlight(p, cam.quaternion, 2);
    mesh.updateMatrixWorld();
    const a = new THREE.Vector3().project(cam);
    const b = new THREE.Vector3(p.dirX, 0, p.dirZ).multiplyScalar(0.5).project(cam);
    const axis = new THREE.Vector3(Math.sign(mesh.scale.x) * 0.5, 0, 0).applyQuaternion(mesh.quaternion);
    const c = axis.project(cam);
    const flight = Math.atan2(b.y - a.y, b.x - a.x);
    const art = Math.atan2(c.y - a.y, c.x - a.x);
    let diff = Math.abs(flight - art) * 180 / Math.PI;
    if (diff > 180) diff = 360 - diff;
    out.push({ diff, scaleY: mesh.scale.y, mirrored: mesh.scale.x < 0, artX: c.x - a.x, flightX: b.x - a.x });
  }
}
console.log(JSON.stringify(out));
"""


def run(orient: str):
    script = SCRIPT.replace("__ORIENT__", json.dumps(orient))
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True)
    return json.loads(proc.stdout.strip())


class TestOrientation(unittest.TestCase):
    def test_art_points_where_the_projectile_flies(self):
        for r in run("rotate"):
            self.assertLess(r["diff"], 6.0, r)

    def test_never_upside_down(self):
        for r in run("rotate"):
            self.assertGreater(r["scaleY"], 0)

    def test_flying_left_on_screen_mirrors_the_art(self):
        for r in run("rotate"):
            if abs(r["flightX"]) > 1e-3:
                self.assertEqual(r["mirrored"], r["flightX"] < 0, r)

    def test_flip_only_mirrors_and_never_tilts(self):
        for r in run("flip"):
            if abs(r["flightX"]) > 1e-3:
                self.assertEqual(r["artX"] < 0, r["flightX"] < 0, r)


if __name__ == "__main__":
    unittest.main()
