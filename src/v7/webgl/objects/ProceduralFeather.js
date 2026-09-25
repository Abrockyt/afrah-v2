import * as THREE from 'three';

// An original, fully procedural feather.
//   - rachis: tapered tube along +Y (quill at y=-1, tip at y=+1)
//   - two vanes: parametric ribbons whose barbs slant toward the tip and cup
//     slightly out of plane; a canvas-generated alpha map draws the barbs,
//     fringe and a few natural splits.
// The whole thing lives in a Group with its centre of mass near the origin so
// rotations read as a real tumbling object.

let cachedAlpha = null;

function makeBarbAlpha(size = 1024, seed = 7) {
  if (cachedAlpha) return cachedAlpha;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);

  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

  // Texture space: x = across the vane (0 at rachis, 1 at the edge),
  // y = along the shaft (0 quill, 1 tip). Barbs are lines leaving the rachis.
  g.lineCap = 'round';
  const barbs = 520;
  for (let i = 0; i < barbs; i++) {
    const t = i / barbs;
    const slant = 0.42 + 0.25 * t;
    const gap = rnd() < 0.045 ? 0.6 + rnd() * 0.3 : 1;
    const y0 = t * size;
    g.strokeStyle = 'rgba(255,255,255,' + (0.86 + rnd() * 0.14).toFixed(3) + ')';
    g.lineWidth = 3.2 + rnd() * 2.2;
    g.beginPath();
    g.moveTo(0, y0);
    const x1 = size * gap;
    const y1 = y0 + slant * size * 0.35 * gap;
    g.quadraticCurveTo(size * 0.45 * gap, y0 + slant * size * 0.12 * gap, x1, y1);
    g.stroke();
  }
  // Ragged outer fringe: the last 12% thins to separate barb tips
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    const y = rnd() * size, w = 2 + rnd() * 5, x = size * (0.86 + rnd() * 0.14);
    g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(x, y, size, w);
  }
  g.globalCompositeOperation = 'source-over';
  // Downy afterfeather near the quill
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 700; i++) {
    const x = rnd() * size * 0.5, y = rnd() * size * 0.16;
    g.fillStyle = 'rgba(0,0,0,' + (0.6 * (1 - y / (size * 0.16))).toFixed(3) + ')';
    g.fillRect(x, y, 6 + rnd() * 14, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.NoColorSpace;
  cachedAlpha = tex;
  return tex;
}


// Small silhouette used by the far-field sprites: a tapered vane on each side
// of a thin shaft, with faint barb striations, drawn onto a square canvas.
let cachedSprite = null;
function makeSpriteAlpha(size = 256) {
  if (cachedSprite) return cachedSprite;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  const cx = size * 0.5;
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(cx, size * 0.02);
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, y = size * (0.02 + 0.96 * u);
    const w = size * 0.19 * Math.sin(Math.PI * Math.pow(u, 0.8)) * (u < 0.1 ? u / 0.1 : 1);
    g.lineTo(cx + w * 0.75, y);
  }
  for (let i = 40; i >= 0; i--) {
    const u = i / 40, y = size * (0.02 + 0.96 * u);
    const w = size * 0.19 * Math.sin(Math.PI * Math.pow(u, 0.8)) * (u < 0.1 ? u / 0.1 : 1);
    g.lineTo(cx - w, y);
  }
  g.closePath(); g.fill();
  // barb striations
  g.globalCompositeOperation = 'destination-out';
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1;
  for (let i = 0; i < 46; i++) {
    const y = size * (0.12 + 0.86 * i / 46);
    g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + size * 0.2, y + size * 0.07); g.moveTo(cx, y); g.lineTo(cx - size * 0.2, y + size * 0.07); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  cachedSprite = tex;
  return tex;
}

// Colour map for a dark vane: near-black with sparse thin lighter streaks that
// follow the barb direction, plus a lighter band along the rachis.
let cachedStreaks = null;
function makeStreakMap(size = 1024, seed = 11) {
  if (cachedStreaks) return cachedStreaks;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, size, size);
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const t = rnd(); const y0 = t * size; const slant = 0.42 + 0.25 * t;
    const len = 0.35 + rnd() * 0.6;
    g.strokeStyle = `rgba(${150 + (rnd() * 90) | 0},${150 + (rnd() * 90) | 0},${150 + (rnd() * 90) | 0},${0.35 + rnd() * 0.45})`;
    g.lineWidth = 0.8 + rnd() * 1.2;
    g.beginPath(); g.moveTo(size * 0.02, y0);
    g.quadraticCurveTo(size * 0.45 * len, y0 + slant * size * 0.12 * len, size * len, y0 + slant * size * 0.35 * len);
    g.stroke();
  }
  const grad = g.createLinearGradient(0, 0, size * 0.06, 0);
  grad.addColorStop(0, 'rgba(90,90,90,0.9)'); grad.addColorStop(1, 'rgba(90,90,90,0)');
  g.fillStyle = grad; g.fillRect(0, 0, size * 0.06, size);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  cachedStreaks = tex; return tex;
}

