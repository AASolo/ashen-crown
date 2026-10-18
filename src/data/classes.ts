// Четыре класса. В прототипе у каждого — базовая атака, 3 навыка (Q/W/E) и 3 пассивных таланта.
// Полные деревья (3 ветки × 10–15 умений) описаны в docs/GDD.md, раздел 5.
import type { Stats } from './stats';

export type ClassId = 'blade' | 'witch' | 'bone' | 'shade';
export type WeaponType = 'blades' | 'staff' | 'hammer' | 'bow';

export interface TalentDef {
  id: string;
  name: string;
  desc: string;
  max: number;
  per: Partial<Stats>; // прибавка за ранг
}

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  desc: string;
  role: string;
  resource: { name: string; color: number; max: number; regen: number; start: number; decay: number };
  base: { str: number; dex: number; int: number; vit: number };
  perLevel: { str: number; dex: number; int: number; vit: number };
  mainStat: 'str' | 'dex' | 'int';
  weapon: WeaponType;
  baseAttackTime: number; // секунды между базовыми атаками
  ranged: boolean;
  moveSpeed: number;      // тайлов в секунду
  basic: string;
  skills: [string, string, string];
  talents: TalentDef[];
  bonus: Partial<Stats>;  // классовые особенности
}

export const CLASSES: Record<ClassId, ClassDef> = {
  blade: {
    id: 'blade', name: 'Пепельный Клинок', tagline: 'Комбо, рывки, кровотечение',
    desc: 'Изгнанный страж, в чьих жилах вместо крови тлеет пепел Венца. Чем дольше бой, тем яростнее клинки.',
    role: 'Ближний бой · DPS',
    resource: { name: 'Ярость', color: 0xd8432f, max: 100, regen: 0, start: 40, decay: 3 },
    base: { str: 12, dex: 14, int: 6, vit: 11 }, perLevel: { str: 2, dex: 3, int: 1, vit: 2 },
    mainStat: 'dex', weapon: 'blades', baseAttackTime: 0.42, ranged: false, moveSpeed: 4.4,
    basic: 'blade_basic', skills: ['blade_dash', 'blade_whirl', 'blade_reap'],
    bonus: { lifesteal: 0.02, critChance: 0.05 },
    talents: [
      { id: 'b_edge', name: 'Зазубренная сталь', desc: '+6% шанс кровотечения за ранг', max: 3, per: { bleedChance: 0.06 } },
      { id: 'b_fury', name: 'Неугасимая ярость', desc: '+7% скорость атаки за ранг', max: 3, per: { atkSpeed: 0.07 } },
      { id: 'b_ash', name: 'Пепельная кровь', desc: '+2% вампиризм за ранг', max: 3, per: { lifesteal: 0.02 } },
    ],
  },
  witch: {
    id: 'witch', name: 'Пепельная Ведьма', tagline: 'Огонь, тень, урон по площади',
    desc: 'Пророчица сожжённого ковена. Слышит, как Пустое Солнце поёт под землёй, и отвечает ему пламенем.',
    role: 'Дальний бой · AoE / призыв',
    resource: { name: 'Жар', color: 0xff7a2a, max: 100, regen: 7, start: 100, decay: 0 },
    base: { str: 6, dex: 9, int: 16, vit: 9 }, perLevel: { str: 1, dex: 1, int: 4, vit: 2 },
    mainStat: 'int', weapon: 'staff', baseAttackTime: 0.4, ranged: true, moveSpeed: 4.0,
    basic: 'witch_basic', skills: ['witch_fireball', 'witch_circle', 'witch_wisps'],
    bonus: { igniteChance: 0.05 },
    talents: [
      { id: 'w_pyre', name: 'Костёр ковена', desc: '+8% урона за ранг', max: 3, per: { dmgPct: 0.08 } },
      { id: 'w_flow', name: 'Поток жара', desc: '+1.5 восст. Жара/с за ранг', max: 3, per: { resRegen: 1.5 } },
      { id: 'w_veil', name: 'Пепельная вуаль', desc: '+6% сопротивления за ранг', max: 3, per: { resist: 0.06 } },
    ],
  },
  bone: {
    id: 'bone', name: 'Костолом', tagline: 'Щит, оглушение, защита',
    desc: 'Каменотёс из рудников Вельдмара, выковавший щит из надгробий. Принимает удары, чтобы другие жили.',
    role: 'Ближний бой · Танк / контроль',
    resource: { name: 'Стойкость', color: 0xd9b25a, max: 100, regen: 5, start: 60, decay: 0 },
    base: { str: 16, dex: 7, int: 5, vit: 15 }, perLevel: { str: 3, dex: 1, int: 1, vit: 3 },
    mainStat: 'str', weapon: 'hammer', baseAttackTime: 0.62, ranged: false, moveSpeed: 3.9,
    basic: 'bone_basic', skills: ['bone_charge', 'bone_quake', 'bone_bastion'],
    bonus: { armor: 25, blockChance: 0.15, stunChance: 0.15 },
    talents: [
      { id: 'o_wall', name: 'Надгробный щит', desc: '+6% шанс блока за ранг', max: 3, per: { blockChance: 0.06 } },
      { id: 'o_hide', name: 'Каменная кожа', desc: '+30 брони за ранг', max: 3, per: { armor: 30 } },
      { id: 'o_quake', name: 'Гул земли', desc: '+6% шанс оглушения за ранг', max: 3, per: { stunChance: 0.06 } },
    ],
  },
  shade: {
    id: 'shade', name: 'Тень Пустоты', tagline: 'Стрелы, ловушки, мобильность',
    desc: 'Беглянка из культа Бездны. Унесла с собой осколок тьмы и научилась шагать сквозь неё.',
    role: 'Дальний бой · Крит / ловушки',
    resource: { name: 'Фокус', color: 0x4fc6e0, max: 100, regen: 11, start: 100, decay: 0 },
    base: { str: 8, dex: 16, int: 8, vit: 9 }, perLevel: { str: 1, dex: 4, int: 1, vit: 2 },
    mainStat: 'dex', weapon: 'bow', baseAttackTime: 0.36, ranged: true, moveSpeed: 4.6,
    basic: 'shade_basic', skills: ['shade_fan', 'shade_trap', 'shade_vault'],
    bonus: { critChance: 0.08, critDmg: 0.2 },
    talents: [
      { id: 's_eye', name: 'Взгляд Пустоты', desc: '+4% шанс крита за ранг', max: 3, per: { critChance: 0.04 } },
      { id: 's_venom', name: 'Чёрный яд', desc: '+15% крит. урона за ранг', max: 3, per: { critDmg: 0.15 } },
      { id: 's_wind', name: 'Шаг ветра', desc: '+5% скорость бега за ранг', max: 3, per: { moveSpeed: 0.05 } },
    ],
  },
};

export const CLASS_ORDER: ClassId[] = ['blade', 'witch', 'bone', 'shade'];
