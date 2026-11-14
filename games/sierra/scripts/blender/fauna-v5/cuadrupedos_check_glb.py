#!/usr/bin/env python3
"""SIERRA fauna v5 — revisión del JSON de los GLB (Python puro, sin dependencias).

  python3 cuadrupedos_check_glb.py [--manifest salida.json] [--info carpeta_trabajo] a.glb b.glb ...
Comprueba presupuesto (tamaño, triángulos, huesos), extensiones, textura
embebida y clips; con --manifest escribe el fragmento para el manifiesto.
"""
import hashlib
import json
import os
import struct
import sys

LIMITS = dict(bytes=1_500_000, triangles=15_000, joints=30)


def read_glb(path):
    data = open(path, 'rb').read()
    magic, version, length = struct.unpack_from('<4sII', data, 0)
    assert magic == b'glTF' and version == 2 and length == len(data), 'cabecera GLB inválida'
    clen, ctype = struct.unpack_from('<II', data, 12)
    assert ctype == 0x4E4F534A
    return data, json.loads(data[20:20 + clen])


def inspect(path):
    data, g = read_glb(path)
    acc = g.get('accessors', [])
    tris = 0; lo = [1e9] * 3; hi = [-1e9] * 3; per_mesh = {}
    for m in g.get('meshes', []):
        t = 0
        for p in m['primitives']:
            assert p.get('mode', 4) == 4
            t += acc[p['indices']]['count'] // 3
            a = acc[p['attributes']['POSITION']]
            lo = [min(x, y) for x, y in zip(lo, a['min'])]; hi = [max(x, y) for x, y in zip(hi, a['max'])]
        per_mesh[m.get('name', '?')] = t; tris += t
    images = g.get('images', [])
    bad_nodes = [n.get('name') for n in g.get('nodes', []) if 'mesh' in n and any(k in n for k in ('rotation', 'scale', 'translation', 'matrix'))]
    anims = {}; loop_err = {}; starts = {}
    bin0 = 20 + struct.unpack_from('<I', data, 12)[0] + 8

    def floats(ai):
        a = acc[ai]; bv = g['bufferViews'][a['bufferView']]
        ncomp = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
        off = bin0 + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        vals = struct.unpack_from('<%df' % (a['count'] * ncomp), data, off)
        return [vals[i * ncomp:(i + 1) * ncomp] for i in range(a['count'])]
    for a in g.get('animations', []):
        tmax = max(acc[s['input']]['max'][0] for s in a['samplers'])
        anims[a['name']] = round(tmax, 4)
        starts[a['name']] = min(acc[s['input']]['min'][0] for s in a['samplers'])
        err = 0.0
        for ch in a['channels']:  # bucle: el último cuadro debe repetir el primero
            out = floats(a['samplers'][ch['sampler']]['output'])
            first, last = out[0], out[-1]
            if ch['target']['path'] == 'rotation' and sum(x * y for x, y in zip(first, last)) < 0:
                last = [-v for v in last]
            err = max(err, max(abs(x - y) for x, y in zip(first, last)))
        loop_err[a['name']] = round(err, 6)
    info = dict(
        file=path.split('/')[-1], bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), triangles=tris,
        joints=max([len(s['joints']) for s in g.get('skins', [])] or [0]), animations=sorted(anims),
        heightMeters=round(hi[1] - lo[1], 4), lengthMeters=round(hi[0] - lo[0], 4), meshes=per_mesh)
    checks = dict(
        skins=len(g.get('skins', [])), meshes=per_mesh, durations=anims, starts=starts, loopError=loop_err,
        extensionsUsed=g.get('extensionsUsed', []), extensionsRequired=g.get('extensionsRequired', []),
        images=[(i.get('mimeType'), 'bufferView' in i, i.get('uri')) for i in images],
        textureSize=None, buffers_external=[b.get('uri') for b in g.get('buffers', []) if b.get('uri')],
        min=[round(v, 4) for v in lo], max=[round(v, 4) for v in hi], mesh_nodes_with_transform=bad_nodes)
    for i in images:  # tamaño del JPEG embebido (marcador SOF)
        bv = g['bufferViews'][i['bufferView']]
        off = 20 + struct.unpack_from('<I', data, 12)[0] + 8 + bv.get('byteOffset', 0)
        jpg = data[off:off + bv['byteLength']]
        k = 2
        while k < len(jpg):
            marker, size = struct.unpack_from('>HH', jpg, k)
            if marker in (0xFFC0, 0xFFC2):
                h, w = struct.unpack_from('>HH', jpg, k + 5); checks['textureSize'] = [w, h, len(jpg)]; break
            k += 2 + size
    problems = []
    if info['bytes'] > LIMITS['bytes']: problems.append('bytes')
    if any(t > LIMITS['triangles'] for t in per_mesh.values()): problems.append('triangles')
    if info['joints'] > LIMITS['joints']: problems.append('joints')
    if checks['skins'] > 1: problems.append('skins')
    if any(not e.startswith('KHR_materials_') for e in checks['extensionsUsed']): problems.append('extensions')
    if any(m != 'image/jpeg' or not emb for m, emb, _ in checks['images']) or len(images) != 1: problems.append('image')
    if checks['buffers_external'] or bad_nodes: problems.append('external/transform')
    if abs(lo[1]) > 0.003: problems.append('origen no apoyado en el suelo')
    if any(v > 1e-4 for v in loop_err.values()) or any(v > 1e-6 for v in starts.values()): problems.append('bucle')
    return info, checks, problems


def main():
    args = sys.argv[1:]
    manifest = None; extra = None
    while args and args[0] in ('--manifest', '--info'):
        if args[0] == '--manifest':
            manifest = args[1]
        else:
            extra = args[1]
        args = args[2:]
    out = []
    for path in args:
        info, checks, problems = inspect(path)
        animal = path.split('/')[-1].replace('v5-', '').replace('.glb', '')
        side = os.path.join(extra, animal + '_info.json') if extra else None
        if side and os.path.exists(side) and info['animations']:
            info.update(json.load(open(side)))
        out.append(info)
        print(json.dumps(info)); print('   ', json.dumps(checks)); print('    PROBLEMAS:', problems or 'ninguno')
    if manifest:
        json.dump(out, open(manifest, 'w'), indent=2)
        print('manifest →', manifest)


if __name__ == '__main__':
    main()
