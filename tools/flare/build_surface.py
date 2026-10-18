# Поверхность пролога: земля, дорога, вода, деревья, дома и предметы из тайлсета FLARE grassland (CC-BY-SA 3.0).
# Запуск после build_ui_fx.py:  python3 -I build_surface.py <папка с tileset_grassland*.png и .txt> <assets/flare>
# Зелень перекрашена под пепелище (сухая трава, осенние и мёртвые деревья), всё уменьшено под наш 2×-тайл.
# Большие объекты FLARE (дома, палатки) нарезаны по клеткам: каждая часть — своя картинка, игра ставит её
# в свою клетку со своей глубиной, как это делает сам FLARE.
import sys, os, json
from PIL import Image, ImageEnhance, ImageOps

SRC, OUT = sys.argv[1], sys.argv[2]
S = 128 / 192

T = {}
img = None
for l in open(os.path.join(SRC, 'tileset_grassland.txt')):
    l = l.strip()
    if l.startswith('img='): img = Image.open(os.path.join(SRC, os.path.basename(l[4:]))).convert('RGBA')
    if l.startswith('tile='):
        i, x, y, w, h, ox, oy = map(int, l[5:].split(','))
        T[i] = (img.crop((x, y, x + w, y + h)), ox, oy)


def grade(im, mode):
    a = im.getchannel('A'); rgb = im.convert('RGB')
    if mode == 'grass':     # сухая выгоревшая трава: меньше зелени, теплее
        rgb = ImageEnhance.Color(rgb).enhance(0.45)
        rgb = Image.blend(rgb, ImageOps.colorize(ImageOps.grayscale(rgb), (22, 16, 10), (196, 168, 120), mid=(104, 84, 56)), 0.5)
        rgb = ImageEnhance.Brightness(rgb).enhance(1.12)
    elif mode == 'road':
        rgb = ImageEnhance.Brightness(ImageEnhance.Color(rgb).enhance(0.45)).enhance(1.12)
    elif mode == 'water':   # тёмная вода чуть светлее и холоднее
        rgb = ImageEnhance.Brightness(rgb).enhance(1.6)
        rgb = Image.blend(rgb, Image.new('RGB', rgb.size, (40, 70, 84)), 0.25)
    elif mode == 'autumn':  # листва в ржавчину
        g = ImageOps.grayscale(rgb)
        rgb = Image.blend(rgb, ImageOps.colorize(g, (18, 10, 6), (236, 150, 64), mid=(120, 62, 26)), 0.7)
    elif mode == 'ashleaf': # бледная пепельная листва
        g = ImageOps.grayscale(rgb)
        rgb = Image.blend(rgb, ImageOps.colorize(g, (16, 14, 14), (214, 200, 184), mid=(100, 92, 86)), 0.7)
    elif mode == 'pine':    # хвоя приглушённая, почти чёрная
        rgb = ImageEnhance.Brightness(ImageEnhance.Color(rgb).enhance(0.5)).enhance(0.85)
    elif mode == 'charred': # обгоревший дом
        rgb = ImageEnhance.Color(rgb).enhance(0.45)
        rgb = Image.blend(rgb, ImageOps.colorize(ImageOps.grayscale(rgb), (6, 4, 4), (150, 120, 96), mid=(52, 40, 32)), 0.6)
    elif mode == 'plant':
        rgb = ImageEnhance.Color(rgb).enhance(0.5)
        rgb = Image.blend(rgb, ImageOps.colorize(ImageOps.grayscale(rgb), (20, 14, 8), (190, 160, 96), mid=(96, 80, 44)), 0.45)
    else:                   # дерево, камень, ткань: слегка приглушить
        rgb = ImageEnhance.Color(rgb).enhance(0.8)
    rgb.putalpha(a)
    return rgb


