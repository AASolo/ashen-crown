// Общие элементы интерфейса: тексты, готические панели, кнопки, панель настроек.
import Phaser from 'phaser';
import { FONT, FONT_TITLE, UI } from '../config';
import { settings, saveSettings } from '../systems/Settings';
import { Sfx } from '../core/Sfx';
import { bus, EV } from '../core/events';

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 16, color = UI.text, o: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}, res = 1) {
  return scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, ...o }).setResolution(Math.max(1, Math.min(4, res)));
}

export function title(scene: Phaser.Scene, x: number, y: number, s: string, size = 26, res = 1) {
  return txt(scene, x, y, s, size, '#e8d4b0', { fontFamily: FONT_TITLE, fontStyle: 'bold', stroke: '#0a0606', strokeThickness: 4 }, res).setOrigin(0.5, 0);
}

/**
 * Панель. С ассетами FLARE — кожаное окно (kind 'window', с полосой заголовка) или тёмная подложка подсказки
 * (kind 'plain'), растянутые без искажения краёв; поверх — бронзовые уголки-ромбы. Без ассетов — рисуется кодом.
 */
export function panel(scene: Phaser.Scene, w: number, h: number, alpha = 0.95, kind: 'window' | 'plain' = h < 120 ? 'plain' : 'window'): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.5); g.fillRect(4, 6, w, h);
  const key = kind === 'window' ? 'ui_panel' : 'ui_tip';
  if (scene.textures.exists(key)) {
    const [l, r, t, b] = kind === 'window' ? [18, 18, 36, 18] : [10, 10, 10, 10];
    c.add([g, scene.add.nineslice(0, 0, key, undefined, w, h, l, r, t, b).setOrigin(0).setAlpha(Math.min(1, alpha + 0.05))]);
    const o = scene.add.graphics();
    o.lineStyle(1, UI.border, 0.55); o.strokeRect(4, 4, w - 8, h - 8);
    corners(o, w, h);
    c.add(o);
    return c;
  }
  g.fillStyle(UI.panel, alpha); g.fillRect(0, 0, w, h);
  // внутренний градиент имитируем полосами
  for (let i = 0; i < 6; i++) { g.fillStyle(0x2a1a14, 0.05); g.fillRect(i * 2, i * 2, w - i * 4, h - i * 4); }
  g.lineStyle(3, UI.borderDark, 1); g.strokeRect(1, 1, w - 2, h - 2);
  g.lineStyle(1.5, UI.border, 1); g.strokeRect(5, 5, w - 10, h - 10);
  g.lineStyle(1, 0x3a2818, 1); g.strokeRect(9, 9, w - 18, h - 18);
  corners(g, w, h);
  c.add(g);
  return c;
}

function corners(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  for (const [x, y] of [[5, 5], [w - 5, 5], [5, h - 5], [w - 5, h - 5]]) {
    g.fillStyle(UI.border, 1); g.fillTriangle(x - 7, y, x, y - 7, x + 7, y); g.fillTriangle(x - 7, y, x, y + 7, x + 7, y);
    g.fillStyle(0xff7a2a, 0.9); g.fillCircle(x, y, 1.6);
  }
}

/** Квадратная кнопка с белым глифом на каменной плашке, как на панели действий FLARE; подпись под ней. */
export function iconButton(scene: Phaser.Scene, x: number, y: number, size: number, icon: string, label: string, cb: () => void, res = 1): Phaser.GameObjects.Container {
  const cont = scene.add.container(x, y);
  const hasArt = scene.textures.exists('ui_slot') && scene.textures.exists(icon);
  const bg = hasArt ? scene.add.image(0, 0, 'ui_slot').setOrigin(0).setDisplaySize(size, size) : scene.add.rectangle(0, 0, size, size, 0x1a1214).setOrigin(0).setStrokeStyle(2, UI.border);
  const glow = scene.add.rectangle(0, 0, size, size, 0xffb060, 0.16).setOrigin(0).setVisible(false);
  const ic = hasArt ? scene.add.image(size / 2, size / 2, icon).setDisplaySize(size * 0.8, size * 0.8) : null;
  const t = txt(scene, size / 2, size + 2, label, 12, UI.textDim, { stroke: '#000', strokeThickness: 3 }, res).setOrigin(0.5, 0);
  const zone = scene.add.zone(0, 0, size, size + 16).setOrigin(0).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => { glow.setVisible(true); ic?.setTint(0xffe6c0); t.setColor(UI.text); });
  zone.on('pointerout', () => { glow.setVisible(false); ic?.clearTint(); t.setColor(UI.textDim); });
  zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    Sfx.unlock(); Sfx.play('ui');
    cb();
  });
  cont.add([bg, glow, ...(ic ? [ic] : [txt(scene, size / 2, size / 2, label.slice(0, 1), 18, UI.text, { fontStyle: 'bold' }, res).setOrigin(0.5)]), t, zone]);
  return cont;
}

