"""SIERRA lugares v6 — v6-corral.glb: el corral de pirca real (dron 306, s 20).

    blender -b --factory-startup --python corral.py -- --tex DIR_PNG --out DIR_GLB

El contorno se calcó sobre el cuadro cenital (recorte de 1760 px mostrado a
1100 px; 63 px/m estimado por el techo del cobertizo ≈ 2.7 m y el ancho del muro
≈ 0.75 m). Los costados del muro llevan la pirca real; la cara superior del muro,
el piso y el techo del cobertizo llevan la propia foto cenital proyectada.
Dos nodos: 'v6-corral' (muros, cobertizo, tranquera) y 'v6-corral-piso'.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lugares_lib as L  # noqa: E402

S = 63.0                                  # píxeles (vista de 1100) por metro
GA, GB = (445.0, 140.0), (545.0, 150.0)   # jambas de la tranquera en la vista
TH = math.atan2(GB[1] - GA[1], GB[0] - GA[0])
GC = ((GA[0] + GB[0]) / 2, (GA[1] + GB[1]) / 2)

MURO = [(445, 140), (385, 150), (305, 178), (240, 215), (195, 255), (165, 305), (148, 365),
        (135, 420), (118, 520), (95, 640), (70, 705), (85, 765), (115, 830), (165, 900),
        (235, 960), (310, 1005), (380, 1035), (440, 1058), (470, 1010), (505, 935), (560, 872),
        (640, 818), (720, 752), (800, 682), (880, 602), (950, 538), (1000, 478), (1022, 420),
        (1012, 372)]
BORDO = [(1012, 372), (960, 345), (890, 322), (820, 300), (765, 272), (722, 232), (712, 208)]
COBERTIZO = [(712, 208), (757, 58), (603, 13), (557, 152)]         # muro en U, abierto al corral
TECHO = [(560, 150), (715, 205), (760, 55), (600, 10)]             # frente izq., frente der., fondo
CHIQUERO = [[(165, 372), (268, 398)], [(250, 432), (210, 590)], [(118, 592), (200, 622)]]
PIEDRA = [(350, 210), (430, 188), (462, 240), (455, 290), (350, 295), (343, 250)]


def w(p):
    """Vista (x, y) -> modelo (X, Z): tranquera en el origen mirando a +Z."""
    dx, dy = p[0] - GC[0], p[1] - GC[1]
    xr = dx * math.cos(TH) + dy * math.sin(TH)
    yr = -dx * math.sin(TH) + dy * math.cos(TH)
    return (-xr / S, -yr / S)


def photo_uv(x, z):
    xr, yr = -x * S, -z * S
    dx = xr * math.cos(TH) - yr * math.sin(TH)
    dy = xr * math.sin(TH) + yr * math.cos(TH)
    return ((GC[0] + dx) / 1100.0, 1.0 - (GC[1] + dy) / 1100.0)


def up(b, m, pts, uvs):
    """Polígono con la normal hacia arriba, sea cual sea el orden recibido."""
    (ax, _, az), (bx, _, bz), (cx, _, cz) = pts[0], pts[1], pts[2]
    if (bz - az) * (cx - ax) - (bx - ax) * (cz - az) < 0:
        pts, uvs = pts[::-1], uvs[::-1]
    b.poly(m, pts, uvs)


def ribbon(b, m_side, m_top, pts, heights, w0=0.8, w1=0.55, tile=2.0, caps=(True, True), v_off=0.0):
    """Muro siguiendo la poligonal pts (modelo): más ancho abajo que arriba,
    costados con textura repetida y cara superior con la foto cenital."""
    n = len(pts)
    nor = []
    for i in range(n):
        a, c = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        dx, dz = c[0] - a[0], c[1] - a[1]
        ln = math.hypot(dx, dz) or 1.0
        nor.append((-dz / ln, dx / ln))
    acc = [0.0]
    for i in range(1, n):
        acc.append(acc[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))

    def P(i, side, top):
        k = (w1 if top else w0) / 2 * side
        return (pts[i][0] + nor[i][0] * k, heights[i] if top else 0.0, pts[i][1] + nor[i][1] * k)
    for i in range(n - 1):
        j = i + 1
        ua, ub = acc[i] / tile, acc[j] / tile
        va, vb = v_off + heights[i] / tile, v_off + heights[j] / tile
        b.poly(m_side, [P(i, 1, 0), P(j, 1, 0), P(j, 1, 1), P(i, 1, 1)],
               [(ua, v_off), (ub, v_off), (ub, vb), (ua, va)])
        b.poly(m_side, [P(j, -1, 0), P(i, -1, 0), P(i, -1, 1), P(j, -1, 1)],
               [(ub + 0.37, v_off), (ua + 0.37, v_off), (ua + 0.37, va), (ub + 0.37, vb)])
        top = [P(i, 1, 1), P(i, -1, 1), P(j, -1, 1), P(j, 1, 1)]
        up(b, m_top, top, [photo_uv(q[0], q[2]) for q in top])
    for end, i, s in ((caps[0], 0, 1), (caps[1], n - 1, -1)):
        if end:
            q = [P(i, s, 0), P(i, -s, 0), P(i, -s, 1), P(i, s, 1)]
            b.poly(m_side, q, [(0, v_off), (w0 / tile, v_off), (w0 / tile, v_off + heights[i] / tile),
                               (0, v_off + heights[i] / tile)])


def boxes(pts, h, kind, step=0.7, half=0.42):
    """Cajas alineadas a los ejes cada `step` metros a lo largo del muro (colisión)."""
    out = []
    for i in range(len(pts) - 1):
        (ax, az), (bx, bz) = pts[i], pts[i + 1]
        n = max(1, int(math.hypot(bx - ax, bz - az) / step + 0.5))
        for k in range(n):
            t = (k + 0.5) / n
            out.append(dict(x=round(ax + (bx - ax) * t, 2), z=round(az + (bz - az) * t, 2),
                            halfX=half, halfZ=half, height=h, kind=kind))
    return out


def main():
    o = L.cli()
    L.reset()
    rng = random.Random(306)
    b = L.Builder()
    pirca = b.mat('pirca_corral', o['tex'] + '/pirca-corral.png')
    foto = b.mat('corral_cenital', o['tex'] + '/corral-cenital.png')
    mad = b.mat('madera', o['tex'] + '/madera.png')
    muro = [w(p) for p in MURO]
    bordo = [w(p) for p in BORDO]
    cob = [w(p) for p in COBERTIZO]
    ribbon(b, pirca, foto, muro, [1.1 + rng.uniform(-0.12, 0.12) for _ in muro])
    ribbon(b, pirca, foto, bordo, [0.85 + rng.uniform(-0.08, 0.08) for _ in bordo], 0.9, 0.6,
           caps=(False, False), v_off=0.3)
    ribbon(b, pirca, foto, cob, [1.25] * len(cob), 0.45, 0.4, caps=(False, True), v_off=0.55)
    for seg in CHIQUERO:
        ribbon(b, pirca, foto, [w(p) for p in seg], [0.6, 0.6], 0.4, 0.32, v_off=0.2)
    # piedra grande dentro del corral
    base = [w(p) for p in PIEDRA]
    cx = sum(p[0] for p in base) / len(base)
    cz = sum(p[1] for p in base) / len(base)
    topp = [(cx + (x - cx) * 0.68, cz + (z - cz) * 0.68) for x, z in base]
    for i in range(len(base)):
        j = (i + 1) % len(base)
        q = [(base[i][0], 0, base[i][1]), (base[j][0], 0, base[j][1]),
             (topp[j][0], 0.75, topp[j][1]), (topp[i][0], 0.75, topp[i][1])]
        if (q[1][0] - q[0][0]) * (cz - q[0][2]) - (q[1][2] - q[0][2]) * (cx - q[0][0]) < 0:
            q = [q[1], q[0], q[3], q[2]]          # normal hacia afuera de la piedra
        b.poly(foto, q, [photo_uv(base[i][0], base[i][1]), photo_uv(base[j][0], base[j][1]),
                         photo_uv(topp[j][0], topp[j][1]), photo_uv(topp[i][0], topp[i][1])]
               if q[0][0] == base[i][0] and q[0][2] == base[i][1] else
               [photo_uv(base[j][0], base[j][1]), photo_uv(base[i][0], base[i][1]),
                photo_uv(topp[i][0], topp[i][1]), photo_uv(topp[j][0], topp[j][1])])
    b.flat(foto, topp, 0.75, ('fn', photo_uv))
    # cobertizo: techo de chapa (la foto misma), horcones de madera
    t = [w(p) for p in TECHO]
    tcx = sum(p[0] for p in t) / 4
    tcz = sum(p[1] for p in t) / 4
    t = [(tcx + (x - tcx) * 1.06, tcz + (z - tcz) * 1.06) for x, z in t]
    hy = [1.85, 1.85, 1.6, 1.6]
    roof = [(t[i][0], hy[i], t[i][1]) for i in range(4)]
    up(b, foto, roof, [photo_uv(p[0], p[1]) for p in t])
    under = [(x, y - 0.05, z) for x, y, z in roof]
    (ax, _, az), (bx, _, bz), (cx2, _, cz2) = under[0], under[1], under[2]
    if (bz - az) * (cx2 - ax) - (bx - ax) * (cz2 - az) > 0:
        under = under[::-1]
    b.poly(mad, under, [(0, 0), (5, 0), (5, 5), (0, 5)])
    for i in range(4):
        b.stick(mad, (t[i][0] * 0.97 + tcx * 0.03, 0, t[i][1] * 0.97 + tcz * 0.03),
                (t[i][0] * 0.97 + tcx * 0.03, hy[i] - 0.05, t[i][1] * 0.97 + tcz * 0.03), r=0.06, sides=5)
    # tranquera de palos, entreabierta hacia adentro desde la jamba del cobertizo
    hinge = w(GB)
    ang = math.radians(-68)
    dxg, dzg = math.cos(ang), math.sin(ang)
    for k in range(9):
        d = 0.08 + k * 0.17
        h = rng.uniform(1.05, 1.3)
        b.stick(mad, (hinge[0] + dxg * d, 0.05, hinge[1] + dzg * d),
                (hinge[0] + dxg * d + rng.uniform(-0.03, 0.03), h, hinge[1] + dzg * d), r=0.03,
                uv=('rect', (0.1 * k, 0, 0.1 * k + 0.25, 0.9)))
    for y in (0.35, 0.95):
        b.stick(mad, (hinge[0], y, hinge[1]), (hinge[0] + dxg * 1.5, y + 0.04, hinge[1] + dzg * 1.5),
                r=0.03, uv=('rect', (0, 0, 0.3, 1)))
    b.stick(mad, (hinge[0], 0, hinge[1]), (hinge[0], 1.45, hinge[1]), r=0.07, sides=5)
    ga = w(GA)
    b.stick(mad, (ga[0], 0, ga[1]), (ga[0], 1.45, ga[1]), r=0.07, sides=5)
    # piso real del corral, en un nodo aparte
    p = L.Builder(b.mats)
    p.flat(foto, muro + bordo[1:] + [w(TECHO[0])], 0.03, ('fn', photo_uv))
    ob = b.build('v6-corral')
    ob2 = p.build('v6-corral-piso')
    lo, hi = b.bounds()
    path = o['out'] + '/v6-corral.glb'
    L.export_glb([ob, ob2], path)
    foot = boxes(muro, 1.1, 'pirca') + boxes(bordo, 0.85, 'bordo') + boxes(cob, 1.25, 'cobertizo', half=0.3)
    for seg in CHIQUERO:
        foot += boxes([w(q) for q in seg], 0.6, 'chiquero', half=0.25)
    foot.append(dict(x=round(cx, 2), z=round(cz, 2), halfX=0.75, halfZ=0.65, height=0.75, kind='piedra'))
    meta = dict(file='v6-corral.glb', triangles=b.tris() + p.tris(),
                sizeMeters=[round(hi[i] - lo[i], 2) for i in range(3)], footprint=foot,
                reference='dron 306 @20 s (cenital: contorno, cobertizo, piso); 305/307 (alturas)',
                origin='centro de la abertura de la tranquera, a nivel del terreno; el corral queda '
                       'hacia -Z; la tranquera está entreabierta y no figura en footprint')
    json.dump(meta, open(path.replace('.glb', '.meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in meta.items() if k != 'footprint'}, ensure_ascii=False),
          'cajas', len(foot))


main()
