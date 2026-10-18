// Кинематографичная пост-обработка камеры игры (только WebGL, один проход, 13 выборок на пиксель).
// 1) Мягкое свечение (bloom) ярких мест: огонь, угли, магия.
// 2) Цветокоррекция: холодные сине-серые тени, тёплые янтарные света.
// 3) Лёгкая виньетка.
import Phaser from 'phaser';
import { settings } from './Settings';

const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uRes;
uniform float uStep;
uniform float uBloom;
varying vec2 outTexCoord;

vec3 tap(vec2 uv) { return texture2D(uMainSampler, uv).rgb; }

void main() {
  vec2 uv = outTexCoord;
  vec3 col = tap(uv);

  // свечение: 12 выборок по двум кольцам, только яркие тёплые места
  vec3 glow = vec3(0.0);
  for (int k = 0; k < 12; k++) {
    float a = float(k) * 1.0472 + (k < 6 ? 0.0 : 0.5236);
    float r = (k < 6 ? 5.0 : 11.0) * uStep;
    vec3 c = tap(uv + vec2(cos(a), sin(a)) * r / uRes);
    glow += max(c - vec3(0.45), vec3(0.0));
  }
  col += glow * (uBloom / 12.0) * vec3(1.25, 0.9, 0.65);

  // цветокоррекция: чуть больше насыщенности, холодные тени и тёплые света
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 1.1);
  vec3 shadowTint = vec3(0.006, 0.010, 0.018);
  vec3 lightTint = vec3(1.08, 1.0, 0.92);
  col = col * mix(vec3(1.0), lightTint, smoothstep(0.25, 0.9, l)) + shadowTint * (1.0 - smoothstep(0.0, 0.35, l));

  // виньетка
  vec2 d = uv - 0.5;
  col *= 1.0 - dot(d, d) * 0.55;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export class CinematicPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'Cinematic', fragShader: FRAG });
  }

  onPreRender() {
    this.set2f('uRes', this.renderer.width, this.renderer.height);
    // шаг выборки ~1 CSS-пиксель: на HiDPI мазки не мельчают
    this.set1f('uStep', Math.min(2, window.devicePixelRatio || 1) * 1.0);
    this.set1f('uBloom', 0.7);
  }
}

/** Включить/выключить обработку на камере сцены по текущей настройке. */
export function applyCinematic(scene: Phaser.Scene) {
  const r = scene.game.renderer;
  if (!(r instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  if (!r.pipelines.postPipelineClasses.has('Cinematic')) r.pipelines.addPostPipeline('Cinematic', CinematicPipeline);
  const cam = scene.cameras.main;
  cam.resetPostPipeline();
  if (settings.graphics === 'cinema') cam.setPostPipeline('Cinematic');
}
