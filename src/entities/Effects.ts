// Наземные эффекты (индикаторы атак, взрывы, огненные лужи, кольца, ловушки),
// снаряды, призванные духи и предметы на земле.
import Phaser from 'phaser';
import { isoToScreen, isoEllipse, depthOf, dist } from '../core/iso';
import { FONT } from '../config';
import { RARITIES } from '../data/items';
import { settings } from '../systems/Settings';
import type { Item } from '../systems/Loot';
import type { HitOpts, DmgKind } from '../systems/Combat';
import type { Enemy } from './Enemy';
import type { Faction } from './Actor';

// ─── Наземные эффекты ────────────────────────────────────────────
export type GroundKind = 'circle' | 'cone' | 'line' | 'ring' | 'patch' | 'trap';

export interface GroundEffect {
  kind: GroundKind;
  faction: Faction;          // чья атака: враг бьёт героя, герой — врагов
  owner?: Enemy;             // для снятия индикатора при оглушении/смерти
  x: number; y: number;
  radius: number;
  t: number;                 // прошедшее время
  delay: number;             // до срабатывания
  duration: number;          // для луж/ловушек
  dmg: number;               // урон (враг) или множитель (герой)
  dmgKind: DmgKind;
  dirx: number; diry: number; arc: number; // конус
  ex: number; ey: number; width: number;   // линия
  color: number;
  opts?: HitOpts;
  done: boolean;
  tickT: number;
  hitOnce?: boolean;         // кольцо: бьёт один раз
  armed?: boolean;
  onBoom?: (g: GroundEffect) => void;
}

export function makeGround(o: Partial<GroundEffect> & { kind: GroundKind; faction: Faction; x: number; y: number }): GroundEffect {
  return {
    radius: 1, t: 0, delay: 1, duration: 0, dmg: 0, dmgKind: 'phys', dirx: 1, diry: 0, arc: 90, ex: 0, ey: 0, width: 1,
    color: o.faction === 'enemy' ? 0xff3a2a : 0xff8a3a, done: false, tickT: 0, ...o,
  };
}

/** Отрисовка индикаторов: контур + заполнение по мере приближения удара. */
export function drawGround(g: Phaser.GameObjects.Graphics, e: GroundEffect, now: number) {
  const k = Math.min(1, e.t / Math.max(0.001, e.delay));
  const col = settings.colorblind && e.faction === 'enemy' ? 0xffe14a : e.color;
  const c = isoToScreen(e.x, e.y);
  switch (e.kind) {
    case 'circle': {
      const { rx, ry } = isoEllipse(e.radius);
      g.lineStyle(2, col, 0.85); g.strokeEllipse(c.x, c.y, rx * 2, ry * 2);
      g.fillStyle(col, 0.12); g.fillEllipse(c.x, c.y, rx * 2, ry * 2);
      g.fillStyle(col, 0.28); g.fillEllipse(c.x, c.y, rx * 2 * k, ry * 2 * k);
      break;
    }
    case 'cone': {
      const pts = conePoints(e.x, e.y, e.dirx, e.diry, e.radius, e.arc, 1);
      const inner = conePoints(e.x, e.y, e.dirx, e.diry, e.radius * k, e.arc, 1);
      g.fillStyle(col, 0.12); g.fillPoints(pts, true);
      g.fillStyle(col, 0.3); g.fillPoints(inner, true);
      g.lineStyle(2, col, 0.8); g.strokePoints(pts, true);
      break;
    }
    case 'line': {
      const dx = e.ex - e.x, dy = e.ey - e.y, l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l * e.width / 2, ny = dx / l * e.width / 2;
      const P = (x: number, y: number) => { const s = isoToScreen(x, y); return new Phaser.Math.Vector2(s.x, s.y); };
      const pts = [P(e.x + nx, e.y + ny), P(e.ex + nx, e.ey + ny), P(e.ex - nx, e.ey - ny), P(e.x - nx, e.y - ny)];
      const mx = e.x + dx * k, my = e.y + dy * k;
      const ipts = [P(e.x + nx, e.y + ny), P(mx + nx, my + ny), P(mx - nx, my - ny), P(e.x - nx, e.y - ny)];
      g.fillStyle(col, 0.12); g.fillPoints(pts, true);
      g.fillStyle(col, 0.3); g.fillPoints(ipts, true);
      g.lineStyle(2, col, 0.75); g.strokePoints(pts, true);
      break;
    }
    case 'ring': {
      const R = e.radius * Math.min(1, e.t / e.delay);
      const { rx, ry } = isoEllipse(R);
      g.lineStyle(10, 0x0a0206, 0.7); g.strokeEllipse(c.x, c.y, rx * 2, ry * 2);
      g.lineStyle(5, col, 0.95); g.strokeEllipse(c.x, c.y, rx * 2, ry * 2);
      const { rx: mx, ry: my } = isoEllipse(e.radius);
      g.lineStyle(1, col, 0.35); g.strokeEllipse(c.x, c.y, mx * 2, my * 2);
      break;
    }
    case 'patch': {
      const { rx, ry } = isoEllipse(e.radius);
      const fade = Math.min(1, (e.duration - e.t) / 0.5);
      const pulse = 0.75 + Math.sin(now / 120 + e.x) * 0.25;
      g.fillStyle(e.faction === 'enemy' ? 0xff4a10 : 0xff8a3a, 0.22 * fade * pulse); g.fillEllipse(c.x, c.y, rx * 2, ry * 2);
      g.lineStyle(1.5, 0xffa040, 0.5 * fade); g.strokeEllipse(c.x, c.y, rx * 2, ry * 2);
      break;
    }
    case 'trap': {
      const { rx, ry } = isoEllipse(0.55);
      const a = e.armed ? 0.9 : 0.4;
      g.lineStyle(2, 0x9a6bff, a); g.strokeEllipse(c.x, c.y, rx * 2, ry * 2);
      for (let i = 0; i < 6; i++) {
        const ang = i / 6 * Math.PI * 2 + now / 600;
        g.fillStyle(0xc8a8ff, a); g.fillCircle(c.x + Math.cos(ang) * rx, c.y + Math.sin(ang) * ry, 2);
      }
      const { rx: Rx, ry: Ry } = isoEllipse(e.radius);
      g.lineStyle(1, 0x9a6bff, 0.18); g.strokeEllipse(c.x, c.y, Rx * 2, Ry * 2);
      break;
    }
  }
}

