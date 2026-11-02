// Login, conexão com o servidor e HUD em DOM ao redor do canvas do Phaser.
import Phaser from "phaser";
import "@fontsource/pixelify-sans/500.css";
import "@fontsource/pixelify-sans/700.css";
import { Client, type Room } from "colyseus.js";
import { CHARS, ITEMS, isPureLoot, TRAVEL, expForLevel, PVP_MIN_LEVEL, rebirthLevel, portraitCss, techniques, techniqueFor, TECH_SLOTS, POWER_TIERS, powerTier, fmtPower, COSMETICS, COSMETIC, COS_KINDS, titleText, type CosKind, spriteKey, outfitFits, seasonReward, SEASON_PTS, xpWeekend } from "../../shared/src";
import { GameScene, gameConfig } from "./GameScene";
import { initInventory, iconHtml } from "./inventory";
import { passTierCards } from "./passTiers";
import { browserStore, loadLoreRead, markLoreRead } from "./loreRead";
import { loreReadingHtml, hex } from "./loreReader";
import { bindEvents } from "./events";
import { serverNow, syncClock } from "./clock";
import { initTouch, registerPWA } from "./touch";
import { sfx } from "./sfx";
import { ChatBook, CHAT_MAX, CHAT_TABS, parseTab, type ChatLineData, type ChatTab } from "./chatTabs";
import { initReleases } from "./releases";
import { rankingEmptyText } from "./rankingEmpty";
import { initRebirthDialog } from "./rebirthDialog";
import { initCharacterSheet } from "./characterSheetDialog";
import { initInventoryShortcut } from "./inventoryShortcut";
import { huntResetButton, huntResetDoneLabel, isHuntEmpty } from "./huntReset";
import { dailyTabHtml, claimPendingLabel, claimLabel, claimTimeoutMs, rewardText } from "./bookDaily";

