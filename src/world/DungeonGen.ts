// Процедурная генерация этажей.
//  • «Затонувшие Катакомбы» — BSP: комнаты в листьях дерева, коридоры между соседями.
//  • «Пепельные Пустоши» — клеточный автомат: пещеры/руины, остаётся крупнейшая область.
// Общая постобработка: старт, комната босса (самая дальняя по BFS), элитные комнаты,
// тайник за разрушаемой стеной, ловушки, сундуки, декор, стаи врагов.
// Гарантия проходимости: всё строится от связного графа, а твёрдые пропсы ставятся
// только в клетки с полностью свободным окружением 3×3 (такой блок не разрывает связность).
import { RNG } from '../core/rng';

export const T_VOID = 0;    // скала / стена
export const T_FLOOR = 1;
export const T_CRACKED = 2; // трещиноватая стена — ломается ударами, ведёт в тайник
export const T_HOUSE = 4;   // клетка дома или палатки FLARE (картинка нарезана по клеткам)
export const T_WATER = 5;   // вода: не пройти, но видно насквозь

/** Части домов и палаток FLARE: [dx, dy, номер тайла] от опорной клетки (как в картах FLARE). */
export const STRUCTS: Record<string, { parts: [number, number, number][]; foot: [number, number, number, number] }> = {
  house_a: { parts: [[0, -2, 211], [0, -1, 210], [-1, 0, 208], [0, 0, 209]], foot: [-1, -2, 0, 0] },
  house_b: { parts: [[0, -1, 215], [-2, 0, 212], [-1, 0, 213], [0, 0, 214]], foot: [-2, -1, 0, 0] },
  tent_a: { parts: [[0, -1, 73], [0, 0, 72]], foot: [0, -1, 0, 0] },
  tent_b: { parts: [[-1, 0, 74], [0, 0, 75]], foot: [-1, 0, 0, 0] },
  // старая башня-мельница: одна большая картинка, основание 5×5 позади опорной клетки
  tower: { parts: [[0, 0, 296]], foot: [-3, -5, 1, -1] },
};

export type Theme = 'catacombs' | 'ashlands' | 'surface';

export interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number }

export type PropType =
  | 'pillar' | 'tree' | 'brazier' | 'chest' | 'altar' | 'crystal' | 'bones' | 'puddle' | 'rubble'
  | 'blood' | 'ashpile' | 'grave' | 'cart' | 'banner'
  // поверхность (картинки FLARE grassland)
  | 'struct' | 'dock' | 'campfire' | 'rock' | 'stump' | 'crate' | 'logs' | 'fence' | 'sign' | 'anvil' | 'stone'
  | 'bush' | 'tuft' | 'reed';

export interface Prop {
  type: PropType; x: number; y: number; solid: boolean; elite?: boolean; secret?: boolean;
  /** вариант картинки; для 'struct' — ключ из STRUCTS */
  v?: number | string;
  burnt?: boolean;
}

export interface Spawn { x: number; y: number; type: string; elite: boolean; leader?: boolean; tag?: string }

export interface Dungeon {
  w: number; h: number;
  theme: Theme;
  tiles: Uint8Array;
  solid: Uint8Array;        // 1 — непроходимо (стена или твёрдый пропс)
  rooms: Room[];
  start: { x: number; y: number };
  boss: { x: number; y: number };
  bossRoom: Room;
  props: Prop[];
  spawns: Spawn[];
  traps: { x: number; y: number }[];
  secrets: { x: number; y: number }[]; // координаты трещиноватых стен
  seed: number;
  /** Опорные точки поверхности: лагерь, мельница, колодец и т.п. */
  poi?: Record<string, { x: number; y: number }>;
  /** Клетки мощёной дороги (поверхность). */
  road?: Uint8Array;
}

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function generateDungeon(seed: number, depth: number, theme: Theme): Dungeon {
  // До 10 попыток: если что-то не сошлось (редко), берём следующий seed.
  for (let attempt = 0; attempt < 10; attempt++) {
    const r = new RNG(seed + attempt * 7919);
    const d = theme === 'catacombs' ? genBSP(r, 70, 70) : genCaves(r, 72, 72);
    if (!d) continue;
    d.seed = seed;
    if (postProcess(d, r, depth)) return d;
  }
  throw new Error('Не удалось сгенерировать подземелье');
}

function blank(w: number, h: number, theme: Theme): Dungeon {
  return {
    w, h, theme, tiles: new Uint8Array(w * h), solid: new Uint8Array(w * h).fill(1),
    rooms: [], start: { x: 0, y: 0 }, boss: { x: 0, y: 0 }, bossRoom: { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 },
    props: [], spawns: [], traps: [], secrets: [], seed: 0,
  };
}

const idx = (d: Dungeon, x: number, y: number) => y * d.w + x;
const inside = (d: Dungeon, x: number, y: number, m = 1) => x >= m && y >= m && x < d.w - m && y < d.h - m;
const carve = (d: Dungeon, x: number, y: number) => { if (inside(d, x, y)) d.tiles[idx(d, x, y)] = T_FLOOR; };