export function conePoints(x: number, y: number, dx: number, dy: number, r: number, arcDeg: number, _k: number) {
  const a0 = Math.atan2(dy, dx), half = arcDeg / 2 * Math.PI / 180;
  const pts: Phaser.Math.Vector2[] = [];
  const s0 = isoToScreen(x, y); pts.push(new Phaser.Math.Vector2(s0.x, s0.y));
  for (let i = 0; i <= 12; i++) {
    const a = a0 - half + (i / 12) * half * 2;
    const s = isoToScreen(x + Math.cos(a) * r, y + Math.sin(a) * r);
    pts.push(new Phaser.Math.Vector2(s.x, s.y));
  }
  return pts;
}

/** Точка (px,py) внутри конуса? */
export function inCone(x: number, y: number, dx: number, dy: number, r: number, arcDeg: number, px: number, py: number, pr = 0) {
  const vx = px - x, vy = py - y, d = Math.hypot(vx, vy);
  if (d > r + pr) return false;
  if (d < 0.3) return true;
  const l = Math.hypot(dx, dy) || 1;
  return (vx * dx + vy * dy) / (d * l) >= Math.cos(arcDeg / 2 * Math.PI / 180);
}

// ─── Снаряды ─────────────────────────────────────────────────────
export interface Projectile {
  faction: Faction;
  x: number; y: number; vx: number; vy: number;
  life: number;
  radius: number;
  dmg: number;            // враг: урон; герой: множитель
  kind: DmgKind;
  pierce: number;
  explode: number;        // радиус взрыва (0 — нет)
  opts: HitOpts;
  hitSet: Set<Enemy>;
  sprite: Phaser.GameObjects.Image;
  light: number;          // цвет света
  height: number;
  onHit?: () => void;
  gain?: number;
}

export function makeProjectileSprite(scene: Phaser.Scene, tex: string, vx: number, vy: number, scale = 0.5) {
  const s = scene.add.image(0, 0, tex).setScale(scale).setOrigin(0.75, 0.5);
  if (tex !== 'proj_arrow' && tex !== 'proj_dagger') s.setBlendMode(Phaser.BlendModes.ADD);
  const sd = { x: vx - vy, y: (vx + vy) / 2 };
  s.setRotation(Math.atan2(sd.y, sd.x));
  return s;
}

export function syncProjectile(p: Projectile) {
  const s = isoToScreen(p.x, p.y);
  p.sprite.setPosition(s.x, s.y - p.height).setDepth(depthOf(p.x, p.y) + 2);
}

// ─── Духи ведьмы ─────────────────────────────────────────────────
export interface Wisp { sprite: Phaser.GameObjects.Image; t: number; life: number; phase: number; x: number; y: number; cd: number }

// ─── Предметы на земле ───────────────────────────────────────────
export interface GroundLoot {
  x: number; y: number;
  item?: Item;
  gold?: number;
  shards?: number;
  potion?: boolean;
  icon: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  beam?: Phaser.GameObjects.Image;
  t: number;
}

export function makeGroundLoot(scene: Phaser.Scene, x: number, y: number, o: { item?: Item; gold?: number; shards?: number; potion?: boolean }): GroundLoot {
  const p = isoToScreen(x, y);
  const key = o.item ? o.item.icon : o.gold ? 'it_gold' : o.shards ? 'it_shard' : 'it_potion';
  const icon = scene.add.image(p.x, p.y - 6, key).setScale(o.item ? 0.36 : 0.3).setDepth(depthOf(x, y)).setRotation(o.item ? -0.6 : 0);
  const gl: GroundLoot = { x, y, ...o, icon, t: 0 };
  if (o.item) {
    const R = RARITIES[o.item.rarity];
    const col = settings.colorblind ? R.cbColor : R.color;
    const text = (settings.colorblind ? R.symbol + ' ' : '') + o.item.name;
    gl.label = scene.add.text(p.x, p.y - 26, text, {
      fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#' + col.toString(16).padStart(6, '0'),
      backgroundColor: 'rgba(8,5,6,0.78)', padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1).setDepth(940000);
    if (o.item.rarity >= 2) {
      gl.beam = scene.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(col).setScale(0.35, 1.6).setOrigin(0.5, 0.92).setAlpha(0.55).setDepth(depthOf(x, y) - 1);
    }
  }
  // выпадение «прыжком»
  scene.tweens.add({ targets: icon, y: { from: p.y - 40, to: p.y - 6 }, duration: 380, ease: 'Bounce.easeOut' });
  return gl;
}

export function destroyLoot(l: GroundLoot) { l.icon.destroy(); l.label?.destroy(); l.beam?.destroy(); }

export { dist };
