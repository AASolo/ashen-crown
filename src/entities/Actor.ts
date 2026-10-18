// Базовый «актёр»: позиция в мире, спрайт с 4 изометрическими направлениями, тень,
// здоровье, статусы (кровотечение, поджог, оглушение, замедление, обездвиживание),
// движение со скольжением вдоль стен.
import Phaser from 'phaser';
import { ART } from '../config';
import { isoToScreen, depthOf, dirToScreen } from '../core/iso';
import { SHEETS } from '../art';
import type { GameScene } from '../scenes/GameScene';

export type Faction = 'hero' | 'enemy';
export type AnimName = 'idle' | 'walk' | 'attack' | 'cast' | 'hit' | 'death';

export interface Statuses {
  bleed: { t: number; dps: number };
  burn: { t: number; dps: number };
  stun: number;
  root: number;
  slow: { t: number; k: number };
}

export abstract class Actor {
  x: number; y: number;
  radius = 0.3;
  hp = 1; maxHp = 1;
  alive = true;
  abstract faction: Faction;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  side: 'S' | 'N' = 'S';
  flip = false;
  anim: AnimName = 'idle';
  animLock = 0;           // пока > 0, анимацию атаки/каста не прерывает ходьба
  st: Statuses = { bleed: { t: 0, dps: 0 }, burn: { t: 0, dps: 0 }, stun: 0, root: 0, slow: { t: 0, k: 0 } };
  baseScale = 1 / ART;
  heightPx = 60;          // высота «тела» для цифр урона и хит-тестов
  protected flashT = 0;

  constructor(public scene: GameScene, public sheet: string, x: number, y: number) {
    this.x = x; this.y = y;
    const info = SHEETS[sheet];
    this.baseScale /= info.scale ?? 1;
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(-99980);
    this.sprite = scene.add.sprite(0, 0, sheet, 0).setOrigin(0.5, info.footY / info.fh).setScale(this.baseScale);
    this.play('idle');
    this.sync();
  }

  get stunned() { return this.st.stun > 0; }

  /** Повернуть спрайт по мировому направлению. */
  face(dx: number, dy: number) {
    if (Math.abs(dx) + Math.abs(dy) < 1e-4) return;
    const s = dirToScreen(dx, dy);
    const side = s.y < 0 ? 'N' : 'S';
    const flip = s.x < 0;
    if (side !== this.side || flip !== this.flip) {
      this.side = side; this.flip = flip;
      this.sprite.setFlipX(flip);
      this.play(this.anim, true);
    }
  }

  play(a: AnimName, restart = false) {
    if (!this.alive && a !== 'death') return;
    const key = `${this.sheet}_${a}_${this.side}`;
    const cur = this.sprite.anims.currentAnim?.key;
    if (cur === key && !restart && this.sprite.anims.isPlaying) return;
    if (cur && restart && cur.replace(/_[SN]$/, '') === `${this.sheet}_${a}` && this.sprite.anims.isPlaying && this.anim === a && (a === 'idle' || a === 'walk')) {
      // смена стороны во время ходьбы: продолжить с того же кадра
      const progress = this.sprite.anims.getProgress();
      this.sprite.play(key); this.sprite.anims.setProgress(progress);
    } else this.sprite.play(key);
    this.anim = a;
  }

  /** Анимация действия: блокирует смену анимации на время. */
  act(a: AnimName, lock: number) {
    this.animLock = lock;
    this.play(a, true);
  }

  sync() {
    const p = isoToScreen(this.x, this.y);
    this.sprite.setPosition(p.x, p.y).setDepth(depthOf(this.x, this.y) + 0.5);
    this.shadow.setPosition(p.x, p.y).setScale(this.radius * 1.05);
    if (this.flashT > 0) {
      this.flashT -= this.scene.dt;
      if (this.flashT <= 0) this.restoreTint();
    }
  }

  restoreTint() { this.sprite.clearTint(); }

  flashWhite(t = 0.08) {
    this.flashT = t;
    this.sprite.setTintFill(0xffffff);
  }

  /** Движение со скольжением вдоль стен (раздельно по осям). */
  moveBy(dx: number, dy: number) {
    const lv = this.scene.level;
    const r = this.radius;
    const blocked = (x: number, y: number) =>
      !lv.walkable(Math.floor(x - r), Math.floor(y - r)) || !lv.walkable(Math.floor(x + r), Math.floor(y - r)) ||
      !lv.walkable(Math.floor(x - r), Math.floor(y + r)) || !lv.walkable(Math.floor(x + r), Math.floor(y + r));
    let moved = false;
    if (dx && !blocked(this.x + dx, this.y)) { this.x += dx; moved = true; }
    if (dy && !blocked(this.x, this.y + dy)) { this.y += dy; moved = true; }
    return moved;
  }

  /** Тик статусов; возвращает урон от DoT за кадр. */
  tickStatuses(dt: number): number {
    const s = this.st;
    let dmg = 0;
    if (s.bleed.t > 0) { s.bleed.t -= dt; dmg += s.bleed.dps * dt; }
    if (s.burn.t > 0) { s.burn.t -= dt; dmg += s.burn.dps * dt; }
    if (s.stun > 0) s.stun -= dt;
    if (s.root > 0) s.root -= dt;
    if (s.slow.t > 0) s.slow.t -= dt;
    return dmg;
  }

  speedMul() { return this.st.slow.t > 0 ? 1 - this.st.slow.k : 1; }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
