#!/usr/bin/env python3
"""SIERRA lugares v6 — revisa los GLB y escribe manifest-fragment.json (Python puro).

    python3 revisar_glb.py --models DIR_GLB --textures DIR_WEBP --meta DIR_META \\
                           --tex-meta texturas.meta.json --out manifest-fragment.json

Comprueba por GLB: cabecera, tamaño (<= 2.5 MB), triángulos, imágenes JPEG
incrustadas (<= 2048 px), sin Draco/meshopt/KTX2, sin animaciones, nodos sin
transformaciones y que el JSON no lleve rutas privadas.
"""
import argparse
import hashlib
import json
import os
import struct
import sys

LIMITS = {'v6-escuela.glb': 6000, 'v6-rancho.glb': 4000, 'v6-rancho-piedra.glb': 4000,
          'v6-corral.glb': 5000}
MAX_BYTES = 2_500_000
PRIVATE = ('/Users/', '/Volumes/', '/home/', '/private/', ':\\\\')


def jpeg_size(b):
    i = 2
    while i < len(b):
        if b[i] != 0xFF:
            i += 1
            continue
        marker = b[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', b[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack('>H', b[i + 2:i + 4])[0]
    return None


def inspect(path):
    data = open(path, 'rb').read()
    magic, version, length = struct.unpack_from('<4sII', data, 0)
    assert magic == b'glTF' and version == 2 and length == len(data), 'cabecera GLB inválida'
    clen, ctype = struct.unpack_from('<II', data, 12)
    assert ctype == 0x4E4F534A
    raw = data[20:20 + clen]
    g = json.loads(raw)
    bin0 = 20 + clen + 8
    acc = g.get('accessors', [])
    tris = sum(acc[p['indices']]['count'] // 3 for m in g['meshes'] for p in m['primitives'])
    lo, hi = [1e9] * 3, [-1e9] * 3
    for m in g['meshes']:
        for p in m['primitives']:
            a = acc[p['attributes']['POSITION']]
            lo = [min(x, y) for x, y in zip(lo, a['min'])]
            hi = [max(x, y) for x, y in zip(hi, a['max'])]
    images = []
    for im in g.get('images', []):
        bv = g['bufferViews'][im['bufferView']]
        blob = data[bin0 + bv.get('byteOffset', 0):bin0 + bv.get('byteOffset', 0) + bv['byteLength']]
        images.append(dict(name=im.get('name'), mime=im.get('mimeType'), bytes=len(blob),
                           size=jpeg_size(blob)))
    problems = []
    name = os.path.basename(path)
    if len(data) > MAX_BYTES:
        problems.append('pesa más de 2.5 MB')
    if tris > LIMITS.get(name, 6000):
        problems.append('excede el presupuesto de triángulos')
    if g.get('extensionsUsed') or g.get('extensionsRequired'):
        problems.append('extensiones: %s' % g.get('extensionsUsed'))
    if g.get('animations'):
        problems.append('trae animaciones')
    if any(i['mime'] != 'image/jpeg' or not i['size'] or max(i['size']) > 2048 for i in images):
        problems.append('imagen no JPEG o mayor de 2048 px')
    if any('uri' in im for im in g.get('images', [])) or any('uri' in bf for bf in g.get('buffers', [])):
        problems.append('recursos externos (uri)')
    if any(k in n for n in g.get('nodes', []) if 'mesh' in n
           for k in ('rotation', 'scale', 'translation', 'matrix')):
        problems.append('nodo con transformación sin aplicar')
    text = raw.decode('utf-8', 'replace')
    if any(k in text for k in PRIVATE):
        problems.append('ruta privada en el JSON')
    return dict(bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), triangles=tris,
                bbox=[[round(v, 2) for v in lo], [round(v, 2) for v in hi]], images=images,
                nodes=[n.get('name') for n in g.get('nodes', [])],
                materials=[m.get('name') for m in g.get('materials', [])], problems=problems)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', required=True)
    ap.add_argument('--textures', required=True)
    ap.add_argument('--meta', required=True)
    ap.add_argument('--tex-meta', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    tex_meta = json.load(open(a.tex_meta))
    textures = []
    for name in sorted(tex_meta):
        b = open(os.path.join(a.textures, name), 'rb').read()
        textures.append(dict(file=name, bytes=len(b), sha256=hashlib.sha256(b).hexdigest(),
                             source=tex_meta[name]['source'], tilesAt=tex_meta[name]['tilesAt']))
    models, bad = [], False
    for name in sorted(LIMITS):
        path = os.path.join(a.models, name)
        if not os.path.exists(path):
            continue
        info = inspect(path)
        meta = json.load(open(os.path.join(a.meta, name.replace('.glb', '.meta.json'))))
        assert meta['triangles'] == info['triangles'], (name, meta['triangles'], info['triangles'])
        models.append(dict(file=name, bytes=info['bytes'], sha256=info['sha256'],
                           triangles=info['triangles'], sizeMeters=meta['sizeMeters'],
                           footprint=meta['footprint'], reference=meta['reference'],
                           origin=meta['origin'], nodes=info['nodes']))
        print(name, info['bytes'], 'bytes', info['triangles'], 'tris', 'caja', info['bbox'],
              [(i['name'], i['size'], i['bytes']) for i in info['images']],
              'PROBLEMAS: %s' % info['problems'] if info['problems'] else 'ok')
        bad = bad or bool(info['problems'])
    json.dump(dict(textures=textures, models=models), open(a.out, 'w'), ensure_ascii=False, indent=1)
    print('manifiesto:', len(textures), 'texturas,', len(models), 'modelos')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