initReleases();

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
  b.innerHTML = `<div class="portrait" style="background-image:url(/assets/sprites/${ch.forms[0].sprite}.png);${portraitCss(ch.forms[0].sprite)}"></div>${ch.name}`;
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
    row.innerHTML = `<div class="portrait" style="background-image:url(/assets/sprites/${sprite}.png);${portraitCss(sprite)}"></div>
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
  // registra logo ao entrar para o Colyseus não avisar enquanto a cena do Phaser carrega
  room.onMessage("welcome", () => {});
  room.onMessage("fx", () => {});
  // Arena 1v1 e patrulhas ainda não têm painel: o servidor já narra fila, pareamento, resultado e
  // patrulha no chat (log/sys). Os dados estruturados ficam para a interface futura, mas precisam
  // de handler: sem ele o colyseus.js avisa no console a cada mensagem (issue #22)
  for (const type of ["arenaData", "arenaMatchFound", "arenaResult", "patrolData"]) room.onMessage(type, () => {});
  $("#exit-btn").onclick = async () => {
    if (!confirm("Trocar de personagem? Com Auto Hunt ligado, ele segue caçando offline.")) return;
    await room.leave(); // com Auto Hunt ligado, o personagem segue caçando offline
    location.reload();
  };

  const WINDOWS = ["#ranking", "#book", "#pass", "#dev", "#shop"];
  let inventory: ReturnType<typeof initInventory>;
  const closeWindows = (keep?: string) => {
    if (keep !== "#modal") inventory?.close();
    for (const w of WINDOWS) if (w !== keep) $(w).hidden = true;
  };
  inventory = initInventory(room, (open) => {
    if (open) closeWindows("#modal");
    (game.scene.getScene("game") as GameScene | null)?.setPanelOpen(open);
  },
    () => room.state.players.get(myId)?.level ?? 1,
    () => { const p = room.state.players.get(myId); return p ? { x: p.x, y: p.y } : undefined; });
  const sheet = initCharacterSheet(room, () => room.state.players.get(myId), serverNow);
  const onMe = (p: any) => {
    renderStats(p);
    inventory.onMove(p.x, p.y);
    sheet.update();
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

  // canais: local (sem ch), pm, party, guild, sys (avisos do servidor) e lore (narração dos eventos)
  room.onMessage("chat", (m: { from: string; text: string; ch?: string }) => {
    const prefix = m.ch === "pm" ? "[pm] " : m.ch === "party" ? "[party] " : m.ch === "guild" ? "[guilda] " : "";
    chatLine(m.from ? `${prefix}${m.from}: ${m.text}` : `${prefix}${m.text}`, m.ch && m.ch !== "sys" ? m.ch : m.from ? "" : "sys", "chat", m.ch, m.ch === "pm" ? m.from : "");
  });
  bindGuild(room, closeWindows);
  bindBook(room, closeWindows);
  bindShop(room, myId, closeWindows);
  bindSeason(room, closeWindows);
  bindEvents(room);
  bindDev(room, myId, closeWindows);
  bindDangai(room, myId);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && document.activeElement !== chatin) closeWindows();
  });
  $("#travel-btn").onclick = () => inventory.openTravel();
  initInventoryShortcut();
  // janela do jogo no lugar do window.confirm (issue #35); o servidor continua validando o renascimento
  const rebirth = initRebirthDialog(room, () => room.state.players.get(myId));
  $("#rebirth-btn").onclick = () => rebirth.open();
  const mute = $("#mute-btn");
  const showMute = () => { mute.dataset.ico = sfx.isMuted() ? "mute" : "sound"; mute.title = sfx.isMuted() ? "Som desligado (clique para ligar)" : "Som ligado (clique para desligar)"; };
  showMute();
  mute.onclick = () => { sfx.setMuted(!sfx.isMuted()); showMute(); };
  bindHd(game);
  room.onMessage("log", (m: { text: string }) => chatLine(m.text, "log", "log"));
  room.onMessage("offline", (m: { minutes: number; exp: number; gold: number; level: number; deaths?: DeathReport[]; zanGain?: number; reiGain?: number; zanjutsu?: number; reiryoku?: number; kills?: number; items?: string[] }) => {
    const sign = (n: number) => (n >= 0 ? "+" : "") + n;
    const skills = [m.zanGain ? `Zanjutsu ${sign(m.zanGain)} (agora ${m.zanjutsu})` : "", m.reiGain ? `Reiryoku ${sign(m.reiGain)} (agora ${m.reiryoku})` : ""].filter(Boolean).join(", ");
    chatAlert(`Tempo offline: ${m.minutes} min, ${m.kills ?? 0} abates, ${sign(m.exp)} XP, ${sign(m.gold)} kan${skills ? `, ${skills}` : ""}. Você está no nível ${m.level}.`, "log", "log");
    if (m.items?.length) chatAlert(`Loot offline: ${m.items.slice(0, 8).join(", ")}${m.items.length > 8 ? ` e mais ${m.items.length - 8} tipos` : ""}.`, "log", "log");
    if (m.deaths?.length) showDeath(m.deaths, true);
  });
  room.onMessage("death", (d: DeathReport) => showDeath([d], false));
  $("#death-ok").onclick = () => ($("#death").hidden = true);
  room.onLeave((code) => chatAlert(code === 4001
    ? "Este personagem entrou em outra janela. Esta sessão foi encerrada."
    : "Conexão perdida. Recarregue a página para entrar de novo.", "sys", "chat", "sys"));

  bindAuto(room);
  bindLootFilter(room);
  bindParty(room, myId);
  syncClock(room);
  const chatin = $<HTMLInputElement>("#chatin");
  openChatTab(chat.active);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Enter" && document.activeElement !== chatin) { e.preventDefault(); chatin.focus(); }
  });
  chatin.addEventListener("keydown", (e) => {
    if (e.code === "Enter") {
      if (chatin.value.trim()) {
        // a aba aberta decide o canal: Party vira /p, Guilda /g, Privado /pm para a última conversa
        const out = chat.outgoing(chatin.value);
        if ("error" in out) {
          // o texto fica no campo: é só pôr o "/pm Nome," na frente
          chat.notice({ text: out.error, cls: "sys" });
          appendChatLine({ text: out.error, cls: "sys" });
          return;
        }
        room.send("chat", { text: out.text });
        chat.sent(Date.now(), out.text);
      }
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

// ---------- visual: pixel art ou desenho original (HD) ----------

function bindHd(game: Phaser.Game) {
  const btn = $<HTMLButtonElement>("#hd-btn");
  let on = false;
  try { on = localStorage.getItem("bi_hd") === "1"; } catch {}
  const show = (loading = false) => {
    btn.classList.toggle("on", on);
    btn.textContent = loading ? "…" : "HD";
    btn.title = on ? "Visual HD: desenho original (clique para pixel art)" : "Visual pixel art (clique para o desenho original em HD)";
  };
  const apply = () => {
    const scene = game.scene.getScene("game") as GameScene | null;
    if (!scene?.sys.isActive()) return void window.setTimeout(apply, 300); // a cena ainda está carregando
    show(on);
    scene.setHd(on, () => show());
  };
  btn.onclick = () => {
    on = !on;
    try { localStorage.setItem("bi_hd", on ? "1" : "0"); } catch {}
    apply();
  };
  show();
  if (on) apply();
}

// ---------- passe de temporada ----------

function bindSeason(room: Room<any>, closeWindows: (keep?: string) => void) {
  const panel = $("#pass");
  type Season = { open: boolean; name: string; endsAt: number; pts: number; perTier: number; tiers: number; claimed: number; killPts: number; killCap: number };
  let st: Season | null = null;
  let restoreFocusAfterClaim = false;
  const sendClaim = () => {
    restoreFocusAfterClaim = true;
    room.send("seasonClaim");
  };
  const prize = (t: number) => {
    const r = seasonReward(t);
    return [
      r.cos ? `<b class="excl">${escHtml(COSMETIC[r.cos].name)}</b>` : "",
      r.crystals ? `💎 ${r.crystals}` : "",
      r.gold ? `${r.gold.toLocaleString("pt-BR")} kan` : "",
      ...(r.items ?? []).map((i) => `${i.qty}x ${escHtml(ITEMS[i.id]?.name ?? i.id)}`),
    ].filter(Boolean).join("<br>");
  };
  const render = () => {
    if (!st) return;
    const tier = Math.floor(st.pts / st.perTier);
    $("#season-btn").classList.toggle("ping", tier > st.claimed);
    if (panel.hidden) return;
    const days = Math.max(0, Math.ceil((st.endsAt - serverNow()) / 86400_000));
    $("#pass-name").textContent = st.name;
    const into = st.pts % st.perTier;
    $("#pass-head").innerHTML = `<div class="pass-top"><b>Nível ${tier}</b> <span class="hint">${into}/${st.perTier} pontos para o próximo · termina em ${days} ${days === 1 ? "dia" : "dias"}</span></div>
      <div class="bar"><i style="width:${(into / st.perTier) * 100}%"></i></div>
      <p class="hint">Pontos: a cada ${SEASON_PTS.killEvery} abates +${SEASON_PTS.kill} (hoje ${st.killPts}/${st.killCap}) · chefe +${SEASON_PTS.boss} · missão diária +${SEASON_PTS.mission} · recompensa diária +${SEASON_PTS.daily} · chefe mundial +${SEASON_PTS.worldBoss}</p>
      <button type="button" class="claim" ${tier > st.claimed ? "" : `disabled title="Suba de nível no passe (${into}/${st.perTier} pontos) para liberar novos prêmios"`}>${tier > st.claimed ? `Pegar ${tier - st.claimed} ${tier - st.claimed === 1 ? "prêmio" : "prêmios"}` : "Tudo pego até agora"}</button>`;
    $("#pass-head").querySelector<HTMLButtonElement>(".claim")!.onclick = sendClaim;
    const cells = passTierCards(st).map((c, i) => {
      const note = c.note ? `<span class="note">${escHtml(c.note)}</span>` : "";
      const body = `<small>${escHtml(c.label)}</small><span class="prize">${i < st!.tiers ? prize(i + 1) : `A cada nível a mais:<br>${prize(st!.tiers + 1)}`}</span>${note}`;
      const cls = `tier ${c.cls}${i < st!.tiers && seasonReward(i + 1).cos ? " big" : ""}`;
      // pronto: botão que resgata (o mesmo seasonClaim de cima). O texto visível (note) diz a ação ou
      // o que falta, não só o tooltip (#34). O botão tira o nome do próprio conteúdo (nível, prêmio e
      // "toque para pegar"); aria-label nele esconderia o prêmio. O bloqueado é um grupo rotulado.
      return c.claimable ? `<button type="button" class="${cls}" title="${escHtml(c.hint)}" data-claim>${body}</button>`
        : `<div class="${cls}" role="group" title="${escHtml(c.hint)}" aria-label="${escHtml(c.aria)}">${body}</div>`;
    });
    $("#pass-body").innerHTML = `<div class="tiers">${cells.join("")}</div>`;
    $("#pass-body").querySelectorAll<HTMLButtonElement>("[data-claim]").forEach((b) => (b.onclick = sendClaim));
    // rola até o próximo prêmio
    $("#pass-body").querySelector<HTMLElement>(".tier.ready:not(.got), .tier:not(.got)")?.scrollIntoView({ block: "nearest", inline: "center" });
    if (restoreFocusAfterClaim) {
      restoreFocusAfterClaim = false;
      const target = $("#pass-body").querySelector<HTMLButtonElement>("[data-claim]")
        ?? $("#pass-head").querySelector<HTMLButtonElement>(".claim:not([disabled])")
        ?? $("#pass-body");
      target?.focus();
    }
  };
  room.onMessage("season", (m: Season) => { st = m; if (m.open) { closeWindows("#pass"); panel.hidden = false; } render(); });
  $("#season-btn").onclick = () => { if (!panel.hidden) panel.hidden = true; else room.send("seasonOpen"); };
  $("#pass-close").onclick = () => (panel.hidden = true);
  // fim de semana de XP em dobro: aviso fixo no painel
  const line = $("#event-line");
  const tick = () => {
    const on = xpWeekend(serverNow());
    line.hidden = !on;
    if (on) line.textContent = "★ Fim de semana: XP em dobro!";
  };
  tick();
  const timer = window.setInterval(tick, 60_000);
  room.onLeave(() => window.clearInterval(timer));
}

// ---------- modo Dev (o botão só aparece se o servidor estiver com BI_DEV=1) ----------

function bindDev(room: Room<any>, myId: string, closeWindows: (keep?: string) => void) {
  const panel = $("#dev");
  const btn = $<HTMLButtonElement>("#dev-btn");
  let god = false;
  const acts: [string, string, number?][] = [
    ["Nível +10", "level+"], ["Nível 30", "level", 30], ["Nível 60", "level", 60], ["Nível 100", "level", 100], ["Nível 150", "level", 150], ["Nível 1", "level", 1],
    ["+1.000.000 kan", "gold"], ["+1.000 cristais", "crystals"], ["Melhor equipamento", "gear"], ["Poções, caixas e pedras", "items"],
    ["+500 pontos do passe", "season"], ["Chamar chefe mundial", "boss"], ["Começar invasão", "invasion"],
  ];
  const render = () => {
    const body = $("#dev-body");
    body.innerHTML = `<p class="hint">Atalhos para testar. As formas e técnicas seguem o nível.</p>
      <button type="button" class="dev-god${god ? " on" : ""}" data-a="god">${god ? "Imortal: ligado" : "Imortal: desligado"}</button>
      <div class="dev-grid">${acts.map(([label], i) => `<button type="button" data-i="${i}">${label}</button>`).join("")}</div>`;
    body.querySelector<HTMLButtonElement>("[data-a=god]")!.onclick = () => room.send("dev", { a: "god" });
    body.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((b) => (b.onclick = () => {
      const [label, a, n] = acts[Number(b.dataset.i)];
      if (a === "level+") room.send("dev", { a: "level", n: (room.state.players.get(myId)?.level ?? 1) + 10 });
      else room.send("dev", { a, n });
      b.textContent = `✔ ${label}`;
      window.setTimeout(() => { b.textContent = label; }, 800);
    }));
  };
  room.onMessage("devMode", (m: { god: boolean }) => { god = m.god; btn.hidden = false; render(); });
  btn.onclick = () => {
    if (panel.hidden) { closeWindows("#dev"); panel.hidden = false; }
    else panel.hidden = true;
  };
  $("#dev-close").onclick = () => (panel.hidden = true);
  room.send("devHello");
}

// ---------- Loja de Cristais ----------

function bindShop(room: Room<any>, myId: string, closeWindows: (keep?: string) => void) {
  const panel = $("#shop");
  let data: { crystals: number; owned: string[]; equip: Partial<Record<string, string>> } | null = null;
  let tab: CosKind = "aura";
  let reading = "";
  const loreRead = loadLoreRead(browserStore());
  const render = () => {
    if (!data) return;
    $("#shop-crystals").textContent = `${data.crystals.toLocaleString("pt-BR")} cristais`;
    $("#shop-tabs").innerHTML = COS_KINDS.map((k) => `<button type="button" data-tab="${k.kind}" aria-pressed="${k.kind === tab}">${k.label}</button>`).join("");
    $("#shop-tabs").querySelectorAll<HTMLButtonElement>("button").forEach((b) => (b.onclick = () => { tab = b.dataset.tab as CosKind; reading = ""; render(); }));
    const body = $("#shop-body");
    if (reading) {
      body.innerHTML = loreReadingHtml(COSMETIC[reading], escHtml);
      body.querySelectorAll<HTMLButtonElement>("[data-back]").forEach((b) => (b.onclick = () => { reading = ""; render(); }));
      return;
    }
    const kind = COS_KINDS.find((k) => k.kind === tab)!;
    const slot = tab === "lore" ? "title" : tab;
    // traje: retrato do personagem atual vestido; quem não tem a folha (capitão com o haori) vê só a cor e o aviso
    const charId: string = room.state.players.get(myId)?.charId ?? "";
    const base = CHARS[charId]?.forms[0].sprite ?? "";
    const outfitKey = (look = "") => (base && look ? spriteKey(base, look) : base);
    body.innerHTML = `<p class="hint">${escHtml(kind.hint)} Ganhe cristais na recompensa diária e nas conquistas; eles valem para todos os personagens da conta.</p>` +
      COSMETICS.filter((x) => x.kind === tab && (!x.season || data!.owned.includes(x.id))).map((x) => {
        const own = data!.owned.includes(x.id);
        const on = data!.equip[slot] === x.id;
        const fits = tab === "outfit" && outfitFits(charId, x.look ?? "");
        const swatch = fits ? `<span class="outfit-pic" style="background-image:url(/assets/sprites/${outfitKey(x.look)}.png);${portraitCss(outfitKey(x.look))}"></span>`
          : `<span class="swatch" style="background:${hex(x.color)};box-shadow:0 0 8px ${hex(x.color2 ?? x.color)}"></span>`;
        const desc = x.desc + (tab === "outfit" && !fits ? ` Não muda o visual de ${CHARS[charId]?.name ?? "este personagem"}.` : "");
        const action = !own ? `<button type="button" data-buy="${x.id}" ${data!.crystals < x.price ? `disabled title="Faltam ${x.price - data!.crystals} cristais (ganhe na recompensa diária e conquistas)"` : ""}>💎 ${x.price}</button>`
          : tab === "lore" ? `<button type="button" data-read="${x.id}">${loreRead.has(x.id) ? "Reler" : "Ler"}</button><button type="button" data-equip="${x.id}" ${on ? "disabled" : ""}>${on ? "Título em uso" : "Usar título"}</button>`
          : on ? `<button type="button" data-off="${slot}">Tirar</button>` : `<button type="button" data-equip="${x.id}">Usar</button>`;
        const label = tab === "title" || tab === "lore" ? `<b style="color:${hex(x.color)}">« ${escHtml(titleText(x.id))} »</b>` : `<b>${escHtml(x.name)}</b>`;
        return `<div class="cos${own ? " own" : ""}${on ? " on" : ""}">${swatch}<div class="cos-text">${label}${tab === "lore" ? ` <small>${escHtml(x.name)}</small>${loreRead.has(x.id) ? ` <span class="lore-read">✓ Lida</span>` : ""}` : ""}<div class="hint">${escHtml(desc)}</div></div><div class="cos-act">${action}</div></div>`;
      }).join("") +
      `<p class="hint buy-note">Compra de cristais com dinheiro: ainda não está aberta.</p>`;
    // compra em dois cliques: o primeiro pede confirmação no próprio botão
    body.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((b) => (b.onclick = () => {
      if (b.dataset.sure) return room.send("shopBuy", { id: b.dataset.buy });
      b.dataset.sure = "1";
      b.textContent = "Confirmar?";
    }));
    body.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((b) => (b.onclick = () => room.send("shopEquip", { id: b.dataset.equip })));
    body.querySelectorAll<HTMLButtonElement>("[data-off]").forEach((b) => (b.onclick = () => room.send("shopEquip", { kind: b.dataset.off })));
    body.querySelectorAll<HTMLButtonElement>("[data-read]").forEach((b) => (b.onclick = () => { reading = b.dataset.read!; markLoreRead(browserStore(), reading, loreRead); render(); }));
  };
  room.onMessage("shopData", (d: typeof data) => { data = d; closeWindows("#shop"); panel.hidden = false; render(); });
  room.onMessage("crystals", (m: { crystals: number }) => { if (data) { data.crystals = m.crystals; render(); } });
  $("#shop-btn").onclick = () => { if (!panel.hidden) panel.hidden = true; else room.send("shopOpen"); };
  $("#shop-close").onclick = () => (panel.hidden = true);
}

function bindBook(room: Room<any>, closeWindows: (keep?: string) => void) {
  const panel = $("#book");
  let data: any = null;
  let tab = "bestiario";
  // o jogador zerou a Caçada e nada foi contado desde então (rótulo "✔ Contagem zerada" no botão)
  let huntJustReset = false;
  const reward = rewardText;
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
            <div class="pic" style="background-image:url(assets/sprites/${b.sprite}.png);${portraitCss(b.sprite)}"></div>
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
      if (!isHuntEmpty(h)) huntJustReset = false;
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
        ${huntResetButton(h, huntJustReset)}`;
      // retorno na hora; o "book" zerado que o servidor devolve mantém o botão desabilitado
      body.querySelector<HTMLButtonElement>(".claim")!.onclick = (e) => {
        const b = e.currentTarget as HTMLButtonElement;
        huntJustReset = true;
        b.disabled = true;
        b.textContent = huntResetDoneLabel;
        room.send("huntReset");
      };
    } else {
      const d = data.daily;
      const ms = data.missions;
      const missions = `<h3>Missões de hoje</h3><p class="hint">Cada uma paga ${ms.gold} kan e ${ms.exp} XP sozinha ao completar; as três juntas dão uma Caixa do Kisuke${ms.bonus ? " (já ganha)" : ""}.</p>` +
        ms.list.map((m: any) => `<div class="ach${m.done ? " done" : ""}"><b>${escHtml(m.text)}</b><div class="hint">${m.done ? "Feita" : `${m.have}/${m.need}`}</div>${m.done ? "" : bar(m.have, m.need)}</div>`).join("");
      body.innerHTML = dailyTabHtml(d, missions);
      // retorno na hora; o "book" que o servidor devolve (resgate ou recusa) redesenha a aba
      body.querySelector<HTMLButtonElement>(".claim")!.onclick = (e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.disabled = true;
        b.textContent = claimPendingLabel;
        room.send("daily");
        // sem "book" de volta (servidor lento ou mensagem perdida), o botão não fica preso em "Pegando…";
        // se o "book" chegou, a aba foi redesenhada e este botão já saiu do DOM
        window.setTimeout(() => {
          if (b.isConnected && b.textContent === claimPendingLabel) { b.disabled = false; b.textContent = claimLabel; }
        }, claimTimeoutMs);
      };
    }
  };
  room.onMessage("book", (d: any) => { data = d; if (panel.hidden) { closeWindows("#book"); panel.hidden = false; } render(); });
  room.onMessage("dailyReady", (m: { ready: boolean }) => $("#book-btn").classList.toggle("ping", m.ready));
  room.onMessage("tutorial", (steps: { text: string; done: boolean }[] | null) => {
    $("#tutorial").hidden = !steps;
    if (steps) $("#tutorial-list").innerHTML = steps.map((s) => `<div class="tut${s.done ? " done" : ""}">${s.done ? "✔" : "○"} ${escHtml(s.text)}</div>`).join("");
  });
  $("#book-btn").onclick = () => { if (!panel.hidden) panel.hidden = true; else room.send("book"); };
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

