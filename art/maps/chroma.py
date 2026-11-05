"""Remove regiões de fundo, preservando roxo interno que não contém a chave."""
from PIL import Image, ImageDraw


def remove_exterior_magenta(image):
    source = image.convert("RGBA")
    pixels = list(source.getdata())
    mask = Image.new("L", source.size)
    mask.putdata([255 if a == 0 or (r > 130 and b > 110 and g < 110 and r > g*1.5 and b > g*1.5)
                  else 0 for r, g, b, a in pixels])
    edges = [(x, y) for x in range(source.width) for y in (0, source.height-1)]
    edges += [(x, y) for y in range(source.height) for x in (0, source.width-1)]
    for point in edges:
        if mask.getpixel(point) == 255:
            ImageDraw.floodfill(mask, point, 128)
    # Vazios entre folhas podem estar cercados pelo objeto. A chave quase pura
    # identifica esses bolsões; o restante da faixa roxa não é apagado por cor.
    for index, ((r, g, b, a), region) in enumerate(zip(pixels, mask.getdata())):
        if region == 255 and (a == 0 or (r-255)**2 + g*g + (b-255)**2 < 30**2):
            ImageDraw.floodfill(mask, (index % source.width, index // source.width), 128)
    source.putdata([(r, g, b, 0 if exterior == 128 else a)
                    for (r, g, b, a), exterior in zip(pixels, mask.getdata())])
    return source
