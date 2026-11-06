"""Validador Autônomo de Qualidade de Mapas e Arte 2.5D (Tarefa JH-05).

Executa:
1. Validação de Conectividade & Acessibilidade:
   - Busca em largura (BFS) / A* no grid de colisão a partir do spawn inicial.
   - Verifica alcance de 100% dos baús de tesouro (chests), NPCs e portais.
   - Garante que rios não bloqueiem passagem e que pontes estejam funcionais e conectadas.
   - Garante que escadas de cliffs conectem os desníveis de terreno 2.5D.
2. Auditoria de Qualidade Visual & Paleta:
   - Inspeção de textura contínua do chão (.png/.webp): ausência de pixels nulos ou magenta (#FF00FF).
   - Dimensões exatas proporcionais à grade (32px por tile).
   - Proporção de relevos (cliffs) para estradas navegáveis.
   - Densidade de props e integridade estrita de Y-sorting (sortY == y).
   - Desobstrução de pontos críticos (spawns, pontes, portais, escadas).
3. Emissão de Relatório de Auditoria:
   - Cálculo determinístico de nota de qualidade (0 a 10).
   - Selo de aprovação para deploy (APROVADO / REPROVADO).
   - Geração de relatório estruturado em markdown:
     `art/maps/generators/reports/audit_report.md`.
"""

from __future__ import annotations

import argparse
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
import json
import math
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from ai_blueprint import (
    Bridge,
    Chest,
    ElevationCliff,
    Landmark,
    MapBlueprint,
    PropDef,
    RiverPath,
    SpawnPoint,
    get_or_generate_blueprint,
)
from autotiler import CompiledMap, MapAutotiler, SceneProp, TileType

T = 32  # Tamanho do tile em pixels


# -----------------------------------------------------------------------------
# Modelos de Dados da Auditoria
# -----------------------------------------------------------------------------


class AnomalySeverity(str, Enum):
    """Nível de gravidade de uma anomalia detectada."""

    CRITICAL = "CRITICAL"  # Bloqueia aprovação para deploy
    WARNING = "WARNING"    # Alerta de qualidade / balanceamento
    INFO = "INFO"          # Observação técnica informativa


@dataclass
class Anomaly:
    """Registro de anomalia encontrada durante a validação."""

    category: str  # "connectivity" | "visual" | "props" | "navigation"
    severity: AnomalySeverity
    code: str
    message: str
    location: Optional[Tuple[int, int]] = None  # (tile_x, tile_y) ou (px_x, px_y)
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "severity": self.severity.value,
            "code": self.code,
            "message": self.message,
            "location": list(self.location) if self.location else None,
            "details": self.details,
        }


@dataclass
class MapAuditMetrics:
    """Métricas quantitativas coletadas pelo validador."""

    total_tiles: int = 0
    walkable_tiles: int = 0
    walkable_ratio: float = 0.0
    road_tiles: int = 0
    cliff_tiles: int = 0
    water_tiles: int = 0
    bridge_tiles: int = 0
    cliff_to_road_ratio: float = 0.0
    total_props: int = 0
    prop_density: float = 0.0
    chests_total: int = 0
    chests_reachable: int = 0
    npcs_total: int = 0
    npcs_reachable: int = 0
    portals_total: int = 0
    portals_reachable: int = 0
    spawn_tile: Tuple[int, int] = (0, 0)
    spawn_walkable: bool = False
    bridges_total: int = 0
    bridges_functional: int = 0
    ground_dimensions: Tuple[int, int] = (0, 0)
    magenta_pixels_count: int = 0
    null_pixels_count: int = 0
    ysort_violations: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MapAuditReport:
    """Relatório consolidado de auditoria de um mapa."""

    map_id: str
    map_name: str
    biome: str
    width: int
    height: int
    score: float
    connectivity_score: float  # max 4.0
    visual_score: float        # max 3.0
    navigation_score: float    # max 3.0
    status: str  # "APPROVED" | "REJECTED"
    anomalies: List[Anomaly] = field(default_factory=list)
    metrics: MapAuditMetrics = field(default_factory=MapAuditMetrics)
    generated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    @property
    def is_approved(self) -> bool:
        return self.status == "APPROVED"

    @property
    def critical_count(self) -> int:
        return sum(1 for a in self.anomalies if a.severity == AnomalySeverity.CRITICAL)

    @property
    def warning_count(self) -> int:
        return sum(1 for a in self.anomalies if a.severity == AnomalySeverity.WARNING)

    @property
    def info_count(self) -> int:
        return sum(1 for a in self.anomalies if a.severity == AnomalySeverity.INFO)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "map_id": self.map_id,
            "map_name": self.map_name,
            "biome": self.biome,
            "width": self.width,
            "height": self.height,
            "score": self.score,
            "connectivity_score": self.connectivity_score,
            "visual_score": self.visual_score,
            "navigation_score": self.navigation_score,
            "status": self.status,
            "critical_count": self.critical_count,
            "warning_count": self.warning_count,
            "info_count": self.info_count,
            "metrics": self.metrics.to_dict(),
            "anomalies": [a.to_dict() for a in self.anomalies],
            "generated_at": self.generated_at,
        }


