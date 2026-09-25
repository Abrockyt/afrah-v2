# 13 / Camera storyboard
All positions are proposed world metres in a Y-up web scene, aimed near the building centre. They are not measurements of reference camera systems.

| Chapter | Position | Look-at | Approx. FOV | Purpose |
|---|---|---|---:|---|
| LAND | (85, 95, 100) | (0, 0, 0) | 40° | Site and footprint |
| FORM start | (76, 55, 85) | (0, 16, 0) | 38° | Read slabs and core |
| FORM end | (67, 38, 78) | (0, 21, 0) | 38° | Three-quarter silhouette |
| LIGHT | Same as FORM end | Same | Same | Isolate environmental change |
| ENTER later | (12, 3, 25) | (0, 3, 13) | 45° | Human approach |

Adjust coordinates against actual bounding volumes; these are testable starting values. Maintain 10–15% frame margin around building. On mobile, increase distance/reframe rather than widening FOV into distortion.
Prototype path with explicit keyframes or CatmullRomCurve3. No random orbit. Optional pointer offset ≤1° and disabled on coarse pointers/reduced motion.
