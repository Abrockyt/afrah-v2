# 07 / Colour system
| Token | Value | Role |
|---|---|---|
| afrah-black | #0B0B0A | Loader and deep editorial surface |
| architectural-ivory | #F1EDE5 | Day UI surface |
| stone | #C8BCAA | Material swatch and nonessential rules |
| bronze | #98735B | Small decorative accent, not default body text |
| dusk-blue | #1D2530 | Dusk UI surface |
| window-amber | #D39050 | Emissive material, not a large page fill |
| day-text | #121210 | Primary text on ivory |
| dusk-text | #F2EEE7 | Primary text on dusk |
| day-muted | #625D55 | Secondary readable text on ivory |
| dusk-muted | #B8B9BA | Secondary readable text on dusk |

Check actual composited colours over imagery, not just token pairs. Put controls on a flat surface when image contrast cannot be guaranteed. Require 4.5:1 normal text and 3:1 large text/control boundaries. Never use bronze as tiny text on ivory without checking contrast.

Day/Dusk changes the environment and materials as well as UI. No rainbow interpolation: use a single scalar for atmosphere, lights and surface mixing. Shadows remain readable at dusk; sky stays blue-grey rather than midnight.
