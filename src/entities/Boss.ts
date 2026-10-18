// Босс «Глашатай Пустого Солнца»: 3 фазы, телеграфируемые атаки, призыв теней, кольцо-нова.
//  Фаза 1 (100–60%): взмах глефой (конус), солнечные вспышки (круги под героем).
//  Фаза 2 (60–25%): + призыв теней, + кольцо чёрного пламени (перепрыгнуть рывком/уклонением).
//  Фаза 3 (<25%): ярость — быстрее, вспышек больше, таран по линии.
import { Enemy } from './Enemy';
import { dist } from '../core/iso';
import { rng } from '../core/rng';
import { Sfx } from '../core/Sfx';
import { bus, EV } from '../core/events';
import { damageHero } from '../systems/Combat';
import { inPrologue } from '../data/quests';
import type { GameScene } from '../scenes/GameScene';

type Ability = 'cleave' | 'flares' | 'summon' | 'nova' | 'charge';

export const HERALD_LINES = {
  intro: 'Ещё одна искра ползёт к Венцу… Пустое Солнце примет и тебя.',
  phase2: 'Тени, восстаньте! Пусть свет захлебнётся!',
  phase3: 'Корона горит… и я сгорю вместе с ней!',
  death: 'Солнце… не… угаснет…',
  win: 'Ещё один огонёк погас.',
};

