// =======================================================================
// SERVIÇO DE TELEMETRIA E ORQUESTRADOR MULTIPLAYER (BACKEND)
// Coleta estruturada de logs do servidor e sincronização de salas do Hueco Mundo
// =======================================================================

import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.resolve(process.cwd(), 'logs');
const TELEMETRY_FILE = path.join(LOGS_DIR, 'telemetry.log');
const MULTIPLAYER_FILE = path.join(LOGS_DIR, 'multiplayer.log');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Estado In-Memory das Salas Multiplayer
const roomState = {
  id: 'hueco-mundo-arena',
  maxPlayers: 8,
  players: new Map(),
  sharedHollows: {
    activeCount: 0,
    totalPurified: 0,
    bossSpawned: false,
    bossDefeated: false,
    damageLeaderboard: {}
  },
  serverStartTime: Date.now()
};

function appendLog(filePath, logLine) {
  try {
    fs.appendFileSync(filePath, logLine + '\n', 'utf-8');
  } catch (err) {
    console.error('[LOGGER ERROR]', err);
  }
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(null, data);
    } catch (err) {
      callback(err, null);
    }
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

// Roteador de Telemetria
function handleTelemetryLog(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  parseBody(req, (err, data) => {
    if (err) return sendJson(res, 400, { error: 'Invalid JSON payload' });

    const timestamp = new Date().toISOString();
    const level = (data.level || 'INFO').toUpperCase();
    const playerId = data.playerId || 'anonymous';
    const nickname = data.nickname || 'Shinigami';
    const event = data.event || 'GENERIC_EVENT';
    const message = data.message || '';
    const details = data.details ? JSON.stringify(data.details) : '';

    const logLine = `[${timestamp}] [${level}] [${playerId}:${nickname}] ${event}: ${message} ${details}`.trim();
    appendLog(TELEMETRY_FILE, logLine);

    if (level === 'ERROR') {
      console.error(`\x1b[31m[BACKEND TELEMETRY ERROR]\x1b[0m ${logLine}`);
    } else {
      console.log(`\x1b[36m[BACKEND TELEMETRY]\x1b[0m ${logLine}`);
    }

    sendJson(res, 200, { success: true, timestamp, level });
  });
}

// Roteador de Join Multiplayer
function handleMultiplayerJoin(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  parseBody(req, (err, data) => {
    if (err) return sendJson(res, 400, { error: 'Invalid JSON payload' });

    const playerId = data.playerId || `player_${Date.now()}`;
    const nickname = data.nickname || 'Shinigami';

    const playerRecord = {
      id: playerId,
      nickname,
      x: 0,
      z: 0,
      hp: 100,
      maxHp: 100,
      kills: 0,
      damageDealt: 0,
      lastSeen: Date.now()
    };

    roomState.players.set(playerId, playerRecord);
    const logLine = `[${new Date().toISOString()}] [JOIN] Player ${nickname} (${playerId}) entrou na arena do Hueco Mundo.`;
    appendLog(MULTIPLAYER_FILE, logLine);
    console.log(`\x1b[32m[MULTIPLAYER ORCHESTRATOR]\x1b[0m ${logLine}`);

    sendJson(res, 200, {
      success: true,
      room: {
        id: roomState.id,
        playerId,
        playersCount: roomState.players.size,
        players: Array.from(roomState.players.values())
      }
    });
  });
}

// Roteador de Sincronização Multiplayer
function handleMultiplayerSync(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  parseBody(req, (err, data) => {
    if (err) return sendJson(res, 400, { error: 'Invalid JSON payload' });

    const { playerId, x = 0, z = 0, hp = 100, kills = 0, damageDealt = 0, damageContribs = {} } = data;
    if (!playerId) return sendJson(res, 400, { error: 'playerId is required' });

    const existing = roomState.players.get(playerId) || { id: playerId, nickname: 'Shinigami' };
    existing.x = x;
    existing.z = z;
    existing.hp = hp;
    existing.kills = kills;
    existing.damageDealt = damageDealt;
    existing.lastSeen = Date.now();
    roomState.players.set(playerId, existing);

    // Atualiza ranking de dano compartilhado
    for (const [attackerId, dmg] of Object.entries(damageContribs)) {
      roomState.sharedHollows.damageLeaderboard[attackerId] = (roomState.sharedHollows.damageLeaderboard[attackerId] || 0) + dmg;
    }

    // Limpa jogadores inativos (> 12 segundos sem heartbeat)
    const now = Date.now();
    for (const [pid, p] of roomState.players.entries()) {
      if (now - p.lastSeen > 12000) {
        roomState.players.delete(pid);
        const logLine = `[${new Date().toISOString()}] [TIMEOUT] Player ${p.nickname} (${pid}) removido por inatividade.`;
        appendLog(MULTIPLAYER_FILE, logLine);
      }
    }

    sendJson(res, 200, {
      success: true,
      room: {
        id: roomState.id,
        serverTime: now,
        activePlayers: Array.from(roomState.players.values()),
        sharedHollows: roomState.sharedHollows
      }
    });
  });
}

// Roteador de Consulta de Estado da Sala
function handleMultiplayerRoom(req, res) {
  sendJson(res, 200, {
    success: true,
    room: {
      id: roomState.id,
      maxPlayers: roomState.maxPlayers,
      activeCount: roomState.players.size,
      players: Array.from(roomState.players.values()),
      sharedHollows: roomState.sharedHollows
    }
  });
}

// Registrador Principal dos Middlewares
export function registerTelemetryAndMultiplayerRoutes(server) {
  server.middlewares.use('/api/telemetry/log', handleTelemetryLog);
  server.middlewares.use('/api/multiplayer/join', handleMultiplayerJoin);
  server.middlewares.use('/api/multiplayer/sync', handleMultiplayerSync);
  server.middlewares.use('/api/multiplayer/room', handleMultiplayerRoom);
  console.log('\u26a1 [BACKEND] Rotas /api/telemetry e /api/multiplayer registradas com sucesso.');
}
