# 18 / 3D performance budget
Start below the generous maxima in the brief; increase detail only where the camera proves its value.

| Tier | Building triangles | Draw calls (whole scene) | Texture memory | Shadow map |
|---|---:|---:|---:|---:|
| High | 250–450K | ≤180 | ≤192MB | ≤2048 |
| Standard | 120–250K | ≤150 | ≤128MB | ≤1024 |
| Mobile | 60–100K | ≤80 | ≤64MB | 512 or baked |

Landscape uses instances and 3–4 variations. Merge only geometry that does not need independent floor/reveal behavior. Limit glass overdraw, shadow casters and unique materials.
Measure frame time/calls/triangles at LAND, 50% FORM, complete FORM, DAY and DUSK, plus rapid toggling. Browser software rendering is useful for correctness, not proof of hardware performance.
See docs/18 for network and UX budgets. All numbers here are targets pending real geometry.
