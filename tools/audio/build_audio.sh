#!/usr/bin/env bash
# Музыка и звуки из сырья FLARE (assets/incoming/flare-extra), AncientBeast, 0 A.D. и CC0-паков → assets/audio/*.mp3.
# MP3 играет во всех браузерах, включая Safari на iPhone. Музыка 96 кбит/с стерео, звуки 80 кбит/с моно.
# Запуск из корня проекта: bash tools/audio/build_audio.sh
set -euo pipefail
SRC=assets/incoming/flare-extra
M=assets/audio/music; X=assets/audio/sfx
mkdir -p "$M" "$X"
music() { ffmpeg -loglevel error -y -i "$SRC/music/$1.ogg" -ac 2 -ar 44100 -b:a 96k "$M/$2.mp3"; }
jingle() { # кусок трека с затуханием в конце
  ffmpeg -loglevel error -y -i "$SRC/music/$1.ogg" -t "$3" -af "afade=t=in:d=0.3,afade=t=out:st=$(( $3 - 4 )):d=4" -ac 2 -ar 44100 -b:a 96k "$M/$2.mp3"; }
music title_theme menu
music unrest_theme explore
music dungeon_theme dungeon
# поверхность (пролог): северная тема Wyrmsun (Marcelo Fernandez, CC-BY 4.0), спокойные сегменты N и A
# сведены в бесшовную петлю (хвосты реверберации заворачиваются в начало), громкость под темы FLARE
W=assets/incoming/wyrmsun/GermanicTheme3
python3 -I tools/audio/wyrmsun_loop.py 112 /tmp/surface_loop.wav $W"_N1.ogg" $W"_N2.ogg" $W"_N3.ogg" $W"_N4.ogg" $W"_A1.ogg" $W"_A2.ogg" $W"_N1.ogg" $W"_N2.ogg"
ffmpeg -loglevel error -y -i /tmp/surface_loop.wav -af "volume=-4.5dB" -ac 2 -ar 44100 -b:a 96k "$M/surface.mp3"; rm -f /tmp/surface_loop.wav
# бой и босс: оркестровые треки AncientBeast (CC-BY-SA 4.0), громкость снижена до уровня тем FLARE
AB=assets/incoming/ancientbeast
ffmpeg -loglevel error -y -i "$AB/Escaping the Abyss by Jens Kiilstofte.ogg" -af "volume=-13dB" -ac 2 -ar 44100 -b:a 96k "$M/combat.mp3"
ffmpeg -loglevel error -y -i "$AB/It All Ends Here by Moonthief.ogg" -af "volume=-14dB" -ac 2 -ar 44100 -b:a 96k "$M/boss.mp3"
# джинглы победы и поражения: 0 A.D. (Wildfire Games, CC-BY-SA 3.0), начало трека с затуханием
OAD=assets/incoming/0ad
ffmpeg -loglevel error -y -i "$OAD/You_are_Victorious!.ogg" -t 20 -af "volume=-10dB,afade=t=in:d=0.2,afade=t=out:st=15:d=5" -ac 2 -ar 44100 -b:a 96k "$M/victory.mp3"
ffmpeg -loglevel error -y -i "$OAD/Hill_of_Sorrows.ogg" -ss 1.5 -t 18 -af "volume=-12dB,afade=t=in:d=0.5,afade=t=out:st=13:d=5" -ac 2 -ar 44100 -b:a 96k "$M/defeat.mp3"
ffmpeg -loglevel error -y -i "$SRC/soundfx/environment/wind_loop.ogg" -ac 1 -ar 44100 -b:a 64k "$M/amb_wind.mp3"
ffmpeg -loglevel error -y -i "$SRC/soundfx/environment/cave_droplets_loop.ogg" -ac 1 -ar 44100 -b:a 64k "$M/amb_cave.mp3"
sfx() { ffmpeg -loglevel error -y -i "$SRC/soundfx/$1.ogg" -ac 1 -ar 44100 -b:a 80k "$X/$2.mp3"; }
sfx melee_attack swing_1; sfx melee_attack_2 swing_2; sfx melee_attack_3 swing_3
sfx enemies/skeleton_hit hit_1; sfx enemies/zombie_hit hit_2; sfx enemies/goblin_hit hit_3
sfx powers/block crit
sfx powers/shield cast
sfx powers/burn fire
sfx powers/fireball explode
sfx powers/shoot arrow
sfx inventory/inventory_object pickup_1; sfx inventory/inventory_metal pickup_2; sfx inventory/inventory_leather pickup_3
sfx inventory/inventory_coins gold
sfx level_up levelup
sfx male_hit hurt_male; sfx female_hit hurt_female
sfx male_die hero_death_male; sfx female_die hero_death_female
sfx enemies/zombie_die death_1; sfx enemies/skeleton_die death_2; sfx enemies/goblin_die death_3
sfx enemies/minotaur_critdie boss_death
sfx powers/warcry boss
sfx enemies/zombie_ment roar_1; sfx enemies/goblin_ment roar_2; sfx enemies/wyvern_ment roar_3
sfx powers/spikes trap
sfx widget_activate ui
sfx environment/teleporter portal
sfx powers/shock stun
sfx environment/stone_open wall
sfx wood_open chest
sfx powers/potion potion
for i in 1 2 3 4; do sfx steps/step_echo$i step_stone_$i; sfx steps/step_leather$i step_ash_$i; done
# Дополнительные варианты из CC0-паков (RubberDuck, Kenney). Пик подгоняется под первый вариант группы,
# иначе новые звуки громче звуков FLARE на 10–20 дБ.
CC=assets/incoming/cc0-extra
peak() { ffmpeg -hide_banner -i "$1" -af volumedetect -f null - 2>&1 | grep -oE 'max_volume: [-0-9.]+' | awk '{print $2}'; }
sfxm() { local g; g=$(awk -v r="$(peak "$X/$3.mp3")" -v n="$(peak "$CC/$1.ogg")" 'BEGIN{print r-n}')
  ffmpeg -loglevel error -y -i "$CC/$1.ogg" -af "volume=${g}dB" -ac 1 -ar 44100 -b:a 80k "$X/$2.mp3"; }
