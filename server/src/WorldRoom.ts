// Sala única do mundo. O servidor é autoritativo: o cliente só manda intenções
// ("andar para", "atacar", "usar habilidade") e toda a simulação roda aqui no tick.
// Como o personagem é uma entidade do servidor, a hunt offline é só não removê-lo
// quando o socket cai: o mesmo Auto Helper continua rodando.
import { Room, Client, ServerError } from "@colyseus/core";
import { WorldState, Player, Monster, type DeathReport, type Interact } from "./schema";
import {
  generateMap, walkable, nearestWalkable, inPZ, TEMPLE, MAP_W, DEPOT, SHOP_NPC, SENKAIMON,
  PARTY_MAX, PARTY_SHARE_RANGE, PARTY_SHARE_BONUS, PARTY_LEVEL_RATIO, PARTY_INVITE_MS,
  PVP_MIN_LEVEL, PVP_DAMAGE, PVP_LOCK_MS, RECALL_COMBAT_MS, RECALL_COOLDOWN_MS, TRAVEL,
  CHARS, MONSTERS, SPAWNS, TICK_MS, DIR_VEC, type Dir,
  expForLevel, maxHp, maxRei, rollDamage, playerAtk, playerDef, chebyshev, DEATH_EXP_LOSS,
  ITEMS, SHOP, START_KIT, INV_SIZE, DEPOT_SIZE, INTERACT_RANGE, EQUIP_SLOTS, type EquipSlot,
  DEATH_ITEM_LOSS, DEATH_GOLD_LOSS, lookOf,
  rollLoot, addItem, removeItem, spaceFor, countItem, equipBonus,
} from "../../shared/src";
import { findPath, type Pt } from "./path";
import * as db from "./db";
import { consumeTicket, type Ticket } from "./auth";

const MAP = generateMap();
const OFFLINE_MAX_MS = 12 * 3600_000;
const AGGRO = 5;
const LEASH = 10;
const VIEW = 8;
const HUNT_RADIUS = 30;
const REGEN_MS = 2000;

const key = (x: number, y: number) => y * MAP_W + x;
const isPlayer = (e: Player | Monster): e is Player => e instanceof Player;

interface Party { id: string; leader: string; members: string[]; warnedAt: number }

export class WorldRoom extends Room<WorldState> {
  maxClients = 200;

  private sessions = new Map<string, string>(); // sessionId -> id do jogador
  private monsterSeq = 0;
  private nextRegenAt = 0;
  /** tiles ocupados por monstros (players não bloqueiam ninguém, como no PZ do Tibia) */
  private monsterAt = new Set<number>();
  private playerAt = new Map<number, number>();
  private parties = new Map<string, Party>();
  private invites = new Map<string, { partyId: string; from: string; at: number }>(); // convidado -> convite
  private partySeq = 0;

  onCreate() {
    this.autoDispose = false;
    this.setState(new WorldState());
    SPAWNS.forEach((s, i) => { for (let k = 0; k < s.count; k++) this.spawnMonster(i); });
    this.restoreWorld();
    this.setSimulationInterval(() => this.tick(), TICK_MS);
    // save frequente e em transação: numa queda se perdem no máximo ~10 s
    this.clock.setInterval(() => this.saveAll(), 10_000);

    this.onMessage("move", (c, m: { x: number; y: number }) => {
      const p = this.me(c);
      if (!p || !Number.isInteger(m?.x) || !Number.isInteger(m?.y) || !walkable(MAP, m.x, m.y)) return;
      p.follow = false;
      p.path = findPath(p.x, p.y, (x, y) => x === m.x && y === m.y, (x, y) => !walkable(MAP, x, y));
    });
    this.onMessage("step", (c, m: { dir: number }) => {
      const p = this.me(c);
      if (!p || !(m?.dir in DIR_VEC)) return;
      const [dx, dy] = DIR_VEC[m.dir as Dir];
      p.follow = false;
      p.dir = m.dir;
      p.path = walkable(MAP, p.x + dx, p.y + dy) ? [{ x: p.x + dx, y: p.y + dy }] : [];
    });
    this.onMessage("target", (c, m: { id: string }) => {
      const p = this.me(c);
      if (!p) return;
      if (!m?.id || m.id === p.targetId) { p.targetId = ""; p.follow = false; return; }
      if (this.state.monsters.has(m.id)) { p.targetId = m.id; p.follow = true; return; }
      const v = this.state.players.get(m.id);
      if (!v) return;
      const why = this.cantAttack(p, v);
      if (why) return this.log(p, why);
      p.targetId = v.id;
      p.follow = true;
    });
    this.onMessage("nextTarget", (c) => {
      const p = this.me(c);
      if (!p) return;
      const list = [...this.state.monsters.values()]
        .filter((mo) => chebyshev(p.x, p.y, mo.x, mo.y) <= VIEW)
        .sort((a, b) => chebyshev(p.x, p.y, a.x, a.y) - chebyshev(p.x, p.y, b.x, b.y));
      if (!list.length) return;
      const i = list.findIndex((mo) => mo.id === p.targetId);
      p.targetId = list[(i + 1) % list.length].id;
      p.follow = true;
    });
    this.onMessage("skill", (c, m: { slot: number }) => {
      const p = this.me(c);
      if (!p) return;
      const now = Date.now();
      if (m?.slot === 1) {
        const t = this.targetOf(p) ?? this.nearestMonster(p, CHARS[p.charId].skill.range);
        if (!t) return this.log(p, "Nenhum alvo ao alcance.");
        if (!this.trySkill(p, t, now, false)) this.log(p, "Habilidade indisponível (recarga, reiatsu ou alcance).");
      } else if (m?.slot === 2 || m?.slot === 3) {
        const id = m.slot === 2 ? "pocao_vida" : "pocao_rei";
        if (!this.useConsumable(p, id, now)) this.log(p, `Não dá para usar ${ITEMS[id].name} agora.`);
      }
    });
    this.registerItemMessages();
    this.registerSocialMessages();
    this.onMessage("transform", (c) => {
      const p = this.me(c);
      if (!p) return;
      const bankai = CHARS[p.charId].forms[1];
      if (p.form === 1) return this.setForm(p, 0);
      if (p.level < bankai.minLevel) return this.log(p, `Bankai exige nível ${bankai.minLevel}.`);
      if (p.rei < p.maxRei * 0.3) return this.log(p, "Reiatsu insuficiente para o Bankai.");
      this.setForm(p, 1);
    });
    this.onMessage("auto", (c, m: { autoTarget?: boolean; autoHunt?: boolean; autoHeal?: number }) => {
      const p = this.me(c);
      if (!p) return;
      if (typeof m?.autoTarget === "boolean") p.autoTarget = m.autoTarget;
      if (typeof m?.autoHunt === "boolean") p.autoHunt = m.autoHunt;
      if (typeof m?.autoHeal === "number") p.autoHeal = Math.max(0, Math.min(90, Math.round(m.autoHeal)));
    });
    this.onMessage("chat", (c, m: { text: string }) => {
      const p = this.me(c);
      const text = String(m?.text ?? "").trim().slice(0, 200);
      if (p && text) this.broadcast("chat", { from: p.name, text });
    });
  }

