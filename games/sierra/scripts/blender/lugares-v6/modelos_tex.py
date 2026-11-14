"""SIERRA lugares v6 — texturas de los edificios (atlas de la escuela y paños).

    blender -b --factory-startup --python modelos_tex.py -- --work DIR --tex DIR_TEXTURAS_REALES

Lee los recortes etalonados de DIR/frames/crops y DIR/film, y las texturas
real-*.webp ya generadas; escribe PNG en DIR/models/tex/ (Blender las incrusta
como JPEG al exportar). Ninguna textura lleva personas: se tapan el interior
oscuro de una puerta abierta y un afiche con dibujos de niños.
"""
import argparse
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tex_lib as T  # noqa: E402

AW, AH = 2048, 1024
# regiones del atlas de la escuela: nombre -> (x, y, ancho, alto) en píxeles
ATLAS = dict(fachada=(0, 0, 2048, 335), col_a=(0, 350, 108, 660), col_b=(124, 350, 108, 660),
             escalera=(250, 350, 355, 330), piso=(250, 700, 660, 128),
             crema=(630, 350, 730, 75), blanco=(630, 440, 580, 34))


def resize(a, w, h):
    return T.magick_filter(a, ['-filter', 'Lanczos', '-resize', f'{w}x{h}!'])


def recolor(a, target, sat=0.45):
    """Lleva una textura al tono medio `target` (otra piedra/chapa del mismo lugar):
    baja la saturación propia y aplica una ganancia por canal."""
    g = T.luma(a)[..., None]
    a = g + (a - g) * sat
    return np.clip(a * (np.asarray(target, np.float32) / a.mean((0, 1))), 0, 1)


def escuela(crops, out):
    L = T.load(crops + '/e313_t25_izq.png')
    R = T.load(crops + '/e313_t25_der.png')
    img = np.concatenate([L, R], 1)
    s = img[62:542, 0:2935].copy()            # paño de fachada: 18.3 m x 3.0 m a 160 px/m
    # 1) columna de piedra y poste blanco que tapan la pared: se rellena estirando
    #    el paño blanco vecino (x 1232-1340)
    src = s[:, 1232:1340]
    xi = np.linspace(0, src.shape[1] - 1, 150)
    x0 = np.floor(xi).astype(int)
    x1 = np.minimum(x0 + 1, src.shape[1] - 1)
    f = (xi - x0)[None, :, None]
    s[:, 1340:1490] = src[:, x0] * (1 - f) + src[:, x1] * f
    # 2) baranda blanca que cruza el pie de la pared: interpolación vertical
    a, b = s[436].copy(), s[460].copy()
    for r in range(437, 460):
        t = (r - 436) / 24.0
        s[r] = a * (1 - t) + b * t
    s[458:] = s[457]                           # pie de pared: fuera los arranques de los parantes
    # 3) interior de la puerta abierta (podría verse alguien adentro): oscuro liso
    s[238:438, 1056:1208] = s[125:235, 1060:1200].mean((0, 1))
    # 4) afiche con dibujo de niños en la puerta: se cubre con la hoja de la puerta
    s[133:288, 2015:2110] = s[290:445, 2015:2110]
    atlas = np.zeros((AH, AW, 3), np.float32) + 0.5
    parts = dict(fachada=s, col_a=L[125:950, 1350:1480], col_b=R[150:1010, 1010:1150],
                 escalera=R[700:1030, 90:420], piso=L[556:622, 762:1082],
                 crema=L[200:520, 505:575], blanco=R[669:701, 420:1000])
    for name, (x, y, w, h) in ATLAS.items():
        atlas[y:y + h, x:x + w] = resize(parts[name], w, h)
    T.save(atlas, out + '/escuela-atlas.png')
    T.save(s, out + '/escuela-fachada-revision.jpg', ['-resize', '50%', '-quality', '90'])


def ranchos(crops, film, tex, out):
    pirca = T.load(tex + '/real-pirca.webp')
    chapa = T.load(tex + '/real-chapa.webp', ['-resize', '512x512'])
    T.save(pirca, out + '/pirca.png')
    T.save(chapa, out + '/chapa.png')
    T.save(T.load(tex + '/real-adobe.webp'), out + '/adobe.png')
    frames = sorted(f for f in os.listdir(film + '/adobe') if f.endswith('.png'))
    plate = np.median(np.stack([T.load(film + '/adobe/' + f) for f in frames]), 0)
    T.save(recolor(pirca, plate[258:318, 250:580].mean((0, 1))), out + '/zocalo.png')
    T.save(resize(plate[28:212, 560:790], 256, 256), out + '/puerta.png')   # dintel + vano oscuro
    wall = T.load(film + '/f2885.jpg')
    tono = (wall[400:640, 820:1000].mean((0, 1)) + pirca.mean((0, 1))) / 2   # a medio camino
    T.save(recolor(pirca, tono, 0.4), out + '/piedra-rancho.png')
    roof = T.load(crops + '/c323_t25_roof.png')
    T.save(recolor(chapa, roof[400:520, 380:560].mean((0, 1))), out + '/chapa-vieja.png')
    wood = T.load(film + '/f3545.jpg')
    T.save(resize(wood[400:676, 1090:1280], 128, 256), out + '/madera.png')
    T.save(T.load(crops + '/c306_t20_corral.png', ['-resize', '1536x1536']), out + '/corral-cenital.png')
    # la pirca del corral es de piedra de río gris: tono de las piedras del propio
    # muro en la foto cenital (algo más oscuro, porque las caras reciben menos luz)
    cen = T.load(crops + '/c306_t20_corral.png')
    T.save(recolor(pirca, cen[896:992, 1392:1488].mean((0, 1)) * 0.8, 0.35), out + '/pirca-corral.png')


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', required=True)
    ap.add_argument('--tex', required=True)
    a = ap.parse_args(argv)
    out = a.work + '/models/tex'
    os.makedirs(out, exist_ok=True)
    escuela(a.work + '/frames/crops', out)
    ranchos(a.work + '/frames/crops', a.work + '/film', a.tex, out)
    print('texturas de modelos en', out, sorted(os.listdir(out)))


if __name__ == '__main__':
    main()
