"""SIERRA fauna v5 — lagarto colorado a partir de una vista SUPERIOR.

Misma técnica que cuadrupedos_build.py (silueta inflada + textura proyectada),
pero proyectando desde arriba: X adelante, Y = izquierda del animal, y la
altura Z sale del inflado alrededor de un plano medio que baja hacia las
manos, los pies y la punta de la cola. Marcha reptante en diagonal con
ondulación lateral de la columna.
  Blender -b --factory-startup --python cuadrupedos_lagarto.py -- \
      --refs <refs> --work <trabajo> --out <modelos>
"""
import bpy
import json
import math
import os
import sys
import time

import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cuadrupedos_build as B  # noqa: E402
import cuadrupedos_config as config  # noqa: E402

im = B.im
LEG_BONES = ('upper', 'lower', 'foot')


def cell_xy(ctx, shape):
    g = ctx['g']
    py = (np.arange(shape[0]) + .5) * g
    px = (np.arange(shape[1]) + .5) * g
    return np.meshgrid(px, py)


def chain_height(px, py, pts, zs):
    """Altura interpolada a lo largo de la cadena de la pata (segmento más cercano)."""
    best = np.full(np.shape(px), 1e9); out = np.zeros(np.shape(px), np.float32)
    for k in range(len(pts) - 1):
        d, t = B.seg_dist(px, py, pts[k], pts[k + 1])
        z = zs[k] + (zs[k + 1] - zs[k]) * t
        out = np.where(d < best, z, out); best = np.minimum(best, d)
    return out


def build_fields(ctx):
    cfg, mask, g, s = ctx['cfg'], ctx['mask'], ctx['g'], ctx['s']
    H = B.inflate(mask, g) * s
    cells = H > 0
    PX, PY = cell_xy(ctx, H.shape)
    b = cfg['body']
    up = b['cap_up'] * np.tanh(b['up'] * H / b['cap_up'])
    down = b['cap_down'] * np.tanh(b['down'] * H / b['cap_down'])
    zmid = np.interp(PX, [p[0] for p in cfg['zmid']], [p[1] for p in cfg['zmid']]).astype(np.float32)
    ctx['leg_masks'] = {}
    lim = cfg['limb']
    for tag, leg in cfg['legs'].items():
        pm = im.polygon_mask(mask.shape, leg['poly'])
        ctx['leg_masks'][tag] = pm & mask
        pc = B.to_cells(pm, g)
        round_ = lim['cap'] * np.tanh(lim['k'] * H / lim['cap'])
        up = np.where(pc, round_, up); down = np.where(pc, round_, down)
        zmid = np.where(pc, chain_height(PX, PY, leg['pts'], cfg['leg_z']), zmid)
    m = cfg.get('min_half', .0025)
    up = np.where(cells, np.sqrt(up ** 2 + m ** 2), 0); down = np.where(cells, np.sqrt(down ** 2 + m ** 2), 0)
    zmid = im.box_blur(im.box_blur(zmid, 3), 3)
    zmid = np.maximum(zmid, im.box_blur(down, 2) + .0005)   # la panza y los dedos nunca bajo el suelo
    ctx.update(up=up, down=down, zmid=zmid)


def build_mesh(ctx):
    cfg, g, s = ctx['cfg'], ctx['g'], ctx['s']
    up, down, zmid = ctx['up'], ctx['down'], ctx['zmid']
    cells = up > 0
    nodes = im.dilate(cells, 2)
    idx = -np.ones(up.shape, np.int64)
    ii, jj = np.nonzero(nodes)
    n = len(ii); idx[ii, jj] = np.arange(n)
    X = ((jj + .5) * g - ctx['ox']) * s; Y = (ctx['oy'] - (ii + .5) * g) * s
    top = np.stack([X, Y, zmid[ii, jj] + up[ii, jj]], 1)
    has = up[ii, jj] > 0
    bidx = np.arange(n); bidx[has] = n + np.arange(int(has.sum()))
    bot = np.stack([X, Y, zmid[ii, jj] - down[ii, jj]], 1)[has]
    a, b_, c, d = idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]
    anyc = cells[:-1, :-1] | cells[:-1, 1:] | cells[1:, 1:] | cells[1:, :-1]
    ok = (a >= 0) & (b_ >= 0) & (c >= 0) & (d >= 0) & anyc
    q = np.stack([a[ok], b_[ok], c[ok], d[ok]], 1)
    ob = B.new_object(ctx['name'], np.concatenate([top, bot]), np.concatenate([q, bidx[q][:, ::-1]]))
    B.apply_modifier(ob, 'REMESH', mode='VOXEL', voxel_size=cfg['voxel'], adaptivity=0.0)
    B.keep_largest_island(ob)
    B.apply_modifier(ob, 'SMOOTH', factor=0.5, iterations=3)
    t0 = B.tri_count(ob.data)
    B.apply_modifier(ob, 'DECIMATE', decimate_type='COLLAPSE', ratio=min(1.0, cfg['tris'] / t0), use_collapse_triangulate=True)
    for p in ob.data.polygons:
        p.use_smooth = True
    zmin = min(v.co.z for v in ob.data.vertices)
    for v in ob.data.vertices:
        v.co.z -= zmin
    ctx['zshift'] = -zmin
    B.log('malla', 'tris antes', t0, 'despues', B.tri_count(ob.data), 'verts', len(ob.data.vertices), 'zmin', round(zmin, 4))
    ctx['obj'] = ob
    return ob


