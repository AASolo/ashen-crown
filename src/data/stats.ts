// Модель характеристик. Всё, что даёт снаряжение, таланты и уровень, сводится в один объект Stats.

export interface Stats {
  str: number; dex: number; int: number; vit: number;
  maxHp: number; hpRegen: number;
  maxRes: number; resRegen: number;
  dmgMin: number; dmgMax: number;  // урон оружия
  dmgPct: number;                  // +% ко всему урону
  critChance: number;              // 0..1
  critDmg: number;                 // множитель-добавка: 0.5 = +50%
  atkSpeed: number;                // +% к скорости атаки (0.1 = +10%)
  armor: number;
  resist: number;                  // 0..0.75 — сопротивление стихиям
  lifesteal: number;               // доля урона, возвращаемая здоровьем
  igniteChance: number;
  bleedChance: number;
  stunChance: number;
  moveSpeed: number;               // +% к скорости бега
  cdr: number;                     // сокращение перезарядки 0..0.5
  goldFind: number;
  magicFind: number;
  thorns: number;                  // урон шипами
  blockChance: number;
}

export type StatKey = keyof Stats;

export function emptyStats(): Stats {
  return {
    str: 0, dex: 0, int: 0, vit: 0, maxHp: 0, hpRegen: 0, maxRes: 0, resRegen: 0,
    dmgMin: 0, dmgMax: 0, dmgPct: 0, critChance: 0, critDmg: 0, atkSpeed: 0, armor: 0, resist: 0,
    lifesteal: 0, igniteChance: 0, bleedChance: 0, stunChance: 0, moveSpeed: 0, cdr: 0,
    goldFind: 0, magicFind: 0, thorns: 0, blockChance: 0,
  };
}

/** Подписи характеристик и формат вывода (pct — проценты). */
export const STAT_INFO: Record<StatKey, { name: string; pct?: boolean }> = {
  str: { name: 'Сила' }, dex: { name: 'Ловкость' }, int: { name: 'Интеллект' }, vit: { name: 'Живучесть' },
  maxHp: { name: 'Здоровье' }, hpRegen: { name: 'Восст. здоровья/с' },
  maxRes: { name: 'Макс. ресурс' }, resRegen: { name: 'Восст. ресурса/с' },
  dmgMin: { name: 'Мин. урон' }, dmgMax: { name: 'Макс. урон' },
  dmgPct: { name: 'Урон', pct: true }, critChance: { name: 'Шанс крит. удара', pct: true },
  critDmg: { name: 'Крит. урон', pct: true }, atkSpeed: { name: 'Скорость атаки', pct: true },
  armor: { name: 'Броня' }, resist: { name: 'Сопротивление стихиям', pct: true },
  lifesteal: { name: 'Вампиризм', pct: true }, igniteChance: { name: 'Шанс поджога', pct: true },
  bleedChance: { name: 'Шанс кровотечения', pct: true }, stunChance: { name: 'Шанс оглушения', pct: true },
  moveSpeed: { name: 'Скорость бега', pct: true }, cdr: { name: 'Сокращение перезарядки', pct: true },
  goldFind: { name: 'Находка золота', pct: true }, magicFind: { name: 'Находка предметов', pct: true },
  thorns: { name: 'Шипы' }, blockChance: { name: 'Шанс блока', pct: true },
};

export function fmtStat(k: StatKey, v: number): string {
  const info = STAT_INFO[k];
  if (info.pct) {
    const p = v * 100;
    const s = p.toFixed(Math.abs(p) < 10 ? 1 : 0).replace(/\.0$/, '');
    return `${v >= 0 ? '+' : ''}${s}% ${info.name.toLowerCase()}`;
  }
  return `${v >= 0 ? '+' : ''}${Math.round(v)} ${info.name.toLowerCase()}`;
}
