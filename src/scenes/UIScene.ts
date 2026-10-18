// Интерфейс поверх игры: HUD (сферы здоровья/ресурса, панель навыков, опыт, мини-карта,
// трекер заданий, полоса босса), сенсорное управление, панели (инвентарь, навыки, карта, пауза),
// всплывающие сообщения и субтитры. Масштабируется под экран и настройку «Масштаб интерфейса».
import Phaser from 'phaser';
import { UI, FONT } from '../config';
import { bus, EV } from '../core/events';
import { Sfx } from '../core/Sfx';
import { clamp } from '../core/iso';
import { txt, title, panel, button, settingsPanel, hexStr } from '../ui/widgets';
import { settings, isTouchUI } from '../systems/Settings';
import { touch } from '../systems/Input';
import { SKILLS, skillDesc, MAX_SKILL_RANK } from '../data/skills';
import { RARITIES, SLOTS, SLOT_NAMES, SETS, POWERS, type Slot } from '../data/items';
import { STAT_INFO, fmtStat, type StatKey } from '../data/stats';
import {
  BAG_SIZE, computeStats, dpsEstimate, equipFromBag, unequip, swapBag, sellBag, salvageBag, upgradeItem, sellJunk,
  canEquip, rankUp, talentUp, xpToNext, setCounts,
} from '../systems/HeroData';
import { itemStats, sellPrice, salvageShards, upgradeCost, type Item } from '../systems/Loot';
import { STEPS, QUEST_DONE, questStep, goalText } from '../data/quests';
import type { GameScene } from './GameScene';
import type { Enemy } from '../entities/Enemy';

type PanelId = 'inventory' | 'skills' | 'journal';
interface Rect { x: number; y: number; w: number; h: number }
type Sel = { where: 'bag'; idx: number } | { where: 'equip'; slot: Slot } | null;

export class UIScene extends Phaser.Scene {
  gs!: GameScene;
  s = 1;
  private hud!: Phaser.GameObjects.Container;
  private rects: Rect[] = [];
  private hpLiquid!: Phaser.GameObjects.Image; private resLiquid!: Phaser.GameObjects.Image;
  private hpText!: Phaser.GameObjects.Text; private resText!: Phaser.GameObjects.Text;
  private slots: { icon: Phaser.GameObjects.Image; cd: Phaser.GameObjects.Graphics; dim: Phaser.GameObjects.Rectangle; key: string; cdText: Phaser.GameObjects.Text; size: number }[] = [];
  private xpG!: Phaser.GameObjects.Graphics; private xpW = 420;
  private mmImg!: Phaser.GameObjects.Image; private mmG!: Phaser.GameObjects.Graphics; private mmMask!: Phaser.GameObjects.Graphics;
  private mmBox!: Rect;
  private tracker!: Phaser.GameObjects.Text; private floorText!: Phaser.GameObjects.Text;
  private statText!: Phaser.GameObjects.Text;
  private bossBar?: { cont: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; name: Phaser.GameObjects.Text; boss: Enemy };
  private hoverCont!: Phaser.GameObjects.Container; private hoverG!: Phaser.GameObjects.Graphics; private hoverName!: Phaser.GameObjects.Text;
  private toasts: Phaser.GameObjects.Text[] = [];
  private subtitle!: Phaser.GameObjects.Text; private subT = 0;
  private hurt!: Phaser.GameObjects.Image;
  private touchCont?: Phaser.GameObjects.Container;
  private joy = { id: -1, cx: 0, cy: 0, base: null as Phaser.GameObjects.Image | null, knob: null as Phaser.GameObjects.Image | null, R: 70 };
  private attackId = -1;
  private panelCont: Partial<Record<PanelId | 'map' | 'menu' | 'settings' | 'death' | 'dialog', Phaser.GameObjects.Container>> = {};
  private panelRect: Partial<Record<string, Rect>> = {};
  private openPanel: PanelId | null = null;
  private sel: Sel = null;
  private tip?: Phaser.GameObjects.Container;
  private drag: { from: Sel; ghost?: Phaser.GameObjects.Image; sx: number; sy: number; started: boolean; pid: number } | null = null;
  private slotRects: { sel: Exclude<Sel, null>; r: Rect }[] = [];
  private lastTap = { t: 0, key: '' };
  private notEnoughT = 0;
  private touchMode = false;

  constructor() { super('UI'); }

