// Процедурные персонажи: «скелет» из точек (бёдра, колени, плечи, локти, кисти) + «скины» классов и врагов.
// Каждый лист: 2 стороны (S — лицом к зрителю, N — спиной; запад получается зеркалом) × 15 кадров:
//   idle 0–1 · walk 2–5 · attack 6–8 · cast 9–10 · hit 11 · death 12–14
import { RNG } from '../core/rng';
import { makeCanvas, hex, shade, mix, limb, glow, poly, fillShape, crack, hollowSunSigil, type Ctx } from './canvas';

export const ANIMS: Record<string, [number, number, number, number]> = {
  // имя: [первый кадр, последний, fps, повтор(-1 бесконечно / 0 один раз)]
  idle: [0, 1, 2.5, -1],
  walk: [2, 5, 9, -1],
  attack: [6, 8, 14, 0],
  cast: [9, 10, 8, 0],
  hit: [11, 11, 8, 0],
  death: [12, 14, 7, 0],
};
export const FRAMES_PER_SIDE = 15;

export interface Pose {
  side: 'S' | 'N';
  step: number;   // -1..1 — размах шага
  bob: number;    // вертикальное покачивание, px
  armF: number;   // угол ближней руки (0 — вниз, + вперёд)
  armB: number;   // угол дальней руки
  lean: number;   // наклон корпуса
  cast: number;   // 0..1 — сила свечения заклинания
  hit: boolean;
  death: number;  // 0..1
}

function posesFor(): Pose[] {
  const base = (o: Partial<Pose>): Pose => ({ side: 'S', step: 0, bob: 0, armF: 0.25, armB: -0.15, lean: 0, cast: 0, hit: false, death: 0, ...o });
  return [
    base({ bob: 0 }), base({ bob: 2, armF: 0.3, armB: -0.1 }),                                   // idle
    base({ step: 1, bob: -2, armF: -0.25, armB: 0.35 }), base({ step: 0, bob: 1 }),              // walk
    base({ step: -1, bob: -2, armF: 0.55, armB: -0.45 }), base({ step: 0, bob: 1 }),
    base({ armF: -2.3, armB: 0.6, lean: -0.12 }), base({ armF: 1.4, armB: -0.6, lean: 0.18, step: 0.5 }), base({ armF: 0.9, armB: -0.2, lean: 0.08 }), // attack
    base({ armF: -1.2, armB: -1.4, cast: 0.6, lean: -0.05 }), base({ armF: -1.6, armB: -1.8, cast: 1 }),        // cast
    base({ hit: true, lean: -0.25, armF: 0.8, armB: 0.9 }),                                        // hit
    base({ death: 0.3, lean: -0.3, armF: 1.2, armB: 1 }), base({ death: 0.7, armF: 1.6, armB: 1.4 }), base({ death: 1, armF: 1.7, armB: 1.6 }), // death
  ];
}

export interface Skin {
  scale: number;
  width: number;          // полуширина плеч
  skin: number;
  armor: number;
  armor2: number;
  cloak?: number;
  robe?: number;          // юбка-роба вместо ног
  legs: number;
  hunch?: number;         // постоянный наклон (гули)
  longArms?: boolean;
  head: (ctx: Ctx, x: number, y: number, p: Pose, s: number) => void;
  weaponF?: (ctx: Ctx, x: number, y: number, ang: number, p: Pose, s: number) => void; // в ближней руке
  weaponB?: (ctx: Ctx, x: number, y: number, ang: number, p: Pose, s: number) => void; // в дальней руке
  chest?: (ctx: Ctx, x: number, top: number, bot: number, p: Pose, s: number) => void;
  behind?: (ctx: Ctx, x: number, y: number, p: Pose, s: number) => void;               // ореол и т.п.
  castColor: number;
  alpha?: number;
}

