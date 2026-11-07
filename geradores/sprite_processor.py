#!/usr/bin/env python3
"""
===============================================================================
BLEACH: SOUL SURVIVOR - GERADOR E PROCESSADOR DE SPRITES 360 / 2.5D
===============================================================================
Este script faz o processamento refinado de artes geradas em pixel art:
1. Remoção de Chroma Key (Magenta #FF00FF ou cor customizada) com despill de borda.
2. Fatiamento em 4 direções (Frente, Costas, Lado Direito, Lado Esquerdo).
3. Alinhamento de baseline dos pés (evita trepidação na caminhada).
4. Exportação de atlas padronizado, quadros individuais e manifest.json.
5. Suporte a Staging (preview para aprovação) e Deploy oficial em src/assets/.
===============================================================================
"""

import os
import sys
import json
import argparse
import numpy as np
from PIL import Image

def remove_chroma_key(img, key_color=(255, 0, 255), tolerance=120, despill_strength=0.7):
    """
    Remove o fundo magenta (#FF00FF) e limpa a borda (despill)
    para evitar contorno roxo nos pixels semi-transparentes ou antialiasing.
    """
    img = img.convert("RGBA")
    arr = np.array(img).astype(np.float32)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    # Distância Euclidiana em RGB até a cor chave
    kr, kg, kb = key_color
    dist = np.sqrt((r - kr)**2 + (g - kg)**2 + (b - kb)**2)

    # Máscara 100% transparente para pixels próximos do magenta
    transparent_mask = dist < tolerance
    a[transparent_mask] = 0

    # Despill: onde a cor ainda tem excesso de magenta nas bordas (R > G e B > G)
    # Suaviza a saturação da borda para a cor da linha de contorno (#1a1822)
    border_mask = (~transparent_mask) & (r > g + 30) & (b > g + 30)
    if np.any(border_mask):
        excess = np.maximum(0, np.minimum(r - g, b - g)) * despill_strength
        arr[border_mask, 0] = np.maximum(0, r[border_mask] - excess[border_mask])
        arr[border_mask, 2] = np.maximum(0, b[border_mask] - excess[border_mask])

    arr[:, :, 3] = a
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def process_walk_4x4(img, target_size=128):
    """
    Processa uma folha 4x4 padrão RPG Maker / Tibia (como arts/06_ichigo_shikai_walk_v2.png):
    Row 0: Front / Down (olhando para a câmera)
    Row 1: Side Left (perfil esquerdo)
    Row 2: Side Right (perfil direito)
    Row 3: Back / Up (olhando para o fundo / costas)
    4 colunas: passo esquerdo, neutro, passo direito, neutro.
    """
    w, h = img.size
    cw = w // 4
    ch = h // 4

    rows = {
        'front':  0,
        'side_l': 1,
        'side':   2,
        'back':   3
    }

    frames_by_dir = {}
    all_bboxes = []

    # 1. Extrair células e calcular caixas delimitadoras
    for dir_name, row_idx in rows.items():
        frames_by_dir[dir_name] = []
        for col_idx in range(4):
            box = (col_idx * cw, row_idx * ch, (col_idx + 1) * cw, (row_idx + 1) * ch)
            cell = img.crop(box)
            bbox = cell.getbbox()
            if bbox:
                all_bboxes.append(bbox)
            frames_by_dir[dir_name].append((cell, bbox))

    if not all_bboxes:
        raise ValueError("Nenhum sprite visível encontrado após remoção de fundo.")

    # 2. Determinar a altura máxima e o pé mais baixo para manter o baseline estável
    max_height = max(b[3] - b[1] for b in all_bboxes)
    max_width  = max(b[2] - b[0] for b in all_bboxes)

    # 3. Normalizar e centralizar cada quadro com padding uniforme no target_size (ex: 128x128)
    processed_frames = {}
    atlas = Image.new("RGBA", (target_size * 4, target_size * 4), (0, 0, 0, 0))

    scale_factor = (target_size * 0.82) / max(max_height, max_width)

    for dir_name, row_idx in rows.items():
        processed_frames[dir_name] = []
        for col_idx, (cell, bbox) in enumerate(frames_by_dir[dir_name]):
            # Criar quadro quadrado normalizado
            frame = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
            if bbox:
                cropped = cell.crop(bbox)
                new_w = max(1, int(cropped.width * scale_factor))
                new_h = max(1, int(cropped.height * scale_factor))
                resized = cropped.resize((new_w, new_h), Image.Resampling.NEAREST)

                # Alinhar: centro horizontal, pés ancorados na base com margem de 10%
                dest_x = (target_size - new_w) // 2
                dest_y = int(target_size * 0.92) - new_h
                frame.paste(resized, (dest_x, dest_y), resized)

            processed_frames[dir_name].append(frame)
            atlas.paste(frame, (col_idx * target_size, row_idx * target_size))

    return atlas, processed_frames

