// Визуальное представление этажа: тайлы, стены, пропсы, туман войны, мини-карта,
// отсечение невидимого, полупрозрачность стен перед героем, разрушаемые стены.
import Phaser from 'phaser';
import { ART } from '../config';
import { isoToScreen, screenToIso, depthOf } from '../core/iso';
import { RNG } from '../core/rng';
import { EXT_LOADED, EXT_ORIGIN } from '../art/external';
import { T_FLOOR, T_CRACKED, T_VOID, T_HOUSE, T_WATER, STRUCTS, type Dungeon, type Prop } from './DungeonGen';

export const FLOOR_DEPTH = -100000;
const SCALE = 1 / ART;

export interface StaticLight { x: number; y: number; r: number; color: number; flicker: number; intensity: number }

/** Опорные точки (origin) текстур пропсов — где у картинки «стоит» основание. */
const PROP_ORIGIN: Record<string, [number, number]> = {
  pillar: [0.5, 191 / 220], tree: [0.5, 238 / 260], grave: [0.5, 100 / 120], brazier: [0.5, 0.9], chest: [0.5, 0.74],
  altar: [0.5, 0.7], crystal: [0.5, 0.87], cart: [0.5, 0.66], banner: [0.5, 0.94], decal: [0.5, 0.5],
};

export class Level {
  floor: (Phaser.GameObjects.Image | null)[];
  walls: (Phaser.GameObjects.Image | null)[];
  explored: Uint8Array;
  propSprites: { prop: Prop; img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; flame?: Phaser.GameObjects.Sprite; opened?: boolean }[] = [];
  lights: StaticLight[] = [];
  minimap: Phaser.Textures.CanvasTexture;
  minimapDirty = true;
  private faded: Phaser.GameObjects.Image[] = [];
  private all: Phaser.GameObjects.GameObject[] = [];
  private crackedHp = new Map<number, number>();
  private cullTick = 0;
  private shown: number[] = []; // клетки, у которых пол или стена сейчас видимы
  private docks = new Set<number>();
  private forest = new Set<number>(); // клетки края с деревом (можно срубить)
  private rng = new RNG(1);

  constructor(private scene: Phaser.Scene, public d: Dungeon) {
    const N = d.w * d.h;
    this.floor = new Array(N).fill(null);
    this.walls = new Array(N).fill(null);
    this.explored = new Uint8Array(N);
    if (scene.textures.exists('minimap')) scene.textures.remove('minimap');
    this.minimap = scene.textures.createCanvas('minimap', (d.w + d.h) * 2, d.w + d.h)!;
    this.build();
  }

  get w() { return this.d.w; }
  get h() { return this.d.h; }
  idx(x: number, y: number) { return y * this.d.w + x; }

