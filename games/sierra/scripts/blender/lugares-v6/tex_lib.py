"""SIERRA lugares v6 — utilidades para texturas repetibles (numpy + ImageMagick).

Sin PIL ni scipy. La entrada/salida de imágenes pasa por `magick` (tubería RGB
cruda); todo el cálculo es numpy. Corre con el Python que trae Blender:

    blender -b --factory-startup --python texturas.py -- --work DIR --out DIR

Convención: arreglos float32 HxWx3 en sRGB 0..1, fila 0 arriba.
"""
import subprocess
import numpy as np


# ---------------------------------------------------------------- E/S ------
def _run(cmd, data=None):
    return subprocess.run(cmd, input=data, stdout=subprocess.PIPE, check=True).stdout


def load(path, ops=()):
    """Lee una imagen (aplicando operaciones de magick opcionales) -> HxWx3."""
    cmd = ['magick', str(path)] + list(ops) + ['-alpha', 'off', '-depth', '8']
    w, h = map(int, _run(cmd + ['-format', '%w %h', 'info:']).split())
    buf = _run(cmd + ['rgb:-'])
    return (np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.float32) / 255.0)


def save(arr, path, ops=()):
    a = (np.clip(arr, 0, 1) * 255.0 + 0.5).astype(np.uint8)
    h, w = a.shape[:2]
    _run(['magick', '-size', f'{w}x{h}', '-depth', '8', 'rgb:-'] + list(ops) + [str(path)],
         a.tobytes())


def magick_filter(arr, ops):
    """Pasa un arreglo por magick (p. ej. redimensionar) y lo devuelve."""
    a = (np.clip(arr, 0, 1) * 255.0 + 0.5).astype(np.uint8)
    h, w = a.shape[:2]
    cmd = ['magick', '-size', f'{w}x{h}', '-depth', '8', 'rgb:-'] + list(ops) + ['-depth', '8']
    w2, h2 = map(int, _run(cmd + ['-format', '%w %h', 'info:'], a.tobytes()).split())
    buf = _run(cmd + ['rgb:-'], a.tobytes())
    return np.frombuffer(buf, np.uint8).reshape(h2, w2, 3).astype(np.float32) / 255.0


