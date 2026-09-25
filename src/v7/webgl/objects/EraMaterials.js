import * as THREE from 'three';

// Photographic materials for ERA's towers. The source model is a light map
// study (flat panes, flat fins), so the detail is drawn in the shaders:
//   glass  — interior mapping: behind every pane a real room is ray-traced
//            (floor, ceiling, walls, a sofa, art, a ceiling lamp, blinds),
//            with slab edges and mullions, under a clear-coat reflection
//   copper — ERA's bronze leaves: a midrib, herringbone veins in relief,
//            darker edges, patina variation, and uplights washing each leaf
//            from its foot at dusk
// Both work in ERA model metres through `toModel` (world → model), so they
// read the same at any scale the quarter is placed.

const COMMON = `
float eraH21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float eraNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(eraH21(i), eraH21(i + vec2(1, 0)), f.x), mix(eraH21(i + vec2(0, 1)), eraH21(i + vec2(1, 1)), f.x), f.y); }
`;

// Rooms behind the glass. P, V, N in model metres; returns radiance.
const INTERIOR = `
uniform float uEve;
vec3 eraRoom(vec3 P, vec3 V, vec3 N, out float frame){
  frame = 0.;
  vec3 Nh = vec3(N.x, 0., N.z);
  if (length(Nh) < .3) return vec3(.02);
  Nh = normalize(Nh);
  vec3 T = vec3(Nh.z, 0., -Nh.x);
  vec3 C = vec3(4.4, 4.55, 6.5);                       // room width, storey, depth
  vec3 ro = vec3(dot(P, T), P.y - 17.6, 0.);
  vec3 rd = vec3(dot(V, T), V.y, dot(V, -Nh));
  rd.z = max(rd.z, .04);
  vec2 id = floor(ro.xy / C.xy);
  vec2 rp = ro.xy - id * C.xy;
  vec3 t = vec3((rd.x > 0. ? C.x - rp.x : -rp.x) / rd.x, (rd.y > 0. ? C.y - rp.y : -rp.y) / rd.y, C.z / rd.z);
  float tm = min(min(t.x, t.y), t.z);
  vec3 hp = vec3(rp, 0.) + rd * tm;
  float r = eraH21(id), r2 = eraH21(id + 17.3), r3 = eraH21(id + 5.1);
  vec3 wall = mix(vec3(.80, .74, .66), vec3(.93, .90, .85), r2);
  vec3 col; float nz;
  if (tm == t.z) {                                            // back wall
    vec2 q = hp.xy / C.xy;
    col = wall;
    float sofa = step(abs(q.x - .5 - (r2 - .5) * .3), .3) * step(q.y, .19) * step(.25, r3);
    col = mix(col, mix(vec3(.30, .24, .20), vec3(.62, .55, .48), r3), sofa);
    float art = step(abs(q.x - .5 + (r3 - .5) * .2), .13) * step(abs(q.y - .52), .11) * step(.45, r2);
    col = mix(col, mix(vec3(.55, .32, .22), vec3(.25, .33, .40), r), art);
    float door = step(abs(q.x - .12), .07) * step(q.y, .5) * step(r3, .3);
    col = mix(col, vec3(.35, .27, .21), door);
    nz = 1.;
  } else if (tm == t.y) {
    col = rd.y < 0. ? mix(vec3(.42, .29, .19), vec3(.62, .52, .42), r2) * (.85 + .15 * eraNoise(hp.xz * vec2(2., 8.))) : vec3(.95, .93, .9);
    nz = hp.z / C.z;
  } else {
    col = wall * .82; nz = hp.z / C.z;
  }
  // light: a warm pendant near the ceiling, daylight falling off with depth
  float lamp = exp(-2.2 * length(vec2(hp.x / C.x - .5, (C.y - hp.y) / C.y * 1.6)));
  float on = step(1. - uEve * .68, r);
  vec3 warm = mix(vec3(1., .74, .46), vec3(1., .86, .66), r3);
  vec3 day = vec3(.55, .53, .5) * (1. - uEve) * (1. - nz * .55);
  vec3 night = vec3(.035, .04, .055) * uEve;
  vec3 light = day + night + on * warm * (.42 + lamp * 1.7) * uEve * (.7 + .5 * r2);
  col *= light;
  // blinds half-drawn in some rooms
  float fy = rp.y / C.y;
  if (r3 > .78) col = mix(col, mix(vec3(.75, .7, .62) * (day + on * warm * .9 * uEve + night), col, .15), step(1. - (r3 - .78) * 3.2, fy));
  // slab edge and mullions
  frame = max(step(rp.y, .42), step(min(rp.x, C.x - rp.x), .07));
  frame = max(frame, step(abs(fy - .78), .012) * .8);           // transom
  return col;
}
`;

// Leaf fins: aFin = (u across -1..1, v metres up the leaf, half width, leaf height)
const LEAF = `
varying vec4 vFin;
float eraLeafH(vec4 f){
  float au = abs(f.x);
  float along = (f.y - au * f.z * 1.3) / 1.05;
  float aa = fwidth(along);
  float vein = smoothstep(.1 + aa, .0, min(fract(along), 1. - fract(along))) * smoothstep(.05, .18, au) * (1. - smoothstep(.12, .45, aa));
  float rib = smoothstep(.08 + fwidth(au), .0, au);
  float rim = smoothstep(.82, 1., au);
  // only real leaves carry veins; the thin diagonal straps stay plain metal
  float leaf = smoothstep(.5, .9, f.z) * smoothstep(5., 9., f.w);
  return (vein * .55 + rib - rim * .4) * leaf;
}
`;

