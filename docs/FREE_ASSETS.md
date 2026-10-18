# Бесплатные ассеты для Ashen Crown: проверенный список

Дата проверки: 17.10.2026. Каждая ссылка ниже открыта, а лицензия прочитана на самой странице. Лицензии авторы иногда меняют, поэтому перед релизом проверьте их ещё раз (см. раздел «Как проверить лицензию»).

**Что важно знать про нашу игру, прежде чем качать:**

- Тайл в игре 64×32 (`src/config.ts`), арт рисуется в 2× (128×64) и показывается в масштабе 0.5. Ассеты движка **FLARE** (Clint Bellanger и сообщество OpenGameArt) сделаны ровно под **базовый тайл 64×32** и в том же «пререндер из 3D, мрачное фэнтези» стиле. Это самое удачное бесплатное совпадение с нашей игрой.
- Персонажи сейчас используют 2 стороны (3/4 спереди и 3/4 сзади, остальное зеркалом). Любой пак на 8 или 16 направлений подходит с запасом: можно взять нужные стороны или включить полноценные 8 направлений.
- Шрифты Cormorant Garamond и Cormorant SC (OFL, с кириллицей) в игре уже стоят.
- Пиксель-арт (16×16, 32×32) по стилю нам **не подходит**: игра нарисована в живописной манере в высоком разрешении. Такие паки я в основные таблицы не включал.

**Лицензии коротко:**

| Лицензия | Можно в коммерческой игре | Что обязательно |
|---|---|---|
| CC0 | да | ничего (благодарность по желанию) |
| CC-BY 3.0/4.0 | да | указать автора в титрах/CREDITS |
| CC-BY-SA 3.0/4.0 | да | указать автора; **изменённые версии этого арта** распространять под CC-BY-SA. На код игры не распространяется |
| OGA-BY 3.0 | да | как CC-BY, но без запрета DRM |
| GPL/LGPL (только) | рискованно | требования к распространению; если у ассета есть альтернатива CC-BY, выбирайте её |
| «Своя лицензия автора» (itch.io) | обычно да | читать текст на странице, сохранить скриншот |
| CC-BY-ND | только без изменений | нельзя перекрашивать и редактировать |

Колонка «Подходит» ниже: **да** означает, что пак встаёт почти без переделки; **частично** — нужен перекрас, пересборка листа, другой масштаб или рендер из 3D; **нет** — стиль или формат не наш, указан для полноты.

---

## 1. Персонажи (герои)

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Isometric Hero and Heroine (Clint Bellanger) | https://opengameart.org/content/isometric-hero-and-heroine | кадр 128×128, 8 направлений, PNG-листы + Blender-исходник | CC-BY 3.0 | герой и героиня: stance 4, run 8, melee 4, block 2, hit+die 6, cast 4, shoot bow 4 | **да**: база для всех 4 классов, оружие и одежду можно перерендерить из .blend |
| FLARE Avatar Clothes Spritesheet (Metapixelatron) | https://opengameart.org/content/flare-avatar-clothes-spritesheet-modular-isometric-fantasy-character-sprite | 8 направлений, 32 кадра на направление, модульные слои | CC-BY-SA 3.0 | тело + отдельные слои одежды (рубаха, штаны, перчатки, сандалии) для смены экипировки | **частично**: экипировка на кукле, но одежда «крестьянская» |
| Isometric: Mini-Crusader (Bleed) | https://opengameart.org/content/isometric-mini-crusader | 8 направлений, PNG, тени отдельным слоем | CC-BY 4.0 | idle, walk, run, jump, attack, block, hit, death | **частично**: рыцарь со щитом под Костолома, но персонаж мелкий |
| Archer — Bleed's Game Art | https://opengameart.org/content/archer-bleeds-game-art | 8 направлений, PNG | CC-BY 3.0 | лучник: idle, walk, run, attack, death | **частично**: под ассасина с луком |
| Engvee — Isometric Knight Girl | https://engvee.itch.io/isometric-knight-girl | 16 направлений, кадр 180/256/320, листы RGBA4444 | своя лицензия автора: коммерция да, правки да | 26 анимаций: 11 видов ударов, cast ×2, block, hit ×2, death ×4, run, idle | **да** для мечника; пререндер реалистичного 3D |
| Engvee — Animated Isometric Thief | https://engvee.itch.io/animated-isometric-thief | 8 или 12 направлений, кадр 256 (HQ 512) | своя: коммерция да, без указания автора; нельзя перепродавать пак | 19 анимаций: attack ×4, dash, stun, death, hit, talk, run | **да** для Тени Пустоты (ассасин) |
| Engvee — Prototyping Hero | https://engvee.itch.io/animated-isometric-prototyping-hero | 16 направлений, кадр 180/256/320 | своя: коммерция да | базовый герой для прототипа | **частично**: заготовка |
| KayKit Character Pack: Adventurers | https://kaylousberg.itch.io/kaykit-adventurers | 3D (.FBX/.GLTF), рендерить самому | CC0 | Knight, Barbarian, Rogue (+ в капюшоне), Mage, Ranger; оружие | **частично**: ровно наши 4 класса, но мультяшные пропорции; нужен рендер в Blender в тёмной палитре |
| KayKit Character Animations | https://kaylousberg.itch.io/kaykit-character-animations | 3D-анимации | CC0 | 150+ анимаций: удары одной/двумя руками, двуручное, парные клинки, луки, каст, hit, death | **частично**: под KayKit-персонажей |
| Mixamo (Adobe) | https://www.mixamo.com | 3D-анимации и персонажи, нужен аккаунт Adobe | royalty-free для игр (FAQ: https://helpx.adobe.com/ca/creative-cloud/faq/mixamo-faq.html) | тысячи анимаций, авто-риг своих моделей | **частично**: инструмент, если будете рендерить героев из 3D |

