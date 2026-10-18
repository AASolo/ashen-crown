# Авторы и лицензии ассетов

## Графика из FLARE (CC-BY-SA 3.0)

Часть графики взята из открытой игры **FLARE** (https://flarerpg.org, репозиторий https://github.com/flareteam/flare-game, мод `fantasycore`) и распространяется по лицензии **Creative Commons Attribution-ShareAlike 3.0** (текст: `assets/flare/LICENSE-CC-BY-SA-3.0.txt`, https://creativecommons.org/licenses/by-sa/3.0/).

Авторы графики FLARE (по CREDITS.txt проекта): Blarumyrran, Brandon Morris "Augmentality", Clint Bellanger, Holly Daniel, Justin Jacobs, Justin Nichol, Jessica "Zeldyn" Cox, remaxim, rubberduck, Sarah Benalene, Scrittl, Stefan Beller; дополнительная графика: Aare, Bart K, Blender Foundation, Cori Samuel, D. Sharon Pruitt, Hythlodaeus, Iwan "qubodup" Gabovitch, Lamoot, Lattice, Ljudbank, Lorc, MaximB, Michael Baradari, Mike Koenig, Mikodrak, Misha, Mumu, Naraphim, p0ss, Renderwahn, Samuel Moxham, Sindwiller, Spookymodem, Stephan, TiZiana, Vwolfdog, Yughues, Zuendholz.

**Что изменено:** спрайты нарезаны из атласов, уменьшены под тайл 64×32, слои аватара сведены в один лист, выполнена цветокоррекция (пепел, тень, склеп), стены собраны из двух вариантов тайла, портал перекрашен в фиолетовый, стены и колонна Пустошей (`wall_ashlands_*`, `pillar_ashlands`) перекрашены из стен Катакомб в пепел с дорисованными тлеющими трещинами (`tools/flare/ash_walls.py`). Изменённые файлы в `assets/flare/` распространяются под той же лицензией CC-BY-SA 3.0. Лицензия ShareAlike касается только этих изображений, не кода игры.

| Файл в игре | Источник во FLARE |
|---|---|
| `hero_blade` | аватар male: leather_* , head_short, longsword |
| `hero_witch` | аватар female: mage_*_alt2, head_long, greatstaff |
| `hero_bone` | аватар male: plate_*, war_hammer, kite_shield |
| `hero_shade` | аватар male: leather_*, leather_hood, dagger |
| `en_ghoul` | enemies/zombie |
| `en_cultist` | enemies/skeleton_mage |
| `en_shadow` | enemies/skeleton (перекрашен) |
| `en_herald` (Глашатай Пустого Солнца) | мод empyrean_campaign: enemies/skeleton_mage_high_boss (перекрашен в обугленную бронзу, увеличен в 1,45 раза) |
| `en_archer` (костяной лучник) | enemies/skeleton_archer (перекрашен в пепел) |
| `en_brute` (пепельный минотавр) | enemies/minotaur (перекрашен, увеличен в 1,1 раза) |
| `floor_catacombs_*`, `wall_catacombs_*`, `wall_ashlands_*`, `pillar_catacombs`, `pillar_ashlands`, `altar`, `chest*`, `portal`, `decal_bones` | tilesets/tileset_dungeon |
| `floor_ashlands_*` | tilesets/tileset_cave (перекрашен) |
| курсор | cursors/cursor_normal |
| `portrait_blade`, `portrait_witch`, `portrait_bone`, `portrait_shade` | portraits/male03, female15, male01, female02 (Justin Nichol), рамка menus/portrait_border; цветокоррекция и виньетка |
| `it_*` (иконки предметов) | icons/icons.png (рендеры предметов); убран чёрный фон, увеличены до 96 px, `it_blades` собран из двух ножей, `it_shard` перекрашен |
| `sk_*` (иконки навыков) | icons/icons.png (каменные плашки навыков); глиф окрашен в цвет класса, добавлено свечение |
| `fx_blast`, `fx_quake`, `fx_mist` | powers/blast, quake, dark_mist (кадры из animations/powers/*.txt, пересобраны в сетку) |
| `portrait_elder` (старейшина Ориен) | portraits/male05 (Justin Nichol), рамка menus/portrait_border; цветокоррекция и виньетка |
| `npc_elder`, `npc_guard`, `npc_man`, `npc_woman` (жители лагеря) | images/npcs/guild_man, knight, peasant_man1, peasant_woman1 (кадры стойки из animations/npcs/*.txt, направление на камеру, уменьшены) |
| `quest_book` (дневник Сайласа) | loot/book (обрезан, цветокоррекция) |
| `ui_btn`, `ui_btn_hover`, `ui_btn_down`, `ui_btn_off` (кнопки) | menus/buttons/button_default (строки состояний разрезаны на отдельные файлы) |
| `floor_surface_*`, `sf_road_*`, `sf_water_*`, `sf_dock_*` (земля, мостовая, вода, мостки поверхности) | tilesets/tileset_grassland, tileset_grassland_water (трава перекрашена в сухую, вода осветлена, у мостков обрезана тень) |
| `sf_tree_*` (мёртвые деревья, ели, осенние дубы, пепельные берёзы) | tilesets/tileset_grassland (листва перекрашена в ржавые и пепельные тона, хвоя приглушена) |
| `sf_house_*`, `sf_tent_*` (срубы, обгоревшие срубы, башня-мельница, палатки) | tilesets/tileset_grassland, разбивка по клеткам как в картах FLARE (frontier_outpost, black_oak_farm); обгоревшие варианты перекрашены |
| `sf_crate_*`, `sf_logs_*`, `sf_campfire`, `sf_anvil`, `sf_fence_*`, `sf_rock_*`, `sf_stone_*`, `sf_stump_*`, `sf_sign_*`, `sf_grave_*`, `sf_bush_*`, `sf_reed_*`, `sf_plant_*`, `sf_tuft_*`, `sf_chest_0` | tilesets/tileset_grassland (растения перекрашены в сухие тона) |

## 3D-модели 0 A.D. (CC-BY-SA 3.0, добавлено 18.10.2026)

Источник: игра **0 A.D.**, © Wildfire Games (http://www.wildfiregames.com/), https://github.com/0ad/0ad (коммит 61a3b950), каталог `binaries/data/mods/public/art/`. Лицензия: CC-BY-SA 3.0, http://creativecommons.org/licenses/by-sa/3.0/. Модели отрендерены в изометрию тем же ракурсом и светом, что и графика FLARE (`tools/render/render_0ad.py`, Blender 4.2). Получившиеся картинки распространяются под CC-BY-SA 3.0.

| Файл в игре | Модель, анимации, текстура | Что изменено |
|---|---|---|
| `en_wolf` (теневой волк) | `meshes/skeletal/wolf.dae`, `animation/quadraped/wolf_idle_01`, `wolf_run`, `wolf_attack_01`, `wolf_attack_02`, `wolf_death_01`, `textures/skins/skeletal/animal_wolf_grey.png` | рендер в два направления, шерсть перекрашена в угольную |
| `cart` (сломанная тележка) | `meshes/props/wrld_handcart_broken.dae`, `textures/skins/props/wood_d.png` | рендер |
| `banner` (знамя культа) | `meshes/props/garrison_flag.dae`, `textures/skins/props/garrison_hele_1.png` | цвет игрока заменён на багровый, полотнище растянуто по ширине |

## Шрифты

Cormorant Garamond и Cormorant SC (Christian Thalmann), SIL Open Font License 1.1, через Google Fonts.

## Остальное

Остальная графика, звук и код созданы для Ashen Crown процедурно.


## Музыка и звуки (FLARE, добавлено 18.10.2026)

Источник: https://github.com/flareteam/flare-game, мод `fantasycore`. Исходные OGG лежат в `assets/incoming/flare-extra/`, в игру они попадают как MP3 через `tools/audio/build_audio.sh` (перекодировка, у джинглов обрезка и затухание). Авторы и лицензии взяты из пофайлового списка FLARE: https://github.com/flareteam/flare-game/wiki/Credits (копия: `assets/incoming/flare-extra/CREDITS-flare-wiki.md`). Изменённые файлы под CC-BY-SA распространяются под той же лицензией.

### Музыка

| Файл в игре | Исходник | Композитор | Лицензия |
|---|---|---|---|
| `assets/audio/music/dungeon.mp3` | `music/dungeon_theme.ogg` | remaxim | CC-BY-SA 3.0 |
| `assets/audio/music/explore.mp3` | `music/unrest_theme.ogg` | Brandon Morris (Augmentality) | CC-BY-SA 3.0 |
| `assets/audio/music/menu.mp3` | `music/title_theme.ogg` | Brandon Morris (Augmentality) | CC-BY-SA 3.0 |

### Звуки и эмбиент

Автор каждого звука указан в пофайловом списке FLARE по ссылке выше.

| Файл в игре | Исходник | Лицензия |
|---|---|---|
| `assets/audio/music/amb_cave.mp3` | `soundfx/environment/cave_droplets_loop.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/music/amb_wind.mp3` | `soundfx/environment/wind_loop.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/arrow.mp3` | `soundfx/powers/shoot.ogg` | CC-BY-SA 3.0 |
| `assets/audio/sfx/boss.mp3` | `soundfx/powers/warcry.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/boss_death.mp3` | `soundfx/enemies/minotaur_critdie.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/cast.mp3` | `soundfx/powers/shield.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/chest.mp3` | `soundfx/wood_open.ogg` | Public Domain, CC0 |
| `assets/audio/sfx/crit.mp3` | `soundfx/powers/block.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/death_1.mp3` | `soundfx/enemies/zombie_die.ogg` | Public Domain, CC0 |
| `assets/audio/sfx/death_2.mp3` | `soundfx/enemies/skeleton_die.ogg` | Public Domain, CC0 |
| `assets/audio/sfx/death_3.mp3` | `soundfx/enemies/goblin_die.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/explode.mp3` | `soundfx/powers/fireball.ogg` | Public Domain, CC-BY 3.0 |
| `assets/audio/sfx/fire.mp3` | `soundfx/powers/burn.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/gold.mp3` | `soundfx/inventory/inventory_coins.ogg` | Public Domain, CC-BY 3.0 |
| `assets/audio/sfx/hero_death_female.mp3` | `soundfx/female_die.ogg` | CC-BY-SA 3.0 |
| `assets/audio/sfx/hero_death_male.mp3` | `soundfx/male_die.ogg` | CC-BY-SA 3.0 |
| `assets/audio/sfx/hit_1.mp3` | `soundfx/enemies/skeleton_hit.ogg` | Public Domain, CC0 |
| `assets/audio/sfx/hit_2.mp3` | `soundfx/enemies/zombie_hit.ogg` | Public Domain, CC0 |
| `assets/audio/sfx/hit_3.mp3` | `soundfx/enemies/goblin_hit.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/hurt_female.mp3` | `soundfx/female_hit.ogg` | CC-BY-SA 3.0 |
| `assets/audio/sfx/hurt_male.mp3` | `soundfx/male_hit.ogg` | CC-BY-SA 3.0 |
| `assets/audio/sfx/levelup.mp3` | `soundfx/level_up.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/pickup_1.mp3` | `soundfx/inventory/inventory_object.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/pickup_2.mp3` | `soundfx/inventory/inventory_metal.ogg` | Public Domain, CC-BY 3.0 |
| `assets/audio/sfx/pickup_3.mp3` | `soundfx/inventory/inventory_leather.ogg` | Public Domain, CC-BY 3.0 |
| `assets/audio/sfx/portal.mp3` | `soundfx/environment/teleporter.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/potion.mp3` | `soundfx/powers/potion.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/roar_1.mp3` | `soundfx/enemies/zombie_ment.ogg` | CC-BY-SA 3.0 |
| `assets/audio/sfx/roar_2.mp3` | `soundfx/enemies/goblin_ment.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/roar_3.mp3` | `soundfx/enemies/wyvern_ment.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/step_ash_1.mp3` | `soundfx/steps/step_leather1.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/step_ash_2.mp3` | `soundfx/steps/step_leather2.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/step_ash_3.mp3` | `soundfx/steps/step_leather3.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/step_ash_4.mp3` | `soundfx/steps/step_leather4.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/step_stone_1.mp3` | `soundfx/steps/step_echo1.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/step_stone_2.mp3` | `soundfx/steps/step_echo2.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/step_stone_3.mp3` | `soundfx/steps/step_echo3.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/step_stone_4.mp3` | `soundfx/steps/step_echo4.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/stun.mp3` | `soundfx/powers/shock.ogg` | CC-BY 3.0 |
| `assets/audio/sfx/swing_1.mp3` | `soundfx/melee_attack.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/swing_2.mp3` | `soundfx/melee_attack_2.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/swing_3.mp3` | `soundfx/melee_attack_3.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/trap.mp3` | `soundfx/powers/spikes.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/ui.mp3` | `soundfx/widget_activate.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |
| `assets/audio/sfx/wall.mp3` | `soundfx/environment/stone_open.ogg` | CC-BY-SA 3.0 (лицензия FLARE) |

## Музыка боя, босса и джинглы (добавлено 18.10.2026)

Исходники лежат в `assets/incoming/ancientbeast/` и `assets/incoming/0ad/`, в игру попадают как MP3 через `tools/audio/build_audio.sh` (громкость снижена до уровня остальной музыки, у джинглов взято начало трека с затуханием).

| Файл в игре | Исходник | Автор | Лицензия |
|---|---|---|---|
| `assets/audio/music/combat.mp3` | «Escaping the Abyss», игра Ancient Beast (https://github.com/FreezingMoon/AncientBeast, `assets/music/epic/`) | Jens Kiilstofte | CC-BY-SA 4.0 |
| `assets/audio/music/boss.mp3` | «It All Ends Here», там же | Moonthief | CC-BY-SA 4.0 |
| `assets/audio/music/victory.mp3` | `You_are_Victorious!.ogg`, игра 0 A.D. (https://github.com/0ad/0ad, `binaries/data/mods/public/audio/music/`) | Wildfire Games (http://www.wildfiregames.com/) | CC-BY-SA 3.0 |
| `assets/audio/music/defeat.mp3` | `Hill_of_Sorrows.ogg`, там же | Wildfire Games (http://www.wildfiregames.com/) | CC-BY-SA 3.0 |

## Северная тема поверхности (добавлено 18.10.2026)

`assets/audio/music/surface.mp3` — музыка **Marcelo Fernandez** (http://www.marcelofernandezmusic.com), «GermanicTheme3», из открытой стратегии **Wyrmsun** (https://github.com/Andrettin/Wyrmsun, `music/oaml/`, лицензия по `music/credits.txt`: **CC-BY 4.0**, https://creativecommons.org/licenses/by/4.0/). Сырые сегменты лежат в `assets/incoming/wyrmsun/`.

**Что изменено:** сегменты N1, N2, N3, N4, A1, A2, N1, N2 сведены в одну бесшовную петлю (хвосты реверберации наложены на следующий сегмент, хвост последнего перенесён в начало; `tools/audio/wyrmsun_loop.py`), громкость снижена на 4,5 dB под темы FLARE.

## Дополнительные звуки CC0 (добавлено 18.10.2026)

Источник: зеркало https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds (лицензия CC0, указание автора не требуется, но мы его даём). Исходники в `assets/incoming/cc0-extra/`; громкость подогнана под звуки FLARE.

| Файл в игре | Исходник | Автор |
|---|---|---|
| `assets/audio/sfx/swing_4..6.mp3` | `80-CC0-RPG-SFX/blade_01..03.ogg` | rubberduck (80 CC0 RPG SFX) |
| `assets/audio/sfx/cast_2.mp3`, `cast_3.mp3` | `80-CC0-RPG-SFX/spell_01.ogg`, `spell_02.ogg` | rubberduck |
| `assets/audio/sfx/fire_2.mp3`, `fire_3.mp3` | `80-CC0-RPG-SFX/spell_fire_06.ogg`, `spell_fire_03.ogg` | rubberduck |
| `assets/audio/sfx/death_4.mp3` | `80-CC0-RPG-SFX/creature_die_01.ogg` | rubberduck |
| `assets/audio/sfx/gold_2.mp3`, `gold_3.mp3` | `80-CC0-RPG-SFX/item_coins_01.ogg`, `item_coins_02.ogg` | rubberduck |
| `assets/audio/sfx/roar_4..6.mp3` | `80-CC0-creature-SFX/roar_01..03.ogg` | rubberduck (80 CC0 creature SFX) |
| `assets/audio/sfx/hit_4.mp3`, `hit_5.mp3` | `kenney_impactsounds/Audio/impactPunch_heavy_000.ogg`, `_002.ogg` | Kenney (www.kenney.nl), Impact Sounds |
| `assets/audio/sfx/step_stone_5..8.mp3` | `kenney_impactsounds/Audio/footstep_concrete_000..003.ogg` | Kenney, Impact Sounds |
| `assets/audio/sfx/step_ash_5..8.mp3` | `kenney_impactsounds/Audio/footstep_snow_000..003.ogg` | Kenney, Impact Sounds |

## Шрифты

Cormorant Garamond и Cormorant SC (Christian Thalmann), SIL Open Font License 1.1, https://github.com/google/fonts. В `assets/fonts/` лежат версии, урезанные до латиницы и кириллицы (WOFF2), и текст лицензии `OFL.txt`.
