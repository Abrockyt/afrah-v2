# 17 / glTF export plan
Final web filenames: afrah-building-high.glb, afrah-building-standard.glb, afrah-building-mobile.glb. These are planned outputs, not existing files.
Export glTF 2.0 with correct axes and metre scale. Preserve floor/group names and needed custom properties. Bake supported material inputs; do not assume Blender node graphs transfer.
First export uncompressed for visual comparison. Then evaluate Meshopt or Draco geometry compression and KTX2 textures. Measure decoder overhead and the difference in total transfer before choosing.
Validate each GLB with a glTF validator; inspect normals, material colour, texture orientation, bounding box, floor IDs and day/dusk hooks in the runtime. Compare key camera frames to the Blender master.
Do not ship .blend, .fbx, EXR sequences or raw 8K maps in public assets.
