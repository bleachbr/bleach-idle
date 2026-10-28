// Painel de equipamento e inventário (barra lateral) e as janelas de depot e loja.
// Tudo aqui só mostra o que o servidor manda na mensagem "inv" e pede ações;
// quem valida distância, dinheiro e espaço é o servidor.
import type { Room } from "colyseus.js";
import {
  ITEMS, SHOP, EQUIP_SLOTS, SLOT_LABEL, GOLD_ICON, CURRENCY, TRAVEL, INTERACT_RANGE, chebyshev,
  QUESTS, QUEST_BY_ID, type QuestState,
  type ItemDef, type Slot, type EquipSlot,
} from "../../shared/src";

interface InvMsg {
  gold: number;
  inv: (Slot | null)[];
  depot: (Slot | null)[];
  equip: Partial<Record<EquipSlot, string>>;
  atk: number;
  def: number;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

export function iconHtml(icon: number, qty?: number) {
  const pos = `-${(icon % 4) * 32}px -${Math.floor(icon / 4) * 32}px`;
  return `<span class="icon" style="background-position:${pos}"></span>${qty && qty > 1 ? `<b class="qty">${qty}</b>` : ""}`;
}

function tooltip(d: ItemDef) {
  const parts = [d.name];
  if (d.slot) parts.push(SLOT_LABEL[d.slot]);
  if (d.atk) parts.push(`Ataque +${d.atk}`);
  if (d.def) parts.push(`Defesa +${d.def}`);
  if (d.hp) parts.push(`HP +${d.hp}`);
  if (d.rei) parts.push(`Reiatsu +${d.rei}`);
  if (d.minLevel) parts.push(`Nível ${d.minLevel}+`);
  if (d.desc) parts.push(d.desc);
  return parts.join(" · ");
}

export function initInventory(room: Room<any>, onPanel: (open: boolean) => void, myLevel: () => number, myPos: () => { x: number; y: number } | undefined) {
  let quests: QuestState = { active: {}, done: [] };
  let shopTab: "missoes" | "loja" | "mercado" = "loja";
  let marketData: { listings: { id: number; seller: string; sellerName: string; item: string; qty: number; price: number }[]; me: string; fee: number } | null = null;
  room.onMessage("market", (m: typeof marketData) => { marketData = m; render(); });
  let state: InvMsg | null = null;
  let open: "" | "depot" | "shop" | "travel" | "bag" = "";
  let bag: { id: string; label: string; gold: number; items: Slot[]; locked: boolean; until: number } | null = null;
  let openedAt: { x: number; y: number } | null = null;
  let lastPos = { x: 0, y: 0 };

  const close = () => {
    open = "";
    $("#modal").hidden = true;
    onPanel(false);
  };
  $("#modal-close").onclick = close;
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && open) close();
  });

  room.onMessage("quests", (q: QuestState) => {
    quests = q;
    render();
  });
  room.onMessage("inv", (m: InvMsg) => {
    state = m;
    render();
  });
  room.onMessage("bag", (b: typeof bag) => {
    bag = b;
    open = "bag";
    // posição atual vinda do estado: a última do onMove pode ainda ser (0,0) se a cena não
    // terminou de carregar, e aí a janela fechava sozinha na primeira atualização
    openedAt = myPos() ?? { ...lastPos };
    $("#modal").hidden = false;
    onPanel(true);
    render();
  });
  room.state.bags.onRemove((_b: any, id: string) => { if (open === "bag" && bag?.id === id) close(); });
  room.onMessage("open", (m: { kind: "depot" | "shop" | "travel" }) => {
    if (m.kind === "shop") room.send("marketList");
    open = m.kind;
    // posição atual vinda do estado: a última do onMove pode ainda ser (0,0) se a cena não
    // terminou de carregar, e aí a janela fechava sozinha na primeira atualização
    openedAt = myPos() ?? { ...lastPos };
    $("#modal").hidden = false;
    onPanel(true);
    render();
  });

  function slotButton(s: Slot | null, onClick: (() => void) | null, extraTitle = "") {
    const b = document.createElement("button");
    b.className = "slot";
    b.type = "button";
    if (s) {
      const d = ITEMS[s.id];
      b.innerHTML = iconHtml(d.icon, s.qty);
      b.title = tooltip(d) + extraTitle;
    }
    if (onClick && s) b.onclick = onClick;
    else b.disabled = !s;
    return b;
  }

  function render() {
    if (!state) return;
    const st = state;
    $("#gold").innerHTML = `${iconHtml(GOLD_ICON)} ${st.gold} ${CURRENCY}`;
    $("#atkdef").textContent = `Ataque ${st.atk} · Defesa ${st.def}`;
    const count = (id: string) => st.inv.reduce((n, s) => n + (s?.id === id ? s.qty : 0), 0);
    $("#potions").textContent = String(count("pocao_vida"));
    $("#rei-potions").textContent = String(count("pocao_rei"));
    renderTracker(count);

    // equipamento: clicar desequipa
    const eq = $("#equip");
    eq.replaceChildren(...EQUIP_SLOTS.map((slot) => {
      const id = st.equip[slot];
      const b = slotButton(id ? { id, qty: 1 } : null, () => room.send("unequip", { slot }));
      b.dataset.label = SLOT_LABEL[slot];
      b.classList.add("equip-slot");
      if (!id) b.title = SLOT_LABEL[slot];
      return b;
    }));

    // inventário: com o depot aberto, clicar guarda; senão equipa ou usa
    const hint = open === "depot" ? " · clique para guardar no depot" : "";
    $("#inv").replaceChildren(...st.inv.map((s, index) => slotButton(s, () => {
      const d = ITEMS[s!.id];
      if (open === "depot") room.send("depot", { op: "put", index });
      else if (d.slot) room.send("equip", { index });
      else if (d.heal || d.restoreRei) room.send("useItem", { index });
    }, hint)));

    if (!open) return;
    $("#modal-title").textContent = open === "depot" ? "Depot" : open === "shop" ? "Loja do Kisuke" : "Portal";
    const body = $("#modal-body");
    if (open === "bag" && bag) {
      const b = bag;
      $("#modal-title").textContent = b.label;
      const list = document.createElement("div");
      list.className = "shop-list";
      if (b.gold) {
        const row = document.createElement("div");
        row.className = "shop-row";
        row.innerHTML = `<span class="slot static">${iconHtml(GOLD_ICON)}</span><span class="name">${b.gold} ${CURRENCY}</span>`;
        list.append(row);
      }
      b.items.forEach((s, index) => {
        const d = ITEMS[s.id];
        const row = document.createElement("div");
        row.className = "shop-row";
        row.innerHTML = `<span class="slot static">${iconHtml(d.icon, s.qty)}</span><span class="name">${d.name}</span>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Pegar";
        btn.disabled = b.locked;
        btn.onclick = () => room.send("bagTake", { id: b.id, index });
        row.append(btn);
        list.append(row);
      });
      const all = document.createElement("button");
      all.type = "button";
      all.className = "primary";
      all.textContent = b.items.length ? "Pegar tudo" : "Pegar o dinheiro";
      all.disabled = b.locked;
      all.onclick = () => room.send("bagTake", { id: b.id });
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = b.locked
        ? `Reservado a quem matou por mais ${Math.max(0, Math.ceil((b.until - Date.now()) / 1000))} s.`
        : "Corpos e sacolas somem 5 minutos depois de cair.";
      body.replaceChildren(all, list, hint);
      return;
    }
    if (open === "travel") {
      const list = document.createElement("div");
      list.className = "shop-list";
      for (const d of TRAVEL) {
        const row = document.createElement("div");
        row.className = "shop-row";
        row.innerHTML = `<span class="name">${d.name}<small>nível ${d.minLevel}+</small></span><span class="price">${d.cost} ${CURRENCY}</span>`;
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "Viajar";
        b.disabled = st.gold < d.cost;
        b.onclick = () => { room.send("travel", { dest: d.id }); close(); };
        row.append(b);
        list.append(row);
      }
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Para voltar, use \"Voltar à cidade\" (tecla R). Depois de atacar um jogador, viajar fica bloqueado por 3 minutos.";
      body.replaceChildren(list, p);
    } else if (open === "depot") {
      const grid = document.createElement("div");
      grid.className = "grid depot";
      grid.append(...st.depot.map((s, index) => slotButton(s, () => room.send("depot", { op: "take", index }), " · clique para pegar")));
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Clique num item do depot para pegar; clique num item do inventário (à esquerda) para guardar. O que está no depot nunca se perde.";
      body.replaceChildren(p, grid);
    } else {
      const buy = document.createElement("div");
      buy.className = "shop-list";
      for (const id of SHOP) {
        const d = ITEMS[id];
        const row = document.createElement("div");
        row.className = "shop-row";
        row.title = tooltip(d);
        row.innerHTML = `<span class="slot static">${iconHtml(d.icon)}</span><span class="name">${d.name}<small>${tooltip(d).split(" · ").slice(1).join(" · ")}</small></span><span class="price">${d.buy} ${CURRENCY}</span>`;
        for (const qty of d.stack ? [1, 10] : [1]) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = qty === 1 ? "Comprar" : "x10";
          b.disabled = st.gold < d.buy! * qty;
          b.onclick = () => room.send("buy", { id, qty });
          row.append(b);
        }
        buy.append(row);
      }
      const sell = document.createElement("div");
      sell.className = "shop-list";
      st.inv.forEach((s, index) => {
        if (!s) return;
        const d = ITEMS[s.id];
        const row = document.createElement("div");
        row.className = "shop-row";
        row.innerHTML = `<span class="slot static">${iconHtml(d.icon, s.qty)}</span><span class="name">${d.name}</span><span class="price">${d.sell * s.qty} ${CURRENCY}</span>`;
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "Vender";
        b.onclick = () => room.send("sell", { index });
        row.append(b);
        sell.append(row);
      });
      const sellLoot = document.createElement("button");
      sellLoot.type = "button";
      sellLoot.className = "primary";
      sellLoot.textContent = "Vender todo o loot";
      sellLoot.onclick = () => room.send("sellLoot");
      const h1 = document.createElement("h2");
      h1.textContent = "Comprar";
      const h2 = document.createElement("h2");
      h2.textContent = "Vender";
      // abas: com tudo empilhado, o mercado ficava escondido no fim da janela
      const tabs = document.createElement("div");
      tabs.className = "tabs shop-tabs";
      for (const [id, label] of [["missoes", "Missões"], ["loja", "Loja"], ["mercado", "Mercado"]] as const) {
        const t = document.createElement("button");
        t.type = "button";
        t.textContent = label;
        t.setAttribute("aria-pressed", String(shopTab === id));
        t.onclick = () => { shopTab = id; render(); };
        tabs.append(t);
      }
      const content = shopTab === "missoes" ? [questList(count)]
        : shopTab === "loja" ? [h1, buy, h2, sellLoot, sell]
        : [marketSection(st)];
      body.replaceChildren(tabs, ...content);
    }
  }

  function marketSection(st: InvMsg) {
    const box = document.createElement("div");
    const list = document.createElement("div");
    list.className = "shop-list";
    const listings = marketData?.listings ?? [];
    if (!listings.length) list.innerHTML = `<p class="hint">Nenhum anúncio ainda.</p>`;
    for (const l of listings) {
      const d = ITEMS[l.item];
      const row = document.createElement("div");
      row.className = "shop-row";
      row.innerHTML = `<span class="slot static">${iconHtml(d.icon, l.qty)}</span><span class="name"></span><span class="price">${l.price * l.qty} ${CURRENCY}</span>`;
      const name = row.querySelector(".name")!;
      name.textContent = `${l.qty}x ${d.name}`;
      const by = document.createElement("small");
      by.textContent = `${l.price} kan cada · de ${l.sellerName}`;
      name.append(by);
      const b = document.createElement("button");
      b.type = "button";
      if (l.seller === marketData?.me) {
        b.textContent = "Cancelar";
        b.onclick = () => room.send("marketCancel", { id: l.id });
      } else {
        b.textContent = "Comprar";
        b.disabled = st.gold < l.price * l.qty;
        b.onclick = () => room.send("marketBuy", { id: l.id });
      }
      row.append(b);
      list.append(row);
    }
    // anunciar: item do inventário, quantidade e preço por unidade
    const form = document.createElement("form");
    form.className = "market-form";
    const sel = document.createElement("select");
    st.inv.forEach((s, i) => {
      if (!s) return;
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = `${ITEMS[s.id].name} (${s.qty})`;
      sel.append(o);
    });
    const qty = Object.assign(document.createElement("input"), { type: "number", min: "1", value: "1", title: "Quantidade" });
    const price = Object.assign(document.createElement("input"), { type: "number", min: "1", placeholder: "kan cada", title: "Preço por unidade" });
    const go = Object.assign(document.createElement("button"), { type: "submit", textContent: "Anunciar" });
    go.disabled = !sel.options.length;
    form.append(sel, qty, price, go);
    form.onsubmit = (e) => {
      e.preventDefault();
      room.send("marketSell", { index: Number(sel.value), qty: Math.floor(Number(qty.value)), price: Math.floor(Number(price.value)) });
    };
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = `O item fica guardado no mercado até alguém comprar (ou você cancelar). Taxa de ${Math.round((marketData?.fee ?? 0.05) * 100)}% sobre a venda; você recebe mesmo offline.`;
    box.append(list, form, hint);
    return box;
  }

  /** progresso de uma missão: abates contados no servidor; entregas = o que está no inventário */
  function progress(id: string, count: (id: string) => number) {
    const g = QUEST_BY_ID[id].goal;
    return Math.min(g.count, g.type === "kill" ? quests.active[id] ?? 0 : count(g.item));
  }

  function goalText(id: string) {
    const g = QUEST_BY_ID[id].goal;
    return g.type === "kill" ? "abates" : ITEMS[g.item].name;
  }

  function renderTracker(count: (id: string) => number) {
    const ids = Object.keys(quests.active);
    $("#quest-track").innerHTML = ids.length
      ? ids.map((id) => {
        const q = QUEST_BY_ID[id];
        const n = progress(id, count);
        return `<div class="quest${n >= q.goal.count ? " ready" : ""}"><b>${q.name}</b><small>${n}/${q.goal.count} ${goalText(id)}${n >= q.goal.count ? " · pronta, volte ao Kisuke" : ""}</small></div>`;
      }).join("")
      : `<p class="hint">Nenhuma missão. Fale com o Kisuke na praça.</p>`;
  }

  function questList(count: (id: string) => number) {
    const list = document.createElement("div");
    list.className = "shop-list";
    for (const q of QUESTS) {
      const active = q.id in quests.active;
      const doneOnce = quests.done.includes(q.id);
      if (doneOnce && !q.repeatable && !active) continue;
      const row = document.createElement("div");
      row.className = "shop-row quest-row";
      const reward = [`${q.reward.exp} XP`, q.reward.gold ? `${q.reward.gold} kan` : "", ...(q.reward.items ?? []).map((it) => `${it.qty}x ${ITEMS[it.id].name}`)].filter(Boolean).join(", ");
      const n = active ? progress(q.id, count) : 0;
      row.innerHTML = `<span class="name">${q.name}${q.repeatable ? " ↻" : ""}<small>${q.desc}</small><small>Recompensa: ${reward}</small></span>${active ? `<span class="price">${n}/${q.goal.count}</span>` : ""}`;
      const b = document.createElement("button");
      b.type = "button";
      if (active) {
        b.textContent = "Entregar";
        b.disabled = n < q.goal.count;
        b.onclick = () => room.send("questTurnIn", { id: q.id });
        const drop = document.createElement("button");
        drop.type = "button";
        drop.className = "link";
        drop.textContent = "abandonar";
        drop.onclick = () => room.send("questAbandon", { id: q.id });
        row.append(b, drop);
      } else {
        b.textContent = myLevel() < q.minLevel ? `Nível ${q.minLevel}` : "Aceitar";
        b.disabled = myLevel() < q.minLevel;
        b.onclick = () => room.send("questAccept", { id: q.id });
        row.append(b);
      }
      list.append(row);
    }
    return list;
  }

  return {
    /** fecha a janela se o jogador se afastar do depot ou da loja */
    onMove(x: number, y: number) {
      lastPos = { x, y };
      if (open && openedAt && chebyshev(x, y, openedAt.x, openedAt.y) > INTERACT_RANGE) close();
    },
  };
}
