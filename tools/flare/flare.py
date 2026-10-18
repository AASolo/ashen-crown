import re
from PIL import Image
def parse_anim(path):
    """У части врагов (минотавр, виверна) свой атлас на анимацию: image=путь,имя; у кадров 9-е поле — имя атласа."""
    anims={}; img=None; cur=None; named={}
    for line in open(path):
        line=line.strip()
        if line.startswith('image='):
            src,_,name=line[6:].partition(',')
            if name: named[name]=src
            if img is None: img=src
        elif line.startswith('['): cur=line[1:-1]; anims[cur]={'frames':[] ,'n':0}
        elif cur and line.startswith('frames='): anims[cur]['n']=int(line[7:])
        elif cur and line.startswith('frame='):
            f=line[6:].split(',')
            i,d,x,y,w,h,ox,oy=map(int,f[:8])
            if len(f)>8 and f[8] in named: anims[cur]['img']=named[f[8]]
            anims[cur]['frames'].append((i,d,x,y,w,h,ox,oy))
    return img,anims
def get_frame(atlas,anims,anim,idx,d):
    for (i,dd,x,y,w,h,ox,oy) in anims[anim]['frames']:
        if i==idx and dd==d: return atlas.crop((x,y,x+w,y+h)),ox,oy
    return None
