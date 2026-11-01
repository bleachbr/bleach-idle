// Cena principal: desenha o mapa, espelha o estado do servidor e envia intenções.
// Nada de simulação aqui: posições, dano e XP vêm todos do servidor.
import Phaser from "phaser";
import { sfx } from "./sfx";
import type { Room } from "colyseus.js";
import { TILE, TICK_MS, SPRITES, BOSSES, POWER_TIERS, powerTier, COSMETIC, titleText, CHARS, MONSTERS, MAP_IDS, HOME_MAP, SHOP_SPRITE, parseMap, spriteKey, type GameMap } from "../../shared/src";
import { serverNow } from "./clock";
import { parseStatusFlags, desiredTint, dotHitStyle, STATUS_LOOK } from "./statusFx";
import type { StatusKind } from "../../shared/src/combatStatus";

const VIEW_W = 15;
const VIEW_H = 11;
/** Modo HD: folhas sem pixelar (art/hd.py), HD_K vezes maiores, e a tela renderizada HD_K vezes maior */
const HD_K = 3;
const HD = "hd:";
const baseKey = (key: string) => (key.startsWith(HD) ? key.slice(HD.length) : key);

interface View {
  /** aura do título de Poder (chave: título + aura comprada) */
  tier?: string;
  /** cosméticos: título acima do nome e borboleta que acompanha */
  title?: Phaser.GameObjects.Text;
  titleId?: string;
  pet?: Phaser.GameObjects.Graphics;
  petId?: string;
  glow?: Phaser.GameObjects.Graphics;
  glowFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  id: string;
  c: Phaser.GameObjects.Container;
  spr: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
  sprite: string;
  dir: number;
  tx: number;
  ty: number;
  lastMoveAt: number;
  stepMs: number;
  isMonster: boolean;
  /** escala do sprite na arte de pixel (monstros grandes > 1) */
  baseScale: number;
  /** respirando parado (tween de escala) */
  idle?: Phaser.Tweens.Tween;
  /** aura do Bankai, atrás do sprite */
  aura?: Phaser.GameObjects.Sprite;
  /** status ativos vindos do servidor (M2-06) e os ícones acima da barra de vida */
  statusKinds: StatusKind[];
  statusIcons: Phaser.GameObjects.Graphics;
}

// efeitos (art/raw/62 a 64 -> art/fx.py): uma linha por efeito, 4 quadros
const FX = {
  combat: { cell: 64, rows: ["slash", "hit", "death", "level"] },
  skills: { cell: 64, rows: ["getsuga", "ice", "fang", "heal"] },
  aura: { cell: 96, rows: ["aura_ichigo", "aura_rukia", "aura_renji", "aura_blue"] },
  skills2: { cell: 64, rows: ["arrow", "arrowrain", "punch", "blast"] },
  mobs: { cell: 64, rows: ["claw", "bite", "acid", "cero"] },
  release: { cell: 96, rows: ["rel_ichigo", "rel_rukia", "rel_renji", "rel_blue"] },
} as const;
/** ataque de cada inimigo (o resto usa garra); cuspe e cero voam até o alvo */
const MOB_FX: Record<string, string> = {
  hollow_uivante: "bite", hollow_faminto: "bite", hollow_devorador: "bite", metastacia: "bite",
  hollow_acido: "acid",
  gillian: "cero", menos_anciao: "cero", arrancar: "cero", arrancar_numeros: "cero", privaron: "cero",
};
/** explosão da liberação (Bankai e afins) de cada personagem */
const RELEASE: Record<string, string> = { ichigo: "rel_ichigo", rukia: "rel_rukia", renji: "rel_renji", ishida: "rel_blue", sado: "rel_renji", hitsugaya: "rel_rukia", byakuya: "rel_rukia", kenpachi: "rel_renji",
  yoruichi: "rel_blue", ukitake: "rel_rukia", shunsui: "rel_renji" };
/** aura do Bankai (ou forma liberada) de cada personagem */
const AURA: Record<string, string> = { ichigo: "aura_ichigo", rukia: "aura_rukia", renji: "aura_renji", ishida: "aura_blue", sado: "aura_renji", hitsugaya: "aura_rukia", byakuya: "aura_rukia", kenpachi: "aura_renji",
  yoruichi: "aura_blue", ukitake: "aura_rukia", shunsui: "aura_renji" };
/** cor por cima dos efeitos que o personagem divide com outro (pétalas rosa do Byakuya, reiatsu amarelo do Kenpachi,
 * relâmpago da Yoruichi, flores do Shunsui) */
const CHAR_TINT: Record<string, number> = { byakuya: 0xffa8d0, kenpachi: 0xffd040, yoruichi: 0xfff0a0, shunsui: 0xff9fc4 };
/** habilidade de cada personagem: projétil que voa até o alvo, ou explosão no alvo */
const SKILL_FX: Record<string, { anim: string; fly: boolean }> = {
  ichigo: { anim: "getsuga", fly: true },
  rukia: { anim: "ice", fly: false },
  renji: { anim: "fang", fly: true },
  ishida: { anim: "arrow", fly: true },
  sado: { anim: "punch", fly: true },
  hitsugaya: { anim: "ice", fly: false },
  byakuya: { anim: "blast", fly: false },
  kenpachi: { anim: "slash", fly: false },
  yoruichi: { anim: "punch", fly: false },
  ukitake: { anim: "blast", fly: true },
  shunsui: { anim: "slash", fly: false },
};

/** O servidor anda em ticks de 100 ms: um passo de 260 ms acontece, na prática, a cada 300 ms.
 * O cliente usa esse ritmo real; com o valor nominal ele deslizava rápido e parava a cada passo. */
const realStep = (stepMs: number) => Math.ceil(stepMs / TICK_MS) * TICK_MS;

/** Partículas de ambiente de cada mapa (texturas desenhadas na hora, sem arquivo). */
const AMBIENT: Record<string, { tex: string; color: number[]; count: number; speedX: [number, number]; speedY: [number, number]; scale: [number, number]; alpha: [number, number]; life: number; blend?: boolean; spin?: boolean }> = {
  // vaga-lumes e folhas soltas
  karakura: { tex: "amb_dot", color: [0xfff3a0, 0xc8ff8a], count: 26, speedX: [-8, 8], speedY: [-10, -2], scale: [0.6, 1.2], alpha: [0.9, 0], life: 5000, blend: true },
  // pétalas de cerejeira caindo
  soul: { tex: "amb_petal", color: [0xffc0d8, 0xffe0ec, 0xff9fc4], count: 34, speedX: [10, 30], speedY: [18, 40], scale: [0.7, 1.2], alpha: [1, 0.2], life: 7000, spin: true },
  // areia branca ao vento
  hueco: { tex: "amb_dot", color: [0xe8ecf6, 0xc9d0e0], count: 44, speedX: [40, 90], speedY: [-6, 6], scale: [0.4, 0.9], alpha: [0.8, 0], life: 4000 },
  // reishi azul subindo no palácio
  lasnoches: { tex: "amb_dot", color: [0x9fd6ff, 0xdff2ff], count: 22, speedX: [-5, 5], speedY: [-20, -8], scale: [0.5, 1], alpha: [0.8, 0], life: 5000, blend: true },
  // fagulhas roxas do corredor entre mundos
  dangai: { tex: "amb_dot", color: [0xc08aff, 0x8a5cff, 0xffffff], count: 40, speedX: [-25, 25], speedY: [-25, 25], scale: [0.5, 1.1], alpha: [0.9, 0], life: 3500, blend: true },
  // cinzas da batalha caindo na cidade falsa
  falsa: { tex: "amb_dot", color: [0x9a8aa8, 0xd8c8e8, 0xff9a6a], count: 36, speedX: [-10, 10], speedY: [10, 30], scale: [0.4, 0.9], alpha: [0.9, 0], life: 6000 },
  // partículas de reishi azul sendo absorvidas (Auswählen)
  wandenreich: { tex: "amb_dot", color: [0x8ac8ff, 0xe8f4ff, 0x4a9aff], count: 40, speedX: [-6, 6], speedY: [-30, -12], scale: [0.4, 1], alpha: [0.9, 0], life: 4500, blend: true },
};

