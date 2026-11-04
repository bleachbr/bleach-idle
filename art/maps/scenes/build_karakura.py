"""Compõe a cena jogável de Karakura com arte gerada e objetos separados.

Não executa geradores legados. Parte de um snapshot explícito, conserva logica,
e exporta apresentação e colisão juntas para Tiled + Phaser.
"""
import hashlib
import json
import math
import random
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / "client/public/maps/scenes"
MAP_PATH = ROOT / "client/public/maps/karakura.tmj"
T = 32


def rgba(path):
    image = Image.open(path).convert("RGBA")
    image.putdata([(r, g, b, 0 if r > 130 and b > 110 and g < 110 and r > g*1.5 and b > g*1.5 else a)
                   for r, g, b, a in image.getdata()])
    box = image.getbbox()
    assert box, path
    assert box[0] > 0 and box[1] > 0 and box[2] < image.width and box[3] < image.height, f"Recorte toca borda: {path}"
    return image.crop(box)


def main():
    OUT.mkdir(exist_ok=True)
    data = json.loads((HERE / "baseline/karakura.tmj").read_text(encoding="utf-8"))
    w, h = data["width"], data["height"]
    catalog_path = HERE.parent / "renewal/catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    keys = catalog["karakura"]["keys"]
    original_layers = data["layers"]
    logic = next(l for l in original_layers if l["name"] == "logica")
    source_ground = Image.open(HERE / "karakura-canon-ground.png").convert("RGB")
    ground = source_ground.resize((w*T, h*T), Image.Resampling.LANCZOS)
    ground.save(OUT / "karakura-ground.webp", quality=94, method=6)
    chao = [0] * (w*h)
    colisao = [0] * (w*h)
    occupied = set()
    for y in range(h):
        for x in range(w):
            r, g, b = ground.getpixel((x*T+16, y*T+16))
            water = .63*h < y < .83*h and g > r+22 and b > r+20
            material = "agua" if water else "calcada" if x < 32 and y < 30 else "grama"
            chao[y*w+x] = keys[f"{material}{x%4}{y%4}"]+1
            if water:
                occupied.add((x, y))
    protected = set()
    for obj in logic["objects"]:
        kind = obj.get("type") or obj.get("class")
        if kind == "pz":
            for y in range(int(obj["y"]//T), math.ceil((obj["y"]+obj["height"])/T)):
                for x in range(int(obj["x"]//T), math.ceil((obj["x"]+obj["width"])/T)):
                    protected.add((x, y))
        elif kind in ("chegada", "templo", "portal", "loja", "depot", "spawn"):
            cx, cy = int(obj["x"]//T), int(obj["y"]//T)
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    protected.add((cx+dx, cy+dy))

    sources = {
        "urahara-shop": HERE / "urahara-shop.png",
        "kurosaki-clinic": HERE / "kurosaki-clinic.png",
        "zelkova": HERE / "karakura-zelkova.png",
        "streetlight": HERE / "karakura-streetlight.png",
        "apartment": HERE.parent / "renewal/city-apartment.png",
        "senkaimon": HERE / "senkaimon.png",
    }
    images = {}
    asset_dims = {}
    for name, path in sources.items():
        body = rgba(path)
        body.thumbnail((768, 768), Image.Resampling.LANCZOS)
        body.save(OUT / f"{name}.webp", quality=95, method=6)
        images[name] = body
        asset_dims[name] = body.size
    # Objetos de interação permanecem individuais; suas posições vêm da lógica.
    for name in ("banco", "depot", "lixeira", "arbusto"):
        path = HERE.parent / "renewal/props" / f"retained-karakura-{name}.png"
        body = Image.open(path).convert("RGBA")
        body.save(OUT / f"{name}.webp", lossless=True)
        images[name] = body
        asset_dims[name] = body.size

    props = []

    def place(name, tx, ty, width, kind, block=True):
        image = images[name]
        height = width*image.height/image.width
        x, y = tx*T, ty*T
        cells = []
        if block:
            if kind == "tree":
                cells = [(int(tx), int(ty)-1)]
            elif kind in ("streetlight", "bench", "detail"):
                cells = [(int(tx), int(ty)-1)]
            else:
                alpha = image.getchannel("A").resize((max(1, round(width)), max(1, round(height))))
                left, top = x-width/2, y-height
                for gy in range(max(0, int(top//T)), min(h, math.ceil(y/T))):
                    for gx in range(max(0, int(left//T)), min(w, math.ceil((x+width/2)/T))):
                        box = (max(0, round(gx*T-left)), max(0, round(gy*T-top)),
                               min(alpha.width, round((gx+1)*T-left)), min(alpha.height, round((gy+1)*T-top)))
                        if box[2] > box[0] and box[3] > box[1]:
                            pixels = list(alpha.crop(box).getdata())
                            if sum(a > 96 for a in pixels) > len(pixels)*.18:
                                cells.append((gx, gy))
            # Não esconda colisões no bloco protegido: rejeite a posição em vez de liberar o prédio.
            if any(cell in protected or cell in occupied for cell in cells):
                return False
        item = {"id": f"{kind}-{len(props)}", "kind": kind, "image": f"/maps/scenes/{name}.webp",
                "x": x, "y": y, "width": round(width, 3), "height": round(height, 3), "sortY": y}
        props.append(item)
        for cell in cells:
            occupied.add(cell)
            colisao[cell[1]*w+cell[0]] = keys["arvore0"]+1
        return True

    # Fachadas delimitam o espaço, não formam um tabuleiro de peças isoladas.
    for name, x, y, width in [
        ("urahara-shop", 18, 10, 256),
        ("kurosaki-clinic", 24, 19, 224),
        ("apartment", 8, 19, 224),
        ("apartment", 9, 7, 176),
        ("kurosaki-clinic", 7, 28, 176),
        ("kurosaki-clinic", 25, 8, 176),
    ]:
        assert place(name, x, y, width, "building"), f"Construção conflita: {name} ({x},{y})"
    for obj in logic["objects"]:
        if obj.get("type") in ("depot", "portal"):
            name = "depot" if obj["type"] == "depot" else "senkaimon"
            # Handlers de interação validam estes pontos no servidor; a imagem não muda sua regra.
            assert place(name, obj["x"]/T, math.floor(obj["y"]/T)+1, 64 if name == "senkaimon" else 32, "interactive", block=False)
    for x, y in [(12, 12), (21, 12), (12, 18), (21, 18), (15, 24), (28, 23)]:
        place("streetlight", x, y, 28, "streetlight")
    for x, y in [(12, 19), (21, 19), (19, 23)]:
        place("banco", x, y, 46, "bench")
    for x, y in [(12, 16), (21, 16), (11, 22), (28, 21)]:
        place("arbusto", x, y, 38, "detail")
    # Massas de vegetação com variação de escala, não árvores equidistantes.
    rng = random.Random(7311)
    clusters = [(3, 8), (4, 23), (29, 9), (30, 26), (39, 4), (52, 12), (42, 26), (60, 29), (6, 44), (36, 44), (60, 43)]
    for cx, cy in clusters:
        for _ in range(7):
            x, y = round(cx+rng.uniform(-3, 3), 2), round(cy+rng.uniform(-2, 2), 2)
            if not (2 <= x < w-2 and 3 <= y < h-1):
                continue
            # Vias/calcadas da imagem gerada permanecem abertas.
            r, g, b = ground.getpixel((min(w*T-1, int(x*T)), min(h*T-1, int(y*T))))
            if g < r*1.07 or g < b*1.08:
                continue
            place("zelkova", x, y, rng.choice([72, 80, 88, 96]), "tree")
    assert len(props) > 35, len(props)

    # Toda navegação deriva da mesma composição. Água fica na camada de chão;
    # objetos têm uma camada de colisão explícita, oculta apenas no editor visual.
    for layer in original_layers:
        if layer["name"] == "chao": layer["data"] = chao
        elif layer["name"] in ("objetos", "acima"): layer["data"] = [0]*(w*h)
    ground_layer = {"id": 5, "name": "base_continua", "type": "imagelayer", "visible": True,
                    "opacity": 1, "x": 0, "y": 0, "image": "scenes/karakura-ground.webp"}
    collision_layer = {"id": 6, "name": "colisao_cenario", "type": "tilelayer", "visible": False,
                       "opacity": 1, "x": 0, "y": 0, "width": w, "height": h, "data": colisao}
    firstgid = data["tilesets"][0]["tilecount"]+1
    asset_names = list(images)
    visual = []
    next_id = data["nextobjectid"]
    for p in props:
        name = Path(p["image"]).stem
        visual.append({"id": next_id, "name": p["id"], "type": "visual", "gid": firstgid+asset_names.index(name),
                       "x": p["x"]-p["width"]/2, "y": p["y"], "width": p["width"], "height": p["height"],
                       "rotation": 0, "visible": True, "properties": [{"name": "sortY", "type": "float", "value": p["sortY"]}]})
        next_id += 1
    visual_layer = {"id": 7, "name": "cenario", "type": "objectgroup", "draworder": "topdown",
                    "x": 0, "y": 0, "opacity": 1, "visible": True, "objects": visual}
    data["layers"] = [original_layers[0], ground_layer, *original_layers[1:3], collision_layer, visual_layer, logic]
    data["tilesets"].append({"firstgid": firstgid, "name": "karakura_cenario", "columns": 0,
                             "tilecount": len(images), "tilewidth": max(v[0] for v in asset_dims.values()),
                             "tileheight": max(v[1] for v in asset_dims.values()),
                             "tiles": [{"id": i, "image": f"scenes/{name}.webp", "imagewidth": asset_dims[name][0],
                                        "imageheight": asset_dims[name][1]} for i, name in enumerate(asset_names)]})
    data["nextlayerid"] = 8
    data["nextobjectid"] = next_id
    MAP_PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    scene = {"width": w*T, "height": h*T, "ground": "/maps/scenes/karakura-ground.webp", "props": props}
    scene_path = ROOT / "client/src/worldSceneData.json"
    scenes = json.loads(scene_path.read_text(encoding="utf-8")) if scene_path.exists() else {}
    scenes["karakura"] = scene
    scene_path.write_text(json.dumps(scenes, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    catalog["karakura"]["mapSha256"] = hashlib.sha256(MAP_PATH.read_bytes()).hexdigest()
    catalog["karakura"]["sceneRevision"] = "composicao-coerente-lore; redesenho autorizado por Rafael"
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    preview = ground.convert("RGBA")
    for prop in sorted(props, key=lambda p:p["sortY"]):
        image = Image.open(ROOT / "client/public" / prop["image"].lstrip("/")).convert("RGBA")
        image = image.resize((round(prop["width"]), round(prop["height"])), Image.Resampling.LANCZOS)
        preview.alpha_composite(image, (round(prop["x"]-prop["width"]/2), round(prop["y"]-prop["height"])))
    preview.convert("RGB").save(HERE / "karakura-composed-preview.png")
    print(f"Karakura: {len(props)} objetos completos; chão contínuo; lógica original conservada")


if __name__ == "__main__":
    main()
