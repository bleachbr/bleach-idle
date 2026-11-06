// Geração Procedural de Zanpakutō e Despertar da Shikai (JH-03) e Bankai (JH-06)
import type { SkillDef } from "./data";
import type { SkillStatusDef } from "./combatStatus";

export type SpiritAffinity =
  | "fire"
  | "ice"
  | "lightning"
  | "shadow"
  | "wind"
  | "kido"
  | "earth"
  | "poison";

export interface ShikaiSkill {
  id: string;
  name: string;
  element: SpiritAffinity;
  power: number;
  reiCost: number;
  cooldownSec: number;
  desc: string;
}

export interface BankaiSkill {
  id: string;
  name: string;
  element: SpiritAffinity;
  power: number;
  reiCost: number;
  cooldownSec: number;
  desc: string;
  area?: number;
  status?: SkillStatusDef;
}

export interface ZanpakutoSpirit {
  shikaiName: string;
  callPhrase: string;
  bankaiName: string;
  affinity: SpiritAffinity;
  spiritLore: string;
  shikaiSkill: ShikaiSkill;
  bankaiSkill?: BankaiSkill;
}

export const SPIRIT_AFFINITIES: readonly SpiritAffinity[] = [
  "fire",
  "ice",
  "lightning",
  "shadow",
  "wind",
  "kido",
  "earth",
  "poison",
] as const;

interface AffinityConfig {
  prefixes: readonly string[];
  suffixes: readonly string[];
  callPhrases: readonly string[];
  bankaiPrefixes: readonly string[];
  loreTemplates: readonly string[];
  skillNameSuffixes: readonly string[];
}