function bindGuild(room: Room<any>, closeWindows: (keep?: string) => void) {
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
    if (tab === "marcos") {
      const list = (data.marcos ?? []) as { name: string; desc: string; title: string; holder: string; charId: string }[];
      const rows = list.map((m) => `<tr><td><b>${escHtml(m.name)}</b><div class="hint">${escHtml(m.desc)}</div></td><td>« ${escHtml(m.title)} »</td><td>${m.holder ? `<b>${escHtml(m.holder)}</b> <small>${CHARS[m.charId]?.name ?? ""}</small>` : `<span class="hint">Em aberto</span>`}</td></tr>`);
      $("#ranking-body").innerHTML = rows.length ? `<table>${rows.join("")}</table>` : `<p class="hint">Nenhum marco definido.</p>`;
      return;
    }
    const rows: string[] = (data[tab] as any[]).map((r, i) => tab === "guildas"
      ? `<tr><td>${i + 1}</td><td>${escHtml(r.name)} <small>[${escHtml(r.tag)}]</small></td><td>${r.frags} abates</td><td>${r.members} membros · ${r.levels} níveis</td></tr>`
      : `<tr><td>${i + 1}</td><td>${escHtml(r.name)}${r.guild ? ` <small>[${escHtml(r.guild)}]</small>` : ""}</td><td>${CHARS[r.charId]?.name ?? ""}</td><td>${
        tab === "nivel" ? `${r.rebirths ? `✦${r.rebirths} · ` : ""}nível ${r.level}` : tab === "poder" ? `${fmtPower(r.power)} · ${POWER_TIERS[powerTier(r.power)].title}` : tab === "dangai" ? `andar ${r.dg}` : tab === "conquistas" ? `${r.ach} conquistas` : tab === "bestiario" ? `${r.stages} estágios` : `${r.frags} abates`}</td></tr>`);
    if (rows.length) $("#ranking-body").innerHTML = `<table>${rows.join("")}</table>`;
    else $("#ranking-body").replaceChildren(Object.assign(document.createElement("p"), { className: "hint", textContent: rankingEmptyText(tab) }));
  };
  room.onMessage("ranking", (d: any) => { data = d; closeWindows("#ranking"); panel.hidden = false; render(); });
  $("#ranking-btn").onclick = () => { if (!panel.hidden) panel.hidden = true; else room.send("ranking"); };
  $("#ranking-close").onclick = () => (panel.hidden = true);
  panel.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => (b.onclick = () => { tab = b.dataset.tab!; render(); }));
}

