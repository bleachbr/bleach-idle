// =======================================================================
// GERENCIADOR DE ÁUDIO E TRILHA SONORA: BLEACH SOUL SURVIVOR
// Controla música do menu (Aberturas), silêncio no prólogo e Hueco Mundo
// =======================================================================

const TRACKS = {
  login: '/arts/music/All Bleach Openings (1-16).mp3',
  huecoMundo: '/arts/music/Number One (Vocal Version).mp3'
};

const DEFAULT_VOLUME = 0.45;

let currentAudio = null;
let currentTrack = null;
let pendingUnlock = null;

function detachUnlockListener() {
  if (!pendingUnlock) return;
  window.removeEventListener('pointerdown', pendingUnlock);
  window.removeEventListener('keydown', pendingUnlock);
  pendingUnlock = null;
}

function attachUnlockListener(audio) {
  detachUnlockListener();
  pendingUnlock = () => {
    detachUnlockListener();
    if (currentAudio === audio) {
      audio.play().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', pendingUnlock, { once: true });
  window.addEventListener('keydown', pendingUnlock, { once: true });
}

export function stopMusic() {
  detachUnlockListener();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  currentTrack = null;
}

export function playLoginBGM() {
  if (currentTrack === 'login' && currentAudio && !currentAudio.paused) return;
  stopMusic();
  const audio = new Audio(TRACKS.login);
  audio.loop = true;
  audio.volume = DEFAULT_VOLUME;
  currentAudio = audio;
  currentTrack = 'login';

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      if (err.name === 'NotAllowedError') {
        attachUnlockListener(audio);
      }
    });
  }
}

export function playHuecoMundoBGM() {
  stopMusic();
  const audio = new Audio(TRACKS.huecoMundo);
  audio.loop = false;
  audio.volume = DEFAULT_VOLUME;
  currentAudio = audio;
  currentTrack = 'huecoMundo';

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      if (err.name === 'NotAllowedError') {
        attachUnlockListener(audio);
      }
    });
  }
}

export function getCurrentTrack() {
  return currentTrack;
}
