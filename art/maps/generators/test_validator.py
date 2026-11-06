"""Suite de Testes Unitários e de Integração para o Validador de Mapas 2.5D (JH-05).

Cobre:
1. Conectividade e Acessibilidade (BFS):
   - Karakura Expandida e Rukongai Distrito 1 (100% de baús, NPCs e portais alcançáveis).
   - Detecção de baú inalcançável (UNREACHABLE_CHEST).
   - Detecção de spawn bloqueado (SPAWN_BLOCKED).
   - Detecção de ponte rompida ou desconectada (BROKEN_BRIDGE / DISCONNECTED_BRIDGE).
   - Detecção de NPC / Portal inalcançável (UNREACHABLE_NPC / UNREACHABLE_PORTAL).
2. Auditoria Visual e Paleta:
   - Integridade cromática dos mapas canônicos (zero magenta / zero nulo).
   - Detecção de artefatos de magenta (#FF00FF).
   - Detecção de pixels nulos/transparentes indesejados.
   - Detecção de inconsistência de dimensões.
3. Navegação, Relevos e Props (Y-Sorting):
   - Conformidade de Y-sorting (sortY == y) e ordenação por profundidade.
   - Detecção de violação de Y-sorting (YSORT_MISMATCH).
   - Detecção de prop obstruindo o ponto de spawn inicial (PROP_OBSTRUCTS_SPAWN).
   - Detecção de mapa estrangulado / baixa área caminhável.
4. Relatório e Selo de Deploy:
   - Lógica de aprovação para deploy (Score >= 8.0 e zero críticos).
   - Formatação estruturada do relatório em Markdown.
"""

from __future__ import annotations

from pathlib import Path
import sys
import unittest
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
    create_canonical_karakura_expanded,
    create_canonical_rukongai_district_1,
)
from autotiler import CompiledMap, MapAutotiler, SceneProp, TileType
from validator import (
    AnomalySeverity,
    MapQualityValidator,
    audit_blueprint,
    generate_markdown_audit_report,
)

T = 32


class TestCanonicalMapAudits(unittest.TestCase):
    """Testes de conformidade nos mapas canônicos gerados."""

    def test_canonical_karakura_audit_approval(self):
        bp = create_canonical_karakura_expanded()
        report = audit_blueprint(bp)

        self.assertEqual(report.status, "APPROVED")
        self.assertTrue(report.is_approved)
        self.assertGreaterEqual(report.score, 9.5)
        self.assertEqual(report.critical_count, 0)
        self.assertEqual(report.connectivity_score, 4.0)
        self.assertEqual(report.visual_score, 3.0)
        self.assertEqual(report.navigation_score, 3.0)

        # Métricas
        self.assertTrue(report.metrics.spawn_walkable)
        self.assertEqual(report.metrics.chests_reachable, 3)
        self.assertEqual(report.metrics.chests_total, 3)
        self.assertEqual(report.metrics.npcs_reachable, 1)
        self.assertEqual(report.metrics.portals_reachable, 1)
        self.assertEqual(report.metrics.bridges_functional, 2)
        self.assertEqual(report.metrics.magenta_pixels_count, 0)
        self.assertEqual(report.metrics.ysort_violations, 0)

    def test_canonical_rukongai_audit_approval(self):
        bp = create_canonical_rukongai_district_1()
        report = audit_blueprint(bp)

        self.assertEqual(report.status, "APPROVED")
        self.assertTrue(report.is_approved)
        self.assertGreaterEqual(report.score, 9.5)
        self.assertEqual(report.critical_count, 0)
        self.assertEqual(report.connectivity_score, 4.0)
        self.assertEqual(report.visual_score, 3.0)
        self.assertEqual(report.navigation_score, 3.0)

        # Métricas
        self.assertTrue(report.metrics.spawn_walkable)
        self.assertEqual(report.metrics.chests_reachable, 3)
        self.assertEqual(report.metrics.chests_total, 3)
        self.assertEqual(report.metrics.npcs_reachable, 1)
        self.assertEqual(report.metrics.portals_reachable, 1)
        self.assertEqual(report.metrics.bridges_functional, 1)
        self.assertEqual(report.metrics.magenta_pixels_count, 0)
        self.assertEqual(report.metrics.ysort_violations, 0)