**Вывод:** готового бесплатного набора «4 тёмных героя в одном стиле со всеми анимациями» нет. Самый реальный путь: взять **Isometric Hero and Heroine** (есть .blend) или KayKit-модели, переодеть в Blender и отрендерить все 4 класса одной камерой и светом. Для мечника и ассасина можно сразу взять Engvee Knight Girl и Thief.

---

## 2. Враги и монстры

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Skeleton Warrior (Clint Bellanger) | https://opengameart.org/content/skeleton-warrior-0 | 128×128, 8 направлений, под тайл 64×32 | CC-BY 3.0 | stance 4, walk 8, attack 4, cast 4, block 2, hit+die 6, crossbow 4 | **да**: скелеты-культисты |
| FLARE Mod — Skeletal Occultist (VWolfdog) | https://opengameart.org/content/flare-skeleton-mod-skeletal-occultist | PNG-лист + .blend (размер на странице не указан) | CC-BY 3.0 | скелет-оккультист на базе Skeleton Warrior | **да**: жрецы/культисты |
| FLARE Mod — High Skeleton Mage (VWolfdog) | https://opengameart.org/content/flare-mod-high-skeleton-mage | PNG-лист + .blend | CC-BY 3.0 | высший скелет-маг | **да**: элитный жрец |
| Zombie Sprites (Clint Bellanger) | https://opengameart.org/content/zombie-sprites | 128×128, 8 направлений, 36 кадров на направление | CC-BY 3.0 | stance, lurch, slam, bite, block, hit+die, critical death | **да**: пепельные гули (перекрасить в пепел) |
| Minotaur (Clint Bellanger) | https://opengameart.org/content/minotaur | изометрия FLARE | CC-BY 3.0 | stance 4, bull rush 8, swing 4, block 2, hit+die 6 | **да**: тяжёлый враг или мини-босс |
| Demon — Flare sprite sheets | https://opengameart.org/content/demon-flare-sprite-sheets | PNG-лист + .blend | CC0 | idle 4, walk 9, attack ×2, cast 6, flinch 2, die 11 | **да**: демоны |
| Wolf monsters animated (Danimal) | https://opengameart.org/content/wolf-monsters-animated | лист FLARE | CC-BY-SA 3.0/4.0 | idle, run, attack, death, critical death, spell/breath | **да**: теневые волки |
| Flying terror (Danimal) | https://opengameart.org/content/flying-terror | лист FLARE + 3D | CC-BY-SA 4.0 | flying, attack, death, critical death | **да**: крылатые твари |
| Fire/Ice/Stone Golem (umask007) | https://opengameart.org/content/fireicestone-golem | только 3D (.blend), нужен рендер | CC-BY 3.0 / CC-BY-SA 3.0 | голем: walk, attack ×2, flinch, die, idle | **частично**: обсидиановый голем после рендера |
| Engvee — FREE Demon | https://engvee.itch.io/free-animated-isometric-demon | 16 направлений, кадр 180/256/320 | своя: коммерция да, правки да | 15 анимаций: attack ×4, блоки, hit, walk, run, death | **да** |
| Engvee — FREE HellBeast | https://engvee.itch.io/free-animated-isometric-hellbeast | 16 направлений, кадр 180/256/320 | своя: коммерция да | attack ×3, roar, hit, death, run, walk | **да**: пепельная тварь |
| Engvee — FREE Blazing Mummy | https://engvee.itch.io/free-animated-isometric-blazing-mummy | 16 направлений, кадр 96–320 | своя: коммерция да | bite, punch, crawl, run, death ×2 | **да**: горящий гуль |
| Engvee — Zombies | https://engvee.itch.io/animated-isometric-zombie | 16 направлений, кадр 256 (HQ 512) | своя: коммерция да | attack ×4, death ×2, hit L/R, roar, walk, run | **да** |
| Engvee — Halberd Warrior | https://engvee.itch.io/animated-isometric-halberd-warrior | 16 направлений, кадр 180/256/320 | своя: коммерция да | attack ×3, death, hit, idle, run, walk | **да**: стражи и культисты-воины |

Покрывает 12+ типов: скелет-воин, скелет-оккультист, скелет-маг, гуль, горящая мумия, зомби, демон, адская тварь, волк, летающая тварь, голем, минотавр, алебардщик.

**Нюанс стиля:** FLARE-враги (Clint Bellanger и сообщество) и Engvee — оба пререндер 3D, но у Engvee детальнее и крупнее кадр. Внутри одного биома лучше держаться одного источника.

---