// ─── BSP ─────────────────────────────────────────────────────────
interface Leaf { x: number; y: number; w: number; h: number; a?: Leaf; b?: Leaf; room?: Room }

function genBSP(r: RNG, w: number, h: number): Dungeon | null {
  const d = blank(w, h, 'catacombs');
  const MIN = 11;
  const root: Leaf = { x: 1, y: 1, w: w - 2, h: h - 2 };
  const split = (l: Leaf, depth: number) => {
    if (depth > 5) return;
    const canH = l.h >= MIN * 2, canV = l.w >= MIN * 2;
    if (!canH && !canV) return;
    let horiz = canH && (!canV || (l.h > l.w * 1.2 ? true : l.w > l.h * 1.2 ? false : r.chance(0.5)));
    if (horiz) {
      const s = r.int(MIN, l.h - MIN);
      l.a = { x: l.x, y: l.y, w: l.w, h: s };
      l.b = { x: l.x, y: l.y + s, w: l.w, h: l.h - s };
    } else {
      const s = r.int(MIN, l.w - MIN);
      l.a = { x: l.x, y: l.y, w: s, h: l.h };
      l.b = { x: l.x + s, y: l.y, w: l.w - s, h: l.h };
    }
    split(l.a, depth + 1); split(l.b, depth + 1);
  };
  split(root, 0);

  // комнаты в листьях
  const makeRooms = (l: Leaf) => {
    if (l.a && l.b) { makeRooms(l.a); makeRooms(l.b); return; }
    const rw = r.int(6, Math.max(6, l.w - 3));
    const rh = r.int(6, Math.max(6, l.h - 3));
    const rx = l.x + r.int(1, Math.max(1, l.w - rw - 1));
    const ry = l.y + r.int(1, Math.max(1, l.h - rh - 1));
    const room: Room = { x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) };
    l.room = room;
    d.rooms.push(room);
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) carve(d, x, y);
  };
  makeRooms(root);

  // коридоры шириной 2 между ближайшими комнатами двух поддеревьев
  const roomsOf = (l: Leaf): Room[] => (l.room ? [l.room] : [...roomsOf(l.a!), ...roomsOf(l.b!)]);
  const connect = (l: Leaf) => {
    if (!l.a || !l.b) return;
    connect(l.a); connect(l.b);
    const A = roomsOf(l.a), B = roomsOf(l.b);
    let best: [Room, Room] = [A[0], B[0]], bd = 1e9;
    for (const ra of A) for (const rb of B) {
      const dd = Math.abs(ra.cx - rb.cx) + Math.abs(ra.cy - rb.cy);
      if (dd < bd) { bd = dd; best = [ra, rb]; }
    }
    corridor(d, best[0].cx, best[0].cy, best[1].cx, best[1].cy, r.chance(0.5));
  };
  connect(root);
  // пара лишних коридоров — петли, чтобы не было одной «кишки»
  for (let i = 0; i < 2; i++) {
    const a = r.pick(d.rooms), b = r.pick(d.rooms);
    if (a !== b && Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) < 30) corridor(d, a.cx, a.cy, b.cx, b.cy, r.chance(0.5));
  }
  return d.rooms.length >= 5 ? d : null;
}

function corridor(d: Dungeon, x1: number, y1: number, x2: number, y2: number, hFirst: boolean) {
  const line = (ax: number, ay: number, bx: number, by: number) => {
    const sx = Math.sign(bx - ax), sy = Math.sign(by - ay);
    let x = ax, y = ay;
    for (;;) {
      carve(d, x, y); carve(d, x + 1, y); carve(d, x, y + 1); carve(d, x + 1, y + 1);
      if (x === bx && y === by) break;
      if (x !== bx) x += sx; else y += sy;
    }
  };
  if (hFirst) { line(x1, y1, x2, y1); line(x2, y1, x2, y2); }
  else { line(x1, y1, x1, y2); line(x1, y2, x2, y2); }
}

