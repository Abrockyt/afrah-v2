import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// AFRAH's own towers, built in place of ERA's six on the same plots.
//
//   The Lily (hero, 64 levels): a rounded-square glass tower that turns an
//   eighth of a turn as it rises and narrows slightly. Every floor is drawn by a
//   white slab edge and 32 bronze fins run up the facade with the twist. The
//   crown is European: a cornice, a colonnade round a lit loggia, a zinc
//   mansard with dormers, a lantern with four clock faces, and a spire.
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
  // rings run anticlockwise seen from above, so this winding faces outwards
  quad(a, b, c, d) { this.idx.push(a, c, b, a, d, c); }
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
    idx.push(a, c + 1, a + 1, a, c, c + 1);   // outward-facing
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
  const N = 128, K = 32;
  const plan = arcPlan(superRect(size, size, 4.2));
  const rotAt = (y) => (y - base) / (top - base) * Math.PI / 4;
  const bodyScale = (y) => 1 - 0.1 * Math.min(1, (y - base) / (top - base));

  // glass walls, floor by floor
  const rings = [], ys = [];
  for (let l = 0; l <= floors; l++) { const y = base + l * storey; ys.push(y); rings.push(ring(plan, N, rotAt(y), bodyScale(y), cx, cz)); }
  // one room between each pair of fins
  g.add(mesh(glassSkin(rings, ys, K, LILY.roomW), mats.glass));

  // white slab edges (the lobby is double height: no slab at level 1)
  const slabs = new Builder();
  for (let l = 2; l <= floors; l++) plate(slabs, rings[l], ys[l] - 0.25, 0.75, 0.6, 0.05);
  plate(slabs, rings[0], base + 0.6, 2.2, 1.2);            // a stone plinth round the lobby

  // bronze fins up the facade with the twist, stopping under the cornice
  const fins = new Builder();
  for (let k = 0; k < K; k++) {
    const t = k / K, col = [];
    for (let l = 0; l <= floors; l++) {
      const y = base + l * storey, sc = bodyScale(y), rot = rotAt(y);
      const [px, pz] = plan(t), [qx, qz] = plan(t + 0.002);
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const x = (px * cr - pz * sr) * sc, z = (px * sr + pz * cr) * sc;
      const tx = (qx - px) * cr - (qz - pz) * sr, tz = (qx - px) * sr + (qz - pz) * cr, tl = Math.hypot(tx, tz);
      const nx = tz / tl, nz = -tx / tl, out = nx * x + nz * z < 0 ? -1 : 1;
      const depth = y < base + storey * 2 ? 0.4 : 0.9, w = 0.16;
      const ax = cx + x - (tx / tl) * w, az = cz + z - (tz / tl) * w, bx = cx + x + (tx / tl) * w, bz = cz + z + (tz / tl) * w;
      col.push([fins.v(ax, y, az), fins.v(ax + nx * out * depth, y, az + nz * out * depth), fins.v(bx + nx * out * depth, y, bz + nz * out * depth), fins.v(bx, y, bz)]);
    }
    for (let i = 0; i < col.length - 1; i++) {
      const a = col[i], c = col[i + 1];
      fins.quad(a[0], a[1], c[1], c[0]); fins.quad(a[1], a[2], c[2], c[1]); fins.quad(a[2], a[3], c[3], c[2]);
    }
  }
  g.add(mesh(fins.geometry(), mats.bronze));

  // ── the crown, in the European tradition: cornice, colonnade, zinc
  // mansard with dormers, a lantern with four clock faces, and a spire
  const R0 = bodyScale(top), rot = rotAt(top), at = (t, sc) => {
    const [px, pz] = plan(t), cr = Math.cos(rot), sr = Math.sin(rot);
    return [cx + (px * cr - pz * sr) * sc, cz + (px * sr + pz * cr) * sc];
  };
  const outward = (t) => { const [x0, z0] = at(t - 0.002, 1), [x1, z1] = at(t + 0.002, 1); const tx = x1 - x0, tz = z1 - z0, l = Math.hypot(tx, tz); return [tz / l, -tx / l]; };
  const stone = [], zinc = [], bronze = [], glow = [];
  const put = (list, geo, x, y, z, ry = 0) => { geo.rotateY(ry); geo.translate(x, y, z); list.push(geo); };
  // cornice over the last floor
  plate(slabs, rings[floors], top + 0.9, 2.2, 1.4, 0.05);
  cap(slabs, rings[floors], top + 0.25);
  const y1 = top + 1.6, colH = 9;
  // the loggia: a lit glass drum behind a ring of columns
  const drum = new Builder(), dr = ring(plan, 96, rot, R0 * 0.8, cx, cz);
  skin(drum, [dr, dr], [y1, y1 + colH]);
  g.add(mesh(drum.geometry(), mats.lantern, false));
  for (let k = 0; k < 40; k++) {
    const t = (k + 0.5) / 40, [x, z] = at(t, R0 * 0.94);
    put(stone, new THREE.CylinderGeometry(0.5, 0.58, colH - 1, 14), x, y1 + colH / 2, z);
    put(stone, new THREE.BoxGeometry(1.5, 0.5, 1.5), x, y1 + 0.25, z, rot);
    put(stone, new THREE.BoxGeometry(1.6, 0.5, 1.6), x, y1 + colH - 0.25, z, rot);
  }
  const ent = ring(plan, N, rot, R0 * 0.94, cx, cz);
  plate(slabs, ent, y1 + colH + 0.6, 1.4, 1.2, 1.6);            // entablature
  cap(slabs, ent, y1 + colH + 1.2);
  // the mansard, sloping in from the entablature, with a stone curb
  const y2 = y1 + colH + 1.2, y3 = y2 + 11.5;
  const mansard = new Builder(), m0 = ring(plan, 96, rot, R0 * 0.9, cx, cz), m1 = ring(plan, 96, rot, R0 * 0.6, cx, cz), m2 = ring(plan, 96, rot, R0 * 0.52, cx, cz);
  skin(mansard, [m0, m1, m2], [y2, y3 - 1.6, y3]); cap(mansard, m2, y3);
  g.add(mesh(mansard.geometry(), mats.zinc));
  // dormers: small stone windows with triangular pediments
  for (let k = 0; k < 16; k++) {
    const t = (k + 0.5) / 16, [x, z] = at(t, R0 * 0.8), [nx, nz] = outward(t), ry = Math.atan2(nx, nz), yb = y2 + 3.2;
    put(stone, new THREE.BoxGeometry(2.6, 3.4, 2.4), x + nx * 0.4, yb + 1.7, z + nz * 0.4, ry);
    const tri = new THREE.Shape([new THREE.Vector2(-1.6, 0), new THREE.Vector2(1.6, 0), new THREE.Vector2(0, 1.3)]);
    const ped = new THREE.ExtrudeGeometry(tri, { depth: 2.6, bevelEnabled: false }); ped.translate(0, 0, -1.3);
    put(stone, ped, x + nx * 0.4, yb + 3.4, z + nz * 0.4, ry);
    const win = new THREE.PlaneGeometry(1.5, 2.2); win.translate(0, 0, 1.22);
    put(glow, win, x + nx * 0.4, yb + 1.6, z + nz * 0.4, ry);
  }
  // the lantern: an octagon of lit glass with stone pilasters and four clocks
  const y4 = y3, lanH = 10, lr = 6.2;
  put(glow, new THREE.CylinderGeometry(lr, lr, lanH, 8, 1, true), cx, y4 + lanH / 2, cz, rot + Math.PI / 8);
  for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4; put(stone, new THREE.BoxGeometry(1, lanH, 1), cx + Math.sin(a) * lr, y4 + lanH / 2, cz + Math.cos(a) * lr, a); }
  put(stone, new THREE.CylinderGeometry(lr + 0.9, lr + 0.9, 0.9, 8), cx, y4 + lanH + 0.45, cz, rot + Math.PI / 8);
  const clockFace = [];
  for (let k = 0; k < 4; k++) {
    const a = rot + Math.PI / 8 + k * Math.PI / 2, d = lr * Math.cos(Math.PI / 8) + 0.12;
    const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d, y = y4 + lanH / 2;
    const face = new THREE.CircleGeometry(2.5, 40); face.translate(0, 0, 0.02); put(clockFace, face, x, y, z, a);
    put(bronze, new THREE.TorusGeometry(2.5, 0.2, 8, 40), x, y, z, a);
    const hh = new THREE.BoxGeometry(0.18, 1.5, 0.08); hh.translate(0, 0.75, 0.1); hh.rotateZ(-0.9); put(bronze, hh, x, y, z, a);
    const mh = new THREE.BoxGeometry(0.12, 2.1, 0.08); mh.translate(0, 1.05, 0.12); mh.rotateZ(0.5); put(bronze, mh, x, y, z, a);
  }
  // the spire and its needle
  const y5 = y4 + lanH + 0.9;
  put(zinc, new THREE.ConeGeometry(lr + 0.4, 22, 8), cx, y5 + 11, cz, rot + Math.PI / 8);
  put(bronze, new THREE.CylinderGeometry(0.08, 0.26, 14, 8), cx, y5 + 22 + 7, cz);
  put(bronze, new THREE.SphereGeometry(0.85, 16, 12), cx, y5 + 21, cz);
  const merged = (list) => mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q)).map((q) => { q.deleteAttribute('uv'); return q; }));
  g.add(mesh(merged(stone), mats.slab), mesh(merged(zinc), mats.zinc), mesh(merged(bronze), mats.bronze));
  g.add(mesh(merged(glow), mats.lantern, false), mesh(merged(clockFace), mats.clock || mats.lantern, false));
  g.add(mesh(slabs.geometry(), mats.slab));
  g.userData = { top, crownTop: y5 + 36 };
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
