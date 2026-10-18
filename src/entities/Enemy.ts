// Враги: конечный автомат ИИ (сон → погоня → замах → удар → восстановление),
// движение по полю потоков, элитные аффиксы, читаемые индикаторы атак.
import Phaser from 'phaser';
import { Actor, type Faction } from './Actor';
import { ENEMIES, ELITE_AFFIXES, DIFFICULTIES, depthScale, type EnemyDef, type EliteAffix } from '../data/enemies';
import { dist, isoToScreen } from '../core/iso';
import { rng } from '../core/rng';
import { Sfx } from '../core/Sfx';
import { FONT } from '../config';
import { damageHero } from '../systems/Combat';
import type { GameScene } from '../scenes/GameScene';

export type AIState = 'idle' | 'chase' | 'windup' | 'lunge' | 'recover';

export class Enemy extends Actor {
  faction: Faction = 'enemy';
  def: EnemyDef;
  dmg: number;
  speed: number;
  xp: number;
  affixes: EliteAffix[] = [];
  awake = false;
  state: AIState = 'idle';
  stateT = 0;
  atkCd = 0;
  aimX = 0; aimY = 0;
  castCount = 0;
  isBoss = false;
  questTag?: string;     // метка для заданий (стая у мельницы)
  isElite = false;
  label?: Phaser.GameObjects.Text;
  aura?: Phaser.GameObjects.Image;
  kx = 0; ky = 0;           // отбрасывание
  wanderT = 0; wx = 0; wy = 0;
  affixT = 0;
  lungeHit = false;
  displayName: string;

  constructor(scene: GameScene, type: string, x: number, y: number, elite = false) {
    const def = ENEMIES[type];
    super(scene, `en_${def.art}`, x, y);
    this.def = def;
    this.displayName = def.name;
    this.radius = def.radius;
    this.heightPx = type === 'herald' ? 140 : type === 'wolf' ? 40 : 58;
    const dsc = depthScale(scene.heroData.depth);
    const diff = DIFFICULTIES[scene.heroData.difficulty];
    const mod = scene.floorMod;
    this.maxHp = def.hp * dsc.hp * diff.hp * (mod?.hp ?? 1);
    this.dmg = def.dmg * dsc.dmg * diff.dmg * (mod?.dmg ?? 1);
    this.speed = def.speed * rng.range(0.92, 1.08);
    this.xp = def.xp * dsc.xp * diff.xp;
    this.atkCd = rng.range(0.3, 1.2);
    if (elite) this.makeElite(type === 'herald' ? 0 : 2);
    this.hp = this.maxHp;
    this.sprite.setScale(this.baseScale * (this.isElite ? 1.18 : 1) * rng.range(0.96, 1.04));
    if (def.id === 'shadow') this.sprite.setBlendMode(Phaser.BlendModes.NORMAL).setAlpha(0.9);
  }

