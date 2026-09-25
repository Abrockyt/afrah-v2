# 05 / Design system and reference lock
Designing a browser-based architectural study for an international residential audience. Goal: understand the building, then access practical property information. Tone: quiet, precise, human. Distinctive idea: **one building, continuously present while the light changes**.

## Proposed reference lock
Primary composition: Silver Pinewood's building-led stage and contrast between image and editorial pause.
Preserve: large architectural scale; sparse perimeter controls; flat surfaces; deliberate silence; a clearly legible silhouette.
Borrow only: Whiteley's utility/display hierarchy and Bankside's direct information architecture.
User-defined overrides: architectural ivory, Afrah black, Day / Dusk; new 12-level concept; editable native text.
Refero checks: Exo Ape supports architectural scale, MANNA supports unboxed images and captions, Spacelab supports sparse navigation. Their proprietary fonts, branded palettes and contradictory component snippets are not imported.
Reject: rounded content-card grids, ornamental gradients, floating glass panels, launch popups, all-gold interfaces and gratuitous movement.

## Tokens and components
Colour roles: see 07. Type roles: see 08. Grid: see 06.
Components: BrandWordmark (native text); ChapterLink (anchor); ModeControl (labelled two-state control); ImageFigure (source plus caption); LoadingStatus; SkipLink; SceneFallback.
Actions have a minimum 44×44 CSS-pixel target. Corners are square except circular utility icons where a circle communicates function. Focus uses a visible 2px outline and 4px offset. No global custom cursor.
A text wordmark remains replaceable by a future approved SVG without altering navigation layout.

## Decision ledger
| Decision | Source | Role | Reason |
|---|---|---|---|
| Native text throughout | Latest user instruction | UI and copy | Fast iteration, selection, access and easy replacement |
| Persistent original building | New 3D brief | Hero media | Spatial continuity through chapters |
| Wide image / quiet perimeter | Silver Pinewood capture | Composition | Architecture carries the story |
| Direct information routes | Bankside capture | Navigation | Story never blocks a purposeful visit |
| Ivory / dusk blue | Master brief | Surfaces | Lighting and UI share an intentional atmosphere |
| Existing type families first | Local fonts.css | Branding | Avoid unapproved font replacement |
