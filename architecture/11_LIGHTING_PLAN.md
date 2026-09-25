# 11 / Lighting plan
Day: soft neutral outdoor environment with one controlled directional key. Initial sun direction south-west in the conceptual site; move it only for the LIGHT sequence. Dusk: cool environment, lower key intensity, warm emissive windows with a mixture of off/dim/lit states.
Keep stone midtones distinguishable from the sky. No universal bloom or crushed blacks. Use ACES-style tone mapping only after checking material appearance with the selected renderer/version.
Prototype has one primary shadow-casting light; clamp shadow-map resolution by quality tier. Test baked AO before expensive screen-space effects.
Render both states at identical exposure/camera first, then tune exposure modestly. Require front, side, distant and near-detail comparisons before final material sign-off.
