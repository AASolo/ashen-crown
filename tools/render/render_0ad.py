# Рендер 3D-моделей 0 A.D. (Wildfire Games, CC-BY-SA 3.0) в изометрические листы кадров под стиль FLARE.
# FLARE сам сделан рендером из Blender, поэтому модель, отрендеренная тем же ракурсом (2:1, ортографическая камера,
# тёплый ключевой свет сверху слева), встаёт рядом с его спрайтами без шва.
# Нужен Blender 4.2 как модуль Python (в 5.x убран импорт Collada):
#   uv venv -p python3.11 b4 && uv pip install -p b4/bin/python bpy==4.2.0 numpy pillow
#   b4/bin/python -I render_0ad.py <art-папка 0ad> <out> <модель> [<модель> ...]
# Анимации 0 A.D. — матрицы костей по кадрам; импортёр Blender их теряет, поэтому они читаются здесь и
# ставятся в позу вручную. Лист выходит в формате build_chars.py (ячейки 320×288, нога в 160,220).
import sys, os, math, re, json
import xml.etree.ElementTree as ET
import bpy
from mathutils import Matrix, Vector
from PIL import Image, ImageOps, ImageEnhance

ART, OUT, MODELS = sys.argv[1], sys.argv[2], sys.argv[3:]
FW, FH, FOOTX, FOOTY, COLS = 320, 288, 160, 220, 12
QUICK = os.environ.get('QUICK') == '1'  # по кадру на анимацию: быстрый просмотр
SS = 2                      # рендер в 2× и уменьшение: мягкие края
NS = '{http://www.collada.org/2005/11/COLLADASchema}'
SIDES = {'S': (1, -1), 'N': (1, 1)}   # SE и NE на экране (камера смотрит на +Y, наклон 30°)

# модель: меш, текстура, высота в пикселях ячейки (до холки/макушки), какие анимации идут в какие слоты
SPECS = {
    'wolf': dict(mesh='meshes/skeletal/wolf.dae', tex='textures/skins/skeletal/animal_wolf_grey.png', px=92, grade='shadow',
                 seq=[('idle', 'wolf_idle_01', 4, (0, 0.2)), ('walk', 'wolf_run', 8, (0, 1)), ('attack', 'wolf_attack_01', 4, (0.15, 0.75)),
                      ('cast', 'wolf_attack_02', 4, (0.15, 0.75)), ('hit', 'wolf_death_01', 2, (0.05, 0.18)), ('death', 'wolf_death_01', 6, (0, 1))]),
}
ANIM_DIR = 'animation/quadraped/'

# Неподвижные предметы: одна картинка с точкой опоры. player — цвет «флага игрока» 0 A.D. (там, где альфа текстуры < 1).
PROPS = {
    'cart': dict(mesh='meshes/props/wrld_handcart_broken.dae', tex='textures/skins/props/wood_d.png', px=96, yaw=-30),
    'banner': dict(mesh='meshes/props/garrison_flag.dae', tex='textures/skins/props/garrison_hele_1.png', px=170, yaw=-20, stretch=1.6,
                   player=(0.62, 0.1, 0.07)),   # багровое знамя со звездой Пустого Солнца; полотнище шире, чем в 0 A.D.
}


def grade(im, mode):
    """Цветокоррекция как у врагов FLARE в build_chars.py: теневой волк — угольная шерсть с холодным отливом."""
    if not mode: return im
    a = im.getchannel('A'); rgb = im.convert('RGB')
    if mode == 'shadow':
        rgb = Image.blend(rgb, ImageOps.colorize(ImageOps.grayscale(rgb), (8, 6, 12), (178, 168, 176), mid=(64, 56, 66)), 0.55)
        rgb = ImageEnhance.Contrast(rgb).enhance(1.1)
    rgb.putalpha(a)
    return rgb


def mat(text):
    v = [float(x) for x in text.split()]
    return Matrix([v[0:4], v[4:8], v[8:12], v[12:16]])


def read_dae(path):
    """Иерархия суставов (rest-матрицы) и анимация: {имя кости: [матрица на кадр]}."""
    root = ET.parse(path).getroot()
    parent, rest, idname = {}, {}, {}
    def walk(node, par):
        name = node.get('name')
        if node.get('type') == 'JOINT':
            idname[node.get('id')] = name; parent[name] = par
            m = node.find(NS + 'matrix'); rest[name] = mat(m.text) if m is not None else Matrix.Identity(4)
            par = name
        for ch in node.findall(NS + 'node'): walk(ch, par)
    for vs in root.iter(NS + 'visual_scene'):
        for n in vs.findall(NS + 'node'): walk(n, None)
    anim = {}
    for a in root.iter(NS + 'animation'):
        ch = a.find(NS + 'channel')
        if ch is None: continue
        tid = ch.get('target').split('/')[0]
        srcs = {s.get('id'): s for s in a.findall(NS + 'source')}
        out = next(s for k, s in srcs.items() if k.endswith('-output'))
        v = [float(x) for x in out.find(NS + 'float_array').text.split()]
        anim[idname.get(tid, tid)] = [Matrix([v[i:i + 4], v[i + 4:i + 8], v[i + 8:i + 12], v[i + 12:i + 16]]) for i in range(0, len(v), 16)]
    return parent, rest, anim


