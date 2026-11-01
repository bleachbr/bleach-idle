// Loja de Cristais: moeda premium da conta (vale para todos os personagens) e cosméticos.
// Nada aqui dá vantagem em combate: é visual, título e história do mundo.

export type CosKind = "aura" | "fx" | "title" | "name" | "pet" | "outfit" | "lore";

export interface Cosmetic {
  id: string;
  kind: CosKind;
  name: string;
  price: number;
  /** texto de lore mostrado na loja */
  desc: string;
  /** cor principal (aura, técnica, nome, borboleta, título) */
  color: number;
  /** aura: faíscas subindo; técnica: cor do rastro */
  color2?: number;
  /** crônica: o texto que a compra libera para ler (e o título que vem junto) */
  text?: string[];
  title?: string;
  /** traje: o visual que troca a folha da forma base (<base>__<look>, OUTFIT_OK em data.ts) */
  look?: string;
  /** prêmio do passe de temporada: não se compra */
  season?: boolean;
}

export const COS_KINDS: { kind: CosKind; label: string; hint: string }[] = [
  { kind: "aura", label: "Auras", hint: "Troca a cor e o brilho da aura em volta do personagem (aparece em qualquer título de Poder)." },
  { kind: "fx", label: "Técnicas", hint: "Muda a cor e o rastro de todas as técnicas. Só visual: o dano é o mesmo." },
  { kind: "title", label: "Títulos", hint: "Um título acima do nome, que todos veem." },
  { kind: "name", label: "Nomes", hint: "Cor do nome em cima do personagem." },
  { kind: "pet", label: "Borboletas", hint: "Uma borboleta do inferno que acompanha você pelo mapa." },
  { kind: "outfit", label: "Trajes", hint: "Troca a roupa do personagem na forma base, no lugar do visual do equipamento. Ao liberar a lâmina, a forma liberada aparece como sempre." },
  { kind: "lore", label: "Crônicas", hint: "Pedaços da história do mundo. Cada crônica lida dá um título." },
];

const c = (id: string, kind: CosKind, name: string, price: number, color: number, desc: string, extra: Partial<Cosmetic> = {}): Cosmetic =>
  ({ id, kind, name, price, color, desc, ...extra });

