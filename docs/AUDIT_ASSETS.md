# Аудит ассетов Ashen Crown и список замен

Дата: 18.10.2026. Все пути даны от корня проекта `ashen-crown/`.

**Обновление 18.10.2026:** музыка (7 треков и 2 эмбиента), 43 звука и локальные шрифты из FLARE и Google Fonts уже подключены: `src/core/Music.ts`, `src/core/Sfx.ts`, `assets/audio/`, `assets/fonts/`, авторы в `CREDITS.md`. Разделы 3.8 и 3.9 ниже остаются списком для дальнейших улучшений (джинглы, звук квеста).

## Коротко

- **Движок:** Phaser 3.90 + TypeScript 5.9 + Vite 6 (`package.json`). Unity, Godot и Unreal не используются.
- **Графика:** большая часть процедурная: волк, босс, почти все пропсы, весь UI, все иконки и эффекты рисует код на Canvas 2D в `src/art/*.ts` при каждом запуске игры. Из файлов грузятся только 42 WebP/PNG из игры FLARE в `assets/flare/`: герои, 3 врага, пол, стены, сундуки, портал, курсоры. Ни одного ассета в стиле hand-painted digital painting в игре нет.
- **Почему графика кажется пиксельной:** спрайты героев и врагов FLARE маленькие. Кадр после ужатия до 75% занимает 130–180 px, а камера увеличивает его в 1,3–3,2 раза (`GameScene.applyZoom`). При таком растяжении картинка мылится и выглядит пиксельной.
- **Музыка:** в проекте **нет ни одного аудиофайла**. «Музыка» — это гудящий синтезированный дрон (`Sfx.startAmbient`, `src/core/Sfx.ts:109`). Все 22 звуковых эффекта тоже синтезируются кодом. Поэтому звук и плохой.
- **Шрифты:** локальных файлов нет. Cormorant Garamond и Cormorant SC грузятся с Google Fonts (`index.html`). Без сети игра откатывается на Georgia.
- **Папка `art/`** (127 PNG) — это экспорт процедурного арта для галереи. **Игра её не загружает**, так что заменять файлы там бессмысленно.

## 1. Где в коде загружаются ассеты

| Место | Что делает |
|---|---|
| `src/scenes/BootScene.ts:11` → `queueExternalArt()` (`src/art/external.ts:23`) | `scene.load.image` для каждого ключа из `assets/flare/manifest.json`. Это единственный вызов загрузчика Phaser в проекте. |
| `src/art/external.ts:16` | `import.meta.glob('../../assets/flare/*.{webp,png}')`: Vite упаковывает файлы из `assets/flare/` и выдаёт им URL. |
| `src/art/external.ts:50` → `addExtSheet()` | Режет внешний лист на кадры и создаёт анимации `${key}_${anim}_${S\|N}`. Параметры кадров (`fw`, `fh`, `footY`, `cols`, `scale`, `anims`) берутся из манифеста. |
| `src/scenes/BootScene.ts:25` → `registerArt()` (`src/art/index.ts:37`) | Рисует процедурную текстуру под каждым ключом, **если внешняя не загрузилась** (`EXT_LOADED`). Поэтому новый файл с тем же ключом заменяет старый арт без правок в игровом коде. |
| `src/core/Sfx.ts` | Весь звук: Web Audio API, `Sfx.play(name)` для 22 эффектов и `startAmbient()`. Загрузки файлов нет (`load.audio` в проекте не вызывается). |
| `src/core/Sfx.ts:46` | Громкость: `master`, `musicBus = music × 0.6`, ползунки «Звуки» и «Музыка» в настройках (`src/systems/Settings.ts`). |
| `index.html` | Шрифты с Google Fonts. |
| `src/art/external.ts:32` → `cursorCss()` | Курсоры `assets/flare/cursor_*.png` через CSS. |

**Ограничение кода, важное для заказа ассетов:** персонаж хранит только 2 стороны, `S` (3/4 спереди) и `N` (3/4 сзади), а остальные получаются зеркалом (`src/entities/Actor.ts:58`). Анимации: `idle`, `walk`, `attack`, `cast`, `hit`, `death`. Отдельного `run` нет. Чтобы включить 8 направлений, придётся переделать `Actor` (это входит в план интеграции, шаг 3).

## 2. Текущие ассеты

Ключ — это имя текстуры в Phaser. «Процедурный» значит, что файла нет и картинку рисует функция.

### Графика

