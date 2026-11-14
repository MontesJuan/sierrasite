"""Culebra: a harmless olive-brown snake, 1.4 m. Blender 5.x, headless.

    Blender -b --factory-startup --python culebra.py -- --refs R --out O --work W

Reads R/culebra-piel.jpg (tileable skin strip, dark dorsal band along the
horizontal middle, pale belly at top and bottom) and writes O/v5-culebra.glb.
A tapered tube with a flattened belly and a distinct head lies in a gentle S;
U runs along the body (7 repeats), V round it with the dorsal band on top.
Clips: Idle, Slither (a lateral wave travelling head to tail, in place).
Authored X forward (head), Z up, origin on the ground under the body centre.
"""
import math
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import aves_lib as L  # noqa: E402

LENGTH, BONES, SIDES, REPEATS = 1.4, 18, 14, 7
# body section along the length (0 = tail tip, 1 = snout): half-width, half-height
S_KEY = [0, .05, .30, .50, .88, .925, .95, .97, .985, .995, 1.0]
A_KEY = [.0015, .006, .0165, .0175, .0160, .0120, .0170, .0185, .0160, .0120, .0065]
B_KEY = [.0015, .006, .0150, .0155, .0145, .0110, .0120, .0115, .0095, .0070, .0040]
BELLY = .6            # the underside is this much flatter than the back


def centreline(s, amplitude, phase, waves=1.5):
    """Points of an S-curve of unit speed at arc positions s (0..1). The heading
    swings +-amplitude; the head swings less. Returned straightened along +X
    and centred, so a travelling wave stays in place."""
    fine = np.linspace(0, 1, 561)
    head = amplitude * (1 - .55 * L.smoothstep(.75, 1, fine)) * np.sin(math.tau * (waves * fine + phase))
    step = LENGTH / (len(fine) - 1)
    x = np.concatenate([[0], np.cumsum(np.cos(head[:-1]) * step)])
    y = np.concatenate([[0], np.cumsum(np.sin(head[:-1]) * step)])
    turn = -math.atan2(y[-1] - y[0], x[-1] - x[0])
    c, sn = math.cos(turn), math.sin(turn)
    x, y = c * x - sn * y, sn * x + c * y
    x, y = x - x.mean(), y - y.mean()
    return np.stack([np.interp(s, fine, x), np.interp(s, fine, y)], 1), np.interp(s, fine, head + turn)