export const COSMETICS: Cosmetic[] = [
  // auras
  c("aura_negra", "aura", "Reiatsu Negro", 180, 0x2a0010, "A pressão espiritual de quem já perdeu o controle uma vez e voltou mais forte.", { color2: 0xff2040 }),
  c("aura_sakura", "aura", "Mil Pétalas", 220, 0xff7ab8, "Dizem que um nobre de Seireitei deixa pétalas no ar por onde passa.", { color2: 0xffd0e6 }),
  c("aura_gelo", "aura", "Céu Congelado", 220, 0x7ad8ff, "O frio de uma lâmina que congela até o vento.", { color2: 0xe6f8ff }),
  c("aura_chamas", "aura", "Chama Primordial", 300, 0xff6a1a, "O fogo mais antigo do Gotei 13 nunca se apagou por completo.", { color2: 0xffd34a }),
  c("aura_hollow", "aura", "Máscara Interior", 260, 0x8a2aff, "O que vive atrás da máscara também quer aparecer.", { color2: 0x2a0040 }),
  c("aura_quincy", "aura", "Reishi Azul", 200, 0x4a8aff, "Partículas espirituais puxadas do próprio ar, como fazem os Quincy.", { color2: 0xbfe0ff }),
  c("aura_rei", "aura", "Luz do Palácio", 500, 0xfff2b0, "Um brilho que só se vê perto do Palácio do Rei.", { color2: 0xffffff }),
  // técnicas
  c("fx_negro", "fx", "Golpe Negro", 160, 0x200008, "Toda técnica sai escura, com borda vermelha.", { color2: 0xff2040 }),
  c("fx_chamas", "fx", "Golpe Flamejante", 160, 0xff5a10, "As técnicas deixam um rastro de fogo.", { color2: 0xffd34a }),
  c("fx_gelo", "fx", "Golpe Glacial", 160, 0x9ae8ff, "Gelo em cada golpe.", { color2: 0xffffff }),
  c("fx_raio", "fx", "Golpe Relâmpago", 200, 0xfff04a, "Como um raio que cai antes do trovão.", { color2: 0x6ab8ff }),
  c("fx_vazio", "fx", "Golpe do Vazio", 240, 0xb04aff, "Energia de Hueco Mundo dobrada à sua vontade.", { color2: 0x30ff9a }),
  // títulos
  c("tit_substituto", "title", "Shinigami Substituto", 60, 0xff8a3a, "Para quem defende a cidade sem ter nascido para isso."),
  c("tit_visored", "title", "Visored", 120, 0xc26aff, "Metade Shinigami, metade outra coisa."),
  c("tit_espada", "title", "Espada nº 0", 160, 0xe6e6e6, "O número que ninguém quer enfrentar."),
  c("tit_kenpachi", "title", "O Mais Forte", 200, 0xffd34a, "Quem carrega esse nome luta só pela luta."),
  c("tit_guardiao", "title", "Guardião de Karakura", 80, 0x6aff9a, "A cidade dorme tranquila porque alguém vigia."),
  // nomes
  c("nome_ouro", "name", "Nome Dourado", 50, 0xffd34a, "Seu nome em ouro."),
  c("nome_sangue", "name", "Nome Carmesim", 50, 0xff4a5a, "Seu nome em vermelho-sangue."),
  c("nome_gelo", "name", "Nome Gélido", 50, 0x9ae8ff, "Seu nome em azul-gelo."),
  c("nome_vazio", "name", "Nome do Vazio", 70, 0xc26aff, "Seu nome em roxo de Hueco Mundo."),
  // borboletas
  c("pet_inferno", "pet", "Borboleta do Inferno", 150, 0x18101a, "A mensageira negra que guia as almas entre os mundos.", { color2: 0xff3050 }),
  c("pet_dourada", "pet", "Borboleta Dourada", 250, 0xffd34a, "Rara: dizem que só aparece para quem já chegou ao topo.", { color2: 0xfff2b0 }),
  c("pet_gelo", "pet", "Borboleta de Gelo", 200, 0x9ae8ff, "Feita de reiatsu congelado, nunca derrete.", { color2: 0xffffff }),
  // trajes (R-13): valem na forma base; quem já é capitão não tem outro haori para vestir
  c("traje_karakura", "outfit", "Uniforme do Colégio Karakura", 150, 0xb8bcc8, "O blazer cinza da escola de Karakura. Muito Shinigami já se escondeu nele.", { color2: 0xd03040, look: "karakura" }),
  c("traje_capitao", "outfit", "Haori de Capitão", 250, 0xffffff, "O haori branco de quem comanda uma divisão. Os capitães de verdade já vestem o deles.", { color2: 0x202020, look: "capitao" }),
  c("traje_vizard", "outfit", "Máscara Vizard", 300, 0xe6e6e6, "A máscara de quem aprendeu a usar o Hollow interior sem se perder nele.", { color2: 0xd02030, look: "vizard" }),
  // prêmios do passe de temporada (não estão à venda)
  c("aura_eclipse", "aura", "Aura do Eclipse", 0, 0x3a1a6a, "Prêmio do nível 10 do passe de temporada.", { color2: 0xffb04a, season: true }),
  c("tit_temporada", "title", "Veterano da Temporada", 0, 0xffb04a, "Prêmio do nível 20 do passe de temporada.", { season: true }),
  c("pet_eclipse", "pet", "Borboleta do Eclipse", 0, 0x3a1a6a, "Prêmio do nível 30 do passe de temporada.", { color2: 0xffb04a, season: true }),
  // títulos de marcos do servidor (W-06: concedidos apenas ao primeiro do servidor em cada feito)
  c("tit_primeiro_bankai", "title", "Primeiro Bankai", 0, 0xff6a3a, "Concedido ao primeiro guerreiro do servidor a liberar a 2ª forma.", { season: true }),
  c("tit_primeiro_capitao", "title", "Primeiro Capitão", 0, 0xffd34a, "Concedido ao primeiro guerreiro do servidor a alcançar o nível 60.", { season: true }),
  c("tit_primeiro_renascido", "title", "Primeiro Renascido", 0, 0xc26aff, "Concedido ao primeiro guerreiro do servidor a realizar o Renascimento.", { season: true }),
  c("tit_pioneiro_dangai", "title", "Pioneiro do Dangai", 0, 0x7ad8ff, "Concedido ao primeiro guerreiro do servidor a limpar o andar 10 do Dangai.", { season: true }),
  c("tit_terror_arena", "title", "Campeão da Arena", 0, 0xff4a5a, "Concedido ao primeiro guerreiro do servidor a alcançar 10 abates em PvP.", { season: true }),
  c("tit_regicida", "title", "Regicida Quincy", 0, 0xfff2b0, "Concedido ao primeiro guerreiro do servidor a derrotar Yhwach.", { season: true }),
  // títulos das Crônicas Semanais do Seireitei (M1-08)
  c("tit_shakonmaku", "title", "Guardião do Shakonmaku", 0, 0x6aff9a, "Concedido na Crônica Semanal: A Invasão dos Ryoka.", { season: true }),
  c("tit_soukyoku", "title", "Testemunha do Soukyoku", 0, 0xc26aff, "Concedido na Crônica Semanal: O Julgamento do Soukyoku & A Traição de Aizen.", { season: true }),
  c("tit_pilares", "title", "Defensor dos Pilares", 0, 0x7ad8ff, "Concedido na Crônica Semanal: Batalha de Karakura Falsa.", { season: true }),
  c("tit_cinzas_primeira", "title", "Cinzas da Primeira Divisão", 0, 0xff6a1a, "Concedido na Crônica Semanal: A Guerra Sangrenta dos Mil Anos.", { season: true }),
  c("tit_arquivista", "title", "Arquivista do Passado", 0, 0xffd34a, "Concedido na Crônica Semanal: Turn Back the Pendulum.", { season: true }),
  // crônicas
  c("lore_karakura", "lore", "Crônica: A Cidade Quieta", 40, 0xbfe9ff, "Por que tantos Hollows aparecem em Karakura.", {
    title: "Cronista de Karakura",
    text: [
      "Karakura parece uma cidade comum: escola, rio, praça e um lojista estranho que vende balas e mistérios. Mas a cidade fica num ponto onde a parede entre os mundos é fina.",
      "Almas que se perdem ali demoram a seguir adiante, e almas perdidas atraem Hollows. Por isso as ruas de Karakura veem mais caçadas do que qualquer outro lugar do mundo dos vivos.",
      "Quem caça em Karakura aprende cedo: o perigo não vem de longe. Ele nasce das próprias saudades da cidade.",
    ],
  }),
  c("lore_hueco", "lore", "Crônica: O Deserto Branco", 60, 0xe6e6e6, "O que existe em Hueco Mundo.", {
    title: "Andarilho do Deserto",
    text: [
      "Hueco Mundo é uma noite que nunca acaba sobre areia branca. A lua não se mexe, e as árvores são de quartzo.",
      "Os Hollows ali devoram uns aos outros para crescer. Os que comem o bastante viram Menos; os poucos que mantêm a mente no meio da fome viram algo pior.",
      "Os que tiram a máscara ganham forma quase humana e um número. Quanto menor o número, maior o perigo.",
    ],
  }),
  c("lore_dangai", "lore", "Crônica: O Corredor Entre Mundos", 60, 0x9a7aff, "Os segredos do Dangai.", {
    title: "Viajante do Dangai",
    text: [
      "Entre a Soul Society e o mundo dos vivos corre o Dangai, um corredor onde o tempo anda diferente.",
      "As paredes vivas do corredor engolem quem para no meio do caminho. Por isso as borboletas do inferno guiam os viajantes: elas sabem a saída.",
      "Alguns guerreiros entram de propósito, andar por andar, para treinar onde ninguém pode ajudá-los.",
    ],
  }),
  c("lore_formas", "lore", "Crônica: As Três Liberações", 80, 0xff6a3a, "Por que a lâmina muda de forma.", {
    title: "Mestre das Liberações",
    text: [
      "Toda lâmina espiritual tem um nome, e quem o descobre libera a primeira forma. É uma conversa entre o guerreiro e a própria alma.",
      "A segunda liberação exige que o espírito da lâmina apareça de verdade e seja vencido. Leva anos para a maioria, e uma vida inteira para muitos.",
      "Da terceira quase não se fala. Quem chega lá costuma pagar um preço que não aparece no corpo.",
    ],
  }),
  c("lore_rei", "lore", "Crônica: O Palácio no Céu", 120, 0xfff2b0, "Quem segura os três mundos.", {
    title: "Guardião do Segredo",
    text: [
      "Acima da Soul Society existe um palácio que poucos viram. Dentro dele está quem mantém os três mundos separados.",
      "A Guarda Real protege o palácio e não desce por pouca coisa. Quando desce, todos sabem que algo grande está para acontecer.",
      "Os mais velhos dizem que o equilíbrio do mundo é frágil, e que cada Hollow purificado ajuda a segurá-lo mais um dia.",
    ],
  }),
];

export const COSMETIC = Object.fromEntries(COSMETICS.map((x) => [x.id, x])) as Record<string, Cosmetic>;

/** Cosméticos equipados num personagem (um por tipo; crônica não se equipa, o título dela vai em "title"). */
export type CosEquip = Partial<Record<Exclude<CosKind, "lore">, string>>;

/** Título equipado: um título comprado ou o de uma crônica lida ("lore_x"). */
export function titleText(id: string | undefined): string {
  const x = id ? COSMETIC[id] : undefined;
  return !x ? "" : x.kind === "lore" ? x.title ?? "" : x.kind === "title" ? x.name : "";
}

/** Cristais grátis: recompensa diária e conquistas também pagam um pouco. */
export const FREE_CRYSTALS = { daily: 5, daily7: 25, achievement: 10 };
