"""SIERRA fauna generator for Blender SAFE MODE. Paste complete script into approved execute_blender_code. Only Blender export writes files. The output directory must already exist. Creates new scenes, preserves existing scenes, never disables safe mode. Geometry is authored and documentary-inspired, not scanned. Change ASSETS to select a subset."""
ASSETS = ['mule', 'goat', 'chicken', 'iguana', 'pickup']

def chicken_walk(r, t):
    p = math.tau * t
    for label, phase in [('L', 0), ('R', math.pi)]:
        s = math.sin(p + phase)
        r.pose.bones['leg.' + label].rotation_euler[2] = 0.48 * s
        r.pose.bones['foot.' + label].rotation_euler[2] = -0.6 * max(0, s)
    r.pose.bones['neck'].rotation_euler[2] = 0.13 * math.sin(2 * p)
    r.pose.bones['head'].rotation_euler[2] = -0.09 * math.sin(2 * p)
    r.pose.bones['body'].location[0] = 0.006 * math.cos(2 * p)
    r.pose.bones['tail'].rotation_euler[0] = 0.06 * math.sin(p)

def chicken_peck(r, t):
    bend = max(0, math.sin(math.tau * t)) ** 3
    r.pose.bones['body'].rotation_euler[2] = -0.18 * bend
    r.pose.bones['neck'].rotation_euler[2] = -0.8 * bend
    r.pose.bones['head'].rotation_euler[2] = -0.25 * bend

def iguana_walk(r, t):
    p = math.tau * t
    for leg, off in [('FL', 0), ('RR', 0), ('FR', math.pi), ('RL', math.pi)]:
        s = math.sin(p + off)
        r.pose.bones[leg + '.upper'].rotation_euler[0] = 0.25 * s
        r.pose.bones[leg + '.upper'].rotation_euler[2] = 0.3 * s
        r.pose.bones[leg + '.lower'].rotation_euler[2] = -0.25 * max(0, s)
    r.pose.bones['body'].rotation_euler[0] = 0.045 * math.sin(p)
    for i, n in enumerate(['tail', 'tail.2', 'tail.3']):
        r.pose.bones[n].rotation_euler[0] = 0.18 * math.sin(p - i * 0.5)
    r.pose.bones['head'].rotation_euler[0] = -0.05 * math.sin(p)

def pickup_drive(r, t):
    for name in ['FL', 'FR', 'RL', 'RR']:
        r.pose.bones['wheel.' + name].rotation_euler[1] = -math.tau * t
    r.pose.bones['body'].location[0] = 0.008 * math.sin(math.tau * t * 2)
import bpy
import math
import random
import json
from mathutils import Vector
OUT = bpy.path.abspath('//models')  # Create this directory alongside the saved .blend before running.
PREFIX = 'SIERRA_V2_'
FPS = 24
CONTEXT = {'scene': None}
MATERIALS = {}

def srgb(rgb):
    return tuple((c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb))

def material(name, rgb, roughness=0.65, metallic=0, texture=False):
    key = (name, tuple(rgb), roughness, metallic, texture)
    if key in MATERIALS:
        return MATERIALS[key]
    m = bpy.data.materials.new(PREFIX + name)
    m.use_nodes = True
    p = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'))
    color = srgb(rgb)
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    m.diffuse_color = (*color, 1)
    if 'Specular IOR Level' in p.inputs:
        p.inputs['Specular IOR Level'].default_value = 0.3
    if texture:
        size = 256
        rng = random.Random(sum((ord(c) for c in name)))
        pixels = []
        for y in range(size):
            for x in range(size):
                fine = rng.uniform(-0.055, 0.055)
                waves = 0.025 * math.sin(x * 0.28) + 0.018 * math.sin(y * 0.15 + x * 0.1)
                f = 1 + fine + waves
                pixels.extend([max(0, min(1, c * f)) for c in color] + [1])
        img = bpy.data.images.new(PREFIX + name + '_albedo', width=size, height=size)
        img.colorspace_settings.name = 'sRGB'
        img.pixels.foreach_set(pixels)
        img.pack()
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = img
        m.node_tree.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    MATERIALS[key] = m
    return m

def new_scene(name):
    scene = bpy.data.scenes.new(PREFIX + name)
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = (1, 49)
    scene['asset_kind'] = 'authored documentary-inspired geometry; not photogrammetry'
    scene['build_script'] = 'scripts/blender/build-fauna.py'
    if bpy.context.window:
        bpy.context.window.scene = scene
    CONTEXT['scene'] = scene
    return scene

