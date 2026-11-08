#!/usr/bin/env python3
"""
Gerador de Mapas de Bleach (AI Directive-Driven Map Engine)
Lê especificações em Markdown com frontmatter YAML (specs/mapas/*.md),
processa relevos 3D (dunas, montanhas e penhascos), posiciona props canônicos
com dispersão determinística e gera artefatos otimizados para Three.js.
"""

import os
import sys
import math
import json
import yaml
import random
import argparse
from pathlib import Path

def parse_markdown_spec(spec_path):
    with open(spec_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if not content.startswith('---'):
        raise ValueError(f"O arquivo {spec_path} deve iniciar com frontmatter YAML delimitado por '---'.")

    parts = content.split('---', 2)
    if len(parts) < 3:
        raise ValueError(f"Formato inválido de frontmatter em {spec_path}.")

    yaml_text = parts[1]
    body_md = parts[2].strip()

    data = yaml.safe_load(yaml_text)
    data['_documentation'] = body_md
    return data

def get_terrain_height(x, z, h_cfg, arena_r):
    seed = h_cfg.get('seed', 4242)
    flat_center = h_cfg.get('flat_center_radius', 20.0)
    dune_freq = h_cfg.get('dune_frequency', 0.035)
    dune_amp = h_cfg.get('dune_amplitude', 1.8)
    mtn_start = h_cfg.get('mountain_start_radius', 70.0)
    mtn_max = h_cfg.get('mountain_max_height', 14.0)

    dist = math.hypot(x, z)

    # 1. Ondulações suaves de dunas no deserto (Perlin-like multicamadas)
    w1 = math.sin(x * dune_freq + seed * 0.01) * math.cos(z * dune_freq * 0.85 + 1.2) * dune_amp
    w2 = math.sin((x + z) * (dune_freq * 0.45) + 2.5) * (dune_amp * 0.6)
    w3 = math.cos((x * 0.7 - z) * (dune_freq * 0.9) + seed * 0.02) * (dune_amp * 0.35)
    dune_height = w1 + w2 + w3

    # Atenuação no centro exato para combate fluido inicial
    if dist < flat_center:
        center_factor = dist / flat_center
        dune_height *= (center_factor * center_factor)

    # 2. Penhascos e montanhas de quartzo nas bordas para delimitar a arena
    mountain_height = 0.0
    if dist > mtn_start:
        mtn_factor = min(1.0, (dist - mtn_start) / max(1.0, arena_r - mtn_start + 12.0))
        # Curva exponencial para subida íngreme de penhasco
        ridge = math.sin(x * 0.08) * math.cos(z * 0.08) * 2.2
        mountain_height = (mtn_factor ** 2.2) * mtn_max + max(0, ridge * mtn_factor)

    return round(dune_height + mountain_height, 3)

def generate_map(spec_path, output_dir=None):
    spec = parse_markdown_spec(spec_path)
    map_id = spec['id']
    world_cfg = spec['world']
    h_cfg = spec['heightmap']
    arena_r = world_cfg.get('arena_radius', 88.0)
    world_w, world_d = world_cfg['size']
    res = world_cfg.get('resolution', 64)

    print(f"\n=======================================================")
    print(f"🗺️  GERADOR DE MAPAS BLEACH: {spec['title']} ({map_id})")
    print(f"=======================================================")
    print(f"Dimensões: {world_w}m x {world_d}m | Resolução da Malha: {res}x{res}")
    print(f"Raio da Arena: {arena_r}m | Algoritmo: {h_cfg.get('algorithm')}")

    # 1. Gerar Grid de Alturas do Terreno (Heightmap)
    verts_x = res + 1
    verts_z = res + 1
    step_x = world_w / res
    step_z = world_d / res
    half_w = world_w / 2.0
    half_d = world_d / 2.0

    heights_grid = []
    min_h = 999.0
    max_h = -999.0

    for j in range(verts_z):
        row = []
        z = -half_d + j * step_z
        for i in range(verts_x):
            x = -half_w + i * step_x
            h = get_terrain_height(x, z, h_cfg, arena_r)
            row.append(h)
            if h < min_h: min_h = h
            if h > max_h: max_h = h
        heights_grid.append(row)

    print(f"Relevo gerado: Altura Mínima = {min_h:.2f}m | Altura Máxima = {max_h:.2f}m")

    # 2. Scatter de Props com semente determinística
    rng = random.Random(h_cfg.get('seed', 4242))
    placed_props = []
    placed_positions = []

    props_cfg = spec.get('props', [])
    for p_def in props_cfg:
        density = p_def.get('density', 10)
        min_r = p_def.get('min_radius', 18.0)
        max_r = p_def.get('max_radius', arena_r - 4.0)
        col_r = p_def.get('collider_radius', 1.0)
        p_w = p_def.get('width', 3.0)
        p_h = p_def.get('height', 4.0)

        placed_for_type = 0
        attempts = 0
        while placed_for_type < density and attempts < density * 30:
            attempts += 1
            angle = rng.uniform(0, math.pi * 2)
            dist = rng.uniform(min_r, max_r)
            px = math.cos(angle) * dist
            pz = math.sin(angle) * dist

            # Evita sobreposição com props já existentes
            too_close = False
            for ox, oz, orad in placed_positions:
                if math.hypot(px - ox, pz - oz) < (col_r + orad + 4.5):
                    too_close = True
                    break
            if too_close:
                continue

            py = get_terrain_height(px, pz, h_cfg, arena_r)

            # Variação sutil de escala (0.9x a 1.15x)
            scale_var = rng.uniform(0.92, 1.15)

            placed_props.append({
                'id': f"{p_def['id']}_{placed_for_type}",
                'type': p_def['type'],
                'name': p_def['name'],
                'texture': p_def['file'],
                'x': round(px, 2),
                'y': round(py, 2),
                'z': round(pz, 2),
                'width': round(p_w * scale_var, 2),
                'height': round(p_h * scale_var, 2),
                'colliderRadius': round(col_r * scale_var, 2)
            })
            placed_positions.append((px, pz, col_r))
            placed_for_type += 1

    print(f"Props instanciados no relevo: {len(placed_props)} elementos canônicos.")

    # 3. Compilar Estrutura do Mapa
    map_data = {
        'id': map_id,
        'title': spec['title'],
        'bioma': spec['bioma'],
        'version': spec.get('version', '1.0.0'),
        'world': world_cfg,
        'heightmap': {
            'minHeight': min_h,
            'maxHeight': max_h,
            'gridWidth': verts_x,
            'gridDepth': verts_z,
            'stepX': round(step_x, 3),
            'stepZ': round(step_z, 3),
            'heights': heights_grid
        },
        'textures': spec.get('textures', {}),
        'atmosphere': spec.get('atmosphere', {}),
        'spawns': spec.get('spawns', {}),
        'props': placed_props
    }

    # 4. Salvar map_data.json
    base_proj = Path(__file__).resolve().parent.parent
    map_assets_dir = base_proj / f"src/assets/maps/{map_id}"
    map_assets_dir.mkdir(parents=True, exist_ok=True)
    json_path = map_assets_dir / "map_data.json"

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(map_data, f, indent=2, ensure_ascii=False)
    print(f"Salvo dados JSON do mapa: {json_path}")

    # 5. Gerar Módulo ES6 `src/maps/<map_id>.js`
    js_module_path = base_proj / f"src/maps/{map_id}.js"
    generate_js_module(map_data, js_module_path)
    print(f"Salvo módulo Three.js ES6: {js_module_path}")

    return map_data

def generate_js_module(map_data, output_path):
    map_id = map_data['id']
    pascal_name = "".join(word.capitalize() for word in map_id.split("_"))

    js_code = f"""// =======================================================================
// MAPA 3D AUTO-GERADO VIA DIRETRIZES DE IA: {map_data['title']}
// Bioma: {map_data['bioma']} · Relevo Procedural com Heightmap & Props
// =======================================================================
import * as THREE from 'three';
import mapData from '../assets/maps/{map_id}/map_data.json';

export const MAP_CONFIG = {{
  id: mapData.id,
  title: mapData.title,
  bioma: mapData.bioma,
  worldSize: mapData.world.size,
  arenaRadius: mapData.world.arena_radius,
  atmosphere: mapData.atmosphere,
  spawns: mapData.spawns
}};

const HEIGHTS = mapData.heightmap.heights;
const GRID_W = mapData.heightmap.gridWidth;
const GRID_D = mapData.heightmap.gridDepth;
const STEP_X = mapData.heightmap.stepX;
const STEP_Z = mapData.heightmap.stepZ;
const HALF_W = mapData.world.size[0] / 2.0;
const HALF_D = mapData.world.size[1] / 2.0;

export const PROPS_INSTANCES = mapData.props;

export function getTerrainHeight(x, z) {{
  const gx = (x + HALF_W) / STEP_X;
  const gz = (z + HALF_D) / STEP_Z;
  if (gx <= 0 || gx >= GRID_W - 1 || gz <= 0 || gz >= GRID_D - 1) return 0.0;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;
  const top = HEIGHTS[iz][ix] * (1 - fx) + HEIGHTS[iz][ix + 1] * fx;
  const bottom = HEIGHTS[iz + 1][ix] * (1 - fx) + HEIGHTS[iz + 1][ix + 1] * fx;
  return top * (1 - fz) + bottom * fz;
}}

function applyHeightGrid(pos) {{
  let idx = 0;
  for (let j = 0; j < GRID_D; j++) {{
    for (let i = 0; i < GRID_W; i++) pos.setY(idx++, HEIGHTS[j][i]);
  }}
}}

function createGroundMesh(loader) {{
  const tex = loader.load(mapData.textures.ground || '/src/assets/maps/hueco_mundo/ground_sand.png');
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  const rep = mapData.textures.ground_repeat || [32, 32];
  tex.repeat.set(rep[0], rep[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(mapData.world.size[0], mapData.world.size[1], GRID_W - 1, GRID_D - 1);
  geo.rotateX(-Math.PI / 2);
  applyHeightGrid(geo.attributes.position);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({{ map: tex, roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide }});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}}

function createBleachMoon(atmos) {{
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = atmos.moon_color || '#f0f8ff'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(172, 104, 82, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({{ map: tex, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false }});
  const size = atmos.moon_size || 46.0;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.name = 'bleach_moon';
  mesh.position.fromArray(atmos.moon_pos || [0, 38, -175]);
  mesh.lookAt(0, 12, 0);
  return mesh;
}}

function createStarfield() {{
  const count = 550;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {{
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85 + 0.15);
    const r = 320.0;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }}
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({{ color: 0xd8e8ff, size: 1.8, transparent: true, opacity: 0.85 }});
  return new THREE.Points(geo, mat);
}}

function createAtmosphere(scene, group) {{
  const atmos = mapData.atmosphere;
  scene.background = new THREE.Color(atmos.sky_color || 0x070b14);
  scene.fog = new THREE.Fog(atmos.fog_color || 0x0a0f1d, atmos.fog_near || 80, atmos.fog_far || 240);
  group.add(new THREE.AmbientLight(atmos.ambient_light || 0x9cb4d8, atmos.ambient_intensity || 0.85));
  const dir = new THREE.DirectionalLight(atmos.directional_light || 0xe2ecff, atmos.directional_intensity || 1.15);
  dir.position.fromArray(atmos.directional_pos || [70, 110, -60]);
  group.add(dir);
  if (atmos.has_stars) group.add(createStarfield());
  if (atmos.has_moon) group.add(createBleachMoon(atmos));
}}

function createPropNode(loader, p, cache, sGeo, sMat) {{
  if (!cache[p.texture]) {{
    cache[p.texture] = loader.load(p.texture);
    cache[p.texture].colorSpace = THREE.SRGBColorSpace;
  }}
  const mat = new THREE.MeshStandardMaterial({{ map: cache[p.texture], transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }});
  const geo = new THREE.PlaneGeometry(p.width, p.height);
  geo.translate(0, p.height / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(p.x, p.y, p.z);
  const shadow = new THREE.Mesh(sGeo, sMat);
  shadow.scale.set(p.colliderRadius * 1.5, p.colliderRadius * 1.5, 1.0);
  shadow.position.set(p.x, p.y + 0.03, p.z);
  return {{ mesh, shadow }};
}}

function buildPropsGroup(loader) {{
  const group = new THREE.Group();
  group.name = '{map_id}_props';
  const sGeo = new THREE.CircleGeometry(1.0, 16);
  sGeo.rotateX(-Math.PI / 2);
  const sMat = new THREE.MeshBasicMaterial({{ color: 0x000000, transparent: true, opacity: 0.4 }});
  const cache = {{}};
  for (const p of PROPS_INSTANCES) {{
    const {{ mesh, shadow }} = createPropNode(loader, p, cache, sGeo, sMat);
    group.add(shadow);
    group.add(mesh);
  }}
  return group;
}}

export function create{pascal_name}Map(scene, textureLoader) {{
  const mapGroup = new THREE.Group();
  mapGroup.name = 'map_{map_id}';
  const terrainMesh = createGroundMesh(textureLoader);
  mapGroup.add(terrainMesh);
  createAtmosphere(scene, mapGroup);
  const propGroup = buildPropsGroup(textureLoader);
  mapGroup.add(propGroup);
  scene.add(mapGroup);
  return {{
    mapGroup,
    terrainMesh,
    propGroup,
    getTerrainHeight,
    arenaRadius: mapData.world.arena_radius,
    colliders: PROPS_INSTANCES.map(p => ({{ x: p.x, z: p.z, radius: p.colliderRadius }}))
  }};
}}

export function clampPlayerToMap(player, colliders, arenaRadius) {{
  const dist = Math.hypot(player.x, player.z);
  if (dist > arenaRadius - 2.0) {{
    const angle = Math.atan2(player.z, player.x);
    player.x = Math.cos(angle) * (arenaRadius - 2.0);
    player.z = Math.sin(angle) * (arenaRadius - 2.0);
  }}
  if (!colliders) return;
  for (const col of colliders) {{
    const dx = player.x - col.x;
    const dz = player.z - col.z;
    const d = Math.hypot(dx, dz);
    const minD = col.radius + 0.65;
    if (d < minD && d > 0.01) {{
      player.x = col.x + (dx / d) * minD;
      player.z = col.z + (dz / d) * minD;
    }}
  }}
}}

export function updateMapPropsBillboard(propGroup, camera) {{
  if (!propGroup) return;
  for (const child of propGroup.children) {{
    if (child.isMesh && child.geometry.type === 'PlaneGeometry') {{
      child.quaternion.copy(camera.quaternion);
    }}
  }}
}}
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_code)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Gerador de Mapas de Bleach comandado por IA via diretrizes .md")
    parser.add_argument('--spec', default='geradores/map_specs/hueco_mundo.md', help="Caminho do arquivo markdown de especificação do mapa")
    args = parser.parse_args()

    spec_file = Path(args.spec)
    if not spec_file.is_absolute():
        spec_file = Path(__file__).resolve().parent.parent / args.spec

    generate_map(spec_file)
