"""AI Blueprint Generator para Mapas 2.5D do Bleach Idle (Tarefa JH-04).

Define o modelo de dados semântico do mapa (terrenos, rios, pontes, elevações,
prédios, baús e spawns) e implementa a geração via prompt estruturado para LLM
(Gemini) com fallback canônico e determinístico para Karakura Expandida e
Rukongai Distrito 1 (Junrinan).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class Bridge:
    """Ponte sobre o curso d'água com permissão explícita de travessia."""

    id: str
    x: int  # Coordenada em tiles
    y: int
    width: int
    height: int
    orientation: str = "horizontal"  # "horizontal" | "vertical"
    material: str = "concrete"  # "concrete" | "wood" | "stone"


@dataclass
class RiverPath:
    """Curso do rio com pontos de controle e largura média."""

    name: str
    points: List[Tuple[int, int]]  # [(x0, y0), (x1, y1), ...]
    width: int = 4
    water_type: str = "freshwater"  # "freshwater" | "spiritual_stream"


@dataclass
class Landmark:
    """Edifício ou estrutura marcante no mapa."""

    id: str
    name: str
    kind: str  # "clinic" | "shop" | "house" | "apartment" | "dojo" | "shrine" | "barracks"
    x: int  # Posição do canto superior esquerdo em pixels
    y: int
    width: int
    height: int
    solid_footprint: Tuple[int, int, int, int] = (0, 0, 0, 0)  # (rel_x, rel_y, w, h)
    image: str = ""


@dataclass
class Chest:
    """Baú de tesouro interativo com metadata de loot e nível de segredo."""

    id: str
    x: int  # Posição central em pixels (múltiplo de 32 ou ajustado para base)
    y: int
    loot_tier: str = "bronze"  # "bronze" | "silver" | "gold" | "spiritual"
    secret_level: int = 1  # 1 (visível) a 3 (escondido atrás de props)
    description: str = ""
    interact_kind: str = "chest"


@dataclass
class PropDef:
    """Elemento decorativo/ambiental do cenário (árvores, postes, lanternas)."""

    id: str
    kind: str  # "tree" | "lamp" | "lantern" | "fence" | "bench" | "rock"
    x: int  # Posição em pixels
    y: int
    width: int
    height: int
    image: str = ""


@dataclass
class SpawnPoint:
    """Ponto ou zona de spawn de jogador ou monstros."""

    id: str
    kind: str  # "player_spawn" | "mob_patrol" | "pz" | "boss"
    x: int
    y: int
    width: int = 32
    height: int = 32
    mob_type: Optional[str] = None
    level_range: Tuple[int, int] = (1, 5)


@dataclass
class ElevationCliff:
    """Desnível de terreno 2.5D com escadaria de acesso."""

    id: str
    level: int  # 0 = base ground, 1 = plateau/elevation
    wall_tiles: List[Tuple[int, int]]  # Células da parede vertical do cliff
    stairs: List[Tuple[int, int]]  # Células transitáveis da escada/rampa


