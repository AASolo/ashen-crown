// Процедурные тайлы и пропсы двух регионов: «Затонувшие Катакомбы» и «Пепельные Пустоши».
// Всё рисуется в 2× (ART) и выводится с масштабом 0.5.
import { RNG } from '../core/rng';
import { ART, TILE_W, TILE_H, WALL_H } from '../config';
import { makeCanvas, hex, mix, shade, diamondPath, poly, glow, speckle, crack, fillShape, hollowSunSigil, type Ctx } from './canvas';

const TW = TILE_W * ART, TH = TILE_H * ART, WH = WALL_H * ART;

export interface ThemePalette {
  floor: number[]; grout: number; wallL: number; wallR: number; wallTop: number; mortar: number;
  accent: number;     // свечение (биолюминесценция / тлеющие угли)
  moss: number;
}

export const PALETTES: Record<'catacombs' | 'ashlands', ThemePalette> = {
  catacombs: {
    floor: [0x2f2e37, 0x34323c, 0x2a2a31, 0x302d33, 0x2c2f36], grout: 0x141318,
    wallL: 0x403c47, wallR: 0x2a2730, wallTop: 0x4a4652, mortar: 0x16141a, accent: 0x3fe0c4, moss: 0x1d4a44,
  },
  ashlands: {
    floor: [0x3b302a, 0x40342c, 0x352c27, 0x3e3530, 0x372f2b], grout: 0x1a1412,
    wallL: 0x544a40, wallR: 0x3a322c, wallTop: 0x5d5248, mortar: 0x1e1814, accent: 0xff7a2a, moss: 0x4b4038,
  },
};

