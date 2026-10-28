"""Kit de interface (art/raw/58 a 61) -> client/public/assets/ui/.

Cada peça é recortada do fundo magenta, reduzida para o tamanho de tela (pixel art limpa) e
salva separada. Os números de recorte ("slice") do CSS saem impressos no fim: são as bordas
que não esticam no border-image.
"""
from pathlib import Path
from PIL import Image
import process as P

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
OUT = ROOT.parent / "client" / "public" / "assets" / "ui"


def crisp(img, colors=24):
    local = [c for c, _ in P.kmeans_colors([p[:3] for p in img.get_flattened_data() if p[3]], colors)]
    return P.apply_palette(img, local)


def piece(img, height=None, width=None):
    """recorta do magenta e reduz para a altura (ou largura) pedida, sem anti-aliasing"""
    body, _ = P.keep_main(P.remove_bg_flood(img))
    k = height / body.height if height else width / body.width
    return crisp(P.downscale(body, k))


def save(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{name}.png")
    print(f"{name}.png {img.width}x{img.height}")


def main():
    # moldura de painel: 128 px de lado; os cantos (tsuba) ocupam ~18 px
    panel = piece(Image.open(RAW / "58_ui_panel.png"), width=128)
    save(panel, "panel")
    # botões: 2 colunas (vermelho, preto) x 3 linhas (normal, hover, pressionado), 24 px de altura
    cells = P.split_cells(Image.open(RAW / "59_ui_buttons.png").convert("RGBA"), 3, 2)
    for row, state in enumerate(("", "_hover", "_down")):
        save(piece(cells[row * 2], height=24), f"btn_red{state}")
        save(piece(cells[row * 2 + 1], height=24), f"btn_black{state}")
    # espaço de inventário (normal e realçado), moldura de barra e plaquinha de título
    parts = P.split_cells(Image.open(RAW / "60_ui_parts.png").convert("RGBA"), 2, 2)
    save(piece(parts[0], width=40), "slot")
    save(piece(parts[1], width=40), "slot_hi")
    save(piece(parts[2], height=14), "bar")
    save(piece(parts[3], height=20), "plate")
    # ícones de menu: folha 4x4 de 24 px
    icons = P.split_cells(Image.open(RAW / "61_ui_icons.png").convert("RGBA"), 4, 4)
    sheet = Image.new("RGBA", (96, 96))
    for i, cell in enumerate(icons):
        # ícones: todas as partes ficam (a seta dupla tem duas) e o magenta some inteiro (furo da
        # engrenagem, vidro da ampulheta); só o portal, roxo, apaga apenas o fundo ligado às bordas
        clean = P.remove_bg_flood(cell) if i == 8 else P.remove_bg(cell)
        body = clean.crop(clean.getbbox())
        small = crisp(P.downscale(body, min(22 / body.width, 22 / body.height)), 12)
        sheet.alpha_composite(small, ((i % 4) * 24 + (24 - small.width) // 2, (i // 4) * 24 + (24 - small.height) // 2))
    save(sheet, "icons")


if __name__ == "__main__":
    main()
