# Стены и колонна Пепельных Пустошей из стен Катакомб FLARE: перекраска в пепел + тлеющие трещины.
# python3 tools/flare/ash_walls.py assets/flare
import sys, json, random
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageChops
D = sys.argv[1]

def ash(rgb):
    gray = ImageOps.grayscale(rgb)
    tone = ImageOps.colorize(gray, (12, 10, 11), (214, 200, 184), mid=(92, 84, 80))
    return Image.blend(rgb, tone, 0.8)

def cracks(size, alpha, seed, n):
    rnd = random.Random(seed)
    w, h = size
    core = Image.new('L', size); glow = Image.new('L', size)
    dc, dg = ImageDraw.Draw(core), ImageDraw.Draw(glow)
    for _ in range(n):
        # трещина растёт снизу вверх по грани стены, ветвясь
        x, y = rnd.uniform(w * 0.12, w * 0.88), rnd.uniform(h * 0.55, h * 0.92)
        pts = [(x, y)]
        for _ in range(rnd.randint(4, 8)):
            x += rnd.uniform(-9, 9); y -= rnd.uniform(5, 14)
            pts.append((x, y))
        dg.line(pts, fill=255, width=7)
        dc.line(pts, fill=255, width=2)
    glow = glow.filter(ImageFilter.GaussianBlur(5))
    m = alpha.point(lambda a: 255 if a > 200 else 0).filter(ImageFilter.MinFilter(5))
    return ImageChops.multiply(core, m), ImageChops.multiply(glow, m)

def make(src, dst, seed, n):
    im = Image.open(f'{D}/{src}.webp').convert('RGBA')
    r, g, b, a = im.split()
    rgb = ash(Image.merge('RGB', (r, g, b)))
    core, glow = cracks(im.size, a, seed, n)
    # мягкое оранжевое свечение вокруг и раскалённая сердцевина
    rgb = ImageChops.add(rgb, Image.merge('RGB', (glow.point(lambda v: v * 0.9), glow.point(lambda v: v * 0.35), glow.point(lambda v: v * 0.08))))
    hot = Image.new('RGB', im.size, (255, 196, 110))
    rgb = Image.composite(hot, rgb, core)
    Image.merge('RGBA', (*rgb.split(), a)).save(f'{D}/{dst}.webp', quality=88, method=6)

man = json.load(open(f'{D}/manifest.json'))
for v in [0, 1, 2, 3, 4, 9]:
    make(f'wall_catacombs_{v}', f'wall_ashlands_{v}', 7 + v, 1 if v in (1, 3) else 2 if v == 9 else 0)
    man['origins'][f'wall_ashlands_{v}'] = man['origins'][f'wall_catacombs_{v}']
make('pillar_catacombs', 'pillar_ashlands', 3, 1)
man['origins']['pillar_ashlands'] = man['origins']['pillar_catacombs']
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
