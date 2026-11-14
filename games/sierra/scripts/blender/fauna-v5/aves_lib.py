"""Shared helpers for the SIERRA fauna v5 birds and snake (Blender 5.x, headless).

Technique: a photo reference (orthographic, plain background) is masked, its
outline traced into a polygon, triangulated (constrained Delaunay) and inflated
into two mirrored half-shells. The photo is projected back on as the texture.
Only numpy + bpy are used; no add-ons, no network, no absolute paths (folders
come from CLI args after `--` or from environment variables).

    Blender -b --factory-startup --python aves_condor.py -- \
        --refs <reference folder> --out <glb folder> --work <scratch folder>
    (or SIERRA_V5_REFS / SIERRA_V5_OUT / SIERRA_V5_WORK)
"""
import bpy
import hashlib
import json
import math
import os
import struct
import sys
from pathlib import Path

import numpy as np
from mathutils import Quaternion, Vector
from mathutils.geometry import delaunay_2d_cdt

FPS = 24


# ------------------------------------------------------------------ paths
def arg(flag, env=None, default=None):
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if flag in argv:
        return argv[argv.index(flag) + 1]
    return os.environ.get(env, default) if env else default


def paths():
    here = Path(__file__).resolve().parent
    refs = Path(arg('--refs', 'SIERRA_V5_REFS', here / 'refs'))
    out = Path(arg('--out', 'SIERRA_V5_OUT', here.parents[2] / 'public' / 'models'))
    work = Path(arg('--work', 'SIERRA_V5_WORK', here / '_work'))
    out.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    return refs, out, work


# ------------------------------------------------------------------ images
def load_rgb(path):
    """float32 HxWx3, sRGB 0..1, row 0 = top of the picture."""
    img = bpy.data.images.load(str(path))
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return np.ascontiguousarray(a.reshape(h, w, 4)[::-1, :, :3])


def save_rgb(rgb, path, quality=88):
    h, w = rgb.shape[:2]
    img = bpy.data.images.new('v5_save', w, h, alpha=False)
    px = np.ones((h, w, 4), np.float32)
    px[..., :3] = np.clip(rgb[::-1], 0, 1)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = str(path)
    img.file_format = 'JPEG' if str(path).lower().endswith(('.jpg', '.jpeg')) else 'PNG'
    img.save(quality=quality)
    bpy.data.images.remove(img)


def sample(f, x, y):
    """Bilinear lookup; x = column, y = row, pixel (r, c) is centred on (c+.5, r+.5)."""
    x = np.clip(np.asarray(x, np.float64) - .5, 0, f.shape[1] - 1.001)
    y = np.clip(np.asarray(y, np.float64) - .5, 0, f.shape[0] - 1.001)
    x0 = x.astype(int)
    y0 = y.astype(int)
    fx = x - x0
    fy = y - y0
    if f.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    return (f[y0, x0] * (1 - fx) * (1 - fy) + f[y0, x0 + 1] * fx * (1 - fy)
            + f[y0 + 1, x0] * (1 - fx) * fy + f[y0 + 1, x0 + 1] * fx * fy)


def resize(img, h, w):
    ys = (np.arange(h) + .5) * img.shape[0] / h
    xs = (np.arange(w) + .5) * img.shape[1] / w
    xx, yy = np.meshgrid(xs, ys)
    return sample(img, xx, yy).astype(np.float32)