// ─── Клеточный автомат ───────────────────────────────────────────
function genCaves(r: RNG, w: number, h: number): Dungeon | null {
  const d = blank(w, h, 'ashlands');
  let g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
    g[y * w + x] = edge || r.chance(0.46) ? 0 : 1;
  }
  for (let it = 0; it < 6; it++) {
    const n = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let walls = 0, walls2 = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!g[(y + dy) * w + x + dx]) walls++;
      if (it < 3) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h || !g[yy * w + xx]) walls2++;
      }
      // правило 4-5 + «засев» пустот, чтобы не было огромных пустых полей
      n[y * w + x] = walls >= 5 || (it < 3 && walls2 <= 2) ? 0 : 1;
    }
    g = n;
  }
  d.tiles = g;
  // оставить крупнейшую связную область
  const region = new Int32Array(w * h).fill(-1);
  let bestId = -1, bestSize = 0, id = 0;
  for (let i = 0; i < w * h; i++) {
    if (!g[i] || region[i] >= 0) continue;
    const q = [i]; region[i] = id; let size = 0;
    while (q.length) {
      const c = q.pop()!; size++;
      const cx = c % w, cy = (c / w) | 0;
      for (const [dx, dy] of DIRS4) {
        const n = (cy + dy) * w + cx + dx;
        if (g[n] && region[n] < 0) { region[n] = id; q.push(n); }
      }
    }
    if (size > bestSize) { bestSize = size; bestId = id; }
    id++;
  }
  for (let i = 0; i < w * h; i++) if (region[i] !== bestId) g[i] = 0;
  if (bestSize < w * h * 0.3) return null;
  return d;
}

// ─── Постобработка ───────────────────────────────────────────────
function bfs(d: Dungeon, sx: number, sy: number, passCracked = false): Int32Array {
  const dist = new Int32Array(d.w * d.h).fill(-1);
  const q = [idx(d, sx, sy)]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h]; const cx = c % d.w, cy = (c / d.w) | 0;
    for (const [dx, dy] of DIRS4) {
      const n = idx(d, cx + dx, cy + dy);
      const t = d.tiles[n];
      if ((t === T_FLOOR || (passCracked && t === T_CRACKED)) && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); }
    }
  }
  return dist;
}