def build():
    refs, out, work = L.paths()
    L.reset_scene()
    skin = L.load_rgb(refs / 'culebra-piel.jpg')
    tex = work / 'culebra_albedo.jpg'
    L.save_rgb(L.resize(skin, 512, 1024), tex, quality=88)
    band = skin[skin.shape[0] * 3 // 8: skin.shape[0] * 5 // 8].mean(-1)
    dr, dc = np.unravel_index(L.box_blur(band, 4).argmin(), band.shape)       # darkest patch -> eye colour
    eye_uv = ((dc + .5) / skin.shape[1], 1 - (dr + skin.shape[0] * 3 // 8 + .5) / skin.shape[0])

    rest_amp = math.radians(28)
    s_ring = np.concatenate([np.linspace(0, .92, 84, endpoint=False), np.linspace(.92, 1, 15)])
    pos, heading = centreline(s_ring, rest_amp, 0)
    a = L.box_blur(np.interp(s_ring, S_KEY, A_KEY)[None], 1, 1)[0]
    b = L.box_blur(np.interp(s_ring, S_KEY, B_KEY)[None], 1, 1)[0]

    verts, uvs, faces, ring_s = [], [], [], []

    def face(idx, centre):                              # keep the winding that looks away from centre
        q = [verts[j] for j in idx]
        out = np.cross(q[1] - q[0], q[2] - q[0]).dot(np.mean(q, 0) - centre) > 0
        faces.append(tuple(idx) if out else tuple(idx)[::-1])
    for i, s in enumerate(s_ring):
        side = np.array([-math.sin(heading[i]), math.cos(heading[i]), 0])
        for k in range(SIDES + 1):                      # k = 0 and k = SIDES meet under the belly
            th = -math.pi + math.tau * k / SIDES        # 0 = top of the back
            h = b[i] * (1 if math.cos(th) > 0 else BELLY)
            verts.append(np.array([pos[i, 0], pos[i, 1], BELLY * b[i] + h * math.cos(th)]) + side * a[i] * math.sin(th))
            uvs.append((s * REPEATS, .5 + th / math.tau))
            ring_s.append(s)
    n = SIDES + 1
    axis = [np.array([pos[i, 0], pos[i, 1], BELLY * b[i]]) for i in range(len(s_ring))]
    for i in range(len(s_ring) - 1):
        for k in range(SIDES):
            face((i * n + k, i * n + k + 1, (i + 1) * n + k + 1, (i + 1) * n + k), (axis[i] + axis[i + 1]) / 2)
    for i, s in ((0, 0.0), (len(s_ring) - 1, 1.0)):     # close the tail tip and the snout
        inside = axis[i - 3] if i else axis[3]
        verts.append(axis[i] + (.004 if i else -.002) * np.array([math.cos(heading[i]), math.sin(heading[i]), 0]))
        uvs.append((s * REPEATS, .5))
        ring_s.append(s)
        for k in range(SIDES):
            face((i * n + k, i * n + k + 1, len(verts) - 1), inside)
    i = int(np.argmin(np.abs(s_ring - .976)))           # eyes: two dark beads on the head
    fwd = np.array([math.cos(heading[i]), math.sin(heading[i]), 0])
    side = np.array([-fwd[1], fwd[0], 0])
    for sg in (1, -1):
        c = np.array([pos[i, 0], pos[i, 1], BELLY * b[i] + b[i] * .5]) + side * sg * a[i] * .74
        base = len(verts)
        for j in range(1, 4):
            for k in range(6):
                lat, lon = math.pi * j / 4, math.tau * k / 6
                verts.append(c + .0026 * (side * sg * math.cos(lat) + math.sin(lat) * (fwd * math.cos(lon) + np.array([0, 0, 1]) * math.sin(lon))))
        verts.append(c + .0026 * side * sg)
        for j in range(2):
            for k in range(6):
                face((base + j * 6 + k, base + j * 6 + (k + 1) % 6, base + (j + 1) * 6 + (k + 1) % 6, base + (j + 1) * 6 + k), c)
        for k in range(6):
            face((base + (k + 1) % 6, base + k, len(verts) - 1), c)
        uvs += [eye_uv] * 19
        ring_s += [s_ring[i]] * 19
    uvs = np.array(uvs)
    obj = L.make_mesh('culebra', verts, faces, np.vstack([uvs[list(f)] for f in faces]))
    obj.data.materials.append(L.photo_material('culebra_piel', tex))

    # ---- chain of bones from tail to head; the root stays on the ground at the centre
    joints = np.linspace(0, 1, BONES + 1)
    jp, _ = centreline(joints, rest_amp, 0)
    lift = np.interp(joints, S_KEY, B_KEY) * BELLY
    names = ['spine.%02d' % (k + 1) for k in range(BONES)]
    spec = [('root', (0, 0, 0), (0, 0, .05), None)]
    for k, bone in enumerate(names):
        spec.append((bone, (jp[k, 0], jp[k, 1], lift[k]), (jp[k + 1, 0], jp[k + 1, 1], lift[k + 1]),
                     names[k - 1] if k else 'root'))
    rig = L.armature('culebra', spec)
    mid = (joints[:-1] + joints[1:]) / 2
    f = np.clip(np.interp(np.array(ring_s), mid, np.arange(BONES)), 0, BONES - 1)
    near = np.floor(f + .5)
    u = f - near + .5                                    # quadratic B-spline over three bones: no kinks
    spline = {-1: (1 - u) ** 2 / 2, 0: (-2 * u * u + 2 * u + 1) / 2, 1: u * u / 2}
    weights = {bone: np.zeros(len(f)) for bone in names}
    for off, w in spline.items():
        k = np.clip(near + off, 0, BONES - 1).astype(int)
        for j in range(BONES):
            weights[names[j]] += w * (k == j)
    L.skin(obj, rig, weights)
    rest_dir = np.arctan2(*(jp[1:] - jp[:-1]).T[::-1])

    def shape(p, amplitude, phase, waves=1.5):
        """Lay the chain along the S-curve for this phase (planar: yaw only)."""
        q, _ = centreline(joints, amplitude, phase, waves)
        turn = np.arctan2(*(q[1:] - q[:-1]).T[::-1]) - rest_dir
        p.move(names[0], (q[0, 0] - jp[0, 0], q[0, 1] - jp[0, 1], 0))
        for k, bone in enumerate(names):
            p.rot(bone, (0, 0, 1), turn[k] - (turn[k - 1] if k else 0))

    def nod(p, k, angle):                                # pitch bone k up by angle
        d = rest_dir[k]
        p.rot(names[k], (-math.sin(d), math.cos(d), 0), -angle)

    def slither(p, t):
        shape(p, math.radians(34), t, 1.75)
        nod(p, BONES - 2, math.radians(4))
        nod(p, BONES - 1, math.radians(-4))

    def idle(p, t):
        ph = math.tau * t
        shape(p, rest_amp * (1 + .02 * math.sin(ph)), .012 * math.sin(ph))
        up = 1 + .12 * math.sin(ph + .8)
        nod(p, BONES - 4, math.radians(7) * up)          # neck lifts the head a few centimetres
        nod(p, BONES - 3, math.radians(9) * up)
        nod(p, BONES - 2, math.radians(-4) * up)
        nod(p, BONES - 1, math.radians(-11) * up)
        for k, w in ((BONES - 3, .3), (BONES - 2, .3), (BONES - 1, .4)):
            p.rot(names[k], (0, 0, 1), w * math.radians(7) * math.sin(ph * 2 + .4))
        p.rot(names[0], (0, 0, 1), math.radians(3) * math.sin(ph * 2))

    L.animate(rig, 'Idle', 97, idle, movers=(names[0],))
    L.animate(rig, 'Slither', 49, slither, movers=(names[0],))

    info = L.export_glb(out / 'v5-culebra.glb', rig, obj)
    info.pop('widthMeters')
    L.write_info(work, info)
    print('V5_ASSET', info)


if __name__ == '__main__':
    build()
