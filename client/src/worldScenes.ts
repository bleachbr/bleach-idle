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

function images(map: WorldScene) {
  return new Set([map.ground, ...map.props.map((prop) => prop.image)]);
}

export function missingWorldSceneTextures(scene: Phaser.Scene, id?: string): string[] {
  const maps = id ? [scenes[id]] : Object.values(scenes);
  const required = new Set(maps.flatMap((map) => map ? [...images(map)] : []));
  return [...required].filter((image) => !scene.textures.exists(textureKey(image)));
}

/** Não libera navegação por prédios invisíveis quando um download falha. */
export function showWorldSceneLoadFailure() {
  const loader = document.getElementById("game-loading");
  if (!loader) return;
  loader.classList.remove("ready");
  loader.querySelector(".game-spinner")?.remove();
  const message = document.createElement("p");
  message.textContent = "Não foi possível carregar o cenário. Confira sua conexão e tente novamente.";
  message.setAttribute("role", "alert");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Tentar novamente";
  retry.onclick = () => location.reload();
  loader.replaceChildren(message, retry);
}

export function worldScenePortalAt(id: string | undefined, wx: number, wy: number): boolean {
  const map = id ? scenes[id] : undefined;
  return !!map?.props.some((prop) => /\/(senkaimon|garganta)\.webp$/.test(prop.image)
    && wx >= prop.x-prop.width/2 && wx <= prop.x+prop.width/2
    && wy >= prop.y-prop.height && wy <= prop.y);
}

/** Mesma composição do mundo, reduzida para um pixel por célula; sem a camada de colisão. */
export function drawWorldSceneMinimap(scene: Phaser.Scene, id: string, canvas: HTMLCanvasElement): boolean {
  const map = scenes[id];
  if (!map || missingWorldSceneTextures(scene, id).length) return false;
  const ctx = canvas.getContext("2d")!;
  const source = (image: string) => scene.textures.get(textureKey(image)).getSourceImage() as CanvasImageSource;
  const kx = canvas.width/map.width, ky = canvas.height/map.height;
  ctx.drawImage(source(map.ground), 0, 0, canvas.width, canvas.height);
  for (const prop of [...map.props].sort((a, b) => a.sortY-b.sortY))
    ctx.drawImage(source(prop.image), (prop.x-prop.width/2)*kx, (prop.y-prop.height)*ky, prop.width*kx, prop.height*ky);
  return true;
}

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
  if (!map || missingWorldSceneTextures(scene, id).length) return undefined;
  const objects: Phaser.GameObjects.GameObject[] = [
    scene.add.image(0, 0, textureKey(map.ground)).setOrigin(0).setDisplaySize(map.width, map.height).setDepth(-10),
  ];
  for (const prop of map.props) {
    objects.push(scene.add.image(prop.x, prop.y, textureKey(prop.image))
      .setOrigin(.5, 1).setDisplaySize(prop.width, prop.height).setDepth(prop.sortY));
  }
  return objects;
}
