// Исполнение навыков по типу (kind) из data/skills.ts.
import { SKILLS, skillMult, type SkillDef } from '../data/skills';
import { dist } from '../core/iso';
import { Sfx } from '../core/Sfx';
import { rollHeroDamage, damageEnemy } from './Combat';
import { inCone, makeGround } from '../entities/Effects';
import type { GameScene } from '../scenes/GameScene';
import type { Hero } from '../entities/Hero';

const CLASS_COLOR: Record<string, number> = { blade: 0xff6a3a, witch: 0xff8a3a, bone: 0xd9b25a, shade: 0x4fc6e0 };

export function castSkill(scene: GameScene, h: Hero, id: string, tx: number, ty: number): boolean {
  const s = SKILLS[id];
  const rank = h.data.skillRanks[id] || 1;
  const mult = skillMult(s, rank);
  let dx = tx - h.x, dy = ty - h.y;
  let l = Math.hypot(dx, dy);
  if (l < 0.01) { dx = h.flip ? -1 : 1; dy = h.side === 'N' ? -1 : 1; l = Math.hypot(dx, dy); }
  const nx = dx / l, ny = dy / l;
  h.face(nx, ny);
  const color = CLASS_COLOR[h.data.classId];
  const lock = (k = 0.6) => { h.castLock = Math.min(s.castTime, s.cost === 0 ? h.attackInterval : 9) * k; h.act(s.anim, s.castTime); };

  switch (s.kind) {
    case 'melee': {
      lock(0.65);
      Sfx.play(s.sfx);
      scene.time.delayedCall(90, () => {
        if (!h.alive) return;
        const range = s.range;
        scene.fx.slash(h.x, h.y, nx, ny, color, s.arc! > 140 ? 1.5 : 1, range);
        if (id === 'blade_basic') scene.time.delayedCall(90, () => scene.fx.slash(h.x, h.y, nx, ny, 0xffffff, 0.9, range * 0.9));
        let hit = false;
        for (const e of scene.enemiesInCone(h.x, h.y, nx, ny, range, s.arc!)) {
          const r = rollHeroDamage(scene, mult);
          damageEnemy(scene, e, r.amount, r.crit, {
            bleed: s.bleed, burn: s.burn, stunChance: s.stun ? 0 : undefined, bonusVsBleed: id === 'blade_reap' ? 1 : 0,
            knock: id === 'bone_basic' ? 0.25 : 0.08, fromX: h.x, fromY: h.y,
          });
          hit = true;
        }
        if (id === 'bone_basic' && hit) scene.fx.shake(0.003, 80);
        if (hit && s.gain) h.gainRes(s.gain);
        scene.hitWallsInFront(h.x, h.y, nx, ny, range);
      });
      return true;
    }
    case 'projectile': {
      lock(0.55);
      Sfx.play(s.sfx);
      const tex = id === 'witch_fireball' ? 'proj_fireball' : id === 'shade_basic' ? 'proj_arrow' : 'proj_spark';
      scene.heroProjectile({
        x: h.x + nx * 0.4, y: h.y + ny * 0.4, vx: nx * s.speed!, vy: ny * s.speed!, life: s.range / s.speed!, radius: id === 'witch_fireball' ? 0.45 : 0.3,
        dmg: mult, kind: s.id.startsWith('witch') ? 'fire' : 'phys', pierce: s.pierce || 0, explode: s.radius || 0,
        opts: { burn: s.burn, bleed: s.bleed }, gain: s.gain,
      }, tex, id === 'witch_fireball' ? 0.75 : 0.5);
      return true;
    }
    case 'fan': {
      lock(0.55);
      Sfx.play(s.sfx);
      const n = s.count! + (rank >= 4 ? 2 : 0);
      const base = Math.atan2(ny, nx), arc = s.arc! * Math.PI / 180;
      for (let i = 0; i < n; i++) {
        const a = base - arc / 2 + arc * (i / (n - 1));
        scene.heroProjectile({
          x: h.x, y: h.y, vx: Math.cos(a) * s.speed!, vy: Math.sin(a) * s.speed!, life: s.range / s.speed!, radius: 0.28,
          dmg: mult, kind: 'phys', pierce: 0, explode: 0, opts: { bleed: s.bleed },
        }, 'proj_dagger', 0.42);
      }
      return true;
    }
    case 'dash': {
      const d = Math.min(s.range, l + 0.5);
      const speed = 22;
      h.stop();
      h.invuln = d / speed + 0.1;
      h.act('attack', d / speed + 0.15);
      Sfx.play(s.sfx);
      h.startDash(nx * speed, ny * speed, d / speed, {
        hitR: s.radius,
        onHit: e => { const r = rollHeroDamage(scene, mult); damageEnemy(scene, e, r.amount, r.crit, { bleed: 0.5, knock: 0.3, fromX: h.x, fromY: h.y }); },
        onEnd: () => { scene.fx.burst('ash', h.x, h.y, 10, 10); scene.fx.slash(h.x, h.y, nx, ny, color, 1.2, 1.6); },
      });
      return true;
    }
    case 'spin': {
      h.stop();
      h.castLock = s.castTime;
      const ticks = s.count!;
      for (let i = 0; i < ticks; i++) {
        scene.time.delayedCall(i * (s.castTime * 1000 / ticks), () => {
          if (!h.alive) return;
          h.act('attack', 0.2);
          const a = i * Math.PI / 2;
          scene.fx.slash(h.x, h.y, Math.cos(a), Math.sin(a), color, 1.3, 1.8);
          scene.fx.ring(h.x, h.y, s.radius!, color, 200);
          Sfx.play('swing');
          for (const e of scene.enemiesInRadius(h.x, h.y, s.radius!)) {
            const r = rollHeroDamage(scene, mult);
            damageEnemy(scene, e, r.amount, r.crit, { bleed: s.bleed });
          }
        });
      }
      return true;
    }
    case 'groundAoe': {
      lock(0.7);
      const k = Math.min(1, s.range / l);
      const px = h.x + dx * k, py = h.y + dy * k;
      Sfx.play(s.sfx);
      scene.addGround(makeGround({
        kind: 'circle', faction: 'hero', x: px, y: py, radius: s.radius! + (rank >= 3 ? 0.4 : 0), delay: s.delay!, dmg: mult, dmgKind: 'fire',
        color: 0xff8a3a, opts: { burn: s.burn },
        onBoom: g => { scene.fx.burstArea('fire', g.x, g.y, g.radius, 30); scene.fx.ring(g.x, g.y, g.radius, 0xffa040, 400); scene.fx.flash(g.x, g.y, 0xff6a1a, 2.2, 300); scene.fx.spell('fx_blast', g.x, g.y, g.radius); scene.fx.shake(0.005, 140); Sfx.play('explode'); },
      }));
      return true;
    }
    case 'summon': {
      lock(0.7);
      Sfx.play(s.sfx);
      const n = s.count! + (rank >= 3 ? 1 : 0) + (rank >= 5 ? 1 : 0);
      scene.spawnWisps(n, s.duration!, mult);
      return true;
    }
    case 'charge': {
      const d = Math.min(s.range, l);
      const speed = 18;
      h.stop();
      h.act('attack', d / speed + 0.2);
      Sfx.play('dodge');
      const boom = () => {
        if (h.dash) h.dash.t = 0;
        scene.fx.ring(h.x, h.y, s.radius!, 0xd9b25a, 300);
        scene.fx.burst('bone', h.x, h.y, 10, 6);
        scene.fx.shake(0.006, 140);
        Sfx.play('stun');
        for (const e of scene.enemiesInRadius(h.x, h.y, s.radius!)) {
          const r = rollHeroDamage(scene, mult);
          damageEnemy(scene, e, r.amount, r.crit, { stun: s.stun, knock: 0.6, fromX: h.x, fromY: h.y });
        }
      };
      let boomed = false;
      h.startDash(nx * speed, ny * speed, d / speed, {
        hitR: 0.8, stopOnHit: true,
        onHit: () => { if (!boomed) { boomed = true; boom(); } },
        onEnd: () => { if (!boomed) { boomed = true; boom(); } },
      });
      return true;
    }
    case 'slam': {
      h.stop();
      lock(1);
      scene.time.delayedCall(220, () => {
        if (!h.alive) return;
        scene.fx.ring(h.x, h.y, s.radius!, 0xd9b25a, 450);
        scene.fx.spell('fx_quake', h.x, h.y, s.radius!, false);
        scene.fx.burstArea('bone', h.x, h.y, s.radius!, 26);
        scene.fx.burstArea('smoke', h.x, h.y, s.radius!, 10);
        scene.fx.shake(0.012, 220);
        Sfx.play('explode');
        for (const e of scene.enemiesInRadius(h.x, h.y, s.radius!)) {
          const r = rollHeroDamage(scene, mult);
          damageEnemy(scene, e, r.amount, r.crit, { stun: s.stun! + (rank >= 4 ? 0.5 : 0), knock: 0.4, fromX: h.x, fromY: h.y });
        }
        scene.hitWallsAround(h.x, h.y, s.radius!);
      });
      return true;
    }
    case 'buff': {
      lock(0.6);
      Sfx.play(s.sfx);
      h.bastionT = s.duration!;
      h.bastionThorns = rollHeroDamage(scene, mult).amount;
      h.restoreTint();
      scene.fx.ring(h.x, h.y, 1.6, 0x5ee0c8, 500);
      scene.fx.burst('teal', h.x, h.y, 24, 30);
      return true;
    }
    case 'trap': {
      lock(0.5);
      const k = Math.min(1, s.range / l);
      const px = h.x + dx * k, py = h.y + dy * k;
      if (!scene.level.walkable(Math.floor(px), Math.floor(py))) return false;
      Sfx.play(s.sfx);
      scene.placeTrap(px, py, s.radius!, mult, s.root!);
      return true;
    }
    case 'vault': {
      const d = s.range;
      h.stop();
      h.invuln = 0.35;
      h.act('cast', 0.3);
      Sfx.play(s.sfx);
      scene.fx.burst('void', h.x, h.y, 18, 30);
      scene.fx.spell('fx_mist', h.x, h.y, 1.4, false);
      h.startDash(-nx * 16, -ny * 16, d / 16, { onEnd: () => scene.fx.burst('void', h.x, h.y, 12, 30) });
      h.critAllT = s.duration!;
      return true;
    }
  }
  return false;
}

export function skillRangeHint(s: SkillDef) { return s.range; }
export { dist };
