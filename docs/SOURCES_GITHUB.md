# Источники ассетов, доступные для скачивания из среды Claude

Проверено 18.10.2026. Из среды открываются только github.com, raw.githubusercontent.com, gitlab.com и bitbucket.org. Файлы Git LFS на GitHub не скачиваются. opengameart, itch.io, kenney.nl, freesound, mixkit, sonniss, polyhaven и archive.org закрыты. Лицензию каждого источника я читал в самом репозитории (файл указан в таблице).

## Подходят

| Источник | Что внутри | Лицензия (где прочитана) | Объём | Для чего нам |
|---|---|---|---|---|
| github.com/lavenderdotpet/CC0-Public-Domain-Sounds | Зеркало паков RubberDuck: 80 RPG SFX, 2 × 80 creature SFX, wood/metal, breaking/hit. Kenney: RPG audio (шаги, ножи, двери), impact (130), interface/UI (152), music jingles (85 коротких джинглов). 34 взмаха (woosh) | CC0 (`LICENSE`, `kenney_*/License.txt`) | 0,5–6 МБ на пак | **Звуки**: удары клинком, рыки монстров, магия, UI, без указания автора. Джинглы аркадные, для победы и поражения подходят частично |
| github.com/flareteam/flare-game, мод `fantasycore/images` | 36 портретов (масляная живопись Justin Nichol), 39 предметов лута и лист иконок навыков, 34 листа эффектов (огненный шар, лёд, молния, землетрясение, лечение, руны), 47 элементов UI (рамки, полосы), тайлсеты пещеры, подземелья, снега | CC-BY-SA 3.0 (`LICENSE.txt`, README) | портреты 3,5 МБ, лут 1,4 МБ, эффекты 7,6 МБ, UI 8,6 МБ | **Графика**: портреты героев на экран выбора, рисованные иконки вместо векторных, эффекты заклинаний, рамки окон |
| github.com/flareteam/flare-game, `empyrean_campaign/images/enemies` | Босс-виверна (7 анимаций), скелеты-боссы, бронированный муравьиный лев, хобгоблины, тёмный зомби | CC-BY-SA 3.0 | 113 МБ | новые враги и боссы (нужен геймплей) |
| github.com/FreezingMoon/AncientBeast, `assets/music/epic/` | 13 эпичных оркестровых треков («Escaping the Abyss», «Incoming Siege», «It All Ends Here», «Summoning the Beast», «Vengeance», «Road to Victory»…) | CC-BY-SA 4.0 (`README.md`, таблица лицензий) | 65 МБ на 17 треков | **Музыка** боя и босса |
| github.com/0ad/0ad, `binaries/data/mods/public/audio/` | 62 оркестровых трека (`Epitaph`, `Hill_of_Sorrows`, `Point_of_No_Return`, джингл победы `You_are_Victorious!`), 1038 звуков (удары по щитам, стрелы, шаги по камню) | CC-BY-SA 3.0, «Wildfire Games» (`audio/LICENSE.txt`) | музыка 222 МБ, звуки 61 МБ | джингл победы, тёмные треки, звуки ударов |
| github.com/wesnoth/wesnoth (только отдельные файлы) | `undead_siege`, `cry_from_elensefar`, `juggernaut-louder`, `primal-carnage`, `decoherence`, `scary_ambient_wind` и др. | CC-BY-SA 4.0 по файлам (`copyrights.csv`); остальное GPL, не берём | 4–11 МБ на трек | музыка босса и подземелья |
| github.com/game-icons/icons | 4242 SVG-силуэта (оружие, магия, монстры) | CC-BY 3.0 (`license.txt`) | ~9 МБ | основа иконок навыков с нашими градиентами и рамкой |
| github.com/ETdoFresh/kenney.nl (зеркало) | Particle Pack (96), Smoke Particles (77) | CC0 (`License.txt` в паках) | 5–13 МБ | частицы и дым для эффектов |

## Частично или не подходят

- **Stendhal** (github.com/arianne/stendhal): несколько CC0/CC-BY треков (`dark_quest`, `spooky_forest`), остальное смешанные лицензии.
- **The Mana World** (tmw-music): брать стоит только `Dramatic.ogg` и `ominous3.ogg` (CC-BY 4.0).
- **Veloren** (gitlab): GPL-3, часть треков с запретом коммерции (NC). Не берём.
- **Kenney** (изометрические 3D-киты): мультяшные и мелкие.
- **Исходники FLARE в .blend** (flare-game-art-src): лежат в LFS и не скачиваются. Перерендерить героев крупнее из них не выйдет.
- Не нашлось на GitHub: живописные иконки J. W. Bjerk, паки Juhani Junkala, Engvee.
