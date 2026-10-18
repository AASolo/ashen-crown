// Герой: движение (клик/путь, WASD, стик), базовая атака, навыки, уклонение, зелья, ресурсы.
import { Actor, type Faction } from './Actor';
import { CLASSES, type ClassDef } from '../data/classes';
import { SKILLS } from '../data/skills';
import { computeStats, activePowers, type HeroData } from '../systems/HeroData';
import type { Stats } from '../data/stats';
import { castSkill } from '../systems/Skills';
import { astar } from '../world/Pathfinding';
import { dist } from '../core/iso';
import { Sfx } from '../core/Sfx';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from './Enemy';

export interface Dash {
  vx: number; vy: number; t: number; hitR: number;
  onHit?: (e: Enemy) => void;
  hitSet: Set<Enemy>;
  stopOnHit?: boolean;
  onEnd?: () => void;
}

export class Hero extends Actor {
  faction: Faction = 'hero';
  cls: ClassDef;
  stats: Stats;
  powers = new Set<string>();
  res = 0;
  maxRes = 100;
  cds: Record<string, number> = {};
  basicCd = 0;
  castLock = 0;
  invuln = 0;
  dodgeCd = 0;
  dash: Dash | null = null;
  path: { x: number; y: number }[] | null = null;
  target: Enemy | null = null;
  moveVec = { x: 0, y: 0 };          // прямое управление (WASD / стик / джойстик)
  critAllT = 0;                      // «Шаг в тень»
  bastionT = 0; bastionThorns = 0;   // «Рунный бастион»
  healLeft = 0; healRate = 0;        // зелье лечит за 0.6 с
  lastHitT = 0;                      // для угасания Ярости вне боя
  traps = 0;
  repathT = 0;

  constructor(scene: GameScene, public data: HeroData, x: number, y: number) {
    super(scene, `hero_${data.classId}`, x, y);
    this.cls = CLASSES[data.classId];
    this.radius = 0.3;
    this.heightPx = 62;
    this.stats = computeStats(data);
    this.recompute(true);
    this.res = this.cls.resource.start;
  }

  /** Пересчитать характеристики после смены экипировки/уровня/талантов. */
  recompute(full = false) {
    const prevMax = this.maxHp;
    this.stats = computeStats(this.data);
    this.powers = activePowers(this.data);
    this.maxHp = Math.round(this.stats.maxHp);
    this.maxRes = Math.round(this.stats.maxRes);
    if (full) this.hp = this.maxHp;
    else if (this.maxHp > prevMax) this.hp += this.maxHp - prevMax;
    this.hp = Math.min(this.hp, this.maxHp);
    this.res = Math.min(this.res, this.maxRes);
  }

  get moveSpeed() { return this.cls.moveSpeed * (1 + this.stats.moveSpeed) * this.speedMul(); }
  get basicSkill() { return SKILLS[this.cls.basic]; }
  get attackInterval() { return this.cls.baseAttackTime / (1 + this.stats.atkSpeed); }

