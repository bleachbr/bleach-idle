// Tiles provisórios desenhados em código (a decisão é usar pacotes CC0 depois).
// Ordem = valor de T em shared/map.ts.
import Phaser from "phaser";
import { TILE } from "../../shared/src";

type Painter = (g: CanvasRenderingContext2D, r: () => number) => void;

const speckle = (g: CanvasRenderingContext2D, r: () => number, base: string, dots: string[], n = 40) => {
  g.fillStyle = base;
  g.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < n; i++) {
    g.fillStyle = dots[Math.floor(r() * dots.length)];
    g.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), 1, 1);
  }
};

const PAINTERS: Painter[] = [
  // grama
  (g, r) => speckle(g, r, "#4a803c", ["#3e7034", "#589246", "#4f8a40"], 90),
  // rua
  (g, r) => {
    speckle(g, r, "#6b6a70", ["#5f5e64", "#77767c"], 60);
    g.fillStyle = "#5a5960";
    g.fillRect(0, 0, TILE, 1);
  },
  // casa: telhado visto de cima
  (g, r) => {
    speckle(g, r, "#8c3b30", ["#7a3229", "#994538"], 30);
    g.fillStyle = "#6c2a22";
    for (let y = 3; y < TILE; y += 6) g.fillRect(0, y, TILE, 1);
    g.fillStyle = "#b0574a";
    g.fillRect(0, 15, TILE, 2);
    g.strokeStyle = "#1a1822";
    g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
  },
  // árvore
  (g, r) => {
    speckle(g, r, "#4a803c", ["#3e7034", "#589246"], 40);
    g.fillStyle = "#1a1822";
    g.beginPath(); g.arc(16, 15, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2d5e2a";
    g.beginPath(); g.arc(16, 15, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3d7a35";
    g.beginPath(); g.arc(13, 12, 8, 0, Math.PI * 2); g.fill();
  },
  // água
  (g, r) => {
    speckle(g, r, "#2f5f9e", ["#386cae", "#2a568f"], 40);
    g.fillStyle = "#5f8fd0";
    for (let i = 0; i < 3; i++) g.fillRect(Math.floor(r() * 24), Math.floor(r() * 30), 6, 1);
  },
  // praça (zona de proteção)
  (g, r) => {
    speckle(g, r, "#b9b2a0", ["#aaa392", "#c4bdab"], 50);
    g.fillStyle = "#9e9785";
    g.fillRect(0, 0, TILE, 1);
    g.fillRect(0, 0, 1, TILE);
  },
  // ponte
  (g, r) => {
    speckle(g, r, "#8a6440", ["#7a5636", "#966e48"], 40);
    g.fillStyle = "#5e4128";
    for (let x = 0; x < TILE; x += 8) g.fillRect(x, 0, 1, TILE);
  },
  // baú do depot sobre o piso da praça
  (g, r) => {
    speckle(g, r, "#b9b2a0", ["#aaa392", "#c4bdab"], 50);
    g.fillStyle = "#1a1822";
    g.fillRect(4, 8, 24, 20);
    g.fillStyle = "#7a4a26";
    g.fillRect(5, 9, 22, 18);
    g.fillStyle = "#9a6232";
    g.fillRect(5, 9, 22, 7);
    g.fillStyle = "#d9b44a";
    g.fillRect(5, 16, 22, 2);
    g.fillRect(14, 15, 4, 5);
  },
  // Senkaimon: portal de viagem (porta de papel com moldura escura) sobre o piso da praça
  (g, r) => {
    speckle(g, r, "#b9b2a0", ["#aaa392", "#c4bdab"], 50);
    g.fillStyle = "#1a1822";
    g.fillRect(3, 2, 26, 28);
    g.fillStyle = "#5a2a1e";
    g.fillRect(4, 3, 24, 26);
    g.fillStyle = "#e8e2cf";
    g.fillRect(7, 7, 18, 22);
    g.fillStyle = "#b6aa88";
    g.fillRect(15, 7, 2, 22);
    g.fillRect(7, 15, 18, 1);
    g.fillStyle = "#8ad8ff";
    g.fillRect(10, 18, 3, 3);
    g.fillRect(19, 18, 3, 3);
  },
];

export function makeTileset(scene: Phaser.Scene, key: string) {
  const tex = scene.textures.createCanvas(key, TILE * PAINTERS.length, TILE)!;
  const g = tex.context;
  let seed = 7;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  PAINTERS.forEach((paint, i) => {
    g.save();
    g.translate(i * TILE, 0);
    g.beginPath(); g.rect(0, 0, TILE, TILE); g.clip();
    paint(g, r);
    g.restore();
  });
  tex.refresh();
}
