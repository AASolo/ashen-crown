// Описание навыков в данных: система навыков (systems/Skills.ts) исполняет их по полю kind.
// Добавить новый навык = добавить запись сюда, без правки кода боя (если kind уже существует).
import type { SfxName } from '../core/Sfx';

export type SkillKind =
  | 'melee'      // удар по дуге перед героем
  | 'projectile' // одиночный снаряд
  | 'fan'        // веер снарядов
  | 'dash'       // рывок сквозь врагов с уроном
  | 'spin'       // вихрь вокруг героя (несколько тиков)
  | 'groundAoe'  // отложенный взрыв в точке курсора (с индикатором)
  | 'summon'     // призыв союзников
  | 'charge'     // таран до первого врага + оглушение по площади
  | 'slam'       // удар по земле вокруг героя
  | 'buff'       // усиление на время
  | 'trap'       // ловушка в точке курсора
  | 'vault';     // отскок назад с гарантированным критом

export interface SkillDef {
  id: string;
  name: string;
  icon: string;          // ключ текстуры иконки
  kind: SkillKind;
  cost: number;          // ресурс
  cooldown: number;      // секунды
  mult: number;          // множитель урона оружия на 1-м ранге
  multPerRank: number;   // прибавка множителя за ранг
  range: number;         // дальность (тайлы)
  radius?: number;
  arc?: number;          // ширина дуги, градусы
  count?: number;
  speed?: number;
  delay?: number;
  duration?: number;
  pierce?: number;
  bleed?: number;        // шанс кровотечения
  burn?: number;         // шанс поджога
  stun?: number;         // длительность оглушения, с
  root?: number;         // длительность обездвиживания, с
  gain?: number;         // генерация ресурса за попадание
  castTime: number;      // время анимации, герой стоит
  anim: 'attack' | 'cast';
  sfx: SfxName;
  desc: string;          // {dmg} подставляется как % урона оружия
}

export const MAX_SKILL_RANK = 5;

