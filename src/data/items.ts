// Предметы: слоты, базовые типы, редкости, аффиксы, сеты и легендарные свойства.
import type { StatKey } from './stats';
import type { WeaponType } from './classes';

export type Slot = 'weapon' | 'helm' | 'chest' | 'gloves' | 'boots' | 'ring' | 'amulet';
export const SLOTS: Slot[] = ['weapon', 'helm', 'chest', 'gloves', 'boots', 'ring', 'amulet'];
export const SLOT_NAMES: Record<Slot, string> = {
  weapon: 'Оружие', helm: 'Голова', chest: 'Торс', gloves: 'Руки', boots: 'Ноги', ring: 'Кольцо', amulet: 'Шея',
};

/** Род существительного — для согласования прилагательных в названиях. */
export type Gender = 'm' | 'f' | 'n' | 'pl';

export interface BaseItem {
  id: string;
  slot: Slot;
  name: string;
  gender: Gender;
  icon: string;
  weapon?: WeaponType;
  implicit: Partial<Record<StatKey, number>>; // базовые свойства на ilvl 1 (растут с уровнем)
}

export const BASES: BaseItem[] = [
  // оружие (по одному типу на класс, плюс вариации)
  { id: 'twin_sickles', slot: 'weapon', name: 'Серпы-близнецы', gender: 'pl', icon: 'it_blades', weapon: 'blades', implicit: { dmgMin: 3, dmgMax: 6, atkSpeed: 0.05 } },
  { id: 'curved_blades', slot: 'weapon', name: 'Изогнутые клинки', gender: 'pl', icon: 'it_blades', weapon: 'blades', implicit: { dmgMin: 4, dmgMax: 6 } },
  { id: 'ember_staff', slot: 'weapon', name: 'Посох углей', gender: 'm', icon: 'it_staff', weapon: 'staff', implicit: { dmgMin: 3, dmgMax: 7, maxRes: 10 } },
  { id: 'ritual_wand', slot: 'weapon', name: 'Ритуальный жезл', gender: 'm', icon: 'it_staff', weapon: 'staff', implicit: { dmgMin: 4, dmgMax: 6 } },
  { id: 'rune_maul', slot: 'weapon', name: 'Рунный молот', gender: 'm', icon: 'it_hammer', weapon: 'hammer', implicit: { dmgMin: 5, dmgMax: 9 } },
  { id: 'grave_mace', slot: 'weapon', name: 'Надгробная булава', gender: 'f', icon: 'it_hammer', weapon: 'hammer', implicit: { dmgMin: 4, dmgMax: 9, armor: 6 } },
  { id: 'longbow', slot: 'weapon', name: 'Длинный лук', gender: 'm', icon: 'it_bow', weapon: 'bow', implicit: { dmgMin: 3, dmgMax: 7 } },
  { id: 'hollow_bow', slot: 'weapon', name: 'Полый лук', gender: 'm', icon: 'it_bow', weapon: 'bow', implicit: { dmgMin: 4, dmgMax: 6, critChance: 0.02 } },
  // броня
  { id: 'helm', slot: 'helm', name: 'Шлем', gender: 'm', icon: 'it_helm', implicit: { armor: 8 } },
  { id: 'hood', slot: 'helm', name: 'Капюшон', gender: 'm', icon: 'it_hood', implicit: { armor: 5, resist: 0.02 } },
  { id: 'cuirass', slot: 'chest', name: 'Кираса', gender: 'f', icon: 'it_chest', implicit: { armor: 14 } },
  { id: 'mantle', slot: 'chest', name: 'Мантия', gender: 'f', icon: 'it_robe', implicit: { armor: 8, maxRes: 8 } },
  { id: 'gloves', slot: 'gloves', name: 'Перчатки', gender: 'pl', icon: 'it_gloves', implicit: { armor: 5 } },
  { id: 'bracers', slot: 'gloves', name: 'Наручи', gender: 'pl', icon: 'it_gloves', implicit: { armor: 6 } },
  { id: 'boots', slot: 'boots', name: 'Сапоги', gender: 'pl', icon: 'it_boots', implicit: { armor: 5, moveSpeed: 0.03 } },
  { id: 'greaves', slot: 'boots', name: 'Поножи', gender: 'pl', icon: 'it_boots', implicit: { armor: 8 } },
  { id: 'ring', slot: 'ring', name: 'Кольцо', gender: 'n', icon: 'it_ring', implicit: { dmgPct: 0.02 } },
  { id: 'signet', slot: 'ring', name: 'Перстень', gender: 'm', icon: 'it_ring', implicit: { critChance: 0.01 } },
  { id: 'amulet', slot: 'amulet', name: 'Амулет', gender: 'm', icon: 'it_amulet', implicit: { maxHp: 10 } },
  { id: 'talisman', slot: 'amulet', name: 'Оберег', gender: 'm', icon: 'it_amulet', implicit: { resist: 0.03 } },
];

