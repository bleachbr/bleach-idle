"""Regressões das ferramentas de arte, sem modificar mapas públicos."""
import ast
import hashlib
import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "renewal"))
import assemble
import build_regions


class ArtTools(unittest.TestCase):
    def test_real_pillar_preserves_10325_enclosed_purple_pixels(self):
        source = Image.open(HERE.parent / "renewal/dangai-pillar.png").convert("RGBA")
        clean = assemble.remove_exterior_magenta(source)
        preserved = sum(1 for (r, g, b, a), (_, _, _, out_alpha) in zip(source.getdata(), clean.getdata())
                        if a and out_alpha and r > 130 and b > 110 and g < 110 and r > g*1.5 and b > g*1.5)
        self.assertEqual(preserved, 10325)

    def test_preview_clips_monument_at_world_boundary(self):
        canvas = Image.new("RGBA", (4, 4))
        prop = Image.new("RGBA", (3, 3), (40, 60, 80, 255))
        build_regions.composite_visible(canvas, prop, -1, -2)
        self.assertEqual(canvas.getbbox(), (0, 0, 2, 1))
        self.assertEqual(canvas.getpixel((0, 0)), (40, 60, 80, 255))

    def test_bad_prompt_does_not_change_public_atlases(self):
        with tempfile.TemporaryDirectory(prefix="bleach-art-test-") as folder:
            root = Path(folder)
            maps = root / "public"
            maps.mkdir()
            (root / "retained").mkdir()
            catalog = {}
            for name in ("karakura", "soul", "falsa", "wandenreich"):
                data = json.dumps({"tilesets": [{"imagewidth": 8, "imageheight": 8}]})
                (maps / f"{name}.tmj").write_text(data)
                Image.new("RGBA", (8, 8), (10, 20, 30, 255)).save(root / f"retained/{name}_tiles.png")
                Image.new("RGBA", (8, 8), (60, 70, 80, 255)).save(maps / f"{name}_tiles.png")
                catalog[name] = {"mapSha256": hashlib.sha256((maps / f"{name}.tmj").read_bytes()).hexdigest(), "keys": {}}
            (root / "missing.prompt.txt").write_text("fonte ausente")
            before = {p: p.read_bytes() for p in maps.glob("*.png")}
            with patch.object(assemble, "HERE", root), patch.object(assemble, "MAPS", maps), \
                    patch.object(assemble, "CATALOG", catalog), patch.object(assemble, "GROUNDS", {"karakura": [], "soul": []}), \
                    patch.object(assemble, "ground"), patch.object(assemble, "objects"), \
                    patch.object(assemble, "export_retained_props", return_value=[]), patch.object(assemble, "preview"):
                with self.assertRaises((AssertionError, RuntimeError)):
                    assemble.main()
            self.assertEqual(before, {p: p.read_bytes() for p in before})

    def test_key_preserves_enclosed_purple_in_export(self):
        with tempfile.TemporaryDirectory(prefix="bleach-art-test-") as folder:
            root = Path(folder)
            (root / "props").mkdir()
            source = Image.new("RGBA", (9, 9), (255, 0, 255, 255))
            ImageDraw.Draw(source).rectangle((2, 2, 6, 6), fill=(70, 70, 70, 255))
            source.putpixel((4, 4), (142, 76, 190, 255))
            source.save(root / "fixture.png")
            with patch.object(assemble, "HERE", root):
                result = assemble.sprite("fixture", 1, 1)
            self.assertEqual(result.getpixel((16, 16))[3], 255)
            exported = Image.open(root / "props/fixture-1x1.png")
            self.assertEqual(exported.getpixel((16, 16))[3], 255)
            self.assertEqual(result.getpixel((0, 0))[3], 0)

    def test_placement_calls_survive_python_optimization(self):
        for filename in ("build_karakura.py", "build_regions.py"):
            tree = ast.parse((HERE / filename).read_text(encoding="utf-8"))
            statements = []
            for node in ast.walk(tree):
                value = node.test if isinstance(node, (ast.Assert, ast.If)) else None
                if isinstance(value, ast.UnaryOp) and isinstance(value.op, ast.Not):
                    value = value.operand
                if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id in ("place", "put"):
                    statements.append(node)
            self.assertTrue(statements, filename)
            place, put = Mock(return_value=True), Mock(return_value=True)
            env = dict(place=place, put=put, name="fixture", x=4, y=5, width=64, obj={"x": 32, "y": 64},
                       T=32, math=math, wall={"image": "wall"}, palace={}, w=48, h=40)
            code = compile(ast.Module(body=statements, type_ignores=[]), filename, "exec", optimize=2)
            exec(code, env)
            self.assertEqual(place.call_count + put.call_count, len(statements), filename)

    def test_coverage_fails_with_optimization(self):
        with tempfile.TemporaryDirectory(prefix="bleach-art-test-") as folder:
            root = Path(folder)
            (root / "client/src").mkdir(parents=True)
            (root / "client/public/maps").mkdir(parents=True)
            scenes = {"fixture": {"width": 32, "height": 32, "props": []}}
            (root / "client/src/worldSceneData.json").write_text(json.dumps(scenes))
            data = {"width": 1, "tilesets": [{"firstgid": 1, "tiles": [{"id": 0,
                    "properties": [{"name": "solido", "value": True}]}]}],
                    "layers": [{"type": "tilelayer", "name": "objetos", "data": [1]}]}
            (root / "client/public/maps/fixture.tmj").write_text(json.dumps(data))
            code = f"import sys; from pathlib import Path; sys.path.insert(0, {str(HERE)!r}); import check_scene_alpha as c; c.ROOT=Path({folder!r}); c.main()"
            result = subprocess.run([sys.executable, "-O", "-c", code], capture_output=True)
            self.assertNotEqual(result.returncode, 0, result.stdout)

    def test_rukongai_house_does_not_cover_existing_tree_trunks(self):
        catalog = json.loads((HERE.parent / "renewal/catalog.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory(prefix="bleach-art-test-") as folder:
            # A apresentação Tiled abre imagens públicas; este teste isola a geometria.
            with patch.object(build_regions, "OUT", Path(folder)), patch.object(build_regions, "append_presentation"):
                _, scene = build_regions.standard("soul", catalog)
        self.assertNotIn("rukongai-house-30-37", [p["id"] for p in scene["props"]])


if __name__ == "__main__":
    unittest.main()
