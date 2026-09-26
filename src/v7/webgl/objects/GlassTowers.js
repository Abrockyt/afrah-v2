import * as THREE from 'three';

// Mirror-glass towers for the second phase, each a different form:
//   twist  — a square tower turning a quarter turn over its height
//   taper  — an elliptical tower narrowing towards a sloped crown
//   step   — a mirror tower in three setbacks, an Art Deco profile in glass
//   sail   — a lens-shaped plan, bowed along its length like a sail
// Walls are generated storey by storey from a plan function, so the glass
// shader (rooms, mullions, reflections) sees true curved facades.
// All sizes in model metres; the caller places them in ERA's district.

const FLOOR = 3.6;

function ringPoints(plan, n) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(plan(i / n));
  return pts;
}

// plan(level 0..1) → function(t 0..1) → [x, z]
function extrude(planAt, height, n = 64) {
  const levels = Math.max(2, Math.round(height / FLOOR));
  const pos = [], idx = [];
  for (let l = 0; l <= levels; l++) {
    const h = l / levels, y = h * height;
    const ring = ringPoints(planAt(h), n);
    ring.forEach(([x, z]) => pos.push(x, y, z));
  }
  for (let l = 0; l < levels; l++) for (let i = 0; i < n; i++) {
    const a = l * n + i, b = l * n + (i + 1) % n, c = (l + 1) * n + i, d = (l + 1) * n + (i + 1) % n;
    idx.push(a, c, b, b, c, d);
  }
  // roof cap
  const top = levels * n, centre = pos.length / 3;
  let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += pos[(top + i) * 3]; cz += pos[(top + i) * 3 + 2]; }
  pos.push(cx / n, height, cz / n);
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  walls.setIndex(idx); walls.computeVertexNormals();
  // make sure the walls face outwards
  const nrm = walls.attributes.normal;
  if (nrm.getX(0) * (pos[0] - cx / n) + nrm.getZ(0) * (pos[2] - cz / n) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    walls.setIndex(idx); walls.computeVertexNormals();
  }
  const cap = new THREE.BufferGeometry();
  const cpos = [], cidx = [];
  for (let i = 0; i < n; i++) cpos.push(pos[(top + i) * 3], height, pos[(top + i) * 3 + 2]);
  cpos.push(cx / n, height, cz / n);
  for (let i = 0; i < n; i++) cidx.push(n, (i + 1) % n, i);
  cap.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); cap.setIndex(cidx); cap.computeVertexNormals();
  return { walls, cap, height };
}

const square = (s, rot = 0, r = .12) => (t) => {
  // rounded square, perimeter parameter t
  const a = t * Math.PI * 2 + rot;
  const c = Math.cos(a), si = Math.sin(a);
  const p = 1 / Math.pow(Math.pow(Math.abs(c), 2 / r) + Math.pow(Math.abs(si), 2 / r), r / 2);
  return [c * p * s, si * p * s];
};
const ellipse = (a, b, rot = 0) => (t) => { const g = t * Math.PI * 2; const x = Math.cos(g) * a, z = Math.sin(g) * b; return [x * Math.cos(rot) - z * Math.sin(rot), x * Math.sin(rot) + z * Math.cos(rot)]; };
const lens = (len, wid, bow) => (t) => {
  const g = t * Math.PI * 2, x = Math.cos(g) * len, z = Math.sin(g) * wid * (1 - .35 * Math.cos(g) * Math.cos(g));
  return [x, z + bow * (1 - (x / len) * (x / len))];
};

export const DESIGNS = {
  twist: () => extrude((h) => square(17, h * Math.PI / 2), 232),
  taper: () => extrude((h) => ellipse(22 * (1 - .38 * h), 15 * (1 - .3 * h), .4), 196),
  step: () => {
    const H = 176;
    return extrude((h) => { const y = h * H; const s = y < 96 ? 21 : y < 142 ? 16 : 11; return square(s, 0, .04); }, H, 96);
  },
  sail: () => extrude((h) => lens(26 * (1 - .15 * h), 9, 6 + 5 * h), 158),
};

// Builds the towers and their stone podiums. `glass` is the mirror material,
// `stone` the podium/roof material. Returns a Group in model metres.
export function buildGlassTowers({ glass, stone, crown }) {
  const group = new THREE.Group(); group.name = 'glass-towers';
  const plots = [
    { d: 'twist', x: 88, z: -118, ry: .3 },
    { d: 'taper', x: 176, z: -214, ry: 0 },
    { d: 'step', x: 262, z: -112, ry: .15 },
    { d: 'sail', x: 214, z: -282, ry: -.6 },
  ];
  plots.forEach(({ d, x, z, ry }) => {
    const { walls, cap, height } = DESIGNS[d]();
    const t = new THREE.Group(); t.position.set(x, 3, z); t.rotation.y = ry;
    const w = new THREE.Mesh(walls, glass); w.castShadow = w.receiveShadow = true;
    const c = new THREE.Mesh(cap, crown || stone); c.castShadow = true;
    // a stone podium with a glazed lobby line
    const pod = new THREE.Mesh(new THREE.BoxGeometry(60, 9, 50), stone); pod.position.y = 4.5; pod.castShadow = pod.receiveShadow = true;
    t.add(pod, w, c);
    group.add(t);
    t.userData.height = height;
  });
  return group;
}