function postProcess(d: Dungeon, r: RNG, depth: number): boolean {
  const { w } = d;
  // Старт: катакомбы — комната ближе всего к верхнему углу; пустоши — свободная клетка там же.
  if (d.theme === 'catacombs') {
    const s = d.rooms.reduce((a, b) => (a.cx + a.cy < b.cx + b.cy ? a : b));
    d.start = { x: s.cx, y: s.cy };
  } else {
    let best = 1e9;
    for (let i = 0; i < d.tiles.length; i++) if (d.tiles[i]) {
      const x = i % w, y = (i / w) | 0;
      // клетка с открытым окружением
      let open = true;
      for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1; dx++) if (!d.tiles[idx(d, x + dx, y + dy)]) { open = false; break; }
      if (open && x + y < best) { best = x + y; d.start = { x, y }; }
    }
  }
  let dist = bfs(d, d.start.x, d.start.y);

  // Босс — самая дальняя точка; вокруг неё вырезается арена.
  let far = 0, fi = 0;
  for (let i = 0; i < dist.length; i++) if (dist[i] > far) { far = dist[i]; fi = i; }
  if (far < 25) return false;
  let bx = fi % w, by = (fi / w) | 0;
  if (d.theme === 'catacombs') {
    const room = d.rooms.find(rm => bx >= rm.x - 1 && bx <= rm.x + rm.w && by >= rm.y - 1 && by <= rm.y + rm.h);
    if (room) { bx = room.cx; by = room.cy; }
  }
  const R = 6;
  bx = Math.max(R + 2, Math.min(d.w - R - 3, bx)); by = Math.max(R + 2, Math.min(d.h - R - 3, by));
  for (let y = by - R; y <= by + R; y++) for (let x = bx - R; x <= bx + R; x++) {
    const k = ((x - bx) ** 2) / (R * R) + ((y - by) ** 2) / (R * R);
    if (k <= 1.05) carve(d, x, y);
  }
  // гарантируем, что арена связана: прорубаем тоннель к ближайшей достижимой клетке
  dist = bfs(d, d.start.x, d.start.y);
  if (dist[idx(d, bx, by)] < 0) {
    let bd = 1e9, tx = d.start.x, ty = d.start.y;
    for (let i = 0; i < dist.length; i++) if (dist[i] >= 0) {
      const x = i % w, y = (i / w) | 0; const dd = Math.abs(x - bx) + Math.abs(y - by);
      if (dd < bd) { bd = dd; tx = x; ty = y; }
    }
    corridor(d, tx, ty, bx, by, true);
    dist = bfs(d, d.start.x, d.start.y);
  }
  d.boss = { x: bx, y: by };
  d.bossRoom = { x: bx - R, y: by - R, w: R * 2 + 1, h: R * 2 + 1, cx: bx, cy: by };

  // Для пустошей «комнаты» — опорные точки пуассоновской выборки (для спавна).
  if (d.theme === 'ashlands') {
    const pts: Room[] = [];
    for (let k = 0; k < 600 && pts.length < 18; k++) {
      const x = r.int(3, d.w - 4), y = r.int(3, d.h - 4);
      if (dist[idx(d, x, y)] < 0) continue;
      if (pts.some(p => Math.abs(p.cx - x) + Math.abs(p.cy - y) < 10)) continue;
      pts.push({ x: x - 3, y: y - 3, w: 7, h: 7, cx: x, cy: y });
    }
    d.rooms = pts;
  }

  // Тайник за трещиноватой стеной.
  placeSecret(d, r, dist);

  // Твёрдость
  for (let i = 0; i < d.tiles.length; i++) d.solid[i] = d.tiles[i] === T_FLOOR ? 0 : 1;

  const nearStart = (x: number, y: number, k: number) => Math.abs(x - d.start.x) + Math.abs(y - d.start.y) < k;
  const nearBoss = (x: number, y: number, k: number) => Math.abs(x - d.boss.x) + Math.abs(y - d.boss.y) < k;
  const free = (x: number, y: number) => inside(d, x, y) && d.tiles[idx(d, x, y)] === T_FLOOR && d.solid[idx(d, x, y)] === 0;
  const openAround = (x: number, y: number) => {
    for (const [dx, dy] of DIRS8) if (!free(x + dx, y + dy)) return false;
    return free(x, y);
  };
  const occupied = new Set<number>();
  const addProp = (p: Prop) => {
    d.props.push(p); occupied.add(idx(d, p.x, p.y));
    if (p.solid) d.solid[idx(d, p.x, p.y)] = 1;
  };

  // Алтарь у старта (точка возрождения)
  for (const [ax, ay] of [[1, -1], [-1, 1], [1, 1], [-1, -1], [2, 0]]) {
    if (free(d.start.x + ax, d.start.y + ay)) { addProp({ type: 'altar', x: d.start.x + ax, y: d.start.y + ay, solid: false }); break; }
  }

  // Твёрдые пропсы: колонны в больших комнатах (катакомбы) и мёртвые деревья (пустоши).
  if (d.theme === 'catacombs') {
    for (const rm of d.rooms) {
      if (rm.w < 9 || rm.h < 9) continue;
      for (const [px, py] of [[rm.x + 2, rm.y + 2], [rm.x + rm.w - 3, rm.y + 2], [rm.x + 2, rm.y + rm.h - 3], [rm.x + rm.w - 3, rm.y + rm.h - 3]]) {
        if (openAround(px, py) && !nearStart(px, py, 3) && r.chance(0.8)) addProp({ type: 'pillar', x: px, y: py, solid: true });
      }
    }
  } else {
    for (let k = 0; k < 900 && d.props.filter(p => p.type === 'tree').length < 34; k++) {
      const x = r.int(2, d.w - 3), y = r.int(2, d.h - 3);
      if (openAround(x, y) && !nearStart(x, y, 4) && !nearBoss(x, y, 8)) addProp({ type: r.chance(0.8) ? 'tree' : 'grave', x, y, solid: true });
    }
  }

  // Клетки у стен (для жаровен, кристаллов, сундуков)
  const wallAdj: { x: number; y: number }[] = [];
  for (let y = 1; y < d.h - 1; y++) for (let x = 1; x < d.w - 1; x++) {
    if (!free(x, y)) continue;
    let walls = 0;
    for (const [dx, dy] of DIRS4) if (d.tiles[idx(d, x + dx, y + dy)] !== T_FLOOR) walls++;
    if (walls === 1 && dist[idx(d, x, y)] >= 0) wallAdj.push({ x, y });
  }
  r.shuffle(wallAdj);
  const takeWallAdj = (filter: (x: number, y: number) => boolean) => {
    for (let i = 0; i < wallAdj.length; i++) {
      const c = wallAdj[i];
      if (occupied.has(idx(d, c.x, c.y)) || !filter(c.x, c.y)) continue;
      wallAdj.splice(i, 1); return c;
    }
    return null;
  };
  const spaced = (type: PropType, k: number) => (x: number, y: number) =>
    !d.props.some(p => p.type === type && Math.abs(p.x - x) + Math.abs(p.y - y) < k);

  // Источники света
  const lights = d.theme === 'catacombs' ? 22 : 12;
  for (let i = 0; i < lights; i++) {
    const c = takeWallAdj(spaced('brazier', 7)); if (!c) break;
    addProp({ type: 'brazier', x: c.x, y: c.y, solid: false });
  }
  if (d.theme === 'catacombs') for (let i = 0; i < 16; i++) {
    const c = takeWallAdj(spaced('crystal', 5)); if (!c) break;
    addProp({ type: 'crystal', x: c.x, y: c.y, solid: false });
  }
  // Сундуки
  for (let i = 0; i < 3; i++) {
    const c = takeWallAdj((x, y) => !nearStart(x, y, 8) && spaced('chest', 14)(x, y)); if (!c) break;
    addProp({ type: 'chest', x: c.x, y: c.y, solid: false });
  }
  // Сундук у арены босса (откроется после победы — награда)
  addProp({ type: 'chest', x: d.boss.x, y: d.boss.y - 3, solid: false, elite: true });

  // Декор без коллизий
  const decor: PropType[] = d.theme === 'catacombs'
    ? ['bones', 'puddle', 'puddle', 'rubble', 'blood', 'bones', 'banner']
    : ['ashpile', 'ashpile', 'rubble', 'bones', 'cart', 'blood'];
  for (let k = 0; k < 140; k++) {
    const x = r.int(1, d.w - 2), y = r.int(1, d.h - 2);
    if (!free(x, y) || occupied.has(idx(d, x, y)) || nearStart(x, y, 2)) continue;
    const t = r.pick(decor);
    if (t === 'cart' && !openAround(x, y)) continue;
    addProp({ type: t, x, y, solid: false });
  }

  // Ловушки-шипы: в коридорах (катакомбы) или на открытых местах.
  const inRoom = (x: number, y: number) => d.rooms.some(rm => x >= rm.x && x < rm.x + rm.w && y >= rm.y && y < rm.y + rm.h);
  for (let k = 0; k < 2000 && d.traps.length < 7 + Math.min(6, depth); k++) {
    const x = r.int(1, d.w - 2), y = r.int(1, d.h - 2);
    if (!free(x, y) || occupied.has(idx(d, x, y)) || nearStart(x, y, 10) || nearBoss(x, y, 9)) continue;
    if (d.theme === 'catacombs' && inRoom(x, y)) continue;
    if (d.traps.some(t => Math.abs(t.x - x) + Math.abs(t.y - y) < 6)) continue;
    d.traps.push({ x, y }); occupied.add(idx(d, x, y));
  }

  // Стаи врагов. Элитные — в 2 самых дальних комнатах (кроме арены босса).
  const rooms = d.rooms.filter(rm => !nearStart(rm.cx, rm.cy, 10) && !nearBoss(rm.cx, rm.cy, 10));
  rooms.sort((a, b) => dist[idx(d, b.cx, b.cy)] - dist[idx(d, a.cx, a.cy)]);
  const eliteRooms = new Set(rooms.slice(0, 2).concat(rooms.length > 5 ? [rooms[Math.floor(rooms.length / 2)]] : []));
  const typesFor = () => r.weighted([
    { w: 5, v: 'ghoul' }, { w: depth >= 1 ? 3 : 0, v: 'wolf' }, { w: 3, v: 'cultist' },
  ]);
  for (const rm of rooms) {
    const area = rm.w * rm.h;
    const n = Math.max(3, Math.min(10, Math.round(area / 12) + r.int(0, 2)));
    const main = typesFor();
    const elite = eliteRooms.has(rm);
    const cells: { x: number; y: number }[] = [];
    for (let y = rm.y; y < rm.y + rm.h; y++) for (let x = rm.x; x < rm.x + rm.w; x++) if (free(x, y) && dist[idx(d, x, y)] >= 0) cells.push({ x, y });
    r.shuffle(cells);
    for (let i = 0; i < n && i < cells.length; i++) {
      const type = i > 0 && r.chance(0.3) ? typesFor() : main;
      d.spawns.push({ x: cells[i].x + 0.5, y: cells[i].y + 0.5, type, elite: elite && i === 0, leader: elite && i === 0 });
    }
  }
  return d.rooms.length >= 4;
}

