import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MAP_IDS, parseMap, type GameMap } from "../../shared/src";
import { fixedMarks, questTargetKinds, targetAreas } from "../src/minimapMarks";

// os mesmos .tmj que o cliente desenha
const load = (id: string): GameMap => parseMap(id, JSON.parse(readFileSync(new URL(`../public/maps/${id}.tmj`, import.meta.url), "utf8")));
const maps = MAP_IDS.map(load);
const map = (id: string) => maps.find((m) => m.id === id)!;

describe("marcadores fixos do minimapa", () => {
  it("Karakura mostra zona protegida, portal, loja, depot e templo", () => {
    const kinds = new Set(fixedMarks(map("karakura")).map((f) => f.kind));
    for (const k of ["pz", "gate", "shop", "depot", "temple"]) expect(kinds.has(k as never), k).toBe(true);
  });

  it("os NPCs da Soul Society aparecem com o nome do catálogo", () => {
    const npcs = fixedMarks(map("soul")).filter((f) => f.kind === "npc");
    expect(npcs.length).toBe(map("soul").npcs.length);
    expect(npcs.length).toBeGreaterThan(0);
    for (const n of npcs) if (n.kind === "npc") expect(n.label).not.toMatch(/^npc_/);
  });
});

describe("alvo das missões no minimapa", () => {
  it("só as missões de caça que faltam terminar", () => {
    // patrulha: 10 Hollows Menores (3 feitos); uivos: 10 Uivantes (já completa); fragmentos é de entrega
    const kinds = questTargetKinds({ active: { patrulha: 3, uivos: 10, fragmentos: 0 }, done: [] });
    expect([...kinds]).toEqual(["hollow_menor"]);
  });

  it("missão que não existe no catálogo não vira alvo", () => {
    const active = JSON.parse('{"__proto__": 1, "constructor": 0, "nao_existe": 0}');
    expect(questTargetKinds({ active, done: [] }).size).toBe(0);
  });

  it("marca os spawns do mapa atual com a espécie pedida", () => {
    const { areas, elsewhere } = targetAreas(map("karakura"), maps, new Set(["hollow_menor"]));
    expect(areas.length).toBeGreaterThan(0);
    expect(areas.every((a) => a.kind === "hollow_menor")).toBe(true);
    expect(elsewhere).toBe(false);
  });

  it("alvo que só nasce em outro mapa destaca o portal", () => {
    const { areas, elsewhere } = targetAreas(map("karakura"), maps, new Set(["adjuchas"]));
    expect(areas).toEqual([]);
    expect(elsewhere).toBe(true);
  });

  it("espécie que nasce aqui e em outro mapa não destaca o portal", () => {
    // Hollow Faminto nasce em Karakura e na Soul Society
    const { areas, elsewhere } = targetAreas(map("soul"), maps, new Set(["hollow_faminto"]));
    expect(areas.length).toBeGreaterThan(0);
    expect(elsewhere).toBe(false);
  });

  it("uma espécie aqui e outra só em outro mapa destaca o portal", () => {
    const { areas, elsewhere } = targetAreas(map("karakura"), maps, new Set(["hollow_menor", "adjuchas"]));
    expect(areas.length).toBeGreaterThan(0);
    expect(elsewhere).toBe(true);
  });
});
