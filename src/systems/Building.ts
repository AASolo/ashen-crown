// Стройка на поверхности: рубка деревьев и добыча камня, режим постройки с «призраком» на сетке.
// Вырубки и постройки хранятся в HeroData: поверхность каждый раз генерируется из того же seed,
// поэтому клетки совпадают, и сохранённые правки просто накладываются на свежую карту.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { STRUCTS, T_FLOOR, T_HOUSE, type Dungeon, type Prop } from '../world/DungeonGen';
import { isoToScreen, screenToIso, depthOf, dist } from '../core/iso';
import { EXT_LOADED, EXT_ORIGIN } from '../art/external';
import { ART } from '../config';
import { Sfx } from '../core/Sfx';
import { bus, EV } from '../core/events';
import type { HeroData } from './HeroData';

export interface Recipe {
  id: string; name: string; desc: string; wood: number; stone: number;
  type: 'fence' | 'crate' | 'campfire' | 'struct';
  v?: string;     // ключ STRUCTS для домов и палаток
  key: string;    // картинка для призрака и списка
}

export const RECIPES: Recipe[] = [
  { id: 'fence', name: 'Забор', desc: 'Ограда вокруг лагеря', wood: 2, stone: 0, type: 'fence', key: 'sf_fence_0' },
  { id: 'crate', name: 'Ящик с припасами', desc: 'Запас для беженцев', wood: 3, stone: 0, type: 'crate', key: 'sf_crate_0' },
  { id: 'campfire', name: 'Костёр', desc: 'Свет и тепло, тени держатся подальше', wood: 3, stone: 2, type: 'campfire', key: 'sf_campfire' },
  { id: 'tent', name: 'Палатка', desc: 'Ночлег для двоих', wood: 8, stone: 0, type: 'struct', v: 'tent_a', key: 'sf_tent_72' },
  { id: 'house', name: 'Сруб', desc: 'Дом для семьи беженцев', wood: 20, stone: 6, type: 'struct', v: 'house_a', key: 'sf_house_209' },
  { id: 'hall', name: 'Большой сруб', desc: 'Общий дом лагеря', wood: 26, stone: 10, type: 'struct', v: 'house_b', key: 'sf_house_214' },
];

export interface Build { r: string; x: number; y: number }

/** Сколько ударов нужно и что выпадает. */
const YIELD = { tree: { hits: 3, wood: 3, stone: 0 }, rock: { hits: 4, wood: 0, stone: 2 } } as const;
export type ResKind = keyof typeof YIELD;

/** Клетки основания постройки. */
export function footprint(r: Recipe, x: number, y: number): [number, number][] {
  if (r.type !== 'struct') return [[x, y]];
  const [x0, y0, x1, y1] = STRUCTS[r.v!].foot;
  const out: [number, number][] = [];
  for (let yy = y + y0; yy <= y + y1; yy++) for (let xx = x + x0; xx <= x + x1; xx++) out.push([xx, yy]);
  return out;
}

/** Поставить постройку в данные этажа (клетки становятся непроходимыми). */
function place(d: Dungeon, r: Recipe, x: number, y: number): Prop {
  for (const [xx, yy] of footprint(r, x, y)) {
    const i = yy * d.w + xx;
    if (r.type === 'struct') d.tiles[i] = T_HOUSE;
    d.solid[i] = 1;
  }
  const p: Prop = r.type === 'struct' ? { type: 'struct', x, y, solid: true, v: r.v } : { type: r.type, x, y, solid: true, v: 0 };
  d.props.push(p);
  return p;
}

/** Наложить сохранённые вырубки и постройки на свежесгенерированную поверхность (до создания Level). */
export function applySurfaceEdits(d: Dungeon, D: HeroData) {
  if ((D.surfW ?? 84) !== d.w) migrateSurface(d, D);
  d.felled = new Set(D.felled ?? []);
  for (const p of [...d.props]) {
    const i = p.y * d.w + p.x;
    if (!d.felled.has(i)) continue;
    if (p.type === 'tree') { p.type = 'stump'; p.v = i % 2; }
    else if (p.type === 'rock') { d.props.splice(d.props.indexOf(p), 1); d.solid[i] = 0; }
  }
  for (const b of D.builds ?? []) {
    const r = RECIPES.find(q => q.id === b.r);
    if (r && footprint(r, b.x, b.y).every(([x, y]) => x > 0 && y > 0 && x < d.w - 1 && y < d.h - 1 && d.tiles[y * d.w + x] === T_FLOOR)) place(d, r, b.x, b.y);
  }
}

/** Сохранение со старой картой 84×84: постройки переезжают вслед за лагерем, вырубки сбрасываются
 *  (лес вырос заново). Что не встало ни в одну клетку рядом, возвращается материалами. */
