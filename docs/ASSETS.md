# Ассеты и промпты генерации — Ashen Crown

Сейчас **вся графика прототипа рисуется кодом** (`src/art/*.ts`, Canvas 2D, в 2× разрешении). Посмотреть всё можно в игре: меню → «Галерея ассетов» или `index.html?gallery`. PNG-экспорт процедурного арта лежит в папке `art/`.

Финальный арт заменяет процедурный **по тем же ключам текстур** (`hero_blade`, `floor_catacombs_0`, `it_helm`…), поэтому код менять не нужно: только загрузка через `Phaser.Loader` в BootScene.

Отметки: ★ — процедурная версия уже есть в прототипе, ○ — нужно сделать.

> **Обновление 17.10.2026:** часть процедурного арта заменена графикой из открытой игры FLARE (CC-BY-SA 3.0): 4 героя, гуль, культист, тень, пол и стены Катакомб, пол Пустошей, сундуки, алтарь, колонна, портал, кости, курсор. Файлы лежат в `assets/flare/`, загружаются в `BootScene` (`src/art/external.ts`); если файла нет, игра рисует процедурную версию. Авторы и лицензия: `CREDITS.md`. Пайплайн: `tools/flare/README.md`. Процедурными остались волк, босс, дух, стены Пустошей, деревья, жаровня, ловушки, эффекты, иконки и интерфейс.

---

## 1. Единый стиль (вставляйте в начало каждого промпта)

**STYLE (EN, для Midjourney / SDXL / Flux / DALL·E):**
```
dark fantasy isometric ARPG game art, original IP "Ashen Crown", hand-painted ashen engraving style,
near-black background, warm ember orange (#ff7a2a) and cold void teal (#3fd6c0) as the only saturated accents,
desaturated bone and charcoal palette, strong readable silhouette, soft rim light from below like embers,
fine painterly texture, subtle grain, no text, no watermark, no logos,
not resembling any existing game franchise
```

**NEGATIVE:**
```
photorealistic, 3d render, plastic, anime, chibi, cartoon, neon, oversaturated, cluttered background,
text, letters, watermark, signature, blurry, jpeg artifacts, extra limbs, deformed hands,
diablo, blizzard, path of exile, copyrighted character
```

**Технические правила:**
- Изометрия 2:1 (камера ~30° над горизонтом, поворот 45°). Свет сверху-слева, тень вправо-вниз.
- Персонажи: вид 3/4 спереди (S) и 3/4 сзади (N). Остальные направления получаются зеркалом.
- Спрайты: прозрачный фон (PNG-32), «нога» персонажа — в точке, указанной в таблице.
- Рисовать в 2× от игрового размера (игра показывает со scale 0.5 — резко на 4K).
- Один источник цвета: палитра ниже, без других насыщенных тонов.

**Палитра:**

| Роль | Цвет |
|---|---|
| Фон | `#050304` |
| Уголь | `#1a1210` |
| Пепел | `#4a3a30` |
| Кость | `#c8a878` |
| Угли | `#ff7a2a` |
| Кровь | `#d8432f` |
| Золото UI | `#d9a65a` |
| Пустота | `#3fd6c0` |
| Пустотный фиолет | `#9a6bff` |
| Корона | `#f0e0c8` |

---

## 2. Персонажи и враги

| Ключ | Что | Размер кадра (2×) | Нога | Кадры | Статус |
|---|---|---|---|---|---|
| `hero_blade` | Пепельный Клинок | 128×176 | (64,160) | 15 × 2 стороны: покой 2, ходьба 4, атака 3, каст 2, удар 1, смерть 3 | ★ |
| `hero_witch` | Пепельная Ведьма | 128×176 | (64,160) | так же | ★ |
| `hero_bone` | Костолом | 128×176 | (64,160) | так же | ★ |
| `hero_shade` | Тень Пустоты | 128×176 | (64,160) | так же | ★ |
| `en_ghoul` | Пепельный гуль | 128×176 | (64,160) | так же | ★ |
| `en_cultist` | Жрец Пустого Солнца | 128×176 | (64,160) | так же | ★ |
| `en_shadow` | Тень Глашатая | 128×176 | (64,160) | так же | ★ |
| `en_wolf` | Теневой волк | 176×120 | (88,108) | 15 × 2 | ★ |
| `en_herald` | Глашатай Пустого Солнца (босс) | 256×336 | (128,318) | 15 × 2 | ★ |
| `wisp` | Тлеющий дух (призыв) | 64×64 | центр | 1 + частицы | ★ |
| 25 врагов и 4 босса из GDD §12 | | 128×176 / 256×336 | | | ○ |

