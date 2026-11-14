"""SIERRA lugares v6 — texturas reales repetibles a partir de cuadros del film.

Uso (Python de Blender, sin interfaz):
    blender -b --factory-startup --python texturas.py -- --work DIR --out DIR [--only nombre]

DIR de trabajo: contiene frames/crops/*.png y film/adobe/*.png generados por
extraer_cuadros.sh (cuadros ya etalonados). Salida: real-*.webp (1024x1024,
calidad 82) y sus -normal.webp; previas 3x3 en DIR/previews/tex/.
"""
import argparse
import hashlib
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tex_lib as T  # noqa: E402


def persp(path, quad, w, h, pre=()):
    """Rectifica el cuadrilátero quad=[TL, TR, BR, BL] (píxeles) a w x h."""
    (a, b, c, d) = quad
    pts = f'{a[0]},{a[1]} 0,0  {b[0]},{b[1]} {w},0  {c[0]},{c[1]} {w},{h}  {d[0]},{d[1]} 0,{h}'
    return T.load(path, list(pre) + ['-virtual-pixel', 'edge', '-define',
                                     f'distort:viewport={w}x{h}+0+0', '-filter', 'Lanczos',
                                     '-distort', 'Perspective', pts, '+repage'])


def stitch_v_best(top, bot, lo, hi):
    """Apila buscando el solape (lo..hi px) donde mejor coinciden las hiladas."""
    best, bov = None, lo
    for ov in range(lo, hi + 1):
        d = float(np.abs(top[-ov:] - bot[:ov]).mean())
        if best is None or d < best:
            best, bov = d, ov
    return T.stitch_v(top, bot, bov), bov


# ------------------------------------------------------------- recetas -----
def pirca(crops, film):
    """Muro de piedra de campo del terraplén de la escuela (clip 313, s 10),
    vista frontal, luz pareja de día nublado. Tres tramos apilados (el tercero
    es el tramo central espejado, para no repetir piedras reconocibles)."""
    c1 = crops + '/c313_t10_wall.png'
    quads = [[(250, 27), (1114, 61), (1114, 355), (250, 292)],
             [(990, 57), (1854, 117), (1854, 432), (990, 346)],
             [(620, 42), (1484, 91), (1484, 395), (620, 319)]]
    strips = [T.flatten(persp(c1, q, 864, 300), 90, 0.6) for q in quads]
    strips[2] = strips[2][:, ::-1]
    mean = np.mean([s.mean((0, 1)) for s in strips], 0)
    strips = [T.match_mean(s, mean) for s in strips]
    canvas = T.stitch_v(T.stitch_v(strips[0], strips[1], 44), strips[2], 44)
    return canvas, 56, dict(source='dron 313 @10 s', px_per_m=290, normal=3.0)


def _verde(img, k=0.13):
    """Vegetación (verde o pasto amarillo): el verde supera claramente al azul."""
    return (img[..., 1] - img[..., 2]) > k


def roca(crops, film):
    """Roca viva fracturada del lecho del río (clip 309, s 45); se tapan las
    matas de pasto para que no delaten la repetición."""
    P = T.load(crops + '/c309_t45_roca.png', ['-crop', '720x545+280+215', '+repage'])
    P = T.heal(P, _verde(P), grow=9)
    P = T.flatten(P, 110, 0.75)
    canvas = T.stitch_v(P[0:400], P[130:530, ::-1], 80)
    return canvas, 80, dict(source='dron 309 @45 s', px_per_m=400, normal=2.5)


def _quilt(patches, ov):
    patches = list(patches)
    while len(patches) < 4:                      # faltan ventanas limpias: espejo de las mejores
        patches.append(patches[len(patches) - 2][::-1, ::-1])
    mean = np.mean([p.mean((0, 1)) for p in patches], 0)
    patches = [T.match_mean(p, mean) for p in patches]
    top = T.stitch_h(patches[0], patches[1], ov)
    bot = T.stitch_h(patches[2], patches[3], ov)
    return T.stitch_v(top, bot, ov)