@dataclass
class MapBlueprint:
    """Blueprint semântico completo gerado pela IA ou canônico."""

    map_id: str
    name: str
    biome: str  # "karakura" | "rukongai" | "seireitei" | "hueco_mundo"
    width: int  # Largura em tiles (32px por tile)
    height: int  # Altura em tiles
    tile_size: int = 32
    regions: Dict[str, Any] = field(default_factory=dict)
    river: Optional[RiverPath] = None
    bridges: List[Bridge] = field(default_factory=list)
    landmarks: List[Landmark] = field(default_factory=list)
    props: List[PropDef] = field(default_factory=list)
    chests: List[Chest] = field(default_factory=list)
    spawns: List[SpawnPoint] = field(default_factory=list)
    elevations: List[ElevationCliff] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Serializa o blueprint para dicionário."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> MapBlueprint:
        """Reconstrói um MapBlueprint a partir de um dicionário serializado."""
        river = RiverPath(**data["river"]) if data.get("river") else None
        bridges = [Bridge(**b) for b in data.get("bridges", [])]
        landmarks = [Landmark(**l) for l in data.get("landmarks", [])]
        props = [PropDef(**p) for p in data.get("props", [])]
        chests = [Chest(**c) for c in data.get("chests", [])]
        spawns = [
            SpawnPoint(
                id=s["id"],
                kind=s["kind"],
                x=s["x"],
                y=s["y"],
                width=s.get("width", 32),
                height=s.get("height", 32),
                mob_type=s.get("mob_type"),
                level_range=tuple(s.get("level_range", (1, 5))),  # type: ignore
            )
            for s in data.get("spawns", [])
        ]
        elevations = [
            ElevationCliff(
                id=e["id"],
                level=e["level"],
                wall_tiles=[tuple(t) for t in e.get("wall_tiles", [])],  # type: ignore
                stairs=[tuple(t) for t in e.get("stairs", [])],  # type: ignore
            )
            for e in data.get("elevations", [])
        ]

        return cls(
            map_id=data["map_id"],
            name=data["name"],
            biome=data["biome"],
            width=data["width"],
            height=data["height"],
            tile_size=data.get("tile_size", 32),
            regions=data.get("regions", {}),
            river=river,
            bridges=bridges,
            landmarks=landmarks,
            props=props,
            chests=chests,
            spawns=spawns,
            elevations=elevations,
        )

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    @classmethod
    def from_json(cls, json_str: str) -> MapBlueprint:
        return cls.from_dict(json.loads(json_str))


# -----------------------------------------------------------------------------
# Prompt Estruturado para o Gemini
# -----------------------------------------------------------------------------

GEMINI_MAP_SYSTEM_PROMPT = """Você é o Arquiteto de Cenários 2.5D do jogo Bleach Idle.
Sua missão é conceber um blueprint semântico detalhado para um novo mapa em perspectiva 2.5D (estilo Pokémon Omega Ruby).
O mapa deve respeitar rigorosamente a escala de células de 32x32 pixels, a proporção do lore de Bleach e a integridade de rotas jogáveis.

Diretrizes obrigatórias:
1. Dimensões: normalmente entre 64x48 e 80x60 tiles.
2. Cursos d'água (se houver): definir o fluxo contínuo e a localização exata das pontes para garantir navegação entre margens.
3. Desníveis de terreno (elevations): relevos elevados devem ter escadas transitáveis para interligação.
4. Landmarks & Casas: coordenadas lógicas com espaço suficiente para pedestres circularem ao redor.
5. Baús de Tesouro (chests): espalhar de 2 a 5 baús pelo mapa, alguns visíveis e outros escondidos atrás de árvores ou prédios, sempre com pelo menos 1 lado livre para o jogador alcançar.
6. Spawns e Áreas Seguras: definir ponto de entrada do jogador (player_spawn) e zonas de patrulha de Hollows ou Shinigamis.

A resposta deve ser estritamente um JSON válido correspondente ao esquema MapBlueprint.
"""


def build_gemini_prompt(biome: str, custom_instructions: str = "") -> str:
    """Monta o prompt para o Gemini gerar o blueprint."""
    return f"""Crie o blueprint semântico para o bioma '{biome}' em Bleach Idle.
Instruções específicas:
{custom_instructions}

Gere o JSON seguindo exatamente esta estrutura:
{{
  "map_id": "{biome}_expanded",
  "name": "Nome Canônico",
  "biome": "{biome}",
  "width": 64,
  "height": 48,
  "tile_size": 32,
  "regions": {{
    "roads": [[x, y, w, h]],
    "plazas": [[x, y, w, h]]
  }},
  "river": {{
    "name": "Nome do Rio",
    "points": [[x, y]],
    "width": 4,
    "water_type": "freshwater"
  }},
  "bridges": [
    {{"id": "bridge-1", "x": 20, "y": 30, "width": 4, "height": 6, "orientation": "vertical", "material": "concrete"}}
  ],
  "landmarks": [
    {{"id": "building-1", "name": "Nome", "kind": "clinic", "x": 500, "y": 400, "width": 224, "height": 192}}
  ],
  "props": [
    {{"id": "tree-1", "kind": "tree", "x": 200, "y": 300, "width": 64, "height": 80}}
  ],
  "chests": [
    {{"id": "chest-1", "x": 220, "y": 310, "loot_tier": "silver", "secret_level": 2, "description": "Baú atrás do bosque"}}
  ],
  "spawns": [
    {{"id": "spawn-p1", "kind": "player_spawn", "x": 10, "y": 10, "width": 32, "height": 32}}
  ],
  "elevations": []
}}
"""


