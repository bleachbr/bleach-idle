// =======================================================================
// SERVIÇO DE TELEMETRIA E ORQUESTRADOR MULTIPLAYER (BACKEND)
// Coleta estruturada de logs do servidor e sincronização de salas do Hueco Mundo
// =======================================================================

import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.resolve(process.cwd(), 'logs');
const TELEMETRY_FILE = path.join(LOGS_DIR, 'telemetry.log');
const MULTIPLAYER_FILE = path.join(LOGS_DIR, 'multiplayer.log');
const LEADERBOARD_FILE = path.join(LOGS_DIR, 'leaderboard.json');

const SEED_LEADERBOARD = [
  { id: 'seed_zaraki', nickname: 'Kenpachi Zaraki', kills: 95, timeSeconds: 115, damageDealt: 51200, level: 11, character: 'Ichigo (Shikai)', date: '2026-11-07T14:15:00Z' },
  { id: 'seed_ichigo', nickname: 'Ichigo Kurosaki', kills: 84, timeSeconds: 138, damageDealt: 42500, level: 12, character: 'Ichigo (Shikai)', date: '2026-11-07T12:00:00Z' },
  { id: 'seed_urahara', nickname: 'Kisuke Urahara', kills: 72, timeSeconds: 125, damageDealt: 38900, level: 10, character: 'Ichigo (Shikai)', date: '2026-11-07T13:30:00Z' },
  { id: 'seed_byakuya', nickname: 'Byakuya Kuchiki', kills: 65, timeSeconds: 130, damageDealt: 36400, level: 9, character: 'Ichigo (Shikai)', date: '2026-11-07T15:00:00Z' },
  { id: 'seed_rukia', nickname: 'Rukia Kuchiki', kills: 48, timeSeconds: 105, damageDealt: 27800, level: 8, character: 'Ichigo (Shikai)', date: '2026-11-07T16:20:00Z' }
];

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

// Helpers de Persistência do Leaderboard Global
function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const content = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('[LEADERBOARD READ ERROR]', err);
  }
  saveLeaderboard(SEED_LEADERBOARD);
  return [...SEED_LEADERBOARD];
}

function saveLeaderboard(records) {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LEADERBOARD WRITE ERROR]', err);
  }
}

function sortLeaderboard(records, sortBy = 'kills') {
  return [...records].sort((a, b) => {
    if (sortBy === 'time') return (b.timeSeconds || 0) - (a.timeSeconds || 0);
    if (sortBy === 'damage') return (b.damageDealt || 0) - (a.damageDealt || 0);
    return (b.kills || 0) - (a.kills || 0);
  });
}

// Manipulador do Leaderboard (GET e POST)
function handleLeaderboard(req, res) {
  if (req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost');
    const sortBy = urlObj.searchParams.get('sort') || 'kills';
    const records = loadLeaderboard();
    const sorted = sortLeaderboard(records, sortBy);
    return sendJson(res, 200, {
      success: true,
      sortBy,
      totalEntries: sorted.length,
      records: sorted.slice(0, 25)
    });
  }

  if (req.method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJson(res, 400, { error: 'Invalid JSON payload' });

      const nickname = (data.nickname || 'Shinigami').toString().trim().slice(0, 16) || 'Shinigami';
      const kills = Math.max(0, parseInt(data.kills, 10) || 0);
      const timeSeconds = Math.max(0, parseFloat(data.timeSeconds) || 0);
      const damageDealt = Math.max(0, Math.round(parseFloat(data.damageDealt) || 0));
      const level = Math.max(1, parseInt(data.level, 10) || 1);
      const character = (data.character || 'Ichigo (Shikai)').toString().slice(0, 32);

      const newRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nickname,
        kills,
        timeSeconds: Math.round(timeSeconds),
        damageDealt,
        level,
        character,
        date: new Date().toISOString()
      };

      const records = loadLeaderboard();
      records.push(newRecord);
      const sortedByKills = sortLeaderboard(records, 'kills');
      const trimmed = sortedByKills.slice(0, 100);
      saveLeaderboard(trimmed);

      const rank = trimmed.findIndex(r => r.id === newRecord.id) + 1;
      const logLine = `[${newRecord.date}] [LEADERBOARD] Novo recorde: ${nickname} | Nv.${level} | ${kills} abates | ${damageDealt} dano | ${timeSeconds}s (Rank #${rank})`;
      appendLog(TELEMETRY_FILE, logLine);
      console.log(`\x1b[33m[GLOBAL LEADERBOARD]\x1b[0m ${logLine}`);

      return sendJson(res, 200, {
        success: true,
        rank,
        entry: newRecord,
        records: trimmed.slice(0, 25)
      });
    });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

// Registrador Principal dos Middlewares

export function registerTelemetryAndMultiplayerRoutes(server) {
  server.middlewares.use('/api/telemetry/log', handleTelemetryLog);
  server.middlewares.use('/api/multiplayer/join', handleMultiplayerJoin);
  server.middlewares.use('/api/multiplayer/sync', handleMultiplayerSync);
  server.middlewares.use('/api/multiplayer/room', handleMultiplayerRoom);
  server.middlewares.use('/api/leaderboard', handleLeaderboard);
  console.log('\u26a1 [BACKEND] Rotas /api/telemetry, /api/multiplayer e /api/leaderboard registradas com sucesso.');
}