function placeSecret(d: Dungeon, r: RNG, dist: Int32Array) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const x0 = r.int(3, d.w - 4), y0 = r.int(3, d.h - 4);
    if (dist[idx(d, x0, y0)] < 12) continue;
    const [dx, dy] = r.pick(DIRS4);
    if (d.tiles[idx(d, x0 + dx, y0 + dy)] !== T_VOID) continue;
    // проверяем, что впереди сплошная скала: проход 3 клетки + камера 5×5 с запасом в 1 клетку
    const cx = x0 + dx * 6, cy = y0 + dy * 6;
    let ok = true;
    for (let y = cy - 3; y <= cy + 3 && ok; y++) for (let x = cx - 3; x <= cx + 3; x++) {
      if (!inside(d, x, y, 2) || d.tiles[idx(d, x, y)] !== T_VOID) { ok = false; break; }
    }
    for (let k = 1; k <= 3 && ok; k++) {
      const px = x0 + dx * k, py = y0 + dy * k;
      // боковые клетки прохода тоже должны быть скалой
      if (d.tiles[idx(d, px + dy, py + dx)] !== T_VOID || d.tiles[idx(d, px - dy, py - dx)] !== T_VOID) ok = false;
    }
    if (!ok) continue;
    d.tiles[idx(d, x0 + dx, y0 + dy)] = T_CRACKED;
    for (let k = 2; k <= 3; k++) carve(d, x0 + dx * k, y0 + dy * k);
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) carve(d, x, y);
    d.secrets.push({ x: x0 + dx, y: y0 + dy });
    d.props.push({ type: 'chest', x: cx, y: cy, solid: false, secret: true });
    d.props.push({ type: d.theme === 'catacombs' ? 'crystal' : 'brazier', x: cx - 1, y: cy - 2, solid: false });
    return;
  }
}