// ─── Редкости ────────────────────────────────────────────────────
export interface Rarity {
  id: number;
  name: string;
  color: number;
  cbColor: number;     // цвет в режиме для дальтоников (палитра Okabe–Ito)
  symbol: string;      // символ для режима дальтонизма
  affixes: [number, number];
  power: number;       // множитель силы аффиксов и базовых свойств
  weight: number;      // базовый вес выпадения
}

export const RARITIES: Rarity[] = [
  { id: 0, name: 'Обычный', color: 0xbdb6a8, cbColor: 0xdddddd, symbol: '·', affixes: [0, 0], power: 1.0, weight: 54 },
  { id: 1, name: 'Необычный', color: 0x5ec27a, cbColor: 0x009e73, symbol: '▲', affixes: [1, 1], power: 1.08, weight: 28 },
  { id: 2, name: 'Редкий', color: 0x4f9cf0, cbColor: 0x56b4e9, symbol: '◆', affixes: [2, 3], power: 1.2, weight: 13 },
  { id: 3, name: 'Эпический', color: 0xb062ff, cbColor: 0xcc79a7, symbol: '★', affixes: [3, 4], power: 1.38, weight: 4.2 },
  { id: 4, name: 'Легендарный', color: 0xff8a2a, cbColor: 0xe69f00, symbol: '✦', affixes: [4, 4], power: 1.6, weight: 0.75 },
  { id: 5, name: 'Мифический', color: 0xff3b4e, cbColor: 0xf0e442, symbol: '✹', affixes: [5, 5], power: 1.9, weight: 0.05 },
];

// ─── Аффиксы ─────────────────────────────────────────────────────
export interface AffixDef {
  stat: StatKey;
  min: number;           // значение на ilvl 1
  max: number;
  perLevel: number;      // прирост за уровень предмета (доля от базового)
  slots?: Slot[];        // где может выпасть (по умолчанию — везде)
  weight: number;
}