## 3. Боссы

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Engvee — Isometric Three-Head Dragon | https://engvee.itch.io/isometric-three-head-dragon | 8 или 12 направлений, кадр 256 (HQ 512) | своя: коммерция да | attack ×4, fire breath (дальняя атака), hit, death, idle ×2, walk | **да**: крупный босс с огнём |
| Engvee — Animated Isometric Medusa | https://engvee.itch.io/animated-isometric-medusa | 16 направлений, кадр 180/256/320, исходники 1024 | своя: коммерция да; 3D-модель Artcoding | attack ×3, cast (дальняя атака), hit, death, idle ×2, walk | **да**: босс-заклинатель |
| Engvee — Ice Beast | https://engvee.itch.io/animated-isometric-ice-beast | 16 направлений, кадр 180/256/320 | **на странице лицензия не указана**, уточнить у автора | attack ×8, battle cry, death, hit, run, walk | **частично**: перекрасить в обсидиан и угли |
| Wyvern (Clint Bellanger + Justin Nichol) | https://opengameart.org/content/wyvern-1 | 256×256, 8 направлений, по 8 кадров | CC-BY-SA 3.0 | hover, fly, sting, breathe, ram, hit, die | **да**: летающий босс |
| Engvee — Haunted Tree | https://engvee.itch.io/free-haunted-tree | 16 направлений, кадр 180/256/320 | своя: коммерция да | awake, idle, walk, attack ×2, hit, death | **да**: мини-босс Пепельных Пустошей |

**Честно:** бесплатных боссов с отдельными анимациями **summon** и **сменой фазы** нет нигде. Фазы делаются кодом: перекраска (tint), смена атаки, свечение. Призыв можно собрать из анимации cast/roar и VFX портала. Для 4 боссов из GDD хватит дракона, медузы, виверны и монстра-перекраса; если нужен оригинальный образ Глашатая Пустого Солнца, его придётся рисовать или генерировать (раздел «Альтернативы»).

---

## 4. Тайлсеты (Катакомбы и Пустоши)

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Classic Dungeon Walls (Clint Bellanger) | https://opengameart.org/content/classic-dungeon-walls | под тайл 64×32, спрайт стены 128×128, PNG с альфой | CC-BY 3.0 | кирпич, камень, статуи, цепи, факельные бра, гобелены, решётка | **да**: Катакомбы |
| Cave Tileset (Clint Bellanger) | https://opengameart.org/content/cave-tileset | под 64×32 (лист для Tiled) | CC-BY 3.0 | стены (прямые/углы), 16 вариантов пола, кости, обломки, сталагмиты, вода, вагонетки | **да**: нижние ярусы Катакомб |
| Temple Entrance (Clint Bellanger) | https://opengameart.org/content/temple-entrance | под 64×32, занимает 4×4 тайла | CC-BY-SA 3.0 (или GPL) | вход в подземный храм, вариант с лозами | **да**: вход в Катакомбы |
| Old Ruins Tileset (rubberduck) | https://opengameart.org/content/old-ruins-tileset | 128×64 и 64×32 | CC-BY-SA 3.0 | руины, рендер Cycles, есть зимний вариант, .blend | **да**: Пустоши (перекрасить в пепел) |
| Isometric Stone Soup (Screaming Brain Studios) | https://screamingbrainstudios.itch.io/isometric-stone-soup | 64×32, 1895 тайлов, **86 файлов .tsx для Tiled** | CC0 | 593 пола и 1302 стены, фон пурпурный (убрать в альфу) | **да**: огромная база полов и стен обоих биомов |
| Isometric Dungeon Tiles (Kenney) | https://kenney-assets.itch.io/isometric-dungeon-tiles | 70+ тайлов, PNG, примеры для Tiled и Unity | CC0 | стены, полы, лестницы, бочки, ящики | **частично**: стиль чистый «игрушечный», нужен перекрас |
| Free Isometric Ruins (rubberduck) | https://opengameart.org/content/free-isometric-ruins | PNG + .blend | CC0 | набор руин | **да**: Пустоши |
| Isometric Dead Trees (Varkalandar) | https://opengameart.org/content/isometric-dead-trees | 6 крупных PNG | CC-BY 3.0 / CC-BY-SA 3.0 / OGA-BY 3.0 | мёртвые деревья с корнями и без | **да**: Пустоши |
| 2D Isometric: Rendered Objects (Brian Pressley) | https://lpc.opengameart.org/node/25448 | 14 листов, объекты в 8 направлениях | CC-BY 3.0 | 30+ пререндеренных пропсов | **частично** |
| 64x64 isometric roguelike tiles (RLTiles) | https://opengameart.org/content/64x64-isometric-roguelike-tiles | 64×64 | CC-BY 3.0 | стены, монстры, подземелье из Dungeon Crawl | **нет**: мелко и старомодно |
| KayKit Dungeon Remastered | https://kaylousberg.itch.io/kaykit-dungeon-remastered | 3D: 200 моделей (.FBX/.GLTF/.OBJ) | CC0 | стены, колонны, сундуки, факелы, двери | **частично**: только через рендер в Blender |

