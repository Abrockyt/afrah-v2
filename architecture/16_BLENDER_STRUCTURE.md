# 16 / Blender structure
Metres, applied transforms, clean normals; origins aligned to useful structural pivots.
Collections: 00_REFERENCE, 01_SITE, 02_BUILDING, 03_STRUCTURE, 04_FACADE, 05_INTERIOR, 06_LANDSCAPE, 07_LIGHTS, 08_CAMERAS, 09_WEB_EXPORT.
Within BUILDING use FOUNDATION, CORE, FLOOR_G, FLOOR_01 … FLOOR_11, ROOF. Group façade/material children without welding floors together. Name selection proxies using residence IDs.
Master filename: `assets/3d/master/afrah-terraced-frame.blend` (planned, not produced).
Bevel only edges visible to the camera. Share materials and repeated geometry. Keep camera/reveal controls documented. Create MASTER, WEB_HIGH, WEB_STANDARD and MOBILE collections; export only the intended tier.
Run scale, duplicate-face, normal, hidden-geometry and material-count checks before export.
