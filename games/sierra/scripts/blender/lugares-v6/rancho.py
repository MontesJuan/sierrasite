"""SIERRA lugares v6 — v6-rancho.glb (adobe) y v6-rancho-piedra.glb (piedra).

    blender -b --factory-startup --python rancho.py -- --tex DIR_PNG --out DIR_GLB --which adobe
    blender -b --factory-startup --python rancho.py -- --tex DIR_PNG --out DIR_GLB --which piedra

v6-rancho: casa de adobe a la vista sobre zócalo de piedra, vano con dintel de
madera y cerco de palo a pique, según el plano fijo del film (3375–3414 s); la
ramada se toma de otro plano (3635–3665 s). v6-rancho-piedra: casa larga de
piedra con techo de chapa a un agua y ramada del telar (film 2810–2900 s; planta
y techo según los drones 322/323).
"""
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lugares_lib as L  # noqa: E402

PUERTA = (0.12, 0.02, 0.88, 0.82)       # vano oscuro bajo el dintel, dentro de puerta.png


def roof(b, m_top, m_under, x0, x1, zf, yf, zb, yb, t=0.07, tile=2.0):
    import math
    ln = math.hypot(zf - zb, yf - yb)
    b.poly(m_top, [(x0, yf, zf), (x1, yf, zf), (x1, yb, zb), (x0, yb, zb)],
           [(x0 / tile, 0), (x1 / tile, 0), (x1 / tile, ln / tile), (x0 / tile, ln / tile)])
    uv = [(0, 0), ((x1 - x0) / 0.5, 0), ((x1 - x0) / 0.5, ln), (0, ln)]
    b.poly(m_under, [(x0, yb - t, zb), (x1, yb - t, zb), (x1, yf - t, zf), (x0, yf - t, zf)], uv)
    e = [(0, 0), (4, 0), (4, 0.2), (0, 0.2)]
    b.poly(m_under, [(x0, yf - t, zf), (x1, yf - t, zf), (x1, yf, zf), (x0, yf, zf)], e)
    b.poly(m_under, [(x1, yb - t, zb), (x0, yb - t, zb), (x0, yb, zb), (x1, yb, zb)], e)
    b.poly(m_under, [(x0, yb - t, zb), (x0, yf - t, zf), (x0, yf, zf), (x0, yb, zb)], e)
    b.poly(m_under, [(x1, yf - t, zf), (x1, yb - t, zb), (x1, yb, zb), (x1, yf, zf)], e)


def ramada(b, madera, x0, x1, z0, z1, h_back, h_front):
    """Cuatro horcones y techo de palos, pendiente hacia z1."""
    for x in (x0 + 0.1, x1 - 0.1):
        b.stick(madera, (x, 0, z0 + 0.1), (x, h_back, z0 + 0.1), r=0.07, sides=5)
        b.stick(madera, (x, 0, z1 - 0.1), (x + 0.03, h_front, z1 - 0.1), r=0.07, sides=5)
    roof(b, madera, madera, x0 - 0.2, x1 + 0.2, z1 + 0.15, h_front + 0.05, z0 - 0.05, h_back + 0.05,
         t=0.08, tile=0.5)


def cerco(b, madera, x0, x1, z, rng, gap=None):
    """Cerco de palo a pique: palos desparejos, algo inclinados."""
    x = x0
    while x < x1:
        if not (gap and gap[0] < x < gap[1]):
            h = rng.uniform(0.95, 1.4)
            u = rng.uniform(0.0, 0.7)
            b.stick(madera, (x, 0, z + rng.uniform(-0.04, 0.04)),
                    (x + rng.uniform(-0.09, 0.09), h, z + rng.uniform(-0.08, 0.08)),
                    r=rng.uniform(0.028, 0.05), uv=('rect', (u, 0, u + 0.3, h / 1.4)))
        x += rng.uniform(0.10, 0.17)