  /** Só entra quem traz um ingresso emitido pelo lobby (conta logada + personagem dela). */
  onAuth(_client: Client, opts: { ticket?: string }): Ticket {
    const t = consumeTicket(opts?.ticket);
    if (!t) throw new ServerError(401, "Ingresso inválido ou vencido. Volte à lista de personagens.");
    return t;
  }

  onJoin(client: Client, _opts?: unknown, auth?: Ticket) {
    if (!auth) throw new ServerError(401, "Sem ingresso.");
    const id = auth.charId;
    let p = this.state.players.get(id);
    if (p?.online) {
      // mesmo personagem entrando de outro lugar (ou aba antiga presa): a sessão nova assume
      for (const old of this.clients) {
        if (old !== client && this.sessions.get(old.sessionId) === id) {
          this.sessions.delete(old.sessionId); // assim o onLeave da antiga não mexe no personagem
          old.send("log", { text: "Este personagem entrou em outra janela." });
          old.leave(4001);
        }
      }
    } else if (p) {
      // voltando de hunt offline: o personagem nunca saiu do mundo
      p.online = true;
      this.sendOfflineReport(client, p);
    } else {
      const row = db.load(id);
      if (!row || row.accountId !== auth.accountId) throw new ServerError(404, "Personagem não encontrado.");
      p = this.fromSave(id, row.data);
      this.state.players.set(id, p);
      if (row.data.offline) {
        p.offlineSince = row.data.offline.since;
        p.expAtLeave = row.data.offline.expAtLeave;
        p.goldAtLeave = row.data.offline.goldAtLeave;
        p.offlineDeaths = row.data.offline.deaths ?? [];
        this.sendOfflineReport(client, p);
      }
      p.online = true;
    }
    this.sessions.set(client.sessionId, id);
    db.save(p.id, this.toSave(p), true);
    client.send("welcome", { id });
    this.sendInv(p);
    this.broadcast("chat", { from: "", text: `${p.name} entrou no mundo.` });
  }

  onLeave(client: Client) {
    const id = this.sessions.get(client.sessionId);
    this.sessions.delete(client.sessionId);
    const p = id ? this.state.players.get(id) : undefined;
    if (!p) return;
    if (p.autoHunt) {
      p.online = false;
      p.offlineSince = Date.now();
      p.expAtLeave = p.exp;
      p.goldAtLeave = p.gold;
      db.save(p.id, this.toSave(p), true);
    } else {
      db.save(p.id, this.toSave(p), false);
      this.leaveParty(p);
      this.state.players.delete(p.id);
    }
  }

  /** Monta a entidade a partir do save (login normal ou retomada após reiniciar). */
  private fromSave(id: string, saved: db.SaveData): Player {
    const p = new Player();
    p.id = id;
    p.name = saved.name;
    p.charId = CHARS[saved.charId] ? saved.charId : "ichigo";
    p.level = saved.level;
    p.exp = saved.exp;
    if (saved.inv) {
      p.gold = saved.gold ?? 0;
      saved.inv.slice(0, INV_SIZE).forEach((sl, i) => (p.inv[i] = sl));
      (saved.depot ?? []).slice(0, DEPOT_SIZE).forEach((sl, i) => (p.depot[i] = sl));
      p.equip = saved.equip ?? {};
    } else {
      p.gold = START_KIT.gold;
      p.equip = { ...START_KIT.equip };
      for (const sl of START_KIT.inv) addItem(p.inv, sl.id, sl.qty);
    }
    p.autoTarget = !!saved.autoTarget;
    p.autoHunt = !!saved.autoHunt;
    p.autoHeal = saved.autoHeal ?? 0;
    this.recompute(p);
    p.hp = Math.max(1, Math.min(saved.hp ?? p.maxHp, p.maxHp));
    p.rei = Math.min(saved.rei ?? p.maxRei, p.maxRei);
    const pos = walkable(MAP, saved.x, saved.y) ? saved : TEMPLE;
    p.x = pos.x;
    p.y = pos.y;
    return p;
  }

