// =======================================================================
// TEXTURAS DE CAMINHADA (walk8) DOS MONSTROS APROVADOS EM src/assets/monsters
// Preenche o mapa de texturas recebido com <alias>_<direção>[_<quadro>].
// =======================================================================
import * as THREE from 'three';

const MONSTERS = [
  { id: 'fishbone', alias: 'fishbone', dirCount: 8 },
  { id: 'shrieker', alias: 'shrieker', dirCount: 8 },
  { id: 'acidwire', alias: 'acidwire', dirCount: 8 },
  { id: 'elite', alias: 'elite', dirCount: 8 },
  { id: 'menos_grande', alias: 'menos', dirCount: 8 }
];

function loadPixelTexture(loader, url) {
  const tex = loader.load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadMonsterDirFrames(loader, textures, m, d) {
  const tex = loadPixelTexture(loader, `/src/assets/monsters/${m.id}/${d}.png`);
  textures[`${m.alias}_${d}`] = tex;
  textures[`${m.id}_${d}`] = tex;
  for (let f = 0; f < m.dirCount; f++) {
    const fTex = loadPixelTexture(loader, `/src/assets/monsters/${m.id}/${d}_${f}.png`);
    textures[`${m.alias}_${d}_${f}`] = fTex;
    textures[`${m.id}_${d}_${f}`] = fTex;
  }
}

export function loadMonsterTextures(loader, textures) {
  for (const m of MONSTERS) {
    for (const d of ['front', 'side_l', 'side', 'back']) loadMonsterDirFrames(loader, textures, m, d);
    textures[m.alias] = textures[`${m.alias}_front`];
    textures[m.id] = textures[`${m.alias}_front`];
  }
}
