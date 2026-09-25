# Afrah v8 asset provenance

The live v8 website uses an original procedural Afrah tower (`src/v5/engine/tower.js`), an original stone/glass/bronze object (`src/v8/OriginalObject.js`), and original hero/tunnel geometry (`src/v8/World.js`). It does not load the archived Likova building or Silver Pinewood statue.

The five images under `public/v8/photos/` were generated for this Afrah visual study from the project's own tower render. They depict a proposed architectural concept and are **not photographs of a built property**. The conversion inputs are documented in `tools/prepare-v8-images.py`; the generation prompt set is in src/v8/IMAGE_PROMPTS.md. The ornamental loading background was supplied by the user.

The tower textures and overcast/night HDRIs are pre-existing project downloads from [Poly Haven](https://polyhaven.com), listed in `assets/v5-asset-manifest.json` as CC0 1.0. [Poly Haven's FAQ](https://docs.polyhaven.com/en/faq) confirms commercial use is permitted. Three.js is MIT licensed. The residence labels, areas, floor selection and map landmarks remain illustrative concept data and require verification before a public property launch.

Older `public/reference-study`, `public/v3`, and `public/era` assets remain in this workspace for comparison, but v8 no longer references those sites' media.
