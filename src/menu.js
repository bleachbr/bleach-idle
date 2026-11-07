// =======================================================================
// MÓDULO DO MENU DE INÍCIO / LOGIN: BLEACH SOUL SURVIVOR
// Gerenciamento da tela de entrada estilo PokéBonk, nickname e câmera cinemática
// =======================================================================

const STORAGE_KEY = 'bleach_shinigami_name';
const DEFAULT_NAME = 'Ichigo Kurosaki';

export function getSavedPlayerName() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

export function savePlayerName(name) {
  const cleanName = (name || DEFAULT_NAME).trim().slice(0, 16);
  try {
    localStorage.setItem(STORAGE_KEY, cleanName);
  } catch {
    // Storage desabilitado
  }
  return cleanName;
}

export function updateMenuCamera(cameraState, dt) {
  // Rotação suave contínua em torno do Hueco Mundo enquanto no menu
  cameraState.yaw += dt * 0.12;
  cameraState.pitch = 0.42;
  cameraState.dist = 14.5;
}

function handleStartTrigger(inputEl, onStartGame) {
  const name = savePlayerName(inputEl.value);
  hideLoginMenu();
  if (onStartGame) onStartGame(name);
}

export function showLoginMenu() {
  const menuEl = document.getElementById('login-menu');
  const hudEl = document.getElementById('hud-overlay');
  const pauseModal = document.getElementById('pause-modal');
  const gameoverModal = document.getElementById('gameover-modal');

  if (menuEl) menuEl.classList.remove('hidden');
  if (hudEl) hudEl.classList.add('hidden');
  if (pauseModal) pauseModal.classList.add('hidden');
  if (gameoverModal) gameoverModal.classList.add('hidden');

  const inputEl = document.getElementById('player-nickname');
  if (inputEl) inputEl.value = getSavedPlayerName();
}

export function hideLoginMenu() {
  const menuEl = document.getElementById('login-menu');
  const hudEl = document.getElementById('hud-overlay');
  if (menuEl) menuEl.classList.add('hidden');
  if (hudEl) hudEl.classList.remove('hidden');
}

export function initLoginMenu({ onStartGame, onReturnToMenu, onRestartGame }) {
  const inputEl = document.getElementById('player-nickname');
  const playBtn = document.getElementById('btn-play-game');
  const pauseMenuBtn = document.getElementById('btn-menu-pause');
  const gameoverMenuBtn = document.getElementById('btn-menu-gameover');
  const restartBtn = document.getElementById('btn-restart');

  if (inputEl) {
    inputEl.value = getSavedPlayerName();
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleStartTrigger(inputEl, onStartGame);
    });
  }

  if (playBtn) {
    playBtn.onclick = () => handleStartTrigger(inputEl, onStartGame);
  }

  if (pauseMenuBtn && onReturnToMenu) pauseMenuBtn.onclick = onReturnToMenu;
  if (gameoverMenuBtn && onReturnToMenu) gameoverMenuBtn.onclick = onReturnToMenu;
  if (restartBtn && onRestartGame) restartBtn.onclick = onRestartGame;
}
