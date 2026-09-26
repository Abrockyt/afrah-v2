import * as THREE from 'three';

// AFRAH's own towers, built in place of ERA's six on the same plots.
//
//   The Lily (hero, 64 levels): a rounded-square glass tower that turns an
//   eighth of a turn as it rises and narrows slightly. Every floor is drawn by a
//   white slab edge, 32 bronze fins run up the facade with the twist, and above
//   the last floor the fins keep rising and close over a glowing glass lantern
//   like the petals of a bud.
//
//   The Waves (five sisters): glass towers wrapped in white balconies whose
//   depth changes smoothly from floor to floor, so the facade ripples like
//   water in the light.
//
// Everything is in ERA model metres (y up, ground at +3); the caller adds the
// group to the district holder.

const TAU = Math.PI * 2;

// Rounded rectangle (superellipse) with half sizes a (x) and b (z).
const superRect = (a, b, n = 5) => (t) => {
  const g = t * TAU, c = Math.cos(g), s = Math.sin(g);
  const r = 1 / Math.pow(Math.pow(Math.abs(c / a), n) + Math.pow(Math.abs(s / b), n), 1 / n);
  return [c * r, s * r];
};

// Re-parametrises a closed plan by arc length, so equal steps of t are equal
// distances along the facade: rooms come out the same width all round and
// the fins stand at an even spacing.
function arcPlan(plan, M = 2048) {
  const pts = [], cum = [0];
  for (let i = 0; i <= M; i++) pts.push(plan(i / M));
  for (let i = 1; i <= M; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[M];
  const f = (t) => {
    const d = (((t % 1) + 1) % 1) * L;
    let lo = 0, hi = M;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const k = (d - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * k, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * k];
  };
  f.perimeter = L;
  return f;
}

// Samples a plan into points, outward normals and tangents (in the xz plane;
// tangents point the way t increases).
function ring(plan, N, rot = 0, scale = 1, cx = 0, cz = 0) {
  const P = [], Nn = [], T = [];
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < N; i++) {
    const [x, z] = plan(i / N);
    P.push([cx + (x * cr - z * sr) * scale, cz + (x * sr + z * cr) * scale]);
  }
  for (let i = 0; i < N; i++) {
    const a = P[(i + N - 1) % N], b = P[(i + 1) % N];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    Nn.push([tz / l, -tx / l]); T.push([tx / l, tz / l]);
  }
  // make sure the normals point outwards
  const c0 = P.reduce((s, p) => [s[0] + p[0] / N, s[1] + p[1] / N], [0, 0]);
  if ((P[0][0] - c0[0]) * Nn[0][0] + (P[0][1] - c0[1]) * Nn[0][1] < 0) Nn.forEach((n) => { n[0] = -n[0]; n[1] = -n[1]; });
  return { P, N: Nn, T };
}

class Builder {
  constructor() { this.pos = []; this.idx = []; }
  v(x, y, z) { this.pos.push(x, y, z); return this.pos.length / 3 - 1; }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setIndex(this.idx); g.computeVertexNormals();
    return g;
  }
}

// Glass walls with facade coordinates for the room shader: aFacade = (metres
// along the facade, measured so exactly `rooms` rooms of `roomW` go round,
// and the facade tangent). The seam column is doubled so the coordinate does
// not wrap inside a quad.
function glassSkin(rings, ys, rooms, roomW) {
  const N = rings[0].P.length, pos = [], fac = [], idx = [];
  rings.forEach((r, l) => {
    for (let i = 0; i <= N; i++) {
      const k = i % N, [x, z] = r.P[k], [tx, tz] = r.T[k];
      pos.push(x, ys[l], z); fac.push(i / N * rooms * roomW, 0, tx, tz);
    }
  });
  for (let l = 0; l < rings.length - 1; l++) for (let i = 0; i < N; i++) {
    const a = l * (N + 1) + i, c = (l + 1) * (N + 1) + i;
    idx.push(a, a + 1, c + 1, a, c + 1, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFacade', new THREE.Float32BufferAttribute(fac, 4));
  g.setIndex(idx); g.computeVertexNormals();
  // the doubled seam must share one normal
  const n = g.attributes.normal;
  for (let l = 0; l < rings.length; l++) {
    const a = l * (N + 1), b = a + N;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), m = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / m, y / m, z / m); n.setXYZ(b, x / m, y / m, z / m);
  }
  return g;
}