// ─── Пол ─────────────────────────────────────────────────────────
export function drawFloor(theme: 'catacombs' | 'ashlands', variant: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(TW, TH);
  const r = new RNG(1000 + variant * 31 + (theme === 'ashlands' ? 500 : 0));
  const P = PALETTES[theme];
  ctx.save();
  diamondPath(ctx, TW / 2, 0, TW, TH); ctx.clip();
  ctx.fillStyle = hex(P.grout); ctx.fillRect(0, 0, TW, TH);

  if (theme === 'catacombs') {
    // каменные плиты 2×2 (или одна большая на вариантах 4–5)
    const n = variant >= 4 ? 1 : 2;
    const sw = TW / n, sh = TH / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = TW / 2 + (i - j) * sw / 2, y = (i + j) * sh / 2;
      const col = shade(r.pick(P.floor), r.range(-0.08, 0.08));
      diamondPath(ctx, x, y + 2, sw - 6, sh - 3);
      const g = ctx.createLinearGradient(x - sw / 2, y, x + sw / 2, y + sh);
      g.addColorStop(0, hex(shade(col, 0.12))); g.addColorStop(1, hex(shade(col, -0.18)));
      ctx.fillStyle = g; ctx.fill();
      // фаска: светлый верхний край
      ctx.strokeStyle = hex(shade(col, 0.25), 0.5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - sw / 2 + 4, y + sh / 2 + 1); ctx.lineTo(x, y + 3); ctx.lineTo(x + sw / 2 - 4, y + sh / 2 + 1); ctx.stroke();
    }
    speckle(ctx, r, 0, 0, TW, TH, 160, [0x0e0d11, 0x45424c, 0x24232a], [1, 2.5], 0.55);
    if (variant === 1 || variant === 3) crack(ctx, r, r.range(30, 90), r.range(18, 40), 50, r.range(0, 6), hex(0x0b0a0d, 0.9), 1.6);
    if (variant === 2 || variant === 5) {
      // мох с биолюминесценцией
      for (let k = 0; k < 5; k++) {
        const x = r.range(25, 100), y = r.range(16, 48);
        ctx.fillStyle = hex(P.moss, 0.6); ctx.beginPath(); ctx.ellipse(x, y, r.range(6, 14), r.range(3, 6), 0, 0, Math.PI * 2); ctx.fill();
      }
      for (let k = 0; k < 14; k++) { ctx.fillStyle = hex(P.accent, r.range(0.25, 0.7)); ctx.fillRect(r.range(20, 108), r.range(12, 52), 1.5, 1.5); }
    }
    if (variant === 3) {
      // влага: тёмная плёнка с бликом
      ctx.fillStyle = hex(0x0e1a22, 0.45); ctx.beginPath(); ctx.ellipse(64, 34, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hex(0x6fb7c8, 0.18); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(60, 31, 20, 5, 0, Math.PI, Math.PI * 1.8); ctx.stroke();
    }
  } else {
    // выжженная земля: пятна пепла, трещины, редкие угли
    const base = r.pick(P.floor);
    const g = ctx.createLinearGradient(0, 0, TW, TH);
    g.addColorStop(0, hex(shade(base, 0.08))); g.addColorStop(1, hex(shade(base, -0.12)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, TW, TH);
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = hex(r.pick([0x6d6660, 0x57504a, 0x2a221e]), r.range(0.15, 0.35));
      ctx.beginPath(); ctx.ellipse(r.range(10, 118), r.range(6, 58), r.range(8, 24), r.range(4, 10), 0, 0, Math.PI * 2); ctx.fill();
    }
    speckle(ctx, r, 0, 0, TW, TH, 220, [0x151110, 0x7b736b, 0x4a3f37], [1, 2.5], 0.5);
    if (variant === 4 || variant === 5) {
      // старая брусчатка дороги
      for (let k = 0; k < 18; k++) {
        const x = r.range(10, 118), y = r.range(8, 56);
        ctx.fillStyle = hex(shade(0x4a443f, r.range(-0.15, 0.1)));
        ctx.beginPath(); ctx.ellipse(x, y, r.range(6, 10), r.range(3, 5), 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hex(0x141010, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    if (variant === 1 || variant === 3) {
      crack(ctx, r, r.range(30, 90), r.range(20, 40), 60, r.range(0, 6), hex(0x120c0a), 2.4);
      if (variant === 3) crack(ctx, r, r.range(40, 80), r.range(24, 36), 40, r.range(0, 6), hex(P.accent, 0.55), 1.2);
    }
    if (variant === 2) for (let k = 0; k < 6; k++) glow(ctx, r.range(20, 108), r.range(14, 50), 3, 0xff6a20, 0.8);
  }
  ctx.restore();
  return c;
}

// ─── Стены ───────────────────────────────────────────────────────
/** Стеновой блок: верхняя грань + две боковые с кладкой. variant 9 — трещиноватая стена тайника. */
export function drawWall(theme: 'catacombs' | 'ashlands', variant: number): HTMLCanvasElement {
  const H = TH + WH;
  const [c, ctx] = makeCanvas(TW, H);
  const r = new RNG(2000 + variant * 17 + (theme === 'ashlands' ? 900 : 0));
  const P = PALETTES[theme];
  const ruined = theme === 'ashlands';
  // высота «обломанного» верха для руин
  const topCut = ruined ? r.int(0, 3) * 10 : 0;
  const top = topCut;

  // Левая грань: (0, TH/2) → (TW/2, TH) → (TW/2, H) → (0, H - TH/2)
  const face = (side: 'L' | 'R') => {
    ctx.save();
    if (side === 'L') poly(ctx, [0, TH / 2 + top, TW / 2, TH + top, TW / 2, H, 0, H - TH / 2]);
    else poly(ctx, [TW / 2, TH + top, TW, TH / 2 + top, TW, H - TH / 2, TW / 2, H]);
    ctx.clip();
    const baseCol = side === 'L' ? P.wallL : P.wallR;
    ctx.fillStyle = hex(P.mortar); ctx.fillRect(0, 0, TW, H);
    const rowH = 16;
    const rows = Math.ceil((WH + TH) / rowH) + 2;
    for (let k = 0; k < rows; k++) {
      const off = (k % 2) * 11;
      for (let bx = -off; bx < TW / 2; bx += 22) {
        const x0 = Math.max(0, bx), x1 = Math.min(TW / 2, bx + 22);
        if (x1 - x0 < 3) continue;
        const X0 = side === 'L' ? x0 : TW / 2 + x0, X1 = side === 'L' ? x1 : TW / 2 + x1;
        const yAt = (X: number) => side === 'L' ? TH / 2 + X / 2 : TH + (TW / 2 - X) / 2 + 0; // наклон грани
        const yb = top + k * rowH;
        const col = shade(baseCol, r.range(-0.12, 0.1));
        poly(ctx, [X0 + 1.5, yAt(X0) + yb + 1.5, X1 - 1.5, yAt(X1) + yb + 1.5, X1 - 1.5, yAt(X1) + yb + rowH - 1.5, X0 + 1.5, yAt(X0) + yb + rowH - 1.5]);
        ctx.fillStyle = hex(col); ctx.fill();
        // верхний блик кирпича
        ctx.strokeStyle = hex(shade(col, 0.2), 0.5); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X0 + 2, yAt(X0) + yb + 2); ctx.lineTo(X1 - 2, yAt(X1) + yb + 2); ctx.stroke();
      }
    }
    speckle(ctx, r, 0, 0, TW, H, 140, [0x0c0b0e, shade(baseCol, 0.25)], [1, 2], 0.5);
    // затенение у пола (ambient occlusion) и сверху вниз
    const g = ctx.createLinearGradient(0, TH, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, TW, H);
    if (side === 'R') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, TW, H); }
    ctx.restore();
  };
  face('L'); face('R');

  // Верхняя грань
  diamondPath(ctx, TW / 2, top, TW, TH);
  fillShape(ctx, P.wallTop, top, top + TH, 0x0a090c, 2, 0.1, -0.25);
  ctx.save(); diamondPath(ctx, TW / 2, top, TW, TH); ctx.clip();
  speckle(ctx, r, 0, top, TW, TH, 60, [0x16141a, shade(P.wallTop, 0.2)], [1, 3], 0.6);
  if (ruined) for (let k = 0; k < 4; k++) { ctx.fillStyle = hex(0x6d6660, 0.35); ctx.beginPath(); ctx.ellipse(r.range(30, 98), top + r.range(16, 46), r.range(6, 14), r.range(3, 6), 0, 0, 7); ctx.fill(); }
  ctx.restore();
  // Ребро между гранями
  ctx.strokeStyle = hex(shade(P.wallL, 0.25), 0.6); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(TW / 2, TH + top); ctx.lineTo(TW / 2, H); ctx.stroke();

  // Варианты
  if (variant === 1 || variant === 4) {
    // потёки (катакомбы — светящиеся бирюзовые, пустоши — копоть)
    for (let k = 0; k < 4; k++) {
      const x = r.range(6, TW - 6); const y = TH + top + r.range(0, 20);
      const len = r.range(30, 90);
      const col = ruined ? 0x0d0a09 : P.moss;
      ctx.strokeStyle = hex(col, 0.7); ctx.lineWidth = r.range(2, 5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r.range(-3, 3), y + len); ctx.stroke();
      if (!ruined) { ctx.fillStyle = hex(P.accent, 0.6); ctx.fillRect(x - 1, y + len - 2, 2, 2); }
    }
  }
  if (variant === 2 && !ruined) {
    // оккультная руна со слабым свечением
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    hollowSunSigil(ctx, TW * 0.27, TH + 50, 13, hex(P.accent, 0.55), 1.6);
    ctx.restore();
  }
  if (variant === 3 && ruined) {
    // обугленная балка
    ctx.strokeStyle = hex(0x1a120e); ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, TH / 2 + top + 30); ctx.lineTo(TW / 2 - 4, TH + top + 46); ctx.stroke();
    ctx.strokeStyle = hex(0xff6a20, 0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(18, TH / 2 + top + 33); ctx.lineTo(TW / 2 - 12, TH + top + 46); ctx.stroke();
  }
  if (variant === 9) {
    // трещиноватая стена: светящиеся разломы — подсказка игроку, что её можно сломать
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) crack(ctx, r, r.range(20, 108), TH + r.range(30, 70), 70, Math.PI / 2 + r.range(-0.6, 0.6), hex(0xff8a3a, 0.75), 2.2, 3);
    glow(ctx, TW / 2, TH + 70, 40, 0xff6a20, 0.25);
    ctx.restore();
  }
  return c;
}

