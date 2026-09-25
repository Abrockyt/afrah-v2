import * as THREE from 'three';

// Dresses the reference building as a premium hotel at dusk: champagne-bronze
// louvres, tinted glazing with warm rooms lit floor by floor, a stone
// forecourt with reflecting pools, a lit entrance canopy and lobby glow, the
// illuminated name on the crown, facade uplights, trees, planters and flags.
// Model space: facade front at z ≈ -7.42, entrance centred near x ≈ -1,
// building 0…4.56 high, x -6.94…4.59.

const FRONT_Z = -7.42, ENTRY_X = -1.0, LEFT = -6.94, RIGHT = 4.59, TOP = 4.56;

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Warm rooms behind the glass: a per-floor, per-bay occupancy pattern.
function roomGlow(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHotelWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHotelWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHotelWorld;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fl = floor(vHotelWorld.y / 0.62);
        float bay = floor((vHotelWorld.x + vHotelWorld.z) / 0.46);
        float r = fract(sin(dot(vec2(fl, bay), vec2(12.9898, 78.233))) * 43758.5453);
        float lit = step(0.38, r);
        float warmth = 0.75 + 0.5 * fract(r * 7.13);
        totalEmissiveRadiance *= mix(0.04, warmth, lit);`);
  };
  material.customProgramCacheKey = () => 'hotel-room-glow';
}

export function dressAsHotel(model, envMap) {
  const root = new THREE.Group();
  root.name = 'HotelDressing';
  const flags = [];

  model.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === 'Parking_Lines') { o.visible = false; return; }
    const m = o.material;
    if (o.name === 'Walls') {
      m.color.set('#caa57a'); m.metalness = 0.9; m.roughness = 0.34; m.envMap = envMap; m.envMapIntensity = 1.15;
      m.emissive?.set('#000000');
    } else if (o.name === 'Roof') {
      m.color.set('#3a2e25'); m.metalness = 0.6; m.roughness = 0.5; m.envMap = envMap;
    } else if (o.name === 'Windows') {
      const glass = new THREE.MeshStandardMaterial({ color: '#15202c', roughness: 0.08, metalness: 0.35, envMap, envMapIntensity: 1.4, emissive: new THREE.Color('#ffb46e'), emissiveIntensity: 1.35 });
      roomGlow(glass);
      o.material = glass;
    }
    m.needsUpdate = true;
  });

  // ── Forecourt: honed stone paving fading into the night ─────────────────
  const paving = canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#cfc4b3'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${150 + Math.random() * 40},${140 + Math.random() * 30},${120 + Math.random() * 30},0.06)`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 6); }
    g.strokeStyle = 'rgba(90,78,64,0.35)'; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let row = 0; row * 64 < h; row++) for (let x = (row % 2) * 64; x <= w; x += 128) { g.beginPath(); g.moveTo(x, row * 64); g.lineTo(x, row * 64 + 64); g.stroke(); }
  });
  paving.wrapS = paving.wrapT = THREE.RepeatWrapping; paving.repeat.set(10, 10);
  const fade = canvasTexture(512, 512, (g, w, h) => {
    const rg = g.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w / 2);
    rg.addColorStop(0, '#fff'); rg.addColorStop(0.7, '#888'); rg.addColorStop(1, '#000'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  fade.colorSpace = THREE.NoColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshStandardMaterial({ map: paving, color: '#6f675d', alphaMap: fade, transparent: true, roughness: 0.62, metalness: 0.0, envMap, envMapIntensity: 0.15, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(-1, 0.002, -4); ground.renderOrder = -1;
  root.add(ground);

  // ── Reflecting pools either side of the approach ────────────────────────
  const stone = new THREE.MeshStandardMaterial({ color: '#d9d0c2', roughness: 0.5, envMap, envMapIntensity: 0.4 });
  const water = new THREE.MeshStandardMaterial({ color: '#0a141c', roughness: 0.04, metalness: 0.9, envMap, envMapIntensity: 1.6 });
  const pool = (x, w) => {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, 0.12, 2.24), stone); rim.position.set(x, 0.06, FRONT_Z - 2.6); root.add(rim);
    const wat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, 2), water); wat.position.set(x, 0.115, FRONT_Z - 2.6); root.add(wat);
  };
  pool(ENTRY_X - 3.2, 3.6); pool(ENTRY_X + 3.3, 3.8);

  // ── Entrance: bronze canopy with downlights, lobby glow behind ──────────
  const bronze = new THREE.MeshStandardMaterial({ color: '#4a3526', metalness: 0.85, roughness: 0.35, envMap, envMapIntensity: 1.1 });
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.7), bronze);
  canopy.position.set(ENTRY_X, 1.58, FRONT_Z - 0.85); root.add(canopy);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.015, 0.015), new THREE.MeshBasicMaterial({ color: '#ffd8a6', toneMapped: false }));
  edge.position.set(ENTRY_X, 1.535, FRONT_Z - 1.7); root.add(edge);
  const dl = new THREE.MeshBasicMaterial({ color: '#ffe2b8', toneMapped: false });
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), dl);
    d.rotation.x = Math.PI / 2; d.position.set(ENTRY_X - 1.3 + i * 0.65, 1.535, FRONT_Z - 0.45 - j * 0.8); root.add(d);
  }
  const canopyLight = new THREE.SpotLight('#ffcf98', 14, 5, Math.PI / 3.2, 0.6, 1.4);
  canopyLight.position.set(ENTRY_X, 1.5, FRONT_Z - 0.85); canopyLight.target.position.set(ENTRY_X, 0, FRONT_Z - 1.2);
  root.add(canopyLight, canopyLight.target);
  const lobby = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.1), new THREE.MeshBasicMaterial({ color: '#ffcf96', transparent: true, opacity: 0.85, toneMapped: false }));
  lobby.position.set(ENTRY_X, 0.9, FRONT_Z + 0.35); root.add(lobby);

  // ── The name on the crown ───────────────────────────────────────────────
  const sign = canvasTexture(2048, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffdcae'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '300 250px "Orbit Display", "Inter", Arial, sans-serif';
    g.letterSpacing = '60px';
    g.shadowColor = 'rgba(255,190,120,0.9)'; g.shadowBlur = 40;
    g.fillText('AFRAH', w / 2, h * 0.42);
    g.font = '500 70px "Inter", Arial, sans-serif'; g.letterSpacing = '26px'; g.shadowBlur = 16;
    g.fillText('HOTEL & RESIDENCES', w / 2, h * 0.85);
  });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.75), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, depthWrite: false }));
  signMesh.rotation.y = Math.PI; // faces the approach (−z)
  signMesh.position.set(ENTRY_X, TOP - 0.55, FRONT_Z - 0.06); root.add(signMesh);

  // ── Facade uplights: a warm wash rising up the louvres ──────────────────
  const up = new THREE.MeshBasicMaterial({ color: '#ffd29c', toneMapped: false });
  for (let x = LEFT + 0.3; x < RIGHT - 0.2; x += 0.75) {
    if (Math.abs(x - ENTRY_X) < 1.9) continue;
    const u = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.1), up); u.position.set(x, 0.02, FRONT_Z - 0.18); root.add(u);
  }
  [[LEFT + 1.4], [LEFT + 3.6], [RIGHT - 1.2], [RIGHT - 3.2]].forEach(([x]) => {
    const s = new THREE.SpotLight('#ffc98d', 22, 7, Math.PI / 7, 0.8, 1.3);
    s.position.set(x, 0.05, FRONT_Z - 0.6); s.target.position.set(x, TOP, FRONT_Z + 0.1);
    root.add(s, s.target);
  });

  // ── Slim cypress trees along the sides, low clipped hedges at the front ─
  const crownGeo = new THREE.SphereGeometry(0.28, 14, 10); crownGeo.scale(1, 3.4, 1); crownGeo.translate(0, 1.15, 0);
  const trunkGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.3, 6); trunkGeo.translate(0, 0.15, 0);
  const leaf = new THREE.MeshStandardMaterial({ color: '#233a2c', roughness: 0.95 });
  const bark = new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: 1 });
  const spots = [];
  for (let z = FRONT_Z - 3.8; z <= 3.2; z += 1.3) { spots.push([LEFT - 1.2, z]); spots.push([RIGHT + 1.2, z]); }
  const crowns = new THREE.InstancedMesh(crownGeo, leaf, spots.length), trunks = new THREE.InstancedMesh(trunkGeo, bark, spots.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  spots.forEach(([x, z], i) => { const s = 0.9 + ((i * 37) % 10) / 40; mtx.compose(v.set(x, 0, z), q, sc.setScalar(s)); crowns.setMatrixAt(i, mtx); trunks.setMatrixAt(i, mtx); });
  root.add(crowns, trunks);
  const hedgeMat = new THREE.MeshStandardMaterial({ color: '#28402f', roughness: 0.95 });
  [[ENTRY_X - 3.2, 3.8], [ENTRY_X + 3.3, 4.0]].forEach(([x, w]) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, 0.36), hedgeMat); h.position.set(x, 0.16, FRONT_Z - 4.2); root.add(h);
  });

  const planterMat = new THREE.MeshStandardMaterial({ color: '#2b2522', roughness: 0.6, metalness: 0.2 });
  const topiaryMat = new THREE.MeshStandardMaterial({ color: '#2f4a34', roughness: 0.9 });
  [-1, 1].forEach((side) => {
    const x = ENTRY_X + side * 2.0;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), planterMat); box.position.set(x, 0.2, FRONT_Z - 1.9); root.add(box);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), topiaryMat); ball.position.set(x, 0.66, FRONT_Z - 1.9); root.add(ball);
  });

  // ── Flags at the approach, moving gently ────────────────────────────────
  const poleMat = new THREE.MeshStandardMaterial({ color: '#b9b2a8', metalness: 0.9, roughness: 0.25, envMap });
  const flagMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide });
  const flagMark = canvasTexture(256, 160, (g, w, h) => { g.fillStyle = '#efe6d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#9a7356'; g.font = '600 46px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('A', w / 2, h / 2); });
  flagMat.map = flagMark;
  for (let i = 0; i < 3; i++) {
    const x = RIGHT - 0.4 + i * 0.55, z = FRONT_Z - 4.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 2.6, 8), poleMat); pole.position.set(x, 1.3, z); root.add(pole);
    const geo = new THREE.PlaneGeometry(0.62, 0.38, 12, 4); geo.translate(0.31, 0, 0);
    const flag = new THREE.Mesh(geo, flagMat); flag.position.set(x + 0.02, 2.35, z); flag.rotation.y = Math.PI * 0.85;
    flag.userData.base = geo.attributes.position.array.slice(); flag.userData.phase = i * 1.3;
    root.add(flag); flags.push(flag);
  }

  model.add(root);

  return {
    update(t) {
      flags.forEach((f) => {
        const pos = f.geometry.attributes.position.array, base = f.userData.base;
        for (let i = 0; i < pos.length; i += 3) { const x = base[i]; pos[i + 2] = base[i + 2] + Math.sin(x * 7 - t * 2.2 + f.userData.phase) * 0.05 * x; }
        f.geometry.attributes.position.needsUpdate = true;
      });
    },
  };
}