def active(obj):
    for o in list(bpy.context.selected_objects):
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def finalize(obj, name, mat, rig=None, bone=None, smooth=True):
    obj.name = PREFIX + name
    if mat:
        obj.data.materials.append(mat)
    active(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if smooth and obj.type == 'MESH':
        for poly in obj.data.polygons:
            poly.use_smooth = True
    if rig is not None:
        obj.parent = rig
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
        mod = obj.modifiers.new('Armature deformation', 'ARMATURE')
        mod.object = rig
        mod.use_vertex_groups = True
    return obj

def ellipsoid(name, center, scale, mat, rig=None, bone=None, rotation=None, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    o = bpy.context.object
    o.scale = scale
    if rotation:
        o.rotation_euler = rotation
    return finalize(o, name, mat, rig, bone)

def between(name, a, b, widths, mat, rig=None, bone=None):
    a, b = (Vector(a), Vector(b))
    d = b - a
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=(a + b) / 2)
    o = bpy.context.object
    o.scale = (widths[0], widths[1], d.length / 2 + min(widths) * 0.35)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return finalize(o, name, mat, rig, bone)

def cylinder(name, a, b, radius, mat, rig=None, bone=None, vertices=12):
    a, b = (Vector(a), Vector(b))
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return finalize(o, name, mat, rig, bone)

def cone_between(name, a, b, radius1, radius2, mat, rig=None, bone=None):
    a, b = (Vector(a), Vector(b))
    d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=radius1, radius2=radius2, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return finalize(o, name, mat, rig, bone)

def box(name, center, scale, mat, rig=None, bone=None, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object
    o.scale = scale
    active(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new('Rounded edges', 'BEVEL')
        m.width = bevel
        m.segments = 3
        bpy.ops.object.modifier_apply(modifier=m.name)
    return finalize(o, name, mat, rig, bone)

def tube(name, points, radius, mat, rig=None, bone=None):
    curve = bpy.data.curves.new(PREFIX + name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 4
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    sp = curve.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, co in zip(sp.bezier_points, points):
        bp.co = co
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(PREFIX + name, curve)
    CONTEXT['scene'].collection.objects.link(obj)
    active(obj)
    bpy.ops.object.convert(target='MESH')
    return finalize(bpy.context.object, name, mat, rig, bone)

def loft_body(name, sections, mat, rig, bone):
    n = 32
    verts = []
    faces = []
    for x, z, ry, rz in sections:
        for k in range(n):
            a = 2 * math.pi * k / n
            verts.append((x, math.cos(a) * ry, z + math.sin(a) * rz))
    for i in range(len(sections) - 1):
        for k in range(n):
            a = i * n + k
            b = i * n + (k + 1) % n
            c = (i + 1) * n + (k + 1) % n
            d = (i + 1) * n + k
            faces.append((a, b, c, d))
    faces.extend([tuple(reversed(range(n))), tuple(((len(sections) - 1) * n + k for k in range(n)))])
    mesh = bpy.data.meshes.new(PREFIX + name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(PREFIX + name, mesh)
    CONTEXT['scene'].collection.objects.link(obj)
    uv = mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        for li in face.loop_indices:
            idx = mesh.loops[li].vertex_index
            uv.data[li].uv = (idx // n / max(1, len(sections) - 1), idx % n / n)
    active(obj)
    sub = obj.modifiers.new('Organic surface', 'SUBSURF')
    sub.levels = 1
    sub.render_levels = 1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    return finalize(obj, name, mat, rig, bone)

def armature(name, spec):
    data = bpy.data.armatures.new(PREFIX + name + '_skeleton')
    rig = bpy.data.objects.new(PREFIX + name + '_rig', data)
    CONTEXT['scene'].collection.objects.link(rig)
    active(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    for key, head, tail, parent in spec:
        b = data.edit_bones.new(key)
        b.head = head
        b.tail = tail
        b.align_roll(Vector((0, 1, 0)))
        if parent:
            b.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in rig.pose.bones:
        p.rotation_mode = 'XYZ'
    rig['forward_axis'] = '+X'
    rig['up_axis'] = '+Z'
    return rig

def clear_pose(rig):
    for p in rig.pose.bones:
        p.rotation_euler = (0, 0, 0)
        p.location = (0, 0, 0)
        p.scale = (1, 1, 1)

def animate(rig, name, end, kind, stride=0.35):
    clear_pose(rig)
    rig.animation_data_create()
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    for frame in range(1, end + 1):
        t = (frame - 1) / (end - 1)
        if kind == 'idle':
            standard_idle(rig, t)
        elif kind == 'quadruped':
            quadruped_walk(rig, t, stride)
        elif kind == 'chicken_walk':
            chicken_walk(rig, t)
        elif kind == 'chicken_peck':
            chicken_peck(rig, t)
        elif kind == 'iguana_walk':
            iguana_walk(rig, t)
        elif kind == 'pickup_drive':
            pickup_drive(rig, t)
        else:
            raise ValueError('Unknown animation kind')
        for b in rig.pose.bones:
            b.keyframe_insert('rotation_euler', frame=frame, group=b.name)
            b.keyframe_insert('location', frame=frame, group=b.name)
            if b.name == 'body':
                b.keyframe_insert('scale', frame=frame, group=b.name)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, action)
    strip.name = name
    track.mute = True
    rig.animation_data.action = None
    clear_pose(rig)
    return action

def standard_idle(rig, t):
    phase = math.tau * t
    b = rig.pose.bones.get('body')
    if b:
        b.scale = (1 + 0.008 * math.sin(phase), 1, 1 + 0.012 * math.sin(phase))
    h = rig.pose.bones.get('head')
    if h:
        h.rotation_euler[2] = 0.025 * math.sin(phase)
    for n in ['ear.L', 'ear.R']:
        p = rig.pose.bones.get(n)
        if p:
            p.rotation_euler[0] = 0.07 * math.sin(phase + (0 if n.endswith('L') else 1.8))
    tail = rig.pose.bones.get('tail')
    if tail:
        tail.rotation_euler[0] = 0.12 * math.sin(phase)

def quadruped_walk(rig, t, stride=0.35):
    phase = math.tau * t
    offsets = {'FL': 0, 'RR': 0.25, 'FR': 0.5, 'RL': 0.75}
    for limb, offset in offsets.items():
        p = math.tau * ((t + offset) % 1)
        s = math.sin(p)
        lift = max(0, s)
        rig.pose.bones[limb + '.upper'].rotation_euler[2] = stride * s
        rig.pose.bones[limb + '.lower'].rotation_euler[2] = -0.52 * lift
        rig.pose.bones[limb + '.foot'].rotation_euler[2] = 0.25 * lift - 0.08 * s
    rig.pose.bones['body'].location[0] = 0.013 * math.sin(phase * 2)
    rig.pose.bones['body'].rotation_euler[1] = 0.018 * math.sin(phase)
    rig.pose.bones['neck'].rotation_euler[2] = 0.04 * math.sin(phase + 0.3)
    rig.pose.bones['head'].rotation_euler[2] = -0.045 * math.sin(phase + 0.3)
    rig.pose.bones['tail'].rotation_euler[0] = 0.1 * math.sin(phase + 0.8)
    for n, off in [('ear.L', 0), ('ear.R', 0.7)]:
        rig.pose.bones[n].rotation_euler[0] = 0.045 * math.sin(phase + off)

def mule():
    new_scene('mule')
    coat = material('mule_brown', (0.29, 0.245, 0.19), 0.85, texture=True)
    shade = material('mule_dark_brown', (0.2, 0.175, 0.145), 0.9, texture=True)
    muzzle = material('mule_muzzle', (0.47, 0.45, 0.4), 0.85, texture=True)
    dark = material('mule_mane', (0.075, 0.064, 0.052), 0.9)
    hoof = material('hoof_horn', (0.13, 0.115, 0.095), 0.8)
    inner = material('mule_inner_ear', (0.4, 0.32, 0.27), 0.92)
    eye = material('animal_eye', (0.055, 0.039, 0.025), 0.09)
    nostril = material('nostril', (0.04, 0.033, 0.028), 0.94)
    leather = material('harness_leather', (0.19, 0.105, 0.045), 0.65, texture=True)
    cloth = material('saddle_woven_cloth', (0.55, 0.49, 0.36), 0.98, texture=True)
    steel = material('weathered_buckle', (0.45, 0.44, 0.41), 0.35, 0.8)
    bone = [('body', (-0.55, 0, 1.18), (0.55, 0, 1.18), None), ('neck', (0.5, 0, 1.38), (0.96, 0, 1.98), 'body'), ('head', (0.96, 0, 1.98), (1.43, 0, 1.7), 'neck'), ('ear.L', (0.96, 0.12, 2.08), (1.02, 0.16, 2.52), 'head'), ('ear.R', (0.96, -0.12, 2.08), (1.02, -0.16, 2.52), 'head'), ('tail', (-0.72, 0, 1.45), (-0.94, 0, 0.89), 'body'), ('tail.tip', (-0.94, 0, 0.89), (-1.01, 0, 0.44), 'tail')]
    joints = {}
    for leg, x, y in [('FL', 0.49, 0.24), ('FR', 0.49, -0.24), ('RL', -0.52, 0.25), ('RR', -0.52, -0.25)]:
        rear = leg[0] == 'R'
        a = (x, y, 1.2)
        b = (x + (-0.11 if rear else 0.01), y, 0.72)
        c = (x + (0.06 if rear else -0.035), y, 0.23)
        d = (c[0] + 0.045, y, 0.075)
        joints[leg] = (a, b, c, d)
        bone.extend([(leg + '.upper', a, b, 'body'), (leg + '.lower', b, c, leg + '.upper'), (leg + '.foot', c, d, leg + '.lower')])
    rig = armature('mule', bone)
    loft_body('mule_barrel', [(-0.85, 1.27, 0.09, 0.17), (-0.65, 1.3, 0.27, 0.39), (-0.3, 1.24, 0.335, 0.39), (0.12, 1.25, 0.32, 0.39), (0.46, 1.33, 0.28, 0.38), (0.66, 1.38, 0.17, 0.27)], coat, rig, 'body')
    ellipsoid('mule_chest', (0.43, 0, 1.17), (0.26, 0.26, 0.34), coat, rig, 'body')
    for side in [-1, 1]:
        ellipsoid('mule_haunch', (-0.57, side * 0.2, 1.27), (0.25, 0.17, 0.33), coat, rig, 'body', rotation=(0, -0.15, 0))
        ellipsoid('mule_shoulder', (0.48, side * 0.21, 1.3), (0.18, 0.14, 0.34), coat, rig, 'body', rotation=(0, 0.25, 0))
    between('mule_neck', (0.44, 0, 1.35), (0.95, 0, 1.99), (0.245, 0.2), coat, rig, 'neck')
    between('mule_throat', (0.7, 0, 1.46), (1.02, 0, 1.92), (0.14, 0.15), shade, rig, 'neck')
    between('mule_head', (1.0, 0, 1.98), (1.39, 0, 1.7), (0.145, 0.175), coat, rig, 'head')
    ellipsoid('mule_muzzle', (1.43, 0, 1.69), (0.16, 0.145, 0.12), muzzle, rig, 'head', rotation=(0, 0.25, 0))
    ellipsoid('mule_jaw', (1.23, 0, 1.68), (0.18, 0.14, 0.1), shade, rig, 'head')
    tube('mule_lips', [(1.45, -0.12, 1.646), (1.55, 0, 1.637), (1.45, 0.12, 1.646)], 0.008, dark, rig, 'head')
    for side, label in [(1, 'L'), (-1, 'R')]:
        ellipsoid('mule_nostril', (1.49, side * 0.118, 1.744), (0.055, 0.018, 0.028), nostril, rig, 'head', rotation=(0, 0.15, side * 0.18))
        ellipsoid('mule_eye_socket', (1.12, side * 0.155, 1.94), (0.065, 0.038, 0.055), shade, rig, 'head')
        ellipsoid('mule_eye', (1.13, side * 0.18, 1.944), (0.035, 0.02, 0.029), eye, rig, 'head')
        ellipsoid('mule_brow', (1.11, side * 0.162, 1.985), (0.07, 0.025, 0.019), coat, rig, 'head')
        between('mule_long_ear', (0.95, side * 0.12, 2.09), (1.015, side * 0.17, 2.5), (0.068, 0.042), coat, rig, 'ear.' + label)
        between('mule_ear_inner', (0.975, side * 0.132, 2.15), (1.035, side * 0.176, 2.46), (0.043, 0.024), inner, rig, 'ear.' + label)
    for i in range(14):
        t = i / 13
        x = 0.42 + 0.43 * t
        z = 1.64 + 0.42 * t
        ellipsoid('mule_mane_crest', (x - 0.06, 0, z), (0.047, 0.043, 0.085), dark, rig, 'neck', rotation=(0, -0.42, 0), segments=12, rings=8)
    for leg, (a, b, c, d) in joints.items():
        between('mule_' + leg + '_muscle', a, b, (0.105, 0.1), coat, rig, leg + '.upper')
        ellipsoid('mule_' + leg + '_knee', b, (0.072, 0.078, 0.083), shade, rig, leg + '.lower')
        between('mule_' + leg + '_cannon', b, c, (0.048, 0.055), shade, rig, leg + '.lower')
        ellipsoid('mule_' + leg + '_fetlock', c, (0.064, 0.066, 0.075), shade, rig, leg + '.foot')
        ellipsoid('mule_' + leg + '_hoof', (d[0] + 0.018, d[1], 0.08), (0.09, 0.075, 0.08), hoof, rig, leg + '.foot', segments=20, rings=10)
        tube('mule_' + leg + '_tendon', [(b[0] - 0.04, b[1], b[2]), (c[0] - 0.025, c[1], c[2] + 0.05)], 0.017, shade, rig, leg + '.lower')
    between('mule_tail', (-0.75, 0, 1.47), (-0.95, 0, 0.88), (0.04, 0.047), coat, rig, 'tail')
    between('mule_tail_tuft', (-0.95, 0, 0.91), (-1.01, 0, 0.47), (0.055, 0.07), dark, rig, 'tail.tip')
    for i in range(7):
        off = (i - 3) * 0.012
        tube('mule_tail_hair', [(-0.95, off, 0.91), (-0.99, off, 0.65), (-1.04, off, 0.43)], 0.008, dark, rig, 'tail.tip')
    box('mule_saddle_blanket', (-0.05, 0, 1.62), (0.78, 0.66, 0.065), cloth, rig, 'body', 0.04)
    box('mule_saddle_seat', (-0.03, 0, 1.7), (0.5, 0.4, 0.1), leather, rig, 'body', 0.06)
    ellipsoid('mule_pommel', (0.21, 0, 1.76), (0.07, 0.23, 0.095), leather, rig, 'body')
    ellipsoid('mule_cantle', (-0.29, 0, 1.77), (0.065, 0.23, 0.11), leather, rig, 'body')
    for side in [-1, 1]:
        box('mule_saddle_bag', (-0.34, side * 0.4, 1.29), (0.43, 0.16, 0.46), cloth, rig, 'body', 0.055)
        box('mule_bag_flap', (-0.34, side * 0.49, 1.47), (0.45, 0.035, 0.17), leather, rig, 'body', 0.018)
        for x in [-0.48, -0.22]:
            box('mule_bag_strap', (x, side * 0.497, 1.3), (0.032, 0.025, 0.35), leather, rig, 'body', 0.009)
            box('mule_bag_buckle', (x, side * 0.515, 1.32), (0.052, 0.012, 0.058), steel, rig, 'body', 0.006)
        tube('mule_stirrup_strap', [(0.08, side * 0.23, 1.72), (0.09, side * 0.39, 1.28), (0.08, side * 0.4, 1.0)], 0.015, leather, rig, 'body')
        tube('mule_stirrup', [(0.08, side * 0.4, 1.0), (-0.015, side * 0.4, 0.91), (0.08, side * 0.4, 0.88), (0.175, side * 0.4, 0.91), (0.08, side * 0.4, 1.0)], 0.014, steel, rig, 'body')
        tube('mule_cheekstrap', [(0.99, side * 0.165, 2.06), (1.12, side * 0.178, 1.91), (1.41, side * 0.148, 1.7)], 0.018, leather, rig, 'head')
        tube('mule_rein', [(1.4, side * 0.16, 1.69), (1.08, side * 0.22, 1.49), (0.42, side * 0.25, 1.61), (0.1, side * 0.22, 1.72)], 0.011, leather, rig, 'body')
    tube('mule_noseband', [(1.43, -0.15, 1.71), (1.51, 0, 1.78), (1.43, 0.15, 1.71)], 0.02, leather, rig, 'head')
    tube('mule_browband', [(1.05, -0.16, 2.02), (1.09, 0, 2.09), (1.05, 0.16, 2.02)], 0.018, leather, rig, 'head')
    tube('mule_girth', [(0.08, -0.29, 1.56), (0.08, -0.33, 1.15), (0.08, 0, 0.91), (0.08, 0.33, 1.15), (0.08, 0.29, 1.56)], 0.025, leather, rig, 'body')
    animate(rig, 'Walk', 33, 'quadruped')
    animate(rig, 'Idle', 73, 'idle')
    return rig

def goat():
    new_scene('goat')
    coat = material('goat_cream', (0.74, 0.71, 0.61), 0.9, texture=True)
    brown = material('goat_markings', (0.25, 0.2, 0.14), 0.9, texture=True)
    horn = material('goat_horn', (0.35, 0.32, 0.25), 0.75)
    eye = material('goat_eye', (0.3, 0.2, 0.07), 0.15)
    black = material('goat_pupil', (0.026, 0.023, 0.019), 0.16)
    hoof = material('goat_hoof', (0.14, 0.13, 0.11), 0.85)
    inner = material('goat_inner_ear', (0.54, 0.39, 0.32), 0.9)
    spec = [('body', (-0.3, 0, 0.66), (0.3, 0, 0.66), None), ('neck', (0.26, 0, 0.72), (0.53, 0, 0.97), 'body'), ('head', (0.53, 0, 0.97), (0.76, 0, 0.91), 'neck'), ('tail', (-0.43, 0, 0.77), (-0.57, 0, 0.98), 'body'), ('ear.L', (0.55, 0.09, 0.99), (0.6, 0.28, 0.98), 'head'), ('ear.R', (0.55, -0.09, 0.99), (0.6, -0.28, 0.98), 'head')]
    joints = {}
    for leg, x, y in [('FL', 0.26, 0.14), ('FR', 0.26, -0.14), ('RL', -0.28, 0.15), ('RR', -0.28, -0.15)]:
        a = (x, y, 0.64)
        b = (x + (-0.08 if leg[0] == 'R' else 0.015), y, 0.34)
        c = (x, y, 0.12)
        d = (x + 0.03, y, 0.045)
        joints[leg] = (a, b, c, d)
        spec.extend([(leg + '.upper', a, b, 'body'), (leg + '.lower', b, c, leg + '.upper'), (leg + '.foot', c, d, leg + '.lower')])
    rig = armature('goat', spec)
    loft_body('goat_body', [(-0.48, 0.67, 0.06, 0.13), (-0.35, 0.66, 0.19, 0.22), (-0.05, 0.62, 0.225, 0.25), (0.23, 0.68, 0.185, 0.23), (0.35, 0.73, 0.09, 0.12)], coat, rig, 'body')
    between('goat_neck', (0.25, 0, 0.69), (0.52, 0, 0.96), (0.14, 0.12), coat, rig, 'neck')
    between('goat_head', (0.52, 0, 0.99), (0.74, 0, 0.89), (0.1, 0.11), coat, rig, 'head')
    ellipsoid('goat_nose', (0.77, 0, 0.875), (0.07, 0.09, 0.056), brown, rig, 'head')
    for side, label in [(1, 'L'), (-1, 'R')]:
        ellipsoid('goat_cheek', (0.58, side * 0.085, 0.92), (0.095, 0.04, 0.09), brown, rig, 'head')
        ellipsoid('goat_eye', (0.62, side * 0.107, 0.982), (0.033, 0.018, 0.028), eye, rig, 'head')
        box('goat_horizontal_pupil', (0.625, side * 0.123, 0.982), (0.039, 0.007, 0.008), black, rig, 'head', 0.003)
        between('goat_ear', (0.55, side * 0.09, 1.0), (0.6, side * 0.28, 0.97), (0.065, 0.035), coat, rig, 'ear.' + label)
        between('goat_ear_inner', (0.56, side * 0.12, 1.012), (0.605, side * 0.25, 0.987), (0.042, 0.02), inner, rig, 'ear.' + label)
        tube('goat_horn', [(0.49, side * 0.07, 1.06), (0.46, side * 0.09, 1.19), (0.37, side * 0.11, 1.28), (0.29, side * 0.11, 1.27)], 0.023, horn, rig, 'head')
        cone_between('goat_horn_tip', (0.29, side * 0.11, 1.27), (0.25, side * 0.11, 1.24), 0.021, 0.001, horn, rig, 'head')
        ellipsoid('goat_nostril', (0.804, side * 0.047, 0.895), (0.012, 0.009, 0.008), black, rig, 'head', segments=12, rings=8)
    for i in range(6):
        y = (i - 2.5) * 0.012
        between('goat_beard', (0.66, y, 0.86), (0.62, y, 0.71), (0.013, 0.015), brown, rig, 'head')
    for leg, (a, b, c, d) in joints.items():
        between('goat_' + leg + '_thigh', a, b, (0.058, 0.055), coat, rig, leg + '.upper')
        ellipsoid('goat_' + leg + '_joint', b, (0.045, 0.04, 0.05), brown, rig, leg + '.lower')
        between('goat_' + leg + '_shin', b, c, (0.027, 0.03), coat, rig, leg + '.lower')
        for side in [-1, 1]:
            ellipsoid('goat_' + leg + '_cloven_hoof', (d[0] + 0.009, d[1] + side * 0.018, 0.045), (0.045, 0.017, 0.043), hoof, rig, leg + '.foot', segments=14, rings=8)
    between('goat_tail', (-0.44, 0, 0.77), (-0.56, 0, 0.95), (0.055, 0.04), coat, rig, 'tail')
    animate(rig, 'Walk', 29, 'quadruped', 0.38)
    animate(rig, 'Idle', 73, 'idle')
    return rig

def chicken():
    new_scene('chicken')
    feather = material('hen_feathers', (0.5, 0.29, 0.12), 0.9, texture=True)
    light = material('hen_neck', (0.72, 0.49, 0.23), 0.85, texture=True)
    dark = material('hen_tail', (0.19, 0.16, 0.11), 0.77)
    red = material('hen_comb', (0.67, 0.045, 0.035), 0.72)
    beak = material('hen_beak', (0.65, 0.44, 0.12), 0.7)
    eye = material('hen_eye', (0.035, 0.025, 0.016), 0.12)
    legmat = material('hen_legs', (0.55, 0.38, 0.19), 0.84)
    spec = [('body', (-0.13, 0, 0.3), (0.13, 0, 0.3), None), ('neck', (0.11, 0, 0.37), (0.2, 0, 0.52), 'body'), ('head', (0.2, 0, 0.52), (0.27, 0, 0.53), 'neck'), ('tail', (-0.17, 0, 0.35), (-0.34, 0, 0.49), 'body'), ('wing.L', (0.02, 0.105, 0.37), (-0.13, 0.15, 0.26), 'body'), ('wing.R', (0.02, -0.105, 0.37), (-0.13, -0.15, 0.26), 'body')]
    for label, y in [('L', 0.065), ('R', -0.065)]:
        spec.extend([('leg.' + label, (0, y, 0.25), (0.025, y, 0.12), 'body'), ('foot.' + label, (0.025, y, 0.12), (0.075, y, 0.025), 'leg.' + label)])
    rig = armature('chicken', spec)
    ellipsoid('hen_body', (-0.01, 0, 0.3), (0.22, 0.14, 0.19), feather, rig, 'body')
    between('hen_neck', (0.1, 0, 0.38), (0.19, 0, 0.51), (0.09, 0.075), light, rig, 'neck')
    ellipsoid('hen_head', (0.22, 0, 0.53), (0.079, 0.058, 0.078), light, rig, 'head')
    cone_between('hen_beak', (0.27, 0, 0.53), (0.36, 0, 0.513), 0.035, 0.003, beak, rig, 'head')
    for side in [-1, 1]:
        ellipsoid('hen_eye', (0.25, side * 0.053, 0.554), (0.015, 0.008, 0.015), eye, rig, 'head', segments=14, rings=8)
        ellipsoid('hen_wattle', (0.265, side * 0.018, 0.468), (0.028, 0.012, 0.046), red, rig, 'head', segments=14, rings=10)
    for i in range(5):
        ellipsoid('hen_comb', (0.17 + i * 0.024, 0, 0.605 + (0.008 if i % 2 else 0)), (0.019, 0.015, 0.031), red, rig, 'head', segments=12, rings=8)
    for label, side in [('L', 1), ('R', -1)]:
        ellipsoid('hen_wing', (0, side * 0.125, 0.31), (0.16, 0.045, 0.105), feather, rig, 'wing.' + label, rotation=(0, -0.3, side * 0.05))
        for i in range(8):
            x = 0.11 - i * 0.031
            ellipsoid('hen_wing_feather', (x, side * (0.151 + i * 0.001), 0.3 - i * 0.006), (0.075, 0.012, 0.027), light if i % 3 == 0 else feather, rig, 'wing.' + label, rotation=(0, -0.45, 0), segments=12, rings=8)
    for i in range(7):
        y = (i - 3) * 0.023
        between('hen_tail_feather', (-0.13, y, 0.36), (-0.36, y * 1.5, 0.52 + (0.04 if i % 2 else 0)), (0.035, 0.018), dark, rig, 'tail')
    for label, y in [('L', 0.065), ('R', -0.065)]:
        between('hen_thigh', (0, y, 0.25), (0.025, y, 0.12), (0.027, 0.026), light, rig, 'leg.' + label)
        cylinder('hen_shank', (0.025, y, 0.15), (0.04, y, 0.035), 0.012, legmat, rig, 'foot.' + label)
        for dy in [-0.035, 0, 0.035]:
            tube('hen_toe', [(0.04, y, 0.035), (0.1, y + dy, 0.022), (0.14, y + dy * 1.2, 0.018)], 0.008, legmat, rig, 'foot.' + label)
        tube('hen_hind_toe', [(0.04, y, 0.035), (-0.01, y, 0.02)], 0.007, legmat, rig, 'foot.' + label)
    animate(rig, 'Walk', 25, 'chicken_walk')
    animate(rig, 'Idle', 73, 'idle')
    animate(rig, 'Peck', 49, 'chicken_peck')
    return rig

def iguana():
    new_scene('iguana')
    green = material('lizard_olive', (0.29, 0.32, 0.19), 0.83, texture=True)
    light = material('lizard_flank', (0.43, 0.42, 0.27), 0.9, texture=True)
    dark = material('lizard_dorsal', (0.18, 0.2, 0.12), 0.9)
    eye = material('lizard_eye', (0.34, 0.27, 0.08), 0.17)
    black = material('lizard_pupil', (0.025, 0.024, 0.016), 0.15)
    spec = [('body', (-0.18, 0, 0.16), (0.2, 0, 0.16), None), ('neck', (0.18, 0, 0.17), (0.31, 0, 0.21), 'body'), ('head', (0.31, 0, 0.21), (0.46, 0, 0.2), 'neck'), ('tail', (-0.23, 0, 0.14), (-0.53, 0, 0.12), 'body'), ('tail.2', (-0.53, 0, 0.12), (-0.83, 0, 0.07), 'tail'), ('tail.3', (-0.83, 0, 0.07), (-1.12, 0, 0.025), 'tail.2')]
    joints = {}
    for leg, x, side in [('FL', 0.16, 1), ('FR', 0.16, -1), ('RL', -0.17, 1), ('RR', -0.17, -1)]:
        a = (x, side * 0.07, 0.16)
        b = (x - 0.07, side * 0.18, 0.085)
        c = (x + 0.025, side * 0.24, 0.028)
        d = (x + 0.1, side * 0.25, 0.02)
        joints[leg] = (a, b, c, d)
        spec.extend([(leg + '.upper', a, b, 'body'), (leg + '.lower', b, c, leg + '.upper'), (leg + '.foot', c, d, leg + '.lower')])
    rig = armature('iguana', spec)
    ellipsoid('lizard_body', (-0.015, 0, 0.15), (0.28, 0.105, 0.095), green, rig, 'body')
    ellipsoid('lizard_belly', (0, 0, 0.105), (0.23, 0.09, 0.048), light, rig, 'body')
    between('lizard_neck', (0.18, 0, 0.17), (0.31, 0, 0.21), (0.07, 0.065), green, rig, 'neck')
    ellipsoid('lizard_head', (0.36, 0, 0.21), (0.13, 0.068, 0.065), green, rig, 'head')
    ellipsoid('lizard_jowl', (0.3, 0, 0.18), (0.07, 0.08, 0.06), light, rig, 'head')
    ellipsoid('lizard_dewlap', (0.26, 0, 0.13), (0.055, 0.012, 0.055), light, rig, 'neck')
    for side in [-1, 1]:
        ellipsoid('lizard_eye', (0.365, side * 0.062, 0.234), (0.024, 0.012, 0.02), eye, rig, 'head', segments=16, rings=10)
        ellipsoid('lizard_pupil', (0.369, side * 0.072, 0.235), (0.01, 0.005, 0.015), black, rig, 'head', segments=12, rings=8)
        tube('lizard_mouth', [(0.45, side * 0.042, 0.181), (0.36, side * 0.068, 0.173), (0.29, side * 0.064, 0.17)], 0.003, dark, rig, 'head')
        ellipsoid('lizard_nostril', (0.448, side * 0.039, 0.235), (0.007, 0.004, 0.005), black, rig, 'head', segments=10, rings=6)
        for i in range(9):
            x = -0.19 + i * 0.047
            ellipsoid('lizard_side_scale', (x, side * 0.098, 0.161), (0.02, 0.007, 0.013), light if i % 2 else dark, rig, 'body', segments=10, rings=6)
    for i in range(19):
        x = -0.22 + i * 0.027
        z = 0.22 + 0.018 * math.sin((x + 0.22) * 6)
        bone = 'head' if x > 0.27 else 'neck' if x > 0.18 else 'body'
        cone_between('lizard_dorsal_spine', (x, 0, z), (x - 0.016, 0, z + 0.035), 0.012, 0.001, dark, rig, bone)
    for a, b, r1, r2, bone in [((-0.22, 0, 0.14), (-0.53, 0, 0.12), 0.065, 0.043, 'tail'), ((-0.53, 0, 0.12), (-0.83, 0, 0.07), 0.043, 0.023, 'tail.2'), ((-0.83, 0, 0.07), (-1.12, 0, 0.025), 0.023, 0.003, 'tail.3')]:
        cone_between('lizard_tail_segment', a, b, r1, r2, green, rig, bone)
    for leg, (a, b, c, d) in joints.items():
        between('lizard_' + leg + '_upper', a, b, (0.038, 0.033), green, rig, leg + '.upper')
        between('lizard_' + leg + '_lower', b, c, (0.024, 0.02), green, rig, leg + '.lower')
        ellipsoid('lizard_' + leg + '_hand', c, (0.034, 0.032, 0.015), light, rig, leg + '.foot')
        for k in range(5):
            y = c[1] + (k - 2) * 0.014
            length = 0.049 - 0.007 * abs(k - 2)
            tube('lizard_' + leg + '_digit', [(c[0], c[1], 0.024), (c[0] + length * 0.65, y, 0.017), (c[0] + length, y + 0.003, 0.012)], 0.004, light, rig, leg + '.foot')
    animate(rig, 'Walk', 49, 'iguana_walk')
    animate(rig, 'Idle', 73, 'idle')
    rig['identity_limit'] = 'Illustrative lizard. No verified documentary iguana reference was located.'
    return rig

def pickup():
    new_scene('pickup')
    white = material('pickup_offwhite', (0.8, 0.79, 0.72), 0.42, 0.15)
    paint = material('pickup_shadow', (0.48, 0.49, 0.45), 0.6, 0.1)
    black = material('pickup_tire', (0.045, 0.045, 0.041), 0.94)
    chrome = material('pickup_chrome', (0.58, 0.59, 0.56), 0.27, 0.8)
    glass = material('pickup_glass', (0.12, 0.19, 0.2), 0.19, 0.15)
    amber = material('pickup_signal', (0.72, 0.29, 0.045), 0.3)
    light = material('pickup_headlight', (0.86, 0.85, 0.72), 0.24)
    red = material('pickup_taillight', (0.58, 0.025, 0.018), 0.28)
    spec = [('body', (-1, 0, 0.65), (1, 0, 0.65), None)]
    wheels = []
    for name, x, y in [('FL', 1.1, 0.79), ('FR', 1.1, -0.79), ('RL', -1.05, 0.79), ('RR', -1.05, -0.79)]:
        spec.append(('wheel.' + name, (x, y, 0.4), (x, y + 0.1, 0.4), 'body'))
        wheels.append((name, x, y))
    rig = armature('pickup', spec)
    box('pickup_chassis', (0, 0, 0.53), (3.5, 1.42, 0.22), black, rig, 'body')
    box('pickup_front', (1.04, 0, 0.91), (1.55, 1.48, 0.58), white, rig, 'body', 0.075)
    box('pickup_hood', (1.0, 0, 1.24), (1.52, 1.43, 0.13), white, rig, 'body', 0.035)
    box('pickup_cab', (-0.08, 0, 1.14), (1.45, 1.47, 0.71), white, rig, 'body', 0.065)
    box('pickup_roof', (-0.15, 0, 1.96), (1.44, 1.51, 0.105), white, rig, 'body', 0.04)
    for y in [-0.72, 0.72]:
        cylinder('pickup_front_pillar', (0.56, y, 1.36), (0.45, y, 1.92), 0.038, white, rig, 'body')
        cylinder('pickup_rear_pillar', (-0.78, y, 1.36), (-0.8, y, 1.92), 0.038, white, rig, 'body')
        box('pickup_side_glass', (-0.13, y, 1.65), (1.18, 0.025, 0.47), glass, rig, 'body', 0.02)
        box('pickup_door_handle', (-0.53, y * 1.03, 1.22), (0.16, 0.025, 0.026), chrome, rig, 'body', 0.006)
        box('pickup_mirror', (0.48, y * 1.22, 1.55), (0.13, 0.055, 0.15), chrome, rig, 'body', 0.02)
        cylinder('pickup_mirror_arm', (0.47, y, 1.46), (0.49, y * 1.2, 1.52), 0.012, chrome, rig, 'body')
    box('pickup_windshield', (0.51, 0, 1.65), (0.025, 1.3, 0.47), glass, rig, 'body', 0.02)
    box('pickup_rear_window', (-0.79, 0, 1.65), (0.025, 1.24, 0.42), glass, rig, 'body', 0.02)
    box('pickup_bed_floor', (-1.35, 0, 0.77), (1.1, 1.4, 0.15), paint, rig, 'body', 0.025)
    for side in [-1, 1]:
        box('pickup_bed_wall', (-1.35, side * 0.7, 1.03), (1.1, 0.1, 0.45), white, rig, 'body', 0.025)
    box('pickup_tailgate', (-1.91, 0, 1.02), (0.09, 1.44, 0.45), white, rig, 'body', 0.025)
    box('pickup_grille', (1.84, 0, 1.01), (0.025, 1.1, 0.25), black, rig, 'body', 0.015)
    for y in [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45]:
        box('pickup_grille_bar', (1.86, y, 1.01), (0.02, 0.025, 0.22), chrome, rig, 'body', 0.003)
    for side in [-1, 1]:
        box('pickup_headlight', (1.85, side * 0.58, 1.07), (0.04, 0.25, 0.2), light, rig, 'body', 0.018)
        box('pickup_indicator', (1.855, side * 0.58, 0.91), (0.045, 0.2, 0.07), amber, rig, 'body', 0.008)
        box('pickup_brakelight', (-1.964, side * 0.6, 1.03), (0.025, 0.13, 0.27), red, rig, 'body', 0.01)
    for x in [-2.0, 1.92]:
        box('pickup_bumper', (x, 0, 0.68), (0.15, 1.57, 0.13), chrome, rig, 'body', 0.025)
    for name, x, y in wheels:
        cylinder('pickup_tire', (x, y - 0.115, 0.4), (x, y + 0.115, 0.4), 0.37, black, rig, 'wheel.' + name, vertices=32)
        s = 1 if y > 0 else -1
        cylinder('pickup_hub', (x, y + s * 0.116, 0.4), (x, y + s * 0.137, 0.4), 0.21, chrome, rig, 'wheel.' + name, vertices=24)
        for i in range(20):
            a = math.tau * i / 20
            ellipsoid('pickup_tread', (x + 0.355 * math.sin(a), y, 0.4 + 0.355 * math.cos(a)), (0.027, 0.123, 0.023), black, rig, 'wheel.' + name, segments=8, rings=6)
    for y in [-0.63, 0.63]:
        cylinder('pickup_rack_rail', (-1.88, y, 1.77), (-0.88, y, 1.77), 0.025, chrome, rig, 'body')
        for x in [-1.84, -0.91]:
            cylinder('pickup_rack_post', (x, y, 1.25), (x, y, 1.77), 0.024, chrome, rig, 'body')
    for x in [-1.84, -1.38, -0.91]:
        cylinder('pickup_rack_crossbar', (x, -0.63, 1.77), (x, 0.63, 1.77), 0.022, chrome, rig, 'body')
    animate(rig, 'Drive', 49, 'pickup_drive')
    rig['identity_limit'] = 'Generic1980s rural pickup, no documentary make or exact vehicle claim.'
    return rig

def export_asset(name, rig):
    scene = CONTEXT['scene']
    scene.frame_set(1)
    clear_pose(rig)
    for o in scene.objects:
        o.select_set(o.type in {'MESH', 'ARMATURE', 'EMPTY'})
    bpy.context.view_layer.objects.active = rig
    args = dict(filepath=OUT + '/' + (name + '.glb'), export_format='GLB', use_selection=True, use_active_scene=True, export_animations=True, export_skins=True, export_morph=False, export_materials='EXPORT', export_texcoords=True, export_normals=True, export_cameras=False, export_lights=False, export_extras=False, export_yup=True, export_apply=False, export_frame_range=False, export_force_sampling=True, export_animation_mode='NLA_TRACKS', export_nla_strips=True)
    props = bpy.ops.export_scene.gltf.get_rna_type().properties
    args = {k: v for k, v in args.items() if k in props}
    for key, value in list(args.items()):
        prop = props[key]
        if prop.type == 'ENUM' and isinstance(value, str):
            allowed = {item.identifier for item in prop.enum_items}
            if value not in allowed:
                if key == 'export_animation_mode' and 'ACTIONS' in allowed:
                    args[key] = 'ACTIONS'
                else:
                    args.pop(key)
                    print('SIERRA_EXPORT_OPTION_SKIPPED', key, value)
    tracks = list(rig.animation_data.nla_tracks) if rig.animation_data else []
    for track in tracks:
        track.mute = False
    bpy.ops.export_scene.gltf(**args)
    for track in tracks:
        track.mute = True
    scene['export_path'] = OUT + '/' + (name + '.glb')
    return {'name': name, 'path': OUT + '/' + (name + '.glb'), 'scene': scene.name, 'bones': len(rig.data.bones), 'meshes': sum((o.type == 'MESH' for o in scene.objects)), 'animations': [t.name for t in tracks], 'authored_not_scanned': True}

def main():
    original_scene = bpy.context.window.scene if bpy.context.window else None
    report = []
    try:
        for name in ASSETS:
            if name == 'mule':
                rig = mule()
            elif name == 'goat':
                rig = goat()
            elif name == 'chicken':
                rig = chicken()
            elif name == 'iguana':
                rig = iguana()
            elif name == 'pickup':
                rig = pickup()
            else:
                raise ValueError('Unknown fauna asset')
            report.append(export_asset(name, rig))
            print('SIERRA_ASSET', json.dumps(report[-1]))
    finally:
        if original_scene and bpy.context.window:
            bpy.context.window.scene = original_scene
    print('SIERRA_BUILD_REPORT', json.dumps({'kind': 'authored PBR geometry with armature animation, not photogrammetry', 'blender': bpy.app.version_string, 'assets': report}))
    return report
main()