const AFFINITY_DATA: Record<SpiritAffinity, AffinityConfig> = {
  fire: {
    prefixes: ["Hi", "Ryu", "Karyu", "En"],
    suffixes: ["maru", "getsu", "boshi", "ken", "jin", "ya"],
    callPhrases: ["Queime até as cinzas", "Reduza a cinzas", "Queime", "Incendeie", "Arda"],
    bankaiPrefixes: ["Guren", "Enma", "Gōka", "Zanka no"],
    loreTemplates: [
      "Um dragão de fogo ancestral que reduz tudo a cinzas incandescentes.",
      "Uma lâmina ardente forjada no calor primordial da Soul Society.",
      "Um espírito de chamas purificadoras que consome o reishi dos inimigos.",
    ],
    skillNameSuffixes: ["Chamas Espirituais", "Corte Flamejante", "Dança do Fogo"],
  },
  ice: {
    prefixes: ["Hyou", "Yuki", "Kouri"],
    suffixes: ["ringetsu", "getsu", "boshi", "ken", "jin", "maru", "ya"],
    callPhrases: ["Congele", "Dance", "Sente sobre os céus congelados", "Congele sobre as nuvens"],
    bankaiPrefixes: ["Daiguren", "Hakka no", "Hyōketsu", "Sōren"],
    loreTemplates: [
      "Um espírito sereno das neves eternas, capaz de congelar a atmosfera com um único golpe.",
      "Um dragão de gelo etéreo que repousa nas geleiras espirituais da Soul Society.",
      "Uma dama glacial cuja elegância e frio absoluto congelam qualquer reiatsu hostil.",
    ],
    skillNameSuffixes: ["Lâmina Congelante", "Garras de Gelo", "Prisão Glacial"],
  },
  lightning: {
    prefixes: ["Rai", "Den", "Ikazuchi"],
    suffixes: ["ken", "jin", "getsu", "boshi", "maru", "ya"],
    callPhrases: ["Troveje", "Relampeje", "Rasgue os céus", "Ruge"],
    bankaiPrefixes: ["Raijin", "Tenjin", "Kōka", "Raidō"],
    loreTemplates: [
      "Um falcão de tempestade cintilante que rasga os céus com velocidade fulminante.",
      "Uma fera de trovão estalante imbuída com a fúria dos relâmpagos celestiais.",
      "Um relâmpago divino personificado que atinge o solo antes mesmo do trovão ecoar.",
    ],
    skillNameSuffixes: ["Golpe do Trovão", "Corte Relâmpago", "Lança de Raios"],
  },
  shadow: {
    prefixes: ["Kage", "Koku", "Yami"],
    suffixes: ["boshi", "getsu", "maru", "ken", "jin", "ya"],
    callPhrases: ["Devore", "Oculte-se", "Mergulhe na escuridão", "Sussurre"],
    bankaiPrefixes: ["Kokujō", "Kuroshiki", "Yami no", "Gen'ei"],
    loreTemplates: [
      "Uma criatura das sombras que espreita além da luz, consumindo a força vital alheia.",
      "Um espírito sombrio que desliza pelas trevas para decapitar sem deixar rastros.",
      "Uma névoa de escuridão viva que devora qualquer fagulha de esperança inimiga.",
    ],
    skillNameSuffixes: ["Corte das Sombras", "Abismo Espiritual", "Garras Obscuras"],
  },
  wind: {
    prefixes: ["Sen", "Kaze", "Fuu"],
    suffixes: ["jin", "maru", "getsu", "ya", "boshi", "ken"],
    callPhrases: ["Uive", "Corte", "Sopre", "Desperte"],
    bankaiPrefixes: ["Senbō", "Daishinpū", "Kamaitachi", "Fūjin"],
    loreTemplates: [
      "Um vendaval personificado que corta montanhas e uiva entre as árvores antigas.",
      "Um leopardo alado de ar comprimido que dilacera tudo em um único vórtice.",
      "Uma brisa cortante invisível que precede furacões devastadores.",
    ],
    skillNameSuffixes: ["Vendaval Cortante", "Lâminas de Vento", "Corte Ciclone"],
  },
  kido: {
    prefixes: ["Ten", "Shin", "Rei"],
    suffixes: ["gen", "ken", "boshi", "getsu", "jin", "maru"],
    callPhrases: ["Desperte", "Revele a verdade", "Brilhe", "Ressonai"],
    bankaiPrefixes: ["Kokujō", "Shin'ei", "Mugen", "Tengen"],
    loreTemplates: [
      "Uma entidade mística de geometria sagrada, canalizando encantamentos ancestrais de Kidō.",
      "Um avatar astral que manipula as leis do reiryoku e da realidade espiritual.",
      "Um espírito sábio de luz pura cujas palavras invocam fórmulas protetoras e destrutivas.",
    ],
    skillNameSuffixes: ["Ondas Espirituais", "Selo Espiritual", "Pulso de Kidō"],
  },
  earth: {
    prefixes: ["Gou", "Iwa", "Koku"],
    suffixes: ["ken", "maru", "getsu", "boshi", "jin", "ya"],
    callPhrases: ["Esmague", "Estremeça a terra", "Erga-se", "Rache a terra"],
    bankaiPrefixes: ["Fudō", "Daiji", "Gōgan", "Kōtetsu"],
    loreTemplates: [
      "Um guardião colossal de pedra inquebrável, firme como as muralhas do Seireitei.",
      "Um espírito telúrico capaz de erguer placas tectônicas e esmagar o solo espiritual.",
      "Um titã pétreo imperturbável cuja lâmina carrega o peso de montanhas inteiras.",
    ],
    skillNameSuffixes: ["Fenda Terrestre", "Impacto Sísmico", "Golpe Titânico"],
  },
  poison: {
    prefixes: ["Koku", "Doku", "Ja"],
    suffixes: ["maru", "ya", "boshi", "ken", "jin", "getsu"],
    callPhrases: ["Espalhe-se", "Devore", "Corroa", "Pique mortalmente"],
    bankaiPrefixes: ["Konjiki", "Dokusei", "Jashin", "Meidō"],
    loreTemplates: [
      "Uma serpente venenosa cujo miasma violeta dissolve armaduras e armas de reishi.",
      "Um escorpião espectral que inocula toxinas letais em cada golpe espiritual.",
      "Uma névoa ácida encarnada que se espalha silenciosamente pelo campo de batalha.",
    ],
    skillNameSuffixes: ["Névoa Tóxica", "Ferroada Corrosiva", "Veneno Espiritual"],
  },
};

