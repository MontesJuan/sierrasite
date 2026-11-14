"""SIERRA lugares v6 — v6-escuela.glb: la escuela vista en el dron 313 (s 25).

    blender -b --factory-startup --python escuela.py -- --tex DIR_PNG --out DIR_GLB

Medidas deducidas del cuadro frontal (horizonte a la altura del remate de las
columnas de piedra; gran angular): galería de ~4.4 m, piso 1.0 m sobre el terreno,
columnas de piedra de 0.55 m cada 6.7 m, alero alto a ~3.8 m sobre el piso.
La pared con mural, ventanas, puerta y viga con el letrero es la foto proyectada
(atlas); terraplén en pirca real; techos en chapa real.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lugares_lib as L  # noqa: E402

ATLAS = dict(fachada=(0, 0, 2048, 335), col_a=(0, 350, 108, 660), col_b=(124, 350, 108, 660),
             escalera=(250, 350, 355, 330), piso=(250, 700, 660, 128),
             crema=(630, 350, 730, 75), blanco=(630, 440, 580, 34))
SIZE = (2048, 1024)
PISO = 1.0           # altura del piso de la galería sobre el terreno
X0, X1 = -12.0, 6.34  # extremo izquierdo y derecho de la pared fotografiada
XT0, XT1 = -12.3, 11.0  # terraplén (sigue a la derecha: patio de juegos)
ZF = 4.4             # frente del terraplén respecto de la pared (z = 0)
COLS = (-8.84, -2.14, 4.55)


def R(name, inset=2.0):
    return L.atlas_rect(ATLAS[name], SIZE, inset)


def slab(b, m_top, tile, m_side, rect, x0, x1, zf, yf, zb, yb, t=0.1):
    """Faldón de techo: chapa arriba (canaletas en el sentido de la pendiente),
    canto y cielorraso blancos."""
    import math
    ln = math.hypot(zf - zb, yf - yb)
    b.poly(m_top, [(x0, yf, zf), (x1, yf, zf), (x1, yb, zb), (x0, yb, zb)],
           [(x0 / tile, 0), (x1 / tile, 0), (x1 / tile, ln / tile), (x0 / tile, ln / tile)])
    u0, v0, u1, v1 = rect
    uv = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    b.poly(m_side, [(x0, yb - t, zb), (x1, yb - t, zb), (x1, yf - t, zf), (x0, yf - t, zf)], uv)
    b.poly(m_side, [(x0, yf - t, zf), (x1, yf - t, zf), (x1, yf, zf), (x0, yf, zf)], uv)
    b.poly(m_side, [(x1, yb - t, zb), (x0, yb - t, zb), (x0, yb, zb), (x1, yb, zb)], uv)
    b.poly(m_side, [(x0, yb - t, zb), (x0, yf - t, zf), (x0, yf, zf), (x0, yb, zb)], uv)
    b.poly(m_side, [(x1, yf - t, zf), (x1, yb - t, zb), (x1, yb, zb), (x1, yf, zf)], uv)


def main():
    o = L.cli()
    L.reset()
    b = L.Builder()
    foto = b.mat('escuela_foto', o['tex'] + '/escuela-atlas.png')
    pirca = b.mat('pirca', o['tex'] + '/pirca.png')
    chapa = b.mat('chapa', o['tex'] + '/chapa.png', rough=0.6)
    blanco, crema = ('rect', R('blanco', 6)), ('rect', R('crema', 8))

    # --- pared con la foto: vanos apenas hundidos ---
    def px(p):
        return X0 + p / 160.0

    def row(r):
        return PISO + (480 - r) / 160.0
    vanos = [(px(8), px(480), row(323), row(113)), (px(1052), px(1212), PISO, row(118)),
             (px(1665), px(1870), row(313), row(118)), (px(2005), px(2225), PISO, row(118)),
             (px(2365), px(2575), row(313), row(108))]
    top = PISO + 3.0
    L.facade(b, foto, X0, X1, PISO, top, 0.0, R('fachada', 1.0), vanos, depth=0.12)
    # --- cuerpo del edificio: laterales y fondo revocados ---
    b.wall(foto, (X0, -7.0), (X0, 0.0), PISO, top, crema, yb1=top, ya1=top + 0.55)
    b.wall(foto, (X1, 0.0), (X1, -7.0), PISO, top, crema, ya1=top, yb1=top + 0.55)
    b.wall(foto, (X1, -7.0), (X0, -7.0), PISO, top + 0.55, crema)
    slab(b, chapa, 2.0, foto, R('blanco', 6), X0 - 0.3, X1 + 0.3, 1.3, top + 0.02, -7.3, top + 0.65)
    # --- terraplén: pirca real, canto blanco y piso de baldosas ---
    b.box(pirca, (XT0, 0.0, -7.0), (XT1, PISO - 0.18, ZF), ('tile', 2.7), faces='xXzZ')
    b.box(foto, (XT0, PISO - 0.18, -7.0), (XT1, PISO, ZF), blanco, faces='xXzZ')
    nx, nz = 12, 6
    for i in range(nx):
        for j in range(nz):
            xa = XT0 + (XT1 - XT0) * i / nx
            xb = XT0 + (XT1 - XT0) * (i + 1) / nx
            za = -7.0 + (ZF + 7.0) * j / nz
            zb = -7.0 + (ZF + 7.0) * (j + 1) / nz
            if xb <= X1 and zb <= 0.0 and xa >= X0:
                continue                      # bajo el edificio
            u0, v0, u1, v1 = R('piso', 4)
            if (i + j) % 2:
                u0, u1 = u1, u0
            b.poly(foto, [(xa, PISO, zb), (xb, PISO, zb), (xb, PISO, za), (xa, PISO, za)],
                   [(u0, v0), (u1, v0), (u1, v1), (u0, v1)])
    # --- escalera de 5 contrahuellas frente a la puerta ---
    sx0, sx1 = 0.36, 1.78
    u0, v0, u1, v1 = R('escalera', 3)
    for i in range(1, 5):
        z = ZF + 0.3 * i
        yt, yb_ = PISO - 0.2 * i, PISO - 0.2 * (i + 1)
        va, vb = v1 - (v1 - v0) * (i + 1) / 5.0, v1 - (v1 - v0) * i / 5.0
        b.wall(foto, (sx0, z), (sx1, z), yb_, yt, ('rect', (u0, va, u1, vb)))        # contrahuella
        b.poly(foto, [(sx0, yt, z), (sx1, yt, z), (sx1, yt, z - 0.3), (sx0, yt, z - 0.3)],
               [(u0, vb - 0.01), (u1, vb - 0.01), (u1, vb), (u0, vb)])               # huella
        side = ('rect', (u0, va, u0 + (u1 - u0) * 0.3, vb))
        b.wall(foto, (sx0, z - 0.3), (sx0, z), 0.0, yt, side)
        b.wall(foto, (sx1, z), (sx1, z - 0.3), 0.0, yt, side)
    # --- columnas de piedra (foto de la columna real) y parantes blancos ---
    ca, cb = ('rect', R('col_a', 3)), ('rect', R('col_b', 3))
    zc = ZF + 0.33
    alero = PISO + 3.8
    for k, x in enumerate(COLS):
        b.box(foto, (x - 0.275, 0.0, zc - 0.275), (x + 0.275, PISO + 2.5, zc + 0.275),
              cb if k % 2 else ca, faces='xXzZY', top=(foto, blanco))
        b.box(foto, (x - 0.045, PISO + 2.5, zc - 0.045), (x + 0.045, alero, zc + 0.045), blanco,
              faces='xXzZ')
    for x in (-8.14, -1.88, 4.59):                       # fila de atrás, sobre la viga
        b.box(foto, (x - 0.045, top, 0.95), (x + 0.045, alero, 1.04), blanco, faces='xXzZ')
    for x in (XT0 + 0.15, XT1 - 0.15):                   # extremos del alero
        for z in (1.0, ZF - 0.1):
            b.box(foto, (x - 0.045, PISO, z - 0.045), (x + 0.045, alero, z + 0.045), blanco,
                  faces='xXzZ')
    slab(b, chapa, 2.0, foto, R('blanco', 6), XT0 - 0.3, XT1 + 0.3, ZF + 1.2, alero + 0.13,
         0.7, alero + 0.13, t=0.13)
    # --- baranda blanca (dos caños y parantes), con hueco en la escalera ---
    zr = ZF - 0.07
    for xa, xb in ((XT0, sx0 - 0.06), (sx1 + 0.06, XT1)):
        for y in (PISO + 0.80, PISO + 0.42):
            b.box(foto, (xa, y - 0.02, zr - 0.02), (xb, y + 0.02, zr + 0.02), blanco, faces='zZY')
        n = max(1, round((xb - xa) / 1.62))
        for i in range(n + 1):
            x = xa + (xb - xa) * i / n
            b.box(foto, (x - 0.02, PISO, zr - 0.02), (x + 0.02, PISO + 0.8, zr + 0.02), blanco,
                  faces='xXzZ')
    # --- origen: centro del frente del terraplén, a nivel del terreno ---
    dx = -(XT0 + XT1) / 2.0
    b.translate(dx=dx, dz=-ZF)
    ob = b.build('v6-escuela')
    lo, hi = b.bounds()
    path = o['out'] + '/v6-escuela.glb'
    L.export_glb(ob, path)

    def box(x0, x1, z0, z1, h, kind):
        return dict(x=round((x0 + x1) / 2 + dx, 2), z=round((z0 + z1) / 2 - ZF, 2),
                    halfX=round((x1 - x0) / 2, 2), halfZ=round((z1 - z0) / 2, 2),
                    height=round(h, 2), kind=kind)
    foot = [box(X0, X1, -7.0, 0.0, top + 0.6, 'edificio'),
            box(XT0, XT1, -7.0, ZF, PISO, 'plataforma')]
    foot += [box(x - 0.275, x + 0.275, zc - 0.275, zc + 0.275, PISO + 2.5, 'columna') for x in COLS]
    foot.append(box(sx0, sx1, ZF, ZF + 1.2, 0.8, 'escalera'))
    meta = dict(file='v6-escuela.glb', triangles=b.tris(),
                sizeMeters=[round(hi[i] - lo[i], 2) for i in range(3)], footprint=foot,
                reference='dron 313 @25 s (fachada, columnas, escalera); 301/312 y film 2675 s (planta)',
                origin='centro del frente del terraplén a nivel del terreno; escalera, columnas y '
                       'alero sobresalen hasta +1.2 m en +Z; el piso de la galería está a y = 1.0')
    json.dump(meta, open(path.replace('.glb', '.meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(meta, ensure_ascii=False))


main()
