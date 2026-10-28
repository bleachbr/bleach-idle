// Cena principal: desenha o mapa, espelha o estado do servidor e envia intenções.
// Nada de simulação aqui: posições, dano e XP vêm todos do servidor.
import Phaser from "phaser";
import { sfx } from "./sfx";
import type { Room } from "colyseus.js";
import { TILE, SPRITES, CHARS, MONSTERS, MAP_IDS, HOME_MAP, SHOP_SPRITE, parseMap, spriteKey, type GameMap } from "../../shared/src";
import { serverNow } from "./clock";

const VIEW_W = 15;
const VIEW_H = 11;

interface View {
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
}

const px = (x: number) => x * TILE + TILE / 2;
const py = (y: number) => y * TILE + TILE;

export class GameScene extends Phaser.Scene {
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
      this.load.spritesheet(key, `/assets/sprites/${key}.png`, { frameWidth: def.frame, frameHeight: def.frame });
    this.load.image(SHOP_SPRITE, `/assets/sprites/${SHOP_SPRITE}.png`);
    this.load.spritesheet("items", "/assets/items.png", { frameWidth: 32, frameHeight: 32 });
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

    for (const key of Object.keys(SPRITES).filter((k) => this.textures.exists(k)))
      for (let d = 0; d < 4; d++)
        this.anims.create({ key: `${key}-${d}`, frames: this.anims.generateFrameNumbers(key, { start: d * 4, end: d * 4 + 3 }), repeat: -1 });

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

  private spriteFor(e: any, isMonster: boolean): { key: string; tint?: number; scale: number } {
    if (isMonster) {
      const def = MONSTERS[e.kind];
      return { key: def.sprite, tint: def.tint, scale: def.scale };
    }
    const form = CHARS[e.charId].forms[e.form];
    // visual do equipamento; sem a folha da combinação, tenta as partes ("haori_mask" -> "haori") e depois a base
    const look: string = e.look ?? "";
    const tries = [spriteKey(form.sprite, look), ...look.split("_").map((l) => spriteKey(form.sprite, l))];
    return { key: tries.find((k) => this.textures.exists(k)) ?? form.sprite, tint: form.tint, scale: 1 };
  }