**Про Tiled:** наши уровни генерируются кодом (`DungeonGen.ts`), так что Tiled не обязателен. Тайлы 64×32 из FLARE и Stone Soup встают в сетку без масштабирования.

**Не брать:** «2D Wastelands Assets Lite» (buzpin) под **CC-BY-ND 4.0**: перекрашивать нельзя.

---

## 5. UI и интерфейс

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Flare Windows (Blarumyrran) | https://opengameart.org/content/flare-windows | PNG: рамка окна, внутренняя панель, тайлящийся фон, свечение | CC0 | тёмно-фэнтезийные окна, сделаны для FLARE | **да**: инвентарь и окно персонажа |
| Flare Buttons (Blarumyrran) | https://opengameart.org/content/flare-buttons | PNG, крупные, 4 состояния + тень | CC0 | кнопки enabled/disabled/hover/pressed | **да** |
| Fantasy UI Borders (Kenney) | https://kenney-assets.itch.io/fantasy-ui-borders | 130+ спрайтов под 9-slice | CC0 | рамки окон и диалогов | **да** после перекраса в бронзу и ржавчину |
| UI Pack: RPG Expansion (Kenney) | https://opengameart.org/content/ui-pack-rpg-extension | 87 PNG + лист + вектор | CC0 | панели, полоски HP/MP, кнопки, слоты | **частично**: светлый «пергамент», нужен перекрас |
| Dark Fantasy UI Kit (DesertCodex) | https://desertcodex.itch.io/dark-fantasy | 80+ элементов, PNG 4096×4096 | своя: коммерция да, правки да, не перепродавать | 15+ полосок HP/MP/стамины, кнопки, слоты, рамки HUD | **частично**: в категории Free есть демо с частью элементов; цена полной версии на странице не указана |
| Gothic UI / Dark Fantasy UI (GabrielaTot) | https://gabrielatot.itch.io/gothic-ui | PNG + вектор Illustrator | коммерция да (по словам автора в комментариях) | окна инвентаря, экипировки, навыков, полосы HP/MP | **да** по стилю, но **платно: от $6** |

**Честно:** готовых бесплатных **мини-карты, маркеров квестов и окна карты мира** в тёмной готике нет. Мини-карту проще рисовать кодом (как сейчас); рамку взять из Flare Windows; маркеры собрать из game-icons.net (раздел 6).

---

## 6. Иконки предметов и навыков

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| game-icons.net | https://game-icons.net | SVG (любой размер), онлайн-редактор цвета и фона | CC-BY 3.0 (условия: https://game-icons.net/about.html) | ~4000 силуэтов: оружие, магия, стихии, щиты, руны, черепа | **да**: навыки и редкость; задать цвет углей и тёмный фон |
| Painterly Spell Icons, часть 1 (J. W. Bjerk) | https://opengameart.org/content/painterly-spell-icons-part-1 | 256×256, читаются в 32×32 | CC-BY 3.0 / CC-BY-SA / GPL на выбор | огонь, защита, дурной глаз, лечение, зачарование, в цветовых вариантах | **да**: живописные, как наш арт |
| Painterly Spell Icons, часть 2 | https://opengameart.org/content/painterly-spell-icons-part-2 | 256×256 (архив 8.8 МБ) | CC-BY 3.0 / CC-BY-SA / GPL на выбор | продолжение серии | **да** |
| Fantasy Icon Pack (Ravenmore) | https://opengameart.org/content/fantasy-icon-pack-by-ravenmore-0 | 512, 128, 64 PNG + PSD | CC-BY 3.0 | 29 рисованных иконок + 12 улучшенных: оружие, броня, зелья | **да** |
| 496 pixel art icons for medieval/fantasy RPG | https://opengameart.org/node/39455 | ~34×34 | CC0 | оружие, броня, зелья, еда, заклинания | **нет** по стилю (пиксели), годится как заглушка |
| 32x32 Icons (FLARE compatible) | https://opengameart.org/content/32x32-icons-flare-compatible | 32×32 | CC-BY 3.0 | 64 иконки: зелья, свитки, камни | **частично** |

**Иконки редкости** (обычный → мифический): бесплатных паков в нашем стиле нет. Их проще делать кодом: одна рамка и цвета из палитры (серый, зелёный, синий, фиолетовый, оранжевые угли, бирюза Пустоты). Так уже устроено в прототипе.

---