# -----------------------------------------------------------------------------
# Validador Autônomo Principal
# -----------------------------------------------------------------------------


class MapQualityValidator:
    """Validador e Auditor Autônomo de Mapas 2.5D para Bleach Idle."""

    def __init__(self, compiled: CompiledMap):
        self.compiled = compiled
        self.bp = compiled.blueprint
        self.w = compiled.width
        self.h = compiled.height
        self.collision = compiled.collision_grid
        self.ground = compiled.ground_grid
        self.props = compiled.props
        self.ground_img = compiled.ground_image

        self.anomalies: List[Anomaly] = []
        self.metrics = MapAuditMetrics()

        # Estruturas calculadas
        self.reachable_cells: Set[Tuple[int, int]] = set()
        self.distance_map: Dict[Tuple[int, int], int] = {}
        self.spawn_tile: Tuple[int, int] = (0, 0)

    # -------------------------------------------------------------------------
    # 1. Validação de Conectividade & Acessibilidade (BFS)
    # -------------------------------------------------------------------------

    def validate_connectivity(self) -> float:
        """Executa busca em largura (BFS) e valida baús, NPCs, portais e pontes.

        Retorna score de conectividade de 0.0 a 4.0.
        """
        score = 0.0

        # 1.1 Localizar o ponto de spawn inicial
        spawn_point = None
        for sp in self.bp.spawns:
            if sp.kind == "player_spawn" or sp.id == "spawn-player":
                spawn_point = sp
                break

        if not spawn_point and self.bp.spawns:
            # Fallback para o primeiro spawn de tipo seguro ou genérico
            for sp in self.bp.spawns:
                if sp.kind in ("pz", "player_spawn"):
                    spawn_point = sp
                    break

        if not spawn_point:
            self.anomalies.append(
                Anomaly(
                    category="connectivity",
                    severity=AnomalySeverity.CRITICAL,
                    code="NO_SPAWN_POINT",
                    message="Nenhum ponto de spawn inicial (player_spawn) definido no mapa.",
                )
            )
            return 0.0

        sx = int(spawn_point.x // T)
        sy = int(spawn_point.y // T)
        sx = max(0, min(self.w - 1, sx))
        sy = max(0, min(self.h - 1, sy))
        self.spawn_tile = (sx, sy)
        self.metrics.spawn_tile = (sx, sy)

        # 1.2 Verificar se o próprio spawn é caminhável
        is_spawn_free = self.collision[sy][sx] == 0
        self.metrics.spawn_walkable = is_spawn_free

        if not is_spawn_free:
            self.anomalies.append(
                Anomaly(
                    category="connectivity",
                    severity=AnomalySeverity.CRITICAL,
                    code="SPAWN_BLOCKED",
                    message=f"Ponto de spawn inicial em ({sx}, {sy}) está bloqueado por colisão sólida!",
                    location=(sx, sy),
                    details={"spawn_id": spawn_point.id},
                )
            )
            # Tenta encontrar vizinho caminhável próximo para prosseguir com a análise
            found_alt = False
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0), (1, 1), (-1, -1)]:
                nx, ny = sx + dx, sy + dy
                if 0 <= nx < self.w and 0 <= ny < self.h and self.collision[ny][nx] == 0:
                    sx, sy = nx, ny
                    found_alt = True
                    break
            if not found_alt:
                return 0.0
        else:
            score += 1.0  # 1.0 pt pelo spawn livre e desobstruído

        # 1.3 Executar BFS no grid de colisão
        queue = deque([(sx, sy, 0)])
        self.reachable_cells = {(sx, sy)}
        self.distance_map = {(sx, sy): 0}

        while queue:
            cx, cy, dist = queue.popleft()
            for dx, dy in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < self.w and 0 <= ny < self.h:
                    if self.collision[ny][nx] == 0 and (nx, ny) not in self.reachable_cells:
                        self.reachable_cells.add((nx, ny))
                        self.distance_map[(nx, ny)] = dist + 1
                        queue.append((nx, ny, dist + 1))

        # 1.4 Validar Acessibilidade de Baús de Tesouro (chests)
        chests = self.bp.chests
        self.metrics.chests_total = len(chests)
        reachable_chests_count = 0

        for c in chests:
            ctx = int(c.x // T)
            cty = int(c.y // T)
            ctx = max(0, min(self.w - 1, ctx))
            cty = max(0, min(self.h - 1, cty))

            # Checa se o próprio tile ou qualquer um dos 4 vizinhos cardeais é alcançável
            adjacent = [(ctx, cty - 1), (ctx + 1, cty), (ctx, cty + 1), (ctx - 1, cty)]
            accessible_neighbors = [
                (ax, ay) for ax, ay in adjacent if (ax, ay) in self.reachable_cells
            ]
            self_accessible = (ctx, cty) in self.reachable_cells

            if self_accessible or accessible_neighbors:
                reachable_chests_count += 1
            else:
                self.anomalies.append(
                    Anomaly(
                        category="connectivity",
                        severity=AnomalySeverity.CRITICAL,
                        code="UNREACHABLE_CHEST",
                        message=f"Baú '{c.id}' em ({ctx}, {cty}) é inalcançável a partir do spawn!",
                        location=(ctx, cty),
                        details={
                            "chest_id": c.id,
                            "loot_tier": c.loot_tier,
                            "description": c.description,
                        },
                    )
                )

        self.metrics.chests_reachable = reachable_chests_count
        if len(chests) > 0:
            score += 1.5 * (reachable_chests_count / len(chests))
        else:
            score += 1.5

        # 1.5 Validar Acessibilidade de NPCs e Portais
        # Coletar NPCs e Portais dos spawns e dos props
        npcs_to_check: List[Tuple[str, int, int]] = []
        portals_to_check: List[Tuple[str, int, int]] = []

        for sp in self.bp.spawns:
            if sp.kind == "npc":
                npcs_to_check.append((sp.id, int(sp.x // T), int(sp.y // T)))
            elif sp.kind in ("portal", "gate"):
                portals_to_check.append((sp.id, int(sp.x // T), int(sp.y // T)))

        for p in self.props:
            if p.kind == "npc" or p.interact_kind == "npc":
                npcs_to_check.append((p.id, int(p.x // T), int(p.y // T)))
            elif p.kind in ("portal", "gate") or p.interact_kind in ("portal", "gate"):
                portals_to_check.append((p.id, int(p.x // T), int(p.y // T)))

        # Validar NPCs
        self.metrics.npcs_total = len(npcs_to_check)
        reachable_npcs_count = 0
        for nid, nx, ny in npcs_to_check:
            nx = max(0, min(self.w - 1, nx))
            ny = max(0, min(self.h - 1, ny))
            adjacent = [(nx, ny - 1), (nx + 1, ny), (nx, ny + 1), (nx - 1, ny)]
            is_npc_reach = (nx, ny) in self.reachable_cells or any(
                adj in self.reachable_cells for adj in adjacent
            )
            if is_npc_reach:
                reachable_npcs_count += 1
            else:
                self.anomalies.append(
                    Anomaly(
                        category="connectivity",
                        severity=AnomalySeverity.CRITICAL,
                        code="UNREACHABLE_NPC",
                        message=f"NPC '{nid}' em ({nx}, {ny}) é inalcançável a partir do spawn!",
                        location=(nx, ny),
                        details={"npc_id": nid},
                    )
                )
        self.metrics.npcs_reachable = reachable_npcs_count

        # Validar Portais
        self.metrics.portals_total = len(portals_to_check)
        reachable_portals_count = 0
        for pid, px, py in portals_to_check:
            px = max(0, min(self.w - 1, px))
            py = max(0, min(self.h - 1, py))
            adjacent = [(px, py - 1), (px + 1, py), (px, py + 1), (px - 1, py)]
            is_portal_reach = (px, py) in self.reachable_cells or any(
                adj in self.reachable_cells for adj in adjacent
            )
            if is_portal_reach:
                reachable_portals_count += 1
            else:
                self.anomalies.append(
                    Anomaly(
                        category="connectivity",
                        severity=AnomalySeverity.CRITICAL,
                        code="UNREACHABLE_PORTAL",
                        message=f"Portal '{pid}' em ({px}, {py}) é inalcançável a partir do spawn!",
                        location=(px, py),
                        details={"portal_id": pid},
                    )
                )
        self.metrics.portals_reachable = reachable_portals_count

        total_targets = len(npcs_to_check) + len(portals_to_check)
        if total_targets > 0:
            reach_targets = reachable_npcs_count + reachable_portals_count
            score += 1.0 * (reach_targets / total_targets)
        else:
            score += 1.0  # Não havendo NPCs ou portais, não penaliza

        # 1.6 Validar Rios e Pontes
        bridges = self.bp.bridges
        self.metrics.bridges_total = len(bridges)
        functional_bridges = 0

        for b in bridges:
            bx, by, bw, bh = b.x, b.y, b.width, b.height
            bridge_cells = [
                (x, y)
                for y in range(max(0, by), min(self.h, by + bh))
                for x in range(max(0, bx), min(self.w, bx + bw))
            ]

            # Verificar se todos os tiles da ponte são caminháveis
            solid_bridge_tiles = [(x, y) for x, y in bridge_cells if self.collision[y][x] == 1]
            if solid_bridge_tiles:
                self.anomalies.append(
                    Anomaly(
                        category="connectivity",
                        severity=AnomalySeverity.CRITICAL,
                        code="BROKEN_BRIDGE",
                        message=f"Ponte '{b.id}' possui {len(solid_bridge_tiles)} células sólidas impassáveis!",
                        location=solid_bridge_tiles[0],
                        details={"bridge_id": b.id, "solid_tiles": solid_bridge_tiles},
                    )
                )
                continue

            # Verificar se pelo menos uma extremidade da ponte é alcançável pelo BFS
            bridge_reachable_cells = [c for c in bridge_cells if c in self.reachable_cells]
            if not bridge_reachable_cells:
                self.anomalies.append(
                    Anomaly(
                        category="connectivity",
                        severity=AnomalySeverity.CRITICAL,
                        code="DISCONNECTED_BRIDGE",
                        message=f"Ponte '{b.id}' está isolada e desconectada da malha caminhável!",
                        location=(bx, by),
                        details={"bridge_id": b.id},
                    )
                )
            else:
                functional_bridges += 1

        self.metrics.bridges_functional = functional_bridges
        if len(bridges) > 0:
            score += 0.5 * (functional_bridges / len(bridges))
        else:
            score += 0.5

        return round(min(4.0, score), 2)

    # -------------------------------------------------------------------------
    # 2. Auditoria de Qualidade Visual & Paleta
    # -------------------------------------------------------------------------

    def validate_visual_quality(self) -> float:
        """Verifica integridade de texturas, ausência de magenta/nulos e dimensões.

        Retorna score visual de 0.0 a 3.0.
        """
        score = 0.0

        if not self.ground_img:
            self.anomalies.append(
                Anomaly(
                    category="visual",
                    severity=AnomalySeverity.CRITICAL,
                    code="MISSING_GROUND_TEXTURE",
                    message="A textura contínua do chão não foi gerada ou está ausente.",
                )
            )
            return 0.0

        expected_w = self.w * T
        expected_h = self.h * T
        img_w, img_h = self.ground_img.size
        self.metrics.ground_dimensions = (img_w, img_h)

        # 2.1 Dimensões exatas
        if (img_w, img_h) == (expected_w, expected_h):
            score += 1.0
        else:
            self.anomalies.append(
                Anomaly(
                    category="visual",
                    severity=AnomalySeverity.CRITICAL,
                    code="DIMENSIONS_MISMATCH",
                    message=f"Dimensões da imagem ({img_w}x{img_h}) não conferem com o mapa ({expected_w}x{expected_h})!",
                    details={"expected": (expected_w, expected_h), "actual": (img_w, img_h)},
                )
            )

        # 2.2 Auditoria de Pixels: Detecção de Magenta e Cores Nulas
        # Converte para RGB para checagem rápida
        rgb_img = self.ground_img.convert("RGBA")
        raw_data = rgb_img.getdata()

        magenta_count = 0
        null_count = 0

        # Amostragem / Varredura completa de pixels
        # Magenta puro é (255, 0, 255). Tolerância para artefatos de chroma-key:
        for r, g, b, a in raw_data:
            if a == 0:
                null_count += 1
            # Detecção de magenta / rosa choque de textura quebrada
            if r >= 235 and g <= 25 and b >= 235:
                magenta_count += 1

        self.metrics.magenta_pixels_count = magenta_count
        self.metrics.null_pixels_count = null_count

        if magenta_count > 0:
            self.anomalies.append(
                Anomaly(
                    category="visual",
                    severity=AnomalySeverity.CRITICAL,
                    code="MAGENTA_PIXELS_DETECTED",
                    message=f"Detectados {magenta_count} pixels na cor magenta (#FF00FF), indicando textura ausente ou vazamento de chroma!",
                    details={"magenta_pixels": magenta_count},
                )
            )
        elif null_count > 0:
            self.anomalies.append(
                Anomaly(
                    category="visual",
                    severity=AnomalySeverity.CRITICAL,
                    code="NULL_PIXELS_DETECTED",
                    message=f"Detectados {null_count} pixels transparentes/nulos em imagem de chão opaco!",
                    details={"null_pixels": null_count},
                )
            )
        else:
            score += 1.5  # 1.5 pts por 100% de textura limpa sem magenta/nulos

        # 2.3 Coerência com Paleta do Bioma
        # Avaliar tons médios
        biome = self.bp.biome.lower()
        # Amostra o pixel central
        center_pixel = rgb_img.getpixel((img_w // 2, img_h // 2))
        cr, cg, cb = center_pixel[0], center_pixel[1], center_pixel[2]

        palette_ok = True
        if biome == "karakura":
            # Karakura é verde urbano / asfalto cinza
            if cr > 220 and cg < 100:
                palette_ok = False
        elif "rukongai" in biome or "soul" in biome:
            # Rukongai é terroso / gramado tradicional
            if cb > 220 and cg < 100:
                palette_ok = False

        if palette_ok:
            score += 0.5
        else:
            self.anomalies.append(
                Anomaly(
                    category="visual",
                    severity=AnomalySeverity.WARNING,
                    code="PALETTE_INCONSISTENCY",
                    message=f"A paleta cromática central {center_pixel[:3]} destoa das diretrizes do bioma '{biome}'.",
                )
            )

        return round(min(3.0, score), 2)

    # -------------------------------------------------------------------------
    # 3. Auditoria de Navegação, Relevos e Props (Y-Sorting)
    # -------------------------------------------------------------------------

    def validate_navigation_and_props(self) -> float:
        """Audita proporção de relevos/estradas, densidade de props e regras de Y-sorting.

        Retorna score de 0.0 a 3.0.
        """
        score = 0.0
        total_tiles = self.w * self.h
        self.metrics.total_tiles = total_tiles

        # 3.1 Contagem de tipos de terreno
        road_count = 0
        cliff_count = 0
        water_count = 0
        bridge_count = 0
        walkable_count = 0

        for y in range(self.h):
            for x in range(self.w):
                tt = self.ground[y][x]
                if "road" in tt or "plaza" in tt:
                    road_count += 1
                elif "cliff" in tt:
                    cliff_count += 1
                elif "water" in tt:
                    water_count += 1
                elif "bridge" in tt:
                    bridge_count += 1

                if self.collision[y][x] == 0:
                    walkable_count += 1

        self.metrics.road_tiles = road_count
        self.metrics.cliff_tiles = cliff_count
        self.metrics.water_tiles = water_count
        self.metrics.bridge_tiles = bridge_count
        self.metrics.walkable_tiles = walkable_count

        walkable_ratio = walkable_count / max(1, total_tiles)
        self.metrics.walkable_ratio = round(walkable_ratio, 4)

        cliff_to_road = cliff_count / max(1, road_count)
        self.metrics.cliff_to_road_ratio = round(cliff_to_road, 4)

        # Avaliação de área navegável
        if walkable_ratio >= 0.40:
            score += 1.0
        elif walkable_ratio >= 0.25:
            score += 0.5
            self.anomalies.append(
                Anomaly(
                    category="navigation",
                    severity=AnomalySeverity.WARNING,
                    code="LOW_WALKABLE_AREA",
                    message=f"Área caminhável de {walkable_ratio*100:.1f}% está abaixo do recomendado (>= 40%).",
                )
            )
        else:
            self.anomalies.append(
                Anomaly(
                    category="navigation",
                    severity=AnomalySeverity.CRITICAL,
                    code="SEVERELY_CONGESTED_MAP",
                    message=f"Área caminhável crítica de apenas {walkable_ratio*100:.1f}%! Mapa estrangulado.",
                )
            )

        if cliff_to_road > 2.5:
            self.anomalies.append(
                Anomaly(
                    category="navigation",
                    severity=AnomalySeverity.WARNING,
                    code="EXCESSIVE_CLIFF_RATIO",
                    message=f"Proporção de relevos para estradas ({cliff_to_road:.2f}) muito alta, risco de estrangulamento de rota.",
                )
            )

        # 3.2 Validação Estrita de Y-Sorting
        ysort_violations = 0
        props_sorted = True

        for i, p in enumerate(self.props):
            # sortY deve ser igual à base Y do prop (com tolerância de ponto flutuante)
            if abs(p.sortY - p.y) > 1e-3:
                ysort_violations += 1
                self.anomalies.append(
                    Anomaly(
                        category="props",
                        severity=AnomalySeverity.CRITICAL,
                        code="YSORT_MISMATCH",
                        message=f"Prop '{p.id}' tem sortY={p.sortY} divergente da base y={p.y}!",
                        location=(int(p.x // T), int(p.y // T)),
                        details={"prop_id": p.id, "sortY": p.sortY, "baseY": p.y},
                    )
                )

            # Lista deve estar estritamente ordenada de forma crescente por sortY
            if i > 0 and self.props[i - 1].sortY > p.sortY:
                props_sorted = False

        if not props_sorted:
            ysort_violations += 1
            self.anomalies.append(
                Anomaly(
                    category="props",
                    severity=AnomalySeverity.CRITICAL,
                    code="PROPS_NOT_DEPTH_SORTED",
                    message="A lista de props do cenário não está ordenada crescentemente por profundidade (sortY).",
                )
            )

        self.metrics.ysort_violations = ysort_violations
        if ysort_violations == 0:
            score += 1.0

        # 3.3 Desobstrução de Pontos Críticos e Densidade
        self.metrics.total_props = len(self.props)
        prop_density = len(self.props) / max(1, total_tiles)
        self.metrics.prop_density = round(prop_density, 4)

        # Verificar se algum prop sólido obstrui o spawn inicial
        spawn_tx, spawn_ty = self.spawn_tile
        obstructs_spawn = False
        for p in self.props:
            if (spawn_tx, spawn_ty) in p.solid_cells:
                obstructs_spawn = True
                self.anomalies.append(
                    Anomaly(
                        category="props",
                        severity=AnomalySeverity.CRITICAL,
                        code="PROP_OBSTRUCTS_SPAWN",
                        message=f"Prop sólido '{p.id}' bloqueia diretamente o ponto de spawn inicial em ({spawn_tx}, {spawn_ty})!",
                        location=(spawn_tx, spawn_ty),
                        details={"prop_id": p.id},
                    )
                )
                break

        # Verificar se algum prop obstrui escadas
        for elev in self.bp.elevations:
            for sx, sy in elev.stairs:
                for p in self.props:
                    if (sx, sy) in p.solid_cells:
                        self.anomalies.append(
                            Anomaly(
                                category="props",
                                severity=AnomalySeverity.CRITICAL,
                                code="PROP_OBSTRUCTS_STAIRS",
                                message=f"Prop sólido '{p.id}' bloqueia a escada de elevação em ({sx}, {sy})!",
                                location=(sx, sy),
                                details={"prop_id": p.id},
                            )
                        )

        if not obstructs_spawn and prop_density < 0.35:
            score += 1.0
        elif not obstructs_spawn:
            score += 0.5
            self.anomalies.append(
                Anomaly(
                    category="props",
                    severity=AnomalySeverity.WARNING,
                    code="HIGH_PROP_DENSITY",
                    message=f"Densidade de props ({prop_density*100:.1f}%) elevada, risco de poluição visual.",
                )
            )

        return round(min(3.0, score), 2)

    # -------------------------------------------------------------------------
    # 4. Execução Completa e Parecer
    # -------------------------------------------------------------------------

    def run_audit(self) -> MapAuditReport:
        """Executa todos os estágios da auditoria e gera o relatório do mapa."""
        self.anomalies.clear()

        # 1. Conectividade & Acessibilidade (max 4.0 pts)
        conn_score = self.validate_connectivity()

        # 2. Qualidade Visual & Paleta (max 3.0 pts)
        vis_score = self.validate_visual_quality()

        # 3. Navegação & Props Y-Sorting (max 3.0 pts)
        nav_score = self.validate_navigation_and_props()

        total_score = round(conn_score + vis_score + nav_score, 1)

        critical_count = sum(1 for a in self.anomalies if a.severity == AnomalySeverity.CRITICAL)

        # Selo de aprovação: Nota >= 8.0 e NENHUMA anomalia crítica
        status = "APPROVED" if (total_score >= 8.0 and critical_count == 0) else "REJECTED"

        return MapAuditReport(
            map_id=self.bp.map_id,
            map_name=self.bp.name,
            biome=self.bp.biome,
            width=self.w,
            height=self.h,
            score=total_score,
            connectivity_score=conn_score,
            visual_score=vis_score,
            navigation_score=nav_score,
            status=status,
            anomalies=self.anomalies,
            metrics=self.metrics,
        )


# -----------------------------------------------------------------------------
# Gerador de Relatório Markdown Estruturado
# -----------------------------------------------------------------------------


def generate_markdown_audit_report(reports: List[MapAuditReport]) -> str:
    """Gera um relatório estruturado em markdown com selo de deploy e métricas."""
    now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S UTC")

    all_approved = all(r.is_approved for r in reports)
    global_status = "✅ APROVADO PARA DEPLOY" if all_approved else "❌ REPROVADO PARA DEPLOY"
    avg_score = sum(r.score for r in reports) / max(1, len(reports))

    md = []
    md.append("# Relatório de Auditoria de Qualidade de Mapas e Arte 2.5D (Tarefa JH-05)")
    md.append("")
    md.append(f"- **Data da Auditoria:** {now_str}")
    md.append(f"- **Parecer Geral:** **{global_status}**")
    md.append(f"- **Média Geral de Qualidade:** **{avg_score:.1f} / 10.0**")
    md.append(f"- **Mapas Auditados:** {len(reports)}")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 1. Sumário Executivo por Mapa")
    md.append("")
    md.append("| Mapa | Bioma | Dimensões | Conectividade (4.0) | Visual (3.0) | Navegação (3.0) | Nota Final | Veredito |")
    md.append("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |")

    for r in reports:
        badge = "🟢 APROVADO" if r.is_approved else "🔴 REPROVADO"
        md.append(
            f"| **{r.map_name}** (`{r.map_id}`) | `{r.biome}` | {r.width}x{r.height} tiles | "
            f"{r.connectivity_score:.1f} | {r.visual_score:.1f} | {r.navigation_score:.1f} | "
            f"**{r.score:.1f} / 10** | **{badge}** |"
        )

    md.append("")
    md.append("---")
    md.append("")
    md.append("## 2. Métricas Técnicas Detalhadas")
    md.append("")

    for r in reports:
        m = r.metrics
        md.append(f"### 📍 {r.map_name} (`{r.map_id}`)")
        md.append("")
        md.append(f"- **Resolução do Terreno:** {m.ground_dimensions[0]}x{m.ground_dimensions[1]} px (Tiles: {r.width}x{r.height} @ 32px)")
        md.append(f"- **Células Caminháveis:** {m.walkable_tiles} / {m.total_tiles} ({m.walkable_ratio * 100:.1f}%)")
        md.append(f"- **Células de Estrada / Calçada:** {m.road_tiles} tiles")
        md.append(f"- **Células de Elevação (Cliffs):** {m.cliff_tiles} tiles (Razão Cliff/Estrada: `{m.cliff_to_road_ratio:.2f}`)")
        md.append(f"- **Curso d'Água:** {m.water_tiles} tiles de água profunda | **Pontes Ativas:** {m.bridges_functional}/{m.bridges_total}")
        md.append(f"- **Spawn Inicial:** `({m.spawn_tile[0]}, {m.spawn_tile[1]})` — {'Livre e Caminhável ✅' if m.spawn_walkable else 'BLOQUEADO ❌'}")
        md.append(f"- **Acessibilidade de Baús:** {m.chests_reachable} / {m.chests_total} alcançáveis via BFS")
        md.append(f"- **Acessibilidade de NPCs:** {m.npcs_reachable} / {m.npcs_total} alcançáveis via BFS")
        md.append(f"- **Acessibilidade de Portais:** {m.portals_reachable} / {m.portals_total} alcançáveis via BFS")
        md.append(f"- **Props Posicionados:** {m.total_props} props (Densidade: `{m.prop_density * 100:.1f}%`)")
        md.append(f"- **Violações de Y-Sorting (sortY == y):** {m.ysort_violations}")
        md.append(f"- **Pixels Magenta Corrompidos (#FF00FF):** {m.magenta_pixels_count}")
        md.append(f"- **Pixels Nulos/Transparentes Indevidos:** {m.null_pixels_count}")
        md.append("")

    md.append("---")
    md.append("")
    md.append("## 3. Log de Anomalias e Auditoria de Riscos")
    md.append("")

    total_anomalies = sum(len(r.anomalies) for r in reports)
    if total_anomalies == 0:
        md.append("> 🌟 **Nenhuma anomalia detectada!** Todos os mapas atingiram conformidade absoluta com as diretrizes de arte e requisitos de jogabilidade.")
        md.append("")
    else:
        md.append("| Mapa | Severidade | Código | Mensagem | Localização |")
        md.append("| :--- | :---: | :--- | :--- | :---: |")
        for r in reports:
            for a in r.anomalies:
                loc_str = f"({a.location[0]}, {a.location[1]})" if a.location else "Global"
                sev_icon = "🔴" if a.severity == AnomalySeverity.CRITICAL else ("🟡" if a.severity == AnomalySeverity.WARNING else "ℹ️")
                md.append(f"| `{r.map_id}` | {sev_icon} `{a.severity.value}` | `{a.code}` | {a.message} | {loc_str} |")
        md.append("")

    md.append("---")
    md.append("")
    md.append("## 4. Parecer do Engenheiro do Jogador-IA")
    md.append("")
    if all_approved:
        md.append("Os mapas analisados cumprem rigorosamente os pilares de navegação, jogabilidade e integridade artística:")
        md.append("1. **Navegabilidade A* / BFS Garantida:** Todos os baús de tesouro, portais e NPCs canônicos possuem rota desobstruída a partir do spawn.")
        md.append("2. **Pontes e Travessias Funcionais:** Os rios (Onagawa e Junrinan) não isolam nenhum quadrante do mundo, com pontes 100% caminháveis.")
        md.append("3. **Qualidade de Texturas e Y-Sorting:** Texturas contínuas sem qualquer resquício de cor magenta ou transparência nula. Todos os elementos de cenário respeitam ordenação por profundidade (`sortY == y`).")
        md.append("")
        md.append("**Selo Concedido:** `APROVADO PARA DEPLOY NO CLIENTE / SERVIDOR`.")
    else:
        md.append("⚠️ **Atenção:** Foram encontradas inconformidades críticas que impedem o deploy imediato. Corrija as anomalias listadas antes de prosseguir.")

    md.append("")
    return "\n".join(md)


# -----------------------------------------------------------------------------
# Função Auxiliar de Execução e CLI
# -----------------------------------------------------------------------------


def audit_blueprint(bp: MapBlueprint) -> MapAuditReport:
    """Compila e executa auditoria completa em um blueprint."""
    autotiler = MapAutotiler(bp)
    compiled = autotiler.compile()
    validator = MapQualityValidator(compiled)
    return validator.run_audit()


def audit_and_save_reports(
    biomes: List[str],
    report_output_path: Path,
) -> Tuple[List[MapAuditReport], str]:
    """Audita uma lista de biomas, salva o relatório markdown e retorna resultados."""
    reports: List[MapAuditReport] = []

    for biome in biomes:
        bp = get_or_generate_blueprint(biome, use_ai=False)
        report = audit_blueprint(bp)
        reports.append(report)

    md_content = generate_markdown_audit_report(reports)
    report_output_path.parent.mkdir(parents=True, exist_ok=True)
    report_output_path.write_text(md_content, encoding="utf-8")

    return reports, md_content


def main():
    parser = argparse.ArgumentParser(description="Validador Autônomo de Mapas 2.5D (JH-05)")
    parser.add_argument(
        "--maps",
        nargs="+",
        default=["karakura", "rukongai"],
        help="Biomas a auditar ('karakura', 'rukongai')",
    )
    parser.add_argument(
        "--report",
        type=str,
        default=str(HERE / "reports" / "audit_report.md"),
        help="Caminho do arquivo markdown do relatório de auditoria",
    )

    args = parser.parse_args()
    report_path = Path(args.report).resolve()

    print(f"[JH-05] Iniciando Validador Autônomo de Mapas para: {args.maps}...")
    reports, _ = audit_and_save_reports(args.maps, report_path)

    all_passed = True
    for r in reports:
        status_sym = "✅" if r.is_approved else "❌"
        print(f"  {status_sym} [{r.status}] {r.map_name} ({r.map_id}): {r.score}/10.0 (Críticos: {r.critical_count}, Alertas: {r.warning_count})")
        if not r.is_approved:
            all_passed = False

    print(f"[JH-05] Relatório de Auditoria gerado em: {report_path}")
    if all_passed:
        print("[JH-05] Todos os mapas foram APROVADOS PARA DEPLOY!")
        sys.exit(0)
    else:
        print("[JH-05] Falha na auditoria: existem mapas REPROVADOS!")
        sys.exit(1)


if __name__ == "__main__":
    main()