/** Крестик закрытия окна: красная кнопка FLARE, без ассетов — обычная кнопка «✕». */
export function closeButton(scene: Phaser.Scene, x: number, y: number, cb: () => void, res = 1): Phaser.GameObjects.Container {
  if (!scene.textures.exists('ui_close')) return button(scene, x, y, 32, 32, '✕', cb, res).cont;
  const cont = scene.add.container(x, y);
  const img = scene.add.image(0, 0, 'ui_close').setOrigin(0).setDisplaySize(44, 26);
  const zone = scene.add.zone(0, 0, 44, 26).setOrigin(0).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => img.setTexture(scene.textures.exists('ui_close_hover') ? 'ui_close_hover' : 'ui_close'));
  zone.on('pointerout', () => img.setTexture('ui_close'));
  zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => { ev?.stopPropagation?.(); Sfx.unlock(); Sfx.play('ui'); cb(); });
  cont.add([img, zone]);
  return cont;
}

export interface Btn { cont: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text; setEnabled(v: boolean): void; setText(s: string): void }

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, cb: () => void, res = 1, size = 17): Btn {
  const cont = scene.add.container(x, y);
  const g = scene.add.graphics();
  let enabled = true;
  // широкие кнопки — рамкой из FLARE (бронза с ромбами по краям), растянутой без искажения углов
  const skin = w >= 90 && scene.textures.exists('ui_btn') && scene.textures.exists('ui_btn_hover')
    ? (['ui_btn', 'ui_btn_hover', 'ui_btn_off'] as const).map(k => scene.add.nineslice(0, 0, scene.textures.exists(k) ? k : 'ui_btn', undefined, w, h, 30, 30, 10, 10).setOrigin(0))
    : null;
  const draw = (hover: boolean) => {
    g.clear();
    if (skin) {
      skin[0].setVisible(enabled && !hover); skin[1].setVisible(enabled && hover); skin[2].setVisible(!enabled);
      return;
    }
    g.fillStyle(0x000000, 0.4); g.fillRect(2, 3, w, h);
    g.fillStyle(hover && enabled ? 0x2e1e18 : 0x1a1214, 1); g.fillRect(0, 0, w, h);
    g.fillStyle(0xffffff, 0.04); g.fillRect(0, 0, w, h / 2);
    g.lineStyle(2, enabled ? (hover ? 0xc8925a : UI.border) : 0x3a2a20, 1); g.strokeRect(0, 0, w, h);
    g.lineStyle(1, 0x0a0606, 1); g.strokeRect(3, 3, w - 6, h - 6);
  };
  draw(false);
  const t = txt(scene, w / 2, h / 2, label, size, UI.text, { fontStyle: 'bold' }, res).setOrigin(0.5);
  // длинная подпись не вылезает за бронзовые ромбы рамки
  const room = w - (skin ? 44 : 12);
  if (t.displayWidth > room) t.setScale(t.scaleX * room / t.displayWidth, t.scaleY * room / t.displayWidth);
  const zone = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => draw(true));
  zone.on('pointerout', () => draw(false));
  zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    if (!enabled) return;
    Sfx.unlock(); Sfx.play('ui');
    cb();
  });
  cont.add([...(skin ?? []), g, t, zone]);
  return {
    cont, label: t,
    setEnabled(v: boolean) { enabled = v; t.setColor(v ? UI.text : UI.textDim); draw(false); },
    setText(s: string) { t.setText(s); },
  };
}

