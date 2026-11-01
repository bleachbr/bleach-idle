// Sonda do estado sincronizado, rodada num processo à parte com o mesmo comando do container
// (server/test/container-runtime.test.ts). Imprime se o Colyseus codificou o campo do jogador.
import { Player, WorldState } from "../../src/schema";

const state = new WorldState();
const player = new Player();
player.name = "sonda-estado";
state.players.set("p1", player);
const bytes = Buffer.from(state.encodeAll());
console.log(JSON.stringify({ encodedName: bytes.includes(Buffer.from("sonda-estado")) }));
