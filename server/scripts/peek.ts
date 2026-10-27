// Mostra a posição de um jogador (entra como observador e sai).
import { play } from "./lib";
const room = await play("Olheiro");
await new Promise((r) => setTimeout(r, 500));
for (const [id, p] of room.state.players.entries()) console.log(id, { x: p.x, y: p.y, lvl: p.level, form: p.form, online: p.online, hunt: p.autoHunt, hp: p.hp });
await room.leave();
process.exit(0);
