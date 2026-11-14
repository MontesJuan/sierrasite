"""Cóndor andino (Vultur gryphus), soaring pose. Blender 5.x, headless.

    Blender -b --factory-startup --python aves_condor.py -- --refs R --out O --work W

Reads R/condor.jpg (exact top view, head up), writes O/v5-condor.glb.
The top silhouette (with the separated primaries) is real geometry traced from
the photo; the photo is projected on the upper side and a darkened copy (no
white wing panel, pale feet) on the underside. Clips: Soar, Flap.
Authored X forward, Z up, wings along +-Y; exported Y up.
"""
import math
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import aves_lib as L  # noqa: E402

SPAN = 3.0          # metres, wing tip to wing tip
ss = L.smoothstep


def build():
    refs, out, work = L.paths()
    L.reset_scene()
    rgb = L.load_rgb(refs / 'condor.jpg')
    mask = L.silhouette(rgb)
    rows = np.nonzero(mask.any(1))[0]
    cols = np.nonzero(mask.any(0))[0]
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    s = SPAN / (c1 - c0)                    # metres per pixel
    cc = (c0 + c1) / 2                      # symmetry axis
    # the shadow under the white ruff is background-grey and cuts the neck: close it
    near_axis = np.abs(np.arange(mask.shape[1]) - cc)[None, :] < .2 / s
    mask |= L.erode(L.dilate(mask, 7), 7) & near_axis
    rc = r0 + .475 * (r1 - r0)              # body centre -> origin

    dist = L.dist_field(mask)
    thick = L.box_blur(np.maximum(L.local_thickness(mask, 4), dist), 5)

    # ---- outline + triangulation (pixel space)
    poly = L.simplify(L.trace_outline(mask), tol=1.0, maxlen=22)
    body = lambda p: np.abs(p[:, 0] - cc) < 84
    neck = lambda p: p[:, 1] < rc - .29 / s
    inner = np.vstack([L.inner_points(mask, dist, 17, region=lambda p: ~body(p)),
                       L.inner_points(mask, dist, 9, region=lambda p: body(p) & ~neck(p)),
                       L.inner_points(mask, dist, 5, region=lambda p: body(p) & neck(p))])
    pts, tris, on = L.triangulate(poly, inner)
    col, row = pts[:, 0], pts[:, 1]
    x = (rc - row) * s
    y = (cc - col) * s
    ay = np.abs(y)
    d = L.sample(dist, col, row) * s
    d[on] = 0
    h = np.maximum(L.sample(thick, col, row) * s, d + 1e-4)

    # ---- wing mid-surface: chordwise camber, flat near the body
    le = np.argmax(mask, 0).astype(np.float32)
    te = (mask.shape[0] - np.argmax(mask[::-1], 0)).astype(np.float32)
    le[:c0], le[c1:], te[:c0], te[c1:] = le[c0], le[c1 - 1], te[c0], te[c1 - 1]
    le, te = L.box_blur(le[None], 14)[0], L.box_blur(te[None], 14)[0]
    ci = np.clip(col.astype(int), 0, mask.shape[1] - 1)
    chord = np.maximum(te[ci] - le[ci], 1)
    c = np.clip((row - le[ci]) / chord, 0, 1)
    wing = ss(.10, .30, ay)
    zw = wing * .06 * chord * s * 4 * c * (1 - c)

    # ---- thickness: thin feather lens, lofted body, round neck + head
    tail = (x < -.27) & (ay < .17 + .5 * np.maximum(0, -.27 - x))
    tw = np.where(tail, .014, .034 + (.008 - .034) * ss(.2, 1.2, ay))
    lens = .5 * tw * np.sqrt(ss(0, .08, d))
    shut = np.sqrt(ss(0, .035, d))                              # closes any bulge at the outline
    arm = wing * (.05 + (.01 - .05) * ss(.2, 1.0, ay)) * np.exp(-((c - .13) / .15) ** 2) * shut
    bx = [-.40, -.30, -.20, -.05, .10, .22, .30, .36]
    ry = np.interp(x, bx, [.03, .075, .115, .15, .16, .17, .17, .13])
    zt = np.interp(x, bx, [0, .02, .045, .068, .075, .07, .06, .05])
    zb = np.interp(x, bx, [0, .04, .10, .16, .17, .15, .12, .09])
    gb = ss(-.42, -.36, x) * (1 - ss(.31, .38, x))
    prof = np.sqrt(1 - np.clip(ay / ry, 0, 1) ** 2.4)           # rounded barrel section
    feet = .03 * (np.exp(-(((x + .215) / .07) ** 2 + ((ay - .055) / .03) ** 2)))
    gr = ss(.24, .31, x) * (1 - ss(.12, .16, ay))               # neck + head gate
    zn = -.045 - .02 * ss(.4, .6, x)
    hr = np.minimum(h, .105)                                    # ruff radius caps the neck tube
    rr = hr * np.sqrt(np.clip(1 - (1 - np.minimum(d / hr, 1)) ** 2, 0, 1))
    top = np.maximum(zw + lens + .7 * arm, gb * zt * prof * shut)
    bot = np.minimum(zw - lens - arm, -gb * (zb * prof + feet) * shut)
    top = top + (zn + rr - top) * gr
    bot = bot + (zn - rr - bot) * gr

    # ---- two shells: outline shared where the body is thick, doubled on feather edges
    verts, faces, up = L.two_shells(np.stack([x, y, top], 1), np.stack([x, y, bot], 1), tris, on)

    # ---- texture atlas: upper half = photo, lower half = underside variant
    m = 10
    box = (r0 - m, r1 + m, c0 - m, c1 + m)
    photo = L.pad_texture(rgb, mask)[box[0]:box[1], box[2]:box[3]]
    xr = ((rc - (np.arange(box[0], box[1]) + .5)) * s)[:, None, None]
    yc = np.abs((cc - (np.arange(box[2], box[3]) + .5)) * s)[None, :, None]
    lum = photo.mean(-1, keepdims=True)
    under = photo * (1 - .7 * ss(.22, .6, lum) * (1 - ss(.27, .31, xr)))
    blob = np.exp(-(((xr + .215) / .065) ** 2 + ((yc - .055) / .022) ** 2) ** 2)
    toes = .5 + .5 * np.cos((yc - .055) / .0075 * math.pi)     # grey feet tucked under the tail
    under = under + (np.array([.34, .32, .31]) * (.7 + .3 * toes) - under) * blob * .85
    atlas = np.vstack([L.resize(photo, 512, 1024), L.resize(under, 512, 1024)])
    tex = work / 'condor_albedo.jpg'
    L.save_rgb(atlas, tex, quality=90)

    u = (col - box[2]) / (box[3] - box[2])
    vv = (row - box[0]) / (box[1] - box[0])
    uv_top = np.stack([u, 1 - .5 * vv], 1)
    uv_bot = np.stack([u, .5 - .5 * vv], 1)
    loop_uv = np.vstack([uv_top[up].reshape(-1, 2), uv_bot[up[:, ::-1]].reshape(-1, 2)])

    obj = L.make_mesh('condor', verts, faces, loop_uv)
    obj.data.materials.append(L.photo_material('condor_plumaje', tex))

    # ---- skeleton
    spec = [('root', (0, 0, 0), (0, 0, .1), None),
            ('spine', (-.25, 0, -.03), (.28, 0, -.03), 'root'),
            ('neck.1', (.28, 0, -.04), (.37, 0, -.045), 'spine'),
            ('neck.2', (.37, 0, -.045), (.46, 0, -.05), 'neck.1'),
            ('head', (.46, 0, -.05), (.60, 0, -.06), 'neck.2'),
            ('tail', (-.27, 0, -.01), (-.62, 0, 0), 'spine')]
    for side, sg in (('L', 1), ('R', -1)):
        spec += [('arm.' + side, (.12, sg * .14, 0), (.15, sg * .52, .01), 'spine'),
                 ('forearm.' + side, (.15, sg * .52, .01), (.19, sg * .95, .01), 'arm.' + side),
                 ('hand.' + side, (.19, sg * .95, .01), (.21, sg * 1.48, 0), 'forearm.' + side)]
    rig = L.armature('condor', spec)

    # ---- skin weights from the plan position of every vertex
    vx, vy = verts[:, 0], verts[:, 1]
    va = np.abs(vy)
    w_tail = ss(-.22, -.34, vx) * (1 - ss(-.02, .06, va - (.17 + .5 * np.maximum(0, -.27 - vx))))
    w_wing = ss(.14, .40, va) * (1 - w_tail)
    w_axis = 1 - w_tail - w_wing
    f_hand = ss(.82, 1.20, va)                 # long blend: the primaries curl progressively
    f_fore = ss(.42, .62, va) - f_hand
    f_arm = 1 - f_hand - f_fore
    g = 1 - ss(.11, .15, va)
    n1, n2, n3 = (g * ss(a_, b_, vx) for a_, b_ in ((.27, .33), (.36, .42), (.45, .50)))
    weights = {'spine': w_axis * (1 - n1), 'neck.1': w_axis * (n1 - n2), 'neck.2': w_axis * (n2 - n3),
               'head': w_axis * n3, 'tail': w_tail}
    for side, sel in (('L', vy > 0), ('R', vy <= 0)):
        for bone, f in (('arm.', f_arm), ('forearm.', f_fore), ('hand.', f_hand)):
            weights[bone + side] = w_wing * f * sel
    L.skin(obj, rig, weights)

    # ---- clips. Angles in radians; +lift raises the wing tip on either side.
    X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)

    def wings(p, arm, fore, hand, sweep=(0, 0)):
        for k, (side, sg) in enumerate((('L', 1), ('R', -1))):
            p.rot('arm.' + side, X, sg * arm[k])
            p.rot('forearm.' + side, X, sg * fore[k])
            p.rot('hand.' + side, X, sg * hand[k])
            p.rot('hand.' + side, Z, sg * sweep[k])

    def soar(p, t):
        ph = math.tau * t
        bank = math.radians(7) * math.sin(ph)
        p.rot('spine', X, bank)
        p.rot('spine', Y, math.radians(1.5) * math.sin(ph + 1.2))
        p.rot('spine', Z, math.radians(2) * math.sin(ph - .6))
        for bone, k in (('neck.1', .3), ('neck.2', .3), ('head', .3)):   # head stays level
            p.rot(bone, X, -bank * k)
        p.rot('head', Z, math.radians(14) * math.sin(ph * 2 + .5))
        p.rot('head', Y, math.radians(5) * math.sin(ph + 2))
        p.rot('tail', X, -bank * .9)
        p.rot('tail', Y, math.radians(3) * math.sin(ph * 2))
        r = math.radians
        wings(p,
              arm=[r(5) + r(1.2) * math.sin(ph * 2 + o) for o in (0, 1.1)],
              fore=[r(2) + r(1.5) * math.sin(ph * 2 + o - .7) for o in (0, 1.1)],
              hand=[r(7) + r(4) * math.sin(ph * 3 + o - 1.4) + sg * bank * .25 for o, sg in ((0, -1), (1.1, 1))])

    def flap(p, t):
        ph = math.tau * t
        ph += .35 * math.sin(ph)                 # slow down-stroke, quicker recovery
        r = math.radians
        stroke = math.sin(ph)                    # +1 wings up, -1 wings down
        wings(p,
              arm=[r(6) + r(30) * stroke] * 2,
              fore=[r(-3) + r(15) * math.sin(ph - 1.0)] * 2,
              hand=[r(2) + r(26) * math.sin(ph - 1.9)] * 2,
              sweep=[r(9) * max(0, math.cos(ph))] * 2)   # wrist folds back on the way up
        p.move('spine', (0, 0, -.03 * math.sin(ph - .5)))
        p.rot('spine', Y, r(2.5) * math.sin(ph - .3))
        p.rot('tail', Y, r(-6) * math.sin(ph - .8))
        p.rot('neck.1', Y, r(-2) * math.sin(ph - .3))
        p.rot('head', Y, r(-2) * math.sin(ph - .3))

    L.animate(rig, 'Soar', 145, soar)
    L.animate(rig, 'Flap', 39, flap, movers=('spine',))

    info = L.export_glb(out / 'v5-condor.glb', rig, obj)
    info['wingspanMeters'] = info.pop('widthMeters')
    L.write_info(work, info)
    print('V5_ASSET', info)


if __name__ == '__main__':
    build()
