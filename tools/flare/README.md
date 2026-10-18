# Пайплайн ассетов FLARE

Исходник: https://github.com/flareteam/flare-game (коммит af6eee6d, мод `fantasycore`), арт под CC-BY-SA 3.0.

1. `git clone --depth 1 --filter=blob:none --sparse https://github.com/flareteam/flare-game` и `git sparse-checkout set mods/fantasycore` в `/tmp/claude-0/dl/`.
2. `python3 -I build_chars.py <out> <клон flare-game> [ключи]`: собирает листы героев и врагов. Аватар FLARE слоистый (тело, броня, оружие), слои накладываются в порядке из `engine/hero_layers.txt`. Направления: SE для ряда S и NE для ряда N (зеркало даёт остальные). Масштаб 128/192 × 1.25: тайл FLARE 192×96 против нашего 2×-тайла 128×64, плюс подгонка под рост процедурных героев. Анимации: stance 4, run 8, swing 4, cast 4, hit 2, die 6.
3. `python3 build_world.py <out>`: пол и стены Катакомб (стены собраны из двух половин, чтобы обе грани были освещены), пол Пустошей из пещерного тайлсета с перекраской в пепел, сундуки, алтарь, колонна, портал, кости.
4. `python3 pack_chars.py <out> assets/flare 0.75`: обрезает пустые поля ячеек и ужимает листы персонажей до 75% (игра компенсирует масштаб полем `scale`). Тайлы и пропсы конвертируются в WebP (quality 88) как есть; `manifest.json` = `{sheets, origins}`.
5. `python3 -I build_ui_fx.py <клон flare-game>`: портреты, иконки, кнопки, эффекты заклинаний, жители лагеря (разделы `images`, `fx`, `npcs` в `manifest.json`).
6. `python3 -I build_surface.py assets/incoming/flare-grassland assets/flare`: поверхность пролога из `tileset_grassland` (земля, мостовая, вода, деревья, срубы, палатки, башня, предметы). Запускать после шага 5: добавляет точки опоры в `origins`. Дома и палатки нарезаны по клеткам, их раскладка — `STRUCTS` в `src/world/DungeonGen.ts`.

Игра грузит файлы в `BootScene.preload` (`src/art/external.ts`); если файла нет, рисуется процедурная версия.
7. Враги из других модов FLARE (`en_herald` из empyrean_campaign, `en_archer`, `en_brute`): `python3 -I build_chars.py <tmp> <клон flare-game> en_herald en_archer en_brute`, затем `pack_chars.py <tmp> <tmp>/pk 0.75` и `python3 -I ../render/merge_sheets.py <tmp>/pk assets/flare`.
8. Волк, тележка и знамя из 3D-моделей 0 A.D.: `b4/bin/python -I ../render/render_0ad.py <0ad>/binaries/data/mods/public/art/ <tmp> wolf cart banner` (нужен Blender 4.2 как модуль, см. шапку скрипта), затем `pack_chars.py` для волка и `merge_sheets.py`. Шаги 7 и 8 запускать после шага 6: они дописывают манифест.
