"""SIERRA lugares v6 — reimporta un GLB en una escena limpia y saca previas EEVEE.

    blender -b --factory-startup --python verificar.py -- --glb a.glb --out DIR [--fp x,z]

Vistas: frente, tres cuartos, cenital y primera persona (ojo a 1.7 m; --fp fija
la posición del jugador en coordenadas del modelo, por defecto 4 m al costado y
12 m al frente). Imprime triángulos y caja en coordenadas glTF.
"""
import math
import os
import sys

import bpy
from mathutils import Vector


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    o = {argv[i].lstrip('-'): argv[i + 1] for i in range(0, len(argv) - 1, 2)}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=o['glb'])
    scene = bpy.context.scene
    meshes = [ob for ob in scene.objects if ob.type == 'MESH']
    lo, hi, tris = Vector((1e9,) * 3), Vector((-1e9,) * 3), 0
    for ob in meshes:
        ob.data.calc_loop_triangles()
        tris += len(ob.data.loop_triangles)
        for v in ob.data.vertices:
            w = ob.matrix_world @ v.co
            g = Vector((w.x, w.z, -w.y))              # Blender -> glTF
            lo = Vector(map(min, lo, g))
            hi = Vector(map(max, hi, g))
    name = os.path.splitext(os.path.basename(o['glb']))[0]
    print('VERIF', name, 'tris', tris, 'min', [round(c, 2) for c in lo], 'max', [round(c, 2) for c in hi],
          'materiales', sorted({s.material.name for ob in meshes for s in ob.material_slots}))
    size = hi - lo
    c = (lo + hi) / 2
    # terreno neutro para que no flote
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -0.01))
    g = bpy.context.object
    gm = bpy.data.materials.new('terreno')
    gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.30, 0.25, 0.19, 1)
    gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    g.data.materials.append(gm)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('w')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.62, 0.68, 0.78, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.9       # relleno suave
    sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
    scene.collection.objects.link(sun)
    sun.data.energy = 3.0
    sun.data.angle = math.radians(4)
    sun.rotation_euler = (math.radians(50), math.radians(6), math.radians(35))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 1000, 620
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 90

    def shot(label, pos, target, lens=35, ortho=None):
        p = Vector((pos[0], -pos[2], pos[1]))        # glTF -> Blender
        t = Vector((target[0], -target[2], target[1]))
        cam.location = p
        cam.rotation_euler = (t - p).to_track_quat('-Z', 'Y').to_euler()
        cam.data.type = 'ORTHO' if ortho else 'PERSP'
        if ortho:
            cam.data.ortho_scale = ortho
        cam.data.lens = lens
        cam.data.clip_end = 500
        scene.render.filepath = os.path.join(o['out'], f'{name}-{label}.jpg')
        bpy.ops.render.render(write_still=True)

    d = max(size.x, size.z, 6.0)
    eye = 1.7
    shot('frente', (c.x, max(2.2, size.y * 0.55), hi.z + d * 1.05), (c.x, size.y * 0.42, c.z), lens=35)
    shot('tres-cuartos', (hi.x + d * 0.55, size.y * 1.6 + 2, hi.z + d * 0.75), (c.x, size.y * 0.35, c.z), lens=35)
    shot('cenital', (c.x, 60, c.z + 0.01), (c.x, 0, c.z), ortho=max(size.x, size.z) * 1.25)
    fx, fz = (float(v) for v in o['fp'].split(',')) if 'fp' in o else (c.x + 4.0, hi.z + 12.0)
    shot('primera-persona', (fx, eye, fz), (c.x, min(size.y * 0.5, 1.9), c.z), lens=22)
    shot('primera-persona-cerca', (c.x - 2.5, eye, hi.z + 5.0), (c.x + 1.0, min(size.y * 0.5, 1.8), c.z), lens=22)


main()
