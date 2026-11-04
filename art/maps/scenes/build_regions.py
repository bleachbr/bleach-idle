"""Monta os demais recortes de Bleach a partir de chão contínuo e props inteiros.

Snapshots explícitos em baseline/. A camada logica é conservada sem mudanças;
o arquivo Tiled recebe imagem de chão, objetos visuais e colisões revisadas.
"""
import copy
import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps
from build_karakura import rgba

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
MAPS = ROOT / "client/public/maps"
OUT = MAPS / "scenes"
CATALOG_PATH = HERE.parent / "renewal/catalog.json"
SCENE_PATH = ROOT / "client/src/worldSceneData.json"
T = 32


def atlas_piece(atlas, index):
    x, y = index % 8*T, index // 8*T
    return atlas.crop((x, y, x+T, y+T))


def definitions(keys):
    groups = {}
    lookup = {}
    textures = ("grama", "pedra", "terra", "cascalho", "areia", "duna", "ruina", "ossos", "marmore", "escuro", "tapete", "fluxo", "runas", "obsidiana")
    pairs = [("arvore", "galhos"), ("coluna", "coluna_topo")]
    pairs += [(key[:-5], key) for key in keys if key.endswith("_topo") and key[:-5] in keys]
    for bottom, top in pairs:
        if bottom in keys and top in keys:
            groups[bottom] = {"w": 1, "h": 2, "cells": {(0, 0): keys[top], (0, 1): keys[bottom]}}
            lookup[keys[top]+1] = (bottom, 0, 0)
            lookup[keys[bottom]+1] = (bottom, 0, 1)
    for key, index in keys.items():
        if index+1 in lookup or any(re.fullmatch(prefix+r"[0-3][0-3]", key) for prefix in textures):
            continue
        match = re.fullmatch(r"(quartel|sakura|pinheiro|lanterna|muro|trono|janela|portal)(\d)(\d)", key)
        if match:
            name, x, y = match.groups(); x, y = int(x), int(y)
        else:
            name, x, y = key, 0, 0
        group = groups.setdefault(name, {"w": 0, "h": 0, "cells": {}})
        group["w"], group["h"] = max(group["w"], x+1), max(group["h"], y+1)
        group["cells"][(x, y)] = index
        lookup[index+1] = (name, x, y)
    return groups, lookup


