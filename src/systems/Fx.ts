// Визуальная обратная связь: частицы, цифры урона, дуги ударов, вспышки, тряска экрана.
// Читаемость боя: каждое попадание даёт искры + цифру, крит — крупнее и с тряской.
import Phaser from 'phaser';
import { isoToScreen } from '../core/iso';
import { FONT } from '../config';
import { settings } from './Settings';
import { EXT_FX } from '../art/external';

type EmitterKey = 'spark' | 'fire' | 'void' | 'teal' | 'blood' | 'ash' | 'smoke' | 'gold' | 'bone' | 'heal';

export class FxManager {
  private em = {} as Record<EmitterKey, Phaser.GameObjects.Particles.ParticleEmitter>;
  private texts: Phaser.GameObjects.Text[] = [];
  private slashes: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene) {
    const mk = (key: EmitterKey, tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) => {
      const e = scene.add.particles(0, 0, tex, { emitting: false, ...cfg });
      e.setDepth(900000);
      this.em[key] = e;
    };
    mk('spark', 'p_spark', { speed: { min: 60, max: 220 }, lifespan: { min: 180, max: 380 }, scale: { start: 0.35, end: 0 }, tint: [0xffd080, 0xff8a3a], blendMode: 'ADD', gravityY: 200 });
    mk('fire', 'p_spark', { speed: { min: 30, max: 160 }, lifespan: { min: 300, max: 700 }, scale: { start: 0.6, end: 0 }, tint: [0xff4a10, 0xff8a3a, 0xffc060], blendMode: 'ADD', gravityY: -120 });
    mk('void', 'p_spark', { speed: { min: 40, max: 180 }, lifespan: { min: 300, max: 600 }, scale: { start: 0.5, end: 0 }, tint: [0x9a6bff, 0x5a3a8a], blendMode: 'ADD' });
    mk('teal', 'p_spark', { speed: { min: 40, max: 200 }, lifespan: { min: 250, max: 550 }, scale: { start: 0.45, end: 0 }, tint: [0x5ee0c8, 0x4fc6e0], blendMode: 'ADD' });
    mk('blood', 'p_blood', { speed: { min: 50, max: 180 }, lifespan: { min: 250, max: 500 }, scale: { start: 0.5, end: 0.2 }, tint: [0x8a0a12, 0x5a0408], gravityY: 500 });
    mk('ash', 'p_ash', { speed: { min: 20, max: 120 }, lifespan: { min: 500, max: 1100 }, scale: { start: 0.8, end: 0.2 }, tint: [0x8a827a, 0x5a534c], gravityY: 60, rotate: { min: 0, max: 360 } });
    mk('smoke', 'p_smoke', { speed: { min: 10, max: 60 }, lifespan: { min: 600, max: 1200 }, scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.35, end: 0 }, tint: 0x2a2228, gravityY: -40 });
    mk('gold', 'p_spark', { speed: { min: 40, max: 140 }, lifespan: { min: 300, max: 600 }, scale: { start: 0.35, end: 0 }, tint: 0xd9a65a, blendMode: 'ADD', gravityY: -60 });
    mk('bone', 'p_shard', { speed: { min: 80, max: 240 }, lifespan: { min: 300, max: 700 }, scale: { start: 0.5, end: 0.2 }, tint: [0x5a5048, 0x3a342e], gravityY: 400, rotate: { min: 0, max: 360 } });
    mk('heal', 'p_spark', { speed: { min: 10, max: 50 }, lifespan: { min: 500, max: 900 }, scale: { start: 0.45, end: 0 }, tint: [0xff5a5a, 0xffa0a0], blendMode: 'ADD', gravityY: -140 });
  }

  /** Всплеск частиц в мировой точке. h — высота над землёй в пикселях. */
  burst(kind: EmitterKey, wx: number, wy: number, n: number, h = 20) {
    const p = isoToScreen(wx, wy);
    this.em[kind].explode(n, p.x, p.y - h);
  }

  /** Всплеск по эллипсу (для взрывов по площади). */
  burstArea(kind: EmitterKey, wx: number, wy: number, r: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
      this.burst(kind, wx + Math.cos(a) * d, wy + Math.sin(a) * d, 1, 4);
    }
  }

  damageNumber(wx: number, wy: number, value: number | string, color: string, crit = false, h = 52) {
    if (!settings.damageNumbers && typeof value === 'number') return;
    const p = isoToScreen(wx, wy);
    let t = this.texts.find(x => !x.active);
    if (!t) {
      t = this.scene.add.text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', stroke: '#0a0606', strokeThickness: 4 }).setOrigin(0.5).setDepth(950000);
      this.texts.push(t);
    }
    t.setActive(true).setVisible(true).setText(typeof value === 'number' ? String(Math.max(1, Math.round(value))) : value)
      .setColor(color).setFontSize(crit ? 26 : 17).setPosition(p.x + (Math.random() - 0.5) * 20, p.y - h).setAlpha(1).setScale(crit ? 1.4 : 1);
    this.scene.tweens.add({
      targets: t, y: p.y - h - (crit ? 46 : 34), scale: 1, alpha: 0, duration: crit ? 900 : 700, ease: 'Cubic.easeOut',
      onComplete: () => t!.setActive(false).setVisible(false),
    });
  }

  /** Дуга удара: белая текстура, тонированная и повёрнутая по направлению атаки. */
  slash(wx: number, wy: number, dirx: number, diry: number, color: number, scale = 1, range = 1.7) {
    let s = this.slashes.find(x => !x.active);
    if (!s) { s = this.scene.add.image(0, 0, 'slash').setBlendMode(Phaser.BlendModes.ADD); this.slashes.push(s); }
    const p = isoToScreen(wx + dirx * range * 0.45, wy + diry * range * 0.45);
    const sd = { x: dirx - diry, y: (dirx + diry) / 2 };
    const ang = Math.atan2(sd.y, sd.x) + Math.PI / 2;
    s.setActive(true).setVisible(true).setPosition(p.x, p.y - 22).setRotation(ang).setTint(color)
      .setScale(0.32 * scale * range, 0.26 * scale * range).setAlpha(0.95).setDepth(800000);
    this.scene.tweens.add({ targets: s, alpha: 0, scaleX: s.scaleX * 1.25, duration: 200, onComplete: () => s!.setActive(false).setVisible(false) });
  }

  /** Расходящееся кольцо (удар по земле, нова). */
  ring(wx: number, wy: number, radius: number, color: number, dur = 350) {
    const p = isoToScreen(wx, wy);
    const img = this.scene.add.image(p.x, p.y, 'ring').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDepth(-99990).setScale(0.05, 0.025);
    const sx = radius * 64 / Math.SQRT2 / 112;
    this.scene.tweens.add({ targets: img, scaleX: sx, scaleY: sx / 2, alpha: { from: 1, to: 0 }, duration: dur, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  /** Вспышка света в точке (кратковременное свечение). */
  flash(wx: number, wy: number, color: number, size = 1, dur = 250) {
    const p = isoToScreen(wx, wy);
    const img = this.scene.add.image(p.x, p.y - 16, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDepth(850000).setScale(size).setAlpha(0.9);
    this.scene.tweens.add({ targets: img, alpha: 0, scale: size * 1.6, duration: dur, onComplete: () => img.destroy() });
  }

  /** Анимация заклинания из FLARE (fx_blast, fx_quake, fx_mist), растянутая под радиус в тайлах. Без листа — ничего. */
  spell(key: string, wx: number, wy: number, radius: number, add = true) {
    const m = EXT_FX[key];
    if (!m || !this.scene.anims.exists(key)) return;
    const p = isoToScreen(wx, wy);
    const scale = (radius * 2 * 64 / Math.SQRT2) / (m.fw * 0.9);
    const spr = this.scene.add.sprite(p.x, p.y, key, 0).setOrigin(m.ox / m.fw, m.oy / m.fh).setScale(scale).setDepth(add ? 850000 : -99980);
    if (add) spr.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
    spr.play(key).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.destroy());
  }

  shake(intensity: number, dur = 120) {
    if (!settings.shake) return;
    this.scene.cameras.main.shake(dur, intensity);
  }

  emitter(kind: EmitterKey) { return this.em[kind]; }
}
