// Регистрация всей процедурной графики в менеджере текстур Phaser и создание анимаций.
// В продакшене этот модуль заменяется загрузкой атласов (PNG + JSON), ключи остаются теми же.
import Phaser from 'phaser';
import * as Tile from './TileArt';
import * as Fx from './FxArt';
import { ANIMS, FRAMES_PER_SIDE, SKINS, humanoidSheet, wolfSheet, drawWisp } from './CharacterArt';
import { ITEM_ICONS, SKILL_ICONS, drawItemIcon, drawSkillIcon, drawRarityGem } from './IconArt';
import { RARITIES } from '../data/items';
import { EXT_LOADED, EXT_FX, EXT_NPCS, addExtSheet, addExtFx, addExtNpc } from './external';

export interface SheetInfo { fw: number; fh: number; footY: number; /** разрешение листа относительно 2× (внешние листы ужаты) */ scale?: number }
export const SHEETS: Record<string, SheetInfo> = {};

function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, fw: number, fh: number, footY: number) {
  const tex = scene.textures.addCanvas(key, canvas)!;
  for (let row = 0; row < 2; row++) for (let i = 0; i < FRAMES_PER_SIDE; i++) {
    tex.add(row * FRAMES_PER_SIDE + i, 0, i * fw, row * fh, fw, fh);
  }
  SHEETS[key] = { fw, fh, footY };
  for (const [name, [a, b, fps, rep]] of Object.entries(ANIMS)) {
    (['S', 'N'] as const).forEach((side, row) => {
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let f = a; f <= b; f++) frames.push({ key, frame: row * FRAMES_PER_SIDE + f });
      scene.anims.create({ key: `${key}_${name}_${side}`, frames, frameRate: fps, repeat: rep });
    });
  }
}

