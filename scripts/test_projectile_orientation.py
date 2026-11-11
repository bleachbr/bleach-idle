"""Testes da pose do desenho do projétil na tela (`src/fx/flightPose.js`), via Node e sem Three.js.

A câmera é montada como a do jogo (orbital, alta, olhando para o centro). O teste calcula a base
dela (direita, cima, trás), o quatérnio dessa base, e confere se o eixo do desenho, depois do giro
e do espelho que `flightPose` manda aplicar, aponta para onde o voo aparece na tela.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SCRIPT = """
import { flightPose } from './src/fx/flightPose.js';
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };

// Quatérnio de uma matriz de rotação com colunas r (x), u (y), k (z).
function quatFromBasis(r, u, k) {
  const [m11, m12, m13] = [r[0], u[0], k[0]];
  const [m21, m22, m23] = [r[1], u[1], k[1]];
  const [m31, m32, m33] = [r[2], u[2], k[2]];
  const tr = m11 + m22 + m33;
  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1);
    return { w: 0.25 / s, x: (m32 - m23) * s, y: (m13 - m31) * s, z: (m21 - m12) * s };
  }
  if (m11 > m22 && m11 > m33) {
    const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
    return { w: (m32 - m23) / s, x: 0.25 * s, y: (m12 + m21) / s, z: (m13 + m31) / s };
  }
  if (m22 > m33) {
    const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
    return { w: (m13 - m31) / s, x: (m12 + m21) / s, y: 0.25 * s, z: (m23 + m32) / s };
  }
  const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
  return { w: (m21 - m12) / s, x: (m13 + m31) / s, y: (m23 + m32) / s, z: 0.25 * s };
}

const out = [];
for (const yaw of [0, 1.1, 2.5, -2.0]) {
  for (const pitch of [0.35, 0.6]) {
    const eye = [Math.sin(yaw) * 13 * Math.cos(pitch), 13 * Math.sin(pitch), Math.cos(yaw) * 13 * Math.cos(pitch)];
    const back = norm(sub(eye, [0, 0, 0]));
    const right = norm(cross([0, 1, 0], back));
    const up = cross(back, right);
    const q = quatFromBasis(right, up, back);
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4;
      const d = [Math.cos(ang), 0, Math.sin(ang)];
      const flight = [dot(d, right), dot(d, up)];
      for (const orient of ['rotate', 'flip']) {
        const pose = flightPose(d[0], d[2], q, orient);
        const sign = pose.mirrored ? -1 : 1;
        const art = [sign * Math.cos(pose.angle), sign * Math.sin(pose.angle)];
        let diff = Math.abs(Math.atan2(flight[1], flight[0]) - Math.atan2(art[1], art[0])) * 180 / Math.PI;
        if (diff > 180) diff = 360 - diff;
        out.push({ orient, diff, mirrored: pose.mirrored, angle: pose.angle, flightX: flight[0], artX: art[0] });
      }
    }
  }
}
console.log(JSON.stringify(out));
"""


def run():
    proc = subprocess.run(["node", "--input-type=module", "-e", SCRIPT], cwd=ROOT, check=True,
                          capture_output=True, text=True)
    return json.loads(proc.stdout.strip())


class TestOrientation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.poses = run()

    def by(self, orient):
        return [p for p in self.poses if p["orient"] == orient]

    def test_art_points_where_the_projectile_flies(self):
        for p in self.by("rotate"):
            self.assertLess(p["diff"], 0.5, p)

    def test_never_turns_past_a_quarter(self):
        for p in self.poses:
            self.assertLessEqual(abs(p["angle"]), 3.1416 / 2 + 1e-9, p)

    def test_flying_left_on_screen_mirrors_the_art(self):
        for p in self.by("rotate"):
            if abs(p["flightX"]) > 1e-6:
                self.assertEqual(p["mirrored"], p["flightX"] < 0, p)

    def test_flip_only_mirrors_and_never_tilts(self):
        for p in self.by("flip"):
            self.assertEqual(p["angle"] == 0 or p["angle"] == -0.0, True, p)
            if abs(p["flightX"]) > 1e-6:
                self.assertEqual(p["artX"] < 0, p["flightX"] < 0, p)


if __name__ == "__main__":
    unittest.main()
