import re
from PIL import Image
def parse_anim(path):
    anims={}; img=None; cur=None
    for line in open(path):
        line=line.strip()
        if line.startswith('image='): img=line[6:]
        elif line.startswith('['): cur=line[1:-1]; anims[cur]={'frames':[] ,'n':0}
        elif cur and line.startswith('frames='): anims[cur]['n']=int(line[7:])
        elif cur and line.startswith('frame='):
            i,d,x,y,w,h,ox,oy=map(int,line[6:].split(','))
            anims[cur]['frames'].append((i,d,x,y,w,h,ox,oy))
    return img,anims
def get_frame(atlas,anims,anim,idx,d):
    for (i,dd,x,y,w,h,ox,oy) in anims[anim]['frames']:
        if i==idx and dd==d: return atlas.crop((x,y,x+w,y+h)),ox,oy
    return None
