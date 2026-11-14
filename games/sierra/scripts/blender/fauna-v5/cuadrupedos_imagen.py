"""SIERRA fauna v5 — utilidades de imagen (numpy puro dentro de Blender).

Máscara del animal sobre fondo gris liso, relleno de bordes ("edge padding")
y recorte de la textura. Sin PIL, sin scipy, sin red.
Convención: los arreglos tienen la fila 0 ARRIBA (como la imagen de referencia).
"""
import bpy
import numpy as np


def load_rgb(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    bpy.data.images.remove(img)
    return buf.reshape(h, w, 4)[::-1, :, :3].copy()


def save_image(arr, path, fmt='PNG', quality=90):
    """arr: HxW (gris) o HxWx3, valores sRGB 0..1, fila 0 arriba."""
    if arr.ndim == 2:
        arr = np.repeat(arr[..., None], 3, axis=2)
    h, w = arr.shape[:2]
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = np.clip(arr[..., :3], 0, 1)
    img = bpy.data.images.new('sierra_tmp_save', w, h, alpha=False)
    img.pixels.foreach_set(rgba[::-1].ravel())
    img.filepath_raw = path
    img.file_format = fmt
    img.save(quality=quality)
    bpy.data.images.remove(img)


def dilate(mask, n=1):
    m = mask.copy()
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def erode(mask, n=1):
    return ~dilate(~mask, n)


def flood(seed, allowed):
    """Dilatación geodésica: región de `allowed` conectada con `seed`."""
    reach = seed & allowed
    count = -1
    while True:
        for _ in range(8):
            g = reach.copy()
            g[1:] |= reach[:-1]; g[:-1] |= reach[1:]; g[:, 1:] |= reach[:, :-1]; g[:, :-1] |= reach[:, 1:]
            reach = g & allowed
        c = int(reach.sum())
        if c == count:
            return reach
        count = c


def box_blur(a, r):
    """Desenfoque de caja separable de radio r (float32), bordes replicados."""
    if r <= 0:
        return a.astype(np.float32)
    a = a.astype(np.float32)
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis)
        n = a.shape[axis]
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
        lo = np.take(c, np.arange(0, n), axis=axis)
        a = (hi - lo) / (2 * r + 1)
    return a


def polygon_mask(shape, poly):
    """Rasteriza un polígono [(x, y), ...] en píxeles (regla par-impar)."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    xx = xx + 0.5; yy = yy + 0.5
    inside = np.zeros(shape, bool)
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if y1 == y2:
            continue
        cond = (y1 > yy) != (y2 > yy)
        xint = (x2 - x1) * (yy - y1) / (y2 - y1) + x1
        inside ^= cond & (xx < xint)
    return inside


def animal_mask(rgb, threshold=0.055, inner_seed=None, extra_bg_seeds=(), shadow=None):
    """Máscara booleana del animal: todo lo que no es fondo gris conectado al borde.

    shadow=(croma_max, luminancia_min): también cuenta como fondo la sombra
    proyectada (gris neutro, no muy oscuro) que rodea al animal en la vista superior."""
    h, w, _ = rgb.shape
    ring = np.zeros((h, w), bool)
    ring[:10] = ring[-10:] = True; ring[:, :10] = ring[:, -10:] = True
    yy, xx = np.mgrid[0:h, 0:w]
    u = (xx / w).astype(np.float32); v = (yy / h).astype(np.float32)
    basis = np.stack([np.ones_like(u), u, v, u * u, v * v, u * v], -1)
    coef = np.linalg.lstsq(basis[ring], rgb[ring], rcond=None)[0]
    bg = basis @ coef
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    cand = box_blur(dist, 1) < threshold
    if shadow:
        chroma = box_blur(rgb.max(-1) - rgb.min(-1), 1)
        luma = box_blur(rgb.mean(-1), 1)
        cand |= (chroma < shadow[0]) & (luma > shadow[1])
    seed = ring.copy()
    for (sx, sy) in extra_bg_seeds:
        seed[int(sy), int(sx)] = True
    background = flood(seed, cand)
    mask = ~background
    # quita motas sueltas y conserva sólo el componente del animal
    mask = dilate(erode(mask, 1), 1)
    if inner_seed is None:
        ys, xs = np.nonzero(erode(mask, 12))
        inner_seed = (int(np.median(xs)), int(np.median(ys)))
    s = np.zeros((h, w), bool)
    s[inner_seed[1], inner_seed[0]] = True
    return flood(dilate(s, 3), mask)


def pad_colors(rgb, valid, iterations):
    """Extiende los colores válidos hacia afuera (promedio de vecinos ya válidos)."""
    out = rgb.copy(); out[~valid] = 0
    known = valid.copy()
    for _ in range(iterations):
        if known.all():
            break
        acc = np.zeros_like(out); cnt = np.zeros(known.shape, np.float32)
        kf = known.astype(np.float32)
        src = out * kf[..., None]
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            acc += np.roll(src, (dy, dx), axis=(0, 1)); cnt += np.roll(kf, (dy, dx), axis=(0, 1))
        new = (~known) & (cnt > 0)
        out[new] = acc[new] / cnt[new][:, None]
        known |= new
    return out


def resize_bilinear(a, new_w, new_h):
    h, w = a.shape[:2]
    xs = (np.arange(new_w) + 0.5) * w / new_w - 0.5
    ys = (np.arange(new_h) + 0.5) * h / new_h - 0.5
    x0 = np.clip(np.floor(xs).astype(int), 0, w - 1); x1 = np.clip(x0 + 1, 0, w - 1)
    y0 = np.clip(np.floor(ys).astype(int), 0, h - 1); y1 = np.clip(y0 + 1, 0, h - 1)
    fx = np.clip(xs - x0, 0, 1)[None, :, None]; fy = np.clip(ys - y0, 0, 1)[:, None, None]
    a = a if a.ndim == 3 else a[..., None]
    top = a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx
    bot = a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx
    return (top * (1 - fy) + bot * fy).squeeze()


def sample_bilinear(field, px, py):
    """Muestrea un campo HxW en coordenadas de píxel (centros en +0.5)."""
    h, w = field.shape
    x = np.clip(np.asarray(px) - 0.5, 0, w - 1.001); y = np.clip(np.asarray(py) - 0.5, 0, h - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
    fx = x - x0; fy = y - y0
    return (field[y0, x0] * (1 - fx) * (1 - fy) + field[y0, x0 + 1] * fx * (1 - fy)
            + field[y0 + 1, x0] * (1 - fx) * fy + field[y0 + 1, x0 + 1] * fx * fy)
