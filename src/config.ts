// Глобальные константы прототипа.

/** Ширина изометрического тайла на экране (проекция 2:1). */
export const TILE_W = 64;
/** Высота изометрического тайла на экране. */
export const TILE_H = 32;
/** Высота стенового блока над полом, px. */
export const WALL_H = 56;
/** Все процедурные текстуры рисуются в 2× разрешении и показываются с масштабом 0.5 — чёткость на HiDPI/4K. */
export const ART = 2;

export const SAVE_KEY = 'ashen-crown-save-v1';
export const SETTINGS_KEY = 'ashen-crown-settings-v1';

/** Шрифт интерфейса: готическая антиква с кириллицей, с запасными вариантами. */
export const FONT = '"Cormorant Garamond", "Palatino Linotype", Georgia, serif';
export const FONT_TITLE = '"Cormorant SC", "Cormorant Garamond", Georgia, serif';

/** Цвета интерфейса (палитра: пепел, ржавчина, тлеющие угли, биолюминесценция). */
export const UI = {
  bg: 0x0d0a0b,
  panel: 0x141012,
  panelHi: 0x1e181a,
  border: 0x6e4f33,
  borderDark: 0x2a1c13,
  gold: 0xd9a65a,
  text: '#d8cbb4',
  textDim: '#8d8072',
  ember: '#ff8a3a',
  emberHex: 0xff8a3a,
  teal: '#5ee0c8',
  tealHex: 0x5ee0c8,
  blood: '#c8313a',
  good: '#7fd88a',
  bad: '#e05a5a',
};
