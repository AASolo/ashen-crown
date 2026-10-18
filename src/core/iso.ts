// Изометрическая проекция 2:1.
// Мировые координаты (x, y) измеряются в тайлах; экранные — в пикселях.
import { TILE_W, TILE_H } from '../config';

export interface P { x: number; y: number }

/** Мир → экран (центр тайла (tx+0.5, ty+0.5) попадает в центр ромба). */
export function isoToScreen(x: number, y: number): P {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

/** Экран → мир (обратное преобразование). */
export function screenToIso(sx: number, sy: number): P {
  return { x: sy / TILE_H + sx / TILE_W, y: sy / TILE_H - sx / TILE_W };
}

/** Глубина отрисовки: чем ниже на экране, тем ближе к зрителю. */
export function depthOf(x: number, y: number): number {
  return (x + y) * (TILE_H / 2);
}

/** Радиус круга в мире → полуоси эллипса на экране. */
export function isoEllipse(r: number): { rx: number; ry: number } {
  return { rx: r * TILE_W / Math.SQRT2, ry: r * TILE_H / Math.SQRT2 };
}

/** Мировой вектор направления → экранный (для выбора стороны спрайта). */
export function dirToScreen(dx: number, dy: number): P {
  return { x: dx - dy, y: (dx + dy) / 2 };
}

/** Экранный вектор → мировой (для WASD: «вверх по экрану» = (-1,-1) в мире). */
export function screenDirToWorld(sx: number, sy: number): P {
  const x = sy + sx / 2, y = sy - sx / 2;
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
