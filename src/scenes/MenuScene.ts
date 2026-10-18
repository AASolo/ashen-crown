// Главное меню: продолжить, новая игра (выбор класса и сложности), настройки, управление, галерея, лор.
import Phaser from 'phaser';
import { SHEETS } from '../art';
import { UI, FONT_TITLE } from '../config';
import { Sfx } from '../core/Sfx';
import { Music } from '../core/Music';
import { txt, title, panel, button, settingsPanel } from '../ui/widgets';
import { CLASSES, CLASS_ORDER, type ClassId } from '../data/classes';
import { SKILLS } from '../data/skills';
import { DIFFICULTIES } from '../data/enemies';
import { SaveSystem } from '../systems/Save';
import { newHero } from '../systems/HeroData';
import { clamp } from '../core/iso';
import { bus, EV } from '../core/events';

const LORE = `Вельдмар сгорел не в один день. Сначала погасли маяки на побережье, потом — очаги в деревнях. Говорят, всё началось, когда король Эдрен надел древний Пепельный Венец, чтобы вернуть умирающее солнце.

Солнце вернулось — но пустым. Чёрный диск с бледной короной висит над Обсидиановым Престолом, и из разломов под землёй сочится тьма. Мёртвые встают пеплом, звери становятся тенью, а жрецы нового солнца поют ему гимны в затопленных катакомбах.

Вы — одна из последних искр. Спуститесь в Разломы, сразите Глашатаев Пустого Солнца и найдите путь к Венцу, пока свет не захлебнулся окончательно.`;

export class MenuScene extends Phaser.Scene {
  private s = 1;
  private layer?: Phaser.GameObjects.Container;
  private chosen: ClassId = 'blade';
  private difficulty = 0;
  private confirmNew = false;
  private modal?: Phaser.GameObjects.Container;

  constructor() { super('Menu'); }

  create() {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', () => Sfx.unlock());
    Music.play('menu');
    this.build();
    this.scale.on('resize', () => this.build());
    const onSet = () => this.build();
    bus.on(EV.SETTINGS, onSet);
    this.events.once('shutdown', () => { this.scale.off('resize'); bus.off(EV.SETTINGS, onSet); });
  }

  private build(screen: 'main' | 'class' = 'main') {
    this.layer?.destroy(true); this.modal?.destroy(true); this.modal = undefined;
    const W = this.scale.width, H = this.scale.height;
    this.s = clamp(Math.min(W / 1280, H / 720), 0.45, 4);
    const s = this.s;
    const L = this.add.container(0, 0);
    this.layer = L;
    // фон «cover»
    const bg = this.add.image(W / 2, H / 2, 'menu_bg');
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    L.add(bg);
    const ash = this.add.particles(0, 0, 'p_ash', {
      x: { min: 0, max: W }, y: -20, lifespan: 9000, speedY: { min: 30 * s, max: 90 * s }, speedX: { min: -40 * s, max: 10 * s },
      scale: { min: 0.4 * s, max: 1.2 * s }, alpha: { start: 0.7, end: 0 }, frequency: 60, rotate: { min: 0, max: 360 }, tint: [0x8a827a, 0xff7a2a, 0x6a625a],
    });
    L.add(ash);
    if (screen === 'main') this.buildMain(L); else this.buildClassSelect(L);
  }

