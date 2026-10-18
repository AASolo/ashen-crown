// Генерация лута: выбор редкости, базы, аффиксов, названия; цены продажи и разбора.
//
// Баланс раннего апгрейда (см. GDD, раздел 8):
//  • обычный враг роняет предмет с шансом 11%, элита — 2 предмета, босс — 3 + гарантированный эпик+;
//  • за 10–15 минут игрок убивает ~150 врагов → ~16 предметов + 2–3 элиты + сундуки,
//    из них 2–3 редких и выше с ilvl ≥ уровня героя — это и есть «апгрейд каждые 10–20 минут».
import { RNG, rng as globalRng } from '../core/rng';
import {
  AFFIXES, BASES, POWERS, RARITIES, SETS, SUFFIXES, ADJ_COUNT, adjective, type BaseItem, type Slot,
} from '../data/items';
import type { StatKey } from '../data/stats';
import type { WeaponType } from '../data/classes';

export interface Item {
  uid: string;
  base: string;
  name: string;
  slot: Slot;
  icon: string;
  rarity: number;
  ilvl: number;
  weapon?: WeaponType;
  implicit: Partial<Record<StatKey, number>>;
  affixes: { stat: StatKey; val: number }[];
  setId?: string;
  power?: string;   // легендарное свойство
  power2?: string;  // второе свойство у мифических
  upgrade: number;  // уровень улучшения 0..5
}

let uidCounter = 0;
const newUid = () => Date.now().toString(36) + (uidCounter++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export interface DropContext {
  ilvl: number;
  magicFind: number;     // от героя, модификаторов и сложности
  minRarity?: number;
  preferWeapon?: WeaponType;
}

/** Выбор редкости: высокие редкости получают бонус от magic find. */
export function rollRarity(mf: number, minRarity = 0, r: RNG = globalRng): number {
  const items = RARITIES.filter(x => x.id >= minRarity).map(x => ({ w: x.weight * Math.pow(1 + mf, x.id * 0.9), v: x.id }));
  return r.weighted(items);
}

export function generateItem(ctx: DropContext, r: RNG = globalRng): Item {
  const rarity = rollRarity(ctx.magicFind, ctx.minRarity ?? 0, r);
  let pool: BaseItem[] = BASES;
  // 65% оружия подстраивается под класс героя — меньше «мусора».
  const base0 = r.pick(pool);
  let base = base0;
  if (base0.slot === 'weapon' && ctx.preferWeapon && r.chance(0.65)) {
    pool = BASES.filter(b => b.weapon === ctx.preferWeapon);
    base = r.pick(pool);
  }
  return buildItem(base, rarity, ctx.ilvl, r);
}

export function buildItem(base: BaseItem, rarity: number, ilvl: number, r: RNG = globalRng): Item {
  const R = RARITIES[rarity];
  const lvlMul = 1 + (ilvl - 1) * 0.14;
  const implicit: Partial<Record<StatKey, number>> = {};
  for (const [k, v] of Object.entries(base.implicit) as [StatKey, number][]) {
    // проценты растут медленнее плоских значений
    const isPct = Math.abs(v) < 1;
    implicit[k] = isPct ? v * (1 + (ilvl - 1) * 0.03) * R.power : Math.round(v * lvlMul * R.power);
  }
  // сколько аффиксов
  const [amin, amax] = R.affixes;
  const n = r.int(amin, amax);
  const pool = AFFIXES.filter(a => !a.slots || a.slots.includes(base.slot));
  const used = new Set<StatKey>();
  const affixes: Item['affixes'] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const cand = pool.filter(a => !used.has(a.stat));
    if (!cand.length) break;
    const a = r.weighted(cand.map(c => ({ w: c.weight, v: c })));
    used.add(a.stat);
    let val = r.range(a.min, a.max) * (1 + (ilvl - 1) * a.perLevel) * R.power;
    if (a.max >= 1) val = Math.max(1, Math.round(val)); else val = Math.round(val * 1000) / 1000;
    affixes.push({ stat: a.stat, val });
  }
  const item: Item = {
    uid: newUid(), base: base.id, name: base.name, slot: base.slot, icon: base.icon,
    rarity, ilvl, weapon: base.weapon, implicit, affixes, upgrade: 0,
  };
  // легендарные/мифические свойства
  if (rarity >= 4) {
    const p = r.pick(POWERS);
    item.power = p.id;
    if (rarity === 5) item.power2 = r.pick(POWERS.filter(x => x.id !== p.id)).id;
  }
  // сетовые вещи: 10% эпиков, если слот входит в сет
  const set = SETS[0];
  if (rarity === 3 && set.pieces[base.slot] && r.chance(0.1)) item.setId = set.id;
  item.name = makeName(item, base, r);
  return item;
}

function makeName(item: Item, base: BaseItem, r: RNG): string {
  if (item.setId) return SETS.find(s => s.id === item.setId)!.pieces[item.slot]!;
  if (item.power && item.rarity === 4) return POWERS.find(p => p.id === item.power)!.name;
  if (item.rarity === 5) return 'Осколок Пустого Солнца: ' + base.name.toLowerCase();
  if (item.rarity === 0) return base.name;
  const adj = adjective(r.int(0, ADJ_COUNT - 1), base.gender);
  const lower = base.name.charAt(0).toLowerCase() + base.name.slice(1);
  if (item.rarity === 1) return `${adj} ${lower}`;
  return `${adj} ${lower} ${r.pick(SUFFIXES)}`;
}

/** Множитель свойств от улучшения: +10% за уровень. */
export const upgradeMul = (it: Item) => 1 + it.upgrade * 0.1;

/** Все характеристики предмета с учётом улучшения. */
export function itemStats(it: Item): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  const m = upgradeMul(it);
  for (const [k, v] of Object.entries(it.implicit) as [StatKey, number][]) out[k] = (out[k] || 0) + v * m;
  for (const a of it.affixes) out[a.stat] = (out[a.stat] || 0) + a.val * m;
  return out;
}

export function sellPrice(it: Item): number {
  return Math.round((it.ilvl * 3 + 6) * Math.pow(it.rarity + 1, 1.7) * (1 + it.upgrade * 0.25));
}
export function salvageShards(it: Item): number {
  return [1, 2, 4, 9, 20, 45][it.rarity] + it.upgrade;
}
export function upgradeCost(it: Item): { gold: number; shards: number } | null {
  if (it.upgrade >= 5) return null;
  return { gold: 20 * (it.upgrade + 1) * (it.ilvl + 2), shards: 3 * (it.upgrade + 1) * (it.rarity + 1) };
}

/** Количество золота с врага. */
export function goldDrop(depth: number, goldFind: number): number {
  return Math.round((4 + depth * 3) * globalRng.range(0.6, 1.5) * (1 + goldFind));
}