def process_walk_8frame(img, target_size=128):
    """
    Processa uma folha oficial de 8 quadros por direção (como arts/walk8/ichigo_shikai_sheet.png):
    Dimensões: 8 colunas x 4 linhas (2512 x 2508 px)
    Row 0: Front / Down (8 quadros da passada completa: contato, absorção, passagem, alcance...)
    Row 1: Side Left (8 quadros de perfil esquerdo)
    Row 2: Side Right (8 quadros de perfil direito)
    Row 3: Back / Up (8 quadros de costas)
    """
    w, h = img.size
    cw = w // 8
    ch = h // 4

    rows = {
        'front':  0,
        'side_l': 1,
        'side':   2,
        'back':   3
    }

    frames_by_dir = {}
    all_bboxes = []

    # 1. Extrair todas as células e calcular bboxes
    for dir_name, row_idx in rows.items():
        frames_by_dir[dir_name] = []
        for col_idx in range(8):
            box = (col_idx * cw, row_idx * ch, (col_idx + 1) * cw, (row_idx + 1) * ch)
            cell = img.crop(box)
            bbox = cell.getbbox()
            if bbox:
                all_bboxes.append(bbox)
            frames_by_dir[dir_name].append((cell, bbox))

    if not all_bboxes:
        raise ValueError("Nenhum sprite visível encontrado após remoção de fundo.")

    max_height = max(b[3] - b[1] for b in all_bboxes)
    max_width  = max(b[2] - b[0] for b in all_bboxes)

    processed_frames = {}
    atlas = Image.new("RGBA", (target_size * 8, target_size * 4), (0, 0, 0, 0))
    scale_factor = (target_size * 0.84) / max(max_height, max_width)

    for dir_name, row_idx in rows.items():
        processed_frames[dir_name] = []
        for col_idx, (cell, bbox) in enumerate(frames_by_dir[dir_name]):
            frame = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
            if bbox:
                cropped = cell.crop(bbox)
                new_w = max(1, int(cropped.width * scale_factor))
                new_h = max(1, int(cropped.height * scale_factor))
                resized = cropped.resize((new_w, new_h), Image.Resampling.NEAREST)

                dest_x = (target_size - new_w) // 2
                dest_y = int(target_size * 0.92) - new_h
                frame.paste(resized, (dest_x, dest_y), resized)

            processed_frames[dir_name].append(frame)
            atlas.paste(frame, (col_idx * target_size, row_idx * target_size))

    return atlas, processed_frames

def process_single_front(img, target_size=128):
    """
    Processa um sprite único frontal (como arts/_chibi_descartado/01_ichigo_shikai_front_ref.png).
    Gera as 4 direções, usando espelhamento para os lados e um placeholder suave para as costas.
    """
    bbox = img.getbbox()
    if not bbox:
        raise ValueError("Nenhum sprite visível encontrado.")

    cropped = img.crop(bbox)
    scale_factor = (target_size * 0.82) / max(cropped.width, cropped.height)
    new_w = max(1, int(cropped.width * scale_factor))
    new_h = max(1, int(cropped.height * scale_factor))
    resized = cropped.resize((new_w, new_h), Image.Resampling.NEAREST)

    front_frame = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    dest_x = (target_size - new_w) // 2
    dest_y = int(target_size * 0.92) - new_h
    front_frame.paste(resized, (dest_x, dest_y), resized)

    # Espelhado para lado esquerdo e direito como fallback inicial
    side_frame = front_frame.copy()
    side_l_frame = front_frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    # Costas escurecida como silhueta indicativa para testes de 360
    back_arr = np.array(front_frame)
    back_arr[:, :, :3] = (back_arr[:, :, :3] * 0.35).astype(np.uint8)
    back_frame = Image.fromarray(back_arr)

    processed_frames = {
        'front':  [front_frame],
        'side_l': [side_l_frame],
        'side':   [side_frame],
        'back':   [back_frame]
    }

    atlas = Image.new("RGBA", (target_size * 4, target_size * 4), (0, 0, 0, 0))
    atlas.paste(front_frame, (0, 0))
    atlas.paste(side_l_frame, (0, target_size))
    atlas.paste(side_frame, (0, target_size * 2))
    atlas.paste(back_frame, (0, target_size * 3))

    return atlas, processed_frames

