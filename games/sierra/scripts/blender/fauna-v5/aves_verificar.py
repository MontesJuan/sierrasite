"""Re-import a fauna v5 GLB into an empty scene, print its facts and render previews.

    Blender -b --factory-startup --python aves_verificar.py -- \
        --glb <file.glb> --shots <png folder> --kind condor|ave|culebra

Prints one `V5_VERIFY {json}` line: file facts read from the GLB container plus
what Blender sees after import (triangles, bones, clips, loop error per clip).
"""
import json
import os
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import aves_lib as L  # noqa: E402

SHOTS = {   # name: (camera direction from the subject, clip or None, frame, light from below)
    'condor': [('top', (-.001, 0, 1), None, 1), ('underside', (.001, 0, -1), None, 1),
               ('threequarter', (1, -.8, .55), None, 1), ('below_soar', (.5, -.5, -1), 'Soar', 30),
               ('front_soar', (1, 0, .12), 'Soar', 37), ('flap_up', (1, -.8, .35), 'Flap', 9),
               ('flap_down', (1, -.8, .35), 'Flap', 27), ('flap_below', (.6, -.5, -1), 'Flap', 20)],
    'ave': [('side', (0, -1, 0), None, 1), ('threequarter', (1, -1, .4), None, 1),
            ('front', (1, 0, .1), None, 1), ('back', (-1, .6, .5), None, 1),
            ('walk_a', (.5, -1, .25), 'Walk', 7), ('walk_b', (.5, -1, .25), 'Walk', 19),
            ('peck', (.3, -1, .15), 'Peck', 13), ('idle', (1, -.7, .3), 'Idle', 20)],
    'culebra': [('side', (0, -1, .25), None, 1), ('threequarter', (1, -1, .7), None, 1),
                ('front', (1, -.15, .25), None, 1), ('top', (0, 0, 1), None, 1),
                ('slither_a', (.3, -1, 1), 'Slither', 7), ('slither_b', (.3, -1, 1), 'Slither', 31),
                ('idle', (1, -1, .5), 'Idle', 40)],
}


def main():
    glb = Path(L.arg('--glb'))
    shots = Path(L.arg('--shots'))
    kind = L.arg('--kind', default='ave')
    shots.mkdir(parents=True, exist_ok=True)
    scene = L.reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    meshes = [o for o in scene.objects if o.type == 'MESH' and o.vertex_groups]
    for o in scene.objects:                 # the importer adds a bone-shape helper mesh
        o.hide_render = o.type == 'MESH' and o not in meshes
    rig = next(o for o in scene.objects if o.type == 'ARMATURE')
    ad = rig.animation_data
    for t in ad.nla_tracks:
        t.mute = True
    clips = {a.name.split('.')[0].replace('_' + rig.name, ''): a for a in bpy.data.actions}

    def play(name, frame):
        ad.action = clips[name] if name else None
        if name and ad.action_slot is None:
            ad.action_slot = ad.action.slots[0]
        if not name:
            for p in rig.pose.bones:
                p.rotation_quaternion = (1, 0, 0, 0)
                p.location = (0, 0, 0)
        scene.frame_set(frame)
        bpy.context.view_layer.update()

    def pose_state():
        return [v for p in rig.pose.bones for row in p.matrix for v in row]

    report = dict(L.glb_info(glb))
    report['blender'] = {
        'triangles': sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons),
        'mesh_objects': len(meshes), 'bones': len(rig.data.bones), 'clips': {},
        'texture': [list(i.size) for i in bpy.data.images if i.size[0]],
    }
    root = next(b for b in rig.pose.bones if b.parent is None)
    for name, act in sorted(clips.items()):
        a, b = (int(round(v)) for v in act.frame_range)
        play(name, a)
        first, root_at = pose_state(), root.matrix.translation.copy()
        drift = 0
        for f in range(a, b + 1):
            scene.frame_set(f)
            drift = max(drift, (root.matrix.translation - root_at).length)
        last = pose_state()
        report['blender']['clips'][name] = {
            'frames': b - a + 1, 'seconds': round((b - a) / scene.render.fps, 3),
            'loop_error': round(max(abs(p - q) for p, q in zip(first, last)), 6),
            'root_travel': round(drift, 6)}
    print('V5_VERIFY', json.dumps(report))

    # ---- stage: neutral backdrop, sun + soft fills
    world = bpy.data.worlds.new('backdrop')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.42, .45, .5, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .9
    scene.world = world
    for name, energy, direction in (('sun', 3.2, (.5, -.6, 1)), ('fill', 1.0, (-.6, .8, .3)), ('bounce', 1.3, (.2, .3, -1))):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
        light.data.energy = energy
        light.rotation_euler = Vector(direction).to_track_quat('Z', 'Y').to_euler()
        scene.collection.objects.link(light)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 900, 675
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'Standard'
    for engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'BLENDER_WORKBENCH'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    if scene.render.engine == 'BLENDER_WORKBENCH':
        scene.display.shading.color_type = 'TEXTURE'
    print('V5_ENGINE', scene.render.engine)

    aspect = scene.render.resolution_x / scene.render.resolution_y
    extra = L.arg('--extra')    # JSON [[name, direction, clip, frame, [target xyz, width]], ...] for close-ups
    for name, direction, clip, frame, *close in (json.loads(extra) if extra else SHOTS[kind]):
        play(clip, frame)
        deps = bpy.context.evaluated_depsgraph_get()
        pts = [o.matrix_world @ v.co for o in meshes for v in o.evaluated_get(deps).data.vertices]
        d = Vector(direction).normalized()
        cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        right, up = cam.matrix_world.col[0].xyz, cam.matrix_world.col[1].xyz
        us, vs = [p.dot(right) for p in pts], [p.dot(up) for p in pts]
        centre = right * (min(us) + max(us)) / 2 + up * (min(vs) + max(vs)) / 2 + d * max(p.dot(d) for p in pts)
        cam.location = centre + d * 10
        cam.data.ortho_scale = 1.12 * max(max(us) - min(us), (max(vs) - min(vs)) * aspect)
        cam.data.clip_end = 50
        if close:
            cam.location = Vector(close[0][:3]) + d * 10
            cam.data.ortho_scale = close[0][3]
        scene.render.filepath = str(shots / (glb.stem + '_' + name + '.png'))
        bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
