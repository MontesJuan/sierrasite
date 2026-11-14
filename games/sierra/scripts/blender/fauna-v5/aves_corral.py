"""Gallina (farm hen) and pavo (bronze turkey). Blender 5.x, headless.

    Blender -b --factory-startup --python aves_corral.py -- --bird gallina|pavo \
        --refs R --out O --work W

Reads R/<bird>.jpg (exact side profile facing right) and writes O/v5-<bird>.glb.
The side silhouette without the legs is inflated into a closed body (rounder
where the profile is deep, thin on comb, wattles and tail), the photo is
projected on both flanks, and the legs are rebuilt as scaly tubes that reuse
the photographed near leg. Clips: Idle, Walk, Peck.
Authored X forward, Z up, origin on the ground between the feet; exported Y up.
All landmark numbers below are pixel positions (column, row) in the reference.
"""
import math
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import numpy as np  # noqa: E402
import aves_lib as L  # noqa: E402

ss = L.smoothstep

BIRDS = {
    'gallina': dict(
        height=.40, ground=800, col0=605, seed=(450, 600),
        leg_cut=(688, 500, 790),                 # legs = below this row, between these columns
        width=.86, wmax=.098,                    # half-width = width x local half-depth of the profile
        tail=(400, 260, .45),                    # width factor fades between these columns
        thin=[(925, 116, 52, 44, .30), (918, 232, 34, 28, .40)],   # comb, wattles
        wing=(565, 405, 165, 85, .012),          # folded-wing bulge: centre, radii, height (m)
        grid=16, fine=(820, 8),                  # sample spacing; finer right of this column (head)
        hip=(572, 545), neck=[(745, 345), (815, 262), (870, 195)], beak=(985, 210),
        rump=(390, 360), tail_tip=(235, 200),
        leg=dict(hip=(585, 600), top=(596, 655), hock=(603, 690), ankle=(641, 768), toe=(758, 794),
                 r=12.5, toe_r=7, y=.036),
        stride=.09, lift=.028, bob=14, peck=(46, 22, 12, 8),      # degrees: body, neck.., head
        look=38, wrap=.6),
    'pavo': dict(
        height=.90, ground=836, col0=655, seed=(450, 600),
        leg_cut=(652, 585, 850),
        width=.70, wmax=.172,
        tail=(470, 260, .5),
        thin=[],
        wing=(590, 480, 215, 125, .028),
        grid=16, fine=(830, 9),
        hip=(650, 500), neck=[(868, 350), (888, 275), (895, 205), (905, 140)], beak=(985, 160),
        rump=(400, 480), tail_tip=(165, 700),
        leg=dict(hip=(648, 570), top=(654, 635), hock=(663, 672), ankle=(702, 797), toe=(812, 826),
                 r=13.5, toe_r=8, y=.085),
        stride=.20, lift=.06, bob=11, peck=(55, 75, 5, -15, -35),  # neck folds at its base, head un-curls
        look=42, wrap=.6),
}


