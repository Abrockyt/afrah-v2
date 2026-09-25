# 12 / Day / Dusk
One persistent scene and building. Store atmosphere as a scalar, not two separately mounted scenes. Native labelled controls request 0 or 1; a two-second smootherstep interpolation updates light, environment, fog, glass and UI.

Window seed: fixed per building instance. Suggested distribution for the study: 45% off, 30% dim, 25% warm. This is an artistic schedule, not occupancy data.
Prefetch the dusk environment after the critical day scene. If loading fails, keep geometry and use a simple lighting/material change; surface a retry in diagnostics rather than blanking the building.
Reduced motion uses an immediate state change. Rapid toggles reverse from the current value; do not queue transitions. User choice takes priority over scroll-driven time until replay/reset.
Verify that changing atmosphere does not re-download or recreate the model and that keyboard focus remains on the control.