export const SKILLS: Record<string, SkillDef> = {
  // ─── Пепельный Клинок ───────────────────────────────────────────
  blade_basic: {
    id: 'blade_basic', name: 'Двойной разрез', icon: 'sk_blade_basic', kind: 'melee', cost: 0, cooldown: 0,
    mult: 1.0, multPerRank: 0.1, range: 1.7, arc: 110, bleed: 0.2, gain: 9, castTime: 0.42, anim: 'attack', sfx: 'swing',
    desc: 'Два быстрых удара по дуге: {dmg} урона оружия. Шанс кровотечения 20%. Даёт Ярость.',
  },
  blade_dash: {
    id: 'blade_dash', name: 'Пепельный рывок', icon: 'sk_blade_dash', kind: 'dash', cost: 20, cooldown: 4,
    mult: 1.6, multPerRank: 0.25, range: 5, radius: 1.1, castTime: 0.22, anim: 'attack', sfx: 'dodge',
    desc: 'Рывок к курсору сквозь врагов: {dmg} урона всем на пути. Неуязвимость во время рывка.',
  },
  blade_whirl: {
    id: 'blade_whirl', name: 'Вихрь клинков', icon: 'sk_blade_whirl', kind: 'spin', cost: 30, cooldown: 6,
    mult: 0.75, multPerRank: 0.12, range: 0, radius: 2.4, count: 4, bleed: 1, castTime: 0.7, anim: 'attack', sfx: 'swing',
    desc: 'Вращение клинков: 4 удара по {dmg} урона вокруг героя. Всегда вызывает кровотечение.',
  },
  blade_reap: {
    id: 'blade_reap', name: 'Жатва углей', icon: 'sk_blade_reap', kind: 'melee', cost: 40, cooldown: 8,
    mult: 3.0, multPerRank: 0.45, range: 2.4, arc: 170, burn: 0.6, castTime: 0.55, anim: 'attack', sfx: 'crit',
    desc: 'Широкий удар: {dmg} урона, вдвое больше по кровоточащим. Поджигает с шансом 60%.',
  },

  // ─── Пепельная Ведьма ───────────────────────────────────────────
  witch_basic: {
    id: 'witch_basic', name: 'Искра', icon: 'sk_witch_basic', kind: 'projectile', cost: 0, cooldown: 0,
    mult: 0.95, multPerRank: 0.1, range: 10, speed: 12, burn: 0.15, gain: 3, castTime: 0.38, anim: 'cast', sfx: 'cast',
    desc: 'Огненная искра: {dmg} урона. Шанс поджога 15%.',
  },
  witch_fireball: {
    id: 'witch_fireball', name: 'Огненный шар', icon: 'sk_witch_fireball', kind: 'projectile', cost: 18, cooldown: 1.2,
    mult: 2.1, multPerRank: 0.3, range: 11, speed: 10, radius: 1.9, burn: 1, castTime: 0.45, anim: 'cast', sfx: 'fire',
    desc: 'Шар пламени взрывается при попадании: {dmg} урона в радиусе и поджог.',
  },
  witch_circle: {
    id: 'witch_circle', name: 'Пепельный круг', icon: 'sk_witch_circle', kind: 'groundAoe', cost: 30, cooldown: 5,
    mult: 3.4, multPerRank: 0.5, range: 9, radius: 2.6, delay: 0.65, burn: 1, castTime: 0.5, anim: 'cast', sfx: 'cast',
    desc: 'Чертит оккультный круг у курсора; через 0,65 с — взрыв на {dmg} урона.',
  },
  witch_wisps: {
    id: 'witch_wisps', name: 'Тлеющие духи', icon: 'sk_witch_wisps', kind: 'summon', cost: 40, cooldown: 16,
    mult: 0.5, multPerRank: 0.1, range: 8, count: 2, duration: 16, burn: 0.2, castTime: 0.6, anim: 'cast', sfx: 'portal',
    desc: 'Призывает духов (2, +1 на 3-м и 5-м ранге) на 16 с. Каждый стреляет на {dmg} урона.',
  },

  // ─── Костолом ───────────────────────────────────────────────────
  bone_basic: {
    id: 'bone_basic', name: 'Удар молота', icon: 'sk_bone_basic', kind: 'melee', cost: 0, cooldown: 0,
    mult: 1.35, multPerRank: 0.12, range: 1.9, arc: 90, stun: 0.5, gain: 6, castTime: 0.6, anim: 'attack', sfx: 'hit',
    desc: 'Тяжёлый удар: {dmg} урона. Оглушает с шансом 15%.',
  },
  bone_charge: {
    id: 'bone_charge', name: 'Таран щитом', icon: 'sk_bone_charge', kind: 'charge', cost: 20, cooldown: 6,
    mult: 1.5, multPerRank: 0.25, range: 6, radius: 1.7, stun: 1.2, castTime: 0.3, anim: 'attack', sfx: 'stun',
    desc: 'Таран к курсору до первого врага: {dmg} урона вокруг и оглушение на 1,2 с.',
  },
  bone_quake: {
    id: 'bone_quake', name: 'Сотрясение', icon: 'sk_bone_quake', kind: 'slam', cost: 35, cooldown: 8,
    mult: 2.0, multPerRank: 0.35, range: 0, radius: 3.1, stun: 1.6, castTime: 0.6, anim: 'attack', sfx: 'explode',
    desc: 'Удар по земле: {dmg} урона в радиусе 3 и оглушение на 1,6 с.',
  },
  bone_bastion: {
    id: 'bone_bastion', name: 'Рунный бастион', icon: 'sk_bone_bastion', kind: 'buff', cost: 30, cooldown: 15,
    mult: 1.0, multPerRank: 0.3, range: 0, duration: 6, castTime: 0.35, anim: 'cast', sfx: 'stun',
    desc: 'Рунный щит на 6 с: −50% получаемого урона, враги получают {dmg} урона шипами.',
  },

  // ─── Тень Пустоты ───────────────────────────────────────────────
  shade_basic: {
    id: 'shade_basic', name: 'Пронзающая стрела', icon: 'sk_shade_basic', kind: 'projectile', cost: 0, cooldown: 0,
    mult: 1.0, multPerRank: 0.1, range: 12, speed: 17, pierce: 1, gain: 4, castTime: 0.34, anim: 'attack', sfx: 'arrow',
    desc: 'Стрела пробивает одну цель: {dmg} урона.',
  },
  shade_fan: {
    id: 'shade_fan', name: 'Веер кинжалов', icon: 'sk_shade_fan', kind: 'fan', cost: 25, cooldown: 2.5,
    mult: 0.85, multPerRank: 0.14, range: 8, speed: 15, count: 5, arc: 55, bleed: 0.35, castTime: 0.35, anim: 'attack', sfx: 'arrow',
    desc: 'Пять кинжалов веером, каждый — {dmg} урона. Шанс кровотечения 35%.',
  },
  shade_trap: {
    id: 'shade_trap', name: 'Капкан Пустоты', icon: 'sk_shade_trap', kind: 'trap', cost: 25, cooldown: 3,
    mult: 3.0, multPerRank: 0.45, range: 7, radius: 2.2, root: 2, castTime: 0.3, anim: 'cast', sfx: 'trap',
    desc: 'Ставит капкан (до 3): взрыв на {dmg} урона и обездвиживание на 2 с.',
  },
  shade_vault: {
    id: 'shade_vault', name: 'Шаг в тень', icon: 'sk_shade_vault', kind: 'vault', cost: 20, cooldown: 7,
    mult: 1, multPerRank: 0.1, range: 4, duration: 2.5, castTime: 0.25, anim: 'cast', sfx: 'dodge',
    desc: 'Отскок от курсора с неуязвимостью. 2,5 с все удары критические (+{dmg} крит. урона).',
  },
};

/** Множитель урона навыка на заданном ранге. */
export function skillMult(s: SkillDef, rank: number): number {
  return s.mult + s.multPerRank * (rank - 1);
}

export function skillDesc(s: SkillDef, rank: number): string {
  return s.desc.replace('{dmg}', Math.round(skillMult(s, rank) * 100) + '%');
}
