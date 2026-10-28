// Hora do servidor no cliente: o bloqueio de PvP vem como hora do servidor (pvpUntil),
// então o contador não pode depender do relógio do computador do jogador estar certo.
import type { Room } from "colyseus.js";

let offset = 0;

export const serverNow = () => Date.now() + offset;

export function syncClock(room: Room<any>) {
  let sentAt = 0;
  room.onMessage("time", (m: { now: number }) => {
    const back = Date.now();
    offset = m.now + (back - sentAt) / 2 - back; // metade da ida e volta
  });
  const ask = () => { sentAt = Date.now(); room.send("time"); };
  ask();
  const timer = setInterval(ask, 60_000);
  room.onLeave(() => clearInterval(timer)); // sem isso, mandava mensagem num socket já fechado

}