## 7. VFX и частицы

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Particle Pack (Kenney) | https://opengameart.org/content/particle-pack-80-sprites | 80+ PNG + векторы | CC0 | огонь, дым, искры, магия, свет, «световые маски» | **да**: база для эмиттеров Phaser |
| Teleporter effect (rubberduck) | https://opengameart.org/content/teleporter-effect | крупные PNG-листы, луп кадров 31–70 | CC0 | портал: синий, зелёный, без колец, 6 вариаций | **да**: порталы Разлома (перекрас в фиолет) |
| Magic flame (rubberduck) | https://opengameart.org/content/magic-flame | 256×300, 40+ кадров | CC0 | магическое пламя, луп | **да**: жаровни, ауры |
| Spell animation spritesheets (Viktor Hahn) | https://opengameart.org/content/spell-animation-spritesheets | высокое разрешение, PNG-листы (41.7 МБ) | CC-BY 4.0 | огненные шары, заморозка и др. | **да** |
| 2D Spell Effects (Mikodrak) | https://opengameart.org/content/2d-spell-effects | 10 эффектов, PNG по кадрам | CC0 | разные заклинания | **частично** |
| Weapon Slash Effect (Cethiel) | https://opengameart.org/content/weapon-slash-effect | 5 анимаций × 4 цвета | CC0 | следы ударов, есть огненный вариант | **да**: следы клинков |
| More Explosions (StumpyStrust) | https://opengameart.org/content/more-explosions | ~100×100 (по комментарию) | CC0 | взрывы | **частично** |
| Smoke aura (Beast) | https://opengameart.org/content/smoke-aura | 256×256, 15/30/45/90 кадров | CC0 | дымовая аура | **да**: теневые ауры |
| Free Pixel Effects Pack (CodeManu) | https://codemanu.itch.io/pixelart-effect-pack | 20 эффектов, кадр 100×100 | CC-BY 4.0 (в поле лицензии), в описании «public domain» | удары, магия | **нет** по стилю (пиксели) |

**Кровь:** бесплатных крупных кровавых брызг в живописном стиле не нашлось (есть только 32×32 пиксельные). Кровь лучше делать частицами Phaser из капли `p_blood` в прототипе.

---

## 8. Шрифты (все OFL, с кириллицей, бесплатно для коммерции)

Наличие кириллицы и лицензию OFL я проверил по метаданным репозитория Google Fonts (`github.com/google/fonts/ofl/<имя>/METADATA.pb`).

| Шрифт | Прямая ссылка | Формат | Лицензия | Для чего | Подходит |
|---|---|---|---|---|---|
| Cormorant / Cormorant Garamond / Cormorant SC | https://fonts.google.com/specimen/Cormorant | TTF, переменный | OFL | меню, диалоги (уже в игре) | **да** |
| Cormorant Unicase | https://fonts.google.com/specimen/Cormorant+Unicase | TTF | OFL | заголовки, названия предметов | **да** |
| Ruslan Display | https://fonts.google.com/specimen/Ruslan+Display | TTF | OFL | логотип, заставки: древнерусская вязь | **да** |
| Yeseva One | https://fonts.google.com/specimen/Yeseva+One | TTF | OFL | крупные заголовки | **да** |
| Old Standard TT | https://fonts.google.com/specimen/Old+Standard+TT | TTF | OFL | книги, записки, лор | **да** |
| Oranienbaum | https://fonts.google.com/specimen/Oranienbaum | TTF | OFL | заголовки окон | **да** |
| Alegreya SC | https://fonts.google.com/specimen/Alegreya+SC | TTF | OFL | подписи, статы | **да** |
| Ponomar | https://fonts.google.com/specimen/Ponomar | TTF | OFL | руны и надписи (церковнославянский) | **частично**: декоративно |
| Oswald | https://fonts.google.com/specimen/Oswald | TTF | OFL | **цифры урона** (узкий, жирный) | **да** |
| Sofia Sans Extra Condensed | https://fonts.google.com/specimen/Sofia+Sans+Extra+Condensed | TTF | OFL | цифры урона, HUD | **да** |

**Честно:** готического **блэклеттера (фрактуры) с кириллицей под OFL нет**. Grenze Gotisch, UnifrakturMaguntia, Pirata One, Cinzel, MedievalSharp — только латиница. Для логотипа на латинице («Ashen Crown») Grenze Gotisch или UnifrakturMaguntia подходят; для русских надписей используйте Ruslan Display или Cormorant Unicase.

---

## 9. NPC и мирные жители

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Flare NPCs animated pack 1 (Danimal) | https://opengameart.org/content/flare-npcs-animated-pack-1 | 8 направлений, листы + .blend | CC-BY-SA 3.0 | 4 крестьянина, дворяне, 2 старика, жрец, верховный жрец, пастушка, трактирщица, торговка, служанка, старуха, ведьма | **да**: стиль FLARE, простые анимации |
| Wandering Vendor NPC (TiZiana) | https://opengameart.org/content/wandering-vendor-npc | кадр 32×64, 2 стороны | CC-BY 3.0 / LGPL | бродячий торговец, idle | **частично**: мелкий |
| Engvee — Isometric Halberd Warrior | https://engvee.itch.io/animated-isometric-halberd-warrior | 16 направлений, 180–320 | своя: коммерция да | стражник: idle, walk, attack | **да**: стража лагеря |
| Engvee — Animated Isometric Thief | https://engvee.itch.io/animated-isometric-thief | 8/12 направлений | своя: коммерция да | **есть анимация Talk** | **да**: квестодатель-скупщик |

**Честно:** кузнеца с анимацией работы у наковальни бесплатно нет. Вариант: NPC из Flare-пака + анимация «Hammering» из Mixamo, отрендеренная в Blender.

---