/** fonte pixel do jogo (carregada pelo @fontsource no main.ts) para nomes e números */
const PIXEL_FONT = '"Pixelify Sans", system-ui, sans-serif';

const px = (x: number) => x * TILE + TILE / 2;
const py = (y: number) => y * TILE + TILE;

export class GameScene extends Phaser.Scene {
  /** quadros de andar por direção (4 ou 8), pela largura da folha carregada: nunca diverge da imagem */
  private cols(key: string) {
    const img = this.textures.exists(key) ? (this.textures.get(key).getSourceImage() as HTMLImageElement) : undefined;
    const def = SPRITES[baseKey(key)];
    return img && def ? Math.max(1, Math.round(img.width / (def.frame * (key.startsWith(HD) ? HD_K : 1)))) : 4;
  }

  /** modo HD ligado e já carregado */
  private hd = false;

  /** chave da textura no modo atual: a HD quando existe, senão a de pixel */
  private texKey(key: string) {
    const b = baseKey(key);
    return this.hd && this.textures.exists(HD + b) ? HD + b : b;
  }

  /** Liga ou desliga o modo HD. Na primeira vez baixa as folhas (só quem liga paga o download). */
  setHd(on: boolean, done?: (ok: boolean) => void) {
    this.hdWanted = on;
    if (!on) return this.applyHd(false), done?.(true);
    // trajes (lazy) só entram quando já foram pedidos (a folha de pixel pode ainda estar baixando); os outros, todos
    const missing = Object.entries(SPRITES).filter(([k, d]) => !d.noHd && (!d.lazy || this.lazyAsked.has(k)) && !this.textures.exists(HD + k));
    if (!missing.length) return this.applyHd(true), done?.(true);
    for (const [key, def] of missing)
      this.load.spritesheet(HD + key, `/assets/sprites_hd/${key}.webp`, { frameWidth: def.frame * HD_K, frameHeight: def.frame * HD_K });
    // folha que não existe em HD (boneco de treino, variações de visual) só fica de fora
    this.load.on("loaderror", () => {});
    this.load.once("complete", () => {
      for (const [key] of missing) {
        const hk = HD + key;
        if (!this.textures.exists(hk)) continue;
        this.textures.get(hk).setFilter(Phaser.Textures.FilterMode.LINEAR);
        for (let d = 0; d < 4; d++)
          if (!this.anims.exists(`${hk}-${d}`)) // a folha HD de um traje pode ter chegado antes pelo loadLazy
            this.anims.create({ key: `${hk}-${d}`, frames: this.anims.generateFrameNumbers(hk, { start: d * this.cols(hk), end: d * this.cols(hk) + this.cols(hk) - 1 }), repeat: -1 });
      }
      // desligou o HD no meio do download: as folhas ficam guardadas, mas a tela continua em pixel
      if (this.hdWanted) this.applyHd(true);
      done?.(true);
    });
    this.load.start();
  }

  /** folhas lazy já pedidas (baixando, prontas ou com erro): cada uma só é pedida uma vez */
  private lazyAsked = new Set<string>();
  /** o jogador ligou o HD (as folhas HD podem ainda estar baixando; `hd` só vira true no fim) */
  private hdWanted = false;

  /** Baixa a folha de um traje (e a HD, com o modo HD ligado) e redesenha quem já está na tela. */
  private loadLazy(key: string) {
    if (this.lazyAsked.has(key)) return;
    this.lazyAsked.add(key);
    const def = SPRITES[key];
    this.load.spritesheet(key, `/assets/sprites/${key}.png`, { frameWidth: def.frame, frameHeight: def.frame });
    const keys = [key];
    if (this.hdWanted && !def.noHd) {
      keys.push(HD + key);
      this.load.spritesheet(HD + key, `/assets/sprites_hd/${key}.webp`, { frameWidth: def.frame * HD_K, frameHeight: def.frame * HD_K });
    }
    for (const k of keys)
      this.load.once(`filecomplete-spritesheet-${k}`, () => {
        if (k.startsWith(HD)) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
        for (let d = 0; d < 4; d++)
          if (!this.anims.exists(`${k}-${d}`))
            this.anims.create({ key: `${k}-${d}`, frames: this.anims.generateFrameNumbers(k, { start: d * this.cols(k), end: d * this.cols(k) + this.cols(k) - 1 }), repeat: -1 });
        this.room.state.players.forEach((p: any, id: string) => { const v = this.views.get(id); if (v) this.refreshLook(v, p); });
      });
    // sem a folha (erro no download) o personagem continua com a da forma base até recarregar a página
    this.load.start();
  }

  private applyHd(on: boolean) {
    this.hd = on;
    const k = on ? HD_K : 1;
    // a tela renderiza k vezes maior com zoom k: o mapa fica igual e os sprites HD aparecem com o detalhe original
    this.scale.setGameSize(VIEW_W * TILE * k, VIEW_H * TILE * k);
    this.cameras.main.setZoom(k);
    // a câmera pula direto para o personagem em vez de deslizar até ele
    const me = this.views.get(this.myId);
    if (me) this.cameras.main.centerOn(me.c.x, me.c.y);
    for (const v of this.views.values()) {
      const key = this.texKey(v.sprite);
      const idle = !!v.idle;
      this.setIdle(v, false);
      v.sprite = key;
      v.spr.anims.stop();
      v.spr.setTexture(key, this.stand(key, v.dir)).setScale(v.baseScale / (key.startsWith(HD) ? HD_K : 1));
      if (idle) this.setIdle(v, true);
    }
    this.startAmbient(this.mapId);
  }

  /** quadro parado de uma direção (o de passagem, com as pernas juntas) */
  private stand(key: string, dir: number) {
    const c = this.cols(key);
    return dir * c + (c === 8 ? 2 : 1);
  }

