// Estado sincronizado com os clientes. defineTypes em vez de decorators para
// não depender de configuração de decorators no tsx/esbuild.
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";
import { INV_SIZE, DEPOT_SIZE, newProgress, type Slot, type EquipSlot, type QuestState, type Progress } from "../../shared/src";

export class Player extends Schema {
  id = "";
  name = "";
  charId = "ichigo";
  form = 0; // índice em CHARS[charId].forms
  x = 0;
  y = 0;
  dir = 0;
  stepMs = 260;
  hp = 1;
  maxHp = 1;
  rei = 1;
  maxRei = 1;
  level = 1;
  exp = 0;
  targetId = "";
  online = true;
  autoTarget = false;
  autoHunt = false;
  autoHeal = 0; // % de HP para tomar poção; 0 = desligado
  map = "karakura"; // mapa em que está
  look = ""; // visual do equipamento (lookOf); todos veem
  partyId = ""; // party atual ("" = sem party); membros se veem em verde
  guildTag = ""; // tag da guilda, mostrada no nome
  autoSell = false; // Auto Venda: loot puro que não cabe no inventário vira kan na hora
  autoTrain = false; // Auto Treino: queima reiatsu parado (Reiryoku) e segue treinando offline
  zanjutsu = 0; // nível de esgrima
  zanPct = 0; // % para o próximo nível
  reiryoku = 0; // nível de reiryoku (o "magic level")
  reiPct = 0;
  partyLead = false;
  pvpUntil = 0; // ms epoch: até quando está bloqueado depois de atacar um jogador
  skullUntil = 0; // ms epoch: caveira de assassino (abates injustos)

  // só no servidor (não sincronizado)
  path: { x: number; y: number }[] = [];
  follow = false;
  nextStepAt = 0;
  nextAttackAt = 0;
  skillReadyAt = 0;
  potionReadyAt = 0;
  lastCombatAt = 0;
  offlineSince = 0;
  expAtLeave = 0;
  goldAtLeave = 0;
  // inventário, equipamento e depot ficam fora do estado sincronizado: só o dono
  // precisa vê-los, então vão por mensagem "inv" (ver WorldRoom.sendInv)
  gold = 0;
  inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
  depot: (Slot | null)[] = Array(DEPOT_SIZE).fill(null);
  equip: Partial<Record<EquipSlot, string>> = {};
  pendingInteract: "" | Interact = "";
  lastAttackerId = ""; // último jogador que atacou (para o Auto Helper revidar)
  lastAttackedAt = 0;
  recallReadyAt = 0;
  pzWarnAt = 0;
  guildId = 0;
  frags = 0; // jogadores derrotados em PvP (ranking)
  zanTries = 0;
  reiTries = 0;
  zanAtLeave = 0;
  reiAtLeave = 0;
  quests: QuestState = { active: {}, done: [] };
  prog: Progress = newProgress(); // bestiário, conquistas e recompensa diária
  forge: Partial<Record<EquipSlot, number>> = {}; // nível da forja por espaço
  expBoostUntil = 0;
  lootBoostUntil = 0;
  /** analisador de caçada: desde quando e quanto rendeu (zera ao entrar no mundo ou no botão) */
  hunt = { since: Date.now(), exp: 0, gold: 0, kills: 0, items: {} as Record<string, number> };
  reiPotionReadyAt = 0;
  /** mortes enquanto caçava offline, para o relatório da volta */
  offlineDeaths: DeathReport[] = [];
}

export type Interact = "depot" | "shop" | "travel";

export interface DeathReport { by: string; exp: number; gold: number; items: string[]; protected: boolean; at: number }
defineTypes(Player, {
  id: "string", name: "string", charId: "string", form: "uint8",
  x: "int16", y: "int16", dir: "uint8", stepMs: "uint16",
  hp: "int32", maxHp: "int32", rei: "number", maxRei: "int32",
  level: "uint16", exp: "number", targetId: "string",
  online: "boolean", autoTarget: "boolean", autoHunt: "boolean", autoHeal: "uint8", look: "string", map: "string",
  partyId: "string", partyLead: "boolean", pvpUntil: "number", skullUntil: "number", guildTag: "string",
  autoTrain: "boolean", autoSell: "boolean", zanjutsu: "uint8", zanPct: "uint8", reiryoku: "uint8", reiPct: "uint8",
});

export class Monster extends Schema {
  id = "";
  kind = "";
  map = "karakura";
  x = 0;
  y = 0;
  dir = 0;
  stepMs = 400;
  hp = 1;
  maxHp = 1;
  targetId = "";

  spawnIndex = 0;
  /** monstro de invasão: não renasce e volta para a própria casa (não para um spawn do mapa) */
  invader = false;
  homeX = 0;
  homeY = 0;
  path: { x: number; y: number }[] = [];
  nextStepAt = 0;
  nextAttackAt = 0;
  nextWanderAt = 0;
  lastHitBy = "";
}
defineTypes(Monster, {
  id: "string", kind: "string", map: "string", x: "int16", y: "int16", dir: "uint8", stepMs: "uint16",
  hp: "int32", maxHp: "int32", targetId: "string",
});

/** Corpo ou sacola no chão com itens e kan. O conteúdo só vai a quem abre (mensagem "bag"). */
export class Bag extends Schema {
  id = "";
  map = "karakura";
  x = 0;
  y = 0;
  kind: "corpo" | "sacola" = "sacola";
  label = "";
  // só no servidor
  owners: string[] = []; // quem pode pegar durante a prioridade ([] = qualquer um)
  ownerUntil = 0;
  expires = 0;
  gold = 0;
  items: Slot[] = [];
}
defineTypes(Bag, { id: "string", map: "string", x: "int16", y: "int16", kind: "string", label: "string" });

export class WorldState extends Schema {
  players = new MapSchema<Player>();
  monsters = new MapSchema<Monster>();
  bags = new MapSchema<Bag>();
}
defineTypes(WorldState, { players: { map: Player }, monsters: { map: Monster }, bags: { map: Bag } });
