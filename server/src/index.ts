import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { WorldRoom } from "./WorldRoom";
import { LobbyRoom } from "./LobbyRoom";
import { createHttpServer } from "./http";
import * as db from "./db";

// Configuração por variáveis de ambiente (veja DEPLOY.md):
//   PORT            porta HTTP + WebSocket (padrão 2567)
//   DB_FILE         arquivo do banco (padrão bleach-idle.sqlite)
//   STATIC_DIR      pasta do cliente pronto (padrão client/dist)
//   BACKUP_DIR      se definido, faz backup do banco nessa pasta
//   BACKUP_HOURS    intervalo dos backups (padrão 6)  ·  BACKUP_KEEP  quantos manter (padrão 28)
const port = Number(process.env.PORT ?? 2567);
const startedAt = Date.now();

const http = createHttpServer(() => ({
  uptimeS: Math.round((Date.now() - startedAt) / 1000),
}));
const gameServer = new Server({ transport: new WebSocketTransport({ server: http }) });
gameServer.define("lobby", LobbyRoom);
gameServer.define("world", WorldRoom);
await gameServer.listen(port);
// o mundo existe mesmo sem ninguém conectado: é isso que mantém a hunt offline rodando
await matchMaker.createRoom("world", {});
console.log(`Servidor do mundo em ws://localhost:${port} (cliente pronto em http://localhost:${port}, se houver build)`);

const backupDir = process.env.BACKUP_DIR;
if (backupDir) {
  const every = Number(process.env.BACKUP_HOURS ?? 6) * 3600_000;
  const keep = Number(process.env.BACKUP_KEEP ?? 28);
  mkdirSync(backupDir, { recursive: true });
  const run = () => {
    try {
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
      db.backup(join(backupDir, `bleach-idle-${stamp}.sqlite`));
      const old = readdirSync(backupDir).filter((f) => f.startsWith("bleach-idle-") && f.endsWith(".sqlite")).sort().slice(0, -keep);
      for (const f of old) rmSync(join(backupDir, f));
      console.log(`Backup feito em ${backupDir} (${stamp}).`);
    } catch (e) {
      console.error("Backup falhou:", e);
    }
  };
  run();
  setInterval(run, every);
}