## 10. Портреты

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| FLARE Portrait Pack Number One (Justin Nichol) | https://opengameart.org/content/flare-portrait-pack-number-one | крупные PNG + .xcf (архив 14 МБ) | CC-BY-SA 3.0 / GPL | 6 героев (3 м, 3 ж), масляная живопись | **да**: тёмное фэнтези |
| FLARE Portrait Pack Number Two | https://opengameart.org/content/flare-portrait-pack-number-two | PNG (архив PortraitPack2.zip) | CC-BY-SA 3.0 / GPL | ещё портреты | **да** |
| FLARE Portrait Pack Number Four | https://opengameart.org/content/flare-portrait-pack-number-four | PNG (архив 14 МБ) | CC-BY-SA 3.0 / GPL | 6 портретов | **да** |
| FLARE Portrait Pack (Female Edition) | https://opengameart.org/content/flare-portrait-pack-female-edition | архив 23.7 МБ | **CC-BY 3.0** / GPL | женские портреты | **да**: самая мягкая лицензия в серии |
| Portrait Pack (Calciumtrice) | https://opengameart.org/content/portrait-pack | 1200×1200, есть прозрачный фон | CC-BY 3.0 | 4 портрета (2 м, 2 ж), цифровая живопись | **да** |

Все портреты больше 512×512: уменьшайте до 256 или 512 сами.

---

## 11. Анимации окружения

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Engvee — FREE Animated Isometric Trees | https://engvee.itch.io/free-animated-isometric-trees | 4 направления, кадр 128–512, листы RGBA4444 (архивы 60–200 МБ) | своя: коммерция да | качающиеся ель, граб, сосна, ива | **частично**: живые деревья; для Пустошей затемнить и обесцветить |
| Engvee — FREE Haunted Tree | https://engvee.itch.io/free-haunted-tree | 16 направлений | своя: коммерция да | оживающее мёртвое дерево | **да** |
| LPC Animated Torch | https://opengameart.org/content/lpc-animated-torch | GIF + PNG-лист (маленький) | CC-BY 3.0/4.0, OGA-BY, GPL | мерцающий факел | **частично**: мелкий, пиксельный |
| Isometric mug and torch pack (rubberduck) | https://opengameart.org/content/isometric-mug-and-torch-pack-flare | PNG + .blend | CC0 | изометрические факелы для FLARE | **да** (огонь добавить из Magic flame) |
| Thick Fog (LFA) | https://opengameart.org/content/thick-fog | 1024×512, тайлится по горизонтали | CC0 | туман | **да**: слой тумана с прокруткой |
| Magic flame (rubberduck) | https://opengameart.org/content/magic-flame | 256×300 | CC0 | луп пламени | **да** |

Парящие угли и пепел лучше оставить частицами Phaser (как сейчас): это дешевле по памяти, чем листы.

---

## 12. Курсоры и мелкие иконки интерфейса

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Gauntlet Cursor (itsmars) | https://opengameart.org/content/gauntlet-cursor | 32×32 PNG | CC0 | курсор-латная перчатка в нескольких состояниях | **да** |
| Pointers: part 5 (yd) | https://opengameart.org/content/pointers-part-5 | 72×72 (рекомендовано 48×48), SVG + XCF | CC0 | перчатки-указатели, легко перекрасить | **да** |
| Cursor Pack (Kenney) | https://kenney-assets.itch.io/cursor-pack | 150+ курсоров, PNG + вектор | CC0 | стрелки, руки, мечи, прицелы | **частично**: светлые, перекрасить |
| Game Icons (Kenney) | https://opengameart.org/content/game-icons | 105 иконок, 1× и 2×, PNG + SVG | CC0 | настройки, звук, сохранение, закрыть, стрелки | **да** после перекраса в золото UI |

---

## 13. Логотип и титульная графика

Готовых бесплатных логотипов для чужой игры не бывает: логотип делается сам. Инструменты и материалы:

| Инструмент / ресурс | Ссылка | Формат | Лицензия | Зачем | Подходит |
|---|---|---|---|---|---|
| Inkscape | https://inkscape.org | SVG, экспорт PNG | бесплатный (GPL) | вектор логотипа, иконка приложения | **да** |
| Krita | https://krita.org | PNG/PSD | бесплатный (GPL) | живописная обработка, свечение углей | **да** |
| Ruslan Display / Cormorant Unicase / Grenze Gotisch | см. раздел 8 | TTF | OFL | шрифтовая основа (логотип можно продавать) | **да** |
| game-icons.net (корона, солнце, череп) | https://game-icons.net | SVG | CC-BY 3.0 | символ короны и «пустого солнца» как основа эмблемы | **да** (с указанием автора) |
| Canva (подключён к этому проекту) | https://www.canva.com | PNG/SVG | условия Canva | быстрые макеты и варианты | **частично**: для логотипа-товарного знака читайте условия Canva |

Если захотите, могу собрать в этом проекте вариант логотипа в SVG из шрифта и символа game-icons.

---

## 14. Фон главного меню

| Ресурс | Ссылка | Формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Poly Haven | https://polyhaven.com | HDRI, PBR-текстуры, 3D-модели | CC0 (FAQ: https://docs.polyhaven.com/en/faq) | небо, камень, руины, освещение | **частично**: основа для сцены собора в Blender |
| Unsplash | https://unsplash.com | фото высокого разрешения | Unsplash License (https://unsplash.com/license): коммерция да, без указания автора | фото готических соборов и руин | **частично**: фотобаш + перерисовка |
| Quaternius Medieval Village MegaKit | https://quaternius.com/packs/medievalvillagemegakit.html | 3D, 300+ модульных деталей | CC0 | стены, арки, окна, лестницы | **частично**: собрать разрушенный собор |
| KayKit Dungeon Remastered | https://kaylousberg.itch.io/kaykit-dungeon-remastered | 3D | CC0 | колонны, арки | **частично** |

