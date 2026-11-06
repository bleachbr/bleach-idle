"""Autotiler 2.5D e Posicionador de Props para Bleach Idle (Tarefa JH-04).

Implementa:
1. Algoritmo de bitmask autotiling para margens de rios e corpos d'água.
2. Desníveis de terreno 2.5D (estilo Pokémon Omega Ruby) com falésias/muros e escadas.
3. Posicionamento de props (prédios, árvores, postes, baús de tesouro) com Y-sorting
   rigoroso (sortY == y) e garantia de acessibilidade e rotas transitáveis.
4. Geração de textura contínua do chão (PIL) e exportação para Tiled (.tmj) e
   metadados de cena (worldSceneData.json).
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image, ImageDraw, ImageFilter

from ai_blueprint import Bridge, Chest, ElevationCliff, Landmark, MapBlueprint, PropDef

T = 32  # Tamanho do tile em pixels


# -----------------------------------------------------------------------------
# Constantes de Bitmask (4-bit e 8-bit)
# -----------------------------------------------------------------------------

# Direções cardeais
BIT_N = 1 << 0   # 1
BIT_E = 1 << 1   # 2
BIT_S = 1 << 2   # 4
BIT_W = 1 << 3   # 8

# Diagonais para cantos internos/externos
BIT_NE = 1 << 4  # 16
BIT_SE = 1 << 5  # 32
BIT_SW = 1 << 6  # 64
BIT_NW = 1 << 7  # 128


class TileType:
    """Identificadores semânticos de tiles pós-autotiling."""

    GROUND_PLAIN = "ground_plain"
    GROUND_ROAD = "ground_road"
    GROUND_PLAZA = "ground_plaza"

    # Água e Margens
    WATER_CENTER = "water_center"
    WATER_EDGE_N = "water_edge_n"
    WATER_EDGE_S = "water_edge_s"
    WATER_EDGE_E = "water_edge_e"
    WATER_EDGE_W = "water_edge_w"
    WATER_CORNER_OUTER_NW = "water_corner_outer_nw"
    WATER_CORNER_OUTER_NE = "water_corner_outer_ne"
    WATER_CORNER_OUTER_SW = "water_corner_outer_sw"
    WATER_CORNER_OUTER_SE = "water_corner_outer_se"
    WATER_CORNER_INNER_NW = "water_corner_inner_nw"
    WATER_CORNER_INNER_NE = "water_corner_inner_ne"
    WATER_CORNER_INNER_SW = "water_corner_inner_sw"
    WATER_CORNER_INNER_SE = "water_corner_inner_se"

    # Pontes
    BRIDGE_HORIZONTAL = "bridge_h"
    BRIDGE_VERTICAL = "bridge_v"

    # Desníveis 2.5D (Cliffs estilo Pokémon ORAS)
    CLIFF_PLATEAU = "cliff_plateau"
    CLIFF_FACE_CENTER = "cliff_face_center"
    CLIFF_FACE_LEFT = "cliff_face_left"
    CLIFF_FACE_RIGHT = "cliff_face_right"
    CLIFF_STAIRS = "cliff_stairs"


@dataclass
class SceneProp:
    """Prop posicionado no mundo com atributos para engine e Tiled."""

    id: str
    kind: str  # "building" | "tree" | "lamp" | "lantern" | "chest" | "prop"
    image: str
    x: float  # Centro X em pixels
    y: float  # Base Y em pixels (usado para sortY)
    width: float
    height: float
    sortY: float
    solid_cells: List[Tuple[int, int]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    interact_kind: Optional[str] = None


@dataclass
class CompiledMap:
    """Resultado da compilação do Blueprint pelo Autotiler."""

    blueprint: MapBlueprint
    width: int
    height: int
    ground_grid: List[List[str]]  # Grid de tipos de tile
    collision_grid: List[List[int]]  # 0 = livre, 1 = sólido
    props: List[SceneProp]
    ground_image: Optional[Image.Image] = None

    def is_walkable(self, tile_x: int, tile_y: int) -> bool:
        if 0 <= tile_x < self.width and 0 <= tile_y < self.height:
            return self.collision_grid[tile_y][tile_x] == 0
        return False


# -----------------------------------------------------------------------------
# Algoritmo de Bitmask Autotiling
# -----------------------------------------------------------------------------


def compute_cardinal_bitmask(grid: List[List[bool]], x: int, y: int, w: int, h: int) -> int:
    """Calcula a máscara de 4 bits para vizinhos cardeais (N, E, S, W)."""
    mask = 0
    if y > 0 and grid[y - 1][x]:
        mask |= BIT_N
    if x < w - 1 and grid[y][x + 1]:
        mask |= BIT_E
    if y < h - 1 and grid[y + 1][x]:
        mask |= BIT_S
    if x > 0 and grid[y][x - 1]:
        mask |= BIT_W
    return mask


def compute_8bit_bitmask(grid: List[List[bool]], x: int, y: int, w: int, h: int) -> int:
    """Calcula a máscara completa de 8 bits (cardeais + diagonais)."""
    mask = compute_cardinal_bitmask(grid, x, y, w, h)
    if y > 0 and x < w - 1 and grid[y - 1][x + 1]:
        mask |= BIT_NE
    if y < h - 1 and x < w - 1 and grid[y + 1][x + 1]:
        mask |= BIT_SE
    if y < h - 1 and x > 0 and grid[y + 1][x - 1]:
        mask |= BIT_SW
    if y > 0 and x > 0 and grid[y - 1][x - 1]:
        mask |= BIT_NW
    return mask


def classify_water_tile(mask: int) -> str:
    """Determina o tipo de tile de margem de rio a partir da máscara de vizinhos d'água."""
    has_n = bool(mask & BIT_N)
    has_e = bool(mask & BIT_E)
    has_s = bool(mask & BIT_S)
    has_w = bool(mask & BIT_W)

    cardinal_count = int(has_n) + int(has_e) + int(has_s) + int(has_w)

    # 4 vizinhos de água: centro ou cantos internos
    if cardinal_count == 4:
        if not (mask & BIT_NW):
            return TileType.WATER_CORNER_INNER_NW
        if not (mask & BIT_NE):
            return TileType.WATER_CORNER_INNER_NE
        if not (mask & BIT_SW):
            return TileType.WATER_CORNER_INNER_SW
        if not (mask & BIT_SE):
            return TileType.WATER_CORNER_INNER_SE
        return TileType.WATER_CENTER

    # Margens retas
    if has_s and has_e and has_w and not has_n:
        return TileType.WATER_EDGE_N
    if has_n and has_e and has_w and not has_s:
        return TileType.WATER_EDGE_S
    if has_n and has_s and has_w and not has_e:
        return TileType.WATER_EDGE_E
    if has_n and has_s and has_e and not has_w:
        return TileType.WATER_EDGE_W

    # Cantos externos
    if has_s and has_e and not has_n and not has_w:
        return TileType.WATER_CORNER_OUTER_NW
    if has_s and has_w and not has_n and not has_e:
        return TileType.WATER_CORNER_OUTER_NE
    if has_n and has_e and not has_s and not has_w:
        return TileType.WATER_CORNER_OUTER_SW
    if has_n and has_w and not has_s and not has_e:
        return TileType.WATER_CORNER_OUTER_SE

    return TileType.WATER_CENTER


