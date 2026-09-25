from pathlib import Path
p=Path('film/index.jsx');s=p.read_text().replace("background:'#0B0B0A'","background:'#051936'").replace("color:'#F1EDE5'","color:'#f8f0e8'").replace('media/architecture-dusk.webp','era/finale.webp');p.write_text(s)
p=Path('index.html');s=p.read_text().replace('content="#F1EDE5"','content="#051936"').replace('AFRAH — Considered residences','AFRAH — The art of coming home').replace('Afrah. Considered residences. Discover architecture, interiors and a quieter way of living.','Afrah. The art of coming home. Explore architecture, gardens, interiors and residences.');p.write_text(s)
Path('README.md').write_text('''# AFRAH

Current website: ERA-led rebuild, following the user correction of 24 September 2026. Opens at http://localhost:4174.

## Run

`npm install`, then `npm run dev`.

For the optimized build: `npm run build`, then `npm start`. The production server includes the enquiry endpoint and video range requests.

## Current experience

Navy, cream and peach palette sampled from ERA; extracted local display/UI fonts; native editable AFRAH copy; public ERA building, courtyard and interior assets; a Three.js drawn-city loader built from ERA's five public OBJ line models; Lenis + GSAP scroll orchestration; expanding hero image; layered tower/sky sequence; circular entrance reveal; stepped garden reveal; sculptural material section; masked interiors and gallery; residence selection, saved residences, illustrative plans and enquiry form.

ERA dominates the site. Likova contributes the stepped media treatment; Silver Pinewood contributes asymmetric editorial pacing. The user's three supplied MP4 recordings were inspected as references, not embedded as website footage.

The previous procedural building and homepage remain in `src/App.jsx`, `src/scene/World.jsx` and `src/styles.css` as an inactive earlier version. The live entry uses `src/EraApp.jsx` and `src/era.css`.

## Forms and data

Enquiries save validated local records under `private/enquiries/`, excluded from the production site and ignored by Git. Email and CRM delivery are not connected. Saved residences persist in the browser. Property plans and specifications are illustrative.

## Media

`assets/era-extracted-manifest.json` records the extracted ERA assets; `assets/website-media-provenance.json` records secondary media. These are temporary local-study assets requested by the user. No rights for public publication have been established. The site runs from local copies without third-party tracking scripts, remote forms or copied contact details.

Film source: `film/index.jsx`. Render with `npm run render:film`.

Design evidence and user-video contact sheets are under `research/era-current/`; direction decisions are in `docs/ERA-DIRECTION-LOCK.md`. These internal files are not included in `dist` or linked from the website. The sibling `Afrah/` project remains untouched.

Verification artifacts for the current site: `qa/era/`. Earlier `qa/website/` screenshots describe the superseded version.
''')
