"""R-01: Yoruichi, Ukitake e Shunsui jogáveis, com os 5 estágios (níveis 1, 10, 30, 60 e 100), pelo Codex.

Mesmo fluxo dos scripts bash locais de art/work/ (gen_capitaes.sh e gen_walk8.sh, fora do git), em Python
porque o Windows não tem bash; os textos STYLE e CYCLE abaixo são cópia dos de gen_walk8.sh.
Primeiro a forma base de cada um (com a folha do Byakuya como referência de estilo), depois os
estágios usando a base como referência (mesmo rosto e roupa). Cada estágio gera frente, lado esquerdo
e costas em art/raw/walk8/ (o lado direito sai espelhado em walk8.py).
Uso: python gen_r01.py [id ...]   (sem ids: tudo o que falta, base primeiro)
"""
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ART = Path(__file__).resolve().parent
OUT = ART / "raw" / "walk8"
WORK = ART / "work"
CODEX = shutil.which("codex") or "codex"

# textos idênticos aos de work/gen_walk8.sh
STYLE = ("Style: match the attached reference sprite sheet EXACTLY in character design, colors and art style: same pixel-art "
         "rendering, same 3/4 top-down camera angle, same realistic (not chibi) proportions, same outline thickness and dark "
         "outline color #1a1822, same one-shade shading with light from the top-left, same pixel density. No gradients, no "
         "anti-aliasing, no dithering. Background: 100% solid flat magenta #FF00FF, no floor, no shadow, no text, no labels, "
         "no grid lines.")
CYCLE = ("Make the image SQUARE. A 4x2 grid (4 columns, 2 rows, 8 equal square cells) showing ONE smooth 8-frame walk cycle, "
         "read left to right on row 1 then left to right on row 2: frame 1 right foot forward touching the ground (contact), "
         "frame 2 weight on the right foot with the body slightly lower, frame 3 passing pose with the left leg lifted and moving "
         "forward, frame 4 left leg reaching forward with the body slightly higher, frame 5 left foot forward touching the ground "
         "(contact), frame 6 weight on the left foot with the body slightly lower, frame 7 passing pose with the right leg lifted "
         "and moving forward, frame 8 right leg reaching forward with the body slightly higher. Arms swing opposite to the legs. "
         "Every frame must be clearly different. Weapons, capes and accessories stay on the SAME side and in the same hand in ALL "
         "8 frames (never switch hands, never duplicate the weapon). In every cell the character is centered, fully inside the "
         "central 75% of the cell with magenta padding, identical scale and identical feet baseline in all 8 cells; nothing "
         "crosses a cell edge.")
DIRS = {"down": "Walking DOWN toward the camera (front view).", "left": "Walking LEFT (left side view, facing left).",
        "up": "Walking UP away from the camera (back view)."}

YOR = ("Yoruichi Shihoin from Bleach, former captain of the 2nd Division: slim athletic woman with dark brown skin, long dark "
       "purple hair tied in a high ponytail, golden cat-like eyes, confident smirk, a black sleeveless fitted top, a short orange "
       "jacket open over it, black fitted trousers, white leg wraps and dark tabi shoes, empty-handed (she fights barehanded)")
YOR_OM = ("Yoruichi Shihoin from Bleach in her Onmitsukido commander outfit: slim athletic woman with dark brown skin, long dark "
          "purple hair tied in a high ponytail, golden cat-like eyes, a black sleeveless backless fitted bodysuit, white wraps "
          "on the forearms and shins, an orange sash at the waist, no jacket, empty-handed")
UKI = ("Jushiro Ukitake from Bleach, captain of the 13th Division: tall thin pale gentle man with very long straight white hair "
       "reaching his lower back, kind tired face, black shihakusho, white captain haori with long sleeves, a katana with a white "
       "hilt sheathed at his left hip")
UKI_SH = (f"{UKI}, Shikai Sogyo no Kotowari: instead of the katana he holds two thin straight jitte-like blades, one in each hand, "
          "connected to each other by a long red rope hung with five small rectangular paper talisman charms")
SHU = ("Shunsui Kyoraku from Bleach, captain of the 8th Division: tall relaxed man with wavy dark brown hair in a loose low "
       "ponytail, a short goatee and stubble, a wide flat straw kasa hat, a pink kimono with a white flower pattern worn like a "
       "cape over a white captain haori and a black shihakusho, a katana and a short wakizashi sheathed at his left hip")
SHU_SH = f"{SHU}, Shikai Katen Kyokotsu: holding two large curved scimitar-like blades, one in each hand, the sheaths empty"

