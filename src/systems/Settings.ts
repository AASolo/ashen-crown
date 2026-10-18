// Настройки игрока: хранятся отдельно от сохранения героя.
import { SETTINGS_KEY } from '../config';
import { Sfx } from '../core/Sfx';

export type ControlScheme = 'classic' | 'wasd';
export type TouchMode = 'auto' | 'on' | 'off';
/** cinema — свечение, цветокоррекция и виньетка; off — без пост-обработки (слабые устройства). */
export type GraphicsMode = 'cinema' | 'off';

export interface Settings {
  sfx: number;            // 0..1
  music: number;          // 0..1
  uiScale: number;        // 0.8..1.4
  shake: boolean;         // тряска экрана
  colorblind: boolean;    // режим для дальтоников: символы редкости + альтернативные цвета
  scheme: ControlScheme;  // classic: ЛКМ + Q W E, R — зелье; wasd: движение WASD, навыки Q E R, F — зелье
  touch: TouchMode;       // сенсорное управление
  subtitles: boolean;
  damageNumbers: boolean;
  graphics: GraphicsMode;
  lang: 'ru';
}

const DEFAULTS: Settings = {
  sfx: 0.7, music: 0.45, uiScale: 1, shake: true, colorblind: false,
  scheme: 'classic', touch: 'auto', subtitles: true, damageNumbers: true, lang: 'ru',
  graphics: 'cinema',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* приватный режим или запрет хранилища — работаем с умолчаниями */ }
  return { ...DEFAULTS };
}

export const settings: Settings = loadSettings();

export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* игнор */ }
  Sfx.sfxVolume = settings.sfx;
  Sfx.musicVolume = settings.music;
  Sfx.applyVolumes();
}

/** Сенсорный ли интерфейс сейчас. */
export function isTouchUI(): boolean {
  if (settings.touch === 'on') return true;
  if (settings.touch === 'off') return false;
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

Sfx.sfxVolume = settings.sfx;
Sfx.musicVolume = settings.music;
