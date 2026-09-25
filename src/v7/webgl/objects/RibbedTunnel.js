import * as THREE from 'three';

// Original ribbed tunnel: closed organic profiles swept as rounded tubes,
// distributed along a gently bending path. The same profiles feed a sparse
// contour-line pass used before the solid ribs materialise.

export const TUNNEL_LENGTH = 60;

// Pointed-arch portal profile (the AFRAH arch motif): flat floor, straight
// jambs, two arcs meeting at an apex. Built as a dense polyline, then
// resampled to evenly spaced points so every rib has identical topology.
export function archOutline(dense = 240) {
  const pts = [];
  const FLOOR = -0.8, SPRING = 0.28, HALF = 1.0, R = 1.25;
  const c = HALF - R;                                   // arc centres sit inside the opening
  const aTop = Math.acos(Math.min(1, (0 - c) / R));     // angle where the right arc reaches x = 0
  const push = (x, y) => pts.push(new THREE.Vector2(x, y));
  for (let i = 0; i <= 20; i++) push(HALF, FLOOR + (SPRING - FLOOR) * (i / 20));            // right jamb
  for (let i = 1; i <= 40; i++) { const a = aTop * (i / 40); push(c + Math.cos(a) * R, SPRING + Math.sin(a) * R); }   // right arc
  for (let i = 1; i <= 40; i++) { const a = aTop * (1 - i / 40); push(-(c + Math.cos(a) * R), SPRING + Math.sin(a) * R); } // left arc
  for (let i = 1; i <= 20; i++) push(-HALF, SPRING + (FLOOR - SPRING) * (i / 20));          // left jamb
  for (let i = 1; i < 20; i++) push(-HALF + 2 * HALF * (i / 20), FLOOR);                     // floor
  // resample by arc length
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = len[len.length - 1] + pts[0].distanceTo(pts[pts.length - 1]);
  const out = [];
  let j = 0;
  for (let k = 0; k < dense; k++) {
    const target = (k / dense) * total;
    while (j < len.length - 1 && len[j + 1] < target) j++;
    const p0 = pts[j], p1 = pts[(j + 1) % pts.length];
    const segLen = (j + 1 < len.length ? len[j + 1] : total) - len[j];
    const t = segLen > 0 ? (target - len[j]) / segLen : 0;
    out.push(new THREE.Vector2().lerpVectors(p0, p1, t));
  }
  return out;
}

function profilePoints() {
  return archOutline(160).map((v) => new THREE.Vector3(v.x, v.y, 0));
}

// Path the camera follows: slight bend to the left and up toward the end.
export function tunnelPath(t) {
  return new THREE.Vector3(-1.9 * t * t, 0.6 * t * t, -t * TUNNEL_LENGTH);
}

export function createRibbedTunnel({ ribs = 40, envMap = null } = {}) {
  const group = new THREE.Group(), solid = new THREE.Group(), wire = new THREE.Group();
  // Neutral near-black material: restrained specular, no clearcoat sheen (that
  // read as a warm bronze/cloth gloss against the room-environment map).
  // Warm honed stone: matte, lit only by the light at the end of the passage.
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8cbb8, roughness: 0.82, metalness: 0.0, envMap, envMapIntensity: 0.12, transparent: true });
  const wireMat = new THREE.LineBasicMaterial({ color: 0xa3a0a0, transparent: true, opacity: 0.6 });
  const R = 3.1;
  const ribList = [];
  for (let i = 0; i < ribs; i++) {
    const t = i / (ribs - 1);
    const p = tunnelPath(t);
    const pts = profilePoints(i);
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.1);
    const scale = R;                                              // identical portals, evenly spaced
    const tubeR = 0.075;
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, tubeR, 4, true), mat);
    mesh.position.copy(p); mesh.scale.setScalar(scale);
    mesh.userData.baseY = p.y; solid.add(mesh); ribList.push(mesh);
    if (i % 2 === 0) {
      const lp = curve.getPoints(200); lp.push(lp[0].clone());
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp), wireMat);
      line.position.copy(p); line.scale.setScalar(scale); wire.add(line);
    }
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, TUNNEL_LENGTH + 12), new THREE.MeshStandardMaterial({ color: 0x0b0907, roughness: 0.32, metalness: 0.0, envMap, envMapIntensity: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(-0.6, -R * 0.8 - 0.08, -TUNNEL_LENGTH / 2); solid.add(floor);
  // Floor highlight: a soft elliptical glow that travels ahead of the camera (the portal's reflection) — kept restrained, the portal is the hero
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(240,238,236,0.28)'); rg.addColorStop(0.5, 'rgba(240,238,236,0.06)'); rg.addColorStop(1, 'rgba(240,238,236,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); return t; })();
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 4), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = -R * 0.82 + 0.01;
  const portalShape = new THREE.Shape(archOutline(160).map((v) => new THREE.Vector2(v.x, v.y - 0.3)));
  const portal = new THREE.Mesh(new THREE.ShapeGeometry(portalShape, 1), new THREE.MeshBasicMaterial({ color: 0xf4eee6, toneMapped: false }));
  // the opening sits a little left and above the path end, so it drifts off-centre as the camera closes in (measured cx 0.51 -> 0.46)
  const end = tunnelPath(1.0); portal.position.set(end.x - 0.55, end.y + 0.3, end.z - 1.0); portal.scale.set(R * 0.95 * 0.93, R * 0.95, 1);
  const glow = new THREE.PointLight(0xffe7cc, 10, 34, 1.6);
  glow.position.copy(portal.position).add(new THREE.Vector3(0, 0, 3));
  // A soft near-white feather hangs near the portal opening during the
  // contour->solid handoff, visually bridging the feather-field narrative
  // into the tunnel (measured: it sits centred in depth, ahead of the ribs).
  const featherMat = new THREE.MeshStandardMaterial({ color: 0xf6f4f1, roughness: 0.7, metalness: 0.0, envMap, envMapIntensity: 0.05, transparent: true, opacity: 0 });
  const featherShape = new THREE.Shape();
  featherShape.moveTo(0, -1); featherShape.quadraticCurveTo(0.22, -0.6, 0.16, 0.55); featherShape.quadraticCurveTo(0.08, 0.92, 0, 1);
  featherShape.quadraticCurveTo(-0.08, 0.92, -0.16, 0.55); featherShape.quadraticCurveTo(-0.22, -0.6, 0, -1);
  const feather = new THREE.Mesh(new THREE.ShapeGeometry(featherShape, 24), featherMat);
  feather.position.copy(end).add(new THREE.Vector3(-0.55, 0.3, -0.6));
  group.add(solid, wire, portal, floorGlow, feather);
  group.userData = { solid, wire, mat, wireMat, portal, glow, floorGlow, feather, ribs: ribList };
  return group;
}
