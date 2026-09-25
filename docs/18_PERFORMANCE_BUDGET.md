# 18 / Performance budget
Targets, not measured achievements.

| Metric | Desktop standard | Mobile |
|---|---:|---:|
| Critical shell JS, compressed | ≤200KB before scene chunk | ≤200KB |
| Initial poster | ≤250KB | ≤150KB |
| Critical scene package | ≤6MB | ≤3MB |
| Total first four scenes | ≤12MB | ≤6MB |
| Visible triangles | ≤300K | ≤120K |
| Draw calls | ≤150 | ≤80 |
| Texture memory | ≤128MB | ≤64MB |
| Target steady frame rate | 60fps | 30fps minimum, prefer 60 |
| Long main-thread work | Avoid >50ms tasks | Same |

Track p50/p95 frame time over a repeatable camera path; exclude warm-up but report it separately. Log triangles/calls from renderer.info and network transfer from browser tooling. Target LCP ≤2.5s, CLS ≤0.1 and INP ≤200ms on representative devices.
Deferred video never enters the first load. Pause render loops when the scene is hidden and settled. Lower shadow resolution, DPR and landscape LOD before removing the central building. Browser recordings of references are not Afrah performance tests.
