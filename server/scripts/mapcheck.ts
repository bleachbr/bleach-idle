// Confere os mapas do Tiled: objetos obrigatórios, chegadas dos destinos e muros sem frestas.
import { MAPS, TEMPLE } from "../src/maps";
import { TRAVEL, walkable, MONSTERS } from "../../shared/src";
import { ok, done } from "./lib";

ok("Karakura tem templo andável", walkable(MAPS.karakura, TEMPLE.x, TEMPLE.y));
for (const d of TRAVEL) {
  const a = MAPS[d.map]?.arrivals[d.id];
  ok(`destino ${d.name}: chegada existe e é andável`, !!a && walkable(MAPS[d.map], a.x, a.y));
}
for (const m of Object.values(MAPS)) {
  ok(`${m.name}: tem portal`, !!m.gate);
  ok(`${m.name}: spawns com monstros conhecidos`, m.spawns.every((s) => !!MONSTERS[s.kind]));
}
// muro da Seireitei: só se passa pelo portão (x 20..27)
const soul = MAPS.soul;
const holes: number[] = [];
for (let x = 1; x < soul.w - 1; x++) if (x < 20 || x > 27) if (walkable(soul, x, 19)) holes.push(x);
ok(`muro da Seireitei sem frestas fora do portão${holes.length ? ` (frestas em x=${holes.join(",")})` : ""}`, holes.length === 0);
done();
