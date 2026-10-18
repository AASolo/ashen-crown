// Внешние (скачанные) ассеты: пререндеренные спрайты и тайлы из открытой игры FLARE (CC-BY-SA 3.0).
// Подготавливаются скриптом tools/flare/ (нарезка, масштаб под тайл 64×32, цветокоррекция) и лежат в assets/flare/.
// Если файл не загрузился, игра рисует процедурную версию под тем же ключом.
import Phaser from 'phaser';
import manifest from '../../assets/flare/manifest.json';

export interface ExtSheet {
  fw: number; fh: number; footY: number; cols: number; perSide: number; scale: number;
  anims: Record<string, [number, number]>;
}

const urls = import.meta.glob('../../assets/flare/*.{webp,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlOf = (name: string) => Object.entries(urls).find(([p]) => p.endsWith(`/${name}`))?.[1];

export const EXT_SHEETS = manifest.sheets as unknown as Record<string, ExtSheet>;
/** Точка опоры (origin) внешних тайлов и пропсов: у них другие пропорции, чем у процедурных. */
export const EXT_ORIGIN = manifest.origins as unknown as Record<string, [number, number]>;
/** Одиночные картинки без особой точки опоры: портреты героев, иконки предметов и навыков. */
const EXT_IMAGES = (manifest as { images?: string[] }).images ?? [];
/** Анимации заклинаний: кадры в сетке, ox/oy — центр эффекта внутри кадра. */
export interface ExtFx { fw: number; fh: number; cols: number; frames: number; ms: number; ox: number; oy: number }
export const EXT_FX = ((manifest as { fx?: unknown }).fx ?? {}) as Record<string, ExtFx>;
/** Жители лагеря: одна анимация «стойка» лицом к камере. */
export interface ExtNpc { fw: number; fh: number; frames: number; ms: number; footY: number; scale: number }
export const EXT_NPCS = ((manifest as { npcs?: unknown }).npcs ?? {}) as Record<string, ExtNpc>;

/** Ключи, для которых внешняя текстура реально загрузилась. */
export const EXT_LOADED = new Set<string>();

/** Поставить все внешние картинки в очередь загрузчика Phaser (вызывать из preload). */
export function queueExternalArt(scene: Phaser.Scene) {
  for (const key of [...Object.keys(EXT_SHEETS), ...Object.keys(EXT_ORIGIN), ...EXT_IMAGES, ...Object.keys(EXT_FX), ...Object.keys(EXT_NPCS)]) {
    const url = urlOf(`${key}.webp`);
    if (url) scene.load.image(key, url);
  }
  scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => EXT_LOADED.add(key));
}

/** Курсор мыши из FLARE (обычный и над врагом). */
export function cursorCss(kind: 'normal' | 'attack'): string {
  const url = urlOf(`cursor_${kind}.png`);
  return url ? `url(${url}) 2 2, auto` : 'default';
}

// Длительности анимаций подобраны под процедурные листы, чтобы не менять тайминги боя.
const TIMING: Record<string, [number, number, boolean]> = {
  // имя: [длительность цикла, мс; повтор (-1/0); туда-обратно]
  idle: [900, -1, true],
  walk: [520, -1, false],
  attack: [300, 0, false],
  cast: [300, 0, false],
  hit: [140, 0, false],
  death: [520, 0, false],
};

/** Разметить загруженный лист на кадры и создать анимации `${key}_${anim}_${S|N}`. */
export function addExtSheet(scene: Phaser.Scene, key: string, sheets: Record<string, { fw: number; fh: number; footY: number; scale?: number }>) {
  const m = EXT_SHEETS[key];
  const tex = scene.textures.get(key);
  for (let i = 0; i < m.perSide * 2; i++) tex.add(i, 0, (i % m.cols) * m.fw, Math.floor(i / m.cols) * m.fh, m.fw, m.fh);
  sheets[key] = { fw: m.fw, fh: m.fh, footY: m.footY, scale: m.scale };
  for (const [name, [start, count]] of Object.entries(m.anims)) {
    const [ms, repeat, yoyo] = TIMING[name] ?? [400, 0, false];
    (['S', 'N'] as const).forEach((side, row) => {
      const frames = Array.from({ length: count }, (_, f) => ({ key, frame: row * m.perSide + start + f }));
      const frameRate = (yoyo ? count * 2 - 2 : count) / (ms / 1000);
      scene.anims.create({ key: `${key}_${name}_${side}`, frames, frameRate, repeat, yoyo });
    });
  }
}

/** Разметить лист эффекта на кадры и создать одноразовую анимацию с тем же ключом. */
export function addExtFx(scene: Phaser.Scene, key: string) {
  const m = EXT_FX[key];
  const tex = scene.textures.get(key);
  for (let i = 0; i < m.frames; i++) tex.add(i, 0, (i % m.cols) * m.fw, Math.floor(i / m.cols) * m.fh, m.fw, m.fh);
  scene.anims.create({ key, frames: Array.from({ length: m.frames }, (_, i) => ({ key, frame: i })), frameRate: m.frames / (m.ms / 1000), repeat: 0 });
}

/** Разметить лист жителя лагеря и создать зацикленную анимацию `${key}_idle`. */
export function addExtNpc(scene: Phaser.Scene, key: string) {
  const m = EXT_NPCS[key];
  const tex = scene.textures.get(key);
  for (let i = 0; i < m.frames; i++) tex.add(i, 0, i * m.fw, 0, m.fw, m.fh);
  scene.anims.create({ key: `${key}_idle`, frames: Array.from({ length: m.frames }, (_, i) => ({ key, frame: i })), frameRate: m.frames / (m.ms / 1000), repeat: -1, yoyo: m.frames <= 4 });
}
