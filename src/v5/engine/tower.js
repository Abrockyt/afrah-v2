import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLSL_NOISE, pbr, rng} from './core';

// The AFRAH hero tower — an original design, generated procedurally so every architectural
// element has real depth: stone piers, projecting slab bands, recessed glazing with bronze
// mullions + transoms, corner balconies (stone slab, glass balustrade, bronze rail, soffit lights),
// planted setback terraces, parapets, a colonnaded lobby with a bronze canopy and a lantern crown.
// Units are metres. Front (entrance) faces +Z.

export const TOWER = {levels: 26, base: 9, floorH: 3.4};
const FH = TOWER.floorH;
const BLOCKS = [ // levels are 1-based
  {from: 1, to: 14, w: 38, d: 28},
  {from: 15, to: 20, w: 32, d: 23},
  {from: 21, to: 24, w: 26, d: 18},
  {from: 25, to: 26, w: 20, d: 14},
];
const levelY = l => TOWER.base + (l - 1) * FH;
export const TOWER_TOP = levelY(27);
export const CROWN_TOP = TOWER_TOP + 24;

/* ───── geometry helpers: boxes with world-scaled UVs so textures keep a physical size ───── */
function box(list, cx, cy, cz, sx, sy, sz, uvScale = 2.5) {
  if (sx <= 0 || sy <= 0 || sz <= 0) return;
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > .5) uv.setXY(i, x / uvScale, z / uvScale); else if (ax > .5) uv.setXY(i, z / uvScale, y / uvScale); else uv.setXY(i, x / uvScale, y / uvScale);
  }
  list.push(g);
}
// The four facades. at(s, o): s = position along the side, o = outward offset from the facade line.
function sideFrame(side, w, d) {
  switch (side) {
    case 0: return {len: w, at: (s, o) => [s, d / 2 + o], rot: 0, sx: (a, b) => [a, b]};
    case 1: return {len: d, at: (s, o) => [w / 2 + o, -s], rot: Math.PI / 2, sx: (a, b) => [b, a]};
    case 2: return {len: w, at: (s, o) => [-s, -d / 2 - o], rot: Math.PI, sx: (a, b) => [a, b]};
    default: return {len: d, at: (s, o) => [-w / 2 - o, s], rot: -Math.PI / 2, sx: (a, b) => [b, a]};
  }
}
// box aligned to a facade: along-side length a, height h, depth c, centred at (s, y, o)
function sideBox(list, F, s, y, o, a, h, c, uv) { const [x, z] = F.at(s, o); const [sx, sz] = F.sx(a, c); box(list, x, y, z, sx, h, sz, uv); }

