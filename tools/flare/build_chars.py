import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
from flare import parse_anim
from PIL import Image, ImageEnhance, ImageOps
# Запуск: python3 -I build_chars.py <out> [<клон flare-game> [ключ ...]]; без ключей собираются все листы.
OUT = sys.argv[1]
GAME = (sys.argv[2] if len(sys.argv) > 2 else '/tmp/claude-0/dl/flare-game').rstrip('/') + '/mods/'
ONLY = set(sys.argv[3:])
FC = GAME + 'fantasycore/'
SCALE = 128/192 * 1.25   # тайл Flare 192×96 → наш 2×-тайл 128×64, +25% под рост процедурных героев
FW, FH, FOOTX, FOOTY = 320, 288, 160, 220
COLS = 12
SEQ = [('idle','stance',4), ('walk','run',8), ('attack','swing',4), ('cast','cast',4), ('hit','hit',2), ('death','die',6)]
PER_SIDE = sum(n for *_, n in SEQ)
DIRS = {'S': 6, 'N': 4}   # SE и NE в нумерации Flare (SW,W,NW,N,NE,E,SE,S)
LAYERS = {6: ['feet','legs','hands','main','chest','head','off'], 4: ['feet','legs','hands','chest','off','head','main']}
cache = {}
def load(animfile):
    """animfile — путь внутри fantasycore или 'мод:путь' для других модов FLARE."""
    if animfile not in cache:
        mod, rel = animfile.split(':') if ':' in animfile else ('fantasycore', animfile)
        img, anims = parse_anim(GAME + mod + '/' + rel)
        for a in anims.values():   # атлас на анимацию, если он свой
            if 'img' in a: a['atlas'] = Image.open(GAME + mod + '/' + a['img']).convert('RGBA')
        cache[animfile] = (Image.open(GAME + mod + '/' + img).convert('RGBA'), anims)
    return cache[animfile]
