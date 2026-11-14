"""SIERRA fauna v5 — cuadrúpedos animados a partir de una vista de perfil.

Uso (siempre headless, sin abrir ningún .blend):
  Blender -b --factory-startup --python cuadrupedos_build.py -- \
      --animal cabra --refs <carpeta refs> --work <carpeta trabajo> --out <carpeta modelos>
Las carpetas también se leen de SIERRA_V5_REFS, SIERRA_V5_WORK y SIERRA_V5_OUT.

Técnica: la silueta de la referencia se "infla" (Poisson, sección elíptica),
las patas cercanas se separan con polígonos, se desplazan lateralmente y se
espejan; todo se une con un remallado por vóxeles en UNA malla continua.
La textura es la propia referencia proyectada de perfil (UV planar por
posición), con los colores del borde extendidos hacia afuera.
Ejes de autoría: +X adelante (hocico), +Z arriba, origen en el suelo.
El exportador glTF convierte a +Y arriba. Clips: Idle, Walk, Graze (24 fps).
"""
import bpy
import bmesh
import json
import math
import os
import sys
import time

import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cuadrupedos_imagen as im  # noqa: E402
import cuadrupedos_config as config  # noqa: E402

FPS = 24
LEG_BONES = ('upper', 'lower', 'cannon', 'foot')


def log(*a):
    print('[v5]', *a, flush=True)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opt = {'animal': 'cabra', 'refs': os.environ.get('SIERRA_V5_REFS'), 'work': os.environ.get('SIERRA_V5_WORK'),
           'out': os.environ.get('SIERRA_V5_OUT'), 'stage': 'all'}
    for i in range(0, len(argv) - 1, 2):
        opt[argv[i].lstrip('-')] = argv[i + 1]
    for k in ('refs', 'work', 'out'):
        if not opt[k]:
            raise SystemExit('Falta --%s (o la variable SIERRA_V5_%s)' % (k, k.upper()))
    return opt


# ───────────────────────── imagen → campos de grosor ─────────────────────────

def poisson(cells, iters=700, omega=1.93):
    """Resuelve lap(h) = -1 con h = 0 fuera de `cells` (SOR rojo-negro)."""
    h = np.zeros(cells.shape, np.float32)
    yy, xx = np.indices(cells.shape)
    colors = [((yy + xx) % 2 == k) & cells for k in (0, 1)]
    nb = np.zeros_like(h)
    for _ in range(iters):
        for sel in colors:
            nb[1:-1, 1:-1] = 0.25 * (h[:-2, 1:-1] + h[2:, 1:-1] + h[1:-1, :-2] + h[1:-1, 2:] + 1.0)
            h[sel] += omega * (nb[sel] - h[sel])
    return h


def to_cells(mask, g):
    H, W = mask.shape
    c = mask[:H // g * g, :W // g * g].reshape(H // g, g, W // g, g).mean((1, 3)) > 0.5
    c[0] = c[-1] = False; c[:, 0] = c[:, -1] = False
    return c


def inflate(mask, g):
    """Semigrosor en píxeles sobre la rejilla de celdas (sección circular = 1)."""
    cells = to_cells(mask, g)
    return np.sqrt(2.0 * poisson(cells)) * g * cells


def prepare(opt, cfg):
    name = opt['animal']
    rgb = im.load_rgb(os.path.join(opt['refs'], cfg['ref']))
    mask = im.animal_mask(rgb, cfg.get('threshold', .055), shadow=cfg.get('shadow'))
    for poly in cfg.get('mask_remove', []):
        mask &= ~im.polygon_mask(mask.shape, poly)
    H, W = mask.shape
    s = cfg.get('m_per_px') or cfg['shoulder_m'] / (cfg['ground_py'] - cfg['shoulder_py'])
    ctx = dict(cfg=cfg, opt=opt, name=name, rgb=rgb, mask=mask, s=s, ox=cfg['origin_px'], gy=cfg.get('ground_py', 0),
               g=cfg['grid'])
    # textura: recorte + colores de borde extendidos + resto con color medio
    ys, xs = np.nonzero(mask)
    pad = 22
    cx0, cx1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, W)
    cy0, cy1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, H)
    valid = im.erode(mask, 3)
    sub = rgb[cy0:cy1, cx0:cx1]; subv = valid[cy0:cy1, cx0:cx1]
    filled = im.pad_colors(sub, subv, 18)
    near = im.dilate(subv, 18)
    filled[~near] = sub[subv].mean(0)
    tw, th = cfg['tex']
    tex = im.resize_bilinear(filled, tw, th)
    ctx['tex_path'] = os.path.join(opt['work'], name + '_textura.jpg')
    im.save_image(tex, ctx['tex_path'], 'JPEG', 90)
    ctx['crop'] = (cx0, cy0, cx1 - cx0, cy1 - cy0)
    log('mascara', name, 'bbox', xs.min(), xs.max(), ys.min(), ys.max(), 'm/px', round(s, 6), 'textura', tw, th)
    return ctx