# -----------------------------------------------------------------------------
# Blueprints Canônicos Determinísticos
# -----------------------------------------------------------------------------


def create_canonical_karakura_expanded() -> MapBlueprint:
    """Gera o Blueprint semântico determinístico de Karakura Expandida (64x48 tiles = 2048x1536 px).

    Inclui o Rio Onagawa cruzando de oeste a leste no quadrante sul,
    duas pontes de concreto, Clássicos edifícios (Clínica Kurosaki, Loja Urahara),
    bairros residenciais, parque Mashiba, postes, árvores Zelkova e 3 baús de tesouro.
    """
    w, h = 64, 48

    # Rio Onagawa cruzando horizontalmente na faixa de y=31 a y=37
    river_points = [(0, 34), (16, 33), (32, 35), (48, 34), (63, 35)]
    river = RiverPath(
        name="Rio Onagawa",
        points=river_points,
        width=4,
        water_type="freshwater",
    )

    # Duas pontes transitáveis sobre o rio
    bridges = [
        Bridge(
            id="bridge-west",
            x=14,
            y=31,
            width=5,
            height=7,
            orientation="vertical",
            material="concrete",
        ),
        Bridge(
            id="bridge-east",
            x=44,
            y=32,
            width=5,
            height=7,
            orientation="vertical",
            material="concrete",
        ),
    ]

    # Estradas e calçadas urbanas
    regions = {
        "roads": [
            # Avenida principal leste-oeste norte
            {"x": 4, "y": 14, "w": 56, "h": 4, "surface": "asphalt"},
            # Conexão vertical oeste passando pela ponte
            {"x": 14, "y": 2, "w": 5, "h": 44, "surface": "asphalt"},
            # Conexão vertical leste passando pela ponte
            {"x": 44, "y": 2, "w": 5, "h": 44, "surface": "asphalt"},
            # Avenida sul perto da margem inferior
            {"x": 4, "y": 42, "w": 56, "h": 3, "surface": "asphalt"},
        ],
        "plazas": [
            # Praça central em frente à clínica
            {"x": 22, "y": 18, "w": 18, "h": 10, "surface": "sidewalk"},
            # Pátio da Loja Urahara
            {"x": 4, "y": 4, "w": 8, "h": 8, "surface": "dirt"},
        ],
    }

    # Edifícios canônicos de Karakura
    landmarks = [
        Landmark(
            id="urahara-shop",
            name="Loja de Conveniência Urahara",
            kind="shop",
            x=128,  # tile 4
            y=160,  # tile 5
            width=256,
            height=128,
            solid_footprint=(0, 48, 256, 80),
            image="/maps/scenes/urahara-shop.webp",
        ),
        Landmark(
            id="kurosaki-clinic",
            name="Clínica Kurosaki",
            kind="clinic",
            x=768,  # tile 24
            y=288,  # tile 9
            width=224,
            height=192,
            solid_footprint=(0, 64, 224, 128),
            image="/maps/scenes/kurosaki-clinic.webp",
        ),
        Landmark(
            id="apartment-block-1",
            name="Edifício Residencial Karakura",
            kind="apartment",
            x=256,  # tile 8
            y=576,  # tile 18
            width=224,
            height=248,
            solid_footprint=(0, 100, 224, 148),
            image="/maps/scenes/apartment.webp",
        ),
        Landmark(
            id="apartment-block-2",
            name="Condomínio Mashiba",
            kind="apartment",
            x=1600,  # tile 50
            y=288,  # tile 9
            width=224,
            height=248,
            solid_footprint=(0, 100, 224, 148),
            image="/maps/scenes/apartment.webp",
        ),
    ]

    # Props ambientais (Árvores Zelkova e Postes de Luz)
    props: List[PropDef] = []
    # Bosque ao redor da loja Urahara
    tree_coords = [
        (2, 2),
        (2, 6),
        (2, 10),
        (10, 2),
        (11, 8),
        # Parque Mashiba ao sul do rio
        (8, 40),
        (10, 42),
        (24, 41),
        (28, 43),
        (32, 40),
        (38, 42),
        (52, 41),
        (56, 43),
        # Margem arborizada
        (6, 28),
        (22, 28),
        (26, 29),
        (40, 28),
        (54, 28),
    ]
    for i, (tx, ty) in enumerate(tree_coords):
        props.append(
            PropDef(
                id=f"tree-{i}",
                kind="tree",
                x=tx * 32,
                y=ty * 32,
                width=96,
                height=112,
                image="/maps/scenes/zelkova.webp",
            )
        )

    # Postes de iluminação pelas calçadas
    lamp_coords = [(13, 5), (13, 13), (13, 22), (43, 5), (43, 13), (43, 22), (21, 13), (35, 13)]
    for i, (lx, ly) in enumerate(lamp_coords):
        props.append(
            PropDef(
                id=f"lamp-{i}",
                kind="lamp",
                x=lx * 32,
                y=ly * 32,
                width=32,
                height=64,
                image="/maps/scenes/streetlight.webp",
            )
        )

    # Baús de tesouro estratégicos
    chests = [
        Chest(
            id="chest-urahara-backyard",
            x=64,  # tile 2, escondido atrás da loja
            y=224,
            loot_tier="silver",
            secret_level=2,
            description="Baú secreto de Suprimentos no quintal de Kisuke Urahara",
        ),
        Chest(
            id="chest-onagawa-bridge",
            x=416,  # tile 13, y=30 (margem norte da ponte oeste)
            y=960,
            loot_tier="bronze",
            secret_level=1,
            description="Baú de ferramentas debaixo da pilastra da Ponte Onagawa",
        ),
        Chest(
            id="chest-mashiba-park-grove",
            x=1056,  # tile 33, y=42
            y=1344,
            loot_tier="gold",
            secret_level=3,
            description="Baú dourado místico nas profundezas do Parque Mashiba",
        ),
    ]

    # Spawns e áreas lógicas
    spawns = [
        SpawnPoint(
            id="spawn-player",
            kind="player_spawn",
            x=25 * 32,
            y=22 * 32,
            width=32,
            height=32,
        ),
        SpawnPoint(
            id="portal-senkaimon",
            kind="portal",
            x=28 * 32,
            y=22 * 32,
            width=32,
            height=32,
        ),
        SpawnPoint(
            id="npc-urahara",
            kind="npc",
            x=6 * 32,
            y=10 * 32,
            width=32,
            height=32,
        ),
        SpawnPoint(
            id="pz-clinic",
            kind="pz",
            x=22 * 32,
            y=18 * 32,
            width=18 * 32,
            height=8 * 32,
        ),
        SpawnPoint(
            id="patrol-south-hollows",
            kind="mob_patrol",
            x=10 * 32,
            y=40 * 32,
            width=40 * 32,
            height=5 * 32,
            mob_type="small_hollow",
            level_range=(1, 10),
        ),
    ]

    # Desnível sutil de relevo 2.5D na margem sul do parque
    wall_tiles = [(x, 39) for x in range(6, 40) if x not in (14, 15, 16, 17, 18)]
    stairs = [(15, 39), (16, 39)]
    elevations = [
        ElevationCliff(
            id="cliff-mashiba-terrace",
            level=1,
            wall_tiles=wall_tiles,
            stairs=stairs,
        )
    ]

    return MapBlueprint(
        map_id="karakura_expanded",
        name="Karakura Central Expandida",
        biome="karakura",
        width=w,
        height=h,
        tile_size=32,
        regions=regions,
        river=river,
        bridges=bridges,
        landmarks=landmarks,
        props=props,
        chests=chests,
        spawns=spawns,
        elevations=elevations,
    )


