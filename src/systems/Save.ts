// Сохранения. Браузер: localStorage. ПК (Electron/Tauri): тот же JSON пишется в файл
// через window.ashenNative.saveFile — мост добавляется в обёртке, игра о нём только спрашивает.
import { SAVE_KEY } from '../config';
import { BAG_SIZE, type HeroData } from './HeroData';
import { QUEST_DONE } from '../data/quests';

interface NativeBridge { saveFile(json: string): void; loadFile(): string | null }
const native = (): NativeBridge | undefined => (window as any).ashenNative;

export const SaveSystem = {
  save(d: HeroData) {
    const json = JSON.stringify({ ...d, savedAt: Date.now() });
    try {
      const n = native();
      if (n) n.saveFile(json); else localStorage.setItem(SAVE_KEY, json);
    } catch (e) { console.warn('Не удалось сохранить', e); }
  },

  load(): HeroData | null {
    try {
      const n = native();
      const raw = n ? n.loadFile() : localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as HeroData;
      if (d.version !== 1 || !d.classId) return null;
      // защита от повреждённых сохранений
      if (!Array.isArray(d.bag)) d.bag = [];
      while (d.bag.length < BAG_SIZE) d.bag.push(null);
      d.bag = d.bag.slice(0, BAG_SIZE);
      d.equip = d.equip || {};
      d.potions = d.potions ?? 3;
      // сохранения до пролога: герой уже в Разломах, сюжет считаем пройденным
      d.quest = d.quest ?? QUEST_DONE;
      d.qProg = d.qProg ?? 0;
      return d;
    } catch { return null; }
  },

  exists(): boolean { return !!this.load(); },

  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch { /* игнор */ } },
};