  makeElite(n: number) {
    this.isElite = true;
    const pool = [...ELITE_AFFIXES];
    for (let i = 0; i < n; i++) this.affixes.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    this.maxHp *= 3.4; this.dmg *= 1.4; this.xp *= 4;
    if (this.has('swift')) this.speed *= 1.6;
    if (this.has('stone')) this.maxHp *= 1.2;
    this.displayName = this.affixes.map(a => a.name).join(' ') + ' ' + this.def.name.toLowerCase();
    const col = this.affixes[0]?.color ?? 0xffffff;
    this.aura = this.scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(col).setAlpha(0.5).setDepth(-99970);
    this.label = this.scene.add.text(0, 0, this.displayName, {
      fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#' + col.toString(16).padStart(6, '0'), stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(960000);
  }

  has(id: string) { return this.affixes.some(a => a.id === id); }

  /** Возвращает фактический урон с учётом аффиксов. */
  applyDamage(amount: number): number {
    if (!this.alive) return 0;
    if (this.has('stone')) amount *= 0.55;
    this.hp -= amount;
    if (!this.awake) this.wake();
    return amount;
  }

  stun(t: number) {
    const k = this.isBoss ? 0.35 : 1; // боссы почти не оглушаются
    this.st.stun = Math.max(this.st.stun, t * k);
    if (this.state === 'windup' && !this.isBoss) { this.state = 'recover'; this.stateT = 0.2; this.scene.clearTelegraph(this); }
  }

  knockback(dx: number, dy: number) { this.kx += dx * 8; this.ky += dy * 8; }

  wake() {
    if (this.awake) return;
    this.awake = true;
    this.state = 'chase';
    // будим соседей по стае
    for (const e of this.scene.enemies) if (!e.awake && e !== this && dist(e.x, e.y, this.x, this.y) < 6) e.awake = true, e.state = 'chase';
  }

  update(dt: number) {
    if (!this.alive) return;
    const sc = this.scene, h = sc.hero;
    this.animLock -= dt; this.atkCd -= dt; this.stateT -= dt;
    const dot = this.tickStatuses(dt);
    if (dot > 0) sc.dotEnemy(this, dot);
    if (!this.alive) return;

    // отбрасывание
    if (this.kx || this.ky) {
      this.moveBy(this.kx * dt, this.ky * dt);
      this.kx *= Math.pow(0.001, dt); this.ky *= Math.pow(0.001, dt);
      if (Math.abs(this.kx) + Math.abs(this.ky) < 0.05) this.kx = this.ky = 0;
    }

    const d = dist(this.x, this.y, h.x, h.y);
    if (!this.awake) {
      if (h.alive && d < this.def.aggro * (sc.floorMod?.id === 'fog' ? 0.75 : 1) && sc.los(this.x, this.y, h.x, h.y)) this.wake();
      else { this.idleWander(dt); this.sync(); this.syncExtras(); return; }
    }
    if (this.stunned) {
      if (Math.random() < dt * 6) sc.fx.burst('gold', this.x, this.y, 1, this.heightPx + 6);
      this.play('idle'); this.sync(); this.syncExtras(); return;
    }
    this.affixTick(dt, d);
    this.think(dt, d);
    this.sync();
    this.syncExtras();
  }

  protected idleWander(dt: number) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = rng.range(2, 5);
      const a = rng.range(0, Math.PI * 2);
      this.wx = rng.chance(0.5) ? Math.cos(a) : 0; this.wy = this.wx ? Math.sin(a) : 0;
    }
    if (this.wx || this.wy) {
      if (this.wanderT > 1.2 && this.wanderT < 2) {
        this.face(this.wx, this.wy);
        this.moveBy(this.wx * this.speed * 0.25 * dt, this.wy * this.speed * 0.25 * dt);
        this.play('walk');
      } else this.play('idle');
    } else this.play('idle');
  }

  protected affixTick(dt: number, d: number) {
    if (!this.isElite) return;
    this.affixT -= dt;
    if (this.has('molten') && Math.random() < dt * 0.7) this.scene.spawnFirePatch(this.x, this.y, 1.1, 3.5, 'enemy', this.dmg * 0.5);
    if (this.has('hollow') && this.affixT <= 0 && d > 3.5 && d < 12) {
      this.affixT = 5;
      // телепорт за спину героя
      const h = this.scene.hero;
      const a = rng.range(0, Math.PI * 2);
      const tx = h.x + Math.cos(a) * 1.6, ty = h.y + Math.sin(a) * 1.6;
      if (this.scene.level.walkable(Math.floor(tx), Math.floor(ty))) {
        this.scene.fx.burst('void', this.x, this.y, 14, 30);
        this.x = tx; this.y = ty;
        this.scene.fx.burst('void', this.x, this.y, 14, 30);
        Sfx.play('portal');
      }
    }
  }

  /** Основной ИИ обычных врагов. */
  protected think(dt: number, d: number) {
    const sc = this.scene, h = sc.hero, def = this.def;
    if (!h.alive) { this.play('idle'); return; }
    switch (this.state) {
      case 'idle':
      case 'chase': {
        const canSee = sc.los(this.x, this.y, h.x, h.y);
        const reach = def.range + h.radius;
        if (def.attack === 'ranged') {
          if (d <= def.range && canSee && this.atkCd <= 0) return this.beginWindup();
          if (d < (def.keepDistance ?? 0) && canSee) { this.step(this.x - h.x, this.y - h.y, dt, 0.7); return; }
          if (d <= def.range && canSee) { this.face(h.x - this.x, h.y - this.y); this.play('idle'); return; }
        } else if (def.attack === 'lunge') {
          if (d <= def.range && d > 1.6 && canSee && this.atkCd <= 0) return this.beginWindup();
          if (d <= 1.0 + h.radius && this.atkCd <= 0) return this.beginWindup(true);
        } else if (d <= reach && this.atkCd <= 0) return this.beginWindup();
        if (d <= reach * 0.9 && def.attack !== 'ranged') { this.face(h.x - this.x, h.y - this.y); this.play('idle'); return; }
        // движение: прямо, если близко и видно; иначе — по полю потоков
        let dir: { x: number; y: number } | null = null;
        if (canSee && d < 4) { const l = d || 1; dir = { x: (h.x - this.x) / l, y: (h.y - this.y) / l }; }
        else dir = sc.flow.dir(this.x, this.y);
        if (dir) this.step(dir.x, dir.y, dt, 1);
        else this.play('idle');
        break;
      }
      case 'windup': {
        this.face(this.aimX - this.x, this.aimY - this.y);
        if (this.stateT <= 0) this.strike();
        break;
      }
      case 'lunge': {
        const sp = 13 * dt;
        const l = Math.hypot(this.aimX, this.aimY) || 1;
        this.moveBy(this.aimX / l * sp, this.aimY / l * sp);
        if (!this.lungeHit && dist(this.x, this.y, h.x, h.y) < 0.8) { this.lungeHit = true; damageHero(sc, this.dmg * 1.3, 'phys', this); }
        if (this.stateT <= 0) { this.state = 'recover'; this.stateT = 0.5; }
        break;
      }
      case 'recover':
        if (this.animLock <= 0) this.play('idle');
        if (this.stateT <= 0) this.state = 'chase';
        break;
    }
  }