| Путь / ключ | Тип | Где используется в коде | Размер / формат | Проблема |
|---|---|---|---|---|
| `assets/flare/hero_blade.webp`, `hero_witch`, `hero_bone`, `hero_shade` | герои | `entities/Hero.ts`, экран выбора `scenes/MenuScene.ts` | листы 153–236×130–181 на кадр (после ужатия 0.75), 2 стороны, 28 кадров на сторону, 180–254 КБ | **критично:** мелкие пререндеры FLARE, мылятся при зуме; все 4 класса — один и тот же манекен FLARE в разной броне |
| `assets/flare/en_ghoul.webp`, `en_cultist`, `en_shadow` | враги | `entities/Enemy.ts`, `data/enemies.ts` | 146–243×136–157 на кадр, 170–295 КБ | **критично:** те же проблемы; тень Глашатая — просто перекрашенный культист |
| `en_wolf` (процедурный) | враг | `data/enemies.ts:31` | Canvas 176×120 на кадр | **критично:** векторный волк, сильно выбивается из стиля FLARE |
| `en_herald` (процедурный) | босс (единственный) | `entities/Boss.ts` | Canvas 256×336 на кадр | **критично:** векторная кукла, главный босс выглядит хуже рядовых врагов |
| `assets/flare/floor_catacombs_0…5.webp`, `floor_ashlands_0…5.webp` | тайлы пола | `world/Level.ts` | 128×64, WebP 7 КБ | средне: читаются, но низкая детализация; пол Пустошей — перекрашенная пещера |
| `assets/flare/wall_catacombs_*.webp`, `wall_ashlands_*.webp` (0–4, 9) | стены | `world/Level.ts` | 128×219, 5–13 КБ | средне: стены Пустошей — перекрашенные стены Катакомб (17.10) |
| `pillar_*`, `altar`, `chest*`, `portal`, `decal_bones` (FLARE) | пропсы | `world/Level.ts`, `GameScene.ts` | 4–11 КБ | низко: мелкие, но в стиле |
| `tree_0…2`, `grave`, `brazier`, `crystal`, `cart`, `banner`, `trap_on/off`, `decal_*` (кроме bones), `flame` (процедурные) | пропсы, ловушки, огонь | `world/Level.ts`, `GameScene.ts` | Canvas 2× | **высоко:** векторные, плоские, выбиваются из пререндеров FLARE |
| `orb_frame`, `orb_hp`, `orb_res`, `orb_glass`, `slot`, `skillslot`, `ornament`, `vignette` (процедурные) | UI | `scenes/UIScene.ts`, `ui/widgets.ts` | Canvas 2× | средне: аккуратные, но простые; рамки окон рисуются `Graphics` (`ui/widgets.ts`), нет текстур панелей |
| `minimap` (рисуется на лету) | UI | `world/Level.ts:40` | Canvas | низко: мини-карта и так должна рисоваться кодом |
| `menu_bg` (процедурный) | фон меню | `scenes/MenuScene.ts` | Canvas 1920×1080 | **высоко:** плоский векторный силуэт замка и солнце |
| `it_*` ×18 (оружие, броня, зелье, свиток, камень, золото, осколок) | иконки предметов | `scenes/UIScene.ts` (сумка, подсказки), лут на земле | Canvas 96×96 | **высоко:** векторные «клипарт»-иконки |
| `sk_*` ×19 (4 класса × 4 навыка + уклон, зелье, пусто) | иконки навыков | `scenes/UIScene.ts` (панель навыков) | Canvas 96×96 | **высоко:** то же |
| `gem_0…5` | иконки редкости | `scenes/UIScene.ts` | Canvas | низко: по аудиту FREE_ASSETS лучше оставить кодом |
| `glow`, `lightmask`, `shadow`, `p_*` ×7, `slash`, `ring`, `proj_*` ×6, `wisp` | VFX и частицы | `systems/Fx.ts`, `GameScene.ts`, `entities/Effects.ts` | Canvas 2× | средне: частицы нормальные, но `slash`, снаряды и взрывы плоские, без кадров анимации |
| `assets/flare/cursor_normal.png`, `cursor_attack.png` | курсоры | `art/external.ts:32` | PNG 8 КБ | низко |
| Cormorant Garamond, Cormorant SC (Google Fonts) | шрифты | `src/config.ts` (`FONT`, `FONT_TITLE`) | веб-шрифт | средне: без сети пропадают; нужен локальный TTF/WOFF2 в проекте |
| `art/*.png` (127 файлов), `build/ashen-crown.html` | экспорт и старая сборка | **не используются игрой** | — | не заменять; `build/` — устаревшая однофайловая сборка |

