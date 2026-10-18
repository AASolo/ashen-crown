// Враги прототипа: 3 обычных типа, призываемая тень и босс.
// Остальные 30+ типов из GDD добавляются записью сюда + спрайтом в art/CharacterArt.ts.

export type AttackKind = 'melee' | 'lunge' | 'ranged';

export interface EnemyDef {
  id: string;
  name: string;
  art: string;           // ключ спрайт-листа
  hp: number;
  dmg: number;
  speed: number;         // тайлов/с
  radius: number;        // радиус тела, тайлы
  xp: number;
  attack: AttackKind;
  range: number;         // дальность атаки
  windup: number;        // время замаха (видимое предупреждение)
  cooldown: number;
  projSpeed?: number;
  keepDistance?: number; // дальнобойные держат дистанцию
  aggro: number;         // радиус обнаружения
  scale: number;         // масштаб спрайта
}

export const ENEMIES: Record<string, EnemyDef> = {
  ghoul: {
    id: 'ghoul', name: 'Пепельный гуль', art: 'ghoul', hp: 34, dmg: 7, speed: 2.7, radius: 0.32, xp: 12,
    attack: 'melee', range: 1.05, windup: 0.42, cooldown: 1.3, aggro: 9, scale: 1,
  },
  wolf: {
    id: 'wolf', name: 'Теневой волк', art: 'wolf', hp: 22, dmg: 6, speed: 4.4, radius: 0.34, xp: 10,
    attack: 'lunge', range: 4.2, windup: 0.6, cooldown: 2.8, aggro: 11, scale: 1,
  },
  cultist: {
    id: 'cultist', name: 'Жрец Пустого Солнца', art: 'cultist', hp: 28, dmg: 9, speed: 2.3, radius: 0.32, xp: 16,
    attack: 'ranged', range: 7.5, windup: 0.7, cooldown: 2.2, projSpeed: 6.5, keepDistance: 4.8, aggro: 10, scale: 1,
  },
  shadow: {
    id: 'shadow', name: 'Тень Глашатая', art: 'shadow', hp: 16, dmg: 6, speed: 4.0, radius: 0.3, xp: 4,
    attack: 'melee', range: 1.0, windup: 0.35, cooldown: 1.1, aggro: 30, scale: 1,
  },
  herald: {
    id: 'herald', name: 'Глашатай Пустого Солнца', art: 'herald', hp: 950, dmg: 15, speed: 2.1, radius: 0.85, xp: 450,
    attack: 'melee', range: 2.4, windup: 0.9, cooldown: 2.0, aggro: 8, scale: 1,
  },
};

/** Аффиксы элитных врагов. */
export interface EliteAffix { id: string; name: string; color: number; desc: string }

export const ELITE_AFFIXES: EliteAffix[] = [
  { id: 'swift', name: 'Стремительный', color: 0x8fe3ff, desc: '+60% скорости' },
  { id: 'molten', name: 'Расплавленный', color: 0xff6a1a, desc: 'оставляет огонь, взрывается при смерти' },
  { id: 'stone', name: 'Каменнокожий', color: 0xb8a58a, desc: '−45% получаемого урона' },
  { id: 'vampiric', name: 'Кровопийца', color: 0xd0303a, desc: 'лечится от ударов' },
  { id: 'hollow', name: 'Пустотный', color: 0x9a6bff, desc: 'телепортируется к цели' },
];

/** Масштабирование врагов по глубине Разлома и сложности. */
export const DIFFICULTIES = [
  { id: 'normal', name: 'Обычная', hp: 1, dmg: 1, loot: 1, xp: 1 },
  { id: 'nightmare', name: 'Кошмар', hp: 2.2, dmg: 1.6, loot: 1.5, xp: 1.6 },
  { id: 'abyss', name: 'Бездна', hp: 4.5, dmg: 2.4, loot: 2.2, xp: 2.4 },
  { id: 'ashen', name: 'Пепельный кошмар', hp: 9, dmg: 3.5, loot: 3.2, xp: 3.5 },
] as const;

export function depthScale(depth: number) {
  return {
    hp: Math.pow(1.2, depth - 1),
    dmg: Math.pow(1.13, depth - 1),
    xp: Math.pow(1.15, depth - 1),
  };
}
