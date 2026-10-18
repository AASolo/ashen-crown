# Портреты героев, иконки предметов и навыков, анимации заклинаний из FLARE (CC-BY-SA 3.0).
# Вход: клон flare-game (путь первым аргументом), нужны mods/fantasycore/images/{portraits,icons,menus,powers}
# и mods/fantasycore/animations/powers. Выход: assets/flare/*.webp и разделы `images`, `fx` в manifest.json.
# Запуск: python3 tools/flare/build_ui_fx.py /путь/к/flare-game
import json, os, re, sys
from PIL import Image, ImageEnhance, ImageFilter, ImageChops

SRC = os.path.join(sys.argv[1], 'mods/fantasycore')
OUT = os.path.join(os.path.dirname(__file__), '../../assets/flare')
IMG = f'{SRC}/images'
images: list[str] = []


def save(im: Image.Image, key: str, q=88):
    im.save(f'{OUT}/{key}.webp', 'WEBP', quality=q, method=6)
    images.append(key)


def grade(im: Image.Image, warm=1.0) -> Image.Image:
    """Пепельная гамма: чуть меньше насыщенности, тёплые тени и света, как у постобработки игры."""
    a = im.getchannel('A') if im.mode == 'RGBA' else None
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(0.85)
    r, g, b = rgb.split()
    r = r.point(lambda v: min(255, int(v * (1 + 0.08 * warm) + 4 * warm)))
    b = b.point(lambda v: int(v * (1 - 0.12 * warm)))
    out = Image.merge('RGB', (r, g, b))
    out = ImageEnhance.Contrast(out).enhance(1.06)
    if a: out.putalpha(a)
    return out