**Честно:** готового бесплатного фона «разрушенный собор в пепельной буре с чёрным солнцем» в 1920×1080 **нет**. Сейчас в игре уже есть `art/menu_bg.png`. Реальные пути:
1. Сцена в Blender из Poly Haven и Quaternius + рендер в 4K (бесплатно, полный контроль).
2. Генерация ИИ по готовому промпту из `docs/ASSETS.md`, затем доработка в Krita.
3. Заказ художнику на ArtStation или Fiverr (цену не проверял, она сильно зависит от художника).

---

## 15. Звуки и музыка

| Название пакета | Прямая ссылка | Размер/формат | Лицензия | Что внутри | Подходит |
|---|---|---|---|---|---|
| Sonniss GameAudioGDC (архив 2015–2024 и GDC 2026) | https://sonniss.com/gameaudiogdc/ | десятки ГБ WAV | royalty-free, без указания автора; нельзя перепродавать звуки и обучать ИИ | профессиональные удары, магия, монстры, эмбиент | **да**: главный источник SFX |
| 80 CC0 RPG SFX (rubberduck) | https://opengameart.org/content/80-cc0-rpg-sfx | 80 OGG (1.8 МБ) | CC0 | монстры, предметы, монеты, камни, заклинания (в т. ч. огонь), клинки | **да** |
| 80 CC0 Creature SFX (rubberduck) | https://opengameart.org/content/80-cc0-creature-sfx | 80 OGG | CC0 | рыки, стоны, крики, рычание | **да**: голоса монстров |
| 50 RPG Sound Effects (Kenney) | https://opengameart.org/content/50-rpg-sound-effects | 50 OGG | CC0 | шаги, металл, ткань, книги, монеты | **да**: UI и инвентарь |
| Fantasy Music & Drum Loops Pack (NorthFantasyMusic) | https://opengameart.org/content/fantasy-music-and-drum-loops-pack | 15 WAV | CC-BY 4.0 (указать «North Fantasy Music») | мрачный эмбиент, боевые барабаны | **да** |
| CC0 Cinematic Music (коллекция) | https://opengameart.org/content/cc0-cinematic-music | 43 трека | CC0 | эпик, бой, боссы | **частично**: выбрать мрачные |
| Loopable Dungeon Ambience (JaggedStone) | https://opengameart.org/content/loopable-dungeon-ambience | OGG | CC0 | луп подземелья | **да**: Катакомбы |
| Dark Ambience Loop (Iwan Gabovitch) | https://opengameart.org/content/dark-ambience-loop | OGG/MP3/FLAC | CC-BY 3.0 | мрачный луп | **да** |

**Голоса NPC:** бесплатной озвучки на русском нет. Обычный выход: короткие «вздохи» и неразборчивые фразы (как в старых ARPG), записанные самостоятельно, или платная озвучка.

---

## ТОП-10: что скачать в первую очередь

1. **Skeleton Warrior + Zombie Sprites + Minotaur** (Clint Bellanger, CC-BY 3.0): враги ровно под наш тайл 64×32.
2. **Isometric Hero and Heroine** (CC-BY 3.0): база героев с .blend для переодевания в 4 класса.
3. **Engvee: Demon, HellBeast, Blazing Mummy, Thief, Knight Girl** (бесплатно, коммерция разрешена): 16 направлений, кадр до 320.
4. **Engvee: Three-Head Dragon и Medusa**: два босса с дальней атакой.
5. **Classic Dungeon Walls + Cave Tileset + Temple Entrance** (Clint Bellanger): Затонувшие Катакомбы.
6. **Isometric Stone Soup** (CC0, 1895 тайлов 64×32, готовые .tsx для Tiled) + **Old Ruins Tileset**: полы и руины Пустошей.
7. **Flare Windows + Flare Buttons** (CC0) + **Kenney Fantasy UI Borders** (CC0): тёмный UI.
8. **game-icons.net** (CC-BY 3.0) + **Painterly Spell Icons**: все иконки навыков и предметов.
9. **Kenney Particle Pack + Teleporter effect + Magic flame + Weapon Slash Effect** (всё CC0): VFX.
10. **Sonniss GameAudioGDC + 80 CC0 RPG SFX**: весь звук боя без затрат.

---

## Как проверить лицензию перед коммерческим релизом

