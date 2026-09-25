# 17 / Responsive strategy
Desktop: wide architectural view, sparse perimeter controls, restrained camera progression. Tablet: 8-column text grid, narrower safe area, quality cap. Mobile: reframe the camera and place native controls in document flow; do not shrink the desktop composition.

Test 1920, 1440, 1280, 1024, 768, 430 and 390 CSS pixels. Also test 320px, landscape mobile, 200% zoom, keyboard navigation and reduced motion.
Use svh for composition with browser UI present. No fixed full-height copy containers that clip wrapped headlines. Safe-area padding applies to bottom controls.
Quality selection uses capability, measured frame cost and user choice; width alone is not a GPU benchmark. Start DPR capped at 1.5 desktop / 1.25 mobile, with lower-resolution fallback.
Reduced motion/data or unavailable WebGL: original poster, ordinary chapter headings, accessible Day/Dusk poster switch. Preserve the same story.
Physical-device testing remains required; resized Edge screenshots do not establish iOS/Safari compatibility.