### Звук

| Путь / событие | Тип | Где используется | Формат | Проблема |
|---|---|---|---|---|
| `Sfx.startAmbient()` | «музыка» | `GameScene.ts:135` (только в игре) | синтез: 4 пилообразных тона + шум | **критично:** нет музыки вообще; в меню тишина; нет боевой темы, темы босса, победы и поражения |
| `swing`, `hit`, `crit`, `arrow` | удары, выстрел | `systems/Combat.ts`, `systems/Skills.ts` | синтез шума | **критично:** «пшик» вместо металла |
| `cast`, `fire`, `explode`, `stun`, `wall`, `portal` | магия | `systems/Skills.ts`, `GameScene.ts` | синтез | **критично** |
| `hurt`, `death`, `roar`, `boss` | урон, смерть, монстры | `entities/*.ts`, `GameScene.ts` | синтез | **критично**: смерть врага, босса и героя звучат одинаково (`death`) |
| `pickup`, `gold`, `chest`, `potion`, `levelup`, `trap`, `dodge`, `ui` | лут, UI, события | `GameScene.ts`, `UIScene.ts`, `MenuScene.ts` | синтез | высоко: «пикающие» тоны |
| шаги, квесты, дверь, победа, поражение | — | **нет событий в коде** | — | отсутствуют |

### Что менять в первую очередь

1. **Музыка** (5 тем + 2 джингла): самый заметный провал, и замена не затрагивает графику.
2. **Герои и босс**: игрок смотрит на них всё время.
3. **SFX боя**: удары, магия, урон, смерть.
4. **Враги** (4 существующих типа).
5. **Фон меню, иконки предметов и навыков.**
6. **Тайлы и пропсы Пустошей.**
7. UI-текстуры, VFX-листы, шрифты локально.

## 3. Что докачать и куда положить

### Как класть файлы

- **Готовые файлы с точными именами** кладите в `assets/hd/` (графика) и `assets/audio/` (звук). Имена совпадают с ключами игры, поэтому замена произойдёт сама.
- **Скачанные архивы паков** можно не разбирать: положите архив как есть в `assets/incoming/<имя-пака>/`. Нарезку листов, масштаб, цветокоррекцию и переименование сделаю я скриптом, как уже сделано для FLARE (`tools/flare/`).
- Старые файлы не удаляются: если новый файл не загрузится, игра покажет прежний арт.

### Важно про требования «8 направлений × 256 px»

Лист героя на 8 направлений × 7 анимаций × ~8 кадров × 256×256 — это около 450 кадров и **~110 МБ видеопамяти на одного персонажа**. На iPhone игра упадёт уже на двух персонажах (17.10 игра уже зависала на телефоне из-за 5 МБ сборки). Рекомендую так:

- **5 рендеренных направлений** (S, SE, E, NE, N); SW, W и NW получаются зеркалом. Визуально это 8 направлений.
- **Кадр 256×256 для героев и боссов, 192×192 для рядовых врагов.** Хранить в WebP и обрезать пустые поля (это делает мой скрипт).
- Пара `walk`/`run`: в игре одна скорость движения, поэтому `run` можно не качать. Если он есть в паке, использую его вместо `walk`.

### Важно про стиль

Бесплатных **анимированных** спрайтов в стиле hand-painted digital painting нет. Все бесплатные паки нужного качества — это пререндер из 3D. Ближе всего к «современному не пиксельному» стоит Engvee: кадр до 512 px, реалистичный рендер. Нарисованными вручную реально сделать только **статичные** вещи: фон меню, портреты, иконки, логотип, тайлы и пропсы. Их можно сгенерировать в Canva или Midjourney по промптам из `docs/ASSETS.md`. Анимацию нейросеть не держит: персонаж меняется от кадра к кадру.

Ссылки ниже проверены 17.10.2026 (подробности и лицензии в `docs/FREE_ASSETS.md`). Ссылки с пометкой «не проверял» — это главные страницы каталогов, конкретный файл там нужно выбрать.

### 3.1 Герои (4 класса)