/** Рисует одного гуманоида: ноги стоят в (ox, oy). */
export function drawHumanoid(ctx: Ctx, ox: number, oy: number, sk: Skin, p: Pose) {
  const s = sk.scale;
  ctx.save();
  ctx.globalAlpha = sk.alpha ?? 1;
  if (p.death > 0) {
    // падение назад: поворот вокруг стоп
    ctx.translate(ox, oy);
    ctx.rotate(-p.death * 1.35);
    ctx.translate(-ox + p.death * 10 * s, -oy + p.death * 8 * s);
  }
  const lean = p.lean + (sk.hunch || 0);
  const hipY = oy - 44 * s + p.bob * s * 0.5;
  const shY = oy - 84 * s + p.bob * s + Math.abs(lean) * 12 * s;
  const shift = lean * 38 * s;
  const W = sk.width * s;
  const front = p.side === 'S';

  // ореол/предметы за спиной
  if (sk.behind) sk.behind(ctx, ox + shift, shY - 14 * s, p, s);

  // плащ сзади (лицом к нам — плащ за телом)
  const drawCloak = () => {
    if (!sk.cloak) return;
    const sway = -p.step * 6 * s - 6 * s;
    ctx.beginPath();
    ctx.moveTo(ox - W + shift, shY + 2 * s);
    ctx.lineTo(ox + W + shift, shY + 2 * s);
    ctx.lineTo(ox + W * 1.1 + sway * 0.4, oy - 8 * s);
    // рваный край
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      ctx.lineTo(ox + W * 1.1 - t * W * 2.4 + sway, oy - (i % 2 ? 2 : 12) * s);
    }
    ctx.closePath();
    fillShape(ctx, sk.cloak, shY, oy, 0x070506, 2.5 * s, 0.05, -0.45);
  };
  if (front) drawCloak();

  // дальняя рука
  const arm = (sx: number, ang: number, color: number, isFront: boolean) => {
    const sy = shY + 6 * s;
    const L1 = (sk.longArms ? 24 : 19) * s, L2 = (sk.longArms ? 24 : 18) * s;
    const ex = sx + Math.sin(ang) * L1, ey = sy + Math.cos(ang) * L1;
    const bend = ang < -0.5 ? -0.5 : 0.35;
    const hx = ex + Math.sin(ang + bend) * L2, hy = ey + Math.cos(ang + bend) * L2;
    const wdt = (sk.width > 18 ? 10 : 8) * s;
    limb(ctx, sx, sy, ex, ey, wdt, color);
    limb(ctx, ex, ey, hx, hy, wdt * 0.85, shade(color, -0.08));
    // кисть
    ctx.fillStyle = hex(sk.longArms ? sk.skin : shade(sk.armor2, -0.1));
    ctx.beginPath(); ctx.arc(hx, hy, wdt * 0.55, 0, 7); ctx.fill();
    if (sk.longArms) {
      // когти
      ctx.strokeStyle = hex(0xd8cbb4); ctx.lineWidth = 1.5 * s;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 6 * s + k * 2 * s, hy + 7 * s); ctx.stroke(); }
    }
    const w = isFront ? sk.weaponF : sk.weaponB;
    if (w) w(ctx, hx, hy, ang + bend, p, s);
    if (p.cast > 0 && !isFront) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, hx, hy, 16 * s * p.cast, sk.castColor, 0.9); ctx.restore();
    }
  };
  const backX = ox - W * 0.8 + shift, frontX = ox + W * 0.8 + shift;
  if (front) arm(backX, p.armB, shade(sk.armor, -0.25), false);
  else arm(frontX, p.armF, shade(sk.armor, -0.25), true);

  // ноги или роба
  if (sk.robe) {
    const sway = p.step * 5 * s;
    ctx.beginPath();
    ctx.moveTo(ox - 12 * s + shift * 0.5, hipY - 4 * s);
    ctx.lineTo(ox + 12 * s + shift * 0.5, hipY - 4 * s);
    ctx.lineTo(ox + 20 * s + sway, oy - 2 * s);
    ctx.lineTo(ox - 20 * s + sway, oy - 2 * s);
    ctx.closePath();
    fillShape(ctx, sk.robe, hipY, oy, 0x070506, 2.5 * s, 0.05, -0.4);
    // складки
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2 * s;
    for (const k of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(ox + k * s * 0.6, hipY + 4 * s); ctx.lineTo(ox + k * s + sway, oy - 4 * s); ctx.stroke(); }
  } else {
    const leg = (dir: number, color: number) => {
      const st = p.step * dir;
      const hx = ox + dir * 6 * s + shift * 0.3;
      const fx = ox + dir * 5 * s + st * 12 * s;
      const fy = oy - Math.max(0, st) * 5 * s;
      const kx = (hx + fx) / 2 + 4 * s, ky = (hipY + fy) / 2 - 2 * s;
      limb(ctx, hx, hipY, kx, ky, 10 * s, color);
      limb(ctx, kx, ky, fx, fy - 4 * s, 9 * s, shade(color, -0.1));
      // сапог
      ctx.fillStyle = hex(0x120d0c); ctx.beginPath(); ctx.ellipse(fx + 3 * s, fy - 3 * s, 7 * s, 4 * s, 0, 0, 7); ctx.fill();
    };
    leg(-1, shade(sk.legs, -0.2));
    leg(1, sk.legs);
  }

  // торс
  const tw = W, hw = W * 0.72;
  ctx.beginPath();
  ctx.moveTo(ox - hw + shift * 0.3, hipY);
  ctx.lineTo(ox - tw + shift, shY);
  ctx.quadraticCurveTo(ox + shift, shY - 6 * s, ox + tw + shift, shY);
  ctx.lineTo(ox + hw + shift * 0.3, hipY);
  ctx.closePath();
  fillShape(ctx, sk.armor, shY, hipY, 0x070506, 3 * s, 0.18, -0.3);
  if (front && sk.chest) sk.chest(ctx, ox + shift * 0.6, shY, hipY, p, s);
  // пояс
  ctx.fillStyle = hex(shade(sk.armor2, -0.3)); ctx.fillRect(ox - hw + shift * 0.3, hipY - 5 * s, hw * 2, 5 * s);
  // наплечники
  for (const dx of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(ox + dx * tw * 0.85 + shift, shY + 3 * s, 8 * s * (sk.width > 18 ? 1.4 : 1), 6 * s, 0, 0, 7);
    fillShape(ctx, sk.armor2, shY - 4 * s, shY + 9 * s, 0x070506, 2 * s, 0.3, -0.2);
  }

  // голова
  sk.head(ctx, ox + shift * 1.15, shY - 14 * s, p, s);

  // спиной к нам — плащ поверх
  if (!front) drawCloak();

  // ближняя рука
  if (front) arm(frontX, p.armF, sk.armor, true);
  else arm(backX, p.armB, sk.armor, false);

  ctx.restore();
}

