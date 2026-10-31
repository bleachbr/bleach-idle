import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Client, type Room } from "colyseus.js";

// Garante que o banco seja em memória durante testes
process.env.DB_FILE = ":memory:";
// um `export BI_DEV=1` ou TRUST_PROXY no shell de quem roda os testes mudaria o resultado
delete process.env.BI_DEV;
delete process.env.BI_DEBUG;
delete process.env.TRUST_PROXY;

let serverInstance: Server | null = null;
let serverPort = 0;

export async function startTestServer() {
  if (serverInstance) return { port: serverPort, url: `ws://localhost:${serverPort}` };

  const { LobbyRoom } = await import("../../src/LobbyRoom");
  const { WorldRoom } = await import("../../src/WorldRoom");

  serverInstance = new Server({ transport: new WebSocketTransport() });
  serverInstance.define("lobby", LobbyRoom);
  serverInstance.define("world", WorldRoom);

  await serverInstance.listen(0);
  const addr = (serverInstance.transport as any).server.address();
  serverPort = addr.port;
  await matchMaker.createRoom("world", {});

  return { port: serverPort, url: `ws://localhost:${serverPort}` };
}

export async function stopTestServer() {
  if (serverInstance) {
    await serverInstance.gracefullyShutdown(false);
    serverInstance = null;
    serverPort = 0;
  }
}

/** Cala o aviso "onMessage() not registered" do colyseus.js. O curinga só recebe o tipo que não tem
 * listener próprio (`Room.dispatchMessage` em colyseus.js/build/cjs/Room.js), então `once` continua funcionando. */
export function quiet<R extends Room>(room: R): R {
  room.onMessage("*", () => {});
  return room;
}

export function once<T = any>(room: Room, type: string, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout aguardando mensagem "${type}"`)), ms);
    room.onMessage(type, (m: T) => {
      clearTimeout(timer);
      resolve(m);
    });
  });
}

// Sem `sleep` aqui de propósito: espere por condição (`once`, `vi.waitFor`), nunca por tempo fixo
// (skill `testes-deterministicos`).
