// Расчёт боя: броски урона героя, нанесение урона врагам и герою, статусы, вампиризм,
// легендарные свойства и сетовые бонусы (хуки на попадание и убийство).
import { rng } from '../core/rng';
import { dist } from '../core/iso';
import { Sfx } from '../core/Sfx';
import { damageMul } from './HeroData';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';

export type DmgKind = 'phys' | 'fire' | 'void';

export interface HitOpts {
  bleed?: number;        // доп. шанс кровотечения
  burn?: number;         // доп. шанс поджога
  stun?: number;         // гарантированное оглушение, с
  stunChance?: number;   // оглушение 0.5 с с шансом (базовые атаки Костолома)
  root?: number;
  kind?: DmgKind;
  noProc?: boolean;      // для вторичных эффектов (взрывы от свойств), чтобы не было цепочек
  bonusVsBleed?: number; // «Жатва углей»
  dot?: boolean;
  knock?: number;        // отбрасывание, тайлы
  fromX?: number; fromY?: number;
}

/** Бросок урона героя с учётом оружия, характеристик и крита. */
export function rollHeroDamage(scene: GameScene, mult: number, forceCrit = false): { amount: number; crit: boolean } {
  const h = scene.hero;
  const st = h.stats;
  let amount = rng.range(st.dmgMin, st.dmgMax) * damageMul(h.data, st) * mult;
  const critAll = h.critAllT > 0;
  const crit = forceCrit || critAll || rng.chance(st.critChance);
  if (crit) amount *= 1 + st.critDmg + (critAll ? 0.15 * (h.data.skillRanks['shade_vault'] || 1) : 0);
  return { amount, crit };
}

export function damageEnemy(scene: GameScene, e: Enemy, amount: number, crit: boolean, o: HitOpts = {}) {
  if (!e.alive) return 0;
  const h = scene.hero;
  const st = h.stats;
  const bleeding = e.st.bleed.t > 0, burning = e.st.burn.t > 0;
  if (!o.dot && h.powers.has('pyre') && (bleeding || burning)) amount *= 1.4;
  if (o.bonusVsBleed && bleeding) amount *= 1 + o.bonusVsBleed;
  const dealt = e.applyDamage(amount);
  if (dealt <= 0) return 0;

  // обратная связь
  if (!o.dot) {
    e.flashWhite(crit ? 0.12 : 0.07);
    scene.fx.burst(o.kind === 'fire' ? 'fire' : o.kind === 'void' ? 'void' : 'spark', e.x, e.y, crit ? 10 : 5, e.heightPx * 0.5);
    if (o.kind !== 'fire' && o.kind !== 'void') scene.fx.burst(e.def.id === 'shadow' ? 'void' : 'blood', e.x, e.y, crit ? 6 : 3, e.heightPx * 0.5);
    scene.fx.damageNumber(e.x, e.y, dealt, crit ? '#ffd27a' : '#f2e6d0', crit, e.heightPx + 10);
    Sfx.play(crit ? 'crit' : 'hit');
    if (crit) scene.fx.shake(0.0035, 90);
    if (o.knock && !e.isBoss && o.fromX !== undefined) {
      const dx = e.x - o.fromX!, dy = e.y - (o.fromY ?? e.y); const l = Math.hypot(dx, dy) || 1;
      e.knockback(dx / l * o.knock, dy / l * o.knock);
    }
  } else if (Math.random() < 0.25) {
    scene.fx.damageNumber(e.x, e.y, dealt, bleeding ? '#d0505a' : '#ff9a4a', false, e.heightPx);
  }

  if (!o.dot) {
    // статусы
    if (rng.chance((o.bleed || 0) + st.bleedChance)) { e.st.bleed.t = 4; e.st.bleed.dps = Math.max(e.st.bleed.dps * 0.5, amount * 0.22); }
    if (rng.chance((o.burn || 0) + st.igniteChance)) { e.st.burn.t = 3; e.st.burn.dps = Math.max(e.st.burn.dps * 0.5, amount * 0.28); }
    if (o.stun) e.stun(o.stun);
    else if (o.stunChance !== undefined && rng.chance(o.stunChance + st.stunChance)) e.stun(0.5);
    if (o.root) e.st.root = Math.max(e.st.root, o.root);
    // вампиризм
    if (st.lifesteal > 0) h.heal(dealt * st.lifesteal, false);
    // свойства
    if (!o.noProc) {
      if (h.powers.has('emberNova') && rng.chance(0.15)) emberNova(scene, e.x, e.y, 2, 1.5, 0xff7a2a);
      if (crit && h.powers.has('set6flare') && rng.chance(0.2)) emberNova(scene, e.x, e.y, 2.4, 2.2, 0xf0d8a0);
    }
  }
  if (e.hp <= 0) scene.killEnemy(e);
  return dealt;
}

/** Взрыв пепла вокруг точки — для свойств и некоторых навыков. */
export function emberNova(scene: GameScene, x: number, y: number, radius: number, mult: number, color: number) {
  scene.fx.ring(x, y, radius, color, 300);
  scene.fx.burstArea('fire', x, y, radius, 14);
  Sfx.play('fire');
  for (const e of scene.enemiesInRadius(x, y, radius)) {
    const r = rollHeroDamage(scene, mult);
    damageEnemy(scene, e, r.amount, r.crit, { kind: 'fire', noProc: true });
  }
}

/** Урон по герою: уклонение (неуязвимость), блок, броня, сопротивление, бастион, шипы. */
export function damageHero(scene: GameScene, amount: number, kind: DmgKind = 'phys', src?: Enemy) {
  const h = scene.hero;
  if (!h.alive || h.invuln > 0) return 0;
  const st = h.stats;
  if (rng.chance(st.blockChance)) {
    amount *= 0.35;
    scene.fx.damageNumber(h.x, h.y, 'Блок', '#d9b25a', false, 70);
    Sfx.play('stun');
  }
  const armorK = st.armor / (st.armor + 45 + 14 * scene.heroData.depth);
  amount *= 1 - armorK;
  if (kind !== 'phys') amount *= 1 - st.resist;
  if (h.bastionT > 0) amount *= 0.5;
  amount = Math.max(1, amount);
  h.hp -= amount;
  h.flashWhite(0.08);
  h.sprite.setTint(0xff6060);
  scene.fx.damageNumber(h.x, h.y, amount, '#ff5a5a', false, 74);
  scene.fx.burst('blood', h.x, h.y, 4, 34);
  scene.fx.shake(0.004 + Math.min(0.01, amount / h.maxHp * 0.03), 110);
  scene.ui?.hurtFlash(amount / h.maxHp);
  Sfx.play('hurt');
  // шипы
  const thorns = st.thorns + (h.bastionT > 0 ? h.bastionThorns : 0);
  if (src && src.alive && thorns > 0 && dist(src.x, src.y, h.x, h.y) < 3) damageEnemy(scene, src, thorns, false, { noProc: true });
  if (h.hp <= 0) scene.heroDied();
  return amount;
}