def create_canonical_rukongai_district_1() -> MapBlueprint:
    """Gera o Blueprint semântico determinístico de Rukongai Distrito 1 (Junrinan).

    Tamanho 64x48 tiles. Inclui riacho de pedra, ponte de madeira,
    estrada para o Portão Hakuryūmon do Seireitei, vilarejo tradicional,
    santuário/dojo, cerejeiras (sakura), lanternas de pedra e baús de tesouro.
    """
    w, h = 64, 48

    # Riacho sinuoso descendo do norte ao sul no lado oeste (x ~ 18 a 24)
    river_points = [(22, 0), (20, 12), (23, 24), (19, 36), (21, 47)]
    river = RiverPath(
        name="Riacho de Junrinan",
        points=river_points,
        width=3,
        water_type="spiritual_stream",
    )

    # Ponte de madeira tradicional sobre o riacho (transpõe completamente o curso d'água)
    bridges = [
        Bridge(
            id="bridge-junrinan-wood",
            x=18,
            y=22,
            width=8,
            height=4,
            orientation="horizontal",
            material="wood",
        )
    ]

    # Estrada de terra batida que conduz ao Seireitei
    regions = {
        "roads": [
            # Estrada principal de terra cortando de leste para o oeste rumo à ponte
            {"x": 2, "y": 22, "w": 60, "h": 4, "surface": "dirt"},
            # Travessa que sobe ao Santuário ao norte
            {"x": 42, "y": 4, "w": 4, "h": 18, "surface": "dirt"},
            # Caminho secundário do vilarejo
            {"x": 30, "y": 26, "w": 4, "h": 18, "surface": "dirt"},
        ],
        "plazas": [
            # Pátio cerimonial de Junrinan
            {"x": 38, "y": 4, "w": 16, "h": 8, "surface": "stone"},
            # Praça central do vilarejo
            {"x": 30, "y": 18, "w": 12, "h": 8, "surface": "dirt"},
        ],
    }

    # Casas tradicionais de Rukongai e Santuário
    landmarks = [
        Landmark(
            id="junrinan-dojo-shrine",
            name="Santuário & Dojo de Junrinan",
            kind="shrine",
            x=1280,  # tile 40
            y=128,  # tile 4
            width=288,
            height=192,
            solid_footprint=(0, 64, 288, 128),
            image="/maps/scenes/soul/quartel.webp",
        ),
        Landmark(
            id="rukongai-house-1",
            name="Residência Tradicional Junrinan Norte",
            kind="house",
            x=960,  # tile 30
            y=288,  # tile 9
            width=160,
            height=144,
            solid_footprint=(0, 48, 160, 96),
            image="/maps/scenes/soul/rukongai-house.webp",
        ),
        Landmark(
            id="rukongai-house-2",
            name="Residência Tradicional Junrinan Sul",
            kind="house",
            x=960,  # tile 30
            y=896,  # tile 28
            width=160,
            height=144,
            solid_footprint=(0, 48, 160, 96),
            image="/maps/scenes/soul/rukongai-house.webp",
        ),
        Landmark(
            id="rukongai-teahouse",
            name="Casa de Chá de Junrinan",
            kind="house",
            x=1440,  # tile 45
            y=896,  # tile 28
            width=160,
            height=144,
            solid_footprint=(0, 48, 160, 96),
            image="/maps/scenes/soul/rukongai-house.webp",
        ),
    ]

    # Props: Cerejeiras em flor (Sakura) e Lanternas de Pedra (Tōrō)
    props: List[PropDef] = []
    sakura_coords = [
        (4, 4),
        (8, 6),
        (12, 4),
        (6, 12),
        (10, 16),
        (4, 30),
        (8, 36),
        (12, 42),
        (36, 2),
        (56, 2),
        (58, 12),
        (50, 32),
        (58, 36),
        (52, 42),
    ]
    for i, (sx, sy) in enumerate(sakura_coords):
        props.append(
            PropDef(
                id=f"sakura-{i}",
                kind="tree",
                x=sx * 32,
                y=sy * 32,
                width=96,
                height=112,
                image="/maps/scenes/soul/sakura.webp",
            )
        )

    lantern_coords = [(17, 20), (17, 26), (26, 20), (26, 26), (41, 12), (47, 12), (37, 21), (43, 21)]
    for i, (lx, ly) in enumerate(lantern_coords):
        props.append(
            PropDef(
                id=f"lantern-{i}",
                kind="lantern",
                x=lx * 32,
                y=ly * 32,
                width=32,
                height=64,
                image="/maps/scenes/soul/lanterna.webp",
            )
        )

    # Baús de Tesouro em Rukongai
    chests = [
        Chest(
            id="chest-junrinan-bamboo-shrine",
            x=1568,  # tile 49, y=4 (atrás do santuário)
            y=128,
            loot_tier="spiritual",
            secret_level=3,
            description="Baú Espiritual antigo escondido atrás do Santuário de Junrinan",
        ),
        Chest(
            id="chest-junrinan-stream-bank",
            x=544,  # tile 17, y=36 (margem do riacho)
            y=1152,
            loot_tier="silver",
            secret_level=2,
            description="Baú de madeira submerso parcialmente entre as pedras do riacho",
        ),
        Chest(
            id="chest-junrinan-sakura-clearing",
            x=288,  # tile 9, y=7
            y=224,
            loot_tier="bronze",
            secret_level=1,
            description="Pequeno baú de oferendas sob as pétalas da cerejeira centenária",
        ),
    ]

    # Spawns
    spawns = [
        SpawnPoint(
            id="spawn-player",
            kind="player_spawn",
            x=32 * 32,
            y=23 * 32,
            width=32,
            height=32,
        ),
        SpawnPoint(
            id="portal-hakuryumon",
            kind="portal",
            x=3 * 32,
            y=23 * 32,
            width=32,
            height=32,
        ),
        SpawnPoint(
            id="npc-jidanbo",
            kind="npc",
            x=5 * 32,
            y=23 * 32,
            width=32,
            height=32,
        ),
        SpawnPoint(
            id="pz-village",
            kind="pz",
            x=28 * 32,
            y=18 * 32,
            width=16 * 32,
            height=10 * 32,
        ),
    ]

    # Desnível de terreno 2.5D: platô elevado do Santuário ao norte (y <= 8)
    wall_tiles = [(x, 12) for x in range(36, 60) if x not in (43, 44)]
    stairs = [(43, 12), (44, 12)]
    elevations = [
        ElevationCliff(
            id="cliff-shrine-terrace",
            level=1,
            wall_tiles=wall_tiles,
            stairs=stairs,
        )
    ]

    return MapBlueprint(
        map_id="rukongai_district_1",
        name="Rukongai Distrito 1 (Junrinan)",
        biome="rukongai",
        width=w,
        height=h,
        tile_size=32,
        regions=regions,
        river=river,
        bridges=bridges,
        landmarks=landmarks,
        props=props,
        chests=chests,
        spawns=spawns,
        elevations=elevations,
    )


