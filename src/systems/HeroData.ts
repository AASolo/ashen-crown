// Состояние героя, которое переживает этажи и сохраняется: уровень, опыт, валюта,
// инвентарь, экипировка, ранги навыков и талантов. Отделено от игрового объекта Hero.
import { CLASSES, type ClassId } from '../data/classes';
import { SKILLS, MAX_SKILL_RANK } from '../data/skills';
import { SETS, SLOTS, BASES, type Slot } from '../data/items';
import { emptyStats, type Stats, type StatKey } from '../data/stats';
import { buildItem, itemStats, sellPrice, salvageShards, upgradeCost, type Item } from './Loot';

export const BAG_SIZE = 40; // 8 × 5

export interface HeroData {
  version: 1;
  classId: ClassId;
  difficulty: number;
  level: number;
  xp: number;
  gold: number;
  shards: number;
  points: number;                           // свободные очки умений
  skillRanks: Record<string, number>;
  talents: Record<string, number>;
  bag: (Item | null)[];
  equip: Partial<Record<Slot, Item>>;
  depth: number;
  bestDepth: number;
  potions: number;
  kills: number;
  playTime: number;
  seed: number;
  quest?: number;                          // активный шаг пролога (data/quests.ts); нет — пролог пройден
  qProg?: number;                          // счётчик шага (убитые волки, маска зажжённых огней)
  wood?: number;                           // стройка на поверхности (systems/Building.ts)
  stone?: number;
  builds?: { r: string; x: number; y: number }[];
  felled?: number[];                       // клетки срубленных деревьев и разбитых камней
}

export function newHero(classId: ClassId, difficulty = 0): HeroData {
  const c = CLASSES[classId];
  const ranks: Record<string, number> = { [c.basic]: 1 };
  for (const s of c.skills) ranks[s] = 1;
  // стартовое оружие своего типа (обычное): первые удары ощущаются, а первая синяя вещь — заметный апгрейд
  const starter = BASES.find(b => b.slot === 'weapon' && b.weapon === c.weapon)!;
  return {
    version: 1, classId, difficulty, level: 1, xp: 0, gold: 0, shards: 0, points: 0,
    skillRanks: ranks, talents: {}, bag: new Array(BAG_SIZE).fill(null), equip: { weapon: buildItem(starter, 0, 1) },
    depth: 0, bestDepth: 0, potions: 3, kills: 0, playTime: 0, seed: (Math.random() * 1e9) >>> 0, quest: 0, qProg: 0,
  };
}

/** Опыт до следующего уровня: мягкая экспонента. */
export function xpToNext(level: number): number {
  return Math.round(90 * Math.pow(level, 1.55) + 60);
}

export const MAX_LEVEL = 60;

/** Количество надетых частей каждого сета. */
export function setCounts(d: HeroData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of SLOTS) {
    const it = d.equip[s];
    if (it?.setId) out[it.setId] = (out[it.setId] || 0) + 1;
  }
  return out;
}

/** Все активные легендарные свойства. */
export function activePowers(d: HeroData): Set<string> {
  const p = new Set<string>();
  for (const s of SLOTS) {
    const it = d.equip[s];
    if (it?.power) p.add(it.power);
    if (it?.power2) p.add(it.power2);
  }
  if ((setCounts(d)['dimsun'] || 0) >= 6) p.add('set6flare');
  return p;
}

/** Сведение характеристик: класс + уровень + таланты + экипировка + сеты. */
export function computeStats(d: HeroData): Stats {
  const c = CLASSES[d.classId];
  const st = emptyStats();
  const lv = d.level - 1;
  st.str = c.base.str + c.perLevel.str * lv;
  st.dex = c.base.dex + c.perLevel.dex * lv;
  st.int = c.base.int + c.perLevel.int * lv;
  st.vit = c.base.vit + c.perLevel.vit * lv;
  st.critChance = 0.05; st.critDmg = 0.5;
  st.maxRes = c.resource.max; st.resRegen = c.resource.regen;
  st.hpRegen = 0.6 + d.level * 0.12;
  const add = (src: Partial<Stats>, mul = 1) => {
    for (const [k, v] of Object.entries(src) as [StatKey, number][]) st[k] += v * mul;
  };
  add(c.bonus);
  for (const t of c.talents) add(t.per, d.talents[t.id] || 0);
  for (const s of SLOTS) { const it = d.equip[s]; if (it) add(itemStats(it) as Partial<Stats>); }
  // бонусы сета
  const sc = setCounts(d)['dimsun'] || 0;
  if (sc >= 2) st.dmgPct += 0.15;
  if (sc >= 4) { st.critChance += 0.08; st.moveSpeed += 0.1; }
  if (activePowers(d).has('hollowEcho')) st.cdr += 0.25;
  // производные
  st.maxHp += 50 + st.vit * 6 + d.level * 5;
  if (!d.equip.weapon) { st.dmgMin += 2; st.dmgMax += 4; }
  st.dmgMin = Math.max(1, st.dmgMin); st.dmgMax = Math.max(st.dmgMin + 1, st.dmgMax);
  st.resist = Math.min(0.75, st.resist);
  st.cdr = Math.min(0.5, st.cdr);
  st.critChance = Math.min(0.75, st.critChance);
  st.blockChance = Math.min(0.5, st.blockChance);
  return st;
}

