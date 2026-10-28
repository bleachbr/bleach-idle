import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Client, type Room } from "colyseus.js";

// Garante que o banco seja em memória durante testes
process.env.DB_FILE = ":memory:";

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

export function once<T = any>(room: Room, type: string, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout aguardando mensagem "${type}"`)), ms);
    room.onMessage(type, (m: T) => {
      clearTimeout(timer);
      resolve(m);
    });
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
