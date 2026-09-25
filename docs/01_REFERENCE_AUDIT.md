# 01 / Reference audit
Evidence date: 2026-09-23. Public pages only. Primary evidence is in `../research/<site>/`: seven hero widths (1920, 1440, 1280, 1024, 768, 430, 390), five wheel-scroll checkpoints, DOM measurements and a browser recording. Captures use CSS pixels and a resized desktop browser; these are not seven physical devices.

| Reference | What was actually established | Constraint on interpretation |
|---|---|---|
| [ERA](https://era.estate/) | Navy loader with fine branching linework; several canvases; DOM display hierarchy | Loader never cleared. Camera, orbit, floor interaction and subsequent transitions unverified. |
| [LIKOVA](https://likova.space/) | White navigation strip; offset image edge; large wordmark; building-led opening; muted video elements | Office-space context. Resize and wheel capture do not establish a full apartment-selection journey. |
| [Silver Pinewood](https://silver-pinewood.com/) | Dark opening typography; architectural image; large introductory statement; persistent contact/menu | Initial title transition appears in early captures. Not every later chapter was visually inspected. |
| [The Whiteley](https://www.thewhiteleylondon.com/) | Centred wordmark; compact outlined registration; editorial sections | Missing hero media and a page error in automation. Retry did not wait for unresolved fonts. |
| [Bankside Yards](https://banksideyards.com/) | Full-width skyline, development/location navigation, prominent enquiry; launch promotion overlay | Promotional overlay and cookie notice affect initial composition. |

## Measured anchors
- Silver Pinewood at 1440: introduction x=30, width=1380, text=57px. At 390: same heading=22px, x=20. This is a measured responsive scale, not an Afrah token.
- Bankside at 1440: underlying editorial heading x=90, width=607.5, size=43.4px. Useful evidence for roughly half-width prose beside imagery.
- Whiteley at 1440: first editorial heading x=65, size=36px; mobile=28px. Font rendering remains uncertain.
- ERA's 257px desktop heading exists in DOM behind the loader. It is not a verified visible headline.

## Synthesis
Use Silver Pinewood's broad architectural stage and deliberate pacing as the main composition principle, with Afrah's own colours and much shorter copy. Borrow Whiteley's separation of display and utility text, and Bankside's direct information routes. Treat ERA/LIKOVA as bounded spatial research, not implementation recipes.
