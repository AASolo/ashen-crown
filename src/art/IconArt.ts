// Иконки предметов, навыков и редкостей. 96×96 (выводятся в 48×48 или крупнее).
import { RNG } from '../core/rng';
import { makeCanvas, hex, shade, glow, poly, fillShape, limb, hollowSunSigil, crack, type Ctx } from './canvas';

const S = 96;
type Painter = (ctx: Ctx) => void;

const steel = (ctx: Ctx, y0: number, y1: number) => fillShape(ctx, 0x8a8480, y0, y1, 0x0a0808, 3, 0.35, -0.35);
const ember = (ctx: Ctx, x: number, y: number, r: number, a = 1) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r, 0xff6a1a, a); ctx.restore(); };

export const ITEM_ICONS: Record<string, Painter> = {
  it_blades: ctx => {
    for (const [dx, flip] of [[-10, -1], [10, 1]] as const) {
      ctx.save(); ctx.translate(48 + dx, 52); ctx.rotate(flip * 0.5);
      ctx.beginPath(); ctx.moveTo(-3, 18); ctx.quadraticCurveTo(flip * 18, -10, flip * 4, -38); ctx.quadraticCurveTo(flip * 6, -8, 4, 18); ctx.closePath(); steel(ctx, -38, 18);
      ctx.fillStyle = hex(0x8a6a40); ctx.fillRect(-9, 16, 18, 4); ctx.fillStyle = hex(0x2a1a12); ctx.fillRect(-3, 20, 6, 14);
      ctx.restore();
    }
    ember(ctx, 48, 30, 14, 0.5);
  },
  it_staff: ctx => {
    limb(ctx, 30, 86, 64, 22, 6, 0x4a3426);
    ctx.strokeStyle = hex(0x1a1210); ctx.lineWidth = 4;
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(64, 22); ctx.quadraticCurveTo(64 + k * 14, 12, 66 + k * 2, 2); ctx.stroke(); }
    ember(ctx, 66, 14, 24); ctx.fillStyle = hex(0xffd080); ctx.beginPath(); ctx.arc(66, 14, 5, 0, 7); ctx.fill();
  },
  it_hammer: ctx => {
    limb(ctx, 28, 88, 60, 30, 7, 0x4a3426);
    ctx.save(); ctx.translate(62, 28); ctx.rotate(0.5);
    ctx.beginPath(); ctx.rect(-22, -14, 44, 26); fillShape(ctx, 0x6a625a, -14, 12, 0x0a0808, 3, 0.35, -0.35);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hex(0x5ee0c8, 0.8); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(0, 6); ctx.lineTo(8, -6); ctx.stroke();
    ctx.restore();
  },
  it_bow: ctx => {
    ctx.strokeStyle = hex(0x0a0808); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(26, 12); ctx.quadraticCurveTo(84, 48, 26, 84); ctx.stroke();
    ctx.strokeStyle = hex(0x2a3a44); ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = hex(0xbdb6a8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(26, 12); ctx.lineTo(26, 84); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hex(0x4fc6e0, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(32, 18); ctx.quadraticCurveTo(76, 48, 32, 78); ctx.stroke(); ctx.restore();
  },
  it_helm: ctx => {
    ctx.beginPath(); ctx.moveTo(22, 76); ctx.lineTo(22, 38); ctx.quadraticCurveTo(48, 6, 74, 38); ctx.lineTo(74, 76); ctx.closePath();
    fillShape(ctx, 0x6a5e54, 10, 76, 0x0a0808, 3, 0.35, -0.4);
    ctx.fillStyle = hex(0x070506); ctx.fillRect(30, 44, 36, 6); ctx.fillRect(45, 44, 6, 24);
    ctx.fillStyle = hex(0x8a3a1a, 0.6); ctx.fillRect(22, 66, 52, 4);
  },
  it_hood: ctx => {
    ctx.beginPath(); ctx.moveTo(20, 82); ctx.quadraticCurveTo(14, 30, 50, 10); ctx.quadraticCurveTo(84, 30, 76, 82); ctx.closePath();
    fillShape(ctx, 0x2a2226, 10, 82, 0x070506, 3, 0.2, -0.4);
    ctx.beginPath(); ctx.ellipse(48, 52, 16, 20, 0, 0, 7); ctx.fillStyle = hex(0x070506); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 42, 50, 5, 0xff7a2a); glow(ctx, 54, 50, 5, 0xff7a2a); ctx.restore();
  },
  it_chest: ctx => {
    poly(ctx, [22, 18, 38, 12, 48, 20, 58, 12, 74, 18, 80, 40, 70, 44, 70, 84, 26, 84, 26, 44, 16, 40]);
    fillShape(ctx, 0x5a5048, 12, 84, 0x0a0808, 3, 0.3, -0.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(28, 48 + i * 11); ctx.lineTo(68, 48 + i * 11); ctx.stroke(); }
    const r = new RNG(4); ctx.save(); ctx.globalCompositeOperation = 'lighter'; crack(ctx, r, 48, 26, 40, Math.PI / 2, hex(0xff7a2a, 0.7), 1.6, 2); ctx.restore();
  },
  it_robe: ctx => {
    poly(ctx, [34, 12, 62, 12, 70, 34, 82, 86, 14, 86, 26, 34]);
    fillShape(ctx, 0x2a1f2a, 12, 86, 0x070506, 3, 0.2, -0.4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; hollowSunSigil(ctx, 48, 46, 10, hex(0xff7a2a, 0.7), 1.8);
    ctx.strokeStyle = hex(0xff7a2a, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, 80); ctx.lineTo(80, 80); ctx.stroke(); ctx.restore();
  },
  it_gloves: ctx => {
    for (const dx of [-16, 16]) {
      ctx.save(); ctx.translate(48 + dx, 50); ctx.scale(dx < 0 ? -1 : 1, 1);
      poly(ctx, [-10, 30, -12, -2, -8, -22, -2, -24, 2, -6, 6, -20, 12, -16, 12, 30]);
      fillShape(ctx, 0x4a3a30, -24, 30, 0x0a0808, 3, 0.3, -0.35);
      ctx.fillStyle = hex(0x7a6a5a); ctx.fillRect(-11, 20, 23, 7);
      ctx.restore();
    }
  },
  it_boots: ctx => {
    for (const dx of [-14, 12]) {
      poly(ctx, [36 + dx, 14, 56 + dx, 14, 56 + dx, 62, 72 + dx, 74, 72 + dx, 84, 34 + dx, 84]);
      fillShape(ctx, 0x3a2e28, 14, 84, 0x0a0808, 3, 0.25, -0.4);
      ctx.fillStyle = hex(0x6b5a50); ctx.fillRect(36 + dx, 30, 20, 5);
    }
  },
  it_ring: ctx => {
    ctx.lineWidth = 10; ctx.strokeStyle = hex(0x0a0808); ctx.beginPath(); ctx.ellipse(48, 56, 24, 20, 0, 0, 7); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = hex(0xb08a4a); ctx.stroke();
    ctx.beginPath(); ctx.arc(48, 34, 11, 0, 7); fillShape(ctx, 0x8a1a2a, 23, 45, 0x0a0808, 3, 0.5, -0.4);
    ember(ctx, 48, 34, 12, 0.5);
  },
  it_amulet: ctx => {
    ctx.strokeStyle = hex(0x6a5a40); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(20, 10); ctx.quadraticCurveTo(48, 54, 76, 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(48, 58, 20, 0, 7); fillShape(ctx, 0x050304, 38, 78, 0xb08a4a, 4, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; hollowSunSigil(ctx, 48, 58, 16, hex(0xf0d8a0, 0.8), 2); ctx.restore();
  },
  it_shield: ctx => runeShieldIcon(ctx),
  it_potion: ctx => {
    ctx.beginPath(); ctx.arc(48, 58, 24, 0, 7); fillShape(ctx, 0x2a1a1a, 34, 82, 0x0a0808, 3, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.arc(48, 58, 21, 0, 7); ctx.clip();
    const g = ctx.createLinearGradient(0, 44, 0, 80); g.addColorStop(0, hex(0xff4a4a)); g.addColorStop(1, hex(0x6a0a10));
    ctx.fillStyle = g; ctx.fillRect(20, 50, 56, 40); ctx.restore();
    ctx.fillStyle = hex(0x3a2a20); ctx.fillRect(40, 20, 16, 16); ctx.fillStyle = hex(0x8a6a40); ctx.fillRect(38, 16, 20, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(40, 50, 6, 3, -0.6, 0, 7); ctx.fill();
  },
  it_scroll: ctx => {
    poly(ctx, [22, 24, 74, 24, 74, 74, 22, 74]); fillShape(ctx, 0xb8a58a, 24, 74, 0x0a0808, 3, 0.15, -0.3);
    for (const y of [22, 76]) { ctx.beginPath(); ctx.ellipse(48, y, 30, 6, 0, 0, 7); fillShape(ctx, 0x8a7a60, y - 6, y + 6, 0x0a0808, 2.5); }
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; hollowSunSigil(ctx, 48, 49, 12, hex(0x6a1a14, 0.9), 2); ctx.restore();
  },
  it_gem: ctx => {
    poly(ctx, [48, 14, 76, 40, 48, 84, 20, 40]); fillShape(ctx, 0x3fe0c4, 14, 84, 0x062320, 3, 0.5, -0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(20, 40); ctx.lineTo(76, 40); ctx.moveTo(48, 14); ctx.lineTo(36, 40); ctx.lineTo(48, 84); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 48, 44, 30, 0x3fe0c4, 0.3); ctx.restore();
  },
  it_gold: ctx => {
    const r = new RNG(8);
    for (let i = 0; i < 9; i++) {
      const x = 28 + r.range(0, 40), y = 70 - i * 4 + r.range(-4, 4);
      ctx.beginPath(); ctx.ellipse(x, y, 13, 6, 0, 0, 7); fillShape(ctx, 0xd9a65a, y - 6, y + 6, 0x3a2a10, 2, 0.4, -0.3);
    }
  },
  it_shard: ctx => {
    // Пепельный осколок: тёмный обсидиан с тлеющей сердцевиной
    poly(ctx, [52, 8, 70, 40, 58, 88, 30, 62, 34, 30]); fillShape(ctx, 0x1a1418, 8, 88, 0x050304, 3, 0.35, -0.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const r = new RNG(12); crack(ctx, r, 50, 20, 60, Math.PI / 2, hex(0xff7a2a, 0.9), 2.2, 2);
    glow(ctx, 50, 50, 22, 0xff6a1a, 0.35); ctx.restore();
  },
};

function runeShieldIcon(ctx: Ctx) {
  ctx.beginPath(); ctx.ellipse(48, 50, 30, 38, 0, 0, 7); fillShape(ctx, 0x4a4038, 12, 88, 0x0a0808, 4, 0.3, -0.4);
  ctx.beginPath(); ctx.ellipse(48, 50, 22, 29, 0, 0, 7); ctx.strokeStyle = hex(0x7a6a5a); ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hex(0x5ee0c8, 0.9); ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(48, 26); ctx.lineTo(48, 74); ctx.moveTo(34, 40); ctx.lineTo(48, 54); ctx.lineTo(62, 40); ctx.stroke();
  glow(ctx, 48, 50, 24, 0x5ee0c8, 0.25); ctx.restore();
}

// ─── Иконки навыков ──────────────────────────────────────────────
function skillBg(ctx: Ctx, col: number) {
  const g = ctx.createRadialGradient(48, 44, 4, 48, 48, 62);
  g.addColorStop(0, hex(shade(col, -0.35))); g.addColorStop(1, hex(0x050304));
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
}
const L = (ctx: Ctx, col: number, w: number, a = 1) => { ctx.strokeStyle = hex(col, a); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
const lighter = (ctx: Ctx, f: () => void) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; f(); ctx.restore(); };

export const SKILL_ICONS: Record<string, [number, Painter]> = {
  sk_blade_basic: [0xd8432f, ctx => { L(ctx, 0xe8e0d8, 6); for (const o of [-10, 10]) { ctx.beginPath(); ctx.arc(48 + o, 60, 34, -2.4, -0.9); ctx.stroke(); } lighter(ctx, () => { L(ctx, 0xff5a3a, 3, 0.7); ctx.beginPath(); ctx.arc(58, 60, 34, -2.4, -0.9); ctx.stroke(); }); }],
  sk_blade_dash: [0xd8432f, ctx => { lighter(ctx, () => { for (let i = 0; i < 5; i++) { L(ctx, 0xff7a2a, 4 - i * 0.5, 0.9 - i * 0.15); ctx.beginPath(); ctx.moveTo(14 + i * 4, 62 - i * 8); ctx.lineTo(74, 30 + i * 4); ctx.stroke(); } }); L(ctx, 0xe8e0d8, 6); ctx.beginPath(); ctx.moveTo(56, 22); ctx.lineTo(80, 30); ctx.lineTo(66, 50); ctx.stroke(); }],
  sk_blade_whirl: [0xd8432f, ctx => { lighter(ctx, () => { for (let i = 0; i < 3; i++) { L(ctx, i ? 0xff5a3a : 0xe8e0d8, 5 - i, 0.9); ctx.beginPath(); ctx.arc(48, 48, 14 + i * 10, i * 2, i * 2 + 4.2); ctx.stroke(); } }); }],
  sk_blade_reap: [0xd8432f, ctx => { lighter(ctx, () => { glow(ctx, 48, 56, 30, 0xff5a10, 0.6); }); ctx.beginPath(); ctx.moveTo(16, 70); ctx.quadraticCurveTo(48, -6, 82, 46); ctx.quadraticCurveTo(48, 20, 22, 74); ctx.closePath(); fillShape(ctx, 0xd8d0c8, 10, 74, 0x0a0808, 3, 0.3, -0.4); }],
  sk_witch_basic: [0xff7a2a, ctx => { lighter(ctx, () => { glow(ctx, 56, 40, 26, 0xff7a2a, 1); for (let i = 0; i < 4; i++) { L(ctx, 0xffa040, 3 - i * 0.5, 0.6); ctx.beginPath(); ctx.moveTo(56, 40); ctx.lineTo(20 + i * 4, 76 - i * 10); ctx.stroke(); } glow(ctx, 56, 40, 8, 0xffffff, 1); }); }],
  sk_witch_fireball: [0xff7a2a, ctx => { lighter(ctx, () => { glow(ctx, 52, 44, 36, 0xff4a10, 1); glow(ctx, 52, 44, 20, 0xffb040, 1); glow(ctx, 52, 44, 8, 0xffffff, 1); L(ctx, 0xff6a1a, 6, 0.6); ctx.beginPath(); ctx.moveTo(30, 66); ctx.lineTo(12, 84); ctx.stroke(); }); }],
  sk_witch_circle: [0xff7a2a, ctx => { lighter(ctx, () => { ctx.save(); ctx.translate(48, 56); ctx.scale(1, 0.55); hollowSunSigil(ctx, 0, 0, 30, hex(0xff7a2a, 1), 4); ctx.restore(); glow(ctx, 48, 50, 30, 0xff4a10, 0.5); }); }],
  sk_witch_wisps: [0xff7a2a, ctx => { lighter(ctx, () => { for (const [x, y] of [[30, 40], [66, 34], [50, 66]]) { glow(ctx, x, y, 18, 0xff6a1a, 0.9); glow(ctx, x, y, 6, 0xffe0a0, 1); } }); }],
  sk_bone_basic: [0xd9b25a, ctx => { ITEM_ICONS.it_hammer(ctx); lighter(ctx, () => glow(ctx, 60, 30, 20, 0xd9b25a, 0.4)); }],
  sk_bone_charge: [0xd9b25a, ctx => { lighter(ctx, () => { for (let i = 0; i < 4; i++) { L(ctx, 0xd9b25a, 3, 0.6 - i * 0.12); ctx.beginPath(); ctx.moveTo(8, 30 + i * 12); ctx.lineTo(36, 30 + i * 12); ctx.stroke(); } }); ctx.save(); ctx.translate(14, 0); ctx.scale(0.85, 0.85); runeShieldIcon(ctx); ctx.restore(); }],
  sk_bone_quake: [0xd9b25a, ctx => { const r = new RNG(3); lighter(ctx, () => { glow(ctx, 48, 60, 34, 0xd9b25a, 0.5); for (let i = 0; i < 6; i++) crack(ctx, r, 48, 60, 40, i / 6 * Math.PI * 2, hex(0xffd080, 0.9), 3, 1); }); }],
  sk_bone_bastion: [0x5ee0c8, ctx => { lighter(ctx, () => glow(ctx, 48, 50, 40, 0x5ee0c8, 0.5)); runeShieldIcon(ctx); }],
  sk_shade_basic: [0x4fc6e0, ctx => { L(ctx, 0xbdb6a8, 4); ctx.beginPath(); ctx.moveTo(14, 82); ctx.lineTo(76, 20); ctx.stroke(); poly(ctx, [84, 12, 64, 20, 76, 32]); ctx.fillStyle = hex(0xd8e8f0); ctx.fill(); lighter(ctx, () => { L(ctx, 0x4fc6e0, 2, 0.8); ctx.beginPath(); ctx.moveTo(10, 70); ctx.lineTo(60, 20); ctx.stroke(); }); }],
  sk_shade_fan: [0x4fc6e0, ctx => { for (let i = -2; i <= 2; i++) { ctx.save(); ctx.translate(48, 82); ctx.rotate(i * 0.3); poly(ctx, [-4, -20, 0, -64, 4, -20]); fillShape(ctx, 0xa8b8c4, -64, -20, 0x0a0808, 2); ctx.restore(); } lighter(ctx, () => glow(ctx, 48, 40, 30, 0x4fc6e0, 0.4)); }],
  sk_shade_trap: [0x4fc6e0, ctx => { L(ctx, 0x8a8480, 5); for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; ctx.beginPath(); ctx.moveTo(48 + Math.cos(a) * 18, 60 + Math.sin(a) * 10); ctx.lineTo(48 + Math.cos(a) * 34, 60 + Math.sin(a) * 30); ctx.stroke(); } lighter(ctx, () => { glow(ctx, 48, 60, 22, 0x9a6bff, 0.9); }); }],
  sk_shade_vault: [0x4fc6e0, ctx => { lighter(ctx, () => { for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.25 + i * 0.2; ctx.fillStyle = hex(0x4fc6e0); ctx.beginPath(); ctx.ellipse(70 - i * 14, 44 + i * 4, 8, 16, 0, 0, 7); ctx.fill(); } }); }],
  sk_dodge: [0x8a8070, ctx => { lighter(ctx, () => { for (let i = 0; i < 3; i++) { L(ctx, 0xd8cbb4, 5 - i, 0.8 - i * 0.2); ctx.beginPath(); ctx.arc(48, 48, 26 - i * 6, -0.5 + i, 3.5 + i); ctx.stroke(); } }); }],
  sk_potion: [0xc8313a, ctx => ITEM_ICONS.it_potion(ctx)],
  sk_empty: [0x2a2a2a, () => { /* пустой слот */ }],
};

export function drawItemIcon(key: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(S, S);
  ITEM_ICONS[key](ctx);
  return c;
}

export function drawSkillIcon(key: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(S, S);
  const [col, paint] = SKILL_ICONS[key];
  skillBg(ctx, col);
  paint(ctx);
  // внутренняя фаска
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, S, S);
  return c;
}

/** Камень редкости (для режима дальтонизма к нему добавляется символ). */
export function drawRarityGem(color: number, tier: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 48);
  const pts = tier < 2 ? [24, 6, 40, 24, 24, 42, 8, 24] : tier < 4 ? [24, 4, 40, 16, 40, 32, 24, 44, 8, 32, 8, 16] : [24, 2, 30, 16, 44, 18, 34, 28, 38, 44, 24, 36, 10, 44, 14, 28, 4, 18, 18, 16];
  poly(ctx, pts); fillShape(ctx, color, 2, 44, 0x0a0808, 2.5, 0.5, -0.45);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 24, 22, 18, color, tier >= 4 ? 0.6 : 0.25); ctx.restore();
  return c;
}
