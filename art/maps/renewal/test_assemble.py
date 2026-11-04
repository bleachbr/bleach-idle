"""Regressões visuais determinísticas; executar com Python + Pillow."""
import json
import unittest
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
MAPS = HERE.parents[2] / "client/public/maps"


class SolidAppearance(unittest.TestCase):
    def test_no_visible_solid_tile_becomes_fully_transparent(self):
        failures = []
        for path in sorted(MAPS.glob("*.tmj")):
            data = json.loads(path.read_text(encoding="utf-8"))
            ts = data["tilesets"][0]
            old = Image.open(HERE / "retained" / ts["image"]).convert("RGBA")
            new = Image.open(MAPS / ts["image"]).convert("RGBA")
            solids = {ts["firstgid"] + t["id"] for t in ts["tiles"]
                      if any(p["name"] == "solido" and p["value"] is True for p in t.get("properties", []))}
            used = {g & 0x1fffffff for layer in data["layers"]
                    if layer["type"] == "tilelayer" and layer["name"] != "acima" for g in layer["data"]}
            for gid in sorted(used & solids):
                i = gid - ts["firstgid"]
                x, y = i % ts["columns"]*32, i // ts["columns"]*32
                rect = (x, y, x+32, y+32)
                if old.crop(rect).getchannel("A").getbbox() and not new.crop(rect).getchannel("A").getbbox():
                    failures.append(f"{path.stem}: tile {i}")
        self.assertEqual(failures, [], "Novas paredes invisíveis: " + ", ".join(failures))


if __name__ == "__main__":
    unittest.main()
