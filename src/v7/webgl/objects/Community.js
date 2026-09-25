import * as THREE from 'three';
import { buildTower, hideSourceBuilding } from './StackFloors';

// A gated community of towers in daylight. Every tower is built from the
// reference building (same geometry, same dark-metal materials). They stand
// round a landscaped courtyard with a resort pool and a children's pool,
// inside a perimeter wall with a gatehouse. A sky dome, a warm sun with soft
// shadows and a light haze give it an afternoon feel.

const FOOTPRINT_CENTRE = new THREE.Vector2(-1.18, -1.8);   // building centre in model space (x, z)

export const TOWERS_DESKTOP = [
  { id: 'one', name: 'Tower One', at: [0, 0], rot: 0, bands: 13 },
  { id: 'two', name: 'Tower Two', at: [-18, 14], rot: -Math.PI / 2, bands: 10 },
  { id: 'three', name: 'Tower Three', at: [18, 14], rot: Math.PI / 2, bands: 10 },
  { id: 'four', name: 'Tower Four', at: [0, 29], rot: Math.PI, bands: 13 },
];
export const TOWERS_MOBILE = [
  { id: 'one', name: 'Tower One', at: [0, 0], rot: 0, bands: 9 },
  { id: 'two', name: 'Tower Two', at: [-18, 14], rot: -Math.PI / 2, bands: 6 },
  { id: 'three', name: 'Tower Three', at: [18, 14], rot: Math.PI / 2, bands: 6 },
];
export const WALL = { minX: -29, maxX: 29, minZ: -15, maxZ: 42, gate: 3.2 };
export const POOL = { x: 0, z: 14, w: 14, d: 5.2 };
export const DAY_HAZE = '#dfe6ea';

const skyVert = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFrag = `
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, n = 0.0; for (int i = 0; i < 5; i++){ n += a * noise(p); p *= 2.03; a *= 0.5; } return n; }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 horizon = vec3(0.90, 0.92, 0.92);
  vec3 zenith = vec3(0.36, 0.56, 0.78);
  vec3 col = mix(horizon, zenith, pow(h, 0.55));
  // soft high cloud
  vec2 uv = d.xz / max(d.y, 0.08) * 0.9;
  float c = smoothstep(0.55, 0.8, fbm(uv + vec2(3.1, 1.7))) * smoothstep(0.02, 0.25, d.y);
  col = mix(col, vec3(0.98), c * 0.55);
  // sun glow
  vec3 sunDir = normalize(vec3(-0.55, 0.62, -0.55));
  float s = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.93, 0.8) * (pow(s, 12.0) * 0.18 + pow(s, 900.0) * 1.2);
  if (d.y < 0.0) col = horizon;
  gl_FragColor = vec4(col, 1.0);
}`;

