import * as THREE from 'three';

// Original organic "shell" made of lofted ribs. One set of guide curves
// produces BOTH representations used by the opening:
//   - a wireframe: the rib centre-lines + a few contour lines (thin, dim)
//   - a solid: each rib is a glossy ribbon with thickness
// so the wireframe → solid transition is a material/visibility change on the
// same silhouette, not a swap of two unrelated models.

function ribCurve(i, n) {
  // Fan of ribs around a bent axis. Each rib rises from a shared "root" arc,
  // flares outward, and twists so the whole thing reads like a shell/gill.
  const a = (i / (n - 1)) * Math.PI * 1.15 - Math.PI * 0.55; // angular spread
  const pts = [];
  const H = 4.2;
  for (let k = 0; k <= 32; k++) {
    const t = k / 32;
    const r = 0.6 + 2.3 * Math.sin(t * Math.PI * 0.92) * (0.75 + 0.25 * Math.cos(a));
    const twist = a + t * 0.45 * Math.sin(a * 0.8);
    const x = Math.cos(twist) * r;
    const z = Math.sin(twist) * r * 0.75;
    const y = -H * 0.5 + H * t + 0.35 * Math.sin(t * 6.0 + a * 2.0) * t;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.6);
}

function ribbon(curve, width, thickness, segs = 90) {
  // Ribbon: offset the curve along its binormal by ±width/2, give it a
  // thickness along the normal, and close the sides.
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], idx = [], nrm = [];
  const p = new THREE.Vector3();
  const push = (v, n) => { pos.push(v.x, v.y, v.z); nrm.push(n.x, n.y, n.z); };
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, p);
    const B = frames.binormals[i], N = frames.normals[i];
    const w = width * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.05)));
    const h = thickness;
    // 4 corners of the ribbon cross-section
    const c0 = p.clone().addScaledVector(B, -w).addScaledVector(N, -h);
    const c1 = p.clone().addScaledVector(B, w).addScaledVector(N, -h);
    const c2 = p.clone().addScaledVector(B, w).addScaledVector(N, h);
    const c3 = p.clone().addScaledVector(B, -w).addScaledVector(N, h);
    // Two faces (top/bottom) + two sides, duplicated verts for hard edges
    push(c0, N.clone().negate()); push(c1, N.clone().negate());
    push(c2, N); push(c3, N);
    push(c1, B); push(c2, B);
    push(c3, B.clone().negate()); push(c0, B.clone().negate());
    if (i < segs) {
      const o = i * 8, q = o + 8;
      const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);
      quad(o + 0, o + 1, q + 1, q + 0);
      quad(o + 3, q + 3, q + 2, o + 2);
      quad(o + 4, o + 5, q + 5, q + 4);
      quad(o + 7, q + 7, q + 6, o + 6);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

export function createRibStructure({ ribs = 24, envMap = null } = {}) {
  const group = new THREE.Group();
  const solid = new THREE.Group();
  const wire = new THREE.Group();
  const solidMat = new THREE.MeshPhysicalMaterial({
    color: 0x050505, roughness: 0.38, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.28,
    envMap, envMapIntensity: 0.35, side: THREE.DoubleSide,
  });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x9a9797, transparent: true, opacity: 0.5 });
  const contourMat = new THREE.LineBasicMaterial({ color: 0x5a5757, transparent: true, opacity: 0.22 });

  const curves = [];
  for (let i = 0; i < ribs; i++) {
    const c = ribCurve(i, ribs);
    curves.push(c);
    const mesh = new THREE.Mesh(ribbon(c, 0.3, 0.05), solidMat);
    solid.add(mesh);
    // Wireframe: centreline + two edge lines
    const pts = c.getPoints(64);
    wire.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  // Contour rings across the ribs at several heights
  for (let k = 1; k < 4; k++) {
    const t = k / 4;
    const pts = curves.map((c) => c.getPointAt(t));
    wire.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), contourMat));
  }
  solid.scale.setScalar(1.35); wire.scale.setScalar(1.35);
  group.add(solid, wire);
  group.userData = { solid, wire, solidMat, wireMat, contourMat };
  return group;
}