/** Gera um número pseudo-aleatório no intervalo [0, 1). Se seed fornecida, é determinístico. */
function createRng(seed?: string): () => number {
  if (seed === undefined) return Math.random;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function pick<T>(list: readonly T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)];
}

/** Formata prefixos japoneses com macron canônico (ex: Hyou -> Hyō, Ryu -> Ryū). */
function formatJapanesePrefix(rawPrefix: string): string {
  return rawPrefix
    .replace("Hyou", "Hyō")
    .replace("Karyu", "Karyū")
    .replace("Ryu", "Ryū")
    .replace("Gou", "Gō")
    .replace("Fuu", "Fū");
}

/** Constrói o nome canônico da Shikai a partir do prefixo e sufixo. */
function buildShikaiName(rawPrefix: string, rawSuffix: string): string {
  // Casos especiais canônicos
  if (rawPrefix === "Ten" && (rawSuffix === "ken" || rawSuffix === "gen")) {
    return "Tengen";
  }
  if (rawPrefix === "Hyou" && rawSuffix === "ringetsu") {
    return "Hyōringetsu";
  }
  if (rawPrefix === "Karyu" && rawSuffix === "maru") {
    return "Karyūmaru";
  }

  const prefix = formatJapanesePrefix(rawPrefix);
  return `${prefix}${rawSuffix}`;
}

/** Gera o nome solene da Bankai correspondente à Shikai e afinidade. */
function buildBankaiName(shikaiName: string, affinity: SpiritAffinity, rawPrefix: string, rng: () => number): string {
  // Casos canônicos célebres de Bleach
  if (shikaiName === "Hyōringetsu" || shikaiName.startsWith("Hyō")) {
    return `Daiguren ${shikaiName}`;
  }
  if (shikaiName === "Tengen") {
    return "Kokujō Tengen Myō'ō";
  }
  if (shikaiName === "Karyūmaru") {
    return "Guren Karyūmaru";
  }

  const cfg = AFFINITY_DATA[affinity];
  const bankaiPre = pick(cfg.bankaiPrefixes, rng);

  if (affinity === "kido") {
    return `${bankaiPre} ${shikaiName} Myō'ō`;
  }
  if (bankaiPre.endsWith("no")) {
    return `${bankaiPre} ${shikaiName}`;
  }
  return `${bankaiPre} ${shikaiName}`;
}