sfxm 80-CC0-RPG-SFX/blade_01 swing_4 swing_1; sfxm 80-CC0-RPG-SFX/blade_02 swing_5 swing_1; sfxm 80-CC0-RPG-SFX/blade_03 swing_6 swing_1
sfxm kenney_impactsounds/Audio/impactPunch_heavy_000 hit_4 hit_1; sfxm kenney_impactsounds/Audio/impactPunch_heavy_002 hit_5 hit_1
sfxm 80-CC0-RPG-SFX/spell_01 cast_2 cast; sfxm 80-CC0-RPG-SFX/spell_02 cast_3 cast
sfxm 80-CC0-RPG-SFX/spell_fire_06 fire_2 fire; sfxm 80-CC0-RPG-SFX/spell_fire_03 fire_3 fire
sfxm 80-CC0-creature-SFX/roar_01 roar_4 roar_1; sfxm 80-CC0-creature-SFX/roar_02 roar_5 roar_1; sfxm 80-CC0-creature-SFX/roar_03 roar_6 roar_1
sfxm 80-CC0-RPG-SFX/creature_die_01 death_4 death_1
sfxm 80-CC0-RPG-SFX/item_coins_01 gold_2 gold; sfxm 80-CC0-RPG-SFX/item_coins_02 gold_3 gold
for i in 0 1 2 3; do
  sfxm kenney_impactsounds/Audio/footstep_concrete_00$i step_stone_$((i + 5)) step_stone_1
  sfxm kenney_impactsounds/Audio/footstep_snow_00$i step_ash_$((i + 5)) step_ash_1
done
du -sh "$M" "$X"
