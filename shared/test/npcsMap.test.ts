import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap, walkable, inPZ } from "../src/map";

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
});