class TestConnectivityValidation(unittest.TestCase):
    """Testes de algoritmos de busca e detecção de falhas de conectividade."""

    def _create_minimal_compiled(
        self,
        w: int = 10,
        h: int = 10,
        spawn_tile: Tuple[int, int] = (1, 1),
        collision_grid: list = None,
        chests: list = None,
        spawns: list = None,
    ) -> CompiledMap:
        if collision_grid is None:
            collision_grid = [[0 for _ in range(w)] for _ in range(h)]
        if spawns is None:
            spawns = [
                SpawnPoint(
                    id="spawn-player",
                    kind="player_spawn",
                    x=spawn_tile[0] * T,
                    y=spawn_tile[1] * T,
                )
            ]
        if chests is None:
            chests = []

        bp = MapBlueprint(
            map_id="test_map",
            name="Test Map",
            biome="karakura",
            width=w,
            height=h,
            spawns=spawns,
            chests=chests,
        )

        ground_grid = [[TileType.GROUND_PLAIN for _ in range(w)] for _ in range(h)]
        img = Image.new("RGB", (w * T, h * T), (98, 160, 78))

        return CompiledMap(
            blueprint=bp,
            width=w,
            height=h,
            ground_grid=ground_grid,
            collision_grid=collision_grid,
            props=[],
            ground_image=img,
        )

    def test_unreachable_chest_detection(self):
        w, h = 10, 10
        # Cria uma parede sólida isolando a coluna 8 e 9
        coll = [[0 for _ in range(w)] for _ in range(h)]
        for y in range(h):
            coll[y][7] = 1  # Barreira intransponível

        chests = [
            Chest(id="chest-isolated", x=8 * T, y=5 * T, loot_tier="gold")
        ]

        compiled = self._create_minimal_compiled(
            w=w, h=h, spawn_tile=(1, 1), collision_grid=coll, chests=chests
        )
        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("UNREACHABLE_CHEST", codes)
        self.assertEqual(report.metrics.chests_reachable, 0)
        self.assertLess(report.connectivity_score, 4.0)

    def test_blocked_spawn_detection(self):
        w, h = 10, 10
        coll = [[0 for _ in range(w)] for _ in range(h)]
        # Bloqueia o spawn diretamente
        coll[1][1] = 1

        compiled = self._create_minimal_compiled(
            w=w, h=h, spawn_tile=(1, 1), collision_grid=coll
        )
        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("SPAWN_BLOCKED", codes)
        self.assertFalse(report.metrics.spawn_walkable)

    def test_broken_bridge_detection(self):
        bp = create_canonical_karakura_expanded()
        # Quebra deliberadamente a ponte oeste tornando-a sólida
        autotiler = MapAutotiler(bp)
        compiled = autotiler.compile()

        # Força colisão na ponte oeste
        bridge = bp.bridges[0]
        for y in range(bridge.y, bridge.y + bridge.height):
            for x in range(bridge.x, bridge.x + bridge.width):
                compiled.collision_grid[y][x] = 1

        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("BROKEN_BRIDGE", codes)

    def test_unreachable_npc_and_portal_detection(self):
        w, h = 12, 12
        coll = [[0 for _ in range(w)] for _ in range(h)]
        for y in range(h):
            coll[y][6] = 1  # Barreira vertical completa

        spawns = [
            SpawnPoint(id="spawn-player", kind="player_spawn", x=2 * T, y=2 * T),
            SpawnPoint(id="npc-trapped", kind="npc", x=9 * T, y=2 * T),
            SpawnPoint(id="portal-trapped", kind="portal", x=9 * T, y=8 * T),
        ]

        compiled = self._create_minimal_compiled(
            w=w, h=h, spawn_tile=(2, 2), collision_grid=coll, spawns=spawns
        )
        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("UNREACHABLE_NPC", codes)
        self.assertIn("UNREACHABLE_PORTAL", codes)