**Промпты (добавить STYLE в начало):**
- **Пепельный Клинок:** `full body character sprite, lean duelist in tattered crimson-black gambeson and ash-grey scarf, twin curved sickle blades glowing faintly orange at the edges, hood down, scarred face, ember sparks around blades, isometric 3/4 front view, transparent background`
- **Пепельная Ведьма:** `full body character sprite, young witch in layered charcoal robes with ember-orange embroidery, tall gnarled staff topped with a burning coal in an iron cage, ash-white braided hair, glowing orange eyes, floating ember motes, isometric 3/4 front view, transparent background`
- **Костолом:** `full body character sprite, massive bone-plated warrior, armor made of riveted iron and old bone, huge rune-carved stone maul, gold-ochre runes glowing (#d9b25a), helmet with broken horn, heavy stance, isometric 3/4 front view, transparent background`
- **Тень Пустоты:** `full body character sprite, slender hunter in dark leather with teal void-glass inlays, recurve bow of black wood strung with teal light, half mask, cloak dissolving into smoke at the hem, isometric 3/4 front view, transparent background`
- **Пепельный гуль:** `undead ghoul made of compacted grey ash and charred bone, cracks glowing ember orange from inside, long claws, hunched, isometric 3/4 view, transparent background`
- **Теневой волк:** `wolf made of living shadow and smoke, teal void eyes, ribs visible as faint light, mane dissolving into black mist, mid-stride, isometric side 3/4 view, transparent background`
- **Жрец Пустого Солнца:** `cult priest in long bone-white and black robes, face hidden behind a black disc mask with a pale corona rim, holding a violet void orb, isometric 3/4 view, transparent background`
- **Тень Глашатая:** `small humanoid shadow wraith, translucent black with violet edges, no face, long thin arms, summoned minion, isometric 3/4 view, transparent background`
- **Глашатай Пустого Солнца (босс):** `towering herald of a hollow black sun, 3 meters tall, black ceremonial coat, head replaced by a black disc with a burning orange-white corona, holding a long halberd-scythe, ash falling around, menacing, isometric 3/4 view, transparent background`

**Анимация (для генерации листов):** `sprite sheet, 15 frames in one row: idle x2, walk cycle x4, attack x3, cast x2, hit x1, death x3, consistent character, same scale, same lighting, transparent background` — дальше дочистка в Aseprite или Spine.

---

## 3. Тайлсет 1 — Затонувшие Катакомбы ★

| Ключ | Что | Размер (2×) | Статус |
|---|---|---|---|
| `floor_catacombs_0..5` | плиты пола, 6 вариантов (трещины, вода, руны, мох) | 128×64 ромб | ★ |
| `wall_catacombs_0..4` | кладка, 5 вариантов (ниши, свечи, кристаллы, черепа) | 128×176 | ★ |
| `wall_catacombs_9` | треснувшая стена (тайник) | 128×176 | ★ |
| `pillar_catacombs` | колонна | 128×200 | ★ |
| `crystal`, `altar`, `decal_puddle`, `decal_bones` | пропсы | разные | ★ |

**Промпт:** `isometric 2:1 floor tile, single diamond 128x64, ancient flooded catacomb flagstones, dark wet grey-violet stone (#3a3640), thin water film, teal crystal shards in cracks, faint carved runes, top-down isometric, seamless edges, transparent outside the diamond`

**Стена:** `isometric wall block 128x176, crypt masonry of dark grey-violet bricks, burial niche with skull and candle, teal void crystals growing from mortar, wet stains, top face flat, transparent background`

## 4. Тайлсет 2 — Пепельные Пустоши ★

| Ключ | Что | Размер (2×) | Статус |
|---|---|---|---|
| `floor_ashlands_0..5` | пепел, угли в трещинах, кости, обугленная трава | 128×64 | ★ |
| `wall_ashlands_0..4`, `_9` | руины дозорных башен, обожжённый камень | 128×176 | ★ |
| `pillar_ashlands`, `tree_0..2`, `grave`, `cart`, `banner`, `decal_ashpile` | пропсы | разные | ★ |

**Промпт:** `isometric 2:1 floor tile, single diamond 128x64, scorched wasteland ground covered in grey ash, glowing ember cracks (#ff7a2a), scattered small bones and charcoal, top-down isometric, seamless edges, transparent outside the diamond`

**Дерево:** `isometric prop, dead charred tree with twisted branches, ash on the bark, faint embers inside cracks, transparent background, 160x220`

## 5. Пропсы и интерактив ★

| Ключи | Что |
|---|---|
| `brazier` + `flame` (4 кадра) | жаровня с огнём — источник света |
| `chest`, `chest_open`, `chest_elite`, `chest_elite_open` | сундуки обычный и элитный |
| `trap_off`, `trap_on` | ловушка-шипы |
| `portal` | портал Разлома (фиолетовый вихрь) |
| `decal_rubble`, `decal_blood`, `decal_rubblewall` | декали |

**Промпт сундука:** `isometric prop, iron-bound wooden chest with bone ornaments, ember light leaking from the keyhole, closed, transparent background, 96x80` (+ вариант `opened, golden glow inside`).

**Промпт портала:** `isometric ground portal, swirling violet-black void vortex in a ring of broken stones, pale corona sparks, transparent background, 160x120`

## 6. Иконки ★ (128×128, рамку рисует игра)

