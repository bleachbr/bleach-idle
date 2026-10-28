// Login, conexão com o servidor e HUD em DOM ao redor do canvas do Phaser.
import Phaser from "phaser";
import { Client, type Room } from "colyseus.js";
import { CHARS, expForLevel, PVP_MIN_LEVEL } from "../../shared/src";
import { GameScene, gameConfig } from "./GameScene";
import { initInventory } from "./inventory";
import { serverNow, syncClock } from "./clock";
import { initTouch, registerPWA } from "./touch";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const SERVER = import.meta.env.VITE_SERVER ?? `ws://${location.hostname}:2567`;

// ---------- conta e personagens ----------

const client = new Client(SERVER);
let lobby: Room | null = null;
const store = {
  get: () => { try { return localStorage.getItem("bi.token"); } catch { return null; } },
  set: (t: string | null) => { try { t ? localStorage.setItem("bi.token", t) : localStorage.removeItem("bi.token"); } catch {} },
};
const show = (id: "login" | "lobby" | "app") => {
  for (const s of ["login", "lobby", "app"]) $(`#${s}`).hidden = s !== id;
};

let charId = "ichigo";
const chars = $("#chars");
for (const ch of Object.values(CHARS)) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "char";
  b.setAttribute("aria-pressed", String(ch.id === charId));
  b.innerHTML = `<div class="portrait" style="background-image:url(/assets/sprites/${ch.forms[0].sprite}.png)"></div>${ch.name}`;
  b.onclick = () => {
    charId = ch.id;
    chars.querySelectorAll(".char").forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
  };
  chars.append(b);
}

async function enterLobby(opts: Record<string, unknown>) {
  const room = await client.joinOrCreate("lobby", opts);
  lobby = room;
  room.onMessage("account", (m: { login: string; token?: string }) => {
    $("#acc-login").textContent = m.login;
    if (m.token) store.set(m.token);
  });
  room.onMessage("chars", renderChars);
  room.onMessage("error", (m: { text: string }) => ($("#lobby-error").textContent = m.text));
  room.onMessage("ticket", async (m: { ticket: string }) => {
    lobby = null;
    await room.leave();
    try {
      start(await client.join("world", { ticket: m.ticket }), playing);
    } catch (err: any) {
      // volta para a lista (com o token lembrado) ou para o login
      await backToStart(err?.message ?? "Não foi possível entrar no mundo.");
    }
  });
  $("#lobby-error").textContent = "";
  show("lobby");
}

let playing = "";
function renderChars(list: { id: string; name: string; charId: string; level: number; hunting: boolean }[]) {
  const box = $("#char-list");
  if (!list.length) {
    box.innerHTML = `<p class="empty">Nenhum personagem ainda. Crie o primeiro abaixo.</p>`;
    return;
  }
  box.replaceChildren(...list.map((c) => {
    const row = document.createElement("div");
    row.className = "char-row";
    const sprite = CHARS[c.charId]?.forms[0].sprite ?? "ichigo_shikai";
    row.innerHTML = `<div class="portrait" style="background-image:url(/assets/sprites/${sprite}.png)"></div>
      <div class="info"><b></b><small>${CHARS[c.charId]?.name ?? c.charId} · nível ${c.level}</small>${c.hunting ? `<span class="badge">caçando offline</span>` : ""}</div>`;
    row.querySelector("b")!.textContent = c.name;
    const play = document.createElement("button");
    play.type = "button";
    play.className = "primary";
    play.textContent = "Jogar";
    play.onclick = () => { playing = c.id; play.disabled = true; lobby?.send("play", { id: c.id }); };
    const del = document.createElement("button");
    del.type = "button";
    del.className = "link";
    del.textContent = "excluir";
    del.onclick = () => { if (confirm(`Excluir ${c.name} para sempre?`)) lobby?.send("delete", { id: c.id }); };
    row.append(play, del);
    return row;
  }));
}

async function backToStart(error = "") {
  const token = store.get();
  if (token) {
    try {
      await enterLobby({ token });
      $("#lobby-error").textContent = error;
      return;
    } catch {
      store.set(null);
    }
  }
  $("#auth-error").textContent = error;
  show("login");
}

$("#auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const action = ((e as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "register" ? "register" : "login";
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("#auth-form button")];
  buttons.forEach((b) => (b.disabled = true));
  $("#auth-error").textContent = "";
  try {
    await enterLobby({
      action,
      login: $<HTMLInputElement>("#login-name").value.trim().toLowerCase(),
      password: $<HTMLInputElement>("#login-pass").value,
      remember: $<HTMLInputElement>("#remember").checked,
    });
    $<HTMLInputElement>("#login-pass").value = "";
  } catch (err: any) {
    $("#auth-error").textContent = err?.message || "Não foi possível conectar ao servidor.";
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
});