  private room!: Room<any>;
  private myId = "";
  private views = new Map<string, View>();
  private targetBox!: Phaser.GameObjects.Graphics;
  private held: number[] = []; // direções seguradas no teclado, a última vale
  private nextStepSend = 0;
  private onMe: (p: any) => void = () => {};
  private onPlayerClick: (id: string, x: number, y: number) => void = () => {};
  private bags = new Map<string, { img: Phaser.GameObjects.Image; map: string; x: number; y: number }>();
  /** sacola clicada de longe: abre quando o personagem chegar do lado */
  private pendingBag = "";
  private maps: Record<string, GameMap> = {};
  /** mapa desenhado agora (o do meu personagem) e o que pertence só a ele */
  private mapId = "";
  private mapObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("game");
  }

  init(data: { room: Room<any>; myId: string; onMe: (p: any) => void; onPlayerClick: (id: string, x: number, y: number) => void }) {
    this.room = data.room;
    this.myId = data.myId;
    this.onMe = data.onMe;
    this.onPlayerClick = data.onPlayerClick;
  }

  preload() {
    for (const [key, def] of Object.entries(SPRITES))
      if (!def.lazy) this.load.spritesheet(key, `/assets/sprites/${key}.png`, { frameWidth: def.frame, frameHeight: def.frame });
    this.load.image(SHOP_SPRITE, `/assets/sprites/${SHOP_SPRITE}.png`);
    this.load.spritesheet("items", "/assets/items.png", { frameWidth: 32, frameHeight: 32 });
    for (const [name, f] of Object.entries(FX)) this.load.spritesheet(`fx_${name}`, `/assets/fx/${name}.png`, { frameWidth: f.cell, frameHeight: f.cell });
    // mapas do Tiled: o tileset é embutido no .tmj e a imagem fica ao lado
    for (const id of MAP_IDS) {
      this.load.tilemapTiledJSON(`map_${id}`, `/maps/${id}.tmj`);
      this.load.image(`tiles_${id}`, `/maps/${id}_tiles.png`);
    }
  }

  create() {
    for (const id of MAP_IDS) this.maps[id] = parseMap(id, this.cache.tilemap.get(`map_${id}`).data);
    this.cameras.main.setRoundPixels(true);
    this.showMap(this.room.state.players.get(this.myId)?.map ?? HOME_MAP);

    for (const [name, f] of Object.entries(FX)) {
      if (!this.textures.exists(`fx_${name}`)) continue;
      f.rows.forEach((anim, row) => this.anims.create({
        key: `fx-${anim}`, frames: this.anims.generateFrameNumbers(`fx_${name}`, { start: row * 4, end: row * 4 + 3 }),
        frameRate: name === "aura" ? 8 : 14, repeat: name === "aura" ? -1 : 0,
      }));
    }
    for (const key of Object.keys(SPRITES).filter((k) => this.textures.exists(k)))
      for (let d = 0; d < 4; d++)
        this.anims.create({ key: `${key}-${d}`, frames: this.anims.generateFrameNumbers(key, { start: d * this.cols(key), end: d * this.cols(key) + this.cols(key) - 1 }), repeat: -1 });

    this.targetBox = this.add.graphics().setDepth(1e6);

    const s = this.room.state;
    s.players.onAdd((p: any, id: string) => this.addView(id, p, false));
    s.players.onRemove((_p: any, id: string) => this.removeView(id));
    s.monsters.onAdd((m: any, id: string) => this.addView(id, m, true));
    s.monsters.onRemove((_m: any, id: string) => this.removeView(id, true));
    // corpos (caveira) e sacolas (moedas) no chão
    s.bags.onAdd((b: any, id: string) => {
      const img = this.add.image(px(b.x), py(b.y) - 4, "items", b.kind === "corpo" ? 6 : 15).setOrigin(0.5, 1).setDepth(py(b.y) - 2);
      this.bags.set(id, { img, map: b.map, x: b.x, y: b.y });
    });
    s.bags.onRemove((_b: any, id: string) => { this.bags.get(id)?.img.destroy(); this.bags.delete(id); });

    this.room.onMessage("fx", (fx) => this.onFx(fx));
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => this.onClick(ptr));
    this.bindKeys();
  }

  // ---------- entidades ----------

  private spriteFor(e: any, isMonster: boolean): { key: string; tint?: number; scale: number; sprScale: number } {
    if (isMonster) {
      const def = MONSTERS[e.kind];
      return this.hdLook(def.sprite, def.tint, def.scale);
    }
    const form = CHARS[e.charId].forms[e.form];
    // visual do equipamento; sem a folha da combinação, tenta as partes ("haori_mask" -> "haori") e depois a base
    const look: string = e.look ?? "";
    // sem a folha do estágio (arte ainda não feita), usa a do estágio anterior
    const prev = CHARS[e.charId].forms.slice(0, e.form).reverse().map((f) => f.sprite);
    const looks = [look, ...look.split("_")].filter(Boolean).map((l) => spriteKey(form.sprite, l)).filter((k) => k !== form.sprite);
    for (const k of looks) if (SPRITES[k]?.lazy && !this.textures.exists(k)) this.loadLazy(k);
    const tries = [...looks, form.sprite, ...prev];
    return this.hdLook(tries.find((k) => this.textures.exists(k)) ?? form.sprite, form.tint, 1);
  }

  private hdLook(key: string, tint: number | undefined, scale: number) {
    const k = this.texKey(key);
    return { key: k, tint, scale, sprScale: scale / (k.startsWith(HD) ? HD_K : 1) };
  }

  private addView(id: string, e: any, isMonster: boolean) {
    const look = this.spriteFor(e, isMonster);
    const shadow = this.add.ellipse(0, -3, 22 * look.scale + 4, 8, 0x000000, 0.3);
    const spr = this.add.sprite(0, 0, look.key, this.stand(look.key, e.dir)).setOrigin(0.5, 1).setScale(look.sprScale);
    if (look.tint) spr.setTint(look.tint);
    const top = -spr.displayHeight + (isMonster ? 4 : 2);
    const name = isMonster ? MONSTERS[e.kind].name : e.guildTag ? `${e.name} [${e.guildTag}]` : e.name;
    const label = this.add.text(0, top - 12, name, {
      fontFamily: PIXEL_FONT, fontSize: "11px", color: isMonster ? "#ffb4a8" : "#ffffff",
      stroke: "#000000", strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5, 1);
    const bar = this.add.graphics();
    bar.y = top - 9;
    const statusIcons = this.add.graphics();
    // à direita da barra de vida: acima ficam o nome e o título cosmético
    statusIcons.y = top - 8;
    const c = this.add.container(px(e.x), py(e.y), [shadow, spr, bar, label, statusIcons]);
    const v: View = { id, c, spr, label, bar, sprite: look.key, dir: e.dir, tx: e.x, ty: e.y, lastMoveAt: 0, stepMs: e.stepMs, isMonster, baseScale: look.scale,
      statusKinds: [], statusIcons };
    this.views.set(id, v);
    c.setDepth(c.y);
    this.setIdle(v, true);
    // quem surge com o jogo já rodando (renascer, entrar no mundo) aparece com fumaça e esmaecer
    if (this.time.now > 2500 && e.map === this.mapId) {
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 450, ease: "Quad.easeOut" });
      this.playFx("death", c.x, c.y - spr.displayHeight / 3, { scale: 0.6 })?.setAlpha(0.6);
    }
    if (!isMonster) { this.setAura(v, e.form ? e.charId : undefined); this.setPowerAura(v, e.power ?? 0, e.cosAura); this.setCosmetics(v, e); }
    this.drawBar(v, e.hp, e.maxHp);
    this.setStatus(v, e.statusFlags);

    e.onChange(() => {
      v.stepMs = e.stepMs;
      if (e.x !== v.tx || e.y !== v.ty) this.moveView(v, e.x, e.y, e.dir);
      else if (e.dir !== v.dir && !v.spr.anims.isPlaying) { v.dir = e.dir; v.spr.setFrame(this.stand(v.sprite, e.dir)); }
      v.dir = e.dir;
      this.drawBar(v, e.hp, e.maxHp);
      this.setStatus(v, e.statusFlags);
      if (!isMonster) {
        this.refreshLook(v, e);
        v.label.setAlpha(e.online ? 1 : 0.55); // offline caçando aparece meio apagado
        this.setAura(v, e.form ? e.charId : undefined);
        this.setPowerAura(v, e.power ?? 0, e.cosAura);
        this.setCosmetics(v, e);
        if (id === this.myId) this.onMe(e);
      }
    });

    if (id === this.myId) {
      this.cameras.main.startFollow(c, true, 0.18, 0.18, 0, 0); // segue com leve amortecimento
      this.onMe(e);
    }
  }

  /** Troca a folha do jogador quando o visual muda (forma, equipamento, traje ou folha lazy que acabou de chegar). */
  private refreshLook(v: View, e: any) {
    const look = this.spriteFor(e, false);
    if (look.key !== v.sprite) {
      v.sprite = look.key;
      const idle = !!v.idle;
      this.setIdle(v, false);
      v.spr.setTexture(look.key, this.stand(look.key, e.dir)).setScale(look.sprScale);
      if (idle) this.setIdle(v, true);
    }
    // a cor separada da textura: com status ativo, a do status vale por cima da cor da forma.
    // Durante o clarão branco do golpe (tintFill) não mexe: o restoreTint dele volta a cor certa
    if (!v.spr.tintFill && desiredTint(v.statusKinds, look.tint) !== v.spr.tintTopLeft) {
      const tint = desiredTint(v.statusKinds, look.tint);
      if (tint !== 0xffffff) v.spr.setTint(tint); else v.spr.clearTint();
    }
  }

  private moveView(v: View, x: number, y: number, dir: number) {
    const far = Math.abs(x - v.tx) + Math.abs(y - v.ty) > 2; // teleporte (morte, login)
    v.tx = x;
    v.ty = y;
    v.lastMoveAt = this.time.now;
    if (far) {
      v.c.setPosition(px(x), py(y));
      if (v.id === this.myId) {
        // teleporte: a câmera pula junto, sem atravessar o mapa deslizando
        const cam = this.cameras.main;
        cam.setLerp(1, 1);
        this.time.delayedCall(60, () => cam.setLerp(0.18, 0.18));
      }
      return;
    }
    this.setIdle(v, false);
    if (this.textures.exists("amb_dust")) this.dust(v);
    const key = `${v.sprite}-${dir}`;
    // o ciclo inteiro (4 ou 8 quadros) dura 2 passos, no ritmo real do servidor
    if (v.spr.anims.currentAnim?.key !== key || !v.spr.anims.isPlaying)
      v.spr.anims.play({ key, frameRate: (this.cols(v.sprite) * 500) / realStep(v.stepMs), startFrame: v.spr.anims.isPlaying ? undefined : 0 });
  }

  /** Leva cada personagem até o tile do servidor em velocidade constante (um tile por passo real).
   * Se ficou para trás (pacote atrasado), acelera um pouco em vez de pular. */
  private glide(delta: number) {
    for (const v of this.views.values()) {
      const tx = px(v.tx), ty = py(v.ty);
      const dx = tx - v.c.x, dy = ty - v.c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.01) continue;
      let speed = TILE / realStep(v.stepMs);
      if (dist > TILE * 1.2) speed *= 1 + (dist - TILE) / TILE; // atrasado: alcança sem teleportar
      const step = Math.min(dist, speed * delta);
      v.c.setPosition(v.c.x + (dx / dist) * step, v.c.y + (dy / dist) * step);
      v.c.setDepth(v.c.y);
    }
  }

  /** Toca um efeito de uma vez no mundo e some no fim. */
  private playFx(anim: string, x: number, y: number, opts: { rotation?: number; scale?: number; depthOver?: boolean } = {}) {
    if (!this.anims.exists(`fx-${anim}`)) return undefined;
    const fx = this.add.sprite(x, y, "", 0).setScale(opts.scale ?? 1).setRotation(opts.rotation ?? 0).setDepth(opts.depthOver === false ? y - 1 : 1e6);
    fx.play(`fx-${anim}`);
    fx.once("animationcomplete", () => fx.destroy());
    return fx;
  }

  /** O alvo recua um pouco na direção do golpe e volta. */
  private knockback(a: View, b: View) {
    const ang = Phaser.Math.Angle.Between(a.c.x, a.c.y, b.c.x, b.c.y);
    this.tweens.add({ targets: b.spr, x: Math.cos(ang) * 4, y: Math.sin(ang) * 3, duration: 60, yoyo: true, ease: "Quad.easeOut",
      onComplete: () => b.spr.setPosition(0, 0) });
  }

  /** Atacante avança um pouco na direção do alvo e volta (dá peso ao golpe). */
  private lunge(a: View, b: View) {
    const ang = Phaser.Math.Angle.Between(a.c.x, a.c.y, b.c.x, b.c.y);
    this.tweens.add({ targets: a.spr, x: Math.cos(ang) * 6, y: Math.sin(ang) * 6, duration: 70, yoyo: true, ease: "Quad.easeOut",
      onComplete: () => a.spr.setPosition(0, 0) });
  }

  /** Aura do Bankai: anel de reiatsu animado atrás do personagem enquanto a forma estiver ativa. */
  private setAura(v: View, charId: string | undefined) {
    const anim = charId && AURA[charId] ? `fx-${AURA[charId]}` : "";
    if (anim && !this.anims.exists(anim)) return;
    if (!anim) { v.aura?.destroy(); v.aura = undefined; return; }
    if (v.aura?.anims.currentAnim?.key === anim) return;
    v.aura?.destroy();
    v.aura = this.add.sprite(0, 8, "", 0).setOrigin(0.5, 1).setAlpha(0.85).setBlendMode(Phaser.BlendModes.ADD);
    v.aura.play(anim);
    if (charId && CHAR_TINT[charId]) v.aura.setTint(CHAR_TINT[charId]);
    v.c.addAt(v.aura, 1); // atrás do sprite, na frente da sombra
  }

  /** Aura do título de Poder: brilho nos pés que cresce e muda de cor a cada título; dos Capitães para cima, pulsa e solta faíscas. */
  private setPowerAura(v: View, power: number, cosAura?: string) {
    const skin = cosAura ? COSMETIC[cosAura] : undefined;
    // aura comprada: a cor é dela e o brilho vale no mínimo o de Capitão (com faíscas)
    const tier = skin ? Math.max(powerTier(power), 4) : powerTier(power);
    const key = `${tier}|${cosAura ?? ""}`;
    if (v.tier === key) return;
    v.tier = key;
    v.glow?.destroy();
    v.glowFx?.destroy();
    v.glow = v.glowFx = undefined;
    const t = skin ? { color: skin.color } : POWER_TIERS[tier];
    if (!t.color) return;
    const w = 26 + tier * 4;
    const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let k = 3; k >= 1; k--) g.fillStyle(t.color, 0.12 * k).fillEllipse(0, 0, (w * k) / 3, (w * k) / 7.5);
    g.y = -3;
    v.glow = g;
    v.c.addAt(g, 1);
    this.tweens.add({ targets: g, alpha: { from: 0.55, to: 1 }, scale: { from: 0.92, to: 1.08 }, duration: 1100 - tier * 60, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (tier >= 4 && this.textures.exists("amb_dot")) {
      v.glowFx = this.add.particles(0, -6, "amb_dot", {
        x: { min: -w / 3, max: w / 3 }, lifespan: 900, frequency: 260 - tier * 25, speedY: { min: -40, max: -18 },
        scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: skin?.color2 ? [t.color, skin.color2] : t.color, blendMode: Phaser.BlendModes.ADD,
      });
      v.c.addAt(v.glowFx, 2);
    }
  }

  /** Título comprado acima do nome e borboleta que acompanha o personagem. */
  private setCosmetics(v: View, e: any) {
    const titleId: string = e.cosTitle ?? "";
    if (v.titleId !== titleId) {
      v.titleId = titleId;
      v.title?.destroy();
      v.title = undefined;
      const text = titleText(titleId);
      if (text) {
        const col = `#${COSMETIC[titleId].color.toString(16).padStart(6, "0")}`;
        v.title = this.add.text(0, v.label.y - 12, `« ${text} »`, {
          fontFamily: PIXEL_FONT, fontSize: "9px", color: col, stroke: "#000000", strokeThickness: 3, resolution: 2,
        }).setOrigin(0.5, 1);
        v.c.add(v.title);
      }
    }
    const petId: string = e.cosPet ?? "";
    if (v.petId !== petId) {
      v.petId = petId;
      v.pet?.destroy();
      v.pet = undefined;
      const pet = petId ? COSMETIC[petId] : undefined;
      if (pet) {
        // borboleta: duas asas de cada lado e o corpo; bate as asas encolhendo na horizontal
        // contorno escuro para aparecer em qualquer chão
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.6).fillEllipse(-4.5, -2, 9, 8).fillEllipse(4.5, -2, 9, 8).fillEllipse(-3, 2.5, 7, 6).fillEllipse(3, 2.5, 7, 6);
        g.fillStyle(pet.color2 ?? pet.color, 1).fillEllipse(-4.5, -2, 7, 6).fillEllipse(4.5, -2, 7, 6);
        g.fillStyle(pet.color, 1).fillEllipse(-3, 2.5, 5, 4).fillEllipse(3, 2.5, 5, 4);
        g.fillStyle(0x000000, 1).fillRect(-0.5, -4, 1, 9);
        g.setScale(1.2);
        this.tweens.add({ targets: g, scaleX: 0.3, duration: 140, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        v.pet = g;
        v.c.add(g);
      }
    }
  }

  /** Borboletas voam em volta do dono (um oito lento, cada uma no seu ritmo). */
  private flyPets(time: number) {
    for (const v of this.views.values()) {
      if (!v.pet) continue;
      const t = time / 900 + v.id.length;
      v.pet.setPosition(Math.sin(t) * 18, -v.spr.displayHeight * 0.55 + Math.sin(t * 2) * 5);
    }
  }

  /** Parado, o sprite "respira" (escala vertical sutil); andando, não. */
  private setIdle(v: View, on: boolean) {
    if (on && !v.idle) {
      v.idle = this.tweens.add({ targets: v.spr, scaleY: v.spr.scaleX * 1.025, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (!on && v.idle) {
      v.idle.stop();
      v.idle = undefined;
      v.spr.setScale(v.spr.scaleX);
    }
  }

  private removeView(id: string, fade = false) {
    const v = this.views.get(id);
    if (!v) return;
    this.views.delete(id);
    if (!fade) return v.c.destroy();
    this.tweens.add({ targets: v.c, alpha: 0, duration: 400, onComplete: () => v.c.destroy() });
  }

  private drawBar(v: View, hp: number, max: number) {
    const w = 28;
    const f = Math.max(0, Math.min(1, hp / max));
    const col = f > 0.5 ? 0x4cd04c : f > 0.25 ? 0xe8c43a : 0xe0463a;
    const light = f > 0.5 ? 0x9cf59c : f > 0.25 ? 0xffe68a : 0xff8a7a;
    v.bar.clear();
    // moldura escura com borda clara, preenchimento com faixa de brilho em cima (pixel art)
    v.bar.fillStyle(0x0b0a12, 0.9).fillRect(-w / 2 - 2, -2, w + 4, 7);
    v.bar.lineStyle(1, 0xc9c4da, 0.55).strokeRect(-w / 2 - 1.5, -1.5, w + 3, 6);
    v.bar.fillStyle(col).fillRect(-w / 2, 0, Math.round(w * f), 3);
    v.bar.fillStyle(light).fillRect(-w / 2, 0, Math.round(w * f), 1);
  }

  // ---------- efeitos ----------

  /** Texto flutuante (dano, cura, nível): surge grande, assenta, sobe e some. `big`: golpe forte. */
  private float(v: View | undefined, text: string, color: string, size = 12, big = false) {
    if (!v) return;
    const t = this.add.text(v.c.x + Phaser.Math.Between(-6, 6), v.c.y - v.spr.displayHeight, text, {
      fontFamily: PIXEL_FONT, fontSize: `${big ? size + 6 : size + 1}px`, fontStyle: "bold", color, stroke: "#000", strokeThickness: big ? 5 : 4, resolution: 2,
    }).setOrigin(0.5).setDepth(1e6 + 1).setScale(big ? 1.8 : 1.35);
    this.tweens.add({ targets: t, scale: 1, duration: big ? 160 : 110, ease: "Back.easeOut" });
    this.tweens.add({ targets: t, y: t.y - (big ? 30 : 22), duration: 900, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 400, onComplete: () => t.destroy() });
  }

  private onFx(fx: { t: string; id?: string; v?: number; from?: string; to?: string; color?: number; color2?: number; skin?: boolean; name?: string; text?: string; skill?: boolean; i?: number; cd?: number; area?: number;
    dot?: boolean; kind?: string; ms?: number }) {
    const v = fx.id ? this.views.get(fx.id) : undefined;
    // som só do que envolve você: o próprio personagem ou o seu alvo
    const mine = fx.id === this.myId;
    const myTarget = fx.id !== undefined && fx.id === this.room.state.players.get(this.myId)?.targetId;
    switch (fx.t) {
      case "die":
        if (myTarget) sfx.die();
        if (v?.isMonster) {
          // fumaça do tamanho do monstro, mas contida (vários morrendo juntos cobriam a tela)
          const puff = this.playFx("death", v.c.x, v.c.y - v.spr.displayHeight / 3, { scale: Math.min(1.1, 0.5 + v.spr.displayHeight / 120) });
          if (puff) this.tweens.add({ targets: puff, alpha: 0, duration: 300, delay: 120 });
        }
        break;
      case "book":
        sfx.chime();
        this.float(this.views.get(this.myId), fx.text!, "#ffcf5a", 12);
        break;
      case "status":
        {
          // aplicado agora: o nome do status sobe uma vez (os ícones e a cor seguem pelo estado).
          // Sai 200 ms depois do número do dano, que chega no mesmo tick, para não nascerem sobrepostos
          const kind = parseStatusFlags(fx.kind)[0];
          // a view pode ter saído (morte, troca de mapa) ou estar oculta (outro mapa) nesses 200 ms
          if (kind) this.time.delayedCall(200, () => { if (v && this.views.get(v.id) === v && v.c.visible) this.float(v, STATUS_LOOK[kind].label, STATUS_LOOK[kind].text, 10); });
        }
        break;
      case "event":
        this.float(this.views.get(this.myId), fx.text!, "#ff6a4a", 16);
        this.cameras.main.shake(300, 0.003);
        sfx.event();
        break;
      case "dmg":
        {
          // dano contínuo (M2-04): número menor e na cor do sangramento; quem causou não golpeia de novo a cada tick,
          // e sem som (tocaria a cada segundo enquanto durar)
          const dot = dotHitStyle(fx);
          if (dot) { this.float(v, dot.text, dot.color, 10); break; }
        }
        {
          const target = v ? (v.isMonster ? this.room.state.monsters.get(v.id) : this.room.state.players.get(v.id)) : undefined;
          const big = !!fx.v && !!target && fx.v >= target.maxHp * 0.25;
          this.float(v, fx.v ? (big ? `${fx.v}!` : String(fx.v)) : "errou", big ? "#ffd84a" : v?.isMonster ? "#ffffff" : "#ff5a4a", 12, big);
          if (big && (fx.from === this.myId || mine)) this.cameras.main.shake(120, 0.003);
        }
        if (v && fx.v) { v.spr.setTintFill(0xffffff); this.time.delayedCall(70, () => this.restoreTint(v)); }
        {
          // golpe: quem bateu avança, o corte aparece no alvo (habilidade tem efeito próprio) e um impacto
          const a = fx.from ? this.views.get(fx.from) : undefined;
          if (a && v && !fx.skill) {
            this.lunge(a, v);
            if (fx.v) this.time.delayedCall(70, () => this.knockback(a, v));
            const ang = Phaser.Math.Angle.Between(a.c.x, a.c.y, v.c.x, v.c.y);
            const ty = v.c.y - v.spr.displayHeight / 2;
            if (!a.isMonster) this.playFx("slash", v.c.x, ty, { rotation: ang });
            else {
              const kind = this.room.state.monsters.get(a.id)?.kind ?? "";
              const anim = MOB_FX[kind] ?? "claw";
              if (anim === "acid" || anim === "cero") {
                // cuspe e cero saem do monstro e voam até o alvo
                const shot = this.playFx(anim, a.c.x, a.c.y - a.spr.displayHeight / 2, { rotation: ang, scale: anim === "cero" ? 1.2 : 0.8 });
                if (shot) this.tweens.add({ targets: shot, x: v.c.x, y: ty, duration: 200 });
              } else this.playFx(anim, v.c.x, ty, { scale: anim === "bite" ? 0.7 : 0.8 });
            }
          }
          if (v && fx.v) this.playFx("hit", v.c.x + Phaser.Math.Between(-6, 6), v.c.y - v.spr.displayHeight / 2 + Phaser.Math.Between(-6, 6), { scale: 0.6 });
        }
        if (mine && fx.v) sfx.hurt();
        else if (myTarget && fx.v) sfx.hit();
        break;
      case "tp":
        // no sprite, e não no container: o moveView do teleporte mata os tweens do container
        if (v) { v.spr.setAlpha(0.2); this.tweens.add({ targets: v.spr, alpha: 1, duration: 400 }); }
        break;
      case "loot":
        this.float(v, "loot!", "#ffd84a", 10);
        if (mine) sfx.loot();
        break;
      case "heal":
        this.float(v, `+${fx.v}`, "#6dff7a");
        if (v) this.playFx("heal", v.c.x, v.c.y - 20, { scale: 0.8 });
        if (mine) sfx.heal();
        break;
      case "level":
        this.float(v, `NÍVEL ${fx.v}!`, "#ffd84a", 14);
        if (v) this.playFx("level", v.c.x, v.c.y - 28, { scale: 1.3 });
        if (mine) sfx.level();
        break;
      case "form":
        {
          // grito de cada estágio da evolução ("BANKAI!", "MÁSCARA HOLLOW!", "MUGETSU!"); quanto mais alto, maior a explosão
          const cid = fx.id ? this.room.state.players.get(fx.id)?.charId : "";
          const up = CHARS[cid ?? ""]?.forms[fx.v ?? 0]?.shout ?? "BANKAI!";
          const big = (fx.v ?? 0) >= 3;
          this.float(v, fx.v ? up : "Forma normal", big ? "#ff3a6a" : fx.v ? "#ff6a3a" : "#cfd8ff", fx.v ? 12 + (fx.v ?? 0) * 2 : 14);
          const rel = v && fx.v ? this.playFx(RELEASE[cid ?? ""] ?? "rel_ichigo", v.c.x, v.c.y - 26, { scale: 1 + (fx.v ?? 0) * 0.25 }) : undefined; // o anel da explosão cai nos pés
          if (rel && CHAR_TINT[cid ?? ""]) rel.setTint(CHAR_TINT[cid ?? ""]);
          if (v && big) this.cameras.main.flash(250, 255, 255, 255);
        }
        if (v && fx.v) this.cameras.main.shake(150 + (fx.v ?? 0) * 70, 0.003 + (fx.v ?? 0) * 0.0015);
        if (mine && fx.v) sfx.bankai();
        break;
      case "skill": {
        const a = this.views.get(fx.from!);
        const b = this.views.get(fx.to!);
        if (!a || !b) break;
        const tier = fx.i ?? 0;
        this.float(a, fx.name!, tier >= 3 ? "#ffd34a" : "#bfe9ff", 11 + tier * 2);
        if (fx.from === this.myId) { sfx.skill(); window.dispatchEvent(new CustomEvent("tech-used", { detail: { i: tier, cd: fx.cd ?? 0 } })); }
        if (fx.area) {
          // anel de choque do tamanho da área, na cor da técnica
          const r = (fx.area * 2 + 1) * TILE;
          const ring = this.add.ellipse(b.c.x, b.c.y - 4, r, r / 2).setStrokeStyle(3, fx.color ?? 0xffffff, 1).setDepth(b.c.y + 1)
            .setBlendMode(Phaser.BlendModes.ADD).setScale(0.1);
          this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380 + fx.area * 80, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
        }
        if (tier >= 3) { this.cameras.main.flash(180, 255, 255, 255); this.cameras.main.shake(300, 0.007); }
        const p = this.room.state.players.get(fx.from!);
        const sk = SKILL_FX[p?.charId ?? ""];
        const ang = Phaser.Math.Angle.Between(a.c.x, a.c.y, b.c.x, b.c.y);
        this.lunge(a, b);
        if (fx.skin) this.skinTrail(a, b, fx.color ?? 0xffffff, fx.color2 ?? fx.color ?? 0xffffff);
        if (sk && this.anims.exists(`fx-${sk.anim}`)) {
          if (sk.fly) {
            // projétil: sai do personagem e voa até o alvo
            const shot = this.playFx(sk.anim, a.c.x, a.c.y - 20, { rotation: ang, scale: 0.9 });
            if (shot && fx.skin) shot.setTint(fx.color!);
            else if (shot && CHAR_TINT[p?.charId ?? ""]) shot.setTint(CHAR_TINT[p!.charId]);
            if (shot) this.tweens.add({ targets: shot, x: b.c.x, y: b.c.y - 20, duration: 220 });
          } else {
            const blast = this.playFx(sk.anim, b.c.x, b.c.y - 20, { scale: 1.1 + (fx.area ?? 0) * 0.35 });
            if (blast && fx.skin) blast.setTint(fx.color!);
            else if (blast && CHAR_TINT[p?.charId ?? ""]) blast.setTint(CHAR_TINT[p!.charId]);
          }
          this.time.delayedCall(200, () => this.playFx("hit", b.c.x, b.c.y - 20));
        } else {
          const orb = this.add.ellipse(a.c.x, a.c.y - 20, 22, 10, fx.color, 0.9).setDepth(1e6);
          orb.rotation = ang;
          this.tweens.add({ targets: orb, x: b.c.x, y: b.c.y - 20, duration: 180, onComplete: () => orb.destroy() });
        }
        break;
      }
    }
  }

  /** Visual comprado de técnica: um rastro de faíscas nas duas cores do atacante até o alvo. */
  private skinTrail(a: View, b: View, c1: number, c2: number) {
    if (!this.textures.exists("amb_dot")) return;
    const em = this.add.particles(a.c.x, a.c.y - 20, "amb_dot", {
      lifespan: 450, frequency: 12, speed: { min: 5, max: 30 }, scale: { start: 1.4, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [c1, c2], blendMode: c1 < 0x404040 ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD,
    }).setDepth(1e6);
    this.tweens.add({ targets: em, x: b.c.x, y: b.c.y - 20, duration: 220, onComplete: () => { em.stop(); this.time.delayedCall(500, () => em.destroy()); } });
  }

  private restoreTint(v: View) {
    const def = v.isMonster ? MONSTERS[this.room.state.monsters.get(v.id)?.kind] : undefined;
    const p = v.isMonster ? undefined : this.room.state.players.get(v.id);
    const tint = desiredTint(v.statusKinds, def?.tint ?? (p ? CHARS[p.charId].forms[p.form].tint : undefined));
    v.spr.clearTint();
    if (tint !== 0xffffff) v.spr.setTint(tint);
  }

  /** Status do servidor (M2-06): ícones acima da barra de vida e cor no sprite. Só redesenha quando muda. */
  private setStatus(v: View, flags: unknown) {
    const kinds = parseStatusFlags(flags);
    if (kinds.join() === v.statusKinds.join()) return;
    v.statusKinds = kinds;
    const g = v.statusIcons;
    g.clear();
    // 10 px de passo para o fundo de 9 px: 1 px entre um ícone e outro
    kinds.forEach((k, i) => this.drawStatusIcon(g, k, 22 + i * 10));
    // não corta o clarão branco do golpe (o restoreTint dele roda 70 ms depois)
    if (!v.spr.tintFill) this.restoreTint(v);
  }

  /** Ícone de 7 px em pixel art, uma forma por status para ler sem depender só da cor. */
  private drawStatusIcon(g: Phaser.GameObjects.Graphics, kind: StatusKind, x: number) {
    const col = STATUS_LOOK[kind].icon;
    g.fillStyle(0x0b0a12, 0.9).fillRect(x - 4, -4, 9, 9);
    g.fillStyle(col);
    if (kind === "freeze") {
      // cristal de gelo: losango
      g.fillTriangle(x, -3, x + 3, 0, x - 3, 0).fillTriangle(x, 3, x + 3, 0, x - 3, 0);
    } else if (kind === "stun") {
      // estrela de tontura: cruz
      g.fillRect(x - 3, -1, 7, 2).fillRect(x - 1, -3, 2, 7);
    } else if (kind === "slow") {
      // seta para baixo
      g.fillTriangle(x - 3, -2, x + 3, -2, x, 3);
    } else {
      // gota de sangue
      g.fillTriangle(x, -3, x + 2, 1, x - 2, 1).fillCircle(x, 1, 2);
    }
  }

  // ---------- entrada ----------

  /** Com a janela de depot/loja aberta (à direita), empurra a câmera para o
   * personagem aparecer no lado livre da tela. */
  /** Joystick de toque: a direção segurada funciona como uma tecla de seta. */
  setTouchDir(dir: number | null) {
    const had = this.held.length;
    this.held = dir === null ? [] : [dir];
    if (dir !== null && !had) this.tryStep(this.time.now);
  }

  setPanelOpen(open: boolean) {
    this.cameras.main.setFollowOffset(open ? -110 : 0, 0);
  }

  /** Desenha o mapa do Tiled (troca ao viajar entre mapas). */
  /** Texturas pequenas das partículas (um ponto de luz e uma pétala), desenhadas uma vez. */
  private makeParticleTextures() {
    if (!this.textures.exists("amb_dot")) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff, 0.35).fillCircle(4, 4, 4);
      g.fillStyle(0xffffff, 1).fillCircle(4, 4, 2);
      g.generateTexture("amb_dot", 8, 8);
      g.clear();
      g.fillStyle(0xffffff, 1).fillEllipse(4, 3, 7, 4);
      g.generateTexture("amb_petal", 8, 6);
      g.clear();
      g.fillStyle(0xd8cfc0, 0.9).fillCircle(3, 3, 3);
      g.generateTexture("amb_dust", 6, 6);
      g.destroy();
    }
  }

  private ambient?: Phaser.GameObjects.Particles.ParticleEmitter;
  private targetRing?: Phaser.GameObjects.Graphics;

  /** Anel pulsante sob o alvo atual e barra de chefe no topo da tela. */
  private updateTarget() {
    const me = this.room.state.players.get(this.myId);
    const v = me?.targetId ? this.views.get(me.targetId) : undefined;
    if (!this.targetRing) {
      this.targetRing = this.add.graphics();
      this.tweens.add({ targets: this.targetRing, scale: 1.12, alpha: 0.65, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    const ring = this.targetRing;
    if (!v || !v.c.visible) ring.setVisible(false);
    else {
      const w = Math.max(26, v.spr.displayWidth * 0.75);
      ring.clear();
      ring.lineStyle(2, 0xff3a3a, 1).strokeEllipse(0, 0, w, w * 0.4);
      ring.lineStyle(1, 0xffffff, 0.6).strokeEllipse(0, 0, w + 6, w * 0.4 + 3);
      ring.setPosition(v.c.x, v.c.y - 3).setDepth(v.c.y - 2).setVisible(true);
    }
    // chefe: nome e vida em barra grande (elemento da página, fora do canvas)
    const bar = document.getElementById("bossbar");
    const mon = v?.isMonster ? this.room.state.monsters.get(v.id) : undefined;
    if (!bar) return;
    if (!mon || !BOSSES.has(mon.kind)) { bar.hidden = true; return; }
    bar.hidden = false;
    (bar.querySelector("b") as HTMLElement).textContent = MONSTERS[mon.kind].name;
    (bar.querySelector("i") as HTMLElement).style.width = `${Math.max(0, (mon.hp / mon.maxHp) * 100)}%`;
    (bar.querySelector("span") as HTMLElement).textContent = `${Math.max(0, mon.hp)} / ${mon.maxHp}`;
  }

  /** Partículas do clima do mapa: presas à câmera (cobrem só a tela) e por trás da interface. */
  private startAmbient(id: string) {
    this.ambient?.destroy();
    this.ambient = undefined;
    const a = AMBIENT[id];
    if (!a) return;
    const cam = this.cameras.main;
    this.ambient = this.add.particles(0, 0, a.tex, {
      x: { min: -40, max: cam.width + 40 }, y: { min: -40, max: cam.height + 40 },
      lifespan: a.life, frequency: a.life / a.count, quantity: 1,
      speedX: { min: a.speedX[0], max: a.speedX[1] }, speedY: { min: a.speedY[0], max: a.speedY[1] },
      scale: { start: a.scale[1], end: a.scale[0] }, alpha: { start: a.alpha[0], end: a.alpha[1] },
      tint: a.color, rotate: a.spin ? { min: 0, max: 360 } : 0,
      blendMode: a.blend ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
    }).setScrollFactor(0).setDepth(2e5);
    // já começa com o céu "cheio", sem esperar as primeiras partículas nascerem
    this.ambient.fastForward(a.life);
  }

  /** Poeira nos pés a cada passo (só quem está na tela). */
  private dust(v: View) {
    if (!this.cameras.main.worldView.contains(v.c.x, v.c.y)) return;
    const d = this.add.image(v.c.x + Phaser.Math.Between(-4, 4), v.c.y - 2, "amb_dust").setDepth(v.c.y - 1).setAlpha(0.55);
    this.tweens.add({ targets: d, alpha: 0, scale: 2.2, y: d.y - 4, duration: 380, onComplete: () => d.destroy() });
  }

  private showMap(id: string) {
    if (id === this.mapId || !this.maps[id]) return;
    for (const o of this.mapObjects) o.destroy();
    this.mapObjects = [];
    this.mapId = id;
    const tm = this.make.tilemap({ key: `map_${id}` });
    const tiles = tm.addTilesetImage(tm.tilesets[0].name, `tiles_${id}`)!;
    for (const layer of tm.layers) {
      const l = tm.createLayer(layer.name, tiles, 0, 0)!;
      // "acima" (copas, topos de coluna) fica por cima dos personagens
      l.setDepth(layer.name === "acima" ? 1e5 : -1);
      this.mapObjects.push(l);
    }
    this.mapObjects.push(tm as unknown as Phaser.GameObjects.GameObject);
    this.cameras.main.setBounds(0, 0, tm.widthInPixels, tm.heightInPixels);
    this.cameras.main.setBackgroundColor(id === "hueco" ? "#0b0b12" : "#000000");
    this.buildMinimap(id);
    this.makeParticleTextures();
    this.startAmbient(id);
    const shop = this.maps[id].shop;
    if (shop) {
      const x = px(shop.x), y = py(shop.y);
      const spr = this.add.image(x, y, SHOP_SPRITE).setOrigin(0.5, 1).setDepth(y);
      this.mapObjects.push(
        this.add.ellipse(x, y - 3, 26, 8, 0x000000, 0.3).setDepth(y - 1), spr,
        this.add.text(x, y - spr.displayHeight - 2, shop.name, {
          fontFamily: PIXEL_FONT, fontSize: "11px", color: "#ffe08a", stroke: "#000000", strokeThickness: 3, resolution: 2,
        }).setOrigin(0.5, 1).setDepth(y),
      );
    }
  }

  private onClick(ptr: Phaser.Input.Pointer) {
    const tx = Math.floor(ptr.worldX / TILE), ty = Math.floor(ptr.worldY / TILE);
    const m = this.maps[this.mapId];
    for (const [id, b] of this.bags) {
      if (b.map === this.mapId && b.x === tx && b.y === ty) {
        this.pendingBag = id;
        return this.room.send("bagOpen", { id });
      }
    }
    // NPC da loja (o desenho ocupa o tile dele e o de cima), baú do depot e portal
    if (m.shop && tx === m.shop.x && (ty === m.shop.y || ty === m.shop.y - 1)) return this.room.send("interact", { kind: "shop" });
    if (m.depot && tx === m.depot.x && ty === m.depot.y) return this.room.send("interact", { kind: "depot" });
    if (m.gate && tx === m.gate.x && ty === m.gate.y) return this.room.send("interact", { kind: "travel" });
    // outro jogador: abre o menu (party / atacar) na posição do clique
    for (const v of this.views.values()) {
      if (!v.isMonster && v.id !== this.myId && v.c.visible && v.spr.getBounds().contains(ptr.worldX, ptr.worldY)) {
        const ev = ptr.event as MouseEvent;
        return this.onPlayerClick(v.id, ev.clientX, ev.clientY);
      }
    }
    // monstro clicado (o sprite é maior que o tile, então testa os limites do desenho)
    for (const v of this.views.values()) {
      if (v.isMonster && v.c.visible && v.spr.getBounds().contains(ptr.worldX, ptr.worldY)) {
        this.room.send("target", { id: v.id });
        return;
      }
    }
    this.room.send("move", { x: tx, y: ty });
  }

  private bindKeys() {
    const dirOf: Record<string, number> = { KeyS: 0, ArrowDown: 0, KeyA: 1, ArrowLeft: 1, KeyD: 2, ArrowRight: 2, KeyW: 3, ArrowUp: 3 };
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement;
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.code in dirOf) {
        e.preventDefault();
        const d = dirOf[e.code];
        if (!this.held.includes(d)) this.held.push(d);
        if (!e.repeat) this.tryStep(this.time.now); // um toque rápido anda 1 tile
        return;
      }
      if (e.repeat) return;
      if (e.code === "Tab") { e.preventDefault(); this.room.send("nextTarget"); }
      else if (e.code === "Escape") this.room.send("target", { id: "" });
      else if (e.code === "KeyT") this.room.send("transform");
      else if (e.code === "KeyR") this.room.send("recall");
      else if (/^Digit[1-9]$/.test(e.code)) this.room.send("skill", { slot: Number(e.code.slice(5)) });
    };
    const up = (e: KeyboardEvent) => {
      if (e.code in dirOf) this.held = this.held.filter((d) => d !== dirOf[e.code]);
    };
    const blur = () => (this.held = []);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    });
  }

  private tryStep(time: number) {
    const me = this.room.state.players.get(this.myId);
    if (this.held.length && me && time >= this.nextStepSend) {
      this.room.send("step", { dir: this.held[this.held.length - 1] });
      this.nextStepSend = time + realStep(me.stepMs);
    }
  }

  // ---------- minimapa ----------

  private minimap = document.querySelector<HTMLCanvasElement>("#minimap");
  private minimapBase: ImageData | null = null;
  private nextMinimapAt = 0;

  /** Fundo do minimapa: 1 pixel por tile, na cor média do tile mais alto (sem a camada "acima"). */
  private buildMinimap(id: string) {
    const c = this.minimap;
    if (!c) return;
    const data = this.cache.tilemap.get(`map_${id}`).data;
    const img = this.textures.get(`tiles_${id}`).getSourceImage() as HTMLImageElement;
    const src = document.createElement("canvas");
    src.width = img.width;
    src.height = img.height;
    const sctx = src.getContext("2d", { willReadFrequently: true })!;
    sctx.drawImage(img, 0, 0);
    const cols = img.width / TILE;
    const avg = new Map<number, [number, number, number]>();
    const colorOf = (gid: number) => {
      if (!avg.has(gid)) {
        const t = gid - 1;
        const px = sctx.getImageData((t % cols) * TILE, Math.floor(t / cols) * TILE, TILE, TILE).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
        avg.set(gid, n ? [r / n, g / n, b / n] : [0, 0, 0]);
      }
      return avg.get(gid)!;
    };
    c.width = data.width;
    c.height = data.height;
    const out = new ImageData(data.width, data.height);
    const layers = (data.layers as any[]).filter((l) => l.type === "tilelayer" && l.name !== "acima");
    for (let i = 0; i < data.width * data.height; i++) {
      let gid = 0;
      for (const l of layers) if (l.data[i]) gid = l.data[i] & 0x1fffffff;
      const [r, g, b] = gid ? colorOf(gid) : [0, 0, 0];
      out.data.set([r, g, b, 255], i * 4);
    }
    this.minimapBase = out;
    c.onclick = (e) => {
      const rect = c.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * c.width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * c.height);
      this.room.send("move", { x, y });
    };
  }

  private drawMinimap(me: any) {
    const c = this.minimap;
    if (!c || !this.minimapBase || !me) return;
    const ctx = c.getContext("2d")!;
    ctx.putImageData(this.minimapBase, 0, 0);
    const dot = (x: number, y: number, color: string, size = 1) => { ctx.fillStyle = color; ctx.fillRect(x - (size >> 1), y - (size >> 1), size, size); };
    for (const m of this.room.state.monsters.values()) if (m.map === this.mapId) dot(m.x, m.y, "#ff4a3a");
    for (const p of this.room.state.players.values()) {
      if (p.map !== this.mapId || p.id === this.myId) continue;
      dot(p.x, p.y, me.partyId && p.partyId === me.partyId ? "#7dff8a" : "#6cc0ff", 2);
    }
    dot(me.x, me.y, "#ffffff", 3);
  }

  update(time: number, delta: number) {
    this.glide(delta);
    this.flyPets(time);
    this.updateTarget();
    if (time >= this.nextMinimapAt) {
      this.nextMinimapAt = time + 250;
      this.drawMinimap(this.room.state.players.get(this.myId));
    }
    this.tryStep(time);
    const me = this.room.state.players.get(this.myId);
    if (me && me.map !== this.mapId) this.showMap(me.map);
    for (const b of this.bags.values()) b.img.setVisible(b.map === this.mapId);
    const pb = this.pendingBag ? this.bags.get(this.pendingBag) : undefined;
    if (!pb) this.pendingBag = "";
    else if (me && pb.map === me.map && Math.max(Math.abs(pb.x - me.x), Math.abs(pb.y - me.y)) <= 1) {
      this.room.send("bagOpen", { id: this.pendingBag });
      this.pendingBag = "";
    }
    // só aparece quem está no mesmo mapa que eu
    for (const v of this.views.values()) {
      const e = v.isMonster ? this.room.state.monsters.get(v.id) : this.room.state.players.get(v.id);
      v.c.setVisible(!!e && e.map === this.mapId);
    }
    // volta ao quadro parado quando a entidade deixa de andar
    for (const v of this.views.values())
      if (v.spr.anims.isPlaying && time - v.lastMoveAt > realStep(v.stepMs) + 120) {
        v.spr.anims.stop();
        v.spr.setFrame(this.stand(v.sprite, v.dir));
        this.setIdle(v, true);
      }
    // cor do nome: verde = minha party, vermelho = atacou um jogador há pouco (bloqueado)
    const now = serverNow();
    for (const v of this.views.values()) {
      if (v.isMonster) continue;
      const p = this.room.state.players.get(v.id);
      if (!p) continue;
      // ☠ vermelho escuro = assassino; vermelho = marcado (atacou alguém há pouco); verde = minha party
      const skull = p.skullUntil > now;
      const cosName = p.cosName ? COSMETIC[p.cosName] : undefined;
      const color = skull ? "#ff2020" : p.pvpUntil > now ? "#ff6a5a" : me?.partyId && p.partyId === me.partyId && v.id !== this.myId ? "#7dff8a"
        : cosName ? `#${cosName.color.toString(16).padStart(6, "0")}` : "#ffffff";
      const text = `${skull ? "☠ " : ""}${p.rebirths ? `✦${p.rebirths} ` : ""}${p.name}${p.guildTag ? ` [${p.guildTag}]` : ""}`;
      if (v.label.text !== text) v.label.setText(text);
      if (v.label.style.color !== color) v.label.setColor(color);
    }
    this.targetBox.clear();
    const t = me?.targetId ? this.views.get(me.targetId) : undefined;
    if (t) this.targetBox.lineStyle(2, 0xff3030, 1).strokeRect(t.c.x - TILE / 2, t.c.y - TILE, TILE, TILE);
  }
}

export const gameConfig = (parent: string): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: VIEW_W * TILE,
  height: VIEW_H * TILE,
  pixelArt: true,
  backgroundColor: "#000000",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
