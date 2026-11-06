"""Suite de Testes Unitários e de Integração para a Esteira de Mapas 2.5D (JH-04).

Valida:
1. Modelo semântico e serialização/deserialização do Blueprint.
2. Blueprints canônicos determinísticos de Karakura Expandida e Rukongai Distrito 1.
3. Formatação do prompt para Gemini e tratamento de fallback.
4. Algoritmo de bitmask autotiling para margens de rios e corpos d'água.
5. Elevações 2.5D com escadas transitáveis (Pokémon Omega Ruby style).
6. Posicionamento de props com ordenação estrita em Y (sortY == y).
7. Alcance garantido e metadados de baús de tesouro.
8. Exportação do mapa Tiled (.tmj), imagem contínua do chão e worldSceneData.
"""

from __future__ import annotations

import json
import math
import sys
import unittest
from pathlib import Path

# Adiciona o diretório dos geradores ao sys.path
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
    build_gemini_prompt,
    create_canonical_karakura_expanded,
    create_canonical_rukongai_district_1,
    get_or_generate_blueprint,
)
from autotiler import (
    BIT_E,
    BIT_N,
    BIT_NE,
    BIT_NW,
    BIT_S,
    BIT_SE,
    BIT_SW,
    BIT_W,
    CompiledMap,
    MapAutotiler,
    TileType,
    classify_water_tile,
    compute_8bit_bitmask,
    compute_cardinal_bitmask,
    export_to_scene_data,
    export_to_tiled_json,
)


class TestSemanticBlueprint(unittest.TestCase):
    """Testes do modelo de dados e serialização do Blueprint."""

    def test_blueprint_serialization_roundtrip(self):
        bp = create_canonical_karakura_expanded()
        json_str = bp.to_json()
        reconstructed = MapBlueprint.from_json(json_str)

        self.assertEqual(bp.map_id, reconstructed.map_id)
        self.assertEqual(bp.name, reconstructed.name)
        self.assertEqual(bp.width, reconstructed.width)
        self.assertEqual(bp.height, reconstructed.height)
        self.assertEqual(len(bp.landmarks), len(reconstructed.landmarks))
        self.assertEqual(len(bp.chests), len(reconstructed.chests))
        self.assertEqual(len(bp.bridges), len(reconstructed.bridges))
        self.assertEqual(len(bp.elevations), len(reconstructed.elevations))

    def test_canonical_karakura_features(self):
        bp = create_canonical_karakura_expanded()
        self.assertEqual(bp.map_id, "karakura_expanded")
        self.assertEqual(bp.biome, "karakura")
        self.assertEqual((bp.width, bp.height), (64, 48))

        # Deve conter o Rio Onagawa e 2 pontes
        self.assertIsNotNone(bp.river)
        self.assertEqual(bp.river.name, "Rio Onagawa")
        self.assertEqual(len(bp.bridges), 2)
        bridge_ids = [b.id for b in bp.bridges]
        self.assertIn("bridge-west", bridge_ids)
        self.assertIn("bridge-east", bridge_ids)

        # Deve conter marcos canônicos
        landmark_ids = [lm.id for lm in bp.landmarks]
        self.assertIn("urahara-shop", landmark_ids)
        self.assertIn("kurosaki-clinic", landmark_ids)

        # Deve conter pelo menos 3 baús
        self.assertGreaterEqual(len(bp.chests), 3)
        chest_tiers = {c.loot_tier for c in bp.chests}
        self.assertIn("silver", chest_tiers)
        self.assertIn("bronze", chest_tiers)
        self.assertIn("gold", chest_tiers)

        # Spawns devem conter player_spawn e zona segura (pz)
        spawn_kinds = [s.kind for s in bp.spawns]
        self.assertIn("player_spawn", spawn_kinds)
        self.assertIn("pz", spawn_kinds)

    def test_canonical_rukongai_features(self):
        bp = create_canonical_rukongai_district_1()
        self.assertEqual(bp.map_id, "rukongai_district_1")
        self.assertEqual(bp.biome, "rukongai")
        self.assertEqual((bp.width, bp.height), (64, 48))

        # Deve conter riacho e ponte de madeira
        self.assertIsNotNone(bp.river)
        self.assertEqual(len(bp.bridges), 1)
        self.assertEqual(bp.bridges[0].material, "wood")

        # Deve conter dojo/santuário e casas de Rukongai
        landmark_ids = [lm.id for lm in bp.landmarks]
        self.assertIn("junrinan-dojo-shrine", landmark_ids)
        self.assertIn("rukongai-house-1", landmark_ids)

        # Deve conter cerejeiras (sakura) e lanternas de pedra
        prop_kinds = {p.kind for p in bp.props}
        self.assertIn("tree", prop_kinds)
        self.assertIn("lantern", prop_kinds)

        # Baú com loot tier espiritual
        chest_tiers = {c.loot_tier for c in bp.chests}
        self.assertIn("spiritual", chest_tiers)

        # Desnível com escadaria
        self.assertGreaterEqual(len(bp.elevations), 1)
        self.assertGreater(len(bp.elevations[0].stairs), 0)

    def test_gemini_prompt_structure(self):
        prompt = build_gemini_prompt("seireitei", "Quartéis do 11º Esquadrão")
        self.assertIn("seireitei", prompt)
        self.assertIn("Quartéis do 11º Esquadrão", prompt)
        self.assertIn("map_id", prompt)
        self.assertIn("chests", prompt)
        self.assertIn("bridges", prompt)

    def test_unified_generator_fallback(self):
        bp_karakura = get_or_generate_blueprint("karakura")
        self.assertEqual(bp_karakura.map_id, "karakura_expanded")

        bp_rukongai = get_or_generate_blueprint("rukongai_district_1")
        self.assertEqual(bp_rukongai.map_id, "rukongai_district_1")


