"""R-13: trajes da Loja de Cristais (uniforme do Colégio Karakura, máscara Vizard, haori de capitão), pelo Codex.

Cada traje é uma EDIÇÃO da folha de andar da forma base do personagem (art/raw/walk8/<base>_<dir>.png): mesmas
poses, mesma grade 4x2, só a roupa muda. Saída em art/raw/walk8/<base>__<traje>_<dir>.png (o lado direito sai
espelhado em walk8.py). Onde já existe arte bruta do mesmo visual (haori e máscara do Ichigo, da Rukia, do Renji,
do Ishida e do Sado), o process.py reaproveita a folha existente e não gera de novo.
Uso: python gen_r13.py [base__traje ...]   (sem argumento: tudo o que falta)
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

EDIT = ("This is an EDIT of the attached sprite sheet: keep EXACTLY the same 4x2 layout, the same 8 cells, the same walk "
        "poses, the same body positions, the same scale, the same feet baseline, the same art style, the same face and hair, "
        "the same outline (#1a1822) and the same solid magenta #FF00FF background. Change ONLY what is described below, "
        "consistently in all 8 cells. Nothing may cross a cell edge. No text, no labels, no grid lines, no border.")
DIRS = {"down": "front view (walking toward the camera)", "left": "left side view", "up": "back view (walking away)"}

# roupa: com saia para as personagens femininas, calça para os outros
FEMALE = {"rukia", "yoruichi"}
KARAKURA_M = ("Replace the clothes with the Karakura High School uniform: a light grey long-sleeved blazer worn open over a "
              "white shirt, a thin red necktie, grey trousers and brown school shoes. Keep the same weapon (if any) in the "
              "same hand or on the same side; remove any captain coat, scarf or hat.")
KARAKURA_F = ("Replace the clothes with the Karakura High School uniform: a light grey long-sleeved blazer over a white "
              "shirt with a red ribbon at the collar, a short pleated grey skirt, white knee socks and brown school shoes. "
              "Keep the same weapon (if any) in the same hand or on the same side; remove any jacket or captain coat.")
VIZARD = ("Add a white bone Hollow mask (Visored style) covering the whole face, with two black eye holes, a row of teeth at "
          "the mouth and thin red stripes running over the eyes. Side views show the mask in profile; the back view shows "
          "only a thin white edge of the mask at the sides of the head. Hair, clothes and weapon unchanged.")
CAPITAO = ("Add a white captain coat (haori) worn over the clothes: open at the front, short wide sleeves, reaching just "
           "below the knees, plain white with a row of black diamond shapes along the bottom hem. The back view shows the "
           "white back of the coat.")

BASES = ["ichigo_shikai", "rukia", "renji", "ishida", "sado", "hitsugaya", "byakuya", "kenpachi", "yoruichi", "ukitake", "shunsui"]
CAPTAINS = {"hitsugaya", "byakuya", "kenpachi", "ukitake", "shunsui"}  # já usam haori na forma base


def todo() -> dict[str, tuple[str, str]]:
    """id da folha (<base>__<traje>) -> (base, texto da edição). Pula o que já tem arte bruta reaproveitável."""
    jobs: dict[str, tuple[str, str]] = {}
    for b in BASES:
        jobs[f"{b}__karakura"] = (b, KARAKURA_F if b in FEMALE else KARAKURA_M)
        if not (OUT / f"{b}__mask_down.png").exists():
            jobs[f"{b}__vizard"] = (b, VIZARD)
        if b not in CAPTAINS and not (OUT / f"{b}__haori_down.png").exists():
            jobs[f"{b}__capitao"] = (b, CAPITAO)
    return jobs


def job(sheet: str, base: str, change: str, d: str) -> str:
    out = OUT / f"{sheet}_{d}.png"
    if out.exists():
        return f"{out.name} já existe"
    ref = OUT / f"{base}_{d}.png"
    prompt = ("Use your built-in image_gen tool to EDIT the attached image and produce exactly ONE image. Do not write code to "
              f"draw art. After generating, copy the resulting PNG from $CODEX_HOME/generated_images/... to ./raw/walk8/{out.name} "
              f"and reply only with the source path and the final path.\n\nImage prompt:\n{EDIT} The sheet shows the {DIRS[d]}. {change}")
    (WORK / f"p_w8_{sheet}_{d}.txt").write_text(prompt, encoding="utf-8")
    with open(WORK / f"log_w8_{sheet}_{d}.txt", "w", encoding="utf-8") as log:
        subprocess.run([CODEX, "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", str(ART), "-i",
                        str(ref.relative_to(ART)), "-"], input=prompt, text=True, encoding="utf-8", stdout=log, stderr=subprocess.STDOUT)
    return f"{out.name}: {'ok' if out.exists() else 'FALHOU'}"


if __name__ == "__main__":
    WORK.mkdir(exist_ok=True)
    jobs = todo()
    if sys.argv[1:]:
        jobs = {k: v for k, v in jobs.items() if k in sys.argv[1:]}
    with ThreadPoolExecutor(max_workers=9) as ex:
        for r in ex.map(lambda a: job(*a), [(s, b, c, d) for s, (b, c) in jobs.items() for d in DIRS]):
            print(r, flush=True)