def frame(animfile, anim, idx, d):
    atlas, anims = load(animfile)
    if anim not in anims: anim = 'shoot' if anim == 'cast' and 'shoot' in anims else 'swing'  # лучник: выстрел вместо заклинания
    n = anims[anim]['n']; idx = min(idx * n // 1000, n - 1) if False else idx
    atlas = anims[anim].get('atlas', atlas)
    for (i,dd,x,y,w,h,ox,oy) in anims[anim]['frames']:
        if i == idx and dd == d: return atlas.crop((x,y,x+w,y+h)), ox, oy
    return None
def pick(n_src, k, i):
    return round(i * (n_src - 1) / max(1, k - 1)) if k > 1 else 0
def grade(im, mode):
    r,g,b,a = im.split()
    rgb = Image.merge('RGB',(r,g,b))
    rgb = ImageEnhance.Color(rgb).enhance(0.72)
    if mode == 'shadow':
        gray = ImageOps.grayscale(rgb)
        rgb = ImageOps.colorize(gray, (6,4,12), (120,96,200), mid=(40,30,70))
        a = a.point(lambda v: int(v*0.92))
    elif mode == 'ash':
        gray = ImageOps.grayscale(rgb)
        ash = ImageOps.colorize(gray, (14,10,9), (205,190,170), mid=(90,78,68))
        rgb = Image.blend(rgb, ash, 0.6)
    elif mode == 'ember':   # обугленный, с тлеющим отливом: босс и пепельные звери
        gray = ImageOps.grayscale(rgb)
        rgb = Image.blend(rgb, ImageOps.colorize(gray, (10,6,6), (236,170,110), mid=(96,52,34)), 0.55)
    else:
        rgb = Image.blend(rgb, Image.new('RGB', rgb.size, (60,30,18)), 0.06)
    out = Image.merge('RGBA', (*rgb.split(), a))
    return out
def build(key, layers_by_slot, mode='hero', scale=1.0):
    """layers_by_slot: {slot: animfile} для аватара или {'body': animfile} для монстра; scale > 1 — крупнее и ячейка больше (боссы)"""
    FW_, FH_, FOOTX_, FOOTY_ = (round(v * scale) for v in (FW, FH, FOOTX, FOOTY))
    sheet = Image.new('RGBA', (FW_*COLS, FH_*((2*PER_SIDE + COLS - 1)//COLS)), (0,0,0,0))
    idx = 0
    anims_meta = {}
    for side, d in DIRS.items():
        start = idx
        for name, src, k in SEQ:
            anims_meta.setdefault(name, [None, k])
            if side == 'S': anims_meta[name][0] = idx - start
            first = next(iter(layers_by_slot.values()))
            fa = load(first)[1]
            n_src = fa.get(src, fa.get('shoot') if src == 'cast' and 'shoot' in fa else fa['swing'])['n']
            for i in range(k):
                fi = pick(n_src, k, i)
                cell = Image.new('RGBA', (FW_, FH_))
                order = LAYERS[d] if 'body' not in layers_by_slot else ['body']
                for slot in order:
                    if slot not in layers_by_slot: continue
                    fr = frame(layers_by_slot[slot], src, fi, d)
                    if not fr: continue
                    im, ox, oy = fr
                    sc = SCALE * scale
                    w, h = max(1, round(im.width*sc)), max(1, round(im.height*sc))
                    im = im.resize((w, h), Image.LANCZOS)
                    cell.alpha_composite(im, (FOOTX_ - round(ox*sc), FOOTY_ - round(oy*sc)))
                cell = grade(cell, mode)
                sheet.alpha_composite(cell, ((idx % COLS)*FW_, (idx // COLS)*FH_))
                idx += 1
    sheet.save(f'{OUT}/{key}.png', optimize=True)
    return {'fw': FW_, 'fh': FH_, 'footY': FOOTY_, 'cols': COLS, 'perSide': PER_SIDE, 'anims': {k: v for k, v in anims_meta.items()}}
A = 'animations/avatar/'
def av(sex, **slots): return {s: f'{A}{sex}/{f}.txt' for s, f in slots.items()}
meta = {}
def want(k): return not ONLY or k in ONLY
def want(k): return not ONLY or k in ONLY
if want('hero_blade'): meta['hero_blade'] = build('hero_blade', av('male', feet='leather_boots', legs='leather_pants', hands='leather_gloves', chest='leather_chest', head='head_short', main='longsword'))
if want('hero_witch'): meta['hero_witch'] = build('hero_witch', av('female', feet='mage_boots_alt2', legs='mage_skirt_alt2', hands='mage_sleeves_alt2', chest='mage_vest_alt2', head='head_long', main='greatstaff'))
if want('hero_bone'): meta['hero_bone'] = build('hero_bone', av('male', feet='plate_boots', legs='plate_greaves', hands='plate_gauntlets', chest='plate_cuirass', head='plate_helm', main='war_hammer', off='kite_shield'))
if want('hero_shade'): meta['hero_shade'] = build('hero_shade', av('male', feet='leather_boots', legs='leather_pants', hands='leather_gloves', chest='leather_chest', head='leather_hood', main='dagger'))
E = 'animations/enemies/'
if want('en_ghoul'): meta['en_ghoul'] = build('en_ghoul', {'body': E+'zombie.txt'}, 'ash')
if want('en_cultist'): meta['en_cultist'] = build('en_cultist', {'body': E+'skeleton_mage.txt'}, 'enemy')
if want('en_shadow'): meta['en_shadow'] = build('en_shadow', {'body': E+'skeleton.txt'}, 'shadow')
EC = 'empyrean_campaign:animations/enemies/'
if want('en_herald'): meta['en_herald'] = build('en_herald', {'body': EC+'skeleton_mage_high_boss.txt'}, 'ember', 1.45)
if want('en_archer'): meta['en_archer'] = build('en_archer', {'body': E+'skeleton_archer.txt'}, 'ash')
if want('en_brute'): meta['en_brute'] = build('en_brute', {'body': E+'minotaur.txt'}, 'ember', 1.1)
json.dump(meta, open(f'{OUT}/chars.json','w'), indent=1)
print('ok', PER_SIDE)
