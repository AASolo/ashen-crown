// Эффекты, снаряды, элементы интерфейса и фон главного меню.
import { RNG } from '../core/rng';
import { makeCanvas, hex, glow, poly, fillShape, shade, mix, hollowSunSigil, type Ctx } from './canvas';

export function drawGlow(size = 128): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}

/** Маска света для «стирания» темноты: мягкий круг. */
export function drawLightMask(): HTMLCanvasElement {
  const s = 256;
  const [c, ctx] = makeCanvas(s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  return c;
}

export function drawShadow(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 48);
  const g = ctx.createRadialGradient(48, 24, 0, 48, 24, 46);
  g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(0.6, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.scale(1, 0.5); ctx.translate(0, 24); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(48, 24, 46, 0, 7); ctx.fill(); ctx.restore();
  return c;
}

export function drawParticle(kind: 'spark' | 'ember' | 'smoke' | 'ash' | 'blood' | 'dot' | 'shard'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(32, 32);
  const r = new RNG(kind.length);
  switch (kind) {
    case 'spark': glow(ctx, 16, 16, 15, 0xffffff, 1); break;
    case 'dot': ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16, 16, 6, 0, 7); ctx.fill(); break;
    case 'ember': glow(ctx, 16, 16, 10, 0xffc080, 1); ctx.fillStyle = '#fff6e0'; ctx.fillRect(14, 14, 4, 4); break;
    case 'smoke': {
      for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,255,255,${0.12 + r.next() * 0.1})`; ctx.beginPath(); ctx.arc(16 + r.range(-6, 6), 16 + r.range(-6, 6), r.range(5, 10), 0, 7); ctx.fill(); }
      break;
    }
    case 'ash': ctx.fillStyle = '#d8d0c8'; poly(ctx, [10, 14, 20, 10, 22, 18, 12, 21]); ctx.fill(); break;
    case 'blood': ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(16, 16, 5, 7, 0.4, 0, 7); ctx.fill(); break;
    case 'shard': ctx.fillStyle = '#ffffff'; poly(ctx, [16, 4, 22, 16, 16, 28, 10, 16]); ctx.fill(); break;
  }
  return c;
}

/** Дуга удара (белая, тонируется в коде). */
export function drawSlash(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 128);
  ctx.save(); ctx.translate(128, 120);
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + i * 0.07})`;
    ctx.lineWidth = 22 - i * 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, 110 - i, 100 - i * 1.5, 0, Math.PI * 1.08 + i * 0.03, Math.PI * 1.92 - i * 0.01); ctx.stroke();
  }
  ctx.restore();
  return c;
}