function migrateSurface(d: Dungeon, D: HeroData) {
  const C = d.poi?.camp ?? d.start, ox = C.x - 26, oy = C.y - 47; // 26,47 — центр лагеря на старой карте
  const taken = new Set<number>();
  const fits = (r: Recipe, x: number, y: number) => footprint(r, x, y).every(([fx, fy]) => {
    const i = fy * d.w + fx;
    return fx > 1 && fy > 1 && fx < d.w - 2 && fy < d.h - 2 && d.tiles[i] === T_FLOOR && !d.solid[i] && !d.road?.[i] && !taken.has(i);
  });
  const kept: { r: string; x: number; y: number }[] = [];
  let wood = 0, stone = 0;
  for (const b of D.builds ?? []) {
    const r = RECIPES.find(q => q.id === b.r);
    if (!r) continue;
    let spot: [number, number] | null = null;
    for (let rad = 0; rad <= 6 && !spot; rad++)
      for (let dy = -rad; dy <= rad && !spot; dy++) for (let dx = -rad; dx <= rad && !spot; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === rad && fits(r, b.x + ox + dx, b.y + oy + dy)) spot = [b.x + ox + dx, b.y + oy + dy];
    if (!spot) { wood += r.wood; stone += r.stone; continue; }
    for (const [fx, fy] of footprint(r, spot[0], spot[1])) taken.add(fy * d.w + fx);
    kept.push({ r: b.r, x: spot[0], y: spot[1] });
  }
  D.builds = kept; D.felled = []; D.surfW = d.w;
  D.wood = (D.wood ?? 0) + wood; D.stone = (D.stone ?? 0) + stone;
}

export class BuildSystem {
  active: Recipe | null = null;
  private ghost: Phaser.GameObjects.Image[] = [];
  private gx = -1; private gy = -1; private ok = false;
  job: { x: number; y: number; kind: ResKind; hits: number; t: number } | null = null;

  constructor(private gs: GameScene) {}

  get D() { return this.gs.heroData; }
  get onSurface() { return this.gs.heroData.depth === 0; }
  canAfford(r: Recipe) { return (this.D.wood ?? 0) >= r.wood && (this.D.stone ?? 0) >= r.stone; }

  /** Войти в режим постройки выбранного рецепта. */
  start(id: string) {
    const r = RECIPES.find(q => q.id === id);
    if (!r || !this.onSurface) return;
    this.cancel();
    this.active = r;
    this.job = null; this.gs.hero.stop();
    const S = 1 / ART;
    const parts: [number, number, string][] = r.type === 'struct'
      ? STRUCTS[r.v!].parts.map(([dx, dy, t]) => [dx, dy, `sf_${r.v!.startsWith('tent') ? 'tent' : 'house'}_${t}`])
      : [[0, 0, r.key]];
    for (const [dx, dy, key] of parts) {
      if (!EXT_LOADED.has(key)) continue;
      const img = this.gs.add.image(0, 0, key).setScale(S).setOrigin(...(EXT_ORIGIN[key] ?? [0.5, 0.8])).setAlpha(0.65).setDepth(900000);
      img.setData('d', [dx, dy]);
      this.ghost.push(img);
    }
    bus.emit(EV.TOAST, `${r.name}: клик — построить, правый клик или Esc — отмена`, '#e8d4b0', 3200);
  }

  cancel() {
    for (const g of this.ghost) g.destroy();
    this.ghost = []; this.active = null; this.gx = this.gy = -1;
  }

  /** Можно ли поставить постройку в клетку: пол, не занято, рядом нет героя, жителей и врагов. */
  private valid(r: Recipe, x: number, y: number) {
    const d = this.gs.level.d;
    const docks = new Set(d.props.filter(p => p.type === 'dock').map(p => p.y * d.w + p.x));
    const actors = [this.gs.hero, ...this.gs.npcs, ...this.gs.enemies.filter(e => e.alive)];
    return footprint(r, x, y).every(([xx, yy]) => {
      if (xx < 1 || yy < 1 || xx >= d.w - 1 || yy >= d.h - 1) return false;
      const i = yy * d.w + xx;
      if (d.tiles[i] !== T_FLOOR || d.solid[i] || docks.has(i)) return false;
      return actors.every(a => dist(a.x, a.y, xx + 0.5, yy + 0.5) > 0.9);
    });
  }