/** Лист кадров для гуманоида. */
export function humanoidSheet(sk: Skin, fw: number, fh: number, footY: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(fw * FRAMES_PER_SIDE, fh * 2);
  const poses = posesFor();
  (['S', 'N'] as const).forEach((side, row) => {
    poses.forEach((p0, i) => {
      const p = { ...p0, side };
      ctx.save();
      ctx.beginPath(); ctx.rect(i * fw, row * fh, fw, fh); ctx.clip();
      drawHumanoid(ctx, i * fw + fw / 2, row * fh + footY, sk, p);
      ctx.restore();
    });
  });
  return c;
}

// ─── Детали ──────────────────────────────────────────────────────
const eyes = (ctx: Ctx, x: number, y: number, s: number, color: number, gap = 4) => {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const dx of [-gap, gap]) { glow(ctx, x + dx * s + 2 * s, y, 4 * s, color, 1); ctx.fillStyle = hex(shade(color, 0.6)); ctx.fillRect(x + dx * s + 1 * s, y - 1 * s, 2.5 * s, 2 * s); }
  ctx.restore();
};

function curvedBlade(ctx: Ctx, x: number, y: number, ang: number, s: number, len = 30) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang);
  // рукоять
  ctx.fillStyle = hex(0x1a1210); ctx.fillRect(-2 * s, -2 * s, 4 * s, 8 * s);
  ctx.fillStyle = hex(0x8a6a40); ctx.fillRect(-6 * s, 4 * s, 12 * s, 3 * s);
  // изогнутое лезвие
  ctx.beginPath(); ctx.moveTo(-2 * s, 6 * s);
  ctx.quadraticCurveTo(10 * s, 18 * s, 4 * s, (6 + len) * s);
  ctx.quadraticCurveTo(2 * s, 18 * s, -3 * s, 7 * s); ctx.closePath();
  const g = ctx.createLinearGradient(0, 6 * s, 0, (6 + len) * s);
  g.addColorStop(0, hex(0x9a948c)); g.addColorStop(1, hex(0x4a4440));
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hex(0x0a0808); ctx.lineWidth = 1.5 * s; ctx.stroke();
  // тлеющая кромка
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hex(0xff7a2a, 0.7); ctx.lineWidth = 1.2 * s;
  ctx.beginPath(); ctx.moveTo(0, 10 * s); ctx.quadraticCurveTo(8 * s, 18 * s, 4 * s, (4 + len) * s); ctx.stroke();
  ctx.restore();
}

function staff(ctx: Ctx, x: number, y: number, ang: number, p: Pose, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang);
  limb(ctx, 0, -46 * s, 0, 26 * s, 4 * s, 0x3a2a20);
  // навершие: когти и угль
  ctx.strokeStyle = hex(0x1a1210); ctx.lineWidth = 3 * s;
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -44 * s); ctx.quadraticCurveTo(k * 10 * s, -52 * s, k * 3 * s, -60 * s); ctx.stroke(); }
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -52 * s, (12 + p.cast * 14) * s, 0xff6a1a, 1);
  ctx.fillStyle = hex(0xffd080); ctx.beginPath(); ctx.arc(0, -52 * s, 3.5 * s, 0, 7); ctx.fill();
  ctx.restore();
}

function hammer(ctx: Ctx, x: number, y: number, ang: number, _p: Pose, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang);
  limb(ctx, 0, -8 * s, 0, 40 * s, 4.5 * s, 0x3a2a20);
  ctx.beginPath(); ctx.rect(-15 * s, 34 * s, 30 * s, 18 * s);
  fillShape(ctx, 0x5a5450, 34 * s, 52 * s, 0x070506, 2.5 * s, 0.25, -0.3);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hex(0x5ee0c8, 0.6); ctx.lineWidth = 1.5 * s;
  ctx.beginPath(); ctx.moveTo(-6 * s, 38 * s); ctx.lineTo(0, 48 * s); ctx.lineTo(6 * s, 38 * s); ctx.stroke();
  ctx.restore();
}

