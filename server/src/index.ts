import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./WorldRoom";
import { LobbyRoom } from "./LobbyRoom";

const port = Number(process.env.PORT ?? 2567);
const gameServer = new Server({ transport: new WebSocketTransport() });
gameServer.define("lobby", LobbyRoom);
gameServer.define("world", WorldRoom);
await gameServer.listen(port);
// o mundo existe mesmo sem ninguém conectado: é isso que mantém a hunt offline rodando
await matchMaker.createRoom("world", {});
console.log(`Servidor do mundo em ws://localhost:${port}`);