interface DeathReport { by: string; exp: number; gold: number; items: string[]; protected: boolean; invasion?: boolean; at: number }

function showDeath(list: DeathReport[], offline: boolean) {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  $("#death-body").innerHTML = list.map((d) => {
    const when = offline ? ` <small>(${new Date(d.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}, caçando offline)</small>` : "";
    if (d.protected) return `<p>Morto por <b>${esc(d.by)}</b>${when}.</p><p class="safe">O Amuleto da Alma se desfez e protegeu seu XP, seus itens e seu dinheiro.</p>`;
    const items = d.items.length ? `<ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="safe">Nenhum item perdido.</p>`;
    // atenuante da Invasão de Hollows (#39): texto fixo, sem dado do servidor no HTML
    const inv = d.invasion ? `<p class="safe">Invasão de Hollows: sem perda de itens, e a XP e o kan perdidos caem pela metade.</p>` : "";
    return `<p>Morto por <b>${esc(d.by)}</b>${when}.</p><p>Perdeu ${d.exp} XP e ${d.gold} kan.</p>${inv}${items}`;
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
  // estágio atual e a linha da evolução inteira no balão (nível de cada estágio, liberado ou não)
  const pf = $("#pform");
  pf.textContent = `${ch.forms[p.form].label} · ${p.form + 1}/${ch.forms.length}`;
  pf.title = ch.forms.map((f) => `${p.level >= f.minLevel ? "✔" : "🔒"} nível ${f.minLevel}: ${f.label}`).join("\n");
  const tier = POWER_TIERS[powerTier(p.power)];
  const pw = $("#ppower");
  pw.innerHTML = `Poder <b>${fmtPower(p.power)}</b> · <span>${tier.title}</span>`;
  pw.style.setProperty("--tier", tier.color ? `#${tier.color.toString(16).padStart(6, "0")}` : "#9a94b0");
  renderTechs(p);
  $("#pskills").textContent = `Zanjutsu ${p.zanjutsu} (${p.zanPct}%) · Reiryoku ${p.reiryoku} (${p.reiPct}%)`;
  // o servidor pode mudar o Auto Helper (ex.: desligar ao morrer): espelha nos controles
  renderAuto(p);
}

/** Técnicas nas teclas 1, 4, 5 e 6: nome da forma atual, custo, nível para aprender e recarga. */
const techCd: number[] = [0, 0, 0, 0];
let lastMe: any = null;
function renderTechs(p: any) {
  lastMe = p;
  const now = Date.now();
  $("#techs").innerHTML = techniques(p.charId).map((_, i) => {
    const t = techniqueFor(p.charId, i, p.form)!;
    const locked = p.level < (t.minLevel ?? 1);
    const cd = Math.ceil((techCd[i] - now) / 1000);
    const state = locked ? `nível ${t.minLevel}` : cd > 0 ? `${cd}s` : `${t.cost} rei`;
    const color = `#${t.color.toString(16).padStart(6, "0")}`;
    return `<div class="tech${locked ? " locked" : ""}${cd > 0 && !locked ? " cooling" : ""}" style="--c:${color}" title="${t.name}: alcance ${t.range}${t.area ? `, área ${t.area}` : ""}, ${t.cost} de reiatsu, recarga ${t.cdMs / 1000}s">`
      + `<kbd>${TECH_SLOTS[i]}</kbd><span>${t.name}</span><small>${state}</small></div>`;
  }).join("");
}
// o GameScene avisa cada técnica minha (fx "skill" do servidor): marca a recarga
window.addEventListener("tech-used", (e) => {
  const { i, cd } = (e as CustomEvent<{ i: number; cd: number }>).detail;
  techCd[i] = Date.now() + cd;
  if (lastMe) renderTechs(lastMe);
});
setInterval(() => { if (lastMe && techCd.some((t) => t > Date.now() - 1000)) renderTechs(lastMe); }, 250);

/** Cartões do Auto Helper: um por automação, aceso quando ligado. */
const AUTO_CARDS: { key: string; name: string; ico: string; tip: string }[] = [
  { key: "autoHunt", name: "Caçar", ico: "swords", tip: "Procura monstros e caça sozinho, inclusive com o jogo fechado (até 12 h)." },
  { key: "autoTarget", name: "Mirar", ico: "trophy", tip: "Mira sozinho no monstro mais próximo que estiver à vista." },
  { key: "autoBankai", name: "Bankai", ico: "star", tip: "Libera o Bankai em combate quando houver reiatsu de sobra e volta ao normal fora de combate." },
  { key: "autoReturn", name: "Voltar", ico: "swap", tip: "Depois de morrer, volta a caçar sozinho (para depois de 3 mortes em 10 minutos)." },
  { key: "autoTrain", name: "Treinar", ico: "hourglass", tip: "Fora de combate, gasta o reiatsu parado para subir o Reiryoku. Também segue treinando com o jogo fechado." },
  { key: "autoSell", name: "Vender", ico: "coins", tip: "O loot que não couber no inventário vira kan na hora, pelo preço da loja." },
  { key: "autoRestock", name: "Repor", ico: "scroll", tip: "Compra poções de qualquer lugar quando acabam: até 20 de cura e 10 de reiatsu." },
  { key: "autoBox", name: "Caixas", ico: "chest", tip: "Abre sozinho as Caixas do Kisuke que cair." },
];

function renderAuto(p: any) {
  for (const b of document.querySelectorAll<HTMLButtonElement>("#auto-grid .auto-card")) b.setAttribute("aria-pressed", String(!!p[b.dataset.key!]));
  const spot = $<HTMLSelectElement>("#hunt-spot");
  if (document.activeElement !== spot) spot.value = p.huntSpot ?? "";
  for (const [id, val] of [["auto-heal", p.autoHeal], ["auto-rei", p.autoRei]] as const) {
    const r = $<HTMLInputElement>(`#${id}`);
    if (document.activeElement !== r) r.value = String(val ?? 0);
    $(`#${id}-val`).textContent = val ? `${val}%` : "desligado";
  }
}

function bindAuto(room: Room<any>) {
  const grid = $("#auto-grid");
  grid.replaceChildren(...AUTO_CARDS.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "auto-card";
    b.dataset.key = c.key;
    b.dataset.ico = c.ico;
    b.title = c.tip;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<span>${c.name}</span><small></small>`;
    b.onclick = () => room.send("auto", { [c.key]: b.getAttribute("aria-pressed") !== "true" });
    return b;
  }));
  const spot = $<HTMLSelectElement>("#hunt-spot");
  spot.innerHTML = `<option value="">onde eu estiver</option>` + TRAVEL.filter((t) => t.id !== "karakura").map((t) => `<option value="${t.id}">${t.name} (nível ${t.minLevel}+)</option>`).join("");
  spot.onchange = () => room.send("auto", { huntSpot: spot.value });
  for (const [id, key] of [["auto-heal", "autoHeal"], ["auto-rei", "autoRei"]] as const) {
    const r = $<HTMLInputElement>(`#${id}`);
    r.oninput = () => ($(`#${id}-val`).textContent = r.value === "0" ? "desligado" : `${r.value}%`);
    r.onchange = () => room.send("auto", { [key]: Number(r.value) });
  }
}

// ---------- filtro de loot do Auto Helper (M3-03) ----------

const LOOT_CHOICES = [["take", "Pegar"], ["sell", "Vender"], ["ignore", "Ignorar"]] as const;

function bindLootFilter(room: Room<any>) {
  let data: { rules: Record<string, string>; seen: string[]; keep: string[] } = { rules: {}, seen: [], keep: [] };
  const list = $("#loot-list");
  const send = (rules: Record<string, string>) => room.send("lootRules", { rules });
  const render = () => {
    const ids = data.seen.filter((id) => ITEMS[id]).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name, "pt-BR"));
    if (!ids.length) {
      list.innerHTML = `<p class="hint">Os itens aparecem aqui depois que você derrota o monstro que os deixa cair.</p>`;
      return;
    }
    list.innerHTML = ids.map((id) => {
      const it = ITEMS[id];
      const cur = data.rules[id] ?? "take";
      const keep = data.keep.includes(id);
      const btns = LOOT_CHOICES.map(([v, label]) => `<button type="button" data-item="${id}" data-rule="${v}" aria-pressed="${cur === v}">${label}</button>`).join("");
      return `<div class="loot-row">${iconHtml(it.icon)}<span class="loot-name">${escHtml(it.name)}${keep ? `<small> · missão: sempre pego</small>` : ""}</span><span class="loot-choice" role="group" aria-label="${escHtml(it.name)}">${btns}</span></div>`;
    }).join("");
    list.querySelectorAll<HTMLButtonElement>("[data-rule]").forEach((b) => (b.onclick = () => {
      const rules = { ...data.rules };
      if (b.dataset.rule === "take") delete rules[b.dataset.item!];
      else rules[b.dataset.item!] = b.dataset.rule!;
      send(rules);
    }));
  };
  room.onMessage("lootRules", (m: typeof data) => { data = m; render(); });
  // abrir pede a lista de novo: os itens vistos crescem a cada espécie nova abatida
  $<HTMLDetailsElement>("#loot-filter").addEventListener("toggle", (e) => { if ((e.target as HTMLDetailsElement).open) room.send("lootRules", {}); });
  $("#loot-sell-pure").onclick = () => {
    const rules = { ...data.rules };
    for (const id of data.seen) if (ITEMS[id] && isPureLoot(ITEMS[id])) rules[id] = "sell";
    send(rules);
  };
  $("#loot-take-all").onclick = () => send({});
}

