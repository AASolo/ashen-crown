// Загрузка: шрифты + генерация всей процедурной графики, затем главное меню.
import Phaser from 'phaser';
import { registerArt } from '../art';
import { queueExternalArt, cursorCss } from '../art/external';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Скачанные ассеты FLARE; при ошибке загрузки остаётся процедурный арт.
    queueExternalArt(this);
  }

  async create() {
    const boot = document.getElementById('boot');
    // Ждём веб-шрифт не дольше 1,5 с: без сети используется запасной Georgia.
    try {
      await Promise.race([
        Promise.all([document.fonts.load('20px "Cormorant Garamond"'), document.fonts.load('bold 20px "Cormorant SC"')]),
        new Promise(r => setTimeout(r, 1500)),
      ]);
    } catch { /* шрифт недоступен */ }
    if (boot) boot.textContent = 'КУЁМ ПЕПЕЛ…';
    await new Promise(r => setTimeout(r, 30));
    registerArt(this);
    this.input.setDefaultCursor(cursorCss('normal'));
    boot?.remove();
    const params = new URLSearchParams(location.search);
    this.scene.start(params.has('gallery') ? 'Gallery' : 'Menu');
  }
}
