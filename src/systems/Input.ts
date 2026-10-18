// Единая система ввода: клавиатура (две схемы), мышь, геймпад и сенсорный экран
// сводятся в один набор «намерений» на кадр. Игровая логика не знает, откуда пришла команда.
import Phaser from 'phaser';
import { settings, isTouchUI } from './Settings';

export interface Intents {
  move: { x: number; y: number };     // экранное направление (x вправо, y вниз), длина 0..1
  attackHeld: boolean;                // стрелять/бить по ближайшей цели (геймпад/тач)
  skills: [boolean, boolean, boolean];// нажатия в этом кадре
  dodge: boolean;
  potion: boolean;
  inventory: boolean; skillsPanel: boolean; map: boolean; menu: boolean; journal: boolean;
  shift: boolean;                     // атака на месте
  autoAim: boolean;                   // целиться автоматически (тач/геймпад)
}

/** Сенсорное состояние: заполняется интерфейсом (виртуальный джойстик и кнопки). */
export const touch = {
  joyX: 0, joyY: 0,
  attack: false,
  skills: [false, false, false] as [boolean, boolean, boolean],
  dodge: false, potion: false,
  usedRecently: 0,
};

export class InputController {
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private prevPad: boolean[] = [];
  lastDevice: 'mouse' | 'pad' | 'touch' = 'mouse';

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const names = ['W', 'A', 'S', 'D', 'Q', 'E', 'R', 'F', 'I', 'K', 'M', 'C', 'J', 'TAB', 'ESC', 'SPACE', 'SHIFT', 'ONE', 'TWO', 'THREE', 'FOUR', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
    for (const n of names) this.keys[n] = kb.addKey(n, true, false);
  }

  private down(n: string) { return this.keys[n]?.isDown; }
  private hit(n: string) { const k = this.keys[n]; return !!k && Phaser.Input.Keyboard.JustDown(k); }

  poll(): Intents {
    const wasd = settings.scheme === 'wasd';
    const it: Intents = {
      move: { x: 0, y: 0 }, attackHeld: false, skills: [false, false, false], dodge: false, potion: false,
      inventory: false, skillsPanel: false, map: false, menu: false, journal: false, shift: !!this.down('SHIFT'), autoAim: false,
    };
    // клавиатура: стрелки всегда, WASD — во второй схеме
    let mx = 0, my = 0;
    if (this.down('LEFT') || (wasd && this.down('A'))) mx -= 1;
    if (this.down('RIGHT') || (wasd && this.down('D'))) mx += 1;
    if (this.down('UP') || (wasd && this.down('W'))) my -= 1;
    if (this.down('DOWN') || (wasd && this.down('S'))) my += 1;
    if (mx || my) { const l = Math.hypot(mx, my); it.move = { x: mx / l, y: my / l }; this.lastDevice = 'mouse'; }

    // навыки: классика — Q W E, зелье R; WASD — Q E R, зелье F. Цифры 1–3 и 4 работают всегда.
    const sk = wasd ? ['Q', 'E', 'R'] : ['Q', 'W', 'E'];
    it.skills = [this.hit(sk[0]) || this.hit('ONE'), this.hit(sk[1]) || this.hit('TWO'), this.hit(sk[2]) || this.hit('THREE')];
    it.potion = this.hit(wasd ? 'F' : 'R') || this.hit('FOUR');
    it.dodge = this.hit('SPACE');
    it.inventory = this.hit('I') || this.hit('C');
    it.skillsPanel = this.hit('K');
    it.map = this.hit('M') || this.hit('TAB');
    it.journal = this.hit('J');
    it.menu = this.hit('ESC');

    // геймпад
    const pad = this.scene.input.gamepad?.total ? this.scene.input.gamepad.getPad(0) : null;
    if (pad) {
      const lx = pad.leftStick.x, ly = pad.leftStick.y;
      if (Math.hypot(lx, ly) > 0.22) { it.move = { x: lx, y: ly }; this.lastDevice = 'pad'; }
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const edge = (i: number) => { const now = b(i); const was = this.prevPad[i]; this.prevPad[i] = now; return now && !was; };
      if (b(0)) { it.attackHeld = true; this.lastDevice = 'pad'; }  // A — атака
      if (edge(2)) it.skills[0] = true;                               // X
      if (edge(3)) it.skills[1] = true;                               // Y
      if (edge(1)) it.skills[2] = true;                               // B
      if (edge(5) || edge(7)) it.dodge = true;                        // RB / RT
      if (edge(4) || edge(6)) it.potion = true;                       // LB / LT
      if (edge(8)) it.inventory = true;                               // Back
      if (edge(9)) it.menu = true;                                    // Start
      if (edge(12)) it.map = true;                                    // крестовина вверх
      for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) if (this.prevPad[i] === undefined) this.prevPad[i] = b(i);
    }

    // сенсор
    if (touch.joyX || touch.joyY) { it.move = { x: touch.joyX, y: touch.joyY }; this.lastDevice = 'touch'; }
    if (touch.attack) { it.attackHeld = true; this.lastDevice = 'touch'; }
    touch.skills.forEach((v, i) => { if (v) { it.skills[i] = true; touch.skills[i] = false; if (isTouchUI()) this.lastDevice = 'touch'; } });
    if (touch.dodge) { it.dodge = true; touch.dodge = false; }
    if (touch.potion) { it.potion = true; touch.potion = false; }

    it.autoAim = this.lastDevice !== 'mouse';
    return it;
  }
}