function chatLine(text: string, cls: string, kind: "chat" | "log" = "chat", ch?: string, from = ""): ChatTab[] {
  const tabs = chat.add(kind, ch, { text, cls }, Date.now(), from);
  if (tabs.includes(chat.active)) appendChatLine({ text, cls });
  renderChatTabs();
  return tabs;
}

/** Aviso que ninguém pode perder (queda da conexão, relatório offline): também na aba aberta. */
function chatAlert(text: string, cls: string, kind: "chat" | "log", ch?: string) {
  if (chatLine(text, cls, kind, ch).includes(chat.active)) return;
  chat.notice({ text, cls });
  appendChatLine({ text, cls });
}

// ---------- abas do chat (M3-02) ----------

const chat = new ChatBook();
try { chat.setActive(parseTab(localStorage.getItem("bi.chatTab"))); } catch { /* sem armazenamento: começa em Geral */ }

function appendChatLine(l: ChatLineData) {
  const log = $("#chatlog");
  const div = document.createElement("div");
  if (l.cls) div.className = l.cls;
  div.textContent = l.text;
  log.append(div);
  while (log.children.length > CHAT_MAX) log.firstChild!.remove();
  log.scrollTop = log.scrollHeight;
}

function renderChatTabs() {
  const bar = $("#chat-tabs");
  if (!bar.children.length) {
    for (const t of CHAT_TABS) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.dataset.tab = t.id;
      b.onclick = () => openChatTab(t.id);
      bar.append(b);
    }
  }
  for (const b of bar.querySelectorAll<HTMLButtonElement>("button")) {
    const t = CHAT_TABS.find((x) => x.id === b.dataset.tab)!;
    const n = chat.unread[t.id];
    b.textContent = n ? `${t.label} ${n > 99 ? "99+" : n}` : t.label;
    b.setAttribute("aria-selected", String(t.id === chat.active));
    b.setAttribute("aria-controls", "chatlog");
    b.classList.toggle("new", n > 0);
  }
  // o campo diz para onde vai o texto (no Privado, com quem é a conversa, que muda quando chega pm de outra pessoa)
  const placeholder = chat.active === "privado" ? (chat.pmWith ? `Enter para responder a ${chat.pmWith}` : "Escreva /pm Nome, mensagem")
    : chat.active === "party" || chat.active === "guilda" ? `Enter para falar em ${CHAT_TABS.find((x) => x.id === chat.active)!.label}`
    : "Enter para conversar";
  $<HTMLInputElement>("#chatin").placeholder = `${placeholder} · /ajuda para comandos`;
}

function openChatTab(tab: ChatTab) {
  chat.setActive(tab);
  try { localStorage.setItem("bi.chatTab", tab); } catch { /* só nesta sessão */ }
  const log = $("#chatlog");
  log.replaceChildren();
  for (const l of chat.lines[tab]) appendChatLine(l);
  renderChatTabs();
}