class TestBitmaskAutotiler(unittest.TestCase):
    """Testes do algoritmo de bitmask autotiling para margens de rios."""

    def test_cardinal_bitmask_computation(self):
        # Grade 3x3 onde o centro é cercado por N e S
        grid = [
            [False, True, False],
            [False, True, False],
            [False, True, False],
        ]
        mask = compute_cardinal_bitmask(grid, 1, 1, 3, 3)
        self.assertEqual(mask, BIT_N | BIT_S)

    def test_8bit_bitmask_computation(self):
        # Grade 3x3 com água completa
        grid = [[True, True, True], [True, True, True], [True, True, True]]
        mask = compute_8bit_bitmask(grid, 1, 1, 3, 3)
        expected = BIT_N | BIT_E | BIT_S | BIT_W | BIT_NE | BIT_SE | BIT_SW | BIT_NW
        self.assertEqual(mask, expected)

    def test_classify_water_tile(self):
        # Centro d'água pleno
        full_mask = BIT_N | BIT_E | BIT_S | BIT_W | BIT_NE | BIT_SE | BIT_SW | BIT_NW
        self.assertEqual(classify_water_tile(full_mask), TileType.WATER_CENTER)

        # Margem norte (terra ao norte, água ao sul/leste/oeste)
        north_edge_mask = BIT_E | BIT_S | BIT_W | BIT_SE | BIT_SW
        self.assertEqual(classify_water_tile(north_edge_mask), TileType.WATER_EDGE_N)

        # Margem sul (água ao norte/leste/oeste, terra ao sul)
        south_edge_mask = BIT_N | BIT_E | BIT_W | BIT_NE | BIT_NW
        self.assertEqual(classify_water_tile(south_edge_mask), TileType.WATER_EDGE_S)

        # Canto externo NW (terra ao norte e oeste, água ao sul e leste)
        outer_nw_mask = BIT_E | BIT_S | BIT_SE
        self.assertEqual(classify_water_tile(outer_nw_mask), TileType.WATER_CORNER_OUTER_NW)

        # Canto interno NW (água em todas as direções cardeais, mas NW é terra)
        inner_nw_mask = BIT_N | BIT_E | BIT_S | BIT_W | BIT_NE | BIT_SE | BIT_SW
        self.assertEqual(classify_water_tile(inner_nw_mask), TileType.WATER_CORNER_INNER_NW)


