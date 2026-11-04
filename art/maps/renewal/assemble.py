"""Monta apenas arte: nunca grava nem regenera mapas Tiled.

Uso: python art/maps/renewal/assemble.py (Pillow).
catalog.json fixa os índices e hashes dos mapas existentes; retained/ guarda
os detalhes secundários reutilizados, explicitamente separados das fontes novas.
"""
import hashlib
import io
import json
import re
import sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from chroma import remove_exterior_magenta
ROOT = HERE.parents[2]
MAPS = ROOT / "client/public/maps"
T = 32
CATALOG = json.loads((HERE / "catalog.json").read_text(encoding="utf-8"))
GROUNDS = {
    "karakura": ["grama", "asfalto", "calcada", "agua"],
    "soul": ["pedra", "terra", "grama", "cascalho"],
    "hueco": ["areia", "duna", "ruina", "ossos"],
    "lasnoches": ["marmore", "escuro", "tapete", "areia"],
    "dangai": ["pedra", "fluxo", "runas", "obsidiana"],
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tile(atlas, index):
    x, y = index % 8 * T, index // 8 * T
    return atlas.crop((x, y, x + T, y + T))


def put(atlas, keys, name, image):
    if name not in keys or image.size != (T, T):
        raise RuntimeError(f"Tile inválido: {name}, {image.size}")
    index = keys[name]
    # paste substitui também pixels transparentes; alpha_composite deixaria a arte antiga por baixo.
    atlas.paste(image, (index % 8 * T, index // 8 * T))


def tint(image, color, mix, gain=1):
    result = image.copy()
    pixels = []
    for r, g, b, a in image.getdata():
        light = (r * .3 + g * .59 + b * .11) / 255
        pixels.append(tuple(round(min(255, (v * (1 - mix) + c * light * mix) * gain))
                            for v, c in zip((r, g, b), color)) + (a,))
    result.putdata(pixels)
    return result


def seamless(image):
    """Suaviza emendas opostas da textura gerada, sem inventar geometria."""
    image = image.copy()
    px = image.load()
    w, h = image.size
    for vertical in (False, True):
        for i in range(h if not vertical else w):
            for d in range(6):
                a = (d, i) if not vertical else (i, d)
                b = (w - d - 1, i) if not vertical else (i, h - d - 1)
                ca, cb = px[a], px[b]
                strength = (1 - d / 6) / 2
                px[a] = tuple(round(x * (1 - strength) + y * strength) for x, y in zip(ca, cb))
                px[b] = tuple(round(y * (1 - strength) + x * strength) for x, y in zip(ca, cb))
    return image


def ground(atlas, keys, map_id):
    source = Image.open(HERE / f"{map_id}-ground.png").convert("RGBA")
    w, h = source.size
    if w != h or w % 2:
        raise RuntimeError(f"Fonte de terreno inválida: {map_id}, {source.size}; esperado quadrado de lado par")
    for n, name in enumerate(GROUNDS[map_id]):
        x, y = n % 2 * (w // 2), n // 2 * (h // 2)
        texture = seamless(source.crop((x, y, x + w // 2, y + h // 2)).resize((128, 128), Image.Resampling.BOX))
        texture.save(HERE / "terrain" / f"{map_id}-{name}.png")
        for ty in range(4):
            for tx in range(4):
                put(atlas, keys, f"{name}{tx}{ty}", texture.crop((tx*T, ty*T, (tx+1)*T, (ty+1)*T)))
        if map_id == "karakura" and name == "calcada":
            warm = tint(texture, (244, 215, 165), .24, 1.05)
            warm.save(HERE / "terrain/karakura-praca.png")
            for ty in range(4):
                for tx in range(4):
                    put(atlas, keys, f"praca{tx}{ty}", warm.crop((tx*T, ty*T, (tx+1)*T, (ty+1)*T)))


def sprite(name, width, height, footprint=None):
    """Recorta magenta, preserva proporção, ancora embaixo e exporta objeto inteiro."""
    source = remove_exterior_magenta(Image.open(HERE / f"{name}.png"))
    bbox = source.getbbox()
    if not bbox:
        raise RuntimeError(f"Objeto vazio: {name}")
    if not (bbox[0] > 0 and bbox[1] > 0 and bbox[2] < source.width and bbox[3] < source.height):
        raise RuntimeError(f"Objeto toca borda: {name}")
    source = source.crop(bbox)
    result = Image.new("RGBA", (width*T, height*T))
    if footprint:
        x0, y0, x1, y1 = footprint
        x0, x1 = max(1, x0), min(width*T-1, x1)
        y1 = min(height*T-1, y1)
        target = (x1-x0, y1-y0)
        # A fonte deve nascer na proporção certa; só normaliza pequenas variações
        # do gerador, sem estreitar a fachada e criar paredes invisíveis.
        ratio_error = abs((source.width/source.height)/(target[0]/target[1])-1)
        if ratio_error >= .16:
            raise RuntimeError(f"Regenerar {name} na proporção do footprint: {ratio_error:.1%}")
        body = source.resize(target, Image.Resampling.BOX)
        result.alpha_composite(body, (x0, y0))
    else:
        scale = min((width*T-2)/source.width, (height*T-2)/source.height)
        body = source.resize((max(1, round(source.width*scale)), max(1, round(source.height*scale))), Image.Resampling.BOX)
        result.alpha_composite(body, ((width*T-body.width)//2, height*T-body.height-1))
    result.save(HERE / "props" / f"{name}-{width}x{height}.png")
    return result


def grid_prop(atlas, keys, prefix, source, width, height, fit_original=False):
    original = Image.new("RGBA", (width*T, height*T))
    if fit_original:
        for y in range(height):
            for x in range(width):
                original.paste(tile(atlas, keys[f"{prefix}{x}{y}"]), (x*T, y*T))
    image = sprite(source, width, height, original.getbbox() if fit_original else None)
    for y in range(height):
        for x in range(width):
            put(atlas, keys, f"{prefix}{x}{y}", image.crop((x*T, y*T, (x+1)*T, (y+1)*T)))


def tall_prop(atlas, keys, source, bottom, top):
    image = sprite(source, 1, 2)
    put(atlas, keys, top, image.crop((0, 0, T, T)))
    put(atlas, keys, bottom, image.crop((0, T, T, T*2)))


def objects(atlas, keys, map_id):
    if map_id == "karakura":
        for i in range(3):
            tall_prop(atlas, keys, "city-tree", f"arvore{i}", f"copa{i}")
        groups = set()
        for key in keys:
            match = re.fullmatch(r"(casa([0-3])_(\d+)x(\d+)_)(\d)(\d)", key)
            if match:
                prefix, kind, w, h, _, _ = match.groups()
                groups.add((prefix, int(kind), int(w), int(h)))
        for prefix, kind, w, h in sorted(groups):
            grid_prop(atlas, keys, prefix, ["city-house", "city-apartment", "city-shop", "city-wood-house"][kind], w, h, fit_original=kind in (2, 3))
    elif map_id == "soul":
        grid_prop(atlas, keys, "quartel", "soul-building", 8, 7)
        grid_prop(atlas, keys, "sakura", "soul-sakura", 2, 3)
    elif map_id == "hueco":
        tall_prop(atlas, keys, "hueco-tree", "arvore", "galhos")
    elif map_id == "lasnoches":
        tall_prop(atlas, keys, "palace-pillar", "pilar", "pilar_topo")
    elif map_id == "dangai":
        tall_prop(atlas, keys, "dangai-pillar", "pilar", "pilar_topo")


def export_retained_props(atlas, keys, map_id):
    """Objetos secundários reutilizados também ficam inteiros e editáveis."""
    groups = {
        "karakura": {name: [[name]] for name in ("arbusto", "lixeira", "maquina", "banco", "depot")},
        "soul": {}, "hueco": {}, "lasnoches": {}, "dangai": {},
    }[map_id]
    tall = {
        "karakura": [("senkaimon", "senkaimon_topo")],
        "soul": [],
        "hueco": [("coluna", "coluna_topo"), ("garganta", "garganta_topo")],
        "lasnoches": [(n, f"{n}_topo") for n in ("braseiro", "estatua", "bandeira", "garganta")],
        "dangai": [(n, f"{n}_topo") for n in ("chama", "bandeira")],
    }[map_id]
    for bottom, top in tall:
        groups[bottom] = [[top], [bottom]]
    grids = {
        "karakura": [],
        "soul": [("pinheiro", 2, 3), ("lanterna", 1, 2), ("muro", 4, 2)],
        "hueco": [],
        "lasnoches": [("trono", 2, 2), ("janela", 2, 1)],
        "dangai": [("portal", 2, 2)],
    }[map_id]
    for name, w, h in grids:
        groups[name] = [[f"{name}{x}{y}" for x in range(w)] for y in range(h)]
    singles = {
        "karakura": [], "soul": ["garganta_ss"],
        "hueco": ["rocha0", "rocha1", "rocha2", "coluna_quebrada", "cranio", "arvore_peq"],
        "lasnoches": ["parede", "entulho", "banco"],
        "dangai": ["parede", "cristais", "arco", "altar", "ossos"],
    }[map_id]
    for name in singles:
        groups[name] = [[name]]
    records = []
    for name, cells in groups.items():
        w, h = len(cells[0]), len(cells)
        image = Image.new("RGBA", (w*T, h*T))
        for y, row in enumerate(cells):
            for x, key in enumerate(row):
                image.paste(tile(atlas, keys[key]), (x*T, y*T))
        filename = f"retained-{map_id}-{name}.png"
        image.save(HERE / "props" / filename)
        records.append({"file": f"props/{filename}", "width": w*T, "height": h*T, "origin": "retained", "map": map_id, "tiles": cells})
    return records


def preview(map_id, atlas):
    data = json.loads((MAPS / f"{map_id}.tmj").read_text(encoding="utf-8"))
    canvas = Image.new("RGBA", (data["width"]*T, data["height"]*T), "#10131d")
    for layer in data["layers"]:
        if layer["type"] != "tilelayer" or not layer.get("visible", True):
            continue
        for i, gid in enumerate(layer["data"]):
            if not gid:
                continue
            image = tile(atlas, (gid & 0x1fffffff)-1)
            if gid & 0xe0000000:
                # Tiled: diagonal primeiro, horizontal e vertical em seguida.
                if gid & 0x20000000:
                    image = image.transpose(Image.Transpose.TRANSPOSE)
                if gid & 0x80000000:
                    image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                if gid & 0x40000000:
                    image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            canvas.alpha_composite(image, (i % data["width"]*T, i // data["width"]*T))
    canvas.convert("RGB").save(HERE / "previews" / f"{map_id}.png")


def main():
    for folder in ("terrain", "props", "previews"):
        (HERE / folder).mkdir(exist_ok=True)
    # Verifica TODOS os mapas antes de escrever qualquer atlas.
    for map_id, entry in CATALOG.items():
        if digest(MAPS / f"{map_id}.tmj") != entry["mapSha256"]:
            raise RuntimeError(f"Mapa editado: {map_id}; revisar catálogo antes de continuar")
    sources = []
    for prompt in sorted(HERE.glob("*.prompt.txt")):
        image = prompt.name.replace(".prompt.txt", ".png")
        if not (HERE / image).is_file():
            raise RuntimeError(f"Fonte ausente: {image}")
        record = {"image": image, "prompt": prompt.name}
        if image in ("city-shop.png", "city-wood-house.png"):
            record["reference"] = f"footprint-guide-{2 if image == 'city-shop.png' else 3}.png"
        sources.append(record)
    atlases = {}
    retained = []
    for map_id in GROUNDS:
        atlas = Image.open(HERE / "retained" / f"{map_id}_tiles.png").convert("RGBA")
        ground(atlas, CATALOG[map_id]["keys"], map_id)
        objects(atlas, CATALOG[map_id]["keys"], map_id)
        retained.extend(export_retained_props(atlas, CATALOG[map_id]["keys"], map_id))
        atlases[map_id] = atlas
    atlases["falsa"] = tint(atlases["karakura"], (171, 145, 221), .36, .87)
    atlases["wandenreich"] = tint(atlases["soul"], (210, 231, 255), .73, 1.18)
    manifest = {"generator": "image_gen (built-in)", "maps": {}, "sources": sources}
    encoded = {}
    for map_id, atlas in atlases.items():
        path = MAPS / f"{map_id}_tiles.png"
        expected = json.loads((MAPS / f"{map_id}.tmj").read_text(encoding="utf-8"))["tilesets"][0]
        if atlas.size != (expected["imagewidth"], expected["imageheight"]):
            raise RuntimeError(f"Dimensões incorretas: {map_id}")
        buffer = io.BytesIO()
        atlas.save(buffer, format="PNG", optimize=True)
        encoded[path] = buffer.getvalue()
        manifest["maps"][map_id] = {"sha256": hashlib.sha256(encoded[path]).hexdigest(), "previousSha256": digest(HERE/"retained"/path.name)}
        preview(map_id, atlas)
        print(f"{map_id}: {atlas.width}x{atlas.height}, mapa intacto")
    manifest["retainedProps"] = retained
    manifest["props"] = [{"file": str(path.relative_to(HERE)).replace("\\", "/"), "width": Image.open(path).width,
                          "height": Image.open(path).height} for path in sorted((HERE / "props").glob("*.png"))]
    manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2)+"\n"
    # Só publica após validar fontes, dimensões, previews e metadados de TODOS os atlases.
    # A gravação do conjunto não é transacional: se falhar ou for interrompida,
    # execute novamente a montagem COMPLETA antes de servir/publicar esses arquivos.
    # Nunca execute esta ferramenta diretamente no diretório servido em produção.
    for path, content in encoded.items():
        path.write_bytes(content)
    (HERE / "manifest.json").write_text(manifest_text, encoding="utf-8")


if __name__ == "__main__":
    main()