function runeShield(ctx: Ctx, x: number, y: number, _ang: number, _p: Pose, s: number) {
  ctx.beginPath(); ctx.ellipse(x - 2 * s, y - 6 * s, 14 * s, 19 * s, 0, 0, 7);
  fillShape(ctx, 0x4a4038, y - 25 * s, y + 13 * s, 0x070506, 3 * s, 0.2, -0.35);
  ctx.beginPath(); ctx.ellipse(x - 2 * s, y - 6 * s, 10 * s, 14 * s, 0, 0, 7); ctx.strokeStyle = hex(0x7a6a5a); ctx.lineWidth = 2 * s; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hex(0x5ee0c8, 0.85); ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 18 * s); ctx.lineTo(x - 2 * s, y + 6 * s); ctx.moveTo(x - 8 * s, y - 10 * s); ctx.lineTo(x - 2 * s, y - 4 * s); ctx.lineTo(x + 4 * s, y - 10 * s); ctx.stroke();
  glow(ctx, x - 2 * s, y - 6 * s, 12 * s, 0x5ee0c8, 0.25);
  ctx.restore();
}

function bow(ctx: Ctx, x: number, y: number, _ang: number, p: Pose, s: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = hex(0x0a0808); ctx.lineWidth = 5 * s;
  ctx.beginPath(); ctx.moveTo(-2 * s, -30 * s); ctx.quadraticCurveTo(12 * s, 0, -2 * s, 30 * s); ctx.stroke();
  ctx.strokeStyle = hex(0x2a3238); ctx.lineWidth = 3 * s; ctx.stroke();
  ctx.strokeStyle = hex(0xbdb6a8, 0.6); ctx.lineWidth = 1 * s;
  const pull = p.armF < -1 ? -10 * s : 0;
  ctx.beginPath(); ctx.moveTo(-2 * s, -30 * s); ctx.lineTo(pull - 2 * s, 0); ctx.lineTo(-2 * s, 30 * s); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hex(0x4fc6e0, 0.5); ctx.lineWidth = 1.2 * s;
  ctx.beginPath(); ctx.moveTo(1 * s, -24 * s); ctx.quadraticCurveTo(9 * s, 0, 1 * s, 24 * s); ctx.stroke();
  ctx.restore();
}

function dagger(ctx: Ctx, x: number, y: number, ang: number, _p: Pose, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang);
  ctx.fillStyle = hex(0x1a1210); ctx.fillRect(-1.5 * s, -2 * s, 3 * s, 6 * s);
  poly(ctx, [-3 * s, 4 * s, 3 * s, 4 * s, 0, 20 * s]); ctx.fillStyle = hex(0x7a8a94); ctx.fill();
  ctx.strokeStyle = hex(0x0a0808); ctx.lineWidth = 1 * s; ctx.stroke();
  ctx.restore();
}

function glaive(ctx: Ctx, x: number, y: number, ang: number, p: Pose, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang);
  limb(ctx, 0, -30 * s, 0, 40 * s, 4 * s, 0x1a1412);
  ctx.beginPath(); ctx.moveTo(-3 * s, 38 * s);
  ctx.quadraticCurveTo(18 * s, 52 * s, 6 * s, 86 * s); ctx.quadraticCurveTo(-2 * s, 60 * s, -6 * s, 42 * s); ctx.closePath();
  fillShape(ctx, 0x2a2422, 38 * s, 86 * s, 0x050304, 2 * s, 0.25, -0.2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hex(0xff7a2a, 0.9); ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.moveTo(2 * s, 42 * s); ctx.quadraticCurveTo(15 * s, 54 * s, 6 * s, 82 * s); ctx.stroke();
  glow(ctx, 6 * s, 64 * s, (14 + p.cast * 10) * s, 0xff5a10, 0.5);
  ctx.restore();
}

function emberCracks(ctx: Ctx, x: number, top: number, bot: number, s: number, seed: number, color = 0xff7a2a, a = 0.75) {
  const r = new RNG(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) crack(ctx, r, x + r.range(-8, 8) * s, top + r.range(6, 16) * s, (bot - top) * 0.6, Math.PI / 2 + r.range(-0.8, 0.8), hex(color, a), 1.3 * s, 1);
  ctx.restore();
}

