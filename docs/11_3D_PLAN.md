# 11 / 3D plan
The new architectural brief overrides references to an existing real Afrah model. See the complete [architectural package](../architecture/01_ARCHITECTURE_CONCEPT.md).

Recommend a single stepped residential volume: 46×28m lower footprint, a 72×50m site, and 12 levels. Height arithmetic resolves to 42.45m with the proposed roof allowance. Schematic blockouts are original and explicitly conceptual.

Pipeline: three massing studies → select silhouette → Blender blockout → façade/material study → day/dusk/camera review → web export → four-scene prototype.
Collections separate site, structure, façade, windows, landscape, lights and camera. Floor IDs remain addressable for a later explorer. Do not model every apartment at this stage.
Runtime plan: React + React Three Fiber + drei + Three.js, GSAP ScrollTrigger if needed. Separate scene, camera, lights, building, environment and interactions.
Deliver final GLB variants only after proportions are reviewed. Current vector studies are not GLBs and are not construction documentation.
