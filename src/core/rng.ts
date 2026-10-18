// Детерминированный генератор случайных чисел (mulberry32).
// Один и тот же seed даёт одно и то же подземелье — удобно для отладки и кооператива.
export class RNG {
  private s: number;
  constructor(seed: number) { this.s = (seed >>> 0) || 0x9e3779b9; }

  /** Число в [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) { return a + (b - a) * this.next(); }
  /** Целое в [a, b] включительно. */
  int(a: number, b: number) { return Math.floor(this.range(a, b + 1)); }
  chance(p: number) { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** Взвешенный выбор: [{w: вес, v: значение}]. */
  weighted<T>(items: { w: number; v: T }[]): T {
    let sum = 0;
    for (const it of items) sum += it.w;
    let r = this.next() * sum;
    for (const it of items) { r -= it.w; if (r <= 0) return it.v; }
    return items[items.length - 1].v;
  }
}

/** Глобальный «несидированный» RNG для боевых бросков. */
export const rng = new RNG((Date.now() ^ (Math.random() * 1e9)) >>> 0);
