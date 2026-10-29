"""Folhas HD: os desenhos originais do Codex, sem pixelar, para comparar com as de pixel art no jogo.

Mesmo layout das folhas de process.py (4 direções x 4 ou 8 quadros, pés na última linha), mas com
célula HD_K vezes maior, redução suave (LANCZOS), sem paleta e sem contorno. Saem em .webp em
client/public/assets/sprites_hd/ e o jogo só baixa quando o jogador liga o modo HD.
"""
from PIL import Image
import process as P
import walk8

HD_K = 3
OUT = P.GAME_OUT.parent / "sprites_hd"


def place_hd(img, cell, ofs):
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    x = round(cell / 2 + ofs - img.width / 2)
    x = max(0, min(cell - img.width, x))
    out.paste(img, (x, cell - img.height - HD_K), img)
    return out


def sheet_hd(fname, rows, cols, rel, tiles, tile=48, body_h=45):
    path = P.RAW / fname
    if not path.exists():
        return None
    cells = [P.keep_main(c) for c in P.split_cells(P.remove_bg(Image.open(path)), rows, cols)]
    ref_h = max(c.height for c, _ in cells)
    cell = tile * tiles * HD_K
    # a mesma conta de escala do process.py, só que HD_K vezes maior
    scale = min((body_h - 2) * rel * HD_K / ref_h, (cell - 4 * HD_K) / max(c.width for c, _ in cells))
    frames = []
    for c, o in cells:
        small = c.resize((max(1, round(c.width * scale)), max(1, round(c.height * scale))), Image.LANCZOS)
        frames.append(place_hd(small, cell, o * scale))
    n = len(frames) // 4
    sheet = Image.new("RGBA", (cell * n, cell * 4))
    for i, f in enumerate(frames):
        sheet.paste(f, ((i % n) * cell, (i // n) * cell))
    return sheet


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sprites = dict(P.GAME_SPRITES)
    for id_ in walk8.available():
        if id_ in sprites and not sprites[id_][0].startswith("walk8/"):
            _, _, _, rel, tiles = sprites[id_]
            sprites[id_] = (f"walk8/{id_}_sheet.png", 4, 8, rel, tiles)
    done = []
    for name, spec in sprites.items():
        sheet = sheet_hd(*spec)
        if sheet is None:
            continue
        sheet.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
        done.append(name)
    print("HD:", len(done), "folhas em", OUT)


if __name__ == "__main__":
    main()