  private buildMain(L: Phaser.GameObjects.Container) {
    const W = this.scale.width, H = this.scale.height;
    // на вертикальном экране телефона масштаб берём по ширине, иначе меню выходит мелким
    const s = H > W ? clamp(W / 680, 0.45, 4) : this.s;
    // слева: название и пункты меню с подсказками; справа: ключевой арт и портреты героев
    const x0 = 64 * s;
    const t1 = txt(this, x0, 46 * s, 'ASHEN CROWN', 76, '#f6e2bc', { fontFamily: FONT_TITLE, fontStyle: 'bold', stroke: '#2a1206', strokeThickness: 6 }, s).setScale(s);
    t1.setPadding(20, 16, 20, 16).setShadow(0, 0, '#ff7a2a', 18, true, true).setX(x0 - 20 * s);
    const t2 = txt(this, x0, 136 * s, 'ECHOES OF THE HOLLOW SUN', 22, '#f0b070', { fontFamily: FONT_TITLE, fontStyle: 'bold', stroke: '#1a0a06', strokeThickness: 4, letterSpacing: 3 } as Phaser.Types.GameObjects.Text.TextStyle, s).setScale(s);
    const t3 = txt(this, x0, 166 * s, 'Пепельный Венец: Эхо Пустого Солнца', 20, '#e0cbb0', { fontStyle: 'italic', stroke: '#000', strokeThickness: 4 }, s).setScale(s);
    L.add([t1, t2, t3]);
    const save = SaveSystem.load();
    const items: [string, string, () => void][] = [];
    if (save) {
      const where = save.depth === 0 ? 'лагерь у Ковен-Гейта' : `Разлом, глубина ${save.depth}`;
      items.push(['Продолжить', `${CLASSES[save.classId].name}, ур. ${save.level} · ${where}`, () => this.startGame(save)]);
    }
    items.push(['Новая игра', 'Выбрать героя и начать историю', () => this.build('class')]);
    items.push(['Настройки', 'Звук, графика, интерфейс', () => { this.modal = settingsPanel(this, W / 2, H / 2, Math.min(s, H * 0.92 / 560), () => { this.modal = undefined; }); }]);
    items.push(['Как играть', 'Управление и подсказки', () => this.showText('Как играть', CONTROLS)]);
    items.push(['Мир Вельдмара', 'С чего всё началось', () => this.showText('Вельдмар', LORE)]);
    const bw = 430, bh = 64;
    items.forEach(([label, hint, cb], i) => {
      const b = button(this, 0, 0, bw, bh, '', cb, s);
      // тёплый тон каменных кнопок под закатный фон
      for (const o of b.cont.list) if (o instanceof Phaser.GameObjects.NineSlice) o.setTint(0xffd2a8);
      b.cont.add(txt(this, 46, 9, label, i === 0 ? 24 : 22, i === 0 ? '#ffd88a' : '#f0e0c8', { fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }, s));
      b.cont.add(txt(this, 46, 38, hint, 15, '#ead8bc', { stroke: '#000', strokeThickness: 2 }, s));
      b.cont.setPosition(x0, (232 + i * (bh + 12)) * s).setScale(s);
      L.add(b.cont);
    });
    // портреты героев: клик — сразу к выбору этого героя
    const cw = 132, ch = 168, gap = 14;
    const rowW = CLASS_ORDER.length * cw + (CLASS_ORDER.length - 1) * gap;
    const rx = H > W ? (W - rowW * s) / 2 : W - (rowW + 48) * s, ry = H - (ch + 74) * s;
    L.add(txt(this, rx + rowW * s / 2, ry - 34 * s, 'Четыре героя · нажмите, чтобы выбрать', 15, '#f0d8b0', { fontStyle: 'italic', stroke: '#000', strokeThickness: 3 }, s).setOrigin(0.5, 0).setScale(s));
    CLASS_ORDER.forEach((id, i) => {
      const c = CLASSES[id];
      const card = this.add.container(rx + (i * (cw + gap) + cw / 2) * s, ry + ch / 2 * s).setScale(s);
      const glow = this.add.image(0, 0, 'glow').setTint(c.resource.color).setScale(2.2, 2.6).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);
      const frame = this.add.graphics();
      frame.fillStyle(0x0a0606, 0.85); frame.fillRect(-cw / 2 - 4, -ch / 2 - 4, cw + 8, ch + 34);
      frame.lineStyle(2, UI.border, 1); frame.strokeRect(-cw / 2 - 4, -ch / 2 - 4, cw + 8, ch + 34);
      const key = this.textures.exists(`portrait_${id}`) ? `portrait_${id}` : null;
      const pic = key ? this.add.image(0, -14, key).setDisplaySize(cw, cw) : this.add.sprite(0, 30, `hero_${id}`, 0).setScale(0.9 / (SHEETS[`hero_${id}`].scale ?? 1));
      const name = txt(this, 0, ch / 2 - 22, c.name, 15, '#f0e0c8', { fontStyle: 'bold', stroke: '#000', strokeThickness: 3, align: 'center', wordWrap: { width: cw } }, s).setOrigin(0.5, 0);
      const role = txt(this, 0, ch / 2 + 2, c.role.split('·')[0].trim(), 12, '#c89a6a', {}, s).setOrigin(0.5, 0);
      card.add([glow, frame, pic, name, role]);
      const z = this.add.zone(0, 8, cw + 8, ch + 34).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => { card.setScale(s * 1.05); glow.setAlpha(0.45); });
      z.on('pointerout', () => { card.setScale(s); glow.setAlpha(0.18); });
      z.on('pointerdown', () => { Sfx.unlock(); Sfx.play('ui'); this.chosen = id; this.build('class'); });
      card.add(z);
      L.add(card);
    });
    const gal = txt(this, W - 16 * s, H - 12 * s, 'Галерея ассетов ›', 13, '#c8b49a', { stroke: '#000', strokeThickness: 3 }, s).setOrigin(1, 1).setScale(s).setInteractive({ useHandCursor: true });
    gal.on('pointerdown', () => this.scene.start('Gallery'));
    L.add(gal);
    L.add(txt(this, 16 * s, H - 12 * s, H > W ? 'v0.2 · авторы в CREDITS.md' : 'Прототип v0.2 · графика: FLARE · музыка: FLARE, Ancient Beast, 0 A.D. · авторы в CREDITS.md', 12, '#a89480', { stroke: '#000', strokeThickness: 2 }, s).setOrigin(0, 1).setScale(s));
  }

  private buildClassSelect(L: Phaser.GameObjects.Container) {
    const W = this.scale.width, H = this.scale.height;
    const cardW = 290, cardH = 500, gap = 16;
    // на вертикальном экране карточки встают сеткой 2×2
    const cols = H > W ? 2 : 4, rows = 4 / cols;
    const totalW = cardW * cols + gap * (cols - 1), totalH = cardH * rows + gap * (rows - 1);
    const s = Math.min(this.s, (W * 0.97) / totalW, (H * 0.97) / (totalH + 262 + (4 / cols - 1) * 46));
    L.add(title(this, W / 2, 16 * s, 'Выберите героя', 40, s).setScale(s));
    const x0 = (W - totalW * s) / 2, y0 = 80 * s;
    CLASS_ORDER.forEach((id, i) => {
      const c = CLASSES[id];
      const card = this.add.container(x0 + (i % cols) * (cardW + gap) * s, y0 + Math.floor(i / cols) * (cardH + gap) * s).setScale(s);
      const sel = this.chosen === id;
      card.add(panel(this, cardW, cardH, sel ? 0.97 : 0.85));
      if (sel) { const g = this.add.graphics(); g.lineStyle(3, 0xff8a3a, 1); g.strokeRect(2, 2, cardW - 4, cardH - 4); card.add(g); }
      // большой портрет маслом (FLARE) во всю ширину карточки; фигурка героя в игре стоит перед ним справа внизу
      const P = cardW - 28;
      const hasPortrait = this.textures.exists(`portrait_${id}`);
      if (hasPortrait) card.add(this.add.image(cardW / 2, 14 + P / 2, `portrait_${id}`).setDisplaySize(P, P).setAlpha(sel ? 1 : 0.85));
      const fx = hasPortrait ? cardW - 50 : cardW / 2, fy = hasPortrait ? 14 + P - 6 : 200, fs = hasPortrait ? 1.0 : 1.05;
      const glow = this.add.image(fx, fy - 50, 'glow').setTint(c.resource.color).setAlpha(sel ? 0.5 : 0.22).setScale(1.3, 1.4).setBlendMode(Phaser.BlendModes.ADD);
      const sh = this.add.image(fx, fy - 4, 'shadow').setScale(1.4 * fs);
      const spr = this.add.sprite(fx, fy, `hero_${id}`, 0).setOrigin(0.5, SHEETS[`hero_${id}`].footY / SHEETS[`hero_${id}`].fh).setScale(fs / (SHEETS[`hero_${id}`].scale ?? 1));
      spr.play(sel ? `hero_${id}_walk_S` : `hero_${id}_idle_S`);
      card.add([glow, sh, spr]);
      const ty = 14 + P + 8;
      card.add(title(this, cardW / 2, ty, c.name, 23, s));
      card.add(txt(this, cardW / 2, ty + 32, c.role, 14, '#c89a6a', { fontStyle: 'bold' }, s).setOrigin(0.5, 0));
      card.add(txt(this, 18, ty + 56, c.desc, 13, UI.text, { wordWrap: { width: cardW - 36 }, lineSpacing: 1 }, s));
      const skills = [c.basic, ...c.skills].map(k => SKILLS[k].name).join(' · ');
      card.add(txt(this, 18, ty + 126, `Ресурс: ${c.resource.name}\n${skills}`, 12, '#b8a58a', { lineSpacing: 2, wordWrap: { width: cardW - 36 } }, s));
      const z = this.add.zone(0, 0, cardW, cardH).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { Sfx.unlock(); Sfx.play('ui'); this.chosen = id; this.confirmNew = false; this.build('class'); });
      card.add(z);
      L.add(card);
    });
    // сложность
    const dy = y0 + (totalH + 18) * s;
    L.add(txt(this, W / 2, dy, 'Сложность', 18, '#c8a878', { fontStyle: 'bold' }, s).setOrigin(0.5, 0).setScale(s));
    const dw = 220, ex = (4 / cols - 1) * 46;  // лишняя строка кнопок сложности на телефоне
    DIFFICULTIES.forEach((d, i) => {
      const b = button(this, 0, 0, dw, 38, (this.difficulty === i ? '◆ ' : '') + d.name, () => { this.difficulty = i; this.build('class'); }, s, 16);
      b.cont.setPosition(W / 2 + ((i % cols) - cols / 2) * (dw + 10) * s + 5 * s, dy + (28 + Math.floor(i / cols) * 46) * s).setScale(s);
      L.add(b.cont);
    });
    const D = DIFFICULTIES[this.difficulty];
    L.add(txt(this, W / 2, dy + (74 + ex) * s, `Здоровье врагов ×${D.hp}, урон ×${D.dmg}, добыча ×${D.loot}, опыт ×${D.xp}`, 14, UI.textDim, {}, s).setOrigin(0.5, 0).setScale(s));
    const hasSave = SaveSystem.exists();
    const start = button(this, 0, 0, 300, 48, this.confirmNew ? 'Точно? Старый герой исчезнет' : 'Начать путь', () => {
      if (hasSave && !this.confirmNew) { this.confirmNew = true; this.build('class'); return; }
      const hero = newHero(this.chosen, this.difficulty);
      SaveSystem.save(hero);
      this.startGame(hero);
    }, s, 18);
    start.cont.setPosition(W / 2 + 10 * s, dy + (104 + ex) * s).setScale(s);
    const back = button(this, 0, 0, 160, 48, 'Назад', () => { this.confirmNew = false; this.build('main'); }, s, 18);
    back.cont.setPosition(W / 2 - 180 * s, dy + (104 + ex) * s).setScale(s);
    L.add([start.cont, back.cont]);
  }

  private showText(head: string, body: string) {
    const W = this.scale.width, H = this.scale.height;
    const pw = 720, ph = 520;
    const s = Math.min(this.s, W * 0.95 / pw, H * 0.95 / ph);
    const c = this.add.container((W - pw * s) / 2, (H - ph * s) / 2).setScale(s);
    c.add(this.add.zone(0, 0, pw, ph).setOrigin(0).setInteractive());
    c.add(panel(this, pw, ph));
    c.add(title(this, pw / 2, 18, head, 30, s));
    c.add(txt(this, 36, 70, body, 16, UI.text, { wordWrap: { width: pw - 72 }, lineSpacing: 5 }, s));
    c.add(button(this, pw / 2 - 100, ph - 64, 200, 42, 'Закрыть', () => { c.destroy(); this.modal = undefined; }, s).cont);
    this.modal = c;
  }

  private startGame(hero: ReturnType<typeof newHero>) {
    Sfx.unlock();
    Sfx.play('portal');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { hero }));
  }
}

const CONTROLS = `Мышь + клавиатура (схема «Классика»):
  ЛКМ — идти / атаковать цель · удерживать — бежать за курсором
  Shift + ЛКМ — атака на месте · ПКМ — основной навык (Q)
  Q W E — навыки · Пробел — уклонение · R — зелье
  I или C — сумка · K — навыки · M или Tab — карта · Esc — пауза

Схема «WASD» (Настройки → Схема управления):
  WASD — движение · Q E R — навыки · F — зелье · мышь — прицел

Геймпад: левый стик — движение, A — атака ближайшей цели,
  X / Y / B — навыки, RB — уклонение, LB — зелье, Start — пауза.

Телефон / планшет: левый джойстик, справа — атака, три навыка,
  уклонение и зелье. Навыки наводятся на ближайшего врага.`;