// Walls between consecutive rings (all with the same point count).
function skin(b, rings, ys) {
  const N = rings[0].P.length, base = [];
  rings.forEach((r, l) => { base.push(b.pos.length / 3); r.P.forEach(([x, z]) => b.v(x, ys[l], z)); });
  for (let l = 0; l < rings.length - 1; l++) for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    b.quad(base[l] + i, base[l] + j, base[l + 1] + j, base[l + 1] + i);
  }
}

// A slab edge / balcony plate: from the wall out by depth(i), thickness th.
function plate(b, r, y, depth, th, inset = 0) {
  const N = r.P.length, t0 = b.pos.length / 3;
  for (let i = 0; i < N; i++) {
    const [x, z] = r.P[i], [nx, nz] = r.N[i], d = typeof depth === 'function' ? depth(i) : depth;
    const ix = x - nx * inset, iz = z - nz * inset, ox = x + nx * d, oz = z + nz * d;
    b.v(ix, y + th / 2, iz); b.v(ox, y + th / 2, oz); b.v(ox, y - th / 2, oz); b.v(ix, y - th / 2, iz);
  }
  for (let i = 0; i < N; i++) {
    const a = t0 + i * 4, c = t0 + ((i + 1) % N) * 4;
    b.quad(a, a + 1, c + 1, c);           // top
    b.quad(a + 1, a + 2, c + 2, c + 1);   // edge
    b.quad(a + 2, a + 3, c + 3, c + 2);   // underside
  }
}

// Flat cap over a ring at height y.
function cap(b, r, y) {
  const c = r.P.reduce((s, p) => [s[0] + p[0] / r.P.length, s[1] + p[1] / r.P.length], [0, 0]);
  const m = b.v(c[0], y, c[1]), t0 = b.pos.length / 3;
  r.P.forEach(([x, z]) => b.v(x, y, z));
  for (let i = 0; i < r.P.length; i++) b.idx.push(m, t0 + (i + 1) % r.P.length, t0 + i);
}