$("#create-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#lobby-error").textContent = "";
  lobby?.send("create", { name: $<HTMLInputElement>("#new-name").value.trim(), charId });
  $<HTMLInputElement>("#new-name").value = "";
});

$("#logout-btn").onclick = () => {
  lobby?.send("logout");
  store.set(null);
  lobby = null;
  show("login");
};

// "/?login" abre direto o login (para entrar com outra conta sem apagar o login lembrado)
if (new URLSearchParams(location.search).has("login")) show("login");
else backToStart();
registerPWA();

// ---------- jogo ----------

function start(room: Room<any>, myId: string) {
  show("app");
  $("#exit-btn").onclick = async () => {
    await room.leave(); // com Auto Hunt ligado, o personagem segue caçando offline
    location.reload();
  };

  const inventory = initInventory(room, (open) => (game.scene.getScene("game") as GameScene | null)?.setPanelOpen(open),
    () => room.state.players.get(myId)?.level ?? 1);
  const onMe = (p: any) => {
    renderStats(p);
    inventory.onMove(p.x, p.y);
  };
  const game = new Phaser.Game(gameConfig("game"));
  game.scene.add("game", GameScene, true, { room, myId, onMe, onPlayerClick: (id: string, x: number, y: number) => playerMenu(room, myId, id, x, y) });
  initTouch(room, (dir) => (game.scene.getScene("game") as GameScene | null)?.setTouchDir(dir));
  // girar o celular, abrir o teclado ou o menu muda o tamanho: reajusta o canvas na hora
  new ResizeObserver(() => game.scale.refresh()).observe($("#game"));
  // depuração no navegador (só em dev): window.__bi.room.state, window.__bi.sent
  if (import.meta.env.DEV) {
    const sent: unknown[] = [];
    const send = room.send.bind(room);
    room.send = ((type: any, msg?: any) => { sent.push([type, msg]); if (sent.length > 50) sent.shift(); send(type, msg); }) as typeof room.send;
    Object.assign(window, { __bi: { room, game, sent } });
  }

  // canais: local (sem ch), pm, party, guild e sys (avisos do servidor)
  room.onMessage("chat", (m: { from: string; text: string; ch?: string }) => {
    const prefix = m.ch === "pm" ? "[pm] " : m.ch === "party" ? "[party] " : m.ch === "guild" ? "[guilda] " : "";
    chatLine(m.from ? `${prefix}${m.from}: ${m.text}` : `${prefix}${m.text}`, m.ch && m.ch !== "sys" ? m.ch : m.from ? "" : "sys");
  });
  bindGuild(room);
  room.onMessage("log", (m: { text: string }) => chatLine(m.text, "log"));
  room.onMessage("offline", (m: { minutes: number; exp: number; gold: number; level: number; deaths?: DeathReport[] }) => {
    chatLine(`Hunt offline: ${m.minutes} min, ${m.exp >= 0 ? "+" : ""}${m.exp} XP, ${m.gold >= 0 ? "+" : ""}${m.gold} kan. Você está no nível ${m.level}.`, "log");
    if (m.deaths?.length) showDeath(m.deaths, true);
  });
  room.onMessage("death", (d: DeathReport) => showDeath([d], false));
  $("#death-ok").onclick = () => ($("#death").hidden = true);
  room.onLeave((code) => chatLine(code === 4001
    ? "Este personagem entrou em outra janela. Esta sessão foi encerrada."
    : "Conexão perdida. Recarregue a página para entrar de novo.", "sys"));

  bindAuto(room);
  bindParty(room, myId);
  syncClock(room);
  const chatin = $<HTMLInputElement>("#chatin");
  window.addEventListener("keydown", (e) => {
    if (e.code === "Enter" && document.activeElement !== chatin) { e.preventDefault(); chatin.focus(); }
  });
  chatin.addEventListener("keydown", (e) => {
    if (e.code === "Enter") {
      if (chatin.value.trim()) room.send("chat", { text: chatin.value });
      chatin.value = "";
      chatin.blur();
    } else if (e.code === "Escape") chatin.blur();
  });
}

// ---------- party e PvP ----------

