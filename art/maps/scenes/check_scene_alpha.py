"""Confere cobertura visual dos sólidos de objetos; água/chão ficam fora deste teste."""
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]


def main():
    scenes = json.loads((ROOT/"client/src/worldSceneData.json").read_text(encoding="utf-8"))
    for name, scene in scenes.items():
        data = json.loads((ROOT/f"client/public/maps/{name}.tmj").read_text(encoding="utf-8"))
        mask = Image.new("L", (scene["width"], scene["height"]))
        solids = {ts["firstgid"]+t["id"] for ts in data["tilesets"] for t in ts.get("tiles", [])
                  if any(p["name"] == "solido" and p["value"] is True for p in t.get("properties", []))}
        for prop in scene["props"]:
            path = ROOT/"client/public"/prop["image"].lstrip("/")
            image = Image.open(path).convert("RGBA").resize((round(prop["width"]), round(prop["height"])))
            layer = Image.new("L", mask.size)
            layer.paste(image.getchannel("A"), (round(prop["x"]-prop["width"]/2), round(prop["y"]-prop["height"])))
            mask = ImageChops.lighter(mask, layer)
        empty = set()
        for layer in data["layers"]:
            if layer["type"] != "tilelayer" or layer["name"] in ("chao", "acima"):
                continue
            for i, gid in enumerate(layer["data"]):
                if gid & 0x1fffffff not in solids:
                    continue
                x, y = i % data["width"], i // data["width"]
                alpha = mask.crop((x*32, y*32, (x+1)*32, (y+1)*32))
                if alpha.getextrema()[1] <= 96:
                    empty.add((x, y))
        assert not empty, f"{name}: sólidos sem cobertura visual: {sorted(empty)}"
        print(f"{name}: sólidos de objetos com cobertura visual")


if __name__ == "__main__":
    main()