function mesh(geo, mat, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- the Lily
export const LILY = { storey: 3.6, floors: 64, base: 3, roomW: 4.4 };
function buildLily({ cx, cz, size, mats }) {
  const g = new THREE.Group(); g.name = 'afrah-lily';
  const { storey, floors, base } = LILY;
  const top = base + storey * floors;                 // roof of the last floor
  const crown = 50;                                   // the bud above it
  const N = 128, K = 32;
  const plan = arcPlan(superRect(size, size, 4.2));
  const rotAt = (y) => (y - base) / (top - base) * Math.PI / 4;
  const bodyScale = (y) => 1 - 0.1 * Math.min(1, (y - base) / (top - base));
  const budScale = (u) => bodyScale(top) * (1 + 0.12 * Math.sin(u * Math.PI)) * Math.pow(Math.cos(u * Math.PI / 2), 0.75);

  // glass walls, floor by floor
  const rings = [], ys = [];
  for (let l = 0; l <= floors; l++) { const y = base + l * storey; ys.push(y); rings.push(ring(plan, N, rotAt(y), bodyScale(y), cx, cz)); }
  // one room between each pair of fins
  g.add(mesh(glassSkin(rings, ys, K, LILY.roomW), mats.glass));

  // white slab edges (the lobby is double height: no slab at level 1)
  const slabs = new Builder();
  for (let l = 2; l <= floors; l++) plate(slabs, rings[l], ys[l] - 0.25, 0.75, 0.6, 0.05);
  plate(slabs, rings[floors], top + 0.9, 1.1, 1.8, 0.05);   // parapet band
  cap(slabs, rings[floors], top + 0.2);
  // a stone plinth ring round the lobby
  plate(slabs, rings[0], base + 0.6, 2.2, 1.2);
  g.add(mesh(slabs.geometry(), mats.slab));

  // lantern: glass narrowing inside the bud
  const lan = new Builder(), lr = [], ly = [];
  for (let s = 0; s <= 12; s++) { const u = s / 12 * 0.86, y = top + u * crown; ly.push(y); lr.push(ring(plan, 64, rotAt(y), budScale(u) * 0.86, cx, cz)); }
  skin(lan, lr, ly); cap(lan, lr[lr.length - 1], ly[ly.length - 1]);
  g.add(mesh(lan.geometry(), mats.lantern, false));

  // bronze fins: up the facade with the twist, then over the lantern
  const fins = new Builder();
  const steps = [];
  for (let l = 0; l <= floors; l++) steps.push([base + l * storey, 1]);
  for (let s = 1; s <= 16; s++) { const u = s / 16; steps.push([top + u * crown, u]); }
  for (let k = 0; k < K; k++) {
    const t = k / K, col = [];
    steps.forEach(([y, flag], si) => {
      const inBud = y > top + 1e-3, u = inBud ? (y - top) / crown : 0;
      const sc = inBud ? budScale(u) : bodyScale(y);
      const rot = rotAt(y);
      const [px, pz] = plan(t), [qx, qz] = plan(t + 0.002);
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const x = (px * cr - pz * sr) * sc, z = (px * sr + pz * cr) * sc;
      const tx = (qx - px) * cr - (qz - pz) * sr, tz = (qx - px) * sr + (qz - pz) * cr, tl = Math.hypot(tx, tz);
      const nx = tz / tl, nz = -tx / tl;
      const out = nx * x + nz * z < 0 ? -1 : 1;
      const depth = inBud ? 1.2 + 2.2 * Math.sin(u * Math.PI) * (1 - u * 0.4) : (y < base + storey * 2 ? 0.4 : 0.9);
      const w = 0.16;
      const ax = cx + x - (tx / tl) * w, az = cz + z - (tz / tl) * w, bx = cx + x + (tx / tl) * w, bz = cz + z + (tz / tl) * w;
      col.push([
        fins.v(ax, y, az), fins.v(ax + nx * out * depth, y, az + nz * out * depth),
        fins.v(bx + nx * out * depth, y, bz + nz * out * depth), fins.v(bx, y, bz),
      ]);
    });
    for (let i = 0; i < col.length - 1; i++) {
      const a = col[i], c = col[i + 1];
      fins.quad(a[0], a[1], c[1], c[0]);   // one side
      fins.quad(a[1], a[2], c[2], c[1]);   // outer edge
      fins.quad(a[2], a[3], c[3], c[2]);   // other side
    }
  }
  g.add(mesh(fins.geometry(), mats.bronze));

  // a finial where the petals meet
  const fin = mesh(new THREE.ConeGeometry(0.6, 16, 12), mats.bronze);
  fin.position.set(cx, top + crown + 6, cz); g.add(fin);
  g.userData = { top, crownTop: top + crown + 14 };
  return g;
}

// ---------------------------------------------------------------- the Waves
export const WAVE = { storey: 3.4, base: 3, roomW: 5 };
function buildWave({ cx, cz, a, b, floors, seed, mats }) {
  const g = new THREE.Group(); g.name = 'afrah-wave';
  const { storey, base } = WAVE;
  const N = 144;
  const plan = arcPlan(superRect(a, b, 3.4));
  const top = base + floors * storey;
  const r0 = ring(plan, N, 0, 1, cx, cz);
  g.add(mesh(glassSkin([r0, r0], [base, top], Math.round(plan.perimeter / WAVE.roomW), WAVE.roomW), mats.glassWave));

  // balconies: depth rippling round the plan and from floor to floor
  const plates = new Builder(), rails = new Builder();
  const depth = (l) => (i) => {
    const th = i / N * TAU;
    const f = Math.sin(2 * th + 0.33 * l + seed) * 0.5 + Math.sin(3 * th - 0.19 * l + seed * 2.1) * 0.32 + Math.sin(5 * th + 0.41 * l + seed * 3.7) * 0.18;
    return 0.7 + 1.35 * (f + 1);
  };
  for (let l = 2; l <= floors; l++) {
    const y = base + l * storey, d = depth(l);
    plate(plates, r0, y - 0.15, d, 0.3, 0.05);
    if (l === floors) continue;
    // glass balustrade along the balcony edge
    const t0 = rails.pos.length / 3;
    for (let i = 0; i < N; i++) {
      const [x, z] = r0.P[i], [nx, nz] = r0.N[i], dd = d(i) - 0.05;
      rails.v(x + nx * dd, y, z + nz * dd); rails.v(x + nx * dd, y + 1.1, z + nz * dd);
    }
    for (let i = 0; i < N; i++) { const p = t0 + i * 2, q = t0 + ((i + 1) % N) * 2; rails.quad(p, q, q + 1, p + 1); }
  }
  // roof: parapet, cap and a screened plant crown
  cap(plates, r0, top + 0.3);
  const crownR = ring(superRect(a * 0.62, b * 0.62, 3.4), 96, 0, 1, cx, cz);
  const cr = new Builder(); skin(cr, [crownR, crownR], [top, top + 7]); cap(cr, crownR, top + 7);
  g.add(mesh(plates.geometry(), mats.slab), mesh(cr.geometry(), mats.slab));
  const rm = mesh(rails.geometry(), mats.rail, false); rm.renderOrder = 2; g.add(rm);
  g.userData = { top };
  return g;
}

// ERA's plots (model metres): the hero stands where ERA's 265 m tower stood.
export const PLOTS = {
  lily: { cx: -136.2, cz: -121, size: 19.5 },
  waves: [
    { cx: -2.8, cz: -186.5, a: 13.5, b: 22, floors: 58, seed: 0.4 },
    { cx: -231.7, cz: -97.2, a: 13.5, b: 22, floors: 46, seed: 1.9 },
    { cx: 3.2, cz: 1.5, a: 13.5, b: 22, floors: 46, seed: 3.1 },
    { cx: -93.4, cz: 8.6, a: 13.5, b: 21.5, floors: 40, seed: 4.6 },
    { cx: -170, cz: 43, a: 13.5, b: 21.5, floors: 40, seed: 5.8 },
  ],
};
// ERA's towers to take out: everything built above the podium roof inside
// these boxes, and the shafts right down to the ground (x0, z0, x1, z1).
export const CLEAR = {
  above: [[-159, -144, -113, -98], [-21, -214, 16, -159], [-250, -125, -213, -70], [-15, -26, 22, 29], [-112, -19, -75, 36], [-188, -19, -86, 70]],
  shafts: [[-158, -143, -114, -99], [-20, -213, 15, -160], [-249, -124, -214, -71], [-14, -25, 21, 28], [-111, -18, -76, 35], [-187, 17, -152, 69]],
  podium: 13.8,
};

// Drops ERA tower triangles inside the cleared volumes from a mesh's geometry
// (vertices are in model metres). Returns false if nothing is left.
export function clearEraTowers(mesh) {
  const g = mesh.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null;
  const tc = idx ? idx.length / 3 : pos.count / 3, keep = [];
  const m = mesh.matrixWorld, v = new THREE.Vector3();
  const inBox = (x, z, [x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1;
  let dropped = 0;
  for (let t = 0; t < tc; t++) {
    const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
    let x = 0, y = 0, z = 0;
    for (const k of [a, b, c]) { v.fromBufferAttribute(pos, k).applyMatrix4(m); x += v.x / 3; y += v.y / 3; z += v.z / 3; }
    const gone = (y > CLEAR.podium && CLEAR.above.some((bx) => inBox(x, z, bx))) || (y > 2.5 && CLEAR.shafts.some((bx) => inBox(x, z, bx)));
    if (gone) dropped++; else keep.push(a, b, c);
  }
  if (!dropped) return true;
  g.setIndex(keep);
  return keep.length > 0;
}

export function buildSignatureTowers(mats) {
  const group = new THREE.Group(); group.name = 'afrah-towers';
  group.add(buildLily({ ...PLOTS.lily, mats }));
  PLOTS.waves.forEach((w) => group.add(buildWave({ ...w, mats })));
  return group;
}