  /** Клик в режиме постройки: поставить, если можно. */
  click(wx: number, wy: number) {
    const r = this.active;
    if (!r) return;
    const x = Math.floor(wx), y = Math.floor(wy);
    if (!this.valid(r, x, y)) { Sfx.play('ui'); bus.emit(EV.TOAST, 'Здесь строить нельзя', '#ff8a6a', 1400); return; }
    if (!this.canAfford(r)) { bus.emit(EV.TOAST, `Не хватает: нужно дерево ${r.wood}, камень ${r.stone}`, '#ff8a6a', 2000); this.cancel(); return; }
    const D = this.D;
    D.wood = (D.wood ?? 0) - r.wood; D.stone = (D.stone ?? 0) - r.stone;
    (D.builds ??= []).push({ r: r.id, x, y });
    const p = place(this.gs.level.d, r, x, y);
    this.gs.level.addProp(p, this.gs.cameras.main);
    this.gs.fx.burstArea('ash', x + 0.5, y + 0.5, 1.2, 18);
    Sfx.play('chest');
    bus.emit(EV.TOAST, r.type === 'struct' ? `Построено: ${r.name}. Лагерь растёт.` : `Построено: ${r.name}`, '#ffd88a', 1800);
    bus.emit(EV.INVENTORY);
    this.gs.save();
    // заборы и ящики удобно ставить подряд; дом — по одному
    if (r.type === 'struct' || !this.canAfford(r)) this.cancel();
  }

  /** Дерево или камень под курсором (мировые координаты). */
  pick(wx: number, wy: number): { x: number; y: number; kind: ResKind } | null {
    if (!this.onSurface) return null;
    const cx = Math.floor(wx), cy = Math.floor(wy);
    let best: { x: number; y: number; kind: ResKind } | null = null, bd = 0.95;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      const kind = this.gs.level.resourceAt(x, y);
      if (!kind) continue;
      const dd = dist(wx, wy, x + 0.5, y + 0.5);
      if (dd < bd) { bd = dd; best = { x, y, kind }; }
    }
    return best;
  }

  /** Подойти к дереву или камню и начать работу. */
  startJob(t: { x: number; y: number; kind: ResKind }) {
    const h = this.gs.hero;
    h.target = null;
    this.job = { ...t, hits: 0, t: 0.15 };
    if (dist(h.x, h.y, t.x + 0.5, t.y + 0.5) > 1.5) {
      // ближайшая проходимая соседняя клетка
      let bx = t.x, by = t.y + 1, bd = 1e9;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const x = t.x + dx, y = t.y + dy;
        if (!this.gs.level.walkable(x, y)) continue;
        const dd = dist(h.x, h.y, x + 0.5, y + 0.5);
        if (dd < bd) { bd = dd; bx = x; by = y; }
      }
      if (!h.goTo(bx + 0.5, by + 0.5)) { this.job = null; bus.emit(EV.TOAST, 'Не подойти', '#ff8a6a', 1200); }
    }
  }

  update(dt: number) {
    if (this.active) {
      const p = this.gs.input.activePointer;
      const w = this.gs.cameras.main.getWorldPoint(p.x, p.y);
      const iso = screenToIso(w.x, w.y);
      const x = Math.floor(iso.x), y = Math.floor(iso.y);
      if (x !== this.gx || y !== this.gy) {
        this.gx = x; this.gy = y;
        this.ok = this.valid(this.active, x, y) && this.canAfford(this.active);
        for (const g of this.ghost) {
          const [dx, dy] = g.getData('d') as [number, number];
          const s = isoToScreen(x + dx + 0.5, y + dy + 0.5);
          g.setPosition(s.x, s.y).setDepth(depthOf(x + dx + 0.5, y + dy + 0.5) + 0.6).setTint(this.ok ? 0x9cff9c : 0xff7a6a);
        }
      }
    }
    const j = this.job, h = this.gs.hero;
    if (!j || !h.alive) return;
    const cx = j.x + 0.5, cy = j.y + 0.5;
    if (dist(h.x, h.y, cx, cy) > 1.6) { if (!h.path) this.job = null; return; }
    h.path = null;
    j.t -= dt;
    if (j.t > 0) return;
    j.t = 0.6;
    h.face(cx - h.x, cy - h.y);
    h.act('attack', 0.35);
    j.hits++;
    this.gs.level.shake(j.x, j.y);
    this.gs.fx.burst(j.kind === 'tree' ? 'ash' : 'bone', cx, cy, 6, 30);
    Sfx.play(j.kind === 'tree' ? 'hit' : 'wall');
    const Y = YIELD[j.kind];
    if (j.hits < Y.hits) return;
    this.job = null;
    const d = this.gs.level.d, i = j.y * d.w + j.x;
    this.gs.level.fell(j.x, j.y);
    const D = this.D;
    D.wood = (D.wood ?? 0) + Y.wood; D.stone = (D.stone ?? 0) + Y.stone;
    (D.felled ??= []).push(i);
    bus.emit(EV.TOAST, Y.wood ? `+${Y.wood} дерева` : `+${Y.stone} камня`, '#e8c890', 1200);
    bus.emit(EV.INVENTORY);
    this.gs.save();
  }
}
