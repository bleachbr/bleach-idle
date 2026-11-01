import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap, walkable, inPZ, resumeAt } from "../src/map";

// NPCs no mapa (M1-03, ADR-001 §2.2): a posição vem do objeto "npc" da camada "logica",
// com a propriedade "id" apontando para o catálogo (shared/src/npcs.ts)
const tiny = (objects: unknown[]) => ({
  width: 6, height: 6, tilewidth: 32, tileheight: 32, tilesets: [],
  layers: [{ type: "objectgroup", name: "logica", objects }],
});
const npc = (id: string, x: number, y: number) => ({ type: "npc", name: id, x: x * 32 + 16, y: y * 32 + 16, properties: [{ name: "id", value: id }] });

describe("parseMap lê NPCs", () => {
  it("guarda id e tile de cada NPC, e o tile do NPC sólido fica bloqueado", () => {
    const m = parseMap("teste", tiny([npc("npc_shunsui", 2, 3)]));
    expect(m.npcs).toEqual([{ id: "npc_shunsui", x: 2, y: 3 }]);
    expect(walkable(m, 2, 3)).toBe(false);
    expect(walkable(m, 3, 3)).toBe(true);
  });

  it("mapa sem NPC tem a lista vazia", () => {
    expect(parseMap("teste", tiny([])).npcs).toEqual([]);
  });

  it("id fora do catálogo, inclusive chave de protótipo, é erro de carga no servidor (strictNpcs)", () => {
    expect(() => parseMap("teste", tiny([npc("npc_fantasma", 1, 1)]), { strictNpcs: true })).toThrow(/npc_fantasma/);
    expect(() => parseMap("teste", tiny([npc("constructor", 1, 1)]), { strictNpcs: true })).toThrow(/constructor/);
  });

  it("NPC repetido no mesmo mapa é erro de carga no servidor", () => {
    expect(() => parseMap("teste", tiny([npc("npc_shunsui", 1, 1), npc("npc_shunsui", 2, 2)]), { strictNpcs: true })).toThrow(/repetido/);
  });

  it("no cliente (sem strictNpcs) o NPC desconhecido ou repetido é pulado, sem travar o jogo nem bloquear o tile", () => {
    const m = parseMap("teste", tiny([npc("npc_fantasma", 1, 1), npc("npc_shunsui", 2, 2), npc("npc_shunsui", 3, 3)]));
    expect(m.npcs).toEqual([{ id: "npc_shunsui", x: 2, y: 2 }]);
    expect(walkable(m, 1, 1)).toBe(true);
    expect(walkable(m, 3, 3)).toBe(true);
  });

  it("NPC fora do mapa é erro no servidor e, no cliente, é pulado sem marcar tile nenhum", () => {
    expect(() => parseMap("teste", tiny([npc("npc_shunsui", 6, 0)]), { strictNpcs: true })).toThrow(/fora do mapa/);
    const m = parseMap("teste", tiny([npc("npc_shunsui", 6, 0)]));
    expect(m.npcs).toEqual([]);
    // x = largura cairia no começo da linha seguinte se o índice não fosse conferido
    expect(walkable(m, 0, 1)).toBe(true);
  });

  it("NPC em cima de tile sólido do terreno é erro no servidor, mesmo com a camada de objetos antes da de tiles", () => {
    const wall = {
      width: 6, height: 6, tilewidth: 32, tileheight: 32,
      tilesets: [{ firstgid: 1, tiles: [{ id: 0, properties: [{ name: "solido", value: true }] }] }],
      layers: [
        { type: "objectgroup", name: "logica", objects: [npc("npc_shunsui", 2, 2)] },
        { type: "tilelayer", name: "chao", data: Array.from({ length: 36 }, (_, i) => (i === 2 * 6 + 2 ? 1 : 0)) },
      ],
    };
    expect(() => parseMap("teste", wall, { strictNpcs: true })).toThrow(/sólido/);
    expect(parseMap("teste", wall).npcs).toEqual([]);
  });
});

describe("posição de volta ao mundo (resumeAt)", () => {
  const m = parseMap("teste", tiny([npc("npc_shunsui", 2, 2)]));

  it("tile andável fica como está", () => {
    expect(resumeAt(m, 4, 4)).toEqual({ x: 4, y: 4 });
  });

  it("save em cima de um NPC sólido posto depois volta no tile andável mais perto, no mesmo mapa", () => {
    const p = resumeAt(m, 2, 2)!;
    expect(walkable(m, p.x, p.y)).toBe(true);
    expect(Math.max(Math.abs(p.x - 2), Math.abs(p.y - 2))).toBe(1);
  });

  it("save sem posição não acha lugar (quem chama manda para o templo)", () => {
    expect(resumeAt(m, Number.NaN, Number.NaN)).toBeUndefined();
  });
});

describe("NPCs do soul.tmj (PRD §4)", () => {
  const soul = parseMap("soul", JSON.parse(readFileSync(new URL("../../client/public/maps/soul.tmj", import.meta.url), "utf8")));

  it("os 3 NPCs estão nas posições do PRD, dentro da zona segura", () => {
    expect([...soul.npcs].sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: "npc_cronista", x: 21, y: 14 },
      { id: "npc_sentinela", x: 23, y: 16 },
      { id: "npc_shunsui", x: 26, y: 13 },
    ]);
    for (const n of soul.npcs) expect(inPZ(soul, n.x, n.y), n.id).toBe(true);
  });

  it("nenhum NPC fica em cima da chegada nem do portal, e todos têm um vizinho andável para conversar", () => {
    const busy = [soul.arrivals.soul, soul.gate].filter(Boolean).map((p) => `${p!.x},${p!.y}`);
    for (const n of soul.npcs) {
      expect(busy).not.toContain(`${n.x},${n.y}`);
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => walkable(soul, n.x + dx, n.y + dy));
      expect(around, n.id).toBe(true);
    }
  });

  it("os NPCs não fecham o caminho da chegada até o portal", () => {
    // busca em largura em 4 vizinhos; walkable já trata o tile do NPC sólido como parede
    const from = soul.arrivals.soul, gate = soul.gate!;
    expect(from && walkable(soul, from.x, from.y)).toBe(true);
    const goals = new Set([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `${gate.x + dx},${gate.y + dy}`).filter((k) => {
      const [x, y] = k.split(",").map(Number);
      return walkable(soul, x, y);
    }));
    expect(goals.size).toBeGreaterThan(0);
    const seen = new Set([`${from.x},${from.y}`]);
    const queue = [from];
    let reached = false;
    while (queue.length && !reached) {
      const { x, y } = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (seen.has(k) || !walkable(soul, x + dx, y + dy)) continue;
        if (goals.has(k)) reached = true;
        seen.add(k);
        queue.push({ x: x + dx, y: y + dy });
      }
    }
    expect(reached).toBe(true);
  });
});
