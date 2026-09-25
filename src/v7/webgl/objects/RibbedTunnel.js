import * as THREE from 'three';

// Original ribbed tunnel: closed organic profiles swept as rounded tubes,
// distributed along a gently bending path. The same profiles feed a sparse
// contour-line pass used before the solid ribs materialise.

export const TUNNEL_LENGTH = 60;

// One shared organic profile (measured: the reference rings stay in phase
// with each other — the highlight bands run straight along the tunnel, not
// spiralling — so every rib reuses the same low-amplitude irregularity;
// only a very slow per-rib drift is layered on so it doesn't read as a
// perfect lathe-turned surface).
function profilePoints(idx, segs = 72) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    let r = 1 + 0.045 * Math.sin(3 * a) + 0.02 * Math.sin(5 * a + 0.6) + 0.012 * Math.sin(2 * a - 0.3);
    r += 0.006 * Math.sin(3 * a + idx * 0.05);                // slow drift so 40 ribs aren't bit-identical
    // standing oval (measured opening is slightly taller than wide) with a gently flattened floor
    const x = Math.cos(a) * r * 1.0, y = Math.sin(a) * r * 1.15;
    pts.push(new THREE.Vector3(x, y < -0.8 ? -0.8 + (y + 0.8) * 0.3 : y, 0));
  }
  return pts;
}

// Path the camera follows: slight bend to the left and up toward the end.
export function tunnelPath(t) {
  return new THREE.Vector3(-1.9 * t * t, 0.6 * t * t, -t * TUNNEL_LENGTH);
}

export function createRibbedTunnel({ ribs = 40, envMap = null } = {}) {
  const group = new THREE.Group(), solid = new THREE.Group(), wire = new THREE.Group();
  // Neutral near-black material: restrained specular, no clearcoat sheen (that
  // read as a warm bronze/cloth gloss against the room-environment map).
  const mat = new THREE.MeshStandardMaterial({ color: 0x303238, roughness: 0.42, metalness: 0.28, envMap, envMapIntensity: 0.2, transparent: true });
  const wireMat = new THREE.LineBasicMaterial({ color: 0xa3a0a0, transparent: true, opacity: 0.6 });
  const R = 3.1;
  const ribList = [];
  for (let i = 0; i < ribs; i++) {
    const t = i / (ribs - 1);
    const p = tunnelPath(t);
    const pts = profilePoints(i);
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const scale = R * (1 + 0.012 * Math.sin(i * 0.9));         // near-constant: rings stay aligned, no braided look
    const tubeR = 0.095 + 0.008 * Math.sin(i * 0.6);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 110, tubeR, 10, true), mat);
    mesh.position.copy(p); mesh.scale.setScalar(scale);
    mesh.userData.baseY = p.y; solid.add(mesh); ribList.push(mesh);
    if (i % 2 === 0) {
      const lp = curve.getPoints(110); lp.push(lp[0].clone());
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp), wireMat);
      line.position.copy(p); line.scale.setScalar(scale); wire.add(line);
    }
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, TUNNEL_LENGTH + 12), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5, metalness: 0.05, envMap, envMapIntensity: 0.025 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(-0.6, -R * 0.82, -TUNNEL_LENGTH / 2); solid.add(floor);
  // Floor highlight: a soft elliptical glow that travels ahead of the camera (the portal's reflection) — kept restrained, the portal is the hero
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(240,238,236,0.28)'); rg.addColorStop(0.5, 'rgba(240,238,236,0.06)'); rg.addColorStop(1, 'rgba(240,238,236,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); return t; })();
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 4), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = -R * 0.82 + 0.01;
  const portal = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xd9d5d4, toneMapped: false }));
  // the opening sits a little left and above the path end, so it drifts off-centre as the camera closes in (measured cx 0.51 -> 0.46)
  const end = tunnelPath(1.0); portal.position.set(end.x - 0.55, end.y + 0.3, end.z - 1.0); portal.scale.set(R * 0.95 * 0.93, R * 0.95, 1);
  const glow = new THREE.PointLight(0xfff3e8, 10, 30, 1.8);
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
