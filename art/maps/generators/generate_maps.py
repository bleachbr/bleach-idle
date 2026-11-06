"""CLI para geração de mapas e compilação 2.5D do Bleach Idle (Tarefa JH-04).

Uso:
    python art/maps/generators/generate_maps.py --biome karakura --out ./output_maps
    python art/maps/generators/generate_maps.py --biome rukongai --out ./output_maps
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from ai_blueprint import get_or_generate_blueprint
from autotiler import MapAutotiler, export_to_scene_data, export_to_tiled_json


def main():
    parser = argparse.ArgumentParser(description="Gerador de Mapas 2.5D (Bleach Idle)")
    parser.add_argument(
        "--biome",
        type=str,
        default="karakura",
        help="Bioma a gerar ('karakura' ou 'rukongai')",
    )
    parser.add_argument(
        "--ai",
        action="store_true",
        help="Tentar usar Gemini API se GEMINI_API_KEY estiver configurada",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=str(HERE / "generated"),
        help="Diretório de saída para os arquivos gerados (.tmj, .png, .json)",
    )

    args = parser.parse_args()
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[JH-04] Carregando blueprint para bioma: {args.biome} (AI={args.ai})...")
    bp = get_or_generate_blueprint(args.biome, use_ai=args.ai)
    print(f"[JH-04] Blueprint carregado: '{bp.name}' ({bp.width}x{bp.height} tiles)")

    print("[JH-04] Executando Autotiler 2.5D, cálculo de margens e relevo...")
    autotiler = MapAutotiler(bp)
    compiled = autotiler.compile()

    ground_filename = f"{bp.map_id}-ground.png"
    ground_path = out_dir / ground_filename
    rel_ground_path = f"/maps/scenes/{bp.map_id}-ground.webp"

    if compiled.ground_image:
        print(f"[JH-04] Salvando imagem contínua do terreno: {ground_path}...")
        compiled.ground_image.save(ground_path, format="PNG")

    tmj_data = export_to_tiled_json(compiled, rel_ground_path)
    tmj_path = out_dir / f"{bp.map_id}.tmj"
    print(f"[JH-04] Salvando mapa Tiled: {tmj_path}...")
    tmj_path.write_text(json.dumps(tmj_data, indent=2, ensure_ascii=False), encoding="utf-8")

    scene_data = export_to_scene_data(compiled, rel_ground_path)
    scene_path = out_dir / f"{bp.map_id}-scene.json"
    print(f"[JH-04] Salvando metadados de cena: {scene_path}...")
    scene_path.write_text(json.dumps(scene_data, indent=2, ensure_ascii=False), encoding="utf-8")

    print("[JH-04] Geração concluída com sucesso!")
    print(f"  - Mapa TMJ: {tmj_path}")
    print(f"  - Imagem do Chão: {ground_path}")
    print(f"  - Scene Data: {scene_path}")
    print(f"  - Total de Props posicionados: {len(compiled.props)}")
    print(f"  - Baús configurados: {len([p for p in compiled.props if p.kind == 'chest'])}")


if __name__ == "__main__":
    main()