def lateral_center(part):
    """Devuelve f(px, py) → desplazamiento lateral (m) del plano medio de la parte."""
    if 'y_at' in part:
        (ax, ay, ya), (bx, by, yb) = part['y_at']
        den = (bx - ax) ** 2 + (by - ay) ** 2

        def f(px, py):
            t = np.clip(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / den, 0, 1)
            return ya + (yb - ya) * t
        return f
    if 'y_plane' in part:  # plano por tres puntos (px, py, y): orejas en abanico, giradas hacia afuera
        (x1, y1, z1), (x2, y2, z2), (x3, y3, z3) = part['y_plane']
        det = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)
        gx = ((z2 - z1) * (y3 - y1) - (z3 - z1) * (y2 - y1)) / det
        gy = ((x2 - x1) * (z3 - z1) - (x3 - x1) * (z2 - z1)) / det
        return lambda px, py: z1 + gx * (np.asarray(px, np.float32) - x1) + gy * (np.asarray(py, np.float32) - y1)
    if 'y_top' in part:  # la parte alta de la pata se hunde dentro del tronco (sin reborde en la grupa)
        pa, pb, yt = part['y_top']
        return lambda px, py: yt + (part['y0'] - yt) * smoothstep(pa, pb, np.asarray(py, np.float32))
    return lambda px, py: np.full(np.shape(px), part.get('y0', 0.0), np.float32)


def build_fields(ctx):
    cfg, mask, g, s = ctx['cfg'], ctx['mask'], ctx['g'], ctx['s']
    H, W = mask.shape
    bx = [p[0] for p in cfg['belly']]; by = [p[1] for p in cfg['belly']]
    line = np.interp(np.arange(W), bx, by)
    trunk = mask & (np.arange(H)[:, None] < line[None, :])
    for poly in cfg.get('trunk_remove', []):
        trunk &= ~im.polygon_mask(mask.shape, poly)
    seed = np.zeros_like(trunk); sx, sy = cfg['trunk_seed']; seed[sy - 3:sy + 3, sx - 3:sx + 3] = True
    trunk = im.flood(seed, trunk)
    min_half = cfg.get('min_half', .0035)
    Y = inflate(trunk, g)
    cx = (np.arange(Y.shape[1]) + .5) * g
    prof = np.interp(cx, [p[0] for p in cfg['trunk_scale']], [p[1] for p in cfg['trunk_scale']])
    Ym = Y * s * prof[None, :]
    if cfg.get('trunk_cap'):  # tope suave: flancos más planos y grupa/pecho anchos hasta el final
        cap = np.interp(cx, [p[0] for p in cfg['trunk_cap']], [p[1] for p in cfg['trunk_cap']])[None, :]
        Ym = cap * np.tanh(Ym / cap)
    Ym = np.where(Y > 0, np.sqrt(Ym ** 2 + min_half ** 2), 0)
    ctx['trunk_mask'] = trunk
    ctx['fields'] = [dict(name='tronco', half=Ym, center=lambda px, py: np.zeros(np.shape(px), np.float32), mirror=False)]
    ctx['parts'] = {}
    for part in cfg['parts']:
        pm = mask & im.polygon_mask(mask.shape, part['poly'])
        Yp = inflate(pm, g)
        Ypm = Yp * s * part['scale']
        if 'cap' in part:
            Ypm = part['cap'] * np.tanh(Ypm / part['cap'])
        Ypm = np.where(Yp > 0, np.sqrt(Ypm ** 2 + min_half ** 2), 0)
        f = dict(name=part['name'], half=Ypm, center=lateral_center(part), mirror=True, mask=pm, cfg=part)
        ctx['fields'].append(f); ctx['parts'][part['name']] = f
    if ctx['opt'].get('debug'):
        dbg = np.zeros((H, W, 3), np.float32)
        dbg[..., 0] = trunk
        for i, f in enumerate(ctx['fields'][1:]):
            dbg[..., 1 + i % 2] = np.maximum(dbg[..., 1 + i % 2], f['mask'] * (0.5 + 0.5 * (i < 2)))
        im.save_image(dbg * 0.6 + ctx['rgb'] * 0.4, os.path.join(ctx['opt']['work'], 'dbg', ctx['name'] + '_partes.png'))


# ───────────────────────── malla ─────────────────────────

def world_xz(ctx, px, py):
    return (px - ctx['ox']) * ctx['s'], (ctx['gy'] - py) * ctx['s']


def to_px(ctx, x, z):
    return x / ctx['s'] + ctx['ox'], ctx['gy'] - z / ctx['s']


def field_arrays(ctx, f, sign):
    g = ctx['g']
    half = f['half']
    cells = half > 0
    nodes = im.dilate(cells, 2)  # incluye las diagonales: borde cerrado
    idx = -np.ones(half.shape, np.int64)
    ii, jj = np.nonzero(nodes)
    n = len(ii)
    idx[ii, jj] = np.arange(n)
    px = (jj + .5) * g; py = (ii + .5) * g
    X, Z = world_xz(ctx, px, py)
    hv = half[ii, jj]
    yc = f['center'](px, py)
    front = np.stack([X, sign * (yc + hv), Z], 1)
    has_back = hv > 0
    back_idx = np.arange(n)
    back_idx[has_back] = n + np.arange(int(has_back.sum()))
    back = np.stack([X, sign * (yc - hv), Z], 1)[has_back]
    a, b, c, d = idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]
    anyc = cells[:-1, :-1] | cells[:-1, 1:] | cells[1:, 1:] | cells[1:, :-1]
    ok = (a >= 0) & (b >= 0) & (c >= 0) & (d >= 0) & anyc
    q = np.stack([a[ok], b[ok], c[ok], d[ok]], 1)
    quads = np.concatenate([q, back_idx[q][:, ::-1]])
    return np.concatenate([front, back]), quads


def new_object(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces.tolist())
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def activate(ob):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def apply_modifier(ob, kind, **props):
    activate(ob)
    m = ob.modifiers.new(kind.lower(), kind)
    for k, v in props.items():
        setattr(m, k, v)
    bpy.ops.object.modifier_apply(modifier=m.name)