export function drawRing(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 256);
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.1 + i * 0.1})`; ctx.lineWidth = 16 - i * 2;
    ctx.beginPath(); ctx.arc(128, 128, 112, 0, 7); ctx.stroke();
  }
  return c;
}

export function drawProjectile(kind: 'spark' | 'fireball' | 'arrow' | 'dagger' | 'void' | 'wispbolt'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 48);
  ctx.save();
  if (kind === 'arrow' || kind === 'dagger') {
    // направлены вправо, вращаются в коде
    ctx.strokeStyle = hex(0x0a0808); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(14, 24); ctx.lineTo(80, 24); ctx.stroke();
    ctx.strokeStyle = hex(kind === 'arrow' ? 0x6a5040 : 0x8a9aa4); ctx.lineWidth = 3; ctx.stroke();
    poly(ctx, [92, 24, 76, 17, 76, 31]); ctx.fillStyle = hex(0xd8e0e8); ctx.fill();
    if (kind === 'arrow') { ctx.fillStyle = hex(0x2a3a44); poly(ctx, [14, 24, 4, 16, 22, 24, 4, 32]); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hex(0x4fc6e0, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(70, 24); ctx.stroke();
  } else {
    const col = { spark: 0xff7a2a, fireball: 0xff4a10, void: 0x9a6bff, wispbolt: 0xffa040 }[kind];
    ctx.globalCompositeOperation = 'lighter';
    // хвост
    for (let i = 0; i < 8; i++) glow(ctx, 70 - i * 7, 24, (kind === 'fireball' ? 18 : 11) - i, col, 0.45 - i * 0.04);
    glow(ctx, 70, 24, kind === 'fireball' ? 22 : 14, col, 1);
    glow(ctx, 70, 24, kind === 'fireball' ? 9 : 5, 0xffffff, 1);
    if (kind === 'void') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = hex(0x050208); ctx.beginPath(); ctx.arc(70, 24, 5, 0, 7); ctx.fill(); }
  }
  ctx.restore();
  return c;
}

// ─── Интерфейс ───────────────────────────────────────────────────
/** Рамка сферы здоровья/ресурса: кованое железо с готическими шипами. */
export function drawOrbFrame(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 256);
  const cx = 128, cy = 128;
  // шипы
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    poly(ctx, [-10, -104, 0, -126, 10, -104]); fillShape(ctx, 0x4a3a2c, -126, -104, 0x0a0706, 3, 0.3, -0.3);
    ctx.restore();
  }
  ctx.lineWidth = 22; ctx.strokeStyle = hex(0x0a0706); ctx.beginPath(); ctx.arc(cx, cy, 100, 0, 7); ctx.stroke();
  const g = ctx.createLinearGradient(0, 20, 0, 236); g.addColorStop(0, hex(0x8a6a48)); g.addColorStop(0.5, hex(0x4a3828)); g.addColorStop(1, hex(0x2a1c12));
  ctx.lineWidth = 14; ctx.strokeStyle = g; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = hex(0xc8a070, 0.5); ctx.beginPath(); ctx.arc(cx, cy, 106, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  // заклёпки
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillStyle = hex(0xa8865a); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100, 3, 0, 7); ctx.fill(); }
  return c;
}

/** Жидкость сферы (белая с объёмом — тонируется цветом ресурса). */
export function drawOrbLiquid(color: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(192, 192);
  ctx.beginPath(); ctx.arc(96, 96, 92, 0, 7); ctx.clip();
  const g = ctx.createRadialGradient(70, 60, 10, 96, 96, 100);
  g.addColorStop(0, hex(shade(color, 0.35))); g.addColorStop(0.5, hex(color)); g.addColorStop(1, hex(shade(color, -0.65)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 192, 192);
  // завихрения
  const r = new RNG(color & 255);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { ctx.strokeStyle = hex(shade(color, 0.3), 0.12); ctx.lineWidth = r.range(4, 12); ctx.beginPath(); ctx.arc(r.range(30, 160), r.range(30, 160), r.range(20, 60), r.range(0, 6), r.range(0, 6) + 1.5); ctx.stroke(); }
  return c;
}

export function drawOrbGlass(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(192, 192);
  ctx.beginPath(); ctx.arc(96, 96, 92, 0, 7); ctx.clip();
  const g = ctx.createRadialGradient(96, 96, 60, 96, 96, 96); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 192, 192);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(70, 52, 34, 18, -0.5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(62, 46, 12, 6, -0.5, 0, 7); ctx.fill();
  return c;
}

/** Ячейка инвентаря / кнопка навыка. */
export function drawSlot(kind: 'slot' | 'skill'): HTMLCanvasElement {
  const s = 128;
  const [c, ctx] = makeCanvas(s, s);
  ctx.fillStyle = hex(kind === 'skill' ? 0x0a0708 : 0x110d0e); ctx.fillRect(10, 10, s - 20, s - 20);
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 80); g.addColorStop(0, 'rgba(60,40,30,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(10, 10, s - 20, s - 20);
  ctx.lineWidth = 8; ctx.strokeStyle = hex(0x0a0706); ctx.strokeRect(6, 6, s - 12, s - 12);
  const b = ctx.createLinearGradient(0, 0, s, s); b.addColorStop(0, hex(0x8a6a48)); b.addColorStop(1, hex(0x3a2818));
  ctx.lineWidth = 5; ctx.strokeStyle = b; ctx.strokeRect(6, 6, s - 12, s - 12);
  // уголки
  for (const [x, y] of [[6, 6], [s - 6, 6], [6, s - 6], [s - 6, s - 6]]) {
    poly(ctx, [x, y - 10, x + 10, y, x, y + 10, x - 10, y]); fillShape(ctx, 0xa8865a, y - 10, y + 10, 0x0a0706, 2, 0.3, -0.3);
  }
  return c;
}

/** Готический орнамент-разделитель для панелей. */
export function drawOrnament(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(512, 40);
  const g = ctx.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, 'rgba(110,79,51,0)'); g.addColorStop(0.5, hex(0xb08a5a)); g.addColorStop(1, 'rgba(110,79,51,0)');
  ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(512, 20); ctx.stroke();
  poly(ctx, [256, 4, 272, 20, 256, 36, 240, 20]); fillShape(ctx, 0x6e4f33, 4, 36, 0x0a0706, 2, 0.4, -0.3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 256, 20, 10, 0xff7a2a, 0.8); ctx.restore();
  for (const dx of [-40, 40]) { poly(ctx, [256 + dx, 14, 262 + dx, 20, 256 + dx, 26, 250 + dx, 20]); ctx.fillStyle = hex(0x8a6a48); ctx.fill(); }
  return c;
}

/** Фон главного меню: разрушенный собор в пепельной буре, чёрное солнце, силуэт героя с клинками. */
export function drawMenuBackground(w = 1920, h = 1080): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  const r = new RNG(1337);
  // небо
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  // закатное пепельное небо: светлее у горизонта, чтобы меню читалось и не тонуло в черноте
  sky.addColorStop(0, '#2b1d2e'); sky.addColorStop(0.35, '#6a2e2a'); sky.addColorStop(0.6, '#c8643a'); sky.addColorStop(0.72, '#f0a060'); sky.addColorStop(1, '#2a1610');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  // чёрное солнце
  const sx = w * 0.68, sy = h * 0.3;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(ctx, sx, sy, 520, 0xff5a1a, 0.35); glow(ctx, sx, sy, 260, 0xf0c080, 0.55);
  for (let i = 0; i < 60; i++) {
    const a = r.range(0, Math.PI * 2), l = r.range(170, 340);
    ctx.strokeStyle = hex(0xf0c080, r.range(0.04, 0.14)); ctx.lineWidth = r.range(2, 8);
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 150, sy + Math.sin(a) * 150); ctx.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#020102'; ctx.beginPath(); ctx.arc(sx, sy, 150, 0, 7); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hex(0xffe0b0, 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 152, 0, 7); ctx.stroke(); ctx.restore();
  // дальние руины
  ctx.fillStyle = '#4a261c';
  ctx.beginPath(); ctx.moveTo(0, h * 0.72);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * 0.72 - r.range(0, 60) - (r.chance(0.12) ? r.range(60, 160) : 0));
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  // собор: шпили, стрельчатые арки, разбитая роза
  const cath = (x0: number, scale: number, col: string) => {
    ctx.fillStyle = col;
    const base = h * 0.86;
    const tower = (x: number, tw: number, th: number) => {
      ctx.beginPath(); ctx.moveTo(x - tw / 2, base); ctx.lineTo(x - tw / 2, base - th); ctx.lineTo(x, base - th - tw * 1.6); ctx.lineTo(x + tw / 2, base - th); ctx.lineTo(x + tw / 2, base); ctx.closePath(); ctx.fill();
      // зубцы-«обломки» на шпиле
      for (let k = 0; k < 4; k++) { ctx.fillRect(x - tw / 2 - 6, base - th + k * th / 4, 6, 12); ctx.fillRect(x + tw / 2, base - th + k * th / 4 + 20, 6, 12); }
    };
    tower(x0 - 220 * scale, 70 * scale, 380 * scale);
    tower(x0 + 220 * scale, 70 * scale, 300 * scale); // обломанная башня ниже
    // неф
    ctx.beginPath(); ctx.moveTo(x0 - 190 * scale, base); ctx.lineTo(x0 - 190 * scale, base - 260 * scale); ctx.lineTo(x0, base - 380 * scale); ctx.lineTo(x0 + 120 * scale, base - 300 * scale); ctx.lineTo(x0 + 150 * scale, base - 330 * scale); ctx.lineTo(x0 + 190 * scale, base - 240 * scale); ctx.lineTo(x0 + 190 * scale, base); ctx.closePath(); ctx.fill();
  };
  cath(w * 0.68, 1.15, '#24130e');
  // окно-роза с тлеющим светом
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const rx = w * 0.68, ry = h * 0.86 - 250 * 1.15;
  glow(ctx, rx, ry, 120, 0xff5a1a, 0.5);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(rx, ry, 62, 0, 7); ctx.clip();
  ctx.fillStyle = '#3a1208'; ctx.fillRect(rx - 70, ry - 70, 140, 140);
  ctx.globalCompositeOperation = 'lighter'; hollowSunSigil(ctx, rx, ry, 40, hex(0xff8a3a, 0.9), 5);
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#24130e'; poly(ctx, [rx + 10, ry - 70, rx + 70, ry - 10, rx + 70, ry - 70]); ctx.fill();
  ctx.restore();
  // стрельчатые окна
  for (const dx of [-120, -60, 60, 120]) {
    const x = rx + dx * 1.15, y = h * 0.86 - 160;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 34, 0xff5a1a, 0.4); ctx.restore();
    ctx.fillStyle = '#2a0d06'; ctx.beginPath(); ctx.moveTo(x - 12, y + 40); ctx.lineTo(x - 12, y - 10); ctx.quadraticCurveTo(x, y - 34, x + 12, y - 10); ctx.lineTo(x + 12, y + 40); ctx.closePath(); ctx.fill();
  }
  // земля
  const ground = ctx.createLinearGradient(0, h * 0.84, 0, h);
  ground.addColorStop(0, '#2a1810'); ground.addColorStop(1, '#0e0806');
  ctx.fillStyle = ground; ctx.fillRect(0, h * 0.85, w, h * 0.15);
  // силуэт героя с двумя клинками (спиной к зрителю, смотрит на собор)
  const hx = w * 0.68, hy = h * 0.97;
  ctx.fillStyle = '#0a0504';
  ctx.beginPath();
  ctx.moveTo(hx - 34, hy); ctx.lineTo(hx - 26, hy - 90); ctx.lineTo(hx - 46, hy - 150); ctx.lineTo(hx - 30, hy - 200);
  ctx.quadraticCurveTo(hx, hy - 250, hx + 30, hy - 200); ctx.lineTo(hx + 46, hy - 150); ctx.lineTo(hx + 26, hy - 90); ctx.lineTo(hx + 34, hy); ctx.closePath(); ctx.fill();
  // плащ на ветру
  ctx.beginPath(); ctx.moveTo(hx - 30, hy - 190); ctx.quadraticCurveTo(hx - 120, hy - 120, hx - 150, hy - 40); ctx.lineTo(hx - 110, hy - 60); ctx.lineTo(hx - 120, hy - 20); ctx.quadraticCurveTo(hx - 60, hy - 80, hx - 30, hy - 100); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(hx, hy - 228, 22, 0, 7); ctx.fill();
  // клинки
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(hx + k * 44, hy - 150); ctx.quadraticCurveTo(hx + k * 110, hy - 110, hx + k * 120, hy - 30); ctx.quadraticCurveTo(hx + k * 96, hy - 100, hx + k * 40, hy - 140); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hex(0xff7a2a, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx + k * 48, hy - 146); ctx.quadraticCurveTo(hx + k * 108, hy - 108, hx + k * 118, hy - 34); ctx.stroke(); ctx.restore();
  }
  // пепельная буря
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 1400; i++) {
    const x = r.next() * w, y = r.next() * h;
    const ember = r.chance(0.12);
    ctx.fillStyle = ember ? hex(mix(0xff5a1a, 0xffc080, r.next()), r.range(0.4, 0.9)) : hex(0xb8aca0, r.range(0.05, 0.25));
    const s = r.range(1, ember ? 3 : 4);
    ctx.fillRect(x, y, s * 2.2, s * 0.8);
  }
  ctx.restore();
  // туман и виньетка
  for (let i = 0; i < 5; i++) {
    const fy = h * (0.7 + i * 0.06);
    const fg = ctx.createLinearGradient(0, fy - 60, 0, fy + 60);
    fg.addColorStop(0, 'rgba(220,140,90,0)'); fg.addColorStop(0.5, 'rgba(220,140,90,0.10)'); fg.addColorStop(1, 'rgba(220,140,90,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, fy - 60, w, 120);
  }
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  // левая треть чуть темнее: на ней заголовок и кнопки
  const lg = ctx.createLinearGradient(0, 0, w * 0.5, 0);
  lg.addColorStop(0, 'rgba(12,6,6,0.55)'); lg.addColorStop(1, 'rgba(12,6,6,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, w * 0.5, h);
  return c;
}

/** Затемнение экрана по краям (виньетка) для игровой сцены. */
export function drawVignette(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(512, 512);
  const g = ctx.createRadialGradient(256, 256, 120, 256, 256, 362);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  return c;
}

export type { Ctx };
