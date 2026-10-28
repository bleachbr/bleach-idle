// Busca em largura no grid (4 direções). Retorna o caminho sem a posição inicial,
// ou [] se não houver caminho dentro de maxNodes.

export type Pt = { x: number; y: number };

export function findPath(
  sx: number,
  sy: number,
  isGoal: (x: number, y: number) => boolean,
  blocked: (x: number, y: number) => boolean,
  maxNodes = 4000,
): Pt[] {
  const W = 1024; // largura máxima de mapa
  const key = (x: number, y: number) => y * W + x;
  const prev = new Map<number, number>([[key(sx, sy), -1]]);
  const queue: number[] = [key(sx, sy)];
  for (let head = 0; head < queue.length && head < maxNodes; head++) {
    const k = queue[head];
    const x = k % W;
    const y = (k - x) / W;
    if (head > 0 && isGoal(x, y)) {
      const path: Pt[] = [];
      for (let c = k; c !== key(sx, sy); c = prev.get(c)!) path.push({ x: c % W, y: Math.floor(c / W) });
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
