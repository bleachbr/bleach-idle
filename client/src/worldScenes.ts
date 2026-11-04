// Apresentação contínua. Colisão, spawns e interações continuam no Tiled/servidor.
import type Phaser from "phaser";
import sceneData from "./worldSceneData.json";

interface SceneProp {
  id: string;
  kind: string;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sortY: number;
}

interface WorldScene {
  width: number;
  height: number;
  ground: string;
  props: SceneProp[];
}

const scenes: Readonly<Partial<Record<string, WorldScene>>> = sceneData;
const textureKey = (image: string) => `world-scene:${image}`;

export function preloadWorldScenes(scene: Phaser.Scene, version: number) {
  const images = new Set<string>();
  for (const map of Object.values(scenes)) {
    if (!map) continue;
    images.add(map.ground);
    for (const prop of map.props) images.add(prop.image);
  }
  for (const image of images) scene.load.image(textureKey(image), `${image}?v=${version}`);
}

/** Objetos completos compartilham a profundidade dos pés dos personagens. */
export function drawWorldScene(scene: Phaser.Scene, id: string): Phaser.GameObjects.GameObject[] | undefined {
  const map = scenes[id];
  if (!map) return undefined;
  const objects: Phaser.GameObjects.GameObject[] = [
    scene.add.image(0, 0, textureKey(map.ground)).setOrigin(0).setDisplaySize(map.width, map.height).setDepth(-10),
  ];
  for (const prop of map.props) {
    objects.push(scene.add.image(prop.x, prop.y, textureKey(prop.image))
      .setOrigin(.5, 1).setDisplaySize(prop.width, prop.height).setDepth(prop.sortY));
  }
  return objects;
}
