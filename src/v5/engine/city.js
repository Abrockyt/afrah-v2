import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLSL_NOISE, pbr, rng} from './core';

// The AFRAH city: procedural and original. Detail falls off by zone —
// A 0–150 m (hero, tower.js) · B 150–520 m · C 520 m+ (simplified, hidden by aerial perspective).

export const RIVER = new THREE.CatmullRomCurve3([[-3000, 0, 430], [-1700, 0, 250], [-800, 0, 300], [0, 0, 235], [800, 0, 330], [1600, 0, 170], [3000, 0, 290]].map(p => new THREE.Vector3(...p)));
const RIVER_HALF = 78;
// the river runs roughly along x, so a 5 m lookup table of its centre line makes distance tests cheap
const RZ = new Float32Array(1201);
{ const pts = RIVER.getSpacedPoints(2400); let j = 0; for (let i = 0; i <= 1200; i++) { const x = -3000 + i * 5; while (j < pts.length - 2 && pts[j + 1].x < x) j++; const a = pts[j], b = pts[j + 1], t = (x - a.x) / Math.max(b.x - a.x, 1e-3); RZ[i] = a.z + (b.z - a.z) * Math.min(Math.max(t, 0), 1); } }
const riverZ = x => { const f = (Math.min(Math.max(x, -3000), 3000) + 3000) / 5, i = Math.min(Math.floor(f), 1199); return RZ[i] + (RZ[i + 1] - RZ[i]) * (f - i); };
export function riverDist(x, z) { const slope = (riverZ(x + 10) - riverZ(x - 10)) / 20; return Math.abs(z - riverZ(x)) / Math.sqrt(1 + slope * slope); }

/* ───── Building families ───── */
// floorH, bay, window (w,h ratio), glass share, pattern (0 residential · 1 office · 2 retail · 3 unlit), wall, floors, footprint
export const FAMILIES = [
  {name: 'residential-mid', floorH: 3.1, bay: 3.3, win: [.52, .58], glass: .1, pattern: 0, wall: '#b9ada0', floors: [6, 12], size: [18, 34]},
  {name: 'residential-tower', floorH: 3.1, bay: 3.0, win: [.6, .62], glass: .15, pattern: 0, wall: '#cfc6ba', floors: [16, 30], size: [20, 28]},
  {name: 'office-curtain', floorH: 3.9, bay: 1.6, win: [.92, .82], glass: .92, pattern: 1, wall: '#2a2f36', floors: [10, 34], size: [26, 44]},
  {name: 'office-stone', floorH: 3.7, bay: 2.4, win: [.62, .6], glass: .35, pattern: 1, wall: '#a9a39a', floors: [6, 14], size: [26, 50]},
  {name: 'low-rise', floorH: 3.3, bay: 3.8, win: [.42, .5], glass: .05, pattern: 0, wall: '#8e8173', floors: [2, 4], size: [10, 20]},
  {name: 'retail-podium', floorH: 5.2, bay: 6, win: [.86, .7], glass: .7, pattern: 2, wall: '#56504a', floors: [1, 2], size: [30, 70]},
  {name: 'civic', floorH: 5, bay: 4.2, win: [.34, .7], glass: .2, pattern: 1, wall: '#d3cbbf', floors: [3, 5], size: [40, 70]},
  {name: 'parking', floorH: 3, bay: 6, win: [.9, .38], glass: 0, pattern: 3, wall: '#6f6c68', floors: [3, 6], size: [30, 55]},
  {name: 'hotel', floorH: 3.2, bay: 3.9, win: [.5, .55], glass: .2, pattern: 0, wall: '#8a7b6a', floors: [12, 22], size: [22, 34]},
  {name: 'historic', floorH: 3.8, bay: 3.2, win: [.34, .52], glass: .05, pattern: 0, wall: '#9e8a72', floors: [4, 6], size: [14, 26]},
  {name: 'industrial', floorH: 7, bay: 9, win: [.7, .18], glass: .1, pattern: 3, wall: '#5c5a56', floors: [1, 2], size: [40, 80]},
  {name: 'slab', floorH: 3.0, bay: 3.2, win: [.55, .5], glass: .1, pattern: 0, wall: '#a39b92', floors: [9, 16], size: [60, 90]},
  {name: 'mixed-use', floorH: 3.4, bay: 2.8, win: [.7, .64], glass: .5, pattern: 0, wall: '#4f4a45', floors: [14, 26], size: [22, 30]},
  {name: 'landmark-office', floorH: 4, bay: 1.5, win: [.94, .86], glass: .95, pattern: 1, wall: '#1d2229', floors: [40, 60], size: [34, 40]},
];

