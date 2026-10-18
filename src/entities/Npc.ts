// Житель лагеря: стоит на месте, проигрывает «стойку», над головой имя и знак задания («!» — есть что сказать).
// Спрайты из FLARE (assets/flare/npc_*.webp); без них — фигура героя-костолома в сером.
import Phaser from 'phaser';
import { ART, FONT } from '../config';
import { isoToScreen, depthOf } from '../core/iso';
import { SHEETS } from '../art';
import { EXT_NPCS } from '../art/external';

export class Npc {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
  heightPx = 62;

  constructor(scene: Phaser.Scene, public id: string, key: string, public name: string, public x: number, public y: number, flip = false) {
    const p = isoToScreen(x, y);
    this.shadow = scene.add.image(p.x, p.y, 'shadow').setDepth(-99980);
    const m = EXT_NPCS[key];
    if (m && scene.anims.exists(`${key}_idle`)) {
      this.sprite = scene.add.sprite(p.x, p.y, key, 0).setOrigin(0.5, m.footY / m.fh).setScale(1 / ART / m.scale);
      this.sprite.play({ key: `${key}_idle`, startFrame: Math.floor(Math.random() * m.frames) });
    } else {
      const info = SHEETS.hero_bone;
      this.sprite = scene.add.sprite(p.x, p.y, 'hero_bone', 0).setOrigin(0.5, info.footY / info.fh).setScale(1 / ART / (info.scale ?? 1)).setTint(0x9a9088);
    }
    this.sprite.setFlipX(flip).setDepth(depthOf(x, y));
    this.label = scene.add.text(p.x, p.y - this.heightPx - 6, name, {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#e8d4b0', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(940000).setResolution(2);
    this.marker = scene.add.text(p.x, p.y - this.heightPx - 22, '!', {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffc04a', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(940001).setVisible(false).setResolution(2);
    scene.tweens.add({ targets: this.marker, y: this.marker.y - 6, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
  }

  setMarker(on: boolean) { this.marker.setVisible(on); }

  setVisible(v: boolean) { for (const o of [this.sprite, this.shadow, this.label]) o.setVisible(v); if (!v) this.marker.setVisible(false); }

  /** Попадание курсора по фигуре (экранные координаты мира). */
  hit(wx: number, wy: number) {
    const cx = this.sprite.x, cy = this.sprite.y - this.heightPx * 0.5;
    return Math.abs(wx - cx) < 24 && Math.abs(wy - cy) < this.heightPx * 0.6;
  }

  destroy() { for (const o of [this.sprite, this.shadow, this.label, this.marker]) o.destroy(); }
}