def image_for(map_id, name, group, atlas):
    width, height = group["w"]*T, group["h"]*T
    image = Image.new("RGBA", (width, height))
    for (x, y), index in group["cells"].items():
        image.paste(atlas_piece(atlas, index), (x*T, y*T))
    raw_sources = {
        ("soul", "quartel"): "soul-building.png", ("soul", "sakura"): "soul-sakura.png",
        ("hueco", "arvore"): "hueco-tree.png", ("lasnoches", "pilar"): "palace-pillar.png",
    }
    if (map_id, name) in raw_sources:
        body = rgba(HERE.parent/"renewal"/raw_sources[(map_id, name)])
        if map_id == "hueco": width, height = 64, 112
        if map_id == "lasnoches": width, height = 48, 160
        frame = Image.new("RGBA", (width*2, height*2))
        body.thumbnail((width*2-4, height*2-4), Image.Resampling.LANCZOS)
        frame.alpha_composite(body, ((frame.width-body.width)//2, frame.height-body.height-2))
        image = frame
    elif name == "parede" and map_id == "lasnoches":
        height = 96
        image = image.resize((width*2, height*2), Image.Resampling.NEAREST)
    folder = OUT/map_id
    folder.mkdir(exist_ok=True)
    image.save(folder/f"{name}.webp", quality=95, method=6)
    return {"image": f"/maps/scenes/{map_id}/{name}.webp", "width": width, "height": height}


def append_presentation(data, ground, props):
    """O editor Tiled vê os mesmos sprites completos usados pelo Phaser."""
    layers = [l for l in data["layers"] if l["name"] not in ("base_continua", "cenario")]
    for l in layers:
        if l["name"] in ("objetos", "acima", "colisao_cenario"):
            l["visible"] = False
    next_layer = max(l["id"] for l in layers)+1
    base = {"id": next_layer, "name": "base_continua", "type": "imagelayer", "visible": True,
            "opacity": 1, "x": 0, "y": 0, "image": ground.removeprefix("/maps/")}
    image_paths = list(dict.fromkeys(p["image"] for p in props))
    firstgid = data["tilesets"][0]["firstgid"]+data["tilesets"][0]["tilecount"]
    tiles = []
    for i, path in enumerate(image_paths):
        with Image.open(ROOT/"client/public"/path.lstrip("/")) as im:
            tiles.append({"id": i, "image": path.removeprefix("/maps/"), "imagewidth": im.width, "imageheight": im.height})
    data["tilesets"] = [data["tilesets"][0], {"firstgid": firstgid, "name": "cenario_completo", "columns": 0,
                          "tilecount": len(tiles), "tilewidth": max(t["imagewidth"] for t in tiles),
                          "tileheight": max(t["imageheight"] for t in tiles), "tiles": tiles}]
    next_obj = max((o["id"] for l in layers if l["type"] == "objectgroup" for o in l["objects"]), default=0)+1
    objects = []
    for p in props:
        objects.append({"id": next_obj, "name": p["id"], "type": "visual", "gid": firstgid+image_paths.index(p["image"]),
                        "x": p["x"]-p["width"]/2, "y": p["y"], "width": p["width"], "height": p["height"],
                        "rotation": 0, "visible": True, "properties": [{"name": "sortY", "type": "float", "value": p["sortY"]}]})
        next_obj += 1
    visual = {"id": next_layer+1, "name": "cenario", "type": "objectgroup", "draworder": "topdown",
              "x": 0, "y": 0, "visible": True, "opacity": 1, "objects": objects}
    data["layers"] = [layers[0], base, *layers[1:], visual]
    data["nextlayerid"], data["nextobjectid"] = next_layer+2, next_obj


def standard(map_id, catalog):
    data = json.loads((HERE/f"baseline/{map_id}.tmj").read_text(encoding="utf-8"))
    w, h = data["width"], data["height"]
    atlas = Image.open(MAPS/f"{map_id}_tiles.png").convert("RGBA")
    groups, lookup = definitions(catalog[map_id]["keys"])
    assets = {name: image_for(map_id, name, group, atlas) for name, group in groups.items()}
    instances = {}
    for layer in data["layers"]:
        if layer["name"] not in ("objetos", "acima"): continue
        for i, gid in enumerate(layer["data"]):
            frame = lookup.get(gid & 0x1fffffff)
            if not frame: continue
            name, lx, ly = frame
            anchor = (name, i%w-lx, i//w-ly)
            instances.setdefault(anchor, []).append((layer, i))
    props = []
    for (name, x, y), cells in instances.items():
        group, asset = groups[name], assets[name]
        if map_id == "soul" and all(i%w in (0, w-1) or i//w in (0, h-1) for _, i in cells):
            for layer, i in cells: layer["data"][i] = 0
            continue
        omit = (map_id == "hueco" and name in ("coluna", "coluna_quebrada", "cranio")) or (
            map_id == "lasnoches" and name in ("trono", "estatua", "bandeira", "janela", "banco", "braseiro"))
        if omit:
            for layer, i in cells: layer["data"][i] = 0
            continue
        # O deserto não é cercado por uma fila quadrada de pedregulhos.
        if map_id == "hueco" and (x < 2 or x+group["w"] > w-2 or y < 2 or y+group["h"] > h-2):
            for layer, i in cells: layer["data"][i] = 0
            continue
        foot = (y+group["h"])*T
        if map_id == "soul" and name == "garganta_ss":
            asset = {"image": "/maps/scenes/senkaimon.webp", "width": 64, "height": 96}
        kind = "tree" if name in ("sakura", "pinheiro", "arvore", "arvore_peq") else "building" if name == "quartel" else "prop"
        props.append({"id": f"{map_id}-{name}-{x}-{y}", "kind": kind, **asset,
                      "x": (x+group["w"]/2)*T, "y": foot, "sortY": foot})
    if map_id == "soul":
        house = rgba(HERE.parent/"renewal/city-wood-house.png")
        house.thumbnail((512, 512), Image.Resampling.LANCZOS)
        house.save(OUT/"soul/rukongai-house.webp", quality=95)
        reserved = set()
        for l in data["layers"]:
            if l["name"] != "logica": continue
            for o in l["objects"]:
                if o.get("point"):
                    x, y = int(o["x"]//T), int(o["y"]//T)
                    reserved.update((x+dx, y+dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        blockers = [0]*(w*h)
        solid_gids = {ts["firstgid"]+t["id"] for ts in data["tilesets"] for t in ts.get("tiles", [])
                      if any(p["name"] == "solido" and p["value"] is True for p in t.get("properties", []))}
        occupied = {(i%w, i//w) for layer in data["layers"] if layer["type"] == "tilelayer" and layer["name"] != "acima"
                    for i, gid in enumerate(layer["data"]) if gid & 0x1fffffff in solid_gids}
        for x, y in [(6, 26), (15, 27), (33, 28), (43, 31), (30, 37)]:
            points = {(gx, gy) for gy in range(y-3, y) for gx in range(x-2, x+2)}
            if points & (reserved | occupied): continue
            props.append({"id": f"rukongai-house-{x}-{y}", "kind": "building", "image": "/maps/scenes/soul/rukongai-house.webp",
                          "x": x*T, "y": y*T, "width": 128, "height": 128*house.height/house.width, "sortY": y*T})
            for gx, gy in points: blockers[gy*w+gx] = catalog["soul"]["keys"]["muro10"]+1
        data["layers"].append({"id": 5, "name": "colisao_cenario", "type": "tilelayer", "x": 0, "y": 0,
                               "width": w, "height": h, "visible": False, "opacity": 1, "data": blockers})
    if map_id == "lasnoches":
        # Limite norte monumental: o topo segue intencionalmente além do mundo.
        # O mapa representa o acesso, não uma miniatura de toda a fachada de Las Noches.
        gate = new_prop("lasnoches-gate", "lasnoches-gate.png", 704)
        props.append({"id": "lasnoches-monumental-front", "kind": "building", **gate, "x": 24*T, "y": 5.5*T, "sortY": 5.5*T})
        blockers = [0]*(w*h)
        for gy in range(5):
            for gx in range(13, 35): blockers[gy*w+gx] = catalog["lasnoches"]["keys"]["parede"]+1
        # O Privaron existente em (24,7) guarda o acesso, à frente da fachada.
        data["layers"].append({"id": 5, "name": "colisao_cenario", "type": "tilelayer", "x": 0, "y": 0,
                               "width": w, "height": h, "visible": False, "opacity": 1, "data": blockers})
    ground = Image.open(HERE/f"{map_id}-ground-source.png").convert("RGB").resize((w*T, h*T), Image.Resampling.LANCZOS)
    ground.save(OUT/f"{map_id}-ground.webp", quality=94, method=6)
    result = {"width": w*T, "height": h*T, "ground": f"/maps/scenes/{map_id}-ground.webp", "props": props}
    append_presentation(data, result["ground"], props)
    return data, result


def new_prop(name, filename, width, height=None):
    image = rgba(HERE/filename)
    folder = OUT/"landmarks"; folder.mkdir(exist_ok=True)
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    image.save(folder/f"{name}.webp", quality=95, method=6)
    return {"image": f"/maps/scenes/landmarks/{name}.webp", "width": width,
            "height": height if height else width*image.height/image.width}


def custom(map_id, catalog):
    data = json.loads((HERE/f"baseline/{map_id}.tmj").read_text(encoding="utf-8"))
    w, h = data["width"], data["height"]
    props = []
    for layer in data["layers"]:
        if layer["name"] in ("objetos", "acima"): layer["data"] = [0]*(w*h)
    solid_key = "parede" if map_id == "dangai" else "muro10"
    solid_gid = catalog[map_id]["keys"][solid_key]+1
    cells = [0]*(w*h)
    reserved = set()
    for layer in data["layers"]:
        if layer["name"] != "logica": continue
        for o in layer["objects"]:
            if o.get("type") == "pz":
                for gy in range(int(o["y"]//T), int((o["y"]+o["height"])/T)):
                    for gx in range(int(o["x"]//T), int((o["x"]+o["width"])/T)): reserved.add((gx, gy))
            elif o.get("point"):
                x, y = int(o["x"]//T), int(o["y"]//T)
                reserved.update((x+dx, y+dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    def put(name, asset, x, y, kind, blocker=None):
        if blocker:
            bx, by, bw, bh = blocker
            points = {(xx, yy) for yy in range(max(0, by), min(h, by+bh)) for xx in range(max(0, bx), min(w, bx+bw))}
            if points & reserved: return False
            for xx, yy in points: cells[yy*w+xx] = solid_gid
        props.append({"id": f"{map_id}-{name}-{len(props)}", "kind": kind, **asset, "x": x*T, "y": y*T, "sortY": y*T})
        return True
    if map_id == "dangai":
        wall = new_prop("koryu", "dangai-koryu-wall.png", 96, h*T)
        # A zona segura original começa em x=2: a faixa esquerda fica nas duas
        # colunas externas, sem cortar a área de chegada.
        if not put("koryu-left", {**wall, "width": 64}, 1, h, "boundary", (0, 0, 2, h)):
            raise RuntimeError("Koryu esquerdo conflita com área reservada")
        flipped = ImageOps.mirror(Image.open(ROOT/"client/public"/wall["image"].lstrip("/")))
        flipped.save(OUT/"landmarks/koryu-right.webp", quality=95)
        if not put("koryu-right", {**wall, "image": "/maps/scenes/landmarks/koryu-right.webp"}, w-1.5, h, "boundary", (w-3, 0, 3, h)):
            raise RuntimeError("Koryu direito conflita com área reservada")
        portal = {"image": "/maps/scenes/senkaimon.webp", "width": 64, "height": 96}
        put("portal", portal, 4.5, 11, "interactive")
    else:
        palace = new_prop("silbern", "silbern-front.png", 512)
        if not put("silbern", palace, 24, 9.5, "building", (17, 1, 14, 8)):
            raise RuntimeError("Silbern conflita com área reservada")
        smaller = {**palace, "width": 224, "height": palace["height"]*224/512}
        for x, y in [(6, 15), (41, 18), (6, 30), (41, 34)]:
            put("quincy-frontage", smaller, x, y, "building", (int(x)-3, int(y)-4, 6, 4))
        put("senkaimon", {"image": "/maps/scenes/senkaimon.webp", "width": 64, "height": 96}, 23.5, 12, "interactive")
    collision = {"id": 5, "name": "colisao_cenario", "type": "tilelayer", "x": 0, "y": 0,
                 "width": w, "height": h, "visible": False, "opacity": 1, "data": cells}
    data["layers"].append(collision)
    ground = Image.open(HERE/f"{map_id}-ground-source.png").convert("RGB").resize((w*T, h*T), Image.Resampling.LANCZOS)
    ground.save(OUT/f"{map_id}-ground.webp", quality=94, method=6)
    result = {"width": w*T, "height": h*T, "ground": f"/maps/scenes/{map_id}-ground.webp", "props": props}
    append_presentation(data, result["ground"], props)
    return data, result


def falsa(city, catalog):
    data = json.loads((MAPS/"karakura.tmj").read_text(encoding="utf-8"))
    original = json.loads((HERE/"baseline/falsa.tmj").read_text(encoding="utf-8"))
    data["properties"], data["tilesets"][0] = original["properties"], original["tilesets"][0]
    data["layers"] = [copy.deepcopy(next(l for l in original["layers"] if l["name"] == "logica")) if l["name"] == "logica" else l for l in data["layers"] if l["name"] != "cenario"]
    folder = OUT/"falsa"; folder.mkdir(exist_ok=True)
    def evening(path):
        image = Image.open(ROOT/"client/public"/path.lstrip("/")).convert("RGBA")
        rgb = ImageEnhance.Color(image.convert("RGB")).enhance(.7)
        cold = Image.new("RGB", rgb.size, "#a4b0ca")
        rgb = Image.blend(rgb, cold, .12)
        rgb = ImageEnhance.Brightness(rgb).enhance(.88)
        rgb.putalpha(image.getchannel("A"))
        target = folder/Path(path).name; rgb.save(target, quality=94)
        return "/maps/scenes/falsa/"+target.name
    ground = evening(city["ground"])
    variants = {}
    props = []
    for p in city["props"]:
        if p["kind"] == "interactive": continue
        if p["image"] not in variants: variants[p["image"]] = evening(p["image"])
        props.append({**p, "id": "falsa-"+p["id"], "image": variants[p["image"]]})
    gate = next(o for l in original["layers"] if l["name"] == "logica" for o in l["objects"] if o["type"] == "portal")
    props.append({"id": "falsa-garganta", "kind": "interactive", "image": "/maps/scenes/hueco/garganta.webp",
                  "width": 32, "height": 64, "x": gate["x"], "y": (int(gate["y"]//T)+1)*T, "sortY": (int(gate["y"]//T)+1)*T})
    pylon = new_prop("tenkai-ketchu", "tenkai-pillar.png", 80, 288)
    collision = next(l for l in data["layers"] if l["name"] == "colisao_cenario")
    for x, y in [(3, 6), (61, 6), (3, 45), (61, 45)]:
        props.append({"id": f"tenkai-{x}-{y}", "kind": "landmark", **pylon, "x": x*T, "y": y*T, "sortY": y*T})
        for yy in (y-1, y-2):
            for xx in (x-1, x): collision["data"][yy*data["width"]+xx] = catalog["falsa"]["keys"]["arvore0"]+1
    result = {"width": city["width"], "height": city["height"], "ground": ground, "props": props}
    append_presentation(data, ground, props)
    return data, result


def composite_visible(canvas, prop, x, y):
    """Recorte explícito para marcos que continuam além dos limites do mundo."""
    left, top = max(0, -x), max(0, -y)
    right, bottom = min(prop.width, canvas.width-x), min(prop.height, canvas.height-y)
    if right > left and bottom > top:
        canvas.alpha_composite(prop.crop((left, top, right, bottom)), (max(0, x), max(0, y)))


def preview(map_id, scene):
    image = Image.open(ROOT/"client/public"/scene["ground"].lstrip("/")).convert("RGBA")
    image = image.resize((scene["width"], scene["height"]), Image.Resampling.LANCZOS)
    for p in sorted(scene["props"], key=lambda p:p["sortY"]):
        prop = Image.open(ROOT/"client/public"/p["image"].lstrip("/")).convert("RGBA")
        prop = prop.resize((round(p["width"]), round(p["height"])), Image.Resampling.LANCZOS)
        composite_visible(image, prop, round(p["x"]-p["width"]/2), round(p["y"]-p["height"]))
    image.convert("RGB").save(HERE/f"{map_id}-composed-preview.png")


def main():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    scenes = json.loads(SCENE_PATH.read_text(encoding="utf-8"))
    for map_id in ("soul", "hueco", "lasnoches", "dangai", "wandenreich", "falsa"):
        if map_id == "falsa": data, scene = falsa(scenes["karakura"], catalog)
        elif map_id in ("dangai", "wandenreich"): data, scene = custom(map_id, catalog)
        else: data, scene = standard(map_id, catalog)
        path = MAPS/f"{map_id}.tmj"
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        scenes[map_id] = scene
        catalog[map_id]["mapSha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        catalog[map_id]["sceneRevision"] = "composicao-coerente-lore; redesenho autorizado por Rafael"
        preview(map_id, scene)
        print(map_id, len(scene["props"]), "objetos completos")
    SCENE_PATH.write_text(json.dumps(scenes, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")


if __name__ == "__main__":
    main()