| Файл (итоговое имя) | Папка | Заменяет ключ | Требования | Бесплатный источник |
|---|---|---|---|---|
| `hero_blade.webp` + `hero_blade.json` | `assets/hd/` | `hero_blade` | 5 направлений, idle 4–8, walk 8, attack 4–8, cast 4–8, hit 2–4, death 6–10; кадр 256×256, PNG/WebP с альфой; ноги в одной точке во всех кадрах | Engvee Isometric Knight Girl https://engvee.itch.io/isometric-knight-girl (мечница, 11 видов ударов); или рендер Isometric Hero https://opengameart.org/content/isometric-hero-and-heroine (.blend) с двумя клинками |
| `hero_witch.webp` + `.json` | `assets/hd/` | `hero_witch` | то же; обязателен `cast` | рендер Isometric Hero and Heroine (героиня, анимация cast 4); KayKit Mage https://kaylousberg.itch.io/kaykit-adventurers + Mixamo https://www.mixamo.com |
| `hero_bone.webp` + `.json` | `assets/hd/` | `hero_bone` | то же; щит и молот | Isometric Mini-Crusader https://opengameart.org/content/isometric-mini-crusader; KayKit Knight |
| `hero_shade.webp` + `.json` | `assets/hd/` | `hero_shade` | то же; лук или кинжалы | Engvee Animated Isometric Thief https://engvee.itch.io/animated-isometric-thief |

`.json` пишу я сам по скачанному паку. От тебя нужен только лист или архив.

### 3.2 Враги и боссы

В игре сейчас **4 типа врагов и 1 босс** (`src/data/enemies.ts`). Для 12 типов и 3 боссов мало добавить арт: каждому новому врагу нужны характеристики, поведение и место в генераторе этажей. Это отдельная задача на геймплей, ниже она помечена «новый».

| Файл | Папка | Заменяет ключ | Требования | Бесплатный источник |
|---|---|---|---|---|
| `en_ghoul.webp` | `assets/hd/` | `en_ghoul` | 5 направлений, idle/walk/attack/hit/death, 192×192 | Zombie Sprites https://opengameart.org/content/zombie-sprites; Engvee Blazing Mummy https://engvee.itch.io/free-animated-isometric-blazing-mummy |
| `en_wolf.webp` | `assets/hd/` | `en_wolf` (сейчас вектор) | то же | Wolf monsters animated https://opengameart.org/content/wolf-monsters-animated |
| `en_cultist.webp` | `assets/hd/` | `en_cultist` | то же + cast | Skeletal Occultist https://opengameart.org/content/flare-skeleton-mod-skeletal-occultist |
| `en_shadow.webp` | `assets/hd/` | `en_shadow` | то же | Smoke aura https://opengameart.org/content/smoke-aura поверх силуэта, или Engvee Demon https://engvee.itch.io/free-animated-isometric-demon в тёмной перекраске |
| `en_herald.webp` | `assets/hd/` | `en_herald` (сейчас вектор) | 5 направлений, кадр 384×384, idle/walk/attack/cast/hit/death | Engvee Medusa https://engvee.itch.io/animated-isometric-medusa (заклинатель); фазы босса делаются кодом |
| `en_skeleton.webp` (новый) | `assets/hd/` | — | 192×192 | Skeleton Warrior https://opengameart.org/content/skeleton-warrior-0 |
| `en_skelmage.webp` (новый) | `assets/hd/` | — | 192×192 + cast | High Skeleton Mage https://opengameart.org/content/flare-mod-high-skeleton-mage |
| `en_demon.webp` (новый) | `assets/hd/` | — | 192×192 | Demon Flare https://opengameart.org/content/demon-flare-sprite-sheets (CC0) |
| `en_hellbeast.webp` (новый) | `assets/hd/` | — | 192×192 | Engvee HellBeast https://engvee.itch.io/free-animated-isometric-hellbeast |
| `en_minotaur.webp` (новый) | `assets/hd/` | — | 256×256 | Minotaur https://opengameart.org/content/minotaur |
| `en_flyer.webp` (новый) | `assets/hd/` | — | 192×192 | Flying terror https://opengameart.org/content/flying-terror |
| `en_halberd.webp` (новый) | `assets/hd/` | — | 192×192 | Engvee Halberd Warrior https://engvee.itch.io/animated-isometric-halberd-warrior |
| `en_zombie.webp` (новый) | `assets/hd/` | — | 192×192 | Engvee Zombies https://engvee.itch.io/animated-isometric-zombie |
| `boss_dragon.webp` (новый) | `assets/hd/` | — | 384×384 | Engvee Three-Head Dragon https://engvee.itch.io/isometric-three-head-dragon |
| `boss_tree.webp` (новый) | `assets/hd/` | — | 384×384 | Engvee Haunted Tree https://engvee.itch.io/free-haunted-tree |

### 3.3 Тайлсеты

Сетка игры 2:1, тайл на экране 64×32, текстуры в 2× (128×64). Тайлы 128×128 или 256×512 подойдут, если пол — ромб 2:1. Высокие файлы нужны для стен. Пол 256×128 я сам ужму до 128×64 или переведу игру на 4× для HiDPI.

