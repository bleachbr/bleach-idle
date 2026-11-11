// =======================================================================
// BOTÃO DE MUTE DA MÚSICA: fixo no canto, visível no menu e na partida.
// A tecla M faz o mesmo, fora de campos de texto.
// =======================================================================
import { isMusicMuted, toggleMusicMute } from './audio.js';
import { unlockSfx } from './sfx.js';

function paint(button) {
  const muted = isMusicMuted();
  button.textContent = muted ? '🔇' : '🔊';
  button.title = muted ? 'Ligar som (M)' : 'Mutar som (M)';
  button.setAttribute('aria-pressed', String(muted));
}

function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

function applyMuteToggle(button) {
  toggleMusicMute();
  if (!isMusicMuted()) unlockSfx();
  paint(button);
}

export function initMusicToggle() {
  const button = document.createElement('button');
  button.id = 'music-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Mutar ou ligar o som');
  paint(button);
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    applyMuteToggle(button);
    button.blur();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'm' || e.repeat || isTyping(e.target)) return;
    applyMuteToggle(button);
  });
  document.body.appendChild(button);
}
