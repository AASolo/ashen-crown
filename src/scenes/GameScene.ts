// Игровая сцена: один этаж Разлома. Собирает уровень, героя, врагов, эффекты, свет и туман;
// принимает намерения ввода и раздаёт их герою; обрабатывает смерти, лут, сундуки, порталы, сохранения.
import Phaser from 'phaser';
import { isoToScreen, screenToIso, screenDirToWorld, isoEllipse, dist, clamp, depthOf } from '../core/iso';
import { rng } from '../core/rng';
import { Sfx } from '../core/Sfx';
import { Music, type MusicState } from '../core/Music';
import { bus, EV } from '../core/events';
import { generateDungeon, generateSurface, type Theme } from '../world/DungeonGen';
import { Level, FLOOR_DEPTH } from '../world/Level';
import { FlowField, lineOfSight } from '../world/Pathfinding';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Npc } from '../entities/Npc';
import {
  makeGround, drawGround, inCone, makeProjectileSprite, syncProjectile, makeGroundLoot, destroyLoot,
  type GroundEffect, type Projectile, type Wisp, type GroundLoot,
} from '../entities/Effects';
import { FxManager } from '../systems/Fx';
import { BuildSystem, applySurfaceEdits } from '../systems/Building';
import { InputController, type Intents } from '../systems/Input';
import { rollHeroDamage, damageEnemy, damageHero, emberNova, type DmgKind, type HitOpts } from '../systems/Combat';
import { generateItem, goldDrop } from '../systems/Loot';
import { addToBag, xpToNext, MAX_LEVEL, type HeroData } from '../systems/HeroData';
import { SaveSystem } from '../systems/Save';
import { settings } from '../systems/Settings';
import { applyCinematic } from '../systems/Cinematic';
import { SKILLS } from '../data/skills';
import { DIFFICULTIES } from '../data/enemies';
import { RARITIES } from '../data/items';
import { STEPS, TALK, QUEST_DONE, questStep, inPrologue, type Line } from '../data/quests';
import type { UIScene } from './UIScene';

export interface FloorMod { id: string; name: string; desc: string; hp?: number; dmg?: number; loot?: number }
const FLOOR_MODS: FloorMod[] = [
  { id: 'fog', name: 'Густой туман', desc: 'Обзор сокращён, враги замечают позже' },
  { id: 'bloodmoon', name: 'Кровавая луна', desc: 'Враги сильнее на 25%, добыча +40%', hp: 1.25, dmg: 1.25, loot: 0.4 },
  { id: 'ashfall', name: 'Пепельный дождь', desc: 'С неба падают раскалённые угли' },
];

interface SpikeTrap { x: number; y: number; img: Phaser.GameObjects.Image; t: number; period: number; fired: boolean }
interface Chest { x: number; y: number; img: Phaser.GameObjects.Image; opened: boolean; elite: boolean; secret: boolean }
/** Предмет задания на этаже: дневник жреца или сторожевой огонь. */
interface QuestObj { kind: 'book' | 'beacon'; i: number; x: number; y: number; img: Phaser.GameObjects.Image; done: boolean; flame?: Phaser.GameObjects.Sprite; beam?: Phaser.GameObjects.Image }
interface Portal { x: number; y: number; img: Phaser.GameObjects.Image; swirl: Phaser.GameObjects.Image; target: number; locked?: boolean }

/** Во сколько раз холст тьмы меньше экрана (мягкий свет и дешёвая загрузка в GPU). */
const DARK_RES = 6;

export class GameScene extends Phaser.Scene {
  heroData!: HeroData;
  hero!: Hero;
  level!: Level;
  flow!: FlowField;
  fx!: FxManager;
  build!: BuildSystem;
  ui?: UIScene;
  enemies: Enemy[] = [];
  boss: Boss | null = null;
  projectiles: Projectile[] = [];
  grounds: GroundEffect[] = [];
  wisps: Wisp[] = [];
  loot: GroundLoot[] = [];
  spikes: SpikeTrap[] = [];
  chests: Chest[] = [];
  portal: Portal | null = null;
  npcs: Npc[] = [];
  questObjs: QuestObj[] = [];
  floorMod: FloorMod | null = null;
  theme: Theme = 'ashlands';
  floorTitle = '';
  hovered: Enemy | null = null;
  stats = { elites: 0, elitesKilled: 0, chests: 0, chestsOpened: 0, secret: false, secretFound: false };
  dt = 0;
  paused = false;

  private inputCtl!: InputController;
  private dark!: Phaser.GameObjects.Image;
  private darkTex!: Phaser.Textures.CanvasTexture;
  private floorGlows: Phaser.GameObjects.Image[] = [];
  private heroGlow!: Phaser.GameObjects.Image;
  private g!: Phaser.GameObjects.Graphics;
  private qArrow?: Phaser.GameObjects.Image;
  private leftHeld = false;
  private rightHeld = false;
  private holdT = 0;
  private autosaveT = 20;
  private flowT = 0;
  private ashfallT = 5;
  private ambient!: Phaser.GameObjects.Particles.ParticleEmitter;
  private embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fog: { img: Phaser.GameObjects.Image; ox: number; oy: number; sp: number }[] = [];
  private frame = 0;
  private musicT = 0;
  private combatT = 0;
  private talkCd = 0;          // после разговора диалог не откроется сам, пока герой не отойдёт
  private lockedMsgT = 0;

  constructor() { super('Game'); }

  init(d: { hero: HeroData }) {
    this.heroData = d.hero;
  }

