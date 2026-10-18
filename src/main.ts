// Точка входа. Phaser 3: WebGL с автоматическим откатом на Canvas.
// Резкость на HiDPI/4K: холст рисуется в физических пикселях (× devicePixelRatio, максимум 2),
// а CSS-размер остаётся равным окну.
import Phaser from 'phaser';
import './fonts.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GalleryScene } from './scenes/GalleryScene';
import { newHero } from './systems/HeroData';
import { generateItem } from './systems/Loot';
import { Sfx } from './core/Sfx';
import { Music } from './core/Music';

const dpr = () => Math.min(2, window.devicePixelRatio || 1);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#050304',
  width: Math.round(window.innerWidth * dpr()),
  height: Math.round(window.innerHeight * dpr()),
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr() },
  render: { antialias: true, powerPreference: 'high-performance', roundPixels: false },
  input: { gamepad: true, activePointers: 4 },
  fps: { target: 60 },
  scene: [BootScene, MenuScene, GameScene, UIScene, GalleryScene],
});

function fit() {
  const d = dpr();
  game.scale.resize(Math.round(window.innerWidth * d), Math.round(window.innerHeight * d));
  game.scale.setZoom(1 / d);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));

// для тестов и отладки
(window as any).__game = game;
(window as any).__dbg = { newHero, generateItem, Sfx, Music };