  /** Ao subir o servidor: quem estava no mundo com Auto Hunt volta a caçar offline.
   * Inclui quem estava online numa queda: o socket caiu junto, é o mesmo caso de fechar a aba. */
  private restoreWorld() {
    let n = 0;
    for (const row of db.loadInWorld()) {
      const since = row.data.offline?.since ?? row.updatedAt;
      if (!row.data.autoHunt || Date.now() - since > OFFLINE_MAX_MS) {
        db.setInWorld(row.id, false);
        continue;
      }
      const p = this.fromSave(row.id, row.data);
      p.online = false;
      p.offlineSince = since;
      p.expAtLeave = row.data.offline?.expAtLeave ?? p.exp;
      p.goldAtLeave = row.data.offline?.goldAtLeave ?? p.gold;
      this.state.players.set(p.id, p);
      n++;
    }
    if (n) console.log(`Retomadas ${n} hunt(s) offline.`);
  }

  onDispose() {
    this.saveAll();
  }

  // ---------- simulação ----------

  private tick() {
    const now = Date.now();
    this.monsterAt.clear();
    for (const m of this.state.monsters.values()) this.monsterAt.add(key(m.x, m.y));
    this.playerAt.clear();
    for (const p of this.state.players.values()) this.playerAt.set(key(p.x, p.y), 1);

    for (const p of [...this.state.players.values()]) {
      if (!p.online && (!p.autoHunt || now - p.offlineSince > OFFLINE_MAX_MS)) {
        p.autoHunt = false;
        db.save(p.id, this.toSave(p), false);
        this.state.players.delete(p.id);
        continue;
      }
      this.updatePlayer(p, now);
    }
    for (const m of [...this.state.monsters.values()]) this.updateMonster(m, now);

    if (now >= this.nextRegenAt) {
      this.nextRegenAt = now + REGEN_MS;
      for (const p of this.state.players.values()) this.regen(p, now);
    }
  }

  private updatePlayer(p: Player, now: number) {
    const form = CHARS[p.charId].forms[p.form];
    if (form.reiDrain) {
      p.rei = Math.max(0, p.rei - (form.reiDrain * TICK_MS) / 1000);
      if (p.rei <= 0) {
        this.setForm(p, 0);
        this.log(p, "O reiatsu acabou: Bankai desfeito.");
      }
    }
    if (p.autoHeal && (p.hp * 100) / p.maxHp < p.autoHeal) this.useConsumable(p, "pocao_vida", now);
    if (p.pendingInteract && !p.path.length) {
      // chegou (ou desistiu) do caminho até o depot ou a loja
      if (this.near(p, p.pendingInteract)) this.open(p, p.pendingInteract);
      p.pendingInteract = "";
    }

    let t: Player | Monster | undefined = this.targetOf(p);
    if (p.targetId && !t) { p.targetId = ""; p.follow = false; }

    // Auto Helper revida quem o atacou (inclusive caçando offline)
    if (!t && (p.autoTarget || p.autoHunt) && now - p.lastAttackedAt < 5000) {
      const a = this.state.players.get(p.lastAttackerId);
      if (a && !this.cantAttack(p, a)) { t = a; p.targetId = a.id; p.follow = true; }
    }
    // Auto Helper: Auto Target pega o mais próximo à vista; Auto Hunt procura longe e vai até ele
    if (!t && (p.autoTarget || p.autoHunt)) {
      t = this.nearestMonster(p, p.autoHunt ? HUNT_RADIUS : VIEW);
      if (t) { p.targetId = t.id; p.follow = true; }
    }
    if (t && p.autoHunt) this.trySkill(p, t, now, true);

    if (t && p.follow && now >= p.nextStepAt) {
      const tx = t.x, ty = t.y;
      p.path = chebyshev(p.x, p.y, tx, ty) > 1
        ? findPath(p.x, p.y, (x, y) => chebyshev(x, y, tx, ty) === 1, (x, y) => !walkable(MAP, x, y) || this.monsterAt.has(key(x, y)))
        : [];
    }
    if (p.path.length && now >= p.nextStepAt) {
      const next = p.path[0];
      if (this.monsterAt.has(key(next.x, next.y))) p.path = [];
      else if (p.pvpUntil > now && inPZ(next.x, next.y) && !inPZ(p.x, p.y)) {
        p.path = [];
        if (now > p.pzWarnAt) {
          p.pzWarnAt = now + 5000;
          this.log(p, `Você atacou um jogador: não pode entrar na zona de proteção por ${Math.ceil((p.pvpUntil - now) / 1000)} s.`);
        }
      } else {
        p.path.shift();
        this.playerAt.delete(key(p.x, p.y));
        this.stepTo(p, next, now);
        this.playerAt.set(key(p.x, p.y), 1);
      }
    }

    if (t && chebyshev(p.x, p.y, t.x, t.y) <= 1 && now >= p.nextAttackAt && !inPZ(p.x, p.y)) {
      p.nextAttackAt = now + form.attackMs;
      this.face(p, t);
      this.hit(p, t, 1, now);
    }
  }

