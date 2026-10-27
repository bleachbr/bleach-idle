// Busca em largura no grid (4 direções). Retorna o caminho sem a posição inicial,
// ou [] se não houver caminho dentro de maxNodes.
import { MAP_W } from "../../shared/src";

export type Pt = { x: number; y: number };

export function findPath(
  sx: number,
  sy: number,
  isGoal: (x: number, y: number) => boolean,
  blocked: (x: number, y: number) => boolean,
  maxNodes = 4000,
): Pt[] {
  const key = (x: number, y: number) => y * MAP_W + x;
  const prev = new Map<number, number>([[key(sx, sy), -1]]);
  const queue: number[] = [key(sx, sy)];
  for (let head = 0; head < queue.length && head < maxNodes; head++) {
    const k = queue[head];
    const x = k % MAP_W;
    const y = (k - x) / MAP_W;
    if (head > 0 && isGoal(x, y)) {
      const path: Pt[] = [];
      for (let c = k; c !== key(sx, sy); c = prev.get(c)!) path.push({ x: c % MAP_W, y: Math.floor(c / MAP_W) });
      return path.reverse();
    }
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = key(nx, ny);
      if (prev.has(nk) || blocked(nx, ny)) continue;
      prev.set(nk, k);
      queue.push(nk);
    }
  }
  return [];
}