def build(name):
    P = BIRDS[name]
    refs, out, work = L.paths()
    L.reset_scene()
    rgb = L.load_rgb(refs / (name + '.jpg'))
    whole = L.silhouette(rgb, seed=P['seed'])
    rows = np.nonzero(whole.any(1))[0]
    cols = np.nonzero(whole.any(0))[0]
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    s = P['height'] / (P['ground'] - r0)             # metres per pixel
    cut, ca, cb = P['leg_cut']
    body = whole.copy()
    body[cut:, ca:cb] = False
    near = np.zeros_like(body)                       # round the corners the cut leaves on the belly
    near[cut - 40:cut + 8, ca - 40:cb + 40] = True
    body = np.where(near, L.dilate(L.erode(body, 7), 7) & body, body)
    seed = np.zeros_like(body)
    seed[P['seed'][0], P['seed'][1]] = True
    body = L.flood(seed, body)

    def xz(p):                                       # pixel -> metres in the side plane
        p = np.asarray(p, np.float64)
        return np.stack([(p[..., 0] - P['col0']) * s, (P['ground'] - p[..., 1]) * s], -1)

    # ---- body: outline, triangulation, inflation
    dist = L.dist_field(body)
    thick = L.local_thickness(body, 4)
    thick = L.box_blur(thick * body, 8) / np.maximum(L.box_blur(body, 8), 1e-3)
    poly = L.simplify(L.trace_outline(body), tol=1.0, maxlen=24)
    fc, fg = P['fine']
    inner = np.vstack([L.inner_points(body, dist, P['grid'], region=lambda p: p[:, 0] < fc),
                       L.inner_points(body, dist, fg, region=lambda p: p[:, 0] >= fc)])
    pts, tris, on = L.triangulate(poly, inner)
    col, row = pts[:, 0], pts[:, 1]
    d = L.sample(dist, col, row)
    d[on] = 0
    h = np.maximum(L.sample(thick, col, row), d + .01)
    ratio = P['width'] * (1 + (P['tail'][2] - 1) * ss(P['tail'][0], P['tail'][1], col))
    for ex, ey, rx, ry, f in P['thin']:
        ratio = ratio * (1 + (f - 1) * (1 - ss(.7, 1.3, np.hypot((col - ex) / rx, (row - ey) / ry))))
    w = np.minimum(ratio * h * s, P['wmax']) * np.sqrt(np.clip(1 - (1 - np.minimum(d / h, 1)) ** 2, 0, 1))
    wx, wy, wrx, wry, wamp = P['wing']
    w = w + wamp * np.clip(1 - ((col - wx) / wrx) ** 2 - ((row - wy) / wry) ** 2, 0, 1) ** .7
    p2 = xz(pts)
    side_a = np.stack([p2[:, 0], w, p2[:, 1]], 1)
    side_b = np.stack([p2[:, 0], -w, p2[:, 1]], 1)
    verts, faces, up = L.two_shells(side_a, side_b, tris, on)
    faces = [tuple(f) for f in faces]
    m = 12
    box = (max(r0 - m, 0), min(r1 + m, rgb.shape[0]), max(c0 - m, 0), min(c1 + m, rgb.shape[1]))

    def uv(px):
        px = np.asarray(px, np.float64)
        return np.stack([(px[..., 0] - box[2]) / (box[3] - box[2]),
                         1 - (px[..., 1] - box[0]) / (box[1] - box[0])], -1)
    # near the outline, sample the photo a little further in: spreads the feathers
    # round the breast and back instead of smearing the last row of pixels
    soft = L.box_blur(dist, 2)
    gy, gx = np.gradient(soft)
    g = np.stack([L.sample(gx, col, row), L.sample(gy, col, row)], 1)
    g /= np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-6)
    u = np.minimum(d / h, 1)
    wrap = P['wrap'] * h * (np.arccos(1 - u) / (math.pi / 2) - u)
    uvb = uv(pts + g * wrap[:, None])
    loop_uv = [uvb[up].reshape(-1, 2), uvb[up[:, ::-1]].reshape(-1, 2)]

    # ---- skin weights of the body from the spine drawn on the profile
    v2 = np.stack([verts[:, 0], verts[:, 2]], 1)
    spine = xz(P['neck'] + [P['beak']])
    neck = L.chain_weights(v2, spine, reach=.05 * P['height'], blend=.7)
    tail = L.chain_weights(v2, xz([P['rump'], P['tail_tip']]), reach=.09 * P['height'], blend=.5)[0]
    nn = len(P['neck'])                               # neck bones + head
    names = ['neck.%d' % (k + 1) for k in range(nn - 1)] + ['head']
    weights = {'body': 1 - neck[0] - tail * (1 - neck[0]), 'tail': tail * (1 - neck[0])}
    for k, bone in enumerate(names):
        weights[bone] = neck[k] - (neck[k + 1] if k + 1 < nn else 0)
    weights = {k: list(v) for k, v in weights.items()}
    verts = [tuple(v) for v in verts]

    # ---- legs: shank tube + three front toes + hallux, textured from the near leg
    G = P['leg']
    hip, top, hock, ankle, toe = (np.array(G[k], np.float64) for k in ('hip', 'top', 'hock', 'ankle', 'toe'))
    r, rt = G['r'] * s, G['toe_r'] * s

    def add(part, bones):
        pv, pf, puv, ring = part
        base = len(verts)
        verts.extend(tuple(v) for v in pv)
        for f in pf:
            faces.append(tuple(base + i for i in f))
            loop_uv.append(uv(puv[list(f)]))
        for bone in weights:
            weights[bone].extend(bones[i].get(bone, 0) for i in ring)

    for label, sg in (('L', 1), ('R', -1)):
        y = sg * G['y']
        th, sh, ft = 'thigh.' + label, 'shank.' + label, 'foot.' + label
        for bone in (th, sh, ft):
            weights[bone] = [0] * len(verts)
        ax = xz(ankle) - xz(top)
        ax /= np.linalg.norm(ax)
        n1 = np.array([-ax[1], 0, ax[0]])                       # across the leg, in the side plane
        uvo = np.array([n1[0], -n1[2]])
        rings = []
        for q, k in ((top, 1.9), (hock, 1.2), ((hock + ankle) / 2, .86), (ankle, 1.08)):   # feathered thigh, shank
            c = xz(q)
            rings.append(((c[0], y, c[1]), n1, (0, sg, 0), r * k, r * k * .85, q, uvo * G['r'] * k))
        a3 = xz(ankle)
        t3 = xz(top)
        add(L.tube(rings, 8, tip=((a3[0] + .4 * r, y, a3[1] - 1.2 * r), ankle + (0, G['r'])),
                   start=((t3[0], y, t3[1] + r), top)),
            [{th: 1}, {th: .5, sh: .5}, {sh: 1}, {sh: .6, ft: .4}])
        length = np.linalg.norm(xz(toe) - xz(ankle))
        for yaw, scale in ((0, 1.0), (32, .84), (-32, .84), (172, .45)):
            a = math.radians(yaw) * sg
            fwd = np.array([math.cos(a), math.sin(a), 0])
            rings = []
            for t, k in ((0, 1.05), (.33, 1.0), (.66, .86), (.95, .6)):
                z = a3[1] + (rt * .95 - a3[1]) * float(ss(-.1, .5, t))
                c = np.array([a3[0], y, 0]) + fwd * t * length * scale + (0, 0, z)
                rings.append((c, (0, 0, 1), (-fwd[1], fwd[0], 0), rt * k, rt * k * 1.05,
                              ankle + (toe - ankle) * t, np.array([0, -G['toe_r'] * k])))
            tip = np.array([a3[0], y, 0]) + fwd * 1.1 * length * scale + (0, 0, rt * .35)
            add(L.tube(rings, 6, tip=(tip, toe)), [{ft: 1}] * 4)

    obj = L.make_mesh(name, verts, faces, np.vstack(loop_uv))
    tex = work / (name + '_albedo.jpg')
    # backdrop showing through is not plumage: flat patches anywhere (between the
    # legs) and any backdrop-coloured speck within the feather fringe of the outline
    gaps = L.dilate(L.erode(L.background_like(rgb, .03), 2), 4)
    gaps |= L.dilate(L.background_like(rgb, .05), 1) & ~L.erode(whole, 14)
    inked = whole & ~gaps
    photo = L.pad_texture(rgb, inked, inset=3)[box[0]:box[1], box[2]:box[3]]
    L.save_rgb(L.resize(photo, 1024, 1024), tex, quality=88)
    obj.data.materials.append(L.photo_material(name + '_plumaje', tex))

    # ---- skeleton
    def P3(px, y=0):
        q = xz(px)
        return (float(q[0]), y, float(q[1]))
    spec = [('root', (0, 0, 0), (0, 0, .05), None), ('body', P3(P['hip']), P3(P['neck'][0]), 'root')]
    chain = P['neck'] + [P['beak']]
    for k, bone in enumerate(names):
        spec.append((bone, P3(chain[k]), P3(chain[k + 1]), 'body' if k == 0 else names[k - 1]))
    spec.append(('tail', P3(P['rump']), P3(P['tail_tip']), 'body'))
    for label, sg in (('L', 1), ('R', -1)):
        y = sg * G['y']
        spec += [('thigh.' + label, P3(hip, y), P3(hock, y), 'root'),
                 ('shank.' + label, P3(hock, y), P3(ankle, y), 'thigh.' + label),
                 ('foot.' + label, P3(ankle, y), (P3(toe, y)[0], y, rt), 'shank.' + label)]
    rig = L.armature(name, spec)
    L.skin(obj, rig, {k: np.array(v) for k, v in weights.items()})

    # ---- clips
    Y, Z, X = (0, 1, 0), (0, 0, 1), (1, 0, 0)
    rad = math.radians
    hp, hk, an = xz(hip), xz(hock), xz(ankle)
    l1, l2 = np.linalg.norm(hk - hp), np.linalg.norm(an - hk)
    b1, b2 = math.atan2(*(hk - hp)[::-1]), math.atan2(*(an - hk)[::-1])
    e1, e2 = an - hp, hk - hp
    bend = np.sign(e1[0] * e2[1] - e1[1] * e2[0])              # which way the hock points

    def leg_to(p, label, target, toes=0.0):
        """Two-bone IK in the side plane: put the ankle on target (x, z)."""
        v = np.asarray(target) - hp
        dd = float(np.clip(np.linalg.norm(v), abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4))
        g = math.atan2(v[1], v[0]) + bend * math.acos((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))
        knee = hp + l1 * np.array([math.cos(g), math.sin(g)])
        end = hp + v / np.linalg.norm(v) * dd
        g2 = math.atan2(end[1] - knee[1], end[0] - knee[0])
        p.rot('thigh.' + label, Y, -(g - b1))
        p.rot('shank.' + label, Y, -((g2 - b2) - (g - b1)))
        p.rot('foot.' + label, Y, (g2 - b2) - toes)

    def stand(p):                                               # feet slightly staggered, as in the photo
        for label, sg in (('L', 1), ('R', -1)):
            leg_to(p, label, an + (sg * .12 * P['stride'], 0))

    def walk(p, t):
        for label, off in (('L', 0), ('R', .5)):
            u = (t + off) % 1
            if u < .6:                                           # stance: the ground slides back
                dx, dz, toes = P['stride'] * (.5 - u / .6), 0, 0
            else:
                q = (u - .6) / .4
                dx = P['stride'] * (float(ss(0, 1, q)) - .5)
                dz, toes = P['lift'] * math.sin(math.pi * q), rad(-38) * math.sin(math.pi * q)
            leg_to(p, label, an + (dx, dz), toes)
        ph = math.tau * t
        p.move('body', (0, 0, -.012 * P['height'] * (1 + math.cos(2 * ph)) / 2))
        p.rot('body', X, rad(2.5) * math.sin(ph))
        p.rot('body', Z, rad(3) * math.sin(ph))
        p.rot('tail', Y, rad(3) * math.sin(2 * ph + 1))
        q = (2 * t + .15) % 1                                    # head holds, then darts forward
        nod = rad(P['bob']) * (1 - 2 * q / .7 if q < .7 else 2 * float(ss(.7, 1, q)) - 1)
        p.rot(names[0], Y, nod)
        p.rot('head', Y, -nod)

    look = rad(P['look'])
    yaw = [(0, 0), (.10, 0), (.14, 1), (.34, 1), (.38, .35), (.50, .35), (.54, -.9), (.76, -.9),
           (.80, -.2), (.92, -.2), (.96, 0), (1, 0)]
    tilt = [(0, 0), (.38, 0), (.41, 1), (.50, 1), (.54, 0), (.80, 0), (.83, -.7), (.92, -.7), (.96, 0), (1, 0)]
    nodk = [(0, 0), (.14, 0), (.17, .6), (.22, 0), (.54, 0), (.57, 1), (.62, .2), (.76, .2), (.80, 0), (1, 0)]

    def idle(p, t):
        ph = math.tau * t
        yv, tv, nv = L.keys(t, yaw) * look, L.keys(t, tilt) * rad(14), L.keys(t, nodk) * rad(9)
        p.rot(names[-2], Z, yv * .4)
        p.rot('head', Z, yv * .6)
        p.rot('head', X, tv)
        p.rot('head', Y, nv)
        p.rot(names[0], Y, rad(2) * math.sin(ph) + nv * .3)
        p.rot('body', Y, rad(.8) * math.sin(ph))
        p.rot('tail', Y, rad(4) * math.sin(ph + 1) + rad(5) * L.keys(t, nodk))
        stand(p)

    def peck_pose(p, k):
        for bone, deg in zip(['body'] + names, P['peck']):
            p.rot(bone, Y, rad(deg) * k)

    def beak_height(k):
        pose = L.Pose(rig)
        pose.clear()
        peck_pose(pose, k)
        bpy.context.view_layer.update()
        return rig.pose.bones['head'].tail.z
    lo, hi = 0.0, 1.6                                           # how far to bow so the beak meets the ground
    for _ in range(24):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if beak_height(mid) > .012 * P['height'] / .4 else (lo, mid)
    reach = lo
    down = [(0, 0), (.20, .80), (.27, 1), (.34, .82), (.41, 1), (.48, .84), (.55, 1), (.68, .5), (.86, .04), (1, 0)]

    def peck(p, t):
        k = L.keys(t, down)
        peck_pose(p, k * reach)
        p.rot('tail', Y, rad(-8) * k)
        p.rot('head', Z, rad(6) * math.sin(math.tau * t * 3) * k)
        stand(p)

    L.animate(rig, 'Idle', 97, idle)
    L.animate(rig, 'Walk', 25, walk, movers=('body',))
    L.animate(rig, 'Peck', 49, peck)

    info = L.export_glb(out / ('v5-%s.glb' % name), rig, obj)
    info.pop('widthMeters')
    info['walkMetersPerSecond'] = round(P['stride'] / .6, 3)    # ground speed that keeps the feet from sliding
    L.write_info(work, info)
    print('V5_ASSET', info)


if __name__ == '__main__':
    build(L.arg('--bird', default='gallina'))
