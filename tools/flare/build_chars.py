import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
from flare import parse_anim
from PIL import Image, ImageEnhance, ImageOps
FC = '/tmp/claude-0/dl/flare-game/mods/fantasycore/'
OUT = sys.argv[1]
SCALE = 128/192 * 1.25   # тайл Flare 192×96 → наш 2×-тайл 128×64, +25% под рост процедурных героев
FW, FH, FOOTX, FOOTY = 320, 288, 160, 220
COLS = 12
SEQ = [('idle','stance',4), ('walk','run',8), ('attack','swing',4), ('cast','cast',4), ('hit','hit',2), ('death','die',6)]
PER_SIDE = sum(n for *_, n in SEQ)
DIRS = {'S': 6, 'N': 4}   # SE и NE в нумерации Flare (SW,W,NW,N,NE,E,SE,S)
LAYERS = {6: ['feet','legs','hands','main','chest','head','off'], 4: ['feet','legs','hands','chest','off','head','main']}
cache = {}
def load(animfile):
    if animfile not in cache:
        img, anims = parse_anim(FC + animfile)
        cache[animfile] = (Image.open(FC + img).convert('RGBA'), anims)
    return cache[animfile]
def frame(animfile, anim, idx, d):
    atlas, anims = load(animfile)
    if anim not in anims: anim = 'swing'
    n = anims[anim]['n']; idx = min(idx * n // 1000, n - 1) if False else idx
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
    else:
        rgb = Image.blend(rgb, Image.new('RGB', rgb.size, (60,30,18)), 0.06)
    out = Image.merge('RGBA', (*rgb.split(), a))
    return out
def build(key, layers_by_slot, mode='hero'):
    """layers_by_slot: {slot: animfile} для аватара или {'body': animfile} для монстра"""
    sheet = Image.new('RGBA', (FW*COLS, FH*((2*PER_SIDE + COLS - 1)//COLS)), (0,0,0,0))
    idx = 0
    anims_meta = {}
    for side, d in DIRS.items():
        start = idx
        for name, src, k in SEQ:
            anims_meta.setdefault(name, [None, k])
            if side == 'S': anims_meta[name][0] = idx - start
            first = next(iter(layers_by_slot.values()))
            n_src = load(first)[1].get(src, load(first)[1]['swing'])['n']
            for i in range(k):
                fi = pick(n_src, k, i)
                cell = Image.new('RGBA', (FW, FH))
                order = LAYERS[d] if 'body' not in layers_by_slot else ['body']
                for slot in order:
                    if slot not in layers_by_slot: continue
                    fr = frame(layers_by_slot[slot], src, fi, d)
                    if not fr: continue
                    im, ox, oy = fr
                    w, h = max(1, round(im.width*SCALE)), max(1, round(im.height*SCALE))
                    im = im.resize((w, h), Image.LANCZOS)
                    cell.alpha_composite(im, (FOOTX - round(ox*SCALE), FOOTY - round(oy*SCALE)))
                cell = grade(cell, mode)
                sheet.alpha_composite(cell, ((idx % COLS)*FW, (idx // COLS)*FH))
                idx += 1
    sheet.save(f'{OUT}/{key}.png', optimize=True)
    return {'fw': FW, 'fh': FH, 'footY': FOOTY, 'cols': COLS, 'perSide': PER_SIDE, 'anims': {k: v for k, v in anims_meta.items()}}
A = 'animations/avatar/'
def av(sex, **slots): return {s: f'{A}{sex}/{f}.txt' for s, f in slots.items()}
meta = {}
meta['hero_blade'] = build('hero_blade', av('male', feet='leather_boots', legs='leather_pants', hands='leather_gloves', chest='leather_chest', head='head_short', main='longsword'))
meta['hero_witch'] = build('hero_witch', av('female', feet='mage_boots_alt2', legs='mage_skirt_alt2', hands='mage_sleeves_alt2', chest='mage_vest_alt2', head='head_long', main='greatstaff'))
meta['hero_bone'] = build('hero_bone', av('male', feet='plate_boots', legs='plate_greaves', hands='plate_gauntlets', chest='plate_cuirass', head='plate_helm', main='war_hammer', off='kite_shield'))
meta['hero_shade'] = build('hero_shade', av('male', feet='leather_boots', legs='leather_pants', hands='leather_gloves', chest='leather_chest', head='leather_hood', main='dagger'))
E = 'animations/enemies/'
meta['en_ghoul'] = build('en_ghoul', {'body': E+'zombie.txt'}, 'ash')
meta['en_cultist'] = build('en_cultist', {'body': E+'skeleton_mage.txt'}, 'enemy')
meta['en_shadow'] = build('en_shadow', {'body': E+'skeleton.txt'}, 'shadow')
json.dump(meta, open(f'{OUT}/chars.json','w'), indent=1)
print('ok', PER_SIDE)
