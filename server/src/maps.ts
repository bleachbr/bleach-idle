// Carrega os mapas do Tiled (os mesmos arquivos que o cliente desenha).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MAP_IDS, HOME_MAP, parseMap, type GameMap, type Pt } from "../../shared/src";

const dir = fileURLToPath(new URL("../../client/public/maps/", import.meta.url));

// o servidor não sobe com NPC fora do catálogo no mapa (ADR-001); o cliente só pula
export const MAPS: Record<string, GameMap> = Object.fromEntries(
  MAP_IDS.map((id) => [id, parseMap(id, JSON.parse(readFileSync(`${dir}${id}.tmj`, "utf8")), { strictNpcs: true })]),
);
export const HOME = MAPS[HOME_MAP];
if (!HOME.temple) throw new Error(`O mapa ${HOME_MAP} precisa de um objeto "templo" na camada "logica".`);
export const TEMPLE: Pt = HOME.temple;
/** todos os spawns de todos os mapas; o índice é o spawnIndex do monstro */
export const SPAWNS = MAP_IDS.flatMap((id) => MAPS[id].spawns);
const MAP_INDEX = Object.fromEntries(MAP_IDS.map((id, i) => [id, i]));

/** chave numérica de um tile, única entre mapas (mapas até 1024x1024) */
export const tileKey = (map: string, x: number, y: number) => MAP_INDEX[map] * 1_048_576 + y * 1024 + x;
