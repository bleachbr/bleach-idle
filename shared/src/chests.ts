import { chebyshev } from "./formulas";
import { addItem, INTERACT_RANGE, type Slot } from "./items";
import type { KarakuraSectorId } from "./sectors";

export type ChestSecretSpot = "zelkova" | "river" | "alley" | "industrial";

export interface ChestReward {
  gold: number;
  items: Slot[];
}

export interface ChestDef {
  id: string;
  map: string;
  x: number;
  y: number;
  name: string;
  hint: string;
  secretSpot: ChestSecretSpot;
  sectorId: KarakuraSectorId;
  rewards: ChestReward;
}

export interface ChestOpenResult {
  success: boolean;
  chestId: string;
  name: string;
  goldAwarded: number;
  itemsAwarded: Slot[];
  itemsLostToFullInv: Slot[];
  message: string;
  alreadyOpened?: boolean;
}

export const KARAKURA_CHESTS: ChestDef[] = [
  {
    id: "chest_residential_alley",
    map: "karakura",
    x: 7,
    y: 29,
    name: "Baú do Beco Residencial",
    secretSpot: "alley",
    sectorId: "setor_1",
    hint: "Oculto atrás dos fundos da Clínica Kurosaki, entre muros residenciais estreitos.",
    rewards: {
      gold: 120,
      items: [
        { id: "pocao_vida", qty: 3 },
        { id: "pocao_rei", qty: 2 },
      ],
    },
  },
  {
    id: "chest_central_zelkova",
    map: "karakura",
    x: 29,
    y: 23,
    name: "Baú Oculto da Praça das Árvores",
    secretSpot: "zelkova",
    sectorId: "setor_1",
    hint: "Escondido atrás do tronco da zelkova central, próximo à divisa dos bairros.",
    rewards: {
      gold: 180,
      items: [
        { id: "pocao_vida", qty: 4 },
        { id: "garra", qty: 3 },
      ],
    },
  },
  {
    id: "chest_zelkova_grove",
    map: "karakura",
    x: 39,
    y: 5,
    name: "Baú Secreto da Zelkova Ancestral",
    secretSpot: "zelkova",
    sectorId: "setor_2",
    hint: "Camuflado sob a copa espessa da grande árvore zelkova ao norte da clareira de treinamento.",
    rewards: {
      gold: 250,
      items: [
        { id: "pocao_vida", qty: 5 },
        { id: "pedra_reishi", qty: 2 },
        { id: "caixa_kisuke", qty: 1 },
      ],
    },
  },
  {
    id: "chest_onagawa_river",
    map: "karakura",
    x: 7,
    y: 42,
    name: "Baú Submerso da Beira-Rio Onagawa",
    secretSpot: "river",
    sectorId: "setor_3",
    hint: "Entre os juncos e pedras úmidas na margem sul do Rio Onagawa.",
    rewards: {
      gold: 400,
      items: [
        { id: "pocao_vida", qty: 5 },
        { id: "pocao_rei", qty: 5 },
        { id: "amuleto_alma", qty: 1 },
      ],
    },
  },
  {
    id: "chest_industrial_scrapyard",
    map: "karakura",
    x: 59,
    y: 43,
    name: "Cofre Enferrujado da Periferia Industrial",
    secretSpot: "industrial",
    sectorId: "setor_4",
    hint: "Escondido sob contêineres e sucata pesada próximo à toca dos Hollows ferozes.",
    rewards: {
      gold: 750,
      items: [
        { id: "pocao_rei", qty: 8 },
        { id: "caixa_kisuke", qty: 2 },
        { id: "pedra_reishi", qty: 4 },
      ],
    },
  },
];

export function chestById(id: string): ChestDef | undefined {
  return KARAKURA_CHESTS.find((c) => c.id === id);
}

export function chestAt(map: string, x: number, y: number): ChestDef | undefined {
  return KARAKURA_CHESTS.find((c) => c.map === map && c.x === x && c.y === y);
}

export function chestsInSector(sectorId: string): ChestDef[] {
  return KARAKURA_CHESTS.filter((c) => c.sectorId === sectorId);
}

export function chestNear(map: string, x: number, y: number, maxDist = INTERACT_RANGE): ChestDef | undefined {
  return KARAKURA_CHESTS.find((c) => c.map === map && chebyshev(x, y, c.x, c.y) <= maxDist);
}

export function canOpenChest(
  chest: ChestDef,
  openedIds: Set<string> | string[],
  playerPos?: { map: string; x: number; y: number }
): { canOpen: boolean; reason?: string } {
  const isOpened = openedIds instanceof Set ? openedIds.has(chest.id) : openedIds.includes(chest.id);
  if (isOpened) {
    return { canOpen: false, reason: "Este baú de tesouro já foi saqueado." };
  }
  if (playerPos) {
    if (playerPos.map !== chest.map) {
      return { canOpen: false, reason: "O baú está em outro mapa." };
    }
    if (chebyshev(playerPos.x, playerPos.y, chest.x, chest.y) > INTERACT_RANGE) {
      return { canOpen: false, reason: "Aproxime-se do baú para abri-lo." };
    }
  }
  return { canOpen: true };
}

/** Aplica as recompensas do baú ao jogador e registra no histórico de baús abertos */
export function openChestReward(
  chest: ChestDef,
  player: { gold: number; inv: (Slot | null)[]; openedChests?: string[] }
): ChestOpenResult {
  const opened = player.openedChests ?? [];
  if (opened.includes(chest.id)) {
    return {
      success: false,
      chestId: chest.id,
      name: chest.name,
      goldAwarded: 0,
      itemsAwarded: [],
      itemsLostToFullInv: [],
      message: `${chest.name} já foi aberto anteriormente.`,
      alreadyOpened: true,
    };
  }

  // Entrega o ouro
  player.gold = (player.gold ?? 0) + chest.rewards.gold;

  // Entrega os itens no inventário
  const itemsAwarded: Slot[] = [];
  const itemsLostToFullInv: Slot[] = [];

  for (const item of chest.rewards.items) {
    const added = addItem(player.inv, item.id, item.qty);
    if (added > 0) {
      itemsAwarded.push({ id: item.id, qty: added });
    }
    if (added < item.qty) {
      itemsLostToFullInv.push({ id: item.id, qty: item.qty - added });
    }
  }

  // Marca como aberto
  if (!player.openedChests) {
    player.openedChests = [];
  }
  player.openedChests.push(chest.id);

  const parts: string[] = [];
  if (chest.rewards.gold > 0) parts.push(`+${chest.rewards.gold} kan`);
  if (itemsAwarded.length > 0) {
    parts.push(itemsAwarded.map((s) => `${s.qty}x ${s.id}`).join(", "));
  }

  return {
    success: true,
    chestId: chest.id,
    name: chest.name,
    goldAwarded: chest.rewards.gold,
    itemsAwarded,
    itemsLostToFullInv,
    message: `Você abriu ${chest.name}! Obtido: ${parts.join(" e ")}.`,
  };
}
