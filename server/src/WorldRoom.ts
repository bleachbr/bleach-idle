// Sala única do mundo. O servidor é autoritativo: o cliente só manda intenções
// ("andar para", "atacar", "usar habilidade") e toda a simulação roda aqui no tick.
// Como o personagem é uma entidade do servidor, a hunt offline é só não removê-lo
// quando o socket cai: o mesmo Auto Helper continua rodando.
import { Client, ServerError } from "@colyseus/core";
import { GameRoom } from "./GameRoom";
import { WorldState, Player, Monster, Bag, type DeathReport, type Interact } from "./schema";
import {
  walkable, nearestWalkable, inPZ, type GameMap,
  PARTY_MAX, PARTY_SHARE_RANGE, PARTY_SHARE_BONUS, PARTY_LEVEL_RATIO, PARTY_INVITE_MS,
  INVASION, PVP_MIN_LEVEL, PVP_DAMAGE, PVP_LOCK_MS, SKULL_PER_KILL_MS, SKULL_MAX_MS, SKULL_ITEM_LOSS, SKULL_GOLD_LOSS, RECALL_COMBAT_MS, RECALL_COOLDOWN_MS, TRAVEL,
  CHARS, MONSTERS, TICK_MS, DIR_VEC, type Dir,
  expForLevel, maxHp, maxRei, rollDamage, playerAtk, playerDef, chebyshev, DEATH_EXP_LOSS,
  ITEMS, SHOP, START_KIT, INV_SIZE, DEPOT_SIZE, INTERACT_RANGE, EQUIP_SLOTS, type EquipSlot, type Slot,
  DEATH_ITEM_LOSS, DEATH_GOLD_LOSS, lookOf, QUEST_BY_ID, MAX_ACTIVE_QUESTS,
  zanNext, reiNext, zanMult, reiMult, AUTO_TRAIN_BURN,
  rollLoot, addItem, isPureLoot, setBonuses, newProgress, bestiaryDmgMult, bestiaryLootMult, bestiaryStage, bestiaryStages, BESTIARY_KINDS, BOSSES,
  SEASON, SEASON_PTS, seasonId, seasonName, seasonEnds, seasonReward, seasonTier, newSeason, xpWeekend, WEEKEND_EXP, WORLD_BOSS, type SeasonReward,
  own, isOwnKey, COSMETIC, titleText, FREE_CRYSTALS, type CosEquip, TECH_SLOTS, techniques, techniqueFor, maxForm, powerOf, powerTier, POWER_TIERS, fmtPower, ACHIEVEMENTS, DAILY, levelMilestone, DANGAI, dangaiFloor, dangaiReward, dangaiStart, REBIRTH, rebirthLevel, rebirthBonus, START_LEVEL, TUTORIAL, TUTORIAL_MAX_LEVEL, type TutorialId, dailyMissions, dailyReward, dailyText, type DailyKind, rollBox, BOOST_MS, BOOST_MAX_MS, BOOST_EXP, BOOST_LOOT, FORGE_MAX, FORGE_CHANCE, FORGE_SAFE, forgeCost, SLOT_LABEL, dayKey, prevDay, stagesSum, LOOT, type Stats, removeItem, spaceFor, countItem, gearBonus,
  applyStatus, tickStatuses, canEntityMove, canEntityAct, effectiveStepMs, formatStatusFlags, clearStatuses, type SkillStatusDef,
  evaluateBossPhase,
} from "../../shared/src";
import { findPath, type Pt } from "./path";
import * as db from "./db";
import { consumeTicket, type Ticket } from "./auth";
import { MAPS, HOME, TEMPLE, SPAWNS, tileKey } from "./maps";
import * as guilds from "./guilds";
import * as market from "./market";
import { flagOn } from "./flags";
import { recordTick } from "./tickStats";
import { recordSave, setWorldMetricsProvider } from "./metrics";
import { getRanking, invalidateRankingCache } from "./ranking";
import { claimServerMilestone } from "./milestones";
import { checkChatMessage, isGm, mutePlayer, sanitizeChatText, unmutePlayer } from "./moderation";

const GUILD_COST = 500;
/** Modo Dev (botão que libera tudo para testar): nasce DESLIGADO e só liga com BI_DEV=1 (`npm run dev` já define). */
const DEV_MODE = flagOn("BI_DEV");
const GUILD_MIN_LEVEL = 10;
const GUILD_NAME_RE = /^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 ]{2,19}$/;
const HELP = [
  "Comandos:",
  "/pm Nome, mensagem — mensagem privada",
  "/p mensagem — chat da party · /g mensagem — chat da guilda",
  `/guilda criar Nome (${GUILD_COST} kan, nível ${GUILD_MIN_LEVEL}+) · /guilda convidar Nome · /guilda aceitar · /guilda recusar`,
  "/guilda sair · /guilda expulsar Nome · /guilda lider Nome · /guilda depositar N · /guilda sacar N (líder) · /guilda info",
  "/ranking — abre o ranking",
  "/ignorar Nome — liga ou desliga as mensagens dessa pessoa · /ignorar — mostra a lista",
];

const OFFLINE_MAX_MS = 12 * 3600_000;
const AGGRO = 5;
const LEASH = 10;
const VIEW = 8;
const HUNT_RADIUS = 30;
/** "já estou no lugar de caça": até esta distância da chegada do destino */
const HUNT_SPOT_RADIUS = 12;
const REGEN_MS = 2000;
const BAG_OWNER_MS = 60_000; // prioridade de quem matou
const BAG_TTL_MS = 5 * 60_000; // tempo até o corpo/sacola sumir

const mapOf = (e: { map: string }): GameMap => MAPS[e.map] ?? HOME;
const sameMap = (a: { map: string }, b: { map: string }) => a.map === b.map;
const isPlayer = (e: Player | Monster): e is Player => e instanceof Player;

interface Party { id: string; leader: string; members: string[]; warnedAt: number }

/** corpo ou sacola no chão, como fica salvo no banco */
type SavedBag = Pick<Bag, "id" | "map" | "x" | "y" | "kind" | "label" | "owners" | "ownerUntil" | "expires" | "gold" | "items">;

// taxa de XP dos monstros, como nos servidores de Tibia (1 = o valor da tabela). Veja scripts/balance.ts.
const EXP_RATE = Number(process.env.EXP_RATE) || 1;

// da mais fraca para a mais forte
const HP_POTIONS = ["onigiri", "pocao_vida", "pocao_grande", "pocao_suprema"];
const REI_POTIONS = ["pocao_rei", "pocao_rei_grande", "pocao_rei_suprema"];

export class WorldRoom extends GameRoom<WorldState> {
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
    setWorldMetricsProvider(() => {
      let online = 0;
      for (const p of this.state.players.values()) if (p.online) online++;
      const totalInWorld = this.state.players.size;
      return {
        players: { online, offlineHunt: totalInWorld - online, totalInWorld },
        entities: { monsters: this.state.monsters.size, bags: this.state.bags.size },
      };
    });
    SPAWNS.forEach((s, i) => { for (let k = 0; k < s.count; k++) this.spawnMonster(i); });
    this.restoreWorld();
    this.setSimulationInterval(() => {
      const t0 = performance.now();
      this.tick();
      recordTick(performance.now() - t0);
    }, TICK_MS);
    // save frequente e em transação: numa queda se perdem no máximo ~10 s
    this.clock.setInterval(() => this.saveAll(), 10_000);
    this.scheduleInvasion(Number(process.env.INVASION_FIRST_MS) || INVASION.firstMs);
    this.scheduleWorldBoss(Number(process.env.WORLDBOSS_FIRST_MS) || WORLD_BOSS.firstMs);
    this.clock.setInterval(() => { for (const p of this.state.players.values()) this.checkAchievements(p); }, 5000);

