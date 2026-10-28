"""Gera os mapas do jogo no formato do Tiled (.tmj, com tileset embutido) a partir
dos pacotes CC0 da Kenney em art/maps/kenney/.

Saída em client/public/maps/:
  karakura.tmj + karakura_tiles.png   (arte própria, gerada pelo Codex: art/raw/44 a 46; sem elas, Kenney)
  hueco.tmj    + hueco_tiles.png      (arte própria, gerada pelo Codex: art/raw/47 e 48; sem elas, Kenney)
  soul.tmj     + soul_tiles.png   (arte própria, gerada pelo Codex: art/raw/26 a 28)

Camadas de cada mapa:
  chao     piso (grama, asfalto, areia...)
  objetos  prédios, árvores, rochas, baú, portal (tiles com a propriedade solido=true bloqueiam)
  acima    copas e topos de coluna, desenhados por cima dos personagens (não bloqueiam)
  logica   objetos: templo, pz (retângulo), depot, loja, portal, chegada (destino de viagem), spawn

ATENÇÃO: depois de editar um mapa no Tiled, não rode este script de novo, ou a edição
é sobrescrita. Ele serve para gerar a primeira versão (ou recomeçar do zero).

Uso: python art/maps/build_maps.py
"""
import json
import math
import random
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
KENNEY = Path(__file__).parent / "kenney"
OUT = ROOT / "client" / "public" / "maps"
T = 32  # tamanho do tile no jogo (os da Kenney são 16, ampliados 2x)

CITY = Image.open(KENNEY / "roguelike-modern-city" / "tilemap_packed.png").convert("RGBA")  # 37x28, sem espaçamento
RPG = Image.open(KENNEY / "roguelike-rpg-pack" / "roguelikeSheet_transparent.png").convert("RGBA")  # 57x31, 1 px entre tiles
RAW = Path(__file__).resolve().parents[1] / "raw"


def city(c, r):
    return CITY.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))


def rpg(c, r):
    return RPG.crop((c * 17, r * 17, c * 17 + 16, r * 17 + 16))


def recolor(img, tint):
    """Mantém luz e sombra, troca a cor (areia creme -> branca de Hueco Mundo)."""
    px = img.load()
    out = img.copy()
    po = out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255
            po[x, y] = tuple(round(min(255, lum * t * 1.12)) for t in tint) + (a,)
    return out


