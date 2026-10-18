// Звук на Web Audio API. Если для события есть сэмпл в assets/audio/sfx/ (имя.mp3 или имя_1…имя_N.mp3
// для вариантов), играет он; иначе звук синтезируется на лету, как в прототипе.
// Громкость: мастер 0 dB, звуки −6 dB, музыка −12 dB; ползунки настроек умножаются поверх.

const SFX_URLS = import.meta.glob('../../assets/audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const DB_SFX = 0.5;    // −6 dB
const DB_MUSIC = 0.25; // −12 dB

export type SfxName =
  | 'swing' | 'hit' | 'crit' | 'cast' | 'fire' | 'explode' | 'arrow' | 'pickup' | 'gold'
  | 'levelup' | 'hurt' | 'death' | 'boss' | 'dodge' | 'trap' | 'ui' | 'portal' | 'stun'
  | 'wall' | 'chest' | 'potion' | 'roar' | 'hero_death' | 'boss_death';

class SfxEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfxBus?: GainNode;
  private musicBus?: GainNode;
  private noiseBuf?: AudioBuffer;
  private ambientOn = false;
  private last: Record<string, number> = {};
  /** Загруженные сэмплы: событие → варианты. */
  private samples: Record<string, AudioBuffer[]> = {};
  private loading = false;
  private onUnlock: (() => void)[] = [];
  sfxVolume = 0.7;
  musicVolume = 0.45;
  /** Голос героя для звуков боли и смерти. */
  voice: 'male' | 'female' = 'male';

  get context() { return this.ctx; }
  /** Шина музыки: к ней подключается Music. */
  get music() { return this.musicBus; }
  /** Вызвать, когда аудио разблокировано жестом (сразу, если уже). */
  whenUnlocked(f: () => void) { if (this.ctx) f(); else this.onUnlock.push(f); }

  private async loadSamples() {
    if (this.loading || !this.ctx) return;
    this.loading = true;
    await Promise.all(Object.entries(SFX_URLS).map(async ([path, url]) => {
      const name = path.split('/').pop()!.replace(/\.mp3$/, '');
      const group = name.replace(/_\d+$/, '');
      try {
        const buf = await this.ctx!.decodeAudioData(await (await fetch(url)).arrayBuffer());
        (this.samples[group] ||= []).push(buf);
      } catch { /* файл не загрузился — останется синтез */ }
    }));
  }

  private sample(group: string, rate = 1, vol = 1): boolean {
    const list = this.samples[group];
    if (!list?.length) return false;
    const c = this.ctx!;
    const s = c.createBufferSource(); s.buffer = list[Math.floor(Math.random() * list.length)];
    s.playbackRate.value = rate * (0.95 + Math.random() * 0.1);
    const g = c.createGain(); g.gain.value = vol;
    s.connect(g).connect(this.sfxBus!);
    s.start();
    return true;
  }

  /** Шаг героя: камень в Катакомбах, пепел в Пустошах. */
  step(theme: 'catacombs' | 'ashlands') {
    if (!this.ctx || this.sfxVolume <= 0) return;
    this.sample(theme === 'catacombs' ? 'step_stone' : 'step_ash', 1, 0.35);
  }

  /** Аудио можно запустить только после жеста пользователя (политика браузеров). */
  unlock() {
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      // Буфер белого шума — основа для ударов, огня и ветра.
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.loadSamples();
      const cbs = this.onUnlock; this.onUnlock = [];
      cbs.forEach(f => f());
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVolume * DB_SFX;
    if (this.musicBus) this.musicBus.gain.value = this.musicVolume * DB_MUSIC;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const c = this.ctx!; const t = c.currentTime + delay;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.synthOut());
    o.start(t); o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass', q = 1, slideTo?: number, delay = 0) {
    const c = this.ctx!; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf!;
    s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.synthOut());
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  private synthGain?: GainNode;
  /** Синтез настроен под старую громкость (мастер 0.8 без −6 dB): ×1.6 сохраняет её. */
  private synthOut() {
    if (!this.synthGain) { this.synthGain = this.ctx!.createGain(); this.synthGain.gain.value = 0.8 / DB_SFX; this.synthGain.connect(this.sfxBus!); }
    return this.synthGain;
  }

  play(name: SfxName) {
    if (!this.ctx || this.sfxVolume <= 0) return;
    // Ограничение частоты: одинаковые звуки не чаще раза в 40 мс (толпы врагов).
    const now = performance.now();
    if (now - (this.last[name] || 0) < 40) return;
    this.last[name] = now;
    // сэмплы; у боли и смерти героя — голос по классу, у уклонения — замедленный взмах
    if (name === 'hurt' && this.sample(`hurt_${this.voice}`)) return;
    if (name === 'hero_death' && this.sample(`hero_death_${this.voice}`)) return;
    if (name === 'dodge' && this.sample('swing', 0.7, 0.8)) return;
    if (this.sample(name)) return;
    const r = 0.9 + Math.random() * 0.2;
    switch (name) {
      case 'swing': this.noise(0.14, 0.25, 2400 * r, 'bandpass', 2, 600); break;
      case 'hit': this.noise(0.12, 0.5, 900 * r, 'lowpass', 1, 200); this.tone(110 * r, 0.1, 'square', 0.12, 60); break;
      case 'crit': this.noise(0.2, 0.6, 1600, 'lowpass', 1, 200); this.tone(220, 0.25, 'sawtooth', 0.15, 70); break;
      case 'cast': this.tone(330 * r, 0.3, 'triangle', 0.15, 660); this.noise(0.3, 0.12, 3000, 'highpass'); break;
      case 'fire': this.noise(0.45, 0.35, 700 * r, 'lowpass', 0.7, 2600); break;
      case 'explode': this.noise(0.7, 0.8, 1200, 'lowpass', 0.8, 90); this.tone(70, 0.5, 'sine', 0.4, 30); break;
      case 'arrow': this.noise(0.09, 0.25, 4000 * r, 'bandpass', 4, 1500); break;
      case 'pickup': this.tone(520, 0.08, 'triangle', 0.15); this.tone(780, 0.12, 'triangle', 0.12, undefined, 0.06); break;
      case 'gold': this.tone(1400 * r, 0.06, 'square', 0.05); this.tone(1900 * r, 0.08, 'square', 0.04, undefined, 0.04); break;
      case 'levelup': [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.14, undefined, i * 0.09)); break;
      case 'hurt': this.tone(160 * r, 0.18, 'sawtooth', 0.15, 80); this.noise(0.12, 0.25, 600); break;
      case 'death': case 'hero_death': case 'boss_death': this.tone(140 * r, 0.6, 'sawtooth', 0.12, 40); this.noise(0.5, 0.2, 500, 'lowpass', 1, 100); break;
      case 'boss': this.tone(55, 1.6, 'sawtooth', 0.25, 40); this.tone(82, 1.6, 'sawtooth', 0.18, 61); this.noise(1.4, 0.3, 300); break;
      case 'roar': this.tone(90 * r, 0.9, 'sawtooth', 0.22, 45); this.noise(0.9, 0.35, 500, 'bandpass', 1.2, 150); break;
      case 'dodge': this.noise(0.2, 0.25, 1800, 'bandpass', 1.5, 500); break;
      case 'trap': this.tone(300, 0.08, 'square', 0.1, 900); this.noise(0.15, 0.4, 2500, 'highpass'); break;
      case 'ui': this.tone(660, 0.05, 'triangle', 0.08); break;
      case 'portal': this.tone(120, 1.2, 'sine', 0.2, 480); this.tone(180, 1.2, 'sine', 0.15, 720); break;
      case 'stun': this.tone(900, 0.2, 'sine', 0.08, 1300); this.tone(1200, 0.2, 'sine', 0.06, 1700, 0.05); break;
      case 'wall': this.noise(0.9, 0.9, 500, 'lowpass', 0.7, 60); this.tone(50, 0.6, 'sine', 0.4, 30); break;
      case 'chest': this.tone(200, 0.15, 'square', 0.08, 120); this.tone(600, 0.3, 'triangle', 0.12, 900, 0.12); break;
      case 'potion': this.tone(400, 0.25, 'sine', 0.12, 800); this.noise(0.25, 0.08, 2000, 'bandpass', 3); break;
    }
  }

  private ambientOut?: GainNode;
  /** Мрачный эмбиент: два расстроенных низких тона, медленно «дышащий» фильтр и ветер.
   *  Запасной вариант, когда файлы музыки не загрузились. */
  startAmbient() {
    if (!this.ctx || this.ambientOn) return;
    this.ambientOn = true;
    const c = this.ctx;
    // настроен под старую громкость музыки (×0.6), шина теперь −12 dB
    const out = this.ambientOut = c.createGain(); out.gain.value = 0.6 / DB_MUSIC; out.connect(this.musicBus!);
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 380; filt.Q.value = 3;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = c.createGain(); lfoG.gain.value = 180;
    lfo.connect(lfoG).connect(filt.frequency); lfo.start();
    const g = c.createGain(); g.gain.value = 0.18;
    filt.connect(g).connect(out);
    for (const f of [41.2, 41.7, 61.7, 82.4]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const og = c.createGain(); og.gain.value = f > 60 ? 0.25 : 0.5;
      o.connect(og).connect(filt); o.start();
    }
    // ветер
    const n = c.createBufferSource(); n.buffer = this.noiseBuf!; n.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 500; nf.Q.value = 0.6;
    const nlfo = c.createOscillator(); nlfo.frequency.value = 0.11;
    const nlg = c.createGain(); nlg.gain.value = 300; nlfo.connect(nlg).connect(nf.frequency); nlfo.start();
    const ng = c.createGain(); ng.gain.value = 0.05;
    n.connect(nf).connect(ng).connect(out); n.start();
  }

  stopAmbient() {
    if (!this.ambientOn || !this.ambientOut) return;
    this.ambientOut.disconnect();
    this.ambientOut = undefined;
    this.ambientOn = false;
  }
}

export const Sfx = new SfxEngine();