/* ───── window shader: interior mapping + seeded occupancy + Fresnel glass ───── */
export function windowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uEnv: {value: null}, uEnvRot: {value: 0}, uEnvInt: {value: .5}, uTime: {value: 0}, uLights: {value: 1},
      uReveal: {value: 1e4}, uSel: {value: -9}, uHov: {value: -9},
      uCity: {value: new THREE.Color('#0b0d12')}, uGold: {value: new THREE.Color('#d8b36a')},
    }]),
    vertexShader: `
      attribute float aSeed; attribute vec2 aSize; attribute float aKind; attribute float aLevel;
      varying vec2 vUv; varying vec3 vViewLocal; varying vec3 vWP; varying vec3 vN; varying float vSeed; varying vec2 vSize; varying float vKind; varying float vLevel;
      #include <fog_pars_vertex>
      void main(){
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.0);
        vec3 right = normalize(m[0].xyz), up = normalize(m[1].xyz), nrm = normalize(m[2].xyz);
        vec3 v = wp.xyz - cameraPosition;
        vViewLocal = vec3(dot(v, right), dot(v, up), dot(v, nrm));
        vUv = uv; vWP = wp.xyz; vN = nrm; vSeed = aSeed; vSize = aSize; vKind = aKind; vLevel = aLevel;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        vec3 transformed = position;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D uEnv; uniform float uEnvRot, uEnvInt, uTime, uLights, uReveal, uSel, uHov; uniform vec3 uCity, uGold;
      varying vec2 vUv; varying vec3 vViewLocal; varying vec3 vWP; varying vec3 vN; varying float vSeed; varying vec2 vSize; varying float vKind; varying float vLevel;
      #include <fog_pars_fragment>
      ${GLSL_NOISE}
      vec3 envAt(vec3 d){ float a = atan(d.z, d.x) + uEnvRot; return texture2D(uEnv, vec2(fract(a / 6.2831853 + 0.5), asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5)).rgb; }
      void main(){
        if (vWP.y > uReveal) discard;
        float W = vSize.x, H = vSize.y, lobby = step(0.5, vKind), D = mix(4.4, 16.0, lobby);
        vec3 p = vec3(vUv.x * W, vUv.y * H, 0.0);
        vec3 d = normalize(vViewLocal);
        d.z = min(d.z, -0.02);
        float tx = d.x > 0.0 ? (W - p.x) / d.x : -p.x / min(d.x, -1e-4);
        float ty = d.y > 0.0 ? (H - p.y) / d.y : -p.y / min(d.y, -1e-4);
        float tz = -D / d.z;
        float t = min(min(tx, ty), tz);
        vec3 q = p + d * t;

        // seeded occupancy OFF / DIM / WARM / BRIGHT; ~4 % of rooms change state every ~24 s
        float s = h11(vSeed * 91.7);
        float epoch = floor(uTime / 24.0 + h11(vSeed * 3.3) * 8.0);
        if (h11(vSeed * 1.7 + epoch * 0.37) < 0.04) s = h11(vSeed * 13.1 + epoch);
        float lum = s < 0.3 ? 0.0 : s < 0.55 ? 0.22 : s < 0.9 ? 0.72 : 1.3;
        lum = mix(lum, 1.6, lobby);
        vec3 lightCol = mix(vec3(1.0, 0.55, 0.24), vec3(1.0, 0.72, 0.45), h11(vSeed * 5.9)); // ≈ 2400–3200 K

        vec3 wallC = mix(vec3(0.48, 0.43, 0.37), vec3(0.66, 0.62, 0.56), h11(vSeed * 2.1));
        vec3 base;
        if (t == tz) {
          base = wallC * 0.85;
          vec2 art = abs(q.xy - vec2(W * (0.3 + 0.4 * h11(vSeed * 4.2)), H * 0.55)) - vec2(0.45, 0.32);
          if (h11(vSeed * 8.8) > 0.5 && max(art.x, art.y) < 0.0) base = vec3(0.09, 0.08, 0.07);
        } else if (t == ty) base = d.y > 0.0 ? vec3(0.78, 0.75, 0.7) : vec3(0.16, 0.11, 0.075);
        else base = wallC;
        vec3 lp = vec3(W * 0.5, H - 0.2, -D * 0.45);
        float fall = 1.0 / (1.0 + dot(q - lp, q - lp) * mix(0.16, 0.012, lobby));
        vec3 interior = base * lightCol * lum * (0.28 + 1.9 * fall) * uLights + base * 0.0035;

        // furniture / people silhouettes against the lit room
        float tp = (-D * 0.55) / d.z;
        if (tp < t) {
          vec3 r = p + d * tp; float sh = h11(vSeed * 6.6), cx = W * (0.25 + 0.5 * h11(vSeed * 7.7));
          float m = 0.0;
          if (sh < 0.35) m = step(abs(r.x - cx), 0.9) * step(r.y, 0.8);
          else if (sh < 0.55) m = max(step(abs(r.x - cx), 0.22) * step(r.y, 1.45), step(length(r.xy - vec2(cx, 1.62)), 0.13));
          else if (sh < 0.7) m = step(abs(r.x - cx), 0.03) * step(r.y, 1.6) + step(length((r.xy - vec2(cx, 1.62)) * vec2(1.0, 1.4)), 0.2);
          interior = mix(interior, interior * 0.1, clamp(m, 0.0, 1.0) * 0.92);
        }

        // sheer curtains from the sides and roller blinds, glowing when the room is lit
        float tc = -0.14 / d.z; vec3 c = p + d * tc;
        float cL = h11(vSeed * 3.7) * 0.42, cR = h11(vSeed * 9.2) * 0.42;
        float blind = h11(vSeed * 4.9) > 0.8 ? h11(vSeed * 2.8) * 0.7 : 0.0;
        float curtain = max(step(c.x, W * cL), step(W * (1.0 - cR), c.x));
        float blindM = step(H * (1.0 - blind), c.y) * step(0.001, blind);
        float folds = 0.82 + 0.18 * sin(c.x * 11.0 + h11(vSeed) * 6.0);
        vec3 fabric = vec3(0.09, 0.08, 0.07) + lightCol * lum * uLights * 0.62 * folds;
        interior = mix(interior, fabric, curtain * 0.9 * (1.0 - lobby));
        interior = mix(interior, vec3(0.07, 0.065, 0.06) + lightCol * lum * uLights * 0.5, blindM * (1.0 - lobby));

        // architectural glass: IOR 1.52 → F0 ≈ 0.043, Schlick Fresnel, environment reflection
        vec3 V = normalize(vWP - cameraPosition), N = normalize(vN);
        vec3 R = reflect(V, N);
        R.xz += (vnoise(vUv * 1.5 + vSeed * 17.0) - 0.5) * 0.006;
        vec3 refl = envAt(normalize(R)) * uEnvInt;
        refl = mix(refl, uCity, smoothstep(0.02, -0.25, R.y));
        float ct = clamp(dot(-V, N), 0.0, 1.0);
        float F = 0.043 + 0.957 * pow(1.0 - ct, 5.0);
        vec3 col = interior * vec3(0.84, 0.88, 0.88) * (1.0 - F) + refl * (F + 0.035);

        float sel = 1.0 - step(0.5, abs(vLevel - uSel));
        float hov = 1.0 - step(0.5, abs(vLevel - uHov));
        col = mix(col, uGold * 0.55, sel * 0.4) + uGold * (sel * 0.35 + hov * 0.14);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
}

/* ───── standard-material patch: world position, stone panel seams, reveal, level wash ───── */
function patch(material, shared, {seams = false, seamSize = [1.5, 0.75]} = {}) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uReveal = shared.uReveal; shader.uniforms.uSel = shared.uSel; shader.uniforms.uGold = shared.uGold;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vNW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vNW = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWP; varying vec3 vNW; uniform float uReveal, uSel; uniform vec3 uGold;\n${GLSL_NOISE}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (vWP.y > uReveal) discard;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        ${seams ? `{
          vec3 an = abs(vNW);
          vec2 pc = an.y > 0.5 ? vWP.xz : (an.x > an.z ? vWP.zy : vWP.xy);
          vec2 sz = an.y > 0.5 ? vec2(${seamSize[0]}, ${seamSize[0]}) : vec2(${seamSize[0]}, ${seamSize[1]});
          vec2 cell = pc / sz, f = fract(cell), gap = min(f, 1.0 - f) * sz;
          float fw = fwidth(pc.x);
          float seam = (1.0 - smoothstep(0.004, 0.004 + fw * 1.5, min(gap.x, gap.y))) * (1.0 - smoothstep(0.02, 0.09, fw));
          float tint = (h21(floor(cell) + floor(vWP.y * 0.02)) - 0.5) * 0.08 + (vnoise(pc * 0.05) - 0.5) * 0.08;
          diffuseColor.rgb *= (1.0 + tint) * (1.0 - seam * 0.6);
        }` : ''}
        float lvl = floor((vWP.y - ${TOWER.base.toFixed(1)}) / ${FH.toFixed(2)}) + 1.0;
        diffuseColor.rgb = mix(diffuseColor.rgb, uGold, (1.0 - step(0.5, abs(lvl - uSel))) * 0.28);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGold * 3.0 * (1.0 - smoothstep(0.0, 0.35, uReveal - vWP.y)) * step(uReveal, 4000.0);`);
  };
  material.customProgramCacheKey = () => 'afrah-' + material.name + seams;
  return material;
}