// ─── Пропсы ──────────────────────────────────────────────────────
export function drawPillar(theme: 'catacombs' | 'ashlands'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(128, 220);
  const r = new RNG(77);
  const P = PALETTES[theme];
  const cx = 64, base = 196;
  // основание
  diamondPath(ctx, cx, base - 26, 84, 42); fillShape(ctx, shade(P.wallTop, -0.1), base - 26, base + 16);
  // ствол колонны
  const top = 46 + r.int(0, 10);
  ctx.beginPath();
  ctx.moveTo(cx - 24, base - 8); ctx.lineTo(cx - 22, top + 10);
  // обломанный верх
  ctx.lineTo(cx - 14, top + 2); ctx.lineTo(cx - 6, top + 12); ctx.lineTo(cx + 4, top - 4); ctx.lineTo(cx + 12, top + 8); ctx.lineTo(cx + 22, top + 4);
  ctx.lineTo(cx + 24, base - 8); ctx.closePath();
  const g = ctx.createLinearGradient(cx - 24, 0, cx + 24, 0);
  g.addColorStop(0, hex(shade(P.wallL, 0.15))); g.addColorStop(0.45, hex(P.wallL)); g.addColorStop(1, hex(shade(P.wallR, -0.2)));
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hex(0x09080a); ctx.lineWidth = 3; ctx.stroke();
  // каннелюры
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (const dx of [-12, -2, 9]) { ctx.beginPath(); ctx.moveTo(cx + dx, top + 16); ctx.lineTo(cx + dx, base - 12); ctx.stroke(); }
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 24, top, 48, base - top); ctx.clip();
  speckle(ctx, r, cx - 24, top, 48, base - top, 90, [0x0c0b0e, shade(P.wallL, 0.3)], [1, 2], 0.5);
  if (theme === 'catacombs') { ctx.fillStyle = hex(P.moss, 0.6); ctx.fillRect(cx - 24, base - 40, 48, 30); for (let k = 0; k < 8; k++) { ctx.fillStyle = hex(P.accent, 0.6); ctx.fillRect(cx - 20 + r.next() * 40, base - 38 + r.next() * 26, 1.5, 1.5); } }
  ctx.restore();
  return c;
}