const escHtml = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Menu ao clicar em outro jogador: convidar/expulsar da party e atacar. */
function playerMenu(room: Room<any>, myId: string, id: string, x: number, y: number) {
  const me = room.state.players.get(myId);
  const p = room.state.players.get(id);
  if (!me || !p) return;
  const ctx = $("#ctx");
  const sameParty = !!me.partyId && me.partyId === p.partyId;
  const items: [string, string, () => void][] = [];
  if (!sameParty && !p.partyId && (!me.partyId || me.partyLead)) items.push(["Convidar para a party", "", () => room.send("partyInvite", { id })]);
  if (sameParty && me.partyLead) items.push(["Expulsar da party", "", () => room.send("partyKick", { id })]);
  if (!sameParty) items.push(["Atacar", "danger", () => room.send("target", { id })]);
  ctx.innerHTML = `<b>${escHtml(p.name)} <small>nível ${p.level}${p.online ? "" : " · caçando offline"}</small></b>`;
  for (const [label, cls, fn] of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = label;
    b.onclick = () => { fn(); ctx.hidden = true; };
    ctx.append(b);
  }
  if (!sameParty) {
    const note = document.createElement("small");
    note.textContent = `Atacar bloqueia viagem por 3 min. PvP só a partir do nível ${PVP_MIN_LEVEL}, fora da praça.`;
    ctx.append(note);
  }
  ctx.style.left = `${Math.min(x, innerWidth - 200)}px`;
  ctx.style.top = `${Math.min(y, innerHeight - 160)}px`;
  ctx.hidden = false;
  setTimeout(() => document.addEventListener("pointerdown", function off(e) {
    if (!ctx.contains(e.target as Node)) { ctx.hidden = true; document.removeEventListener("pointerdown", off); }
  }), 0);
}