  create() {
    this.gs = this.scene.get('Game') as GameScene;
    this.input.addPointer(3);
    this.layout();
    this.scale.on('resize', () => this.layout());
    const onToast = (t: string, c: string, ms?: number, size?: number) => this.toast(t, c, ms, size);
    const onSub = (who: string, t: string) => this.showSubtitle(who, t);
    const onFloor = (_d: number, t: string, mod: any) => { this.mmImg?.setTexture('minimap'); this.toast(t, '#e8d4b0', 3200, 22); if (mod) this.toast(`Модификатор: ${mod.name} — ${mod.desc}`, '#ff8a3a', 3600); };
    const onBoss = (b: Enemy | null) => this.setBoss(b);
    const onLevel = (lv: number) => { this.toast(`Новый уровень: ${lv}! +1 очко умений (K)`, '#ffd080', 3000, 22); this.layout(); };
    const onInv = () => { if (this.openPanel === 'inventory') this.buildInventory(); };
    const onSettings = () => this.layout();
    bus.on(EV.TOAST, onToast); bus.on(EV.SUBTITLE, onSub); bus.on(EV.FLOOR, onFloor); bus.on(EV.BOSS, onBoss);
    bus.on(EV.LEVELUP, onLevel); bus.on(EV.INVENTORY, onInv); bus.on(EV.SETTINGS, onSettings);
    this.events.once('shutdown', () => {
      bus.off(EV.TOAST, onToast); bus.off(EV.SUBTITLE, onSub); bus.off(EV.FLOOR, onFloor); bus.off(EV.BOSS, onBoss);
      bus.off(EV.LEVELUP, onLevel); bus.off(EV.INVENTORY, onInv); bus.off(EV.SETTINGS, onSettings);
      this.scale.off('resize');
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTouchDown(p));
  }

  // ─── Раскладка ─────────────────────────────────────────────────
  private computeScale() {
    const W = this.scale.width, H = this.scale.height;
    let s = Math.min(W / 1280, H / 720);
    const cssH = H / (window.devicePixelRatio > 1 ? Math.min(2, window.devicePixelRatio) : 1);
    if (this.touchMode && cssH < 520) s *= 1.15;
    return clamp(s * settings.uiScale, 0.45, 4);
  }

  layout() {
    this.touchMode = isTouchUI();
    this.s = this.computeScale();
    const s = this.s, W = this.scale.width, H = this.scale.height;
    this.hud?.destroy(true);
    this.touchCont?.destroy(true); this.touchCont = undefined;
    this.mmMask?.destroy();
    this.slots = []; this.rects = [];
    this.hud = this.add.container(0, 0);
    const R = (x: number, y: number, w: number, h: number) => this.rects.push({ x, y, w, h });

    // красная вспышка при уроне
    this.hurt = this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H).setTint(0xff0000).setAlpha(0);
    this.hud.add(this.hurt);

    // ── сферы ──
    const orb = (x: number, y: number, sc: number, liquidKey: string, tint?: number) => {
      const c = this.add.container(x, y).setScale(sc * s);
      const liquid = this.add.image(0, 0, liquidKey).setScale(0.7);
      if (tint !== undefined) liquid.setTint(tint);
      const glass = this.add.image(0, 0, 'orb_glass').setScale(0.7);
      const frame = this.add.image(0, 0, 'orb_frame').setScale(0.62);
      const t = txt(this, 0, 0, '', 20, '#f0e6d8', { fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }, sc * s).setOrigin(0.5);
      c.add([liquid, glass, frame, t]);
      this.hud.add(c);
      R(x - 80 * sc * s, y - 80 * sc * s, 160 * sc * s, 160 * sc * s);
      return { liquid, t };
    };
    const resColor = this.gs.hero ? this.gs.hero.cls.resource.color : 0xff7a2a;
    if (!this.touchMode) {
      const a = orb(96 * s, H - 96 * s, 1, 'orb_hp');
      const b = orb(W - 96 * s, H - 96 * s, 1, 'orb_res', resColor);
      this.hpLiquid = a.liquid; this.hpText = a.t; this.resLiquid = b.liquid; this.resText = b.t;
    } else {
      const a = orb(58 * s, 60 * s, 0.62, 'orb_hp');
      const b = orb(150 * s, 60 * s, 0.62, 'orb_res', resColor);
      this.hpLiquid = a.liquid; this.hpText = a.t; this.resLiquid = b.liquid; this.resText = b.t;
    }

    // ── панель навыков ──
    const hero = this.gs.hero;
    const keyNames = settings.scheme === 'wasd' ? ['Q', 'E', 'R', 'ПРОБЕЛ', 'F'] : ['Q', 'W', 'E', 'ПРОБЕЛ', 'R'];
    const icons = hero ? [...hero.cls.skills.map(id => SKILLS[id].icon), 'sk_dodge', 'sk_potion'] : [];
    if (!this.touchMode && hero) {
      const bar = this.add.container(W / 2, H - 14 * s).setScale(s);
      const n = 5, size = 58, gap = 8;
      const total = n * size + (n - 1) * gap;
      const bg = panel(this, total + 40, size + 34, 0.85); bg.setPosition(-total / 2 - 20, -size - 40);
      bar.add(bg);
      for (let i = 0; i < n; i++) {
        const x = -total / 2 + i * (size + gap) + size / 2, y = -size / 2 - 22;
        const fr = this.add.image(x, y, 'skillslot').setDisplaySize(size + 8, size + 8);
        const ic = this.add.image(x, y, icons[i]).setDisplaySize(size - 8, size - 8);
        const dim = this.add.rectangle(x, y, size - 8, size - 8, 0x000000, 0.55).setVisible(false);
        const cd = this.add.graphics();
        const kt = txt(this, x + size / 2 - 4, y + size / 2 - 4, keyNames[i] === 'ПРОБЕЛ' ? '␣' : keyNames[i], 14, '#e8c890', { fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }, s).setOrigin(1, 1);
        const cdText = txt(this, x, y, '', 18, '#ffffff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }, s).setOrigin(0.5);
        bar.add([fr, ic, dim, cd, kt, cdText]);
        const zone = this.add.zone(x - size / 2, y - size / 2, size, size).setOrigin(0).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => this.showSkillTip(i, W / 2 + x * s, H - 14 * s + (y - size / 2) * s));
        zone.on('pointerout', () => this.hideTip());
        zone.on('pointerdown', () => { if (i < 3) touch.skills[i] = true; else if (i === 3) touch.dodge = true; else touch.potion = true; });
        bar.add(zone);
        this.slots.push({ icon: ic, cd, dim, key: keyNames[i], cdText, size: size - 8 });
      }
      // опыт
      this.xpW = total + 20;
      this.xpG = this.add.graphics(); this.xpG.setPosition(-this.xpW / 2, -8);
      bar.add(this.xpG);
      this.hud.add(bar);
      R(W / 2 - (total / 2 + 24) * s, H - (size + 60) * s, (total + 48) * s, (size + 60) * s);
    } else {
      // опыт внизу по центру
      const bar = this.add.container(W / 2, H - 6 * s).setScale(s);
      this.xpW = 300; this.xpG = this.add.graphics(); this.xpG.setPosition(-this.xpW / 2, -4);
      bar.add(this.xpG); this.hud.add(bar);
    }

    // ── верхний левый угол: уровень, валюта, кнопки ──
    const tl = this.add.container(this.touchMode ? 210 * s : 14 * s, this.touchMode ? 18 * s : 14 * s).setScale(s);
    this.statText = txt(this, 0, 0, '', 16, UI.text, { stroke: '#000', strokeThickness: 3, lineSpacing: 2 }, s);
    tl.add(this.statText);
    const btns: [string, () => void][] = [['Сумка', () => this.togglePanel('inventory')], ['Навыки', () => this.togglePanel('skills')], ['Журнал', () => this.togglePanel('journal')], ['Карта', () => this.toggleMap()], ['Меню', () => this.toggleMenu()]];
    btns.forEach(([l, cb], i) => { const b = button(this, i * 74, 50, 70, 30, l, cb, s, 14); tl.add(b.cont); });
    this.hud.add(tl);
    R(tl.x, tl.y, 380 * s, 84 * s);

    // ── мини-карта и трекер ──
    const mmW = 230, mmH = 140;
    const tr = this.add.container(W - (mmW + 14) * s, 14 * s).setScale(s);
    tr.add(panel(this, mmW, mmH, 0.75));
    this.mmBox = { x: tr.x + 8 * s, y: tr.y + 8 * s, w: (mmW - 16) * s, h: (mmH - 16) * s };
    this.mmImg = this.add.image(0, 0, 'minimap').setOrigin(0, 0);
    this.mmG = this.add.graphics();
    this.mmMask = this.make.graphics({}, false);
    this.mmMask.fillStyle(0xffffff).fillRect(this.mmBox.x, this.mmBox.y, this.mmBox.w, this.mmBox.h);
    const mask = this.mmMask.createGeometryMask();
    this.mmImg.setMask(mask); this.mmG.setMask(mask);
    this.hud.add([this.mmImg, this.mmG]);
    this.floorText = txt(this, mmW, mmH + 6, '', 14, '#c8b898', { align: 'right', stroke: '#000', strokeThickness: 3, wordWrap: { width: 300 } }, s).setOrigin(1, 0);
    this.tracker = txt(this, mmW, mmH + 46, '', 15, UI.text, { align: 'right', stroke: '#000', strokeThickness: 3, lineSpacing: 3 }, s).setOrigin(1, 0);
    tr.add([this.floorText, this.tracker]);
    this.hud.add(tr);
    R(tr.x, tr.y, mmW * s, mmH * s);

    // ── полоса цели под курсором ──
    this.hoverCont = this.add.container(W / 2, 16 * s).setScale(s).setVisible(false);
    this.hoverG = this.add.graphics();
    this.hoverName = txt(this, 0, 2, '', 17, '#f0e0c8', { fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }, s).setOrigin(0.5, 0);
    this.hoverCont.add([this.hoverG, this.hoverName]);
    this.hud.add(this.hoverCont);

    // ── субтитры ──
    this.subtitle = txt(this, W / 2, H - (this.touchMode ? 300 : 150) * s, '', 19, '#f0e0c8', {
      align: 'center', stroke: '#000', strokeThickness: 5, wordWrap: { width: Math.min(W * 0.8, 900 * s) / s }, fontStyle: 'italic',
    }, s).setOrigin(0.5, 1).setScale(s).setAlpha(0);
    this.hud.add(this.subtitle);

    if (this.bossBar) { const b = this.bossBar.boss; this.bossBar.cont.destroy(); this.bossBar = undefined; this.setBoss(b); }
    if (this.touchMode) this.buildTouch();
    // переоткрыть открытые панели под новый масштаб
    if (this.openPanel) { const p = this.openPanel; this.closePanels(); this.togglePanel(p); }
  }

