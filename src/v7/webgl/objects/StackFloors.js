import * as THREE from 'three';

// Builds high-rises from the reference building's own geometry and materials:
// the entrance floors are the base (up to BAND_TOP), the facade's exact
// two-floor band (BAND_BOTTOM…BAND_TOP) repeats upward, and the original crown
// (parapets, taller blocks, roof) sits on top. Pieces share the source
// geometry; the cuts are horizontal clipping planes, so any number of copies
// can stand anywhere on the ground and the facade runs on without seams.
export const BAND_BOTTOM = 2.03, BAND_TOP = 2.96, BAND = BAND_TOP - BAND_BOTTOM;
export const FLOOR = BAND / 2;                       // one storey
export const FIRST_RES_FLOOR_Y = 1.57;               // first residential storey above the entrance
export const BASE_HEIGHT = 4.56;
const PARTS = ['Walls', 'Windows', 'Roof'];

export function towerHeight(bands) { return BASE_HEIGHT + bands * BAND; }

function clipped(material, below, above) {
  const planes = [];
  if (below !== null) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), below));   // keep y <= below
  if (above !== null) planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), -above));   // keep y >= above
  const c = material.clone(); c.clippingPlanes = planes; return c;
}

// Returns a Group containing one tower (meshes only, no lights), standing at
// the source model's origin. Materials are cached per (source, cut) so every
// tower of the same height shares them.
export function buildTower(model, bands, cache = new Map()) {
  model.updateMatrixWorld(true);
  const tower = new THREE.Group();
  const sources = [];
  model.traverse((o) => { if (o.isMesh && PARTS.includes(o.name)) sources.push(o); });
  const mat = (src, key, below, above) => {
    const k = `${src.uuid}|${key}`;
    if (!cache.has(k)) cache.set(k, clipped(src.userData.sourceMaterial || src.material, below, above));
    return cache.get(k);
  };
  const piece = (src, dy, m) => { const mesh = new THREE.Mesh(src.geometry, m); mesh.applyMatrix4(src.matrixWorld); mesh.position.y += dy; mesh.name = src.name; tower.add(mesh); };
  sources.forEach((src) => {
    if (!src.userData.sourceMaterial) src.userData.sourceMaterial = src.material;
    if (src.name !== 'Roof') piece(src, 0, mat(src, 'base', BAND_TOP, null));
    for (let k = 1; k <= bands; k++) {
      if (src.name === 'Roof') continue;
      piece(src, k * BAND, mat(src, `band${k}`, BAND_TOP + k * BAND, BAND_BOTTOM + k * BAND));
    }
    piece(src, bands * BAND, mat(src, `top${bands}`, null, BAND_TOP + bands * BAND));
  });
  tower.userData.height = towerHeight(bands);
  tower.userData.bands = bands;
  return tower;
}

// Hides the original building meshes (the model keeps its lights and camera
// markers) so towers built from it can stand in its place.
export function hideSourceBuilding(model) {
  model.traverse((o) => { if (o.isMesh && (PARTS.includes(o.name) || o.name === 'Parking_Lines')) o.visible = false; });
}