export class Boss extends Enemy {
  phase = 1;
  intro = false;
  cds: Record<Ability, number> = { cleave: 1.5, flares: 4, summon: 3, nova: 8, charge: 6 };
  busy = 0;
  invulnT = 0;
  chargeV = { x: 0, y: 0 };
  chargeT = 0;
  chargeHit = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, 'herald', x, y);
    this.isBoss = true;
    this.radius = 0.85;
    this.displayName = 'Глашатай Пустого Солнца';
    // на глубине > 1 босс получает элитный аффикс
    if (scene.heroData.depth >= 3 && !inPrologue(scene.heroData)) { this.makeElite(1); this.maxHp /= 3.4; this.dmg /= 1.4; this.xp /= 4; this.label?.destroy(); this.label = undefined; this.displayName = 'Глашатай Пустого Солнца'; }
    this.hp = this.maxHp;
    this.sprite.setScale(this.baseScale);
  }

  applyDamage(amount: number): number {
    if (this.invulnT > 0) return 0;
    return super.applyDamage(amount);
  }

  wake() {
    if (this.awake) return;
    this.awake = true; this.state = 'chase';
    if (!this.intro) {
      this.intro = true;
      bus.emit(EV.BOSS, this);
      bus.emit(EV.SUBTITLE, 'Глашатай', HERALD_LINES.intro);
      Sfx.play('boss');
      this.scene.fx.shake(0.008, 500);
    }
  }

  update(dt: number) {
    if (!this.alive) return;
    this.invulnT -= dt; this.busy -= dt;
    for (const k in this.cds) this.cds[k as Ability] -= dt * (this.phase === 3 ? 1.35 : 1);
    // смена фаз
    const pct = this.hp / this.maxHp;
    if (this.phase === 1 && pct < 0.6) this.enterPhase(2);
    else if (this.phase === 2 && pct < 0.25) this.enterPhase(3);
    if (this.chargeT > 0) {
      this.chargeT -= dt;
      this.moveBy(this.chargeV.x * dt, this.chargeV.y * dt);
      if (Math.random() < 0.7) this.scene.fx.burst('fire', this.x, this.y, 2, 20);
      const h = this.scene.hero;
      if (!this.chargeHit && dist(this.x, this.y, h.x, h.y) < 1.3) { this.chargeHit = true; damageHero(this.scene, this.dmg * 1.6, 'fire', this); }
      this.sync();
      return;
    }
    super.update(dt);
  }

  private enterPhase(p: number) {
    this.wake(); // урон издалека тоже будит босса и показывает его полоску
    this.phase = p;
    this.invulnT = 1.2; this.busy = 1.4;
    this.state = 'recover'; this.stateT = 1.4;
    this.scene.clearTelegraph(this);
    this.act('cast', 1.4);
    bus.emit(EV.SUBTITLE, 'Глашатай', p === 2 ? HERALD_LINES.phase2 : HERALD_LINES.phase3);
    Sfx.play('roar');
    this.scene.fx.shake(0.01, 600);
    this.scene.fx.ring(this.x, this.y, 5, 0xff6a1a, 700);
    this.scene.fx.burstArea('fire', this.x, this.y, 3, 40);
    if (p === 2) this.cds.summon = 0.5;
    if (p === 3) { this.speed *= 1.3; this.sprite.setTint(0xffb080); }
  }

  protected think(dt: number, d: number) {
    const sc = this.scene, h = sc.hero;
    if (!h.alive) { this.play('idle'); return; }
    if (this.state === 'windup' || this.state === 'recover') return super.think(dt, d);
    if (this.busy > 0) return;
    // выбор способности
    const ready = (a: Ability) => this.cds[a] <= 0;
    if (this.phase >= 2 && ready('summon') && sc.enemies.filter(e => e.alive && e.def.id === 'shadow').length < 6) return this.summon();
    if (this.phase >= 2 && ready('nova')) return this.nova();
    if (this.phase >= 3 && ready('charge') && d > 3) return this.charge();
    if (ready('flares') && d > 2) return this.flares();
    if (d <= 3.0 && ready('cleave')) return this.cleave();
    // сближение
    const dir = d < 5 && sc.los(this.x, this.y, h.x, h.y) ? { x: (h.x - this.x) / d, y: (h.y - this.y) / d } : sc.flow.dir(this.x, this.y);
    if (dir) this.step(dir.x, dir.y, dt, 1); else this.play('idle');
  }

  private cleave() {
    const h = this.scene.hero;
    this.cds.cleave = this.phase === 3 ? 1.6 : 2.3;
    this.state = 'windup'; this.stateT = this.phase === 3 ? 0.7 : 0.95;
    this.aimX = h.x; this.aimY = h.y;
    this.act('attack', this.stateT + 0.3);
    this.sprite.anims.pause();
    this.scene.telegraphCone(this, this.x, this.y, h.x - this.x, h.y - this.y, 3.4, 120, this.stateT, this.dmg * 1.2, 'fire');
  }

  /** Конус уже нанёс урон через телеграф — здесь только эффекты. */
  protected strike() {
    this.sprite.anims.resume();
    const ax = this.aimX - this.x, ay = this.aimY - this.y, l = Math.hypot(ax, ay) || 1;
    this.scene.fx.slash(this.x, this.y, ax / l, ay / l, 0xff7a2a, 1.6, 3.2);
    this.scene.fx.shake(0.006, 160);
    Sfx.play('explode');
    this.state = 'recover'; this.stateT = 0.45;
  }

  private flares() {
    const h = this.scene.hero;
    this.cds.flares = this.phase === 3 ? 3.2 : 5;
    this.busy = 0.8;
    this.act('cast', 0.9);
    const n = this.phase === 1 ? 4 : this.phase === 2 ? 6 : 9;
    for (let i = 0; i < n; i++) {
      const tx = i === 0 ? h.x : h.x + rng.range(-4, 4), ty = i === 0 ? h.y : h.y + rng.range(-4, 4);
      if (!this.scene.level.walkable(Math.floor(tx), Math.floor(ty))) continue;
      this.scene.telegraphCircle(this, tx, ty, 1.35, 1.25 + i * 0.12, this.dmg * 1.1, 'fire');
    }
    Sfx.play('cast');
  }

  private summon() {
    this.cds.summon = 14;
    this.busy = 1;
    this.act('cast', 1);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + rng.range(-0.3, 0.3);
      const x = this.x + Math.cos(a) * 2.2, y = this.y + Math.sin(a) * 2.2;
      if (this.scene.level.walkable(Math.floor(x), Math.floor(y))) {
        const e = this.scene.spawnEnemy('shadow', x, y);
        e.awake = true; e.state = 'chase';
        this.scene.fx.burst('void', x, y, 16, 20);
      }
    }
    Sfx.play('portal');
  }

  private nova() {
    this.cds.nova = this.phase === 3 ? 7 : 10;
    this.busy = 1.8;
    this.act('cast', 1.6);
    this.scene.ringWave(this, this.x, this.y, 9, 1.8, this.dmg * 1.4);
  }

  private charge() {
    const h = this.scene.hero;
    this.cds.charge = 6;
    this.busy = 1.6;
    const dx = h.x - this.x, dy = h.y - this.y, l = Math.hypot(dx, dy) || 1;
    this.scene.telegraphLine(this, this.x, this.y, this.x + dx / l * 8, this.y + dy / l * 8, 1.6, 0.8);
    this.act('attack', 1.2);
    this.scene.time.delayedCall(800, () => {
      if (!this.alive) return;
      this.chargeV = { x: dx / l * 12, y: dy / l * 12 }; this.chargeT = 0.6; this.chargeHit = false;
      Sfx.play('roar');
    });
  }

  die() {
    bus.emit(EV.SUBTITLE, 'Глашатай', HERALD_LINES.death);
    bus.emit(EV.BOSS, null);
    super.die();
  }
}