def export_character(name, category, atlas, processed_frames, out_dir, format_type, source_file, target_size=128):
    """
    Salva os arquivos processados na pasta de destino (staging ou oficial).
    """
    os.makedirs(out_dir, exist_ok=True)

    # 1. Salvar atlas completo
    atlas_path = os.path.join(out_dir, "atlas.png")
    atlas.save(atlas_path, "PNG")

    # 2. Salvar quadros individuais padrão de direção
    for dir_name, frames in processed_frames.items():
        # Quadro neutro (repouso)
        idle_frame = frames[1] if len(frames) > 1 else frames[0]
        idle_frame.save(os.path.join(out_dir, f"{dir_name}.png"), "PNG")

        # Salvar todos os quadros de animação se houver
        if len(frames) > 1:
            for idx, frame in enumerate(frames):
                frame.save(os.path.join(out_dir, f"{dir_name}_{idx}.png"), "PNG")

    # 3. Gerar manifest.json com metadados do personagem
    manifest = {
        "id": name,
        "name": name.replace("_", " ").title(),
        "category": category,
        "format": format_type,
        "source": source_file,
        "targetSize": target_size,
        "worldScale": [2.2, 2.2],
        "fps": 10 if format_type == "walk8" else (8 if format_type == "walk4x4" else 0),
        "frameCount": 8 if format_type == "walk8" else (4 if format_type == "walk4x4" else 1),
        "directions": {
            "front":  {"row": 0, "frames": len(processed_frames['front']),  "file": "front.png"},
            "side_l": {"row": 1, "frames": len(processed_frames['side_l']), "file": "side_l.png"},
            "side":   {"row": 2, "frames": len(processed_frames['side']),   "file": "side.png"},
            "back":   {"row": 3, "frames": len(processed_frames['back']),   "file": "back.png"}
        }
    }

    manifest_path = os.path.join(out_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"✅ Exportado com sucesso em: {out_dir}")
    print(f"   Atlas: {atlas_path}")
    print(f"   Manifest: {manifest_path}")
    return manifest

def main():
    parser = argparse.ArgumentParser(description="Processador de Sprites 360 BleachBR")
    parser.add_argument("--input", "-i", required=True, help="Caminho da imagem de entrada")
    parser.add_argument("--name", "-n", required=True, help="Nome/ID do personagem (ex: ichigo_shikai)")
    parser.add_argument("--category", "-c", default="characters", choices=["characters", "monsters", "props", "fx"])
    parser.add_argument("--type", "-t", default="auto", choices=["auto", "walk8", "walk4x4", "single_front"])
    parser.add_argument("--target-size", "-s", type=int, default=128, help="Tamanho do quadro quadrado (padrão 128)")
    parser.add_argument("--tolerance", type=int, default=120, help="Tolerância da cor magenta")
    parser.add_argument("--approve", action="store_true", help="Se definido, exporta direto para src/assets/")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"❌ Erro: Arquivo {args.input} não existe.")
        sys.exit(1)

    print(f"🎨 Carregando {args.input}...")
    raw_img = Image.open(args.input)

    # Auto-detectar tipo se necessário
    format_type = args.type
    if format_type == "auto":
        # Se for do diretório walk8 ou tiver proporção 8 colunas (ex: 2512x2508 com walk8 no nome)
        if "walk8" in args.input.lower() and "sheet" in args.input.lower():
            format_type = "walk8"
        elif "walk" in args.input.lower():
            format_type = "walk4x4"
        else:
            format_type = "single_front"

    print(f"🧹 Removendo fundo magenta (Chroma Key tolerância={args.tolerance})...")
    clean_img = remove_chroma_key(raw_img, tolerance=args.tolerance)

    print(f"📐 Processando formato '{format_type}' com quadro {args.target_size}x{args.target_size}...")
    if format_type == "walk8":
        atlas, frames = process_walk_8frame(clean_img, target_size=args.target_size)
    elif format_type == "walk4x4":
        atlas, frames = process_walk_4x4(clean_img, target_size=args.target_size)
    else:
        atlas, frames = process_single_front(clean_img, target_size=args.target_size)

    # Determinar pasta de saída
    base_repo = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if args.approve:
        out_dir = os.path.join(base_repo, "src", "assets", args.category, args.name)
    else:
        out_dir = os.path.join(base_repo, "geradores", "staging", args.name)

    export_character(args.name, args.category, atlas, frames, out_dir, format_type, args.input, args.target_size)

    # Se aprovado, atualizar src/characters.js
    if args.approve:
        chars_dir = os.path.join(base_repo, "src", "assets", "characters")
        monsters_dir = os.path.join(base_repo, "src", "assets", "monsters")
        chars = {}
        monsters = {}
        if os.path.exists(chars_dir):
            for c_name in sorted(os.listdir(chars_dir)):
                mf = os.path.join(chars_dir, c_name, "manifest.json")
                if os.path.exists(mf):
                    with open(mf, "r", encoding="utf-8") as f:
                        chars[c_name] = json.load(f)
        if os.path.exists(monsters_dir):
            for m_name in sorted(os.listdir(monsters_dir)):
                mf = os.path.join(monsters_dir, m_name, "manifest.json")
                if os.path.exists(mf):
                    with open(mf, "r", encoding="utf-8") as f:
                        monsters[m_name] = json.load(f)

        reg_path = os.path.join(base_repo, "src", "characters.js")
        content = f"""// =======================================================================
// BLEACH: SOUL SURVIVOR - REGISTRO OFICIAL DE ASSETS E PERSONAGENS
// =======================================================================
// Este arquivo é atualizado automaticamente pelo gerador de sprites
// sempre que um novo personagem ou monstro é APROVADO via 360 Preview Studio.
// =======================================================================

export const PLAYABLE_CHARACTERS = {json.dumps(chars, indent=2, ensure_ascii=False)};

export const MONSTERS_REGISTRY = {json.dumps(monsters, indent=2, ensure_ascii=False)};
"""
        with open(reg_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"🔄 Sincronizado registro em: {reg_path}")

if __name__ == "__main__":
    main()
