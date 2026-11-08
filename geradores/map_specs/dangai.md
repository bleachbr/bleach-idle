---
id: dangai
title: Mundo do Precipício (Dangai)
bioma: dangai
version: 1.0.0
description: >
  Dimensão intermediária e corredor isolado de tempo-espaço entre a Soul Society e o Mundo dos Vivos.
  O solo é banhado pela densa corrente do Kōryū que retém a Reiatsu. Aqui Rukia Kuchiki aguarda
  o Shinigami para fornecer o briefing tático da invasão Hollow no Hueco Mundo.

world:
  size: [120.0, 120.0]
  arena_radius: 46.0
  resolution: 64

heightmap:
  algorithm: dunes_and_mountains
  seed: 9811
  flat_center_radius: 22.0
  dune_frequency: 0.04
  dune_amplitude: 0.6
  mountain_start_radius: 36.0
  mountain_max_height: 16.0

textures:
  ground: /src/assets/maps/dangai/ground_dangai.png
  ground_repeat: [16, 16]
  cliff_color: "#180a26"

atmosphere:
  sky_color: "#0a0512"
  fog_color: "#120a1f"
  fog_near: 20.0
  fog_far: 65.0
  ambient_light: "#8260a8"
  ambient_intensity: 0.95
  directional_light: "#d4b8ff"
  directional_intensity: 1.05
  directional_pos: [20, 45, -25]
  has_moon: false

props:
  - id: prop_dg_0
    name: Pilar Espiritual do Dangai
    type: dangai_pillar
    file: /src/assets/maps/dangai/props/prop_dg_0.png
    width: 3.2
    height: 5.6
    collider_radius: 0.9
    density: 8
    min_radius: 12.0
    max_radius: 42.0

  - id: prop_dg_1
    name: Monolito de Tempo-Espaço
    type: dangai_monolith
    file: /src/assets/maps/dangai/props/prop_dg_1.png
    width: 2.6
    height: 5.2
    collider_radius: 0.8
    density: 7
    min_radius: 14.0
    max_radius: 40.0

  - id: prop_dg_2
    name: Formação Rochosa de Kōryū
    type: dangai_rock
    file: /src/assets/maps/dangai/props/prop_dg_2.png
    width: 4.2
    height: 4.2
    collider_radius: 1.2
    density: 6
    min_radius: 16.0
    max_radius: 41.0

  - id: prop_dg_3
    name: Portal Dimensional Ancestral
    type: dangai_portal
    file: /src/assets/maps/dangai/props/prop_dg_3.png
    width: 5.4
    height: 5.0
    collider_radius: 1.5
    density: 4
    min_radius: 20.0
    max_radius: 38.0

  - id: prop_dg_4
    name: Estrutura do Precipício
    type: dangai_structure
    file: /src/assets/maps/dangai/props/prop_dg_4.png
    width: 5.0
    height: 4.5
    collider_radius: 1.4
    density: 5
    min_radius: 18.0
    max_radius: 42.0

  - id: prop_dg_5
    name: Agulha Temporal do Dangai
    type: dangai_needle
    file: /src/assets/maps/dangai/props/prop_dg_5.png
    width: 3.8
    height: 4.5
    collider_radius: 1.0
    density: 6
    min_radius: 15.0
    max_radius: 41.0

spawns:
  player: [0.0, 0.0]
  rukia: [0.0, -3.2]
---

# Diretriz de Geração de Mapa: Mundo do Precipício (Dangai)

## Contexto Narrativo
O **Dangai** serve como corredor de passagem dimensional. É aqui que o jogador é recepcionado pela Tenente Rukia Kuchiki
antes de cruzar o Senkaimon para o Hueco Mundo. A arena é contida por paredes abissais de Kōryū para evitar dispersão.