// ─── Скины классов ───────────────────────────────────────────────
export const SKINS: Record<string, Skin> = {
  blade: {
    scale: 1, width: 15, skin: 0x9a8a7a, armor: 0x3a2e2a, armor2: 0x6b5a50, cloak: 0x4a1418, legs: 0x2a2224, castColor: 0xff7a2a,
    head: (ctx, x, y, p, s) => {
      // капюшон с металлической полумаской
      ctx.beginPath(); ctx.moveTo(x - 12 * s, y + 6 * s); ctx.quadraticCurveTo(x - 13 * s, y - 14 * s, x, y - 16 * s); ctx.quadraticCurveTo(x + 13 * s, y - 14 * s, x + 12 * s, y + 6 * s); ctx.closePath();
      fillShape(ctx, 0x2a2226, y - 16 * s, y + 6 * s, 0x070506, 2.5 * s);
      if (p.side === 'S') {
        ctx.beginPath(); ctx.ellipse(x + 2 * s, y - 2 * s, 8 * s, 7 * s, 0, 0, 7); ctx.fillStyle = hex(0x0d0a0b); ctx.fill();
        poly(ctx, [x - 6 * s, y + 1 * s, x + 10 * s, y + 1 * s, x + 7 * s, y + 7 * s, x - 3 * s, y + 7 * s]); fillShape(ctx, 0x6b5a50, y, y + 7 * s, 0x070506, 1.5 * s, 0.3, -0.2);
        eyes(ctx, x + 1 * s, y - 3 * s, s, 0xff7a2a, 3.5);
      }
    },
    weaponF: (ctx, x, y, a, _p, s) => curvedBlade(ctx, x, y, a, s, 30),
    weaponB: (ctx, x, y, a, _p, s) => curvedBlade(ctx, x, y, a, s, 26),
    chest: (ctx, x, top, bot, _p, s) => {
      ctx.strokeStyle = hex(0x6b5a50); ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x - 12 * s, top + 4 * s); ctx.lineTo(x + 10 * s, bot - 8 * s); ctx.stroke();
      emberCracks(ctx, x, top, bot, s, 11);
    },
  },
  witch: {
    scale: 1, width: 13, skin: 0xb8aca0, armor: 0x2a1f2a, armor2: 0x3a2a34, robe: 0x241a24, legs: 0x241a24, castColor: 0xff6a1a,
    head: (ctx, x, y, p, s) => {
      // острый капюшон
      ctx.beginPath(); ctx.moveTo(x - 12 * s, y + 7 * s); ctx.quadraticCurveTo(x - 14 * s, y - 10 * s, x - 6 * s, y - 26 * s);
      ctx.quadraticCurveTo(x + 2 * s, y - 14 * s, x + 12 * s, y - 10 * s); ctx.quadraticCurveTo(x + 14 * s, y, x + 12 * s, y + 7 * s); ctx.closePath();
      fillShape(ctx, 0x1e161e, y - 26 * s, y + 7 * s, 0x070506, 2.5 * s);
      if (p.side === 'S') {
        ctx.beginPath(); ctx.ellipse(x + 2 * s, y - 1 * s, 7 * s, 8 * s, 0, 0, 7); fillShape(ctx, 0xb8aca0, y - 9 * s, y + 7 * s, 0x070506, 1.5 * s, 0.1, -0.4);
        eyes(ctx, x + 1 * s, y - 2 * s, s, 0xff8a3a, 3);
        ctx.strokeStyle = hex(0x3a1a1a, 0.8); ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(x - 1 * s, y + 4 * s); ctx.lineTo(x + 5 * s, y + 4 * s); ctx.stroke();
      }
    },
    weaponF: staff,
    chest: (ctx, x, top, bot, _p, s) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      hollowSunSigil(ctx, x, (top + bot) / 2, 6 * s, hex(0xff7a2a, 0.6), 1.2 * s);
      ctx.restore();
      ctx.strokeStyle = hex(0x5a2a1a); ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x - 10 * s, top + 2 * s); ctx.lineTo(x - 4 * s, bot); ctx.moveTo(x + 10 * s, top + 2 * s); ctx.lineTo(x + 4 * s, bot); ctx.stroke();
    },
  },
  bone: {
    scale: 1.12, width: 21, skin: 0x8a7a6a, armor: 0x4a443e, armor2: 0x7a6a5a, cloak: 0x2a2420, legs: 0x3a342e, castColor: 0x5ee0c8,
    head: (ctx, x, y, p, s) => {
      // ведро-шлем с Т-образной прорезью
      ctx.beginPath(); ctx.moveTo(x - 11 * s, y + 8 * s); ctx.lineTo(x - 12 * s, y - 8 * s); ctx.quadraticCurveTo(x, y - 18 * s, x + 12 * s, y - 8 * s); ctx.lineTo(x + 11 * s, y + 8 * s); ctx.closePath();
      fillShape(ctx, 0x6a5e54, y - 18 * s, y + 8 * s, 0x070506, 2.5 * s, 0.3, -0.35);
      ctx.fillStyle = hex(0x8a3a1a, 0.7); ctx.fillRect(x - 10 * s, y + 2 * s, 20 * s, 2 * s); // ржавчина
      if (p.side === 'S') {
        ctx.fillStyle = hex(0x070506); ctx.fillRect(x - 7 * s, y - 4 * s, 15 * s, 3 * s); ctx.fillRect(x - 1 * s, y - 4 * s, 3 * s, 10 * s);
        eyes(ctx, x, y - 3 * s, s, 0xd9b25a, 4);
      }
      // гребень
      ctx.fillStyle = hex(0x4a1418); ctx.fillRect(x - 2 * s, y - 22 * s, 4 * s, 8 * s);
    },
    weaponF: hammer,
    weaponB: runeShield,
    chest: (ctx, x, top, bot, _p, s) => {
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x - 16 * s, top + (8 + i * 9) * s); ctx.lineTo(x + 16 * s, top + (8 + i * 9) * s); ctx.stroke(); }
      ctx.fillStyle = hex(0x8a3a1a, 0.5); ctx.beginPath(); ctx.arc(x + 6 * s, top + 14 * s, 4 * s, 0, 7); ctx.fill();
    },
  },
  shade: {
    scale: 0.97, width: 13, skin: 0x8a8a8a, armor: 0x1c2630, armor2: 0x2a3640, cloak: 0x14202a, legs: 0x1a222a, castColor: 0x4fc6e0,
    head: (ctx, x, y, p, s) => {
      ctx.beginPath(); ctx.moveTo(x - 11 * s, y + 6 * s); ctx.quadraticCurveTo(x - 12 * s, y - 14 * s, x + 2 * s, y - 15 * s); ctx.quadraticCurveTo(x + 13 * s, y - 12 * s, x + 11 * s, y + 6 * s); ctx.closePath();
      fillShape(ctx, 0x111a22, y - 15 * s, y + 6 * s, 0x050405, 2.5 * s);
      if (p.side === 'S') {
        ctx.beginPath(); ctx.ellipse(x + 2 * s, y - 1 * s, 7 * s, 6 * s, 0, 0, 7); ctx.fillStyle = hex(0x050608); ctx.fill();
        eyes(ctx, x + 1 * s, y - 2 * s, s, 0x4fc6e0, 3);
        // шарф
        ctx.fillStyle = hex(0x2a3a44); ctx.fillRect(x - 8 * s, y + 3 * s, 18 * s, 5 * s);
      }
    },
    weaponF: dagger,
    weaponB: bow,
    chest: (ctx, x, top, bot, _p, s) => {
      ctx.strokeStyle = hex(0x3a2a20); ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(x + 10 * s, top + 2 * s); ctx.lineTo(x - 10 * s, bot - 4 * s); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x - 2 * s, top + 14 * s, 4 * s, 0x4fc6e0, 0.6); ctx.restore();
    },
  },

  // ─── Враги ─────────────────────────────────────────────────────
  ghoul: {
    scale: 0.95, width: 12, skin: 0x6a625a, armor: 0x5a524a, armor2: 0x6a625a, legs: 0x4a443e, hunch: 0.4, longArms: true, castColor: 0xff7a2a,
    head: (ctx, x, y, p, s) => {
      ctx.beginPath(); ctx.ellipse(x + 4 * s, y + 4 * s, 9 * s, 10 * s, 0.3, 0, 7); fillShape(ctx, 0x6a625a, y - 6 * s, y + 14 * s, 0x070506, 2 * s, 0.15, -0.4);
      if (p.side === 'S') {
        // челюсть и пустые глазницы
        ctx.fillStyle = hex(0x1a0e0c); ctx.fillRect(x + 1 * s, y + 9 * s, 9 * s, 3 * s);
        ctx.fillStyle = hex(0xd8cbb4); for (let k = 0; k < 4; k++) ctx.fillRect(x + (2 + k * 2) * s, y + 9 * s, 1 * s, 2 * s);
        eyes(ctx, x + 3 * s, y + 1 * s, s, 0xff5a20, 3);
      }
    },
    chest: (ctx, x, top, bot, _p, s) => {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5 * s;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 7 * s, top + (8 + i * 6) * s); ctx.quadraticCurveTo(x, top + (10 + i * 6) * s, x + 7 * s, top + (8 + i * 6) * s); ctx.stroke(); }
      emberCracks(ctx, x, top, bot, s, 21, 0xff5a20, 0.55);
      ctx.fillStyle = hex(0x2a2220); ctx.fillRect(x - 10 * s, bot - 6 * s, 20 * s, 9 * s);
    },
  },
  cultist: {
    scale: 1, width: 13, skin: 0x8a7a6a, armor: 0x3a1a1c, armor2: 0x5a2a2a, robe: 0x2e1416, legs: 0x2e1416, castColor: 0x9a6bff,
    head: (ctx, x, y, p, s) => {
      ctx.beginPath(); ctx.moveTo(x - 11 * s, y + 8 * s); ctx.quadraticCurveTo(x - 12 * s, y - 14 * s, x, y - 15 * s); ctx.quadraticCurveTo(x + 12 * s, y - 14 * s, x + 11 * s, y + 8 * s); ctx.closePath();
      fillShape(ctx, 0x2a1214, y - 15 * s, y + 8 * s, 0x070506, 2.5 * s);
      if (p.side === 'S') {
        // безликая латунная маска со знаком Пустого Солнца
        ctx.beginPath(); ctx.ellipse(x + 1 * s, y - 1 * s, 7.5 * s, 9 * s, 0, 0, 7); fillShape(ctx, 0xb08a4a, y - 10 * s, y + 8 * s, 0x070506, 1.5 * s, 0.35, -0.35);
        ctx.fillStyle = hex(0x070506); ctx.beginPath(); ctx.arc(x + 1 * s, y - 1 * s, 3 * s, 0, 7); ctx.fill();
        ctx.strokeStyle = hex(0x3a2a10); ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.arc(x + 1 * s, y - 1 * s, 5 * s, 0, 7); ctx.stroke();
      }
    },
    weaponF: (ctx, x, y, _a, p, s) => {
      // кадило на цепи
      ctx.strokeStyle = hex(0x6a5a40); ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 * s, y + 14 * s); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 2 * s, y + 18 * s, 5 * s, 0, 7); fillShape(ctx, 0xb08a4a, y + 13 * s, y + 23 * s, 0x070506, 1.5 * s);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x + 2 * s, y + 18 * s, (6 + p.cast * 6) * s, 0x9a6bff, 0.6); ctx.restore();
    },
    chest: (ctx, x, top, bot, _p, s) => {
      ctx.fillStyle = hex(0xbdb19a); ctx.fillRect(x - 2 * s, top + 2 * s, 4 * s, bot - top - 4 * s);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; hollowSunSigil(ctx, x, top + 14 * s, 5 * s, hex(0xd9a65a, 0.7), 1 * s); ctx.restore();
    },
  },
  shadow: {
    scale: 0.9, width: 12, skin: 0x150f1e, armor: 0x150f1e, armor2: 0x241a34, legs: 0x120c1a, hunch: 0.3, longArms: true, castColor: 0x9a6bff, alpha: 0.88,
    head: (ctx, x, y, p, s) => {
      ctx.beginPath(); ctx.ellipse(x + 3 * s, y + 3 * s, 9 * s, 10 * s, 0.2, 0, 7); fillShape(ctx, 0x150f1e, y - 7 * s, y + 13 * s, 0x9a6bff, 1.5 * s, 0.1, -0.3);
      if (p.side === 'S') eyes(ctx, x + 3 * s, y + 1 * s, s, 0xb08aff, 3);
    },
    chest: (ctx, x, top, bot, _p, s) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hex(0x9a6bff, 0.4); ctx.lineWidth = 1.5 * s;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 8 * s + i * 7 * s, top); ctx.quadraticCurveTo(x - 12 * s + i * 7 * s, (top + bot) / 2, x - 6 * s + i * 7 * s, bot + 10 * s); ctx.stroke(); }
      ctx.restore();
    },
  },
  herald: {
    scale: 1.9, width: 19, skin: 0x4a3a30, armor: 0x2a2422, armor2: 0x3e3430, cloak: 0x1a1214, legs: 0x221c1a, castColor: 0xff5a10,
    behind: (ctx, x, y, p, s) => {
      // ореол Пустого Солнца: чёрный диск с бледно-золотой короной
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y - 6 * s, 30 * s, 0xd9a65a, 0.45 + p.cast * 0.3);
      ctx.restore();
      ctx.fillStyle = hex(0x020102); ctx.beginPath(); ctx.arc(x, y - 6 * s, 17 * s, 0, 7); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      hollowSunSigil(ctx, x, y - 6 * s, 19 * s, hex(0xf0d8a0, 0.55), 1.2 * s);
      ctx.restore();
    },
    head: (ctx, x, y, p, s) => {
      ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 8 * s); ctx.lineTo(x - 11 * s, y - 7 * s); ctx.quadraticCurveTo(x, y - 15 * s, x + 11 * s, y - 7 * s); ctx.lineTo(x + 10 * s, y + 8 * s); ctx.closePath();
      fillShape(ctx, 0x2a2422, y - 15 * s, y + 8 * s, 0x050304, 2 * s, 0.2, -0.3);
      if (p.side === 'S') eyes(ctx, x, y - 2 * s, s, 0xfff0c0, 3.5);
      // корона чёрного пламени
      const r = new RNG(3);
      for (let i = 0; i < 7; i++) {
        const fx = x + (i - 3) * 3.4 * s, h = (8 + (i % 2) * 6 + r.range(0, 4)) * s;
        poly(ctx, [fx - 2.5 * s, y - 11 * s, fx + r.range(-1.5, 1.5) * s, y - 11 * s - h, fx + 2.5 * s, y - 11 * s]);
        ctx.fillStyle = hex(0x050304); ctx.fill();
        ctx.strokeStyle = hex(0xff6a1a, 0.9); ctx.lineWidth = 0.8 * s; ctx.stroke();
      }
    },
    weaponF: glaive,
    chest: (ctx, x, top, bot, _p, s) => {
      emberCracks(ctx, x, top, bot, s, 99, 0xff5a10, 0.9);
      emberCracks(ctx, x + 5 * s, top, bot, s, 77, 0xff8a3a, 0.6);
    },
  },
};

