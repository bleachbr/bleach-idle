#!/usr/bin/env python3
"""Gera as folhas brutas (fundo magenta) que faltam ao jogo, pelo Codex CLI (`image_gen` interno).

Saída em arts/codex/ (fora do git). Depois, cada folha passa por geradores/sprite_processor.py,
que leva o resultado para geradores/staging/ e o Estúdio 360° (preview.html) aprova.

Formatos esperados pelo processador:
- Monstros: folha 4x4 de caminhada (--type walk4x4). Linha 1 frente, 2 perfil esquerdo,
  3 perfil direito, 4 costas; colunas: passo esquerdo, neutro, passo direito, neutro.
- FX: folha 4x4 (--category fx --row N); cada linha é uma animação de 4 quadros.

Os prompts não citam nomes de obras: os seres são descritos só pela aparência.
Uso: python geradores/gen_codex.py [id ...]           (sem ids: todos os que faltam)
     python geradores/gen_codex.py --walk8 [id ...]   (caminhada de 8 quadros dos monstros, formato walk8)
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "arts" / "codex"
PROMPTS = ROOT / "geradores" / "prompts"
STYLE_REF = "src/assets/characters/ichigo_shikai/front.png"

STYLE = ("Style: match the attached reference sprite EXACTLY in art style: same pixel-art rendering, same 3/4 top-down "
         "camera angle, same outline thickness and dark outline color #1a1822, same one-shade shading with light from the "
         "top-left, same pixel density. No gradients, no anti-aliasing, no dithering. Background: 100% solid flat magenta "
         "#FF00FF, no floor, no ground shadow, no text, no labels, no grid lines, no border.")

WALK = ("Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines) of ONE "
        "creature walking, for a top-down 3/4 RPG overworld. Row 1: walking DOWN toward the camera (front view). Row 2: "
        "walking LEFT (left side view, facing left). Row 3: walking RIGHT (right side view, facing right). Row 4: walking UP "
        "away from the camera (back view). Each row is a 4-frame walk cycle with a clear, exaggerated stride: frame 1 left "
        "step, frame 2 neutral, frame 3 right step, frame 4 neutral. Body size never changes. In every cell the creature is "
        "centered, fully inside the central 75% of the cell with magenta padding, identical scale and identical feet baseline "
        "in all 16 cells; nothing crosses a cell edge.")

# id -> (descrição, referências extras de design, tipo)
JOBS = {
    "fishbone": (
        "A monster: a tall, thin fish-like humanoid spirit with dark blue-grey skin, a white bone mask shaped like a fish "
        "skeleton head with a long jaw full of needle teeth, fin-like spikes along its back and forearms, long webbed claws, "
        "and a round hole through the chest (the magenta background shows through it). About as tall as the reference man.",
        ["arts/ref/31_fishbone_walk.png"], "walk"),
    "shrieker": (
        "A monster: a winged bat-like spirit that walks hunched on its hind legs, black leathery body with dark purple-gray "
        "shading, large ragged bat wings folded half-open behind its shoulders, long thin arms with hooked claws, a white "
        "bone mask shaped like a screaming bat skull with glowing orange eye holes and a wide open mouth, and a round hole "
        "through its chest. Slightly shorter than the reference man, but wider because of the wings.",
        [], "walk"),
    "acidwire": (
        "A monster: a lanky serpent-humanoid spirit with a long segmented snake-like lower body that it slithers on, glossy "
        "dark green scales with sickly yellow-green markings, thin arms ending in dripping acid claws, glowing lime-green acid "
        "drops falling from its jaw, a narrow white bone mask shaped like a snake skull with slit eye holes, and a round hole "
        "through its chest. About as tall as the reference man. Its 'walk' is a slither: the tail coils and sways step by step.",
        [], "walk"),
    # Elite: desenho próprio. Até aqui era o Fishbone tingido de vermelho (direcionamento/15).
    "elite": (
        "A monster: a hulking, heavily armored brute spirit, much broader and more muscular than a man, that walks upright "
        "on thick digitigrade legs with long heavy arms hanging to its knees. Its body is black with dark charcoal shading, "
        "covered in jagged crimson-red bone armor plates on the shoulders, forearms, shins and along the spine, long "
        "crimson claws, a white bone mask shaped like a horned demon skull with two thick curved horns sweeping back, a jaw "
        "of fangs and glowing red eye holes, and a round hole through the chest rimmed in crimson. About as tall as the "
        "reference man, but twice as wide.",
        [], "walk"),
    "menos": (
        "A monster: a gigantic, very tall spirit giant shaped like a long narrow cone wrapped in a floor-length jet-black "
        "cloak, a ring of white spikes around the collar, and a white bone mask with a very long pointed nose and small round "
        "dark eye holes at the top. No visible arms; only small black feet peek out under the cloak while walking. It fills "
        "most of the cell height (tall and thin), slow heavy walk.",
        ["arts/ref/24_gillian_walk.png"], "walk"),
    "fx_kido": (
        "Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines) of "
        "magic spell visual effects for a top-down action game. Each row is ONE 4-frame animation read left to right "
        "(appear, grow, peak, dissipate), centered in each cell, fully inside the central 80% of the cell with magenta "
        "padding, nothing crosses a cell edge.\n"
        "Row 1: a fast thin bolt of white-blue lightning shot horizontally to the right, a crackling zig-zag beam with a "
        "bright white core, cyan glow and small sparks; it stretches out over the 4 frames and breaks into sparks in the last.\n"
        "Row 2: the impact of that lightning bolt: a small white-cyan electric burst with radiating jagged sparks, growing "
        "then fading into scattered sparks.\n"
        "Row 3: a round ball of crimson-red spirit fire flying to the right, a glowing orange-white core inside a red sphere "
        "with a short flame trail behind it; it pulses bigger over the frames.\n"
        "Row 4: the explosion of that fireball: a round red-orange blast with a white-hot center, flame tongues and dark red "
        "embers, expanding then breaking into embers and smoke puffs.",
        ["arts/ref/63_fx_skills.png"], "fx"),
    # Projéteis próprios do elenco jogável (src/arsenal.js): flecha espiritual, esfera azul,
    # rajada em forma de punho e explosão em forma de caveira.
    "fx_cast": (
        "Make the image SQUARE. A 4x4 sprite sheet (4 rows, 4 columns, 16 equal square cells, no visible grid lines) of "
        "magic attack visual effects for a top-down action game. Each row is ONE 4-frame animation read left to right "
        "(appear, grow, peak, pulse), centered in each cell, fully inside the central 80% of the cell with magenta "
        "padding, nothing crosses a cell edge.\n"
        "Row 1: a slim arrow made of glowing light-blue spirit energy flying horizontally to the right, a bright white core, "
        "a sharp arrowhead and a short trail of light-blue feather-like light streaks behind it; it flickers brighter.\n"
        "Row 2: a crackling sphere of blue energy flying to the right, a white-hot center inside an electric cyan and deep "
        "blue orb with short jagged sparks around it and a short trail; it pulses bigger over the frames.\n"
        "Row 3: a heavy shockwave of crimson and black energy shaped like a giant clenched fist flying to the right, "
        "a dark red glow and black streaks trailing behind; it surges forward over the frames.\n"
        "Row 4: an expanding blast of white and pale violet energy shaped like a grinning horned skull, with wispy white "
        "flames around it, growing bigger over the frames.",
        ["arts/ref/63_fx_skills.png"], "fx"),
}


def job(id_: str) -> str:
    out = OUT / f"{id_}_sheet.png"
    if out.exists():
        return f"{out.name} já existe"
    desc, refs, kind = JOBS[id_]
    body = f"{desc} {WALK}" if kind == "walk" else desc
    prompt = ("Use your built-in image_gen tool to create exactly ONE image. The attached images are STYLE references from this "
              "game (the first is the art style to match; any others show the intended creature or effect design); use them as "
              "the visual reference for image_gen. Do not write code to draw art. After generating, copy the resulting PNG from "
              f"$CODEX_HOME/generated_images/... to ./arts/codex/{out.name} and reply only with the source path and the final "
              f"path.\n\nImage prompt:\n{body} {STYLE}")
    (PROMPTS / f"{id_}.txt").write_text(prompt, encoding="utf-8")
    images = [STYLE_REF, *refs]
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT)]
    for img in images:
        cmd += ["-i", img]
    with open(OUT / f"log_{id_}.txt", "w", encoding="utf-8") as log:
        subprocess.run([*cmd, "-"], input=prompt, text=True, stdout=log, stderr=subprocess.STDOUT,
                       shell=sys.platform == "win32")
    return f"{out.name}: {'ok' if out.exists() else 'FALHOU'}"


# --- Caminhada de 8 quadros (formato walk8 do processador, igual ao do Ichigo) ---
# Pedir a folha 8x4 inteira de uma vez sai pior; como no Bleach Idle, cada direção vem numa
# imagem quadrada 4x2 (8 quadros) e a folha 8x4 é montada aqui. O lado direito é o esquerdo espelhado.
OUT_W8 = OUT / "walk8"
CYCLE8 = ("Make the image SQUARE. A 4x2 grid (4 columns, 2 rows, 8 equal square cells, no visible grid lines) showing ONE "
          "smooth 8-frame walk cycle of this creature, read left to right on row 1 then on row 2: the legs (or tail, as the "
          "creature has) alternate step by step through contact, weight, passing and reaching poses, the body bobs slightly "
          "down and up, arms, claws, wings, tails and cloaks sway with the motion. Every frame must be clearly different, and "
          "the cycle must loop smoothly from frame 8 back to frame 1. In every cell the creature is centered, fully inside the "
          "central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 8 cells; nothing "
          "crosses a cell edge.")
DIRS8 = {"down": "Walking DOWN toward the camera (front view).", "left": "Walking LEFT (left side view, facing left).",
         "up": "Walking UP away from the camera (back view)."}
WALK_IDS = [i for i, (_, _, kind) in JOBS.items() if kind == "walk"]


def job_walk8(id_: str, d: str) -> str:
    out = OUT_W8 / f"{id_}_{d}.png"
    if out.exists():
        return f"{out.name} já existe"
    sheet4 = f"arts/codex/{id_}_sheet.png"  # a folha 4x4 do próprio monstro fixa o design
    prompt = ("Use your built-in image_gen tool to create exactly ONE image. The attached images are references from this game: "
              "the first is the art style to match, the second is THIS EXACT creature (same design, colors, mask and "
              "proportions); use them as the visual reference for image_gen. Do not write code to draw art. After generating, "
              f"copy the resulting PNG from $CODEX_HOME/generated_images/... to ./arts/codex/walk8/{out.name} and reply only "
              f"with the source path and the final path.\n\nImage prompt:\n{JOBS[id_][0]} {DIRS8[d]} {CYCLE8} {STYLE}")
    (PROMPTS / f"{id_}_walk8_{d}.txt").write_text(prompt, encoding="utf-8")
    cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ROOT),
           "-i", STYLE_REF, "-i", sheet4, "-"]
    with open(OUT_W8 / f"log_{id_}_{d}.txt", "w", encoding="utf-8") as log:
        subprocess.run(cmd, input=prompt, text=True, stdout=log, stderr=subprocess.STDOUT, shell=sys.platform == "win32")
    return f"{out.name}: {'ok' if out.exists() else 'FALHOU'}"


def silhueta(img):
    """Máscara booleana do que não é magenta, recortada na caixa do conteúdo e num tamanho fixo."""
    import numpy as np
    from PIL import Image
    a = np.asarray(img.convert("RGB")).astype(int)
    fundo = (a[..., 0] > 180) & (a[..., 2] > 180) & (a[..., 1] < 100)
    m = Image.fromarray(((~fundo) * 255).astype("uint8"))
    box = m.getbbox()
    return np.asarray(m.crop(box).resize((64, 96))) > 127 if box else np.zeros((96, 64), bool)


def orientar_como_primeiro(frames):
    """O Codex às vezes vira o perfil para o outro lado numa linha da grade. Cada quadro é comparado
    com o 1º e com o espelho do 1º; se parece mais com o espelho, é desvirado."""
    from PIL import ImageOps
    ref = silhueta(frames[0])
    out = []
    for f in frames:
        s = silhueta(f)
        igual, espelho = (s == ref).mean(), (s[:, ::-1] == ref).mean()
        out.append(ImageOps.mirror(f) if espelho > igual else f)
    return out


def ereto_no_segundo(frames):
    """O processador usa o 2º quadro como pose parada (direção.png) e o validador mede a altura dela.
    Gira o ciclo (a animação em loop não muda) para que o quadro mais alto, o mais ereto, fique em 2º;
    senão a pose parada pode cair no ponto mais baixo da passada."""
    import numpy as np

    def altura(f):
        a = np.asarray(f.convert("RGB")).astype(int)
        linhas = np.where((~((a[..., 0] > 180) & (a[..., 2] > 180) & (a[..., 1] < 100))).any(axis=1))[0]
        return linhas[-1] - linhas[0] if len(linhas) else 0

    k = (max(range(len(frames)), key=lambda i: altura(frames[i])) - 1) % len(frames)
    return frames[k:] + frames[:k]


def montar_walk8(id_: str) -> str:
    """Junta as 3 imagens 4x2 numa folha 8x4 (frente, esquerda, direita espelhada, costas), fundo magenta."""
    from PIL import Image, ImageOps
    parts = {d: OUT_W8 / f"{id_}_{d}.png" for d in DIRS8}
    if not all(p.exists() for p in parts.values()):
        return f"{id_}: faltam direções, folha não montada"
    # Numa imagem quadrada em 4x2 cada célula é retangular (duas vezes mais alta que larga):
    # mantém o tamanho original da célula para não achatar o monstro. O processador aceita
    # células não quadradas (largura/8, altura/4).
    first = Image.open(parts["down"])
    cw, ch = first.width // 4, first.height // 2

    def frames(path):
        img = Image.open(path).convert("RGB").resize((cw * 4, ch * 2), Image.Resampling.NEAREST)
        return [img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(2) for c in range(4)]

    left = ereto_no_segundo(orientar_como_primeiro(frames(parts["left"])))
    rows = [ereto_no_segundo(frames(parts["down"])), left, [ImageOps.mirror(f) for f in left],
            ereto_no_segundo(frames(parts["up"]))]
    sheet = Image.new("RGB", (cw * 8, ch * 4), (255, 0, 255))
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            sheet.paste(f, (c * cw, r * ch))
    out = OUT / f"{id_}_walk8_sheet.png"
    sheet.save(out)
    return f"{out.name}: montada"


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    PROMPTS.mkdir(parents=True, exist_ok=True)
    args = sys.argv[1:]
    if args[:1] == ["--walk8"]:  # python gen_codex.py --walk8 [id ...]
        OUT_W8.mkdir(parents=True, exist_ok=True)
        ids = args[1:] or WALK_IDS
        with ThreadPoolExecutor(max_workers=6) as ex:
            for r in ex.map(lambda a: job_walk8(*a), [(i, d) for i in ids for d in DIRS8]):
                print(r, flush=True)
        for i in ids:
            print(montar_walk8(i), flush=True)
    else:
        with ThreadPoolExecutor(max_workers=5) as ex:
            for r in ex.map(job, args or list(JOBS)):
                print(r, flush=True)
