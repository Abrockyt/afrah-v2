// Offline generator for the rooms seen through AFRAH's windows.
// Stages eight furnished apartments with Poly Haven's CC0 furniture
// (fetched into tools/ph by tools/fetch-room-furniture.py) and renders each from just outside
// the window in one-point perspective: the camera sits on the room's axis a
// distance E·depth in front of the glass with its frustum exactly filling the
// window opening, so the glass shader can ray-trace any view into the room
// and look the hit point up in this image (see eraRoom in EraMaterials.js).
// Two atlases (4 × 2 rooms): daylight, and evening with the lamps on.
// Open /tools/roomgen.html in the dev server; window.__atlas holds the result.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export const W = 4.6, H = 3.1, D = 6, E = 0.75;       // room box and camera distance factor
const CELL = 512, SS = 2;

RectAreaLightUniformsLib.init();
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(CELL * SS, CELL * SS);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const loader = new GLTFLoader();
const cache = {};
const model = (id) => (cache[id] ??= loader.loadAsync(`/tools/ph/${id}/${id}.gltf`).then((g) => g.scene));

// ---- procedural surfaces
function canvasTex(w, h, draw, rep = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  return t;
}
const rnd = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
const herringbone = (base) => canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const L = 128, S = 32;
  for (let y = -L; y < h + L; y += S) for (let x = -L * 2; x < w + L; x += S * 2) {
    for (const flip of [0, 1]) {
      const k = 0.72 + rnd() * 0.45;
      const c = new THREE.Color(base).multiplyScalar(k);
      g.save(); g.translate(x + flip * S + (y / S % 2) * S, y); g.rotate(flip ? -Math.PI / 4 : Math.PI / 4);
      g.fillStyle = '#' + c.getHexString(); g.fillRect(0, 0, L, S - 2);
      g.globalAlpha = 0.08; g.fillStyle = '#000';
      for (let i = 0; i < 6; i++) g.fillRect(rnd() * L, rnd() * S, 20 + rnd() * 40, 1);
      g.restore(); g.globalAlpha = 1;
    }
  }
}, [3, 3]);
const plaster = (base) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},0.015)`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
}, [2, 2]);
const art = (seed) => canvasTex(512, 512, (g, w, h) => {
  const pal = [['#e8dccb', '#c46a3c', '#2f4a5a', '#d9b27c'], ['#f1ece3', '#1f2a36', '#b8894f', '#8a9a8f'], ['#efe6d8', '#6d7f5c', '#c9a27a', '#34302c'], ['#ece4d6', '#a4462e', '#e2c28f', '#3b4a63']][seed % 4];
  g.fillStyle = pal[0]; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = pal[1 + (i % 3)]; g.globalAlpha = 0.85;
    g.beginPath();
    if ((seed + i) % 2) g.arc(w * (0.2 + rnd() * 0.6), h * (0.2 + rnd() * 0.6), w * (0.08 + rnd() * 0.22), 0, 7);
    else g.rect(w * rnd() * 0.6, h * rnd() * 0.6, w * (0.15 + rnd() * 0.4), h * (0.1 + rnd() * 0.35));
    g.fill();
  }
  g.globalAlpha = 1;
});

const M = {
  wall: new THREE.MeshStandardMaterial({ map: plaster('#ece6dc'), roughness: 0.92 }),
  wallWarm: new THREE.MeshStandardMaterial({ map: plaster('#e3d6c4'), roughness: 0.92 }),
  wallGreen: new THREE.MeshStandardMaterial({ map: plaster('#a9ae98'), roughness: 0.92 }),
  wallBlue: new THREE.MeshStandardMaterial({ map: plaster('#8d9aa6'), roughness: 0.92 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#f3f0ea', roughness: 0.95 }),
  oak: new THREE.MeshStandardMaterial({ map: herringbone('#b98a5e'), roughness: 0.55 }),
  oakDark: new THREE.MeshStandardMaterial({ map: herringbone('#7a5236'), roughness: 0.5 }),
  stone: new THREE.MeshStandardMaterial({ color: '#e9e4dc', roughness: 0.25 }),
  walnut: new THREE.MeshStandardMaterial({ color: '#5b3a26', roughness: 0.45 }),
  lacquer: new THREE.MeshStandardMaterial({ color: '#efe9df', roughness: 0.35 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c49a5a', metalness: 1, roughness: 0.3 }),
  linen: new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.95 }),
  duvet: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.9 }),
  throwRust: new THREE.MeshStandardMaterial({ color: '#b0643c', roughness: 0.95 }),
  sheer: new THREE.MeshStandardMaterial({ color: '#f5f0e6', roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  rugs: ['#c9bba5', '#8f8a7e', '#b69a7a', '#d8cfbf'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 })),
  dark: new THREE.MeshStandardMaterial({ color: '#1a1714', roughness: 0.9 }),
};

// ---- room shell
function shell(scene, { wall = M.wall, back = null, floor = M.oak, door = false, panels = false }) {
  const plane = (w, h, mat, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.rotation.set(...rot); m.receiveShadow = true; scene.add(m); return m; };
  const fl = plane(W, D, floor, [W / 2, 0, D / 2], [-Math.PI / 2, 0, 0]);
  fl.material.map.repeat.set(W / 4.2, D / 4.2);
  plane(W, D, M.ceiling, [W / 2, H, D / 2], [Math.PI / 2, 0, 0]);
  plane(D, H, wall, [0, H / 2, D / 2], [0, Math.PI / 2, 0]);
  plane(D, H, wall, [W, H / 2, D / 2], [0, -Math.PI / 2, 0]);
  plane(W, H, back || wall, [W / 2, H / 2, D], [0, Math.PI, 0]);
  // skirting and a ceiling cove
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  box(W, 0.1, 0.02, M.lacquer, W / 2, 0.05, D - 0.01); box(0.02, 0.1, D, M.lacquer, 0.01, 0.05, D / 2); box(0.02, 0.1, D, M.lacquer, W - 0.01, 0.05, D / 2);
  box(W, 0.12, 0.25, M.ceiling, W / 2, H - 0.06, D - 0.125);
  if (door) { box(1.12, 2.38, 0.02, M.lacquer, door, 1.19, D - 0.01); box(1.0, 2.3, 0.03, M.dark, door, 1.15, D - 0.025); }
  if (panels) for (let i = 0; i < 5; i++) box(0.02, H - 0.3, D * 0.16, M.walnut, W - 0.01, H / 2, D * 0.12 + i * D * 0.17);
  // sheer curtains gathered at the window sides
  for (const side of [0, 1]) {
    const g = new THREE.PlaneGeometry(0.55, H - 0.05, 40, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 38) * 0.035);
    g.computeVertexNormals();
    const c = new THREE.Mesh(g, M.sheer); c.rotation.y = Math.PI / 2; c.position.set(side ? W - 0.1 : 0.1, H / 2, 0.45); scene.add(c);
  }
  return box;
}

// ---- furniture placement: model bottom on y, centred on (x, z), turned ry
async function put(scene, id, { x, z, ry = 0, y = 0, s = 1, h = null }) {
  const src = await model(id);
  const o = src.clone(true);
  o.rotation.y = ry; o.scale.setScalar(s);
  o.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(o);
  if (h) { o.scale.multiplyScalar(h / (b.max.y - b.min.y)); o.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(o); }
  const c = b.getCenter(new THREE.Vector3());
  o.position.set(x - c.x, y - b.min.y, z - c.z);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; if (m.material) m.material.envMapIntensity = 1; } });
  scene.add(o);
  return o;
}
function rug(scene, x, z, w, d, k = 0) { const r = new THREE.Mesh(new RoundedBoxGeometry(w, 0.015, d, 2, 0.005), M.rugs[k]); r.position.set(x, 0.008, z); r.receiveShadow = true; scene.add(r); }
function picture(scene, x, y, z, w, h, seed, onLeft = false, onRight = false) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), M.walnut);
  const a = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: art(seed), roughness: 0.8 }));
  const g = new THREE.Group(); g.add(f, a); a.position.z = 0.021;
  if (onLeft) { g.rotation.y = Math.PI / 2; g.position.set(0.03, y, z); }
  else if (onRight) { g.rotation.y = -Math.PI / 2; g.position.set(W - 0.03, y, z); }
  else { g.rotation.y = Math.PI; g.position.set(x, y, D - 0.03); }
  f.castShadow = true; scene.add(g);
}
// a lamp: a fabric drum or glass globe that glows in the evening, with its light
function lamp(scene, lights, { x, y, z, r = 0.2, h = 0.26, kind = 'drum', power = 1 }) {
  const shade = new THREE.MeshStandardMaterial({ color: '#f1e6d2', roughness: 0.9, emissive: '#ffcf96', emissiveIntensity: 0, side: THREE.DoubleSide });
  const m = new THREE.Mesh(kind === 'drum' ? new THREE.CylinderGeometry(r, r * 1.1, h, 32, 1, true) : new THREE.SphereGeometry(r, 32, 16), shade);
  m.position.set(x, y, z); scene.add(m);
  const l = new THREE.PointLight('#ffc98c', 0, 7, 2); l.position.set(x, y - (kind === 'drum' ? 0.02 : 0), z); scene.add(l);
  lights.push({ l, shade, power });
}
function downlights(scene, lights, xs, zs) {
  xs.forEach((x) => zs.forEach((z) => {
    const s = new THREE.SpotLight('#ffd6a6', 0, 8, 0.75, 0.6, 2); s.position.set(x, H - 0.02, z); s.target.position.set(x, 0, z + 0.2);
    scene.add(s, s.target);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshStandardMaterial({ color: '#ddd', emissive: '#fff1dc', emissiveIntensity: 0 }));
    disc.rotation.x = Math.PI / 2; disc.position.set(x, H - 0.005, z); scene.add(disc);
    lights.push({ l: s, shade: disc.material, power: 0.8 });
  }));
}
function bed(scene, box, x, z) {
  box(1.9, 1.2, 0.08, M.walnut, x, 0.95, D - 0.05);                  // headboard
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.35, 2.1, 3, 0.04), M.linen); base.position.set(x, 0.2, D - 1.1); scene.add(base);
  const mat = new THREE.Mesh(new RoundedBoxGeometry(1.74, 0.24, 2.0, 4, 0.08), M.duvet); mat.position.set(x, 0.49, D - 1.12); scene.add(mat);
  const thr = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.06, 0.6, 3, 0.03), M.throwRust); thr.position.set(x, 0.63, D - 1.75); scene.add(thr);
  for (const dx of [-0.45, 0.45]) { const p = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.2, 0.42, 4, 0.09), M.duvet); p.position.set(x + dx, 0.7, D - 0.35); p.rotation.x = -0.35; scene.add(p); }
  [base, mat, thr].forEach((m) => { m.castShadow = m.receiveShadow = true; });
}

// a built-in walnut bookcase on the back wall, filled with books
function bookcase(scene, box, x, w, h = 2.3) {
  const d = 0.34, z = D - d / 2;
  box(w, h, 0.02, M.walnut, x, h / 2, D - 0.01);
  box(0.03, h, d, M.walnut, x - w / 2, h / 2, z); box(0.03, h, d, M.walnut, x + w / 2, h / 2, z);
  const cols = ['#7b2e22', '#26394d', '#c9b89a', '#3f4a36', '#8a6a3a', '#ece4d4', '#1d1d1d', '#9a4a2c'];
  for (let k = 0; k < 5; k++) {
    const y = 0.1 + k * (h - 0.15) / 5;
    box(w, 0.03, d, M.walnut, x, y, z);
    let bx = x - w / 2 + 0.05;
    while (bx < x + w / 2 - 0.12) {
      if (rnd() < 0.12) { bx += 0.15 + rnd() * 0.2; continue; }
      const bw = 0.025 + rnd() * 0.035, bh = 0.2 + rnd() * 0.12;
      const b = box(bw, bh, 0.22 + rnd() * 0.06, new THREE.MeshStandardMaterial({ color: cols[Math.floor(rnd() * cols.length)], roughness: 0.8 }), bx + bw / 2, y + 0.015 + bh / 2, D - 0.16);
      b.rotation.z = rnd() < 0.08 ? 0.25 : 0;
      bx += bw + 0.004;
    }
  }
}
// a low sideboard along a side wall with a lamp, books and a vase
function sideboard(scene, box, side, z, len) {
  const x = side === 'r' ? W - 0.25 : 0.25;
  box(0.45, 0.7, len, M.walnut, x, 0.35, z);
  box(0.47, 0.03, len + 0.02, M.stone, x, 0.715, z);
  box(0.28, 0.08, 0.36, new THREE.MeshStandardMaterial({ color: '#2f3b45', roughness: 0.8 }), x, 0.77, z - len / 4);
  box(0.12, 0.3, 0.12, new THREE.MeshStandardMaterial({ color: '#d9cbb5', roughness: 0.4 }), x, 0.88, z + len / 4);
}
function kitchen(scene, box) {
  const y0 = 0.9;
  box(W - 0.2, 0.86, 0.62, M.lacquer, W / 2, 0.45, D - 0.33);           // base run
  box(W - 0.2, 0.04, 0.64, M.stone, W / 2, y0, D - 0.33);               // worktop
  box(W - 0.2, 0.6, 0.02, M.stone, W / 2, y0 + 0.32, D - 0.01);         // splashback
  box(W - 0.2, 0.9, 0.36, M.walnut, W / 2, 2.25, D - 0.2);              // wall cabinets
  for (let i = 0; i < 6; i++) box(0.3, 0.012, 0.012, M.brass, 0.5 + i * 0.7, 0.8, D - 0.64);
  box(2.2, 0.9, 0.9, M.walnut, W / 2, 0.45, D - 2.4);                    // island
  box(2.3, 0.05, 1.0, M.stone, W / 2, 0.925, D - 2.4);
}

// ---- the eight apartments
const ROOMS = [
  async (s, L, box) => {   // living: sofa to the back wall
    rug(s, W / 2, D - 2.1, 3, 2.2, 0);
    await put(s, 'sofa_02', { x: W / 2, z: D - 0.55, ry: Math.PI });
    await put(s, 'coffee_table_round_01', { x: W / 2, z: D - 2.0 });
    await put(s, 'modern_arm_chair_01', { x: 0.75, z: D - 2.4, ry: Math.PI / 2 + 0.3 });
    await put(s, 'potted_plant_02', { x: W - 0.45, z: D - 0.45, h: 1.6 });
    await put(s, 'throw_pillows_01', { x: W / 2 - 0.5, z: D - 0.55, y: 0.42, ry: Math.PI });
    picture(s, W / 2, 1.75, 0, 1.4, 0.9, 0);
    lamp(s, L, { x: W / 2, y: 2.45, z: D - 2.0, r: 0.28, kind: 'globe', power: 1.4 });
    lamp(s, L, { x: W - 0.5, y: 1.55, z: D - 1.6, power: 0.8 });
    sideboard(s, box, 'r', 2.3, 1.8);
    picture(s, 0, 1.7, 2.3, 1.0, 0.7, 3, false, true);
    await put(s, 'potted_plant_04', { x: 0.45, z: 0.9, h: 1.6 });
    downlights(s, L, [0.9, W - 0.9], [1.6, 4.2]);
  },
  async (s, L, box) => {   // living with shelves
    rug(s, W / 2, D - 2.6, 2.8, 2.4, 1);
    bookcase(s, box, W / 2 - 0.65, 1.2); bookcase(s, box, W / 2 + 0.65, 1.2);
    await put(s, 'sofa_03', { x: 0.55, z: D - 2.7, ry: Math.PI / 2 });
    await put(s, 'modern_coffee_table_01', { x: W / 2 + 0.1, z: D - 2.7 });
    await put(s, 'mid_century_lounge_chair', { x: W - 0.8, z: D - 2.2, ry: -Math.PI / 2 - 0.4 });
    await put(s, 'pachira_aquatica_01', { x: W - 0.5, z: D - 0.6, h: 1.9 });
    picture(s, 0, 1.7, D - 2.7, 1.2, 0.8, 1, true);
    lamp(s, L, { x: W - 0.9, y: 1.5, z: D - 3.2, power: 0.9 });
    downlights(s, L, [W / 2], [1.4, 3.2, 5.2]);
  },
  async (s, L, box) => {   // bedroom
    rug(s, W / 2, D - 1.4, 2.8, 2.6, 2);
    bed(s, box, W / 2, 0);
    await put(s, 'ClassicNightstand_01', { x: W / 2 - 1.3, z: D - 0.3, ry: Math.PI });
    await put(s, 'ClassicNightstand_01', { x: W / 2 + 1.3, z: D - 0.3, ry: Math.PI });
    lamp(s, L, { x: W / 2 - 1.3, y: 0.95, z: D - 0.3, r: 0.15, h: 0.2, power: 0.7 });
    lamp(s, L, { x: W / 2 + 1.3, y: 0.95, z: D - 0.3, r: 0.15, h: 0.2, power: 0.7 });
    await put(s, 'Ottoman_01', { x: W / 2, z: D - 2.55 });
    await put(s, 'calathea_orbifolia_01', { x: 0.45, z: D - 0.5, h: 0.7 });
    sideboard(s, box, 'r', 2.2, 1.6);
    await put(s, 'potted_plant_02', { x: 0.5, z: 0.9, h: 1.5 });
    picture(s, W / 2, 2.2, 0, 1.2, 0.5, 2);
    downlights(s, L, [0.8, W - 0.8], [2.0, 4.0]);
  },
  async (s, L, box) => {   // dining
    rug(s, W / 2, D - 2.6, 2.8, 3.0, 3);
    await put(s, 'dining_table', { x: W / 2, z: D - 2.6, ry: Math.PI / 2 });
    for (const [dx, dz, r] of [[-0.62, -0.55, Math.PI / 2], [-0.62, 0.55, Math.PI / 2], [0.62, -0.55, -Math.PI / 2], [0.62, 0.55, -Math.PI / 2]]) await put(s, 'dining_chair_02', { x: W / 2 + dx, z: D - 2.6 + dz, ry: r });
    await put(s, 'modern_wooden_cabinet', { x: W / 2, z: D - 0.25, ry: Math.PI });
    await put(s, 'ceramic_vase_01', { x: W / 2 - 0.4, z: D - 0.25, y: 0.8, h: 0.35 });
    await put(s, 'brass_vase_01', { x: W / 2 + 0.4, z: D - 0.25, y: 0.8, h: 0.25 });
    await put(s, 'potted_plant_04', { x: 0.45, z: D - 0.45, h: 1.3 });
    picture(s, W / 2, 1.8, 0, 1.1, 0.8, 3);
    await put(s, 'Chandelier_01', { x: W / 2, z: D - 2.6, y: H - 0.95, h: 0.9 });
    lamp(s, L, { x: W / 2, y: H - 0.8, z: D - 2.6, r: 0.1, kind: 'globe', power: 1.6 });
    downlights(s, L, [0.7, W - 0.7], [1.5, 4.5]);
  },
  async (s, L, box) => {   // kitchen
    kitchen(s, box);
    for (const dx of [-0.7, 0, 0.7]) await put(s, 'bar_chair_round_01', { x: W / 2 + dx, z: D - 3.05, h: 0.95 });
    for (const dx of [-0.6, 0.6]) { await put(s, 'caged_hanging_light', { x: W / 2 + dx, z: D - 2.4, y: 1.9, h: 0.45 }); lamp(s, L, { x: W / 2 + dx, y: 2.05, z: D - 2.4, r: 0.07, kind: 'globe', power: 0.9 }); }
    await put(s, 'tea_set_01', { x: W / 2 + 0.5, z: D - 2.4, y: 0.95 });
    await put(s, 'potted_plant_01', { x: 0.45, z: 1.2, h: 1.2 });
    downlights(s, L, [0.8, W / 2, W - 0.8], [D - 0.8]);
  },
  async (s, L, box) => {   // study / library
    for (let i = 0; i < 4; i++) bookcase(s, box, 0.6 + i * 1.13, 1.1);
    await put(s, 'potted_plant_01', { x: 0.45, z: 0.9, h: 1.3 });
    rug(s, W / 2, 3.2, 2.6, 2.4, 1);
    await put(s, 'WoodenTable_01', { x: W / 2, z: 2.6, h: 0.76 });
    await put(s, 'GreenChair_01', { x: W / 2, z: 3.3, ry: Math.PI });
    await put(s, 'desk_lamp_arm_01', { x: W / 2 + 0.55, z: 2.6, y: 0.76 });
    await put(s, 'ArmChair_01', { x: W - 0.7, z: 4.7, ry: -Math.PI / 2 - 0.5 });
    lamp(s, L, { x: W / 2 + 0.5, y: 1.15, z: 2.6, r: 0.06, kind: 'globe', power: 0.8 });
    lamp(s, L, { x: W - 0.6, y: 1.5, z: 5.5, power: 0.8 });
    downlights(s, L, [W / 2], [1.2, 4.2]);
  },
  async (s, L, box) => {   // lounge
    rug(s, W / 2, D - 2.4, 3.2, 2.6, 2);
    await put(s, 'Sofa_01', { x: W / 2, z: D - 0.55, ry: Math.PI });
    await put(s, 'ArmChair_01', { x: 0.8, z: D - 2.6, ry: Math.PI / 2 });
    await put(s, 'ArmChair_01', { x: W - 0.8, z: D - 2.6, ry: -Math.PI / 2 });
    await put(s, 'modern_coffee_table_02', { x: W / 2, z: D - 2.4 });
    await put(s, 'side_table_tall_01', { x: W - 0.4, z: D - 0.5 });
    await put(s, 'ceramic_vase_03', { x: W - 0.4, z: D - 0.5, y: 0.72, h: 0.3 });
    await put(s, 'potted_plant_04', { x: 0.45, z: D - 0.45, h: 1.4 });
    picture(s, W / 2, 1.8, 0, 1.6, 0.9, 1);
    lamp(s, L, { x: W - 0.4, y: 1.2, z: D - 0.5, r: 0.16, power: 0.9 });
    downlights(s, L, [0.8, W - 0.8], [1.6, 4.4]);
  },
  async (s, L, box) => {   // gallery living
    rug(s, W / 2, D - 2.3, 3, 2.2, 3);
    await put(s, 'sofa_02', { x: W / 2 + 0.3, z: D - 0.55, ry: Math.PI });
    await put(s, 'coffee_table_round_01', { x: W / 2 + 0.3, z: D - 2.0 });
    await put(s, 'standing_picture_frame_01', { x: 0.5, z: D - 0.35, ry: Math.PI, h: 1.5 });
    await put(s, 'mid_century_lounge_chair', { x: 0.8, z: D - 2.8, ry: Math.PI / 2 + 0.4 });
    await put(s, 'television_02', { x: W - 0.3, z: 3, ry: -Math.PI / 2, y: 0 }).catch(() => {});
    picture(s, W / 2 + 0.3, 1.8, 0, 1.8, 1.0, 2);
    picture(s, 0, 1.6, 3.2, 0.8, 1.0, 3, true);
    lamp(s, L, { x: W / 2 + 0.3, y: 2.4, z: D - 2.0, r: 0.3, kind: 'globe', power: 1.3 });
    downlights(s, L, [W / 2], [1.4, 3.4]);
  },
];
const LOOKS = [
  { wall: M.wall, floor: M.oak, door: 0.8 }, { wall: M.wallWarm, floor: M.oakDark }, { wall: M.wall, back: M.wallGreen, floor: M.oak, door: false },
  { wall: M.wallWarm, floor: M.oak, panels: true }, { wall: M.wall, floor: M.oakDark }, { wall: M.wallBlue, floor: M.oakDark },
  { wall: M.wall, back: M.wallWarm, floor: M.oak, door: W - 0.7 }, { wall: M.wall, floor: M.oak, panels: true },
];

async function stage(i) {
  const scene = new THREE.Scene();
  scene.environment = envTex;
  const lights = [];
  const box = shell(scene, LOOKS[i]);
  await ROOMS[i](scene, lights, box);
  // daylight: soft light from the whole window plus a low sun patch
  const win = new THREE.RectAreaLight('#fff6ea', 0, W, H); win.position.set(W / 2, H / 2, 0.02); win.lookAt(W / 2, H / 2, 5); scene.add(win);
  const sun = new THREE.DirectionalLight('#ffe7c7', 0); sun.position.set(W * 0.2 - 2, H + 2.5, -3.5); sun.target.position.set(W / 2 + 0.6, 0, D * 0.45);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 }); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  lights.forEach(({ l }, k) => { if (l.isPointLight && k < 3) { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.002; l.shadow.radius = 6; } });
  return { scene, lights, win, sun };
}

const cam = new THREE.PerspectiveCamera(2 * Math.atan((H / 2) / (E * D)) * 180 / Math.PI, W / H, E * D * 0.999, 40);
cam.position.set(W / 2, H / 2, -E * D); cam.lookAt(W / 2, H / 2, 10);

function setMood(r, night) {
  r.scene.environmentIntensity = night ? 0.05 : 0.28;
  r.win.intensity = night ? 0 : 2.2;
  r.sun.intensity = night ? 0 : 2.6;
  r.lights.forEach(({ l, shade, power }) => { l.intensity = night ? (l.isSpotLight ? 9 : 5) * power : 0; shade.emissiveIntensity = night ? 1.6 : 0; });
  renderer.toneMappingExposure = night ? 1.05 : 0.8;
}

async function run() {
  const atl = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = CELL * 4; c.height = CELL * 2; return c; });
  for (let i = 0; i < ROOMS.length; i++) {
    const r = await stage(i);
    for (const night of [0, 1]) {
      setMood(r, night);
      renderer.render(r.scene, cam);
      const g = atl[night].getContext('2d');
      // the camera looks along +z, so model +x is image left: mirror to match the shader's axes
      g.save(); g.translate((i % 4) * CELL + CELL, Math.floor(i / 4) * CELL); g.scale(-1, 1);
      g.drawImage(renderer.domElement, 0, 0, CELL, CELL); g.restore();
    }
    document.title = 'room ' + i;
  }
  window.__atlas = atl.map((c) => c.toDataURL('image/png'));
  document.title = 'done';
}
run().catch((e) => { document.title = 'error ' + e.message; console.error(e); });