# ------------------------------------------------------------- filtros -----
def luma(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def box_blur(a, r, wrap=False):
    """Caja separable de radio r; tres pasadas ~ gaussiana. Bordes replicados o periódicos."""
    if r <= 0:
        return a.astype(np.float32)
    a = a.astype(np.float32)
    for _ in range(3):
        for axis in (0, 1):
            pad = [(0, 0)] * a.ndim
            pad[axis] = (r + 1, r)
            c = np.cumsum(np.pad(a, pad, mode='wrap' if wrap else 'edge'), axis=axis,
                          dtype=np.float64)
            n = a.shape[axis]
            hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
            lo = np.take(c, np.arange(0, n), axis=axis)
            a = ((hi - lo) / (2 * r + 1)).astype(np.float32)
    return a


def flatten(img, radius, strength=0.8):
    """Quita la variación de luz de baja frecuencia (ganancia sobre la luminancia)."""
    L = luma(img)
    low = box_blur(L, radius)
    gain = (low.mean() / np.maximum(low, 1e-3)) ** strength
    return np.clip(img * gain[..., None], 0, 1)


def match_mean(img, target_mean):
    return np.clip(img + (np.asarray(target_mean, np.float32) - img.mean((0, 1))), 0, 1)


# ------------------------------------------------- costura de error mínimo --
def _seam(A, B, closed=False, feather=2.0):
    """A y B: bandas HxOVx3 superpuestas. Devuelve la banda cosida: a la izquierda
    de la costura queda A, a la derecha B. La costura sigue el camino vertical de
    menor diferencia (programación dinámica). closed=True fija inicio y fin en el
    centro de la banda (para que la costura cierre sobre sí misma al repetir)."""
    h, ov = A.shape[:2]
    d = ((A - B) ** 2).sum(-1).astype(np.float64)
    # penaliza cortar donde hay mucho detalle distinto a ambos lados
    e = d + 0.25 * (np.abs(np.gradient(luma(A), axis=1)) + np.abs(np.gradient(luma(B), axis=1)))
    big = 1e9
    e[:, :2] = big
    e[:, -2:] = big
    if closed:
        mid = ov // 2
        for row in (0, h - 1):
            keep = e[row, mid]
            e[row, :] = big
            e[row, mid] = keep
    cost = e.copy()
    back = np.zeros((h, ov), np.int8)
    for y in range(1, h):
        prev = cost[y - 1]
        left = np.concatenate(([big], prev[:-1]))
        right = np.concatenate((prev[1:], [big]))
        stack = np.stack([left, prev, right])
        k = stack.argmin(0)
        cost[y] += stack[k, np.arange(ov)]
        back[y] = k - 1
    s = np.zeros(h, np.int64)
    s[-1] = int(cost[-1].argmin())
    for y in range(h - 1, 0, -1):
        s[y - 1] = s[y] + back[y, s[y]]
    xs = np.arange(ov, dtype=np.float32)[None, :]
    m = np.clip((xs - s[:, None].astype(np.float32)) / feather + 0.5, 0, 1)[..., None]
    return A * (1 - m) + B * m


def stitch_h(L, R, ov):
    """Une L (izquierda) y R (derecha) solapando ov píxeles."""
    band = _seam(L[:, -ov:], R[:, :ov])
    return np.concatenate([L[:, :-ov], band, R[:, ov:]], axis=1)


def stitch_v(T, B, ov):
    return stitch_h(T.transpose(1, 0, 2), B.transpose(1, 0, 2), ov).transpose(1, 0, 2)


def wrap_h(I, ov, closed=False):
    """Vuelve periódica la imagen en X. Entrada de ancho W+ov -> salida de ancho W."""
    W = I.shape[1] - ov
    band = _seam(I[:, W:W + ov], I[:, :ov], closed=closed)
    return np.concatenate([band, I[:, ov:W]], axis=1)


def wrap_v(I, ov, closed=True):
    return wrap_h(I.transpose(1, 0, 2), ov, closed=closed).transpose(1, 0, 2)


def best_period(I, ov, lo, hi, step=1):
    """Para texturas con estructura (hiladas, canaletas): ancho W en [lo, hi] cuyo
    solape con el inicio difiere menos. Devuelve W."""
    best, bw = None, lo
    for W in range(lo, hi + 1, step):
        if W + ov > I.shape[1]:
            break
        d = float(np.abs(I[:, W:W + ov] - I[:, :ov]).mean())
        if best is None or d < best:
            best, bw = d, W
    return bw


def make_seamless(canvas, ov, size=1024, period_x=None, period_y=None, sharpen=True):
    """canvas -> mosaico periódico size x size. El período en cada eje es
    (dimensión - ov) salvo que se indique. Redimensiona con relleno periódico
    para que el filtro no rompa la continuidad en los bordes."""
    H, W = canvas.shape[:2]
    px = period_x or (W - ov)
    py = period_y or (H - ov)
    px -= px % 8
    py -= py % 8
    t = wrap_h(canvas[:py + ov, :px + ov], ov)
    t = wrap_v(t, ov)
    assert t.shape[:2] == (py, px), (t.shape, py, px)
    pad_y, pad_x = py // 8, px // 8
    big = np.pad(t, ((pad_y, pad_y), (pad_x, pad_x), (0, 0)), mode='wrap')
    ops = ['-filter', 'Lanczos', '-resize', f'{size * 5 // 4}x{size * 5 // 4}!']
    scale = size / float(min(px, py))
    if sharpen and scale > 1.15:
        ops += ['-unsharp', '0x%.2f+0.7+0.01' % min(1.6, 0.6 * scale)]
    big = magick_filter(big, ops)
    o = size // 8
    return big[o:o + size, o:o + size], (px, py)


def heal(img, mask, rounds=8, grow=5, feather=4):
    """Tapa las zonas marcadas (matas, sombras, objetos) clonando superficie
    limpia de la misma imagen desplazada: elige en cada ronda el desplazamiento
    que cubre más píxeles marcados con origen sin marcar."""
    m = box_blur(mask.astype(np.float32), grow) > 0.04
    out = img.copy()
    shifts = [(dx * r, dy * r) for r in (40, 64, 96, 136, 184, 240)
              for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1))]
    for _ in range(rounds):
        if not m.any():
            break
        best, bs = -1, None
        for dx, dy in shifts:
            n = int((m & ~np.roll(m, (dy, dx), (0, 1))).sum())
            if n > best:
                best, bs = n, (dx, dy)
        if best <= 0:
            break
        dx, dy = bs
        src = np.roll(out, (dy, dx), (0, 1))
        fix = m & ~np.roll(m, (dy, dx), (0, 1))
        a = np.clip(box_blur(fix.astype(np.float32), feather) * 2.0, 0, 1)
        a = np.where(fix, 1.0, a * (~np.roll(m, (dy, dx), (0, 1))))[..., None]
        out = out * (1 - a) + src * a
        m = m & ~fix
    return out