function bindParty(room: Room<any>, myId: string) {
  room.onMessage("partyInvite", (m: { from: string }) => {
    $("#invite-text").textContent = `${m.from} convidou você para a party.`;
    $("#invite").hidden = false;
  });
  const answer = (accept: boolean) => { room.send("partyAnswer", { accept }); $("#invite").hidden = true; };
  $("#invite-yes").onclick = () => answer(true);
  $("#invite-no").onclick = () => answer(false);
  $("#party-leave").onclick = () => room.send("partyLeave");

  // painel e contador do bloqueio: redesenha 2x por segundo
  setInterval(() => {
    const me = room.state.players.get(myId);
    if (!me) return;
    const left = Math.ceil((me.pvpUntil - serverNow()) / 1000);
    const lock = $("#pvp-lock");
    lock.hidden = left <= 0;
    if (left > 0) lock.textContent = `Atacou um jogador: viagem e praça bloqueadas por ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    const members = me.partyId ? [...room.state.players.values()].filter((p: any) => p.partyId === me.partyId) : [];
    $("#party-leave").hidden = !members.length;
    const list = $("#party-list");
    if (!members.length) {
      list.innerHTML = `<p class="hint">Sem party. Clique em outro jogador para convidar (até 4; XP dividida com +10% por membro extra).</p>`;
      return;
    }
    list.innerHTML = members.map((p: any) => `<div class="member">${p.partyLead ? `<span class="lead" title="Líder">★</span>` : ""}<span>${escHtml(p.name)} <small>${p.level}</small></span><span class="mbar"><i style="width:${Math.max(0, (p.hp / p.maxHp) * 100)}%"></i></span></div>`).join("");
  }, 500);
}

// ---------- guilda e ranking ----------

function bindGuild(room: Room<any>) {
  room.onMessage("guild", (g: null | { name: string; tag: string; bank: number; leader: boolean; members: { name: string; level: number; leader: boolean; online: boolean }[] }) => {
    const body = $("#guild-body");
    if (!g) {
      body.innerHTML = `<p class="hint">Sem guilda. <code>/guilda criar Nome</code> (500 kan, nível 10+) ou aceite um convite.</p>`;
      return;
    }
    const members = [...g.members].sort((a, b) => Number(b.online) - Number(a.online) || b.level - a.level);
    body.innerHTML = `<div class="who"><b>${escHtml(g.name)}</b> <span class="tag">[${escHtml(g.tag)}]</span></div>
      <div class="hint">Banco: ${g.bank} kan · ${g.members.length} membros</div>
      ${members.map((m) => `<div class="member${m.online ? "" : " off"}">${m.leader ? `<span class="lead" title="Líder">★</span>` : ""}<span>${escHtml(m.name)} <small>${m.level}</small></span></div>`).join("")}
      <p class="hint"><code>/g</code> fala com a guilda · <code>/guilda depositar 100</code>${g.leader ? " · <code>/guilda convidar Nome</code> · <code>/guilda sacar 100</code>" : ""} · <code>/guilda sair</code></p>`;
  });

  const panel = $("#ranking");
  let data: any = null;
  let tab = "nivel";
  const render = () => {
    panel.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
    if (!data) return;
    const rows: string[] = (data[tab] as any[]).map((r, i) => tab === "guildas"
      ? `<tr><td>${i + 1}</td><td>${escHtml(r.name)} <small>[${escHtml(r.tag)}]</small></td><td>${r.frags} abates</td><td>${r.members} membros · ${r.levels} níveis</td></tr>`
      : `<tr><td>${i + 1}</td><td>${escHtml(r.name)}${r.guild ? ` <small>[${escHtml(r.guild)}]</small>` : ""}</td><td>${CHARS[r.charId]?.name ?? ""}</td><td>${tab === "nivel" ? `nível ${r.level}` : `${r.frags} abates`}</td></tr>`);
    $("#ranking-body").innerHTML = rows.length ? `<table>${rows.join("")}</table>` : `<p class="hint">Ninguém aqui ainda.</p>`;
  };
  room.onMessage("ranking", (d: any) => { data = d; panel.hidden = false; render(); });
  $("#ranking-btn").onclick = () => room.send("ranking");
  $("#ranking-close").onclick = () => (panel.hidden = true);
  panel.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => (b.onclick = () => { tab = b.dataset.tab!; render(); }));
}

interface DeathReport { by: string; exp: number; gold: number; items: string[]; protected: boolean; at: number }

function showDeath(list: DeathReport[], offline: boolean) {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  $("#death-body").innerHTML = list.map((d) => {
    const when = offline ? ` <small>(${new Date(d.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}, caçando offline)</small>` : "";
    if (d.protected) return `<p>Morto por <b>${esc(d.by)}</b>${when}.</p><p class="safe">O Amuleto da Alma se desfez e protegeu seu XP, seus itens e seu dinheiro.</p>`;
    const items = d.items.length ? `<ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="safe">Nenhum item perdido.</p>`;
    return `<p>Morto por <b>${esc(d.by)}</b>${when}.</p><p>Perdeu ${d.exp} XP e ${d.gold} kan.</p>${items}`;
  }).join("<hr>") + `<p class="hint">Equipe um Amuleto da Alma (loja do Kisuke) para não perder nada. O depot nunca perde itens.</p>`;
  $("#death").hidden = false;
}

function setBar(sel: string, value: number, max: number, text: string) {
  const el = $(sel);
  (el.querySelector("i") as HTMLElement).style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  (el.querySelector("span") as HTMLElement).textContent = text;
}

function renderStats(p: any) {
  const ch = CHARS[p.charId];
  $("#pname").textContent = p.name;
  $("#plevel").textContent = `nível ${p.level}`;
  setBar(".bar.hp", p.hp, p.maxHp, `HP ${p.hp}/${p.maxHp}`);
  setBar(".bar.rei", p.rei, p.maxRei, `Reiatsu ${Math.floor(p.rei)}/${p.maxRei}`);
  const a = expForLevel(p.level), b = expForLevel(p.level + 1);
  setBar(".bar.exp", p.exp - a, b - a, `XP ${Math.round(((p.exp - a) / (b - a)) * 100)}%`);
  $("#pform").textContent = ch.forms[p.form].label;
  $("#skill-name").textContent = `${ch.skill.name} (${ch.skill.cost} reiatsu)`;
  // o servidor pode desligar o Auto Hunt (ex.: ao morrer): espelha nos controles
  $<HTMLInputElement>("#auto-target").checked = p.autoTarget;
  $<HTMLInputElement>("#auto-hunt").checked = p.autoHunt;
  $<HTMLInputElement>("#auto-heal-on").checked = p.autoHeal > 0;
}

function bindAuto(room: Room<any>) {
  const target = $<HTMLInputElement>("#auto-target");
  const hunt = $<HTMLInputElement>("#auto-hunt");
  const healOn = $<HTMLInputElement>("#auto-heal-on");
  const heal = $<HTMLInputElement>("#auto-heal");
  const sendHeal = () => room.send("auto", { autoHeal: healOn.checked ? Number(heal.value) || 50 : 0 });
  target.onchange = () => room.send("auto", { autoTarget: target.checked });
  hunt.onchange = () => room.send("auto", { autoHunt: hunt.checked });
  healOn.onchange = sendHeal;
  heal.onchange = sendHeal;
}

function chatLine(text: string, cls: string) {
  const log = $("#chatlog");
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = text;
  log.append(div);
  while (log.children.length > 200) log.firstChild!.remove();
  log.scrollTop = log.scrollHeight;
}
