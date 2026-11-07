// =======================================================================
// MÓDULO DE TELEMETRIA E SINCRONIZAÇÃO MULTIPLAYER (CLIENT-SIDE)
// Bleach: Soul Survivor - Captura de logs, erros de runtime e sala
// =======================================================================

const state = {
  playerId: `shinigami_${Math.floor(Math.random() * 899999 + 100000)}`,
  nickname: 'Ichigo Kurosaki',
  initialized: false
};

function postJson(url, payload, callback) {
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(r => r.json()).then(data => {
      if (callback) callback(null, data);
    }).catch(err => {
      if (callback) callback(err, null);
    });
  } catch (e) {
    if (callback) callback(e, null);
  }
}

export function logTelemetry(level, event, message = '', details = null) {
  const payload = {
    playerId: state.playerId,
    nickname: state.nickname,
    level,
    event,
    message: String(message),
    details,
    clientTime: Date.now()
  };
  postJson('/api/telemetry/log', payload);
}

function handleGlobalError(message, source, lineno, colno, error) {
  const stack = error?.stack || `${source}:${lineno}:${colno}`;
  console.error('[CLIENT RUNTIME ERROR]', message, stack);
  logTelemetry('ERROR', 'UNCAUGHT_RUNTIME_ERROR', message, { stack, lineno, colno });
}

function handleUnhandledRejection(e) {
  const reason = e?.reason?.stack || e?.reason || 'Unknown Rejection';
  console.error('[UNHANDLED REJECTION]', reason);
  logTelemetry('ERROR', 'UNHANDLED_PROMISE_REJECTION', String(reason));
}

function setupGlobalErrorCapture() {
  window.onerror = handleGlobalError;
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

export function initTelemetry(playerId, nickname) {
  if (playerId) state.playerId = playerId;
  if (nickname) state.nickname = nickname;
  if (!state.initialized) {
    setupGlobalErrorCapture();
    state.initialized = true;
  }
  logTelemetry('INFO', 'SESSION_START', 'Sessão do combatente iniciada no Hueco Mundo');
  postJson('/api/multiplayer/join', { playerId: state.playerId, nickname: state.nickname });
}

export function syncMultiplayerSession(localStats, onRoomSync) {
  const payload = {
    playerId: state.playerId,
    ...localStats
  };
  postJson('/api/multiplayer/sync', payload, onRoomSync);
}
