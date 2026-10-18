# Ужать листы персонажей: обрезать пустые поля ячейки (симметрично вокруг ноги) и уменьшить разрешение.
# Игра компенсирует масштаб полем `scale` в manifest (Actor.baseScale *= 1/scale).
import sys, json
from PIL import Image
SRC, DST, RES = sys.argv[1], sys.argv[2], float(sys.argv[3])
m = json.load(open(f'{SRC}/chars.json'))
for k, v in m.items():
    s = Image.open(f'{SRC}/{k}.png'); fw, fh, c, n = v['fw'], v['fh'], v['cols'], v['perSide'] * 2
    cells = [s.crop(((i % c) * fw, (i // c) * fh, (i % c) * fw + fw, (i // c) * fh + fh)) for i in range(n)]
    L = T = 10**9; R = B = 0
    for cell in cells:
        b = cell.getbbox()
        if b: L, T, R, B = min(L, b[0]), min(T, b[1]), max(R, b[2]), max(B, b[3])
    fx = fw // 2; half = max(fx - L, R - fx) + 2
    box = (fx - half, max(0, T - 2), fx + half, min(fh, B + 2))
    nw, nh = round((box[2] - box[0]) * RES), round((box[3] - box[1]) * RES)
    cols = max(1, 4000 // nw)
    out = Image.new('RGBA', (cols * nw, -(-n // cols) * nh))
    for i, cell in enumerate(cells):
        out.alpha_composite(cell.crop(box).resize((nw, nh), Image.LANCZOS), ((i % cols) * nw, (i // cols) * nh))
    out.save(f'{DST}/{k}.webp', quality=86, method=6)
    v.update(fw=nw, fh=nh, footY=round((v['footY'] - box[1]) * RES, 2), cols=cols, scale=RES)
    print(k, out.size, nw, nh)
json.dump(m, open(f'{DST}/chars.json', 'w'), indent=1)