// Pool water: turquoise over a paler floor, drifting caustic lines, a sky
// reflection toward grazing angles, and small moving ripples.
const waterVert = `varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const waterFrag = `
uniform float uTime; uniform vec2 uSize;
varying vec2 vUv; varying vec3 vWorld;
float caustic(vec2 p, float t){
  float v = 0.0;
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    vec2 q = p * (1.6 + fi * 0.7) + vec2(t * (0.25 + fi * 0.1), -t * (0.2 + fi * 0.07));
    v += abs(sin(q.x + sin(q.y * 1.3 + t)) * sin(q.y + sin(q.x * 1.1 - t * 0.7)));
  }
  return pow(1.0 - v / 3.0, 5.0);
}
void main(){
  vec2 p = vUv * uSize;
  float c = caustic(p, uTime * 0.6);
  vec3 deep = vec3(0.05, 0.47, 0.58), shallow = vec3(0.35, 0.78, 0.82);
  float edge = smoothstep(0.0, 0.12, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)) * 4.0);
  vec3 col = mix(shallow, deep, edge * 0.8);
  col += vec3(0.85, 1.0, 1.0) * c * 0.35;
  vec3 view = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(view.y, 0.0), 3.0);
  col = mix(col, vec3(0.86, 0.92, 0.95), fres * 0.55);
  float glint = pow(max(sin(p.x * 9.0 + uTime * 1.3) * sin(p.y * 7.0 - uTime), 0.0), 18.0);
  col += glint * 0.25;
  gl_FragColor = vec4(col, 0.94);
}`;

export function createCommunity(model, mobile = false) {
  const layout = mobile ? TOWERS_MOBILE : TOWERS_DESKTOP;
  const group = new THREE.Group();
  group.name = 'Community';
  hideSourceBuilding(model);
  const cache = new Map();
  const templates = new Map();
  const animated = [];

  const towers = layout.map((t) => {
    if (!templates.has(t.bands)) templates.set(t.bands, buildTower(model, t.bands, cache));
    const tpl = templates.get(t.bands);
    const tower = tpl.parent ? tpl.clone() : tpl;
    const c = new THREE.Vector3(FOOTPRINT_CENTRE.x, 0, FOOTPRINT_CENTRE.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), t.rot);
    tower.rotation.y = t.rot;
    tower.position.set(t.at[0] - c.x, 0, t.at[1] - c.z);
    tower.name = t.name;
    group.add(tower);
    return { ...t, height: tower.userData.height, centre: new THREE.Vector3(t.at[0], 0, t.at[1]) };
  });

  // daylight: let the dark metal catch the sky so the louvres read
  cache.forEach((m) => { m.envMapIntensity = 2.4; m.needsUpdate = true; });

  // ── Sky dome (follows the camera) ─────────────────────────────────────
  const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 40, 20), new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.frustumCulled = false; sky.renderOrder = -3; group.add(sky);

  // ── Sun: warm key light with soft shadows over the whole community ───
  const sun = new THREE.DirectionalLight('#fff1dc', 3.2);
  sun.position.set(-38, 46, -36); sun.target.position.set(0, 0, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 160 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const skyFill = new THREE.HemisphereLight('#cfe3f5', '#8a8575', 1.1);
  // (the caller adds the lights to the scene root so the light count never changes)

  // ── Ground: limestone paving, lawns ────────────────────────────────────
  const paveTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#d6d0c4'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,110,95,${Math.random() * 0.05})`; g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3); }
    g.strokeStyle = 'rgba(110,100,85,0.35)'; g.lineWidth = 2;
    for (let y = 0; y <= 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    for (let r = 0; r * 64 < 512; r++) for (let x = (r % 2) * 64; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, r * 64); g.lineTo(x, r * 64 + 64); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  })();
  const grassTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#6f8f55'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) { const v = 90 + Math.random() * 60; g.fillStyle = `rgba(${v * 0.6},${v},${v * 0.45},0.25)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(x, 0, 16, 256); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ color: '#b7b09f', roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.set(0, -0.02, 14); outer.receiveShadow = true; group.add(outer);
  const paveMat = new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.75 });
  paveTex.repeat.set(14, 14);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(WALL.maxX - WALL.minX, WALL.maxZ - WALL.minZ), paveMat);
  inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.0, (WALL.minZ + WALL.maxZ) / 2); inner.receiveShadow = true; group.add(inner);
  grassTex.repeat.set(3, 2);
  const lawnMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });
  const flat = (w, d, x, z, m, y = 0.01) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.receiveShadow = true; group.add(mesh); return mesh; };
  [[-9, 6.5], [9, 6.5], [-9, 21.5], [9, 21.5]].forEach(([x, z]) => flat(9, 6, x, z, lawnMat, 0.012));
  flat(6, WALL.maxZ - WALL.minZ - 4, WALL.minX + 3.4, (WALL.minZ + WALL.maxZ) / 2, lawnMat, 0.011);
  flat(6, WALL.maxZ - WALL.minZ - 4, WALL.maxX - 3.4, (WALL.minZ + WALL.maxZ) / 2, lawnMat, 0.011);

  // ── Pools: resort pool with deck, loungers and parasols; kids' pool ────
  const deckMat = new THREE.MeshStandardMaterial({ color: '#e9e3d6', roughness: 0.6 });
  const copingMat = new THREE.MeshStandardMaterial({ color: '#f4f0e8', roughness: 0.45 });
  const waterMat = (w, d) => {
    const m = new THREE.ShaderMaterial({ vertexShader: waterVert, fragmentShader: waterFrag, transparent: true, uniforms: { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(w, d) } } });
    animated.push(m); return m;
  };
  const pool = (x, z, w, d) => {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 5, 0.06, d + 4), deckMat); deck.position.set(x, 0.03, z); deck.receiveShadow = true; group.add(deck);
    [[0, d / 2 + 0.2, w + 0.8, 0.4], [0, -d / 2 - 0.2, w + 0.8, 0.4], [w / 2 + 0.2, 0, 0.4, d], [-w / 2 - 0.2, 0, 0.4, d]].forEach(([dx, dz, cw, cd]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.1, cd), copingMat); c.position.set(x + dx, 0.08, z + dz); c.castShadow = true; c.receiveShadow = true; group.add(c);
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat(w, d)); water.rotation.x = -Math.PI / 2; water.position.set(x, 0.075, z); group.add(water);
  };
  pool(POOL.x, POOL.z, POOL.w, POOL.d);
  pool(-10.5, 31, 4, 3);                   // children's pool beside Tower Four
  const loungerMat = new THREE.MeshStandardMaterial({ color: '#f7f4ee', roughness: 0.7 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.4, metalness: 0.6 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: '#f2ede2', roughness: 0.85, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = POOL.x - POOL.w / 2 + 1.2 + i * 2.3, z = POOL.z + side * (POOL.d / 2 + 1.35);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 1.5), loungerMat); bed.position.set(x, 0.3, z); bed.castShadow = true; group.add(bed);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.6), loungerMat); back.position.set(x, 0.45, z - side * 0.65); back.rotation.x = side * 0.55; back.castShadow = true; group.add(back);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 1.35), frameMat); legs.position.set(x, 0.14, z); group.add(legs);
      if (i % 2 === 0) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), frameMat); pole.position.set(x + 1.15, 1.1, z); group.add(pole);
        const top = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.45, 8, 1, true), canvasMat); top.position.set(x + 1.15, 2.2, z); top.castShadow = true; group.add(top);
      }
    }
  }

  // ── Perimeter wall with the gate and gatehouse ─────────────────────────
  const wallMat = new THREE.MeshStandardMaterial({ color: '#2a2c31', roughness: 0.5, metalness: 0.5 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#d9d3c7', roughness: 0.6 });
  const wall = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = -Math.atan2(z2 - z1, x2 - x1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.26), wallMat); m.position.set((x1 + x2) / 2, 0.45, (z1 + z2) / 2); m.rotation.y = ang; m.castShadow = m.receiveShadow = true; group.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.34), capMat); cap.position.set((x1 + x2) / 2, 0.93, (z1 + z2) / 2); cap.rotation.y = ang; group.add(cap);
  };
  const { minX, maxX, minZ, maxZ, gate } = WALL;
  wall(minX, minZ, -gate, minZ); wall(gate, minZ, maxX, minZ);
  wall(maxX, minZ, maxX, maxZ); wall(maxX, maxZ, minX, maxZ); wall(minX, maxZ, minX, minZ);
  for (let x = minX; x <= maxX; x += 4) if (Math.abs(x) > gate) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.42), wallMat); p.position.set(x, 0.55, minZ); p.castShadow = true; group.add(p); }
  const pillar = new THREE.BoxGeometry(0.7, 2.4, 0.7);
  [-gate, gate].forEach((x) => { const m = new THREE.Mesh(pillar, wallMat); m.position.set(x, 1.2, minZ); m.castShadow = true; group.add(m); });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(gate * 2 + 0.7, 0.26, 0.8), wallMat); beam.position.set(0, 2.45, minZ); beam.castShadow = true; group.add(beam);
  const barMat = new THREE.MeshStandardMaterial({ color: '#1d1f23', roughness: 0.3, metalness: 0.9 });
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 1.7, 0.045), barMat, 44);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 44; i++) { const x = -gate + 0.35 + i * ((gate * 2 - 0.7) / 43); m4.makeTranslation(x, 0.85, minZ); bars.setMatrixAt(i, m4); }
  bars.castShadow = true; group.add(bars);
  const house = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 2), wallMat); house.position.set(gate + 2.8, 0.75, minZ + 1.5); house.castShadow = house.receiveShadow = true; group.add(house);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.7, 1.4), new THREE.MeshStandardMaterial({ color: '#8fb0c2', roughness: 0.05, metalness: 0.6 })); glass.position.set(gate + 2.8, 0.95, minZ + 1.5); group.add(glass);
  const houseRoof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 2.7), capMat); houseRoof.position.set(gate + 2.8, 1.56, minZ + 1.5); houseRoof.castShadow = true; group.add(houseRoof);

  // ── Trees: rounded canopies on the lawns and along the wall ───────────
  const crownGeo = new THREE.IcosahedronGeometry(0.9, 2); crownGeo.scale(1, 0.9, 1); crownGeo.translate(0, 2.1, 0);
  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.5, 7); trunkGeo.translate(0, 0.75, 0);
  const leaf = new THREE.MeshStandardMaterial({ color: '#4f6f3a', roughness: 0.9 });
  const bark = new THREE.MeshStandardMaterial({ color: '#5b4a3b', roughness: 1 });
  const spots = [];
  for (let z = -12; z <= 38; z += 3.2) { spots.push([WALL.minX + 3.4, z]); spots.push([WALL.maxX - 3.4, z]); }
  [[-12.5, 4.5], [-5.5, 8.5], [5.5, 4.5], [12.5, 8.5], [-12.5, 23.5], [-5.5, 19.5], [5.5, 23.5], [12.5, 19.5]].forEach((p) => spots.push(p));
  for (let x = -24; x <= 24; x += 4.8) if (Math.abs(x) > 5) spots.push([x, WALL.minZ + 1.6]);
  const clear = spots.filter(([x, z]) => layout.every((t) => Math.abs(x - t.at[0]) > 7 || Math.abs(z - t.at[1]) > 7));
  const crowns = new THREE.InstancedMesh(crownGeo, leaf, clear.length), trunks = new THREE.InstancedMesh(trunkGeo, bark, clear.length);
  const q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  clear.forEach(([x, z], i) => {
    const s = 0.85 + ((i * 37) % 10) / 25;
    m4.compose(v.set(x, 0, z), q, sc.setScalar(s)); crowns.setMatrixAt(i, m4); trunks.setMatrixAt(i, m4);
    crowns.setColorAt(i, col.set('#ffffff').offsetHSL(((i * 13) % 7 - 3) * 0.01, 0, ((i * 29) % 9 - 4) * 0.015));
  });
  crowns.castShadow = trunks.castShadow = true; crowns.receiveShadow = true;
  group.add(crowns, trunks);

  return {
    group, towers, sky, lights: [sun, sun.target, skyFill],
    update(time, camera, active) {
      sky.position.copy(camera.position);
      animated.forEach((m) => { m.uniforms.uTime.value = time; });
      sun.shadow.autoUpdate = active;
      sun.intensity = active ? 3.2 : 0;
      skyFill.intensity = active ? 1.1 : 0;
    },
  };
}