// ─── Четвероногие: теневой волк ──────────────────────────────────
export function wolfSheet(fw: number, fh: number, footY: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(fw * FRAMES_PER_SIDE, fh * 2);
  const poses = posesFor();
  (['S', 'N'] as const).forEach((side, row) => {
    poses.forEach((p, i) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(i * fw, row * fh, fw, fh); ctx.clip();
      drawWolf(ctx, i * fw + fw / 2, row * fh + footY, { ...p, side }, i);
      ctx.restore();
    });
  });
  return c;
}

function drawWolf(ctx: Ctx, ox: number, oy: number, p: Pose, frame: number) {
  const s = 1;
  ctx.save();
  if (p.death > 0) { ctx.translate(ox, oy); ctx.rotate(-p.death * 0.4); ctx.scale(1, 1 - p.death * 0.45); ctx.translate(-ox, -oy); }
  const attack = frame >= 6 && frame <= 8;
  const stretch = attack ? (frame === 7 ? 12 : 4) : 0;
  const bodyY = oy - 34 + p.bob - (attack && frame === 7 ? 6 : 0);
  const col = 0x1a1622;
  // хвост-дым
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) { ctx.strokeStyle = hex(k ? 0x5a3a8a : 0x3fe0c4, 0.25); ctx.lineWidth = 6 - k * 1.5; ctx.beginPath(); ctx.moveTo(ox - 28, bodyY - 4); ctx.quadraticCurveTo(ox - 48, bodyY - 18 - k * 4 + p.step * 4, ox - 58, bodyY - 8 - k * 6); ctx.stroke(); }
  ctx.restore();
  // ноги (две пары в противофазе)
  const leg = (x: number, ph: number, dark: boolean) => {
    const sw = (frame >= 2 && frame <= 5 ? p.step : 0) * ph * 9 + (attack ? ph * 6 : 0);
    limb(ctx, x, bodyY + 4, x + sw * 0.5 + 2, bodyY + 18, 6, dark ? 0x0d0b12 : 0x15121c);
    limb(ctx, x + sw * 0.5 + 2, bodyY + 18, x + sw, oy - 2, 5, dark ? 0x0d0b12 : 0x15121c);
  };
  leg(ox - 18, -1, true); leg(ox + 16 + stretch, 1, true);
  // тело
  ctx.beginPath(); ctx.ellipse(ox + stretch * 0.4, bodyY, 30 + stretch * 0.5, 13, -0.05, 0, 7);
  fillShape(ctx, col, bodyY - 13, bodyY + 13, 0x050407, 2.5, 0.15, -0.3);
  // загривок-шерсть
  ctx.fillStyle = hex(0x241e30);
  for (let k = 0; k < 6; k++) poly(ctx, [ox - 14 + k * 7, bodyY - 10, ox - 10 + k * 7, bodyY - 20 - (k % 2) * 4, ox - 6 + k * 7, bodyY - 10]), ctx.fill();
  leg(ox - 12, 1, false); leg(ox + 22 + stretch, -1, false);
  // голова
  const hx = ox + 30 + stretch, hy = bodyY - (p.side === 'N' ? 12 : 8) + (attack ? 4 : 0);
  ctx.beginPath(); ctx.moveTo(hx - 10, hy - 10); ctx.lineTo(hx + 4, hy - 12); ctx.lineTo(hx + 22, hy - 2); ctx.lineTo(hx + 20, hy + 4);
  if (attack && frame === 7) { ctx.lineTo(hx + 8, hy + 2); ctx.lineTo(hx + 18, hy + 12); }
  ctx.lineTo(hx + 2, hy + 8); ctx.lineTo(hx - 10, hy + 6); ctx.closePath();
  fillShape(ctx, col, hy - 12, hy + 10, 0x050407, 2.5, 0.2, -0.3);
  // уши
  poly(ctx, [hx - 6, hy - 9, hx - 2, hy - 22, hx + 2, hy - 10]); ctx.fillStyle = hex(0x241e30); ctx.fill();
  if (p.side === 'S') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, hx + 8, hy - 4, 6, 0x6ff0ff, 1); ctx.fillStyle = hex(0xd0ffff); ctx.fillRect(hx + 6, hy - 5, 4, 2); ctx.restore();
  }
  // клубы теней по краям
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = new RNG(frame + 1);
  for (let k = 0; k < 5; k++) glow(ctx, ox + r.range(-26, 26), bodyY + r.range(-12, 10), r.range(5, 9), 0x5a3a8a, 0.18);
  ctx.restore();
  ctx.restore();
}

/** Дух ведьмы и общий блик — простые одиночные текстуры. */
export function drawWisp(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 64);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 32, 32, 30, 0xff6a1a, 0.7);
  glow(ctx, 32, 32, 12, 0xffd080, 1);
  ctx.fillStyle = hex(mix(0xffffff, 0xffd080, 0.5)); ctx.beginPath(); ctx.arc(32, 32, 4, 0, 7); ctx.fill();
  return c;
}
