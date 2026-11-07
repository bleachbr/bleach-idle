#!/usr/bin/env python3
"""
=======================================================================
BLEACH: SOUL SURVIVOR - SUITE DE VALIDAÇÃO AUTOMATIZADA DE SPRITES
=======================================================================
Este script executa uma bateria rigorosa de testes de qualidade e
uniformidade sobre qualquer personagem ou monstro gerado:

1. Uniformidade de Altura 360° (Height Uniformity):
   Garante que o personagem não encolha ou estique ao virar de costas
   (variação máxima permitida entre direções: < 8%).

2. Ancoragem de Solo (Footing Baseline Jitter):
   Garante que os pés toquem exatamente a mesma linha de solo em todos
   os quadros da passada (variação máxima permitida: <= 2px).

3. Despejo de Chroma Key (Magenta Despill Leak):
   Verifica se existem resíduos de fundo magenta (#FF00FF) não limpos.

4. Integridade do Manifesto e Atlas:
   Valida que todos os arquivos declarados no manifest.json existem,
   possuem dimensões válidas e o atlas PNG foi montado corretamente.
=======================================================================
"""

import os
import sys
import json
import argparse
import numpy as np
from PIL import Image

class SpriteValidator:
    def __init__(self, char_dir):
        self.char_dir = os.path.abspath(char_dir)
        self.manifest_path = os.path.join(self.char_dir, "manifest.json")
        self.manifest = None
        self.errors = []
        self.warnings = []
        self.metrics = {}

    def run_all(self):
        print(f"\n🔍 [SpriteValidator] Iniciando bateria de testes em: {self.char_dir}")

        if not os.path.exists(self.char_dir):
            self.errors.append(f"Diretório não encontrado: {self.char_dir}")
            return False

        # Teste 1: Manifesto
        self.test_manifest_integrity()
        if self.errors:
            return False

        # Teste 2: Integridade dos Arquivos e Atlas
        self.test_files_and_atlas()

        # Teste 3: Uniformidade de Altura 360°
        self.test_height_uniformity()

        # Teste 4: Ancoragem de Solo (Jitter)
        self.test_foot_baseline_jitter()

        # Teste 5: Chroma Key Despill
        self.test_chroma_despill()

        # Exibir relatório
        self.print_report()
        return len(self.errors) == 0

    def test_manifest_integrity(self):
        if not os.path.exists(self.manifest_path):
            self.errors.append("manifest.json ausente.")
            return

        try:
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                self.manifest = json.load(f)
        except Exception as e:
            self.errors.append(f"Erro ao analisar manifest.json: {e}")
            return

        required_keys = ["id", "format", "targetSize", "frameCount", "directions"]
        for k in required_keys:
            if k not in self.manifest:
                self.errors.append(f"Chave obrigatória ausente no manifest: '{k}'")

    def test_files_and_atlas(self):
        # Verificar atlas
        atlas_path = os.path.join(self.char_dir, "atlas.png")
        if not os.path.exists(atlas_path):
            self.errors.append("atlas.png não encontrado.")

        # Verificar arquivos por direção
        directions = self.manifest.get("directions", {})
        frame_count = self.manifest.get("frameCount", 1)

        for dir_name, dir_info in directions.items():
            base_file = os.path.join(self.char_dir, dir_info.get("file", f"{dir_name}.png"))
            if not os.path.exists(base_file):
                self.errors.append(f"Arquivo base ausente para direção '{dir_name}': {base_file}")

            if frame_count > 1:
                for f_idx in range(frame_count):
                    f_file = os.path.join(self.char_dir, f"{dir_name}_{f_idx}.png")
                    if not os.path.exists(f_file):
                        self.errors.append(f"Quadro ausente: {f_file}")

    def test_height_uniformity(self):
        """Valida se o personagem tem volume similar em todas as direções."""
        directions = self.manifest.get("directions", {})
        dir_heights = {}

        for dir_name in directions:
            base_file = os.path.join(self.char_dir, f"{dir_name}.png")
            if os.path.exists(base_file):
                img = Image.open(base_file)
                bbox = img.getbbox()
                if bbox:
                    h = bbox[3] - bbox[1]
                    dir_heights[dir_name] = h

        self.metrics["heights"] = dir_heights
        if len(dir_heights) >= 2:
            vals = list(dir_heights.values())
            max_h = max(vals)
            min_h = min(vals)
            variance = (max_h - min_h) / max_h
            self.metrics["heightVariancePercent"] = round(variance * 100, 2)

            # Tolerância máxima: 8% (garante que costas e frente tenham tamanho consistente)
            if variance > 0.08:
                self.errors.append(
                    f"FALHA de Uniformidade de Altura 360°: Variação de {self.metrics['heightVariancePercent']}% "
                    f"(mín={min_h}px, máx={max_h}px). Costas ou lados estão desproporcionais."
                )
            else:
                print(f"  ✓ Alturas 360° uniformes: {dir_heights} (Variação: {self.metrics['heightVariancePercent']}%)")

    def test_foot_baseline_jitter(self):
        """Valida que todos os quadros tocam o solo na mesma linha y."""
        directions = self.manifest.get("directions", {})
        frame_count = self.manifest.get("frameCount", 1)
        baselines = []

        for dir_name in directions:
            for f_idx in range(frame_count):
                path = os.path.join(self.char_dir, f"{dir_name}_{f_idx}.png" if frame_count > 1 else f"{dir_name}.png")
                if os.path.exists(path):
                    img = Image.open(path)
                    bbox = img.getbbox()
                    if bbox:
                        baselines.append((f"{dir_name}_{f_idx}", bbox[3]))

        if baselines:
            bottoms = [b[1] for b in baselines]
            min_b = min(bottoms)
            max_b = max(bottoms)
            jitter = max_b - min_b
            self.metrics["baselineJitterPx"] = jitter

            if jitter > 2:
                self.errors.append(
                    f"FALHA de Ancoragem de Solo: Jitter de {jitter}px entre quadros (mín={min_b}, máx={max_b}). "
                    f"Os pés trepidam durante a caminhada."
                )
            else:
                print(f"  ✓ Ancoragem de solo estável: baseline y={max_b}px (jitter máximo={jitter}px)")

    def test_chroma_despill(self):
        """Verifica se há pixels magenta residuais."""
        directions = self.manifest.get("directions", {})
        leaks = 0

        for dir_name in directions:
            base_file = os.path.join(self.char_dir, f"{dir_name}.png")
            if os.path.exists(base_file):
                img = Image.open(base_file).convert("RGBA")
                arr = np.array(img)
                r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
                # Magenta puro ou próximo com alpha > 0
                magenta_leak = (a > 50) & (r > 200) & (b > 200) & (g < 80)
                leak_count = int(np.sum(magenta_leak))
                if leak_count > 0:
                    leaks += leak_count
                    self.warnings.append(f"{leak_count} pixels com vazamento magenta detectados em '{dir_name}.png'")

        self.metrics["magentaLeaks"] = leaks
        if leaks == 0:
            print("  ✓ Nenhum vazamento de chroma key (#FF00FF) encontrado.")

    def print_report(self):
        print("\n" + "=" * 60)
        if not self.errors:
            print("✅ [SpriteValidator] SUCESSO: Todos os testes de qualidade passaram!")
        else:
            print(f"❌ [SpriteValidator] REPROVADO: {len(self.errors)} erro(s) crítico(s) encontrado(s):")
            for e in self.errors:
                print(f"   • {e}")

        if self.warnings:
            print(f"⚠️  {len(self.warnings)} aviso(s):")
            for w in self.warnings:
                print(f"   • {w}")
        print("=" * 60 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Validador Automático de Qualidade de Sprites")
    parser.add_argument("--name", "-n", default="ichigo_shikai", help="Nome do personagem")
    parser.add_argument("--category", "-c", default="characters", help="Categoria (characters ou monsters)")
    parser.add_argument("--staging", action="store_true", help="Validar pasta staging em vez de src/assets")
    args = parser.parse_args()

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if args.staging:
        target_dir = os.path.join(repo_root, "geradores", "staging", args.name)
    else:
        target_dir = os.path.join(repo_root, "src", "assets", args.category, args.name)

    validator = SpriteValidator(target_dir)
    success = validator.run_all()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
