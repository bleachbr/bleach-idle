// Janela de opções (R-14, ADR-001 §2.4) e os atalhos de HD e som do cabeçalho.
// Os dois caminhos leem e gravam as mesmas preferências (prefs.ts), então mostram sempre o mesmo estado.
// O corpo da janela é montado por código e com textContent: nada do armazenamento vira HTML.
import type Phaser from "phaser";
import type { GameScene } from "./GameScene";
import { sfx } from "./sfx";
import { browserStore } from "./loreRead";
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from "./prefs";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

type Flag = "hd" | "mute";
/** `invert`: a caixa marcada quer dizer o contrário do campo (som ligado = mute falso). */
type Toggle = { key: Flag; label: string; hint: string; invert?: boolean };
const SECTIONS: { title: string; toggles: Toggle[] }[] = [
  { title: "Visual", toggles: [{ key: "hd", label: "Visual HD (desenho original)", hint: "Desligado, o jogo usa pixel art. Na primeira vez que liga, o jogo baixa os desenhos em HD." }] },
  { title: "Som", toggles: [{ key: "mute", label: "Efeitos sonoros", hint: "O navegador só toca som depois do primeiro clique ou tecla.", invert: true }] },
];

export function initOptions(game: Phaser.Game, closeWindows: (keep?: string) => void) {
  const store = browserStore();
  let prefs = loadPrefs(store);
  const panel = $("#options");
  const hdBtn = $<HTMLButtonElement>("#hd-btn");
  const muteBtn = $<HTMLButtonElement>("#mute-btn");
  const boxes = new Map<Toggle, HTMLInputElement>();
  let hdLoading = false;

  // ---------- visual: pixel art ou desenho original (HD) ----------
  const applyHd = () => {
    const scene = game.scene.getScene("game") as GameScene | null;
    if (!scene?.sys.isActive()) return void window.setTimeout(applyHd, 300); // a cena ainda está carregando
    hdLoading = prefs.hd; // ligar pode baixar as folhas HD: "…" no botão até terminar
    sync();
    scene.setHd(prefs.hd, () => { hdLoading = false; sync(); });
  };

  const sync = () => {
    hdBtn.classList.toggle("on", prefs.hd);
    hdBtn.textContent = hdLoading ? "…" : "HD";
    hdBtn.title = prefs.hd ? "Visual HD: desenho original (clique para pixel art)" : "Visual pixel art (clique para o desenho original em HD)";
    muteBtn.dataset.ico = prefs.mute ? "mute" : "sound";
    muteBtn.title = prefs.mute ? "Som desligado (clique para ligar)" : "Som ligado (clique para desligar)";
    for (const [t, box] of boxes) box.checked = t.invert ? !prefs[t.key] : prefs[t.key];
  };

  /** Toda mudança passa por aqui: grava, aplica o que mudou e atualiza cabeçalho e janela. */
  const set = (patch: Partial<Prefs>) => {
    const before = prefs;
    prefs = { ...prefs, ...patch };
    savePrefs(store, prefs);
    if (prefs.mute !== before.mute) sfx.setMuted(prefs.mute);
    if (prefs.hd !== before.hd) applyHd();
    sync();
  };
  const setFlag = (key: Flag, value: boolean) => {
    const patch: Partial<Prefs> = {};
    patch[key] = value;
    set(patch);
  };

  const body = $("#options-body");
  for (const sec of SECTIONS) {
    const box = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = sec.title;
    box.append(legend);
    for (const t of sec.toggles) {
      const row = document.createElement("label");
      row.className = "opt-row";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.onchange = () => setFlag(t.key, t.invert ? !check.checked : check.checked);
      const text = document.createElement("span");
      text.textContent = t.label;
      row.append(check, text);
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = t.hint;
      hint.id = `opt-hint-${t.key}`;
      check.setAttribute("aria-describedby", hint.id);
      box.append(row, hint);
      boxes.set(t, check);
    }
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "link";
    reset.textContent = "Voltar ao padrão";
    reset.onclick = () => { for (const t of sec.toggles) setFlag(t.key, DEFAULT_PREFS[t.key]); };
    box.append(reset);
    body.append(box);
  }

  hdBtn.onclick = () => setFlag("hd", !prefs.hd);
  muteBtn.onclick = () => setFlag("mute", !prefs.mute);
  // o Enter no ⚙ aciona o botão; sem isto o ouvinte de window do chat o cancela e foca o chat (como no painel abaixo)
  $("#options-btn").addEventListener("keydown", (e) => { if (e.code === "Enter") e.stopPropagation(); });
  $("#options-btn").onclick = () => {
    if (panel.hidden) { closeWindows("#options"); panel.hidden = false; }
    else panel.hidden = true;
  };
  $("#options-close").onclick = () => (panel.hidden = true);
  // o Enter dentro da janela aciona o botão ou a caixa focada; o ouvinte de window do chat não pode roubá-lo
  panel.addEventListener("keydown", (e) => { if (e.code === "Enter") e.stopPropagation(); });

  // a primeira carga traz bi_hd e bi_mute para bi.prefs (ADR-001 §2.2); daqui em diante bi.prefs manda
  savePrefs(store, prefs);
  sfx.setMuted(prefs.mute);
  sync();
  if (prefs.hd) applyHd();
}