# -----------------------------------------------------------------------------
# Interface Unificada de Geração
# -----------------------------------------------------------------------------


def generate_blueprint_from_gemini(
    biome: str,
    custom_instructions: str = "",
    api_key: Optional[str] = None,
    model: str = "gemini-2.5-flash",
) -> Optional[MapBlueprint]:
    """Tenta chamar a API do Gemini via REST para gerar um Blueprint procedural.

    Retorna None se a API key não for informada ou houver falha de rede/formato.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    prompt = build_gemini_prompt(biome, custom_instructions)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
        },
        "systemInstruction": {"parts": [{"text": GEMINI_MAP_SYSTEM_PROMPT}]},
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidate = data["candidates"][0]["content"]["parts"][0]["text"]
            blueprint_dict = json.loads(candidate)
            return MapBlueprint.from_dict(blueprint_dict)
    except Exception as exc:
        print(f"[ai_blueprint] Falha na chamada da API Gemini ({exc}). Utilizando fallback canônico.")
        return None


def get_or_generate_blueprint(
    map_id_or_biome: str,
    use_ai: bool = False,
    api_key: Optional[str] = None,
) -> MapBlueprint:
    """Obtém ou gera um blueprint válido para o mapa requisitado.

    Se use_ai=True e houver conectividade/chave, tenta gerar via Gemini.
    Caso contrário, entrega com segurança o Blueprint canônico do Bleach Idle.
    """
    target = map_id_or_biome.lower()

    if use_ai:
        ai_bp = generate_blueprint_from_gemini(target, api_key=api_key)
        if ai_bp is not None:
            return ai_bp

    if "rukongai" in target or "junrinan" in target:
        return create_canonical_rukongai_district_1()
    return create_canonical_karakura_expanded()
