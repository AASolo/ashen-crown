// Шина событий между игровой сценой и интерфейсом.
// Игровая логика не знает об UI: она только публикует события.
import Phaser from 'phaser';

export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  TOAST: 'toast',             // (text, color) — всплывающее сообщение
  SUBTITLE: 'subtitle',       // (speaker, text) — субтитры реплик
  INVENTORY: 'inventory',     // инвентарь изменился
  LEVELUP: 'levelup',         // (level)
  FLOOR: 'floor',             // (depth, title) — новый этаж
  BOSS: 'boss',               // (boss | null) — показать/скрыть полосу босса
  HERO_DEAD: 'hero-dead',
  MAP_REVEAL: 'map-reveal',   // открыты новые клетки карты
  SETTINGS: 'settings',       // настройки изменились
  QUEST: 'quest',             // шаг или счётчик задания изменился
} as const;