function add(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/** Ключи всех текстур — используются галереей ассетов и экспортом PNG. */
export const ART_GROUPS: Record<string, string[]> = { tiles: [], props: [], chars: [], fx: [], ui: [], icons: [] };

export function registerArt(scene: Phaser.Scene, onProgress?: (p: number) => void) {
  const steps: [string, keyof typeof ART_GROUPS, () => void][] = [];
  // Если внешняя текстура (assets/flare) загрузилась, процедурная версия не рисуется.
  const job = (key: string, group: keyof typeof ART_GROUPS, f: () => HTMLCanvasElement) =>
    steps.push([key, group, () => { if (!EXT_LOADED.has(key)) add(scene, key, f()); }]);

  for (const th of ['catacombs', 'ashlands'] as const) {
    for (let v = 0; v < 6; v++) job(`floor_${th}_${v}`, 'tiles', () => Tile.drawFloor(th, v));
    for (const v of [0, 1, 2, 3, 4, 9]) job(`wall_${th}_${v}`, 'tiles', () => Tile.drawWall(th, v));
    job(`pillar_${th}`, 'props', () => Tile.drawPillar(th));
  }
  for (let v = 0; v < 3; v++) job(`tree_${v}`, 'props', () => Tile.drawTree(v));
  job('grave', 'props', Tile.drawGrave);
  job('brazier', 'props', Tile.drawBrazier);
  job('chest', 'props', () => Tile.drawChest(false));
  job('chest_open', 'props', () => Tile.drawChest(true));
  job('chest_elite', 'props', () => Tile.drawChest(false, true));
  job('chest_elite_open', 'props', () => Tile.drawChest(true, true));
  job('altar', 'props', Tile.drawAltar);
  job('crystal', 'props', Tile.drawCrystal);
  for (const d of ['bones', 'puddle', 'rubble', 'blood', 'ashpile', 'rubblewall'] as const) job(`decal_${d}`, 'props', () => Tile.drawDecal(d));
  job('cart', 'props', Tile.drawCart);
  job('banner', 'props', Tile.drawBanner);
  job('trap_off', 'props', () => Tile.drawTrap(false));
  job('trap_on', 'props', () => Tile.drawTrap(true));
  job('portal', 'props', Tile.drawPortal);

  // Персонажи (листы кадров)
  const charJob = (key: string, f: () => void) =>
    steps.push([key, 'chars', () => (EXT_LOADED.has(key) ? addExtSheet(scene, key, SHEETS) : f())]);
  for (const cls of ['blade', 'witch', 'bone', 'shade']) charJob(`hero_${cls}`, () => addSheet(scene, `hero_${cls}`, humanoidSheet(SKINS[cls], 128, 176, 160), 128, 176, 160));
  for (const en of ['ghoul', 'cultist', 'shadow']) charJob(`en_${en}`, () => addSheet(scene, `en_${en}`, humanoidSheet(SKINS[en], 128, 176, 160), 128, 176, 160));
  charJob('en_archer', () => addSheet(scene, 'en_archer', humanoidSheet(SKINS.cultist, 128, 176, 160), 128, 176, 160));
  charJob('en_brute', () => addSheet(scene, 'en_brute', humanoidSheet(SKINS.ghoul, 128, 176, 160), 128, 176, 160));
  charJob('en_herald', () => addSheet(scene, 'en_herald', humanoidSheet(SKINS.herald, 256, 336, 318), 256, 336, 318));
  charJob('en_wolf', () => addSheet(scene, 'en_wolf', wolfSheet(176, 120, 108), 176, 120, 108));
  job('wisp', 'fx', drawWisp);

  // Эффекты
  job('glow', 'fx', () => Fx.drawGlow());
  job('lightmask', 'fx', Fx.drawLightMask);
  job('shadow', 'fx', Fx.drawShadow);
  for (const p of ['spark', 'ember', 'smoke', 'ash', 'blood', 'dot', 'shard'] as const) job(`p_${p}`, 'fx', () => Fx.drawParticle(p));
  job('slash', 'fx', Fx.drawSlash);
  job('ring', 'fx', Fx.drawRing);
  for (const p of ['spark', 'fireball', 'arrow', 'dagger', 'void', 'wispbolt'] as const) job(`proj_${p}`, 'fx', () => Fx.drawProjectile(p));
  // Анимации заклинаний FLARE (взрыв, удар о землю, тёмный туман). Процедурной замены нет: без них эффект просто частицы.
  for (const key of Object.keys(EXT_FX)) steps.push([key, 'fx', () => { if (EXT_LOADED.has(key)) addExtFx(scene, key); }]);
  // Жители лагеря (FLARE). Без листа их заменяет фигура героя в сером (см. entities/Npc.ts).
  for (const key of Object.keys(EXT_NPCS)) steps.push([key, 'chars', () => { if (EXT_LOADED.has(key)) addExtNpc(scene, key); }]);
  // Флейм-кадры: один холст, 4 кадра
  steps.push(['flame', 'fx', () => {
    const tex = scene.textures.addCanvas('flame', Tile.drawFlames())!;
    for (let i = 0; i < 4; i++) tex.add(i, 0, i * 64, 0, 64, 96);
    scene.anims.create({ key: 'flame', frames: [0, 1, 2, 3].map(f => ({ key: 'flame', frame: f })), frameRate: 10, repeat: -1 });
  }]);

  // Интерфейс
  job('orb_frame', 'ui', Fx.drawOrbFrame);
  job('orb_hp', 'ui', () => Fx.drawOrbLiquid(0xb0161e));
  job('orb_res', 'ui', () => Fx.drawOrbLiquid(0xb8b8b8));
  job('orb_glass', 'ui', Fx.drawOrbGlass);
  job('slot', 'ui', () => Fx.drawSlot('slot'));
  job('skillslot', 'ui', () => Fx.drawSlot('skill'));
  job('ornament', 'ui', Fx.drawOrnament);
  job('vignette', 'ui', Fx.drawVignette);
  job('menu_bg', 'ui', () => Fx.drawMenuBackground());

  // Иконки
  for (const k of Object.keys(ITEM_ICONS)) job(k, 'icons', () => drawItemIcon(k));
  for (const k of Object.keys(SKILL_ICONS)) job(k, 'icons', () => drawSkillIcon(k));
  RARITIES.forEach(r => job(`gem_${r.id}`, 'icons', () => drawRarityGem(r.color, r.id)));

  steps.forEach(([key, group, f], i) => {
    f();
    ART_GROUPS[group].push(key);
    onProgress?.((i + 1) / steps.length);
  });
}
