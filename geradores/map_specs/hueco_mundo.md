---
id: hueco_mundo
title: Deserto Infinito do Hueco Mundo
bioma: hueco_mundo
version: 1.0.0
description: >
  Dimensão desértica eterna onde habitam os Hollows e Arrancars sob noite perpétua e luar frio.
  O solo é composto por areia de quartzo branco fosco, esculpido em suaves dunas centrais e
  penhascos montanhosos nas bordas que delimitam a arena natural de combate. Props incluem
  árvores de quartzo petrificadas, obeliscos ancestrais e colunas monumentais das ruínas de Las Noches.

world:
  size: [440.0, 440.0]
  arena_radius: 176.0
  resolution: 96

heightmap:
  algorithm: dunes_and_mountains
  seed: 4242
  flat_center_radius: 28.0
  dune_frequency: 0.022
  dune_amplitude: 2.8
  mountain_start_radius: 140.0
  mountain_max_height: 22.0

textures:
  ground: /src/assets/maps/hueco_mundo/ground_sand.png
  ground_repeat: [64, 64]
  cliff_color: "#182030"

atmosphere:
  sky_color: "#070b14"
  fog_color: "#0a0f1d"
  fog_near: 80.0
  fog_far: 240.0
  ambient_light: "#9cb4d8"
  ambient_intensity: 0.85
  directional_light: "#e2ecff"
  directional_intensity: 1.15
  directional_pos: [70, 110, -60]
  has_moon: true
  has_stars: true
  moon_color: "#f0f6ff"
  moon_pos: [0, 38, -175]
  moon_size: 46.0

props:
  - id: prop_hm_0
    name: Árvore Maior de Quartzo Petrificada
    type: tree_quartz
    file: /src/assets/maps/hueco_mundo/props/prop_hm_0.png
    width: 4.8
    height: 6.7
    collider_radius: 1.1
    density: 32
    min_radius: 28.0
    max_radius: 168.0

  - id: prop_hm_1
    name: Rochedo Duplo de Quartzo
    type: rock_quartz
    file: /src/assets/maps/hueco_mundo/props/prop_hm_1.png
    width: 4.6
    height: 3.8
    collider_radius: 1.3
    density: 28
    min_radius: 24.0
    max_radius: 166.0

  - id: prop_hm_2
    name: Obelisco de Quartzo Partido
    type: obelisk
    file: /src/assets/maps/hueco_mundo/props/prop_hm_2.png
    width: 3.2
    height: 4.9
    collider_radius: 0.9
    density: 24
    min_radius: 30.0
    max_radius: 168.0

  - id: prop_hm_3
    name: Formação Rochosa de Areia Branca
    type: rock_quartz
    file: /src/assets/maps/hueco_mundo/props/prop_hm_3.png
    width: 3.8
    height: 3.5
    collider_radius: 1.0
    density: 24
    min_radius: 26.0
    max_radius: 165.0

  - id: prop_hm_4
    name: Pilar Agulha de Quartzo
    type: obelisk
    file: /src/assets/maps/hueco_mundo/props/prop_hm_4.png
    width: 2.2
    height: 5.8
    collider_radius: 0.7
    density: 30
    min_radius: 32.0
    max_radius: 170.0

  - id: prop_ln_0
    name: Portal Arqueado de Las Noches
    type: ruin_las_noches
    file: /src/assets/maps/hueco_mundo/props/prop_ln_0.png
    width: 5.2
    height: 5.5
    collider_radius: 1.5
    density: 16
    min_radius: 36.0
    max_radius: 162.0

  - id: prop_ln_1
    name: Coluna Imperial de Las Noches
    type: ruin_las_noches
    file: /src/assets/maps/hueco_mundo/props/prop_ln_1.png
    width: 4.0
    height: 5.0
    collider_radius: 1.1
    density: 24
    min_radius: 34.0
    max_radius: 168.0

  - id: prop_ln_2
    name: Muro em Ruínas de Palácio
    type: ruin_las_noches
    file: /src/assets/maps/hueco_mundo/props/prop_ln_2.png
    width: 4.8
    height: 4.7
    collider_radius: 1.3
    density: 18
    min_radius: 38.0
    max_radius: 165.0

spawns:
  player: [0.0, 0.0]
  hollow_min_dist: 22.0
  hollow_max_dist: 55.0
  boss_dist: 45.0
---

# Diretriz de Geração de Mapa: Deserto Infinito do Hueco Mundo

## Filosofia de Design e Cenário
O **Hueco Mundo** é o habitat natural dos Hollows e o principal palco dos conflitos de sobrevivência em Bleach.
Para substituir a arena de Karakura Town na Versão 1, este mapa reproduz:
1. **Relevo 3D de Dunas Vivas:** O solo não é um plano reto, mas possui elevações suaves ($\pm 1.5\text{m}$) que afetam a física de caminhada e visibilidade dos projéteis.
2. **Penhascos Naturais de Quartzo:** Em vez de barreiras invisíveis artificiais, dunas altas e formações rochosas íngremes sobem nas bordas ($8\text{m}$ a $14\text{m}$), confinando o combate de maneira orgânica.
3. **Props do Cânone:** Árvores petrificadas de quartzo branco e colunatas caídas de Las Noches espalhadas com distância regulada para permitir que o jogador manobre a horda.
4. **Iluminação Fria de Luar Perpétuo:** Atmosfera azulada e escura com a lua do Hueco Mundo suspensa no firmamento.