# id -> (referência, descrição). As bases usam a folha do Byakuya (capitão alto, mesmo traço);
# os estágios usam a base do próprio personagem.
BASES = {
    "yoruichi": ("byakuya_down.png", YOR),
    "ukitake": ("byakuya_down.png", UKI),
    "shunsui": ("byakuya_down.png", SHU),
}
STAGES = {
    "yoruichi_onmitsu": ("yoruichi_down.png", YOR_OM),
    "yoruichi_shunko": ("yoruichi_down.png", f"{YOR_OM}, Shunko: crackling white-blue lightning reiatsu bursting from her bare "
                        "back and shoulders, sparks around her arms"),
    "yoruichi_raijin": ("yoruichi_down.png", f"{YOR_OM}, Shunko Raijin Senkei: her whole body wreathed in dense crackling white "
                        "lightning, her ponytail blown upward by the reiatsu, glowing golden eyes"),
    "yoruichi_raijujin": ("yoruichi_down.png", "Yoruichi Shihoin from Bleach in Shunko Raijujin, a feline lightning beast form: "
                          "slim athletic woman with dark brown skin, her dark purple hair grown very long and wild like a mane, "
                          "pointed cat ears and a long tail made of white-yellow lightning, glowing yellow eyes, clawed hands "
                          "crackling with electricity, a black tight sleeveless bodysuit and white leg wraps"),
    "ukitake_shikai": ("ukitake_down.png", UKI_SH),
    "ukitake_kotowari": ("ukitake_down.png", f"{UKI_SH}, pale blue spirit energy flowing along the rope between the two blades, "
                         "the talismans glowing"),
    "ukitake_kido": ("ukitake_down.png", f"{UKI_SH}, casting high-level Kido: a large glowing blue-white Kido seal circle "
                     "floating behind his back, blue light around his hands"),
    "ukitake_mimihagi": ("ukitake_down.png", f"{UKI}, as the vessel of Mimihagi: eyes closed, hands pressed together in prayer "
                         "in front of his chest, no sword in hand, a huge dark shadowy arm covered with small eyes rising from his "
                         "back above his head, dark tendrils curling around him, his long white hair flowing"),
    "shunsui_shikai": ("shunsui_down.png", SHU_SH),
    "shunsui_kageoni": ("shunsui_down.png", f"{SHU_SH}, playing the shadow game Kageoni: a dark purple shadow spreading on the "
                        "ground around his feet, small shadow blades rising from it"),
    "shunsui_bankai": ("shunsui_down.png", f"{SHU_SH}, Bankai Katen Kyokotsu Karamatsu Shinju: a gloomy dark purple-black aura "
                       "with drifting dark flower petals around him, both blades lowered, a sad tired expression"),
    "shunsui_soutaichou": ("shunsui_down.png", "Shunsui Kyoraku from Bleach as Captain-Commander of the Gotei 13: tall relaxed man "
                           "with wavy dark brown hair in a loose low ponytail, a short goatee, a black eyepatch over his right eye, "
                           "no hat, a long white Captain-Commander haori with the pink flower kimono draped over the shoulders, a "
                           "black shihakusho, holding the two large curved blades of Katen Kyokotsu, one in each hand"),
}


def job(id_: str, d: str) -> str:
    ref_name, desc = BASES.get(id_) or STAGES[id_]
    out = OUT / f"{id_}_{d}.png"
    if out.exists():
        return f"{out.name} já existe"
    ref = OUT / ref_name
    if not ref.exists():
        return f"{out.name}: falta a referência {ref_name}"
    prompt = ("Use your built-in image_gen tool to create exactly ONE image. The attached image is a STYLE AND CHARACTER REFERENCE "
              "from this game; use it as the visual reference for image_gen. Do not write code to draw art. After generating, copy "
              f"the resulting PNG from $CODEX_HOME/generated_images/... to ./raw/walk8/{out.name} and reply only with the source "
              f"path and the final path.\n\nImage prompt:\nThe character: {desc}. {DIRS[d]} {CYCLE} {STYLE}")
    (WORK / f"p_w8_{id_}_{d}.txt").write_text(prompt, encoding="utf-8")
    with open(WORK / f"log_w8_{id_}_{d}.txt", "w", encoding="utf-8") as log:
        # sem shell: no Windows o codex é um .cmd/.ps1 do npm, e shutil.which acha o executável certo
        subprocess.run([CODEX, "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ART), "-i",
                        str(ref.relative_to(ART)), "-"], input=prompt, text=True, encoding="utf-8", stdout=log,
                       stderr=subprocess.STDOUT)
    return f"{out.name}: {'ok' if out.exists() else 'FALHOU'}"


def run(ids: list[str], workers: int = 9):
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for r in ex.map(lambda a: job(*a), [(i, d) for i in ids for d in DIRS]):
            print(r, flush=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(exist_ok=True)
    ids = sys.argv[1:]
    if ids:
        run(ids)
    else:
        run(list(BASES))
        run(list(STAGES))
