"""SIERRA lugares v6 — utilidades de modelado para Blender 5.x (sin interfaz).

Todo se escribe en coordenadas glTF (metros): +Y arriba, el frente mira a +Z,
+X a la derecha visto desde el frente. Al crear la malla se pasa a Blender
(x, -z, y); el exportador glTF (+Y arriba) deshace el cambio.
"""
import math
import os
import sys

import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


def cli(defaults=None):
    """Argumentos después de '--': --tex DIR (texturas PNG) --out DIR (GLB)."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opts = dict(defaults or {})
    for i in range(0, len(argv) - 1, 2):
        opts[argv[i].lstrip('-')] = argv[i + 1]
    return opts


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


class Builder:
    def __init__(self, mats=None):
        self.v, self.f, self.uv, self.mi = [], [], [], []
        self.mats = mats if mats is not None else []   # se pueden compartir entre mallas

    def mat(self, name, image_path, rough=0.92):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Roughness'].default_value = rough
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(image_path)
        tex.image.name = name            # sin rutas en el GLB
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        self.mats.append(m)
        return len(self.mats) - 1

    # -- primitivas ---------------------------------------------------------
    def poly(self, m, pts, uvs):
        """Polígono convexo: pts en glTF (x, y, z), antihorario visto desde afuera."""
        base = len(self.v)
        self.v += [(p[0], -p[2], p[1]) for p in pts]
        self.f.append(tuple(range(base, base + len(pts))))
        self.uv.append([tuple(u) for u in uvs])
        self.mi.append(m)

    def wall(self, m, a, b, y0, y1, uv=('tile', 2.0), ya1=None, yb1=None, skew=(0, 0)):
        """Paño vertical de a=(x, z) a b=(x, z), de izquierda a derecha visto desde
        afuera. uv=('tile', metros[, u0, v0]) repite por metros; ('rect', (u0, v0, u1, v1))
        estira un recorte del atlas. ya1/yb1: altura distinta en cada extremo."""
        ya1 = y1 if ya1 is None else ya1
        yb1 = y1 if yb1 is None else yb1
        ln = math.hypot(b[0] - a[0], b[1] - a[1])
        pts = [(a[0], y0, a[1]), (b[0], y0, b[1]), (b[0] + skew[0], yb1, b[1] + skew[1]),
               (a[0] + skew[0], ya1, a[1] + skew[1])]
        if uv[0] == 'tile':
            t = uv[1]
            u0 = uv[2] if len(uv) > 2 else 0.0
            v0 = uv[3] if len(uv) > 3 else 0.0
            uvs = [(u0, v0 + y0 / t), (u0 + ln / t, v0 + y0 / t), (u0 + ln / t, v0 + yb1 / t),
                   (u0, v0 + ya1 / t)]
        else:
            u0, v0, u1, v1 = uv[1]
            uvs = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
        self.poly(m, pts, uvs)

    def flat(self, m, pts_xz, y, uv=('tile', 2.0), up=True):
        """Polígono horizontal (lista (x, z) en cualquier sentido) a altura y."""
        tris = tessellate_polygon([[Vector((x, z, 0)) for x, z in pts_xz]])
        if uv[0] == 'rect':
            xs = [p[0] for p in pts_xz]
            zs = [p[1] for p in pts_xz]
            u0, v0, u1, v1 = uv[1]

            def f(x, z):
                return (u0 + (x - min(xs)) / (max(xs) - min(xs)) * (u1 - u0),
                        v0 + (max(zs) - z) / (max(zs) - min(zs)) * (v1 - v0))
        elif uv[0] == 'fn':
            f = uv[1]
        else:
            def f(x, z):
                return (x / uv[1], -z / uv[1])
        for tri in tris:
            p = [pts_xz[i] for i in tri]
            # normal de (a, b, c) en XZ: hacia +Y si el giro es horario visto desde arriba
            cross = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0])
            if (cross > 0) == up:
                p = p[::-1]
            self.poly(m, [(x, y, z) for x, z in p], [f(x, z) for x, z in p])

    def box(self, m, lo, hi, uv=('tile', 2.0), faces='xXzZY', top=None):
        """Caja de lo=(x, y, z) a hi. faces: caras a crear (x X z Z laterales, Y tapa,
        y fondo). top=(material, uv) para una tapa distinta."""
        x0, y0, z0 = lo
        x1, y1, z1 = hi
        side = {'Z': ((x0, z1), (x1, z1)), 'z': ((x1, z0), (x0, z0)),
                'X': ((x1, z1), (x1, z0)), 'x': ((x0, z0), (x0, z1))}
        for k, (a, b) in side.items():
            if k in faces:
                self.wall(m, a, b, y0, y1, uv)
        rect = [(x0, z1), (x1, z1), (x1, z0), (x0, z0)]
        if 'Y' in faces:
            tm, tuv = top or (m, uv)
            self.flat(tm, rect, y1, tuv, up=True)
        if 'y' in faces:
            self.flat(m, rect, y0, uv, up=False)

    def stick(self, m, base, top, r=0.03, uv=('rect', (0, 0, 1, 1)), sides=3):
        """Palo: prisma de `sides` caras entre base y top (x, y, z), sin tapas."""
        bx, by, bz = base
        tx, ty, tz = top
        for i in range(sides):
            a0 = 2 * math.pi * i / sides
            a1 = 2 * math.pi * (i + 1) / sides
            pa = (math.cos(a0) * r, math.sin(a0) * r)
            pb = (math.cos(a1) * r, math.sin(a1) * r)
            u0, v0, u1, v1 = uv[1]
            ua = u0 + (u1 - u0) * i / sides
            ub = u0 + (u1 - u0) * (i + 1) / sides
            # antihorario visto desde afuera: b abajo, a abajo, a arriba, b arriba
            self.poly(m, [(bx + pb[0], by, bz + pb[1]), (bx + pa[0], by, bz + pa[1]),
                          (tx + pa[0], ty, tz + pa[1]), (tx + pb[0], ty, tz + pb[1])],
                      [(ub, v0), (ua, v0), (ua, v1), (ub, v1)])

    # -- cierre -------------------------------------------------------------
    def tris(self):
        return sum(len(f) - 2 for f in self.f)

    def translate(self, dx=0.0, dy=0.0, dz=0.0):
        self.v = [(x + dx, y - dz, z + dy) for x, y, z in self.v]

    def bounds(self):
        xs = [p[0] for p in self.v]
        ys = [p[2] for p in self.v]
        zs = [-p[1] for p in self.v]
        return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))

    def build(self, name):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        for m in self.mats:
            me.materials.append(m)
        layer = me.uv_layers.new(name='UVMap')
        k = 0
        for poly, uvs, mi in zip(me.polygons, self.uv, self.mi):
            poly.material_index = mi
            for j in range(len(uvs)):
                layer.data[k + j].uv = uvs[j]
            k += len(uvs)
        me.validate()
        me.update()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def export_glb(obs, path, quality=85):
    obs = obs if isinstance(obs, (list, tuple)) else [obs]
    bpy.ops.object.select_all(action='DESELECT')
    for ob in obs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True,
        export_apply=True, export_animations=False, export_skins=False, export_morph=False,
        export_materials='EXPORT', export_image_format='JPEG', export_image_quality=quality,
        export_texcoords=True, export_normals=True, export_tangents=False,
        export_cameras=False, export_lights=False, export_extras=False,
        export_vertex_color='NONE', export_draco_mesh_compression_enable=False)
    print('exportado', os.path.basename(path), os.path.getsize(path), 'bytes')


def atlas_rect(region, size, inset=2.0):
    """(x, y, ancho, alto) en píxeles (y hacia abajo) -> (u0, v0, u1, v1)."""
    x, y, w, h = region
    W, H = size
    return ((x + inset) / W, 1 - (y + h - inset) / H, (x + w - inset) / W, 1 - (y + inset) / H)


def tiled(x0, x1, y0, y1, t, u_off=0.0, v_off=0.0):
    """uvrect equivalente a repetir una textura cada t metros en el paño dado."""
    return (x0 / t + u_off, y0 / t + v_off, x1 / t + u_off, y1 / t + v_off)


def facade(b, m, x0, x1, y0, y1, z, uvrect, openings=(), depth=0.1, fill=None):
    """Paño de fachada (foto proyectada o textura repetida con tiled()).
    openings: (ox0, ox1, oy0, oy1) en metros; esas celdas se hunden `depth` y se
    agregan las mochetas. fill=(material, uvrect): textura propia para el fondo
    del vano (puerta oscura)."""
    u0, v0, u1, v1 = uvrect
    xs = sorted({x0, x1} | {o[0] for o in openings} | {o[1] for o in openings})
    ys = sorted({y0, y1} | {o[2] for o in openings} | {o[3] for o in openings})

    def U(x):
        return u0 + (x - x0) / (x1 - x0) * (u1 - u0)

    def V(y):
        return v0 + (y - y0) / (y1 - y0) * (v1 - v0)

    def inside(cx, cy):
        return any(o[0] < cx < o[1] and o[2] < cy < o[3] for o in openings)
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            xa, xb, ya, yb = xs[i], xs[i + 1], ys[j], ys[j + 1]
            hole = inside((xa + xb) / 2, (ya + yb) / 2)
            if hole and fill:
                continue
            zz = z - depth if hole else z
            b.poly(m, [(xa, ya, zz), (xb, ya, zz), (xb, yb, zz), (xa, yb, zz)],
                   [(U(xa), V(ya)), (U(xb), V(ya)), (U(xb), V(yb)), (U(xa), V(yb))])
    eu = depth * (u1 - u0) / (x1 - x0)          # la mocheta sigue la misma escala de textura
    ev = depth * (v1 - v0) / (y1 - y0)
    for ox0, ox1, oy0, oy1 in openings:
        if fill:
            f0, g0, f1, g1 = fill[1]
            b.poly(fill[0], [(ox0, oy0, z - depth), (ox1, oy0, z - depth), (ox1, oy1, z - depth),
                             (ox0, oy1, z - depth)], [(f0, g0), (f1, g0), (f1, g1), (f0, g1)])
        # mochetas: izquierda, derecha, dintel y (si no llega al piso) antepecho
        b.poly(m, [(ox0, oy0, z), (ox0, oy0, z - depth), (ox0, oy1, z - depth), (ox0, oy1, z)],
               [(U(ox0) - eu, V(oy0)), (U(ox0), V(oy0)), (U(ox0), V(oy1)), (U(ox0) - eu, V(oy1))])
        b.poly(m, [(ox1, oy0, z - depth), (ox1, oy0, z), (ox1, oy1, z), (ox1, oy1, z - depth)],
               [(U(ox1), V(oy0)), (U(ox1) + eu, V(oy0)), (U(ox1) + eu, V(oy1)), (U(ox1), V(oy1))])
        if oy1 < y1 - 1e-6:                      # dintel (no si el vano sigue en el paño de arriba)
            b.poly(m, [(ox0, oy1, z - depth), (ox1, oy1, z - depth), (ox1, oy1, z), (ox0, oy1, z)],
                   [(U(ox0), V(oy1)), (U(ox1), V(oy1)), (U(ox1), V(oy1) + ev), (U(ox0), V(oy1) + ev)])
        if oy0 > y0 + 1e-6:
            b.poly(m, [(ox0, oy0, z), (ox1, oy0, z), (ox1, oy0, z - depth), (ox0, oy0, z - depth)],
                   [(U(ox0), V(oy0) - ev), (U(ox1), V(oy0) - ev), (U(ox1), V(oy0)), (U(ox0), V(oy0))])

