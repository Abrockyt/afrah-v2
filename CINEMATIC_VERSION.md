# Afrah — active cinematic version

The active entry is `src/main.jsx` → `src/cinematic/App.jsx`. Previous versions are preserved; none are imported by this version.

## Visual direction

The final user brief supersedes the earlier city and reproduction directions. The Composites reference informs spatial pacing, an abstract opening, a structural passage and a gallery with depth. Likova informs a focused architectural subject. Silver Pinewood informs a solitary material object. ERA informs editorial chapters and functional residence exploration. All geometry in the active experience is original. No reference website source, building mesh or proprietary media is imported.

Brand tokens: black #0B0B0A, ivory #F1EDE5, bronze #98735B. Fonts: locally served Inter and Playfair Display, SIL Open Font License in the corresponding @fontsource packages.

## Runtime

One lazily imported Three.js canvas. Scene groups are mutually hidden and only the current group renders; the opening may reveal the building within the same scene. Rendering pauses in editorial sections and hidden tabs. A damped scroll signal moves cameras, ribs and image planes. Lenis handles wheel smoothing and GSAP ScrollTrigger tracks the active chapter. Reduced-motion mode removes continuous float and parallax and uses stepped positions. Mobile reduces pixel ratio, geometry and vegetation, and removes shadow maps. WebGL failure uses original captured stills and leaves HTML navigation and floor selection available.

The original Afrah model has recessed windows, individual facade piers, terrace setbacks, glass rails, interior layers, a double-height arrival and planted edges. Reflective transparent glazing avoids an expensive full-scene transmission pass; the small material sculpture uses transmission. Building shadows are cached while the camera moves. No large city is loaded.

## Assets and licenses

- `assets/cinematic-media.json`: licensed Unsplash lifestyle photography with original author/source URLs; images are illustrative, not representations of an actual property.
- `/cinematic/images/opening.webp`, `building.webp`, `dusk.webp`, `tunnel.webp`, `object.webp`: original stills captured from our own Three.js geometry using `tools/check-cinematic.cjs`.
- Stone, metal, paving, daylight HDR environment and optimized tree: CC0 Poly Haven. Sources/checksums are in `research/open-source/download-manifest.json`; license: https://polyhaven.com/license.
- Three.js: MIT. Basis Universal: Apache-2.0. glTF Transform: MIT, used offline. GSAP/Lenis remain the installed project dependencies.
- Archived media under other public directories remains for previous versions. It is not used by this entry point.

## Functional scope

Routes: `/`, `/architecture`, `/interiors`, `/landscape`, `/residences`, `/place`.

Floor hover/click and the keyboard-accessible selector update the current residence. Residence A/B changes essential details. Floor plans and dimensions are explicitly illustrative. The map is a schematic concept, not a real geographic claim. Viewing enquiries use the existing local `/api/enquiries` endpoint and are stored in `private/enquiries`; there is no external email or CRM delivery configured.

## Verification

`npm run build`; browser checks in `tools/verify-cinematic.cjs`; results and screenshots in `qa/cinematic`. `21st review src/cinematic` returned informational color notices only; physical material colors are intentionally separate from the three UI colors. The CLI uses the updated `.21st/design.json` for future work.
