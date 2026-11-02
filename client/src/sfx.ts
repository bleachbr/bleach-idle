// Efeitos sonoros sintetizados na hora (Web Audio): nenhum arquivo de áudio para baixar.
// O navegador só libera o som depois de um clique ou tecla; até lá tudo fica mudo.

type Note = { f: number; to?: number; at?: number; dur: number; type?: OscillatorType; vol?: number };

const KEY = "bi_mute";
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } })();
let last: Record<string, number> = {};

function unlock() {
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return; }
  }
  if (ctx.state === "suspended") void ctx.resume();
}
window.addEventListener("pointerdown", unlock);
window.addEventListener("keydown", unlock);

function play(notes: Note[], master = 0.12) {
  if (muted || !ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  for (const n of notes) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t0 = now + (n.at ?? 0);
    o.type = n.type ?? "square";
    o.frequency.setValueAtTime(n.f, t0);
    if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, t0 + n.dur);
    g.gain.setValueAtTime((n.vol ?? 1) * master, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + n.dur + 0.02);
  }
}

/** no máximo um por `gap` ms do mesmo tipo (Auto Hunt gera muitos eventos seguidos) */
function throttled(kind: string, gap: number, notes: Note[], master?: number) {
  const t = performance.now();
  if (t - (last[kind] ?? 0) < gap) return;
  last[kind] = t;
  play(notes, master);
}

export const sfx = {
  hit: () => throttled("hit", 90, [{ f: 220, to: 90, dur: 0.08, type: "square", vol: 0.6 }]),
  hurt: () => throttled("hurt", 150, [{ f: 140, to: 60, dur: 0.14, type: "sawtooth", vol: 0.7 }]),
  skill: () => throttled("skill", 120, [{ f: 300, to: 1200, dur: 0.18, type: "sawtooth", vol: 0.5 }, { f: 900, to: 400, at: 0.12, dur: 0.15, type: "triangle", vol: 0.5 }]),
  loot: () => throttled("loot", 120, [{ f: 988, dur: 0.07, type: "square", vol: 0.4 }, { f: 1319, at: 0.07, dur: 0.12, type: "square", vol: 0.4 }]),
  heal: () => throttled("heal", 300, [{ f: 523, dur: 0.12, type: "triangle" }, { f: 784, at: 0.08, dur: 0.18, type: "triangle" }]),
  // ação recusada (poção com a barra cheia, #41): dois toques graves e baixos
  deny: () => throttled("deny", 300, [{ f: 196, dur: 0.07, type: "square", vol: 0.3 }, { f: 147, at: 0.09, dur: 0.1, type: "square", vol: 0.3 }]),
  level: () => play([523, 659, 784, 1047].map((f, i) => ({ f, at: i * 0.09, dur: 0.2, type: "square" as OscillatorType, vol: 0.6 }))),
  chime: () => throttled("chime", 400, [{ f: 1047, dur: 0.15, type: "triangle" }, { f: 1568, at: 0.1, dur: 0.3, type: "triangle" }]),
  bankai: () => play([{ f: 80, to: 40, dur: 0.6, type: "sawtooth", vol: 1 }, { f: 400, to: 1600, dur: 0.4, type: "triangle", vol: 0.5 }]),
  event: () => play([{ f: 196, dur: 0.35, type: "sawtooth" }, { f: 147, at: 0.35, dur: 0.5, type: "sawtooth" }], 0.15),
  die: () => throttled("die", 200, [{ f: 330, to: 55, dur: 0.25, type: "square", vol: 0.5 }]),
  isMuted: () => muted,
  setMuted(v: boolean) {
    muted = v;
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* sem armazenamento: só nesta sessão */ }
  },
};