| Файл | Папка | Заменяет ключ | Требования | Бесплатный источник |
|---|---|---|---|---|
| `floor_catacombs_0…5.webp` (6 вариантов) | `assets/hd/` | `floor_catacombs_*` | ромб 2:1, 256×128, бесшовно по краям ромба, альфа вне ромба | Classic Dungeon Walls / Cave Tileset (FLARE, уже частично стоят); Isometric Stone Soup https://screamingbrainstudios.itch.io/isometric-stone-soup (CC0) |
| `wall_catacombs_0,1,2,3,4,9.webp` | `assets/hd/` | `wall_catacombs_*` | 256×~440, основание — ромб 256×128; 9 = разрушенная стена | Classic Dungeon Walls https://opengameart.org/content/classic-dungeon-walls |
| `floor_ashlands_0…5.webp` | `assets/hd/` | `floor_ashlands_*` | как у Катакомб; пепел, трещины с углями | Stone Soup; Old Ruins https://opengameart.org/content/old-ruins-tileset; **или генерация** по промпту из `docs/ASSETS.md` |
| `wall_ashlands_0,1,2,3,4,9.webp` | `assets/hd/` | `wall_ashlands_*` | как у Катакомб | Free Isometric Ruins https://opengameart.org/content/free-isometric-ruins (CC0) |
| `tree_0…2.webp`, `grave`, `brazier`, `crystal`, `cart`, `banner`, `pillar_*`, `decal_*`, `trap_on/off` | `assets/hd/` | одноимённые | изометрия 2:1, альфа | Isometric Dead Trees https://opengameart.org/content/isometric-dead-trees; Isometric mug and torch pack https://opengameart.org/content/isometric-mug-and-torch-pack-flare |

### 3.4 UI

| Файл | Папка | Заменяет | Требования | Бесплатный источник |
|---|---|---|---|---|
| `ui_panel.png` (9-slice) | `assets/hd/ui/` | рамки панелей из `Graphics` в `ui/widgets.ts` | 512×512, края 64 px, тёмная бронза | Flare Windows https://opengameart.org/content/flare-windows (CC0); Kenney Fantasy UI Borders https://kenney-assets.itch.io/fantasy-ui-borders |
| `ui_button.png`, `ui_button_hover.png`, `ui_button_down.png` | `assets/hd/ui/` | кнопки в `ui/widgets.ts` | 9-slice, 3 состояния | Flare Buttons https://opengameart.org/content/flare-buttons (CC0) |
| `slot.png`, `skillslot.png` | `assets/hd/ui/` | `slot`, `skillslot` | 128×128, альфа | Flare Windows; Dark Fantasy UI Kit (демо) https://desertcodex.itch.io/dark-fantasy |
| `orb_frame.png`, `orb_glass.png`, `orb_hp.png`, `orb_res.png` | `assets/hd/ui/` | одноимённые | 256×256, жидкость отдельным слоем | Dark Fantasy UI Kit (демо); или генерация |
| `bar_xp.png` | `assets/hd/ui/` | полоса опыта (сейчас `Graphics`) | 1024×32, 9-slice | Kenney UI Pack RPG Expansion https://opengameart.org/content/ui-pack-rpg-extension |
| мини-карта, маркеры квестов | — | — | **оставить кодом**: бесплатных в нашем стиле нет | — |

### 3.5 Иконки

| Файл | Папка | Заменяет | Требования | Бесплатный источник |
|---|---|---|---|---|
| `it_blades.png` … `it_shard.png` (18 шт., имена как в списке ключей выше) | `assets/hd/icons/` | `it_*` | 256×256, альфа или тёмный фон, живопись | Fantasy Icon Pack (Ravenmore) https://opengameart.org/content/fantasy-icon-pack-by-ravenmore-0; **или генерация в Canva** |
| `sk_blade_basic.png` … `sk_shade_vault.png`, `sk_dodge`, `sk_potion` (18 шт.) | `assets/hd/icons/` | `sk_*` | 256×256 | Painterly Spell Icons 1 и 2 https://opengameart.org/content/painterly-spell-icons-part-1 , https://opengameart.org/content/painterly-spell-icons-part-2 |
| `gem_0…5` | — | — | оставить кодом | — |

### 3.6 VFX