export const AFFIXES: AffixDef[] = [
  { stat: 'dmgPct', min: 0.04, max: 0.09, perLevel: 0.04, weight: 10 },
  { stat: 'critChance', min: 0.015, max: 0.035, perLevel: 0.02, weight: 8, slots: ['weapon', 'gloves', 'ring', 'amulet', 'helm'] },
  { stat: 'critDmg', min: 0.08, max: 0.18, perLevel: 0.04, weight: 7, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
  { stat: 'atkSpeed', min: 0.03, max: 0.07, perLevel: 0.02, weight: 7, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
  { stat: 'maxHp', min: 8, max: 18, perLevel: 0.12, weight: 10 },
  { stat: 'hpRegen', min: 0.5, max: 1.4, perLevel: 0.1, weight: 5 },
  { stat: 'armor', min: 6, max: 14, perLevel: 0.12, weight: 9, slots: ['helm', 'chest', 'gloves', 'boots'] },
  { stat: 'resist', min: 0.03, max: 0.07, perLevel: 0.02, weight: 7 },
  { stat: 'lifesteal', min: 0.01, max: 0.025, perLevel: 0.02, weight: 4, slots: ['weapon', 'ring', 'amulet'] },
  { stat: 'igniteChance', min: 0.04, max: 0.09, perLevel: 0.02, weight: 5, slots: ['weapon', 'gloves', 'amulet', 'ring'] },
  { stat: 'bleedChance', min: 0.04, max: 0.09, perLevel: 0.02, weight: 5, slots: ['weapon', 'gloves', 'amulet', 'ring'] },
  { stat: 'moveSpeed', min: 0.03, max: 0.07, perLevel: 0.01, weight: 5, slots: ['boots', 'amulet'] },
  { stat: 'cdr', min: 0.03, max: 0.06, perLevel: 0.01, weight: 4, slots: ['helm', 'amulet', 'ring'] },
  { stat: 'maxRes', min: 6, max: 14, perLevel: 0.05, weight: 4 },
  { stat: 'resRegen', min: 0.6, max: 1.6, perLevel: 0.05, weight: 4 },
  { stat: 'goldFind', min: 0.06, max: 0.16, perLevel: 0.03, weight: 4 },
  { stat: 'magicFind', min: 0.04, max: 0.1, perLevel: 0.03, weight: 3 },
  { stat: 'thorns', min: 3, max: 8, perLevel: 0.12, weight: 3, slots: ['chest', 'helm'] },
  { stat: 'str', min: 2, max: 5, perLevel: 0.12, weight: 6 },
  { stat: 'dex', min: 2, max: 5, perLevel: 0.12, weight: 6 },
  { stat: 'int', min: 2, max: 5, perLevel: 0.12, weight: 6 },
  { stat: 'vit', min: 2, max: 5, perLevel: 0.12, weight: 6 },
];

// ─── Названия ────────────────────────────────────────────────────
// Прилагательные: основа + тип склонения (ый/ий/ой).
const ADJ: [string, 'yi' | 'ii' | 'oi'][] = [
  ['Тлеющ', 'ii'], ['Обсидианов', 'yi'], ['Пустотн', 'yi'], ['Ржав', 'yi'], ['Костян', 'oi'], ['Пепельн', 'yi'],
  ['Кровав', 'yi'], ['Сумрачн', 'yi'], ['Проклят', 'yi'], ['Выжженн', 'yi'], ['Затонувш', 'ii'], ['Чернильн', 'yi'],
];
const ENDINGS = {
  yi: { m: 'ый', f: 'ая', n: 'ое', pl: 'ые' },
  ii: { m: 'ий', f: 'ая', n: 'ее', pl: 'ие' },
  oi: { m: 'ой', f: 'ая', n: 'ое', pl: 'ые' },
};
export function adjective(i: number, g: Gender): string {
  const [stem, t] = ADJ[i % ADJ.length];
  return stem + ENDINGS[t][g];
}
export const ADJ_COUNT = ADJ.length;
export const SUFFIXES = [
  'Пустого Солнца', 'Безмолвия', 'Вдовы Пепла', 'Последнего Костра', 'Ковен-Гейта', 'Чернильной Чащи',
  'Утопленников', 'Обсидианового Трона', 'Сломанной Клятвы', 'Тлеющих Глаз', 'Вельдмара', 'Бездны',
];

// ─── Легендарные свойства ────────────────────────────────────────
export interface LegendaryPower { id: string; name: string; desc: string; slot?: Slot }
export const POWERS: LegendaryPower[] = [
  { id: 'emberNova', name: 'Сердце Угасшей Звезды', desc: '15% шанс при попадании вызвать взрыв пепла (150% урона).' },
  { id: 'bloodthirst', name: 'Чаша Безымянного', desc: 'Каждое убийство восстанавливает 4% здоровья.' },
  { id: 'hollowEcho', name: 'Эхо Полого Колокола', desc: 'Навыки перезаряжаются на 25% быстрее.' },
  { id: 'pyre', name: 'Клеймо Погребального Костра', desc: '+40% урона по горящим и кровоточащим врагам.' },
  { id: 'phantomStep', name: 'Поступь Призрака', desc: 'Уклонение перезаряжается вдвое быстрее и оставляет огонь.' },
];

// ─── Сет ─────────────────────────────────────────────────────────
export interface SetDef { id: string; name: string; pieces: Partial<Record<Slot, string>>; bonuses: { n: number; desc: string }[] }
export const SETS: SetDef[] = [
  {
    id: 'dimsun', name: 'Регалии Угасшего Солнца',
    pieces: {
      helm: 'Венец Угасшего Солнца', chest: 'Риза Угасшего Солнца', gloves: 'Длани Угасшего Солнца',
      boots: 'Поступь Угасшего Солнца', ring: 'Печать Угасшего Солнца', amulet: 'Ладанка Угасшего Солнца',
    },
    bonuses: [
      { n: 2, desc: '+15% урона' },
      { n: 4, desc: '+8% шанс крита, +10% скорости бега' },
      { n: 6, desc: 'Критические удары с шансом 20% вызывают солнечную вспышку' },
    ],
  },
];