/** Итоговый множитель урона от основной характеристики и бонусов. */
export function damageMul(d: HeroData, st: Stats): number {
  const main = st[CLASSES[d.classId].mainStat];
  return (1 + main / 100) * (1 + st.dmgPct);
}

/** Средний урон в секунду базовой атакой — для сравнения предметов. */
export function dpsEstimate(d: HeroData, st: Stats): number {
  const avg = (st.dmgMin + st.dmgMax) / 2 * damageMul(d, st);
  const crit = 1 + st.critChance * st.critDmg;
  const aps = (1 + st.atkSpeed) / CLASSES[d.classId].baseAttackTime;
  return avg * crit * aps * SKILLS[CLASSES[d.classId].basic].mult;
}

// ─── Операции с инвентарём ───────────────────────────────────────
export function addToBag(d: HeroData, it: Item): boolean {
  const i = d.bag.indexOf(null);
  if (i < 0) return false;
  d.bag[i] = it;
  return true;
}

export function canEquip(d: HeroData, it: Item): boolean {
  if (it.slot !== 'weapon') return true;
  return it.weapon === CLASSES[d.classId].weapon;
}

/** Надеть предмет из сумки; снятый предмет встаёт на его место. */
export function equipFromBag(d: HeroData, idx: number): boolean {
  const it = d.bag[idx];
  if (!it || !canEquip(d, it)) return false;
  const prev = d.equip[it.slot] || null;
  d.equip[it.slot] = it;
  d.bag[idx] = prev;
  return true;
}

export function unequip(d: HeroData, slot: Slot, toIdx?: number): boolean {
  const it = d.equip[slot];
  if (!it) return false;
  let i = toIdx ?? d.bag.indexOf(null);
  if (i < 0 || i >= BAG_SIZE) return false;
  if (d.bag[i]) {
    // в занятую клетку: меняемся, если вещь подходит в тот же слот
    const other = d.bag[i]!;
    if (other.slot !== slot || !canEquip(d, other)) { i = d.bag.indexOf(null); if (i < 0) return false; }
    else { d.equip[slot] = other; d.bag[i] = it; return true; }
  }
  delete d.equip[slot];
  d.bag[i] = it;
  return true;
}

export function swapBag(d: HeroData, a: number, b: number) {
  [d.bag[a], d.bag[b]] = [d.bag[b], d.bag[a]];
}

export function sellBag(d: HeroData, idx: number): number {
  const it = d.bag[idx]; if (!it) return 0;
  const g = sellPrice(it); d.gold += g; d.bag[idx] = null; return g;
}

export function salvageBag(d: HeroData, idx: number): number {
  const it = d.bag[idx]; if (!it) return 0;
  const s = salvageShards(it); d.shards += s; d.bag[idx] = null; return s;
}

export function upgradeItem(d: HeroData, it: Item): boolean {
  const c = upgradeCost(it);
  if (!c || d.gold < c.gold || d.shards < c.shards) return false;
  d.gold -= c.gold; d.shards -= c.shards; it.upgrade++;
  return true;
}

/** Продать все обычные и необычные предметы разом (удобство на телефоне). */
export function sellJunk(d: HeroData): number {
  let g = 0;
  d.bag.forEach((it, i) => { if (it && it.rarity <= 1) g += sellBag(d, i); });
  return g;
}

export function rankUp(d: HeroData, skillId: string): boolean {
  if (d.points <= 0) return false;
  const r = d.skillRanks[skillId] || 0;
  if (r >= MAX_SKILL_RANK) return false;
  d.skillRanks[skillId] = r + 1; d.points--; return true;
}

export function talentUp(d: HeroData, talentId: string): boolean {
  if (d.points <= 0) return false;
  const t = CLASSES[d.classId].talents.find(x => x.id === talentId);
  if (!t) return false;
  const r = d.talents[talentId] || 0;
  if (r >= t.max) return false;
  d.talents[talentId] = r + 1; d.points--; return true;
}

export { SETS };