// Vane half-width as a function of position along the shaft (0..1)
function vaneWidth(u, side) {
  // bare quill for the first quarter, vane widens quickly, holds, peaks about
  // two thirds along and closes to a blunt tip
  const start = 0.22;
  if (u < start) return 0.012 * (u / start);
  const t = (u - start) / (1 - start);
  const rise = 1 - Math.exp(-5.5 * t);
  const fall = Math.pow(Math.max(0, 1 - Math.pow(t, 2.6)), 0.55);
  const peak = 1 + 0.12 * Math.sin(Math.PI * Math.pow(t, 1.4));
  const asym = side > 0 ? 1.0 : 0.72;
  return 0.27 * rise * fall * peak * asym;
}

function buildVane(side, segsU = 96, segsV = 14) {
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [], col = [];
  for (let i = 0; i <= segsU; i++) {
    const u = i / segsU;
    const y = -1 + 2 * u;
    const w = vaneWidth(u, side);
    const shaftBend = 0.10 * Math.sin(u * Math.PI);
    for (let j = 0; j <= segsV; j++) {
      const v = j / segsV;
      const x = side * v * w + shaftBend;
      const slantY = 0.18 * v * w * 2.2;
      const cup = -0.09 * v * v * w * 3.2;
      pos.push(x, y + slantY, cup);
      uv.push(v, u);
      const shade = 0.72 + 0.28 * v;
      col.push(shade, shade, shade);
      if (i < segsU && j < segsV) {
        const a = i * (segsV + 1) + j, b = a + segsV + 1;
        if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function buildRachis() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push(new THREE.Vector3(0.10 * Math.sin(u * Math.PI), -1.02 + 2.06 * u, 0.012));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 48, 1, 8, false);
  const p = tube.attributes.position;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const seg = Math.floor(i / 9) / 48;
    const r = 0.017 * (1 - seg * 0.8) + 0.004;
    tmp.fromBufferAttribute(p, i);
    const c = curve.getPointAt(Math.min(1, seg));
    tmp.sub(c).multiplyScalar(r).add(c);
    p.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  tube.computeVertexNormals();
  return tube;
}

export function createFeather({ color = '#f2f0ee', rachisColor = null, roughness = 0.65, streaks = false } = {}) {
  const group = new THREE.Group();
  const alpha = makeBarbAlpha();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(streaks ? '#ffffff' : color),
    map: streaks ? makeStreakMap() : null,
    roughness,
    metalness: 0.0,
    side: THREE.DoubleSide,
    alphaMap: alpha,
    transparent: true,
    alphaTest: 0.3,
    vertexColors: true,
    depthWrite: true,
    emissive: new THREE.Color(color), emissiveIntensity: color === '#050505' ? 0 : 0.28,
  });
  const rMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(rachisColor || color).multiplyScalar(0.92), roughness: 0.45 });
  const vaneL = new THREE.Mesh(buildVane(-1), mat);
  const vaneR = new THREE.Mesh(buildVane(+1), mat);
  const rachis = new THREE.Mesh(buildRachis(), rMat);
  // measured: the reference silhouette's centroid sits ~6.5% of the length
  // closer to the quill than ours; shift so the pivot matches
  vaneL.position.y = vaneR.position.y = rachis.position.y = -0.13;
  group.add(vaneL, vaneR, rachis);
  group.userData.materials = [mat, rMat];
  return group;
}

// Cheap far-field feathers: a small vane silhouette on a plane (instanced).
export function createFeatherSprites(count = 60, { color = '#5a5858', spread = 12, depth = 10, seed = 3 } = {}) {
  const geo = new THREE.PlaneGeometry(1.0, 1.0, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color, alphaMap: makeSpriteAlpha(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const base = [];
  for (let i = 0; i < count; i++) {
    const z = -1 - rnd() * depth;
    p.set((rnd() - 0.5) * spread, (rnd() - 0.5) * spread * 0.7, z);
    e.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
    q.setFromEuler(e);
    const k = 0.5 + rnd() * 1.1;
    sc.set(k, k, k);
    m.compose(p, q, sc);
    mesh.setMatrixAt(i, m);
    base.push({ p: p.clone(), e: e.clone(), k, phase: rnd() * 6.28, rate: 0.2 + rnd() * 0.5 });
  }
  mesh.userData.base = base;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.update = (t, driftY = 0) => {
    for (let i = 0; i < count; i++) {
      const b = base[i];
      p.set(b.p.x + Math.sin(t * 0.3 + b.phase) * 0.3, b.p.y + Math.cos(t * 0.25 + b.phase) * 0.25 + driftY * (0.4 + (i % 5) * 0.2), b.p.z);
      e.set(b.e.x + t * 0.12 * b.rate, b.e.y + t * 0.1 * b.rate, b.e.z + t * 0.08 * b.rate);
      q.setFromEuler(e); sc.set(b.k, b.k, b.k);
      m.compose(p, q, sc); mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return mesh;
}