  private updateMonster(m: Monster, now: number) {
    const def = MONSTERS[m.kind];
    const sp = SPAWNS[m.spawnIndex];
    let t = m.targetId ? this.state.players.get(m.targetId) : undefined;
    if (t && (t.hp <= 0 || inPZ(t.x, t.y) || chebyshev(m.x, m.y, sp.x, sp.y) > LEASH + sp.radius)) {
      t = undefined;
      m.targetId = "";
      m.path = this.monsterPath(m, (x, y) => x === sp.x && y === sp.y, 2000);
    }
    if (!t) {
      let best: Player | undefined;
      let bd = AGGRO + 1;
      for (const p of this.state.players.values()) {
        const d = chebyshev(m.x, m.y, p.x, p.y);
        if (d < bd && p.hp > 0 && !inPZ(p.x, p.y)) { best = p; bd = d; }
      }
      if (best) { t = best; m.targetId = best.id; }
    }

    if (t) {
      const d = chebyshev(m.x, m.y, t.x, t.y);
      if (d > 1 && now >= m.nextStepAt) {
        const tx = t.x, ty = t.y;
        m.path = this.monsterPath(m, (x, y) => chebyshev(x, y, tx, ty) === 1, 800);
      }
      if (d <= 1) {
        m.path = [];
        if (now >= m.nextAttackAt) {
          m.nextAttackAt = now + def.attackMs;
          this.face(m, t);
          const ch = CHARS[t.charId];
          const dmg = rollDamage(def.atk, 1, playerDef(ch.def, t.level) + equipBonus(t.equip).def);
          t.hp -= dmg;
          t.lastCombatAt = now;
          this.broadcast("fx", { t: "dmg", id: t.id, v: dmg });
          if (t.hp <= 0) this.killPlayer(t, def.name);
        }
      }
    } else if (!m.path.length && now >= m.nextWanderAt) {
      m.nextWanderAt = now + 2000 + Math.random() * 4000;
      const gx = sp.x + Math.round((Math.random() * 2 - 1) * sp.radius);
      const gy = sp.y + Math.round((Math.random() * 2 - 1) * sp.radius);
      m.path = this.monsterPath(m, (x, y) => x === gx && y === gy, 300);
    }

    if (m.path.length && now >= m.nextStepAt) {
      const next = m.path[0];
      if (this.blockedForMonster(next.x, next.y)) m.path = [];
      else {
        m.path.shift();
        this.monsterAt.delete(key(m.x, m.y));
        this.stepTo(m, next, now);
        this.monsterAt.add(key(m.x, m.y));
      }
    }
  }

  private blockedForMonster(x: number, y: number) {
    return !walkable(MAP, x, y) || inPZ(x, y) || this.monsterAt.has(key(x, y)) || this.playerAt.has(key(x, y));
  }

  private monsterPath(m: Monster, goal: (x: number, y: number) => boolean, maxNodes: number) {
    return findPath(m.x, m.y, goal, (x, y) => this.blockedForMonster(x, y), maxNodes);
  }

  private stepTo(e: Player | Monster, next: Pt, now: number) {
    const dx = next.x - e.x, dy = next.y - e.y;
    e.dir = dy > 0 ? 0 : dx < 0 ? 1 : dx > 0 ? 2 : 3;
    e.x = next.x;
    e.y = next.y;
    e.nextStepAt = now + e.stepMs;
  }

  private face(e: Player | Monster, t: { x: number; y: number }) {
    const dx = t.x - e.x, dy = t.y - e.y;
    e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy > 0 ? 0 : 3;
  }

  private hit(p: Player, t: Player | Monster, mult: number, now: number) {
    if (isPlayer(t)) return this.pvpHit(p, t, mult, now);
    const ch = CHARS[p.charId];
    const def = MONSTERS[t.kind];
    const dmg = rollDamage(playerAtk(ch.atk, p.level) + equipBonus(p.equip).atk, ch.forms[p.form].dmgMult * mult, def.def);
    t.hp -= dmg;
    t.lastHitBy = p.id;
    if (!t.targetId) t.targetId = p.id;
    p.lastCombatAt = now;
    this.broadcast("fx", { t: "dmg", id: t.id, v: dmg });
    if (t.hp <= 0) this.killMonster(t, p);
  }

  private trySkill(p: Player, t: Player | Monster, now: number, auto: boolean): boolean {
    const sk = CHARS[p.charId].skill;
    if (now < p.skillReadyAt || p.rei < sk.cost || inPZ(p.x, p.y)) return false;
    if (auto && p.rei < p.maxRei * 0.4) return false; // Auto Hunt guarda reiatsu para o Bankai
    if (chebyshev(p.x, p.y, t.x, t.y) > sk.range) return false;
    if (isPlayer(t) && this.cantAttack(p, t)) return false;
    p.rei -= sk.cost;
    p.skillReadyAt = now + sk.cdMs;
    this.face(p, t);
    this.broadcast("fx", { t: "skill", from: p.id, to: t.id, color: sk.color, name: sk.name });
    this.hit(p, t, sk.mult, now);
    return true;
  }

