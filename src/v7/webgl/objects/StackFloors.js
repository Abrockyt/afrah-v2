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

// A geometry holding only the triangles that reach into [ymin, ymax] (world
// y of the source mesh). Attributes are shared with the source; only the index
// is new, so each repeated band draws a fifth of the building, not all of it.
function slice(src, ymin, ymax, geoCache) {
  const key = `${src.uuid}|${ymin.toFixed(3)}|${ymax.toFixed(3)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = src.geometry, pos = g.attributes.position, e = src.matrixWorld.elements;
  const wy = (i) => e[1] * pos.getX(i) + e[5] * pos.getY(i) + e[9] * pos.getZ(i) + e[13];
  const index = g.index ? g.index.array : null, count = index ? index.length : pos.count;
  const out = [];
  for (let t = 0; t < count; t += 3) {
    const a = index ? index[t] : t, b = index ? index[t + 1] : t + 1, c = index ? index[t + 2] : t + 2;
    const ya = wy(a), yb = wy(b), yc = wy(c);
    if (Math.max(ya, yb, yc) >= ymin - 1e-3 && Math.min(ya, yb, yc) <= ymax + 1e-3) out.push(a, b, c);
  }
  const ng = new THREE.BufferGeometry();
  for (const name in g.attributes) ng.setAttribute(name, g.attributes[name]);
  ng.setIndex(out);
  ng.boundingSphere = null; ng.computeBoundingBox(); ng.computeBoundingSphere();
  geoCache.set(key, ng);
  return ng;
}
const GEO_CACHE = new Map();

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
  const piece = (src, dy, m, geo) => { const mesh = new THREE.Mesh(geo || src.geometry, m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.applyMatrix4(src.matrixWorld); mesh.position.y += dy; mesh.name = src.name; tower.add(mesh); };
  sources.forEach((src) => {
    if (!src.userData.sourceMaterial) src.userData.sourceMaterial = src.material;
    if (src.name !== 'Roof') piece(src, 0, mat(src, 'base', BAND_TOP, null), slice(src, -1e3, BAND_TOP, GEO_CACHE));
    const bandGeo = src.name === 'Roof' ? null : slice(src, BAND_BOTTOM, BAND_TOP, GEO_CACHE);
    for (let k = 1; k <= bands; k++) {
      if (src.name === 'Roof') continue;
      piece(src, k * BAND, mat(src, `band${k}`, BAND_TOP + k * BAND, BAND_BOTTOM + k * BAND), bandGeo);
    }
    piece(src, bands * BAND, mat(src, `top${bands}`, null, BAND_TOP + bands * BAND), slice(src, BAND_TOP, 1e3, GEO_CACHE));
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
