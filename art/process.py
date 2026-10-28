"""Pós-processa as imagens do Codex em sprites de jogo.

raw/*.png (fundo magenta, alta resolução)
  -> remove o fundo -> reduz (área) -> paleta mestra compartilhada (até 32 cores)
  -> contorno de 1 px #1a1822 -> célula 32x32 (ou 64x64 para monstro grande)
Gera sprites/, sprites48/, preview.png, preview48.png e walk.gif (teste),
e as folhas 4x4 do jogo em ../client/public/assets/sprites/.

Uso: python process.py          (teste + jogo)
     python process.py game     (só as folhas do jogo)
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
OUTLINE = (0x1A, 0x18, 0x22)
MAX_COLORS = 48  # paleta compartilhada; com mais de 20 folhas, 32 cores fundiam o verde do Hollow Ácido no marrom

# nome -> (arquivo raw, linhas, colunas, altura relativa, célula em tiles)
SPRITES = {
    "ichigo_shikai": ("01_ichigo_shikai_front_ref.png", 1, 1, 1.00, 1),
    "ichigo_bankai": ("02_ichigo_bankai_front.png", 1, 1, 1.00, 1),
    "rukia": ("03_rukia_front.png", 1, 1, 0.85, 1),
    "hollow": ("04_hollow_front.png", 1, 1, 1.40, 2),
    "ichigo_walk": ("05_ichigo_shikai_walk_4x4.png", 4, 4, 1.00, 1),
}
DIRS = ["down", "left", "right", "up"]

# folhas do jogo: personagens em 48x48 sobre tiles de 32 (Hollow em 96x96)
GAME_OUT = ROOT.parent / "client" / "public" / "assets" / "sprites"
GAME_SPRITES = {
    "ichigo_shikai": ("06_ichigo_shikai_walk_v2.png", 4, 4, 1.00, 1),
    "ichigo_bankai": ("07_ichigo_bankai_walk.png", 4, 4, 1.00, 1),
    "rukia": ("08_rukia_walk.png", 4, 4, 0.86, 1),
    "renji": ("11_renji_walk.png", 4, 4, 1.04, 1),
    "hollow": ("09_hollow_walk.png", 4, 4, 1.40, 2),
    # visual por equipamento (edições das folhas base): <base>__haori, __mask, __haori_mask
    "ichigo_shikai__haori": ("14_ichigo_haori_walk.png", 4, 4, 1.00, 1),
    "rukia__haori": ("15_rukia_haori_walk.png", 4, 4, 0.86, 1),
    "renji__haori": ("16_renji_haori_walk.png", 4, 4, 1.04, 1),
    "ichigo_shikai__mask": ("17_ichigo_mask_walk.png", 4, 4, 1.00, 1),
    "rukia__mask": ("18_rukia_mask_walk.png", 4, 4, 0.86, 1),
    "renji__mask": ("19_renji_mask_walk.png", 4, 4, 1.04, 1),
    "ichigo_shikai__haori_mask": ("20_ichigo_haori_mask_walk.png", 4, 4, 1.00, 1),
    "rukia__haori_mask": ("21_rukia_haori_mask_walk.png", 4, 4, 0.86, 1),
    "renji__haori_mask": ("22_renji_haori_mask_walk.png", 4, 4, 1.04, 1),
    # Hueco Mundo
    "adjuchas": ("23_adjuchas_walk.png", 4, 4, 1.15, 2),
    "gillian": ("24_gillian_walk.png", 4, 4, 2.0, 2),
    "arrancar": ("25_arrancar_walk.png", 4, 4, 1.0, 1),
    # sprites próprios no lugar do Hollow recolorido
    "grand_fisher": ("30_grand_fisher_walk.png", 4, 4, 1.75, 2),
    "fishbone": ("31_fishbone_walk.png", 4, 4, 1.3, 2),
    "rukia_bankai": ("32_rukia_bankai_walk.png", 4, 4, 0.86, 1),
    "renji_bankai": ("33_renji_bankai_walk.png", 4, 4, 1.04, 1),
    "hollow_menor": ("34_hollow_menor_walk.png", 4, 4, 0.8, 2),
    "hollow_rastejante": ("35_hollow_rastejante_walk.png", 4, 4, 0.85, 2),
    "hollow_acido": ("36_hollow_acido_walk.png", 4, 4, 1.15, 2),
    "hollow_sombrio": ("37_hollow_sombrio_walk.png", 4, 4, 1.0, 2),
    "hollow_uivante": ("38_hollow_uivante_walk.png", 4, 4, 0.95, 2),
    "hollow_faminto": ("39_hollow_faminto_walk.png", 4, 4, 1.15, 2),
    "hollow_encouracado": ("40_hollow_encouracado_walk.png", 4, 4, 1.25, 2),
    "hollow_devorador": ("41_hollow_devorador_walk.png", 4, 4, 1.35, 2),
    # chefe da Soul Society
    "metastacia": ("42_metastacia_walk.png", 4, 4, 1.6, 2),
    # Las Noches
    "arrancar_numeros": ("49_arrancar_numeros_walk.png", 4, 4, 1.0, 1),
    "exequias": ("50_exequias_walk.png", 4, 4, 1.06, 1),
    "fraccion": ("51_fraccion_walk.png", 4, 4, 1.4, 2),
    "privaron": ("52_privaron_walk.png", 4, 4, 1.3, 2),
}


def is_bg(p):
    r, g, b = p[:3]
    # magenta e as bordas rosadas do anti-aliasing do gerador
    return r > 150 and b > 150 and g < 120 and abs(r - b) < 90


def remove_bg(img):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            if is_bg(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return img


def remove_bg_flood(img):
    """Como remove_bg, mas só apaga o magenta ligado às bordas: roxos fortes dentro do
    objeto (portais, bandeiras) não somem. Para objetos de mapa; os sprites usam remove_bg
    porque o buraco no peito dos Hollows também é magenta e precisa sumir."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    seen = bytearray(w * h)
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        if not (0 <= x < w and 0 <= y < h) or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        if not is_bg(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
    return img


def split_cells(img, rows, cols):
    w, h = img.size
    cw, ch = w / cols, h / rows
    return [img.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            for r in range(rows) for c in range(cols)]


def keep_main(img, min_frac=0.05):
    """Apaga pedaços soltos (ex.: cabelo da célula vizinha da folha) menores que
    5% do maior componente conectado, e recorta no que sobrou."""
    w, h = img.size
    alpha = img.getchannel("A").tobytes()
    label = [0] * (w * h)
    sizes = [0]
    boxes = [None]
    for start in range(w * h):
        if not alpha[start] or label[start]:
            continue
        n = len(sizes)
        label[start] = n
        stack, size = [start], 0
        bx0, by0, bx1, by1 = w, h, 0, 0
        while stack:
            i = stack.pop()
            size += 1
            x, y = i % w, i // w
            bx0, by0, bx1, by1 = min(bx0, x), min(by0, y), max(bx1, x), max(by1, y)
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and alpha[j] and not label[j]:
                    label[j] = n
                    stack.append(j)
        sizes.append(size)
        boxes.append((bx0, by0, bx1, by1))
    main = max(range(1, len(sizes)), key=lambda n: sizes[n])
    mx0, my0, mx1, my1 = boxes[main]

    def ok(n):
        # pedaço médio só fica se estiver dentro da faixa vertical do corpo principal
        # (cabelo da célula vizinha aparece acima da cabeça ou abaixo dos pés)
        x0, y0, x1, y1 = boxes[n]
        return n == main or (sizes[n] >= sizes[main] * min_frac and y0 >= my0 and y1 <= my1)

    flags = [n > 0 and ok(n) for n in range(len(sizes))]
    keep = bytes(255 if flags[l] else 0 for l in label)
    img.putalpha(Image.frombytes("L", (w, h), bytes(a and k for a, k in zip(alpha, keep))))
    bb = img.getbbox()
    # deslocamento do conteúdo em relação ao centro da célula, para o place()
    # manter a posição do desenho original e o personagem não "tremer" entre frames
    return img.crop(bb), (bb[0] + bb[2]) / 2 - w / 2


def downscale(img, scale):
    w, h = img.size
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    # pré-multiplica alpha para não puxar cor do fundo transparente
    small = img.resize((nw, nh), Image.BOX)
    a = small.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    small.putalpha(a)
    return small


def add_outline(img):
    """Contorno externo de 1 px: pixels transparentes que tocam o opaco viram #1a1822.
    Externo para não comer o cabelo e o rosto, que têm só 2 a 4 px."""
    src = Image.new("RGBA", (img.width + 2, img.height + 2), (0, 0, 0, 0))
    src.paste(img, (1, 1))
    out = src.copy()
    sp, op = src.load(), out.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            if sp[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and sp[nx, ny][3]:
                    op[x, y] = OUTLINE + (255,)
                    break
    return out


PER_SPRITE = 12


def kmeans_colors(pixels, k, iters=15):
    """k-means simples sobre o histograma de cores, com peso pela raiz da contagem
    (cor pequena e saturada, como cabelo e olhos, não some diante do preto).
    Substitui o quantize do Pillow: MAXCOVERAGE devolvia cores inexistentes e
    MEDIANCUT gastava quase todas as cores em tons de preto."""
    from collections import Counter
    hist = Counter(pixels)
    cols = list(hist)
    w = [hist[c] ** 0.5 for c in cols]
    d2 = lambda a, b: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    # início pelo ponto mais distante: garante cobertura das cores extremas
    centers = [max(zip(w, cols))[1]]
    while len(centers) < min(k, len(cols)):
        centers.append(max(cols, key=lambda c: min(d2(c, m) for m in centers)))
    for _ in range(iters):
        acc = [[0.0, 0.0, 0.0, 0.0] for _ in centers]
        for c, wt in zip(cols, w):
            i = min(range(len(centers)), key=lambda j: d2(c, centers[j]))
            a = acc[i]
            a[0] += c[0] * wt; a[1] += c[1] * wt; a[2] += c[2] * wt; a[3] += wt
        centers = [tuple(round(a[i] / a[3]) for i in range(3)) if a[3] else centers[n]
                   for n, a in enumerate(acc)]
    counts = Counter(min(range(len(centers)), key=lambda j: d2(c, centers[j])) for c in pixels)
    return [(centers[i], counts[i]) for i in range(len(centers)) if counts[i]]


def build_palette(groups):
    """Paleta mestra: cada personagem é reduzido sozinho (até 12 cores) e as cores
    mais próximas entre personagens são fundidas até sobrar 31 + contorno."""
    colors = []  # [r, g, b, peso]
    locals_ = []  # paleta própria de cada personagem: garante <= 16 cores nele
    for frames in groups:
        opaque = [p[:3] for im in frames for p in im.get_flattened_data() if p[3]]
        local = kmeans_colors(opaque, PER_SPRITE)
        locals_.append([c for c, _ in local])
        colors += [list(c) + [n ** 0.5] for c, n in local]

    def dist(a, b):
        return sum((x - y) ** 2 for x, y in zip(a[:3], b[:3]))

    while len(colors) > MAX_COLORS - 1:
        i, j = min(((i, j) for i in range(len(colors)) for j in range(i + 1, len(colors))),
                   key=lambda ij: dist(colors[ij[0]], colors[ij[1]]))
        a, b = colors[i], colors[j]
        w = a[3] + b[3]
        colors[i] = [round((a[k] * a[3] + b[k] * b[3]) / w) for k in range(3)] + [w]
        del colors[j]
    return [OUTLINE] + [tuple(c[:3]) for c in colors], locals_


def apply_palette(img, colors):
    px = img.load()
    cache = {}
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            p = px[x, y]
            if not p[3]:
                continue
            c = cache.get(p[:3])
            if c is None:
                c = min(colors, key=lambda k: sum((a - b) ** 2 for a, b in zip(k, p[:3])))
                cache[p[:3]] = c
            px[x, y] = c + (255,)
    return img


def place(img, cell, ofs=0.0):
    """Apoia os pés na última linha; na horizontal mantém o deslocamento do desenho original."""
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    img = img.crop(img.getbbox())
    x = round(cell / 2 + ofs - img.width / 2)
    x = max(0, min(cell - img.width, x))
    out.paste(img, (x, cell - img.height - 1), img)
    return out


def lift_darks(colors):
    """Clareia os pretos (kimono) para um cinza-azulado escuro, para não se fundirem
    ao contorno #1a1822. O contorno (índice 0) fica como está."""
    out = [colors[0]]
    for c in colors[1:]:
        lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
        sat = max(c) - min(c)
        if sat > 40:
            # escuro com cor de verdade (verde do sapo, vermelho do forro): mantém a cor
            out.append(tuple(c))
            continue
        t = 0.75 if lum < 35 else 0.4 if lum < 60 else 0
        # quase neutro: dessatura antes, porque o preto do gerador puxa para o marrom
        gray = (lum, lum, lum * 1.15)
        base = gray if t else c
        out.append(tuple(round(v + (k - v) * t) for v, k in zip(base, (50, 48, 68))))
    return out


def process(sprites, tile, body_h, lift=False):
    """Retorna {nome: [frames]} já na célula final, com paleta compartilhada."""
    small = {}
    for name, (fname, rows, cols, rel, tiles) in sprites.items():
        path = RAW / fname
        if not path.exists():
            print("faltando:", fname)
            continue
        cells = [keep_main(c) for c in split_cells(remove_bg(Image.open(path)), rows, cols)]
        # escala única por folha: mesma altura de corpo em todos os frames
        ref_h = max(c.height for c, _ in cells)
        # -2: o contorno externo soma 1 px de cada lado
        scale = min((body_h - 2) * rel / ref_h, (tile * tiles - 4) / max(c.width for c, _ in cells))
        small[name] = ([(downscale(c, scale), o * scale) for c, o in cells], tile * tiles)
    colors, locals_ = build_palette([[f for f, _ in frames] for frames, _ in small.values()])
    if lift:
        colors = lift_darks(colors)
    out = {}
    for (name, (frames, cell)), local in zip(small.items(), locals_):
        # primeiro para a paleta do personagem, depois para a mestra
        out[name] = [place(add_outline(apply_palette(apply_palette(f, local), colors)), cell, o)
                     for f, o in frames]
    return out, colors


ICON_SHEETS = ["12_item_icons_4x4.png", "43_item_icons2_4x4.png"]


def export_icons():
    """Ícones de item: cada folha 4x4 vira 16 ícones de 32x32 em client/public/assets/items.png
    (4 colunas; a 2ª folha começa no ícone 16). Cada ícone tem escala própria (cabe numa
    caixa de 28 px), cores próprias e contorno."""
    cells = []
    for name in ICON_SHEETS:
        path = RAW / name
        if not path.exists():
            return print("faltando:", path.name)
        cells += split_cells(remove_bg(Image.open(path)), 4, 4)
    out = Image.new("RGBA", (128, 32 * (len(cells) // 4)))
    for i, cell in enumerate(cells):
        img, _ = keep_main(cell)
        small = downscale(img, min(28 / img.width, 28 / img.height))
        local = [c for c, _ in kmeans_colors([p[:3] for p in small.get_flattened_data() if p[3]], 10)]
        icon = add_outline(apply_palette(small, local))
        out.paste(icon, ((i % 4) * 32 + (32 - icon.width) // 2, (i // 4) * 32 + (32 - icon.height) // 2), icon)
    out.save(GAME_OUT.parent / "items.png")
    zoom(out, 4).save(ROOT / "preview_items.png")


def export_game():
    export_icons()
    # NPC da loja: um quadro só (de frente), com paleta própria
    npc, _ = process({"npc_shop": ("13_npc_shopkeeper_front.png", 1, 1, 1.06, 1)}, 48, 45, lift=True)
    if "npc_shop" in npc:
        npc["npc_shop"][0].save(GAME_OUT / "npc_shop.png")
    # boneco de treino: um quadro só, repetido nas 16 células (o jogo espera folhas 4x4)
    dummy, _ = process({"boneco": ("29_dummy.png", 1, 1, 0.95, 1)}, 48, 45)
    if "boneco" in dummy:
        sheet = Image.new("RGBA", (48 * 4, 48 * 4))
        for i in range(16):
            sheet.paste(dummy["boneco"][0], ((i % 4) * 48, (i // 4) * 48))
        sheet.save(GAME_OUT / "boneco.png")
    sheets, colors = process(GAME_SPRITES, 48, 45, lift=True)
    GAME_OUT.mkdir(parents=True, exist_ok=True)
    for name, frames in sheets.items():
        cell = frames[0].width
        sheet = Image.new("RGBA", (cell * 4, cell * 4))
        for i, f in enumerate(frames):
            sheet.paste(f, ((i % 4) * cell, (i // 4) * cell))
        sheet.save(GAME_OUT / f"{name}.png")
    # prévia das folhas do jogo sobre grama, 4x
    W = sum(f[0].width * 4 for f in sheets.values())
    H = max(f[0].width * 4 for f in sheets.values())
    bg = grass(W, H, 32)
    x = 0
    for frames in sheets.values():
        cell = frames[0].width
        for i, f in enumerate(frames):
            bg.alpha_composite(f, (x + (i % 4) * cell, (i // 4) * cell))
        x += cell * 4
    zoom(bg, 4).save(ROOT / "preview_game.png")
    print("jogo:", ", ".join(sheets), "| cores:", len(colors))


def grass(w, h, tile):
    """Fundo de grama em tiles só para o preview."""
    import random
    rnd = random.Random(1)
    t = Image.new("RGB", (tile, tile), (74, 128, 60))
    for _ in range(tile * tile // 6):
        t.putpixel((rnd.randrange(tile), rnd.randrange(tile)), rnd.choice([(62, 112, 52), (88, 146, 70)]))
    bg = Image.new("RGBA", (w, h))
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            bg.paste(t, (x, y))
    return bg


def zoom(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


def save_all(sprites, outdir, tile, preview_name, k):
    outdir.mkdir(exist_ok=True)
    singles = [n for n in sprites if n != "ichigo_walk"]
    for n in singles:
        sprites[n][0].save(outdir / f"{n}.png")
    walk = sprites.get("ichigo_walk", [])
    for i, f in enumerate(walk):
        f.save(outdir / f"ichigo_shikai_{DIRS[i // 4]}_{i % 4}.png")
    if walk:
        sheet = Image.new("RGBA", (tile * 4, tile * 4))
        for i, f in enumerate(walk):
            sheet.paste(f, ((i % 4) * tile, (i // 4) * tile))
        sheet.save(outdir / "ichigo_shikai_walk_sheet.png")

    # preview: personagens + as 4 direções paradas, apoiados no chão
    items = [sprites[n][0] for n in singles] + [walk[r * 4 + 1] for r in range(4) if walk]
    gap = tile // 4
    W = sum(i.width for i in items) + gap * (len(items) + 1)
    H = max(i.height for i in items) + tile
    W, H = -(-W // tile) * tile, -(-H // tile) * tile
    bg = grass(W, H, tile)
    x = gap
    for im in items:
        bg.alpha_composite(im, (x, H - tile // 2 - im.height))
        x += im.width + gap
    zoom(bg, k).save(ROOT / preview_name)
    return walk


def main():
    export_game()
    if sys.argv[1:] == ["game"]:
        return
    s32, pal = process(SPRITES, 32, 30)
    walk = save_all(s32, ROOT / "sprites", 32, "preview.png", 8)
    s48, _ = process(SPRITES, 48, 45)
    save_all(s48, ROOT / "sprites48", 48, "preview48.png", 6)
    print("cores na paleta:", len(pal))
    if walk:
        # 4 direções lado a lado, 8x, sobre grama
        frames = []
        for i in range(4):
            bg = grass(32 * 4, 32, 32)
            for d in range(4):
                bg.alpha_composite(walk[d * 4 + i], (d * 32, 0))
            frames.append(zoom(bg, 8).convert("P", palette=Image.Palette.ADAPTIVE))
        frames[0].save(ROOT / "walk.gif", save_all=True, append_images=frames[1:], duration=180, loop=0)


if __name__ == "__main__":
    main()