    this.handle("move", (c, m: { x: number; y: number }) => {
      const p = this.me(c);
      if (!p || !Number.isInteger(m?.x) || !Number.isInteger(m?.y) || !walkable(mapOf(p), m.x, m.y)) return;
      p.follow = false;
      p.path = findPath(p.x, p.y, (x, y) => x === m.x && y === m.y, (x, y) => !walkable(mapOf(p), x, y));
    });
    this.handle("step", (c, m: { dir: number }) => {
      const p = this.me(c);
      // só inteiro 0..3: uma string aqui ia para o campo uint8 sincronizado e a codificação
      // do estado falhava, derrubando TODOS os jogadores da sala
      const dir = m?.dir;
      if (!p || !Number.isInteger(dir) || !(dir in DIR_VEC)) return;
      const [dx, dy] = DIR_VEC[dir as Dir];
      p.follow = false;
      p.dir = dir;
      p.path = walkable(mapOf(p), p.x + dx, p.y + dy) ? [{ x: p.x + dx, y: p.y + dy }] : [];
    });
    this.handle("target", (c, m: { id: string }) => {
      const p = this.me(c);
      if (!p) return;
      if (!m?.id || m.id === p.targetId) { p.targetId = ""; p.follow = false; return; }
      const mo = this.state.monsters.get(m.id);
      if (mo) {
        if (mo.owner && mo.owner !== p.id) return this.log(p, "Esse monstro é do desafio de outra pessoa.");
        if (sameMap(p, mo)) { p.targetId = m.id; p.follow = true; }
        return;
      }
      const v = this.state.players.get(m.id);
      if (!v) return;
      const why = this.cantAttack(p, v);
      if (why) return this.log(p, why);
      p.targetId = v.id;
      p.follow = true;
    });
    this.handle("nextTarget", (c) => {
      const p = this.me(c);
      if (!p) return;
      const list = [...this.state.monsters.values()]
        .filter((mo) => sameMap(p, mo) && (!mo.owner || mo.owner === p.id) && !MONSTERS[mo.kind]?.dummy && chebyshev(p.x, p.y, mo.x, mo.y) <= VIEW)
        .sort((a, b) => chebyshev(p.x, p.y, a.x, a.y) - chebyshev(p.x, p.y, b.x, b.y));
      if (!list.length) return;
      const i = list.findIndex((mo) => mo.id === p.targetId);
      p.targetId = list[(i + 1) % list.length].id;
      p.follow = true;
    });
    this.handle("skill", (c, m: { slot: number }) => {
      const p = this.me(c);
      if (!p) return;
      const now = Date.now();
      const ti = TECH_SLOTS.indexOf(m?.slot);
      if (m?.slot === 0) {
        // botão único (celular): a técnica mais forte que estiver pronta
        const t = this.targetOf(p) ?? this.nearestMonster(p, CHARS[p.charId].skill.range);
        if (!t) return this.log(p, "Nenhum alvo ao alcance.");
        for (let i = TECH_SLOTS.length - 1; i >= 0; i--) if (this.trySkill(p, t, now, false, i)) return;
        this.log(p, "Nenhuma técnica pronta (recarga, reiatsu ou alcance).");
      } else if (ti >= 0) {
        const tech = techniqueFor(p.charId, ti, p.form);
        if (!tech) return;
        if (p.level < (tech.minLevel ?? 1)) return this.log(p, `${tech.name} se aprende no nível ${tech.minLevel}.`);
        const t = this.targetOf(p) ?? this.nearestMonster(p, tech.range);
        if (!t) return this.log(p, "Nenhum alvo ao alcance.");
        if (!this.trySkill(p, t, now, false, ti)) this.log(p, `${tech.name} indisponível (recarga, reiatsu ou alcance).`);
      } else if (m?.slot === 2 || m?.slot === 3) {
        const id = this.bestPotion(p, m.slot === 2 ? "hp" : "rei");
        if (!id) this.log(p, m.slot === 2 ? "Sem poções de cura." : "Sem poções de reiatsu.");
        else if (!this.useConsumable(p, id, now)) this.log(p, `Não dá para usar ${ITEMS[id].name} agora.`);
      }
    });
    this.registerItemMessages();
    this.registerSocialMessages();
    this.registerQuestMessages();
    this.registerBagMessages();
    this.registerMarketMessages();
    this.registerBookMessages();
    this.registerShopMessages();
    this.registerSeasonMessages();
    this.registerForgeMessages();
    this.registerRebirthMessages();
    this.registerDangaiMessages();
    // relógio: o cliente pergunta a hora do servidor para contar o bloqueio de PvP certo
    this.handle("time", (c) => c.send("time", { now: Date.now() }));
    this.handle("transform", (c) => {
      const p = this.me(c);
      if (!p) return;
      const forms = CHARS[p.charId].forms;
      const top = maxForm(p.charId, p.level);
      // T liberado vai direto ao estágio mais alto da evolução; T de novo volta ao normal
      if (p.form > 0) return this.setForm(p, 0);
      if (top === 0) return this.log(p, `${forms[1].label} exige nível ${forms[1].minLevel}.`);
      if (p.rei < p.maxRei * 0.3) return this.log(p, `Reiatsu insuficiente para ${forms[top].label}.`);
      this.setForm(p, top);
    });
    this.handle("auto", (c, m: { autoTarget?: boolean; autoHunt?: boolean; autoTrain?: boolean; autoSell?: boolean; autoHeal?: number;
      huntSpot?: string; autoReturn?: boolean; autoRei?: number; autoBankai?: boolean; autoBox?: boolean; autoRestock?: boolean }) => {
      const p = this.me(c);
      if (!p) return;
      if (typeof m?.autoTarget === "boolean") p.autoTarget = m.autoTarget;
      if (typeof m?.autoHunt === "boolean") p.autoHunt = m.autoHunt;
      if (p.autoHunt) this.tutorial(p, "auto");
      if (typeof m?.autoTrain === "boolean") p.autoTrain = m.autoTrain;
      if (typeof m?.autoSell === "boolean") p.autoSell = m.autoSell;
      if (typeof m?.huntSpot === "string" && (m.huntSpot === "" || TRAVEL.some((t) => t.id === m.huntSpot))) p.huntSpot = m.huntSpot;
      if (typeof m?.autoReturn === "boolean") p.autoReturn = m.autoReturn;
      if (typeof m?.autoRei === "number") p.autoRei = Math.max(0, Math.min(90, Math.round(m.autoRei)));
      if (typeof m?.autoBankai === "boolean") p.autoBankai = m.autoBankai;
      if (typeof m?.autoBox === "boolean") p.autoBox = m.autoBox;
      if (typeof m?.autoRestock === "boolean") p.autoRestock = m.autoRestock;
      if (typeof m?.autoHeal === "number") p.autoHeal = Math.max(0, Math.min(90, Math.round(m.autoHeal)));
    });
    this.handle("chat", (c, m: { text: string }) => {
      const p = this.me(c);
      const text = sanitizeChatText(m?.text);
      if (!p || !text) return;
      if (text.startsWith("/")) return this.command(p, text);
      const chk = checkChatMessage(p.id, text);
      if (!chk.ok) return chk.reason ? this.log(p, chk.reason) : undefined;
      for (const x of this.state.players.values()) if (!x.ignore.includes(p.id)) this.sendTo(x, "chat", { from: this.display(p), text: chk.text });
    });
    this.handle("ranking", (c) => c.send("ranking", this.ranking()));
    // O cliente envia `devHello` a todo jogador que entra (main.ts, bindDev). Sem handler o Colyseus desconecta quem manda:
    // por isso ele é sempre registrado e só responde (e só registra `dev`) com o modo Dev ligado.
    if (DEV_MODE) this.registerDevMessages();
    else this.handle("devHello", () => {});
    if (flagOn("BI_DEBUG")) {
      this.handle("debugInvasion", () => this.startInvasion());
      this.handle("debugInvasionEnd", () => this.endInvasion(false));
      this.handle("debugWorldBoss", () => this.spawnWorldBoss());
      this.handle("debugSeasonPts", (c, m: { n?: number }) => { const p = this.me(c); if (p) this.seasonAdd(p, Number(m?.n) || 0, "teste"); });
    }
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
      p.accountId = row.accountId ?? 0;
      this.state.players.set(id, p);
      if (row.data.offline) {
        p.offlineSince = row.data.offline.since;
        p.expAtLeave = row.data.offline.expAtLeave;
        p.goldAtLeave = row.data.offline.goldAtLeave;
        p.offlineDeaths = row.data.offline.deaths ?? [];
        p.offKills = row.data.offline.kills ?? 0;
        p.offItems = row.data.offline.items ?? {};
        this.sendOfflineReport(client, p);
      }
      p.online = true;
    }
    this.sessions.set(client.sessionId, id);
    db.save(p.id, this.toSave(p), true);
    client.send("welcome", { id });
    this.sendInv(p);
    this.sendGuild(p);
    this.sendQuests(p);
    client.send("dailyReady", { ready: p.prog.daily.last !== dayKey(Date.now()) });
    this.sendSeason(p, false);
    if (xpWeekend(Date.now())) client.send("log", { text: "Fim de semana: XP em dobro dos monstros até domingo à meia-noite!" });
    if (this.worldBoss) client.send("log", { text: `O chefe mundial ${MONSTERS[WORLD_BOSS.kind].name} está na praça de Karakura!` });
    this.sendTutorial(p);
    this.broadcast("chat", { from: "", text: `${p.name} entrou no mundo.` });
  }

  onLeave(client: Client) {
    const id = this.sessions.get(client.sessionId);
    this.sessions.delete(client.sessionId);
    const p = id ? this.state.players.get(id) : undefined;
    if (!p) return;
    if (p.autoHunt || p.autoTrain) {
      p.online = false;
      p.offlineSince = Date.now();
      p.expAtLeave = p.exp;
      p.goldAtLeave = p.gold;
      p.zanAtLeave = p.zanjutsu;
      p.reiAtLeave = p.reiryoku;
      p.offKills = 0;
      p.offItems = {};
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
    p.charId = own(CHARS, saved.charId) ? saved.charId : "ichigo";
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
    p.frags = saved.frags ?? 0;
    p.skullUntil = saved.skullUntil ?? 0;
    p.rebirths = saved.rebirths ?? 0;
    p.autoTrain = !!saved.autoTrain;
    p.autoSell = !!saved.autoSell;
    p.huntSpot = TRAVEL.some((t) => t.id === saved.huntSpot) ? saved.huntSpot! : "";
    p.autoReturn = !!saved.autoReturn;
    p.autoRei = saved.autoRei ?? 0;
    p.autoBankai = !!saved.autoBankai;
    p.autoBox = !!saved.autoBox;
    p.autoRestock = !!saved.autoRestock;
    p.ignore = (saved.ignore ?? []).slice(0, 100);
    p.zanjutsu = saved.zanjutsu ?? 0;
    p.zanTries = saved.zanTries ?? 0;
    p.reiryoku = saved.reiryoku ?? 0;
    p.reiTries = saved.reiTries ?? 0;
    this.train(p, 0, 0);
    p.quests = saved.quests ?? { active: {}, done: [] };
    // saves gravados antes da correção de chaves de protótipo podem ter missão fantasma (ex.: "undefined"): descarta o que não existe
    for (const k of Object.keys(p.quests.active)) if (!own(QUEST_BY_ID, k)) delete p.quests.active[k];
    p.prog = { ...newProgress(), ...saved.prog };
    p.prog.peak = Math.max(p.prog.peak ?? 0, saved.level);
    // quem já é veterano quando o guia chegou não precisa dele
    if (!p.prog.tut && p.level >= TUTORIAL_MAX_LEVEL) p.prog.tut = TUTORIAL.map((t) => t.id);
    p.forge = saved.forge ?? {};
    p.expBoostUntil = saved.expBoostUntil ?? 0;
    p.lootBoostUntil = saved.lootBoostUntil ?? 0;
    this.applyCos(p, saved.cos ?? {});
    const g = guilds.guildOf(id);
    p.guildId = g?.id ?? 0;
    p.guildTag = g?.tag ?? "";
    this.recompute(p);
    p.hp = Math.max(1, Math.min(saved.hp ?? p.maxHp, p.maxHp));
    p.rei = Math.min(saved.rei ?? p.maxRei, p.maxRei);
    p.map = saved.map && MAPS[saved.map] ? saved.map : HOME.id;
    const pos = walkable(mapOf(p), saved.x, saved.y) ? saved : (p.map = HOME.id, TEMPLE);
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
      if (!(row.data.autoHunt || row.data.autoTrain) || Date.now() - since > OFFLINE_MAX_MS) {
        db.setInWorld(row.id, false);
        continue;
      }
      const p = this.fromSave(row.id, row.data);
      p.accountId = row.accountId ?? 0;
      p.online = false;
      p.offlineSince = since;
      p.expAtLeave = row.data.offline?.expAtLeave ?? p.exp;
      p.goldAtLeave = row.data.offline?.goldAtLeave ?? p.gold;
      p.zanAtLeave = row.data.offline?.zanAtLeave ?? p.zanjutsu;
      p.reiAtLeave = row.data.offline?.reiAtLeave ?? p.reiryoku;
      p.offKills = row.data.offline?.kills ?? 0;
      p.offItems = row.data.offline?.items ?? {};
      this.state.players.set(p.id, p);
      n++;
    }
    if (n) console.log(`Retomadas ${n} hunt(s) offline.`);
    // parties salvas: voltam só com os membros que estão de novo no mundo
    for (const party of db.getMeta<Party[]>("parties") ?? []) {
      const members = party.members.filter((id) => this.state.players.has(id));
      if (members.length < 2) continue;
      const leader = members.includes(party.leader) ? party.leader : members[0];
      this.parties.set(party.id, { ...party, members, leader });
      for (const id of members) {
        const p = this.state.players.get(id)!;
        p.partyId = party.id;
        p.partyLead = id === leader;
      }
      this.partySeq = Math.max(this.partySeq, Number(party.id.replace(/\D/g, "")) || 0);
    }
    // corpos e sacolas: voltam com o mesmo prazo (o tempo fora do ar também conta)
    const now = Date.now();
    for (const sb of db.getMeta<SavedBag[]>("bags") ?? []) {
      if (sb.expires <= now || !MAPS[sb.map]) continue;
      const b = Object.assign(new Bag(), sb);
      this.state.bags.set(b.id, b);
      this.bagSeq = Math.max(this.bagSeq, Number(b.id.replace(/\D/g, "")) || 0);
    }
  }

  onDispose() {
    this.saveAll();
  }

  // ---------- simulação ----------

  private tick() {
    const now = Date.now();
    this.monsterAt.clear();
    for (const m of this.state.monsters.values()) this.monsterAt.add(tileKey(m.map, m.x, m.y));
    this.playerAt.clear();
    for (const p of this.state.players.values()) this.playerAt.set(tileKey(p.map, p.x, p.y), 1);

    for (const p of [...this.state.players.values()]) {
      if (!p.online && (!(p.autoHunt || p.autoTrain) || now - p.offlineSince > OFFLINE_MAX_MS)) {
        p.autoHunt = false;
        db.save(p.id, this.toSave(p), false);
        this.state.players.delete(p.id);
        continue;
      }
      if (p.devGod) { p.hp = p.maxHp; p.rei = p.maxRei; }
      this.updatePlayer(p, now);
    }
    for (const m of [...this.state.monsters.values()]) this.updateMonster(m, now);

    if (now >= this.nextRegenAt) {
      this.nextRegenAt = now + REGEN_MS;
      for (const p of this.state.players.values()) this.regen(p, now);
    }
  }

  private processStatuses(e: Player | Monster, now: number) {
    const { dotDamage, dotFromId } = tickStatuses(e.statuses, now);
    if (dotDamage > 0 && e.hp > 0) {
      if (isPlayer(e)) {
        if (!inPZ(mapOf(e), e.x, e.y) && !e.devGod) {
          e.hp -= dotDamage;
          e.lastCombatAt = now;
          this.broadcast("fx", { t: "dmg", id: e.id, v: dotDamage, from: dotFromId, dot: true });
          const killer = this.state.players.get(dotFromId);
          if (e.hp <= 0) this.killPlayer(e, killer?.name ?? "Sangramento", dotFromId);
        }
      } else {
        const def = MONSTERS[e.kind];
        if (!def.dummy) {
          e.hp -= dotDamage;
          if (dotFromId) e.lastHitBy = dotFromId;
          this.broadcast("fx", { t: "dmg", id: e.id, v: dotDamage, from: dotFromId, dot: true });
          const killer = this.state.players.get(dotFromId || e.lastHitBy);
          if (e.hp <= 0 && killer) this.killMonster(e, killer);
          else if (e.hp > 0) this.checkBossPhase(e, now);
        }
      }
    }
    const flags = formatStatusFlags(e.statuses, now);
    if (e.statusFlags !== flags) e.statusFlags = flags;
  }

  private checkBossPhase(m: Monster, now: number) {
    const tr = evaluateBossPhase(m.kind, m.phase, m.hp, m.maxHp);
    if (!tr) return;
    if (m.phase === 0) m.basePower = m.power;
    m.phase = tr.phase;
    const def = MONSTERS[m.kind];
    m.power = m.basePower * tr.atkMult;
    m.defMult = tr.defMult;
    m.stepMs = Math.max(120, Math.round(def.stepMs * tr.stepMult));
    this.broadcast("fx", { t: "event", text: tr.shout });
    for (const p of this.state.players.values()) {
      if (!sameMap(p, m) || (m.owner && m.owner !== p.id)) continue;
      this.log(p, tr.shout);
      if (tr.aoeStatus && tr.aoeRadius && p.hp > 0 && !inPZ(mapOf(p), p.x, p.y) && !p.devGod) {
        if (chebyshev(p.x, p.y, m.x, m.y) <= tr.aoeRadius) {
          applyStatus(p.statuses, tr.aoeStatus, m.id, Math.round(def.atk * m.power), now);
          const flags = formatStatusFlags(p.statuses, now);
          if (p.statusFlags !== flags) p.statusFlags = flags;
          this.broadcast("fx", { t: "status", id: p.id, kind: tr.aoeStatus.kind, ms: tr.aoeStatus.durationMs });
        }
      }
    }
  }

  private applySkillStatus(from: Player, target: Player | Monster, def: SkillStatusDef | undefined, baseDmg: number, now: number) {
    if (!def || target.hp <= 0) return;
    if (!isPlayer(target) && MONSTERS[target.kind]?.dummy) return;
    applyStatus(target.statuses, def, from.id, baseDmg, now);
    const flags = formatStatusFlags(target.statuses, now);
    if (target.statusFlags !== flags) target.statusFlags = flags;
    this.broadcast("fx", { t: "status", id: target.id, kind: def.kind, ms: def.durationMs });
  }

  private updatePlayer(p: Player, now: number) {
    this.processStatuses(p, now);
    if (p.hp <= 0) return;
    const form = CHARS[p.charId].forms[p.form];
    if (form.reiDrain) {
      p.rei = Math.max(0, p.rei - (form.reiDrain * TICK_MS) / 1000);
      if (p.rei <= 0) {
        this.setForm(p, 0);
        this.log(p, "O reiatsu acabou: liberação desfeita.");
      }
    }
    if (p.autoHeal && (p.hp * 100) / p.maxHp < p.autoHeal) {
      const id = this.bestPotion(p, "hp");
      if (id) this.useConsumable(p, id, now);
    }
    if (p.autoRei && (p.rei * 100) / p.maxRei < p.autoRei) {
      const id = this.bestPotion(p, "rei");
      if (id) this.useConsumable(p, id, now);
    }
    this.helper(p, now);
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
      // Auto Hunt prefere os invasores (durante a invasão) e depois os monstros das missões de caça ativas
      const kinds = p.autoHunt ? this.questKinds(p) : undefined;
      t = (p.autoHunt && this.invasion && this.nearestMonster(p, HUNT_RADIUS, undefined, true))
        || (kinds && this.nearestMonster(p, HUNT_RADIUS, kinds)) || this.nearestMonster(p, p.autoHunt ? HUNT_RADIUS : VIEW);
      if (t) { p.targetId = t.id; p.follow = true; }
    }
    if (t && p.autoHunt) for (let i = TECH_SLOTS.length - 1; i >= 0; i--) if (this.trySkill(p, t, now, true, i)) break;

    if (t && p.follow && now >= p.nextStepAt) {
      const tx = t.x, ty = t.y;
      const far = chebyshev(p.x, p.y, tx, ty) > 1;
      p.path = far
        ? findPath(p.x, p.y, (x, y) => chebyshev(x, y, tx, ty) === 1, (x, y) => !walkable(mapOf(p), x, y) || this.monsterAt.has(tileKey(p.map, x, y)))
        : [];
      // sem caminho até o alvo (cercado por árvores ou por outros monstros): o Auto Helper desiste
      // depois de 3 s e ignora esse monstro por 20 s; antes, a caçada ficava parada para sempre
      if (far && !p.path.length && (p.autoHunt || p.autoTarget) && !isPlayer(t)) {
        if (!p.stuckSince) p.stuckSince = now;
        else if (now - p.stuckSince > 3000) {
          p.skipId = t.id;
          p.skipUntil = now + 20_000;
          p.targetId = "";
          p.follow = false;
          p.stuckSince = 0;
        }
      } else p.stuckSince = 0;
    }
    if (p.path.length && now >= p.nextStepAt && canEntityMove(p.statuses, now)) {
      const next = p.path[0];
      if (this.monsterAt.has(tileKey(p.map, next.x, next.y))) p.path = [];
      else if (p.pvpUntil > now && inPZ(mapOf(p), next.x, next.y) && !inPZ(mapOf(p), p.x, p.y)) {
        p.path = [];
        if (now > p.pzWarnAt) {
          p.pzWarnAt = now + 5000;
          this.log(p, `Você atacou um jogador: não pode entrar na zona de proteção por ${Math.ceil((p.pvpUntil - now) / 1000)} s.`);
        }
      } else {
        p.path.shift();
        this.playerAt.delete(tileKey(p.map, p.x, p.y));
        this.stepTo(p, next, now);
        this.playerAt.set(tileKey(p.map, p.x, p.y), 1);
      }
    }

    if (t && t.hp <= 0) t = undefined; // morreu pela habilidade neste mesmo tick
    if (t && chebyshev(p.x, p.y, t.x, t.y) <= 1 && now >= p.nextAttackAt && !inPZ(mapOf(p), p.x, p.y) && canEntityAct(p.statuses, now)) {
      p.nextAttackAt = now + form.attackMs;
      this.face(p, t);
      this.hit(p, t, 1, now);
    }
  }

  private updateMonster(m: Monster, now: number) {
    this.processStatuses(m, now);
    if (m.hp <= 0 || !this.state.monsters.has(m.id)) return;
    const def = MONSTERS[m.kind];
    if (def.dummy) {
      if (now >= m.nextAttackAt) { m.nextAttackAt = now + 3000; m.hp = m.maxHp; } // cura total a cada 3 s
      return;
    }
    const sp = m.owner ? { x: m.homeX, y: m.homeY, radius: 8 } : m.invader ? { x: m.homeX, y: m.homeY, radius: 3 } : SPAWNS[m.spawnIndex];
    if (m.owner) m.targetId = this.state.players.get(m.owner)?.map === m.map ? m.owner : "";
    let t = m.targetId ? this.state.players.get(m.targetId) : undefined;
    if (t && (t.hp <= 0 || !sameMap(m, t) || inPZ(mapOf(t), t.x, t.y) || chebyshev(m.x, m.y, sp.x, sp.y) > LEASH + sp.radius)) {
      t = undefined;
      m.targetId = "";
      m.path = this.monsterPath(m, (x, y) => x === sp.x && y === sp.y, 2000);
    }
    if (!t) {
      let best: Player | undefined;
      let bd = AGGRO + 1;
      for (const p of this.state.players.values()) {
        const d = chebyshev(m.x, m.y, p.x, p.y);
        if (d < bd && p.hp > 0 && sameMap(m, p) && !inPZ(mapOf(p), p.x, p.y) && (!m.owner || m.owner === p.id)) { best = p; bd = d; }
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
        if (now >= m.nextAttackAt && canEntityAct(m.statuses, now)) {
          m.nextAttackAt = now + def.attackMs;
          this.face(m, t);
          const ch = CHARS[t.charId];
          const dmg = rollDamage(def.atk * m.power, 1, playerDef(ch.def, t.level) + gearBonus(t.equip, t.forge).def);
          t.hp -= dmg;
          t.lastCombatAt = now;
          this.broadcast("fx", { t: "dmg", id: t.id, v: dmg, from: m.id });
          if (t.hp <= 0) this.killPlayer(t, def.name);
        }
      }
    } else if (!m.path.length && now >= m.nextWanderAt) {
      m.nextWanderAt = now + 2000 + Math.random() * 4000;
      const gx = sp.x + Math.round((Math.random() * 2 - 1) * sp.radius);
      const gy = sp.y + Math.round((Math.random() * 2 - 1) * sp.radius);
      m.path = this.monsterPath(m, (x, y) => x === gx && y === gy, 300);
    }

    if (m.path.length && now >= m.nextStepAt && canEntityMove(m.statuses, now)) {
      const next = m.path[0];
      if (this.blockedForMonster(m.map, next.x, next.y)) m.path = [];
      else {
        m.path.shift();
        this.monsterAt.delete(tileKey(m.map, m.x, m.y));
        this.stepTo(m, next, now);
        this.monsterAt.add(tileKey(m.map, m.x, m.y));
      }
    }
  }

  private blockedForMonster(map: string, x: number, y: number) {
    const k = tileKey(map, x, y);
    return !walkable(MAPS[map], x, y) || inPZ(MAPS[map], x, y) || this.monsterAt.has(k) || this.playerAt.has(k);
  }

  private monsterPath(m: Monster, goal: (x: number, y: number) => boolean, maxNodes: number) {
    return findPath(m.x, m.y, goal, (x, y) => this.blockedForMonster(m.map, x, y), maxNodes);
  }

  private stepTo(e: Player | Monster, next: Pt, now: number) {
    const dx = next.x - e.x, dy = next.y - e.y;
    e.dir = dy > 0 ? 0 : dx < 0 ? 1 : dx > 0 ? 2 : 3;
    e.x = next.x;
    e.y = next.y;
    e.nextStepAt = now + effectiveStepMs(e.stepMs, e.statuses, now);
  }

  private face(e: Player | Monster, t: { x: number; y: number }) {
    const dx = t.x - e.x, dy = t.y - e.y;
    e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy > 0 ? 0 : 3;
  }

  private hit(p: Player, t: Player | Monster, mult: number, now: number, skill = false) {
    mult *= (skill ? reiMult(p.reiryoku) : zanMult(p.zanjutsu)) * rebirthBonus(p.rebirths).dmg * setBonuses(p.equip).total.dmg;
    if (!skill) this.train(p, 1, 0);
    if (isPlayer(t)) return this.pvpHit(p, t, mult, now);
    // no mesmo tick a habilidade pode matar e o golpe corpo a corpo acertar o mesmo alvo:
    // monstro já morto não apanha (antes contava 2 mortes: XP e loot em dobro e 2 respawns)
    if (t.hp <= 0 || !this.state.monsters.has(t.id) || (t.owner && t.owner !== p.id)) return;
    const ch = CHARS[p.charId];
    const def = MONSTERS[t.kind];
    mult *= bestiaryDmgMult(t.kind, p.prog.bestiary[t.kind] ?? 0);
    const dmg = rollDamage(playerAtk(ch.atk, p.level) + gearBonus(p.equip, p.forge).atk, ch.forms[p.form].dmgMult * mult, def.def * t.defMult);
    t.hp -= dmg;
    t.lastHitBy = p.id;
    if (t.world && this.worldBoss) this.worldBoss.dmg.set(p.id, (this.worldBoss.dmg.get(p.id) ?? 0) + Math.min(dmg, dmg + t.hp));
    if (!t.targetId && !def.dummy) t.targetId = p.id;
    p.lastCombatAt = now;
    this.broadcast("fx", { t: "dmg", id: t.id, v: dmg, from: p.id, skill });
    if (t.hp <= 0) {
      if (def.dummy) t.hp = t.maxHp; // boneco não morre
      else this.killMonster(t, p);
    } else {
      this.checkBossPhase(t, now);
    }
  }

  private trySkill(p: Player, t: Player | Monster, now: number, auto: boolean, i = 0): boolean {
    if (!canEntityAct(p.statuses, now)) return false;
    const sk = techniqueFor(p.charId, i, p.form);
    if (!sk || p.level < (sk.minLevel ?? 1)) return false;
    if (now < p.skillReadyAt || now < p.techReady[i] || p.rei < sk.cost || inPZ(mapOf(p), p.x, p.y)) return false;
    if (auto && p.rei - sk.cost < p.maxRei * 0.3) return false; // Auto Hunt guarda reiatsu para a liberação
    if (chebyshev(p.x, p.y, t.x, t.y) > sk.range) return false;
    if (isPlayer(t) && this.cantAttack(p, t)) return false;
    p.rei -= sk.cost;
    this.train(p, 0, sk.cost);
    p.techReady[i] = now + sk.cdMs;
    p.skillReadyAt = now + 600;
    this.face(p, t);
    const skin = p.cosFx ? COSMETIC[p.cosFx] : undefined;
    this.broadcast("fx", { t: "skill", from: p.id, to: t.id, color: skin?.color ?? sk.color, color2: skin?.color2, skin: !!skin, name: sk.name, i, area: sk.area ?? 0, cd: sk.cdMs });
    // técnica em área: os monstros em volta do alvo também levam (um pouco menos)
    const splash = sk.area && !isPlayer(t)
      ? [...this.state.monsters.values()].filter((m) => m !== t && m.hp > 0 && sameMap(m, t) && (!m.owner || m.owner === p.id)
        && chebyshev(m.x, m.y, t.x, t.y) <= sk.area!)
      : [];
    const hpBefore = t.hp;
    this.hit(p, t, sk.mult, now, true);
    this.applySkillStatus(p, t, sk.status, Math.max(1, hpBefore - t.hp), now);
    for (const m of splash) {
      const mHpBefore = m.hp;
      this.hit(p, m, sk.mult * 0.7, now, true);
      this.applySkillStatus(p, m, sk.status, Math.max(1, mHpBefore - m.hp), now);
    }
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
    } else if (def.boost) {
      const key = def.boost === "exp" ? "expBoostUntil" : "lootBoostUntil";
      if (p[key] - now > BOOST_MAX_MS - BOOST_MS) return this.log(p, "Já tem o máximo de 6 h desse bônus."), false;
      p[key] = Math.max(p[key], now) + BOOST_MS;
      this.log(p, `${def.name}: ${def.boost === "exp" ? "+50% de XP" : "+30% de chance de loot"} por mais 1 h (restam ${Math.ceil((p[key] - now) / 60000)} min).`);
    } else if (def.box) {
      const prize = rollBox();
      removeItem(p.inv, id, 1);
      const n = addItem(p.inv, prize.id, prize.qty);
      if (n < prize.qty) { addItem(p.inv, id, 1); removeItem(p.inv, prize.id, n); this.sendInv(p); return this.log(p, "Inventário sem espaço para o prêmio."), false; }
      this.log(p, `Caixa do Kisuke: ${prize.qty}x ${ITEMS[prize.id].name}!`);
      this.sendInv(p);
      return true;
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
    // Auto Treino ("Auto Power Down" do DBO): reiatsu parado vira Reiryoku
    if (p.autoTrain && !fight && !CHARS[p.charId].forms[p.form].reiDrain) {
      const burn = Math.min(p.rei, p.maxRei * AUTO_TRAIN_BURN);
      if (burn >= 1) { p.rei -= burn; this.train(p, 0, burn); }
    }
  }

  /** Soma treino de Zanjutsu (golpes) e Reiryoku (reiatsu gasto) e sobe de nível. */
  private train(p: Player, zan: number, rei: number) {
    p.zanTries += zan;
    p.reiTries += rei;
    while (p.zanTries >= zanNext(p.zanjutsu) && p.zanjutsu < 255) {
      p.zanTries -= zanNext(p.zanjutsu);
      p.zanjutsu++;
      this.log(p, `Zanjutsu subiu para ${p.zanjutsu}! (+2% de dano corpo a corpo por nível)`);
    }
    while (p.reiTries >= reiNext(p.reiryoku) && p.reiryoku < 255) {
      p.reiTries -= reiNext(p.reiryoku);
      p.reiryoku++;
      this.log(p, `Reiryoku subiu para ${p.reiryoku}! (+3% de dano das habilidades por nível)`);
    }
    if (zan + rei > 0 && powerOf(p) !== p.power) this.updatePower(p);
    p.zanPct = Math.floor((p.zanTries * 100) / zanNext(p.zanjutsu));
    p.reiPct = Math.floor((p.reiTries * 100) / reiNext(p.reiryoku));
  }

  private killMonster(m: Monster, killer: Player) {
    if (!this.state.monsters.has(m.id)) return;
    const def = MONSTERS[m.kind];
    this.broadcast("fx", { t: "die", id: m.id });
    this.state.monsters.delete(m.id);
    this.monsterAt.delete(tileKey(m.map, m.x, m.y));
    if (m.world) return this.worldBossKilled(m, killer);
    if (m.invader) return this.invaderKilled(m, killer);
    if (m.owner) return this.dangaiKilled(m, killer);
    this.clock.setTimeout(() => this.spawnMonster(m.spawnIndex), def.respawnMs);
    this.shareExp(killer, m, def.exp, def.name);
    this.giveLoot(killer, m.kind, m);
  }

  private killPlayer(p: Player, by: string, killerId = "") {
    if (p.devGod) { p.hp = p.maxHp; return; }
    if (p.map === "dangai") return this.dangaiDeath(p, by);
    const deathAt = { map: p.map, x: p.x, y: p.y };
    const dropped: Slot[] = [];
    // Amuleto da Alma (o "Band of Loss" daqui): protege XP, itens e dinheiro, e se desfaz
    const skulled = p.skullUntil > Date.now();
    const prot = !skulled && p.equip.amulet === "amuleto_alma";
    const itemLoss = skulled ? SKULL_ITEM_LOSS : DEATH_ITEM_LOSS;
    if (prot) delete p.equip.amulet;
    const loss = prot ? 0 : Math.floor(p.exp * DEATH_EXP_LOSS);
    const items: string[] = [];
    let goldLost = 0;
    if (!prot) {
      // estilo Tibia: cada peça e cada espaço rola a perda; o depot fica intacto
      for (const slot of EQUIP_SLOTS) {
        const id = p.equip[slot];
        if (id && Math.random() < itemLoss) { items.push(ITEMS[id].name); dropped.push({ id, qty: 1 }); delete p.equip[slot]; }
      }
      p.inv.forEach((sl, i) => {
        if (sl && Math.random() < itemLoss) { items.push(`${sl.qty}x ${ITEMS[sl.id].name}`); dropped.push({ ...sl }); p.inv[i] = null; }
      });
      goldLost = Math.floor(p.gold * (skulled ? SKULL_GOLD_LOSS : DEATH_GOLD_LOSS));
      p.gold -= goldLost;
      // estilo Tibia: o que se perde fica no corpo; em PvP, quem matou tem prioridade
      if (dropped.length || goldLost)
        this.dropBag(deathAt, "corpo", `Corpo de ${p.name}`, dropped, goldLost, killerId ? this.partyOf(killerId) : []);
    }
    this.broadcast("fx", { t: "die", id: p.id });
    p.exp -= loss;
    while (p.level > 1 && p.exp < expForLevel(p.level)) p.level--;
    p.form = 0;
    this.recompute(p);
    p.hp = p.maxHp;
    p.rei = p.maxRei;
    p.map = HOME.id;
    p.x = TEMPLE.x;
    p.y = TEMPLE.y;
    p.path = [];
    p.targetId = "";
    clearStatuses(p.statuses);
    p.statusFlags = "";
    // volta sozinho para a hunt só com "voltar a caçar" e no máximo 3 mortes em 10 min (senão vira um loop de mortes)
    p.deathTimes = [...p.deathTimes.filter((t) => Date.now() - t < 10 * 60_000), Date.now()];
    const back = p.autoHunt && p.autoReturn && p.deathTimes.length < 3;
    p.autoHunt = back;
    p.pvpUntil = 0;

    const report: DeathReport = { by, exp: loss, gold: goldLost, items, protected: prot, at: Date.now() };
    if (p.online) this.sendTo(p, "death", report);
    else p.offlineDeaths.push(report);
    const after = back ? "O Auto Helper volta à caça." : p.autoReturn && p.deathTimes.length >= 3 ? "3 mortes em 10 min: Auto Hunt desligado." : "Auto Hunt desligado.";
    this.log(p, prot
      ? `Você foi morto por ${by}. O Amuleto da Alma se desfez e protegeu XP e itens. ${after}`
      : `Você foi morto por ${by}: perdeu ${loss} XP, ${goldLost} kan${items.length ? " e " + items.join(", ") : ""}. ${after}`);
    this.sendInv(p);
    db.save(p.id, this.toSave(p), true); // morte não espera o save periódico
  }

  private sendOfflineReport(client: Client, p: Player) {
    client.send("offline", {
      minutes: Math.round((Date.now() - p.offlineSince) / 60000),
      exp: p.exp - p.expAtLeave, gold: p.gold - p.goldAtLeave, level: p.level, deaths: p.offlineDeaths,
      zanjutsu: p.zanjutsu, zanGain: p.zanjutsu - p.zanAtLeave, reiryoku: p.reiryoku, reiGain: p.reiryoku - p.reiAtLeave,
      kills: p.offKills,
      items: Object.entries(p.offItems).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${n}x ${ITEMS[id]?.name ?? id}`),
    });
    p.offlineSince = 0;
    p.offlineDeaths = [];
    p.offKills = 0;
    p.offItems = {};
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
      techniques(p.charId).forEach((tech, i) => {
        if (tech.minLevel !== p.level || i === 0) return;
        this.log(p, `Nova técnica: ${tech.name} (tecla ${TECH_SLOTS[i]})!`);
        this.sendTo(p, "fx", { t: "event", text: `Nova técnica: ${tech.name}` });
      });
      const nf = CHARS[p.charId].forms.findIndex((f, i) => i > 0 && f.minLevel === p.level);
      if (nf > 0) {
        this.log(p, `Nova forma liberada: ${CHARS[p.charId].forms[nf].label} (tecla T)!`);
        this.sendTo(p, "fx", { t: "event", text: CHARS[p.charId].forms[nf].label });
      }
      if (p.level > (p.prog.peak ?? 0)) {
        p.prog.peak = p.level;
        const m = levelMilestone(p.level);
        if (m) this.log(p, `Marco do nível ${p.level}: ${this.grant(p, m)}!`);
      }
      if (p.level >= 60) this.awardMilestone(p, "first_lv60");
    }
  }

  private setForm(p: Player, i: number) {
    p.form = i;
    if (i === 1) {
      this.tutorial(p, "bankai");
      this.awardMilestone(p, "first_bankai");
    }
    this.recompute(p);
    this.broadcast("fx", { t: "form", id: p.id, v: i });
  }

  private recompute(p: Player) {
    const b = gearBonus(p.equip, p.forge);
    p.maxHp = Math.round((maxHp(p.level) + b.hp) * rebirthBonus(p.rebirths).hp);
    p.maxRei = maxRei(p.level) + b.rei;
    p.hp = Math.min(p.hp, p.maxHp);
    p.rei = Math.min(p.rei, p.maxRei);
    p.stepMs = CHARS[p.charId].forms[p.form].stepMs;
    p.look = lookOf(p.equip);
    this.updatePower(p);
  }

  /** Recalcula o Poder; ao subir de título, avisa e solta o efeito na tela. */
  private updatePower(p: Player) {
    const prev = p.power; // 0 ao entrar no jogo: aí não anuncia
    const before = powerTier(prev);
    p.power = powerOf(p);
    const now = powerTier(p.power);
    if (prev > 0 && now > before) {
      const t = POWER_TIERS[now];
      this.log(p, `Seu Poder chegou a ${fmtPower(p.power)}: agora você é ${t.title}! Sua aura ficou mais forte.`);
      this.sendTo(p, "fx", { t: "event", text: `Título: ${t.title}` });
    }
  }

  /** tipos de monstro que ainda faltam nas missões de caça ativas (do Kisuke e a diária) */
  private questKinds(p: Player): Set<string> | undefined {
    const kinds = new Set<string>();
    for (const [id, prog] of Object.entries(p.quests.active)) {
      const g = QUEST_BY_ID[id]?.goal;
      if (g?.type === "kill" && prog < g.count) for (const k of g.monsters) kinds.add(k);
    }
    // e o monstro da missão diária de caça, enquanto ela não estiver feita
    for (const m of this.dailyOf(p).list) if (m.kind === "kill" && !m.done && m.target) kinds.add(m.target);
    return kinds.size ? kinds : undefined;
  }

  private nearestMonster(p: Player, range: number, only?: Set<string>, invaders = false): Monster | undefined {
    let best: Monster | undefined;
    let bd = range + 1;
    for (const m of this.state.monsters.values()) {
      if (!sameMap(p, m) || (m.owner && m.owner !== p.id) || (m.id === p.skipId && Date.now() < p.skipUntil) || (only && !only.has(m.kind)) || (invaders && !m.invader) || MONSTERS[m.kind].dummy) continue;
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
      if (this.blockedForMonster(sp.map, x, y)) continue;
      const m = new Monster();
      m.id = `m${++this.monsterSeq}`;
      m.kind = sp.kind;
      m.map = sp.map;
      m.x = x;
      m.y = y;
      m.hp = m.maxHp = def.hp;
      m.stepMs = def.stepMs;
      m.spawnIndex = i;
      this.state.monsters.set(m.id, m);
      this.monsterAt.add(tileKey(sp.map, x, y));
      return;
    }
    this.clock.setTimeout(() => this.spawnMonster(i), 5000); // spawn ocupado: tenta de novo
  }

  // ---------- itens, depot e loja ----------

  private registerItemMessages() {
    const idx = (n: unknown, size: number) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < size ? (n as number) : -1);

    this.handle("useItem", (c, m: { index: number }) => {
      const p = this.me(c);
      const s = p?.inv[idx(m?.index, INV_SIZE)];
      if (p && s && !this.useConsumable(p, s.id, Date.now())) this.log(p, `Não dá para usar ${ITEMS[s.id].name} agora.`);
    });
    this.handle("equip", (c, m: { index: number }) => {
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
    this.handle("unequip", (c, m: { slot: EquipSlot }) => {
      const p = this.me(c);
      const id = p && EQUIP_SLOTS.includes(m?.slot) ? p.equip[m.slot] : undefined;
      if (!p || !id) return;
      if (addItem(p.inv, id, 1) !== 1) return this.log(p, "Inventário cheio.");
      delete p.equip[m.slot];
      this.recompute(p);
      this.sendInv(p);
    });
    this.handle("interact", (c, m: { kind: Interact }) => {
      const p = this.me(c);
      if (!p || !["depot", "shop", "travel"].includes(m?.kind)) return;
      if (this.near(p, m.kind)) return this.open(p, m.kind);
      // anda até ficar ao alcance; o tick abre a janela quando o caminho acabar
      const at = this.placeOf(p, m.kind);
      if (!at) return;
      p.follow = false;
      p.path = findPath(p.x, p.y, (x, y) => chebyshev(x, y, at.x, at.y) <= INTERACT_RANGE, (x, y) => !walkable(mapOf(p), x, y));
      p.pendingInteract = p.path.length ? m.kind : "";
    });
    this.handle("depot", (c, m: { op: "put" | "take"; index: number }) => {
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
    this.handle("buy", (c, m: { id: string; qty: number }) => {
      const p = this.me(c);
      const def = own(ITEMS, m?.id);
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
    this.handle("sell", (c, m: { index: number }) => {
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
    this.handle("sellLoot", (c) => {
      const p = this.me(c);
      if (!p) return;
      if (!this.near(p, "shop")) return this.log(p, "Chegue perto da loja.");
      let gain = 0, n = 0;
      p.inv.forEach((s, i) => {
        const d = s ? ITEMS[s.id] : undefined;
        if (!s || !d || !isPureLoot(d)) return;
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
  private giveLoot(p: Player, kind: string, at: { map: string; x: number; y: number }) {
    const loot = rollLoot(kind, bestiaryLootMult(kind, p.prog.bestiary[kind] ?? 0) * setBonuses(p.equip).total.loot * (p.lootBoostUntil > Date.now() ? BOOST_LOOT : 1));
    p.gold += loot.gold;
    p.hunt.gold += loot.gold;
    this.dailyStep(p, "gold", loot.gold);
    const got: string[] = [];
    let overflow: Slot[] = [];
    for (const s of loot.items) {
      p.hunt.items[s.id] = (p.hunt.items[s.id] ?? 0) + s.qty;
      if (!p.online) p.offItems[s.id] = (p.offItems[s.id] ?? 0) + s.qty;
      const n = addItem(p.inv, s.id, s.qty);
      if (n) got.push(`${n}x ${ITEMS[s.id].name}`);
      if (n < s.qty) overflow.push({ id: s.id, qty: s.qty - n });
    }
    if (overflow.length && p.autoSell) {
      // Auto Venda: loot puro que não coube vira kan (preço da loja); equipamento e consumível seguem para a sacola
      let sold = 0;
      for (const s of overflow) if (isPureLoot(ITEMS[s.id])) { sold += ITEMS[s.id].sell * s.qty; got.push(`${s.qty}x ${ITEMS[s.id].name} (vendido)`); }
      overflow = overflow.filter((s) => !isPureLoot(ITEMS[s.id]));
      p.gold += sold;
      p.hunt.gold += sold;
    }
    if (overflow.length) {
      this.dropBag(at, "sacola", "Loot", overflow, 0, this.partyOf(p.id));
      this.log(p, "Inventário cheio: o loot que não coube ficou numa sacola no chão (reservada a você por 1 min).");
    }
    this.log(p, `Loot: ${loot.gold} kan${got.length ? ", " + got.join(", ") : ""}.`);
    if (p.autoBox) for (let i = 0; i < 5 && countItem(p.inv, "caixa_kisuke") > 0; i++) if (!this.useConsumable(p, "caixa_kisuke", Date.now())) break;
    if (got.length) this.broadcast("fx", { t: "loot", id: p.id, v: got.length });
    this.sendInv(p);
  }

  private placeOf(p: Player, kind: Interact) {
    const m = mapOf(p);
    return kind === "depot" ? m.depot : kind === "shop" ? m.shop : m.gate;
  }

  private near(p: Player, kind: Interact) {
    const at = this.placeOf(p, kind);
    return !!at && chebyshev(p.x, p.y, at.x, at.y) <= INTERACT_RANGE;
  }

  private open(p: Player, kind: Interact) {
    if (kind === "shop") this.tutorial(p, "shop");
    for (const c of this.clients) if (this.sessions.get(c.sessionId) === p.id) c.send("open", { kind });
  }

  private sendInv(p: Player) {
    const b = gearBonus(p.equip, p.forge);
    const ch = CHARS[p.charId];
    const msg = {
      gold: p.gold, inv: p.inv, depot: p.depot, equip: p.equip, forge: p.forge, sets: setBonuses(p.equip).active, expBoostUntil: p.expBoostUntil, lootBoostUntil: p.lootBoostUntil,
      atk: Math.round(playerAtk(ch.atk, p.level) + b.atk), def: Math.round(playerDef(ch.def, p.level) + b.def),
    };
    for (const c of this.clients) if (this.sessions.get(c.sessionId) === p.id) c.send("inv", msg);
  }

  // ---------- party, PvP e viagem ----------

  private registerSocialMessages() {
    this.handle("partyInvite", (c, m: { id: string }) => {
      const p = this.me(c);
      const v = typeof m?.id === "string" ? this.state.players.get(m.id) : undefined;
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
    this.handle("partyAnswer", (c, m: { accept: boolean }) => {
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
    this.handle("partyLeave", (c) => {
      const p = this.me(c);
      if (p) this.leaveParty(p);
    });
    this.handle("partyKick", (c, m: { id: string }) => {
      const p = this.me(c);
      const party = p ? this.parties.get(p.partyId) : undefined;
      const v = typeof m?.id === "string" ? this.state.players.get(m.id) : undefined;
      if (!p || !party || party.leader !== p.id || !v || v.partyId !== party.id || v === p) return;
      this.log(v, "Você foi removido da party.");
      this.leaveParty(v);
    });
    this.handle("recall", (c) => {
      const p = this.me(c);
      if (!p) return;
      const now = Date.now();
      const why = this.travelBlocked(p, now)
        ?? (now - p.lastCombatAt < RECALL_COMBAT_MS ? "Em combate: espere alguns segundos para voltar à cidade." : undefined)
        ?? (now < p.recallReadyAt ? `"Voltar à cidade" recarrega em ${Math.ceil((p.recallReadyAt - now) / 1000)} s.` : undefined);
      if (why) return this.log(p, why);
      p.recallReadyAt = now + RECALL_COOLDOWN_MS;
      this.teleport(p, HOME.id, TEMPLE);
      this.log(p, "Você voltou à cidade.");
    });
    this.handle("travel", (c, m: { dest: string }) => {
      const p = this.me(c);
      const d = TRAVEL.find((t) => t.id === m?.dest);
      if (!p || !d) return;
      const now = Date.now();
      // de qualquer lugar (o portal é só ambientação): basta estar fora de combate
      if (now - p.lastCombatAt < RECALL_COMBAT_MS) return this.log(p, "Em combate: espere alguns segundos para viajar.");
      const why = this.travelBlocked(p, now);
      if (why) return this.log(p, why);
      if (p.level < d.minLevel) return this.log(p, `${d.name} exige nível ${d.minLevel}.`);
      if (p.gold < d.cost) return this.log(p, `A viagem custa ${d.cost} kan.`);
      p.gold -= d.cost;
      const arrival = MAPS[d.map]?.arrivals[d.id];
      if (!arrival) return this.log(p, `Destino ${d.name} sem ponto de chegada no mapa.`);
      this.teleport(p, d.map, nearestWalkable(MAPS[d.map], arrival.x, arrival.y));
      this.log(p, `Viajou para ${d.name} (${d.cost} kan).`);
      this.sendInv(p);
    });
  }

  private travelBlocked(p: Player, now: number): string | undefined {
    if (p.skullUntil > now) {
      const m = Math.ceil((p.skullUntil - now) / 60000);
      return `Assassinos (☠) não podem viajar: faltam ${m} min de caveira.`;
    }
    if (p.pvpUntil <= now) return undefined;
    const s = Math.ceil((p.pvpUntil - now) / 1000);
    return `Você atacou um jogador: viagem bloqueada por ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.`;
  }

  private teleport(p: Player, map: string, to: { x: number; y: number }) {
    p.map = map;
    p.path = [];
    p.targetId = "";
    clearStatuses(p.statuses);
    p.statusFlags = "";
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
    if (!sameMap(a, v)) return `${v.name} está em outro mapa.`;
    if (a.map === "dangai") return "Não há PvP no Dangai.";
    if (a.partyId && a.partyId === v.partyId) return `${v.name} está na sua party.`;
    if (a.level < PVP_MIN_LEVEL) return `PvP só a partir do nível ${PVP_MIN_LEVEL}.`;
    if (v.level < PVP_MIN_LEVEL) return `${v.name} está protegido (abaixo do nível ${PVP_MIN_LEVEL}).`;
    if (inPZ(mapOf(a), a.x, a.y) || inPZ(mapOf(v), v.x, v.y)) return "Não há combate na zona de proteção.";
    return undefined;
  }

  /** Alvo atual (monstro ou jogador ainda atacável). */
  private targetOf(p: Player): Player | Monster | undefined {
    if (!p.targetId) return undefined;
    const m = this.state.monsters.get(p.targetId);
    if (m) return !m.owner || m.owner === p.id ? m : undefined;
    const v = this.state.players.get(p.targetId);
    return v && !this.cantAttack(p, v) ? v : undefined;
  }

  private pvpHit(p: Player, v: Player, mult: number, now: number) {
    if (this.cantAttack(p, v)) { p.targetId = ""; return; }
    const ch = CHARS[p.charId];
    const raw = rollDamage(playerAtk(ch.atk, p.level) + gearBonus(p.equip, p.forge).atk, ch.forms[p.form].dmgMult * mult,
      playerDef(CHARS[v.charId].def, v.level) + gearBonus(v.equip, v.forge).def);
    const dmg = Math.max(1, Math.round(raw * PVP_DAMAGE));
    v.hp -= dmg;
    v.lastCombatAt = p.lastCombatAt = now;
    v.lastAttackerId = p.id;
    v.lastAttackedAt = now;
    // atacar um assassino (☠) ou quem atacou alguém há pouco (marcado) é defesa: não marca quem ataca
    const justified = v.skullUntil > now || v.pvpUntil > now;
    if (!justified) {
      if (p.pvpUntil <= now) this.log(p, `Você atacou ${v.name}: viagem e zona de proteção bloqueadas por ${PVP_LOCK_MS / 60000} min.`);
      p.pvpUntil = now + PVP_LOCK_MS;
    }
    this.broadcast("fx", { t: "dmg", id: v.id, v: dmg, from: p.id });
    if (v.hp <= 0) {
      p.targetId = "";
      this.broadcast("chat", { from: "", text: `${v.name} foi derrotado por ${p.name}.` });
      p.frags++;
      if (p.frags >= 10) this.awardMilestone(p, "first_pvp10");
      // abate injusto: a vítima não tinha atacado ninguém (não estava marcada) nem era assassina
      if (!justified) {
        p.skullUntil = Math.min(Math.max(p.skullUntil, now) + SKULL_PER_KILL_MS, now + SKULL_MAX_MS);
        this.log(p, `Abate injusto: você é um assassino (☠) por ${Math.ceil((p.skullUntil - now) / 60000)} min. Não pode viajar, qualquer um pode atacá-lo sem punição e, se morrer, perde muito mais.`);
        this.broadcast("chat", { from: "", text: `☠ ${p.name} agora é um assassino.`, ch: "sys" });
      }
      this.killPlayer(v, `${p.name} (jogador)`, p.id);
    }
  }

  /** XP do monstro: sozinho vai tudo para quem matou; em party, divide entre os
   * membros vivos por perto, com bônus, se a diferença de nível permitir. */
  private shareExp(killer: Player, m: Monster, exp: number, from: string) {
    const party = this.parties.get(killer.partyId);
    const near = party
      ? party.members.map((id) => this.state.players.get(id)).filter((x): x is Player =>
        !!x && x.hp > 0 && sameMap(x, m) && chebyshev(x.x, x.y, m.x, m.y) <= PARTY_SHARE_RANGE)
      : [killer];
    const lv = near.map((x) => x.level);
    const fair = Math.min(...lv) >= Math.floor(Math.max(...lv) * PARTY_LEVEL_RATIO);
    if (!party || near.length < 2 || !fair) {
      if (party && !fair && Date.now() - party.warnedAt > 60_000) {
        party.warnedAt = Date.now();
        this.partyLog(party, "XP não dividida: o menor nível precisa ser pelo menos 2/3 do maior.");
      }
      this.questKill(killer, m.kind);
      this.bestiaryKill(killer, m.kind);
      return this.monsterExp(killer, exp, from);
    }
    const each = Math.round((exp * (1 + PARTY_SHARE_BONUS * (near.length - 1))) / near.length);
    for (const x of near) {
      this.questKill(x, m.kind);
      this.bestiaryKill(x, m.kind);
      this.monsterExp(x, each, `${from} (party, ${near.length})`);
    }
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

  // ---------- chat, guildas e ranking ----------

  private guildInvites = new Map<string, { guildId: number; from: string; at: number }>();

  /** Nome com a tag da guilda, como aparece no chat. */
  private display(p: Player) {
    return p.guildTag ? `${p.name} [${p.guildTag}]` : p.name;
  }

  private findPlayer(name: string) {
    return this.state.players.get(name.trim().toLowerCase());
  }

  private command(p: Player, text: string) {
    const [cmd, ...restParts] = text.slice(1).split(" ");
    const rest = restParts.join(" ").trim();
    switch (cmd.toLowerCase()) {
      case "ajuda":
      case "help":
        return HELP.forEach((l) => this.sendTo(p, "chat", { from: "", text: l, ch: "sys" }));
      case "ignorar": {
        if (!rest) return this.log(p, p.ignore.length ? `Ignorando: ${p.ignore.join(", ")}.` : "Você não ignora ninguém.");
        const id = rest.toLowerCase().trim();
        if (id === p.id) return this.log(p, "Não dá para ignorar você mesmo.");
        if (p.ignore.includes(id)) {
          p.ignore = p.ignore.filter((x) => x !== id);
          return this.log(p, `Você voltou a ver as mensagens de ${rest}.`);
        }
        if (!db.load(id)) return this.log(p, `Ninguém se chama ${rest}.`);
        if (p.ignore.length >= 100) return this.log(p, "Lista de ignorados cheia (100).");
        p.ignore.push(id);
        return this.log(p, `Ignorando ${rest}: as mensagens dele não chegam mais a você.`);
      }
      case "pm": {
        // "Nome, mensagem" (nomes podem ter espaço); sem vírgula, a 1ª palavra é o nome
        const i = rest.indexOf(",");
        const [to, msg] = i >= 0 ? [rest.slice(0, i), rest.slice(i + 1).trim()] : [rest.split(" ")[0], rest.split(" ").slice(1).join(" ")];
        const v = this.findPlayer(to);
        if (!v || !v.online) return this.log(p, `${to || "?"} não está online.`);
        if (!msg) return this.log(p, "Uso: /pm Nome, mensagem");
        const chk = checkChatMessage(p.id, msg);
        if (!chk.ok) return chk.reason ? this.log(p, chk.reason) : undefined;
        if (!v.ignore.includes(p.id)) this.sendTo(v, "chat", { from: p.name, text: chk.text, ch: "pm" });
        return this.sendTo(p, "chat", { from: `para ${v.name}`, text: chk.text, ch: "pm" });
      }
      case "p": {
        const party = this.parties.get(p.partyId);
        if (!party) return this.log(p, "Você não está numa party.");
        const chk = checkChatMessage(p.id, rest);
        if (!chk.ok) return chk.reason ? this.log(p, chk.reason) : undefined;
        for (const id of party.members) {
          const x = this.state.players.get(id);
          if (x && !x.ignore.includes(p.id)) this.sendTo(x, "chat", { from: p.name, text: chk.text, ch: "party" });
        }
        return;
      }
      case "g": {
        if (!p.guildId) return this.log(p, "Você não está numa guilda.");
        const chk = checkChatMessage(p.id, rest);
        if (!chk.ok) return chk.reason ? this.log(p, chk.reason) : undefined;
        return this.guildSay(p.guildId, { from: p.name, text: chk.text, ch: "guild" }, p.id);
      }
      case "silenciar":
      case "mute":
      case "dessilenciar":
      case "unmute":
      case "anuncio":
        return this.gmCommand(p, cmd.toLowerCase(), rest);
      case "guilda":
      case "guild":
        return this.guildCommand(p, rest);
      case "ranking":
        return this.sendTo(p, "ranking", this.ranking());
      default:
        return this.log(p, `Comando desconhecido: /${cmd}. Digite /ajuda.`);
    }
  }

  private gmCommand(p: Player, cmd: string, rest: string) {
    if (!isGm(p.id)) return this.log(p, "Comando restrito a moderadores (GM).");
    if (cmd === "anuncio") {
      if (!rest) return this.log(p, "Uso: /anuncio mensagem");
      this.broadcast("chat", { from: "", ch: "sys", text: `📢 [GM ${p.name}] ${rest}` });
      this.broadcast("fx", { t: "event", text: rest.slice(0, 60) });
      return;
    }
    if (cmd === "dessilenciar" || cmd === "unmute") {
      const id = rest.toLowerCase().trim();
      if (!id) return this.log(p, "Uso: /dessilenciar Nome");
      if (!unmutePlayer(id)) return this.log(p, `${rest} não estava silenciado.`);
      const target = this.state.players.get(id);
      if (target) this.log(target, "Seu silenciamento no chat foi removido por um GM.");
      return this.log(p, `Silenciamento de ${rest} removido.`);
    }
    // /silenciar Nome, 15, motivo  OU  /silenciar Nome 15 motivo
    const parts = rest.includes(",") ? rest.split(",").map((s) => s.trim()) : rest.split(/\s+/);
    const targetName = parts[0] ?? "";
    const targetId = targetName.toLowerCase();
    if (!targetId || (!this.state.players.has(targetId) && !db.load(targetId))) {
      return this.log(p, "Uso: /silenciar Nome [minutos] [motivo]");
    }
    const minsRaw = Number(parts[1]);
    const mins = Number.isFinite(minsRaw) && minsRaw > 0 ? Math.min(10_080, Math.round(minsRaw)) : 15;
    const reason = (Number.isFinite(minsRaw) ? parts.slice(2) : parts.slice(1)).join(" ").trim() || "moderação";
    mutePlayer(targetId, mins * 60_000, reason, p.name);
    const online = this.state.players.get(targetId);
    if (online) this.log(online, `Você foi silenciado no chat por ${mins} min (${reason}).`);
    this.log(p, `${targetName} silenciado por ${mins} min (${reason}).`);
  }

  private guildCommand(p: Player, rest: string) {
    const [sub, ...args] = rest.split(" ");
    const arg = args.join(" ").trim();
    const g = p.guildId ? guilds.get(p.guildId) : undefined;
    const leader = !!g && g.leader === p.id;
    switch ((sub ?? "").toLowerCase()) {
      case "criar": {
        if (g) return this.log(p, "Saia da sua guilda antes de criar outra.");
        if (!GUILD_NAME_RE.test(arg)) return this.log(p, "Nome de guilda: de 3 a 20 letras, números ou espaços.");
        if (p.level < GUILD_MIN_LEVEL) return this.log(p, `Criar guilda exige nível ${GUILD_MIN_LEVEL}.`);
        if (p.gold < GUILD_COST) return this.log(p, `Criar guilda custa ${GUILD_COST} kan.`);
        const ng = guilds.createGuild(arg, p.id);
        if (!ng) return this.log(p, "Já existe uma guilda com esse nome.");
        p.gold -= GUILD_COST;
        this.sendInv(p);
        this.joinedGuild(p, ng);
        return this.broadcast("chat", { from: "", text: `${p.name} fundou a guilda ${ng.name} [${ng.tag}].`, ch: "sys" });
      }
      case "convidar": {
        if (!leader) return this.log(p, "Só o líder da guilda convida.");
        const v = this.findPlayer(arg);
        if (!v || !v.online) return this.log(p, `${arg || "?"} não está online.`);
        if (v.guildId) return this.log(p, `${v.name} já tem guilda.`);
        this.guildInvites.set(v.id, { guildId: g!.id, from: p.id, at: Date.now() });
        this.sendTo(v, "chat", { from: "", text: `${p.name} convidou você para a guilda ${g!.name}. Digite /guilda aceitar ou /guilda recusar.`, ch: "guild" });
        return this.log(p, `Convite enviado para ${v.name}.`);
      }
      case "aceitar":
      case "recusar": {
        const inv = this.guildInvites.get(p.id);
        this.guildInvites.delete(p.id);
        if (!inv || Date.now() - inv.at > 120_000) return this.log(p, "Nenhum convite de guilda pendente.");
        if (sub.toLowerCase() === "recusar") return;
        if (p.guildId) return this.log(p, "Você já tem guilda.");
        const target = guilds.get(inv.guildId);
        if (!target) return this.log(p, "A guilda não existe mais.");
        guilds.addMember(target.id, p.id);
        this.joinedGuild(p, target);
        return this.guildSay(target.id, { from: "", text: `${p.name} entrou na guilda.`, ch: "guild" });
      }
      case "sair": {
        if (!g) return this.log(p, "Você não está numa guilda.");
        const r = guilds.leave(p.id);
        this.leftGuild(p);
        if (r.refund) { p.gold += r.refund; this.sendInv(p); }
        this.log(p, r.disbanded ? `A guilda ${g.name} acabou.${r.refund ? ` O banco (${r.refund} kan) voltou para você.` : ""}` : `Você saiu da guilda ${g.name}.`);
        if (!r.disbanded) this.guildSay(g.id, { from: "", text: `${p.name} saiu da guilda.${r.newLeader ? ` Novo líder: ${r.newLeader}.` : ""}`, ch: "guild" });
        return this.refreshGuild(g.id);
      }
      case "expulsar": {
        if (!leader) return this.log(p, "Só o líder expulsa.");
        const id = arg.toLowerCase();
        if (id === p.id || !guilds.members(g!.id).some((m) => m.charId === id)) return this.log(p, `${arg} não é membro da guilda.`);
        guilds.removeMember(id);
        const v = this.state.players.get(id);
        if (v) { this.leftGuild(v); this.log(v, `Você foi expulso da guilda ${g!.name}.`); }
        this.guildSay(g!.id, { from: "", text: `${arg} foi expulso da guilda.`, ch: "guild" });
        return this.refreshGuild(g!.id);
      }
      case "lider": {
        if (!leader) return this.log(p, "Só o líder passa a liderança.");
        const id = arg.toLowerCase();
        if (!guilds.members(g!.id).some((m) => m.charId === id) || id === p.id) return this.log(p, `${arg} não é membro da guilda.`);
        guilds.setLeader(g!.id, id);
        this.guildSay(g!.id, { from: "", text: `Novo líder da guilda: ${arg}.`, ch: "guild" });
        return this.refreshGuild(g!.id);
      }
      case "depositar":
      case "sacar": {
        if (!g) return this.log(p, "Você não está numa guilda.");
        const n = Math.floor(Number(arg));
        if (!Number.isSafeInteger(n) || n <= 0) return this.log(p, `Uso: /guilda ${sub} 100`);
        if (sub.toLowerCase() === "depositar") {
          if (p.gold < n) return this.log(p, "Você não tem esse dinheiro.");
          p.gold -= n;
          guilds.addBank(g.id, n);
          this.guildSay(g.id, { from: "", text: `${p.name} depositou ${n} kan no banco da guilda.`, ch: "guild" });
        } else {
          if (!leader) return this.log(p, "Só o líder saca do banco.");
          if (!guilds.addBank(g.id, -n)) return this.log(p, "O banco da guilda não tem isso.");
          p.gold += n;
          this.guildSay(g.id, { from: "", text: `${p.name} sacou ${n} kan do banco da guilda.`, ch: "guild" });
        }
        this.sendInv(p);
        return this.refreshGuild(g.id);
      }
      case "info":
      case "":
        if (!g) return this.log(p, "Você não está numa guilda. /guilda criar Nome para fundar uma.");
        return this.sendGuild(p);
      default:
        return this.log(p, "Subcomando de guilda desconhecido. Digite /ajuda.");
    }
  }

  private joinedGuild(p: Player, g: guilds.Guild) {
    p.guildId = g.id;
    p.guildTag = g.tag;
    this.refreshGuild(g.id);
  }

  private leftGuild(p: Player) {
    p.guildId = 0;
    p.guildTag = "";
    this.sendTo(p, "guild", null);
  }

  private guildSay(guildId: number, msg: { from: string; text: string; ch: string }, fromId = "") {
    for (const x of this.state.players.values()) if (x.guildId === guildId && !x.ignore.includes(fromId)) this.sendTo(x, "chat", msg);
  }

  /** Painel da guilda (nome, tag, banco, membros) para quem está online nela. */
  private sendGuild(p: Player) {
    const g = p.guildId ? guilds.get(p.guildId) : undefined;
    if (!g) return this.sendTo(p, "guild", null);
    const list = guilds.members(g.id).map((m) => {
      const x = this.state.players.get(m.charId);
      const saved = x ? undefined : db.load(m.charId)?.data;
      return { name: x?.name ?? saved?.name ?? m.charId, level: x?.level ?? saved?.level ?? 0, leader: m.rank === "lider", online: !!x?.online };
    });
    this.sendTo(p, "guild", { name: g.name, tag: g.tag, bank: g.bank, leader: g.leader === p.id, members: list });
  }

  private refreshGuild(guildId: number) {
    for (const x of this.state.players.values()) if (x.guildId === guildId) this.sendGuild(x);
  }

  /** Ranking com cache de 15 s e índice incremental em memória (server/src/ranking.ts). */
  private ranking() {
    return getRanking(this.state.players.values());
  }

  // ---------- missões ----------

  private registerQuestMessages() {
    this.handle("quests", (c) => { const p = this.me(c); if (p) this.sendQuests(p); });
    this.handle("questAccept", (c, m: { id: string }) => {
      const p = this.me(c);
      const q = own(QUEST_BY_ID, m?.id);
      if (!p || !q) return;
      if (!this.near(p, "shop")) return this.log(p, "Fale com o Kisuke para aceitar missões.");
      if (q.id in p.quests.active) return;
      if (!q.repeatable && p.quests.done.includes(q.id)) return this.log(p, "Você já completou essa missão.");
      if (p.level < q.minLevel) return this.log(p, `${q.name} exige nível ${q.minLevel}.`);
      if (Object.keys(p.quests.active).length >= MAX_ACTIVE_QUESTS) return this.log(p, `No máximo ${MAX_ACTIVE_QUESTS} missões ao mesmo tempo.`);
      p.quests.active[q.id] = 0;
      this.log(p, `Missão aceita: ${q.name}.`);
      this.tutorial(p, "quest");
      this.sendQuests(p);
    });
    this.handle("questAbandon", (c, m: { id: string }) => {
      const p = this.me(c);
      if (!p || !isOwnKey(p.quests.active, m?.id)) return;
      delete p.quests.active[m.id];
      this.sendQuests(p);
    });
    this.handle("questTurnIn", (c, m: { id: string }) => {
      const p = this.me(c);
      const q = own(QUEST_BY_ID, m?.id);
      if (!p || !q || !isOwnKey(p.quests.active, q.id)) return;
      if (!this.near(p, "shop")) return this.log(p, "Entregue a missão ao Kisuke.");
      const g = q.goal;
      if (g.type === "kill" && p.quests.active[q.id] < g.count) return this.log(p, "A missão ainda não está completa.");
      if (g.type === "collect" && countItem(p.inv, g.item) < g.count) return this.log(p, `Faltam ${g.count - countItem(p.inv, g.item)} ${ITEMS[g.item].name}.`);
      // recompensa precisa caber: confere numa cópia do inventário antes de mexer
      const trial = p.inv.map((sl) => (sl ? { ...sl } : null));
      if (g.type === "collect") removeItem(trial, g.item, g.count);
      for (const it of q.reward.items ?? []) if (addItem(trial, it.id, it.qty) < it.qty) return this.log(p, "Inventário cheio para a recompensa.");
      if (g.type === "collect") removeItem(p.inv, g.item, g.count);
      for (const it of q.reward.items ?? []) addItem(p.inv, it.id, it.qty);
      delete p.quests.active[q.id];
      if (!p.quests.done.includes(q.id)) p.quests.done.push(q.id);
      p.gold += q.reward.gold;
      this.log(p, `Missão completa: ${q.name}! +${q.reward.gold} kan${(q.reward.items ?? []).map((it) => `, ${it.qty}x ${ITEMS[it.id].name}`).join("")}.`);
      this.gainExp(p, q.reward.exp, `Missão ${q.name}`);
      this.sendInv(p);
      this.sendQuests(p);
    });
  }

  /** Abate conta para as missões de caça ativas. */
  private questKill(p: Player, kind: string) {
    let changed = false;
    for (const [id, prog] of Object.entries(p.quests.active)) {
      const g = QUEST_BY_ID[id]?.goal;
      if (!g || g.type !== "kill" || !g.monsters.includes(kind) || prog >= g.count) continue;
      p.quests.active[id] = prog + 1;
      changed = true;
      if (prog + 1 === g.count) this.log(p, `Missão pronta: ${QUEST_BY_ID[id].name}. Volte ao Kisuke para entregar.`);
    }
    if (changed) this.sendQuests(p);
  }

  private sendQuests(p: Player) {
    this.sendTo(p, "quests", { active: p.quests.active, done: p.quests.done });
  }

  // ---------- corpos e sacolas no chão ----------

  private bagSeq = 0;

  /** quem pode pegar com prioridade: o jogador e a party dele */
  private partyOf(id: string): string[] {
    const p = this.state.players.get(id);
    const party = p ? this.parties.get(p.partyId) : undefined;
    return party ? [...party.members] : [id];
  }

  private dropBag(at: { map: string; x: number; y: number }, kind: "corpo" | "sacola", label: string, items: Slot[], gold: number, owners: string[]) {
    const b = new Bag();
    b.id = `b${++this.bagSeq}`;
    b.map = at.map;
    b.x = at.x;
    b.y = at.y;
    b.kind = kind;
    b.label = label;
    b.items = items;
    b.gold = gold;
    b.owners = owners;
    b.ownerUntil = owners.length ? Date.now() + BAG_OWNER_MS : 0;
    b.expires = Date.now() + BAG_TTL_MS;
    this.state.bags.set(b.id, b);
  }

  private registerBagMessages() {
    const canTake = (p: Player, b: Bag) => !b.owners.length || Date.now() >= b.ownerUntil || b.owners.includes(p.id);
    const nearBag = (p: Player, b: Bag) => b.map === p.map && chebyshev(p.x, p.y, b.x, b.y) <= 1;
    const show = (p: Player, b: Bag) =>
      this.sendTo(p, "bag", { id: b.id, label: b.label, gold: b.gold, items: b.items, locked: !canTake(p, b), until: b.ownerUntil });
    this.handle("bagOpen", (c, m: { id: string }) => {
      const p = this.me(c);
      const b = typeof m?.id === "string" ? this.state.bags.get(m.id) : undefined;
      if (!p || !b) return;
      if (!nearBag(p, b)) {
        // anda até ficar do lado e o cliente pede de novo ao chegar
        p.follow = false;
        p.path = findPath(p.x, p.y, (x, y) => chebyshev(x, y, b.x, b.y) <= 1, (x, y) => !walkable(mapOf(p), x, y));
        return;
      }
      show(p, b);
    });
    this.handle("bagTake", (c, m: { id: string; index?: number }) => {
      const p = this.me(c);
      const b = typeof m?.id === "string" ? this.state.bags.get(m.id) : undefined;
      if (!p || !b || !nearBag(p, b)) return;
      if (!canTake(p, b)) return this.log(p, `Ainda reservado a quem matou (${Math.ceil((b.ownerUntil - Date.now()) / 1000)} s).`);
      const idx = typeof m.index === "number" ? [m.index] : b.items.map((_, i) => i);
      p.gold += b.gold;
      b.gold = 0;
      let full = false;
      for (const i of idx) {
        const sl = b.items[i];
        if (!sl) continue;
        const n = addItem(p.inv, sl.id, sl.qty);
        sl.qty -= n;
        if (sl.qty > 0) full = true;
      }
      b.items = b.items.filter((sl) => sl.qty > 0);
      if (full) this.log(p, "Inventário cheio: parte ficou no chão.");
      this.sendInv(p);
      if (!b.items.length && !b.gold) this.state.bags.delete(b.id);
      else show(p, b);
    });
    // corpos e sacolas somem com o tempo
    this.clock.setInterval(() => {
      const now = Date.now();
      for (const b of [...this.state.bags.values()]) if (now >= b.expires) this.state.bags.delete(b.id);
    }, 5000);
  }

  /** A menor poção que cobre o que falta; se nenhuma cobre, a maior que houver. */
  private bestPotion(p: Player, kind: "hp" | "rei"): string | undefined {
    const ids = (kind === "hp" ? HP_POTIONS : REI_POTIONS).filter((id) => countItem(p.inv, id) > 0);
    const power = (id: string) => (kind === "hp" ? ITEMS[id].heal! * p.maxHp : ITEMS[id].restoreRei! * p.maxRei);
    const missing = kind === "hp" ? p.maxHp - p.hp : p.maxRei - p.rei;
    return ids.find((id) => power(id) >= missing) ?? ids[ids.length - 1];
  }

  /** XP de monstro: aplica o Pergaminho de Treino e soma no analisador de caçada */
  private monsterExp(p: Player, exp: number, from: string) {
    const v = Math.max(1, Math.round(exp * EXP_RATE * rebirthBonus(p.rebirths).exp * setBonuses(p.equip).total.exp * (p.expBoostUntil > Date.now() ? BOOST_EXP : 1) * (xpWeekend(Date.now()) ? WEEKEND_EXP : 1)));
    p.hunt.exp += v;
    this.gainExp(p, v, from);
  }

  // ---------- invasão de Hollows ----------

  private invasion: { until: number; kills: Map<string, number>; left: number } | null = null;

  private scheduleInvasion(ms: number) {
    this.clock.setTimeout(() => {
      this.startInvasion();
      this.scheduleInvasion(Number(process.env.INVASION_EVERY_MS) || INVASION.everyMs);
    }, ms);
  }

  /** Hollows aparecem em volta da praça de Karakura (fora da zona segura). */
  startInvasion() {
    if (this.invasion) return;
    const map = HOME;
    const spots: { x: number; y: number }[] = [];
    for (let tries = 0; tries < 2000 && spots.length < INVASION.count + 1; tries++) {
      const a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 6;
      const x = Math.round(TEMPLE.x + Math.cos(a) * r), y = Math.round(TEMPLE.y + Math.sin(a) * r);
      if (!walkable(map, x, y) || inPZ(map, x, y) || this.blockedForMonster("karakura", x, y)) continue;
      if (spots.some((s) => chebyshev(s.x, s.y, x, y) < 2)) continue;
      spots.push({ x, y });
    }
    if (!spots.length) return;
    this.invasion = { until: Date.now() + INVASION.durationMs, kills: new Map(), left: spots.length };
    spots.forEach((s, i) => {
      const kind = i === 0 ? INVASION.leader : INVASION.kinds[i % INVASION.kinds.length];
      const def = MONSTERS[kind];
      const m = new Monster();
      m.id = `inv${++this.monsterSeq}`;
      m.kind = kind;
      m.map = "karakura";
      m.x = m.homeX = s.x;
      m.y = m.homeY = s.y;
      m.hp = m.maxHp = def.hp;
      m.stepMs = def.stepMs;
      m.invader = true;
      this.state.monsters.set(m.id, m);
      this.monsterAt.add(tileKey("karakura", s.x, s.y));
    });
    this.broadcast("chat", { from: "", ch: "sys", text: `⚠ Invasão! ${spots.length} Hollows cercam a praça de Karakura, liderados por um ${MONSTERS[INVASION.leader].name}. XP +50% e Caixas do Kisuke por 15 min. Quem for fraco, fique na zona segura.` });
    this.broadcast("fx", { t: "event", text: "Invasão de Hollows!" });
    this.clock.setTimeout(() => this.endInvasion(false), INVASION.durationMs);
  }

  private invaderKilled(m: Monster, killer: Player) {
    const def = MONSTERS[m.kind];
    this.shareExp(killer, m, Math.round(def.exp * INVASION.expMult), `${def.name} (invasão)`);
    this.giveLoot(killer, m.kind, m);
    if (m.kind === INVASION.leader || Math.random() < INVASION.boxChance) {
      const n = addItem(killer.inv, "caixa_kisuke", 1);
      if (n) { this.log(killer, "Invasão: você ganhou uma Caixa do Kisuke!"); this.sendInv(killer); }
    }
    const inv = this.invasion;
    if (!inv) return;
    inv.kills.set(killer.id, (inv.kills.get(killer.id) ?? 0) + 1);
    if (--inv.left <= 0) this.endInvasion(true);
  }

  private endInvasion(won: boolean) {
    const inv = this.invasion;
    if (!inv) return;
    this.invasion = null;
    for (const m of [...this.state.monsters.values()]) {
      if (!m.invader || m.world) continue;
      this.state.monsters.delete(m.id);
      this.monsterAt.delete(tileKey(m.map, m.x, m.y));
    }
    const top = [...inv.kills.entries()].sort((a, b) => b[1] - a[1])[0];
    const name = top ? this.state.players.get(top[0])?.name ?? top[0] : "";
    this.broadcast("chat", { from: "", ch: "sys", text: won
      ? `✔ Invasão repelida!${top ? ` Mais abates: ${name} (${top[1]}).` : ""}`
      : `A invasão terminou: os Hollows que sobraram voltaram para Hueco Mundo.${top ? ` Mais abates: ${name} (${top[1]}).` : ""}` });
  }

  // ---------- desafio do Dangai ----------

  /** desafio em andamento por jogador */
  private dangai = new Map<string, { floor: number; until: number; left: number; next: number }>();

  private registerDangaiMessages() {
    this.handle("dangaiStart", (c) => {
      const p = this.me(c);
      if (!p || p.map !== "dangai") return;
      if (this.dangai.get(p.id)?.floor) return this.log(p, "Você já está num desafio.");
      this.dangaiFloorStart(p, dangaiStart(p.prog.dgBest ?? 0));
    });
    this.handle("dangaiStop", (c) => {
      const p = this.me(c);
      if (!p || !this.dangai.has(p.id)) return;
      p.autoHunt = false; // senão o Auto Hunt recomeçaria o desafio sozinho
      this.dangaiEnd(p.id, "Você saiu do desafio.");
    });
    this.handle("dangaiInfo", (c) => { const p = this.me(c); if (p) this.sendDangai(p); });
    this.handle("dangaiNext", (c) => {
      const p = this.me(c);
      const run = p && this.dangai.get(p.id);
      if (p && run && run.left === 0) this.dangaiFloorStart(p, run.floor + 1);
    });
    // tempo esgotado, próximo andar e recomeço automáticos (com Auto Hunt ligado, inclusive offline)
    this.clock.setInterval(() => {
      const now = Date.now();
      for (const [id, run] of this.dangai) {
        const p = this.state.players.get(id);
        if (!p || p.map !== "dangai") { this.dangaiEnd(id, ""); continue; }
        if (run.left > 0 && now > run.until) this.dangaiEnd(id, `Tempo esgotado no andar ${run.floor}.`);
        else if (run.left === 0 && run.next && now >= run.next) this.dangaiFloorStart(p, run.floor + 1);
      }
      for (const p of this.state.players.values()) {
        if (p.map !== "dangai" || !p.autoHunt || p.hp <= 0 || this.dangai.has(p.id) || now < (this.dangaiRetry.get(p.id) ?? 0)) continue;
        this.dangaiFloorStart(p, dangaiStart(p.prog.dgBest ?? 0));
      }
    }, 1000);
  }

  private sendDangai(p: Player) {
    const run = this.dangai.get(p.id);
    const best = p.prog.dgBest ?? 0;
    this.sendTo(p, "dangai", { best, start: dangaiStart(best), floor: run?.floor ?? 0, left: run?.left ?? 0, until: run?.until ?? 0, waiting: !!run && run.left === 0 });
  }

  private dangaiFloorStart(p: Player, floor: number) {
    const arena = mapOf(p).arena;
    if (!arena) return;
    const f = dangaiFloor(floor);
    const def = MONSTERS[f.kind];
    let n = 0;
    for (let tries = 0; tries < 300 && n < f.count; tries++) {
      const x = arena.x + Math.round((Math.random() * 2 - 1) * arena.radius);
      const y = arena.y + Math.round((Math.random() * 2 - 1) * arena.radius);
      if (!walkable(mapOf(p), x, y) || inPZ(mapOf(p), x, y) || this.blockedForMonster(p.map, x, y)) continue;
      const m = new Monster();
      m.id = `dg${++this.monsterSeq}`;
      m.kind = f.kind;
      m.map = p.map;
      m.x = m.homeX = x;
      m.y = m.homeY = y;
      m.hp = m.maxHp = Math.round(def.hp * f.power);
      m.stepMs = def.stepMs;
      m.owner = p.id;
      m.power = f.power;
      m.defMult = f.defMult;
      this.state.monsters.set(m.id, m);
      this.monsterAt.add(tileKey(p.map, x, y));
      n++;
    }
    this.dangai.set(p.id, { floor, until: Date.now() + DANGAI.timeMs, left: n, next: 0 });
    this.log(p, `Dangai, andar ${floor}: ${n}x ${def.name}${f.power > 1 ? ` (força x${f.power.toFixed(2)})` : ""}. Você tem 3 minutos.`);
    this.sendDangai(p);
  }

  private dangaiKilled(m: Monster, killer: Player) {
    const def = MONSTERS[m.kind];
    this.monsterExp(killer, Math.round(def.exp * m.power), `${def.name} (Dangai)`);
    this.bestiaryKill(killer, m.kind);
    this.questKill(killer, m.kind);
    this.giveLoot(killer, m.kind, m);
    const run = this.dangai.get(m.owner);
    if (!run) return;
    run.left--;
    if (run.left > 0) return this.sendDangai(killer);
    const record = run.floor > (killer.prog.dgBest ?? 0);
    if (record) killer.prog.dgBest = run.floor;
    const got = this.grant(killer, dangaiReward(run.floor, record));
    this.log(killer, `Andar ${run.floor} limpo${record ? " (recorde!)" : ""}: ${got}.`);
    this.sendTo(killer, "fx", { t: "book", text: `Andar ${run.floor}${record ? " · recorde!" : ""}` });
    if (record && run.floor % 10 === 0) this.broadcast("chat", { from: "", ch: "sys", text: `🜂 ${killer.name} chegou ao andar ${run.floor} do Dangai.` });
    if (run.floor >= 10) this.awardMilestone(killer, "first_dangai10");
    // com Auto Hunt, o próximo andar começa sozinho; senão espera o botão
    run.next = killer.autoHunt ? Date.now() + 3000 : 0;
    this.sendDangai(killer);
  }

  /** quando o Auto Hunt pode recomeçar o desafio de alguém (depois de perder um andar) */
  private dangaiRetry = new Map<string, number>();

  /** encerra o desafio (fim do tempo, saída ou morte) e tira os monstros que sobraram */
  private dangaiEnd(id: string, why: string) {
    for (const m of [...this.state.monsters.values()]) {
      if (m.owner !== id) continue;
      this.state.monsters.delete(m.id);
      this.monsterAt.delete(tileKey(m.map, m.x, m.y));
    }
    this.dangai.delete(id);
    this.dangaiRetry.set(id, Date.now() + 8000);
    const p = this.state.players.get(id);
    if (!p) return;
    if (why) this.log(p, `${why} Melhor andar: ${p.prog.dgBest ?? 0}.`);
    this.sendDangai(p);
  }

  /** morrer no Dangai não tira nada: volta para a entrada e o desafio acaba */
  private dangaiDeath(p: Player, by: string) {
    this.broadcast("fx", { t: "die", id: p.id });
    p.hp = p.maxHp;
    p.rei = p.maxRei;
    p.form = 0;
    this.recompute(p);
    const back = mapOf(p).arrivals.dangai ?? { x: p.x, y: p.y };
    this.teleport(p, "dangai", back);
    const run = this.dangai.get(p.id);
    this.dangaiEnd(p.id, `${by} derrubou você no andar ${run?.floor ?? "?"} (no Dangai não se perde nada).`);
  }

  // ---------- modo Dev ----------

  private registerDevMessages() {
    this.handle("devHello", (c) => {
      const p = this.me(c);
      if (p) c.send("devMode", { god: p.devGod });
    });
    this.handle("dev", (c, m: { a?: string; n?: number }) => {
      const p = this.me(c);
      if (!p) return;
      switch (m?.a) {
        case "level": this.devLevel(p, Number(m.n) || p.level); break;
        case "gold":
          p.gold += 1_000_000;
          this.sendInv(p);
          this.log(p, "Dev: +1.000.000 kan.");
          break;
        case "crystals":
          this.giveCrystals(p, 1000, "dev");
          this.log(p, "Dev: +1.000 cristais.");
          break;
        case "gear": {
          // o melhor item de cada espaço do corpo, sem olhar o nível exigido
          for (const slot of EQUIP_SLOTS) {
            const best = Object.values(ITEMS).filter((it) => it.slot === slot).sort((a, b) => (b.atk ?? 0) + (b.def ?? 0) - (a.atk ?? 0) - (a.def ?? 0))[0];
            if (best) p.equip[slot] = best.id;
          }
          this.recompute(p);
          p.hp = p.maxHp;
          p.rei = p.maxRei;
          this.sendInv(p);
          this.log(p, "Dev: melhor equipamento em todos os espaços.");
          break;
        }
        case "items": {
          const got = [["pocao_grande", 100], ["pocao_rei_grande", 100], ["caixa_kisuke", 20], ["pedra_reishi", 50]] as const;
          const parts = got.map(([id, n]) => `${addItem(p.inv, id, n)}x ${ITEMS[id].name}`);
          this.sendInv(p);
          this.log(p, `Dev: ${parts.join(", ")}.`);
          break;
        }
        case "god":
          p.devGod = !p.devGod;
          this.log(p, p.devGod ? "Dev: imortal e com reiatsu infinito." : "Dev: imortalidade desligada.");
          break;
        case "season":
          this.seasonAdd(p, 500, "dev");
          this.log(p, "Dev: +500 pontos do passe.");
          break;
        case "boss": this.spawnWorldBoss(); break;
        case "invasion": this.startInvasion(); break;
        default: return;
      }
      c.send("devMode", { god: p.devGod });
    });
  }

  /** Leva o personagem direto a um nível (formas e técnicas seguem o nível; marcos de nível não são pagos). */
  private devLevel(p: Player, target: number) {
    const lv = Math.max(1, Math.min(300, Math.round(target)));
    p.level = lv;
    p.exp = expForLevel(lv);
    if (p.form > maxForm(p.charId, lv)) this.setForm(p, 0);
    this.recompute(p);
    p.hp = p.maxHp;
    p.rei = p.maxRei;
    this.broadcast("fx", { t: "level", id: p.id, v: lv });
    this.log(p, `Dev: nível ${lv}.`);
  }

  // ---------- renascimento ----------

  private registerRebirthMessages() {
    this.handle("rebirth", (c) => {
      const p = this.me(c);
      if (!p) return;
      const need = rebirthLevel(p.rebirths);
      if (p.level < need) return this.log(p, `Renascer exige nível ${need}.`);
      if (Date.now() - p.lastCombatAt < 6000) return this.log(p, "Saia de combate para renascer.");
      if (p.rebirths >= 250) return;
      p.rebirths++;
      p.level = START_LEVEL;
      p.exp = expForLevel(START_LEVEL);
      if (p.form) p.form = 0;
      this.recompute(p);
      p.hp = p.maxHp;
      p.rei = p.maxRei;
      const b = rebirthBonus(p.rebirths);
      this.teleport(p, HOME.id, TEMPLE);
      this.log(p, `Você renasceu (${p.rebirths}º)! Bônus permanentes: +${Math.round((b.exp - 1) * 100)}% de XP, +${Math.round((b.dmg - 1) * 100)}% de dano e +${Math.round((b.hp - 1) * 100)}% de vida. Próximo renascimento no nível ${rebirthLevel(p.rebirths)}.`);
      this.broadcast("chat", { from: "", ch: "sys", text: `✦ ${p.name} renasceu pela ${p.rebirths}ª vez.` });
      this.broadcast("fx", { t: "level", id: p.id, v: p.level });
      this.sendTo(p, "fx", { t: "event", text: `Renascimento ${p.rebirths}!` });
      this.awardMilestone(p, "first_rebirth");
      this.checkAchievements(p);
      this.sendInv(p);
    });
  }

  // ---------- Auto Helper: lugar de caça, Bankai e reposição ----------

  private helper(p: Player, now: number) {
    if (p.hp <= 0) return;
    const fighting = now - p.lastCombatAt < 2500;
    // Bankai em combate (com reiatsu de sobra) e de volta ao normal fora dele, para guardar reiatsu
    if (p.autoBankai) {
      if (fighting && p.form < maxForm(p.charId, p.level) && p.rei > p.maxRei * 0.6) this.setForm(p, p.form + 1);
      else if (p.form > 0 && now - p.lastCombatAt > 8000) this.setForm(p, 0);
    }
    if (now < p.helperAt) return;
    p.helperAt = now + 3000;
    if (p.autoRestock) this.restock(p);
    if (p.autoHunt && p.huntSpot && !fighting) this.goHunt(p, now);
  }

  /** Com lugar de caça escolhido, viaja até lá quando estiver longe e sem monstro por perto. */
  private goHunt(p: Player, now: number) {
    const d = TRAVEL.find((t) => t.id === p.huntSpot);
    const at = d && MAPS[d.map]?.arrivals[d.id];
    if (!d || !at || p.level < d.minLevel) return;
    if (p.map === d.map && chebyshev(p.x, p.y, at.x, at.y) <= HUNT_SPOT_RADIUS) return;
    if (now - p.lastCombatAt < RECALL_COMBAT_MS || this.travelBlocked(p, now) || p.gold < d.cost) return;
    p.gold -= d.cost;
    this.teleport(p, d.map, nearestWalkable(MAPS[d.map], at.x, at.y));
    this.log(p, `Auto Helper: indo caçar em ${d.name}${d.cost ? ` (${d.cost} kan)` : ""}.`);
    this.sendInv(p);
  }

  /** Repõe poções de qualquer lugar quando acabam: até 20 de cura e 10 de reiatsu. */
  private restock(p: Player) {
    const hp = countItem(p.inv, "onigiri") + countItem(p.inv, "pocao_vida") + countItem(p.inv, "pocao_grande");
    const rei = countItem(p.inv, "pocao_rei") + countItem(p.inv, "pocao_rei_grande");
    const bought: string[] = [];
    const buy = (id: string, want: number) => {
      const price = ITEMS[id].buy!;
      const n = Math.min(want, Math.floor(p.gold / price), spaceFor(p.inv, id));
      if (n <= 0) return;
      p.gold -= n * price;
      addItem(p.inv, id, n);
      bought.push(`${n}x ${ITEMS[id].name} (${n * price} kan)`);
    };
    if (hp < 5) buy("pocao_vida", 20 - hp);
    if (rei < 3) buy("pocao_rei", 10 - rei);
    if (!bought.length) return;
    this.log(p, `Auto Helper: comprou ${bought.join(" e ")}.`);
    this.sendInv(p);
  }

  // ---------- forja do Kisuke ----------

  private registerForgeMessages() {
    this.handle("forge", (c, m: { slot: string }) => {
      const p = this.me(c);
      const slot = m?.slot as EquipSlot;
      if (!p || !EQUIP_SLOTS.includes(slot)) return;
      if (!this.near(p, "shop")) return this.log(p, "A forja fica no Kisuke.");
      const lv = p.forge[slot] ?? 0;
      if (lv >= FORGE_MAX) return this.log(p, `${SLOT_LABEL[slot]} já está no nível máximo (+${FORGE_MAX}).`);
      const cost = forgeCost(lv);
      if (countItem(p.inv, "pedra_reishi") < cost.stones) return this.log(p, `Precisa de ${cost.stones} Pedras de Reishi no inventário.`);
      if (p.gold < cost.gold) return this.log(p, `Faltam ${cost.gold - p.gold} kan.`);
      removeItem(p.inv, "pedra_reishi", cost.stones);
      p.gold -= cost.gold;
      this.dailyStep(p, "forge");
      if (Math.random() < FORGE_CHANCE[lv]) {
        p.forge[slot] = lv + 1;
        this.log(p, `Forja: ${SLOT_LABEL[slot]} subiu para +${lv + 1}!`);
        this.sendTo(p, "fx", { t: "book", text: `${SLOT_LABEL[slot]} +${lv + 1}` });
      } else if (lv >= FORGE_SAFE) {
        p.forge[slot] = lv - 1;
        this.log(p, `Forja falhou: ${SLOT_LABEL[slot]} caiu para +${lv - 1}.`);
      } else this.log(p, `Forja falhou: ${SLOT_LABEL[slot]} continua +${lv}.`);
      this.recompute(p);
      this.sendInv(p);
    });
  }

  // ---------- bestiário, conquistas e recompensa diária ----------

  private bestiaryKill(p: Player, kind: string) {
    const pr = p.prog;
    const before = pr.bestiary[kind] ?? 0;
    pr.bestiary[kind] = before + 1;
    pr.kills++;
    this.tutorial(p, "kill");
    p.hunt.kills++;
    this.dailyStep(p, "any");
    this.dailyStep(p, "kill", 1, kind);
    if (BOSSES.has(kind)) this.dailyStep(p, "boss");
    if (!p.online) p.offKills++;
    if (BOSSES.has(kind)) pr.bossKills++;
    if (kind === "yhwach") this.awardMilestone(p, "first_yhwach");
    this.seasonKill(p, BOSSES.has(kind));
    const st = bestiaryStage(kind, before + 1);
    if (st > bestiaryStage(kind, before)) {
      const name = MONSTERS[kind].name;
      this.log(p, st >= 3
        ? `Bestiário: ${name} completo! +${st * 4}% de dano e +20% de chance de loot contra ele.`
        : `Bestiário: ${name} no estágio ${st}/3. +${st * 4}% de dano contra ele.`);
      this.sendTo(p, "fx", { t: "book", text: `Bestiário: ${name} ${st}/3` });
    }
  }

  /** Marca um passo do guia de primeiros passos e paga a recompensa dele. */
  private tutorial(p: Player, id: TutorialId) {
    const done = (p.prog.tut ??= []);
    if (done.includes(id)) return;
    done.push(id);
    const step = TUTORIAL.find((t) => t.id === id)!;
    this.log(p, `Primeiros passos: ${step.text.split(":")[0]}. Recompensa: ${this.grant(p, step.reward)}.`);
    if (done.length === TUTORIAL.length) this.log(p, "Primeiros passos completos! O resto do caminho é seu.");
    this.sendTutorial(p);
  }

  private sendTutorial(p: Player) {
    const done = p.prog.tut ?? [];
    this.sendTo(p, "tutorial", done.length >= TUTORIAL.length ? null : TUTORIAL.map((t) => ({ text: t.text, done: done.includes(t.id) })));
  }

  /** Missões diárias do dia; sorteia de novo quando o dia vira. */
  private dailyOf(p: Player) {
    const today = dayKey(Date.now());
    if (p.prog.dm?.day !== today) p.prog.dm = { day: today, list: dailyMissions(p.id, today, p.level), bonus: false };
    return p.prog.dm;
  }

  private dailyStep(p: Player, kind: DailyKind, n = 1, target?: string) {
    const dm = this.dailyOf(p);
    for (const m of dm.list) {
      if (m.done || m.kind !== kind || (m.target && m.target !== target)) continue;
      m.have = Math.min(m.need, m.have + n);
      if (m.have < m.need) continue;
      m.done = true;
      const r = dailyReward(p.level);
      const exp = Math.round((expForLevel(p.level + 1) - expForLevel(p.level)) * r.expFrac);
      p.gold += r.gold;
      this.log(p, `Missão diária completa: ${dailyText(m, (id) => MONSTERS[id].name)}. +${r.gold} kan e +${exp} XP.`);
      this.sendTo(p, "fx", { t: "book", text: "Missão diária completa!" });
      this.gainExp(p, exp, "Missão diária");
      this.seasonAdd(p, SEASON_PTS.mission, "missão diária");
      this.sendInv(p);
    }
    if (!dm.bonus && dm.list.every((m) => m.done)) {
      dm.bonus = true;
      this.log(p, `Todas as missões diárias feitas! Bônus: ${this.grant(p, { gold: 0, items: [{ id: "caixa_kisuke", qty: 1 }] })}.`);
      this.seasonAdd(p, SEASON_PTS.missionsAll, "todas as missões");
    }
  }

  private stats(p: Player): Stats {
    return {
      level: p.level, rebirths: p.rebirths, kills: p.prog.kills, bossKills: p.prog.bossKills, stages: stagesSum(p.prog.bestiary), frags: p.frags,
      quests: p.quests.done.length, zanjutsu: p.zanjutsu, reiryoku: p.reiryoku, streak: p.prog.daily.streak,
    };
  }

  /** Entrega recompensa: itens no inventário primeiro, o que não couber vai para o depot. */
  private grant(p: Player, reward: { gold: number; items?: { id: string; qty: number }[] }): string {
    p.gold += reward.gold;
    const parts = reward.gold ? [`${reward.gold} kan`] : [];
    let toDepot = false;
    for (const it of reward.items ?? []) {
      const n = addItem(p.inv, it.id, it.qty);
      if (n < it.qty) { addItem(p.depot, it.id, it.qty - n); toDepot = true; }
      parts.push(`${it.qty}x ${ITEMS[it.id].name}`);
    }
    this.sendInv(p);
    return parts.join(", ") + (toDepot ? " (o que não coube foi para o depot)" : "");
  }

  private checkAchievements(p: Player) {
    const s = this.stats(p);
    for (const a of ACHIEVEMENTS) {
      if (p.prog.ach.includes(a.id) || s[a.stat] < a.need) continue;
      p.prog.ach.push(a.id);
      const got = this.grant(p, a.reward);
      this.giveCrystals(p, FREE_CRYSTALS.achievement, `conquista ${a.id}`);
      this.log(p, `Conquista: ${a.name}! Recompensa: ${got} e ${FREE_CRYSTALS.achievement} cristais.`);
      this.sendTo(p, "fx", { t: "book", text: `Conquista: ${a.name}` });
      if (a.need >= 25 || a.stat === "level") this.broadcast("chat", { from: "", text: `🏆 ${p.name} conquistou "${a.name}".`, ch: "sys" });
    }
  }

  // ---------- passe de temporada ----------

  /** Estado do passe do personagem, recomeçado quando a temporada vira. */
  private season(p: Player) {
    const id = seasonId(Date.now());
    if (p.prog.season?.id !== id) p.prog.season = newSeason(Date.now());
    return p.prog.season;
  }

  private seasonKill(p: Player, boss: boolean) {
    const s = this.season(p);
    if (boss) this.seasonAdd(p, SEASON_PTS.boss, "chefe");
    if (++s.kAcc < SEASON_PTS.killEvery) return;
    s.kAcc = 0;
    const today = dayKey(Date.now());
    if (s.kDay !== today) { s.kDay = today; s.kPts = 0; }
    const n = Math.min(SEASON_PTS.kill, SEASON_PTS.killDailyCap - s.kPts);
    if (n <= 0) return;
    s.kPts += n;
    this.seasonAdd(p, n, "abates");
  }

  /** Soma pontos; a cada nível novo avisa e acende o aviso do botão. */
  private seasonAdd(p: Player, n: number, _why: string) {
    if (n <= 0) return;
    const s = this.season(p);
    const before = seasonTier(s.pts);
    s.pts += n;
    const after = seasonTier(s.pts);
    if (after > before) {
      this.log(p, `Passe de temporada: nível ${after}! Pegue o prêmio no botão ★.`);
      this.sendTo(p, "fx", { t: "event", text: `Passe: nível ${after}!` });
    }
    this.sendSeason(p, false);
  }

  /** open: abre o painel; sem open, só atualiza (se já estiver aberto) e o aviso do botão. */
  private sendSeason(p: Player, open: boolean) {
    const s = this.season(p);
    this.sendTo(p, "season", {
      open, id: s.id, name: seasonName(s.id), endsAt: seasonEnds(s.id), pts: s.pts, perTier: SEASON.perTier, tiers: SEASON.tiers,
      claimed: s.claimed, killPts: s.kDay === dayKey(Date.now()) ? s.kPts : 0, killCap: SEASON_PTS.killDailyCap,
    });
  }

  private seasonGive(p: Player, r: SeasonReward): string {
    const parts: string[] = [];
    if (r.gold || r.items?.length) parts.push(this.grant(p, { gold: r.gold ?? 0, items: r.items }));
    if (r.crystals) { this.giveCrystals(p, r.crystals, "passe"); parts.push(`${r.crystals} cristais`); }
    if (r.cos && p.accountId) {
      const w = db.wallet(p.accountId);
      if (!w.owned.includes(r.cos)) { db.changeCrystals(p.accountId, 0, `passe ${r.cos}`, r.cos); this.equipCos(p, r.cos); }
      parts.push(COSMETIC[r.cos].name);
    }
    return parts.join(", ");
  }

  private registerSeasonMessages() {
    this.handle("seasonOpen", (c) => { const p = this.me(c); if (p) this.sendSeason(p, true); });
    this.handle("seasonClaim", (c) => {
      const p = this.me(c);
      if (!p) return;
      const s = this.season(p);
      const tier = seasonTier(s.pts);
      if (tier <= s.claimed) return this.log(p, "Nenhum prêmio novo do passe. Continue caçando!");
      const got: string[] = [];
      for (let t = s.claimed + 1; t <= tier; t++) got.push(this.seasonGive(p, seasonReward(t)));
      const from = s.claimed + 1;
      s.claimed = tier;
      this.log(p, `Passe de temporada ${from === tier ? `nível ${tier}` : `níveis ${from} a ${tier}`}: ${got.join("; ")}.`);
      this.sendTo(p, "fx", { t: "book", text: "Prêmios do passe!" });
      this.sendSeason(p, true);
    });
  }

  // ---------- chefe mundial ----------

  private worldBoss: { id: string; dmg: Map<string, number> } | null = null;

  private scheduleWorldBoss(ms: number) {
    // aviso antes, para dar tempo de chegar
    this.clock.setTimeout(() => {
      this.broadcast("chat", { from: "", ch: "sys", text: `⚠ Em ${Math.round(WORLD_BOSS.warnMs / 60000)} minutos o ${MONSTERS[WORLD_BOSS.kind].name} vai aparecer perto da praça de Karakura. Juntem-se!` });
      this.broadcast("fx", { t: "event", text: "Chefe mundial chegando!" });
    }, Math.max(0, ms - WORLD_BOSS.warnMs));
    this.clock.setTimeout(() => {
      this.spawnWorldBoss();
      this.scheduleWorldBoss(Number(process.env.WORLDBOSS_EVERY_MS) || WORLD_BOSS.everyMs);
    }, ms);
  }

  /** Aparece fora da zona segura, perto do templo de Karakura; a vida cresce com quem está online. */
  spawnWorldBoss() {
    if (this.worldBoss) return;
    const map = HOME;
    let at: { x: number; y: number } | undefined;
    for (let tries = 0; tries < 2000 && !at; tries++) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 4;
      const x = Math.round(TEMPLE.x + Math.cos(a) * r), y = Math.round(TEMPLE.y + Math.sin(a) * r);
      if (walkable(map, x, y) && !inPZ(map, x, y) && !this.blockedForMonster("karakura", x, y)) at = { x, y };
    }
    if (!at) return;
    const def = MONSTERS[WORLD_BOSS.kind];
    const online = [...this.state.players.values()].filter((x) => x.online).length;
    const m = new Monster();
    m.id = `wb${++this.monsterSeq}`;
    m.kind = WORLD_BOSS.kind;
    m.map = "karakura";
    m.x = m.homeX = at.x;
    m.y = m.homeY = at.y;
    m.hp = m.maxHp = Number(process.env.WORLDBOSS_HP) || WORLD_BOSS.hpBase + WORLD_BOSS.hpPerPlayer * Math.max(0, online - 1);
    m.stepMs = def.stepMs;
    m.invader = true; // anda perto de casa e não renasce
    m.world = true;
    this.state.monsters.set(m.id, m);
    this.monsterAt.add(tileKey("karakura", at.x, at.y));
    this.worldBoss = { id: m.id, dmg: new Map() };
    this.broadcast("chat", { from: "", ch: "sys", text: `⚔ O ${def.name} apareceu perto da praça de Karakura com ${m.maxHp.toLocaleString("pt-BR")} de vida! Todos que acertarem ganham prêmio. Ele vai embora em 15 min.` });
    this.broadcast("fx", { t: "event", text: `${def.name}!` });
    this.clock.setTimeout(() => this.endWorldBoss(), WORLD_BOSS.durationMs);
  }

  private worldBossKilled(m: Monster, killer: Player) {
    const wb = this.worldBoss;
    this.worldBoss = null;
    if (!wb) return;
    const def = MONSTERS[m.kind];
    const total = [...wb.dmg.values()].reduce((a, b) => a + b, 0) || 1;
    const ranked = [...wb.dmg.entries()].sort((a, b) => b[1] - a[1]);
    ranked.forEach(([id, d], i) => {
      const p = this.state.players.get(id);
      if (!p) return;
      const share = d / total;
      // todo mundo que acertou ganha o básico; a XP e o kan crescem com a parte do dano; os 3 primeiros levam mais
      const boxes = i === 0 ? 3 : i < 3 ? 2 : 1;
      const crystals = i === 0 ? 30 : i < 3 ? 20 : 10;
      const got = this.grant(p, { gold: Math.round(500 + 20000 * share), items: [{ id: "caixa_kisuke", qty: boxes }, { id: "pedra_reishi", qty: 2 }] });
      this.giveCrystals(p, crystals, "chefe mundial");
      this.monsterExp(p, Math.round(def.exp * (0.3 + share * 3)), `${def.name} (chefe mundial)`);
      this.bestiaryKill(p, m.kind);
      this.seasonAdd(p, SEASON_PTS.worldBoss, "chefe mundial");
      this.log(p, `Chefe mundial derrotado! Você fez ${Math.round(share * 100)}% do dano (${i + 1}º lugar): ${got} e ${crystals} cristais.`);
    });
    const top = ranked.slice(0, 3).map(([id, d], i) => `${i + 1}º ${this.state.players.get(id)?.name ?? id} (${Math.round((d / total) * 100)}%)`).join(", ");
    this.broadcast("chat", { from: "", ch: "sys", text: `✔ ${killer.name} deu o golpe final no ${def.name}! ${ranked.length} guerreiros participaram. ${top}` });
    this.broadcast("fx", { t: "event", text: `${def.name} derrotado!` });
  }

  private endWorldBoss() {
    const wb = this.worldBoss;
    if (!wb) return;
    this.worldBoss = null;
    const m = this.state.monsters.get(wb.id);
    if (m) { this.state.monsters.delete(m.id); this.monsterAt.delete(tileKey(m.map, m.x, m.y)); }
    this.broadcast("chat", { from: "", ch: "sys", text: `O ${MONSTERS[WORLD_BOSS.kind].name} cansou de esperar e voltou para Hueco Mundo. Fica para a próxima!` });
  }

  // ---------- Loja de Cristais ----------

  private cosOf(p: Player): CosEquip {
    const c: CosEquip = {};
    if (p.cosAura) c.aura = p.cosAura;
    if (p.cosFx) c.fx = p.cosFx;
    if (p.cosTitle) c.title = p.cosTitle;
    if (p.cosName) c.name = p.cosName;
    if (p.cosPet) c.pet = p.cosPet;
    return c;
  }

  /** Equipa a partir do save, ignorando ids que sumiram do catálogo. */
  private applyCos(p: Player, c: CosEquip) {
    const ok = (id: string | undefined, kinds: string[]) => (id && COSMETIC[id] && kinds.includes(COSMETIC[id].kind) ? id : "");
    p.cosAura = ok(c.aura, ["aura"]);
    p.cosFx = ok(c.fx, ["fx"]);
    p.cosTitle = ok(c.title, ["title", "lore"]);
    p.cosName = ok(c.name, ["name"]);
    p.cosPet = ok(c.pet, ["pet"]);
  }

  /** Cristais grátis do jogo (vão para a conta, valem para todos os personagens). */
  private giveCrystals(p: Player, n: number, reason: string) {
    if (!p.accountId || n <= 0) return;
    db.changeCrystals(p.accountId, n, reason);
    this.sendTo(p, "crystals", { crystals: db.wallet(p.accountId).crystals });
  }

  private sendShop(p: Player) {
    const w = p.accountId ? db.wallet(p.accountId) : { crystals: 0, owned: [] };
    const owned = [...new Set([...w.owned, ...(p.prog.titles ?? [])])];
    this.sendTo(p, "shopData", { crystals: w.crystals, owned, equip: this.cosOf(p) });
  }

  /** Registra e concede um marco histórico de servidor (W-06) apenas ao primeiro a alcançá-lo. */
  private awardMilestone(p: Player, id: string) {
    const def = claimServerMilestone(id, p);
    if (!def) return;
    invalidateRankingCache();
    const titles = (p.prog.titles ??= []);
    if (!titles.includes(def.titleId)) titles.push(def.titleId);
    if (p.accountId) {
      const w = db.wallet(p.accountId);
      if (!w.owned.includes(def.titleId)) db.changeCrystals(p.accountId, 0, `marco ${def.id}`, def.titleId);
    }
    if (!p.cosTitle) this.equipCos(p, def.titleId);
    const title = titleText(def.titleId);
    this.log(p, `Marco do servidor conquistado: ${def.name}! Você recebeu o título exclusivo « ${title} ».`);
    this.sendTo(p, "fx", { t: "event", text: `Marco: ${title}` });
    this.broadcast("chat", { from: "", ch: "sys", text: `👑 Marco do servidor! ${p.name} conquistou "${def.name}" e recebeu o título « ${title} »!` });
  }

  private registerShopMessages() {
    this.handle("shopOpen", (c) => { const p = this.me(c); if (p) this.sendShop(p); });
    this.handle("shopBuy", (c, m: { id?: string }) => {
      const p = this.me(c);
      const item = own(COSMETIC, m?.id);
      if (!p || !item || !p.accountId) return;
      if (item.season) return this.log(p, `${item.name} só sai no passe de temporada.`);
      const w = db.wallet(p.accountId);
      if (w.owned.includes(item.id)) return this.log(p, `${item.name} já é seu.`);
      if (w.crystals < item.price) return this.log(p, `Faltam ${item.price - w.crystals} cristais para ${item.name}.`);
      if (!db.changeCrystals(p.accountId, -item.price, `compra ${item.id}`, item.id)) return this.log(p, "Não deu para comprar agora. Tente de novo.");
      // já sai equipado (a crônica equipa o título dela)
      this.equipCos(p, item.id);
      this.log(p, item.kind === "lore" ? `Crônica liberada: ${item.name}. Você ganhou o título "${item.title}".` : `Você comprou ${item.name}!`);
      this.sendTo(p, "fx", { t: "event", text: item.kind === "lore" ? `Título: ${item.title}` : item.name });
      this.sendShop(p);
    });
    this.handle("shopEquip", (c, m: { id?: string; kind?: string }) => {
      const p = this.me(c);
      if (!p) return;
      const id = typeof m?.id === "string" ? m.id : "";
      if (!id) {
        // tirar: o tipo vem junto
        const kind = typeof m?.kind === "string" ? m.kind : "";
        if (kind === "aura") p.cosAura = ""; else if (kind === "fx") p.cosFx = ""; else if (kind === "title") p.cosTitle = "";
        else if (kind === "name") p.cosName = ""; else if (kind === "pet") p.cosPet = "";
        return this.sendShop(p);
      }
      const owned = p.accountId ? db.wallet(p.accountId).owned : [];
      if (!own(COSMETIC, id) || (!owned.includes(id) && !(p.prog.titles ?? []).includes(id))) return this.log(p, "Esse cosmético não é da sua conta.");
      this.equipCos(p, id);
      this.sendShop(p);
    });
  }

  private equipCos(p: Player, id: string) {
    const kind = COSMETIC[id].kind;
    if (kind === "aura") p.cosAura = id;
    else if (kind === "fx") p.cosFx = id;
    else if (kind === "title" || kind === "lore") p.cosTitle = id;
    else if (kind === "name") p.cosName = id;
    else if (kind === "pet") p.cosPet = id;
  }

  private registerBookMessages() {
    const show = (p: Player) => {
      const s = this.stats(p);
      const today = dayKey(Date.now());
      const d = p.prog.daily;
      const alive = d.last === today || d.last === prevDay(today);
      this.sendTo(p, "book", {
        bestiary: BESTIARY_KINDS().map((kind) => {
          const kills = p.prog.bestiary[kind] ?? 0, stage = bestiaryStage(kind, kills), def = MONSTERS[kind];
          return {
            kind, name: def.name, sprite: def.sprite, kills, stage, stages: bestiaryStages(kind), boss: BOSSES.has(kind),
            // o estágio 1 revela os números; o 2 revela o loot
            hp: stage >= 1 ? def.hp : 0, exp: stage >= 1 ? def.exp : 0,
            loot: stage >= 2 ? (LOOT[kind]?.items ?? []).map((e) => ({ name: ITEMS[e.item].name, chance: e.chance })) : null,
          };
        }),
        hunt: { ...p.hunt, now: Date.now(), items: Object.entries(p.hunt.items).map(([id, n]) => ({ name: ITEMS[id].name, icon: ITEMS[id].icon, n })).sort((a, b) => b.n - a.n) },
        ach: ACHIEVEMENTS.map((a) => ({ name: a.name, desc: a.desc, done: p.prog.ach.includes(a.id), have: Math.min(s[a.stat], a.need), need: a.need, reward: a.reward })),
        missions: (() => {
          const dm = this.dailyOf(p);
          const r = dailyReward(p.level);
          return {
            bonus: dm.bonus, gold: r.gold, exp: Math.round((expForLevel(p.level + 1) - expForLevel(p.level)) * r.expFrac),
            list: dm.list.map((m) => ({ text: dailyText(m, (id) => MONSTERS[id].name), have: m.have, need: m.need, done: m.done })),
          };
        })(),
        daily: {
          claimed: d.last === today,
          streak: alive ? d.streak : 0,
          rewards: DAILY,
          // posição no ciclo de 7 do resgate de hoje (já feito ou não)
          index: d.last === today ? (d.streak - 1) % DAILY.length : (alive ? d.streak : 0) % DAILY.length,
        },
      });
    };
    this.handle("book", (c) => { const p = this.me(c); if (p) show(p); });
    this.handle("huntReset", (c) => {
      const p = this.me(c);
      if (!p) return;
      p.hunt = { since: Date.now(), exp: 0, gold: 0, kills: 0, items: {} };
      show(p);
    });
    this.handle("daily", (c) => {
      const p = this.me(c);
      if (!p) return;
      const today = dayKey(Date.now());
      const d = p.prog.daily;
      if (d.last === today) return this.log(p, "Você já pegou a recompensa de hoje. Volte amanhã.");
      d.streak = d.last === prevDay(today) ? d.streak + 1 : 1;
      d.last = today;
      const got = this.grant(p, DAILY[(d.streak - 1) % DAILY.length]);
      const cr = d.streak % DAILY.length === 0 ? FREE_CRYSTALS.daily7 : FREE_CRYSTALS.daily;
      this.giveCrystals(p, cr, "diária");
      this.log(p, `Recompensa diária (${d.streak}º dia seguido): ${got} e ${cr} cristais.`);
      this.seasonAdd(p, SEASON_PTS.daily, "recompensa diária");
      this.sendTo(p, "dailyReady", { ready: false });
      this.tutorial(p, "daily");
      this.checkAchievements(p);
      show(p);
    });
  }


  // ---------- mercado entre jogadores (no Kisuke) ----------

  private registerMarketMessages() {
    const show = (p: Player) => this.sendTo(p, "market", { listings: market.list(), me: p.id, fee: market.MARKET_FEE });
    this.handle("marketList", (c) => { const p = this.me(c); if (!p) return; this.expireListings(); show(p); });
    this.clock.setInterval(() => this.expireListings(), 60_000);
    this.handle("marketSell", (c, m: { index: number; qty: number; price: number }) => {
      const p = this.me(c);
      if (!p) return;
      if (!this.near(p, "shop")) return this.log(p, "O mercado fica no Kisuke.");
      const i = m?.index;
      const sl = Number.isInteger(i) && i >= 0 && i < INV_SIZE ? p.inv[i] : null;
      const qty = m?.qty, price = m?.price;
      if (!sl) return;
      if (!Number.isInteger(qty) || qty < 1 || qty > sl.qty) return this.log(p, "Quantidade inválida.");
      if (!Number.isInteger(price) || price < 1 || price > market.MAX_PRICE) return this.log(p, `Preço por unidade: de 1 a ${market.MAX_PRICE} kan.`);
      if (market.countBy(p.id) >= market.MAX_LISTINGS) return this.log(p, `No máximo ${market.MAX_LISTINGS} anúncios ao mesmo tempo.`);
      sl.qty -= qty;
      if (sl.qty <= 0) p.inv[i] = null;
      market.add(p.id, p.name, sl.id, qty, price);
      this.log(p, `Anunciou ${qty}x ${ITEMS[sl.id].name} por ${price} kan cada.`);
      this.sendInv(p);
      show(p);
    });
    this.handle("marketBuy", (c, m: { id: number }) => {
      const p = this.me(c);
      const l = p && Number.isInteger(m?.id) ? market.get(m.id) : undefined;
      if (!p || !l) return;
      if (!this.near(p, "shop")) return this.log(p, "O mercado fica no Kisuke.");
      if (l.seller === p.id) return this.log(p, "Esse anúncio é seu (use cancelar).");
      const total = l.price * l.qty;
      if (p.gold < total) return this.log(p, `Faltam ${total - p.gold} kan.`);
      if (spaceFor(p.inv, l.item) < l.qty) return this.log(p, "Inventário sem espaço.");
      if (!market.remove(l.id)) return show(p); // alguém comprou antes
      p.gold -= total;
      addItem(p.inv, l.item, l.qty);
      const income = total - Math.floor(total * market.MARKET_FEE);
      this.creditSeller(l.seller, income, `Mercado: ${p.name} comprou ${l.qty}x ${ITEMS[l.item].name}. Você recebeu ${income} kan (taxa de ${market.MARKET_FEE * 100}%).`);
      this.log(p, `Comprou ${l.qty}x ${ITEMS[l.item].name} de ${l.sellerName} por ${total} kan.`);
      this.sendInv(p);
      show(p);
    });
    this.handle("marketCancel", (c, m: { id: number }) => {
      const p = this.me(c);
      const l = p && Number.isInteger(m?.id) ? market.get(m.id) : undefined;
      if (!p || !l || l.seller !== p.id) return;
      if (!this.near(p, "shop")) return this.log(p, "O mercado fica no Kisuke.");
      if (spaceFor(p.inv, l.item) < l.qty) return this.log(p, "Inventário sem espaço para receber de volta.");
      if (!market.remove(l.id)) return show(p);
      addItem(p.inv, l.item, l.qty);
      this.log(p, `Anúncio cancelado: ${l.qty}x ${ITEMS[l.item].name} voltou ao inventário.`);
      this.sendInv(p);
      show(p);
    });
  }

  /** Anúncios com mais de 7 dias voltam para o depot do vendedor (fica no anúncio se o depot estiver cheio). */
  private expireListings() {
    for (const l of market.expired()) {
      const x = this.state.players.get(l.seller);
      const row = x ? undefined : db.load(l.seller);
      if (row) row.data.depot = Array.from({ length: DEPOT_SIZE }, (_, i) => row.data.depot?.[i] ?? null);
      const depot = x ? x.depot : row?.data.depot;
      if (!depot || spaceFor(depot, l.item) < l.qty) continue;
      if (!market.remove(l.id)) continue;
      addItem(depot, l.item, l.qty);
      const text = `Mercado: seu anúncio de ${l.qty}x ${ITEMS[l.item].name} expirou e voltou para o depot.`;
      if (x) { this.log(x, text); this.sendInv(x); }
      else if (row) db.save(l.seller, row.data, row.inWorld);
    }
  }

  /** Entrega o dinheiro da venda: na hora se o vendedor está no mundo, senão no save dele. */
  private creditSeller(id: string, amount: number, text: string) {
    const x = this.state.players.get(id);
    if (x) {
      x.gold += amount;
      this.sendInv(x);
      this.log(x, text);
      return;
    }
    const row = db.load(id);
    if (!row) return;
    row.data.gold = (row.data.gold ?? 0) + amount;
    db.save(id, row.data, row.inWorld);
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
      name: p.name, charId: p.charId, level: p.level, exp: p.exp, hp: p.hp, rei: Math.round(p.rei), map: p.map, x: p.x, y: p.y,
      gold: p.gold, inv: p.inv, depot: p.depot, equip: p.equip,
      autoTarget: p.autoTarget, autoHunt: p.autoHunt, autoHeal: p.autoHeal, frags: p.frags, quests: p.quests, skullUntil: p.skullUntil, rebirths: p.rebirths, prog: p.prog, forge: p.forge, expBoostUntil: p.expBoostUntil, lootBoostUntil: p.lootBoostUntil,
      autoTrain: p.autoTrain, autoSell: p.autoSell, ignore: p.ignore, huntSpot: p.huntSpot, autoReturn: p.autoReturn, autoRei: p.autoRei, autoBankai: p.autoBankai, autoBox: p.autoBox, autoRestock: p.autoRestock, cos: this.cosOf(p), zanjutsu: p.zanjutsu, zanTries: p.zanTries, reiryoku: p.reiryoku, reiTries: p.reiTries,
      offline: p.online ? undefined : { since: p.offlineSince, expAtLeave: p.expAtLeave, goldAtLeave: p.goldAtLeave, zanAtLeave: p.zanAtLeave, reiAtLeave: p.reiAtLeave, deaths: p.offlineDeaths, kills: p.offKills, items: p.offItems },
    };
  }

  private saveAll() {
    const t0 = performance.now();
    const list = [...this.state.players.values()].map((p) => ({ id: p.id, data: this.toSave(p), inWorld: true }));
    db.saveMany(list);
    db.setMeta("parties", [...this.parties.values()]);
    db.setMeta("bags", [...this.state.bags.values()].map((b): SavedBag => ({
      id: b.id, map: b.map, x: b.x, y: b.y, kind: b.kind, label: b.label, owners: b.owners, ownerUntil: b.ownerUntil, expires: b.expires, gold: b.gold, items: b.items,
    })));
    recordSave(performance.now() - t0, list.length);
  }
}
