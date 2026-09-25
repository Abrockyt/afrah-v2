# AFRAH open-source 3D research

Research date: 2026-09-24. Production direction: an original slender limestone residence with deep bronze reveals, planted setbacks and a sheltered double-height lobby; neutral daylight and readable blue hour. ERA is a cinematography/quality reference, not a geometry source. See research/open-source for per-candidate records.

## BEST HDRI SOURCES

Poly Haven CC0. Five deliberately selected conditions, 1K HDR processed with PMREM. Day reflection azimuth is locked to the main facade.

## BEST PBR SOURCES

Poly Haven scanned facade, paving, asphalt and metal. 2K hero / 1K supporting maps. KTX2 Basis mipmapped runtime textures. ambientCG is also CC0 (https://docs.ambientcg.com/license/) but not required for this shortlist.

## BEST GLASS SOLUTIONS

Compare built-in MeshPhysicalMaterial, installed Drei MeshTransmissionMaterial and original Fresnel shader. Physical glass is the provisional production choice; reject effects that erase mullions or resemble liquid.

## BEST CLOUD SOLUTIONS

Photographic/generated alpha cards for a produced 14-second intro; lightweight layers after handoff. Takram ray marching is a reference only due GPU cost.

## BEST ATMOSPHERE SOLUTIONS

HDR sky, distance fog with a near clear region, and warm practical lighting. No flat ambient wash.

## BEST SHADOW SOLUTIONS

Tightly framed PCF soft directional shadows around the hero, receiver surfaces, and small grounding contact patches. Distant city does not cast into the hero map.

## BEST AO SOLUTIONS

Three GTAOPass is the high-preset candidate. Compare against zero post FX in the lab; standard/mobile use physical geometry shadows.

## BEST WINDOW-LIGHT METHODS

Separate recessed room backs and glazing. Seeded four-state occupancy; curtains, floor plates and furnishings silhouette at close range.

## BEST CITY OPTIMIZATION TOOLS

Instanced facade/geometry batches, distance LOD and original facade atlases. glTF Transform offline optimization for CC0 vegetation.

## BEST VEGETATION SOLUTIONS

Optimized Poly Haven tree_small_02 and shrub_01, instance transforms, independent hue/scale/rotation. Reject raw multi-million triangle trees.

## BEST POSTPROCESSING STACK

Start with no post FX. High preset can add GTAO and OutputPass only. No chromatic aberration, DOF, lens flares or heavy bloom.

## REJECTED OPTIONS

LYGIA (Prosperity); original ERA geometry (new brief requires original Afrah architecture); large raw tree files; duplicate postprocessing library; game-like dissolve or neon outline.

## LICENSE NOTES

Saved API metadata and download manifest document origin. Poly Haven assets CC0. Three/Drei MIT notices retained. PMNDRS postprocessing Zlib not installed. No proprietary ERA mesh is used in the rebuilt hero. Older non-hero study pages remain outside this hero rebuild.

## Validation protocol

/dev/3d-lab is development-only. Capture no-UI architecture and isolated material samples. Record actual FPS, draw calls, triangles, estimated texture bytes and compile/warmup milliseconds. These are local browser measurements, not claims about all hardware. Test mobile/reduced-motion and loading failure. Do not call a candidate visually proven until its screenshots have been inspected.
