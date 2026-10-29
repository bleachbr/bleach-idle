"""Mapas dos níveis 60–150, derivados dos mapas prontos (o traçado é o mesmo, muda a cor e a lógica).

  falsa.tmj        Karakura Falsa (nível 60+): a réplica de Karakura que o Gotei 13 montou para a
                   batalha contra o exército de Aizen. Mesmo traçado de karakura.tmj, céu de crepúsculo.
  wandenreich.tmj  Wandenreich (nível 95+): a Seireitei tomada pelos Quincy (Schatten Bereich).
                   Mesmo traçado de soul.tmj, tudo branco e azul.

Lê karakura.tmj e soul.tmj (inclusive edições feitas no Tiled), então pode rodar de novo sem perder nada.
Uso: python art/maps/build_endgame.py
"""
import copy
import json
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / "client" / "public" / "maps"
T = 32


def tint(src, dst, mix, color, gain, lift=1.0):
    """Mantém luz e sombra (luminância) e puxa a cor para `color`."""
    img = Image.open(OUT / src).convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            lum = ((0.3 * r + 0.59 * g + 0.11 * b) / 255) ** lift
            out = [round(min(255, (v * (1 - mix) + c * lum * mix) * gain)) for v, c in zip((r, g, b), color)]
            px[x, y] = (*out, a)
    img.save(OUT / dst)


def derive(src, dst, name, tiles, keep, spawns):
    j = json.load(open(OUT / f"{src}.tmj", encoding="utf-8"))
    j = copy.deepcopy(j)
    for p in j.get("properties", []):
        if p["name"] == "nome":
            p["value"] = name
    for ts in j["tilesets"]:
        ts["image"] = tiles
        ts["name"] = dst
    solid_gids = {ts["firstgid"] + t["id"] for ts in j["tilesets"] for t in ts.get("tiles", [])
                  if any(p["name"] == "solido" and p["value"] is True for p in t.get("properties", []))}
    w, h = j["width"], j["height"]
    solid = [0] * (w * h)
    for l in j["layers"]:
        if l["type"] == "tilelayer" and l["name"] != "acima":
            for i, g in enumerate(l["data"]):
                if (g & 0x1FFFFFFF) in solid_gids:
                    solid[i] = 1
    logic = next(l for l in j["layers"] if l["type"] == "objectgroup")
    objs = []
    for o in logic["objects"]:
        kind = o.get("type") or o.get("class")
        if kind in keep:
            new = keep[kind]
            if new is None:
                continue
            o = dict(o)
            if isinstance(new, str):
                o["name"] = new
            objs.append(o)
    pz = [(o["x"] // T, o["y"] // T, (o["x"] + o["width"] - 1) // T, (o["y"] + o["height"] - 1) // T) for o in objs if (o.get("type") or o.get("class")) == "pz"]

    def free(x, y):
        in_pz = any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in pz)
        return 0 <= x < w and 0 <= y < h and not solid[y * w + x] and not in_pz

    def nearest(x, y):
        for r in range(12):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if max(abs(dx), abs(dy)) == r and free(x + dx, y + dy):
                        return x + dx, y + dy
        raise ValueError(f"sem tile livre perto de {x},{y}")

    nid = max(o["id"] for o in logic["objects"]) + 1
    for kind, x, y, r, n in spawns:
        fx, fy = nearest(x, y)
        objs.append({"name": kind, "type": "spawn", "x": fx * T + T / 2, "y": fy * T + T / 2, "width": 0, "height": 0, "rotation": 0, "visible": True,
                     "point": True, "id": nid, "properties": [
                         {"name": "monstro", "type": "string", "value": kind}, {"name": "raio", "type": "int", "value": r},
                         {"name": "quantidade", "type": "int", "value": n}]})
        nid += 1
    logic["objects"] = objs
    j["nextobjectid"] = nid
    json.dump(j, open(OUT / f"{dst}.tmj", "w", encoding="utf-8"), ensure_ascii=False)
    print(dst, "ok:", len(spawns), "spawns")


def main():
    tint("karakura_tiles.png", "falsa_tiles.png", 0.55, (175, 140, 230), 0.82)
    derive("karakura", "falsa", "Karakura Falsa", "falsa_tiles.png",
           {"pz": True, "portal": "Garganta", "chegada": None, "templo": None, "depot": None, "loja": None, "spawn": None},
           [("fraccion_espada", 38, 6, 4, 6), ("fraccion_espada", 40, 15, 4, 5), ("fraccion_espada", 44, 25, 4, 5),
            ("arrancar_resurreccion", 49, 7, 4, 5), ("arrancar_resurreccion", 52, 17, 4, 4), ("arrancar_resurreccion", 8, 41, 4, 4),
            ("vasto_lorde", 57, 27, 3, 3), ("vasto_lorde", 28, 42, 4, 4), ("vasto_lorde", 45, 41, 4, 4),
            ("ayon", 58, 42, 1, 1)])
    # a chegada fica onde era o templo (dentro da zona segura, ao lado do portal)
    _arrival("falsa", 16, 15)
    # Schatten Bereich: quase sem cor, claro, puxado para o azul (lift < 1 clareia os escuros)
    tint("soul_tiles.png", "wandenreich_tiles.png", 0.88, (220, 234, 255), 1.12, lift=0.6)
    derive("soul", "wandenreich", "Wandenreich (Seireitei)", "wandenreich_tiles.png",
           {"pz": True, "portal": "Senkaimon", "chegada": "wandenreich", "spawn": None},
           [("soldado_wandenreich", 10, 31, 4, 6), ("soldado_wandenreich", 36, 32, 4, 5), ("soldado_wandenreich", 6, 8, 4, 4),
            ("sternritter", 12, 36, 3, 4), ("sternritter", 37, 23, 3, 4),
            ("sternritter_vollstandig", 41, 9, 4, 4), ("sternritter_vollstandig", 6, 20, 4, 3),
            ("yhwach", 24, 36, 2, 1)])


def _arrival(dst, x, y):
    p = OUT / f"{dst}.tmj"
    j = json.load(open(p, encoding="utf-8"))
    logic = next(l for l in j["layers"] if l["type"] == "objectgroup")
    logic["objects"].append({"name": dst, "type": "chegada", "x": x * T + T / 2, "y": y * T + T / 2, "width": 0, "height": 0, "rotation": 0,
                             "visible": True, "point": True, "id": j["nextobjectid"]})
    j["nextobjectid"] += 1
    json.dump(j, open(p, "w", encoding="utf-8"), ensure_ascii=False)


if __name__ == "__main__":
    main()
