// Login, conexão com o servidor e HUD em DOM ao redor do canvas do Phaser.
import Phaser from "phaser";
import "@fontsource/pixelify-sans/500.css";
import "@fontsource/pixelify-sans/700.css";
import { Client, type Room } from "colyseus.js";
import { CHARS, ITEMS, expForLevel, PVP_MIN_LEVEL, rebirthLevel, rebirthBonus } from "../../shared/src";
import { GameScene, gameConfig } from "./GameScene";
import { initInventory, iconHtml } from "./inventory";
import { serverNow, syncClock } from "./clock";
import { initTouch, registerPWA } from "./touch";
import { sfx } from "./sfx";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
// em produção o servidor entrega a página e o WebSocket no mesmo endereço (wss atrás do HTTPS);
// em desenvolvimento o Vite roda na 5173 e o servidor na 2567
const SERVER = import.meta.env.VITE_SERVER
  ?? (import.meta.env.PROD ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}` : `ws://${location.hostname}:2567`);

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
  room.onMessage("passwordOk", () => {
    $("#pw-msg").textContent = "Senha trocada. Os outros aparelhos lembrados precisam entrar de novo.";
    $<HTMLFormElement>("#pw-form").reset();
  });
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

$("#pw-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#lobby-error").textContent = "";
  $("#pw-msg").textContent = "";
  lobby?.send("password", { old: $<HTMLInputElement>("#pw-old").value, new: $<HTMLInputElement>("#pw-new").value });
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
    () => room.state.players.get(myId)?.level ?? 1,
    () => { const p = room.state.players.get(myId); return p ? { x: p.x, y: p.y } : undefined; });
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
  bindBook(room);
  bindDangai(room, myId);
  $("#rebirth-btn").onclick = () => {
    const me = room.state.players.get(myId);
    if (!me) return;
    const b = rebirthBonus(me.rebirths + 1);
    const ok = confirm(`Renascer volta você ao nível 8 e leva para a praça de Karakura.\n\nVocê mantém itens, equipamento, kan, forja, bestiário, conquistas e habilidades.\n\nBônus permanentes depois deste renascimento: +${Math.round((b.exp - 1) * 100)}% de XP, +${Math.round((b.dmg - 1) * 100)}% de dano e +${Math.round((b.hp - 1) * 100)}% de vida.\n\nRenascer agora?`);
    if (ok) room.send("rebirth");
  };
  const mute = $("#mute-btn");
  const showMute = () => { mute.dataset.ico = sfx.isMuted() ? "mute" : "sound"; mute.title = sfx.isMuted() ? "Som desligado (clique para ligar)" : "Som ligado (clique para desligar)"; };
  showMute();
  mute.onclick = () => { sfx.setMuted(!sfx.isMuted()); showMute(); };
  room.onMessage("log", (m: { text: string }) => chatLine(m.text, "log"));
  room.onMessage("offline", (m: { minutes: number; exp: number; gold: number; level: number; deaths?: DeathReport[]; zanGain?: number; reiGain?: number; zanjutsu?: number; reiryoku?: number; kills?: number; items?: string[] }) => {
    const sign = (n: number) => (n >= 0 ? "+" : "") + n;
    const skills = [m.zanGain ? `Zanjutsu ${sign(m.zanGain)} (agora ${m.zanjutsu})` : "", m.reiGain ? `Reiryoku ${sign(m.reiGain)} (agora ${m.reiryoku})` : ""].filter(Boolean).join(", ");
    chatLine(`Tempo offline: ${m.minutes} min, ${m.kills ?? 0} abates, ${sign(m.exp)} XP, ${sign(m.gold)} kan${skills ? `, ${skills}` : ""}. Você está no nível ${m.level}.`, "log");
    if (m.items?.length) chatLine(`Loot offline: ${m.items.slice(0, 8).join(", ")}${m.items.length > 8 ? ` e mais ${m.items.length - 8} tipos` : ""}.`, "log");
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
  const partyTimer = setInterval(() => {
    const me = room.state.players.get(myId);
    if (!me) return;
    const left = Math.ceil((me.pvpUntil - serverNow()) / 1000);
    const skull = Math.ceil((me.skullUntil - serverNow()) / 60000);
    const lock = $("#pvp-lock");
    lock.hidden = left <= 0 && skull <= 0;
    if (skull > 0) lock.textContent = `☠ Assassino por mais ${skull} min: sem viagem, qualquer um pode atacá-lo e, se morrer, perde muito mais.`;
    else if (left > 0) lock.textContent = `Atacou um jogador: viagem e praça bloqueadas por ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    const members = me.partyId ? [...room.state.players.values()].filter((p: any) => p.partyId === me.partyId) : [];
    $("#party-leave").hidden = !members.length;
    const list = $("#party-list");
    if (!members.length) {
      list.innerHTML = `<p class="hint">Sem party. Clique em outro jogador para convidar (até 4; XP dividida com +10% por membro extra).</p>`;
      return;
    }
    list.innerHTML = members.map((p: any) => `<div class="member">${p.partyLead ? `<span class="lead" title="Líder">★</span>` : ""}<span>${escHtml(p.name)} <small>${p.level}</small></span><span class="mbar"><i style="width:${Math.max(0, (p.hp / p.maxHp) * 100)}%"></i></span></div>`).join("");
  }, 500);
  room.onLeave(() => clearInterval(partyTimer));
}

// ---------- livro: bestiário, conquistas e recompensa diária ----------

function bindBook(room: Room<any>) {
  const panel = $("#book");
  let data: any = null;
  let tab = "bestiario";
  const reward = (r: { gold: number; items?: { id: string; qty: number }[] }) =>
    [r.gold ? `${r.gold} kan` : "", ...(r.items ?? []).map((i) => `${i.qty}x ${ITEMS[i.id]?.name ?? i.id}`)].filter(Boolean).join(" + ");
  const bar = (have: number, need: number) => `<div class="bar"><i style="width:${Math.min(100, (have / need) * 100)}%"></i></div>`;
  const render = () => {
    panel.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
    if (!data) return;
    const body = $("#book-body");
    if (tab === "bestiario") {
      const done = data.bestiary.filter((b: any) => b.stage >= 3).length;
      body.innerHTML = `<p class="hint">Cada estágio dá +4% de dano contra o monstro; o 3º também dá +20% de chance de loot. ${done}/${data.bestiary.length} completos.</p>` +
        data.bestiary.map((b: any) => {
          const next = b.stages.find((n: number) => b.kills < n);
          return `<div class="beast${b.kills ? "" : " unknown"}">
            <div class="pic" style="background-image:url(assets/sprites/${b.sprite}.png);background-size:400% 400%"></div>
            <div><b>${b.kills ? escHtml(b.name) : "???"}</b>${b.boss ? ` <small>chefe</small>` : ""} <span class="stars">${"★".repeat(b.stage)}</span><span class="hint">${"☆".repeat(3 - b.stage)}</span>
            <div class="hint">${b.kills} abates${next ? ` · próximo estágio em ${next}` : " · completo"}${b.hp ? ` · ${b.hp} de vida · ${b.exp} XP` : ""}</div>
            ${next ? bar(b.kills, next) : ""}
            ${b.loot ? `<div class="hint">Loot: ${b.loot.map((l: any) => `${escHtml(l.name)} ${l.chance >= 1 ? "sempre" : `${+(l.chance * 100).toFixed(1)}%`}`).join(" · ")}</div>` : ""}</div>
          </div>`;
        }).join("");
    } else if (tab === "conquistas") {
      const n = data.ach.filter((a: any) => a.done).length;
      body.innerHTML = `<p class="hint">${n}/${data.ach.length} conquistas. A recompensa chega sozinha.</p>` + data.ach
        .sort((a: any, b: any) => Number(a.done) - Number(b.done) || b.have / b.need - a.have / a.need)
        .map((a: any) => `<div class="ach${a.done ? " done" : ""}"><b>${escHtml(a.name)}</b> <span class="hint">${escHtml(a.desc)}</span>
          <div class="hint">${a.done ? "Feita" : `${a.have}/${a.need}`} · ${reward(a.reward)}</div>${a.done ? "" : bar(a.have, a.need)}</div>`).join("");
    } else if (tab === "cacada") {
      const h = data.hunt;
      const hours = Math.max((h.now - h.since) / 3600_000, 1 / 60);
      const per = (v: number) => Math.round(v / hours).toLocaleString("pt-BR");
      const dur = Math.floor((h.now - h.since) / 60000);
      body.innerHTML = `<p class="hint">Desde ${dur >= 60 ? `${Math.floor(dur / 60)} h ${dur % 60} min` : `${dur} min`} atrás (conta também a caçada offline).</p>
        <table><tr><td></td><td>Total</td><td>Por hora</td></tr>
        <tr><td>XP</td><td>${h.exp.toLocaleString("pt-BR")}</td><td>${per(h.exp)}</td></tr>
        <tr><td>Kan</td><td>${h.gold.toLocaleString("pt-BR")}</td><td>${per(h.gold)}</td></tr>
        <tr><td>Abates</td><td>${h.kills}</td><td>${per(h.kills)}</td></tr></table>
        <p class="hint">Loot (kan acima conta o dinheiro do loot e a Auto Venda):</p>
        <div class="loot-list">${h.items.map((i: any) => `<span class="slot static" title="${escHtml(i.name)}">${iconHtml(i.icon, i.n)}</span>`).join("") || `<span class="hint">nada ainda</span>`}</div>
        <button type="button" class="claim">Zerar contagem</button>`;
      body.querySelector<HTMLButtonElement>(".claim")!.onclick = () => room.send("huntReset");
    } else {
      const d = data.daily;
      const ms = data.missions;
      const missions = `<h3>Missões de hoje</h3><p class="hint">Cada uma paga ${ms.gold} kan e ${ms.exp} XP sozinha ao completar; as três juntas dão uma Caixa do Kisuke${ms.bonus ? " (já ganha)" : ""}.</p>` +
        ms.list.map((m: any) => `<div class="ach${m.done ? " done" : ""}"><b>${escHtml(m.text)}</b><div class="hint">${m.done ? "Feita" : `${m.have}/${m.need}`}</div>${m.done ? "" : bar(m.have, m.need)}</div>`).join("");
      body.innerHTML = missions + `<h3>Recompensa de entrada</h3><p class="hint">Pegue uma vez por dia (o dia vira à meia-noite de Brasília). Perder um dia zera a sequência.</p>
        <div><b>Sequência: ${d.streak} ${d.streak === 1 ? "dia" : "dias"}</b></div>
        <div class="days">${d.rewards.map((r: any, i: number) => `<div class="${i < d.index || (d.claimed && i === d.index) ? "got" : ""}${i === d.index ? " today" : ""}"><b>Dia ${i + 1}</b><br>${reward(r)}</div>`).join("")}</div>
        <button type="button" class="claim" ${d.claimed ? "disabled" : ""}>${d.claimed ? "Já pegou hoje" : "Pegar a recompensa de hoje"}</button>`;
      body.querySelector<HTMLButtonElement>(".claim")!.onclick = () => room.send("daily");
    }
  };
  room.onMessage("book", (d: any) => { data = d; panel.hidden = false; render(); });
  room.onMessage("dailyReady", (m: { ready: boolean }) => $("#book-btn").classList.toggle("ping", m.ready));
  room.onMessage("tutorial", (steps: { text: string; done: boolean }[] | null) => {
    $("#tutorial").hidden = !steps;
    if (steps) $("#tutorial-list").innerHTML = steps.map((s) => `<div class="tut${s.done ? " done" : ""}">${s.done ? "✔" : "○"} ${escHtml(s.text)}</div>`).join("");
  });
  $("#book-btn").onclick = () => room.send("book");
  // a aba Caçada muda sozinha: atualiza enquanto estiver aberta
  const timer = window.setInterval(() => { if (!panel.hidden && tab === "cacada") room.send("book"); }, 5000);
  room.onLeave(() => window.clearInterval(timer));
  $("#book-close").onclick = () => (panel.hidden = true);
  panel.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => (b.onclick = () => { tab = b.dataset.tab!; render(); }));
}

// ---------- desafio do Dangai ----------

function bindDangai(room: Room<any>, myId: string) {
  const panel = $("#dangai");
  let st: { best: number; start: number; floor: number; left: number; until: number; waiting: boolean } | null = null;
  const button = (label: string, msg: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.onclick = () => room.send(msg);
    return b;
  };
  const render = () => {
    const me = room.state.players.get(myId);
    panel.hidden = me?.map !== "dangai";
    if (panel.hidden || !st) return;
    const secs = Math.max(0, Math.ceil((st.until - serverNow()) / 1000));
    $("#dangai-info").textContent = !st.floor
      ? `recorde: andar ${st.best}`
      : st.waiting ? `andar ${st.floor} limpo! · recorde ${st.best}`
      : `andar ${st.floor} · faltam ${st.left} · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} · recorde ${st.best}`;
    const actions = $("#dangai-actions");
    actions.replaceChildren(...(!st.floor ? [button(`Começar no andar ${st.start}`, "dangaiStart")]
      : st.waiting ? [button("Próximo andar", "dangaiNext"), button("Sair", "dangaiStop")]
      : [button("Desistir", "dangaiStop")]));
  };
  room.onMessage("dangai", (m: typeof st) => { st = m; render(); });
  room.state.players.onAdd((p: any, id: string) => {
    if (id === myId) p.listen("map", (map: string) => { if (map === "dangai") room.send("dangaiInfo"); render(); });
  });
  const timer = window.setInterval(() => { if (!panel.hidden && st?.floor && !st.waiting) render(); }, 1000);
  room.onLeave(() => window.clearInterval(timer));
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
      : `<tr><td>${i + 1}</td><td>${escHtml(r.name)}${r.guild ? ` <small>[${escHtml(r.guild)}]</small>` : ""}</td><td>${CHARS[r.charId]?.name ?? ""}</td><td>${
        tab === "nivel" ? `${r.rebirths ? `✦${r.rebirths} · ` : ""}nível ${r.level}` : tab === "dangai" ? `andar ${r.dg}` : tab === "conquistas" ? `${r.ach} conquistas` : tab === "bestiario" ? `${r.stages} estágios` : `${r.frags} abates`}</td></tr>`);
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
  $("#plevel").textContent = `${p.rebirths ? `✦${p.rebirths} · ` : ""}nível ${p.level}`;
  const rb = $<HTMLButtonElement>("#rebirth-btn");
  rb.hidden = p.level < rebirthLevel(p.rebirths);
  if (!rb.hidden) rb.textContent = `✦ Renascer (${p.rebirths + 1}º)`;
  setBar(".bar.hp", p.hp, p.maxHp, `HP ${p.hp}/${p.maxHp}`);
  setBar(".bar.rei", p.rei, p.maxRei, `Reiatsu ${Math.floor(p.rei)}/${p.maxRei}`);
  const a = expForLevel(p.level), b = expForLevel(p.level + 1);
  setBar(".bar.exp", p.exp - a, b - a, `XP ${Math.round(((p.exp - a) / (b - a)) * 100)}%`);
  $("#pform").textContent = ch.forms[p.form].label;
  $("#skill-name").textContent = `${ch.skill.name} (${ch.skill.cost} reiatsu)`;
  // o servidor pode desligar o Auto Hunt (ex.: ao morrer): espelha nos controles
  $<HTMLInputElement>("#auto-target").checked = p.autoTarget;
  $<HTMLInputElement>("#auto-hunt").checked = p.autoHunt;
  $<HTMLInputElement>("#auto-train").checked = p.autoTrain;
  $<HTMLInputElement>("#auto-sell").checked = p.autoSell;
  $("#pskills").textContent = `Zanjutsu ${p.zanjutsu} (${p.zanPct}%) · Reiryoku ${p.reiryoku} (${p.reiPct}%)`;
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
  const train = $<HTMLInputElement>("#auto-train");
  train.onchange = () => room.send("auto", { autoTrain: train.checked });
  const sell = $<HTMLInputElement>("#auto-sell");
  sell.onchange = () => room.send("auto", { autoSell: sell.checked });
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
