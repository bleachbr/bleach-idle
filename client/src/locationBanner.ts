// Notificação de descoberta de setor (Location Banner HUD)
// Detecta e exibe elegantes banners translúcidos no topo da tela quando o jogador entra em novas regiões.
import { getKarakuraSector, type KarakuraSectorId } from "../../shared/src";

export interface SectorZone {
  id: string;
  mapId: string;
  name: string;
  subtitle: string;
  priority: number;
}

const KARAKURA_SECTOR_MAP: Record<KarakuraSectorId, { id: string; name: string; subtitle: string }> = {
  setor_1: {
    id: "karakura-residential",
    name: "Karakura - Distrito Residencial",
    subtitle: "Clínica Kurosaki & Ruas Pacatas",
  },
  setor_2: {
    id: "karakura-urahara",
    name: "Karakura - Bosque do Urahara",
    subtitle: "Loja de Conveniência & Campo de Treinamento",
  },
  setor_3: {
    id: "karakura-river",
    name: "Karakura - Margem do Rio Onagawa",
    subtitle: "Águas Cristalinas & Travessia da Ponte",
  },
  setor_4: {
    id: "karakura-industrial",
    name: "Karakura - Zona Industrial",
    subtitle: "Ruínas Fabris & Ninho dos Predadores",
  },
};

/** Setores canônicos de outros reinos */
export const OTHER_REALM_SECTORS: Record<string, { id: string; name: string; subtitle: string }> = {
  soul: {
    id: "soul-seireitei",
    name: "Soul Society - Seireitei",
    subtitle: "Corte das Almas Puras e QG do Seireitei (13 Divisões)",
  },
  hueco: {
    id: "hueco-desert",
    name: "Hueco Mundo - Deserto Branco",
    subtitle: "Areias Eternas sob a Lua Crescente",
  },
  lasnoches: {
    id: "lasnoches-palace",
    name: "Las Noches - Palácio Imperial",
    subtitle: "Fortaleza Monumental dos Espadas",
  },
  dangai: {
    id: "dangai-corridor",
    name: "Dangai - Precipício Temporal",
    subtitle: "Corredor Isolado entre Dimensões",
  },
  falsa: {
    id: "falsa-karakura",
    name: "Cidade Falsa de Karakura",
    subtitle: "Campo de Batalha Réplica dos Capitães",
  },
  wandenreich: {
    id: "wandenreich-silbern",
    name: "Wandenreich - Silbern",
    subtitle: "Império Invisível de Gelo e Luz",
  },
};

/** Determina o setor correspondente à posição (tx, ty) no mapa especificado */
export function getSectorAt(mapId: string, tx: number, ty: number): SectorZone {
  if (mapId === "karakura") {
    const kSector = getKarakuraSector(tx, ty);
    if (kSector && KARAKURA_SECTOR_MAP[kSector.id]) {
      const info = KARAKURA_SECTOR_MAP[kSector.id];
      return {
        id: info.id,
        mapId: "karakura",
        name: info.name,
        subtitle: info.subtitle,
        priority: 20,
      };
    }
    // Fallback padrão de Karakura
    return {
      id: "karakura-residential",
      mapId: "karakura",
      name: "Karakura - Distrito Residencial",
      subtitle: "Clínica Kurosaki & Ruas Pacatas",
      priority: 10,
    };
  }

  const realm = OTHER_REALM_SECTORS[mapId];
  if (realm) {
    return {
      id: realm.id,
      mapId,
      name: realm.name,
      subtitle: realm.subtitle,
      priority: 10,
    };
  }

  // Fallback genérico caso o mapa não esteja no catálogo
  return {
    id: `${mapId}-unknown`,
    mapId,
    name: mapId.charAt(0).toUpperCase() + mapId.slice(1),
    subtitle: "Região Desconhecida",
    priority: 0,
  };
}

/** Gerenciador de estado de descobertas de setor */
export class LocationTracker {
  private currentSectorId = "";
  private currentMapId = "";
  private lastTriggerTime = 0;
  private minIntervalMs: number;

  constructor(minIntervalMs = 2000) {
    this.minIntervalMs = minIntervalMs;
  }

  get currentSector(): string {
    return this.currentSectorId;
  }

  get currentMap(): string {
    return this.currentMapId;
  }

  /**
   * Avalia a posição atual do jogador. Retorna o setor se houve mudança de área.
   */
  update(mapId: string, tx: number, ty: number, now = performance.now()): { changed: boolean; sector: SectorZone } | null {
    const sector = getSectorAt(mapId, tx, ty);
    const mapChanged = mapId !== this.currentMapId;
    const sectorChanged = sector.id !== this.currentSectorId;

    if (mapChanged || sectorChanged) {
      this.currentMapId = mapId;
      this.currentSectorId = sector.id;
      this.lastTriggerTime = now;
      return { changed: true, sector };
    }

    return null;
  }

  reset() {
    this.currentSectorId = "";
    this.currentMapId = "";
    this.lastTriggerTime = 0;
  }
}