function familyMaterial(F, shared, detail) {
  const m = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .85, metalness: 0, envMapIntensity: .8});
  const u = {uFloorH: {value: F.floorH}, uBay: {value: F.bay}, uWin: {value: new THREE.Vector2(...F.win)}, uGlass: {value: F.glass}, uPattern: {value: F.pattern}, uWall: {value: new THREE.Color(F.wall)}};
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u, {uLights: shared.uCityLights, uTime: shared.uTime});
    s.vertexShader = s.vertexShader
      .replace('#include <common>', 'attribute float aSeed; attribute vec3 aTint;\nvarying vec3 vLoc; varying vec3 vScl; varying vec3 vNL; varying float vSeed; varying vec3 vTint;\n#include <common>')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLoc = position; vNL = normal; vSeed = aSeed; vTint = aTint;
        vScl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uFloorH, uBay, uGlass, uPattern, uLights, uTime; uniform vec2 uWin; uniform vec3 uWall;
        varying vec3 vLoc; varying vec3 vScl; varying vec3 vNL; varying float vSeed; varying vec3 vTint;
        ${GLSL_NOISE}
        float gWin; float gLit; vec3 gLitCol; float gRoof;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          gRoof = step(0.5, vNL.y);
          float u = abs(vNL.x) > 0.5 ? vLoc.z * vScl.z : vLoc.x * vScl.x;
          float h = vLoc.y * vScl.y;
          vec2 cell = vec2(u / uBay, h / uFloorH), f = fract(cell), id = floor(cell);
          float shop = ((uPattern > 1.5 && uPattern < 2.5) || (id.y < 0.5 && h21(vec2(vSeed, 3.0)) > 0.55)) ? 1.0 : 0.0;
          vec2 wr = mix(uWin, vec2(0.9, 0.78), shop);
          float win = step(abs(f.x - 0.5), wr.x * 0.5) * step(abs(f.y - 0.52), wr.y * 0.5);
          float fw = max(fwidth(cell.x), fwidth(cell.y));
          float det = ${detail ? '1.0 - smoothstep(0.22, 0.75, fw)' : '0.0'};
          gWin = mix(wr.x * wr.y, win, det) * (1.0 - gRoof);
          float bandL = smoothstep(0.0, 0.08, f.y) * smoothstep(1.0, 0.92, f.y);
          vec3 wall = uWall * vTint * 0.62 * (0.92 + 0.16 * vnoise(vec2(u, h) * 0.08 + vSeed));
          vec3 glassC = vec3(0.03, 0.035, 0.04);
          vec3 roofC = vec3(0.055, 0.052, 0.05) * vTint;
          diffuseColor.rgb = mix(mix(wall, glassC, max(gWin, uGlass * bandL * (1.0 - gRoof))), roofC, gRoof);
          float r = h21(id + vSeed * 17.0);
          float lit = 0.0;
          if (uPattern < 0.5) lit = step(0.72, r) * (0.25 + 0.75 * h21(id * 1.7 + vSeed));
          else if (uPattern < 1.5) { float fl = h21(vec2(id.y, vSeed)); lit = step(0.62, fl) * step(0.18, r) * 0.7; }
          else if (uPattern < 2.5) lit = 1.0;
          if (shop > 0.5 && id.y < 0.5) lit = 1.1;
          lit = mix(lit, mix(0.2, 0.28, step(uPattern, 1.5)) * step(uPattern, 2.5), 1.0 - det);
          vec3 warm = mix(vec3(1.0, 0.56, 0.25), vec3(1.0, 0.7, 0.42), h21(id + 3.1));
          vec3 cool = vec3(0.85, 0.9, 1.0);
          gLitCol = (uPattern > 0.5 && uPattern < 1.5) ? mix(cool, warm, 0.35) : warm;
          gLit = lit * gWin * uLights;
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.12, gWin);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 0.4, gWin);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += gLitCol * gLit * 0.9;');
  };
  m.customProgramCacheKey = () => 'fam-' + F.name + detail;
  return m;
}

/* ───── Road surface: asphalt + markings + crossings, UV in metres ───── */
function roadMaterial(T) {
  const m = new THREE.MeshStandardMaterial({color: '#6a6a6a', ...T, roughness: 1, envMapIntensity: 1.1});
  m.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader.replace('#include <common>', 'attribute vec2 aRoad; varying vec2 vRoad; varying vec2 vRUv;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vRoad = aRoad; vRUv = uv;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRoad; varying vec2 vRUv; float gMark;')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          diffuseColor *= texture2D(map, vRUv / 6.0);
        #endif
        {
          float W = vRoad.x, L = vRoad.y, u = vRUv.x, v = vRUv.y;
          float fw = fwidth(v) + 1e-4;
          float edge = step(abs(u - 0.7), 0.08) + step(abs(u - (W - 0.7)), 0.08);
          float centre = step(12.0, W) * step(abs(u - W * 0.5), 0.08) * step(fract(v / 9.0), 0.34);
          float zebra = (step(v, 6.5) * step(2.5, v) + step(L - 6.5, v) * step(v, L - 2.5)) * step(fract(u / 1.1), 0.5) * step(0.8, u) * step(u, W - 0.8);
          gMark = clamp((edge + centre) * step(8.0, v) * step(v, L - 8.0) + zebra, 0.0, 1.0) * step(1.0, W) * (1.0 - smoothstep(0.3, 1.2, fw));
          diffuseColor.rgb = mix(diffuseColor.rgb * 0.55, vec3(0.62), gMark * 0.85);
        }`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          vec4 texelRoughness = texture2D(roughnessMap, vRUv / 6.0);
          roughnessFactor *= texelRoughness.g;
          roughnessFactor = mix(roughnessFactor * 0.55, roughnessFactor, smoothstep(0.35, 0.6, texelRoughness.g));
        #endif`)
      .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP_TANGENTSPACE
          vec3 mapN = texture2D(normalMap, vRUv / 6.0).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale;
          normal = normalize(tbn * mapN);
        #endif`);
  };
  m.customProgramCacheKey = () => 'road';
  return m;
}

