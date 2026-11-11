// =======================================================================
// SFX DE COMBATE — Web Audio procedural (híbrido: sample opcional no preset)
// =======================================================================

import { isMusicMuted } from './audio.js';
import { sfxPreset, sfxPresetForFx } from './sfxConfig.js';

let ctx = null;
let lastHitAt = 0;
let pendingUnlock = null;
const HIT_GAP_SEC = 0.05;

function detachUnlockListener() {
  if (!pendingUnlock) return;
  window.removeEventListener('pointerdown', pendingUnlock);
  window.removeEventListener('keydown', pendingUnlock);
  pendingUnlock = null;
}

function attachUnlockListener() {
  if (typeof window === 'undefined' || pendingUnlock) return;
  pendingUnlock = () => {
    detachUnlockListener();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', pendingUnlock, { once: true });
  window.addEventListener('keydown', pendingUnlock, { once: true });
}

function audioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    attachUnlockListener();
  }
  return ctx;
}

/** Chamar em gesto do usuário (ex.: desmutar com M) para liberar o AudioContext. */
export function unlockSfx() {
  const c = audioCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  else detachUnlockListener();
}

function connectGain(c, gain) {
  const g = c.createGain();
  g.gain.value = gain;
  g.connect(c.destination);
  return g;
}

function tone(c, dest, type, freq, t0, dur, peak) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(c, dest, t0, dur, peak) {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function startSlash(c, dest, t0) {
  tone(c, dest, 'sawtooth', 420, t0, 0.08, 0.5);
  tone(c, dest, 'square', 180, t0, 0.06, 0.25);
  noiseBurst(c, dest, t0, 0.05, 0.2);
}

function startHit(c, dest, t0) {
  tone(c, dest, 'triangle', 220, t0, 0.04, 0.45);
  noiseBurst(c, dest, t0, 0.03, 0.15);
}

function startDeath(c, dest, t0) {
  tone(c, dest, 'sawtooth', 160, t0, 0.18, 0.4);
  tone(c, dest, 'triangle', 90, t0 + 0.02, 0.22, 0.3);
  noiseBurst(c, dest, t0, 0.16, 0.35);
}

function startHurt(c, dest, t0) {
  tone(c, dest, 'square', 140, t0, 0.12, 0.45);
  tone(c, dest, 'sawtooth', 70, t0, 0.14, 0.25);
}

function startWave(c, dest, t0) {
  tone(c, dest, 'sawtooth', 110, t0, 0.28, 0.4);
  tone(c, dest, 'sine', 55, t0, 0.3, 0.35);
  noiseBurst(c, dest, t0, 0.12, 0.2);
}

function startZap(c, dest, t0) {
  tone(c, dest, 'square', 880, t0, 0.06, 0.35);
  tone(c, dest, 'square', 1320, t0 + 0.02, 0.05, 0.25);
  noiseBurst(c, dest, t0, 0.04, 0.15);
}

function startBoom(c, dest, t0) {
  tone(c, dest, 'sine', 60, t0, 0.25, 0.55);
  noiseBurst(c, dest, t0, 0.2, 0.4);
}

function startPunch(c, dest, t0) {
  tone(c, dest, 'triangle', 90, t0, 0.1, 0.5);
  noiseBurst(c, dest, t0, 0.08, 0.3);
}

function startArrow(c, dest, t0) {
  tone(c, dest, 'triangle', 740, t0, 0.07, 0.3);
  tone(c, dest, 'sine', 980, t0 + 0.02, 0.05, 0.2);
}

function startRoar(c, dest, t0) {
  tone(c, dest, 'sawtooth', 80, t0, 0.35, 0.45);
  tone(c, dest, 'sawtooth', 120, t0 + 0.05, 0.28, 0.3);
  noiseBurst(c, dest, t0, 0.22, 0.35);
}

const SYNTH = {
  slash: startSlash,
  hit: startHit,
  death: startDeath,
  hurt: startHurt,
  wave: startWave,
  zap: startZap,
  boom: startBoom,
  punch: startPunch,
  arrow: startArrow,
  roar: startRoar
};

function playSample(c, dest, url, t0) {
  // Híbrido: sample no preset; falha silenciosa se o arquivo não carregar.
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => c.decodeAudioData(buf))
    .then((audio) => {
      const src = c.createBufferSource();
      src.buffer = audio;
      src.connect(dest);
      src.start(t0);
    })
    .catch(() => {});
}

function synthesize(preset) {
  const c = audioCtx();
  if (!c) return;
  const dest = connectGain(c, preset.gain);
  const t0 = c.currentTime;
  if (preset.sample) {
    playSample(c, dest, preset.sample, t0);
    return;
  }
  const fn = SYNTH[preset.kind];
  if (fn) fn(c, dest, t0);
}

export function playSfx(id) {
  if (isMusicMuted()) return;
  const preset = sfxPreset(id);
  if (preset) synthesize(preset);
}

export function playFxFireSfx(fxId) {
  if (isMusicMuted()) return;
  const preset = sfxPresetForFx(fxId);
  if (preset) synthesize(preset);
}

export function playHitSfx(nowSec = performance.now() / 1000) {
  if (nowSec - lastHitAt < HIT_GAP_SEC) return;
  lastHitAt = nowSec;
  playSfx('hit');
}
