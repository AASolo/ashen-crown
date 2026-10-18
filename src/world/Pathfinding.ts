// Поиск пути.
//  • A* — для героя (клик по карте): 8 направлений, без «срезания» углов стен.
//  • Поле потоков (BFS от героя) — для толп врагов: одна волна на всех, O(клеток) вместо A* на каждого.

export type Walkable = (x: number, y: number) => boolean;

const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

/** Минимальная двоичная куча для открытого списка A*. */
class Heap {
  private a: number[] = []; private f: Float32Array;
  constructor(size: number) { this.f = new Float32Array(size); }
  get size() { return this.a.length; }
  push(n: number, f: number) {
    this.f[n] = f; const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (this.f[a[p]] <= f) break; a[i] = a[p]; i = p; }
    a[i] = n;
  }
  pop(): number {
    const a = this.a; const top = a[0]; const last = a.pop()!;
    if (a.length) {
      let i = 0; const f = this.f[last];
      for (;;) {
        let c = i * 2 + 1; if (c >= a.length) break;
        if (c + 1 < a.length && this.f[a[c + 1]] < this.f[a[c]]) c++;
        if (this.f[a[c]] >= f) break;
        a[i] = a[c]; i = c;
      }
      a[i] = last;
    }
    return top;
  }
}

export function astar(w: number, h: number, walk: Walkable, sx: number, sy: number, tx: number, ty: number, maxNodes = 6000): { x: number; y: number }[] | null {
  if (!walk(tx, ty)) return null;
  const N = w * h;
  const g = new Float32Array(N).fill(Infinity);
  const from = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = new Heap(N);
  const s = sy * w + sx, t = ty * w + tx;
  g[s] = 0; heap.push(s, 0);
  let visited = 0;
  while (heap.size) {
    const c = heap.pop();
    if (c === t) break;
    if (closed[c]) continue;
    closed[c] = 1;
    if (++visited > maxNodes) return null;
    const cx = c % w, cy = (c / w) | 0;
    for (const [dx, dy, cost] of D8) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !walk(nx, ny)) continue;
      if (dx && dy && (!walk(cx + dx, cy) || !walk(cx, cy + dy))) continue; // не режем углы
      const n = ny * w + nx; const ng = g[c] + cost;
      if (ng < g[n]) {
        g[n] = ng; from[n] = c;
        const hx = Math.abs(nx - tx), hy = Math.abs(ny - ty);
        heap.push(n, ng + Math.max(hx, hy) + 0.414 * Math.min(hx, hy));
      }
    }
  }
  if (from[t] < 0 && s !== t) return null;
  const path: { x: number; y: number }[] = [];
  for (let c = t; c !== s && c >= 0; c = from[c]) path.push({ x: c % w + 0.5, y: ((c / w) | 0) + 0.5 });
  path.reverse();
  return path;
}

/** Поле расстояний от цели (героя). Враг идёт в соседнюю клетку с меньшим значением. */
export class FlowField {
  dist: Int16Array;
  private q: Int32Array;
  originX = -1; originY = -1;
  constructor(public w: number, public h: number) {
    this.dist = new Int16Array(w * h);
    this.q = new Int32Array(w * h);
  }

  build(walk: Walkable, ox: number, oy: number, maxDist = 45) {
    this.originX = ox; this.originY = oy;
    const { w, h, dist, q } = this;
    dist.fill(-1);
    let head = 0, tail = 0;
    const s = oy * w + ox; dist[s] = 0; q[tail++] = s;
    while (head < tail) {
      const c = q[head++]; const d = dist[c];
      if (d >= maxDist) continue;
      const cx = c % w, cy = (c / w) | 0;
      for (const [dx, dy] of D8) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (dist[n] >= 0 || !walk(nx, ny)) continue;
        if (dx && dy && (!walk(cx + dx, cy) || !walk(cx, cy + dy))) continue;
        dist[n] = d + 1; q[tail++] = n;
      }
    }
  }

  /** Направление движения из точки (x, y) к цели. */
  dir(x: number, y: number): { x: number; y: number } | null {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    const here = this.dist[ty * this.w + tx];
    if (here < 0) return null;
    let best = here, bx = 0, by = 0;
    for (const [dx, dy] of D8) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
      const v = this.dist[ny * this.w + nx];
      if (v >= 0 && v < best) { best = v; bx = dx; by = dy; }
    }
    if (best === here) return null;
    // целимся в центр следующей клетки — плавное огибание углов
    const cx = tx + bx + 0.5 - x, cy = ty + by + 0.5 - y;
    const l = Math.hypot(cx, cy) || 1;
    return { x: cx / l, y: cy / l };
  }

  at(x: number, y: number): number {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return -1;
    return this.dist[ty * this.w + tx];
  }
}

/** Прямая видимость по Брезенхэму (для агро и дальнобойных атак). */
export function lineOfSight(walk: Walkable, x0: number, y0: number, x1: number, y1: number): boolean {
  let x = Math.floor(x0), y = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1);
  const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 200; i++) {
    if (x === ex && y === ey) return true;
    if (!walk(x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}
