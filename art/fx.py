"""Efeitos animados (art/raw/62 a 64) -> client/public/assets/fx/.

Cada folha é 4x4: uma linha por efeito, 4 quadros. A folha inteira é reduzida por igual
(sem recortar cada quadro), para que o efeito cresça e some do jeito que foi desenhado.
"""
from pathlib import Path
from PIL import Image
import process as P

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
OUT = ROOT.parent / "client" / "public" / "assets" / "fx"

# arquivo bruto -> (nome de saída, tamanho da célula no jogo)
SHEETS = {
    "62_fx_combat.png": ("combat", 64),
    "63_fx_skills.png": ("skills", 64),
    "64_fx_aura.png": ("aura", 96),
    "69_fx_skills2.png": ("skills2", 64),
    "70_fx_mobs.png": ("mobs", 64),
    "71_fx_release.png": ("release", 96),
}


def crisp(img, colors=32):
    local = [c for c, _ in P.kmeans_colors([p[:3] for p in img.get_flattened_data() if p[3]], colors)]
    return P.apply_palette(img, local)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for raw, (name, cell) in SHEETS.items():
        if not (RAW / raw).exists():
            print("faltando:", raw)
            continue
        src = Image.open(RAW / raw).convert("RGBA")
        cells = P.split_cells(src, 4, 4)
        sheet = Image.new("RGBA", (cell * 4, cell * 4))
        for i, c in enumerate(cells):
            # o magenta some só onde encosta no fundo: roxos e rosas do próprio efeito ficam
            clean = P.remove_bg_flood(c)
            # pontinhos de magenta quase puro soltos no meio do efeito (o roxo da fumaça é bem mais escuro)
            px = clean.load()
            for y in range(clean.height):
                for x in range(clean.width):
                    r, g, b, a = px[x, y]
                    if a and r > 215 and b > 215 and g < 70:
                        px[x, y] = (0, 0, 0, 0)
            small = P.downscale(clean, cell / clean.width)
            sheet.alpha_composite(crisp(small) if small.getbbox() else small, ((i % 4) * cell, (i // 4) * cell))
        sheet.save(OUT / f"{name}.png")
        print(f"{name}.png {sheet.width}x{sheet.height} (células de {cell})")


if __name__ == "__main__":
    main()