export function drawTree(variant: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 260);
  const r = new RNG(300 + variant);
  const branch = (x: number, y: number, len: number, ang: number, w: number, depth: number) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    ctx.strokeStyle = hex(0x0d0908); ctx.lineWidth = w + 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + x2) / 2 + r.range(-8, 8), (y + y2) / 2, x2, y2); ctx.stroke();
    ctx.strokeStyle = hex(mix(0x2a201b, 0x4a3d34, r.next() * 0.4)); ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + x2) / 2 + r.range(-8, 8), (y + y2) / 2, x2, y2); ctx.stroke();
    if (depth > 0) {
      const n = r.int(2, 3);
      for (let i = 0; i < n; i++) branch(x2, y2, len * r.range(0.55, 0.75), ang + r.range(-0.8, 0.8), w * 0.62, depth - 1);
    }
  };
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(90, 238, 34, 13, 0, 0, 7); ctx.fill();
  branch(90, 240, 70, -Math.PI / 2 + r.range(-0.15, 0.15), 15, 4);
  // тлеющие трещины в стволе
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  crack(ctx, r, 88, 230, 50, -Math.PI / 2, hex(0xff6a20, 0.6), 1.4, 1);
  ctx.restore();
  return c;
}

export function drawGrave(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 120);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(48, 104, 30, 11, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(26, 104); ctx.lineTo(26, 44); ctx.quadraticCurveTo(48, 14, 70, 44); ctx.lineTo(70, 104); ctx.closePath();
  fillShape(ctx, 0x5b544d, 20, 104);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(48, 46); ctx.lineTo(48, 80); ctx.moveTo(38, 58); ctx.lineTo(58, 58); ctx.stroke();
  ctx.fillStyle = hex(0x6d6660, 0.5); ctx.fillRect(26, 40, 44, 5);
  return c;
}