1. **Читайте лицензию на странице ассета**, а не в агрегаторе или каталоге. На OpenGameArt это поле «License(s)», на itch.io раздел «More information → License» и текст описания.
2. **Сохраните доказательство:** скриншот или PDF страницы с датой, плюс файл LICENSE из архива. Храните в `docs/licenses/`.
3. **Смотрите на все лицензии в списке.** Если указано несколько (CC-BY + GPL), вы выбираете одну, самую удобную (обычно CC-BY или CC0).
4. **Проверьте происхождение:** на OpenGameArt бывают перезаливы чужого арта. Подозрительно, если автор «загрузил» арт из известной игры. Смотрите комментарии: там часто пишут о проблемах с лицензией.
5. **Своя лицензия автора** (Engvee, DesertCodex и др.): прочитайте ограничения (обычно «нельзя перепродавать как пак», «нельзя NFT»). Если лицензия не указана (как у Engvee Ice Beast), напишите автору в комментариях и сохраните ответ.
6. **ShareAlike (CC-BY-SA):** ваши изменённые версии этого арта должны быть под CC-BY-SA. Ваш код и остальной арт не затрагиваются. Но для DRM-платформ (консоли) CC-BY-SA 3.0 спорна; для Steam и браузера проблем обычно нет.
7. **ND (NoDerivatives):** перекрашивать нельзя. Не берите такие паки, если планируете правки.
8. **Ведите `CREDITS.md`:** название, автор, ссылка, лицензия, что изменено. Покажите титры в игре (меню → «Авторы»). Этого требуют CC-BY и CC-BY-SA.
9. **Звуки Sonniss:** прочитайте LICENSE.pdf в архиве; нельзя перепродавать звуки отдельно и использовать для обучения ИИ.
10. **Перед релизом** пройдитесь по CREDITS.md и откройте каждую ссылку ещё раз: условия на itch.io иногда меняются.

---

## Как смешивать ассеты, чтобы стиль не разъезжался

1. **Один источник на биом.** Катакомбы целиком из FLARE (Clint Bellanger), Пустоши из Old Ruins + Stone Soup. Engvee и FLARE не ставьте в один кадр без цветокоррекции.
2. **Единая палитра.** Пропустите все спрайты через одну градиентную карту или LUT с палитрой из `docs/ASSETS.md` (уголь, пепел, кость, угли `#ff7a2a`, Пустота `#3fd6c0`). Пакетно это делается в Krita, ImageMagick или Python.
3. **Постобработка в игре.** Общие виньетка, свет и тьма (уже есть в `GameScene`) и лёгкий цветовой фильтр Phaser (`postFX.addColorMatrix`) поверх всего «склеивают» разные паки.
4. **Один масштаб.** Человек в игре высотой около 1.5 тайла. Перед импортом приведите героев и врагов к одной высоте (`setScale` или пересборка листа), иначе гуль окажется ниже скелета.
5. **Одна камера и свет для всего, что рендерите из 3D.** Камера ортографическая, наклон 60° по X и 45° по Z (это даёт изометрию 2:1), свет сверху-слева, одинаковое разрешение кадра. Держите одну сцену Blender как шаблон.
6. **Общие тени и контур.** Используйте одну тень-эллипс (`art/shadow.png`) для всех персонажей и при необходимости одинаковый тёмный контур в 1–2 px.
7. **Одинаковая детализация.** Не смешивайте пиксель-арт 32×32 и пререндер 256 px в одном кадре: глаз сразу видит разницу.
8. **Иконки:** один источник на тип (навыки только game-icons, предметы только Ravenmore) и одинаковая рамка, которую рисует игра.
9. **Тестируйте в игре, а не в галерее:** смотрите ассет на полу с освещением и туманом. Отдельно на белом фоне всё выглядит иначе.

---

## Где бесплатного нет и что делать

| Категория | Ситуация | Альтернатива |
|---|---|---|
| 4 героя в одном тёмном стиле | нет готового комплекта | рендер Hero/Heroine или KayKit из Blender с Mixamo; или ИИ-генерация концептов + ручная анимация; или Engvee и аналоги на itch.io за $2–5 |
| Боссы с призывом и фазами | нет | фазы кодом (tint, новые атаки), призыв из cast + VFX портала; уникальный босс заказать или купить (Engvee Spider-Boss, Boss Creature по $2) |
| Мини-карта, карта мира, маркеры квестов | нет в тёмной готике | рисовать кодом + рамка Flare Windows; GabrielaTot Gothic UI ($6) |
| Иконки редкости | нет | кодом: одна рамка + цвета палитры (как сейчас) |
| Блэклеттер с кириллицей | нет под OFL | Ruslan Display / Cormorant Unicase; блэклеттер только для латинского логотипа |
| Фон меню 1920×1080 | нет | сцена в Blender (Poly Haven + Quaternius), ИИ по промпту из ASSETS.md, или заказ художнику |
| Кузнец, анимация «talk» у NPC | почти нет | Engvee Thief (есть Talk), Mixamo-анимации на NPC из Flare-пака |
| Русская озвучка | нет | своя запись, неразборчивые «вокализы», платные актёры |
| Кровь в живописном стиле | нет | частицы Phaser |

**Платные варианты с хорошим соотношением цена/качество:** паки Engvee на itch.io ($1–3 за монстра, 16 направлений; например Stone Golem за $2: https://engvee.itch.io/animated-isometric-stone-golem), GabrielaTot Gothic UI ($6), полные версии KayKit ($7.95). Unity Asset Store тоже вариант, но перед покупкой проверьте в EULA, что ассет можно использовать вне Unity (у нас Phaser).
