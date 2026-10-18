// Музыка: треки из assets/audio/music/ (MP3). Играют потоково через <audio>, поэтому не занимают
// память целиком (важно для iPhone), а громкость идёт через шину музыки Sfx (−12 dB × ползунок).
// Состояния: меню, поверхность (северная тема пролога), исследование (Пустоши), подземелье (Катакомбы), бой, босс;
// джинглы победы и поражения.
// Под темой этажа тихо звучит эмбиент (ветер или капли). Если файлы не грузятся, включается синтез-эмбиент.
import { Sfx } from './Sfx';

const URLS = import.meta.glob('../../assets/audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlOf = (name: string) => Object.entries(URLS).find(([p]) => p.endsWith(`/${name}.mp3`))?.[1];

export type MusicState = 'menu' | 'surface' | 'explore' | 'dungeon' | 'combat' | 'boss';
const FADE = 1.5;
const AMBIENT: Partial<Record<MusicState, string>> = { surface: 'amb_wind', explore: 'amb_wind', dungeon: 'amb_cave' };
const AMBIENT_VOL = 0.45;

interface Track { el: HTMLAudioElement; gain?: GainNode; failed: boolean }

class MusicEngine {
  private tracks: Record<string, Track> = {};
  private state: MusicState | null = null;
  private ambient: string | null = null;
  private jingleOn = false;

  private track(name: string): Track | null {
    if (this.tracks[name]) return this.tracks[name];
    const url = urlOf(name);
    if (!url) return null;
    const el = new Audio(url);
    el.preload = 'auto';
    el.loop = true;
    const t: Track = { el, failed: false };
    el.addEventListener('error', () => { t.failed = true; this.fallback(); });
    const ctx = Sfx.context;
    if (ctx && Sfx.music) {
      // Громкость через Web Audio: на iPhone свойство volume у <audio> не работает
      t.gain = ctx.createGain(); t.gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(t.gain).connect(Sfx.music);
    }
    this.tracks[name] = t;
    return t;
  }

  private fade(t: Track, to: number, sec = FADE) {
    if (t.gain) {
      const g = t.gain.gain, now = Sfx.context!.currentTime;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(to, now + sec);
    } else t.el.volume = to;
    if (to > 0) { t.el.play().catch(() => { /* ждём жеста пользователя */ }); }
    else window.setTimeout(() => { if (!t.gain || t.gain.gain.value < 0.01) t.el.pause(); }, sec * 1000 + 50);
  }

  private fallback() {
    // если основной трек не играет, остаётся хотя бы синтезированный эмбиент
    if (this.state && this.state !== 'menu') Sfx.startAmbient();
  }

  /** Сменить музыкальное состояние с кроссфейдом. До первого жеста запоминается и стартует после. */
  play(state: MusicState) {
    if (this.state === state) return;
    const prev = this.state;
    this.state = state;
    Sfx.whenUnlocked(() => {
      if (this.state !== state) return;
      if (prev && !this.jingleOn) { const p = this.track(prev); if (p) this.fade(p, 0); }
      const t = this.track(state);
      if (!t || t.failed) { this.fallback(); return; }
      Sfx.stopAmbient();
      if (!this.jingleOn) { t.el.loop = true; this.fade(t, 1); }
      // эмбиент меняется только со сменой этажа; в бою и у босса он продолжает звучать
      const amb = state === 'menu' ? null : AMBIENT[state] ?? this.ambient;
      if (amb !== this.ambient) {
        if (this.ambient) { const a = this.track(this.ambient); if (a) this.fade(a, 0, 3); }
        if (amb) { const a = this.track(amb); if (a) this.fade(a, AMBIENT_VOL, 3); }
        this.ambient = amb;
      }
    });
  }

  /** Короткий джингл поверх приглушённой музыки; после него музыка состояния возвращается. */
  jingle(name: 'victory' | 'defeat') {
    Sfx.whenUnlocked(() => {
      const j = this.track(name);
      if (!j || j.failed) return;
      const cur = this.state ? this.track(this.state) : null;
      if (cur) this.fade(cur, 0, 0.6);
      this.jingleOn = true;
      j.el.loop = false; j.el.currentTime = 0;
      this.fade(j, 1, 0.1);
      j.el.onended = () => {
        this.jingleOn = false;
        const now = this.state ? this.track(this.state) : null;
        if (now) this.fade(now, 1, 2);
      };
    });
  }

  get current() { return this.state; }
}

export const Music = new MusicEngine();