def agua(crops, film):
    """Agua del río en corriente suave (clip 310, s 5): cuatro ventanas sin
    piedras ni espuma, cosidas 2x2."""
    img = T.load(crops + '/c310_t5.png')
    L = T.luma(img)
    low = T.box_blur(L, 40)
    sat = img.max(-1) - img.min(-1)
    bad = (sat > 0.11) | (np.abs(L - low) > 0.09)
    bad = T.box_blur(bad.astype(np.float32), 8) > 0.10
    size = 344
    wins = T.pick_windows(bad, size, 4, stride=12, max_overlap=0.12, region=(0, 230, 1400, 900))
    wins = [w for w in wins if w[0] < 0.2]
    print('agua ventanas', [(round(float(s), 3), x, y) for s, x, y in wins])
    patches = [T.flatten(img[y:y + size, x:x + size], 70, 0.9) for _, x, y in wins]
    return _quilt(patches, 56), 64, dict(source='dron 310 @5 s', px_per_m=250, normal=None)


def suelo(crops, film):
    """Suelo seco de la ladera visto desde arriba (clip 334, s 5–31, sol bajo):
    tierra con piedritas. Se eligen las cuatro ventanas más despejadas entre
    varios cuadros y se tapan matas y sombras alargadas (no deben quedar sombras
    duras horneadas)."""
    size, cands = 584, []
    for name in ('c334_t25.png', 'c334_t19.png', 'c334_t31.png', 'c334_t5_arena.png'):
        img = T.load(crops + '/' + name)
        L = T.luma(img)
        low = T.box_blur(L, 70)
        bad = ((L < low * 0.80) | (img[..., 1] > img[..., 0] * 0.96) | (L < 0.25)
               | _verde(img, 0.17))
        for s, x, y in T.pick_windows(T.box_blur(bad.astype(np.float32), 5) > 0.2, size, 2,
                                      stride=24, max_overlap=0.10):
            cands.append((float(s), name, x, y, img, bad))
    cands.sort(key=lambda c: c[0])
    print('suelo ventanas', [(round(c[0], 3), c[1], c[2], c[3]) for c in cands])
    patches = []
    for s, name, x, y, img, bad in cands[:4]:
        P = img[y:y + size, x:x + size]
        P = T.heal(P, bad[y:y + size, x:x + size], grow=9)
        patches.append(T.flatten(P, 110, 0.9))
    return _quilt(patches, 64), 80, dict(source='dron 334 @5–31 s', px_per_m=210, normal=2.5)


def huella(crops, film):
    """Huella de tierra con rodadas (clip 335, s 4.2), a la sombra pareja de la
    tarde y sin jinete ni matas. La franja real mide 360 px de ancho: se cose con
    ella misma girada 180° (simetría de punto, no de espejo). La sombra es azulada: se lleva el color
    medio al de la tierra al sol (el del suelo)."""
    A = T.load(crops + '/c335_s4.2.png', ['-crop', '360x1040+205+20', '+repage',
                                          '-unsharp', '0x1.4+0.9+0.0'])  # dron en movimiento
    A = T.flatten(A, 110, 0.8)
    canvas = T.stitch_h(A[120:792], A[::-1, ::-1][248:920], 48)
    canvas = np.clip(canvas * (np.array([0.47, 0.40, 0.32]) / canvas.mean((0, 1))), 0, 1)
    return canvas, 72, dict(source='dron 335 @4.2 s', px_per_m=190, normal=2.5)