def smoothstep(a, b, x):
    t = np.clip((np.asarray(x, np.float64) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ masks
def _runs(seed, allowed, axis):
    a = np.moveaxis(allowed, axis, 1)
    s = np.moveaxis(seed, axis, 1)
    rid = np.cumsum(~a, axis=1) + np.arange(a.shape[0])[:, None] * (a.shape[1] + 1)
    hit = np.bincount(rid.ravel(), weights=(s & a).ravel(), minlength=int(rid.max()) + 1)
    return np.moveaxis((hit[rid] > 0) & a, 1, axis)


def flood(seed, allowed):
    """4-connected flood fill, run-length accelerated."""
    s = seed & allowed
    n = -1
    while s.sum() != n:
        n = s.sum()
        s = _runs(_runs(s, allowed, 1), allowed, 0)
    return s


def _near(m, eight, fn, pad):
    p = np.pad(m, 1, constant_values=pad)
    parts = [p[1:-1, 1:-1], p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]
    if eight:
        parts += [p[:-2, :-2], p[:-2, 2:], p[2:, :-2], p[2:, 2:]]
    return fn.reduce(parts)


def erode(m, n=1):
    for i in range(n):
        m = _near(m, i % 2 == 1, np.logical_and, True)
    return m


def dilate(m, n=1):
    for i in range(n):
        m = _near(m, i % 2 == 1, np.logical_or, False)
    return m


def background_like(rgb, thr=.06):
    """Pixels close to the plain backdrop (fitted on the image frame, soft gradient allowed)."""
    h, w, _ = rgb.shape
    frame = np.zeros((h, w), bool)
    frame[:8] = frame[-8:] = frame[:, :8] = frame[:, -8:] = True
    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / w - .5
    v = yy / h - .5
    basis = np.stack([np.ones_like(u), u, v, u * u, v * v, u * v], -1)
    coef = np.linalg.lstsq(basis[frame], rgb[frame], rcond=None)[0]
    return np.abs(rgb - basis @ coef).max(-1) <= thr


def silhouette(rgb, thr=.06, seed=None, shrink=1):
    """Animal mask: everything not connected to the image border through
    background-coloured pixels (enclosed gaps count as animal)."""
    h, w, _ = rgb.shape
    back = background_like(rgb, thr)
    edge = np.zeros((h, w), bool)
    edge[0] = edge[-1] = edge[:, 0] = edge[:, -1] = True
    m = ~flood(edge, back)
    m = erode(m, shrink)
    s = np.zeros((h, w), bool)
    r, c = seed if seed else (h // 2, w // 2)
    s[int(r) - 3:int(r) + 4, int(c) - 3:int(c) + 4] = True
    return flood(s, m)


def fill_colors(rgb, valid):
    """Push-pull: every invalid pixel takes the colour of the nearest valid ones."""
    if valid.all():
        return rgb
    if not valid.any():
        return rgb
    h, w = valid.shape
    if min(h, w) < 2:
        out = rgb.copy()
        out[~valid] = rgb[valid].mean(0)
        return out
    h2, w2 = (h + 1) // 2, (w + 1) // 2
    vp = np.zeros((h2 * 2, w2 * 2), np.float32)
    vp[:h, :w] = valid
    cp = np.zeros((h2 * 2, w2 * 2, 3), np.float32)
    cp[:h, :w] = rgb * valid[..., None]
    cnt = vp.reshape(h2, 2, w2, 2).sum((1, 3))
    low = cp.reshape(h2, 2, w2, 2, 3).sum((1, 3)) / np.maximum(cnt, 1)[..., None]
    low = fill_colors(low, cnt > 0)
    up = low.repeat(2, 0).repeat(2, 1)[:h, :w]
    return np.where(valid[..., None], rgb, up)


def pad_texture(rgb, mask, inset=2, soften=3):
    """Mask out the background and extend the animal's edge colours outward."""
    core = erode(mask, inset)
    out = fill_colors(rgb.astype(np.float32), core)
    for _ in range(soften):      # take the blockiness out of the filled area
        p = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
        blur = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] + out) / 5
        out = np.where(core[..., None], out, blur)
    return out


def dist_field(mask, rmax=4096):
    """Approximate (octagonal) distance in pixels from each inside pixel to the outline."""
    d = np.zeros(mask.shape, np.float32)
    cur = mask
    i = 0
    while i < rmax and cur.any():
        d += cur
        cur = _near(cur, i % 2 == 1, np.logical_and, False)
        i += 1
    return np.maximum(d - .5, 0)


def local_thickness(mask, step=4):
    """Radius (px) of the largest inscribed disc covering each pixel."""
    small = mask[::step, ::step]
    d = dist_field(small)
    h = np.zeros(d.shape, np.float32)
    for r in range(int(d.max()) + 1, 0, -1):
        grown = dilate(d >= r - .5, r)
        h[grown & (h == 0)] = r
    h = h.repeat(step, 0).repeat(step, 1)[:mask.shape[0], :mask.shape[1]] * step
    if h.shape != mask.shape:
        h = np.pad(h, ((0, mask.shape[0] - h.shape[0]), (0, mask.shape[1] - h.shape[1])), mode='edge')
    return h


def box_blur(a, r, n=2):
    a = a.astype(np.float32)
    for _ in range(n):
        for axis in (0, 1):
            c = np.cumsum(np.pad(a, [(r + 1, r) if k == axis else (0, 0) for k in (0, 1)], mode='edge'), axis=axis)
            hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
            lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
            a = (hi - lo) / (2 * r + 1)
    return a


# ------------------------------------------------------------------ outline
def trace_outline(mask):
    """Outer boundary of the mask as a closed polygon of (col, row) lattice points."""
    m = np.pad(mask, 1, constant_values=False)
    nxt = {}

    def add(sel, a, b):
        rs, cs = np.nonzero(sel)
        for r, c in zip(rs.tolist(), cs.tolist()):
            nxt.setdefault((r + a[0], c + a[1]), []).append((r + b[0], c + b[1]))
    core = m[1:-1, 1:-1]
    add(core & ~m[:-2, 1:-1], (0, 0), (0, 1))     # top edge, walking right
    add(core & ~m[1:-1, 2:], (0, 1), (1, 1))      # right edge, walking down
    add(core & ~m[2:, 1:-1], (1, 1), (1, 0))      # bottom edge, walking left
    add(core & ~m[1:-1, :-2], (1, 0), (0, 0))     # left edge, walking up
    best = []
    while nxt:
        start = min(nxt)
        loop = [start]
        prev = (start[0], start[1] - 1)
        cur = start
        while True:
            outs = nxt[cur]
            if len(outs) == 1:
                new = outs[0]
            else:                                   # pinch: keep hugging the same pixel
                d = (cur[0] - prev[0], cur[1] - prev[1])
                want = (cur[0] + d[1], cur[1] - d[0])
                new = want if want in outs else outs[0]
            outs.remove(new)
            if not outs:
                del nxt[cur]
            prev, cur = cur, new
            if cur == start:
                break
            loop.append(cur)
        if len(loop) > len(best):
            best = loop
    return np.array([(c, r) for r, c in best], np.float64)


def _dp(pts, tol):
    keep = np.zeros(len(pts), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        p, q = pts[a], pts[b]
        seg = q - p
        ln = math.hypot(*seg) or 1e-9
        d = np.abs(seg[0] * (pts[a + 1:b, 1] - p[1]) - seg[1] * (pts[a + 1:b, 0] - p[0])) / ln
        i = int(d.argmax())
        if d[i] > tol:
            keep[a + 1 + i] = True
            stack += [(a, a + 1 + i), (a + 1 + i, b)]
    return keep


def simplify(poly, tol=1.0, smooth=2, maxlen=None):
    """Remove the pixel staircase, then Douglas-Peucker. Optionally cap edge length."""
    p = poly.copy()
    for _ in range(smooth):
        p = (np.roll(p, 1, 0) + 2 * p + np.roll(p, -1, 0)) / 4
    far = int(((p - p[0]) ** 2).sum(1).argmax())
    a = np.vstack([p[:far + 1]])
    b = np.vstack([p[far:], p[:1]])
    out = np.vstack([a[_dp(a, tol)][:-1], b[_dp(b, tol)][:-1]])
    if maxlen:
        res = []
        for i in range(len(out)):
            q = out[(i + 1) % len(out)]
            n = max(1, int(math.ceil(math.hypot(*(q - out[i])) / maxlen)))
            res += [out[i] + (q - out[i]) * k / n for k in range(n)]
        out = np.array(res)
    return out


def triangulate(poly, inner):
    """Constrained Delaunay of the polygon plus loose interior points.
    Returns (points Nx2, triangles Mx3, on_outline N bool)."""
    area = .5 * np.sum(poly[:, 0] * np.roll(poly[:, 1], -1) - np.roll(poly[:, 0], -1) * poly[:, 1])
    if area < 0:
        poly = poly[::-1]
    pts = [Vector(p) for p in poly] + [Vector(p) for p in inner]
    v, _e, f, ov, _oe, _of = delaunay_2d_cdt(pts, [], [list(range(len(poly)))], 1, 1e-4)
    on = np.array([any(i < len(poly) for i in o) or not o for o in ov])
    tris = np.array([t for t in f if len(t) == 3], int)
    return np.array([tuple(p) for p in v]), tris, on


def inner_points(mask, dist, spacing, clearance=.55, region=None):
    """Staggered grid of sample points inside the mask, kept away from the outline."""
    h, w = mask.shape
    pts = []
    row = 0
    y = spacing * .5
    while y < h:
        x = spacing * (.5 if row % 2 else 1.0)
        xs = np.arange(x, w, spacing)
        pts.append(np.stack([xs, np.full_like(xs, y)], 1))
        y += spacing * .866
        row += 1
    pts = np.vstack(pts)
    ok = sample(dist, pts[:, 0], pts[:, 1]) > spacing * clearance
    if region is not None:
        ok &= region(pts)
    return pts[ok]


def two_shells(upper, lower, tris, on, round_over=.012):
    """Join the two inflated halves along the outline. Where the body is thick
    next to the outline the edge vertices are shared (smooth rounded edge);
    on thin feather edges they are doubled so each side keeps its own normal.
    Returns (vertices, index of the lower copy of every upper vertex)."""
    n = len(upper)
    thick = np.linalg.norm(upper - lower, axis=1)
    near = np.zeros(n)
    for k in range(3):
        np.maximum.at(near, tris[:, k], thick[tris].max(1))
    weld = on & (near > round_over)
    weld[tris[weld[tris].all(1)].ravel()] = False        # never flatten a whole triangle
    idx = np.where(weld, np.arange(n), n + np.cumsum(~weld) - 1)
    verts = np.zeros((n + int((~weld).sum()), 3))
    mid = np.where(on[:, None], (upper + lower) / 2, upper)
    verts[:n] = mid
    verts[idx] = np.where(on[:, None], mid, lower)
    a, b, c = (upper[tris[:, k]] for k in range(3))
    out = (np.cross(b - a, c - a) * (upper - lower)[tris].mean(1)).sum() > 0
    up = tris if out else tris[:, ::-1]                   # upper faces look away from the lower shell
    return verts, np.vstack([up, idx[up[:, ::-1]]]), up


def tube(rings, sides=8, tip=None, start=None):
    """Skin a chain of rings. ring = (centre, n1, n2, r1, r2, uv centre, uv offset along n1).
    Optional tip / start = (point, uv) close the far / near end with a cone.
    Returns (verts, faces, per-vertex uv, ring index per vertex)."""
    verts, uvs, ring_of, faces = [], [], [], []
    for i, (c, n1, n2, r1, r2, uvc, uvo) in enumerate(rings):
        for k in range(sides):
            a = math.tau * k / sides
            verts.append(np.asarray(c) + r1 * math.cos(a) * np.asarray(n1) + r2 * math.sin(a) * np.asarray(n2))
            uvs.append(np.asarray(uvc) + math.cos(a) * np.asarray(uvo))
            ring_of.append(i)
    for i in range(len(rings) - 1):
        for k in range(sides):
            a, b = i * sides + k, i * sides + (k + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    if tip is not None:
        verts.append(np.asarray(tip[0]))
        uvs.append(np.asarray(tip[1]))
        ring_of.append(len(rings) - 1)
        base = (len(rings) - 1) * sides
        faces += [(base + k, base + (k + 1) % sides, len(verts) - 1) for k in range(sides)]
    if start is not None:
        verts.append(np.asarray(start[0]))
        uvs.append(np.asarray(start[1]))
        ring_of.append(0)
        faces += [((k + 1) % sides, k, len(verts) - 1) for k in range(sides)]
    verts = np.array(verts)
    f = faces[0]                                           # make the faces look outward
    nrm = np.cross(verts[f[1]] - verts[f[0]], verts[f[2]] - verts[f[0]])
    if nrm.dot(verts[f[0]] - np.asarray(rings[0][0])) < 0:
        faces = [t[::-1] for t in faces]
    return verts, faces, np.array(uvs), np.array(ring_of)


def chain_weights(p, chain, reach, blend):
    """Soft membership of 2D points to the bones of a polyline chain.
    Returns c[k] = share of each point that belongs to bone k or any later bone;
    it rises over `blend` (fraction of the bone length) past each joint and
    fades for points farther than `reach` from the chain near its base."""
    chain = np.asarray(chain, np.float64)
    seg = chain[1:] - chain[:-1]
    ln = np.linalg.norm(seg, axis=1)
    start = np.concatenate([[0], np.cumsum(ln)[:-1]])
    best = np.full(len(p), 1e9)
    s = np.zeros(len(p))
    for k in range(len(seg)):
        t = np.clip(((p - chain[k]) @ seg[k]) / ln[k] ** 2, 0, 1)
        dist = np.linalg.norm(p - (chain[k] + t[:, None] * seg[k]), axis=1)
        s = np.where(dist < best, start[k] + t * ln[k], s)
        best = np.minimum(best, dist)
    r = reach + .8 * s
    fall = 1 - smoothstep(r, 2 * r, best)
    return [fall * smoothstep(start[k], start[k] + blend * ln[k], s) for k in range(len(seg))]


def keys(t, pts):
    """Eased interpolation through (time, value) keys; hold = repeat a value."""
    for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * float(smoothstep(t0, t1, t))
    return pts[-1][1]


# ------------------------------------------------------------------ blender data
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    return scene


def make_mesh(name, verts, faces, loop_uv):
    """verts Nx3, faces list of index tuples, loop_uv flat list of (u, v) per face corner."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(map(float, v)) for v in verts], [], [tuple(map(int, f)) for f in faces])
    uv = mesh.uv_layers.new(name='UVMap')
    uv.data.foreach_set('uv', np.asarray(loop_uv, np.float32).ravel())
    mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    mesh.update()
    if mesh.validate(verbose=True):
        print('V5_WARNING mesh needed repair', name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def photo_material(name, image_path, roughness=.85):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(image_path))
    tex.image.pack()
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat.use_backface_culling = True
    return mat


def armature(name, spec):
    """spec: (bone, head, tail, parent or None). Bones are not connected."""
    data = bpy.data.armatures.new(name + '_skeleton')
    rig = bpy.data.objects.new(name + '_rig', data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for key, head, tail, parent in spec:
        b = data.edit_bones.new(key)
        b.head = head
        b.tail = tail
        if parent:
            b.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in rig.pose.bones:
        p.rotation_mode = 'QUATERNION'
    return rig


def skin(obj, rig, weights):
    """weights: {bone: array of per-vertex weights}; normalised here."""
    names = list(weights)
    w = np.stack([np.asarray(weights[n], np.float64) for n in names], 1)
    w = np.where(w < .01, 0, w)
    w /= np.maximum(w.sum(1, keepdims=True), 1e-9)
    for k, n in enumerate(names):
        g = obj.vertex_groups.new(name=n)
        for i in np.nonzero(w[:, k] > 0)[0].tolist():
            g.add([i], float(w[i, k]), 'REPLACE')
    obj.parent = rig
    mod = obj.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig


class Pose:
    """Pose bones with rotations given about armature-space axes."""

    def __init__(self, rig):
        self.rig = rig
        self.inv = {b.name: b.bone.matrix_local.to_3x3().inverted() for b in rig.pose.bones}

    def clear(self):
        for p in self.rig.pose.bones:
            p.rotation_quaternion = (1, 0, 0, 0)
            p.location = (0, 0, 0)
            p.scale = (1, 1, 1)

    def rot(self, bone, axis, angle):
        p = self.rig.pose.bones[bone]
        q = Quaternion(self.inv[bone] @ Vector(axis), angle)
        p.rotation_quaternion = q @ p.rotation_quaternion

    def move(self, bone, offset):
        p = self.rig.pose.bones[bone]
        p.location = Vector(p.location) + self.inv[bone] @ Vector(offset)


def animate(rig, name, frames, callback, movers=()):
    """Bake callback(pose, t) for t in [0, 1] on frames 0..frames-1 (so the clip
    starts at 0 s); the first frame equals the last when the callback is
    periodic. Each clip becomes one muted NLA track."""
    pose = Pose(rig)
    pose.clear()
    rig.animation_data_create()
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    for frame in range(frames):
        pose.clear()
        callback(pose, frame / (frames - 1))
        for b in rig.pose.bones:
            b.keyframe_insert('rotation_quaternion', frame=frame, group=b.name)
            if b.name in movers:
                b.keyframe_insert('location', frame=frame, group=b.name)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 0, action).name = name
    track.mute = True
    rig.animation_data.action = None
    pose.clear()
    return action


def export_glb(path, rig, obj):
    scene = bpy.context.scene
    scene.frame_set(0)
    for o in scene.objects:
        o.select_set(o in (rig, obj))
    bpy.context.view_layer.objects.active = rig
    tracks = list(rig.animation_data.nla_tracks)
    for t in tracks:
        t.mute = False
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', use_selection=True,
        export_animations=True, export_skins=True, export_morph=False,
        export_materials='EXPORT', export_image_format='AUTO', export_texcoords=True,
        export_normals=True, export_cameras=False, export_lights=False,
        export_extras=False, export_yup=True, export_apply=False,
        export_frame_range=False, export_force_sampling=True, export_optimize_animation_size=True,
        export_animation_mode='NLA_TRACKS', export_nla_strips=True)
    for t in tracks:
        t.mute = True
    return glb_info(path)


# ------------------------------------------------------------------ glb facts
def glb_json(path):
    data = Path(path).read_bytes()
    magic, _version, _length = struct.unpack('<4sII', data[:12])
    assert magic == b'glTF', 'not a GLB'
    size, kind = struct.unpack('<I4s', data[12:20])
    assert kind == b'JSON'
    return json.loads(data[20:20 + size]), data


def glb_info(path):
    g, data = glb_json(path)
    acc = g['accessors']
    tris = sum(acc[p['indices']]['count'] // 3 for m in g['meshes'] for p in m['primitives'])
    lo, hi = np.full(3, 1e9), np.full(3, -1e9)
    for m in g['meshes']:
        for p in m['primitives']:
            a = acc[p['attributes']['POSITION']]
            lo = np.minimum(lo, a['min'])
            hi = np.maximum(hi, a['max'])
    size = hi - lo                       # glTF axes: X forward, Y up, Z sideways
    return {
        'file': Path(path).name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
        'triangles': tris, 'joints': len(g['skins'][0]['joints']), 'skins': len(g['skins']),
        'animations': [a['name'] for a in g.get('animations', [])],
        'heightMeters': round(float(size[1]), 3), 'lengthMeters': round(float(size[0]), 3),
        'widthMeters': round(float(size[2]), 3),
        'extensionsUsed': g.get('extensionsUsed', []),
        'images': [{'mimeType': i.get('mimeType'), 'embedded': 'bufferView' in i and 'uri' not in i,
                    'bytes': g['bufferViews'][i['bufferView']]['byteLength'] if 'bufferView' in i else None}
                   for i in g.get('images', [])],
        'materials': len(g.get('materials', [])), 'meshes': len(g['meshes']),
        'primitives': sum(len(m['primitives']) for m in g['meshes']),
    }


def write_info(work, info):
    """Merge one model's facts into <work>/manifest-fragment.json."""
    f = Path(work) / 'manifest-fragment.json'
    models = {m['file']: m for m in json.loads(f.read_text())['models']} if f.exists() else {}
    keep = ('file', 'bytes', 'sha256', 'triangles', 'joints', 'animations', 'heightMeters', 'lengthMeters',
            'wingspanMeters', 'walkMetersPerSecond')
    models[info['file']] = {k: info[k] for k in keep if k in info}
    f.write_text(json.dumps({'models': [models[k] for k in sorted(models)]}, indent=2) + '\n')
