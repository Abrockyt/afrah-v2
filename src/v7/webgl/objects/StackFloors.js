import * as THREE from 'three';

// Turns the reference building into a high-rise using its own geometry and
// materials: the base (entrance floors) is kept up to BAND_TOP, a two-floor
// band of the facade (BAND_BOTTOM…BAND_TOP, one exact floor-pair high) is
// repeated upward, and the original crown (parapets, taller blocks, roof) is
// set back on top. Every piece shares the original geometry; the cuts are
// clipping planes, so the facade pattern runs on without seams.
const BAND_BOTTOM = 2.03, BAND_TOP = 2.96, BAND = BAND_TOP - BAND_BOTTOM;
const PARTS = ['Walls', 'Windows', 'Roof'];

export function stackFloors(model, renderer, extraBands = 14) {
  renderer.localClippingEnabled = true;
  model.updateMatrixWorld(true);
  const sources = [];
  model.traverse((o) => { if (o.isMesh && PARTS.includes(o.name)) sources.push(o); });

  const clip = (mesh, below, above) => {
    const planes = [];
    if (below !== null) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), below));   // keep y <= below
    if (above !== null) planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), -above));   // keep y >= above
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = mats.map((m) => { const c = m.clone(); c.clippingPlanes = planes; c.clipShadows = true; return c; });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  };

  const holder = new THREE.Group();
  holder.name = 'StackedFloors';
  sources.forEach((src) => {
    // repeated bands
    for (let k = 1; k <= extraBands; k++) {
      if (src.name === 'Roof') continue;
      const copy = new THREE.Mesh(src.geometry, src.material);
      copy.applyMatrix4(src.matrixWorld);
      copy.position.y += k * BAND;
      clip(copy, BAND_TOP + k * BAND, BAND_BOTTOM + k * BAND);
      holder.add(copy);
    }
    // crown on top
    const top = new THREE.Mesh(src.geometry, src.material);
    top.applyMatrix4(src.matrixWorld);
    top.position.y += extraBands * BAND;
    clip(top, null, BAND_TOP + extraBands * BAND);
    holder.add(top);
    // the original becomes the base
    clip(src, BAND_TOP, null);
  });
  model.add(holder);
  return { height: 4.56 + extraBands * BAND, band: BAND };
}
