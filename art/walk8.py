"""Monta as folhas de andar de 8 quadros (art/raw/walk8/<id>_{down,left,up}.png -> <id>_sheet.png).

Cada imagem do Codex é uma grade 4x2 com o ciclo de 8 quadros de uma direção. O lado direito é o
esquerdo espelhado. A folha montada tem 4 linhas (baixo, esquerda, direita, cima) e 8 colunas, e
entra em process.py no lugar da folha 4x4 antiga.
"""
from pathlib import Path
from PIL import Image, ImageOps
import process as P

RAW = Path(__file__).resolve().parent / "raw" / "walk8"


def build(id_: str) -> Path | None:
    files = {d: RAW / f"{id_}_{d}.png" for d in ("down", "left", "up")}
    if not all(f.exists() for f in files.values()):
        return None
    rows = {d: P.split_cells(Image.open(f).convert("RGBA"), 2, 4) for d, f in files.items()}
    rows["right"] = [ImageOps.mirror(c) for c in rows["left"]]
    cw = max(c.width for r in rows.values() for c in r)
    ch = max(c.height for r in rows.values() for c in r)
    sheet = Image.new("RGBA", (cw * 8, ch * 4), (255, 0, 255, 255))
    for y, d in enumerate(("down", "left", "right", "up")):
        for x, c in enumerate(rows[d]):
            sheet.paste(c, (x * cw + (cw - c.width) // 2, y * ch + (ch - c.height) // 2))
    out = RAW / f"{id_}_sheet.png"
    sheet.save(out)
    return out


def available() -> list[str]:
    ids = {p.stem.rsplit("_", 1)[0] for p in RAW.glob("*_down.png")} if RAW.exists() else set()
    return sorted(i for i in ids if build(i))


if __name__ == "__main__":
    print("folhas de 8 quadros:", ", ".join(available()) or "nenhuma")