  /** Проходимость клетки. */
  walkable = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= this.d.w || y >= this.d.h) return false;
    return this.d.solid[y * this.d.w + x] === 0;
  };

  /** Прозрачность для взгляда/снарядов: стены блокируют, пропсы — нет. */
  seeThrough = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= this.d.w || y >= this.d.h) return false;
    const t = this.d.tiles[y * this.d.w + x];
    return t === T_FLOOR || t === T_WATER;
  };

  /** Набор текстур пола и стен: у поверхности — пепельные, как у Пустошей. */
  private get tex() { return this.d.theme === 'surface' ? 'ashlands' : this.d.theme; }

  private build() {
    const { d } = this;
    const r = new RNG(d.seed);
    const th = d.theme;
    for (const p of d.props) if (p.type === 'dock') this.docks.add(this.idx(p.x, p.y));
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const t = d.tiles[this.idx(x, y)];
      if (t === T_FLOOR || t === T_HOUSE) this.makeFloor(x, y, r);
      else if (t === T_WATER) this.makeWater(x, y, r);
      else if (th === 'surface' && t === T_VOID) {
        // под лесом тоже земля, иначе между стволами видна чёрная пустота
        if (this.nearFloor(x, y, 4)) this.makeFloor(x, y, r);
        if (this.nearFloor(x, y) || (this.nearFloor(x, y, 2) && r.chance(0.55))) this.makeForest(x, y, r);
      }
      else if (t === T_CRACKED || this.nearFloor(x, y)) this.makeWall(x, y, t === T_CRACKED ? 9 : r.weighted([{ w: 10, v: 0 }, { w: 3, v: 1 }, { w: th === 'catacombs' ? 1.2 : th === 'surface' ? 2.5 : 0.4, v: 2 }, { w: 1.5, v: 3 }, { w: 2, v: 4 }]));
    }
    for (const p of d.props) this.makeProp(p, r);
  }

  /** Дерево поверхности из FLARE: больше мёртвых, меньше елей, осенних дубов и пепельных берёз. */
  private treeKey(r: RNG): string | null {
    const kind = r.weighted([{ w: 5, v: 'dead' }, { w: 3, v: 'pine' }, { w: 2, v: 'oak' }, { w: 1.5, v: 'ash' }]);
    const key = `sf_tree_${kind}_${r.int(0, 3)}`;
    return EXT_LOADED.has(key) ? key : null;
  }

  /** Картинка FLARE (ключ sf_*) с её точкой опоры. */
  private ext(key: string, x: number, y: number, depth: number) {
    const p = isoToScreen(x, y);
    const img = this.scene.add.image(p.x, p.y, key).setScale(SCALE).setOrigin(...(EXT_ORIGIN[key] ?? [0.5, 0.8])).setDepth(depth).setVisible(false);
    this.all.push(img);
    return img;
  }

  /** Вода: ромб пола FLARE и лёгкая рябь (медленно «дышит» прозрачностью). */
  private makeWater(x: number, y: number, r: RNG) {
    const key = `sf_water_${r.int(0, 3)}`;
    if (!EXT_LOADED.has(key)) { this.makeFloor(x, y, r); this.floor[this.idx(x, y)]?.setTint(0x405868); return; }
    const img = this.ext(key, x + 0.5, y + 0.5, FLOOR_DEPTH);
    this.floor[this.idx(x, y)] = img;
    if (r.chance(0.3)) this.scene.tweens.add({ targets: img, alpha: 0.82, yoyo: true, repeat: -1, duration: r.range(1600, 2600), delay: r.range(0, 2000), ease: 'Sine.easeInOut' });
  }

  /** Край поверхности: лес вместо стены. Дерево занимает место стены (прячется перед героем). */
  private makeForest(x: number, y: number, r: RNG) {
    if (this.d.felled?.has(this.idx(x, y))) { this.makeStump(x, y); return; }
    const p = isoToScreen(x + 0.5 + r.range(-0.2, 0.2), y + 0.5 + r.range(-0.2, 0.2));
    const fk = this.treeKey(r);
    const [ox, oy] = fk ? EXT_ORIGIN[fk] : PROP_ORIGIN.tree;
    const img = this.scene.add.image(p.x, p.y, fk ?? `tree_${r.int(0, 2)}`).setScale(SCALE * (fk ? r.range(0.75, 1.0) : r.range(0.85, 1.25))).setOrigin(ox, oy)
      .setFlipX(r.chance(0.5)).setTint(r.pick([0xffffff, 0xd8ccc0, 0xb8aca0])).setDepth(depthOf(x + 0.5, y + 0.5)).setVisible(false);
    this.walls[this.idx(x, y)] = img;
    this.forest.add(this.idx(x, y));
    this.all.push(img);
  }

  /** Пень на месте срубленного дерева края (без FLARE — ничего). */
  private makeStump(x: number, y: number) {
    const key = `sf_stump_${(x + y) % 2}`;
    if (EXT_LOADED.has(key)) this.walls[this.idx(x, y)] = this.ext(key, x + 0.5, y + 0.5, depthOf(x + 0.5, y + 0.5));
  }

  // ─── Стройка (systems/Building.ts) ──────────────────────────────
  /** Что можно добыть в клетке: дерево или камень. */
  resourceAt(x: number, y: number): 'tree' | 'rock' | null {
    if (x < 0 || y < 0 || x >= this.d.w || y >= this.d.h) return null;
    const i = this.idx(x, y);
    if (this.forest.has(i) && this.walls[i]) return 'tree';
    const e = this.propSprites.find(q => q.prop.x === x && q.prop.y === y && (q.prop.type === 'tree' || q.prop.type === 'rock'));
    return e ? (e.prop.type as 'tree' | 'rock') : null;
  }

  /** Короткая дрожь дерева или камня от удара. */
  shake(x: number, y: number) {
    const i = this.idx(x, y);
    const img = this.forest.has(i) ? this.walls[i] : this.propSprites.find(q => q.prop.x === x && q.prop.y === y)?.img;
    if (img) this.scene.tweens.add({ targets: img, x: img.x + 3, yoyo: true, duration: 45, repeat: 1 });
  }

  /** Дерево падает (остаётся пень), камень рассыпается. */
  fell(x: number, y: number) {
    const i = this.idx(x, y);
    const fade = (img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite) =>
      this.scene.tweens.add({ targets: img, alpha: 0, angle: img.flipX ? -12 : 12, duration: 500, onComplete: () => img.destroy() });
    if (this.forest.has(i) && this.walls[i]) {
      fade(this.walls[i]!); this.walls[i] = null; this.forest.delete(i);
      this.makeStump(x, y);
      (this.walls[i] as Phaser.GameObjects.Image | null)?.setVisible(true);
      return;
    }
    const k = this.propSprites.findIndex(q => q.prop.x === x && q.prop.y === y && (q.prop.type === 'tree' || q.prop.type === 'rock'));
    if (k < 0) return;
    const e = this.propSprites[k];
    fade(e.img);
    this.propSprites.splice(k, 1);
    if (e.prop.type === 'rock') { this.d.solid[i] = 0; this.d.props.splice(this.d.props.indexOf(e.prop), 1); return; }
    e.prop.type = 'stump'; e.prop.v = i % 2;
    this.makeProp(e.prop, this.rng);
    this.propSprites[this.propSprites.length - 1].img.setVisible(true);
  }

  /** Новая постройка игрока: картинки сразу видны. */
  addProp(p: Prop, cam: Phaser.Cameras.Scene2D.Camera) {
    this.makeProp(p, this.rng);
    this.cull(cam, true);
  }

  private nearFloor(x: number, y: number, k = 1) {
    for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= this.d.w || yy >= this.d.h) continue;
      const t = this.d.tiles[this.idx(xx, yy)];
      if (t === T_FLOOR || t === T_WATER || t === T_HOUSE) return true;
    }
    return false;
  }

  private makeFloor(x: number, y: number, r: RNG) {
    const p = isoToScreen(x + 0.5, y + 0.5);
    const v = r.weighted([{ w: 8, v: 0 }, { w: 3, v: 1 }, { w: 2, v: 2 }, { w: 1.5, v: 3 }, { w: 2, v: 4 }, { w: 1, v: 5 }]);
    const i = this.idx(x, y);
    if (this.docks.has(i) && EXT_LOADED.has('sf_water_0')) { this.makeWater(x, y, r); return; } // под мостками вода
    const road = this.d.road?.[i] && EXT_LOADED.has('sf_road_0');
    const ft = this.d.theme === 'surface' && this.scene.textures.exists(`floor_surface_${v}`) ? 'surface' : this.tex;
    const img = this.scene.add.image(p.x, p.y, road ? `sf_road_${r.int(0, 3)}` : `floor_${ft}_${v}`).setScale(SCALE).setDepth(FLOOR_DEPTH).setVisible(false);
    this.floor[this.idx(x, y)] = img;
    this.all.push(img);
  }

  private makeWall(x: number, y: number, v: number) {
    const p = isoToScreen(x + 0.5, y + 0.5);
    const key = `wall_${this.tex}_${v}`;
    const img = this.scene.add.image(p.x, p.y, key).setScale(SCALE).setOrigin(...(EXT_ORIGIN[key] && EXT_LOADED.has(key) ? EXT_ORIGIN[key] : [0.5, 144 / 176]))
      .setDepth(depthOf(x + 0.5, y + 0.5)).setVisible(false);
    this.walls[this.idx(x, y)] = img;
    this.all.push(img);
  }

  /** Дом или палатка: каждая часть FLARE в своей клетке, как стена (прозрачнеет перед героем). */
  private makeStruct(pr: Prop) {
    const st = STRUCTS[pr.v as string];
    for (const [dx, dy, tile] of st.parts) {
      const key = `sf_${String(pr.v).startsWith('tent') ? 'tent' : 'house'}_${tile}${pr.burnt ? '_burnt' : ''}`;
      if (!EXT_LOADED.has(key)) continue;
      const x = pr.x + dx, y = pr.y + dy;
      this.walls[this.idx(x, y)] = this.ext(key, x + 0.5, y + 0.5, depthOf(x + 0.5, y + 0.5));
    }
    if (pr.burnt) this.lights.push({ x: pr.x + 0.5, y: pr.y + 0.5, r: 2.4, color: 0xff5a10, flicker: 5, intensity: 0.6 });
  }

  private makeProp(pr: Prop, r: RNG) {
    if (pr.type === 'struct') { this.makeStruct(pr); return; }
    const p = isoToScreen(pr.x + 0.5, pr.y + 0.5);
    let key: string = pr.type, originKey: string = pr.type;
    // поверхность: картинки FLARE grassland, если загрузились
    const sf = (k: string) => { if (EXT_LOADED.has(k)) { key = k; originKey = k; } };
    if (pr.type === 'tree') { const k = this.treeKey(r); if (k) key = originKey = k; else key = `tree_${r.int(0, 2)}`; }
    else if (pr.type === 'grave') sf(`sf_grave_${r.int(0, 3)}`);
    else if (pr.type === 'campfire') { key = 'brazier'; originKey = 'brazier'; sf('sf_campfire'); }
    else if (pr.type === 'dock') sf(`sf_dock_${pr.v ?? 0}`);
    else if (['rock', 'stump', 'crate', 'logs', 'fence', 'sign', 'anvil', 'stone', 'bush', 'tuft', 'reed'].includes(pr.type)) {
      sf(`sf_${pr.type}_${pr.v ?? 0}`);
      if (key === pr.type) { key = 'decal_rubble'; originKey = 'decal'; } // без FLARE — просто обломки
    }
    if (pr.type === 'pillar') key = `pillar_${this.tex}`;
    if (pr.type === 'chest') key = pr.elite || pr.secret ? 'chest_elite' : 'chest';
    if (['bones', 'puddle', 'rubble', 'blood', 'ashpile'].includes(pr.type)) { key = `decal_${pr.type}`; originKey = 'decal'; }
    const decal = originKey === 'decal';
    const [ox, oy] = (EXT_LOADED.has(key) && EXT_ORIGIN[key]) || PROP_ORIGIN[originKey] || [0.5, 0.8];
    const img = this.scene.add.image(p.x + (decal ? r.range(-10, 10) : 0), p.y + (decal ? r.range(-4, 4) : 0), key)
      .setScale(SCALE * (decal ? r.range(0.7, 1.1) : 1)).setOrigin(ox, oy)
      .setDepth(decal ? FLOOR_DEPTH + 1 : depthOf(pr.x + 0.5, pr.y + 0.5)).setVisible(false);
    if (decal && r.chance(0.5)) img.setFlipX(true);
    if (['tree', 'tuft', 'reed', 'bush', 'cart', 'banner'].includes(pr.type) && r.chance(0.5)) img.setFlipX(true);
    if (pr.type === 'tree' && key.startsWith('sf_')) img.setScale(SCALE * r.range(0.75, 0.95));
    if (pr.type === 'dock') img.setDepth(FLOOR_DEPTH + 2); // настил — часть пола, по нему ходят
    const entry: Level['propSprites'][number] = { prop: pr, img };
    if (pr.type === 'brazier' || pr.type === 'campfire') {
      entry.flame = this.scene.add.sprite(p.x, p.y - (pr.type === 'campfire' && key.startsWith('sf_') ? 8 : 26), 'flame').setScale(0.42).setOrigin(0.5, 0.92).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depthOf(pr.x + 0.5, pr.y + 0.5) + 1).setVisible(false);
      entry.flame.play({ key: 'flame', startFrame: r.int(0, 3) });
      this.all.push(entry.flame);
      this.lights.push({ x: pr.x + 0.5, y: pr.y + 0.5, r: 4.6, color: 0xff7a2a, flicker: r.range(0, 10), intensity: 1 });
    }
    if (pr.type === 'crystal') this.lights.push({ x: pr.x + 0.5, y: pr.y + 0.5, r: 3.2, color: 0x3fe0c4, flicker: -1, intensity: 0.8 });
    if (pr.type === 'altar') this.lights.push({ x: pr.x + 0.5, y: pr.y + 0.5, r: 4, color: 0xff6a20, flicker: 3, intensity: 0.9 });
    if (pr.type === 'tree' || pr.type === 'cart') {
      // тлеющие угли у руин пустошей — немного света в пустоте
      if (r.chance(0.25)) this.lights.push({ x: pr.x + 0.5, y: pr.y + 0.5, r: 2.2, color: 0xff5a10, flicker: r.range(0, 10), intensity: 0.6 });
    }
    this.propSprites.push(entry);
    this.all.push(img);
  }

  /** Открыть клетки вокруг героя. Возвращает true, если появились новые. */
  reveal(hx: number, hy: number, radius: number): boolean {
    const { d } = this;
    let any = false;
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.floor(hx - radius)), x1 = Math.min(d.w - 1, Math.ceil(hx + radius));
    const y0 = Math.max(0, Math.floor(hy - radius)), y1 = Math.min(d.h - 1, Math.ceil(hy + radius));
    const ctx = this.minimap.getContext();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = this.idx(x, y);
      if (this.explored[i]) continue;
      if ((x + 0.5 - hx) ** 2 + (y + 0.5 - hy) ** 2 > r2) continue;
      this.explored[i] = 1; any = true;
      // мини-карта в той же изометрии: ромб 4×2 пикселя на клетку
      const mx = (x - y) * 2 + d.h * 2, my = (x + y);
      const t = d.tiles[i];
      if (t === T_FLOOR) ctx.fillStyle = d.theme === 'catacombs' ? '#5a5668' : d.theme === 'surface' ? (d.road?.[i] ? '#a89070' : '#7a6c4c') : '#7a6250';
      else if (t === T_WATER) ctx.fillStyle = '#3e6a80';
      else if (t === T_HOUSE) ctx.fillStyle = '#b08458';
      else if (this.walls[i]) ctx.fillStyle = t === T_CRACKED ? '#d8783a' : d.theme === 'surface' && t === T_VOID ? '#3a4a34' : '#c8b49a';
      else continue;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 2, my + 1); ctx.lineTo(mx, my + 2); ctx.lineTo(mx - 2, my + 1); ctx.closePath(); ctx.fill();
    }
    if (any) this.minimapDirty = true;
    return any;
  }

  /** Показывать только открытые объекты в пределах камеры (дешёвое отсечение). */
  cull(cam: Phaser.Cameras.Scene2D.Camera, force = false) {
    if (!force && (this.cullTick++ % 6) !== 0) return;
    const v = cam.worldView;
    const mx = 140, my = 180;
    const L = v.x - mx, R = v.right + mx, T = v.y - my, B = v.bottom + my;
    const test = (img: Phaser.GameObjects.Image | null, i: number) => {
      if (!img) return;
      const vis = this.explored[i] === 1 && img.x > L && img.x < R && img.y > T && img.y < B;
      if (img.visible !== vis) img.setVisible(vis);
    };
    // проверяем только клетки в ромбе камеры и те, что были видны в прошлый раз (поверхность 160×160 — это 25 тыс. картинок)
    const cs = [screenToIso(L, T), screenToIso(R, T), screenToIso(L, B), screenToIso(R, B)];
    const x0 = Math.max(0, Math.floor(Math.min(...cs.map(c => c.x))) - 2), x1 = Math.min(this.d.w - 1, Math.ceil(Math.max(...cs.map(c => c.x))) + 2);
    const y0 = Math.max(0, Math.floor(Math.min(...cs.map(c => c.y))) - 2), y1 = Math.min(this.d.h - 1, Math.ceil(Math.max(...cs.map(c => c.y))) + 2);
    const prev = this.shown, next: number[] = [];
    if (force) for (let i = 0; i < this.floor.length; i++) { test(this.floor[i], i); test(this.walls[i], i); }
    else for (const i of prev) { test(this.floor[i], i); test(this.walls[i], i); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * this.d.w + x; test(this.floor[i], i); test(this.walls[i], i); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * this.d.w + x; if (this.floor[i]?.visible || this.walls[i]?.visible) next.push(i); }
    this.shown = next;
    for (const e of this.propSprites) {
      const i = this.idx(e.prop.x, e.prop.y);
      const vis = this.explored[i] === 1 && e.img.x > L && e.img.x < R && e.img.y > T && e.img.y < B;
      e.img.setVisible(vis);
      e.flame?.setVisible(vis);
    }
  }

  /** Стены, закрывающие героя, становятся полупрозрачными. */
  fadeWalls(hx: number, hy: number) {
    for (const img of this.faded) img.setAlpha(1);
    this.faded.length = 0;
    const tx = Math.floor(hx), ty = Math.floor(hy);
    for (let dy = 0; dy <= 3; dy++) for (let dx = 0; dx <= 3; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = tx + dx, y = ty + dy;
      if (x >= this.d.w || y >= this.d.h) continue;
      const w = this.walls[this.idx(x, y)];
      // только стены «перед» героем на экране и не слишком сбоку
      if (w && Math.abs(dx - dy) <= 2 && dx + dy <= 4) { w.setAlpha(0.32); this.faded.push(w); }
    }
    for (const e of this.propSprites) {
      if (e.prop.type !== 'pillar' && e.prop.type !== 'tree') continue;
      const dx = e.prop.x - tx, dy = e.prop.y - ty;
      const near = dx >= 0 && dy >= 0 && dx + dy <= 3 && dx + dy > 0;
      e.img.setAlpha(near ? 0.4 : 1);
    }
  }

  /** Удар по трещиноватой стене. Возвращает true, если стена рухнула. */
  hitCracked(tx: number, ty: number): boolean {
    const i = this.idx(tx, ty);
    if (this.d.tiles[i] !== T_CRACKED) return false;
    const hp = (this.crackedHp.get(i) ?? 3) - 1;
    this.crackedHp.set(i, hp);
    const w = this.walls[i];
    if (w) this.scene.tweens.add({ targets: w, x: w.x + 3, yoyo: true, duration: 50, repeat: 1 });
    if (hp > 0) return false;
    // стена рушится: пол + завал + новые стены вокруг открывшейся клетки
    this.d.tiles[i] = T_FLOOR; this.d.solid[i] = 0;
    w?.destroy(); this.walls[i] = null;
    const r = new RNG(i);
    this.makeFloor(tx, ty, r);
    const p = isoToScreen(tx + 0.5, ty + 0.5);
    this.all.push(this.scene.add.image(p.x, p.y, 'decal_rubblewall').setScale(SCALE).setDepth(FLOOR_DEPTH + 1));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = tx + dx, y = ty + dy, j = this.idx(x, y);
      if (this.d.tiles[j] === T_VOID && !this.walls[j]) this.makeWall(x, y, 0);
    }
    this.explored[i] = 0;
    return true;
  }

  isCracked(tx: number, ty: number) { return this.d.tiles[this.idx(tx, ty)] === T_CRACKED; }

  refreshMinimap() {
    if (this.minimapDirty) { this.minimap.refresh(); this.minimapDirty = false; }
  }

  destroy() {
    for (const o of this.all) o.destroy();
    this.all.length = 0;
    this.propSprites.length = 0;
  }
}