export function drawBrazier(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(80, 110);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(40, 100, 22, 8, 0, 0, 7); ctx.fill();
  // треножник
  for (const [x1, x2] of [[26, 16], [54, 64], [40, 40]]) { ctx.strokeStyle = hex(0x0b0909); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x1, 60); ctx.lineTo(x2, 100); ctx.stroke(); ctx.strokeStyle = hex(0x4a3a30); ctx.lineWidth = 3; ctx.stroke(); }
  // чаша
  ctx.beginPath(); ctx.ellipse(40, 56, 26, 9, 0, 0, Math.PI); ctx.lineTo(14, 56); ctx.closePath();
  ctx.beginPath(); ctx.moveTo(14, 52); ctx.quadraticCurveTo(40, 82, 66, 52); ctx.closePath();
  fillShape(ctx, 0x5a4232, 50, 70);
  ctx.beginPath(); ctx.ellipse(40, 52, 26, 8, 0, 0, 7); ctx.fillStyle = hex(0x1a0d08); ctx.fill(); ctx.strokeStyle = hex(0x7a5a40); ctx.lineWidth = 2; ctx.stroke();
  // угли
  for (let i = 0; i < 12; i++) { ctx.fillStyle = hex(mix(0xff4a10, 0xffc060, Math.random()), 0.9); ctx.beginPath(); ctx.arc(22 + Math.random() * 36, 50 + Math.random() * 5, 2 + Math.random() * 2, 0, 7); ctx.fill(); }
  return c;
}

/** Кадры пламени (4 шт.) — для жаровен и факелов. */
export function drawFlames(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64 * 4, 96);
  for (let f = 0; f < 4; f++) {
    const r = new RNG(50 + f);
    const ox = f * 64 + 32;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, ox, 70, 30, 0xff5a10, 0.35);
    for (let k = 0; k < 3; k++) {
      const col = [0xc8301a, 0xff7a20, 0xffd080][k];
      const w = [18, 12, 6][k], h = [62, 46, 28][k];
      ctx.fillStyle = hex(col, 0.85);
      ctx.beginPath(); ctx.moveTo(ox - w, 88);
      ctx.quadraticCurveTo(ox - w - 2, 88 - h * 0.5, ox + r.range(-6, 6), 88 - h);
      ctx.quadraticCurveTo(ox + w + 2, 88 - h * 0.5, ox + w, 88);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  return c;
}

export function drawChest(open: boolean, elite = false): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(100, 90);
  const wood = elite ? 0x3a2030 : 0x4a3020, band = elite ? 0xc89a4a : 0x6b5a48;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(50, 78, 40, 13, 0, 0, 7); ctx.fill();
  // изометрический ящик: левая и правая грани
  poly(ctx, [12, 46, 50, 64, 50, 84, 12, 66]); fillShape(ctx, wood, 46, 84);
  poly(ctx, [50, 64, 88, 46, 88, 66, 50, 84]); fillShape(ctx, shade(wood, -0.25), 46, 84);
  if (!open) {
    poly(ctx, [12, 46, 50, 28, 88, 46, 50, 64]); fillShape(ctx, shade(wood, 0.1), 28, 64);
    ctx.strokeStyle = hex(band); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(30, 37); ctx.lineTo(68, 55); ctx.lineTo(68, 75); ctx.stroke();
    ctx.fillStyle = hex(0xd9a65a); ctx.fillRect(47, 60, 7, 9);
  } else {
    poly(ctx, [12, 46, 50, 64, 88, 46, 50, 28]); ctx.fillStyle = hex(0x120806); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 50, 44, 34, elite ? 0xffb050 : 0xd9a65a, 0.55); ctx.restore();
    // откинутая крышка
    poly(ctx, [12, 46, 50, 28, 50, 4, 12, 22]); fillShape(ctx, shade(wood, 0.05), 4, 46);
  }
  ctx.strokeStyle = hex(band); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(12, 56); ctx.lineTo(50, 74); ctx.lineTo(88, 56); ctx.stroke();
  return c;
}

export function drawAltar(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(128, 120);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(64, 100, 50, 18, 0, 0, 7); ctx.fill();
  poly(ctx, [20, 64, 64, 86, 64, 106, 20, 84]); fillShape(ctx, 0x4a4450, 64, 106);
  poly(ctx, [64, 86, 108, 64, 108, 84, 64, 106]); fillShape(ctx, 0x2e2a33, 64, 106);
  poly(ctx, [20, 64, 64, 42, 108, 64, 64, 86]); fillShape(ctx, 0x575160, 42, 86);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.save(); ctx.translate(64, 64); ctx.scale(1, 0.5); hollowSunSigil(ctx, 0, 0, 22, hex(0xff8a3a, 0.8), 2.4); ctx.restore();
  glow(ctx, 64, 64, 46, 0xff6a20, 0.3);
  ctx.restore();
  // свечи
  for (const [x, y] of [[32, 60], [96, 60], [64, 46]]) {
    ctx.fillStyle = hex(0xd8cbb4); ctx.fillRect(x - 2, y - 14, 4, 14);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y - 18, 8, 0xffa040, 0.9); ctx.restore();
  }
  return c;
}