  private useConsumable(p: Player, id: string, now: number): boolean {
    const def = ITEMS[id];
    if (!def || p.hp <= 0 || !countItem(p.inv, id)) return false;
    if (def.heal) {
      if (now < p.potionReadyAt || p.hp >= p.maxHp) return false;
      const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * def.heal));
      p.hp += heal;
      p.potionReadyAt = now + 1000;
      this.broadcast("fx", { t: "heal", id: p.id, v: heal });
    } else if (def.restoreRei) {
      if (now < p.reiPotionReadyAt || p.rei >= p.maxRei) return false;
      p.rei = Math.min(p.maxRei, p.rei + p.maxRei * def.restoreRei);
      p.reiPotionReadyAt = now + 1000;
    } else return false;
    removeItem(p.inv, id, 1);
    this.sendInv(p);
    return true;
  }

  private regen(p: Player, now: number) {
    if (p.hp <= 0) return;
    const fight = now - p.lastCombatAt < 6000;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * (fight ? 0.01 : 0.04)));
    if (!CHARS[p.charId].forms[p.form].reiDrain) p.rei = Math.min(p.maxRei, p.rei + p.maxRei * (fight ? 0.02 : 0.06));
  }

  private killMonster(m: Monster, killer: Player) {
    const def = MONSTERS[m.kind];
    this.broadcast("fx", { t: "die", id: m.id });
    this.state.monsters.delete(m.id);
    this.monsterAt.delete(key(m.x, m.y));
    this.clock.setTimeout(() => this.spawnMonster(m.spawnIndex), def.respawnMs);
    this.shareExp(killer, m, def.exp, def.name);
    this.giveLoot(killer, m.kind);
  }

  private killPlayer(p: Player, by: string) {
    // Amuleto da Alma (o "Band of Loss" daqui): protege XP, itens e dinheiro, e se desfaz
    const prot = p.equip.amulet === "amuleto_alma";
    if (prot) delete p.equip.amulet;
    const loss = prot ? 0 : Math.floor(p.exp * DEATH_EXP_LOSS);
    const items: string[] = [];
    let goldLost = 0;
    if (!prot) {
      // estilo Tibia: cada peça e cada espaço rola a perda; o depot fica intacto
      for (const slot of EQUIP_SLOTS) {
        const id = p.equip[slot];
        if (id && Math.random() < DEATH_ITEM_LOSS) { items.push(ITEMS[id].name); delete p.equip[slot]; }
      }
      p.inv.forEach((sl, i) => {
        if (sl && Math.random() < DEATH_ITEM_LOSS) { items.push(`${sl.qty}x ${ITEMS[sl.id].name}`); p.inv[i] = null; }
      });
      goldLost = Math.floor(p.gold * DEATH_GOLD_LOSS);
      p.gold -= goldLost;
    }
    this.broadcast("fx", { t: "die", id: p.id });
    p.exp -= loss;
    while (p.level > 1 && p.exp < expForLevel(p.level)) p.level--;
    p.form = 0;
    this.recompute(p);
    p.hp = p.maxHp;
    p.rei = p.maxRei;
    p.x = TEMPLE.x;
    p.y = TEMPLE.y;
    p.path = [];
    p.targetId = "";
    p.autoHunt = false; // não volta sozinho para a hunt depois de morrer
    p.pvpUntil = 0;

    const report: DeathReport = { by, exp: loss, gold: goldLost, items, protected: prot, at: Date.now() };
    if (p.online) this.sendTo(p, "death", report);
    else p.offlineDeaths.push(report);
    this.log(p, prot
      ? `Você foi morto por ${by}. O Amuleto da Alma se desfez e protegeu XP e itens. Auto Hunt desligado.`
      : `Você foi morto por ${by}: perdeu ${loss} XP, ${goldLost} kan${items.length ? " e " + items.join(", ") : ""}. Auto Hunt desligado.`);
    this.sendInv(p);
    db.save(p.id, this.toSave(p), true); // morte não espera o save periódico
  }

  private sendOfflineReport(client: Client, p: Player) {
    client.send("offline", {
      minutes: Math.round((Date.now() - p.offlineSince) / 60000),
      exp: p.exp - p.expAtLeave, gold: p.gold - p.goldAtLeave, level: p.level, deaths: p.offlineDeaths,
    });
    p.offlineSince = 0;
    p.offlineDeaths = [];
  }

  private sendTo(p: Player, type: string, msg: unknown) {
    for (const c of this.clients) if (this.sessions.get(c.sessionId) === p.id) c.send(type, msg);
  }

  private gainExp(p: Player, v: number, from: string) {
    p.exp += v;
    this.log(p, `${from} derrotado: +${v} XP.`);
    while (p.exp >= expForLevel(p.level + 1)) {
      p.level++;
      this.recompute(p);
      p.hp = p.maxHp;
      p.rei = p.maxRei;
      this.broadcast("fx", { t: "level", id: p.id, v: p.level });
      this.log(p, `Você subiu para o nível ${p.level}!`);
    }
  }

  private setForm(p: Player, i: number) {
    p.form = i;
    this.recompute(p);
    this.broadcast("fx", { t: "form", id: p.id, v: i });
  }

  private recompute(p: Player) {
    const b = equipBonus(p.equip);
    p.maxHp = maxHp(p.level) + b.hp;
    p.maxRei = maxRei(p.level) + b.rei;
    p.hp = Math.min(p.hp, p.maxHp);
    p.rei = Math.min(p.rei, p.maxRei);
    p.stepMs = CHARS[p.charId].forms[p.form].stepMs;
    p.look = lookOf(p.equip);
  }

  private nearestMonster(p: Player, range: number): Monster | undefined {
    let best: Monster | undefined;
    let bd = range + 1;
    for (const m of this.state.monsters.values()) {
      const d = chebyshev(p.x, p.y, m.x, m.y);
      if (d < bd) { best = m; bd = d; }
    }
    return best;
  }

  private spawnMonster(i: number) {
    const sp = SPAWNS[i];
    const def = MONSTERS[sp.kind];
    for (let tries = 0; tries < 40; tries++) {
      const x = sp.x + Math.round((Math.random() * 2 - 1) * sp.radius);
      const y = sp.y + Math.round((Math.random() * 2 - 1) * sp.radius);
      if (this.blockedForMonster(x, y)) continue;
      const m = new Monster();
      m.id = `m${++this.monsterSeq}`;
      m.kind = sp.kind;
      m.x = x;
      m.y = y;
      m.hp = m.maxHp = def.hp;
      m.stepMs = def.stepMs;
      m.spawnIndex = i;
      this.state.monsters.set(m.id, m);
      this.monsterAt.add(key(x, y));
      return;
    }
    this.clock.setTimeout(() => this.spawnMonster(i), 5000); // spawn ocupado: tenta de novo
  }

  // ---------- itens, depot e loja ----------

  private registerItemMessages() {
    const idx = (n: unknown, size: number) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < size ? (n as number) : -1);

    this.onMessage("useItem", (c, m: { index: number }) => {
      const p = this.me(c);
      const s = p?.inv[idx(m?.index, INV_SIZE)];
      if (p && s && !this.useConsumable(p, s.id, Date.now())) this.log(p, `Não dá para usar ${ITEMS[s.id].name} agora.`);
    });
    this.onMessage("equip", (c, m: { index: number }) => {
      const p = this.me(c);
      const i = idx(m?.index, INV_SIZE);
      const s = p?.inv[i];
      const def = s ? ITEMS[s.id] : undefined;
      if (!p || !s || !def?.slot) return;
      if (def.minLevel && p.level < def.minLevel) return this.log(p, `${def.name} exige nível ${def.minLevel}.`);
      const old = p.equip[def.slot];
      p.equip[def.slot] = def.id;
      p.inv[i] = old ? { id: old, qty: 1 } : null; // troca no mesmo espaço
      this.recompute(p);
      this.sendInv(p);
    });
    this.onMessage("unequip", (c, m: { slot: EquipSlot }) => {
      const p = this.me(c);
      const id = p && EQUIP_SLOTS.includes(m?.slot) ? p.equip[m.slot] : undefined;
      if (!p || !id) return;
      if (addItem(p.inv, id, 1) !== 1) return this.log(p, "Inventário cheio.");
      delete p.equip[m.slot];
      this.recompute(p);
      this.sendInv(p);
    });
    this.onMessage("interact", (c, m: { kind: Interact }) => {
      const p = this.me(c);
      if (!p || !["depot", "shop", "travel"].includes(m?.kind)) return;
      if (this.near(p, m.kind)) return this.open(p, m.kind);
      // anda até ficar ao alcance; o tick abre a janela quando o caminho acabar
      const at = m.kind === "depot" ? DEPOT : m.kind === "shop" ? SHOP_NPC : SENKAIMON;
      p.follow = false;
      p.path = findPath(p.x, p.y, (x, y) => chebyshev(x, y, at.x, at.y) <= INTERACT_RANGE, (x, y) => !walkable(MAP, x, y));
      p.pendingInteract = p.path.length ? m.kind : "";
    });
    this.onMessage("depot", (c, m: { op: "put" | "take"; index: number }) => {
      const p = this.me(c);
      if (!p) return;
      if (!this.near(p, "depot")) return this.log(p, "Chegue perto do baú do depot.");
      const [from, to] = m?.op === "put" ? [p.inv, p.depot] : [p.depot, p.inv];
      const i = idx(m?.index, from.length);
      const s = from[i];
      if (!s) return;
      const moved = addItem(to, s.id, s.qty);
      if (!moved) return this.log(p, m.op === "put" ? "Depot cheio." : "Inventário cheio.");
      s.qty -= moved;
      if (s.qty <= 0) from[i] = null;
      this.sendInv(p);
    });
    this.onMessage("buy", (c, m: { id: string; qty: number }) => {
      const p = this.me(c);
      const def = ITEMS[m?.id];
      if (!p || !def?.buy || !SHOP.includes(def.id)) return;
      if (!this.near(p, "shop")) return this.log(p, "Chegue perto da loja.");
      const qty = Math.max(1, Math.min(100, Math.floor(Number(m.qty) || 1)));
      const cost = def.buy * qty;
      if (p.gold < cost) return this.log(p, `Faltam ${cost - p.gold} kan.`);
      if (spaceFor(p.inv, def.id) < qty) return this.log(p, "Inventário sem espaço.");
      p.gold -= cost;
      addItem(p.inv, def.id, qty);
      this.log(p, `Comprou ${qty}x ${def.name} por ${cost} kan.`);
      this.sendInv(p);
    });
    this.onMessage("sell", (c, m: { index: number }) => {
      const p = this.me(c);
      const i = idx(m?.index, INV_SIZE);
      const s = p?.inv[i];
      if (!p || !s) return;
      if (!this.near(p, "shop")) return this.log(p, "Chegue perto da loja.");
      const gain = ITEMS[s.id].sell * s.qty;
      p.gold += gain;
      p.inv[i] = null;
      this.log(p, `Vendeu ${s.qty}x ${ITEMS[s.id].name} por ${gain} kan.`);
      this.sendInv(p);
    });
    this.onMessage("sellLoot", (c) => {
      const p = this.me(c);
      if (!p) return;
      if (!this.near(p, "shop")) return this.log(p, "Chegue perto da loja.");
      let gain = 0, n = 0;
      p.inv.forEach((s, i) => {
        const d = s ? ITEMS[s.id] : undefined;
        if (!s || !d || d.slot || d.heal || d.restoreRei) return; // só loot puro
        gain += d.sell * s.qty;
        n += s.qty;
        p.inv[i] = null;
      });
      this.log(p, n ? `Vendeu ${n} itens de loot por ${gain} kan.` : "Nenhum loot para vender.");
      p.gold += gain;
      this.sendInv(p);
    });
  }

  /** Loot vai direto para o inventário de quem matou: funciona igual na hunt offline. */
  private giveLoot(p: Player, kind: string) {
    const loot = rollLoot(kind);
    p.gold += loot.gold;
    const got: string[] = [];
    for (const s of loot.items) {
      const n = addItem(p.inv, s.id, s.qty);
      if (n) got.push(`${n}x ${ITEMS[s.id].name}`);
      if (n < s.qty) this.log(p, `Inventário cheio: ${ITEMS[s.id].name} perdido.`);
    }
    this.log(p, `Loot: ${loot.gold} kan${got.length ? ", " + got.join(", ") : ""}.`);
    if (got.length) this.broadcast("fx", { t: "loot", id: p.id, v: got.length });
    this.sendInv(p);
  }

  private near(p: Player, kind: Interact) {
    const at = kind === "depot" ? DEPOT : kind === "shop" ? SHOP_NPC : SENKAIMON;
    return chebyshev(p.x, p.y, at.x, at.y) <= INTERACT_RANGE;
  }

  private open(p: Player, kind: Interact) {
    for (const c of this.clients) if (this.sessions.get(c.sessionId) === p.id) c.send("open", { kind });
  }

  private sendInv(p: Player) {
    const b = equipBonus(p.equip);
    const ch = CHARS[p.charId];
    const msg = {
      gold: p.gold, inv: p.inv, depot: p.depot, equip: p.equip,
      atk: Math.round(playerAtk(ch.atk, p.level) + b.atk), def: Math.round(playerDef(ch.def, p.level) + b.def),
    };
    for (const c of this.clients) if (this.sessions.get(c.sessionId) === p.id) c.send("inv", msg);
  }

  // ---------- party, PvP e viagem ----------

  private registerSocialMessages() {
    this.onMessage("partyInvite", (c, m: { id: string }) => {
      const p = this.me(c);
      const v = this.state.players.get(String(m?.id ?? ""));
      if (!p || !v || v === p) return;
      if (!v.online) return this.log(p, `${v.name} não está online.`);
      if (v.partyId) return this.log(p, `${v.name} já está numa party.`);
      let party = this.parties.get(p.partyId);
      if (party && party.leader !== p.id) return this.log(p, "Só o líder convida.");
      if (party && party.members.length >= PARTY_MAX) return this.log(p, `A party já tem ${PARTY_MAX} membros.`);
      if (!party) {
        party = { id: `party${++this.partySeq}`, leader: p.id, members: [p.id], warnedAt: 0 };
        this.parties.set(party.id, party);
        p.partyId = party.id;
        p.partyLead = true;
      }
      this.invites.set(v.id, { partyId: party.id, from: p.id, at: Date.now() });
      this.sendTo(v, "partyInvite", { from: p.name });
      this.log(p, `Convite enviado para ${v.name}.`);
    });
    this.onMessage("partyAnswer", (c, m: { accept: boolean }) => {
      const p = this.me(c);
      const inv = p ? this.invites.get(p.id) : undefined;
      if (!p || !inv) return;
      this.invites.delete(p.id);
      const party = this.parties.get(inv.partyId);
      const from = this.state.players.get(inv.from);
      if (!m?.accept) return from && this.log(from, `${p.name} recusou o convite.`);
      if (!party || Date.now() - inv.at > PARTY_INVITE_MS) return this.log(p, "O convite expirou.");
      if (p.partyId) return this.log(p, "Você já está numa party.");
      if (party.members.length >= PARTY_MAX) return this.log(p, "A party está cheia.");
      party.members.push(p.id);
      p.partyId = party.id;
      if (p.targetId && party.members.includes(p.targetId)) p.targetId = "";
      this.partyLog(party, `${p.name} entrou na party.`);
    });
    this.onMessage("partyLeave", (c) => {
      const p = this.me(c);
      if (p) this.leaveParty(p);
    });
    this.onMessage("partyKick", (c, m: { id: string }) => {
      const p = this.me(c);
      const party = p ? this.parties.get(p.partyId) : undefined;
      const v = this.state.players.get(String(m?.id ?? ""));
      if (!p || !party || party.leader !== p.id || !v || v.partyId !== party.id || v === p) return;
      this.log(v, "Você foi removido da party.");
      this.leaveParty(v);
    });
    this.onMessage("recall", (c) => {
      const p = this.me(c);
      if (!p) return;
      const now = Date.now();
      const why = this.travelBlocked(p, now)
        ?? (now - p.lastCombatAt < RECALL_COMBAT_MS ? "Em combate: espere alguns segundos para voltar à cidade." : undefined)
        ?? (now < p.recallReadyAt ? `"Voltar à cidade" recarrega em ${Math.ceil((p.recallReadyAt - now) / 1000)} s.` : undefined);
      if (why) return this.log(p, why);
      p.recallReadyAt = now + RECALL_COOLDOWN_MS;
      this.teleport(p, TEMPLE);
      this.log(p, "Você voltou à cidade.");
    });
    this.onMessage("travel", (c, m: { dest: string }) => {
      const p = this.me(c);
      const d = TRAVEL.find((t) => t.id === m?.dest);
      if (!p || !d) return;
      const now = Date.now();
      if (!this.near(p, "travel")) return this.log(p, "Chegue perto do Senkaimon.");
      const why = this.travelBlocked(p, now);
      if (why) return this.log(p, why);
      if (p.level < d.minLevel) return this.log(p, `${d.name} exige nível ${d.minLevel}.`);
      if (p.gold < d.cost) return this.log(p, `A viagem custa ${d.cost} kan.`);
      p.gold -= d.cost;
      this.teleport(p, nearestWalkable(MAP, d.x, d.y));
      this.log(p, `Viajou para ${d.name} (${d.cost} kan).`);
      this.sendInv(p);
    });
  }

  private travelBlocked(p: Player, now: number): string | undefined {
    if (p.pvpUntil <= now) return undefined;
    const s = Math.ceil((p.pvpUntil - now) / 1000);
    return `Você atacou um jogador: viagem bloqueada por ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.`;
  }

  private teleport(p: Player, to: { x: number; y: number }) {
    p.path = [];
    p.targetId = "";
    p.follow = false;
    p.pendingInteract = "";
    p.x = to.x;
    p.y = to.y;
    this.broadcast("fx", { t: "tp", id: p.id });
  }

  /** Motivo de não poder atacar (ou undefined se pode). */
  private cantAttack(a: Player, v: Player): string | undefined {
    if (a === v) return "Não dá para atacar a si mesmo.";
    if (v.hp <= 0) return `${v.name} já caiu.`;
    if (a.partyId && a.partyId === v.partyId) return `${v.name} está na sua party.`;
    if (a.level < PVP_MIN_LEVEL) return `PvP só a partir do nível ${PVP_MIN_LEVEL}.`;
    if (v.level < PVP_MIN_LEVEL) return `${v.name} está protegido (abaixo do nível ${PVP_MIN_LEVEL}).`;
    if (inPZ(a.x, a.y) || inPZ(v.x, v.y)) return "Não há combate na zona de proteção.";
    return undefined;
  }

  /** Alvo atual (monstro ou jogador ainda atacável). */
  private targetOf(p: Player): Player | Monster | undefined {
    if (!p.targetId) return undefined;
    const m = this.state.monsters.get(p.targetId);
    if (m) return m;
    const v = this.state.players.get(p.targetId);
    return v && !this.cantAttack(p, v) ? v : undefined;
  }

  private pvpHit(p: Player, v: Player, mult: number, now: number) {
    if (this.cantAttack(p, v)) { p.targetId = ""; return; }
    const ch = CHARS[p.charId];
    const raw = rollDamage(playerAtk(ch.atk, p.level) + equipBonus(p.equip).atk, ch.forms[p.form].dmgMult * mult,
      playerDef(CHARS[v.charId].def, v.level) + equipBonus(v.equip).def);
    const dmg = Math.max(1, Math.round(raw * PVP_DAMAGE));
    v.hp -= dmg;
    v.lastCombatAt = p.lastCombatAt = now;
    v.lastAttackerId = p.id;
    v.lastAttackedAt = now;
    if (p.pvpUntil <= now) this.log(p, `Você atacou ${v.name}: viagem e zona de proteção bloqueadas por ${PVP_LOCK_MS / 60000} min.`);
    p.pvpUntil = now + PVP_LOCK_MS;
    this.broadcast("fx", { t: "dmg", id: v.id, v: dmg });
    if (v.hp <= 0) {
      p.targetId = "";
      this.broadcast("chat", { from: "", text: `${v.name} foi derrotado por ${p.name}.` });
      this.killPlayer(v, `${p.name} (jogador)`);
    }
  }

  /** XP do monstro: sozinho vai tudo para quem matou; em party, divide entre os
   * membros vivos por perto, com bônus, se a diferença de nível permitir. */
  private shareExp(killer: Player, m: Monster, exp: number, from: string) {
    const party = this.parties.get(killer.partyId);
    const near = party
      ? party.members.map((id) => this.state.players.get(id)).filter((x): x is Player =>
        !!x && x.hp > 0 && chebyshev(x.x, x.y, m.x, m.y) <= PARTY_SHARE_RANGE)
      : [killer];
    const lv = near.map((x) => x.level);
    const fair = Math.min(...lv) >= Math.floor(Math.max(...lv) * PARTY_LEVEL_RATIO);
    if (!party || near.length < 2 || !fair) {
      if (party && !fair && Date.now() - party.warnedAt > 60_000) {
        party.warnedAt = Date.now();
        this.partyLog(party, "XP não dividida: o menor nível precisa ser pelo menos 2/3 do maior.");
      }
      return this.gainExp(killer, exp, from);
    }
    const each = Math.round((exp * (1 + PARTY_SHARE_BONUS * (near.length - 1))) / near.length);
    for (const x of near) this.gainExp(x, each, `${from} (party, ${near.length})`);
  }

  private leaveParty(p: Player) {
    const party = this.parties.get(p.partyId);
    p.partyId = "";
    p.partyLead = false;
    if (!party) return;
    party.members = party.members.filter((id) => id !== p.id);
    if (party.members.length < 2) {
      for (const id of party.members) {
        const x = this.state.players.get(id);
        if (x) { x.partyId = ""; x.partyLead = false; this.log(x, "A party foi desfeita."); }
      }
      this.parties.delete(party.id);
      return;
    }
    if (party.leader === p.id) {
      party.leader = party.members[0];
      const lead = this.state.players.get(party.leader);
      if (lead) lead.partyLead = true;
    }
    this.partyLog(party, `${p.name} saiu da party.`);
  }

  private partyLog(party: Party, text: string) {
    for (const id of party.members) {
      const x = this.state.players.get(id);
      if (x) this.log(x, text);
    }
  }

  // ---------- utilidades ----------

  private me(c: Client) {
    const id = this.sessions.get(c.sessionId);
    return id ? this.state.players.get(id) : undefined;
  }

  private log(p: Player, text: string) {
    for (const c of this.clients) if (this.sessions.get(c.sessionId) === p.id) c.send("log", { text });
  }

  private toSave(p: Player): db.SaveData {
    return {
      name: p.name, charId: p.charId, level: p.level, exp: p.exp, hp: p.hp, rei: Math.round(p.rei), x: p.x, y: p.y,
      gold: p.gold, inv: p.inv, depot: p.depot, equip: p.equip,
      autoTarget: p.autoTarget, autoHunt: p.autoHunt, autoHeal: p.autoHeal,
      offline: p.online ? undefined : { since: p.offlineSince, expAtLeave: p.expAtLeave, goldAtLeave: p.goldAtLeave, deaths: p.offlineDeaths },
    };
  }

  private saveAll() {
    db.saveMany([...this.state.players.values()].map((p) => ({ id: p.id, data: this.toSave(p), inWorld: true })));
  }
}