/* ───── builder ───── */
export async function buildTower({quality = 'high', shared}) {
  const hi = quality !== 'mobile';
  const P = {stone: [], bronze: [], gold: [], granite: [], rail: [], soffit: [], deck: [], lobbyGlass: [], planter: [], water: []};
  const windows = [];
  const trees = [], shrubs = [], bollards = [];
  const R = rng(20260924);

  // ── Podium / lobby (0 → 9 m) ──
  const PW = 54, PD = 42, LOBBY = TOWER.base;
  box(P.granite, 0, .3, 0, PW + 1.2, .6, PD + 1.2, 1.2);
  box(P.stone, 0, LOBBY - .6, 0, PW, 1.2, PD, 2.5);
  box(P.deck, 0, LOBBY + .02, 0, PW - .8, .06, PD - .8, 1.2);
  for (let side = 0; side < 4; side++) {
    const F = sideFrame(side, PW, PD), n = Math.round(F.len / 4.5), bay = F.len / n;
    for (let i = 0; i <= n; i++) sideBox(P.stone, F, -F.len / 2 + i * bay, (LOBBY - 1.2) / 2 + .6, .15, 1.1, LOBBY - 1.2, 1.3, 2.5);
    for (let i = 0; i < n; i++) {
      const s = -F.len / 2 + (i + .5) * bay;
      if (side === 2 && i % 2) { sideBox(P.stone, F, s, LOBBY / 2, -1.2, bay - 1.1, LOBBY - 1.8, .5, 2.5); continue; }
      sideBox(P.lobbyGlass, F, s, (LOBBY - 1.8) / 2 + .6, -1.5, bay - 1.1, LOBBY - 1.8, .06);
      sideBox(P.bronze, F, s, LOBBY - 1.28, -1.45, bay - 1.1, .14, .18);
      sideBox(P.bronze, F, s, .66, -1.45, bay - 1.1, .12, .18);
      for (const m of [-.25, .25]) sideBox(P.bronze, F, s + m * (bay - 1.1), (LOBBY - 1.8) / 2 + .6, -1.45, .08, LOBBY - 1.8, .16);
      const [x, z] = F.at(s, -1.56);
      windows.push({x, y: .6 + (LOBBY - 1.8) / 2, z, w: bay - 1.2, h: LOBBY - 1.9, rot: F.rot, seed: R() * 1000, kind: 1, level: 0});
    }
  }
  box(P.bronze, 0, 5.4, PD / 2 + 3.2, 16, .38, 7.4, 3);
  box(P.soffit, 0, 5.19, PD / 2 + 3.2, 14.6, .04, .22, 3);
  for (const x of [-5, -1.7, 1.7, 5]) box(P.soffit, x, 5.19, PD / 2 + 5.2, .5, .04, .5, 1);
  box(P.gold, 0, 5.62, PD / 2 + 6.86, 16, .06, .06, 1);
  for (let k = 0; k < 3; k++) box(P.granite, 0, .75 + k * .15, PD / 2 + 1.4 + k * .45, 18 - k * .8, .15, .9, 1.2);

  // ── Tower blocks ──
  const GL = .55; // glazing set back from the slab edge
  BLOCKS.forEach((B, bi) => {
    const y0 = levelY(B.from), y1 = levelY(B.to + 1), H = y1 - y0;
    for (let side = 0; side < 4; side++) {
      const F = sideFrame(side, B.w, B.d), n = Math.max(3, Math.round(F.len / 3.2)), bay = F.len / n;
      const long = side % 2 === 0;
      for (let i = 0; i <= n; i += 2) sideBox(P.stone, F, -F.len / 2 + i * bay, y0 + (H + 1.3) / 2, .12, i === 0 || i === n ? 1.25 : .82, H + 1.3, .95, 2.5);
      if (n % 2) sideBox(P.stone, F, F.len / 2, y0 + (H + 1.3) / 2, .12, 1.25, H + 1.3, .95, 2.5);
      for (let l = B.from; l <= B.to; l++) {
        const y = levelY(l);
        sideBox(P.stone, F, 0, y + .22, -GL / 2 + .05, F.len, .44, GL + .1, 2.5);
        for (let i = 0; i < n; i++) {
          const s = -F.len / 2 + (i + .5) * bay, pierL = i % 2 === 0, pierR = (i + 1) % 2 === 0 || i === n - 1;
          const wL = s - bay / 2 + (pierL ? .41 : .045), wR = s + bay / 2 - (pierR ? .41 : .045), ww = wR - wL, wc = (wL + wR) / 2;
          const wy = y + .44, wh = FH - .44;
          const [x, z] = F.at(wc, -GL);
          windows.push({x, y: wy + wh / 2, z, w: ww, h: wh, rot: F.rot, seed: R() * 1000, kind: 0, level: l});
          if (!pierL) sideBox(P.bronze, F, s - bay / 2, wy + wh / 2, -GL + .07, .09, wh, .16);
          sideBox(P.bronze, F, wc, wy + wh / 2, -GL + .05, .05, wh, .1);
          sideBox(P.bronze, F, wc, wy + 2.28, -GL + .05, ww, .05, .1);
          const corner = long && (i === 0 || i === n - 1) && l >= 3;
          if (corner) {
            const dep = 1.85, bw = bay + .2;
            sideBox(P.stone, F, s, y + .16, dep / 2 + .05, bw, .3, dep, 2.5);
            sideBox(P.rail, F, s, y + .88, dep + .02, bw - .1, 1.05, .025);
            for (const e of [-1, 1]) sideBox(P.rail, F, s + e * (bw / 2 - .06), y + .88, dep / 2 + .1, .025, 1.05, dep - .1);
            sideBox(P.bronze, F, s, y + 1.44, dep + .02, bw, .06, .07);
            for (const e of [-1, 1]) sideBox(P.bronze, F, s + e * (bw / 2 - .04), y + 1.44, dep / 2 + .1, .07, .06, dep - .1);
            if (hi) for (const e of [-.3, .3]) sideBox(P.soffit, F, s + e * bw, y - .005, dep * .55, .22, .02, .22);
          } else if (hi) sideBox(P.bronze, F, wc, wy + 1.05, -GL + .14, ww, .045, .05);
        }
      }
      sideBox(P.stone, F, 0, y1 + .6, -.1, F.len + .2, 1.2, .7, 2.5);
    }
    box(P.stone, 0, y1 + .03, 0, B.w - .9, .06, B.d - .9, 3);
    const N = BLOCKS[bi + 1];
    if (N) {
      box(P.deck, 0, y1 + .1, 0, B.w - 1.2, .08, B.d - 1.2, 1.2);
      for (let side = 0; side < 4; side++) {
        const F = sideFrame(side, B.w, B.d);
        sideBox(P.rail, F, 0, y1 + 1.8, -.45, F.len - 1.4, 1.1, .025);
        sideBox(P.bronze, F, 0, y1 + 2.36, -.45, F.len - 1.4, .06, .06);
        const inner = side % 2 === 0 ? (B.d - N.d) / 2 : (B.w - N.w) / 2;
        const pw = Math.min(1.1, inner - 1.6);
        if (pw > .5) {
          sideBox(P.planter, F, 0, y1 + .55, -.9 - pw / 2, F.len - 3, .9, pw, 1.2);
          for (let k = 0; k < Math.floor((F.len - 4) / 3.2); k++) { const [x, z] = F.at(-F.len / 2 + 2.2 + k * 3.2, -.9 - pw / 2); shrubs.push([x, y1 + 1.0, z, .55 + R() * .25, R() * 6.28]); }
        }
      }
    }
  });

  // ── Crown: stepped stone fins around a bronze-and-gold lantern ──
  const top = TOWER_TOP, D = BLOCKS[3];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (let k = 0; k < 4; k++) {
      const h = 6 - k * .9, w = 1.6 - k * .25;
      box(P.stone, sx * (D.w / 2 - .8 - k * .9), top + 1.2 + k * 4.2 + h / 2, sz * (D.d / 2 - .8 - k * .6), w, h, w, 2.5);
    }
  }
  box(P.bronze, 0, top + 7, 0, 10, 12, 6.6, 3);
  for (let k = -4; k <= 4; k++) { box(P.gold, k * 1.2, top + 7, 3.36, .16, 11.6, .14, 1); box(P.gold, k * 1.2, top + 7, -3.36, .16, 11.6, .14, 1); }
  for (let k = -2; k <= 2; k++) { box(P.gold, 5.06, top + 7, k * 1.2, .14, 11.6, .16, 1); box(P.gold, -5.06, top + 7, k * 1.2, .14, 11.6, .16, 1); }
  box(P.stone, 0, top + 13.4, 0, 11.4, .8, 8, 2.5);
  box(P.bronze, 0, top + 16.5, 0, 5.2, 5.4, 3.4, 3);
  box(P.gold, 0, top + 20.6, 0, .35, 7, .35, 1);

  // ── Plaza: granite, reflecting pool, planters, trees, bollards ──
  box(P.granite, 0, .02, 18, 130, .04, 104, 1.2);
  box(P.granite, 0, .1, 44, 30, .2, 12, 1.2);
  box(P.water, 0, .16, 44, 28.6, .06, 10.6, 4);
  for (const x of [-48, -34, 34, 48]) for (const z of [30, 48, 62]) { box(P.planter, x, .45, z, 7, .9, 7, 1.2); trees.push([x, .9, z, 1 + R() * .25, R() * 6.28, 0]); }
  for (let k = 0; k < 14; k++) trees.push([-60 + k * 9.2, 0, -32 + (k % 2) * 3, .85 + R() * .3, R() * 6.28, 1]);
  for (let k = -5; k <= 5; k++) if (Math.abs(k) > 1) bollards.push([k * 3.4, 0, PD / 2 + 12.5]);
  for (const x of [-40, -28, 28, 40]) for (const z of [36, 54]) shrubs.push([x, .9, z, .8 + R() * .3, R() * 6.28]);

  // ── materials ──
  const [stoneT, graniteT, pavingT, metalT] = await Promise.all([pbr('stone'), pbr('granite'), pbr('paving'), pbr('metal')]);
  const M = {
    stone: patch(new THREE.MeshStandardMaterial({name: 'stone', color: '#efe7da', ...stoneT, roughness: 1, normalScale: new THREE.Vector2(.6, .6), envMapIntensity: .9}), shared, {seams: true}),
    planter: patch(new THREE.MeshStandardMaterial({name: 'planter', color: '#d9d0c2', ...stoneT, roughness: 1, envMapIntensity: .8}), shared),
    bronze: patch(new THREE.MeshStandardMaterial({name: 'bronze', color: '#3d2e1f', metalness: 1, roughness: .42, normalMap: metalT.normalMap, roughnessMap: metalT.roughnessMap, normalScale: new THREE.Vector2(.25, .25), envMapIntensity: 1.1}), shared),
    gold: patch(new THREE.MeshStandardMaterial({name: 'gold', color: '#c9a25b', metalness: 1, roughness: .27, emissive: new THREE.Color('#ffc76e'), emissiveIntensity: 0, envMapIntensity: 1.2}), shared),
    granite: patch(new THREE.MeshStandardMaterial({name: 'granite', color: '#4a4744', ...graniteT, roughness: 1, envMapIntensity: .8}), shared),
    deck: patch(new THREE.MeshStandardMaterial({name: 'deck', color: '#8f877c', ...pavingT, roughness: 1}), shared),
    soffit: new THREE.MeshBasicMaterial({name: 'soffit', color: new THREE.Color('#ffc98a').multiplyScalar(6)}),
    water: new THREE.MeshPhysicalMaterial({name: 'water', color: '#050607', roughness: .03, metalness: 0, ior: 1.33, envMapIntensity: 1.6, clearcoat: 1}),
    rail: new THREE.MeshPhysicalMaterial({name: 'rail', color: '#e6ecec', roughness: .03, metalness: 0, ior: 1.52, envMapIntensity: 1.1,
      ...(hi ? {transmission: 1, thickness: .02} : {transparent: true, opacity: .28})}),
    lobbyGlass: new THREE.MeshPhysicalMaterial({name: 'lobbyGlass', color: '#e3e8e6', roughness: .02, metalness: 0, ior: 1.52, envMapIntensity: 1.2, transparent: true, opacity: .16, depthWrite: false}),
  };
  const group = new THREE.Group(); group.name = 'afrah-tower';
  const meshes = {};
  for (const [k, list] of Object.entries(P)) {
    if (!list.length) continue;
    const g = mergeGeometries(list, false); list.forEach(x => x.dispose());
    const mesh = new THREE.Mesh(g, M[k]); mesh.name = k;
    mesh.castShadow = !['rail', 'lobbyGlass', 'soffit', 'water'].includes(k);
    mesh.receiveShadow = !['soffit', 'lobbyGlass'].includes(k);
    group.add(mesh); meshes[k] = mesh;
  }

  // windows: one instanced draw call
  const wmat = windowMaterial();
  wmat.uniforms.uReveal = shared.uReveal; wmat.uniforms.uSel = shared.uSel; wmat.uniforms.uHov = shared.uHov; wmat.uniforms.uGold = shared.uGold;
  const wgeo = new THREE.PlaneGeometry(1, 1); wgeo.translate(.5, .5, 0);
  const n = windows.length, seeds = new Float32Array(n), sizes = new Float32Array(n * 2), kinds = new Float32Array(n), levels = new Float32Array(n);
  const wmesh = new THREE.InstancedMesh(wgeo, wmat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), off = new THREE.Vector3();
  windows.forEach((w, i) => {
    q.setFromEuler(e.set(0, w.rot, 0));
    off.set(-w.w / 2, -w.h / 2, 0).applyQuaternion(q);
    m4.compose(v.set(w.x + off.x, w.y + off.y, w.z + off.z), q, sc.set(w.w, w.h, 1));
    wmesh.setMatrixAt(i, m4);
    seeds[i] = w.seed; sizes[i * 2] = w.w; sizes[i * 2 + 1] = w.h; kinds[i] = w.kind; levels[i] = w.level;
  });
  wgeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  wgeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 2));
  wgeo.setAttribute('aKind', new THREE.InstancedBufferAttribute(kinds, 1));
  wgeo.setAttribute('aLevel', new THREE.InstancedBufferAttribute(levels, 1));
  wmesh.frustumCulled = false; wmesh.name = 'windows';
  group.add(wmesh);

  // contact shading: soft baked gradient where the podium meets the plaza
  const cc = document.createElement('canvas'); cc.width = cc.height = 256;
  const cx = cc.getContext('2d'), gr = cx.createRadialGradient(128, 128, 60, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(PW + 22, PD + 22), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(cc), transparent: true, depthWrite: false}));
  contact.rotation.x = -Math.PI / 2; contact.position.y = .07; contact.renderOrder = 1; group.add(contact);

  return {
    group, materials: M, windowMaterial: wmat, meshes, windows: wmesh,
    spots: {trees, shrubs, bollards},
    stats: {windows: n},
    update(env, t) {
      wmat.uniforms.uTime.value = t; wmat.uniforms.uLights.value = env.windows;
      M.gold.emissiveIntensity = env.lantern * 1.6;
      M.soffit.color.set('#ffc98a').multiplyScalar(.2 + env.windows * 6);
    },
    dispose() { group.traverse(o => o.geometry?.dispose()); Object.values(M).forEach(m => m.dispose()); wmat.dispose(); },
  };
}