- **Предметы:** `it_blades it_staff it_hammer it_bow it_helm it_hood it_chest it_robe it_gloves it_boots it_ring it_amulet it_shield it_potion it_scroll it_gem it_gold it_shard`
- **Навыки:** `sk_blade_basic/dash/whirl/reap`, `sk_witch_basic/fireball/circle/wisps`, `sk_bone_basic/charge/quake/bastion`, `sk_shade_basic/fan/trap/vault`, `sk_dodge`, `sk_potion`, `sk_empty`
- **Редкости:** `gem_0..5`

**Промпт иконки предмета:** `game item icon, single [ITEM] centered, dark fantasy ashen style, painted, dramatic rim light, dark vignette background, square 128x128, no frame, no text`

**Промпт иконки навыка:** `game skill icon, [EFFECT DESCRIPTION], ember orange and black, dynamic composition, painted, square 128x128, no frame, no text`. Цвет-акцент берётся по ресурсу класса: Ярость `#d8432f`, Жар `#ff7a2a`, Стойкость `#d9b25a`, Фокус `#4fc6e0`.

Примеры `[EFFECT]`:
- Пепельный рывок: `streak of orange fire dash`
- Вихрь клинков: `spinning crimson blade vortex`
- Огненный шар: `exploding fireball`
- Тлеющие духи: `three small ember spirits`
- Сотрясение: `hammer smashing ground with golden shockwave`
- Капкан Пустоты: `teal void bear trap`

## 7. Интерфейс ★

| Ключ | Что | Размер (2×) |
|---|---|---|
| `orb_frame` | бронзовая рамка сферы с шипами | 320×320 |
| `orb_hp`, `orb_res` | жидкость (красная; ресурс тонируется кодом) | 280×280 |
| `orb_glass` | блик стекла | 280×280 |
| `slot`, `skillslot` | ячейки сумки и навыков | 120×120 |
| `ornament` | уголки панелей | 64×64 |
| `vignette` | красная виньетка урона | 512×512 |
| панели, кнопки | рисуются Graphics в `ui/widgets.ts` | — |

**Промпт рамки:** `game UI element, circular bronze and blackened iron frame with small thorns and ember runes, empty center (transparent), front view, isolated, transparent background`

**Промпт панели:** `game UI panel 9-slice, dark charcoal leather with bronze corner ornaments, subtle ember stitching, front view, transparent background`

## 8. Фон меню ★

`menu_bg` 1920×1080 (16:9; крайние зоны безопасны для 21:9 и 4:3).

**Промпт:** `wide cinematic key art, a hollow black sun with pale white corona above a ruined gothic citadel of black obsidian on a cliff, ash falling like snow, ember-lit wasteland in foreground, tiny silhouette of a lone hero with glowing weapon, deep black sky with orange haze, painterly, epic scale, no text, 16:9`

## 9. Эффекты ★

`glow`, `lightmask`, `shadow`, частицы `p_spark/ember/smoke/ash/blood/dot/shard`, `slash`, `ring`, снаряды `proj_spark/fireball/arrow/dagger/void/wispbolt`.

**Промпт:** `game VFX sprite, [EFFECT], additive-friendly on pure black background, soft glow, 256x256` — затем перевести в режим ADD (чёрный становится прозрачным).

## 10. Звук и музыка (○)

| Группа | Список |
|---|---|
| Музыка | тема меню (Тема Венца, 5 нот), 5 региональных эмбиентов + 5 боевых слоёв, 5 боссов, финал, победа, смерть |
| Удары | лёгкий/тяжёлый × плоть/кость/камень/пустота, крит (со стеклянным звоном) |
| Навыки | по 3–4 звука на класс (рывок, вихрь, взрыв, призыв, удар по земле, щит, выстрел, ловушка) |
| Враги | рык гуля, вой волка, гимн жреца, шёпот тени, 10+ реплик Глашатая (озвучка) |
| UI | клик, открыть сумку, надеть, продать, разобрать, лут (по редкостям — выше тон), уровень, портал |
| Эмбиент | ветер с пеплом, капель, огонь жаровни, вода, цепи |

**Промпт музыки (Suno/Udio):**
```
dark folk ambient, solo cello drone, hurdy-gurdy, frame drum, distant female choir,
ash and embers mood, slow 60 bpm, minor key, cinematic, no vocals lyrics
```

Сейчас все звуки синтезируются процедурно в `core/Sfx.ts` (WebAudio).

## 11. Полный набор для генерации одним пакетом

1. 4 героя × лист анимаций (S и N).
2. 9 врагов прототипа + 25 из GDD.
3. 5 боссов.
4. 5 тайлсетов (по 6 полов, 6 стен, 10 пропсов).
5. 18 иконок предметов + 48 иконок навыков (4 класса × 12) + 6 самоцветов.
6. UI-кит (сферы, слоты, панели, кнопки, рамки).
7. Фон меню + 5 загрузочных артов регионов.
8. 20 VFX-спрайтов.

Итого около 400 изображений. Генерировать по разделам, с одним и тем же STYLE и seed, затем выравнивать по палитре (Photoshop Gradient Map или ImageMagick `-remap palette.png`).