def adobe(crops, film):
    """Pared de adobe a la vista (máster del film, plano fijo 3375–3414 s).
    Mediana temporal de 14 cuadros para limpiar ruido y compresión; sólo el paño
    de pared a la izquierda de la puerta, sin la persona. Se tapan el parche
    blanco, el objeto azul y las hojas, que delatarían la repetición."""
    frames = sorted(f for f in os.listdir(film + '/adobe') if f.endswith('.png'))
    stack = np.stack([T.load(film + '/adobe/' + f, ['-crop', '424x222+152+24', '+repage'])
                      for f in frames])
    P = np.median(stack, 0)
    L = T.luma(P)
    odd = (L > 0.66) | (P[..., 2] > P[..., 0] * 1.02) | (P[..., 1] > P[..., 0] * 1.03)
    P = T.heal(P, odd, grow=3, feather=2)
    P = T.magick_filter(P, ['-filter', 'Lanczos', '-resize', '200%', '-unsharp', '0x1.2+0.8+0.01'])
    P = T.flatten(P, 110, 0.8)
    canvas, ov = stitch_v_best(P, P[:, ::-1], 30, 100)
    print('adobe solape de hiladas', ov, canvas.shape)
    ch = canvas.shape[0]
    py = T.best_period(canvas.transpose(1, 0, 2), 64, ch - 64 - 60, ch - 64)
    return canvas, 64, dict(source='film master 3375–3414 s', px_per_m=464, normal=None,
                            period_y=py)


def chapa(crops, film):
    """Chapa acanalada blanca del techo del cobertizo del corral (clip 306, s 2),
    cenital y con luz pareja. Canaletas en vertical (V = sentido de la pendiente)."""
    quad = [(64, 200), (302, 64), (418, 277), (212, 412)]
    cx = sum(p[0] for p in quad) / 4.0
    cy = sum(p[1] for p in quad) / 4.0
    quad = [(cx + (x - cx) * 0.86, cy + (y - cy) * 0.86) for x, y in quad]
    P = persp(crops + '/c306_t2_roof.png', quad, 560, 496).transpose(1, 0, 2)
    P = T.flatten(P, 36, 1.0)
    px = T.best_period(P, 48, P.shape[1] - 48 - 40, P.shape[1] - 48)
    return P[:, :px + 48], 48, dict(source='dron 306 @2 s', px_per_m=241, normal=None)


RECETAS = dict(pirca=pirca, roca=roca, agua=agua, suelo=suelo, huella=huella, adobe=adobe,
               chapa=chapa)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--only', default='')
    a = ap.parse_args(argv)
    crops, film = a.work + '/frames/crops', a.work + '/film'
    prev = a.work + '/previews/tex'
    os.makedirs(prev, exist_ok=True)
    os.makedirs(a.out, exist_ok=True)
    report = {}
    for name, fn in RECETAS.items():
        if a.only and name not in a.only.split(','):
            continue
        canvas, ov, meta = fn(crops, film)
        T.save(canvas, f'{prev}/{name}-lienzo.jpg', ['-quality', '90'])
        tex, (px, py) = T.make_seamless(canvas, ov, 1024, period_y=meta.get('period_y'))
        out = f'{a.out}/real-{name}.webp'
        T.save(tex, out, ['-quality', '82', '-define', 'webp:method=6'])
        T.tile_preview(tex, f'{prev}/{name}-3x3.jpg')
        files = [out]
        if meta.get('normal'):
            nm = T.normal_map(tex, meta['normal'])
            outn = f'{a.out}/real-{name}-normal.webp'
            T.save(nm, outn, ['-quality', '90', '-define', 'webp:method=6'])
            files.append(outn)
        tiles_at = round(px / meta['px_per_m'], 1)
        for f in files:
            b = open(f, 'rb').read()
            report[os.path.basename(f)] = dict(file=os.path.basename(f), bytes=len(b),
                                               sha256=hashlib.sha256(b).hexdigest(),
                                               source=meta['source'], tilesAt=tiles_at)
        print(name, 'periodo px', (px, py), 'tilesAt', tiles_at, [os.path.getsize(f) for f in files])
    meta_path = a.work + '/logs/texturas.meta.json'
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    meta.update(report)
    json.dump(meta, open(meta_path, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