// ─── Поверхность: пепелище у Ковен-Гейта ─────────────────────────
// Открытая равнина под небом: по краям мёртвый лес (клетки T_VOID рисуются деревьями), внутри
// сгоревшая деревня из обгоревших срубов, лагерь выживших, башня-мельница с волками, пруд и колодец-Разлом на севере.
// Раскладка ручная (опорные точки), детали случайны от seed героя.
export interface SurfaceOpts { wolves: number }

export function generateSurface(seed: number, o: SurfaceOpts): Dungeon {
  const r = new RNG(seed);
  const w = 84, h = 84;
  const d = blank(w, h, 'surface');
  const g = d.tiles;
  // поле с «рваным» краем: в полосе у края стены вероятнее, потом сглаживание
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    g[idx(d, x, y)] = e < 3 ? T_VOID : e > 9 ? T_FLOOR : r.chance((e - 3) / 7) ? T_FLOOR : T_VOID;
  }
  for (let it = 0; it < 4; it++) {
    const n = g.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (Math.min(x, y, w - 1 - x, h - 1 - y) > 10) continue;
      let walls = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[idx(d, x + dx, y + dy)] !== T_FLOOR) walls++;
      n[idx(d, x, y)] = walls >= 5 ? T_VOID : T_FLOOR;
    }
    g.set(n);
  }
  const jit = (v: number) => v + r.int(-2, 2);
  const P = {
    start: { x: jit(22), y: jit(70) },
    camp: { x: jit(26), y: jit(47) },
    village: { x: jit(47), y: jit(52) },
    mill: { x: jit(65), y: jit(32) },
    well: { x: jit(40), y: jit(13) },
  };
  d.poi = P;
  const disc = (cx: number, cy: number, rad: number, t = T_FLOOR) => {
    for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++)
      if (inside(d, x, y, 2) && (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad + 1) g[idx(d, x, y)] = t;
  };
  // каменные глыбы посреди поля (дальше от опорных точек)
  const nearPoi = (x: number, y: number, k: number) => Object.values(P).some(p => Math.abs(p.x - x) + Math.abs(p.y - y) < k);
  for (let k = 0; k < 14; k++) {
    const x = r.int(12, w - 13), y = r.int(12, h - 13);
    if (!nearPoi(x, y, 13)) disc(x, y, r.int(1, 2), T_VOID);
  }
  // широкая дорога: старт → лагерь → деревня → мельница, лагерь → колодец
  const roadMask = d.road = new Uint8Array(w * h);
  const road = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    let x = a.x, y = a.y;
    for (let k = 0; k < 400 && (x !== b.x || y !== b.y); k++) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside(d, x + dx, y + dy, 2)) g[idx(d, x + dx, y + dy)] = T_FLOOR;
      roadMask[idx(d, x, y)] = 1; // мостовая — по оси дороги, края остаются травой
      if (r.chance(0.5)) roadMask[idx(d, x + r.int(-1, 1), y + r.int(-1, 1))] = 1;
      if (x !== b.x && (y === b.y || r.chance(0.5))) x += Math.sign(b.x - x); else y += Math.sign(b.y - y);
    }
  };
  road(P.start, P.camp); road(P.camp, P.village); road(P.village, P.mill); road(P.camp, P.well);
  disc(P.start.x, P.start.y, 3); disc(P.camp.x, P.camp.y, 7); disc(P.mill.x, P.mill.y, 9); disc(P.well.x, P.well.y, 6); disc(P.village.x, P.village.y, 6);

  const V = P.village;
  const M = P.mill;

  // пруд к югу от мельницы и ручей от него на восток; где дорога идёт через воду — мостки
  const Pd = { x: M.x + 1 + r.int(-1, 1), y: M.y + 18 + r.int(-1, 1) };
  const water: number[] = [];
  for (let y = Pd.y - 7; y <= Pd.y + 7; y++) for (let x = Pd.x - 8; x <= Pd.x + 8; x++) {
    if (!inside(d, x, y, 3)) continue;
    const k = ((x - Pd.x) / 6.5) ** 2 + ((y - Pd.y) / 4.8) ** 2 + r.range(-0.18, 0.18);
    if (k <= 1) water.push(idx(d, x, y));
  }
  for (let x = Pd.x; x < w - 3; x++) {
    const y = Pd.y + Math.round(Math.sin(x * 0.45) * 1.4);
    for (const yy of [y, y + 1]) if (inside(d, x, yy, 3) && g[idx(d, x, yy)] === T_FLOOR) water.push(idx(d, x, yy));
  }
  const docks: number[] = [];
  for (const i of water) {
    if (roadMask[i] || (i % w > 0 && roadMask[i - 1]) || roadMask[i + 1]) { g[i] = T_FLOOR; docks.push(i); }
    else g[i] = T_WATER;
  }
  // пирс с западного берега
  for (let x = Pd.x - 6; x <= Pd.x - 3; x++) { const i = idx(d, x, Pd.y); if (g[i] === T_WATER) { g[i] = T_FLOOR; docks.push(i); } }

  // всё, что недостижимо от старта, — в лес
  const dist = bfs(d, P.start.x, P.start.y);
  for (let i = 0; i < g.length; i++) if (g[i] === T_FLOOR && dist[i] < 0) g[i] = T_VOID;
  for (let i = 0; i < g.length; i++) d.solid[i] = g[i] === T_FLOOR ? 0 : 1;
  d.start = { ...P.start };
  d.boss = { ...P.well };
  d.bossRoom = { x: P.well.x - 6, y: P.well.y - 6, w: 13, h: 13, cx: P.well.x, cy: P.well.y };

  const free = (x: number, y: number) => inside(d, x, y) && g[idx(d, x, y)] === T_FLOOR && d.solid[idx(d, x, y)] === 0;
  const openAround = (x: number, y: number) => { for (const [dx, dy] of DIRS8) if (!free(x + dx, y + dy)) return false; return free(x, y); };
  const used = new Set<number>();
  const add = (p: Prop) => { d.props.push(p); used.add(idx(d, p.x, p.y)); if (p.solid) d.solid[idx(d, p.x, p.y)] = 1; };
  const C = P.camp;
  for (const i of docks) { used.add(i); d.props.push({ type: 'dock', x: i % w, y: (i / w) | 0, solid: false, v: r.int(0, 3) }); }
  // дом или палатка: все клетки основания — пол не на дороге, вокруг нет твёрдого (проход не перекрывается)
  const struct = (key: string, ax: number, ay: number, burnt = false) => {
    const [x0, y0, x1, y1] = STRUCTS[key].foot;
    for (let k = 0; k < 30; k++) {
      const x = ax + (k ? r.int(-2, 2) : 0), y = ay + (k ? r.int(-2, 2) : 0);
      let ok = true;
      for (let yy = y + y0 - 1; yy <= y + y1 + 1 && ok; yy++) for (let xx = x + x0 - 1; xx <= x + x1 + 1 && ok; xx++) {
        if (!inside(d, xx, yy, 2)) { ok = false; break; }
        const i = idx(d, xx, yy), core = xx >= x + x0 && xx <= x + x1 && yy >= y + y0 && yy <= y + y1;
        if (used.has(i) || (d.solid[i] && g[i] === T_FLOOR)) ok = false;
        else if (core && (g[i] !== T_FLOOR || roadMask[i])) ok = false;
      }
      if (!ok) continue;
      for (let yy = y + y0; yy <= y + y1; yy++) for (let xx = x + x0; xx <= x + x1; xx++) { const i = idx(d, xx, yy); g[i] = T_HOUSE; d.solid[i] = 1; used.add(i); }
      d.props.push({ type: 'struct', x, y, solid: true, v: key, burnt });
      return true;
    }
    return false;
  };
  // лагерь: два целых сруба и палатки за кругом жителей; в деревне — два обгоревших сруба
  struct('house_a', C.x + 6, C.y - 3); struct('house_b', C.x - 4, C.y - 6);
  struct('tent_a', C.x - 6, C.y + 2); struct('tent_b', C.x + 3, C.y + 6);
  struct('house_a', V.x - 6, V.y - 5, true); struct('house_b', V.x + 6, V.y - 6, true);
  struct('house_b', V.x - 6, V.y + 6, true); struct('house_a', V.x + 7, V.y + 6, true);
  struct('house_a', V.x - 1, V.y - 9, true);
  struct('tower', M.x + 1, M.y - 2);
  // лагерь: костёр в центре, повозки и знамёна по кругу, алтарь возрождения
  add({ type: 'campfire', x: C.x, y: C.y, solid: false });
  for (const [dx, dy, t, v] of [[-2, -4, 'crate', 0], [-1, -5, 'crate', 2], [4, 3, 'logs', 0], [-5, 4, 'logs', 1], [-4, 0, 'anvil', 0], [5, -6, 'crate', 3]] as const)
    if (free(C.x + dx, C.y + dy) && !used.has(idx(d, C.x + dx, C.y + dy))) add({ type: t, x: C.x + dx, y: C.y + dy, solid: true, v });
  add({ type: 'altar', x: C.x - 2, y: C.y + 2, solid: false });
  for (const [dx, dy, t] of [[-4, -2, 'cart'], [4, 1, 'cart'], [-3, 3, 'banner'], [3, -3, 'banner'], [0, 5, 'brazier'], [-5, -4, 'brazier']] as const) {
    if (free(C.x + dx, C.y + dy) && !used.has(idx(d, C.x + dx, C.y + dy))) add({ type: t, x: C.x + dx, y: C.y + dy, solid: t === 'cart' });
  }
  // указатели на развилках и заборы у лагеря
  for (const [x, y] of [[P.start.x + 3, P.start.y - 3], [C.x + 8, C.y + 3], [V.x - 1, V.y - 4]]) if (free(x, y) && !used.has(idx(d, x, y))) add({ type: 'sign', x, y, solid: true, v: r.int(0, 1) });
  for (let k = 0; k < 10; k++) {
    const a = r.range(0, Math.PI * 2), x = Math.round(C.x + Math.cos(a) * 8), y = Math.round(C.y + Math.sin(a) * 8);
    if (free(x, y) && !used.has(idx(d, x, y)) && !roadMask[idx(d, x, y)] && openAround(x, y)) add({ type: 'fence', x, y, solid: true, v: r.int(0, 3) });
  }
  // камыш и камни по берегу пруда
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== T_FLOOR || used.has(i)) continue;
    const x = i % w, y = (i / w) | 0;
    if (!DIRS4.some(([dx, dy]) => inside(d, x + dx, y + dy) && g[idx(d, x + dx, y + dy)] === T_WATER)) continue;
    if (r.chance(0.4)) add({ type: 'reed', x, y, solid: false, v: r.int(0, 1) });
    else if (r.chance(0.12) && openAround(x, y)) add({ type: 'rock', x, y, solid: true, v: r.int(0, 3) });
  }
  // фонари вдоль дороги и у колодца
  for (const [x, y] of [[P.start.x + 2, P.start.y - 1], [P.well.x - 3, P.well.y + 2], [P.well.x + 3, P.well.y + 2], [M.x - 6, M.y + 2]]) if (free(x, y)) add({ type: 'brazier', x, y, solid: false });
  // кладбище у деревни
  for (let k = 0; k < 7; k++) { const x = V.x + r.int(-3, 3), y = V.y + r.int(8, 11); if (openAround(x, y) && !used.has(idx(d, x, y))) add({ type: 'grave', x, y, solid: true }); }
  // мёртвые деревья в поле
  for (let k = 0; k < 900 && d.props.filter(p => p.type === 'tree').length < 46; k++) {
    const x = r.int(4, w - 5), y = r.int(4, h - 5);
    if (openAround(x, y) && !nearPoi(x, y, 8) && !used.has(idx(d, x, y))) add({ type: 'tree', x, y, solid: true });
  }
  // сундуки в руинах
  for (const [x, y] of [[V.x - 7, V.y - 6], [V.x + 9, V.y + 4], [M.x + 3, M.y - 2]]) if (free(x, y) && !used.has(idx(d, x, y))) add({ type: 'chest', x, y, solid: false });
  // декор: пепел и кости, сухая трава, кусты, пни и валуны
  const decor: PropType[] = ['ashpile', 'ashpile', 'rubble', 'bones', 'blood', 'rubble', 'tuft', 'tuft', 'tuft', 'bush', 'stump'];
  for (let k = 0; k < 240; k++) {
    const x = r.int(3, w - 4), y = r.int(3, h - 4);
    if (!free(x, y) || used.has(idx(d, x, y)) || Math.abs(x - C.x) + Math.abs(y - C.y) < 5) continue;
    const t = r.pick(decor);
    const solid = t === 'stump' && openAround(x, y);
    if (t === 'stump' && !solid) continue;
    add({ type: t, x, y, solid, v: r.int(0, t === 'stump' ? 1 : t === 'bush' ? 1 : 3) });
  }
  for (let k = 0, n = 0; k < 80 && n < 10; k++) { // валуны в поле
    const x = r.int(6, w - 7), y = r.int(6, h - 7);
    if (openAround(x, y) && !used.has(idx(d, x, y)) && !nearPoi(x, y, 9) && !roadMask[idx(d, x, y)]) { add({ type: 'rock', x, y, solid: true, v: r.int(0, 3) }); n++; }
  }
  // враги: стая у мельницы (для задания), гули в деревне и у дороги, культисты у колодца
  const pack = (cx: number, cy: number, n: number, type: string, rad: number, tag?: string, leader = false) => {
    for (let i = 0, k = 0; i < n && k < 200; k++) {
      const x = cx + r.int(-rad, rad), y = cy + r.int(-rad, rad);
      if (!free(x, y) || used.has(idx(d, x, y))) continue;
      d.spawns.push({ x: x + 0.5, y: y + 0.5, type, elite: leader && i === 0, leader: leader && i === 0, tag });
      used.add(idx(d, x, y)); i++;
    }
  };
  if (o.wolves > 0) pack(M.x, M.y, o.wolves, 'wolf', 6, 'mill', true);
  pack(V.x, V.y, 4, 'ghoul', 5);
  pack(V.x + 6, V.y - 14, 3, 'ghoul', 3);
  pack((C.x + P.well.x) >> 1, (C.y + P.well.y) >> 1, 3, 'ghoul', 3);
  pack(P.well.x, P.well.y + 6, 2, 'cultist', 3);
  d.rooms = Object.values(P).map(p => ({ x: p.x - 3, y: p.y - 3, w: 7, h: 7, cx: p.x, cy: p.y }));
  d.seed = seed;
  return d;
}
