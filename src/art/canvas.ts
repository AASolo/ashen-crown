// Вспомогательные функции процедурного рисования на Canvas 2D.
import { RNG } from '../core/rng';

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

/** Число → css-цвет. */
export const hex = (n: number, a = 1) =>
  a >= 1 ? '#' + n.toString(16).padStart(6, '0') : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;

/** Смешение двух цветов. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
export const shade = (c: number, k: number) => (k >= 0 ? mix(c, 0xffffff, k) : mix(c, 0x000000, -k));

/** Ромб изометрического тайла с верхней вершиной в (x, y). */
export function diamondPath(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w / 2, y + h / 2); ctx.lineTo(x, y + h); ctx.lineTo(x - w / 2, y + h / 2);
  ctx.closePath();
}

export function poly(ctx: Ctx, pts: number[], close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  if (close) ctx.closePath();
}

/** Радиальное свечение. */
export function glow(ctx: Ctx, x: number, y: number, r: number, color: number, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hex(color, a)); g.addColorStop(0.4, hex(color, a * 0.45)); g.addColorStop(1, hex(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/** Конечность «с контуром»: тёмная обводка, затем цвет, затем блик. */
export function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, wdt: number, color: number, outline = 0x0a0708) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = hex(outline); ctx.lineWidth = wdt + 4;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = hex(color); ctx.lineWidth = wdt;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = hex(shade(color, 0.18), 0.6); ctx.lineWidth = Math.max(1, wdt * 0.3);
  ctx.beginPath(); ctx.moveTo(x1 - wdt * 0.15, y1 - wdt * 0.1); ctx.lineTo(x2 - wdt * 0.15, y2 - wdt * 0.1); ctx.stroke();
}

/** Заливка формы с обводкой и вертикальным градиентом (верх светлее). */
export function fillShape(ctx: Ctx, color: number, y0: number, y1: number, outline = 0x0a0708, lw = 3, light = 0.15, dark = -0.35) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, hex(shade(color, light))); g.addColorStop(1, hex(shade(color, dark)));
  ctx.fillStyle = g; ctx.fill();
  if (lw > 0) { ctx.strokeStyle = hex(outline); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

/** Шум-«крапинки» внутри текущего клипа (фактура камня, пепла). */
export function speckle(ctx: Ctx, r: RNG, x: number, y: number, w: number, h: number, n: number, colors: number[], size = [1, 3], alpha = 0.5) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = hex(r.pick(colors), alpha * r.range(0.4, 1));
    const s = r.range(size[0], size[1]);
    ctx.fillRect(x + r.next() * w, y + r.next() * h, s, s * r.range(0.5, 1));
  }
}

/** Ломаная трещина. */
export function crack(ctx: Ctx, r: RNG, x: number, y: number, len: number, ang: number, color: string, width: number, branches = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y);
  let cx = x, cy = y, a = ang;
  const steps = Math.max(2, Math.floor(len / 6));
  for (let i = 0; i < steps; i++) {
    a += r.range(-0.6, 0.6);
    cx += Math.cos(a) * len / steps; cy += Math.sin(a) * len / steps * 0.6;
    ctx.lineTo(cx, cy);
    if (branches > 0 && r.chance(0.25)) { ctx.stroke(); crack(ctx, r, cx, cy, len * 0.4, a + r.range(-1.2, 1.2), color, width * 0.7, branches - 1); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(cx, cy); }
  }
  ctx.stroke();
}

/** Оккультный знак Пустого Солнца: круг, луч-корона, внутренний чёрный диск. */
export function hollowSunSigil(ctx: Ctx, x: number, y: number, r: number, color: string, lw = 2) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
    ctx.lineTo(x + Math.cos(a) * r * (i % 2 ? 0.92 : 1.25), y + Math.sin(a) * r * (i % 2 ? 0.92 : 1.25));
    ctx.stroke();
  }
  ctx.restore();
}