class Tileset:
    """Junta os tiles escolhidos numa imagem (ampliada 2x) e guarda as propriedades."""

    def __init__(self, name):
        self.name = name
        self.tiles = []  # (imagem 16x16, solido)
        self.ids = {}

    def add(self, key, img, solid=False):
        self.ids[key] = len(self.tiles)
        self.tiles.append((img, solid))

    def gid(self, key):
        return self.ids[key] + 1  # firstgid = 1

    def save(self):
        cols = 8
        rows = math.ceil(len(self.tiles) / cols)
        sheet = Image.new("RGBA", (cols * T, rows * T))
        for i, (img, _) in enumerate(self.tiles):
            sheet.paste(img.resize((T, T), Image.NEAREST), ((i % cols) * T, (i // cols) * T))
        png = f"{self.name}_tiles.png"
        sheet.save(OUT / png)
        return {
            "firstgid": 1, "name": self.name, "image": png, "imagewidth": sheet.width, "imageheight": sheet.height,
            "tilewidth": T, "tileheight": T, "tilecount": len(self.tiles), "columns": cols, "margin": 0, "spacing": 0,
            "tiles": [{"id": i, "properties": [{"name": "solido", "type": "bool", "value": True}]}
                      for i, (_, solid) in enumerate(self.tiles) if solid],
        }


class Map:
    def __init__(self, name, title, w, h, ts):
        self.name, self.title, self.w, self.h, self.ts = name, title, w, h, ts
        self.layers = {k: [0] * (w * h) for k in ("chao", "objetos", "acima")}
        self.keys = {k: [None] * (w * h) for k in ("chao", "objetos", "acima")}
        self.objects = []
        # chão com textura: chave -> prefixo dos tiles "<prefixo><x%4><y%4>" (arte própria)
        self.tex = {}

    def set(self, layer, x, y, key):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.keys[layer][y * self.w + x] = key
            if layer == "chao" and key in self.tex:
                key = f"{self.tex[key]}{x % 4}{y % 4}"
            self.layers[layer][y * self.w + x] = self.ts.gid(key) if key else 0

    def get(self, layer, x, y):
        return self.layers[layer][y * self.w + x]

    def solid(self, x, y):
        if not (0 <= x < self.w and 0 <= y < self.h):
            return True
        for layer in ("chao", "objetos"):
            g = self.get(layer, x, y)
            if g and self.ts.tiles[g - 1][1]:
                return True
        return False

    def nearest_free(self, x, y):
        for r in range(12):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if max(abs(dx), abs(dy)) == r and not self.solid(x + dx, y + dy):
                        return x + dx, y + dy
        raise ValueError(f"sem tile livre perto de {x},{y}")

    def point(self, kind, x, y, name="", props=None):
        self.objects.append({
            "name": name or kind, "type": kind, "x": x * T + T / 2, "y": y * T + T / 2, "width": 0, "height": 0,
            "point": True, "rotation": 0, "visible": True,
            **({"properties": [{"name": k, "type": "int" if isinstance(v, int) else "string", "value": v} for k, v in props.items()]} if props else {}),
        })

    def rect(self, kind, x0, y0, x1, y1):
        self.objects.append({
            "name": kind, "type": kind, "x": x0 * T, "y": y0 * T, "width": (x1 - x0 + 1) * T, "height": (y1 - y0 + 1) * T,
            "rotation": 0, "visible": True,
        })

    def save(self):
        tileset = self.ts.save()
        layers = [
            {"id": i + 1, "name": k, "type": "tilelayer", "width": self.w, "height": self.h, "x": 0, "y": 0,
             "opacity": 1, "visible": True, "data": self.layers[k]}
            for i, k in enumerate(("chao", "objetos", "acima"))
        ]
        for i, o in enumerate(self.objects):
            o["id"] = i + 1
        layers.append({"id": 4, "name": "logica", "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0,
                       "opacity": 1, "visible": True, "objects": self.objects})
        data = {
            "type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal", "renderorder": "right-down",
            "infinite": False, "width": self.w, "height": self.h, "tilewidth": T, "tileheight": T,
            "nextlayerid": 5, "nextobjectid": len(self.objects) + 1, "compressionlevel": -1,
            "properties": [{"name": "nome", "type": "string", "value": self.title}],
            "layers": layers, "tilesets": [tileset],
        }
        (OUT / f"{self.name}.tmj").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"{self.name}: {self.w}x{self.h}, {len(self.ts.tiles)} tiles, {len(self.objects)} objetos")


# ------------------------------------------------------------------ Karakura

def karakura():
    own = all((RAW / f).exists() for f in ("44_kk_ground.png", "45_kk_buildings.png", "46_kk_props.png"))
    ts = Tileset("karakura")
    if own:
        return karakura_layout(ts, karakura_own_tiles(ts))
    ts.add("grama", city(0, 24))
    ts.add("grama2", city(1, 24))
    ts.add("asfalto", city(10, 24))  # asfalto liso (o 16,22 tem linhas de vaga)
    ts.add("calcada", city(1, 20))
    ts.add("praca", city(4, 20))
    ts.add("agua_topo", city(27, 4), True)
    ts.add("agua", city(27, 5), True)
    ts.add("agua_base", city(27, 6), True)
    for i, c in enumerate((31, 33, 36)):
        ts.add(f"arvore{i}", city(c, 11), True)
        ts.add(f"copa{i}", city(c, 10))
    ts.add("arbusto", city(34, 13), True)
    ts.add("lixeira", city(12, 13), True)
    # prédios: telhado 3x3 (9 partes) + cornija + parede, em três cores
    styles = {"vermelho": ((0, 1, 3), (0, 1, 3), 0), "cinza": ((8, 9, 11), (4, 5, 7), 0), "bege": ((24, 25, 27), (8, 9, 11), 0)}
    for s, (roof, wall, _) in styles.items():
        for ri, rr in enumerate((0, 1, 3)):
            for ci, cc in enumerate(roof):
                ts.add(f"telhado_{s}_{ri}{ci}", city(cc, rr), True)
        for ci, cc in enumerate(wall):
            ts.add(f"cornija_{s}_{ci}", city(cc, 4), True)
            ts.add(f"parede_{s}_{ci}", city(cc, 5), True)
            # janela e porta desenhadas sobre a parede (compõe aqui, porque cada célula tem 1 tile no objetos)
            ts.add(f"janela_{s}_{ci}", Image.alpha_composite(city(cc, 5), city(25, 19)), True)
            ts.add(f"porta_{s}_{ci}", Image.alpha_composite(city(cc, 5), city(25, 21)), True)
    ts.add("depot", Image.alpha_composite(city(4, 20), rpg(38, 9)), True)
    ts.add("senkaimon", Image.alpha_composite(city(4, 20), rpg(33, 1)), True)
    return karakura_layout(ts, None)


def karakura_own_tiles(ts):
    """Arte própria (Codex, art/raw/44 a 46) com as mesmas chaves do traçado da Kenney.
    Devolve a função que desenha um prédio, porque cada prédio vira uma imagem inteira."""
    P = pixel_tools()
    ground = Image.open(RAW / "44_kk_ground.png").convert("RGBA")
    q = ground.width // 2
    texs = {}
    for name, (qx, qy) in {"grama": (0, 0), "asfalto": (1, 0), "calcada": (0, 1), "agua": (1, 1)}.items():
        crop = ground.crop((qx * q + 6, qy * q + 6, qx * q + q - 6, qy * q + q - 6)).resize((4 * T, 4 * T), Image.BOX)
        if name == "asfalto":
            # o asfalto gerado vem granulado demais (parece cascalho): suaviza e usa poucas cores
            from PIL import ImageFilter
            crop = crop.filter(ImageFilter.GaussianBlur(1.6))
        texs[name] = P["crisp"](crop, 5 if name == "asfalto" else 12)
    # praça: a calçada num tom quente, para a zona segura se destacar
    texs["praca"] = recolor(texs["calcada"], (232, 206, 160))
    for name, tex in texs.items():
        for y, row in enumerate(P["tiles_of"](tex)):
            for x, t in enumerate(row):
                ts.add(f"{name}{x}{y}", t, solid=name == "agua")
    props = P["split"](Image.open(RAW / "46_kk_props.png").convert("RGBA"), 3, 3)
    praca = texs["praca"].crop((0, 0, T, T))
    for i, cell in enumerate((props[0], props[3], props[6])):
        (top,), (bottom,) = P["tiles_of"](P["prop"](cell, 1, 2))
        ts.add(f"arvore{i}", bottom, True)
        ts.add(f"copa{i}", top)
    ts.add("arbusto", P["prop"](props[1], 1, 1), True)
    ts.add("lixeira", Image.alpha_composite(praca, P["prop"](props[7], 1, 1)), True)
    ts.add("maquina", Image.alpha_composite(praca, P["prop"](props[2], 1, 1)), True)
    ts.add("banco", Image.alpha_composite(praca, P["prop"](props[8], 1, 1)), True)
    ts.add("depot", Image.alpha_composite(praca, P["prop"](props[4], 1, 1)), True)
    (top,), (bottom,) = P["tiles_of"](P["prop"](props[5], 1, 2))
    ts.add("senkaimon", Image.alpha_composite(praca, bottom), True)
    ts.add("senkaimon_topo", top)
    houses = P["split"](Image.open(RAW / "45_kk_buildings.png").convert("RGBA"), 2, 2)
    made = set()

    def building(m, x0, y0, w, h, style):
        # vermelho: casa; cinza: prédio; bege: loja; parte das casas vira a casa de madeira
        k = {"vermelho": 0, "cinza": 1, "bege": 2}[style]
        if k == 0 and (x0 + y0) % 3 == 0:
            k = 3
        if (k, w, h) not in made:
            made.add((k, w, h))
            for dy, row in enumerate(P["tiles_of"](P["prop"](houses[k], w, h))):
                for dx, t in enumerate(row):
                    # o terreno inteiro do prédio bloqueia, como no traçado original
                    ts.add(f"casa{k}_{w}x{h}_{dx}{dy}", Image.alpha_composite(texs["calcada"].crop((0, 0, T, T)), t), True)
        for dy in range(h):
            for dx in range(w):
                m.set("objetos", x0 + dx, y0 + dy, f"casa{k}_{w}x{h}_{dx}{dy}")
    return building


def pixel_tools():
    """As mesmas ferramentas de pixel art usadas na Soul Society."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    import process as P

    def crisp(img, colors=16):
        local = [c for c, _ in P.kmeans_colors([p[:3] for p in img.get_flattened_data() if p[3]], colors)]
        return P.apply_palette(img, local)

    def prop(img, w_tiles, h_tiles, outline=True):
        body, _ = P.keep_main(P.remove_bg(img))
        k = min((w_tiles * T - 2) / body.width, (h_tiles * T - 2) / body.height)
        small = crisp(P.downscale(body, k))
        if outline:
            small = P.add_outline(small)
        canvas = Image.new("RGBA", (w_tiles * T, h_tiles * T))
        canvas.alpha_composite(small, ((canvas.width - small.width) // 2, canvas.height - small.height))
        return canvas

    def tiles_of(canvas):
        return [[canvas.crop((x * T, y * T, x * T + T, y * T + T)) for x in range(canvas.width // T)] for y in range(canvas.height // T)]

    return {"crisp": crisp, "prop": prop, "tiles_of": tiles_of, "split": lambda img, rows, cols: P.split_cells(img, rows, cols)}


def karakura_layout(ts, own_building):
    m = Map("karakura", "Karakura", 64, 48, ts)
    if own_building:
        m.tex = {"grama": "grama", "grama2": "grama", "asfalto": "asfalto", "calcada": "calcada", "praca": "praca",
                 "agua_topo": "agua", "agua": "agua", "agua_base": "agua"}
    styles = ("vermelho", "cinza", "bege")
    rnd = random.Random(42)
    for y in range(m.h):
        for x in range(m.w):
            m.set("chao", x, y, "grama" if rnd.random() < 0.7 else "grama2")

    def tree(x, y):
        i = rnd.randrange(3)
        m.set("objetos", x, y, f"arvore{i}")
        if y > 0:
            m.set("acima", x, y - 1, f"copa{i}")

    def building(x0, y0, w, h, style):
        if own_building:
            return own_building(m, x0, y0, w, h, style)
        for dy in range(h):
            for dx in range(w):
                ci = 0 if dx == 0 else 2 if dx == w - 1 else 1
                x, y = x0 + dx, y0 + dy
                if dy <= h - 3:
                    ri = 0 if dy == 0 else 2 if dy == h - 3 else 1
                    m.set("objetos", x, y, f"telhado_{style}_{ri}{ci}")
                elif dy == h - 2:
                    m.set("objetos", x, y, f"cornija_{style}_{ci}")
                else:
                    door = dx == w // 2
                    win = not door and 0 < dx < w - 1 and dx % 2 == 1
                    kind = "porta" if door else "janela" if win else "parede"
                    m.set("objetos", x, y, f"{kind}_{style}_{ci}")

    PZ = (13, 11, 19, 17)
    in_pz = lambda x, y: PZ[0] <= x <= PZ[2] and PZ[1] <= y <= PZ[3]

    # cidade: ruas a cada 8 colunas e 7 linhas, prédios ou praças nos quarteirões
    town = (2, 2, 31, 27)
    for y in range(town[1], town[3] + 1):
        for x in range(town[0], town[2] + 1):
            if (x - town[0]) % 8 < 2 or (y - town[1]) % 7 < 2:
                m.set("chao", x, y, "asfalto")
    xs = [x for x in range(town[0], town[2] + 1) if (x - town[0]) % 8 == 2]
    ys = [y for y in range(town[1], town[3] + 1) if (y - town[1]) % 7 == 2]
    for bx in xs:
        for by in ys:
            w = min(6, town[2] - bx + 1)
            h = min(5, town[3] - by + 1)
            if any(in_pz(x, y) for x in range(bx, bx + w) for y in range(by, by + h)):
                for x in range(bx, bx + w):
                    for y in range(by, by + h):
                        m.set("chao", x, y, "calcada")
                continue
            style = rnd.choice(list(styles))
            roll = rnd.random()
            if h < 4 or roll < 0.18:  # pracinha
                for _ in range(2):
                    tree(bx + rnd.randrange(w), by + 1 + rnd.randrange(max(1, h - 1)))
            elif w >= 6 and roll < 0.55:  # dois prédios de 3
                building(bx, by, 3, h, style)
                building(bx + 3, by, 3, h, rnd.choice(list(styles)))
            else:
                building(bx, by, w, h, style)

    # praça central (zona de proteção): piso, baú do depot, portal; o NPC da loja é desenhado pelo jogo
    for y in range(PZ[1], PZ[3] + 1):
        for x in range(PZ[0], PZ[2] + 1):
            m.set("chao", x, y, "praca")
            m.set("objetos", x, y, None)
            m.set("acima", x, y, None)
    m.set("objetos", 14, 12, "depot")
    m.set("objetos", 16, 11, "senkaimon")
    for x, y in ((13, 17), (19, 17)):
        m.set("objetos", x, y, "lixeira")
    if own_building:
        m.set("acima", 16, 10, "senkaimon_topo")
        for x, y, k in ((13, 15, "banco"), (19, 15, "banco"), (19, 11, "maquina")):
            m.set("objetos", x, y, k)

    # estradas para as hunts
    for x in range(town[2], m.w - 2):
        for y in (9, 10):
            m.set("chao", x, y, "asfalto")
    for y in range(town[3], m.h - 2):
        for x in (16, 17):
            m.set("chao", x, y, "asfalto")

    # rio ao sul com ponte na estrada
    for x in range(m.w):
        y0 = 33 + round(math.sin(x / 5) * 1.5)
        for k, part in enumerate(("agua_topo", "agua", "agua_base")):
            if x in (16, 17):
                m.set("chao", x, y0 + k, "praca")
            else:
                m.set("chao", x, y0 + k, part)
                m.set("objetos", x, y0 + k, None)

    # floresta fora da cidade e borda fechada
    for y in range(m.h):
        for x in range(m.w):
            in_town = x <= town[2] + 1 and y <= town[3] + 1
            edge = x < 2 or y < 2 or x >= m.w - 2 or y >= m.h - 2
            free = m.keys["chao"][y * m.w + x] in ("grama", "grama2") and not m.get("objetos", x, y)
            if edge and (x in (0, m.w - 1) or y in (0, m.h - 1) or not in_town):
                m.set("objetos", x, y, f"arvore{rnd.randrange(3)}")
            elif free and not in_town and rnd.random() < 0.09:
                tree(x, y)
            elif free and not in_town and rnd.random() < 0.02:
                m.set("objetos", x, y, "arbusto")

    # lógica
    m.rect("pz", *PZ)
    m.point("templo", 16, 14)
    m.point("depot", 14, 12)
    m.point("loja", 18, 12, "Kisuke (loja)")
    m.point("portal", 16, 11, "Senkaimon")
    m.point("chegada", 16, 15, "karakura")
    for name, (x, y) in {"leste": (36, 10), "rio": (17, 40), "toca": (54, 40)}.items():
        m.point("chegada", *m.nearest_free(x, y), name)
    spawns = [
        ("hollow_menor", 38, 6, 4, 6), ("hollow_rastejante", 40, 15, 4, 5), ("hollow_sombrio", 49, 7, 4, 5),
        ("hollow_uivante", 52, 17, 4, 4), ("hollow_faminto", 44, 25, 4, 4), ("hollow_acido", 57, 27, 3, 3),
        ("hollow_encouracado", 8, 41, 4, 4), ("hollow_devorador", 28, 42, 4, 3), ("fishbone", 45, 41, 4, 3),
        ("grand_fisher", 58, 42, 1, 1),
    ]
    for kind, x, y, r, n in spawns:
        m.point("spawn", x, y, kind, {"monstro": kind, "raio": r, "quantidade": n})
    m.save()


# ------------------------------------------------------------------ Hueco Mundo

def hueco():
    ts = Tileset("hueco")
    own = all((RAW / f).exists() for f in ("47_hm_ground.png", "48_hm_props.png"))
    if own:
        hueco_own_tiles(ts)
    else:
        WHITE = (192, 198, 216)  # areia cinza-azulada (noite eterna), contrasta com roupas brancas
        BONE = (236, 236, 244)
        ts.add("areia", recolor(rpg(8, 0), WHITE))
        ts.add("areia2", recolor(rpg(8, 1), WHITE))
        ts.add("arvore", recolor(rpg(27, 11), BONE), True)
        ts.add("galhos", recolor(rpg(27, 10), BONE))
        for i, c in enumerate((54, 55, 56)):
            ts.add(f"rocha{i}", recolor(rpg(c, 21), (150, 156, 178)), True)
        ts.add("coluna", recolor(rpg(20, 20), BONE), True)
        ts.add("coluna_topo", recolor(rpg(20, 19), BONE))
        ts.add("coluna_quebrada", recolor(rpg(21, 20), BONE), True)
        ts.add("garganta", Image.alpha_composite(recolor(rpg(8, 0), WHITE), rpg(36, 2)), True)

    m = Map("hueco", "Hueco Mundo", 48, 40, ts)
    if own:
        m.tex = {"areia": "areia", "areia2": "areia", "duna": "duna", "ruina": "ruina", "ossos": "ossos"}
    rnd = random.Random(7)
    for y in range(m.h):
        for x in range(m.w):
            m.set("chao", x, y, "areia" if rnd.random() < 0.75 else "areia2")
    PZ = (4, 4, 9, 9)
    near_pz = lambda x, y: PZ[0] - 1 <= x <= PZ[2] + 1 and PZ[1] - 1 <= y <= PZ[3] + 1
    for y in range(m.h):
        for x in range(m.w):
            edge = x == 0 or y == 0 or x == m.w - 1 or y == m.h - 1
            if edge or ((x < 2 or y < 2 or x >= m.w - 2 or y >= m.h - 2) and rnd.random() < 0.5):
                m.set("objetos", x, y, f"rocha{rnd.randrange(3)}")
            elif near_pz(x, y):
                continue
            elif rnd.random() < 0.035:
                m.set("objetos", x, y, "arvore")
                m.set("acima", x, y - 1, "galhos")
            elif rnd.random() < 0.025:
                m.set("objetos", x, y, f"rocha{rnd.randrange(3)}")
    # ruínas: grupos de colunas (algumas quebradas)
    for cx, cy in ((24, 20), (36, 30), (14, 32)):
        for dx in (-3, 0, 3):
            for dy in (-2, 2):
                x, y = cx + dx, cy + dy
                if rnd.random() < 0.3:
                    m.set("objetos", x, y, "coluna_quebrada")
                else:
                    m.set("objetos", x, y, "coluna")
                    m.set("acima", x, y - 1, "coluna_topo")
    m.set("objetos", 6, 4, "garganta")
    if own:
        # só o visual muda (o traçado e a colisão continuam os mesmos): ruínas na zona segura,
        # dunas e ossadas por regiões, crânios no lugar de parte das rochas do meio do deserto
        m.set("acima", 6, 3, "garganta_topo")
        for y in range(m.h):
            for x in range(m.w):
                if PZ[0] <= x <= PZ[2] and PZ[1] <= y <= PZ[3]:
                    m.set("chao", x, y, "ruina")
                elif math.sin(x / 6) + math.cos(y / 5) > 1.1:
                    m.set("chao", x, y, "duna")
                elif math.sin((x + 40) / 7) * math.cos((y + 9) / 6) > 0.6:
                    m.set("chao", x, y, "ossos")
                inner = 2 <= x < m.w - 2 and 2 <= y < m.h - 2
                if inner and (m.keys["objetos"][y * m.w + x] or "").startswith("rocha") and (x * 7 + y * 13) % 10 < 3:
                    m.set("objetos", x, y, "cranio" if (x + y) % 2 else "arvore_peq")

    m.rect("pz", *PZ)
    m.point("portal", 6, 4, "Garganta")
    m.point("chegada", 6, 6, "hueco")
    for kind, x, y, r, n in [
        ("adjuchas", 20, 10, 4, 5), ("adjuchas", 36, 10, 4, 5), ("arrancar", 14, 28, 4, 4),
        ("arrancar", 30, 24, 4, 4), ("gillian", 38, 33, 2, 2),
    ]:
        m.point("spawn", x, y, kind, {"monstro": kind, "raio": r, "quantidade": n})
    m.save()


def hueco_own_tiles(ts):
    """Arte própria de Hueco Mundo (Codex, art/raw/47 e 48), com as chaves do traçado da Kenney."""
    P = pixel_tools()
    ground = Image.open(RAW / "47_hm_ground.png").convert("RGBA")
    q = ground.width // 2
    for name, (qx, qy) in {"areia": (0, 0), "duna": (1, 0), "ruina": (0, 1), "ossos": (1, 1)}.items():
        tex = P["crisp"](ground.crop((qx * q + 6, qy * q + 6, qx * q + q - 6, qy * q + q - 6)).resize((4 * T, 4 * T), Image.BOX), 10)
        for y, row in enumerate(P["tiles_of"](tex)):
            for x, t in enumerate(row):
                ts.add(f"{name}{x}{y}", t)
    props = P["split"](Image.open(RAW / "48_hm_props.png").convert("RGBA"), 3, 3)
    (top,), (bottom,) = P["tiles_of"](P["prop"](props[0], 1, 2))
    ts.add("arvore", bottom, True)
    ts.add("galhos", top)
    for i, k in enumerate((1, 2, 3)):
        ts.add(f"rocha{i}", P["prop"](props[k], 1, 1), True)
    (top,), (bottom,) = P["tiles_of"](P["prop"](props[4], 1, 2))
    ts.add("coluna", bottom, True)
    ts.add("coluna_topo", top)
    ts.add("coluna_quebrada", P["prop"](props[5], 1, 1), True)
    (top,), (bottom,) = P["tiles_of"](P["prop"](props[6], 1, 2))
    ts.add("garganta", bottom, True)
    ts.add("garganta_topo", top)
    ts.add("cranio", P["prop"](props[7], 1, 1), True)
    ts.add("arvore_peq", P["prop"](props[8], 1, 1), True)


# ------------------------------------------------------------------ Soul Society (arte do Codex)

def soul():
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    import process as P  # remoção do magenta, redução e paleta das folhas de sprite

    raw = Path(__file__).resolve().parents[1] / "raw"

    def crisp(img, colors=16):
        """Reduz para pixel art limpa: paleta própria, sem anti-aliasing."""
        local = [c for c, _ in P.kmeans_colors([p[:3] for p in img.get_flattened_data() if p[3]], colors)]
        return P.apply_palette(img, local)

    def prop(img, w_tiles, h_tiles, outline=True):
        """Imagem com fundo magenta -> objeto em pixel art numa grade w x h de tiles (apoiado embaixo)."""
        body, _ = P.keep_main(P.remove_bg(img))
        k = min((w_tiles * T - 2) / body.width, (h_tiles * T - 2) / body.height)
        small = crisp(P.downscale(body, k))
        if outline:
            small = P.add_outline(small)
        canvas = Image.new("RGBA", (w_tiles * T, h_tiles * T))
        canvas.alpha_composite(small, ((canvas.width - small.width) // 2, canvas.height - small.height))
        return canvas

    def tiles_of(canvas):
        return [[canvas.crop((x * T, y * T, x * T + T, y * T + T)) for x in range(canvas.width // T)] for y in range(canvas.height // T)]

    ts = Tileset("soul")
    # chão: cada textura (um quarto da imagem) vira um bloco 4x4 de tiles, escolhido pela posição
    ground = Image.open(raw / "26_ss_ground.png").convert("RGBA")
    q = ground.width // 2
    for name, (qx, qy) in {"pedra": (0, 0), "terra": (1, 0), "grama": (0, 1), "cascalho": (1, 1)}.items():
        tex = crisp(ground.crop((qx * q + 6, qy * q + 6, qx * q + q - 6, qy * q + q - 6)).resize((4 * T, 4 * T), Image.BOX), 12)
        for y, row in enumerate(tiles_of(tex)):
            for x, t in enumerate(row):
                ts.add(f"{name}{x}{y}", t)
    building = tiles_of(prop(Image.open(raw / "27_ss_building.png"), 8, 7))
    for y, row in enumerate(building):
        for x, t in enumerate(row):
            ts.add(f"quartel{x}{y}", t, solid=bool(t.getbbox()))
    props = P.split_cells(Image.open(raw / "28_ss_props.png").convert("RGBA"), 2, 2)
    for name, cell, (w, h) in (("sakura", props[0], (2, 3)), ("pinheiro", props[2], (2, 3)), ("lanterna", props[1], (1, 2)), ("muro", props[3], (4, 2))):
        grid = tiles_of(prop(cell, w, h))
        for y, row in enumerate(grid):
            for x, t in enumerate(row):
                # só a linha de baixo bloqueia (tronco, base); o resto passa por cima dos personagens
                ts.add(f"{name}{x}{y}", t, solid=(name == "muro" or y == h - 1) and bool(t.getbbox()))
    ts.add("garganta_ss", Image.alpha_composite(Image.new("RGBA", (16, 16)), rpg(33, 1)), True)

    m = Map("soul", "Soul Society", 48, 40, ts)
    rnd = random.Random(13)

    def floor(x0, y0, x1, y1, kind):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.set("chao", x, y, f"{kind}{x % 4}{y % 4}")

    def stamp(name, x0, y0, w, h):
        """Objeto de várias células: linhas de cima em "acima" (exceto prédio e muro), a de baixo em "objetos"."""
        for dy in range(h):
            for dx in range(w):
                key = f"{name}{dx}{dy}"
                if not ts.tiles[ts.ids[key]][0].getbbox():
                    continue
                layer = "objetos" if name in ("quartel", "muro") or dy == h - 1 else "acima"
                m.set(layer, x0 + dx, y0 + dy, key)

    floor(0, 0, 47, 39, "grama")
    # Seireitei (norte): ruas de pedra, quartéis, pátio central com jardim zen
    floor(1, 1, 46, 18, "pedra")
    for bx in (3, 13, 27, 37):
        for by in (2, 10):
            if bx in (13, 27) and by == 10:
                continue  # lugar do pátio
            stamp("quartel", bx, by, 8, 7)
    floor(14, 10, 33, 18, "pedra")
    floor(18, 12, 29, 15, "cascalho")  # jardim zen no centro do pátio
    for x, y in ((15, 10), (31, 10)):
        stamp("sakura", x, y, 2, 3)
    for x, y in ((17, 16), (30, 16), (17, 11), (30, 11)):
        stamp("lanterna", x, y, 1, 2)
    # muro da Seireitei com o portão aberto no meio
    for x in range(0, 48, 4):
        if 20 <= x <= 26:
            continue
        stamp("muro", x, 18, 4, 2)
    # Rukongai (sul): estradas de terra, pinheiros e cerejeiras
    floor(22, 20, 25, 39, "terra")
    floor(1, 27, 46, 28, "terra")
    for _ in range(46):
        x, y = rnd.randrange(1, 45), rnd.randrange(21, 37)
        if 20 <= x <= 27 or 25 <= y <= 30:
            continue
        stamp(rnd.choice(("pinheiro", "pinheiro", "sakura")), x, y, 2, 3)
    # borda fechada
    for x in range(48):
        for y in (0, 39):
            m.set("objetos", x, y, "muro10")
    for y in range(40):
        for x in (0, 47):
            m.set("objetos", x, y, "muro10")
    m.set("objetos", 24, 13, None)
    m.set("objetos", 23, 11, "garganta_ss")  # Senkaimon da Soul Society

    m.rect("pz", 14, 10, 33, 17)
    m.point("portal", 23, 11, "Senkaimon")
    m.point("chegada", *m.nearest_free(23, 14), "soul")
    for kind, x, y, r, n in [
        ("hollow_faminto", 10, 31, 4, 5), ("hollow_acido", 36, 32, 4, 4),
        ("hollow_devorador", 12, 36, 3, 3), ("fishbone", 37, 23, 3, 3),
    ]:
        m.point("spawn", *m.nearest_free(x, y), kind, {"monstro": kind, "raio": r, "quantidade": n})
    # campo de treino: bonecos na rua leste da Seireitei (fora da zona segura)
    for x in (38, 41, 44):
        m.point("spawn", *m.nearest_free(x, 9), "boneco", {"monstro": "boneco", "raio": 0, "quantidade": 1})
    # chefe: Metastacia, no sul do Rukongai
    m.point("spawn", *m.nearest_free(24, 36), "metastacia", {"monstro": "metastacia", "raio": 2, "quantidade": 1})
    m.save()


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    karakura()
    hueco()
    soul()