export function drawCrystal(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(72, 96);
  const r = new RNG(9);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 36, 70, 34, 0x3fe0c4, 0.35); ctx.restore();
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 10 + r.range(-3, 3), h = r.range(26, 56), w = r.range(6, 10), lean = r.range(-8, 8);
    poly(ctx, [x - w, 84, x + lean, 84 - h, x + w, 84]);
    const g = ctx.createLinearGradient(0, 84 - h, 0, 84);
    g.addColorStop(0, hex(0xc8fff4)); g.addColorStop(0.4, hex(0x3fe0c4)); g.addColorStop(1, hex(0x0f4a44));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hex(0x062320); ctx.lineWidth = 2; ctx.stroke();
  }
  return c;
}

export function drawDecal(type: 'bones' | 'puddle' | 'rubble' | 'blood' | 'ashpile' | 'rubblewall'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(128, 64);
  const r = new RNG(type.length * 97);
  if (type === 'puddle') {
    ctx.fillStyle = hex(0x0a141c, 0.85); ctx.beginPath(); ctx.ellipse(64, 34, 44, 17, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = hex(0x3fe0c4, 0.35); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(64, 34, 44, 17, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
    ctx.strokeStyle = hex(0x8fd8e8, 0.25); ctx.beginPath(); ctx.ellipse(56, 30, 18, 5, 0, Math.PI, Math.PI * 1.9); ctx.stroke();
  } else if (type === 'bones') {
    for (let i = 0; i < 5; i++) {
      const x = r.range(30, 98), y = r.range(20, 46), a = r.range(0, 3), l = r.range(10, 18);
      ctx.strokeStyle = hex(0x0a0808); ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l * 0.5); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5); ctx.stroke();
      ctx.strokeStyle = hex(0xbdb19a); ctx.lineWidth = 3.5; ctx.stroke();
    }
    ctx.fillStyle = hex(0xc9bea8); ctx.beginPath(); ctx.arc(70, 30, 7, 0, 7); ctx.fill();
    ctx.fillStyle = hex(0x0a0808); ctx.fillRect(66, 29, 3, 3); ctx.fillRect(72, 29, 3, 3);
  } else if (type === 'rubble' || type === 'rubblewall') {
    const n = type === 'rubblewall' ? 16 : 8;
    for (let i = 0; i < n; i++) {
      const x = r.range(24, 104), y = r.range(18, 48), s = r.range(4, type === 'rubblewall' ? 14 : 9);
      poly(ctx, [x - s, y, x - s * 0.3, y - s * 0.7, x + s, y - s * 0.2, x + s * 0.6, y + s * 0.5]);
      fillShape(ctx, r.pick([0x403c47, 0x34313a, 0x4a4652]), y - s, y + s, 0x0a090c, 1.5);
    }
  } else if (type === 'blood') {
    ctx.fillStyle = hex(0x3a0a0c, 0.8);
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(r.range(40, 88), r.range(24, 40), r.range(4, 16), r.range(2, 7), 0, 0, 7); ctx.fill(); }
  } else if (type === 'ashpile') {
    for (let i = 0; i < 6; i++) { ctx.fillStyle = hex(mix(0x5a534c, 0x8a827a, r.next()), 0.6); ctx.beginPath(); ctx.ellipse(r.range(40, 88), r.range(26, 40), r.range(8, 22), r.range(4, 9), 0, 0, 7); ctx.fill(); }
    for (let i = 0; i < 4; i++) glow(ctx, r.range(44, 84), r.range(28, 38), 3, 0xff6a20, 0.7);
  }
  return c;
}

