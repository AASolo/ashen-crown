import sys, json
from PIL import Image, ImageEnhance, ImageOps, ImageStat
FC = '/tmp/claude-0/dl/flare-game/mods/fantasycore/'
OUT = sys.argv[1]
S = 128/192
def tileset(name):
    im = Image.open(FC + f'images/tilesets/{name}.png').convert('RGBA')
    T = {}
    for l in open(FC + f'tilesetdefs/{name}.txt'):
        if l.startswith('tile='):
            i,x,y,w,h,ox,oy = map(int, l[5:].split(','))
            T[i] = (im.crop((x,y,x+w,y+h)), ox, oy)
    return T
D, C = tileset('tileset_dungeon'), tileset('tileset_cave')
def grade(im, mode):
    r,g,b,a = im.split(); rgb = Image.merge('RGB',(r,g,b))
    if mode == 'ash':
        gray = ImageOps.grayscale(rgb)
        ash = ImageOps.colorize(gray, (10,8,8), (190,176,160), mid=(74,64,58))
        rgb = Image.blend(rgb, ash, 0.75)
    elif mode == 'crypt':
        rgb = ImageEnhance.Color(rgb).enhance(0.55)
        rgb = Image.blend(rgb, Image.new('RGB', rgb.size, (40,38,58)), 0.12)
    elif mode == 'violet':
        gray = ImageOps.grayscale(rgb)
        rgb = ImageOps.colorize(gray, (8,4,16), (230,200,255), mid=(120,60,200))
    else:
        rgb = ImageEnhance.Color(rgb).enhance(0.75)
    return Image.merge('RGBA', (*rgb.split(), a))
meta = {}
def save(key, im, ax, ay, mode):
    im = grade(im, mode)
    im.save(f'{OUT}/{key}.png', optimize=True)
    meta[key] = [round(ax / im.width, 4), round(ay / im.height, 4)]
def place(src, scale, canvas=None):
    im, ox, oy = src
    w, h = max(1, round(im.width*scale)), max(1, round(im.height*scale))
    return im.resize((w, h), Image.LANCZOS), ox*scale, oy*scale
def prop(key, T, ids, mode, scale=S):
    # один или несколько тайлов с общей точкой опоры (чтобы chest/chest_open совпадали)
    parts = [place(T[i], scale) for i in ids]
    L = max(ax for _, ax, _ in parts); R = max(im.width - ax for im, ax, _ in parts)
    U = max(ay for _, _, ay in parts); B = max(im.height - ay for im, _, ay in parts)
    for k, (im, ax, ay) in zip(key, parts):
        c = Image.new('RGBA', (round(L+R)+2, round(U+B)+2))
        c.alpha_composite(im, (round(L-ax)+1, round(U-ay)+1))
        save(k, c, L+1, U+1, mode)
def floor(key, T, i, mode):
    im = T[i][0].resize((128, 64), Image.LANCZOS)
    save(key, im, 64, 32, mode)
def lr(im, ox):
    a = im.split()[3]; g = ImageOps.grayscale(im.convert('RGB'))
    def m(box):
        st = ImageStat.Stat(g.crop(box), a.crop(box)); return st.mean[0] if st.count[0] else 0
    return m((0, 0, max(1, int(ox) - 10), im.height)), m((int(ox) + 10, 0, im.width, im.height))
def wall(key, T, a, b, mode):
    (ia, xa, ya), (ib, xb, yb) = T[a], T[b]
    la, ra = lr(ia, xa); lb, rb = lr(ib, xb)
    (Lim, Lx, Ly), (Rim, Rx, Ry) = ((ia, xa, ya), (ib, xb, yb)) if la - ra > lb - rb else ((ib, xb, yb), (ia, xa, ya))
    U = max(Ly, Ry); Bt = max(Lim.height - Ly, Rim.height - Ry)
    c = Image.new('RGBA', (192, U + Bt))
    left = Lim.crop((0, 0, Lx, Lim.height)); c.alpha_composite(left, (96 - Lx, U - Ly))
    right = Rim.crop((Rx, 0, Rim.width, Rim.height)); c.alpha_composite(right, (96, U - Ry))
    w, h = 128, round(c.height * S)
    save(key, c.resize((w, h), Image.LANCZOS), 64, U * S, mode)
# Затонувшие Катакомбы — тайлсет подземелья Flare
for v, i in enumerate([16, 19, 44, 45, 17, 18]): floor(f'floor_catacombs_{v}', D, i, 'crypt')
for v, (a, b) in zip([0, 1, 2, 3, 4, 9], [(64, 65), (68, 69), (96, 97), (102, 103), (108, 109), (104, 105)]): wall(f'wall_catacombs_{v}', D, a, b, 'crypt')
prop(['pillar_catacombs'], D, [110], 'crypt')
# Пепельные Пустоши — пещерный тайлсет Flare, перекрашенный в пепел
for v, i in enumerate([16, 18, 20, 22, 24, 26]): floor(f'floor_ashlands_{v}', C, i, 'ash')
# стены пустошей остаются процедурными: у пещерных стен Flare чёрный верх
# Пропсы
prop(['chest', 'chest_open'], D, [144, 160], 'prop')
prop(['chest_elite', 'chest_elite_open'], D, [288, 289], 'prop')
prop(['altar'], D, [134], 'crypt')
prop(['portal'], D, [265], 'violet', S * 0.55)
prop(['decal_bones'], D, [183], 'prop')
json.dump(meta, open(f'{OUT}/world.json', 'w'), indent=1)
print(len(meta))