# --- Портреты: масляная живопись Justin Nichol, по одному на класс, в рамке FLARE ---
PORTRAITS = {'blade': 'male03', 'witch': 'female15', 'bone': 'male01', 'shade': 'female02', 'elder': 'male05'}
border = Image.open(f'{IMG}/menus/portrait_border.png').convert('RGBA')
for cls, name in PORTRAITS.items():
    p = grade(Image.open(f'{IMG}/portraits/{name}.png').convert('RGBA'))
    # мягкая виньетка к краям, чтобы портрет «уходил в тень» под рамкой
    w, h = p.size
    vig = Image.radial_gradient('L').resize((w, h)).point(lambda v: 255 - max(0, v - 120) * 255 // 135)
    dark = Image.new('RGBA', (w, h), (10, 6, 7, 255))
    p = Image.composite(p, dark, vig)
    p.alpha_composite(border.resize((w, h)))
    save(p, f'portrait_{cls}', 92)  # полный размер исходника 320×320: портреты на карточках героев крупные

# --- Иконки: лист icons.png, ячейки 64×64, 8 в ряд; выводим 96×96 (как процедурные) ---
sheet = Image.open(f'{IMG}/icons/icons.png').convert('RGBA')
def cell(i: int) -> Image.Image:
    return sheet.crop(((i % 8) * 64, (i // 8) * 64, (i % 8) * 64 + 64, (i // 8) * 64 + 64))

def unblack(im: Image.Image) -> Image.Image:
    """У предметов FLARE чёрная подложка: почти чёрное становится прозрачным, всё светлее ~50/255 остаётся плотным."""
    im = im.copy()
    r, g, b, a = im.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    im.putalpha(ImageChops.multiply(a, mx.point(lambda v: max(0, min(255, (v - 6) * 6)))))
    return im

def up(im: Image.Image) -> Image.Image:
    return im.resize((96, 96), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))

ITEMS = {'it_staff': 105, 'it_hammer': 103, 'it_bow': 114, 'it_helm': 160, 'it_hood': 184, 'it_chest': 161,
         'it_robe': 185, 'it_gloves': 146, 'it_boots': 148, 'it_ring': 207, 'it_amulet': 213, 'it_shield': 121,
         'it_potion': 64, 'it_scroll': 224, 'it_gem': 70, 'it_gold': 88}
for key, i in ITEMS.items():
    save(up(grade(unblack(cell(i)), 0.5)), key)
# парные клинки: два изогнутых ножа крест-накрест
knife = unblack(cell(96))
twin = Image.new('RGBA', (64, 64))
twin.alpha_composite(knife.rotate(-12, Image.BICUBIC).transform((64, 64), Image.AFFINE, (1, 0, 5, 0, 1, 0)))
twin.alpha_composite(knife.transpose(Image.FLIP_LEFT_RIGHT).rotate(12, Image.BICUBIC).transform((64, 64), Image.AFFINE, (1, 0, -5, 0, 1, 0)))
save(up(grade(twin, 0.5)), 'it_blades')
# осколок Пустого Солнца: белый кристалл, окрашенный в цвет углей
shard = unblack(cell(71))
r, g, b, a = shard.split()
lum = Image.merge('RGB', (r, g, b)).convert('L')
ember = Image.merge('RGBA', (lum.point(lambda v: min(255, int(v * 1.1 + 30))), lum.point(lambda v: int(v * 0.62)), lum.point(lambda v: int(v * 0.25)), a))
save(up(ember), 'it_shard')

# --- Навыки: каменная плашка FLARE, белый глиф окрашен в цвет класса ---
SKILLS = {
    'sk_blade_basic': (1, 0xd8432f), 'sk_blade_dash': (13, 0xd8432f), 'sk_blade_whirl': (46, 0xd8432f), 'sk_blade_reap': (32, 0xd8432f),
    'sk_witch_basic': (45, 0xff7a2a), 'sk_witch_fireball': (34, 0xff7a2a), 'sk_witch_circle': (21, 0xff7a2a), 'sk_witch_wisps': (42, 0xff7a2a),
    'sk_bone_basic': (33, 0xd9b25a), 'sk_bone_charge': (4, 0xd9b25a), 'sk_bone_quake': (39, 0xd9b25a), 'sk_bone_bastion': (15, 0x5ee0c8),
    'sk_shade_basic': (8, 0x4fc6e0), 'sk_shade_fan': (35, 0x4fc6e0), 'sk_shade_trap': (43, 0x9a6bff), 'sk_shade_vault': (9, 0x4fc6e0),
    'sk_dodge': (19, 0xd8cbb4), 'sk_potion': (11, 0xc8313a), 'sk_empty': (47, None),
}
for key, (i, col) in SKILLS.items():
    c = cell(i).resize((96, 96), Image.LANCZOS)
    rgb = c.convert('RGB')
    hsv_s = rgb.convert('HSV').getchannel('S')
    lum = rgb.convert('L')
    # глиф = светлые и ненасыщенные пиксели; камень = остальное
    mask = ImageChops.multiply(lum.point(lambda v: max(0, min(255, (v - 150) * 4))), hsv_s.point(lambda v: 255 if v < 40 else 0))
    stone = ImageEnhance.Brightness(grade(rgb, 1.2)).enhance(0.55)
    if col is None:
        out = stone
    else:
        cr, cg, cb = col >> 16, (col >> 8) & 255, col & 255
        # глиф: от цвета класса в тенях к почти белому в светах
        glyph = Image.merge('RGB', [lum.point(lambda v, k=k: min(255, int(k * 0.8 + (255 - k) * max(0, v - 200) / 55 * 0.7))) for k in (cr, cg, cb)])
        glow_m = mask.filter(ImageFilter.GaussianBlur(5)).point(lambda v: min(255, v * 2))
        glow = Image.new('RGB', (96, 96), (cr, cg, cb))
        out = ImageChops.add(stone, ImageChops.multiply(glow, Image.merge('RGB', [glow_m.point(lambda v: v * 3 // 5)] * 3)))
        out = Image.composite(glyph, out, mask)
    out = out.filter(ImageFilter.UnsharpMask(1.0, 50, 2)).convert('RGBA')
    save(out, key)

# --- Анимации заклинаний: кадры из animations/powers/*.txt, направление 0, в равную сетку ---
def frames_of(name: str):
    txt = open(f'{SRC}/animations/powers/{name}.txt').read()
    image = re.search(r'image=(\S+)', txt).group(1)
    dur = int(re.search(r'duration=(\d+)ms', txt).group(1))
    n = int(re.search(r'frames=(\d+)', txt).group(1))
    fr = {}
    for m in re.finditer(r'frame=(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(-?\d+),(-?\d+)', txt):
        idx, d, x, y, w, h, ox, oy = map(int, m.groups())
        if d == 0: fr[idx] = (x, y, w, h, ox, oy)
    return Image.open(f'{SRC}/{image}').convert('RGBA'), dur, [fr[i] for i in range(n)]

FX = {'fx_blast': ('blast', 0.5), 'fx_quake': ('quake', 0.5), 'fx_mist': ('dark_mist', 0.4)}
fx_meta = {}
for key, (name, sc) in FX.items():
    src, dur, frs = frames_of(name)
    L = max(ox for *_, ox, oy in frs); T = max(oy for *_, ox, oy in frs)
    R = max(w - ox for x, y, w, h, ox, oy in frs); B = max(h - oy for x, y, w, h, ox, oy in frs)
    fw, fh = round((L + R) * sc), round((T + B) * sc)
    cols = min(len(frs), max(1, 2048 // fw))
    out = Image.new('RGBA', (fw * cols, fh * -(-len(frs) // cols)))
    for i, (x, y, w, h, ox, oy) in enumerate(frs):
        if w <= 1: continue
        piece = src.crop((x, y, x + w, y + h)).resize((max(1, round(w * sc)), max(1, round(h * sc))), Image.LANCZOS)
        out.alpha_composite(piece, ((i % cols) * fw + round((L - ox) * sc), (i // cols) * fh + round((T - oy) * sc)))
    out.save(f'{OUT}/{key}.webp', 'WEBP', quality=86, method=6)
    fx_meta[key] = {'fw': fw, 'fh': fh, 'cols': cols, 'frames': len(frs), 'ms': dur, 'ox': round(L * sc), 'oy': round(T * sc)}

# --- Кнопки меню FLARE: 4 состояния по 48 px в листе 384×192 (обычная, нажатая, наведение, выключена) ---
btn = Image.open(f'{IMG}/menus/buttons/button_default.png').convert('RGBA')
for k, row in (('ui_btn', 0), ('ui_btn_down', 1), ('ui_btn_hover', 2), ('ui_btn_off', 3)):
    save(btn.crop((0, row * 48, 384, row * 48 + 48)), k, 92)

# --- Дневник жреца на земле: книга из лута FLARE ---
book = Image.open(f'{SRC}/images/loot/book.png').convert('RGBA')
bb = book.getbbox()
save(grade(book.crop(bb), 0.6), 'quest_book')

# --- NPC лагеря: анимация «стойка», направление 6 (лицом к камере, вправо), в масштабе героев ---
NPC_SCALE = 128 / 192 * 1.25 * 0.75   # как у листов героев (build_chars + pack_chars), в игре делится на 0.75
NPCS = {'npc_elder': 'guild_man', 'npc_guard': 'knight', 'npc_man': 'peasant_man1', 'npc_woman': 'peasant_woman1'}
npc_meta = {}
for key, name in NPCS.items():
    txt = open(f'{SRC}/animations/npcs/{name}.txt').read()
    src = Image.open(f'{SRC}/' + re.search(r'image=(\S+)', txt).group(1)).convert('RGBA')
    sec = txt[txt.index('[stance]'):]
    n = int(re.search(r'frames=(\d+)', sec).group(1)); dur = int(re.search(r'duration=(\d+)ms', sec).group(1))
    fr = {}
    for m in re.finditer(r'frame=(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(-?\d+),(-?\d+)', sec):
        i, d, x, y, w, h, ox, oy = map(int, m.groups())
        if d == 6 and i not in fr: fr[i] = (x, y, w, h, ox, oy)
    frs = [fr[i] for i in range(n)]
    L = max(f[4] for f in frs); T = max(f[5] for f in frs)
    R = max(f[2] - f[4] for f in frs); B = max(f[3] - f[5] for f in frs)
    half = max(L, R)
    fw, fh = round(2 * half * NPC_SCALE) + 2, round((T + B) * NPC_SCALE) + 2
    out = Image.new('RGBA', (fw * n, fh))
    for i, (x, y, w, h, ox, oy) in enumerate(frs):
        piece = grade(src.crop((x, y, x + w, y + h)), 0.4).resize((max(1, round(w * NPC_SCALE)), max(1, round(h * NPC_SCALE))), Image.LANCZOS)
        out.alpha_composite(piece, (i * fw + round((half - ox) * NPC_SCALE) + 1, round((T - oy) * NPC_SCALE) + 1))
    out.save(f'{OUT}/{key}.webp', 'WEBP', quality=88, method=6)
    npc_meta[key] = {'fw': fw, 'fh': fh, 'frames': n, 'ms': dur, 'footY': round(T * NPC_SCALE) + 1, 'scale': 0.75}

man_path = f'{OUT}/manifest.json'
man = json.load(open(man_path))
man['images'] = sorted(images)
man['fx'] = fx_meta
man['npcs'] = npc_meta
json.dump(man, open(man_path, 'w'), indent=1)
print(len(images), 'images;', fx_meta)