export function drawCart(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 110);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(70, 92, 52, 16, 0, 0, 7); ctx.fill();
  poly(ctx, [20, 60, 90, 90, 120, 74, 50, 46]); fillShape(ctx, 0x2a1c14, 46, 90);
  ctx.strokeStyle = hex(0x120c09); ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(28 + i * 20, 52 + i * 9); ctx.lineTo(24 + i * 20, 30 + i * 9 + (i % 2) * 8); ctx.stroke(); }
  // колесо
  ctx.beginPath(); ctx.ellipse(44, 78, 14, 18, -0.3, 0, 7); ctx.strokeStyle = hex(0x0d0908); ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = hex(0x4a3828); ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 80, 70, 10, 0xff6a20, 0.5); ctx.restore();
  return c;
}

export function drawBanner(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(70, 170);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(35, 160, 16, 6, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = hex(0x0b0909); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(35, 160); ctx.lineTo(35, 14); ctx.stroke();
  ctx.strokeStyle = hex(0x5a4636); ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(58, 22); ctx.lineTo(58, 100); ctx.lineTo(48, 92); ctx.lineTo(40, 108); ctx.lineTo(30, 94); ctx.lineTo(20, 104); ctx.lineTo(12, 96); ctx.closePath();
  fillShape(ctx, 0x4a1418, 22, 108);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; hollowSunSigil(ctx, 35, 54, 12, hex(0xd9a65a, 0.7), 1.6); ctx.restore();
  return c;
}

/** Шипы-ловушка: 0 — спрятаны, 1 — выдвинуты. */
export function drawTrap(on: boolean): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(128, 100);
  const oy = 36;
  diamondPath(ctx, 64, oy, 92, 46); fillShape(ctx, 0x3a3640, oy, oy + 46, 0x0a090c, 2);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x = 64 + (i - j) * 14, y = oy + 10 + (i + j) * 7 + 6;
    ctx.fillStyle = hex(0x0a090c); ctx.beginPath(); ctx.ellipse(x, y, 4, 2, 0, 0, 7); ctx.fill();
    if (on) {
      poly(ctx, [x - 4, y, x, y - 30, x + 4, y]);
      const g = ctx.createLinearGradient(0, y - 30, 0, y); g.addColorStop(0, hex(0xe0d8cc)); g.addColorStop(1, hex(0x4a4048));
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hex(0x0a090c); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = hex(0x7a1a1e, 0.8); ctx.fillRect(x - 1, y - 30, 2, 6);
    }
  }
  return c;
}

/** Портал Разлома: арка из камня с вихрем Пустоты. */
export function drawPortal(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 200);
  const r = new RNG(5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 75, 110, 80, 0x7a4aff, 0.35); ctx.restore();
  // вихрь
  ctx.save(); ctx.beginPath(); ctx.ellipse(75, 108, 42, 70, 0, 0, 7); ctx.clip();
  const g = ctx.createRadialGradient(75, 108, 4, 75, 108, 70);
  g.addColorStop(0, hex(0x000000)); g.addColorStop(0.5, hex(0x1a0a3a)); g.addColorStop(0.85, hex(0x4a2aa0)); g.addColorStop(1, hex(0x3fe0c4));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 150, 200);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(10, 60);
    ctx.strokeStyle = hex(r.chance(0.5) ? 0x9a7aff : 0x3fe0c4, r.range(0.2, 0.5)); ctx.lineWidth = r.range(1, 2.5);
    ctx.beginPath(); ctx.ellipse(75, 108, d * 0.6, d, 0, a, a + r.range(0.4, 1.2)); ctx.stroke();
  }
  ctx.restore();
  // каменная арка
  ctx.lineWidth = 14; ctx.strokeStyle = hex(0x0a090c); ctx.beginPath(); ctx.ellipse(75, 108, 48, 76, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
  ctx.lineWidth = 9; ctx.strokeStyle = hex(0x4a4652); ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; ctx.fillStyle = hex(0x3fe0c4, 0.8); ctx.fillRect(75 + Math.cos(a) * 48 - 2, 108 + Math.sin(a) * 76 - 2, 4, 4); }
  ctx.restore();
  // постамент
  diamondPath(ctx, 75, 168, 110, 30); fillShape(ctx, 0x3a3640, 168, 198);
  return c;
}