| Файл | Папка | Заменяет | Требования | Бесплатный источник |
|---|---|---|---|---|
| `fx_slash.webp` (лист) | `assets/hd/fx/` | `slash` | 6–10 кадров по 256×256, огненный вариант | Weapon Slash Effect https://opengameart.org/content/weapon-slash-effect (CC0) |
| `fx_fireball.webp`, `fx_explosion.webp` | `assets/hd/fx/` | `proj_fireball`, взрывы `systems/Fx.ts` | листы 256×256 | Spell animation spritesheets https://opengameart.org/content/spell-animation-spritesheets |
| `fx_portal.webp` | `assets/hd/fx/` | `portal` (вихрь) | лист, бесшовный луп | Teleporter effect https://opengameart.org/content/teleporter-effect (CC0) |
| `fx_flame.webp` | `assets/hd/fx/` | `flame` | 256×300, луп | Magic flame https://opengameart.org/content/magic-flame (CC0) |
| `fx_aura_shadow.webp` | `assets/hd/fx/` | ауры элит | 256×256, луп | Smoke aura https://opengameart.org/content/smoke-aura (CC0) |
| `fx_fog.png` | `assets/hd/fx/` | туман (сейчас пятна `glow`) | 1024×512, тайлится по горизонтали | Thick Fog https://opengameart.org/content/thick-fog (CC0) |
| `p_*.png` | `assets/hd/fx/` | частицы | 64×64 | Kenney Particle Pack https://opengameart.org/content/particle-pack-80-sprites (CC0) |

### 3.7 Шрифты, меню, логотип, портреты, NPC

