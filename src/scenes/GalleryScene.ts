// Галерея ассетов: все процедурные спрайты, тайлы, иконки и элементы UI на одном экране.
// Используется для арт-ревью и экспорта PNG (window.__exportArt).
import Phaser from 'phaser';
import { UI } from '../config';
import { ART_GROUPS, SHEETS } from '../art';
import { txt, title, button } from '../ui/widgets';

const GROUP_NAMES: Record<string, string> = {
  chars: 'Персонажи и враги (листы анимаций)', tiles: 'Тайлы: пол и стены двух регионов', props: 'Пропсы и декор',
  icons: 'Иконки предметов, навыков, редкостей', ui: 'Интерфейс', fx: 'Эффекты и снаряды',
};

export class GalleryScene extends Phaser.Scene {
  constructor() { super('Gallery'); }

  create() {
    const W = this.scale.width;
    const s = Math.max(0.6, Math.min(2, W / 1280));
    this.cameras.main.setBackgroundColor('#0d0a0b');
    const cont = this.add.container(0, 0);
    let y = 70 * s;
    cont.add(title(this, W / 2, 14 * s, 'Галерея ассетов Ashen Crown', 30, s).setScale(s));
    const order = ['chars', 'tiles', 'props', 'icons', 'ui', 'fx'];
    for (const gk of order) {
      cont.add(txt(this, 20 * s, y, GROUP_NAMES[gk], 20, '#c8a878', { fontStyle: 'bold' }, s).setScale(s));
      y += 34 * s;
      let x = 20 * s, rowH = 0;
      for (const key of ART_GROUPS[gk]) {
        if (key === 'menu_bg') continue;
        const sheet = SHEETS[key];
        const frame = sheet ? 0 : undefined;
        let img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
        if (sheet) {
          img = this.add.sprite(0, 0, key, frame).setOrigin(0, 0);
          (img as Phaser.GameObjects.Sprite).play(`${key}_walk_S`);
        } else img = this.add.image(0, 0, key).setOrigin(0, 0);
        const maxW = (gk === 'icons' ? 64 : gk === 'chars' ? 120 : 140) * s;
        const k = Math.min(1, maxW / img.width, (gk === 'chars' ? 160 : 140) * s / img.height);
        img.setScale(k);
        if (x + img.displayWidth > W - 20 * s) { x = 20 * s; y += rowH + 24 * s; rowH = 0; }
        img.setPosition(x, y);
        cont.add(img);
        cont.add(txt(this, x, y + img.displayHeight + 2, key, 10, UI.textDim, {}, s).setScale(s));
        x += Math.max(img.displayWidth, 60 * s) + 14 * s;
        rowH = Math.max(rowH, img.displayHeight + 12 * s);
      }
      y += rowH + 40 * s;
    }
    // фон меню отдельно, крупно
    cont.add(txt(this, 20 * s, y, 'Фон главного меню', 20, '#c8a878', { fontStyle: 'bold' }, s).setScale(s));
    const bg = this.add.image(20 * s, y + 34 * s, 'menu_bg').setOrigin(0, 0);
    bg.setScale((W - 40 * s) / bg.width);
    cont.add(bg);
    const maxY = y + 34 * s + bg.displayHeight + 40 * s;
    const back = button(this, 0, 0, 140, 36, '← Меню', () => this.scene.start('Menu'), s, 16);
    back.cont.setPosition(12 * s, 12 * s).setScale(s).setScrollFactor(0).setDepth(10);
    // прокрутка колесом и пальцем
    const cam = this.cameras.main;
    const clampScroll = () => { cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, Math.max(0, maxY - this.scale.height)); };
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => { cam.scrollY += dy; clampScroll(); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) { cam.scrollY -= (p.y - p.prevPosition.y); clampScroll(); } });
    // экспорт PNG для арт-пайплайна (вызывается скриптом tools/export-art.mjs)
    (window as any).__exportArt = () => {
      const out: Record<string, string> = {};
      for (const keys of Object.values(ART_GROUPS)) for (const key of keys) {
        const src = this.textures.get(key).getSourceImage() as HTMLCanvasElement;
        if (src && 'toDataURL' in src) out[key] = src.toDataURL('image/png');
      }
      return out;
    };
  }
}