export function makeGlass({ envMap, toModel, eve }) {
  const m = new THREE.MeshPhysicalMaterial({ color: '#0c1116', metalness: 0, roughness: .05, clearcoat: 1, clearcoatRoughness: .03, envMap, envMapIntensity: 1.35, emissive: '#ffffff', emissiveIntensity: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uToModel = { value: toModel };
    sh.uniforms.uEve = eve;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEraW; varying vec3 vEraN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEraW = (modelMatrix * vec4(transformed, 1.0)).xyz; vEraN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uToModel; varying vec3 vEraW; varying vec3 vEraN;' + COMMON + INTERIOR)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 Pm = (uToModel * vec4(vEraW, 1.)).xyz;
          vec3 Cm = (uToModel * vec4(cameraPosition, 1.)).xyz;
          vec3 Vm = normalize(Pm - Cm);
          vec3 Nm = normalize(mat3(uToModel) * vEraN);
          float frame;
          vec3 room = eraRoom(Pm, Vm, Nm, frame);
          float fres = pow(1. - clamp(dot(-Vm, Nm), 0., 1.), 4.);
          totalEmissiveRadiance = room * (1. - frame) * (1. - fres * .85);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.09, .085, .08), frame);
        }`);
  };
  m.customProgramCacheKey = () => 'era-glass-interior';
  return m;
}

export function makeCopper({ envMap, toModel, eve, bakeMap }) {
  const m = new THREE.MeshStandardMaterial({ color: '#c26a3c', metalness: .72, roughness: .38, envMap, envMapIntensity: 1.25, emissive: '#ff8a45', emissiveIntensity: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uToModel = { value: toModel };
    sh.uniforms.uEve = eve;
    sh.uniforms.uBake = { value: bakeMap };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aFin; varying vec4 vFin; varying vec2 vBakeUv; varying vec3 vEraW;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvFin = aFin; vBakeUv = uv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEraW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uEve; uniform sampler2D uBake; uniform mat4 uToModel; varying vec2 vBakeUv; varying vec3 vEraW;' + COMMON + LEAF)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float leafH = eraLeafH(vFin);
        vec3 Pm = (uToModel * vec4(vEraW, 1.)).xyz;
        float patina = eraNoise(Pm.xy * .35 + Pm.z * .2) * .6 + eraNoise(Pm.xy * 2.1) * .4;
        diffuseColor.rgb *= mix(vec3(1.), vec3(.74, .64, .58), smoothstep(.2, .9, leafH)) * (.86 + patina * .28);
        diffuseColor.rgb *= mix(vec3(1.), texture2D(uBake, vBakeUv).rgb * .8 + .2, .8);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + leafH * .18 + (patina - .5) * .12, .05, 1.);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 dp1 = dFdx(-vViewPosition), dp2 = dFdy(-vViewPosition);
          float h1 = dFdx(leafH), h2 = dFdy(leafH);
          vec3 r1 = cross(dp2, normal), r2 = cross(normal, dp1);
          float det = dot(dp1, r1);
          vec3 grad = sign(det) * (h1 * r1 + h2 * r2);
          normal = normalize(abs(det) * normal - grad * .9);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float foot = clamp(vFin.y / max(vFin.w, 1.), 0., 1.);
          float wash = pow(1. - foot, 2.2) * .9 + .12;
          float edge = 1. - smoothstep(.55, 1., abs(vFin.x));
          totalEmissiveRadiance = vec3(1., .5, .24) * wash * edge * uEve * (1. - smoothstep(.2, .9, leafH) * .5);
        }`);
  };
  m.customProgramCacheKey = () => 'era-copper-leaf';
  return m;
}

// Splits a fin mesh into its separate leaves (connected pieces, welded by
// position) and writes aFin for each vertex: across-leaf coordinate, height
// up the leaf, half width and leaf height, all in model metres.
export function addFinCoords(mesh, matrix) {
  const g = mesh.geometry;
  if (g.attributes.aFin) return;
  const pos = g.attributes.position, n = pos.count, v = new THREE.Vector3();
  const P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(matrix); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; }
  const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[i * 3] * 50)},${Math.round(P[i * 3 + 1] * 50)},${Math.round(P[i * 3 + 2] * 50)}`;
    const j = seen.get(k); if (j === undefined) seen.set(k, i); else join(i, j);
  }
  const idx = g.index ? g.index.array : null, tc = idx ? idx.length : n;
  for (let t = 0; t < tc; t += 3) { const a = idx ? idx[t] : t, b = idx ? idx[t + 1] : t + 1, c = idx ? idx[t + 2] : t + 2; join(a, b); join(b, c); }
  const box = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i); let bb = box.get(r);
    if (!bb) box.set(r, bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
    for (let a = 0; a < 3; a++) { bb[a] = Math.min(bb[a], P[i * 3 + a]); bb[a + 3] = Math.max(bb[a + 3], P[i * 3 + a]); }
  }
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const bb = box.get(find(i));
    const wx = bb[3] - bb[0], wz = bb[5] - bb[2];
    const axis = wx >= wz ? 0 : 2, half = Math.max(.05, (axis ? wz : wx) / 2), mid = (bb[axis] + bb[axis + 3]) / 2;
    out[i * 4] = (P[i * 3 + axis] - mid) / half;
    out[i * 4 + 1] = P[i * 3 + 1] - bb[1];
    out[i * 4 + 2] = half;
    out[i * 4 + 3] = bb[4] - bb[1];
  }
  g.setAttribute('aFin', new THREE.BufferAttribute(out, 4));
}