/** Constrói a habilidade suprema da Bankai com efeitos elementais temáticos e multiplicador épico. */
export function buildDefaultBankaiSkill(bankaiName: string, affinity: SpiritAffinity): BankaiSkill {
  const configs: Record<
    SpiritAffinity,
    { suffix: string; power: number; reiCost: number; cd: number; area: number; status?: SkillStatusDef; desc: string }
  > = {
    fire: {
      suffix: "Gōka Gokuen",
      power: 9.5,
      reiCost: 85,
      cd: 25,
      area: 3,
      status: { kind: "dot", durationMs: 5000, dotRatio: 0.35, tickMs: 1000 },
      desc: `Manifesta o calor primordial da ${bankaiName}, incinerando os inimigos com chamas infernais purificadoras.`,
    },
    ice: {
      suffix: "Hyōketsu Jigoku",
      power: 9.0,
      reiCost: 85,
      cd: 25,
      area: 3,
      status: { kind: "freeze", durationMs: 3500 },
      desc: `Desperta a frieza absoluta da ${bankaiName}, congelando a atmosfera e imobilizando os inimigos.`,
    },
    lightning: {
      suffix: "Raidō Tenbatsu",
      power: 9.5,
      reiCost: 80,
      cd: 22,
      area: 2,
      status: { kind: "stun", durationMs: 3000 },
      desc: `Evoca o trovão divino da ${bankaiName}, fulminando a área e paralisando os alvos com carga elétrica.`,
    },
    shadow: {
      suffix: "Kokujō Kagebōshi",
      power: 9.2,
      reiCost: 85,
      cd: 25,
      area: 2,
      status: { kind: "slow", durationMs: 5000, slowMult: 2.0 },
      desc: `Mergulha o campo no abismo escuro da ${bankaiName}, drenando os movimentos vitais dos inimigos.`,
    },
    wind: {
      suffix: "Senbō Kamaitachi",
      power: 8.8,
      reiCost: 75,
      cd: 20,
      area: 3,
      status: { kind: "slow", durationMs: 4000, slowMult: 1.8 },
      desc: `Desencadeia lâminas de ar comprimido em tufão devastador com a ${bankaiName}.`,
    },
    kido: {
      suffix: "Mugen Hōin",
      power: 9.8,
      reiCost: 90,
      cd: 28,
      area: 3,
      status: { kind: "stun", durationMs: 3000 },
      desc: `Invoca o selo cósmico supremo da ${bankaiName}, paralisando e desintegrando o reishi inimigo.`,
    },
    earth: {
      suffix: "Fudō Gōgan",
      power: 9.6,
      reiCost: 85,
      cd: 25,
      area: 2,
      status: { kind: "stun", durationMs: 3200 },
      desc: `Provoca um abalo sísmico cataclísmico sob a força titânica da ${bankaiName}.`,
    },
    poison: {
      suffix: "Konjiki Dokumori",
      power: 8.8,
      reiCost: 80,
      cd: 22,
      area: 3,
      status: { kind: "dot", durationMs: 6000, dotRatio: 0.4, tickMs: 1000 },
      desc: `Libera um miasma tóxico letal e corrosivo emanado pela ${bankaiName}.`,
    },
  };

  const cfg = configs[affinity];
  const skillName = `${bankaiName}: ${cfg.suffix}`;
  const skillId = `bankai_${bankaiName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  return {
    id: skillId,
    name: skillName,
    element: affinity,
    power: cfg.power,
    reiCost: cfg.reiCost,
    cooldownSec: cfg.cd,
    area: cfg.area,
    status: cfg.status,
    desc: cfg.desc,
  };
}

/** Obtém a BankaiSkill da Zanpakutō, gerando-a deterministamente se não existir no objeto. */
export function getBankaiSkill(z: ZanpakutoSpirit): BankaiSkill {
  return z.bankaiSkill ?? buildDefaultBankaiSkill(z.bankaiName, z.affinity);
}

/**
 * Algoritmo gerador determinístico/aleatório de Zanpakutō espiritual (JH-03 e JH-06).
 * Se `seed` for fornecida, sempre retorna exatamente o mesmo espírito.
 */
export function generateZanpakuto(seed?: string): ZanpakutoSpirit {
  const rng = createRng(seed);

  const affinity = pick(SPIRIT_AFFINITIES, rng);
  const cfg = AFFINITY_DATA[affinity];

  const rawPrefix = pick(cfg.prefixes, rng);
  const rawSuffix = pick(cfg.suffixes, rng);
  const shikaiName = buildShikaiName(rawPrefix, rawSuffix);

  const callPhrase = pick(cfg.callPhrases, rng);
  const bankaiName = buildBankaiName(shikaiName, affinity, rawPrefix, rng);
  const spiritLore = pick(cfg.loreTemplates, rng);

  const skillSuffix = pick(cfg.skillNameSuffixes, rng);
  const skillName = `${shikaiName}: ${skillSuffix}`;
  const skillId = `shikai_${shikaiName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  const bankaiSkill = buildDefaultBankaiSkill(bankaiName, affinity);

  return {
    shikaiName,
    callPhrase,
    bankaiName,
    affinity,
    spiritLore,
    shikaiSkill: {
      id: skillId,
      name: skillName,
      element: affinity,
      power: 3.5,
      reiCost: 35,
      cooldownSec: 6,
      desc: `Manifesta o poder da ${shikaiName}, desferindo dano devastador do elemento ${affinity}.`,
    },
    bankaiSkill,
  };
}

/** Formata a frase solene de liberação da Shikai (ex: '"Uive, Karyūmaru!"'). */
export function formatZanpakutoRelease(z: ZanpakutoSpirit): string {
  return `${z.callPhrase}, ${z.shikaiName}!`;
}

/** Formata o anúncio solene da Bankai no servidor. */
export function formatBankaiRelease(z: ZanpakutoSpirit, playerName: string): string {
  return `${playerName} liberou sua Bankai: "${z.bankaiName}"!`;
}

/** Converte o golpe Shikai da Zanpakutō em uma definição compatível com a engine de técnicas. */
export function zanpakutoToSkillDef(z: ZanpakutoSpirit): SkillDef {
  const colors: Record<SpiritAffinity, number> = {
    fire: 0xff4500,
    ice: 0x9fe8ff,
    lightning: 0xffd700,
    shadow: 0x6a0dad,
    wind: 0x00ff7f,
    kido: 0x4169e1,
    earth: 0xd2691e,
    poison: 0x9932cc,
  };

  return {
    name: z.shikaiSkill.name,
    range: 4,
    cost: z.shikaiSkill.reiCost,
    mult: z.shikaiSkill.power,
    cdMs: z.shikaiSkill.cooldownSec * 1000,
    color: colors[z.affinity] ?? 0xffffff,
    minLevel: 1,
    area: z.affinity === "wind" || z.affinity === "fire" || z.affinity === "ice" ? 1 : 0,
  };
}

/** Converte a técnica suprema da Bankai em uma definição compatível com a engine de combate (Slot 6). */
export function zanpakutoToBankaiSkillDef(z: ZanpakutoSpirit): SkillDef {
  const colors: Record<SpiritAffinity, number> = {
    fire: 0xff2200,
    ice: 0xd0f0ff,
    lightning: 0xffea00,
    shadow: 0x4b0082,
    wind: 0x00fa9a,
    kido: 0x1e90ff,
    earth: 0x8b4513,
    poison: 0x800080,
  };

  const b = getBankaiSkill(z);

  return {
    name: b.name,
    range: 6,
    cost: b.reiCost,
    mult: b.power,
    cdMs: b.cooldownSec * 1000,
    color: colors[z.affinity] ?? 0xffffff,
    minLevel: 100,
    area: b.area ?? 2,
    status: b.status,
  };
}

/** Valida se o personagem preenche os requisitos para o Desafio do Tenshintai (Nível 100 e Oficial Promovido). */
export function canAwakenBankai(player: { level: number; prog?: { promotedRank?: boolean; bankaiAwakened?: boolean } }): { ok: boolean; reason?: string } {
  if (player.level < 100) {
    return { ok: false, reason: "O Desafio do Tenshintai exige nível 100." };
  }
  if (!player.prog?.promotedRank) {
    return { ok: false, reason: "Apenas oficiais promovidos pelo Seireitei podem usar o Tenshintai." };
  }
  if (player.prog?.bankaiAwakened) {
    return { ok: false, reason: "Você já despertou sua Bankai." };
  }
  return { ok: true };
}

/** Valida se o personagem pode prestar o Exame de Aptidão de Capitão (Taichō Shiken). */
export function canTakeCaptainExam(player: { level: number; prog?: { bankaiAwakened?: boolean; captainRank?: boolean } }): { ok: boolean; reason?: string } {
  if (player.level < 100) {
    return { ok: false, reason: "O Exame de Capitão exige nível 100." };
  }
  if (!player.prog?.bankaiAwakened) {
    return { ok: false, reason: "Você precisa comprovar o despertar da Bankai diante da 1ª Divisão." };
  }
  if (player.prog?.captainRank) {
    return { ok: false, reason: "Você já foi graduado a Capitão do Gotei 13." };
  }
  return { ok: true };
}

export type MilitaryRank = "Recruta" | "Oficial" | "Capitão";

/** Determina o título militar do personagem ('Recruta', 'Oficial' ou 'Capitão'). */
export function getMilitaryRank(p: any): MilitaryRank {
  if (!p) return "Recruta";
  const captain = Boolean(p.prog?.captainRank ?? p.captainRank);
  if (captain) return "Capitão";
  const promoted = Boolean(p.prog?.promotedRank ?? p.promotedRank);
  if (promoted) return "Oficial";
  return "Recruta";
}

/** Verifica se o personagem possui permissão de viagem dimensional para o Palácio Real. */
export function hasDimensionalTravelPermission(prog?: { captainRank?: boolean }): boolean {
  return Boolean(prog?.captainRank);
}
