// =======================================================================
// MÓDULO DE CONTROLES VIRTUAIS MOBILE (JOYSTICK + CÂMERA + PULO)
// Bleach: Soul Survivor - Controles Touch Responsivos e Fluidos
// =======================================================================

const state = {
  vector: { x: 0, y: 0 },
  joystickTouchId: null,
  cameraTouchId: null,
  baseCenterX: 0,
  baseCenterY: 0,
  maxRadius: 50,
  lastCamX: 0,
  lastCamY: 0,
  enabled: false
};

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 900;
}

export function getJoystickVector() {
  return state.vector;
}

function updateKnobVisual(knobEl, dx, dy) {
  if (knobEl) knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
}

export function resetJoystick(knobEl) {
  state.vector = { x: 0, y: 0 };
  state.joystickTouchId = null;
  updateKnobVisual(knobEl, 0, 0);
}

function processJoystickMove(touch, knobEl) {
  const rawDx = touch.clientX - state.baseCenterX;
  const rawDy = touch.clientY - state.baseCenterY;
  const dist = Math.hypot(rawDx, rawDy);
  const clampedDist = Math.min(dist, state.maxRadius);
  const angle = Math.atan2(rawDy, rawDx);

  const dx = Math.cos(angle) * clampedDist;
  const dy = Math.sin(angle) * clampedDist;
  updateKnobVisual(knobEl, dx, dy);

  const norm = clampedDist / state.maxRadius;
  state.vector = {
    x: Math.cos(angle) * norm,
    y: -Math.sin(angle) * norm
  };
}

function handleTouchStart(e, zoneEl, knobEl, baseEl, onJump) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target.closest('#btn-virtual-jump')) {
      if (onJump) onJump();
      continue;
    }
    const inLeft = t.clientX < window.innerWidth * 0.5;
    if (inLeft && state.joystickTouchId === null) {
      state.joystickTouchId = t.identifier;
      const rect = baseEl.getBoundingClientRect();
      state.baseCenterX = rect.left + rect.width * 0.5;
      state.baseCenterY = rect.top + rect.height * 0.5;
      processJoystickMove(t, knobEl);
    } else if (!inLeft && state.cameraTouchId === null) {
      state.cameraTouchId = t.identifier;
      state.lastCamX = t.clientX;
      state.lastCamY = t.clientY;
    }
  }
}

function handleTouchMove(e, knobEl, cameraState) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === state.joystickTouchId) {
      processJoystickMove(t, knobEl);
    } else if (t.identifier === state.cameraTouchId && cameraState) {
      const dx = t.clientX - state.lastCamX;
      const dy = t.clientY - state.lastCamY;
      state.lastCamX = t.clientX;
      state.lastCamY = t.clientY;
      cameraState.yaw -= dx * 0.007;
      cameraState.pitch = Math.max(0.15, Math.min(1.15, cameraState.pitch + dy * 0.005));
    }
  }
}

function handleTouchEnd(e, knobEl) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === state.joystickTouchId) {
      resetJoystick(knobEl);
    } else if (t.identifier === state.cameraTouchId) {
      state.cameraTouchId = null;
    }
  }
}

export function showVirtualJoystick() {
  const container = document.getElementById('virtual-controls');
  if (container && isTouchDevice()) {
    container.classList.remove('hidden');
    state.enabled = true;
  }
}

export function hideVirtualJoystick() {
  const container = document.getElementById('virtual-controls');
  if (container) {
    container.classList.add('hidden');
    state.enabled = false;
  }
  const knobEl = document.getElementById('virtual-joystick-knob');
  resetJoystick(knobEl);
}

function attachTouchEvents(zoneEl, knobEl, baseEl, cameraState, onJump) {
  window.addEventListener('touchstart', (e) => {
    if (state.enabled) handleTouchStart(e, zoneEl, knobEl, baseEl, onJump);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (state.enabled) handleTouchMove(e, knobEl, cameraState);
  }, { passive: false });

  const onEnd = (e) => { if (state.enabled) handleTouchEnd(e, knobEl); };
  window.addEventListener('touchend', onEnd, { passive: false });
  window.addEventListener('touchcancel', onEnd, { passive: false });
}

export function initVirtualJoystick(options = {}) {
  const { cameraState, onJump } = options;
  const zoneEl = document.getElementById('virtual-joystick-zone');
  const baseEl = document.getElementById('virtual-joystick-base');
  const knobEl = document.getElementById('virtual-joystick-knob');
  const jumpBtn = document.getElementById('btn-virtual-jump');
  if (!zoneEl || !baseEl || !knobEl) return;

  attachTouchEvents(zoneEl, knobEl, baseEl, cameraState, onJump);
  if (jumpBtn) {
    jumpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onJump) onJump();
    });
  }
}