# ---------------------------------------------------------- mapa normal ----
def normal_map(rgb, strength=3.0, highpass=24):
    """Normal en espacio tangente (convención OpenGL: +Y verde hacia arriba) a
    partir de la luminancia tomada como altura. Periódico: no rompe el mosaico."""
    h = box_blur(luma(rgb), 1, wrap=True)
    h = h - box_blur(h, highpass, wrap=True)
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength  # fila hacia abajo
    n = np.stack([-dx, dy, np.ones_like(h)], -1)  # v hacia arriba = -fila
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


# -------------------------------------------------- elección de parches ----
def pick_windows(bad, size, n, stride=24, max_overlap=0.15, region=None):
    """bad: máscara HxW de píxeles indeseados. Devuelve n ventanas (x, y) de lado
    `size` con menor fracción de píxeles malos y poco solape entre sí."""
    H, W = bad.shape
    x0, y0, x1, y1 = region or (0, 0, W, H)
    c = np.pad(np.cumsum(np.cumsum(bad.astype(np.float64), 0), 1), ((1, 0), (1, 0)))
    cands = []
    for y in range(y0, y1 - size + 1, stride):
        for x in range(x0, x1 - size + 1, stride):
            s = c[y + size, x + size] - c[y, x + size] - c[y + size, x] + c[y, x]
            cands.append((s / (size * size), x, y))
    cands.sort()
    out = []
    for score, x, y in cands:
        ok = True
        for _, ox, oy in out:
            ix = max(0, size - abs(x - ox))
            iy = max(0, size - abs(y - oy))
            if ix * iy > max_overlap * size * size:
                ok = False
                break
        if ok:
            out.append((score, x, y))
            if len(out) == n:
                break
    return out


def tile_preview(tex, path, n=3, out=1536):
    big = np.tile(tex, (n, n, 1))
    save(big, path, ['-resize', f'{out}x{out}', '-quality', '88'])


def _demo():
    """Autochequeo: un mosaico hecho de ruido debe quedar periódico (el borde
    derecho continúa en el izquierdo tan suave como el interior)."""
    rng = np.random.default_rng(1)
    base = box_blur(rng.random((300, 300, 3)).astype(np.float32), 3)
    t = wrap_v(wrap_h(base, 40), 40)
    assert t.shape == (260, 260, 3)
    inner = np.abs(np.diff(t, axis=1)).mean()
    edge_x = np.abs(t[:, 0] - t[:, -1]).mean()
    edge_y = np.abs(t[0] - t[-1]).mean()
    assert edge_x < 2.5 * inner and edge_y < 2.5 * inner, (inner, edge_x, edge_y)
    nm = normal_map(t)
    assert abs(np.linalg.norm(nm * 2 - 1, axis=-1).mean() - 1) < 1e-3
    print('tex_lib ok', inner, edge_x, edge_y)


if __name__ == '__main__':
    _demo()