  heal(v: number, show = true) {
    if (!this.alive || v <= 0) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + v);
    if (show && this.hp - before >= 1) this.scene.fx.damageNumber(this.x, this.y, '+' + Math.round(this.hp - before), '#7fd88a', false, 76);
  }

  gainRes(v: number) { this.res = Math.min(this.maxRes, this.res + v); this.lastHitT = 0; }

  /** Идти к точке по A*. */
  goTo(tx: number, ty: number): boolean {
    const lv = this.scene.level;
    const sx = Math.floor(this.x), sy = Math.floor(this.y);
    let gx = Math.floor(tx), gy = Math.floor(ty);
    if (!lv.walkable(gx, gy)) {
      // клик в стену — ищем ближайшую проходимую клетку рядом
      let best = 1e9;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (lv.walkable(gx + dx, gy + dy)) { const dd = Math.hypot(dx, dy); if (dd < best) { best = dd; tx = gx + dx + 0.5; ty = gy + dy + 0.5; } }
      }
      if (best > 100) return false;
      gx = Math.floor(tx); gy = Math.floor(ty);
    }
    const path = astar(lv.w, lv.h, lv.walkable, sx, sy, gx, gy);
    if (!path) return false;
    if (path.length) path[path.length - 1] = { x: tx, y: ty }; // последний шаг — точно в точку клика
    this.path = path;
    return true;
  }

  stop() { this.path = null; this.target = null; }

  /** Базовая атака в точку. */
  tryBasic(tx: number, ty: number): boolean {
    if (this.basicCd > 0 || this.castLock > 0 || this.dash || this.stunned) return false;
    const ok = castSkill(this.scene, this, this.cls.basic, tx, ty);
    if (ok) this.basicCd = this.attackInterval;
    return ok;
  }

  /** Навык из слота 0..2. */
  trySkill(i: number, tx: number, ty: number): boolean {
    const id = this.cls.skills[i];
    const s = SKILLS[id];
    if ((this.cds[id] || 0) > 0) return false;
    if (this.res < s.cost) { this.scene.ui?.notEnough(this.cls.resource.name); return false; }
    if (this.castLock > 0 || this.dash || this.stunned) return false;
    if (!castSkill(this.scene, this, id, tx, ty)) return false;
    this.res -= s.cost;
    this.cds[id] = s.cooldown * (1 - this.stats.cdr);
    return true;
  }

  dodge(dx: number, dy: number) {
    if (this.dodgeCd > 0 || this.dash || this.stunned || !this.alive) return;
    const l = Math.hypot(dx, dy);
    if (l < 1e-3) { dx = this.flip ? -1 : 1; dy = this.side === 'N' ? -1 : 1; }
    const n = Math.hypot(dx, dy);
    dx /= n; dy /= n;
    this.stop();
    this.castLock = 0;
    this.startDash(dx * 13, dy * 13, 0.24, {});
    this.invuln = 0.32;
    this.dodgeCd = this.powers.has('phantomStep') ? 1.2 : 2.4;
    if (this.powers.has('phantomStep')) this.scene.spawnFirePatch(this.x, this.y, 1.3, 2.5, 'hero');
    this.act('walk', 0.24);
    this.scene.fx.burst('smoke', this.x, this.y, 6, 10);
    Sfx.play('dodge');
  }

  drinkPotion() {
    if (this.data.potions <= 0 || this.hp >= this.maxHp || !this.alive) return;
    this.data.potions--;
    this.healLeft = this.maxHp * 0.45; this.healRate = this.healLeft / 0.6;
    this.scene.fx.burst('heal', this.x, this.y, 16, 30);
    Sfx.play('potion');
  }

  startDash(vx: number, vy: number, t: number, o: Partial<Dash>) {
    this.dash = { vx, vy, t, hitR: 1, hitSet: new Set(), ...o };
    this.face(vx, vy);
  }

  private stepDist = 0;

  update(dt: number) {
    if (!this.alive) { this.sync(); return; }
    const st = this.stats;
    // регенерация
    this.heal(st.hpRegen * dt, false);
    if (this.healLeft > 0) { const v = Math.min(this.healLeft, this.healRate * dt); this.healLeft -= v; this.heal(v, false); }
    this.lastHitT += dt;
    const r = this.cls.resource;
    if (r.decay > 0 && this.lastHitT > 3) this.res = Math.max(0, this.res - r.decay * dt);
    this.res = Math.min(this.maxRes, this.res + st.resRegen * dt);
    // таймеры
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
    this.basicCd -= dt; this.castLock -= dt; this.invuln -= dt; this.dodgeCd -= dt;
    this.critAllT -= dt; this.bastionT -= dt; this.animLock -= dt; this.repathT -= dt;
    const dot = this.tickStatuses(dt);
    if (dot > 0) { this.hp -= dot; if (this.hp <= 0) this.scene.heroDied(); }

    if (this.bastionT > 0 && Math.random() < dt * 8) this.scene.fx.burst('teal', this.x, this.y, 1, 30);
    if (this.critAllT > 0) this.sprite.setAlpha(0.55 + Math.sin(this.scene.time.now / 60) * 0.2);
    else if (this.sprite.alpha !== 1 && this.invuln <= 0) this.sprite.setAlpha(1);

    // рывок
    if (this.dash) {
      const d = this.dash;
      const steps = 3;
      for (let i = 0; i < steps; i++) {
        const moved = this.moveBy(d.vx * dt / steps, d.vy * dt / steps);
        if (d.onHit) for (const e of this.scene.enemiesInRadius(this.x, this.y, d.hitR)) {
          if (d.hitSet.has(e)) continue;
          d.hitSet.add(e); d.onHit(e);
          if (d.stopOnHit) { d.t = 0; break; }
        }
        if (!moved) { d.t = 0; break; }
      }
      d.t -= dt;
      if (Math.random() < 0.6) this.scene.fx.burst('ash', this.x, this.y, 1, 20);
      if (d.t <= 0) { this.dash = null; d.onEnd?.(); }
      this.sync();
      return;
    }
    if (this.stunned) { this.sync(); return; }

    // атака по цели
    const tg = this.target;
    let wantMove: { x: number; y: number } | null = null;
    if (tg) {
      if (!tg.alive) this.target = null;
      else {
        const range = this.basicSkill.range * (this.cls.ranged ? 0.9 : 1) + tg.radius;
        if (dist(this.x, this.y, tg.x, tg.y) <= range && (!this.cls.ranged || this.scene.los(this.x, this.y, tg.x, tg.y))) {
          this.path = null;
          this.face(tg.x - this.x, tg.y - this.y);
          this.tryBasic(tg.x, tg.y);
        } else if (!this.path || this.repathT <= 0) { this.goTo(tg.x, tg.y); this.repathT = 0.3; }
      }
    }

    if (this.castLock <= 0) {
      if (this.moveVec.x || this.moveVec.y) { wantMove = this.moveVec; this.path = null; }
      else if (this.path && this.path.length) {
        const n = this.path[0];
        const dx = n.x - this.x, dy = n.y - this.y; const l = Math.hypot(dx, dy);
        if (l < 0.12) { this.path.shift(); if (!this.path.length) this.path = null; }
        else wantMove = { x: dx / l, y: dy / l };
      }
    }
    if (wantMove) {
      const sp = this.moveSpeed * dt;
      this.face(wantMove.x, wantMove.y);
      if (!this.moveBy(wantMove.x * sp, wantMove.y * sp) && this.path) this.path = null;
      // шаг примерно каждые 0.85 клетки
      this.stepDist += sp;
      if (this.stepDist > 0.85) { this.stepDist = 0; Sfx.step(this.scene.theme === 'catacombs' ? 'catacombs' : 'ashlands'); }
      if (this.animLock <= 0) this.play('walk');
    } else if (this.animLock <= 0) this.play('idle');
    this.sync();
  }

  restoreTint() {
    this.sprite.clearTint();
    if (this.bastionT > 0) this.sprite.setTint(0xa8fff0);
  }
}