origins = {}
def save(key, i, mode, scale=S, size=None):
    im, ox, oy = T[i]
    w, h = size or (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    fx, fy = w / im.width, h / im.height
    out = grade(im.resize((w, h), Image.LANCZOS), mode)
    out.save(f'{OUT}/{key}.webp', 'WEBP', quality=88, method=6)
    origins[key] = [round(ox * fx / w, 4), round(oy * fy / h, 4)]

# земля, дорога, вода — ромбы 128×64 с центром в клетке
for v, i in enumerate([16, 18, 20, 23, 26, 29]): save(f'floor_surface_{v}', i, 'grass', size=(128, 64))
for v, i in enumerate([32, 34, 36, 38]): save(f'sf_road_{v}', i, 'road', size=(128, 64))
for v, i in enumerate([176, 178, 180, 182]):
    save(f'sf_water_{v}', i, 'water', size=(128, 64)); origins[f'sf_water_{v}'] = [0.5, 0.5]
for v, i in enumerate([200, 201, 202, 203]):  # настил мостков: только доски (нижняя часть тайла — тень на воде)
    im, ox, oy = T[i]; T[i] = (im.crop((0, 0, im.width, 112)), ox, oy)
    save(f'sf_dock_{v}', i, 'prop')
# деревья: мёртвые, ели, осенние дубы, пепельные берёзы
for v, i in enumerate([244, 245, 246, 247]): save(f'sf_tree_dead_{v}', i, 'prop')
for v, i in enumerate([248, 249, 250, 251]): save(f'sf_tree_pine_{v}', i, 'pine')
for v, i in enumerate([252, 253, 254, 255]): save(f'sf_tree_oak_{v}', i, 'autumn')
for v, i in enumerate([240, 241, 242, 243]): save(f'sf_tree_ash_{v}', i, 'ashleaf')
# дома (по клеткам, как в картах FLARE): сруб A — 211/210 вглубь по y, 208 слева, 209 угол;
# сруб B — 215 вглубь по y, 212/213 слева, 214 угол. Целые — для лагеря, обгоревшие — для деревни.
for i in [208, 209, 210, 211, 212, 213, 214, 215]:
    save(f'sf_house_{i}', i, 'prop'); save(f'sf_house_{i}_burnt', i, 'charred')
save('sf_house_296', 296, 'prop')  # старая каменная башня под деревянной крышей — мельница
# палатки: A = 72 + 73 (клетка y−1), B = 74 (клетка x−1) + 75
for i in [72, 73, 74, 75]: save(f'sf_tent_{i}', i, 'prop')
# предметы
props = {
    'sf_chest_0': 76, 'sf_crate_0': 96, 'sf_crate_1': 97, 'sf_crate_2': 98, 'sf_crate_3': 99,
    'sf_logs_0': 100, 'sf_logs_1': 101, 'sf_campfire': 102, 'sf_anvil': 103,
    'sf_fence_0': 104, 'sf_fence_1': 107, 'sf_fence_2': 108, 'sf_fence_3': 111,
    'sf_rock_0': 128, 'sf_rock_1': 129, 'sf_rock_2': 130, 'sf_rock_3': 131,
    'sf_stone_0': 132, 'sf_stone_1': 133, 'sf_stone_2': 134, 'sf_stone_3': 135,
    'sf_stump_0': 136, 'sf_stump_1': 137, 'sf_sign_0': 138, 'sf_sign_1': 139,
    'sf_grave_0': 140, 'sf_grave_1': 141, 'sf_grave_2': 142, 'sf_grave_3': 143,
}
for k, i in props.items(): save(k, i, 'prop')
for k, i in {'sf_bush_0': 112, 'sf_bush_1': 113, 'sf_reed_0': 114, 'sf_reed_1': 115, 'sf_plant_0': 116, 'sf_plant_1': 117,
             'sf_tuft_0': 124, 'sf_tuft_1': 125, 'sf_tuft_2': 126, 'sf_tuft_3': 127}.items(): save(k, i, 'plant')

man_path = f'{OUT}/manifest.json'
man = json.load(open(man_path))
man['images'] = [k for k in man.get('images', []) if not k.startswith('floor_surface_')]
man['origins'].update(origins)
json.dump(man, open(man_path, 'w'), indent=1)
print(len(origins), 'surface tiles')