  create() {
    this.fx = new FxManager(this);
    this.build = new BuildSystem(this);
    this.inputCtl = new InputController(this);
    this.input.mouse?.disableContextMenu();
    this.cameras.main.setBackgroundColor('#040203');
    this.g = this.add.graphics().setDepth(FLOOR_DEPTH + 3);
    // Тьма: маленький холст (1/DARK_RES экрана), свет «вырезается» радиальными градиентами
    // через destination-out. Одинаково работает в WebGL и Canvas, растягивается с мягким сглаживанием.
    if (this.textures.exists('darkness')) this.textures.remove('darkness');
    this.darkTex = this.textures.createCanvas('darkness', 64, 64)!;
    this.dark = this.add.image(0, 0, 'darkness').setOrigin(0, 0).setDepth(970000);
    this.heroGlow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff9a5a).setAlpha(0.3).setDepth(FLOOR_DEPTH + 2);
    // пепел в воздухе, следует за камерой
    this.ambient = this.add.particles(0, 0, 'p_ash', {
      x: { min: -900, max: 900 }, y: { min: -600, max: 300 }, lifespan: 6000, speedX: { min: -30, max: 10 }, speedY: { min: 15, max: 45 },
      scale: { min: 0.3, max: 0.8 }, alpha: { start: 0.55, end: 0 }, frequency: 90, rotate: { min: 0, max: 360 }, tint: [0x8a827a, 0x6a625a, 0xff7a2a],
    }).setDepth(965000);
    // тлеющие искры поднимаются от земли
    this.embers = this.add.particles(0, 0, 'p_ember', {
      x: { min: -900, max: 900 }, y: { min: -200, max: 600 }, lifespan: 4200, speedX: { min: -12, max: 12 }, speedY: { min: -40, max: -14 },
      scale: { start: 0.45, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: 160, blendMode: Phaser.BlendModes.ADD, tint: [0xff8a3a, 0xffb060, 0xd8402a],
    }).setDepth(966000);
    // слои холодного тумана: большие мягкие пятна, медленно плывут вместе с камерой
    for (let i = 0; i < 6; i++) {
      const img = this.add.image(0, 0, 'glow').setTint(i % 3 === 2 ? 0x3a2a30 : 0x4a5868).setAlpha(0.06).setDepth(964000).setScale(9 + i * 1.5, 5 + i);
      this.fog.push({ img, ox: (i - 2.5) * 320, oy: ((i * 37) % 5 - 2) * 120, sp: 6 + i * 3 });
    }
    applyCinematic(this);
    const onSet = () => applyCinematic(this);
    bus.on(EV.SETTINGS, onSet);
    this.events.once('shutdown', () => bus.off(EV.SETTINGS, onSet));

    this.scene.launch('UI');
    this.ui = this.scene.get('UI') as UIScene;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.button === 0 || p.wasTouch) this.leftHeld = false;
      if (p.button === 2) this.rightHeld = false;
    });
    this.scale.on('resize', () => this.applyZoom());
    this.applyZoom();
    this.buildFloor(this.heroData.depth);
    this.events.once('shutdown', () => { this.scale.off('resize'); });
    Sfx.voice = this.heroData.classId === 'witch' || this.heroData.classId === 'shade' ? 'female' : 'male';
  }

  applyZoom() {
    const w = this.scale.width, h = this.scale.height;
    const z = clamp(Math.min(w / 1280, h / 720) * 1.3, 0.75, 3.2);
    this.cameras.main.setZoom(z);
  }

  // ─── Построение этажа ──────────────────────────────────────────
  buildFloor(depth: number) {
    this.clearFloor();
    const D = this.heroData;
    D.depth = depth;
    D.bestDepth = Math.max(D.bestDepth, depth);
    const step = questStep(D);
    const story = step < QUEST_DONE && depth >= 1 && depth <= 3; // этажи пролога: без модификаторов, свои цели
    this.theme = depth === 0 ? 'surface' : depth % 2 === 1 ? 'ashlands' : 'catacombs';
    this.floorMod = depth > 1 && !story ? rng.pick(FLOOR_MODS) : null;
    const wolves = step <= 1 ? Math.max(0, (STEPS[1].need ?? 8) - (step === 1 ? D.qProg ?? 0 : 0)) : 0;
    const d = depth === 0 ? generateSurface(D.seed + 77, { wolves }) : generateDungeon(D.seed + depth * 1013, depth, this.theme);
    if (depth === 0) applySurfaceEdits(d, D); // вырубки и постройки игрока
    this.build?.cancel(); if (this.build) this.build.job = null;
    this.level = new Level(this, d);
    this.flow = new FlowField(d.w, d.h);
    // в лагерь после первого разговора возвращаемся к костру, а не на дорогу
    const home = depth === 0 && step >= 1 && d.poi ? { x: d.poi.camp.x - 1, y: d.poi.camp.y + 3 } : d.start;
    const sx = home.x + 0.5, sy = home.y + 0.5;
    if (!this.hero) this.hero = new Hero(this, D, sx, sy);
    else { this.hero.x = sx; this.hero.y = sy; this.hero.stop(); this.hero.alive = true; this.hero.recompute(); this.hero.play('idle', true); }
    this.hero.sprite.setAlpha(1);
    this.cameras.main.startFollow(this.hero.sprite, true, 0.14, 0.14, 0, 20);
    // световые пятна на полу от статичных источников
    for (const L of this.level.lights) {
      const p = isoToScreen(L.x, L.y);
      const { rx, ry } = isoEllipse(L.r);
      this.floorGlows.push(this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(L.color)
        .setDisplaySize(rx * 2.4, ry * 2.4).setAlpha(0.42 * L.intensity).setDepth(FLOOR_DEPTH + 2));
    }
    // враги
    this.stats = { elites: 0, elitesKilled: 0, chests: 0, chestsOpened: 0, secret: d.secrets.length > 0, secretFound: false };
    for (const s of d.spawns) {
      const e = this.spawnEnemy(s.type, s.x, s.y, s.elite);
      if (s.elite) this.stats.elites++;
      e.questTag = s.tag;
      if (s.tag === 'mill' && s.leader) e.displayName = 'Вожак стаи';
    }
    // босс: на всех этажах, кроме поверхности и первых двух этажей пролога
    if (depth > 0 && !(story && depth < 3)) {
      this.boss = new Boss(this, d.boss.x + 0.5, d.boss.y + 0.5);
      this.enemies.push(this.boss);
    }
    if (depth === 0) this.buildCamp();
    else if (story) this.buildStoryObjects(depth);
    // ловушки
    for (const t of d.traps) {
      const p = isoToScreen(t.x + 0.5, t.y + 0.5);
      const img = this.add.image(p.x, p.y, 'trap_off').setScale(0.5).setOrigin(0.5, 0.59).setDepth(FLOOR_DEPTH + 1).setVisible(false);
      this.spikes.push({ x: t.x, y: t.y, img, t: rng.range(0, 3), period: rng.range(2.8, 3.8), fired: false });
    }
    // сундуки
    for (const e of this.level.propSprites) if (e.prop.type === 'chest') {
      this.chests.push({ x: e.prop.x + 0.5, y: e.prop.y + 0.5, img: e.img as Phaser.GameObjects.Image, opened: false, elite: !!e.prop.elite, secret: !!e.prop.secret });
      this.stats.chests++;
    }
    const region = this.theme === 'ashlands' ? 'Пепельные Пустоши' : 'Затонувшие Катакомбы';
    this.floorTitle = depth === 0 ? 'Пепелище у Ковен-Гейта · поверхность' : `${region} · Разлом, глубина ${depth}`;
    this.cameras.main.setBackgroundColor(depth === 0 ? '#0c0908' : '#040203');
    bus.emit(EV.FLOOR, depth, this.floorTitle, this.floorMod);
    bus.emit(EV.BOSS, null);
    // поверхность видна сразу целиком (под открытым небом нет тумана войны)
    if (depth === 0) this.level.reveal(d.w / 2, d.h / 2, d.w);
    this.level.reveal(this.hero.x, this.hero.y, this.revealRadius());
    this.level.cull(this.cameras.main, true);
    this.combatT = 0;
    Music.play(this.calmMusic());
    this.cameras.main.fadeIn(600, 0, 0, 0);
    if (step === 3 && depth === 1) this.advanceQuest();
    else if (depth === 0 && step === 0) this.time.delayedCall(900, () => bus.emit(EV.SUBTITLE, this.hero.cls.name, 'Дым над холмом… Там кто-то жив.'));
    this.save();
  }

  // ─── Сюжет: лагерь, задания, диалоги ───────────────────────────
  /** Лагерь выживших на поверхности: жители и колодец-Разлом. */
  private buildCamp() {
    const P = this.level.d.poi!;
    const C = P.camp;
    this.npcs.push(new Npc(this, 'elder', 'npc_elder', 'Старейшина Ориен', C.x + 1.5, C.y - 1.0));
    this.npcs.push(new Npc(this, 'guard', 'npc_guard', 'Страж Бранн', C.x - 3.5, C.y + 0.5, true));
    this.npcs.push(new Npc(this, 'villager', 'npc_woman', 'Беженка Мира', C.x + 2.5, C.y + 2.5));
    this.npcs.push(new Npc(this, 'man', 'npc_man', 'Беженец', C.x - 1.0, C.y - 3.0, true));
    const W = P.well;
    this.makePortal(W.x + 0.5, W.y + 0.5, inPrologue(this.heroData) ? 1 : Math.max(4, this.heroData.bestDepth), questStep(this.heroData) < 3);
  }

  /** Дневник жреца (глубина 1) или три сторожевых огня (глубина 2). */
  private buildStoryObjects(depth: number) {
    const D = this.heroData, d = this.level.d, step = questStep(D);
    if (depth === 1 && step <= 4) {
      const x = d.boss.x + 0.5, y = d.boss.y + 0.5, p = isoToScreen(x, y);
      const img = this.add.image(p.x, p.y - 4, this.textures.exists('quest_book') ? 'quest_book' : 'it_scroll').setScale(0.5).setDepth(depthOf(x, y));
      const beam = this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd080).setScale(0.35, 1.6).setOrigin(0.5, 0.92).setAlpha(0.6).setDepth(depthOf(x, y) - 1);
      this.questObjs.push({ kind: 'book', i: 0, x, y, img, beam, done: false });
      this.level.lights.push({ x, y, r: 3, color: 0xffd080, flicker: 2, intensity: 0.8 });
    }
    if (depth === 2) {
      // огни: арена (дальняя точка) + две дальние «комнаты», разнесённые между собой
      const pts = [{ x: d.boss.x, y: d.boss.y }];
      const far = [...d.rooms].sort((a, b) => dist(b.cx, b.cy, d.start.x, d.start.y) - dist(a.cx, a.cy, d.start.x, d.start.y));
      for (const rm of far) { if (pts.length >= 3) break; if (pts.every(q => dist(q.x, q.y, rm.cx, rm.cy) > 14)) pts.push({ x: rm.cx, y: rm.cy }); }
      const mask = step === 5 ? D.qProg ?? 0 : step > 5 ? 7 : 0;
      pts.forEach((q, i) => {
        let x = q.x + 0.5, y = q.y + 0.5;
        if (!this.level.walkable(q.x, q.y)) { x += 1; }
        const p = isoToScreen(x, y);
        const img = this.add.image(p.x, p.y, 'brazier').setScale(0.62).setOrigin(0.5, 0.9).setDepth(depthOf(x, y)).setTint(0x6a6070);
        const o: QuestObj = { kind: 'beacon', i, x, y, img, done: false };
        this.questObjs.push(o);
        if (mask & (1 << i)) this.lightBeacon(o, true);
      });
    }
  }

  private lightBeacon(o: QuestObj, silent = false) {
    o.done = true;
    o.img.clearTint();
    const p = isoToScreen(o.x, o.y);
    o.flame = this.add.sprite(p.x, p.y - 38, 'flame').setScale(0.7).setOrigin(0.5, 0.92).setBlendMode(Phaser.BlendModes.ADD).setDepth(depthOf(o.x, o.y) + 1);
    o.flame.play('flame');
    this.level.lights.push({ x: o.x, y: o.y, r: 6, color: 0xffa040, flicker: o.i * 3, intensity: 1 });
    if (silent) return;
    Sfx.play('fire');
    this.fx.burst('fire', o.x, o.y, 30, 40);
    this.fx.ring(o.x, o.y, 3, 0xffa040, 600);
  }

  private makePortal(x: number, y: number, target: number, locked = false) {
    const p = isoToScreen(x, y);
    const img = this.add.image(p.x, p.y, 'portal').setScale(0.5).setOrigin(0.5, 0.91).setDepth(p.y);
    const swirl = this.add.image(p.x, p.y - 54, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(locked ? 0x5a5060 : 0x7a4aff).setScale(0.9, 1.4).setAlpha(locked ? 0.25 : 1).setDepth(p.y + 1);
    this.portal = { x, y, img, swirl, target, locked };
    if (!locked) this.level.lights.push({ x, y, r: 4.5, color: 0x9a6bff, flicker: 1, intensity: 1 });
    return this.portal;
  }

  private unlockPortal() {
    const pt = this.portal;
    if (!pt || !pt.locked) return;
    pt.locked = false;
    pt.swirl.setTint(0x7a4aff).setAlpha(1);
    this.level.lights.push({ x: pt.x, y: pt.y, r: 4.5, color: 0x9a6bff, flicker: 1, intensity: 1 });
  }

  /** Следующий шаг пролога: сообщение, сохранение, побочные эффекты шага. */
  advanceQuest() {
    const D = this.heroData;
    const was = questStep(D);
    D.quest = was + 1; D.qProg = 0;
    const s = STEPS[D.quest];
    if (s && s.quest !== STEPS[was].quest) { Sfx.play('levelup'); bus.emit(EV.TOAST, `Новое задание: ${s.quest}`, '#ffc04a', 3200, 22); }
    else if (s) bus.emit(EV.TOAST, s.goal.replace('{n}', '0').replace('{need}', String(s.need ?? 0)), '#ffc04a', 2600);
    if (D.quest === 3) this.unlockPortal();
    bus.emit(EV.QUEST);
    this.save();
  }

  private say(lines: Line[], done?: () => void) {
    const hero = `portrait_${this.heroData.classId}`;
    const out = lines.map(l => (l.who === 'hero' ? { who: this.hero.cls.name, text: l.text, portrait: hero } : l));
    this.hero.stop();
    this.ui?.showDialogue(out, () => { this.talkCd = 1; done?.(); });
  }

  talkTo(n: Npc) {
    const D = this.heroData, step = questStep(D);
    if (n.id === 'guard') return this.say(TALK.guard);
    if (n.id === 'villager' || n.id === 'man') return this.say(TALK.villager);
    if (step === 0) this.say(TALK.intro, () => this.advanceQuest());
    else if (step === 1) this.say(TALK.wolvesWait);
    else if (step === 2) this.say(TALK.wolvesDone, () => this.advanceQuest());
    else if (step < 7) this.say(TALK.riftWait);
    else if (step === 7) this.say(TALK.ending, () => this.finishPrologue());
    else this.say(TALK.after);
  }

  private finishPrologue() {
    const D = this.heroData;
    this.advanceQuest();
    D.gold += 150; D.potions = 5;
    this.dropItem(this.hero.x + 1, this.hero.y + 1, 3);
    if (this.portal) this.portal.target = Math.max(4, D.bestDepth);
    Music.jingle('victory');
    bus.emit(EV.TOAST, 'Пролог пройден. Разломы открыты', '#ffd080', 4200, 24);
  }

  /** Куда идти по заданию (для стрелки у героя и метки на карте). */
  questTarget(): { x: number; y: number } | null {
    const D = this.heroData, step = questStep(D);
    if (step >= QUEST_DONE) return null;
    const poi = this.level.d.poi;
    if (D.depth === 0 && poi) {
      if (step === 1) return { x: poi.mill.x + 0.5, y: poi.mill.y + 0.5 };
      if (step >= 3 && step <= 6) return { x: poi.well.x + 0.5, y: poi.well.y + 0.5 };
      const e = this.npcs.find(n => n.id === 'elder');
      return e ? { x: e.x, y: e.y } : null;
    }
    const o = this.questObjs.filter(q => !q.done).sort((a, b) => dist(a.x, a.y, this.hero.x, this.hero.y) - dist(b.x, b.y, this.hero.x, this.hero.y))[0];
    if (o) return { x: o.x, y: o.y };
    if (this.portal && !this.portal.locked) return { x: this.portal.x, y: this.portal.y };
    if (this.boss && this.boss.alive) return { x: this.boss.x, y: this.boss.y };
    return null;
  }

  private elderHasNews() { const s = questStep(this.heroData); return s === 0 || s === 2 || s === 7; }

  private updateStory(dt: number) {
    const h = this.hero;
    if (!h.alive) return;
    this.talkCd = Math.max(0, this.talkCd - dt);
    this.lockedMsgT -= dt;
    for (const n of this.npcs) {
      n.setMarker(n.id === 'elder' && this.elderHasNews());
      const near = dist(h.x, h.y, n.x, n.y) < 1.6;
      // старейшина сам заговорит, если есть новости; остальные — по клику
      if (near && n.id === 'elder' && this.elderHasNews() && this.talkCd <= 0 && !h.path) { this.talkCd = 1e9; this.talkTo(n); }
    }
    if (this.talkCd > 100 && this.npcs.every(n => dist(h.x, h.y, n.x, n.y) > 2.5)) this.talkCd = 0;
    for (const o of this.questObjs) {
      if (o.done || dist(h.x, h.y, o.x, o.y) > 1.2) continue;
      const step = questStep(this.heroData);
      if (o.kind === 'book' && step === 4) {
        o.done = true; o.beam?.destroy(); o.img.destroy();
        Sfx.play('pickup');
        this.say(TALK.diary, () => { this.advanceQuest(); this.makePortal(o.x, o.y + 2, 2); Sfx.play('portal'); bus.emit(EV.TOAST, 'Разлом открыт: путь глубже', '#9a6bff'); });
      }
      if (o.kind === 'beacon' && step === 5) {
        this.lightBeacon(o);
        const D = this.heroData;
        D.qProg = (D.qProg ?? 0) | (1 << o.i);
        const lit = this.questObjs.filter(q => q.kind === 'beacon' && q.done).length;
        bus.emit(EV.TOAST, `Сторожевой огонь зажжён: ${lit}/3`, '#ffa040');
        if (lit >= 3) {
          this.advanceQuest();
          bus.emit(EV.SUBTITLE, 'Глашатай', 'Кто посмел зажечь огни? Спускайся, искра. Я жду.');
          this.makePortal(o.x + 1.5, o.y + 1.5, 3);
          Sfx.play('portal');
        } else { bus.emit(EV.QUEST); this.save(); }
      }
    }
  }

  /** Счётчик волков у мельницы. */
  private onQuestKill(e: Enemy) {
    const D = this.heroData;
    if (e.questTag !== 'mill' || questStep(D) !== 1) return;
    D.qProg = (D.qProg ?? 0) + 1;
    const need = STEPS[1].need ?? 8;
    if (D.qProg >= need) { bus.emit(EV.TOAST, 'Стая перебита', '#ffc04a', 2400, 20); this.advanceQuest(); }
    else { bus.emit(EV.TOAST, `Волки: ${D.qProg}/${need}`, '#e8d4b0', 1200, 16); bus.emit(EV.QUEST); }
  }

  private clearFloor() {
    for (const e of this.enemies) { e.label?.destroy(); e.aura?.destroy(); e.destroy(); }
    this.enemies = []; this.boss = null;
    for (const p of this.projectiles) p.sprite.destroy();
    this.projectiles = [];
    this.grounds = [];
    for (const w of this.wisps) w.sprite.destroy();
    this.wisps = [];
    for (const l of this.loot) destroyLoot(l);
    this.loot = [];
    for (const s of this.spikes) s.img.destroy();
    this.spikes = [];
    this.chests = [];
    for (const g of this.floorGlows) g.destroy();
    this.floorGlows = [];
    if (this.portal) { this.portal.img.destroy(); this.portal.swirl.destroy(); this.portal = null; }
    for (const n of this.npcs) n.destroy();
    this.npcs = [];
    for (const o of this.questObjs) { o.img.destroy(); o.flame?.destroy(); o.beam?.destroy(); }
    this.questObjs = [];
    this.level?.destroy();
    this.hovered = null;
  }

  spawnEnemy(type: string, x: number, y: number, elite = false): Enemy {
    const e = new Enemy(this, type, x, y, elite);
    this.enemies.push(e);
    return e;
  }

  revealRadius() { return this.theme === 'surface' ? 13 : this.floorMod?.id === 'fog' ? 6.5 : 9; }
  lightRadius() { return this.theme === 'surface' ? 13 : this.floorMod?.id === 'fog' ? 5.6 : this.theme === 'ashlands' ? 9 : 8; }

  // ─── Ввод ───────────────────────────────────────────────────────
  private pointerWorld(p: Phaser.Input.Pointer) { return screenToIso(p.worldX, p.worldY); }

  private onPointerDown(p: Phaser.Input.Pointer) {
    Sfx.unlock();
    if (this.paused || !this.hero.alive) return;
    if (!p.wasTouch) this.inputCtl.lastDevice = 'mouse';
    if (this.ui?.isOverUI(p.x, p.y)) return;
    const w = this.pointerWorld(p);
    // режим стройки: клик ставит постройку, правый клик отменяет
    if (this.build.active) { if (p.button === 2) this.build.cancel(); else this.build.click(w.x, w.y); return; }
    this.build.job = null;
    if (p.button === 2) { this.rightHeld = true; this.hero.trySkill(0, w.x, w.y); return; }
    this.leftHeld = true; this.holdT = 0.15;
    // клик по надписи предмета
    for (const l of this.loot) if (l.label?.getBounds().contains(p.worldX, p.worldY)) { this.hero.target = null; this.hero.goTo(l.x, l.y); return; }
    // клик по жителю лагеря: подойти и заговорить
    for (const n of this.npcs) if (n.hit(p.worldX, p.worldY)) {
      this.hero.target = null;
      if (dist(this.hero.x, this.hero.y, n.x, n.y) < 2.2) this.talkTo(n); else this.hero.goTo(n.x + 0.8, n.y + 0.8);
      return;
    }
    // клик по сундуку
    for (const c of this.chests) if (!c.opened && dist(c.x, c.y, w.x, w.y) < 0.8) { this.hero.target = null; this.hero.goTo(c.x, c.y); return; }
    const e = this.pickEnemy(p.worldX, p.worldY);
    if (e) { this.hero.target = e; this.hero.path = null; return; }
    // клик по дереву или камню на поверхности: подойти и рубить
    const res = this.build.pick(w.x, w.y);
    if (res) { this.build.startJob(res); return; }
    if (this.inputCtl && p.event && (p.event as MouseEvent).shiftKey) { this.hero.tryBasic(w.x, w.y); return; }
    this.hero.target = null;
    this.hero.goTo(w.x, w.y);
  }

  /** Враг под курсором (по силуэту на экране). */
  pickEnemy(wx: number, wy: number): Enemy | null {
    let best: Enemy | null = null, bd = 1e9;
    for (const e of this.enemies) {
      if (!e.alive || !e.sprite.visible) continue;
      const cx = e.sprite.x, cy = e.sprite.y - e.heightPx * 0.5;
      const r = Math.max(24, e.heightPx * 0.5);
      const d = Math.hypot(wx - cx, (wy - cy) * 0.8);
      if (d < r && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  nearestEnemy(x: number, y: number, range: number, needLos = true): Enemy | null {
    let best: Enemy | null = null, bd = range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < bd && (!needLos || this.los(x, y, e.x, e.y))) { bd = d; best = e; }
    }
    return best;
  }

  private handleIntents(it: Intents, dt: number) {
    const h = this.hero;
    if (it.menu) { if (this.build.active) this.build.cancel(); else this.ui?.toggleMenu(); }
    if (it.build) this.openBuild();
    if (it.inventory) this.ui?.togglePanel('inventory');
    if (it.skillsPanel) this.ui?.togglePanel('skills');
    if (it.map) this.ui?.toggleMap();
    if (it.journal) this.ui?.togglePanel('journal');
    if (this.paused || !h.alive) { h.moveVec = { x: 0, y: 0 }; return; }

    const mag = Math.min(1, Math.hypot(it.move.x, it.move.y));
    if (mag > 0.05) { const w = screenDirToWorld(it.move.x, it.move.y); h.moveVec = { x: w.x * mag, y: w.y * mag }; h.target = null; }
    else h.moveVec = { x: 0, y: 0 };

    const ptr = this.input.activePointer;
    const cur = this.pointerWorld(ptr);
    // цель для навыков: курсор или автонаведение
    const aim = (range: number) => {
      if (!it.autoAim) return cur;
      const e = this.nearestEnemy(h.x, h.y, Math.max(range, 2.5) + 1);
      if (e) return { x: e.x, y: e.y };
      const fx = h.flip ? -1 : 1, fy = h.side === 'N' ? -1 : 1;
      const f = screenDirToWorld(fx, fy * 0.5);
      return { x: h.x + f.x * 3, y: h.y + f.y * 3 };
    };
    it.skills.forEach((pressed, i) => { if (pressed) { const s = SKILLS[h.cls.skills[i]]; const t = aim(s.range); h.trySkill(i, t.x, t.y); } });
    if (this.rightHeld && !it.autoAim && !this.ui?.isOverUI(ptr.x, ptr.y)) h.trySkill(0, cur.x, cur.y);
    if (it.dodge) {
      const m = h.moveVec.x || h.moveVec.y ? h.moveVec : it.autoAim ? { x: 0, y: 0 } : { x: cur.x - h.x, y: cur.y - h.y };
      h.dodge(m.x, m.y);
    }
    if (it.potion) h.drinkPotion();

    // удержание ЛКМ: бег за курсором / атака на месте с Shift
    if (this.leftHeld && ptr.isDown && !it.autoAim) {
      this.holdT -= dt;
      if (it.shift) { h.path = null; h.tryBasic(cur.x, cur.y); }
      else if (!h.target && this.holdT <= 0) { this.holdT = 0.12; h.goTo(cur.x, cur.y); }
    } else if (!ptr.isDown) this.leftHeld = false;

    // кнопка атаки (геймпад / тач): ближайшая цель, иначе удар перед собой
    if (it.attackHeld) {
      const e = this.nearestEnemy(h.x, h.y, h.cls.ranged ? 10 : 6);
      if (e) { if (h.target !== e) { h.target = e; h.path = null; } }
      else { const t = aim(2); h.tryBasic(t.x, t.y); }
    }
  }

  // ─── Главный цикл ──────────────────────────────────────────────
  /** Окно стройки: только на поверхности. */
  openBuild() {
    if (!this.build.onSurface) { bus.emit(EV.TOAST, 'Строить можно только на поверхности, у лагеря', '#ff8a6a', 2000); return; }
    this.build.cancel();
    this.ui?.togglePanel('build');
  }

  update(_t: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    this.dt = dt;
    this.frame++;
    const it = this.inputCtl.poll();
    this.handleIntents(it, dt);
    if (this.paused) { this.updateDarkness(); return; }
    this.heroData.playTime += dt;
    const h = this.hero;

    h.update(dt);
    this.updateMusic(dt);
    // поле потоков пересчитываем, когда герой сменил клетку
    this.flowT -= dt;
    const hx = Math.floor(h.x), hy = Math.floor(h.y);
    if (hx !== this.flow.originX || hy !== this.flow.originY || this.flowT <= 0) { this.flow.build(this.level.walkable, hx, hy); this.flowT = 0.6; }

    for (const e of this.enemies) e.update(dt);
    this.enemies = this.enemies.filter(e => e.alive);
    this.separate();
    this.updateProjectiles(dt);
    this.updateGrounds(dt);
    this.updateWisps(dt);
    this.updateSpikes(dt);
    this.updateLoot(dt);
    this.updateInteractables();
    this.updateStory(dt);
    this.build.update(dt);
    if (this.floorMod?.id === 'ashfall') this.updateAshfall(dt);

    if (this.level.reveal(h.x, h.y, this.revealRadius())) bus.emit(EV.MAP_REVEAL);
    this.level.cull(this.cameras.main);
    if (this.frame % 3 === 0) this.level.fadeWalls(h.x, h.y);
    if (this.frame % 15 === 0) this.level.refreshMinimap();
    // враги и лут вне открытой области не видны
    for (const e of this.enemies) {
      const vis = this.level.explored[this.level.idx(Math.floor(e.x), Math.floor(e.y))] === 1 && dist(e.x, e.y, h.x, h.y) < 16;
      e.sprite.setVisible(vis); e.shadow.setVisible(vis);
    }
    for (const s of this.spikes) s.img.setVisible(this.level.explored[this.level.idx(s.x, s.y)] === 1);
    for (const n of this.npcs) n.setVisible(this.level.explored[this.level.idx(Math.floor(n.x), Math.floor(n.y))] === 1);

    const mp = this.input.activePointer;
    this.hovered = this.paused ? null : this.pickEnemy(mp.worldX, mp.worldY);
    this.drawOverlay();
    this.updateDarkness();
    const hp = isoToScreen(h.x, h.y);
    this.heroGlow.setPosition(hp.x, hp.y).setDisplaySize(isoEllipse(4.5).rx * 2, isoEllipse(4.5).ry * 2);
    const v = this.cameras.main.worldView;
    this.ambient.setPosition(v.centerX, v.centerY);
    this.embers.setPosition(v.centerX, v.centerY);

    this.autosaveT -= dt;
    if (this.autosaveT <= 0) { this.autosaveT = 20; this.save(); }
  }

  /** Расталкивание толпы, чтобы враги не слипались в одну точку. */
  private separate() {
    const E = this.enemies, h = this.hero;
    for (let i = 0; i < E.length; i++) {
      const a = E[i];
      if (!a.awake) continue;
      for (let j = i + 1; j < E.length; j++) {
        const b = E[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = a.radius + b.radius;
        if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
        const d = Math.hypot(dx, dy);
        if (d >= min || d < 1e-4) continue;
        const push = (min - d) / 2, nx = dx / d, ny = dy / d;
        const wa = a.isBoss ? 0.1 : 1, wb = b.isBoss ? 0.1 : 1;
        a.moveBy(-nx * push * wa, -ny * push * wa); b.moveBy(nx * push * wb, ny * push * wb);
      }
      // не залезать в героя
      const dx = a.x - h.x, dy = a.y - h.y, d = Math.hypot(dx, dy), min = a.radius + h.radius;
      if (d < min && d > 1e-4) a.moveBy(dx / d * (min - d), dy / d * (min - d));
    }
  }

  // ─── Запросы для боя ───────────────────────────────────────────
  los(ax: number, ay: number, bx: number, by: number) { return lineOfSight(this.level.seeThrough, ax, ay, bx, by); }

  enemiesInRadius(x: number, y: number, r: number): Enemy[] {
    return this.enemies.filter(e => e.alive && dist(x, y, e.x, e.y) <= r + e.radius);
  }

  enemiesInCone(x: number, y: number, dx: number, dy: number, r: number, arc: number): Enemy[] {
    return this.enemies.filter(e => e.alive && inCone(x, y, dx, dy, r, arc, e.x, e.y, e.radius));
  }

  dotEnemy(e: Enemy, dmg: number) { damageEnemy(this, e, dmg, false, { dot: true }); }

  // ─── Снаряды ───────────────────────────────────────────────────
  heroProjectile(o: Omit<Projectile, 'faction' | 'sprite' | 'hitSet' | 'light' | 'height'>, tex: string, scale: number) {
    const sprite = makeProjectileSprite(this, tex, o.vx, o.vy, scale);
    const light = tex === 'proj_arrow' || tex === 'proj_dagger' ? 0x4fc6e0 : 0xff7a2a;
    const p: Projectile = { ...o, faction: 'hero', sprite, hitSet: new Set(), light, height: 34 };
    syncProjectile(p);
    this.projectiles.push(p);
  }

  enemyProjectile(e: Enemy, tx: number, ty: number, speed: number, dmg: number, tex = 'proj_void') {
    const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy) || 1;
    const vx = dx / l * speed, vy = dy / l * speed;
    const arrow = tex === 'proj_arrow';
    const sprite = makeProjectileSprite(this, tex, vx, vy, arrow ? 0.9 : 0.6);
    const p: Projectile = { faction: 'enemy', x: e.x, y: e.y, vx, vy, life: 3, radius: arrow ? 0.25 : 0.35, dmg, kind: arrow ? 'phys' : 'void', pierce: 0, explode: 0, opts: {}, hitSet: new Set(), sprite, light: arrow ? 0xd9a65a : 0x9a6bff, height: 40 };
    this.projectiles.push(p);
  }

  private updateProjectiles(dt: number) {
    const h = this.hero;
    for (const p of this.projectiles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      const tx = Math.floor(p.x), ty = Math.floor(p.y);
      let dead = p.life <= 0;
      if (!this.level.seeThrough(tx, ty)) {
        if (p.faction === 'hero' && this.level.isCracked(tx, ty) && this.level.hitCracked(tx, ty)) this.onWallBroken(tx, ty);
        this.fx.burst(p.faction === 'enemy' ? 'void' : 'spark', p.x - p.vx * dt, p.y - p.vy * dt, 4, p.height);
        if (p.explode) this.projExplode(p);
        dead = true;
      } else if (p.faction === 'hero') {
        for (const e of this.enemies) {
          if (!e.alive || p.hitSet.has(e) || dist(p.x, p.y, e.x, e.y) > p.radius + e.radius) continue;
          p.hitSet.add(e);
          if (p.gain) h.gainRes(p.gain);
          if (p.explode) { this.projExplode(p); dead = true; break; }
          const r = rollHeroDamage(this, p.dmg);
          damageEnemy(this, e, r.amount, r.crit, { ...p.opts, kind: p.kind });
          if (p.pierce-- <= 0) { dead = true; break; }
        }
      } else if (h.alive && dist(p.x, p.y, h.x, h.y) < p.radius + h.radius) {
        damageHero(this, p.dmg, p.kind);
        this.fx.burst('void', h.x, h.y, 8, 34);
        dead = true;
      }
      if (dead) { p.sprite.destroy(); p.life = -1; }
      else syncProjectile(p);
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
  }

  private projExplode(p: Projectile) {
    this.fx.burstArea('fire', p.x, p.y, p.explode, 24);
    this.fx.ring(p.x, p.y, p.explode, 0xff8a3a, 300);
    this.fx.flash(p.x, p.y, 0xff6a1a, 1.6);
    this.fx.spell('fx_blast', p.x, p.y, p.explode);
    Sfx.play('explode');
    for (const e of this.enemiesInRadius(p.x, p.y, p.explode)) {
      const r = rollHeroDamage(this, p.dmg);
      damageEnemy(this, e, r.amount, r.crit, { ...p.opts, kind: 'fire' });
    }
  }

  // ─── Наземные эффекты ──────────────────────────────────────────
  addGround(g: GroundEffect) { this.grounds.push(g); }

  telegraphCircle(owner: Enemy, x: number, y: number, r: number, delay: number, dmg: number, kind: DmgKind = 'fire') {
    this.addGround(makeGround({ kind: 'circle', faction: 'enemy', owner, x, y, radius: r, delay, dmg, dmgKind: kind, color: kind === 'void' ? 0xb07aff : 0xff4a2a }));
  }

  telegraphCone(owner: Enemy, x: number, y: number, dx: number, dy: number, r: number, arc: number, delay: number, dmg = 0, kind: DmgKind = 'phys') {
    this.addGround(makeGround({ kind: 'cone', faction: 'enemy', owner, x, y, dirx: dx, diry: dy, radius: r, arc, delay, dmg, dmgKind: kind }));
  }

  telegraphLine(owner: Enemy, x: number, y: number, ex: number, ey: number, width: number, delay: number) {
    this.addGround(makeGround({ kind: 'line', faction: 'enemy', owner, x, y, ex, ey, width, delay }));
  }

  ringWave(owner: Enemy, x: number, y: number, maxR: number, dur: number, dmg: number) {
    this.addGround(makeGround({ kind: 'ring', faction: 'enemy', owner, x, y, radius: maxR, delay: dur, dmg, dmgKind: 'fire', color: 0xff5a1a }));
    Sfx.play('fire');
  }

  spawnFirePatch(x: number, y: number, r: number, dur: number, faction: 'hero' | 'enemy', dmg = 0.35) {
    this.addGround(makeGround({ kind: 'patch', faction, x, y, radius: r, delay: 0, duration: dur, dmg, dmgKind: 'fire' }));
  }

  placeTrap(x: number, y: number, r: number, mult: number, root: number) {
    const mine = this.grounds.filter(g => g.kind === 'trap' && !g.done);
    if (mine.length >= 3) mine[0].done = true;
    this.addGround(makeGround({ kind: 'trap', faction: 'hero', x, y, radius: r, delay: 0.5, duration: 40, dmg: mult, opts: { root }, dmgKind: 'void' }));
  }

  clearTelegraph(owner: Enemy) {
    for (const g of this.grounds) if (g.owner === owner && g.kind !== 'patch' && g.kind !== 'circle') g.done = true;
  }

  private updateGrounds(dt: number) {
    const h = this.hero;
    for (const g of this.grounds) {
      if (g.done) continue;
      g.t += dt;
      switch (g.kind) {
        case 'circle':
        case 'cone': {
          if (g.t < g.delay) break;
          g.done = true;
          const inside = (x: number, y: number, r: number) => g.kind === 'circle' ? dist(g.x, g.y, x, y) <= g.radius + r : inCone(g.x, g.y, g.dirx, g.diry, g.radius, g.arc, x, y, r);
          if (g.faction === 'enemy') {
            if (g.dmg > 0 && h.alive && inside(h.x, h.y, h.radius)) damageHero(this, g.dmg, g.dmgKind, g.owner);
            if (g.kind === 'circle') {
              this.fx.burstArea(g.dmgKind === 'void' ? 'void' : 'fire', g.x, g.y, g.radius, 16);
              this.fx.ring(g.x, g.y, g.radius, g.color, 250);
              Sfx.play('explode');
            }
          } else {
            for (const e of this.enemies) if (e.alive && inside(e.x, e.y, e.radius)) {
              const r = rollHeroDamage(this, g.dmg);
              damageEnemy(this, e, r.amount, r.crit, { ...g.opts, kind: g.dmgKind });
            }
            this.hitWallsAround(g.x, g.y, g.radius);
          }
          g.onBoom?.(g);
          break;
        }
        case 'line': if (g.t >= g.delay) g.done = true; break;
        case 'ring': {
          const R = g.radius * Math.min(1, g.t / g.delay);
          if (!g.hitOnce && h.alive && Math.abs(dist(g.x, g.y, h.x, h.y) - R) < 0.45) { g.hitOnce = true; damageHero(this, g.dmg, 'fire', g.owner); }
          if (Math.random() < 0.8) { const a = Math.random() * Math.PI * 2; this.fx.burst('fire', g.x + Math.cos(a) * R, g.y + Math.sin(a) * R, 1, 4); }
          if (g.t >= g.delay) g.done = true;
          break;
        }
        case 'patch': {
          g.tickT -= dt;
          if (g.tickT <= 0) {
            g.tickT = 0.5;
            if (g.faction === 'enemy') { if (h.alive && dist(g.x, g.y, h.x, h.y) < g.radius + h.radius * 0.5) damageHero(this, g.dmg, 'fire'); }
            else for (const e of this.enemiesInRadius(g.x, g.y, g.radius)) { const r = rollHeroDamage(this, g.dmg); damageEnemy(this, e, r.amount, false, { kind: 'fire', noProc: true }); }
          }
          if (Math.random() < dt * 6) this.fx.burst('fire', g.x + rng.range(-g.radius, g.radius) * 0.6, g.y + rng.range(-g.radius, g.radius) * 0.6, 1, 2);
          if (g.t >= g.duration) g.done = true;
          break;
        }
        case 'trap': {
          if (!g.armed && g.t >= g.delay) g.armed = true;
          if (g.armed && this.enemies.some(e => e.alive && dist(e.x, e.y, g.x, g.y) < 0.95 + e.radius)) {
            g.done = true;
            this.fx.burstArea('void', g.x, g.y, g.radius, 30);
            this.fx.ring(g.x, g.y, g.radius, 0x9a6bff, 350);
            this.fx.shake(0.005, 120);
            Sfx.play('explode');
            for (const e of this.enemiesInRadius(g.x, g.y, g.radius)) { const r = rollHeroDamage(this, g.dmg); damageEnemy(this, e, r.amount, r.crit, { root: g.opts?.root, kind: 'void' }); }
          }
          if (g.t >= g.duration) g.done = true;
          break;
        }
      }
    }
    this.grounds = this.grounds.filter(g => !g.done);
  }

  // ─── Духи ведьмы ───────────────────────────────────────────────
  spawnWisps(n: number, life: number, mult: number) {
    for (const w of this.wisps) w.sprite.destroy();
    this.wisps = [];
    for (let i = 0; i < n; i++) {
      const s = this.add.image(0, 0, 'wisp').setBlendMode(Phaser.BlendModes.ADD).setScale(0.55);
      this.wisps.push({ sprite: s, t: 0, life, phase: i / n * Math.PI * 2, x: this.hero.x, y: this.hero.y, cd: 0.3 + i * 0.2 });
      this.fx.burst('fire', this.hero.x, this.hero.y, 10, 40);
    }
    (this.wisps as any).mult = mult;
  }

  private updateWisps(dt: number) {
    const h = this.hero;
    const mult = (this.wisps as any).mult ?? 0.5;
    for (const w of this.wisps) {
      w.t += dt; w.cd -= dt;
      const a = w.phase + w.t * 1.8;
      const tx = h.x + Math.cos(a) * 1.3, ty = h.y + Math.sin(a) * 1.3;
      w.x += (tx - w.x) * Math.min(1, dt * 6); w.y += (ty - w.y) * Math.min(1, dt * 6);
      const p = isoToScreen(w.x, w.y);
      w.sprite.setPosition(p.x, p.y - 46 - Math.sin(w.t * 4) * 5).setDepth(p.y + 40).setAlpha(Math.min(1, (w.life - w.t) * 2));
      if (w.cd <= 0) {
        const e = this.nearestEnemy(w.x, w.y, 8);
        if (e) {
          w.cd = 0.85;
          const dx = e.x - w.x, dy = e.y - w.y, l = Math.hypot(dx, dy) || 1;
          this.heroProjectile({ x: w.x, y: w.y, vx: dx / l * 11, vy: dy / l * 11, life: 1, radius: 0.25, dmg: mult, kind: 'fire', pierce: 0, explode: 0, opts: { burn: 0.2 } }, 'proj_wispbolt', 0.4);
        }
      }
    }
    const alive = this.wisps.filter(w => w.t < w.life);
    for (const w of this.wisps) if (w.t >= w.life) w.sprite.destroy();
    if (alive.length !== this.wisps.length) { (alive as any).mult = mult; this.wisps = alive; }
  }

  // ─── Ловушки, сундуки, порталы, стены ──────────────────────────
  private updateSpikes(dt: number) {
    const h = this.hero;
    for (const s of this.spikes) {
      s.t += dt;
      const ph = s.t % s.period;
      const warn = ph > s.period - 1.0 && ph < s.period - 0.4;
      const up = ph >= s.period - 0.4;
      s.img.setTexture(up ? 'trap_on' : 'trap_off');
      if (warn) s.img.setTint(Math.floor(s.t * 12) % 2 ? 0xff6060 : 0xffffff); else s.img.clearTint();
      if (up && !s.fired) {
        s.fired = true;
        const near = dist(h.x, h.y, s.x + 0.5, s.y + 0.5);
        if (near < 8) Sfx.play('trap');
        if (h.alive && Math.floor(h.x) === s.x && Math.floor(h.y) === s.y) damageHero(this, 8 + this.heroData.depth * 4, 'phys');
        for (const e of this.enemies) if (e.alive && Math.floor(e.x) === s.x && Math.floor(e.y) === s.y) damageEnemy(this, e, e.maxHp * 0.25, false, { noProc: true });
      }
      if (!up) s.fired = false;
    }
  }

  private updateInteractables() {
    const h = this.hero;
    if (!h.alive) return;
    for (const c of this.chests) {
      if (c.opened || dist(h.x, h.y, c.x, c.y) > 1.05) continue;
      if (c.elite && this.boss && this.boss.alive && !c.secret) continue; // награда босса — после победы
      this.openChest(c);
    }
    if (this.portal) {
      const p = this.portal;
      p.swirl.rotation += 0.02;
      if (dist(h.x, h.y, p.x, p.y) < 0.9) {
        if (!p.locked) this.enterPortal();
        else if (this.lockedMsgT <= 0) { this.lockedMsgT = 4; bus.emit(EV.TOAST, 'Колодец затянут пеплом. Сначала поговорите с Ориеном', '#c8b898'); }
      }
    }
  }

  private openChest(c: Chest) {
    c.opened = true;
    this.stats.chestsOpened++;
    c.img.setTexture(c.elite || c.secret ? 'chest_elite_open' : 'chest_open');
    Sfx.play('chest');
    this.fx.burst('gold', c.x, c.y, 24, 20);
    const n = c.secret ? 3 : c.elite ? 3 : rng.int(1, 2);
    const minR = c.secret || c.elite ? 2 : 0;
    for (let i = 0; i < n; i++) this.dropItem(c.x, c.y, i === 0 ? minR : 0);
    this.dropGold(c.x, c.y, goldDrop(this.heroData.depth, this.hero.stats.goldFind) * (c.elite ? 5 : 3));
    if (c.secret || c.elite) this.dropAt(c.x, c.y, { shards: c.secret ? 8 + this.heroData.depth * 2 : 4 });
    if (c.secret) { this.stats.secretFound = true; bus.emit(EV.TOAST, 'Тайник Пустоты вскрыт!', '#5ee0c8'); }
  }

  hitWallsInFront(x: number, y: number, nx: number, ny: number, range: number) {
    for (let d = 0.6; d <= range + 0.4; d += 0.4) {
      const tx = Math.floor(x + nx * d), ty = Math.floor(y + ny * d);
      if (this.level.isCracked(tx, ty)) { if (this.level.hitCracked(tx, ty)) this.onWallBroken(tx, ty); else { this.fx.burst('bone', tx + 0.5, ty + 0.5, 6, 30); Sfx.play('hit'); } return; }
      if (!this.level.seeThrough(tx, ty)) return;
    }
  }

  hitWallsAround(x: number, y: number, r: number) {
    for (const s of this.level.d.secrets) {
      if (this.level.isCracked(s.x, s.y) && dist(x, y, s.x + 0.5, s.y + 0.5) < r + 0.7) {
        if (this.level.hitCracked(s.x, s.y)) this.onWallBroken(s.x, s.y);
      }
    }
  }

  private onWallBroken(tx: number, ty: number) {
    this.fx.burstArea('bone', tx + 0.5, ty + 0.5, 1, 26);
    this.fx.burstArea('smoke', tx + 0.5, ty + 0.5, 1, 12);
    this.fx.shake(0.012, 300);
    Sfx.play('wall');
    bus.emit(EV.TOAST, 'Стена рухнула — тайный проход!', '#ff8a3a');
    this.flow.build(this.level.walkable, Math.floor(this.hero.x), Math.floor(this.hero.y));
  }

  private updateAshfall(dt: number) {
    this.ashfallT -= dt;
    if (this.ashfallT > 0 || !this.hero.alive) return;
    this.ashfallT = rng.range(2.5, 4.5);
    const h = this.hero;
    for (let i = 0; i < 2; i++) {
      const x = h.x + rng.range(-4, 4), y = h.y + rng.range(-4, 4);
      if (this.level.walkable(Math.floor(x), Math.floor(y))) {
        this.addGround(makeGround({ kind: 'circle', faction: 'enemy', x, y, radius: 1.1, delay: 1.4, dmg: 6 + this.heroData.depth * 3, dmgKind: 'fire', color: 0xff7a2a }));
      }
    }
  }

  // ─── Лут ───────────────────────────────────────────────────────
  private dropAt(x: number, y: number, o: { item?: any; gold?: number; shards?: number; potion?: boolean }) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(0.3, 1.1);
    let lx = x + Math.cos(a) * r, ly = y + Math.sin(a) * r;
    if (!this.level.walkable(Math.floor(lx), Math.floor(ly))) { lx = x; ly = y; }
    this.loot.push(makeGroundLoot(this, lx, ly, o));
  }

  private dropItem(x: number, y: number, minRarity = 0) {
    const st = this.hero.stats;
    const diff = DIFFICULTIES[this.heroData.difficulty];
    const mf = st.magicFind + (diff.loot - 1) + (this.floorMod?.loot ?? 0) + this.heroData.depth * 0.04;
    const ilvl = Math.max(1, this.heroData.level + rng.int(-1, 1) + Math.floor(this.heroData.depth / 2));
    const item = generateItem({ ilvl, magicFind: mf, minRarity, preferWeapon: this.hero.cls.weapon });
    this.dropAt(x, y, { item });
    if (item.rarity >= 4) { Sfx.play('levelup'); bus.emit(EV.TOAST, `${RARITIES[item.rarity].name} предмет!`, '#' + RARITIES[item.rarity].color.toString(16)); }
  }

  private dropGold(x: number, y: number, amount: number) { this.dropAt(x, y, { gold: Math.max(1, Math.round(amount)) }); }

  private updateLoot(dt: number) {
    const h = this.hero;
    if (!h.alive) return;
    for (const l of this.loot) {
      l.t += dt;
      if (l.beam) l.beam.setAlpha(0.4 + Math.sin(l.t * 3) * 0.15);
      const d = dist(h.x, h.y, l.x, l.y);
      if (l.t < 0.4 || d > (l.item ? 0.75 : 1.4)) continue;
      if (l.gold) { this.heroData.gold += l.gold; Sfx.play('gold'); this.fx.damageNumber(l.x, l.y, `+${l.gold} зол.`, '#d9a65a', false, 30); }
      else if (l.shards) { this.heroData.shards += l.shards; Sfx.play('pickup'); this.fx.damageNumber(l.x, l.y, `+${l.shards} оск.`, '#ff8a3a', false, 30); }
      else if (l.potion) { if (this.heroData.potions >= 5) continue; this.heroData.potions++; Sfx.play('potion'); }
      else if (l.item) {
        if (!addToBag(this.heroData, l.item)) { if (l.t % 3 < dt) bus.emit(EV.TOAST, 'Сумка полна', '#e05a5a'); continue; }
        Sfx.play('pickup');
        bus.emit(EV.TOAST, l.item.name, '#' + (settings.colorblind ? RARITIES[l.item.rarity].cbColor : RARITIES[l.item.rarity].color).toString(16).padStart(6, '0'));
        bus.emit(EV.INVENTORY);
      }
      destroyLoot(l); l.t = -999;
    }
    this.loot = this.loot.filter(l => l.t > -999);
  }

  // ─── Смерти, опыт, уровни ──────────────────────────────────────
  killEnemy(e: Enemy) {
    if (!e.alive) return;
    e.die();
    Sfx.play(e.isBoss ? 'boss_death' : 'death');
    if (e.isBoss) Music.jingle('victory');
    this.fx.burst(e.def.id === 'shadow' ? 'void' : 'ash', e.x, e.y, 14, 30);
    this.heroData.kills++;
    this.giveXp(e.xp);
    this.onQuestKill(e);
    const h = this.hero;
    if (h.powers.has('bloodthirst')) h.heal(h.maxHp * 0.04);
    if (e.has('molten')) this.addGround(makeGround({ kind: 'circle', faction: 'enemy', x: e.x, y: e.y, radius: 2, delay: 0.9, dmg: e.dmg * 1.5, dmgKind: 'fire' }));
    if (e.def.id === 'shadow') return; // тени без лута
    const D = this.heroData;
    if (e.isBoss) {
      for (let i = 0; i < 3; i++) this.dropItem(e.x, e.y, i === 0 ? 3 : 1);
      for (let i = 0; i < 6; i++) this.dropGold(e.x, e.y, goldDrop(D.depth, h.stats.goldFind) * 2);
      this.dropAt(e.x, e.y, { shards: 10 + D.depth * 3 });
      this.onBossDead(e as Boss);
      return;
    }
    if (e.isElite) {
      this.stats.elitesKilled++;
      this.dropItem(e.x, e.y, 2); this.dropItem(e.x, e.y, 1);
      for (let i = 0; i < 3; i++) this.dropGold(e.x, e.y, goldDrop(D.depth, h.stats.goldFind));
      if (rng.chance(0.5)) this.dropAt(e.x, e.y, { shards: 2 + D.depth });
      return;
    }
    if (rng.chance(0.11)) this.dropItem(e.x, e.y);
    if (rng.chance(0.35)) this.dropGold(e.x, e.y, goldDrop(D.depth, h.stats.goldFind));
    if (rng.chance(0.05) && D.potions < 5) this.dropAt(e.x, e.y, { potion: true });
    if (rng.chance(0.04)) this.dropAt(e.x, e.y, { shards: 1 });
  }

  giveXp(v: number) {
    const D = this.heroData;
    if (D.level >= MAX_LEVEL) return;
    D.xp += Math.round(v);
    let leveled = false;
    while (D.level < MAX_LEVEL && D.xp >= xpToNext(D.level)) {
      D.xp -= xpToNext(D.level);
      D.level++; D.points++;
      leveled = true;
    }
    if (leveled) {
      this.hero.recompute(true);
      this.hero.res = this.hero.maxRes;
      this.fx.ring(this.hero.x, this.hero.y, 3, 0xffd080, 700);
      this.fx.burst('gold', this.hero.x, this.hero.y, 40, 40);
      Sfx.play('levelup');
      bus.emit(EV.LEVELUP, D.level);
      this.save();
    }
  }

  private onBossDead(b: Boss) {
    this.boss = null;
    this.fx.shake(0.014, 900);
    this.fx.burstArea('fire', b.x, b.y, 3, 60);
    const D = this.heroData;
    D.bestDepth = Math.max(D.bestDepth, D.depth + 1);
    // пролог: после Глашатая портал ведёт домой, в лагерь
    const home = questStep(D) === 6;
    if (home) { this.advanceQuest(); bus.emit(EV.TOAST, 'В пепле Глашатая — осколок Пепельного Венца', '#ffd080', 3600, 20); }
    this.time.delayedCall(1200, () => {
      const pt = this.makePortal(b.x, b.y, home ? 0 : D.depth + 1);
      this.tweens.add({ targets: pt.img, scale: { from: 0.1, to: 0.5 }, duration: 600, ease: 'Back.easeOut' });
      Sfx.play('portal');
      bus.emit(EV.TOAST, home ? 'Портал в лагерь открыт' : 'Разлом открыт: путь глубже', '#9a6bff');
    });
    this.save();
  }

  private enterPortal() {
    if (this.paused) return;
    this.paused = true;
    Sfx.play('portal');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.paused = false;
      this.heroData.potions = Math.max(this.heroData.potions, 3);
      this.buildFloor(this.portal?.target ?? this.heroData.depth + 1);
    });
  }

  heroDied() {
    const h = this.hero;
    if (!h.alive) return;
    h.alive = false; h.hp = 0;
    h.stop();
    h.play('death');
    Sfx.play('hero_death');
    Music.jingle('defeat');
    this.fx.burst('blood', h.x, h.y, 30, 30);
    bus.emit(EV.SUBTITLE, 'Глашатай', 'Ещё один огонёк погас.');
    const lost = Math.floor(this.heroData.gold * 0.1);
    this.heroData.gold -= lost;
    this.save();
    this.time.delayedCall(1400, () => this.ui?.showDeath(lost));
  }

  respawn() {
    this.hero.alive = true;
    this.hero.st.burn.t = 0; this.hero.st.bleed.t = 0; this.hero.st.stun = 0;
    this.hero.recompute(true);
    this.hero.res = this.hero.cls.resource.start;
    this.buildFloor(this.heroData.depth);
  }

  save() { SaveSystem.save(this.heroData); }

  /** Музыка по обстановке: босс → бой (бодрствующий враг рядом) → тема этажа. Из боя выходим через 4 с затишья. */
  /** Музыка без боя: северная тема на поверхности, своя у Катакомб и Пустошей. */
  private calmMusic(): MusicState {
    return this.theme === 'surface' ? 'surface' : this.theme === 'catacombs' ? 'dungeon' : 'explore';
  }

  private updateMusic(dt: number) {
    this.musicT -= dt;
    if (this.musicT > 0) return;
    this.musicT = 0.5;
    const h = this.hero;
    if (!h.alive) return;
    if (this.boss && this.boss.awake && this.boss.alive && dist(h.x, h.y, this.boss.x, this.boss.y) < 16) { Music.play('boss'); return; }
    const fighting = this.enemies.some(e => e.alive && e.awake && !e.isBoss && dist(h.x, h.y, e.x, e.y) < 10);
    this.combatT = fighting ? 4 : this.combatT - 0.5;
    Music.play(this.combatT > 0 ? 'combat' : this.calmMusic());
  }

  // ─── Свет и туман ──────────────────────────────────────────────
  private updateDarkness() {
    const cam = this.cameras.main;
    const v = cam.worldView;
    const R = DARK_RES;
    const W = Math.ceil(v.width / R) + 2, H = Math.ceil(v.height / R) + 2;
    if (this.darkTex.width !== W || this.darkTex.height !== H) this.darkTex.setSize(W, H);
    this.dark.setPosition(v.x - R, v.y - R).setScale(R);
    const ctx = this.darkTex.context;
    // поверхность: пасмурный пепельный день, тьма только по краям
    const base = this.theme === 'surface' ? 0.12 : this.theme === 'ashlands' ? 0.62 : 0.76;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.theme === 'surface' ? `rgba(26,14,12,${base})` : this.theme === 'ashlands' ? `rgba(10,4,6,${base})` : `rgba(3,3,10,${base})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    const now = this.time.now / 1000;
    const light = (x: number, y: number, r: number, intensity: number) => {
      const p = isoToScreen(x, y);
      const { rx, ry } = isoEllipse(r);
      if (p.x + rx < v.x || p.x - rx > v.right || p.y + ry < v.y - 100 || p.y - ry > v.bottom + 100) return;
      // эллипс 2:1 = круг, сжатый по вертикали; центр чуть выше ног, чтобы освещать фигуру
      const cx = (p.x - v.x) / R + 1, cy = (p.y - v.y - 20) / R + 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, (ry + 30) / rx);
      const rad = rx / R;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      g.addColorStop(0, `rgba(0,0,0,${intensity})`);
      g.addColorStop(0.45, `rgba(0,0,0,${intensity * 0.85})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    const h = this.hero;
    light(h.x, h.y, this.lightRadius(), 1);
    for (const L of this.level.lights) {
      const f = L.flicker < 0 ? 1 : 0.85 + Math.sin(now * 9 + L.flicker) * 0.08 + Math.sin(now * 23 + L.flicker * 3) * 0.05;
      light(L.x, L.y, L.r * f, L.intensity * 0.9);
    }
    for (const p of this.projectiles) light(p.x, p.y, p.explode ? 2.6 : 1.6, 0.7);
    for (const g of this.grounds) if (g.kind === 'patch' || (g.kind === 'circle' && g.faction === 'hero')) light(g.x, g.y, g.radius + 0.8, 0.5);
    for (const w of this.wisps) light(w.x, w.y, 2, 0.6);
    for (const l of this.loot) if (l.item && l.item.rarity >= 3) light(l.x, l.y, 1.4, 0.5);
    if (this.boss && this.boss.awake && this.boss.alive) light(this.boss.x, this.boss.y, 3.5, 0.7);
    ctx.globalCompositeOperation = 'source-over';
    this.darkTex.refresh();
    // туман плывёт относительно камеры и медленно дышит
    for (const f of this.fog) {
      const t = now * f.sp;
      f.img.setPosition(v.centerX + ((f.ox + t) % 1600 + 1600) % 1600 - 800, v.centerY + f.oy + Math.sin(now * 0.2 + f.sp) * 30);
    }
  }

  /** Индикаторы атак, полоски здоровья, подсветка цели. */
  private drawOverlay() {
    const g = this.g;
    g.clear();
    const now = this.time.now;
    for (const e of this.grounds) drawGround(g, e, now);
    // золотая стрелка у героя: направление к цели задания
    const qt = this.questTarget();
    if (qt && this.hero.alive && dist(qt.x, qt.y, this.hero.x, this.hero.y) > 5) {
      const hp = isoToScreen(this.hero.x, this.hero.y), tp = isoToScreen(qt.x, qt.y);
      const a = Math.atan2(tp.y - hp.y, tp.x - hp.x), R = 46, pulse = 0.65 + Math.sin(now / 220) * 0.25;
      const cx = hp.x + Math.cos(a) * R, cy = hp.y - 10 + Math.sin(a) * R * 0.6;
      if (this.textures.exists('ui_arrow')) {
        // бронзовая стрелка FLARE (смотрит вверх) с золотым отливом
        if (!this.qArrow || !this.qArrow.active) this.qArrow = this.add.image(0, 0, 'ui_arrow').setDepth(FLOOR_DEPTH + 3.1).setScale(0.7).setTint(0xffe2a0);
        this.qArrow.setVisible(true).setPosition(cx, cy).setRotation(a + Math.PI / 2).setAlpha(Math.min(1, pulse + 0.15));
      } else {
        const pt = (r: number, da: number) => ({ x: cx + Math.cos(a + da) * r, y: cy + Math.sin(a + da) * r });
        const t1 = pt(12, 0), t2 = pt(9, 2.4), t3 = pt(9, -2.4);
        g.fillStyle(0xffc04a, pulse); g.fillTriangle(t1.x, t1.y, t2.x, t2.y, t3.x, t3.y);
        g.lineStyle(1.5, 0x2a1408, pulse); g.strokeTriangle(t1.x, t1.y, t2.x, t2.y, t3.x, t3.y);
      }
    } else this.qArrow?.setVisible(false);
    // кольцо под целью
    const tg = this.hovered || this.hero.target;
    if (tg && tg.alive) {
      const p = isoToScreen(tg.x, tg.y);
      const { rx, ry } = isoEllipse(tg.radius + 0.25);
      g.lineStyle(2, 0xff5a3a, 0.9); g.strokeEllipse(p.x, p.y, rx * 2, ry * 2);
    }
    // полоски здоровья над ранеными обычными врагами (элиты — с подписью)
    for (const e of this.enemies) {
      if (!e.alive || e.isBoss || !e.sprite.visible) continue;
      if (e.hp >= e.maxHp && !e.isElite) continue;
      const p = isoToScreen(e.x, e.y);
      const w = e.isElite ? 54 : 34, y = p.y - e.heightPx * (e.isElite ? 1.28 : 1.12);
      g.fillStyle(0x000000, 0.7); g.fillRect(p.x - w / 2 - 1, y - 1, w + 2, 6);
      g.fillStyle(e.isElite ? 0xd9a65a : 0xb0161e, 1); g.fillRect(p.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 4);
    }
    // ловушки-шипы: предупреждение
    for (const s of this.spikes) {
      const ph = s.t % s.period;
      if (ph > s.period - 1.0 && ph < s.period - 0.4 && s.img.visible) {
        const p = isoToScreen(s.x + 0.5, s.y + 0.5);
        g.lineStyle(2, 0xff3a2a, 0.8); g.strokeEllipse(p.x, p.y, 58, 29);
      }
    }
  }
}