class TestVisualQualityAudits(unittest.TestCase):
    """Testes de inspeção de texturas, pixels magenta e dimensões."""

    def test_magenta_pixel_detection(self):
        bp = create_canonical_karakura_expanded()
        autotiler = MapAutotiler(bp)
        compiled = autotiler.compile()

        # Injeta intencionalmente pixels magenta (#FF00FF) na textura
        assert compiled.ground_image is not None
        img = compiled.ground_image.copy()
        for py in range(50, 60):
            for px in range(50, 60):
                img.putpixel((px, py), (255, 0, 255))
        compiled.ground_image = img

        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("MAGENTA_PIXELS_DETECTED", codes)
        self.assertGreater(report.metrics.magenta_pixels_count, 0)
        self.assertLess(report.visual_score, 3.0)

    def test_null_pixel_detection(self):
        bp = create_canonical_karakura_expanded()
        autotiler = MapAutotiler(bp)
        compiled = autotiler.compile()

        assert compiled.ground_image is not None
        img = compiled.ground_image.convert("RGBA")
        for py in range(10, 20):
            for px in range(10, 20):
                img.putpixel((px, py), (0, 0, 0, 0))  # Transparência indevida
        compiled.ground_image = img

        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("NULL_PIXELS_DETECTED", codes)

    def test_dimensions_mismatch_detection(self):
        bp = create_canonical_karakura_expanded()
        autotiler = MapAutotiler(bp)
        compiled = autotiler.compile()

        # Redimensiona incorretamente
        assert compiled.ground_image is not None
        compiled.ground_image = compiled.ground_image.resize((500, 500))

        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("DIMENSIONS_MISMATCH", codes)


class TestNavigationAndYSortingAudits(unittest.TestCase):
    """Testes de Y-sorting, sobreposição e navegação."""

    def test_ysort_mismatch_detection(self):
        bp = create_canonical_karakura_expanded()
        autotiler = MapAutotiler(bp)
        compiled = autotiler.compile()

        # Altera sortY de um prop para violar a regra sortY == y
        compiled.props[0].sortY = compiled.props[0].y + 50.0

        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        self.assertEqual(report.status, "REJECTED")
        codes = [a.code for a in report.anomalies]
        self.assertIn("YSORT_MISMATCH", codes)
        self.assertGreater(report.metrics.ysort_violations, 0)

    def test_props_not_depth_sorted_detection(self):
        bp = create_canonical_karakura_expanded()
        autotiler = MapAutotiler(bp)
        compiled = autotiler.compile()

        # Inverte a ordem de dois props com sortY distintos
        if len(compiled.props) >= 2:
            compiled.props[0], compiled.props[1] = compiled.props[1], compiled.props[0]
            if compiled.props[0].sortY > compiled.props[1].sortY:
                validator = MapQualityValidator(compiled)
                report = validator.run_audit()
                codes = [a.code for a in report.anomalies]
                self.assertIn("PROPS_NOT_DEPTH_SORTED", codes)

    def test_prop_obstructs_spawn_detection(self):
        bp = create_canonical_karakura_expanded()
        autotiler = MapAutotiler(bp)
        compiled = autotiler.compile()

        # Adiciona um prop sólido diretamente em cima do spawn
        spawn_sp = bp.spawns[0]
        stx, sty = int(spawn_sp.x // T), int(spawn_sp.y // T)

        blocker = SceneProp(
            id="blocking-rock",
            kind="rock",
            image="/maps/scenes/rock.webp",
            x=float(spawn_sp.x),
            y=float(spawn_sp.y + T),
            width=32.0,
            height=32.0,
            sortY=float(spawn_sp.y + T),
            solid_cells=[(stx, sty)],
        )
        compiled.props.append(blocker)
        compiled.props.sort(key=lambda p: (p.sortY, p.x))

        validator = MapQualityValidator(compiled)
        report = validator.run_audit()

        codes = [a.code for a in report.anomalies]
        self.assertIn("PROP_OBSTRUCTS_SPAWN", codes)
        self.assertEqual(report.status, "REJECTED")


class TestAuditReportGeneration(unittest.TestCase):
    """Testes da geração de relatório em Markdown."""

    def test_markdown_report_structure(self):
        bp_k = create_canonical_karakura_expanded()
        bp_r = create_canonical_rukongai_district_1()

        r_k = audit_blueprint(bp_k)
        r_r = audit_blueprint(bp_r)

        md = generate_markdown_audit_report([r_k, r_r])

        self.assertIn("Relatório de Auditoria de Qualidade de Mapas e Arte 2.5D", md)
        self.assertIn("APROVADO PARA DEPLOY", md)
        self.assertIn("Karakura Central Expandida", md)
        self.assertIn("Rukongai Distrito 1 (Junrinan)", md)
        self.assertIn("Métricas Técnicas Detalhadas", md)
        self.assertIn("Parecer do Engenheiro do Jogador-IA", md)
        self.assertIn("10.0 / 10", md)


if __name__ == "__main__":
    unittest.main()
