# 10 / Shader plan
Implement only effects that the first scenes need. Planned paths under `src/shaders/`:

| Shader | Inputs | Meaning | Stage |
|---|---|---|---|
| architecturalReveal | path progress | Footprint line | First |
| constructionReveal | world height, group timing | Engineered upward reveal | First |
| windowLighting | atmosphere, deterministic window seed | Varied dusk occupancy | First |
| glass | environment, roughness, Fresnel | Restrained reflection | Prefer standard material first |
| siteLines | progress | Site orientation | First, may be native SVG |
| floorHighlight | selected floor ID | Selection | Later |
| reflectionTransition | approach/progress | ENTER bridge | Later |
| atmosphere | distance/fog | Readable depth | Standard fog first |

Uniform scalar uAtmosphere ranges 0–1. Keep seed stable between day/dusk. Reveal masks must support reverse scrolling, shadows and depth passes consistently. Avoid transparent multi-layer overdraw when an opaque mask works.
No shader sources copied from references. Benchmark standard Three materials before introducing custom GLSL.