def world(parent, local):
    w = {}
    def get(b):
        if b not in w: w[b] = (get(parent[b]) if parent[b] else Matrix.Identity(4)) @ local[b]
        return w[b]
    for b in local: get(b)
    return w


def setup_scene(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.collada_import(filepath=ART + spec['mesh'])
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
    # материал: текстура 0 A.D., матовая шерсть
    m = bpy.data.materials.new('skin'); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    tex = m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(ART + spec['tex'])
    m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.85
    mesh.data.materials.clear(); mesh.data.materials.append(m)
    for p in mesh.data.polygons: p.use_smooth = True
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = FW * SS, FH * SS
    sc.view_settings.view_transform = 'Standard'
    sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.32, 0.28, 0.26, 1)
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55
    # свет как у FLARE: тёплый ключ сверху слева, холодный контр сзади справа
    for name, rot, e, col in [('key', (50, 0, -60), 3.2, (1.0, 0.86, 0.7)), ('rim', (60, 0, 140), 1.6, (0.6, 0.7, 1.0))]:
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN')); sc.collection.objects.link(l)
        l.data.energy = e; l.data.color = col; l.data.angle = math.radians(8)
        l.rotation_euler = [math.radians(a) for a in rot]
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.rotation_euler = (math.radians(60), 0, 0)   # смотрит на +Y, вниз на 30°: ромб 2:1
    return arm, mesh, cam


def pose(arm, parent, rest_w, anim, f):
    """Поставить кадр f анимации: матрицы суставов (локальные) → matrix_basis костей Blender."""
    local = {b: (anim[b][min(f, len(anim[b]) - 1)] if b in anim else
                 ((rest_w[parent[b]].inverted() if parent[b] else Matrix.Identity(4)) @ rest_w[b])) for b in parent}
    aw = world(parent, local)
    posed = {}
    for b in arm.data.bones:
        posed[b.name] = aw[b.name] @ rest_w[b.name].inverted() @ b.matrix_local
    for b in arm.data.bones:
        pb = arm.pose.bones[b.name]
        rel_rest = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
        rel_pose = (posed[b.parent.name].inverted() @ posed[b.name]) if b.parent else posed[b.name]
        pb.matrix_basis = rel_rest.inverted() @ rel_pose


