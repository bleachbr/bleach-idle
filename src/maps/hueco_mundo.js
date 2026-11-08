// =======================================================================
// MAPA 3D AUTO-GERADO VIA DIRETRIZES DE IA: Deserto Infinito do Hueco Mundo
// Bioma: hueco_mundo · Relevo Procedural com Heightmap & Props
// =======================================================================
import * as THREE from 'three';
import mapData from '../assets/maps/hueco_mundo/map_data.json';

export const MAP_CONFIG = {
  id: mapData.id,
  title: mapData.title,
  bioma: mapData.bioma,
  worldSize: mapData.world.size,
  arenaRadius: mapData.world.arena_radius,
  atmosphere: mapData.atmosphere,
  spawns: mapData.spawns
};

const HEIGHTS = mapData.heightmap.heights;
const GRID_W = mapData.heightmap.gridWidth;
const GRID_D = mapData.heightmap.gridDepth;
const STEP_X = mapData.heightmap.stepX;
const STEP_Z = mapData.heightmap.stepZ;
const HALF_W = mapData.world.size[0] / 2.0;
const HALF_D = mapData.world.size[1] / 2.0;

export const PROPS_INSTANCES = mapData.props;

export function getTerrainHeight(x, z) {
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
}

function applyHeightGrid(pos) {
  let idx = 0;
  for (let j = 0; j < GRID_D; j++) {
    for (let i = 0; i < GRID_W; i++) pos.setY(idx++, HEIGHTS[j][i]);
  }
}

function createGroundMesh(loader) {
  const tex = loader.load(mapData.textures.ground || '/src/assets/maps/hueco_mundo/ground_sand.png');
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  const rep = mapData.textures.ground_repeat || [32, 32];
  tex.repeat.set(rep[0], rep[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(mapData.world.size[0], mapData.world.size[1], GRID_W - 1, GRID_D - 1);
  geo.rotateX(-Math.PI / 2);
  applyHeightGrid(geo.attributes.position);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function createBleachMoon(atmos) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = atmos.moon_color || '#f0f8ff'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(172, 104, 82, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(atmos.moon_size || 34.0, atmos.moon_size || 34.0), mat);
  mesh.position.fromArray(atmos.moon_pos || [110, 180, -210]);
  mesh.lookAt(0, 0, 0);
  return mesh;
}

function createStarfield() {
  const count = 550;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85 + 0.15);
    const r = 320.0;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xd8e8ff, size: 1.8, transparent: true, opacity: 0.85 });
  return new THREE.Points(geo, mat);
}

function createAtmosphere(scene, group) {
  const atmos = mapData.atmosphere;
  scene.background = new THREE.Color(atmos.sky_color || 0x070b14);
  scene.fog = new THREE.Fog(atmos.fog_color || 0x0a0f1d, atmos.fog_near || 80, atmos.fog_far || 240);
  group.add(new THREE.AmbientLight(atmos.ambient_light || 0x9cb4d8, atmos.ambient_intensity || 0.85));
  const dir = new THREE.DirectionalLight(atmos.directional_light || 0xe2ecff, atmos.directional_intensity || 1.15);
  dir.position.fromArray(atmos.directional_pos || [70, 110, -60]);
  group.add(dir);
  if (atmos.has_stars) group.add(createStarfield());
  if (atmos.has_moon) group.add(createBleachMoon(atmos));
}

function createPropNode(loader, p, cache, sGeo, sMat) {
  if (!cache[p.texture]) {
    cache[p.texture] = loader.load(p.texture);
    cache[p.texture].colorSpace = THREE.SRGBColorSpace;
  }
  const mat = new THREE.MeshStandardMaterial({ map: cache[p.texture], transparent: true, alphaTest: 0.05, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(p.width, p.height);
  geo.translate(0, p.height / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(p.x, p.y, p.z);
  const shadow = new THREE.Mesh(sGeo, sMat);
  shadow.scale.set(p.colliderRadius * 1.5, p.colliderRadius * 1.5, 1.0);
  shadow.position.set(p.x, p.y + 0.03, p.z);
  return { mesh, shadow };
}

function buildPropsGroup(loader) {
  const group = new THREE.Group();
  group.name = 'hueco_mundo_props';
  const sGeo = new THREE.CircleGeometry(1.0, 16);
  sGeo.rotateX(-Math.PI / 2);
  const sMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 });
  const cache = {};
  for (const p of PROPS_INSTANCES) {
    const { mesh, shadow } = createPropNode(loader, p, cache, sGeo, sMat);
    group.add(shadow);
    group.add(mesh);
  }
  return group;
}

export function createHuecoMundoMap(scene, textureLoader) {
  const mapGroup = new THREE.Group();
  mapGroup.name = 'map_hueco_mundo';
  const terrainMesh = createGroundMesh(textureLoader);
  mapGroup.add(terrainMesh);
  createAtmosphere(scene, mapGroup);
  const propGroup = buildPropsGroup(textureLoader);
  mapGroup.add(propGroup);
  scene.add(mapGroup);
  return {
    mapGroup,
    terrainMesh,
    propGroup,
    getTerrainHeight,
    arenaRadius: mapData.world.arena_radius,
    colliders: PROPS_INSTANCES.map(p => ({ x: p.x, z: p.z, radius: p.colliderRadius }))
  };
}

export function clampPlayerToMap(player, colliders, arenaRadius) {
  const dist = Math.hypot(player.x, player.z);
  if (dist > arenaRadius - 2.0) {
    const angle = Math.atan2(player.z, player.x);
    player.x = Math.cos(angle) * (arenaRadius - 2.0);
    player.z = Math.sin(angle) * (arenaRadius - 2.0);
  }
  if (!colliders) return;
  for (const col of colliders) {
    const dx = player.x - col.x;
    const dz = player.z - col.z;
    const d = Math.hypot(dx, dz);
    const minD = col.radius + 0.65;
    if (d < minD && d > 0.01) {
      player.x = col.x + (dx / d) * minD;
      player.z = col.z + (dz / d) * minD;
    }
  }
}

export function updateMapPropsBillboard(propGroup, camera) {
  if (!propGroup) return;
  for (const child of propGroup.children) {
    if (child.isMesh && child.geometry.type === 'PlaneGeometry') {
      child.quaternion.copy(camera.quaternion);
    }
  }
}