/** Панель настроек — общая для главного меню и паузы. */
export function settingsPanel(scene: Phaser.Scene, cx: number, cy: number, scale: number, onClose: () => void): Phaser.GameObjects.Container {
  const W = 520, H = 560;
  const cont = scene.add.container(cx - W * scale / 2, cy - H * scale / 2).setScale(scale).setDepth(10000);
  const res = scale;
  cont.add(panel(scene, W, H));
  cont.add(title(scene, W / 2, 18, 'Настройки', 28, res));
  const rows: { label: string; value: () => string; dec?: () => void; inc: () => void }[] = [
    { label: 'Звуки', value: () => Math.round(settings.sfx * 100) + '%', dec: () => { settings.sfx = Math.max(0, +(settings.sfx - 0.1).toFixed(2)); }, inc: () => { settings.sfx = Math.min(1, +(settings.sfx + 0.1).toFixed(2)); } },
    { label: 'Музыка и эмбиент', value: () => Math.round(settings.music * 100) + '%', dec: () => { settings.music = Math.max(0, +(settings.music - 0.1).toFixed(2)); }, inc: () => { settings.music = Math.min(1, +(settings.music + 0.1).toFixed(2)); } },
    { label: 'Масштаб интерфейса', value: () => Math.round(settings.uiScale * 100) + '%', dec: () => { settings.uiScale = Math.max(0.7, +(settings.uiScale - 0.1).toFixed(2)); }, inc: () => { settings.uiScale = Math.min(1.6, +(settings.uiScale + 0.1).toFixed(2)); } },
    { label: 'Схема управления', value: () => settings.scheme === 'classic' ? 'ЛКМ + Q W E' : 'WASD + Q E R', inc: () => { settings.scheme = settings.scheme === 'classic' ? 'wasd' : 'classic'; } },
    { label: 'Сенсорное управление', value: () => ({ auto: 'Авто', on: 'Вкл', off: 'Выкл' })[settings.touch], inc: () => { settings.touch = settings.touch === 'auto' ? 'on' : settings.touch === 'on' ? 'off' : 'auto'; } },
    { label: 'Тряска экрана', value: () => settings.shake ? 'Вкл' : 'Выкл', inc: () => { settings.shake = !settings.shake; } },
    { label: 'Режим для дальтоников', value: () => settings.colorblind ? 'Вкл' : 'Выкл', inc: () => { settings.colorblind = !settings.colorblind; } },
    { label: 'Цифры урона', value: () => settings.damageNumbers ? 'Вкл' : 'Выкл', inc: () => { settings.damageNumbers = !settings.damageNumbers; } },
    { label: 'Субтитры', value: () => settings.subtitles ? 'Вкл' : 'Выкл', inc: () => { settings.subtitles = !settings.subtitles; } },
    { label: 'Графика', value: () => settings.graphics === 'cinema' ? 'Кино' : 'Простая', inc: () => { settings.graphics = settings.graphics === 'cinema' ? 'off' : 'cinema'; } },
  ];
  rows.forEach((r, i) => {
    const y = 74 + i * 40;
    cont.add(txt(scene, 36, y + 6, r.label, 18, UI.text, {}, res));
    const val = txt(scene, 380, y + 6, r.value(), 17, '#e8c890', { fontStyle: 'bold' }, res).setOrigin(0.5, 0);
    cont.add(val);
    const apply = () => { val.setText(r.value()); saveSettings(); bus.emit(EV.SETTINGS); };
    if (r.dec) cont.add(button(scene, 290, y, 30, 30, '−', () => { r.dec!(); apply(); }, res).cont);
    cont.add(button(scene, r.dec ? 440 : 470, y, 30, 30, r.dec ? '+' : '⟳', () => { r.inc(); apply(); }, res).cont);
  });
  cont.add(button(scene, 36, H - 62, 210, 40, 'Полный экран', () => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen(); else scene.scale.startFullscreen();
  }, res).cont);
  cont.add(button(scene, W - 246, H - 62, 210, 40, 'Готово', () => { cont.destroy(); onClose(); }, res).cont);
  // блокируем клики сквозь панель
  const blocker = scene.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
  cont.addAt(blocker, 0);
  return cont;
}

export const hexStr = (n: number) => '#' + n.toString(16).padStart(6, '0');