def keep_largest_island(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    seen = set(); islands = []
    for v in bm.verts:
        if v in seen:
            continue
        stack = [v]; isl = []; seen.add(v)
        while stack:
            u = stack.pop(); isl.append(u)
            for e in u.link_edges:
                w = e.other_vert(u)
                if w not in seen:
                    seen.add(w); stack.append(w)
        islands.append(isl)
    islands.sort(key=len, reverse=True)
    if len(islands) > 1:
        log('islas descartadas', [len(i) for i in islands[1:]])
        bmesh.ops.delete(bm, geom=[v for isl in islands[1:] for v in isl], context='VERTS')
    bm.to_mesh(ob.data); bm.free()


def tri_count(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def build_mesh(ctx):
    cfg = ctx['cfg']
    allv, allf, off = [], [], 0
    for f in ctx['fields']:
        for sign in ((1, -1) if f['mirror'] else (1,)):
            v, q = field_arrays(ctx, f, sign)
            allv.append(v); allf.append(q + off); off += len(v)
    ob = new_object(ctx['name'], np.concatenate(allv), np.concatenate(allf))
    apply_modifier(ob, 'REMESH', mode='VOXEL', voxel_size=cfg['voxel'], adaptivity=0.0)
    keep_largest_island(ob)
    apply_modifier(ob, 'SMOOTH', factor=0.5, iterations=cfg.get('smooth', 4))
    t0 = tri_count(ob.data)
    apply_modifier(ob, 'DECIMATE', decimate_type='COLLAPSE', ratio=min(1.0, cfg['tris'] / t0),
                   use_collapse_triangulate=True, use_symmetry=True, symmetry_axis='Y')
    apply_modifier(ob, 'SMOOTH', factor=0.35, iterations=1)
    for p in ob.data.polygons:
        p.use_smooth = True
    zmin = min(v.co.z for v in ob.data.vertices)
    log('malla', 'tris antes', t0, 'despues', tri_count(ob.data), 'verts', len(ob.data.vertices), 'zmin', round(zmin, 4))
    for v in ob.data.vertices:  # apoya las pezuñas en z = 0 exacto
        v.co.z -= zmin
    ctx['zshift'] = -zmin
    ctx['obj'] = ob
    return ob


def unroll_shift(ctx, me, co, px, py):
    """Corrimiento (px) del punto de muestreo hacia adentro de la silueta.

    La proyección plana estira la textura donde la superficie se pone de canto
    (lomo, pecho, vientre). Aquí la profundidad de muestreo pasa a ser
    proporcional al ángulo alrededor de la sección (como desenrollar un
    cilindro): d_tex = d + |y|·G(φ), con φ el ángulo de la normal respecto del
    plano de la imagen. En el borde y en el flanco el corrimiento es cero."""
    cfg = ctx['cfg']
    n = len(co)
    nr = np.empty(n * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    ay = np.abs(co[:, 1])
    yrel = ay.copy()
    for f in ctx['fields'][1:]:
        hv = cell_sample(ctx, f['half'], px, py); yc = f['center'](px, py)
        member = (hv > 1e-4) & (np.abs(ay - yc) < hv + .004)
        if f['cfg'].get('leg'):
            member &= im.sample_bilinear((f['mask'] & ~ctx['trunk_mask']).astype(np.float32), px, py) > .5
        yrel = np.where(member, np.abs(ay - yc), yrel)
    phi = np.arcsin(np.clip(np.abs(nr[:, 1]), 0, 1))
    G = np.where(phi < 1e-3, 2 / np.pi, (2 * phi / np.pi - 1 + np.cos(phi)) / np.maximum(np.sin(phi), 1e-3))
    prof = cfg.get('unroll', [(0, 1.0), (4000, 1.0)])
    strength = np.interp(px, [p[0] for p in prof], [p[1] for p in prof])
    mag = yrel * G * strength / ctx['s'] + cfg.get('rim_bias', 9.0) * (1 - np.sin(phi)) ** 2
    inl = np.hypot(nr[:, 0], nr[:, 2]) + 1e-6
    sx = -nr[:, 0] / inl * mag; sy = nr[:, 2] / inl * mag   # +py es hacia abajo
    ed = np.empty(len(me.edges) * 2, np.int32); me.edges.foreach_get('vertices', ed); ed = ed.reshape(-1, 2)
    deg = np.maximum(np.bincount(ed.ravel(), minlength=n), 1).astype(np.float32)
    for _ in range(2):
        for arr in (sx, sy):
            acc = np.zeros(n, np.float32)
            np.add.at(acc, ed[:, 0], arr[ed[:, 1]]); np.add.at(acc, ed[:, 1], arr[ed[:, 0]])
            arr[:] = .5 * arr + .5 * acc / deg
    safe = im.erode(ctx['mask'], 3).astype(np.float32)
    for _ in range(5):  # nunca muestrear fuera del animal
        bad = im.sample_bilinear(safe, px + sx, py + sy) < .99
        sx[bad] *= .5; sy[bad] *= .5
    bad = im.sample_bilinear(safe, px + sx, py + sy) < .99
    sx[bad] = 0; sy[bad] = 0
    return sx, sy


def assign_uv_material(ctx, ob):
    cx0, cy0, cw, ch = ctx['crop']
    me = ob.data
    uv = me.uv_layers.new(name='UVMap')
    co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    px, py = to_px(ctx, co[:, 0], co[:, 2] - ctx.get('zshift', 0.0))
    sx, sy = unroll_shift(ctx, me, co, px, py)
    px = px + sx; py = py + sy
    u = np.clip((px - cx0) / cw, 0.002, 0.998); v = np.clip(1.0 - (py - cy0) / ch, 0.002, 0.998)
    li = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', li)
    uv.data.foreach_set('uv', np.stack([u[li], v[li]], 1).ravel())
    mat = bpy.data.materials.new('SIERRA_V5_' + ctx['name'])
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Metallic'].default_value = 0.0
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(ctx['tex_path'])
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat.use_backface_culling = True  # malla cerrada: una sola cara en glTF
    me.materials.append(mat)
    ctx['material'] = mat


# ───────────────────────── esqueleto y pesos ─────────────────────────

def P(ctx, p, y=0.0):
    x, z = world_xz(ctx, p[0], p[1])
    return Vector((x, y, z + ctx.get('zshift', 0.0)))


def leg_y0(ctx, which):
    return next(p['y0'] for p in ctx['cfg']['parts'] if p.get('leg') == which)


def skeleton_spec(ctx):
    cfg = ctx['cfg']
    spec = [('root', Vector((0, 0, 0)), Vector((.12, 0, 0)), None)]
    prev = 'root'
    for name, a, b in cfg['axial']:
        spec.append((name, P(ctx, a), P(ctx, b), prev)); prev = name
    names = [a[0] for a in cfg['axial']]
    ctx['pelvis'], ctx['headbone'] = names[0], names[-1]
    ctx['chest'] = 'chest'
    prev = ctx['pelvis']
    tail = cfg['tail']
    for i in range(len(tail) - 1):
        spec.append(('tail%d' % (i + 1), P(ctx, tail[i]), P(ctx, tail[i + 1]), prev)); prev = 'tail%d' % (i + 1)
    if cfg.get('ear'):
        e = cfg['ear']
        for side, sg in (('L', 1), ('R', -1)):
            yb = e['y0'] * sg; yt = e.get('y1', e['y0']) * sg
            spec.append(('ear.' + side, P(ctx, e['base'], yb), P(ctx, e['tip'], yt), ctx['headbone']))
    mid = cfg['axial'][1]
    bh = P(ctx, mid[1])
    spec.append(('breath', bh, bh + Vector((.15, 0, 0)), mid[0]))  # horizontal: escala sin cizalla
    ctx['legs'] = {}
    for which, pts, parent in (('F', cfg['front'], ctx['chest']), ('H', cfg['hind'], ctx['pelvis'])):
        y0 = leg_y0(ctx, which)
        for side, sg in (('L', 1), ('R', -1)):
            tag = which + side
            J = [P(ctx, p, y0 * sg) for p in pts]
            J[4].z = max(J[4].z, 0.0)
            ctx['legs'][tag] = J
            prev = parent
            for k, bn in enumerate(LEG_BONES):
                spec.append((tag + '.' + bn, J[k], J[k + 1], prev)); prev = tag + '.' + bn
    return spec


def build_armature(ctx):
    spec = skeleton_spec(ctx)
    data = bpy.data.armatures.new('SIERRA_V5_' + ctx['name'] + '_esqueleto')
    rig = bpy.data.objects.new(ctx['name'].capitalize() + '_rig', data)
    bpy.context.scene.collection.objects.link(rig)
    activate(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, head, tail, parent in spec:
        b = data.edit_bones.new(name)
        b.head = head; b.tail = tail
        b.align_roll(Vector((0, 1, 0)))
        b.use_deform = name != 'root'
        if parent:
            b.parent = data.edit_bones[parent]
        b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    ctx['rig'] = rig
    ctx['bone_names'] = [s[0] for s in spec]
    log('huesos', len(spec))
    return rig


def seg_dist(px, py, a, b):
    vx, vy = b[0] - a[0], b[1] - a[1]
    t = np.clip(((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy)), t


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def soft_mask(mask, r):
    return im.box_blur(im.box_blur(im.dilate(mask, r).astype(np.float32), r), r)


def cell_sample(ctx, field, px, py):
    return im.sample_bilinear(field, px / ctx['g'], py / ctx['g'])


def compute_weights(ctx, ob):
    cfg = ctx['cfg']
    me = ob.data
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    px, py = to_px(ctx, co[:, 0], co[:, 2] - ctx['zshift'])
    y = co[:, 1]; ay = np.abs(y)
    names = ctx['bone_names']; col = {b: i for i, b in enumerate(names)}
    W = np.zeros((n, len(names)), np.float32)
    # 1) eje (tronco, cuello, cabeza, cola): distancia 2D en el plano sagital
    axial = [(nm, a, b, 1.0) for nm, a, b in cfg['axial']]
    tail = cfg['tail']
    axial += [('tail%d' % (i + 1), tail[i], tail[i + 1], cfg.get('tail_k', 2.5)) for i in range(len(tail) - 1)]
    for nm, a, b, k in axial:
        d, _ = seg_dist(px, py, a, b)
        W[:, col[nm]] = 1.0 / (k * d + 2.0) ** 4
    W /= W.sum(1, keepdims=True)
    # 2) partes rígidas (cuernos) y orejas
    hard = np.zeros(n, bool); hard_bone = {}
    for r in cfg.get('rigid', []):
        f = ctx['parts'][r['part']]
        hv = cell_sample(ctx, f['half'], px, py); yc = f['center'](px, py)
        sel = (hv > 1e-4) & (ay > yc - hv - .004)
        W[sel] = 0; W[sel, col[r['bone']]] = 1
        hard |= sel; hard_bone[r['bone']] = hard_bone.get(r['bone'], np.zeros(n, bool)) | sel
    if cfg.get('ear'):
        e = cfg['ear']; f = ctx['parts'][e['part']]
        hv = cell_sample(ctx, f['half'], px, py); yc = f['center'](px, py)
        sel = (hv > 1e-4) & (ay > yc - hv - .003)
        _, t = seg_dist(px, py, e['base'], e['tip'])
        we = smoothstep(0.0, 0.55, t)
        W[sel] = 0
        W[sel, col[ctx['headbone']]] = 1 - we[sel]
        for side, m in (('L', y >= 0), ('R', y < 0)):
            k = sel & m
            W[k, col['ear.' + side]] = we[k]
    # 3) respiración: flancos y vientre entre hombro y cadera
    mid = cfg['axial'][1]
    xa, xb = cfg['axial'][0][1][0], cfg['axial'][-1][1][0]
    span = cfg.get('breath_span', (xa + 0.12 * (xb - xa), xb - 0.30 * (xb - xa)))
    bump = smoothstep(span[0] - 60, span[0] + 40, px) * (1 - smoothstep(span[1] - 40, span[1] + 60, px))
    kb = 0.55 * bump * smoothstep(mid[1][1] - 60, mid[1][1] + 40, py)
    W *= (1 - kb)[:, None]; W[:, col['breath']] += kb
    # 4) patas: pertenencia por máscaras suaves + posición lateral
    r = cfg.get('leg_blur', 7)
    for which, pts in (('F', cfg['front']), ('H', cfg['hind'])):
        f = next(x for x in ctx['fields'][1:] if x['cfg'].get('leg') == which)
        y0 = f['cfg']['y0']
        only = soft_mask(f['mask'] & ~ctx['trunk_mask'], r)
        poly = soft_mask(f['mask'], r)
        m = np.maximum(im.sample_bilinear(only, px, py), im.sample_bilinear(poly, px, py) * smoothstep(.45 * y0, .9 * y0, ay))
        m *= smoothstep(.2 * y0, .55 * y0, ay)
        chain = np.zeros((n, 4), np.float32)
        for k in range(4):
            d, _ = seg_dist(px, py, pts[k], pts[k + 1])
            chain[:, k] = 1.0 / (d + 2.0) ** 4
        chain /= chain.sum(1, keepdims=True)
        m = np.where(hard, 0, m)
        W *= (1 - m)[:, None]
        for side, sel in (('L', y >= 0), ('R', y < 0)):
            for k, bn in enumerate(LEG_BONES):
                W[:, col[which + side + '.' + bn]] += m * chain[:, k] * sel
    # 5) suavizado sobre la topología y límite de 4 influencias
    ne = len(me.edges)
    ed = np.empty(ne * 2, np.int32); me.edges.foreach_get('vertices', ed); ed = ed.reshape(-1, 2)
    deg = np.bincount(ed.ravel(), minlength=n).astype(np.float32)[:, None]
    for _ in range(cfg.get('weight_smooth', 3)):
        acc = np.zeros_like(W)
        np.add.at(acc, ed[:, 0], W[ed[:, 1]]); np.add.at(acc, ed[:, 1], W[ed[:, 0]])
        W = 0.5 * W + 0.5 * acc / np.maximum(deg, 1)
    for bone, sel in hard_bone.items():
        W[sel] = 0; W[sel, col[bone]] = 1
    W[:, col['root']] = 0
    order = np.argsort(-W, 1)[:, 4:]
    np.put_along_axis(W, order, 0, 1)
    W /= W.sum(1, keepdims=True)
    for b in names:
        vg = ob.vertex_groups.new(name=b)
        c = W[:, col[b]]
        for i in np.nonzero(c > 1e-4)[0]:
            vg.add([int(i)], float(c[i]), 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = ctx['rig']
    ob.parent = ctx['rig']
    ctx['weights'] = W


# ───────────────────────── poses ─────────────────────────

def R(pitch_up=0.0, yaw=0.0, roll=0.0):
    return Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(-pitch_up, 4, 'Y') @ Matrix.Rotation(roll, 4, 'X')


def about(p, rot):
    return Matrix.Translation(p) @ rot @ Matrix.Translation(-Vector(p))


def rot2(v, a):
    c, s = math.cos(a), math.sin(a)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)


def ang(v):
    return math.atan2(v[1], v[0])


def solve_leg(J, S, F, flex, pitch):
    """IK sagital. J: 5 articulaciones en reposo (Vector). S: raíz posada, F: menudillo deseado.
    flex: flexión de carpo/corvejón (rad, signo 2D), pitch: giro de la pezuña.
    Devuelve las 5 posiciones posadas (x, z) y los giros 2D de los 4 huesos."""
    r = [(p.x, p.z) for p in J]
    sub = lambda a, b: (a[0] - b[0], a[1] - b[1])
    c_rel = sub(r[2], r[1])
    f_rel0 = sub(r[3], r[2])
    a = math.hypot(*sub(r[1], r[0]))
    d = sub(F, S); dist = math.hypot(*d)

    def lower(fl):
        fr = rot2(f_rel0, fl)
        fv = (c_rel[0] + fr[0], c_rel[1] + fr[1])
        return fv, math.hypot(*fv)
    f_rel, b = lower(flex)
    if dist > .985 * (a + b):  # falta alcance: abre carpo/corvejón (extensión) lo justo
        straight = (ang(c_rel) - ang(f_rel0) - flex + math.pi) % math.tau - math.pi
        lo, hi = 0.0, 0.85
        for _ in range(18):
            mid = (lo + hi) / 2
            if .985 * (a + lower(flex + mid * straight)[1]) >= dist:
                hi = mid
            else:
                lo = mid
        flex = flex + hi * straight
        f_rel, b = lower(flex)
    L = min(max(dist, abs(a - b) + 1e-6), a + b - 1e-6)
    u = (d[0] / dist, d[1] / dist)
    along = (a * a - b * b + L * L) / (2 * L)
    h = math.sqrt(max(0.0, a * a - along * along))
    r0 = sub(r[3], r[0]); e0 = sub(r[1], r[0])
    bend = 1.0 if (r0[0] * e0[1] - r0[1] * e0[0]) >= 0 else -1.0
    E = (S[0] + u[0] * along - bend * u[1] * h, S[1] + u[1] * along + bend * u[0] * h)
    Fa = (S[0] + u[0] * L, S[1] + u[1] * L)
    rho = ang(sub(Fa, E)) - ang(f_rel)
    cr = rot2(c_rel, rho)
    C = (E[0] + cr[0], E[1] + cr[1])
    toe = rot2(sub(r[4], r[3]), pitch)
    T = (Fa[0] + toe[0], Fa[1] + toe[1])
    d_upper = ang(sub(E, S)) - ang(e0)
    return [S, E, C, Fa, T], [d_upper, rho, rho + flex, pitch], dist - L


def pose_matrices(ctx, p):
    """p: parámetros de pose. Devuelve {hueso: M} con M = transformación mundo reposo→pose."""
    cfg = ctx['cfg']
    rest = ctx['rest']
    M = {'root': Matrix.Identity(4)}
    names = [a[0] for a in cfg['axial']]
    base = Matrix.Translation(p.get('shift', Vector((0, 0, 0)))) @ about(rest[names[0]][0], R(*p.get('trunk', (0, 0, 0))))
    cur = base
    for i, nm in enumerate(names):
        if i:
            if nm + ':slide' in p:  # estira el cuello a lo largo del hueso padre
                prev = rest[names[i - 1]]
                cur = cur @ Matrix.Translation((prev[1] - prev[0]).normalized() * p[nm + ':slide'])
            cur = cur @ about(rest[nm][0], R(*p.get(nm, (0, 0, 0))))
        M[nm] = cur
    cur = M[ctx['pelvis']]
    i = 1
    while 'tail%d' % i in rest:
        nm = 'tail%d' % i
        cur = cur @ about(rest[nm][0], R(*p.get(nm, (0, 0, 0))))
        M[nm] = cur; i += 1
    for side in ('L', 'R'):
        nm = 'ear.' + side
        if nm in rest:
            M[nm] = M[ctx['headbone']] @ about(rest[nm][0], R(*p.get(nm, (0, 0, 0))))
    bs = p.get('breath', 1.0)
    M['breath'] = M[names[1]] @ about(rest['breath'][0], Matrix.Diagonal((1, bs, 1 + (bs - 1) * .6, 1)))
    resid = 0.0
    for tag, J in ctx['legs'].items():
        parent = M[ctx['chest'] if tag[0] == 'F' else ctx['pelvis']]
        S3 = parent @ J[0]
        dx, dz, pitch, flex = p.get('feet', {}).get(tag, (0, 0, 0, 0))
        F = (J[3].x + dx, J[3].z + dz)
        pos, rots, miss = solve_leg(J, (S3.x, S3.z), F, flex, pitch)
        resid = max(resid, miss)
        dy = S3.y - J[0].y
        for k, bn in enumerate(LEG_BONES):
            head = Vector((pos[k][0], J[k].y + dy, pos[k][1]))
            M[tag + '.' + bn] = Matrix.Translation(head) @ Matrix.Rotation(-rots[k], 4, 'Y') @ Matrix.Translation(-J[k])
    ctx['ik_miss'] = max(ctx.get('ik_miss', 0.0), resid)
    return M


def apply_pose(ctx, M):
    rig = ctx['rig']
    desired = {}
    for name in ctx['bone_names']:
        bone = rig.data.bones[name]
        want = M[name] @ bone.matrix_local
        desired[name] = want
        if bone.parent:
            basis = bone.matrix_local.inverted() @ bone.parent.matrix_local @ desired[bone.parent.name].inverted() @ want
        else:
            basis = bone.matrix_local.inverted() @ want
        rig.pose.bones[name].matrix_basis = basis


def reset_pose(rig):
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)


def swing(v, step, duty):
    """Trayectoria de vuelo con velocidad continua respecto del apoyo (Hermite)."""
    tan = -step * (1 - duty) / duty
    a = 2 * v ** 3 - 3 * v * v + 1; b = v ** 3 - 2 * v * v + v; c = -2 * v ** 3 + 3 * v * v; d = v ** 3 - v * v
    return a * (-step / 2) + b * tan + c * (step / 2) + d * tan


def bump(t, center, width):
    d = ((t - center + .5) % 1.0) - .5
    return math.exp(-(d / width) ** 2)


def walk_pose(ctx, t):
    a = ctx['cfg']['anim']
    step, duty, lift = a['step'], a['duty'], a['lift']
    tau = math.tau
    feet = {}
    for tag, ph in (('HL', 0.0), ('FL', 0.25), ('HR', 0.5), ('FR', 0.75)):
        u = (t - ph) % 1.0
        bias = a.get('front_bias', 0.0) if tag[0] == 'F' else a.get('hind_bias', 0.0)
        if u < duty:
            feet[tag] = (bias + step * (.5 - u / duty), 0.0, 0.0, 0.0)
        else:
            v = (u - duty) / (1 - duty)
            sw = math.sin(math.pi * v) ** 2
            early = math.sin(math.pi * min(1.0, v * 1.25)) ** 2
            flex = -a['carpus'] * early if tag[0] == 'F' else a['hock'] * early
            feet[tag] = (bias + swing(v, step, duty), lift * sw, -a.get('toe', .55) * early * (1 - v), flex)
    zh = -a['sink'] + a.get('bob', .005) * math.cos(2 * tau * (t - duty / 2))
    zs = -a['sink'] + a.get('bob', .005) * math.cos(2 * tau * (t - .25 - duty / 2))
    length = (ctx['legs']['FL'][0] - ctx['legs']['HL'][0]).x
    yaw_p = -a.get('yaw', .03) * math.cos(tau * t)
    yaw_c = -a.get('yaw', .03) * math.cos(tau * (t - .25))
    names = [x[0] for x in ctx['cfg']['axial']]
    p = dict(shift=Vector((0, a.get('sway', .006) * math.cos(tau * (t - .45)), zh)),
             trunk=(math.atan2(zs - zh, length), yaw_p, a.get('roll', .012) * math.sin(tau * (t - .1))),
             feet=feet, breath=1.0)
    p[names[1]] = (0, (yaw_c - yaw_p) * .5, 0)
    p[names[2]] = (0, (yaw_c - yaw_p) * .5, 0)
    nod = a.get('nod', .035) * math.cos(2 * tau * (t - .25 - duty / 2))
    p[names[3]] = (-nod, -yaw_c * .6, 0)
    p[names[-1]] = (nod * .7, -yaw_c * .4, 0)
    i = 1
    while 'tail%d' % i in ctx['rest']:
        p['tail%d' % i] = (a.get('tail_lift', 0.0), a.get('tail_sway', .10) * math.sin(tau * (t - .12 * i)), 0)
        i += 1
    for side, ph in (('L', 0.0), ('R', .5)):
        p['ear.' + side] = (.05 * math.sin(2 * tau * t + ph), 0, 0)
    return p


def idle_pose(ctx, t):
    a = ctx['cfg']['anim']
    tau = math.tau
    names = [x[0] for x in ctx['cfg']['axial']]
    br = math.sin(tau * 2 * t)
    p = dict(shift=Vector((0, .004 * math.sin(tau * t), .0015 * br)), trunk=(.004 * br, 0, .006 * math.sin(tau * t)),
             breath=1.0 + a.get('breath', .035) * (.5 + .5 * br), feet={})
    look = a.get('look', .16)
    p[names[3]] = (.03 * math.sin(tau * t + 1.0), look * .6 * math.sin(tau * t), 0)
    if len(names) > 5:
        p[names[4]] = (.02 * math.sin(tau * t + .4), look * .4 * math.sin(tau * t + .3), 0)
    p[names[-1]] = (.04 * math.sin(tau * 2 * t + .7), look * .5 * math.sin(tau * t + .6), .03 * math.sin(tau * t))
    flick = a.get('ear_flick', .45)
    p['ear.L'] = (0, 0, flick * (bump(t, .30, .025) + bump(t, .36, .02)))
    p['ear.R'] = (0, 0, -flick * (bump(t, .33, .025) + bump(t, .80, .025)))
    wag = a.get('tail_wag', .35) * (bump(t, .62, .09)) * math.sin(tau * 8 * t)
    i = 1
    while 'tail%d' % i in ctx['rest']:
        p['tail%d' % i] = (.04 * math.sin(tau * t + i), wag + a.get('tail_idle', .05) * math.sin(tau * t - .5 * i), 0)
        i += 1
    return p


def graze_pose(ctx, t, neck=None):
    """Cabeza abajo ramoneando. `neck` (rad, negativo) baja el cuello; la cabeza se
    extiende en proporción para quedar en línea con el cuello, hocico al pasto."""
    a = ctx['cfg']['anim']
    tau = math.tau
    names = [x[0] for x in ctx['cfg']['axial']]
    neck = ctx.get('graze_neck', -1.0) if neck is None else neck
    nib = math.sin(tau * 6 * t)
    tug = bump(t, .55, .06)
    sweep = math.sin(tau * t)
    two = len(names) > 5
    k2 = a.get('graze_neck2', .66) if two else 0.0
    p = dict(shift=Vector((0.01, 0, -a.get('graze_drop', .012))), trunk=(-a.get('graze_trunk', .10), 0, 0), feet={},
             breath=1.0 + .03 * (.5 + .5 * math.sin(tau * 2 * t)))
    p[names[2]] = (-a.get('graze_chest', .08), 0, 0)
    p[names[3]] = (neck + .02 * nib + .07 * tug, .09 * sweep, 0)
    if two:
        p[names[4]] = (k2 * neck + .025 * nib + .06 * tug, .09 * sweep, 0)
    p[names[-1]] = (-a.get('graze_head', .55) * neck * (1 + k2) - .06 * nib + .10 * tug, .05 * sweep, .04 * sweep)
    for nm in names[4:]:
        p[nm + ':slide'] = a.get('graze_stretch', .03) * (1 - .25 * tug)
    p['ear.L'] = (0, 0, .4 * bump(t, .2, .03)); p['ear.R'] = (0, 0, -.4 * bump(t, .7, .03))
    i = 1
    while 'tail%d' % i in ctx['rest']:
        p['tail%d' % i] = (0, a.get('tail_wag', .35) * bump(t, .35, .08) * math.sin(tau * 8 * t), 0)
        i += 1
    return p


def calibrate_graze(ctx):
    """Busca el ángulo de cuello que deja el hocico a la altura pedida (o lo más bajo posible)."""
    a = ctx['cfg']['anim']
    head = ctx['headbone']
    tip = ctx['rest'][head][1]
    target = a.get('graze_height', .07)
    lo, hi = a.get('graze_min', -1.25), 0.0
    for _ in range(30):
        mid = (lo + hi) / 2
        z = (pose_matrices(ctx, graze_pose(ctx, 0.0, mid))[head] @ tip).z
        if z > target:
            hi = mid
        else:
            lo = mid
    ctx['graze_neck'] = (lo + hi) / 2
    z = (pose_matrices(ctx, graze_pose(ctx, 0.0))[head] @ tip).z
    log('graze: angulo de cuello', round(ctx['graze_neck'], 3), 'altura hocico', round(z, 3))


POSES = {'Walk': (walk_pose, 25), 'Idle': (idle_pose, 97), 'Graze': (graze_pose, 73)}


def bake_clip(ctx, name, frames, mats_fn):
    """Hornea un clip: mats_fn(t) → {hueso: M} para t en [0, 1); el último cuadro repite el primero."""
    rig = ctx['rig']
    reset_pose(rig)
    rig.animation_data_create()
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    prev = {}
    ctx['ik_miss'] = 0.0
    for f in range(frames):  # cuadro 0 = tiempo 0 en glTF; último cuadro = primero (bucle exacto)
        t = f / (frames - 1)
        apply_pose(ctx, mats_fn(t % 1.0))
        for pb in rig.pose.bones:
            q = pb.rotation_quaternion.copy()
            if pb.name in prev and prev[pb.name].dot(q) < 0:
                q.negate(); pb.rotation_quaternion = q
            prev[pb.name] = q
            pb.keyframe_insert('location', frame=f, group=pb.name)
            pb.keyframe_insert('rotation_quaternion', frame=f, group=pb.name)
            if pb.name == 'breath':
                pb.keyframe_insert('scale', frame=f, group=pb.name)
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for k in fc.keyframe_points:
                        k.interpolation = 'LINEAR'
    slot = rig.animation_data.action_slot
    track = rig.animation_data.nla_tracks.new(); track.name = name
    strip = track.strips.new(name, 0, action); strip.name = name
    if slot:
        strip.action_slot = slot
    track.mute = True
    rig.animation_data.action = None
    reset_pose(rig)
    log('clip', name, 'frames', frames, 'ik fuera de alcance (m)', round(ctx['ik_miss'], 5))


def build_animations(ctx):
    rig = ctx['rig']
    ctx['rest'] = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in rig.data.bones}
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_start = 0
    clips = ctx['cfg']['anim']['clips']
    if 'Graze' in clips:
        calibrate_graze(ctx)
    for name in clips:
        fn, frames = POSES[name]
        bake_clip(ctx, name, frames, lambda t, fn=fn: pose_matrices(ctx, fn(ctx, t)))


# ───────────────────────── exportación ─────────────────────────

def export_glb(path, objects, animations):
    for o in bpy.context.scene.objects:
        o.select_set(o in objects)
    bpy.context.view_layer.objects.active = objects[0]
    rig = next((o for o in objects if o.type == 'ARMATURE'), None)
    tracks = list(rig.animation_data.nla_tracks) if rig and rig.animation_data else []
    for tr in tracks:
        tr.mute = False
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
        export_animations=animations, export_animation_mode='NLA_TRACKS', export_nla_strips=True,
        export_force_sampling=True, export_skins=True, export_morph=False, export_materials='EXPORT',
        export_image_format='JPEG', export_image_quality=88, export_texcoords=True, export_normals=True,
        export_tangents=False, export_cameras=False, export_lights=False, export_extras=False,
        export_vertex_color='NONE', export_draco_mesh_compression_enable=False)
    for tr in tracks:
        tr.mute = True
    log('exportado', path, os.path.getsize(path), 'bytes')


def bake_static(ctx, name, pose, tris):
    """Malla sin esqueleto con la pose horneada en la geometría (rebaños por instancias)."""
    rig, ob = ctx['rig'], ctx['obj']
    apply_pose(ctx, pose_matrices(ctx, pose))
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
    reset_pose(rig)
    new = bpy.data.objects.new(name, me)
    me.name = name
    bpy.context.scene.collection.objects.link(new)
    new.vertex_groups.clear()
    t0 = tri_count(me)
    apply_modifier(new, 'DECIMATE', decimate_type='COLLAPSE', ratio=min(1.0, (tris - 4) / t0), use_collapse_triangulate=True)
    zmin = min(v.co.z for v in me.vertices)
    for v in me.vertices:
        v.co.z -= zmin
    for p in me.polygons:
        p.use_smooth = True
    log('estatica', name, 'tris', tri_count(me))
    return new


def main():
    opt = parse_args()
    cfg = config.ANIMALS[opt['animal']]
    os.makedirs(os.path.join(opt['work'], 'dbg'), exist_ok=True)
    t0 = time.time()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    ctx = prepare(opt, cfg)
    build_fields(ctx)
    if opt['stage'] == 'fields':
        return
    ob = build_mesh(ctx)
    assign_uv_material(ctx, ob)
    rig = build_armature(ctx)
    compute_weights(ctx, ob)
    build_animations(ctx)
    ob.name = ctx['name'].capitalize(); ob.data.name = ob.name
    out = os.path.join(opt['out'], cfg['out'])
    export_glb(out, [rig, ob], True)
    if cfg.get('static'):
        st = cfg['static']
        objs = [bake_static(ctx, nm, POSES[clip][0](ctx, tt), st['tris']) for nm, clip, tt in st['meshes']]
        export_glb(os.path.join(opt['out'], st['out']), objs, False)
    a = cfg['anim']
    side = dict(walkSpeedMetersPerSecond=round(a['step'] / a['duty'], 3), shoulderHeightMeters=cfg['shoulder_m'], fps=FPS)
    json.dump(side, open(os.path.join(opt['work'], ctx['name'] + '_info.json'), 'w'))
    log('listo', opt['animal'], round(time.time() - t0, 1), 's')


if __name__ == '__main__':
    main()