  private addView(id: string, e: any, isMonster: boolean) {
    const look = this.spriteFor(e, isMonster);
    const shadow = this.add.ellipse(0, -3, 22 * look.scale + 4, 8, 0x000000, 0.3);
    const spr = this.add.sprite(0, 0, look.key, e.dir * 4 + 1).setOrigin(0.5, 1).setScale(look.scale);
    if (look.tint) spr.setTint(look.tint);
    const top = -spr.displayHeight + (isMonster ? 4 : 2);
    const name = isMonster ? MONSTERS[e.kind].name : e.guildTag ? `${e.name} [${e.guildTag}]` : e.name;
    const label = this.add.text(0, top - 12, name, {
      fontFamily: "system-ui, sans-serif", fontSize: "10px", color: isMonster ? "#ffb4a8" : "#ffffff",
      stroke: "#000000", strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5, 1);
    const bar = this.add.graphics();
    bar.y = top - 9;
    const c = this.add.container(px(e.x), py(e.y), [shadow, spr, bar, label]);
    const v: View = { id, c, spr, label, bar, sprite: look.key, dir: e.dir, tx: e.x, ty: e.y, lastMoveAt: 0, stepMs: e.stepMs, isMonster };
    this.views.set(id, v);
    c.setDepth(c.y);
    this.drawBar(v, e.hp, e.maxHp);

    e.onChange(() => {
      v.stepMs = e.stepMs;
      if (e.x !== v.tx || e.y !== v.ty) this.moveView(v, e.x, e.y, e.dir);
      else if (e.dir !== v.dir && !v.spr.anims.isPlaying) { v.dir = e.dir; v.spr.setFrame(e.dir * 4 + 1); }
      v.dir = e.dir;
      this.drawBar(v, e.hp, e.maxHp);
      if (!isMonster) {
        const look2 = this.spriteFor(e, false);
        if (look2.key !== v.sprite || (look2.tint ?? 0xffffff) !== v.spr.tintTopLeft) {
          v.sprite = look2.key;
          v.spr.setTexture(look2.key, e.dir * 4 + 1);
          if (look2.tint) v.spr.setTint(look2.tint); else v.spr.clearTint();
        }
        v.label.setAlpha(e.online ? 1 : 0.55); // offline caçando aparece meio apagado
        if (id === this.myId) this.onMe(e);
      }
    });

    if (id === this.myId) {
      this.cameras.main.startFollow(c, true, 1, 1, 0, 0);
      this.onMe(e);
    }
  }

  private moveView(v: View, x: number, y: number, dir: number) {
    const far = Math.abs(x - v.tx) + Math.abs(y - v.ty) > 2; // teleporte (morte, login)
    v.tx = x;
    v.ty = y;
    v.lastMoveAt = this.time.now;
    this.tweens.killTweensOf(v.c);
    if (far) {
      v.c.setPosition(px(x), py(y));
      return;
    }
    this.tweens.add({ targets: v.c, x: px(x), y: py(y), duration: v.stepMs, ease: "Linear", onUpdate: () => v.c.setDepth(v.c.y) });
    const key = `${v.sprite}-${dir}`;
    // 4 frames = 2 passos
    if (v.spr.anims.currentAnim?.key !== key || !v.spr.anims.isPlaying)
      v.spr.anims.play({ key, frameRate: 2000 / v.stepMs, startFrame: v.spr.anims.isPlaying ? undefined : 0 });
  }

  private removeView(id: string, fade = false) {
    const v = this.views.get(id);
    if (!v) return;
    this.views.delete(id);
    if (!fade) return v.c.destroy();
    this.tweens.add({ targets: v.c, alpha: 0, duration: 400, onComplete: () => v.c.destroy() });
  }

  private drawBar(v: View, hp: number, max: number) {
    const w = 26;
    const f = Math.max(0, Math.min(1, hp / max));
    v.bar.clear();
    v.bar.fillStyle(0x000000, 0.8).fillRect(-w / 2 - 1, -1, w + 2, 5);
    v.bar.fillStyle(f > 0.5 ? 0x4cd04c : f > 0.25 ? 0xe8c43a : 0xe0463a).fillRect(-w / 2, 0, Math.round(w * f), 3);
  }

  // ---------- efeitos ----------

  private float(v: View | undefined, text: string, color: string, size = 12) {
    if (!v) return;
    const t = this.add.text(v.c.x + Phaser.Math.Between(-6, 6), v.c.y - v.spr.displayHeight, text, {
      fontFamily: "system-ui, sans-serif", fontSize: `${size}px`, fontStyle: "bold", color, stroke: "#000", strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5).setDepth(1e6 + 1);
    this.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private onFx(fx: { t: string; id?: string; v?: number; from?: string; to?: string; color?: number; name?: string; text?: string }) {
    const v = fx.id ? this.views.get(fx.id) : undefined;
    // som só do que envolve você: o próprio personagem ou o seu alvo
    const mine = fx.id === this.myId;
    const myTarget = fx.id !== undefined && fx.id === this.room.state.players.get(this.myId)?.targetId;
    switch (fx.t) {
      case "die":
        if (myTarget) sfx.die();
        break;
      case "book":
        sfx.chime();
        this.float(this.views.get(this.myId), fx.text!, "#ffcf5a", 12);
        break;
      case "event":
        this.float(this.views.get(this.myId), fx.text!, "#ff6a4a", 16);
        this.cameras.main.shake(300, 0.003);
        sfx.event();
        break;
      case "dmg":
        this.float(v, fx.v ? String(fx.v) : "errou", v?.isMonster ? "#ffffff" : "#ff5a4a");
        if (v && fx.v) { v.spr.setTintFill(0xffffff); this.time.delayedCall(70, () => this.restoreTint(v)); }
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
        if (mine) sfx.heal();
        break;
      case "level":
        this.float(v, `NÍVEL ${fx.v}!`, "#ffd84a", 14);
        if (mine) sfx.level();
        break;
      case "form":
        this.float(v, fx.v ? "BANKAI!" : "Shikai", fx.v ? "#ff6a3a" : "#cfd8ff", 14);
        if (v && fx.v) this.cameras.main.shake(200, 0.004);
        if (mine && fx.v) sfx.bankai();
        break;
      case "skill": {
        const a = this.views.get(fx.from!);
        const b = this.views.get(fx.to!);
        if (!a || !b) break;
        this.float(a, fx.name!, "#bfe9ff", 11);
        if (fx.from === this.myId) sfx.skill();
        const orb = this.add.ellipse(a.c.x, a.c.y - 20, 22, 10, fx.color, 0.9).setDepth(1e6);
        orb.rotation = Phaser.Math.Angle.Between(a.c.x, a.c.y, b.c.x, b.c.y);
        this.tweens.add({ targets: orb, x: b.c.x, y: b.c.y - 20, duration: 180, onComplete: () => orb.destroy() });
        break;
      }
    }
  }

  private restoreTint(v: View) {
    const def = v.isMonster ? MONSTERS[this.room.state.monsters.get(v.id)?.kind] : undefined;
    const p = v.isMonster ? undefined : this.room.state.players.get(v.id);
    const tint = def?.tint ?? (p ? CHARS[p.charId].forms[p.form].tint : undefined);
    v.spr.clearTint();
    if (tint) v.spr.setTint(tint);
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
    const shop = this.maps[id].shop;
    if (shop) {
      const x = px(shop.x), y = py(shop.y);
      const spr = this.add.image(x, y, SHOP_SPRITE).setOrigin(0.5, 1).setDepth(y);
      this.mapObjects.push(
        this.add.ellipse(x, y - 3, 26, 8, 0x000000, 0.3).setDepth(y - 1), spr,
        this.add.text(x, y - spr.displayHeight - 2, shop.name, {
          fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#ffe08a", stroke: "#000000", strokeThickness: 3, resolution: 2,
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
      this.nextStepSend = time + me.stepMs;
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

  update(time: number) {
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
      if (v.spr.anims.isPlaying && time - v.lastMoveAt > v.stepMs + 80) {
        v.spr.anims.stop();
        v.spr.setFrame(v.dir * 4 + 1);
      }
    // cor do nome: verde = minha party, vermelho = atacou um jogador há pouco (bloqueado)
    const now = serverNow();
    for (const v of this.views.values()) {
      if (v.isMonster) continue;
      const p = this.room.state.players.get(v.id);
      if (!p) continue;
      // ☠ vermelho escuro = assassino; vermelho = marcado (atacou alguém há pouco); verde = minha party
      const skull = p.skullUntil > now;
      const color = skull ? "#ff2020" : p.pvpUntil > now ? "#ff6a5a" : me?.partyId && p.partyId === me.partyId && v.id !== this.myId ? "#7dff8a" : "#ffffff";
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