# -----------------------------------------------------------------------------
# Rasterizador de Rios e Cursos d'Água
# -----------------------------------------------------------------------------


def rasterize_river(bp: MapBlueprint) -> List[List[bool]]:
    """Rasteriza o curso d'água do blueprint em uma grade booleana (w x h)."""
    w, h = bp.width, bp.height
    water_grid = [[False for _ in range(w)] for _ in range(h)]

    if not bp.river or len(bp.river.points) < 2:
        return water_grid

    points = bp.river.points
    radius = max(1, bp.river.width // 2)

    # Conecta pontos consecutivos com linhas grossas
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        dist = math.hypot(x1 - x0, y1 - y0)
        steps = max(1, int(dist * 2))

        for step in range(steps + 1):
            t = step / steps
            cx = x0 + (x1 - x0) * t
            cy = y0 + (y1 - y0) * t

            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    if dx * dx + dy * dy <= radius * radius + 0.5:
                        tx = int(round(cx + dx))
                        ty = int(round(cy + dy))
                        if 0 <= tx < w and 0 <= ty < h:
                            water_grid[ty][tx] = True

    return water_grid


# -----------------------------------------------------------------------------
# Autotiler Principal & Compilador de Terreno 2.5D
# -----------------------------------------------------------------------------


class MapAutotiler:
    """Compila um MapBlueprint em um CompiledMap com relevo 2.5D e props."""

    def __init__(self, blueprint: MapBlueprint):
        self.bp = blueprint
        self.w = blueprint.width
        self.h = blueprint.height

    def compile(self) -> CompiledMap:
        """Executa o pipeline completo de autotiling, elevações e posicionamento."""
        # 1. Rasterizar rios e pontes
        water_raw = rasterize_river(self.bp)

        # 2. Inicializar matrizes de chão e colisão
        ground_grid: List[List[str]] = [[TileType.GROUND_PLAIN for _ in range(self.w)] for _ in range(self.h)]
        collision: List[List[int]] = [[0 for _ in range(self.w)] for _ in range(self.h)]

        # 3. Aplicar estradas e praças
        roads = self.bp.regions.get("roads", [])
        for r in roads:
            rx, ry, rw, rh = r["x"], r["y"], r["w"], r["h"]
            for y in range(max(0, ry), min(self.h, ry + rh)):
                for x in range(max(0, rx), min(self.w, rx + rw)):
                    ground_grid[y][x] = TileType.GROUND_ROAD

        plazas = self.bp.regions.get("plazas", [])
        for p in plazas:
            px, py, pw, ph = p["x"], p["y"], p["w"], p["h"]
            for y in range(max(0, py), min(self.h, py + ph)):
                for x in range(max(0, px), min(self.w, px + pw)):
                    ground_grid[y][x] = TileType.GROUND_PLAZA

        # 4. Bitmask Autotiling das margens de água
        for y in range(self.h):
            for x in range(self.w):
                if water_raw[y][x]:
                    mask = compute_8bit_bitmask(water_raw, x, y, self.w, self.h)
                    ground_grid[y][x] = classify_water_tile(mask)
                    collision[y][x] = 1  # Água profunda é sólida

        # 5. Aplicar pontes (libera colisão e desenha o piso transitável)
        for b in self.bp.bridges:
            bx, by, bw, bh = b.x, b.y, b.width, b.height
            tile_bridge = (
                TileType.BRIDGE_VERTICAL if b.orientation == "vertical" else TileType.BRIDGE_HORIZONTAL
            )
            for y in range(max(0, by), min(self.h, by + bh)):
                for x in range(max(0, bx), min(self.w, bx + bw)):
                    ground_grid[y][x] = tile_bridge
                    collision[y][x] = 0  # Ponte é sempre transitável!

        # 6. Desníveis de terreno 2.5D (Cliffs estilo Pokémon ORAS)
        for elev in self.bp.elevations:
            for wx, wy in elev.wall_tiles:
                if 0 <= wx < self.w and 0 <= wy < self.h:
                    ground_grid[wy][wx] = TileType.CLIFF_FACE_CENTER
                    collision[wy][wx] = 1  # Paredão do cliff é impassável

            for sx, sy in elev.stairs:
                if 0 <= sx < self.w and 0 <= sy < self.h:
                    ground_grid[sy][sx] = TileType.CLIFF_STAIRS
                    collision[sy][sx] = 0  # Escada abre passagem transitável!

        # 7. Posicionar Props, Casas e Baús com Y-Sorting
        props = self._place_props(collision)

        # 8. Renderizar a textura contínua do chão em PIL
        ground_img = self._render_ground_image(ground_grid)

        return CompiledMap(
            blueprint=self.bp,
            width=self.w,
            height=self.h,
            ground_grid=ground_grid,
            collision_grid=collision,
            props=props,
            ground_image=ground_img,
        )

    def _place_props(self, collision: List[List[int]]) -> List[SceneProp]:
        """Posiciona edifícios, árvores, postes e baús com Y-sorting e acessibilidade."""
        props: List[SceneProp] = []

        # 1. Landmarks (Edifícios / Clínicas / Templos)
        for lm in self.bp.landmarks:
            base_y = float(lm.y + lm.height)
            center_x = float(lm.x + lm.width / 2)
            sort_y = base_y  # Y-sorting pela base

            # Marcar footprint sólido
            fx, fy, fw, fh = lm.solid_footprint
            if fw == 0 or fh == 0:
                fx, fy, fw, fh = 0, int(lm.height * 0.5), lm.width, int(lm.height * 0.5)

            solid_cells = []
            start_tx = int((lm.x + fx) // T)
            end_tx = int(math.ceil((lm.x + fx + fw) / T))
            start_ty = int((lm.y + fy) // T)
            end_ty = int(math.ceil((lm.y + fy + fh) / T))

            for cy in range(start_ty, end_ty):
                for cx in range(start_tx, end_tx):
                    if 0 <= cx < self.w and 0 <= cy < self.h:
                        collision[cy][cx] = 1
                        solid_cells.append((cx, cy))

            props.append(
                SceneProp(
                    id=lm.id,
                    kind="building",
                    image=lm.image or f"/maps/scenes/{lm.kind}.webp",
                    x=center_x,
                    y=base_y,
                    width=float(lm.width),
                    height=float(lm.height),
                    sortY=sort_y,
                    solid_cells=solid_cells,
                    metadata={"name": lm.name, "kind": lm.kind},
                )
            )

        # 2. Props decorativos (Árvores e Postes)
        for p in self.bp.props:
            base_y = float(p.y + p.height)
            center_x = float(p.x + p.width / 2)
            sort_y = base_y

            solid_cells = []
            # Árvore: apenas o tronco é sólido (centro inferior)
            if p.kind == "tree":
                trunk_tx = int(center_x // T)
                trunk_ty = int((base_y - T / 2) // T)
                if 0 <= trunk_tx < self.w and 0 <= trunk_ty < self.h:
                    collision[trunk_ty][trunk_tx] = 1
                    solid_cells.append((trunk_tx, trunk_ty))
            elif p.kind in ("lamp", "lantern"):
                base_tx = int(center_x // T)
                base_ty = int((base_y - T / 2) // T)
                if 0 <= base_tx < self.w and 0 <= base_ty < self.h:
                    collision[base_ty][base_tx] = 1
                    solid_cells.append((base_tx, base_ty))

            props.append(
                SceneProp(
                    id=p.id,
                    kind=p.kind,
                    image=p.image,
                    x=center_x,
                    y=base_y,
                    width=float(p.width),
                    height=float(p.height),
                    sortY=sort_y,
                    solid_cells=solid_cells,
                    metadata={"kind": p.kind},
                )
            )

        # 3. Baús de Tesouro (Chests) com Garantia de Rota Transitável
        for c in self.bp.chests:
            chest_tx = int(c.x // T)
            chest_ty = int(c.y // T)
            chest_tx = max(0, min(self.w - 1, chest_tx))
            chest_ty = max(0, min(self.h - 1, chest_ty))

            # Verificar se os 4 lados adjacentes têm pelo menos 1 caminhável
            adjacent = [
                (chest_tx, chest_ty - 1),  # Norte
                (chest_tx + 1, chest_ty),  # Leste
                (chest_tx, chest_ty + 1),  # Sul
                (chest_tx - 1, chest_ty),  # Oeste
            ]

            walkable_neighbors = [
                (ax, ay)
                for ax, ay in adjacent
                if 0 <= ax < self.w and 0 <= ay < self.h and collision[ay][ax] == 0
            ]

            # Se todos os lados estiverem bloqueados, libera um lado válido
            if not walkable_neighbors:
                for ax, ay in adjacent:
                    if 0 <= ax < self.w and 0 <= ay < self.h:
                        collision[ay][ax] = 0
                        walkable_neighbors.append((ax, ay))
                        break

            # A célula do baú em si é sólida (para não sobrepor o ator)
            collision[chest_ty][chest_tx] = 1

            center_x = float(chest_tx * T + T / 2)
            base_y = float((chest_ty + 1) * T)
            sort_y = base_y

            props.append(
                SceneProp(
                    id=c.id,
                    kind="chest",
                    image="/maps/scenes/chest.webp",
                    x=center_x,
                    y=base_y,
                    width=32.0,
                    height=32.0,
                    sortY=sort_y,
                    solid_cells=[(chest_tx, chest_ty)],
                    metadata={
                        "loot_tier": c.loot_tier,
                        "secret_level": c.secret_level,
                        "description": c.description,
                        "accessible_from": walkable_neighbors,
                    },
                    interact_kind="chest",
                )
            )

        # Ordenar props estavelmente por sortY (Y-sorting crescente)
        props.sort(key=lambda p: (p.sortY, p.x))
        return props

    def _render_ground_image(self, ground_grid: List[List[str]]) -> Image.Image:
        """Renderiza a imagem contínua do terreno com paletas canônicas e relevo 2.5D."""
        img_w = self.w * T
        img_h = self.h * T

        biome = self.bp.biome.lower()

        # Paletas canônicas por bioma
        if biome == "karakura":
            col_ground = (98, 160, 78)       # Grama verde viva de subúrbio
            col_road = (78, 82, 88)          # Asfalto urbano
            col_plaza = (195, 198, 202)      # Calçada clara
            col_water = (54, 138, 204)       # Rio Onagawa
            col_water_deep = (34, 102, 168)  # Água profunda
            col_bank = (160, 150, 120)       # Terra da margem
            col_bridge = (180, 185, 190)     # Concreto da ponte
            col_cliff = (110, 115, 120)      # Muro de contenção
        elif "rukongai" in biome or "soul" in biome:
            col_ground = (112, 168, 92)      # Gramado tradicional
            col_road = (186, 158, 116)       # Estrada de terra batida
            col_plaza = (168, 162, 150)      # Pátio de pedra
            col_water = (76, 172, 218)       # Riacho espiritual
            col_water_deep = (48, 128, 182)  # Correnteza
            col_bank = (142, 120, 92)        # Pedras da margem
            col_bridge = (150, 88, 48)       # Madeira rústica da ponte
            col_cliff = (128, 118, 106)      # Paredão de rocha natural
        else:
            col_ground = (100, 150, 80)
            col_road = (80, 80, 80)
            col_plaza = (180, 180, 180)
            col_water = (50, 130, 200)
            col_water_deep = (30, 100, 160)
            col_bank = (150, 140, 110)
            col_bridge = (160, 160, 160)
            col_cliff = (100, 100, 100)

        img = Image.new("RGB", (img_w, img_h), col_ground)
        draw = ImageDraw.Draw(img)

        # Desenhar células base
        for y in range(self.h):
            for x in range(self.w):
                tt = ground_grid[y][x]
                px0, py0 = x * T, y * T
                px1, py1 = px0 + T, py0 + T

                if tt == TileType.GROUND_ROAD:
                    draw.rectangle([px0, py0, px1, py1], fill=col_road)
                elif tt == TileType.GROUND_PLAZA:
                    draw.rectangle([px0, py0, px1, py1], fill=col_plaza)
                elif "water" in tt:
                    # Margem suave ou água plena
                    if tt == TileType.WATER_CENTER:
                        draw.rectangle([px0, py0, px1, py1], fill=col_water_deep)
                    else:
                        draw.rectangle([px0, py0, px1, py1], fill=col_bank)
                        # Preenchimento parcial de água de acordo com a borda
                        if tt == TileType.WATER_EDGE_N:
                            draw.rectangle([px0, py0 + 8, px1, py1], fill=col_water)
                        elif tt == TileType.WATER_EDGE_S:
                            draw.rectangle([px0, py0, px1, py1 - 8], fill=col_water)
                        elif tt == TileType.WATER_EDGE_E:
                            draw.rectangle([px0, py0, px1 - 8, py1], fill=col_water)
                        elif tt == TileType.WATER_EDGE_W:
                            draw.rectangle([px0 + 8, py0, px1, py1], fill=col_water)
                        else:
                            draw.rectangle([px0 + 4, py0 + 4, px1 - 4, py1 - 4], fill=col_water)
                elif "bridge" in tt:
                    draw.rectangle([px0, py0, px1, py1], fill=col_bridge)
                    # Detalhes de pranchas / guarda-corpos
                    if tt == TileType.BRIDGE_VERTICAL:
                        draw.line([px0, py0, px0, py1], fill=(40, 40, 40), width=2)
                        draw.line([px1 - 1, py0, px1 - 1, py1], fill=(40, 40, 40), width=2)
                        draw.line([px0, py0 + 16, px1, py0 + 16], fill=(100, 100, 100), width=1)
                    else:
                        draw.line([px0, py0, px1, py0], fill=(40, 40, 40), width=2)
                        draw.line([px0, py1 - 1, px1, py1 - 1], fill=(40, 40, 40), width=2)
                        draw.line([px0 + 16, py0, px0 + 16, py1], fill=(100, 100, 100), width=1)
                elif tt == TileType.CLIFF_FACE_CENTER:
                    # Paredão 2.5D com relevo sombreado
                    draw.rectangle([px0, py0, px1, py1], fill=col_cliff)
                    draw.line([px0, py0, px1, py0], fill=(220, 220, 220), width=2)  # Borda superior clara
                    draw.line([px0, py1 - 1, px1, py1 - 1], fill=(40, 40, 40), width=3)  # Sombra inferior
                elif tt == TileType.CLIFF_STAIRS:
                    # Degraus da escada
                    draw.rectangle([px0, py0, px1, py1], fill=(190, 185, 175))
                    for step_y in range(py0 + 6, py1, 8):
                        draw.line([px0 + 2, step_y, px1 - 2, step_y], fill=(90, 85, 75), width=2)

        return img


# -----------------------------------------------------------------------------
# Exportadores de Mapas: Tiled (.tmj) e worldSceneData
# -----------------------------------------------------------------------------


def export_to_tiled_json(compiled: CompiledMap, ground_image_rel: str) -> Dict[str, Any]:
    """Exporta o CompiledMap no formato exato Tiled .tmj exigido pelo Bleach Idle."""
    w, h = compiled.width, compiled.height

    # Tileset embutido básico de colisão e referência visual
    tileset = {
        "firstgid": 1,
        "name": "engine_tiles",
        "tilewidth": T,
        "tileheight": T,
        "tilecount": 100,
        "columns": 10,
        "tiles": [
            {
                "id": 0,
                "properties": [{"name": "solido", "type": "bool", "value": False}],
            },
            {
                "id": 1,
                "properties": [{"name": "solido", "type": "bool", "value": True}],
            },
        ],
    }

    # Camada chao (tilelayer)
    chao_data: List[int] = []
    for y in range(h):
        for x in range(w):
            tt = compiled.ground_grid[y][x]
            if "water" in tt:
                chao_data.append(2)  # Tile com água
            elif "road" in tt:
                chao_data.append(3)
            elif "bridge" in tt:
                chao_data.append(4)
            else:
                chao_data.append(1)  # Chão comum

    # Camada de colisão (colisao_cenario)
    colisao_data: List[int] = []
    for y in range(h):
        for x in range(w):
            val = compiled.collision_grid[y][x]
            colisao_data.append(2 if val == 1 else 0)  # GID 2 tem solido=True

    # Camada cenario (objectgroup com Y-sorting)
    cenario_objects: List[Dict[str, Any]] = []
    for i, prop in enumerate(compiled.props):
        # Tiled com GID ancora em (x, y) na base inferior esquerda
        tiled_x = prop.x - prop.width / 2
        tiled_y = prop.y
        cenario_objects.append(
            {
                "id": 100 + i,
                "name": prop.id,
                "type": prop.interact_kind or "visual",
                "x": float(tiled_x),
                "y": float(tiled_y),
                "width": float(prop.width),
                "height": float(prop.height),
                "rotation": 0,
                "visible": True,
                "properties": [
                    {"name": "sortY", "type": "float", "value": float(prop.sortY)},
                    {"name": "kind", "type": "string", "value": prop.kind},
                    {"name": "image", "type": "string", "value": prop.image},
                ],
            }
        )

    # Camada logica (objectgroup)
    logica_objects: List[Dict[str, Any]] = []
    for i, sp in enumerate(compiled.blueprint.spawns):
        logica_objects.append(
            {
                "id": 500 + i,
                "name": sp.id,
                "type": sp.kind,
                "x": float(sp.x),
                "y": float(sp.y),
                "width": float(sp.width),
                "height": float(sp.height),
                "properties": [
                    {"name": "mob_type", "type": "string", "value": sp.mob_type or ""},
                    {"name": "level_min", "type": "int", "value": sp.level_range[0]},
                    {"name": "level_max", "type": "int", "value": sp.level_range[1]},
                ],
            }
        )

    layers = [
        {
            "id": 1,
            "name": "chao",
            "type": "tilelayer",
            "width": w,
            "height": h,
            "x": 0,
            "y": 0,
            "visible": True,
            "opacity": 1,
            "data": chao_data,
        },
        {
            "id": 2,
            "name": "colisao_cenario",
            "type": "tilelayer",
            "width": w,
            "height": h,
            "x": 0,
            "y": 0,
            "visible": False,
            "opacity": 0.7,
            "data": colisao_data,
        },
        {
            "id": 3,
            "name": "cenario",
            "type": "objectgroup",
            "x": 0,
            "y": 0,
            "visible": True,
            "opacity": 1,
            "objects": cenario_objects,
        },
        {
            "id": 4,
            "name": "logica",
            "type": "objectgroup",
            "x": 0,
            "y": 0,
            "visible": True,
            "opacity": 1,
            "objects": logica_objects,
        },
    ]

    return {
        "compressionlevel": -1,
        "height": h,
        "width": w,
        "infinite": False,
        "layers": layers,
        "nextlayerid": 5,
        "nextobjectid": 600,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.10.2",
        "tileheight": T,
        "tilewidth": T,
        "type": "map",
        "version": "1.10",
        "tilesets": [tileset],
        "properties": [
            {"name": "nome", "type": "string", "value": compiled.blueprint.name},
            {"name": "biome", "type": "string", "value": compiled.blueprint.biome},
            {"name": "ground", "type": "string", "value": ground_image_rel},
        ],
    }


def export_to_scene_data(compiled: CompiledMap, ground_image_rel: str) -> Dict[str, Any]:
    """Gera a entrada de metadados compatível com client/src/worldSceneData.json."""
    props_list = []
    for prop in compiled.props:
        item: Dict[str, Any] = {
            "id": prop.id,
            "kind": prop.kind,
            "image": prop.image,
            "x": prop.x,
            "y": prop.y,
            "width": prop.width,
            "height": prop.height,
            "sortY": prop.sortY,
        }
        if prop.interact_kind:
            item["interactKind"] = prop.interact_kind
            item["metadata"] = prop.metadata
        props_list.append(item)

    return {
        "width": compiled.width * T,
        "height": compiled.height * T,
        "ground": ground_image_rel,
        "props": props_list,
    }