  protected step(dx: number, dy: number, dt: number, k: number) {
    if (this.st.root > 0) { this.play('idle'); return; }
    const l = Math.hypot(dx, dy) || 1;
    const sp = this.speed * this.speedMul() * k * dt;
    this.face(dx, dy);
    this.moveBy(dx / l * sp, dy / l * sp);
    if (this.animLock <= 0) this.play('walk');
  }

  protected beginWindup(bite = false) {
    const h = this.scene.hero, def = this.def;
    this.state = 'windup';
    this.aimX = h.x; this.aimY = h.y;
    const swift = this.has('swift') ? 0.75 : 1;
    if (def.attack === 'lunge' && !bite) {
      this.stateT = def.windup * swift;
      this.scene.telegraphLine(this, this.x, this.y, h.x, h.y, 0.7, this.stateT);
      this.act('idle', this.stateT);
      Sfx.play('roar');
    } else if (def.attack === 'ranged') {
      this.stateT = def.windup * swift;
      this.castCount++;
      this.act('cast', this.stateT + 0.2);
      if (this.castCount % 3 === 0) this.scene.telegraphCircle(this, h.x, h.y, 1.5, this.stateT + 0.8, this.dmg * 1.5, 'void');
    } else {
      this.stateT = def.windup * swift * (bite ? 0.7 : 1);
      this.act('attack', this.stateT + 0.25);
      this.sprite.anims.pause(); // замах: держим первый кадр — видно, что сейчас ударит
      this.scene.telegraphCone(this, this.x, this.y, h.x - this.x, h.y - this.y, def.range + 0.45, 90, this.stateT);
    }
  }

  protected strike() {
    const sc = this.scene, h = sc.hero, def = this.def;
    this.sprite.anims.resume();
    this.atkCd = def.cooldown * (this.has('swift') ? 0.75 : 1) * rng.range(0.9, 1.15);
    if (def.attack === 'lunge' && dist(this.x, this.y, this.aimX, this.aimY) > 1.4) {
      this.state = 'lunge'; this.stateT = 0.32; this.lungeHit = false;
      this.aimX = this.aimX - this.x; this.aimY = this.aimY - this.y;
      this.act('attack', 0.4);
      return;
    }
    if (def.attack === 'ranged') {
      if (this.castCount % 3 !== 0) sc.enemyProjectile(this, this.aimX, this.aimY, def.projSpeed ?? 6, this.dmg);
      this.state = 'recover'; this.stateT = 0.4;
      Sfx.play('cast');
      return;
    }
    // ближний удар: попадает, если герой всё ещё в зоне конуса
    const dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy);
    const ax = this.aimX - this.x, ay = this.aimY - this.y, al = Math.hypot(ax, ay) || 1;
    const cos = d > 0 ? (dx * ax + dy * ay) / (d * al) : 1;
    if (d <= def.range + h.radius + 0.35 && cos > Math.cos(Math.PI / 180 * 55)) {
      const dealt = damageHero(sc, this.dmg, 'phys', this);
      if (this.has('vampiric') && dealt > 0) { this.hp = Math.min(this.maxHp, this.hp + dealt * 3); sc.fx.burst('blood', this.x, this.y, 6, 30); }
    }
    sc.fx.slash(this.x, this.y, ax / al, ay / al, 0xd0d0d0, 0.8, def.range);
    Sfx.play('swing');
    this.state = 'recover'; this.stateT = 0.35;
  }

  syncExtras() {
    if (this.label || this.aura) {
      const p = isoToScreen(this.x, this.y);
      this.aura?.setPosition(p.x, p.y).setScale(1.1, 0.55).setVisible(this.sprite.visible);
      this.label?.setPosition(p.x, p.y - this.heightPx * 1.35).setVisible(this.sprite.visible);
    }
  }

  die() {
    this.alive = false;
    this.scene.clearTelegraph(this);
    this.label?.destroy(); this.aura?.destroy();
    this.sprite.anims.resume();
    this.play('death');
    this.sprite.setDepth(this.sprite.depth - 30);
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, delay: 1600, duration: 900, onComplete: () => this.destroy() });
  }
}