class TestMapAutotilerPipeline(unittest.TestCase):
    """Testes da compilação completa do mapa, relevo 2.5D, Y-sorting e acessibilidade."""

    @classmethod
    def setUpClass(cls):
        cls.bp_karakura = create_canonical_karakura_expanded()
        cls.autotiler_karakura = MapAutotiler(cls.bp_karakura)
        cls.compiled_karakura = cls.autotiler_karakura.compile()

        cls.bp_rukongai = create_canonical_rukongai_district_1()
        cls.autotiler_rukongai = MapAutotiler(cls.bp_rukongai)
        cls.compiled_rukongai = cls.autotiler_rukongai.compile()

    def test_dimensions_match(self):
        self.assertEqual(self.compiled_karakura.width, 64)
        self.assertEqual(self.compiled_karakura.height, 48)
        self.assertEqual(len(self.compiled_karakura.ground_grid), 48)
        self.assertEqual(len(self.compiled_karakura.ground_grid[0]), 64)
        self.assertEqual(len(self.compiled_karakura.collision_grid), 48)
        self.assertEqual(len(self.compiled_karakura.collision_grid[0]), 64)

    def test_river_and_bridge_walkability(self):
        """Água profunda deve ser sólida, mas pontes sobre o rio DEVEM ser caminháveis."""
        comp = self.compiled_karakura
        bp = self.bp_karakura

        # Pelo menos um tile de água deve ser intransitável
        water_cells_found = 0
        for y in range(comp.height):
            for x in range(comp.width):
                if "water" in comp.ground_grid[y][x]:
                    water_cells_found += 1
                    self.assertEqual(comp.collision_grid[y][x], 1)
        self.assertGreater(water_cells_found, 100)

        # Todas as células de pontes devem ter colisão liberada (0)
        for b in bp.bridges:
            for by in range(b.y, b.y + b.height):
                for bx in range(b.x, b.x + b.width):
                    self.assertEqual(
                        comp.collision_grid[by][bx],
                        0,
                        f"Tile da ponte em ({bx}, {by}) deve ser transitável (0)",
                    )
                    self.assertTrue(
                        "bridge" in comp.ground_grid[by][bx],
                        f"Tile ({bx}, {by}) deve ser do tipo bridge",
                    )

    def test_elevation_and_stairs_walkability(self):
        """Paredes de cliff devem ser sólidas, e escadas devem ser transitáveis."""
        comp = self.compiled_rukongai
        elev = comp.blueprint.elevations[0]

        # Paredes do cliff: colisão sólida
        for wx, wy in elev.wall_tiles:
            self.assertEqual(
                comp.collision_grid[wy][wx],
                1,
                f"Paredão do cliff em ({wx}, {wy}) deve ter colisão sólida",
            )
            self.assertEqual(comp.ground_grid[wy][wx], TileType.CLIFF_FACE_CENTER)

        # Escadas: passagem transitável aberta
        for sx, sy in elev.stairs:
            self.assertEqual(
                comp.collision_grid[sy][sx],
                0,
                f"Escada em ({sx}, {sy}) deve ser transitável",
            )
            self.assertEqual(comp.ground_grid[sy][sx], TileType.CLIFF_STAIRS)

    def test_prop_y_sorting_integrity(self):
        """Todos os props devem ter sortY estritamente igual à sua base (y), ordenados crescentemente."""
        for comp in [self.compiled_karakura, self.compiled_rukongai]:
            props = comp.props
            self.assertGreater(len(props), 15)

            for p in props:
                # Regra canônica do Bleach Idle: sortY == y
                self.assertEqual(
                    p.sortY,
                    p.y,
                    f"Prop {p.id} deve ter sortY == y para Y-sorting do motor",
                )
                self.assertGreater(p.width, 0)
                self.assertGreater(p.height, 0)
                self.assertTrue(math.isfinite(p.x))
                self.assertTrue(math.isfinite(p.y))

            # A lista de props deve estar ordenada de forma não-decrescente por sortY
            for i in range(len(props) - 1):
                self.assertLessEqual(
                    props[i].sortY,
                    props[i + 1].sortY,
                    f"Props devem estar ordenados por profundidade sortY: {props[i].id} > {props[i+1].id}",
                )

    def test_chest_accessibility_and_metadata(self):
        """Todo baú deve ter metadados válidos e pelo menos 1 célula vizinha transitável."""
        for comp in [self.compiled_karakura, self.compiled_rukongai]:
            chests = [p for p in comp.props if p.kind == "chest"]
            self.assertGreaterEqual(len(chests), 3)

            for c in chests:
                self.assertEqual(c.interact_kind, "chest")
                self.assertIn("loot_tier", c.metadata)
                self.assertIn("secret_level", c.metadata)
                self.assertIn("accessible_from", c.metadata)

                accessible = c.metadata["accessible_from"]
                self.assertGreaterEqual(
                    len(accessible),
                    1,
                    f"Baú {c.id} deve ser alcançável por pelo menos um lado",
                )

                # Confirma que a célula declarada acessível é realmente caminhável
                ax, ay = accessible[0]
                self.assertEqual(
                    comp.collision_grid[ay][ax],
                    0,
                    f"Célula adjacente ({ax}, {ay}) ao baú {c.id} deve ser caminhável",
                )

    def test_ground_image_rendering(self):
        """Deve gerar imagem contínua em alta resolução correspondente às dimensões em pixels."""
        img = self.compiled_karakura.ground_image
        self.assertIsNotNone(img)
        self.assertEqual(img.size, (64 * 32, 48 * 32))  # 2048 x 1536 px
        self.assertEqual(img.mode, "RGB")

    def test_tiled_and_scene_export(self):
        """Exportação deve gerar JSON no formato exato Tiled .tmj e worldSceneData."""
        comp = self.compiled_karakura
        tmj = export_to_tiled_json(comp, "/maps/scenes/karakura_expanded-ground.webp")
        scene = export_to_scene_data(comp, "/maps/scenes/karakura_expanded-ground.webp")

        # Validações do TMJ
        self.assertEqual(tmj["width"], 64)
        self.assertEqual(tmj["height"], 48)
        layer_names = [l["name"] for l in tmj["layers"]]
        self.assertIn("chao", layer_names)
        self.assertIn("colisao_cenario", layer_names)
        self.assertIn("cenario", layer_names)
        self.assertIn("logica", layer_names)

        # Camada cenario deve conter os mesmos props
        cenario_layer = next(l for l in tmj["layers"] if l["name"] == "cenario")
        self.assertEqual(len(cenario_layer["objects"]), len(comp.props))
        self.assertEqual(len(scene["props"]), len(comp.props))

        # Relação geométrica entre Tiled e SceneData:
        # object.x == prop.x - prop.width / 2 e object.y == prop.y
        for prop, obj in zip(comp.props, cenario_layer["objects"]):
            self.assertEqual(obj["name"], prop.id)
            self.assertAlmostEqual(obj["x"], prop.x - prop.width / 2, places=2)
            self.assertAlmostEqual(obj["y"], prop.y, places=2)
            sort_prop = next(p["value"] for p in obj["properties"] if p["name"] == "sortY")
            self.assertEqual(sort_prop, prop.sortY)


def run_tests():
    """Executa a suite e exibe os resultados formatados."""
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
