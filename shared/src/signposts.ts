import { chebyshev } from "./formulas";
import { INTERACT_RANGE } from "./items";
import type { KarakuraSectorId } from "./sectors";

export type SignpostCategory = "direction" | "lore" | "hint" | "warning";

export interface SignpostDef {
  id: string;
  map: string;
  x: number;
  y: number;
  title: string;
  text: string;
  category: SignpostCategory;
  sectorId: KarakuraSectorId;
  icon?: string;
}

export const KARAKURA_SIGNPOSTS: SignpostDef[] = [
  {
    id: "sign_spawn_crossroad",
    map: "karakura",
    x: 15,
    y: 15,
    title: "Encruzilhada do Despertar",
    category: "direction",
    sectorId: "setor_1",
    icon: "sign_direction",
    text: "↑ NORTE: Centro Comercial, Loja Urahara & Senkaimon\n← OESTE: Clínica Kurosaki & Distrito Residencial\n↓ SUL: Parque Beira-Rio Onagawa\n\n[Dica do Recruta]: Almas humanas vagueiam tranquilas por aqui. Treine suas técnicas de ataque antes de cruzar para os setores mais profundos.",
  },
  {
    id: "sign_clinic_kurosaki",
    map: "karakura",
    x: 23,
    y: 19,
    title: "Clínica Kurosaki - 24 Horas",
    category: "lore",
    sectorId: "setor_1",
    icon: "sign_lore",
    text: "Clínica Médica Kurosaki: 'Atendimento geral, fraturas e ocorrências insólitas.'\n\n[Arquivo Espiritual]: O médico responsável possui uma presença física fora do comum. Moradores relatam que seu filho mais velho, de cabelos ruivos, conversa com espíritos errantes desde a infância.",
  },
  {
    id: "sign_urahara_senkaimon",
    map: "karakura",
    x: 17,
    y: 11,
    title: "Loja Urahara & Senkaimon Dimensional",
    category: "direction",
    sectorId: "setor_2",
    icon: "sign_direction",
    text: "LOJA DE CONVENIÊNCIA URAHARA: 'Doces, balas espirituais e soluções para Shinigamis.'\nPORTÃO SENKAIMON: Travessia oficial para a Soul Society (Seireitei) e dimensões conectadas.\n\n[Aviso]: Não tente forçar o portão sem a convocação oficial do Gotei 13 ou o nível necessário.",
  },
  {
    id: "sign_training_grove",
    map: "karakura",
    x: 36,
    y: 11,
    title: "Campo de Treinamento da Floresta Leste",
    category: "hint",
    sectorId: "setor_2",
    icon: "sign_hint",
    text: "CAMPO DE TREINAMENTO SUBURBANO (Lv 10-18)\n\n[Dica de Exploração]: Hollows sombrios atacam em grupo. Mantenha Poções de Cura à mão.\n[Segredo Local]: Dizem que caixas de tesouro foram escondidas atrás das antigas copas de zelkova desta clareira.",
  },
  {
    id: "sign_onagawa_bridge",
    map: "karakura",
    x: 18,
    y: 38,
    title: "Parque Beira-Rio Onagawa & Ponte",
    category: "direction",
    sectorId: "setor_3",
    icon: "sign_direction",
    text: "PARQUE BEIRA-RIO ONAGAWA (Lv 18-25)\n\n← Travessia da Ponte de Karakura\n→ Estrada das Indústrias & Zona Portuária Fluvial\n\n[Alerta Aquático]: Hollows de carapaça grossa emergem das águas turvas. Certifique-se de que sua Zanpakutō está afiada.",
  },
  {
    id: "sign_river_memorial",
    map: "karakura",
    x: 26,
    y: 40,
    title: "Memorial das Almas sob a Chuva",
    category: "lore",
    sectorId: "setor_3",
    icon: "sign_lore",
    text: "MEMORIAL DO RIO ONAGAWA\n\n'Neste beira-rio, sob uma chuva torrencial do sexto mês, vidas foram ceifadas pela criatura que atrai almas com a isca de uma menina perdida.'\n\n[Crônica]: O nome do predador é Grand Fisher. Uma promessa solene de retribuição espiritual permanece gravada nesta margem.",
  },
  {
    id: "sign_industrial_warning",
    map: "karakura",
    x: 42,
    y: 28,
    title: "Periferia Industrial - ALERTA MÁXIMO",
    category: "warning",
    sectorId: "setor_4",
    icon: "sign_warning",
    text: "ZONA FABRIL ABANDONADA - NÍVEL 25 A 30 RECOMENDADO\n\n[Gotei 13 - Ordem de Vigilância]: Galpões desativados ocupados por Hollows devoradores e predadores famintos.\n[Jornada do Herói]: Ao atingir o ápice do treinamento neste setor (Lv 30), a borboleta do inferno transmitirá a Convocação Oficial do Seireitei!",
  },
  {
    id: "sign_fisher_lair",
    map: "karakura",
    x: 53,
    y: 39,
    title: "Limiar dos Predadores - Toca Oculta",
    category: "warning",
    sectorId: "setor_4",
    icon: "sign_warning",
    text: "TOCA DO GRAND FISHER - PONTO CRÍTICO DE KARAKURA\n\n[Atenção]: Você está às portas da toca do predador ancestral.\n[Dica de Exploração]: Vasculhe os escombros metálicos da sucata industrial. Caixas de suprimento raras foram abandonadas por fugitivos.",
  },
];

export function signpostById(id: string): SignpostDef | undefined {
  return KARAKURA_SIGNPOSTS.find((s) => s.id === id);
}

export function signpostAt(map: string, x: number, y: number): SignpostDef | undefined {
  return KARAKURA_SIGNPOSTS.find((s) => s.map === map && s.x === x && s.y === y);
}

export function signpostsInSector(sectorId: string): SignpostDef[] {
  return KARAKURA_SIGNPOSTS.filter((s) => s.sectorId === sectorId);
}

export function signpostNear(map: string, x: number, y: number, maxDist = INTERACT_RANGE): SignpostDef | undefined {
  return KARAKURA_SIGNPOSTS.find((s) => s.map === map && chebyshev(x, y, s.x, s.y) <= maxDist);
}