| Файл | Папка | Заменяет | Требования | Источник |
|---|---|---|---|---|
| `CormorantGaramond-*.woff2`, `CormorantSC-*.woff2` | `assets/fonts/` | веб-шрифты Google Fonts | WOFF2 или TTF с кириллицей | https://fonts.google.com/specimen/Cormorant (OFL) |
| `RuslanDisplay-Regular.ttf` (по желанию, для заголовков) | `assets/fonts/` | — | TTF, кириллица | https://fonts.google.com/specimen/Ruslan+Display (OFL) |
| `menu_bg.webp` | `assets/hd/` | `menu_bg` | 2560×1440 (минимум 1920×1080), без текста | **бесплатного нет**: генерация по промпту из `docs/ASSETS.md` или рендер в Blender (Poly Haven https://polyhaven.com + Quaternius https://quaternius.com/packs/medievalvillagemegakit.html) |
| `logo.png`, `app_icon_512.png` | `assets/hd/ui/` | надпись-текст в `MenuScene.ts` | PNG с альфой, 2048 px по ширине; иконка 512×512 | делается сам: Inkscape https://inkscape.org + шрифт; могу собрать SVG |
| `portrait_blade.png` … `portrait_shade.png` | `assets/hd/portraits/` | спрайты на карточках выбора героя | 512×512 | FLARE Portrait Packs https://opengameart.org/content/flare-portrait-pack-number-one ; Portrait Pack (Calciumtrice) https://opengameart.org/content/portrait-pack ; или генерация |
| NPC: торговец, кузнец, стражник, квестодатель | `assets/hd/` | — (**в игре нет NPC и хаба**) | как у врагов | Flare NPCs pack 1 https://opengameart.org/content/flare-npcs-animated-pack-1 ; нужен геймплей хаба (роадмап, неделя 3) |

### 3.8 Музыка

Формат: **OGG Vorbis и MP3** одного трека рядом, 44,1 кГц, стерео. Safari на iPhone поддерживает OGG не во всех версиях, поэтому MP3 нужен как запасной вариант, иначе на части телефонов будет тишина. Луп: начало и конец сведены, без тишины в начале.

| Файл | Папка | Заменяет | Требования | Бесплатный источник |
|---|---|---|---|---|
| `music_menu.ogg` + `.mp3` | `assets/audio/music/` | тишина в меню | 2–3 мин, оркестр + хор без слов, 90–100 BPM | CC0 Cinematic Music https://opengameart.org/content/cc0-cinematic-music (выбрать мрачный трек) |
| `music_explore.ogg` + `.mp3` | `assets/audio/music/` | `Sfx.startAmbient` (Пустоши) | 3–4 мин, dark ambient, 60–70 BPM, бесшовный луп | Dark Ambience Loop https://opengameart.org/content/dark-ambience-loop (CC-BY 3.0); Fantasy Music & Drum Loops https://opengameart.org/content/fantasy-music-and-drum-loops-pack |
| `music_dungeon.ogg` + `.mp3` | `assets/audio/music/` | `Sfx.startAmbient` (Катакомбы) | 3–4 мин, 50–60 BPM, луп | Loopable Dungeon Ambience https://opengameart.org/content/loopable-dungeon-ambience (CC0) |
| `music_combat.ogg` + `.mp3` | `assets/audio/music/` | — (новое) | 2–3 мин, 120–130 BPM, луп | Fantasy Music & Drum Loops (боевые барабаны); CC0 Cinematic Music |
| `music_boss.ogg` + `.mp3` | `assets/audio/music/` | — (новое) | 3–4 мин, 130–140 BPM, луп | CC0 Cinematic Music (раздел «боссы») |
| `jingle_victory.ogg` + `.mp3` | `assets/audio/music/` | — (новое) | 15–30 с | CC0 Cinematic Music; Mixkit https://mixkit.co/free-stock-music/ (не проверял) |
| `jingle_defeat.ogg` + `.mp3` | `assets/audio/music/` | — (новое) | 15–30 с | то же |

Честно: бесплатной оркестровой музыки с хором точно под ТЗ (BPM, длительность, единая тема) нет. Бесплатные треки придётся подбирать из разных авторов. Единый саундтрек — это заказ композитору или генерация в музыкальной нейросети с коммерческой лицензией.

### 3.9 Звуковые эффекты

Формат: OGG (и MP3 для iPhone) или WAV, 44,1 кГц, без шума и щелчков в начале. Варианты нумеруются `_1`, `_2`, `_3`; игра будет выбирать случайный и слегка менять высоту тона.

| Файл | Папка | Заменяет событие `Sfx.play` | Источник |
|---|---|---|---|
| `sfx_swing_1…3` | `assets/audio/sfx/` | `swing` | 80 CC0 RPG SFX https://opengameart.org/content/80-cc0-rpg-sfx (клинки); Sonniss https://sonniss.com/gameaudiogdc/ |
| `sfx_hit_1…3`, `sfx_crit` | `assets/audio/sfx/` | `hit`, `crit` | Sonniss; Kenney 50 RPG SFX https://opengameart.org/content/50-rpg-sound-effects |
| `sfx_arrow` | `assets/audio/sfx/` | `arrow` | 80 CC0 RPG SFX |
| `sfx_cast_fire`, `sfx_fire_loop`, `sfx_explode` | `assets/audio/sfx/` | `cast` (Ведьма), `fire`, `explode` | 80 CC0 RPG SFX (заклинания огня); Sonniss |
| `sfx_cast_shadow` | `assets/audio/sfx/` | `cast` (Тень), `portal` у врагов | Sonniss |
| `sfx_heal` | `assets/audio/sfx/` | `potion` | 80 CC0 RPG SFX |
| `sfx_step_stone_1…4`, `sfx_step_ash_1…4` | `assets/audio/sfx/` | — (новое событие шагов) | Kenney 50 RPG SFX (шаги); Freesound https://freesound.org (фильтр CC0, не проверял) |
| `sfx_chest`, `sfx_pickup`, `sfx_gold` | `assets/audio/sfx/` | `chest`, `pickup`, `gold` | Kenney 50 RPG SFX (монеты, ткань) |
| `sfx_enemy_death_1…3`, `sfx_boss_death`, `sfx_hero_death` | `assets/audio/sfx/` | `death` (разделю на три события) | 80 CC0 Creature SFX https://opengameart.org/content/80-cc0-creature-sfx |
| `sfx_hurt_1…2`, `sfx_roar`, `sfx_boss_intro` | `assets/audio/sfx/` | `hurt`, `roar`, `boss` | 80 CC0 Creature SFX |
| `sfx_portal`, `sfx_door` | `assets/audio/sfx/` | `portal`; дверь — новое (дверей в игре нет, применю к тайнику за стеной `wall`) | Sonniss |
| `sfx_trap` | `assets/audio/sfx/` | `trap` | 80 CC0 RPG SFX |
| `sfx_levelup`, `sfx_quest` | `assets/audio/sfx/` | `levelup`; квест — новое событие | Sonniss; Mixkit https://mixkit.co/free-sound-effects/game/ (не проверял) |
| `sfx_ui_click`, `sfx_ui_hover` | `assets/audio/sfx/` | `ui` | Kenney 50 RPG SFX |
| `sfx_dodge`, `sfx_stun`, `sfx_wall` | `assets/audio/sfx/` | `dodge`, `stun`, `wall` | Sonniss |

## 4. План интеграции (после подтверждения, каждый шаг с diff)

1. **Загрузчик HD-ассетов.** Новый `src/art/hd.ts` по образцу `external.ts`: `import.meta.glob('assets/hd/**/*.{webp,png}')` и манифест `assets/hd/manifest.json`. Порядок приоритета: HD → FLARE → процедурный. В `BootScene.preload` добавить `queueHdArt(this)` и экран загрузки с процентами, потому что файлов станет больше.
2. **Пути.** Пути в коде не меняются: ключи текстур остаются прежними (`hero_blade`, `it_helm` …), меняется только источник. Новым врагам и боссам — новые записи в `data/enemies.ts` (это уже геймплей, отдельным diff).
3. **Кадры.** Скрипт `tools/hd/pack.py` режет скачанный лист, обрезает поля, выравнивает точку ног, пишет `fw`, `fh`, `footY` и диапазоны анимаций в манифест. Для 5 направлений переделать `Actor.play` и `setFlipX` (`src/entities/Actor.ts:58–71`): выбор строки листа по углу движения вместо двух сторон S/N.
4. **Музыка.** Новый `src/core/Music.ts` на Phaser Sound (Web Audio): `load.audio` с парой `[ogg, mp3]`, состояния `menu / explore / dungeon / combat / boss / victory / defeat`, кроссфейд 1,5 с, бесшовный луп. Переключение: меню в `MenuScene`; тема этажа в `GameScene.buildFloor`; бой, когда рядом есть агрессивный враг; босс при пробуждении Глашатая; джинглы на смерть героя и победу над боссом. `Sfx.startAmbient` остаётся запасным вариантом, если файлов нет.
5. **SFX.** `Sfx.play(name)` сохраняет интерфейс: если для имени есть загруженный файл, играет его (случайный вариант, высота ±5%), иначе синтез, как сейчас. Новые события: шаги по анимации `walk` (камень или пепел по теме), разделение `death` на врага, босса и героя, квест в `GameScene` при выполнении цели.
6. **Громкость.** Мастер 0 dB (×1.0), музыка −12 dB (×0.25), SFX −6 dB (×0.5); ползунки «Звуки» и «Музыка» умножаются поверх. Сейчас `musicBus = music × 0.6`, это около −4 dB, поэтому синтез заменю на эти значения.
7. **Проверка.** Сборка `npm run build`, дымовой тест `node tools/smoke.cjs` (меню → бой → босс), проверка консоли на ошибки загрузки, вес сборки для iPhone (цель: до 25 МБ ассетов, ленивая загрузка Катакомб и боссов), снимки до и после, публикация по той же ссылке.

## 5. Чек-лист: что скачать и куда положить

**Минимум, который сразу сильно изменит игру:**

- [ ] 5 музыкальных тем + 2 джингла (OGG + MP3) → `assets/audio/music/`
- [ ] SFX: 80 CC0 RPG SFX, 80 CC0 Creature SFX, Kenney 50 RPG SFX → архивы в `assets/incoming/`, разберу сам
- [ ] Engvee Knight Girl и Animated Isometric Thief → `assets/incoming/engvee-knight/`, `assets/incoming/engvee-thief/` (Клинок и Тень)
- [ ] Isometric Hero and Heroine (с .blend) → `assets/incoming/hero-heroine/` (Ведьма и Костолом; рендер в Blender сделаю здесь же)
- [ ] Engvee Medusa → `assets/incoming/engvee-medusa/` (Глашатай)
- [ ] Wolf monsters animated, Zombie Sprites, Skeletal Occultist → `assets/incoming/…` (4 текущих врага)
- [ ] `menu_bg.webp` 2560×1440 (сгенерировать) → `assets/hd/`

**Второй заход:**

- [ ] Painterly Spell Icons 1–2 и Ravenmore Fantasy Icon Pack → `assets/incoming/icons/`
- [ ] Flare Windows, Flare Buttons → `assets/incoming/ui/`
- [ ] Weapon Slash, Teleporter, Magic flame, Thick Fog, Kenney Particle Pack → `assets/incoming/fx/`
- [ ] Шрифты Cormorant (WOFF2) → `assets/fonts/`
- [ ] Портреты героев 512×512 → `assets/hd/portraits/`

**Отдельные задачи на геймплей (не только ассеты):** 8 новых врагов и 2 новых босса, NPC и хаб, двери.

**Как скачивать:** opengameart.org и itch.io из моей среды закрыты прокси, поэтому архивы скачиваешь ты и кладёшь в папку проекта (через загрузку в тред или в папку на компьютере). Лицензии CC-BY и CC-BY-SA требуют указать авторов: я допишу их в `CREDITS.md` при интеграции.