def vert_px(ctx, co):
    return co[:, 0] / ctx['s'] + ctx['ox'], ctx['oy'] - co[:, 1] / ctx['s']


def assign_uv_material(ctx, ob):
    """UV planar desde arriba, con el mismo "desenrollado" de flancos que los cuadrúpedos."""
    cx0, cy0, cw, ch = ctx['crop']
    me = ob.data
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nr = np.empty(n * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    px, py = vert_px(ctx, co)
    zrel = np.abs(co[:, 2] - ctx['zshift'] - im.sample_bilinear(ctx['zmid'], px / ctx['g'], py / ctx['g']))
    phi = np.arcsin(np.clip(np.abs(nr[:, 2]), 0, 1))
    G = np.where(phi < 1e-3, 2 / np.pi, (2 * phi / np.pi - 1 + np.cos(phi)) / np.maximum(np.sin(phi), 1e-3))
    mag = zrel * G / ctx['s'] + 4.0 * (1 - np.sin(phi)) ** 2
    inl = np.hypot(nr[:, 0], nr[:, 1]) + 1e-6
    sx = -nr[:, 0] / inl * mag; sy = nr[:, 1] / inl * mag
    safe = im.erode(ctx['mask'], 2).astype(np.float32)
    for _ in range(5):
        bad = im.sample_bilinear(safe, px + sx, py + sy) < .99
        sx[bad] *= .5; sy[bad] *= .5
    bad = im.sample_bilinear(safe, px + sx, py + sy) < .99
    sx[bad] = 0; sy[bad] = 0
    u = np.clip((px + sx - cx0) / cw, .002, .998); v = np.clip(1 - (py + sy - cy0) / ch, .002, .998)
    li = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', li)
    uv = me.uv_layers.new(name='UVMap')
    uv.data.foreach_set('uv', np.stack([u[li], v[li]], 1).ravel())
    mat = bpy.data.materials.new('SIERRA_V5_' + ctx['name'])
    mat.use_nodes = True
    bsdf = next(nd for nd in mat.node_tree.nodes if nd.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Metallic'].default_value = 0.0
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(ctx['tex_path'])
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat.use_backface_culling = True
    me.materials.append(mat)


def P(ctx, p, z=None):
    x = (p[0] - ctx['ox']) * ctx['s']; y = (ctx['oy'] - p[1]) * ctx['s']
    if z is None:
        z = float(im.sample_bilinear(ctx['zmid'], np.array([p[0] / ctx['g']]), np.array([p[1] / ctx['g']]))[0])
    return Vector((x, y, z + ctx['zshift']))


def build_armature(ctx):
    cfg = ctx['cfg']
    spec = [('root', Vector((0, 0, 0)), Vector((.1, 0, 0)), None)]
    prev = 'root'
    for name, a, b in cfg['axial']:
        spec.append((name, P(ctx, a), P(ctx, b), prev)); prev = name
    prev = 'pelvis'
    t = cfg['tail']
    for i in range(len(t) - 1):
        spec.append(('tail%d' % (i + 1), P(ctx, t[i]), P(ctx, t[i + 1]), prev)); prev = 'tail%d' % (i + 1)
    bh = P(ctx, cfg['axial'][1][1])
    spec.append(('breath', bh, bh + Vector((.08, 0, 0)), 'spine'))
    ctx['legs'] = {}
    for tag, leg in cfg['legs'].items():
        J = [P(ctx, p, z) for p, z in zip(leg['pts'], cfg['leg_z'])]
        ctx['legs'][tag] = J
        prev = 'chest' if tag[0] == 'F' else 'pelvis'
        for k, bn in enumerate(LEG_BONES):
            spec.append((tag + '.' + bn, J[k], J[k + 1], prev)); prev = tag + '.' + bn
    data = bpy.data.armatures.new('SIERRA_V5_lagarto_esqueleto')
    rig = bpy.data.objects.new('Lagarto_rig', data)
    bpy.context.scene.collection.objects.link(rig)
    B.activate(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, head, tail, parent in spec:
        eb = data.edit_bones.new(name)
        eb.head = head; eb.tail = tail
        eb.align_roll(Vector((0, 0, 1)))
        eb.use_deform = name != 'root'
        if parent:
            eb.parent = data.edit_bones[parent]
        eb.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    ctx['rig'] = rig
    ctx['bone_names'] = [x[0] for x in spec]
    ctx['rest'] = {x[0]: (x[1].copy(), x[2].copy()) for x in spec}
    B.log('huesos', len(spec))


def compute_weights(ctx, ob):
    cfg = ctx['cfg']
    me = ob.data
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    px, py = vert_px(ctx, co)
    names = ctx['bone_names']; col = {b: i for i, b in enumerate(names)}
    W = np.zeros((n, len(names)), np.float32)
    axial = [(nm, a, b, 1.0) for nm, a, b in cfg['axial']]
    t = cfg['tail']
    axial += [('tail%d' % (i + 1), t[i], t[i + 1], cfg.get('tail_k', 1.3)) for i in range(len(t) - 1)]
    for nm, a, b, k in axial:
        d, _ = B.seg_dist(px, py, a, b)
        W[:, col[nm]] = 1.0 / (k * d + 2.0) ** 4
    W /= W.sum(1, keepdims=True)
    xa, xb = cfg['axial'][0][1][0], cfg['axial'][2][2][0]
    kb = .5 * B.smoothstep(xa, xa + 60, px) * (1 - B.smoothstep(xb - 60, xb, px))
    W *= (1 - kb)[:, None]; W[:, col['breath']] += kb
    for tag, leg in cfg['legs'].items():
        m = im.sample_bilinear(B.soft_mask(ctx['leg_masks'][tag], 4), px, py)
        chain = np.zeros((n, 3), np.float32)
        for k in range(3):
            d, _ = B.seg_dist(px, py, leg['pts'][k], leg['pts'][k + 1])
            chain[:, k] = 1.0 / (d + 2.0) ** 4
        chain /= chain.sum(1, keepdims=True)
        W *= (1 - m)[:, None]
        for k, bn in enumerate(LEG_BONES):
            W[:, col[tag + '.' + bn]] += m * chain[:, k]
    ed = np.empty(len(me.edges) * 2, np.int32); me.edges.foreach_get('vertices', ed); ed = ed.reshape(-1, 2)
    deg = np.maximum(np.bincount(ed.ravel(), minlength=n), 1).astype(np.float32)[:, None]
    for _ in range(3):
        acc = np.zeros_like(W)
        np.add.at(acc, ed[:, 0], W[ed[:, 1]]); np.add.at(acc, ed[:, 1], W[ed[:, 0]])
        W = .5 * W + .5 * acc / deg
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


# ───────────────────────── poses ─────────────────────────

def segment_matrix(h0, t0, h1, t1):
    """Transformación rígida que lleva el segmento en reposo (h0→t0) al posado (h1→t1)."""
    q = (t0 - h0).normalized().rotation_difference((t1 - h1).normalized())
    return Matrix.Translation(h1) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h0)


def ik3(S, W, a, b, pole):
    d = W - S
    L = min(max(d.length, abs(a - b) + 1e-6), a + b - 1e-6)
    u = d.normalized()
    along = (a * a - b * b + L * L) / (2 * L)
    h = math.sqrt(max(0.0, a * a - along * along))
    pp = pole - u * pole.dot(u)
    pp.normalize()
    return S + u * along + pp * h, S + u * L


def pose(ctx, t, walk):
    cfg = ctx['cfg']; a = cfg['anim']; rest = ctx['rest']; tau = math.tau
    names = [x[0] for x in cfg['axial']]
    M = {'root': Matrix.Identity(4)}
    if walk:
        yp = a['yaw'] * math.cos(tau * t)         # cadera derecha adelante en t = 0
        yc = -yp                                  # hombro izquierdo adelante en t = 0
        rots = {'spine': (0, (yc - yp) * .5, 0), 'chest': (0, (yc - yp) * .5, 0), 'neck': (0, -yc * .55, 0),
                'head': (0, -yc * .35, 0)}
        base = B.about(rest['pelvis'][0], B.R(0, yp, .02 * math.sin(tau * t)))
        breath = 1.0
    else:
        br = math.sin(tau * 2 * t)
        look = .10 * math.sin(tau * t)
        rots = {'spine': (0, .01 * math.sin(tau * t), 0), 'chest': (.006 * br, 0, 0),
                'neck': (.05 + .03 * math.sin(tau * t + .8), look * .6, 0), 'head': (.03 * math.sin(tau * 2 * t + .3), look * .5, 0)}
        base = Matrix.Identity(4)
        breath = 1.0 + .05 * (.5 + .5 * br)
    cur = base
    for i, nm in enumerate(names):
        if i:
            cur = cur @ B.about(rest[nm][0], B.R(*rots.get(nm, (0, 0, 0))))
        M[nm] = cur
    if walk:  # centra el cuerpo: cadera y hombros oscilan alrededor del eje
        off = -.5 * ((M['pelvis'] @ rest['pelvis'][0]).y + (M['chest'] @ rest['chest'][1]).y)
        T = Matrix.Translation((0, off, 0))
        for nm in names:
            M[nm] = T @ M[nm]
    cur = M['pelvis']
    i = 1
    while 'tail%d' % i in rest:
        nm = 'tail%d' % i
        if walk:
            yaw = -a['yaw'] * (.55 if i == 1 else .42) * math.cos(tau * (t - .09 * i))
        else:
            yaw = .05 * math.sin(tau * t - .5 * i) + .04 * i * B.bump(t, .6, .1) * math.sin(tau * 3 * t)
        cur = cur @ B.about(rest[nm][0], B.R(0, yaw, 0))
        M[nm] = cur; i += 1
    M['breath'] = M['spine'] @ B.about(rest['breath'][0], Matrix.Diagonal((1, breath, 1 + (breath - 1) * .5, 1)))
    step, duty, lift = a['step'], a['duty'], a['lift']
    miss = 0.0
    for tag, ph in (('FL', 0.0), ('HR', 0.04), ('FR', 0.5), ('HL', 0.54)):
        J = ctx['legs'][tag]
        S = M['chest' if tag[0] == 'F' else 'pelvis'] @ J[0]
        dx = dz = 0.0
        if walk:
            u = (t - ph) % 1.0
            if u < duty:
                dx = step * (.5 - u / duty)
            else:
                v = (u - duty) / (1 - duty)
                dx = B.swing(v, step, duty); dz = lift * math.sin(math.pi * v) ** 2
        Wt = J[2] + Vector((dx, 0, dz))
        E, Wa = ik3(S, Wt, (J[1] - J[0]).length, (J[2] - J[1]).length, J[1] - J[0])
        miss = max(miss, (Wt - Wa).length)
        M[tag + '.upper'] = segment_matrix(J[0], J[1], S, E)
        M[tag + '.lower'] = segment_matrix(J[1], J[2], E, Wa)
        M[tag + '.foot'] = Matrix.Translation(Wa - J[2])
    ctx['ik_miss'] = max(ctx.get('ik_miss', 0.0), miss)
    return M


def main():
    opt = B.parse_args()
    opt['animal'] = 'lagarto'
    cfg = config.ANIMALS['lagarto']
    os.makedirs(os.path.join(opt['work'], 'dbg'), exist_ok=True)
    t0 = time.time()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    ctx = B.prepare(opt, cfg)
    ctx['oy'] = cfg['center_py']
    build_fields(ctx)
    ob = build_mesh(ctx)
    assign_uv_material(ctx, ob)
    build_armature(ctx)
    compute_weights(ctx, ob)
    bpy.context.scene.render.fps = B.FPS
    bpy.context.scene.frame_start = 0
    B.bake_clip(ctx, 'Idle', 97, lambda t: pose(ctx, t, False))
    B.bake_clip(ctx, 'Walk', 25, lambda t: pose(ctx, t, True))
    ob.name = 'Lagarto'; ob.data.name = 'Lagarto'
    B.export_glb(os.path.join(opt['out'], cfg['out']), [ctx['rig'], ob], True)
    a = cfg['anim']
    json.dump(dict(walkSpeedMetersPerSecond=round(a['step'] / a['duty'], 3), fps=B.FPS),
              open(os.path.join(opt['work'], 'lagarto_info.json'), 'w'))
    B.log('listo lagarto', round(time.time() - t0, 1), 's')


if __name__ == '__main__':
    main()
