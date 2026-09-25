# AFRAH

Current website (v4, 24 September 2026): black / silver / white, sharp corners, no header bar (floating corner controls with difference blend), Composites-style spacing and bold Tasa type, ERA arcs loader. Live entry: `src/v4/` + `v4.css` + `v4-system.css`. 3D uses the ERA district and tower complex extracted from ERA's public 3D map (`tools/extract-era-map.py` → `public/v4/era-map/era-city.glb`, `era-building.glb`, `trees.json`; raw download kept in `research/era-3d-map/`, not published): Home scroll flight (`three/CityFlight.jsx`), ERA-style interactive 3D map at `/map` and on Neighbourhood (`three/CityMap.jsx`), sun study and floor picker (`three/Building.jsx`). Study copies only — no publication rights.

Previous website (v3): "One day at AFRAH" — a nine-page story where each page is an hour of one day (Prologue, 05:40 The Idea, 07:10 Landscape, 10:30 Neighbourhood, 13:00 Architecture, 17:20 Lobby & Services, 19:40 Interiors, 21:15 Residences, 23:00 Come home). Live entry: `src/v3/` (App, pages, `three/Tower.jsx`, `v3.css`). It mixes ERA (drawn-city loader, huge display type, arched expanding images, interiors), LIKOVA (offset wordmark frame, numbered chapters, floor selection), Silver Pinewood (editorial statements, natural movement, courtyard, east/west, smart services) and Composites.archi (paradox sculpture, technical grid). The page colour blends between composite tones as you scroll. 3D: scroll-assembled procedural tower, interactive sun study, click-a-floor residence selector, copper sculpture, CSS 3D map, facade explosion and flip/tilt cards. Study images scraped for this version are in `public/v3/`, listed in `assets/v3-scrape-manifest.json` (temporary, no publication rights) and fetched by `tools/scrape-v3.py`.

The sections below describe the previous (v2) build, still in the repo but no longer rendered. Opens at http://localhost:4174.

## Run

`npm install`, then `npm run dev`.

For the optimized build: `npm run build`, then `npm start`. The production server includes the enquiry endpoint and video range requests.

## Current experience

Navy, cream and peach palette sampled from ERA; extracted local display/UI fonts; native editable AFRAH copy; public ERA building, courtyard and interior assets; a Three.js drawn-city loader built from ERA's five public OBJ line models; Lenis + GSAP scroll orchestration; expanding hero image; layered tower/sky sequence; circular entrance reveal; stepped garden reveal; sculptural material section; masked interiors and gallery; residence selection, saved residences, illustrative plans and enquiry form.

ERA dominates the site. Composites.archi contributes its public sculptural GLB, relit with a copper studio material, in a pinned, two-chapter design sequence with scroll-driven orbit, oversized type and technical grid. Likova contributes the stepped media treatment; Silver Pinewood contributes asymmetric editorial pacing. The user's three supplied MP4 recordings were inspected as references, not embedded as website footage.

The previous procedural building and homepage remain in `src/App.jsx`, `src/scene/World.jsx` and `src/styles.css` as an inactive earlier version. The live entry uses `src/EraApp.jsx` and `src/era.css`.

## Forms and data

Enquiries save validated local records under `private/enquiries/`, excluded from the production site and ignored by Git. Email and CRM delivery are not connected. Saved residences persist in the browser. Property plans and specifications are illustrative.

## Media

`assets/era-extracted-manifest.json` records the extracted ERA assets; `assets/composites-extracted-manifest.json` records the Composites study assets; `assets/website-media-provenance.json` records secondary media. These are temporary local-study assets requested by the user. No rights for public publication have been established. The site runs from local copies without third-party tracking scripts, remote forms or copied contact details.

Film source: `film/index.jsx`. Render with `npm run render:film`.

Design evidence and user-video contact sheets are under `research/era-current/`; direction decisions are in `docs/ERA-DIRECTION-LOCK.md`. These internal files are not included in `dist` or linked from the website. The sibling `Afrah/` project remains untouched.

Verification artifacts for the current site: `qa/era/` and `qa/mixed/`. Earlier `qa/website/` screenshots describe the superseded version.
