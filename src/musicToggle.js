// =======================================================================
// BOTÃO DE MUTE DA MÚSICA: fixo no canto, visível no menu e na partida.
// A tecla M faz o mesmo, fora de campos de texto.
// =======================================================================
import { isMusicMuted, toggleMusicMute } from './audio.js';

function paint(button) {
  const muted = isMusicMuted();
  button.textContent = muted ? '🔇' : '🔊';
  button.title = muted ? 'Ligar música (M)' : 'Mutar música (M)';
  button.setAttribute('aria-pressed', String(muted));
}

function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export function initMusicToggle() {
  const button = document.createElement('button');
  button.id = 'music-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Mutar ou ligar a música');
  paint(button);
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMusicMute();
    paint(button);
    button.blur();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'm' || e.repeat || isTyping(e.target)) return;
    toggleMusicMute();
    paint(button);
  });
  document.body.appendChild(button);
}
