# blender -b -P tools/scrap/to_blend.py -- <in.glb|gltf|obj> <out.blend> : import one model into an empty scene and save an editable .blend
import bpy, sys
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
if src.lower().endswith('.obj'): bpy.ops.wm.obj_import(filepath=src)
else: bpy.ops.import_scene.gltf(filepath=src)
bpy.ops.wm.save_as_mainfile(filepath=out)
print('saved', out, len(bpy.data.objects), 'objects')