/* ───── Procedural trees (3 species) with a generated leaf atlas and wind ───── */
function leafAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const R = rng(7);
  for (let i = 0; i < 900; i++) {
    const px = 30 + R() * 452, py = 30 + R() * 452, r = 5 + R() * 9, a = R() * Math.PI;
    x.fillStyle = `hsl(${80 + R() * 60}, ${28 + R() * 20}%, ${18 + R() * 16}%)`;
    x.beginPath(); x.ellipse(px, py, r, r * .45, a, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function speciesGeometry(kind) {
  const R = rng(11 + kind * 97), trunkH = [4.2, 5, 3.4][kind], cards = [];
  const trunk = new THREE.CylinderGeometry(.13, .24, trunkH, 7); trunk.translate(0, trunkH / 2, 0);
  const crowns = kind === 1 ? [[0, 8, 0, 1.6, 4.6]] : kind === 2 ? [[-1.4, 5.6, 0, 3.2, 1.8], [1.6, 6.2, .4, 3, 1.6], [0, 6.9, -.8, 2.6, 1.6]] : [[0, 6.6, 0, 3, 2.7]];
  for (const [cx, cy, cz, rx, ry] of crowns) {
    const n = Math.round(rx * ry * 3.2);
    for (let i = 0; i < n; i++) {
      const p = new THREE.PlaneGeometry(2.2, 2.2);
      p.rotateY(R() * Math.PI); p.rotateX((R() - .5) * 1.2);
      const u = R() * Math.PI * 2, v = Math.acos(2 * R() - 1), rr = Math.cbrt(R());
      p.translate(cx + Math.sin(v) * Math.cos(u) * rx * rr, cy + Math.cos(v) * ry * rr, cz + Math.sin(v) * Math.sin(u) * rx * rr);
      cards.push(p);
    }
  }
  return {trunk, crown: mergeGeometries(cards)};
}
function windPatch(m, shared) {
  m.onBeforeCompile = s => {
    s.uniforms.uTime = shared.uTime;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        float sway = max(position.y - 3.0, 0.0) * 0.018;
        transformed.x += sin(uTime * 0.9 + ip.x * 0.05 + ip.z * 0.03) * sway;
        transformed.z += cos(uTime * 0.7 + ip.z * 0.05) * sway * 0.7;`);
  };
  m.customProgramCacheKey = () => 'wind';
  return m;
}

/* ───── helpers ───── */
function quad(arr, uvArr, roadArr, a, b, W) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), nx = -dz / len * W / 2, nz = dx / len * W / 2;
  const P = [[a[0] + nx, a[1] + nz], [a[0] - nx, a[1] - nz], [b[0] - nx, b[1] - nz], [b[0] + nx, b[1] + nz]];
  const U = [[0, 0], [W, 0], [W, len], [0, len]];
  for (const i of [0, 2, 1, 0, 3, 2]) { arr.push(P[i][0], .03, P[i][1]); uvArr.push(U[i][0], U[i][1]); roadArr.push(W, len); }
}
function trisGeometry(pos, uv, road) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (road) g.setAttribute('aRoad', new THREE.Float32BufferAttribute(road, 2));
  g.computeVertexNormals();
  return g;
}

/* ───── builder ───── */
export async function buildCity({quality = 'high', shared, minimal = false, stage = () => {}}) {
  const P = {high: {extent: 2400, lights: 1}, standard: {extent: 2000, lights: .8}, mobile: {extent: 1300, lights: .5}}[quality];
  if (minimal) P.extent = 520; // v6: building is the hero — only subtle, low context around it
  const R = rng(4242);
  const group = new THREE.Group(); group.name = 'afrah-city';
  const [asphalt, concrete, paving] = await Promise.all([pbr('asphalt'), pbr('concrete'), pbr('paving')]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();

  // ground
  const groundMap = concrete.map?.clone(); if (groundMap) { groundMap.repeat.set(1200, 1200); groundMap.needsUpdate = true; }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({color: '#34322f', map: groundMap, roughness: 1}));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.05; ground.receiveShadow = true; group.add(ground);

  // river: ribbon + embankment walls + animated water normals
  const rv = [], ruv = [], walls = [];
  const N = 240, pts = RIVER.getSpacedPoints(N);
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[i + 1], t = b.clone().sub(a).normalize(), n = new THREE.Vector3(-t.z, 0, t.x);
    const A = [a.clone().addScaledVector(n, RIVER_HALF), a.clone().addScaledVector(n, -RIVER_HALF), b.clone().addScaledVector(n, -RIVER_HALF), b.clone().addScaledVector(n, RIVER_HALF)];
    for (const k of [0, 2, 1, 0, 3, 2]) { rv.push(A[k].x, -1.6, A[k].z); ruv.push(A[k].x / 40, A[k].z / 40); }
    for (const s of [1, -1]) {
      const g = new THREE.BoxGeometry(a.distanceTo(b) + .6, 3.4, 1.4);
      g.rotateY(-Math.atan2(t.z, t.x)); const c = a.clone().add(b).multiplyScalar(.5).addScaledVector(n, s * (RIVER_HALF + .7));
      g.translate(c.x, -1.5, c.z); walls.push(g);
    }
  }
  const waterGeo = trisGeometry(rv, ruv);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshPhysicalMaterial({color: '#030405', roughness: .06, metalness: 0, ior: 1.33, envMapIntensity: 1.7, clearcoat: .6}));
  water.material.onBeforeCompile = s => {
    s.uniforms.uTime = shared.uTime;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uTime; varying vec3 vWW;\n${GLSL_NOISE}`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        { vec2 wp = vWW.xz * 0.08 + vec2(uTime * 0.05, uTime * 0.03); float e = 0.6;
          float h0 = fbm(wp), hx = fbm(wp + vec2(e, 0.0)), hz = fbm(wp + vec2(0.0, e));
          vec3 wn = normalize(vec3((h0 - hx) * 1.2, 1.0, (h0 - hz) * 1.2));
          normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); }`);
  };
  water.material.customProgramCacheKey = () => 'water';
  group.add(water);
  const wall = new THREE.Mesh(mergeGeometries(walls), new THREE.MeshStandardMaterial({color: '#7b766f', ...concrete, roughness: 1}));
  walls.forEach(g => g.dispose());
  wall.receiveShadow = true; group.add(wall);
  stage('river');

  // road network: 200 m grid clipped by the river, riverside boulevards, two bridges
  const segments = [];
  const E = P.extent, S = 200, xs = [], zs = [];
  for (let x = -E + 100; x <= E; x += S) xs.push(x);
  for (let z = -E - 105; z <= E; z += S) zs.push(z);
  const bridges = new Set([-500, 900]);
  const blocked = (x, z) => riverDist(x, z) < RIVER_HALF + 10;
  for (const x of xs) for (let i = 0; i < zs.length - 1; i++) {
    const a = [x, zs[i]], b = [x, zs[i + 1]], mid = [x, (a[1] + b[1]) / 2];
    const cross = blocked(...mid) || blocked(...a) || blocked(...b);
    if (cross && !bridges.has(x)) continue;
    segments.push({a, b, W: Math.abs(x) < 120 || Math.abs(x) % 600 === 100 ? 22 : 16, bridge: cross});
  }
  for (const z of zs) for (let i = 0; i < xs.length - 1; i++) {
    const a = [xs[i], z], b = [xs[i + 1], z], mid = [(a[0] + b[0]) / 2, z];
    if (blocked(...mid) || blocked(...a) || blocked(...b)) continue;
    segments.push({a, b, W: z === -105 ? 22 : 14});
  }
  for (const side of [1, -1]) {
    let prev = null;
    for (const p of RIVER.getSpacedPoints(90)) {
      const t = RIVER.getTangent(Math.max(0, Math.min(1, (p.x + 3000) / 6000)));
      const q2 = [p.x - t.z * side * (RIVER_HALF + 26), p.z + t.x * side * (RIVER_HALF + 26)];
      if (prev && Math.abs(q2[0]) < E && Math.hypot(q2[0] - prev[0], q2[1] - prev[1]) > 5) segments.push({a: prev, b: q2, W: 18, boulevard: true});
      prev = q2;
    }
  }
  const rp = [], ruv2 = [], rr = [], pav = [];
  for (const s of segments) {
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]); if (len < 1) continue;
    quad(rp, ruv2, rr, s.a, s.b, s.W);
    if (s.bridge) continue;
    const dx = (s.b[0] - s.a[0]) / len, dz = (s.b[1] - s.a[1]) / len, nx = -dz, nz = dx;
    for (const e of [1, -1]) {
      const g = new THREE.BoxGeometry(len, .16, 4.4); g.rotateY(-Math.atan2(dz, dx));
      g.translate((s.a[0] + s.b[0]) / 2 + nx * e * (s.W / 2 + 2.2), .08, (s.a[1] + s.b[1]) / 2 + nz * e * (s.W / 2 + 2.2));
      const uv = g.attributes.uv, pp = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 3, pp.getZ(i) / 3);
      pav.push(g);
    }
  }
  const roads = new THREE.Mesh(trisGeometry(rp, ruv2, rr), roadMaterial(asphalt)); roads.receiveShadow = true; group.add(roads);
  const pavement = new THREE.Mesh(mergeGeometries(pav), new THREE.MeshStandardMaterial({color: '#77736d', ...paving, roughness: 1})); pavement.receiveShadow = true; group.add(pavement);
  pav.forEach(g => g.dispose());
  // bridges: decks + gold-lit arches (landmark architectural lighting)
  const bridgeMat = new THREE.MeshStandardMaterial({color: '#3c3a37', roughness: .7});
  const archMat = new THREE.MeshStandardMaterial({color: '#b8955a', metalness: 1, roughness: .3, emissive: new THREE.Color('#ffc576'), emissiveIntensity: 0});
  for (const x of bridges) {
    const zc = riverZ(x);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, RIVER_HALF * 2 + 40), bridgeMat); deck.position.set(x, -.4, zc); deck.castShadow = deck.receiveShadow = true; group.add(deck);
    for (const e of [-1, 1]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(RIVER_HALF + 8, .7, 8, 64, Math.PI), archMat);
      arch.rotation.y = Math.PI / 2; arch.scale.set(1, .32, 1); arch.position.set(x + e * 11, 0, zc); group.add(arch);
    }
  }
  stage('roads');

  // lots → buildings (families by zone)
  const inst = FAMILIES.map(() => ({B: [], C: []})), parks = [];
  const pick = (d, r) => {
    if (d < 520) return [0, 1, 2, 3, 4, 5, 8, 12, 9][Math.floor(r * 9)];
    if (d < 1200) return [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12][Math.floor(r * 11)];
    return [0, 4, 7, 10, 11, 3, 9][Math.floor(r * 7)];
  };
  for (let ix = 0; ix < xs.length - 1; ix++) for (let iz = 0; iz < zs.length - 1; iz++) {
    const x0 = xs[ix] + 14, x1 = xs[ix + 1] - 14, z0 = zs[iz] + 14, z1 = zs[iz + 1] - 14;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, d = Math.hypot(cx, cz);
    if (Math.abs(cx) < 130 && cz > -130 && cz < 130) continue;
    if (riverDist(cx, cz) < RIVER_HALF + 70 || d > E) continue;
    if (R() < .07 && d < 1400) { parks.push([x0, x1, z0, z1]); continue; }
    const zone = d < 520 ? 'B' : 'C';
    const nx = d < 900 ? 2 + Math.floor(R() * 2) : 2, nz = d < 900 ? 2 + Math.floor(R() * 2) : 2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (R() < .12) continue;
      const f = pick(d, R()), F = FAMILIES[f];
      const cw = (x1 - x0) / nx, cd = (z1 - z0) / nz;
      const w = Math.min(cw - 6, F.size[0] + R() * (F.size[1] - F.size[0])), dd = Math.min(cd - 6, F.size[0] + R() * (F.size[1] - F.size[0]));
      if (w < 8 || dd < 8) continue;
      let floors = Math.round(F.floors[0] + Math.pow(R(), d < 700 ? 1.3 : 2) * (F.floors[1] - F.floors[0]));
      if (d < 420) floors = Math.min(floors, 9 + Math.floor(d / 60));
      if (minimal) floors = Math.min(floors, 5); // keep AFRAH dominant in the near zone
      const bx = x0 + cw * (i + .5) + (R() - .5) * (cw - w - 4) * .5, bz = z0 + cd * (j + .5) + (R() - .5) * (cd - dd - 4) * .5;
      const h = floors * F.floorH, tint = .86 + R() * .28;
      inst[f][zone].push({x: bx, z: bz, w, d: dd, h, rot: R() < .15 ? (R() - .5) * .25 : 0, seed: R() * 1000, tint: [tint, tint * (.97 + R() * .05), tint * (.94 + R() * .06)]});
      if (floors > 10 && R() < .45) {
        const k = .55 + R() * .2;
        inst[f][zone].push({x: bx, z: bz, w: w * k, d: dd * k, h: h + F.floorH * Math.round(3 + R() * 6), rot: 0, seed: R() * 1000, tint: [tint, tint, tint]});
      }
    }
  }
  if (!minimal) for (const [x, z] of [[640, 760], [720, 830], [-1180, 880]]) inst[13].B.push({x, z, w: 34, d: 34, h: 150 + R() * 70, rot: .1, seed: R() * 1000, tint: [1, 1, 1]});

  const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, .5, 0);
  const buildings = [];
  FAMILIES.forEach((F, fi) => ['B', 'C'].forEach(zone => {
    const L = inst[fi][zone]; if (!L.length) return;
    const g = unit.clone();
    const mesh = new THREE.InstancedMesh(g, familyMaterial(F, shared, zone === 'B' || quality === 'high'), L.length);
    const seeds = new Float32Array(L.length), tints = new Float32Array(L.length * 3);
    L.forEach((b, i) => { mesh.setMatrixAt(i, m4.compose(v.set(b.x, 0, b.z), q.setFromEuler(eu.set(0, b.rot, 0)), sc.set(b.w, b.h, b.d))); seeds[i] = b.seed; tints.set(b.tint, i * 3); });
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
    mesh.castShadow = zone === 'B'; mesh.receiveShadow = true; mesh.name = F.name + '-' + zone;
    mesh.userData.zone = zone; group.add(mesh); buildings.push(mesh);
  }));
  const crownMat = new THREE.MeshBasicMaterial({color: new THREE.Color('#ffcf85').multiplyScalar(3)});
  inst[13].B.forEach(b => { for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(b.w + .6, .5, b.d + .6), crownMat); s.position.set(b.x, b.h - 2 - k * 5, b.z); s.rotation.y = b.rot; group.add(s); } });
  stage('buildings');

  // street lights: poles + luminaires + light pools
  const lampPts = [];
  for (const s of segments) {
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), dx = (s.b[0] - s.a[0]) / len, dz = (s.b[1] - s.a[1]) / len;
    const mid = Math.hypot((s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2);
    if (mid > 1500 * P.lights && s.W < 20) continue;
    let k = 0;
    for (let d = 12; d < len - 8; d += 34, k++) for (const e of [1, -1]) {
      if (e < 0 && k % 2) continue;
      lampPts.push([s.a[0] + dx * d - dz * e * (s.W / 2 + .8), s.a[1] + dz * d + dx * e * (s.W / 2 + .8), e * -dz, e * dx, s.boulevard ? 0 : (Math.round(s.a[0]) + k) % 3 === 0 ? 1 : 0]);
    }
  }
  const poleG = new THREE.CylinderGeometry(.08, .12, 9, 6); poleG.translate(0, 4.5, 0);
  const headG = new THREE.BoxGeometry(.5, .14, 1.2); headG.translate(0, 9, -.4);
  const pc = document.createElement('canvas'); pc.width = pc.height = 128;
  { const x = pc.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  const poleM = new THREE.MeshStandardMaterial({color: '#1b1a19', metalness: .7, roughness: .5});
  const headM = new THREE.MeshBasicMaterial({color: new THREE.Color('#ffd29a').multiplyScalar(5)});
  const poolM = new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(pc), color: new THREE.Color('#ffb870').multiplyScalar(.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
  const poles = new THREE.InstancedMesh(poleG, poleM, lampPts.length), heads = new THREE.InstancedMesh(headG, headM, lampPts.length);
  const poolG = new THREE.PlaneGeometry(16, 16); poolG.rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolG, poolM, lampPts.length);
  const cool = new THREE.Color('#dde6ff'), warmC = new THREE.Color('#ffffff');
  lampPts.forEach(([x, z, ox, oz, c], i) => {
    m4.compose(v.set(x, 0, z), q.setFromEuler(eu.set(0, Math.atan2(ox, oz), 0)), sc.set(1, 1, 1));
    poles.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
    pools.setMatrixAt(i, m4.compose(v.set(x - ox * 3, .09, z - oz * 3), q.identity(), sc.set(1, 1, 1)));
    heads.setColorAt(i, c ? cool : warmC);
  });
  pools.renderOrder = 2; group.add(poles, heads, pools);
  stage('lights');

  // traffic: bodies + head/tail lights moving along road segments
  const carCount = {high: 160, standard: 70, mobile: 24}[quality];
  const lanes = segments.filter(s => s.bridge || Math.hypot((s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2) < 1300);
  const bodyG = mergeGeometries([new THREE.BoxGeometry(4.4, .8, 1.8).translate(0, .6, 0), new THREE.BoxGeometry(2.4, .6, 1.6).translate(-.2, 1.25, 0)]);
  const lightG = new THREE.PlaneGeometry(.35, .18); lightG.rotateY(Math.PI / 2);
  const cars = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({color: '#ffffff', metalness: .6, roughness: .35, envMapIntensity: 1.2}), carCount);
  const fronts = new THREE.InstancedMesh(lightG, new THREE.MeshBasicMaterial({color: new THREE.Color('#fff3dc').multiplyScalar(6), side: THREE.DoubleSide}), carCount * 2);
  const backs = new THREE.InstancedMesh(lightG, new THREE.MeshBasicMaterial({color: new THREE.Color('#ff2a1a').multiplyScalar(4), side: THREE.DoubleSide}), carCount * 2);
  const carState = Array.from({length: carCount}, () => ({s: lanes[Math.floor(R() * lanes.length)], t: R(), dir: R() < .5 ? 1 : -1, v: 9 + R() * 6}));
  const palette = ['#15161a', '#2c2e33', '#d9d9d6', '#4a4d52', '#1d2433', '#6b5c4a'];
  carState.forEach((c, i) => cars.setColorAt(i, new THREE.Color(palette[i % palette.length])));
  cars.castShadow = true; group.add(cars, fronts, backs);
  const lp = new THREE.Vector3();
  function updateTraffic(dt) {
    carState.forEach((c, i) => {
      let len = Math.hypot(c.s.b[0] - c.s.a[0], c.s.b[1] - c.s.a[1]);
      c.t += c.dir * c.v * dt / len;
      if (c.t > 1 || c.t < 0) { c.s = lanes[Math.floor(R() * lanes.length)]; c.t = c.dir > 0 ? 0 : 1; len = Math.hypot(c.s.b[0] - c.s.a[0], c.s.b[1] - c.s.a[1]); }
      const dx = (c.s.b[0] - c.s.a[0]) / len, dz = (c.s.b[1] - c.s.a[1]) / len, lane = c.s.W * .22 * c.dir;
      const x = c.s.a[0] + dx * len * c.t - dz * lane, z = c.s.a[1] + dz * len * c.t + dx * lane, y = c.s.bridge ? .4 : 0;
      q.setFromEuler(eu.set(0, Math.atan2(-dz * c.dir, dx * c.dir), 0));
      cars.setMatrixAt(i, m4.compose(v.set(x, y, z), q, sc.set(1, 1, 1)));
      for (const [k, side] of [[0, -.6], [1, .6]]) {
        lp.set(2.21, .72, side).applyQuaternion(q); fronts.setMatrixAt(i * 2 + k, m4.compose(v.set(x + lp.x, y + lp.y, z + lp.z), q, sc.set(1, 1, 1)));
        lp.set(-2.21, .78, side).applyQuaternion(q); backs.setMatrixAt(i * 2 + k, m4.compose(v.set(x + lp.x, y + lp.y, z + lp.z), q, sc.set(1, 1, 1)));
      }
    });
    cars.instanceMatrix.needsUpdate = fronts.instanceMatrix.needsUpdate = backs.instanceMatrix.needsUpdate = true;
  }
  updateTraffic(0);
  stage('traffic');

  // vegetation
  const atlas = leafAtlas();
  const leafM = windPatch(new THREE.MeshStandardMaterial({map: atlas, alphaTest: .45, side: THREE.DoubleSide, roughness: .85, color: '#a4b092'}), shared);
  const barkM = new THREE.MeshStandardMaterial({color: '#2a211b', roughness: .95});
  const species = [0, 1, 2].map(speciesGeometry);
  const treeSets = [[], [], []];
  function addTrees(list) { for (const [x, y, z, s, r, k] of list) treeSets[k ?? Math.floor(R() * 3)].push([x, y, z, s, r]); }
  for (const s of segments) {
    const mid = Math.hypot((s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2);
    if (mid > (quality === 'mobile' ? 350 : 700) || s.bridge) continue;
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), dx = (s.b[0] - s.a[0]) / len, dz = (s.b[1] - s.a[1]) / len;
    for (let d = 20; d < len - 14; d += 15) for (const e of [1, -1]) if (R() < .75) treeSets[R() < .6 ? 0 : 1].push([s.a[0] + dx * d - dz * e * (s.W / 2 + 3), 0, s.a[1] + dz * d + dx * e * (s.W / 2 + 3), .8 + R() * .45, R() * 6.28]);
  }
  for (const [x0, x1, z0, z1] of parks) {
    const n = Math.round((x1 - x0) * (z1 - z0) / 260 * (quality === 'mobile' ? .3 : 1));
    for (let i = 0; i < n; i++) treeSets[Math.floor(R() * 3)].push([x0 + R() * (x1 - x0), 0, z0 + R() * (z1 - z0), .8 + R() * .6, R() * 6.28]);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({color: '#1d2419', roughness: 1}));
    lawn.rotation.x = -Math.PI / 2; lawn.position.set((x0 + x1) / 2, .02, (z0 + z1) / 2); lawn.receiveShadow = true; group.add(lawn);
  }
  let treeMeshes = [];
  function commitTrees(density = 1) {
    treeMeshes.forEach(m => { group.remove(m); m.dispose(); }); treeMeshes = [];
    species.forEach((sp, k) => {
      const L = treeSets[k].filter((_, i) => ((i * 7919) % 100) / 100 < density); if (!L.length) return;
      const trunk = new THREE.InstancedMesh(sp.trunk, barkM, L.length), crown = new THREE.InstancedMesh(sp.crown, leafM, L.length);
      const col = new THREE.Color();
      L.forEach(([x, y, z, s, r], i) => { m4.compose(v.set(x, y, z), q.setFromEuler(eu.set(0, r, 0)), sc.set(s, s * (.9 + (i % 5) * .05), s)); trunk.setMatrixAt(i, m4); crown.setMatrixAt(i, m4); crown.setColorAt(i, col.setHSL(.22 + (i % 7) * .012, .25, .42 + (i % 3) * .05)); });
      trunk.castShadow = crown.castShadow = true; crown.receiveShadow = true;
      group.add(trunk, crown); treeMeshes.push(trunk, crown);
    });
  }

  // shrubs (Poly Haven shrub_04, CC0) instanced on terraces and planters
  async function addShrubs(list, max) {
    if (!max || !list.length) return;
    const g = await new GLTFLoader().loadAsync('/v5/models/shrub_04/shrub_04.gltf');
    let mesh; g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    const L = list.slice(0, max);
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, L.length);
    L.forEach(([x, y, z, s, r], i) => im.setMatrixAt(i, m4.compose(v.set(x, y, z), q.setFromEuler(eu.set(0, r, 0)), sc.setScalar(s))));
    im.castShadow = true; im.receiveShadow = true; group.add(im);
  }

  return {
    group, buildings, stats: {segments: segments.length, lamps: lampPts.length, cars: carCount},
    addTrees, commitTrees, addShrubs,
    update(env, t, dt) {
      headM.color.set('#ffd29a').multiplyScalar(.3 + env.street * 3.2);
      poolM.color.set('#ffb870').multiplyScalar(env.street * .16);
      archMat.emissiveIntensity = env.lantern * 1.4;
      crownMat.color.set('#ffcf85').multiplyScalar(.4 + env.lantern * 3);
      fronts.visible = backs.visible = env.street > .05;
      updateTraffic(dt);
    },
    setFarVisible(on) { buildings.forEach(b => { if (b.userData.zone === 'C') b.visible = on; }); },
  };
}

/* ───── Clouds: camera-facing cards with domain-warped fbm (first principles) ───── */
export function buildClouds({count = 12, shared}) {
  count += 14;
  const mat = new THREE.ShaderMaterial({
    uniforms: {uTime: shared.uTime, uTop: {value: new THREE.Color('#5c6b86')}, uBottom: {value: new THREE.Color('#1b2233')}, uCity: {value: new THREE.Color('#ffae62')}, uCityGlow: {value: 1}, uOpacity: {value: 1}},
    vertexShader: `varying vec2 vUv; varying float vDepth; varying float vSeed; attribute float aSeed;
      void main(){ vUv = uv; vSeed = aSeed;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 sc = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        mv.xy += position.xy * sc;
        vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uCityGlow, uOpacity; uniform vec3 uTop, uBottom, uCity; varying vec2 vUv; varying float vDepth; varying float vSeed;
      ${GLSL_NOISE}
      void main(){
        vec2 p = (vUv - 0.5) * 2.0;
        vec2 q = p * 1.6 + vSeed * 13.0 + vec2(uTime * 0.004, uTime * 0.002);
        vec2 w = vec2(fbm(q + 3.1), fbm(q + 7.7));
        float n = fbm(q + w * 1.4);
        float shape = smoothstep(1.0, 0.25, length(p * vec2(1.0, 1.7)));
        float a = smoothstep(0.42, 0.78, n * shape + shape * 0.25) * 0.85;
        a *= smoothstep(30.0, 260.0, vDepth);
        vec3 c = mix(uBottom, uTop, smoothstep(-0.6, 0.8, p.y + (n - 0.5)));
        c += uCity * uCityGlow * 0.18 * smoothstep(0.3, -0.9, p.y) * n;
        gl_FragColor = vec4(c, a * uOpacity);
      }`,
    transparent: true, depthWrite: false,
  });
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const seeds = new Float32Array(count), R = rng(99), m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const deck = Math.round(count * .7); // the intro starts inside this deck above the city (camera path near 1500, 1500, 2300)
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2, r = 250 + R() * 1400, size = 700 + R() * 900;
    if (i < deck) mesh.setMatrixAt(i, m4.compose(v.set(900 + (R() - .5) * 1800, 1050 + R() * 380, 1500 + (R() - .5) * 1800), q, s.set(size * 1.2, size * .6, 1)));
    else mesh.setMatrixAt(i, m4.compose(v.set(Math.cos(a) * r, 520 + R() * 380, Math.sin(a) * r), q, s.set(size, size * .45, 1)));
    seeds[i] = R() * 10;
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  mesh.frustumCulled = false; mesh.renderOrder = 5;
  return {group: mesh, material: mat, dispose() { geo.dispose(); mat.dispose(); }};
}
