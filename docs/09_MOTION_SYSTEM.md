# 09 / Motion system
Use native scrolling first. One scene timeline, with labelled chapter stops, controls the camera and architectural reveal. Avoid independent scroll handlers for every mesh.

| Token | Proposed duration | Purpose |
|---|---|---|
| micro | 220ms | Control feedback |
| standard | 420ms | Menu and selection |
| editorial | 800ms | Subtle opacity/position reveal |
| cinematic | 1400ms | Settling camera |
| atmosphere | 2000ms | Day/Dusk interpolation |

Use cubic-bezier(0.22, 1, 0.36, 1) for deliberate interface arrivals, smootherstep for lighting, and explicit camera keyframes without elastic overshoot.
Scroll sequence distance: LAND 120svh, FORM 240svh, LIGHT 160svh initial desktop proposal. Actual content and reduced-motion flow determine final lengths.
FORM reveals at world-space height, with foundation → core → slabs → façade → glass → landscape overlap. No whole-building scale-from-zero effect.
Reduced motion: stable complete model or poster, ordinary chapter sections, instantaneous lighting state change, no scrubbed camera. A skip link always bypasses the introduction.
Reference timing is unmeasured; these durations are Afrah proposals.
