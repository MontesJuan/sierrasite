"""SIERRA fauna v5 — verificación de un GLB exportado (Blender 5.x, headless).

Reimporta el archivo en una escena vacía, imprime una línea `V5STATS {json}`
(triángulos, huesos, clips, caja) y renderiza vistas previas con EEVEE.
  Blender -b --factory-startup --python cuadrupedos_verify.py -- \
      --glb modelo.glb --outdir carpeta --name cabra [--shots lado,frente,34,arriba,Walk,Graze,Idle] [--res 900]
      [--clipview lado|arriba] [--lens 60]
"""
import bpy
import json
import math
import os
import sys

from mathutils import Vector


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:]
    opt = {'shots': 'lado,34,frente,arriba,Walk,Graze,Idle', 'res': '900', 'clipview': 'lado', 'lens': '60'}
    for i in range(0, len(argv) - 1, 2):
        opt[argv[i].lstrip('-')] = argv[i + 1]
    return opt


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def main():
    opt = parse_args()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=opt['glb'])
    scene = bpy.context.scene
    for o in [o for o in scene.objects if o.type == 'MESH' and o.name.startswith('Icosphere')]:
        bpy.data.objects.remove(o, do_unlink=True)  # forma de hueso que crea el importador
    meshes = [o for o in scene.objects if o.type == 'MESH']
    rigs = [o for o in scene.objects if o.type == 'ARMATURE']
    rig = rigs[0] if rigs else None
    actions = sorted(a.name for a in bpy.data.actions)
    stats = dict(file=os.path.basename(opt['glb']), bytes=os.path.getsize(opt['glb']), meshes={}, bones=len(rig.data.bones) if rig else 0,
                 actions={a.name: [round(a.frame_range[0], 2), round(a.frame_range[1], 2)] for a in bpy.data.actions}, fps=scene.render.fps)
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for m in meshes:
        tris = sum(len(p.vertices) - 2 for p in m.data.polygons)
        mlo = Vector((1e9,) * 3); mhi = Vector((-1e9,) * 3)
        for v in m.data.vertices:
            w = m.matrix_world @ v.co
            for k in range(3):
                mlo[k] = min(mlo[k], w[k]); mhi[k] = max(mhi[k], w[k])
        for k in range(3):
            lo[k] = min(lo[k], mlo[k]); hi[k] = max(hi[k], mhi[k])
        stats['meshes'][m.name] = dict(triangles=tris, vertices=len(m.data.vertices), groups=len(m.vertex_groups),
                                       min=[round(c, 4) for c in mlo], max=[round(c, 4) for c in mhi],
                                       materials=[s.material.name for s in m.material_slots if s.material])
    stats['bbox_blender_zup'] = dict(min=[round(c, 4) for c in lo], max=[round(c, 4) for c in hi])
    print('V5STATS ' + json.dumps(stats))
    if opt.get('outdir') is None:
        return
    os.makedirs(opt['outdir'], exist_ok=True)
    # escena de render: suelo neutro, sol + relleno suave
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.62, .64, .68, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.55
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    plane = bpy.context.object
    pm = bpy.data.materials.new('suelo'); pm.use_nodes = True
    pm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.42, .42, .40, 1)
    pm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    plane.data.materials.append(pm)
    sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); scene.collection.objects.link(sun)
    sun.data.energy = 3.2; sun.data.angle = math.radians(6)
    sun.rotation_euler = (math.radians(52), math.radians(8), math.radians(-28))
    fill = bpy.data.objects.new('relleno', bpy.data.lights.new('relleno', 'SUN')); scene.collection.objects.link(fill)
    fill.data.energy = 0.9; fill.data.use_shadow = False
    fill.rotation_euler = (math.radians(60), 0, math.radians(150))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
    scene.camera = cam
    size = hi - lo
    center = (lo + hi) / 2
    res = int(opt['res'])
    span = max(size.x, size.z * 1.35) * 1.12

    def shot(view, label):
        cam.data.type = 'ORTHO'
        scene.render.resolution_x = res; scene.render.resolution_y = int(res * .72)
        cam.data.ortho_scale = span
        tgt = Vector((center.x, center.y, center.z))
        if view == 'lado':
            cam.location = (center.x, -8, center.z)
        elif view == 'frente':
            cam.location = (8, center.y, center.z); cam.data.ortho_scale = max(size.y * 2.2, size.z * 1.5)
            scene.render.resolution_x = int(res * .6); scene.render.resolution_y = int(res * .72)
        elif view == 'arriba':
            cam.location = (center.x, center.y, 8); cam.data.ortho_scale = span
        elif view == '34':
            cam.data.type = 'PERSP'; cam.data.lens = float(opt['lens'])
            d = max(size.x, size.z) * 2.3
            cam.location = (center.x + d * .78, center.y - d * .62, center.z + d * .22)
        elif view == '34atras':
            cam.data.type = 'PERSP'; cam.data.lens = float(opt['lens'])
            d = max(size.x, size.z) * 2.3
            cam.location = (center.x - d * .70, center.y - d * .62, center.z + d * .45)
        look_at(cam, tgt)
        if view == 'arriba':
            cam.rotation_euler = (0, 0, 0)
        scene.render.filepath = os.path.join(opt['outdir'], '%s_%s.png' % (opt['name'], label))
        bpy.ops.render.render(write_still=True)

    def set_clip(clip, frac):
        act = next(a for a in bpy.data.actions if a.name.split('_')[0].split('.')[0] == clip or a.name.startswith(clip))
        ad = rig.animation_data or rig.animation_data_create()
        for tr in ad.nla_tracks:
            tr.mute = True
        ad.action = act
        if hasattr(ad, 'action_slot') and act.slots:
            ad.action_slot = act.slots[0]
        f0, f1 = act.frame_range
        f = f0 + (f1 - f0) * frac
        scene.frame_set(int(f), subframe=f - int(f))

    for s in opt['shots'].split(','):
        if s in ('lado', 'frente', 'arriba', '34', '34atras'):
            if rig and rig.animation_data:
                rig.animation_data.action = None
                for tr in rig.animation_data.nla_tracks:
                    tr.mute = True
                for pb in rig.pose.bones:
                    pb.matrix_basis.identity()
            shot(s, s)
        elif rig:
            if not any(a.startswith(s) for a in actions):
                continue
            fr = [0.0, .125, .25, .375, .5, .625, .75, .875] if s == 'Walk' else [0.0, .2, .4, .6, .8]
            for i, f in enumerate(fr):
                set_clip(s, f)
                shot(opt['clipview'], '%s_%d' % (s, i))
            set_clip(s, 0.3)
            shot('34', '%s_34' % s)
            set_clip(s, 0.55)
            shot('34atras', '%s_34atras' % s)


if __name__ == '__main__':
    main()