def finish(b, name, out, foot, reference, origin):
    ob = b.build(name)
    lo, hi = b.bounds()
    path = f'{out}/{name}.glb'
    L.export_glb(ob, path)
    meta = dict(file=name + '.glb', triangles=b.tris(),
                sizeMeters=[round(hi[i] - lo[i], 2) for i in range(3)], footprint=foot,
                reference=reference, origin=origin)
    json.dump(meta, open(path.replace('.glb', '.meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(meta, ensure_ascii=False))


def adobe(o):
    L.reset()
    rng = random.Random(7)
    b = L.Builder()
    ado = b.mat('adobe', o['tex'] + '/adobe.png')
    zoc = b.mat('zocalo', o['tex'] + '/zocalo.png')
    pue = b.mat('puerta', o['tex'] + '/puerta.png')
    mad = b.mat('madera', o['tex'] + '/madera.png')
    cha = b.mat('chapa_vieja', o['tex'] + '/chapa-vieja.png', rough=0.7)
    W, D, HF, HB, ZO, e = 3.8, 4.0, 2.5, 2.2, 1.05, 0.04
    dx0, dx1, dh = -1.30, -0.45, 2.0                      # vano de la puerta
    u0, v0, u1, v1 = PUERTA
    vm = v0 + (v1 - v0) * ZO / dh
    # frente: zócalo de piedra (sobresale 4 cm) + adobe; vano oscuro hundido 30 cm
    L.facade(b, zoc, -W - e, W + e, 0.0, ZO, e, L.tiled(-W, W, 0, ZO, 2.7), [(dx0, dx1, 0.0, ZO)],
             depth=0.30 + e, fill=(pue, (u0, v0, u1, vm)))
    L.facade(b, ado, -W, W, ZO, HF, 0.0, L.tiled(-W, W, ZO, HF, 1.8), [(dx0, dx1, ZO, dh)],
             depth=0.30, fill=(pue, (u0, vm, u1, v1)))
    for xa, xb in ((-W - e, dx0), (dx1, W + e)):                  # repisa del zócalo
        b.flat(zoc, [(xa, e), (xb, e), (xb, 0), (xa, 0)], ZO, ('tile', 2.7))
    b.box(mad, (dx0 - 0.18, dh, -0.30), (dx1 + 0.18, dh + 0.13, 0.07), ('tile', 0.6), faces='xXZYy')
    # laterales y fondo
    for (a, c, ha, hc) in (((-W, -D), (-W, 0.0), HB, HF), ((W, 0.0), (W, -D), HF, HB),
                           ((W, -D), (-W, -D), HB, HB)):
        b.wall(ado, a, c, ZO, max(ha, hc), ('tile', 1.8), ya1=ha, yb1=hc)
        n = (e if c[0] > 0 and a[0] > 0 else -e if c[0] < 0 and a[0] < 0 else 0,
             -e if a[1] == c[1] else 0)
        b.wall(zoc, (a[0] + n[0], a[1] + n[1]), (c[0] + n[0], c[1] + n[1]), 0.0, ZO, ('tile', 2.7))
    roof(b, cha, mad, -W - 0.35, W + 0.35, 0.45, HF + 0.09, -D - 0.4, HB + 0.05)
    # ramada a la derecha de la puerta y cerco de palo a pique al frente
    ramada(b, mad, 0.6, 3.7, 0.05, 2.5, 2.3, 2.1)
    cerco(b, mad, -3.9, 3.9, 3.0, rng, gap=(-1.6, -0.2))
    foot = [dict(x=0, z=-D / 2, halfX=W + e, halfZ=D / 2 + e, height=HF, kind='casa'),
            dict(x=-2.75, z=3.0, halfX=1.15, halfZ=0.08, height=1.2, kind='cerco'),
            dict(x=1.85, z=3.0, halfX=2.05, halfZ=0.08, height=1.2, kind='cerco')]
    finish(b, 'v6-rancho', o['out'], foot,
           'film master 3375–3414 s (pared de adobe, zócalo, vano y cerco); ramada según 3635–3665 s',
           'centro del pie de la pared del frente; ramada y cerco sobresalen hasta +3.1 m en +Z')


def piedra(o):
    L.reset()
    b = L.Builder()
    pie = b.mat('piedra', o['tex'] + '/piedra-rancho.png')
    pue = b.mat('puerta', o['tex'] + '/puerta.png')
    mad = b.mat('madera', o['tex'] + '/madera.png')
    cha = b.mat('chapa_vieja', o['tex'] + '/chapa-vieja.png', rough=0.7)
    D, T = 4.2, 3.2

    def cuerpo(x0, x1, hf, hb, doors, dh, left=True, right=True):
        L.facade(b, pie, x0, x1, 0.0, hf, 0.0, L.tiled(x0, x1, 0, hf, T),
                 [(a, c, 0.0, dh) for a, c in doors], depth=0.35, fill=(pue, PUERTA))
        for a, c in doors:
            b.box(mad, (a - 0.2, dh, -0.35), (c + 0.2, dh + 0.14, 0.06), ('tile', 0.6), faces='xXZYy')
        if left:
            b.wall(pie, (x0, -D), (x0, 0.0), 0.0, hf, ('tile', T), ya1=hb, yb1=hf)
        if right:
            b.wall(pie, (x1, 0.0), (x1, -D), 0.0, hf, ('tile', T), ya1=hf, yb1=hb)
        b.wall(pie, (x1, -D), (x0, -D), 0.0, hb, ('tile', T))
        roof(b, cha, mad, x0 - 0.25, x1 + 0.25, 0.4, hf + 0.1, -D - 0.35, hb + 0.06)

    # dos cuerpos como en el film: el del fondo más bajo, el principal más alto
    cuerpo(-7.0, -1.2, 1.80, 1.62, [(-4.75, -3.95)], 1.5, right=False)
    cuerpo(-1.2, 7.0, 2.25, 2.02, [(0.35, 1.20), (4.30, 5.15)], 1.8)
    ramada(b, mad, 7.1, 10.6, -3.6, 0.1, 2.15, 2.0)      # patio del telar
    foot = [dict(x=0, z=-D / 2, halfX=7.0, halfZ=D / 2, height=2.25, kind='casa')]
    finish(b, 'v6-rancho-piedra', o['out'], foot,
           'film master 2810–2900 s (casa de piedra del patio del telar); planta y techo: dron 322/323',
           'centro del pie de la pared del frente; la ramada queda a la derecha (+X) de la casa')


o = L.cli({'which': 'adobe'})
# un modelo por proceso de Blender: el exportador glTF guarda cachés entre exportaciones
{'adobe': adobe, 'piedra': piedra}[o['which']](o)