def load_anim(src, rest_l):
    """Анимация с поправкой масштаба: скелет в файлах анимаций 0 A.D. бывает крупнее, чем в файле модели."""
    _, rest_a, an = read_dae(ART + ANIM_DIR + src + '.dae')
    ks = [rest_l[b].translation.length / rest_a[b].translation.length for b in rest_l
          if b in rest_a and rest_a[b].translation.length > 1e-3]
    k = sorted(ks)[len(ks) // 2]
    for ms in an.values():
        for m in ms: m.translation = m.translation * k
    return an


def render(key, spec, tmp):
    arm, mesh, cam = setup_scene(spec)
    parent, rest_l, _ = read_dae(ART + spec['mesh'])
    rest_w = world(parent, rest_l)
    # масштаб: высота модели в покое → spec['px'] пикселей ячейки
    bpy.context.view_layer.update()
    zs = [(mesh.matrix_world @ v.co).z for v in mesh.data.vertices]
    height = max(zs) - min(zs)
    upp = height / spec['px']                       # мировых единиц на пиксель ячейки (по вертикали экрана ~ cos30)
    cam.data.ortho_scale = upp * FW / math.cos(math.radians(30))
    fwd = Vector((0, 1, 0))
    up = cam.rotation_euler.to_matrix() @ Vector((0, 1, 0))
    look = cam.rotation_euler.to_matrix() @ Vector((0, 0, -1))
    off = (FOOTY - FH / 2) * cam.data.ortho_scale / FW   # нога ниже центра кадра
    cam.location = -look * 20 + up * off
    # голова модели: куда смотрит (для поворота к SE/NE)
    hb = next(b for b in arm.data.bones if b.name.lower().startswith('head'))
    head = (arm.matrix_world @ hb.head_local)
    face = math.atan2(head.y, head.x)
    seq, frames, idx, meta = spec['seq'], [], 0, {}
    per_side = sum(n for _, _, n, _ in seq)
    sheet = Image.new('RGBA', (FW * COLS, FH * (-(-2 * per_side // COLS))))
    anims = {}
    for side, (dx, dy) in SIDES.items():
        rot = math.atan2(dy, dx) - face
        arm.rotation_euler = (arm.rotation_euler.x, arm.rotation_euler.y, rot)
        start = idx
        for name, src, n, (t0, t1) in seq:
            if src not in anims: anims[src] = load_anim(src, rest_l)
            an = anims[src]; L = len(next(iter(an.values())))
            if side == 'S': meta[name] = [idx - start, n]
            for i in range(1 if QUICK else n):
                t = t0 + (t1 - t0) * (i / (n - 1) if name in ('death', 'hit', 'attack', 'cast') and n > 1 else i / n)
                pose(arm, parent, rest_w, an, min(L - 1, round(t * (L - 1))))
                p = f'{tmp}/{key}_{idx}.png'
                bpy.context.scene.render.filepath = p
                bpy.ops.render.render(write_still=True)
                cell = grade(Image.open(p).convert('RGBA').resize((FW, FH), Image.LANCZOS), spec.get('grade'))
                sheet.alpha_composite(cell, ((idx % COLS) * FW, (idx // COLS) * FH))
                idx += 1
    sheet.save(f'{OUT}/{key}.png')
    return {'fw': FW, 'fh': FH, 'footY': FOOTY, 'cols': COLS, 'perSide': per_side, 'anims': meta}


def render_prop(key, spec, tmp):
    """Предмет: рендер с ракурса игры, обрезка по содержимому, точка опоры — проекция начала координат модели."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.collada_import(filepath=ART + spec['mesh'])
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    m = bpy.data.materials.new('skin'); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.8
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(ART + spec['tex'])
    tex.image.alpha_mode = 'CHANNEL_PACKED'   # альфа 0 A.D. — маска цвета игрока, а не прозрачность
    if 'player' in spec:   # 0 A.D.: цвет = текстура × (альфа + (1 − альфа) × цвет игрока)
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        nt.links.new(tex.outputs['Alpha'], mix.inputs['Factor']); mix.inputs['Factor'].default_value = 1
        inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1
        nt.links.new(tex.outputs['Alpha'], inv.inputs[1])
        mix2 = nt.nodes.new('ShaderNodeMix'); mix2.data_type = 'RGBA'
        nt.links.new(inv.outputs[0], mix2.inputs['Factor'])
        mix2.inputs[6].default_value = (1, 1, 1, 1); mix2.inputs[7].default_value = (*spec['player'], 1)
        mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
        nt.links.new(tex.outputs['Color'], mul.inputs[6]); nt.links.new(mix2.outputs[2], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
    else:
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    for o in meshes:
        o.data.materials.clear(); o.data.materials.append(m)
        for pl in o.data.polygons: pl.use_smooth = True
    # общая сцена: свет и камера как у персонажей
    sc = bpy.context.scene
    arm = None
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.device = 'CPU'; sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.32, 0.28, 0.26, 1)
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55
    for name, rot, e, col in [('key', (50, 0, -60), 3.2, (1.0, 0.86, 0.7)), ('rim', (60, 0, 140), 1.6, (0.6, 0.7, 1.0))]:
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN')); sc.collection.objects.link(l)
        l.data.energy = e; l.data.color = col; l.data.angle = math.radians(8); l.rotation_euler = [math.radians(a) for a in rot]
    root = bpy.data.objects.new('root', None); sc.collection.objects.link(root)
    for o in bpy.data.objects:
        if o.parent is None and o is not root and o.type in ('MESH', 'EMPTY', 'ARMATURE'): o.parent = root
    root.rotation_euler = (0, 0, math.radians(spec.get('yaw', 0)))
    k = spec.get('stretch', 1); root.scale = (k, k, 1)   # растянуть по горизонтали (полотнище знамени)
    bpy.context.view_layer.update()
    zs = [(o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices]
    upp = (max(zs) - min(zs)) / spec['px']
    W = H = 512
    sc.render.resolution_x, sc.render.resolution_y = W * SS, H * SS
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.rotation_euler = (math.radians(60), 0, 0)
    cam.data.ortho_scale = upp * W / math.cos(math.radians(30))
    R = cam.rotation_euler.to_matrix(); up = R @ Vector((0, 1, 0)); look = R @ Vector((0, 0, -1))
    foot_y = H * 0.8
    cam.location = -look * 30 + up * ((foot_y - H / 2) * cam.data.ortho_scale / W)
    sc.render.filepath = f'{tmp}/{key}.png'
    bpy.ops.render.render(write_still=True)
    im = grade(Image.open(sc.render.filepath).convert('RGBA').resize((W, H), Image.LANCZOS), spec.get('grade'))
    b = im.getbbox(); im = im.crop(b)
    im.save(f'{OUT}/{key}.webp', 'WEBP', quality=88, method=6)
    return [round((W / 2 - b[0]) / im.width, 4), round((foot_y - b[1]) / im.height, 4)]


os.makedirs(OUT + '/tmp', exist_ok=True)
meta, origins = {}, {}
for m in MODELS:
    if m in PROPS: origins[m] = render_prop(m, PROPS[m], OUT + '/tmp')
    else: meta[f'en_{m}'] = render(f'en_{m}', SPECS[m], OUT + '/tmp')
if origins: json.dump(origins, open(f'{OUT}/origins.json', 'w'), indent=1)
if meta: json.dump(meta, open(f'{OUT}/chars.json', 'w'), indent=1)
print('ok', list(meta), list(origins))