  // ─── Сенсорное управление ──────────────────────────────────────
  private buildTouch() {
    const s = this.s, W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0);
    this.touchCont = c;
    const circle = (x: number, y: number, r: number, icon: string | null, label: string, onDown: (p: Phaser.Input.Pointer) => void) => {
      const g = this.add.graphics();
      g.fillStyle(0x0a0606, 0.55); g.fillCircle(x, y, r);
      g.lineStyle(3 * s, UI.border, 0.9); g.strokeCircle(x, y, r);
      c.add(g);
      if (icon) c.add(this.add.image(x, y, icon).setDisplaySize(r * 1.25, r * 1.25).setAlpha(0.95));
      if (label) c.add(txt(this, x, y + r * 0.62, label, 13, '#e8c890', { fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }, s).setOrigin(0.5).setScale(s));
      const z = this.add.zone(x, y, r * 2, r * 2).setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
      z.on('pointerdown', (p: Phaser.Input.Pointer) => { Sfx.unlock(); onDown(p); });
      c.add(z);
      this.rects.push({ x: x - r, y: y - r, w: r * 2, h: r * 2 });
    };
    const hero = this.gs.hero;
    const bx = W, by = H;
    circle(bx - 105 * s, by - 105 * s, 60 * s, hero ? SKILLS[hero.cls.basic].icon : null, '', p => { touch.attack = true; this.attackId = p.id; });
    if (hero) hero.cls.skills.forEach((id, i) => {
      const pos = [[-232, -72], [-212, -192], [-100, -232]][i];
      circle(bx + pos[0] * s, by + pos[1] * s, 40 * s, SKILLS[id].icon, '', () => { touch.skills[i] = true; });
    });
    circle(bx - 320 * s, by - 60 * s, 32 * s, 'sk_dodge', '', () => { touch.dodge = true; });
    circle(bx - 312 * s, by - 152 * s, 32 * s, 'sk_potion', '', () => { touch.potion = true; });
    // джойстик
    const R = 70 * s;
    this.joy.R = R;
    this.joy.cx = 150 * s; this.joy.cy = H - 150 * s;
    this.joy.base = this.add.image(this.joy.cx, this.joy.cy, 'ring').setDisplaySize(R * 2.2, R * 2.2).setTint(0x8a6a48).setAlpha(0.6);
    this.joy.knob = this.add.image(this.joy.cx, this.joy.cy, 'glow').setDisplaySize(R * 1.1, R * 1.1).setTint(0xd9a65a).setAlpha(0.7);
    c.add([this.joy.base, this.joy.knob]);
    // зона джойстика — левая нижняя часть экрана
    this.rects.push({ x: 0, y: H * 0.42, w: W * 0.38, h: H * 0.58 });
  }

  private onTouchDown(p: Phaser.Input.Pointer) {
    Sfx.unlock();
    if (!this.touchMode || this.joy.id >= 0 || this.anyModal()) return;
    const W = this.scale.width, H = this.scale.height;
    if (p.x < W * 0.38 && p.y > H * 0.42) {
      this.joy.id = p.id;
      this.joy.cx = p.x; this.joy.cy = p.y;
      this.joy.base?.setPosition(p.x, p.y); this.joy.knob?.setPosition(p.x, p.y);
    }
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (p.id === this.joy.id) {
      let dx = p.x - this.joy.cx, dy = p.y - this.joy.cy;
      const l = Math.hypot(dx, dy), R = this.joy.R;
      if (l > R) { dx = dx / l * R; dy = dy / l * R; }
      this.joy.knob?.setPosition(this.joy.cx + dx, this.joy.cy + dy);
      touch.joyX = 0; touch.joyY = 0;
      if (l > 8) { const n = Math.hypot(dx, dy); touch.joyX = dx / n * Math.min(1, n / (R * 0.6)); touch.joyY = dy / n * Math.min(1, n / (R * 0.6)); }
    }
    if (this.drag && p.id === this.drag.pid) {
      if (!this.drag.started && Math.hypot(p.x - this.drag.sx, p.y - this.drag.sy) > 8 * this.s) {
        this.drag.started = true;
        const it = this.selItem(this.drag.from);
        if (it) this.drag.ghost = this.add.image(p.x, p.y, it.icon).setDisplaySize(56 * this.s, 56 * this.s).setAlpha(0.85).setDepth(20000);
        this.hideTip();
      }
      this.drag.ghost?.setPosition(p.x, p.y);
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.joy.id) {
      this.joy.id = -1; touch.joyX = 0; touch.joyY = 0;
      const H = this.scale.height;
      this.joy.cx = 150 * this.s; this.joy.cy = H - 150 * this.s;
      this.joy.base?.setPosition(this.joy.cx, this.joy.cy); this.joy.knob?.setPosition(this.joy.cx, this.joy.cy);
    }
    if (p.id === this.attackId) { touch.attack = false; this.attackId = -1; }
    if (this.drag && p.id === this.drag.pid) this.endDrag(p);
  }

  // ─── Покадровое обновление HUD ─────────────────────────────────
  update(_t: number, delta: number) {
    const h = this.gs.hero;
    if (!h) return;
    const s = this.s;
    const D = h.data;
    // сферы
    const fill = (img: Phaser.GameObjects.Image, k: number) => {
      const fh = img.height; k = clamp(k, 0, 1);
      img.setCrop(0, fh * (1 - k), img.width, fh * k);
    };
    fill(this.hpLiquid, h.hp / h.maxHp);
    fill(this.resLiquid, h.res / Math.max(1, h.maxRes));
    this.hpText.setText(`${Math.ceil(Math.max(0, h.hp))}`);
    this.resText.setText(`${Math.floor(h.res)}`);
    // навыки
    const ids = [...h.cls.skills];
    this.slots.forEach((sl, i) => {
      sl.cd.clear();
      let left = 0, total = 1, cantAfford = false;
      if (i < 3) { const sk = SKILLS[ids[i]]; left = h.cds[ids[i]] || 0; total = sk.cooldown * (1 - h.stats.cdr); cantAfford = h.res < sk.cost; }
      else if (i === 3) { left = h.dodgeCd; total = h.powers.has('phantomStep') ? 1.2 : 2.4; }
      else { cantAfford = D.potions <= 0; sl.cdText.setText(String(D.potions)); sl.cdText.setPosition(sl.icon.x + 18, sl.icon.y - 18).setFontSize(15); }
      sl.dim.setVisible(cantAfford);
      if (left > 0) {
        const r = sl.size / 2;
        sl.cd.fillStyle(0x000000, 0.65);
        sl.cd.slice(sl.icon.x, sl.icon.y, r * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (left / total), false);
        sl.cd.fillPath();
        if (i < 4) sl.cdText.setText(left >= 1 ? String(Math.ceil(left)) : left.toFixed(1));
      } else if (i < 4) sl.cdText.setText('');
    });
    // опыт
    const k = D.xp / xpToNext(D.level);
    this.xpG.clear();
    this.xpG.fillStyle(0x000000, 0.75); this.xpG.fillRect(-2, -2, this.xpW + 4, 8);
    this.xpG.fillStyle(0xc89a4a, 1); this.xpG.fillRect(0, 0, this.xpW * k, 4);
    for (let i = 1; i < 10; i++) { this.xpG.fillStyle(0x000000, 0.6); this.xpG.fillRect(this.xpW * i / 10, 0, 1, 4); }
    // статы
    this.statText.setText(`${h.cls.name}, ур. ${D.level}${D.points ? `  ✦ ${D.points}` : ''}\n◉ ${D.gold} зол.   ◆ ${D.shards} оск.`);
    this.floorText.setText(this.gs.floorTitle);
    // трекер
    const st = this.gs.stats;
    const lines: string[] = [];
    // задание пролога — первой строкой, золотом
    const quest = questStep(D) < QUEST_DONE;
    if (quest) lines.push(`★ ${STEPS[questStep(D)].quest}: ${goalText(D)}`);
    if (D.depth > 0) {
      if (this.gs.boss) lines.push('◇ Сразите Глашатая Пустого Солнца');
      else if (!quest) lines.push(this.gs.portal ? '◆ Войдите в Разлом' : '◆ Глашатай повержен');
      if (st.elites) lines.push(`${st.elitesKilled >= st.elites ? '◆' : '◇'} Элитные враги: ${st.elitesKilled}/${st.elites}`);
    }
    if (st.chests) lines.push(`${st.chestsOpened >= st.chests ? '◆' : '◇'} Сундуки: ${st.chestsOpened}/${st.chests}`);
    if (st.secret) lines.push(`${st.secretFound ? '◆' : '◇'} Тайник за трещиной в стене`);
    if (!quest && D.depth === 0) lines.unshift('◆ Колодец на севере ведёт в Разломы');
    this.tracker.setText(lines.join('\n'));
    this.tracker.setColor(quest ? '#ffd88a' : UI.text);
    // мини-карта: центр на герое
    this.drawMinimap(this.mmBox, 3, this.mmG, this.mmImg);
    // цель под курсором
    const tg = this.gs.hovered;
    if (tg && tg.alive && !tg.isBoss) {
      this.hoverCont.setVisible(true).setY((this.bossBar ? 70 : 16) * s);
      this.hoverName.setText(tg.displayName).setColor(tg.isElite ? hexStr(tg.affixes[0]?.color ?? 0xffffff) : '#f0e0c8');
      const w = 280;
      this.hoverG.clear();
      this.hoverG.fillStyle(0x000000, 0.75); this.hoverG.fillRect(-w / 2 - 2, 24, w + 4, 12);
      this.hoverG.fillStyle(0x8a1018, 1); this.hoverG.fillRect(-w / 2, 26, w * Math.max(0, tg.hp / tg.maxHp), 8);
    } else this.hoverCont.setVisible(false);
    // босс
    if (this.bossBar) {
      const b = this.bossBar.boss as any;
      if (!b.alive) { this.bossBar.cont.destroy(); this.bossBar = undefined; }
      else {
        const g = this.bossBar.g, w = 520;
        g.clear();
        g.fillStyle(0x000000, 0.8); g.fillRect(-w / 2 - 3, 30, w + 6, 18);
        g.fillStyle(0x5a0a10, 1); g.fillRect(-w / 2, 33, w, 12);
        g.fillStyle(b.invulnT > 0 ? 0xd9a65a : 0xc8202a, 1); g.fillRect(-w / 2, 33, w * Math.max(0, b.hp / b.maxHp), 12);
        g.fillStyle(0xffffff, 0.12); g.fillRect(-w / 2, 33, w * Math.max(0, b.hp / b.maxHp), 4);
        for (const m of [0.6, 0.25]) { g.fillStyle(0xd9a65a, 1); g.fillRect(-w / 2 + w * m - 1, 30, 2, 18); }
        this.bossBar.name.setText(`${b.displayName} — фаза ${b.phase}`);
      }
    }
    // всплывающие сообщения уплывают вверх
    this.toasts.forEach((t, i) => t.setY(this.scale.height * 0.24 + i * 30 * s));
    // субтитры гаснут
    if (this.subT > 0) { this.subT -= delta / 1000; this.subtitle.setAlpha(Math.min(1, this.subT)); }
    if (this.hurt.alpha > 0) this.hurt.setAlpha(Math.max(0, this.hurt.alpha - delta / 600));
    this.notEnoughT -= delta / 1000;
  }

  /** Мини-карта/карта: изометрическая проекция, маркеры героя, врагов, сундуков, портала. */
  private drawMinimap(box: Rect, zoom: number, g: Phaser.GameObjects.Graphics, img: Phaser.GameObjects.Image, whole = false) {
    const lv = this.gs.level, h = this.gs.hero;
    if (!lv) return;
    const z = zoom * this.s;
    const toMM = (x: number, y: number) => ({ x: (x - y) * 2 + lv.h * 2, y: x + y });
    const hp = toMM(h.x, h.y);
    let ox: number, oy: number;
    if (whole) { const tw = (lv.w + lv.h) * 2 * z, th = (lv.w + lv.h) * z; ox = box.x + (box.w - tw) / 2; oy = box.y + (box.h - th) / 2; }
    else { ox = box.x + box.w / 2 - hp.x * z; oy = box.y + box.h / 2 - hp.y * z; }
    img.setPosition(ox, oy).setScale(z);
    g.clear();
    const P = (x: number, y: number) => { const m = toMM(x, y); return { x: ox + m.x * z, y: oy + m.y * z }; };
    const explored = (x: number, y: number) => lv.explored[lv.idx(Math.floor(x), Math.floor(y))] === 1;
    for (const c of this.gs.chests) if (explored(c.x, c.y)) { const p = P(c.x, c.y); g.fillStyle(c.opened ? 0x6a5a40 : 0xd9a65a, 1); g.fillRect(p.x - 2 * z, p.y - 2 * z, 4 * z, 4 * z); }
    for (const e of this.gs.enemies) if (e.alive && e.sprite.visible) { const p = P(e.x, e.y); g.fillStyle(e.isBoss ? 0xff3a2a : e.isElite ? 0xffb040 : 0xc83030, 1); g.fillCircle(p.x, p.y, (e.isBoss ? 3.5 : e.isElite ? 2 : 1.3) * z); }
    if (this.gs.portal) { const p = P(this.gs.portal.x, this.gs.portal.y); g.lineStyle(2, this.gs.portal.locked ? 0x6a6070 : 0x9a6bff, 1); g.strokeCircle(p.x, p.y, 4 * z); }
    for (const n of this.gs.npcs) { const p = P(n.x, n.y); g.fillStyle(0x7fd88a, 1); g.fillCircle(p.x, p.y, 1.6 * z); }
    // цель задания — золотой ромб
    const qt = this.gs.questTarget();
    if (qt) { const p = P(qt.x, qt.y), k = 4 * z; g.fillStyle(0xffc04a, 1); g.fillTriangle(p.x, p.y - k, p.x + k, p.y, p.x - k, p.y); g.fillTriangle(p.x, p.y + k, p.x + k, p.y, p.x - k, p.y); }
    for (const l of this.gs.loot) if (l.item && l.item.rarity >= 2) { const p = P(l.x, l.y); g.fillStyle(RARITIES[l.item.rarity].color, 1); g.fillRect(p.x - z, p.y - z, 2 * z, 2 * z); }
    const p = P(h.x, h.y);
    g.fillStyle(0xffffff, 1); g.fillCircle(p.x, p.y, 2.2 * z);
    g.lineStyle(1, 0x000000, 1); g.strokeCircle(p.x, p.y, 2.2 * z);
  }

  // ─── Сообщения ─────────────────────────────────────────────────
  toast(text: string, color = '#e8d4b0', ms = 2200, size = 18) {
    const t = txt(this, this.scale.width / 2, this.scale.height * 0.24, text, size, color, { fontStyle: 'bold', stroke: '#000', strokeThickness: 4, align: 'center' }, this.s)
      .setOrigin(0.5).setScale(this.s).setDepth(5000);
    this.toasts.push(t);
    if (this.toasts.length > 5) this.toasts.shift()!.destroy();
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 500, onComplete: () => { t.destroy(); this.toasts = this.toasts.filter(x => x !== t); } });
  }

  notEnough(name: string) {
    if (this.notEnoughT > 0) return;
    this.notEnoughT = 1.2;
    this.toast(`Недостаточно: ${name}`, '#e05a5a', 900, 16);
  }

  showSubtitle(who: string, text: string) {
    if (!settings.subtitles) return;
    this.subtitle.setText(`${who}: «${text}»`);
    this.subT = 4.5;
  }

  hurtFlash(k: number) { this.hurt.setAlpha(Math.min(0.75, this.hurt.alpha + 0.15 + k * 2)); }

  private setBoss(b: Enemy | null) {
    if (this.bossBar) { this.bossBar.cont.destroy(); this.bossBar = undefined; }
    if (!b) return;
    const s = this.s;
    const cont = this.add.container(this.scale.width / 2, 12 * s).setScale(s);
    const g = this.add.graphics();
    const name = txt(this, 0, 0, b.displayName, 22, '#ffb080', { fontStyle: 'bold', stroke: '#000', strokeThickness: 5, fontFamily: FONT }, s).setOrigin(0.5, 0);
    cont.add([g, name]);
    this.bossBar = { cont, g, name, boss: b };
  }

  // ─── Проверка «курсор над интерфейсом» ────────────────────────
  isOverUI(x: number, y: number): boolean {
    if (this.anyModal()) return true;
    const inR = (r: Rect) => x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
    if (this.rects.some(inR)) return true;
    for (const k in this.panelRect) { const r = this.panelRect[k]; if (r && inR(r)) return true; }
    return false;
  }

  private anyModal() { return !!(this.panelCont.menu || this.panelCont.settings || this.panelCont.death || this.panelCont.map || this.panelCont.dialog); }

  // ─── Панели ────────────────────────────────────────────────────
  private closePanels() {
    for (const k of ['inventory', 'skills', 'journal'] as PanelId[]) { this.panelCont[k]?.destroy(); delete this.panelCont[k]; delete this.panelRect[k]; }
    this.openPanel = null; this.sel = null; this.hideTip();
  }

  togglePanel(id: PanelId) {
    if (this.anyModal()) return;
    const was = this.openPanel;
    this.closePanels();
    if (was === id) return;
    this.openPanel = id;
    Sfx.play('ui');
    if (id === 'inventory') this.buildInventory(); else if (id === 'journal') this.buildJournal(); else this.buildSkills();
  }

  // ─── Журнал заданий ────────────────────────────────────────────
  private buildJournal() {
    const W = 640, H = 470;
    const { c, sc } = this.panelFrame('journal', W, H, 'Журнал');
    const D = this.gs.heroData, step = questStep(D);
    let y = 64;
    if (step < QUEST_DONE) {
      const cur = STEPS[step];
      c.add(txt(this, 36, y, `Акт I · Пепелище у Ковен-Гейта`, 14, UI.textDim, {}, sc)); y += 24;
      c.add(txt(this, 36, y, cur.quest, 24, '#ffd88a', { fontStyle: 'bold' }, sc)); y += 36;
      c.add(txt(this, 36, y, '★ ' + goalText(D), 17, UI.text, { fontStyle: 'bold', wordWrap: { width: W - 72 } }, sc)); y += 34;
      const d = txt(this, 36, y, cur.desc, 15, '#c8b898', { wordWrap: { width: W - 72 }, lineSpacing: 3, fontStyle: 'italic' }, sc);
      c.add(d); y += d.height / sc + 22;
    } else {
      c.add(txt(this, 36, y, 'Пролог пройден', 24, '#ffd88a', { fontStyle: 'bold' }, sc)); y += 36;
      const d = txt(this, 36, y, 'Осколок Венца у Ориена. Колодец на севере ведёт всё глубже в Разломы: каждый Глашатай хранит новый осколок.', 15, '#c8b898', { wordWrap: { width: W - 72 }, lineSpacing: 3, fontStyle: 'italic' }, sc);
      c.add(d); y += d.height / sc + 22;
    }
    // выполненные задания: названия пройденных шагов, кроме текущего
    const cur = STEPS[step]?.quest;
    const list = [...new Set(STEPS.slice(0, step).map(q => q.quest))].filter(q => q !== cur);
    if (list.length) {
      c.add(txt(this, 36, y, 'Выполнено', 16, '#c8a878', { fontStyle: 'bold' }, sc)); y += 26;
      for (const q of list) { c.add(txt(this, 48, y, '✓ ' + q, 15, UI.textDim, {}, sc)); y += 22; }
    }
    c.add(txt(this, W / 2, H - 30, 'J — открыть или закрыть журнал', 13, UI.textDim, {}, sc).setOrigin(0.5, 0));
  }

  // ─── Диалог ────────────────────────────────────────────────────
  /** Реплики по одной: портрет, имя, текст. Клик, пробел или Enter — дальше. Игра на паузе. */
  showDialogue(lines: { who: string; text: string; portrait?: string }[], done?: () => void) {
    if (!lines.length) { done?.(); return; }
    this.closePanels();
    this.panelCont.dialog?.destroy();
    const W = this.scale.width, H = this.scale.height;
    const pw = 860, ph = 210;
    const sc = Math.min(this.s, (W * 0.96) / pw);
    const c = this.add.container(0, 0).setDepth(6500);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.25).setOrigin(0).setInteractive();
    const box = this.add.container((W - pw * sc) / 2, H - (ph + (this.touchMode ? 24 : 150)) * sc).setScale(sc);
    c.add([shade, box]);
    let i = 0;
    const keys = this.input.keyboard;
    const show = () => {
      box.removeAll(true);
      const l = lines[i];
      const hasP = !!l.portrait && this.textures.exists(l.portrait);
      box.add(panel(this, pw, ph, 0.96));
      const tx = hasP ? 196 : 36;
      if (hasP) {
        const img = this.add.image(26, 22, l.portrait!).setOrigin(0).setDisplaySize(150, 150);
        const fr = this.add.graphics(); fr.lineStyle(3, UI.border, 1); fr.strokeRect(26, 22, 150, 150);
        box.add([img, fr]);
      }
      box.add(txt(this, tx, 20, l.who, 22, '#ffc070', { fontStyle: 'bold' }, sc));
      box.add(txt(this, tx, 56, l.text, 18, UI.text, { wordWrap: { width: pw - tx - 36 }, lineSpacing: 4 }, sc));
      box.add(txt(this, pw - 24, ph - 30, i < lines.length - 1 ? 'Далее ▸  (клик / пробел)' : 'Закрыть ▸  (клик / пробел)', 14, UI.textDim, {}, sc).setOrigin(1, 0));
    };
    const next = () => {
      Sfx.play('ui');
      i++;
      if (i < lines.length) { show(); return; }
      keys?.off('keydown-SPACE', next); keys?.off('keydown-ENTER', next);
      c.destroy(); delete this.panelCont.dialog;
      this.gs.paused = false;
      done?.();
    };
    shade.on('pointerdown', next);
    keys?.on('keydown-SPACE', next); keys?.on('keydown-ENTER', next);
    show();
    this.panelCont.dialog = c;
    this.gs.paused = true;
  }

  private panelFrame(id: PanelId, w: number, h: number, ttl: string) {
    this.panelCont[id]?.destroy();
    const s = this.s, W = this.scale.width, H = this.scale.height;
    const sc = Math.min(s, (W * 0.96) / w, (H * 0.9) / h);
    const x = (W - w * sc) / 2, y = Math.max(8 * s, (H - h * sc) / 2 - 10 * s);
    const c = this.add.container(x, y).setScale(sc).setDepth(3000);
    const blocker = this.add.zone(0, 0, w, h).setOrigin(0).setInteractive();
    c.add([blocker, panel(this, w, h, 0.97), title(this, w / 2, 14, ttl, 26, sc)]);
    c.add(button(this, w - 46, 12, 32, 32, '✕', () => this.closePanels(), sc).cont);
    this.panelCont[id] = c;
    this.panelRect[id] = { x, y, w: w * sc, h: h * sc };
    return { c, sc };
  }

  private selItem(sel: Sel): Item | null {
    const D = this.gs.heroData;
    if (!sel) return null;
    return sel.where === 'bag' ? D.bag[sel.idx] : D.equip[sel.slot] || null;
  }

  buildInventory() {
    const D = this.gs.heroData, hero = this.gs.hero;
    const W = 900, H = 600;
    const { c, sc } = this.panelFrame('inventory', W, H, 'Снаряжение и сумка');
    const px = this.panelRect.inventory!.x, py = this.panelRect.inventory!.y;
    this.slotRects = [];
    const slotImg = (x: number, y: number, size: number, it: Item | null | undefined, sel: Exclude<Sel, null>, placeholder?: string) => {
      const fr = this.add.image(x, y, 'slot').setDisplaySize(size, size);
      c.add(fr);
      if (it) {
        const R = RARITIES[it.rarity];
        const col = settings.colorblind ? R.cbColor : R.color;
        const g = this.add.graphics(); g.fillStyle(col, 0.16); g.fillRect(x - size / 2 + 5, y - size / 2 + 5, size - 10, size - 10);
        g.lineStyle(2, col, 0.9); g.strokeRect(x - size / 2 + 5, y - size / 2 + 5, size - 10, size - 10);
        c.add(g);
        c.add(this.add.image(x, y, it.icon).setDisplaySize(size * 0.78, size * 0.78));
        if (settings.colorblind) c.add(txt(this, x - size / 2 + 8, y - size / 2 + 5, R.symbol, 13, hexStr(col), { stroke: '#000', strokeThickness: 3 }, sc));
        if (it.upgrade) c.add(txt(this, x + size / 2 - 6, y + size / 2 - 5, `+${it.upgrade}`, 13, '#ffd080', { fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }, sc).setOrigin(1, 1));
        if (sel.where === 'bag' && !canEquip(D, it)) c.add(this.add.rectangle(x, y, size - 10, size - 10, 0x400000, 0.35));
      } else if (placeholder) c.add(txt(this, x, y, placeholder, 11, UI.textDim, { align: 'center' }, sc).setOrigin(0.5));
      const isSel = this.sel && sel.where === this.sel.where && (sel.where === 'bag' ? sel.idx === (this.sel as any).idx : sel.slot === (this.sel as any).slot);
      if (isSel) { const g = this.add.graphics(); g.lineStyle(3, 0xffd080, 1); g.strokeRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4); c.add(g); }
      const r = { x: px + (x - size / 2) * sc, y: py + (y - size / 2) * sc, w: size * sc, h: size * sc };
      this.slotRects.push({ sel, r });
      const z = this.add.zone(x - size / 2, y - size / 2, size, size).setOrigin(0).setInteractive({ useHandCursor: !!it });
      z.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!it) { this.sel = null; this.buildInventory(); return; }
        this.drag = { from: sel, sx: p.x, sy: p.y, started: false, pid: p.id };
      });
      z.on('pointerover', () => { if (it && !this.drag?.started && !this.touchMode) this.showItemTip(it, sel, r); });
      z.on('pointerout', () => { if (!this.touchMode && !this.sel) this.hideTip(); });
      c.add(z);
    };

    // экипировка
    c.add(txt(this, 40, 58, 'Надето', 18, '#c8a878', { fontStyle: 'bold' }, sc));
    const pos: Record<Slot, [number, number]> = { helm: [170, 110], amulet: [280, 130], weapon: [60, 190], chest: [170, 190], ring: [280, 230], gloves: [60, 290], boots: [170, 290] };
    for (const sl of SLOTS) slotImg(pos[sl][0], pos[sl][1], 70, D.equip[sl], { where: 'equip', slot: sl }, SLOT_NAMES[sl]);
    // характеристики
    const st = hero.stats;
    const statLines = [
      `Урон/с (базовая атака): ${Math.round(dpsEstimate(D, st))}`,
      `Урон оружия: ${Math.round(st.dmgMin)}–${Math.round(st.dmgMax)}`,
      `Здоровье: ${Math.round(st.maxHp)}    Броня: ${Math.round(st.armor)}`,
      `Крит: ${Math.round(st.critChance * 100)}% (+${Math.round(st.critDmg * 100)}%)`,
      `Скорость атаки: +${Math.round(st.atkSpeed * 100)}%`,
      `Сопротивление: ${Math.round(st.resist * 100)}%   Вампиризм: ${Math.round(st.lifesteal * 100)}%`,
      `Сила ${Math.round(st.str)} · Ловк. ${Math.round(st.dex)} · Инт. ${Math.round(st.int)} · Жив. ${Math.round(st.vit)}`,
    ];
    const sets = setCounts(D);
    for (const set of SETS) if (sets[set.id]) {
      statLines.push(`${set.name} (${sets[set.id]}/6):`);
      for (const b of set.bonuses) statLines.push(`  ${sets[set.id] >= b.n ? '✓' : '·'} ${b.n}: ${b.desc}`);
    }
    c.add(txt(this, 30, 345, statLines.join('\n'), 14, UI.text, { lineSpacing: 4, wordWrap: { width: 310 } }, sc));

    // сумка 8×5
    c.add(txt(this, 360, 58, 'Сумка', 18, '#c8a878', { fontStyle: 'bold' }, sc));
    const gx = 360, gy = 88, cs = 60;
    for (let i = 0; i < BAG_SIZE; i++) {
      const x = gx + (i % 8) * cs + cs / 2, y = gy + Math.floor(i / 8) * cs + cs / 2;
      slotImg(x, y, cs - 2, D.bag[i], { where: 'bag', idx: i });
    }
    c.add(txt(this, 360, 400, `◉ ${D.gold} золота     ◆ ${D.shards} пепельных осколков     Зелья: ${D.potions}/5`, 15, '#d9a65a', {}, sc));

    // действия с выбранным предметом
    const it = this.selItem(this.sel);
    const by = 432;
    const act = (x: number, w: number, label: string, cb: () => void, enabled = true) => { const b = button(this, x, by, w, 36, label, () => { cb(); this.afterChange(); }, sc, 15); b.setEnabled(enabled); c.add(b.cont); };
    if (it && this.sel) {
      const inBag = this.sel.where === 'bag';
      act(360, 112, inBag ? 'Надеть' : 'Снять', () => { if (this.sel!.where === 'bag') equipFromBag(D, this.sel!.idx); else unequip(D, this.sel!.slot); this.sel = null; }, inBag ? canEquip(D, it) : D.bag.includes(null));
      act(478, 112, `Продать ${sellPrice(it)}`, () => { if (this.sel?.where === 'bag') { sellBag(D, this.sel.idx); Sfx.play('gold'); } this.sel = null; }, inBag);
      act(596, 116, `Разобрать +${salvageShards(it)}`, () => { if (this.sel?.where === 'bag') { salvageBag(D, this.sel.idx); Sfx.play('wall'); } this.sel = null; }, inBag);
      const cost = upgradeCost(it);
      act(718, 152, cost ? `Улучшить ${cost.gold}з/${cost.shards}о` : 'Максимум', () => { if (upgradeItem(D, it)) { Sfx.play('levelup'); this.toast(`${it.name} +${it.upgrade}`, '#ffd080'); } }, !!cost && D.gold >= cost.gold && D.shards >= cost.shards);
    } else c.add(txt(this, 360, by + 8, this.touchMode ? 'Коснитесь предмета, чтобы выбрать; перетащите в слот, чтобы надеть.' : 'Наведите — сравнение; клик — выбрать; двойной клик или перетаскивание — надеть.', 14, UI.textDim, { wordWrap: { width: 500 } }, sc));
    const junk = button(this, 360, 480, 200, 36, 'Продать хлам (обычн./необычн.)', () => { const g = sellJunk(D); if (g) { Sfx.play('gold'); this.toast(`+${g} золота`, '#d9a65a'); } this.afterChange(); }, sc, 13);
    c.add(junk.cont);
    c.add(txt(this, 360, 530, 'Торговец-призрак Ковен-Гейта следует за вами: продажа и разбор доступны в любом месте.', 13, UI.textDim, { wordWrap: { width: 500 } }, sc));
    if (it && this.sel && this.touchMode) {
      const r = this.slotRects.find(s => JSON.stringify(s.sel) === JSON.stringify(this.sel));
      if (r) this.showItemTip(it, this.sel, r.r);
    }
  }

  private afterChange() {
    this.gs.hero.recompute();
    this.gs.save();
    this.buildInventory();
  }

  private endDrag(p: Phaser.Input.Pointer) {
    const dr = this.drag!; this.drag = null;
    const D = this.gs.heroData;
    dr.ghost?.destroy();
    const target = this.slotRects.find(s => p.x >= s.r.x && p.x <= s.r.x + s.r.w && p.y >= s.r.y && p.y <= s.r.y + s.r.h);
    if (!dr.started) {
      // клик: выбор / двойной клик — надеть или снять
      const key = JSON.stringify(dr.from);
      const now = this.time.now;
      if (this.lastTap.key === key && now - this.lastTap.t < 350) {
        if (dr.from!.where === 'bag') equipFromBag(D, dr.from!.idx); else unequip(D, dr.from!.slot);
        this.sel = null; this.lastTap = { t: 0, key: '' };
        Sfx.play('pickup');
        this.afterChange();
        return;
      }
      this.lastTap = { t: now, key };
      this.sel = dr.from;
      this.buildInventory();
      return;
    }
    if (!target) return;
    const from = dr.from!, to = target.sel;
    if (from.where === 'bag' && to.where === 'bag') swapBag(D, from.idx, to.idx);
    else if (from.where === 'bag' && to.where === 'equip') { const it = D.bag[from.idx]; if (it && it.slot === to.slot) equipFromBag(D, from.idx); else this.toast('Не подходит в этот слот', '#e05a5a'); }
    else if (from.where === 'equip' && to.where === 'bag') unequip(D, from.slot, to.idx);
    Sfx.play('pickup');
    this.sel = null;
    this.afterChange();
  }

  /** Подсказка предмета со сравнением с надетым. */
  private showItemTip(it: Item, sel: Exclude<Sel, null>, r: Rect) {
    this.hideTip();
    const D = this.gs.heroData;
    const sc = this.s;
    const R = RARITIES[it.rarity];
    const col = hexStr(settings.colorblind ? R.cbColor : R.color);
    const lines: { t: string; c: string; size?: number }[] = [];
    lines.push({ t: (settings.colorblind ? R.symbol + ' ' : '') + it.name + (it.upgrade ? ` +${it.upgrade}` : ''), c: col, size: 18 });
    lines.push({ t: `${R.name} · ${SLOT_NAMES[it.slot]} · ур. предмета ${it.ilvl}`, c: UI.textDim });
    if (it.slot === 'weapon' && !canEquip(D, it)) lines.push({ t: 'Не подходит вашему классу', c: UI.bad });
    const stats = itemStats(it);
    if (stats.dmgMin !== undefined) lines.push({ t: `Урон: ${Math.round(stats.dmgMin)}–${Math.round(stats.dmgMax ?? 0)}`, c: '#f0e6d8', size: 16 });
    for (const [k, v] of Object.entries(it.implicit) as [StatKey, number][]) if (k !== 'dmgMin' && k !== 'dmgMax') lines.push({ t: fmtStat(k, v * (1 + it.upgrade * 0.1)), c: '#c8c0b0' });
    for (const a of it.affixes) lines.push({ t: fmtStat(a.stat, a.val * (1 + it.upgrade * 0.1)), c: '#8fb8ff' });
    for (const pid of [it.power, it.power2]) if (pid) { const pw = POWERS.find(x => x.id === pid)!; lines.push({ t: '✦ ' + pw.desc, c: '#ff9a4a' }); }
    if (it.setId) { const set = SETS.find(s => s.id === it.setId)!; lines.push({ t: `Сет «${set.name}»`, c: '#5ee07a' }); for (const b of set.bonuses) lines.push({ t: `  (${b.n}) ${b.desc}`, c: '#5ea87a' }); }
    lines.push({ t: `Цена: ${sellPrice(it)} зол. · Разбор: ${salvageShards(it)} оск.`, c: UI.textDim });
    // сравнение
    if (sel.where === 'bag') {
      const cur = D.equip[it.slot];
      const a = itemStats(it), b = cur ? itemStats(cur) : {};
      const keys = new Set([...Object.keys(a), ...Object.keys(b)] as StatKey[]);
      const diff: { t: string; c: string }[] = [];
      for (const k of keys) {
        const dv = (a[k] || 0) - (b[k] || 0);
        if (Math.abs(dv) < 1e-3) continue;
        diff.push({ t: fmtStat(k, dv), c: dv > 0 ? UI.good : UI.bad });
      }
      // изменение урона в секунду
      if (canEquip(D, it)) {
        const before = dpsEstimate(D, computeStats(D));
        const prev = D.equip[it.slot]; D.equip[it.slot] = it;
        const after = dpsEstimate(D, computeStats(D));
        if (prev) D.equip[it.slot] = prev; else delete D.equip[it.slot];
        const dd = after - before;
        diff.unshift({ t: `Урон/с: ${dd >= 0 ? '+' : ''}${Math.round(dd)}`, c: dd >= 0 ? UI.good : UI.bad });
      }
      lines.push({ t: cur ? `— В сравнении с «${cur.name}»:` : '— Слот пуст:', c: '#c8a878' });
      lines.push(...diff.slice(0, 9));
    }
    const W = 330;
    const c = this.add.container(0, 0).setScale(sc).setDepth(15000);
    let y = 12;
    const texts: Phaser.GameObjects.Text[] = [];
    for (const l of lines) { const t = txt(this, 14, y, l.t, l.size ?? 14, l.c, { wordWrap: { width: W - 28 }, fontStyle: l.size ? 'bold' : '' }, sc); texts.push(t); y += t.height + 3; }
    const H = y + 10;
    c.add(panel(this, W, H, 0.97)); c.add(texts);
    // позиция: справа от слота, или слева, если не помещается
    let x = r.x + r.w + 8 * sc; let yy = r.y;
    if (x + W * sc > this.scale.width) x = r.x - W * sc - 8 * sc;
    if (x < 0) x = 4;
    if (yy + H * sc > this.scale.height) yy = this.scale.height - H * sc - 4;
    c.setPosition(x, Math.max(4, yy));
    this.tip = c;
  }

  private showSkillTip(i: number, x: number, y: number) {
    const h = this.gs.hero; if (!h) return;
    this.hideTip();
    const sc = this.s;
    let name: string, desc: string, meta: string;
    if (i < 3) { const sk = SKILLS[h.cls.skills[i]]; const rank = h.data.skillRanks[sk.id] || 1; name = `${sk.name} (ранг ${rank})`; desc = skillDesc(sk, rank); meta = `${h.cls.resource.name}: ${sk.cost} · Перезарядка: ${sk.cooldown} с`; }
    else if (i === 3) { name = 'Уклонение'; desc = 'Кувырок с неуязвимостью: проходит сквозь атаки и кольца пламени.'; meta = 'Перезарядка: 2,4 с'; }
    else { name = 'Зелье исцеления'; desc = 'Восстанавливает 45% здоровья за 0,6 с. Пополняется с врагов и между этажами.'; meta = `Осталось: ${h.data.potions}/5`; }
    const W = 300;
    const c = this.add.container(0, 0).setScale(sc).setDepth(15000);
    const t1 = txt(this, 14, 12, name, 17, '#ffd080', { fontStyle: 'bold' }, sc);
    const t2 = txt(this, 14, 12 + t1.height + 4, desc, 14, UI.text, { wordWrap: { width: W - 28 } }, sc);
    const t3 = txt(this, 14, t2.y + t2.height + 6, meta, 13, UI.textDim, {}, sc);
    const H = t3.y + t3.height + 12;
    c.add([panel(this, W, H, 0.97), t1, t2, t3]);
    c.setPosition(clamp(x - W * sc / 2, 4, this.scale.width - W * sc - 4), y - H * sc - 8 * sc);
    this.tip = c;
  }

  private hideTip() { this.tip?.destroy(); this.tip = undefined; }

  buildSkills() {
    const D = this.gs.heroData, hero = this.gs.hero, cls = hero.cls;
    const W = 720, H = 600;
    const { c, sc } = this.panelFrame('skills', W, H, 'Навыки и таланты');
    c.add(txt(this, 36, 56, `${cls.name} · ${cls.role} · свободные очки: ${D.points}`, 16, D.points ? '#ffd080' : UI.textDim, { fontStyle: 'bold' }, sc));
    const all = [cls.basic, ...cls.skills];
    const keys = ['ЛКМ', ...(settings.scheme === 'wasd' ? ['Q / ПКМ', 'E', 'R'] : ['Q / ПКМ', 'W', 'E'])];
    all.forEach((id, i) => {
      const sk = SKILLS[id]; const rank = D.skillRanks[id] || 1;
      const y = 90 + i * 92;
      c.add(this.add.image(36 + 34, y + 34, 'skillslot').setDisplaySize(72, 72));
      c.add(this.add.image(36 + 34, y + 34, sk.icon).setDisplaySize(60, 60));
      c.add(txt(this, 120, y, `${sk.name}  [${keys[i]}]`, 18, '#e8d4b0', { fontStyle: 'bold' }, sc));
      c.add(txt(this, 120, y + 24, skillDesc(sk, rank), 14, UI.text, { wordWrap: { width: 470 } }, sc));
      c.add(txt(this, 120, y + 62, `Ранг ${rank}/${MAX_SKILL_RANK}${sk.cost ? ` · ${cls.resource.name} ${sk.cost}` : ''}${sk.cooldown ? ` · ${sk.cooldown} с` : ''}`, 13, UI.textDim, {}, sc));
      const b = button(this, W - 80, y + 18, 44, 36, '+', () => { if (rankUp(D, id)) { Sfx.play('levelup'); hero.recompute(); this.gs.save(); } this.buildSkills(); }, sc, 20);
      b.setEnabled(D.points > 0 && rank < MAX_SKILL_RANK); c.add(b.cont);
    });
    c.add(txt(this, 36, 462, 'Пассивные таланты', 18, '#c8a878', { fontStyle: 'bold' }, sc));
    cls.talents.forEach((t, i) => {
      const x = 36 + i * 222, y = 492;
      const r = D.talents[t.id] || 0;
      c.add(txt(this, x, y, `${t.name} ${r}/${t.max}`, 15, r ? '#ffd080' : UI.text, { fontStyle: 'bold' }, sc));
      c.add(txt(this, x, y + 22, t.desc, 13, UI.textDim, { wordWrap: { width: 160 } }, sc));
      const b = button(this, x + 168, y, 34, 30, '+', () => { if (talentUp(D, t.id)) { Sfx.play('levelup'); hero.recompute(); this.gs.save(); } this.buildSkills(); }, sc, 18);
      b.setEnabled(D.points > 0 && r < t.max); c.add(b.cont);
    });
    c.add(txt(this, 36, H - 34, 'Полные деревья: 3 ветки × 12 умений на класс — в GDD (раздел 5).', 12, UI.textDim, {}, sc));
  }

  toggleMap() {
    if (this.panelCont.map) { this.panelCont.map.destroy(); delete this.panelCont.map; this.gs.paused = false; return; }
    if (this.panelCont.menu || this.panelCont.death) return;
    const W = this.scale.width, H = this.scale.height, s = this.s;
    const c = this.add.container(0, 0).setDepth(4000);
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.78).setOrigin(0).setInteractive();
    bg.on('pointerdown', () => this.toggleMap());
    const img = this.add.image(0, 0, 'minimap').setOrigin(0).setAlpha(0.95);
    const g = this.add.graphics();
    c.add([bg, img, g]);
    const lv = this.gs.level;
    const box = { x: W * 0.06, y: H * 0.1, w: W * 0.88, h: H * 0.8 };
    const zoom = Math.min(box.w / ((lv.w + lv.h) * 2), box.h / (lv.w + lv.h)) / s;
    this.drawMinimap(box, zoom, g, img, true);
    c.add(title(this, W / 2, 12 * s, this.gs.floorTitle, 24, s).setScale(s));
    c.add(txt(this, W / 2, H - 40 * s, '● вы   ● враги   ■ сундуки   ○ портал Разлома · M / Tab — закрыть', 15, UI.textDim, {}, s).setOrigin(0.5).setScale(s));
    this.panelCont.map = c;
    this.gs.paused = true;
  }

  toggleMenu() {
    if (this.panelCont.settings) { this.panelCont.settings.destroy(); delete this.panelCont.settings; return; }
    if (this.panelCont.map) return this.toggleMap();
    if (this.openPanel) { this.closePanels(); return; }
    if (this.panelCont.menu) { this.panelCont.menu.destroy(); delete this.panelCont.menu; this.gs.paused = false; return; }
    if (this.panelCont.death) return;
    const s = this.s, W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(6000);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    const pw = 360, ph = 330;
    const inner = this.add.container((W - pw * s) / 2, (H - ph * s) / 2).setScale(s);
    inner.add(panel(this, pw, ph));
    inner.add(title(this, pw / 2, 18, 'Пауза', 28, s));
    const D = this.gs.heroData;
    inner.add(txt(this, pw / 2, 62, `Глубина ${D.depth} · рекорд ${D.bestDepth} · убито ${D.kills}`, 14, UI.textDim, {}, s).setOrigin(0.5, 0));
    inner.add(button(this, 50, 96, 260, 44, 'Продолжить', () => this.toggleMenu(), s).cont);
    inner.add(button(this, 50, 152, 260, 44, 'Настройки', () => {
      this.panelCont.settings = settingsPanel(this, W / 2, H / 2, Math.min(s, H * 0.92 / 560), () => { delete this.panelCont.settings; });
    }, s).cont);
    inner.add(button(this, 50, 208, 260, 44, 'Сохранить и выйти', () => {
      this.gs.save();
      this.scene.stop('Game');
      this.scene.start('Menu');
    }, s).cont);
    inner.add(txt(this, pw / 2, 272, 'Прогресс сохраняется автоматически', 13, UI.textDim, {}, s).setOrigin(0.5, 0));
    c.add(inner);
    this.panelCont.menu = c;
    this.gs.paused = true;
  }

  showDeath(lostGold: number) {
    const s = this.s, W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(7000);
    c.add(this.add.rectangle(0, 0, W, H, 0x200000, 0.55).setOrigin(0).setInteractive());
    c.add(title(this, W / 2, H * 0.32, 'ВЫ ПАЛИ', 56, s).setScale(s).setColor('#c8313a'));
    c.add(txt(this, W / 2, H * 0.32 + 80 * s, `Пепел забрал ${lostGold} золота. Снаряжение и опыт сохранены.`, 18, UI.text, {}, s).setOrigin(0.5).setScale(s));
    const b = button(this, 0, 0, 280, 48, 'Восстать у алтаря', () => { c.destroy(); delete this.panelCont.death; this.gs.respawn(); }, s, 19);
    b.cont.setPosition(W / 2 - 140 * s, H * 0.32 + 120 * s).setScale(s);
    c.add(b.cont);
    this.panelCont.death = c;
  }
}

export type { StatKey };
export { STAT_INFO };
