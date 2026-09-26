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
// Each cell of the facade is a furnished room: the ray from the eye is
// traced into the room box (width, storey, depth) and the hit point is looked
// up in a pre-rendered one-point-perspective image of the room (tools/
// roomgen.js renders them from a camera ROOM_E·depth in front of the glass),
// so walls, floor, ceiling and furniture all move in true parallax.
// Two atlases: daylight, and evening with the lamps on.
const ROOM_E = '0.75';
const INTERIOR = `
uniform float uEve; uniform sampler2D uRooms; uniform sampler2D uRoomsN; uniform vec4 uRoomSize; uniform float uMirror;
#ifdef ERA_FACADE
varying vec4 vFac;
#endif
vec3 eraRoom(vec3 P, vec3 V, vec3 N, out float frame){
  frame = 0.;
  vec3 Nh = vec3(N.x, 0., N.z);
  if (length(Nh) < .3) return vec3(.02);
  Nh = normalize(Nh);
  vec3 C = uRoomSize.xyz;                               // room width, storey, depth
#ifdef ERA_FACADE
  // curved facades carry their own coordinates: metres along the facade and
  // its tangent, so rooms keep their shape round the curve
  vec3 T = normalize(vec3(vFac.z, 0., vFac.w));
  vec3 ro = vec3(vFac.x, P.y - uRoomSize.w, 0.);
#else
  vec3 T = vec3(Nh.z, 0., -Nh.x);
  vec3 ro = vec3(dot(P, T), P.y - uRoomSize.w, 0.);
#endif
  vec3 rd = vec3(dot(V, T), V.y, dot(V, -Nh));
  rd.z = max(rd.z, .04);
  vec2 id = floor(ro.xy / C.xy);
  vec2 rp = ro.xy - id * C.xy;
  vec3 t = vec3((rd.x > 0. ? C.x - rp.x : -rp.x) / rd.x, (rd.y > 0. ? C.y - rp.y : -rp.y) / rd.y, C.z / rd.z);
  float tm = min(min(t.x, t.y), t.z);
  vec3 hp = vec3(rp, 0.) + rd * tm;
  float r = eraH21(id), r2 = eraH21(id + 17.3), r3 = eraH21(id + 5.1);
  // project the hit point into the room's photograph
  vec2 f = clamp(hp.xy / C.xy, 0., 1.);
  vec2 uv = .5 + (f - .5) * (${ROOM_E} / (${ROOM_E} + hp.z / C.z));
  if (r2 > .5) uv.x = 1. - uv.x;                        // half the flats are mirrored
  uv = clamp(uv, .003, .997);
  float k = floor(r * 7.999);
  vec2 auv = (uv + vec2(mod(k, 4.), 1. - floor(k / 4.))) / vec2(4., 2.);
  vec3 dayC = texture2D(uRooms, auv).rgb, nightC = texture2D(uRoomsN, auv).rgb;
  float on = step(1. - uEve * .72, r);
  vec3 col = mix(dayC * .9, mix(dayC * .035, nightC * (.8 + .5 * r3), on), uEve);
  // blinds half-drawn in some rooms
  float fy = rp.y / C.y;
  if (r3 > .82) col = mix(col, vec3(.78, .72, .64) * mix(.75, .02 + on * .9, uEve), step(1. - (r3 - .82) * 2.6, fy) * step(fy, .97));
  // slab edge and mullions
  frame = max(step(rp.y, .42), step(min(rp.x, C.x - rp.x), .06));
  if (uMirror > .5) frame = max(frame, step(abs(fract(rp.x / 1.47) - .5), .012) * .9);   // curtain-wall mullions
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
  float leaf = smoothstep(.5, .9, f.z) * smoothstep(5., 9., f.w) * smoothstep(3.2, 4.6, f.w / (2. * f.z));
  return (vein * .55 + rib - rim * .4) * leaf;
}
`;

export function makeGlass({ envMap, toModel, eve, rooms, roomsNight, mirror = false, room = null, look = null, key = '', facade = false }) {
  const L = look || (mirror ? { color: '#3a4a58', metalness: .85, envI: 2.8, seeIn: [.1, .38] } : { color: '#0c1116', metalness: 0, envI: 1.35, seeIn: [1, 1] });
  const m = new THREE.MeshPhysicalMaterial({ color: L.color, metalness: L.metalness, roughness: mirror ? .04 : .05, clearcoat: 1, clearcoatRoughness: .02, envMap, envMapIntensity: L.envI, emissive: '#ffffff', emissiveIntensity: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uToModel = { value: toModel };
    sh.uniforms.uEve = eve;
    sh.uniforms.uRooms = { value: rooms };
    sh.uniforms.uRoomsN = { value: roomsNight || rooms };
    sh.uniforms.uRoomSize = { value: room || (mirror ? new THREE.Vector4(4.4, 3.6, 6, 3) : new THREE.Vector4(4.4, 4.55, 6.5, 17.6)) };
    sh.uniforms.uMirror = { value: mirror ? 1 : 0 };
    sh.uniforms.uSeeIn = { value: new THREE.Vector2(...L.seeIn) };
    const def = facade ? '#define ERA_FACADE\n' : '';
    sh.vertexShader = def + sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEraW; varying vec3 vEraN;' + (facade ? '\nattribute vec4 aFacade; varying vec4 vFac;' : ''))
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEraW = (modelMatrix * vec4(transformed, 1.0)).xyz; vEraN = normalize(mat3(modelMatrix) * objectNormal);' + (facade ? ' vFac = aFacade;' : ''));
    sh.fragmentShader = def + sh.fragmentShader;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uToModel; uniform vec2 uSeeIn; varying vec3 vEraW; varying vec3 vEraN;' + COMMON + INTERIOR)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 Pm = (uToModel * vec4(vEraW, 1.)).xyz;
          vec3 Cm = (uToModel * vec4(cameraPosition, 1.)).xyz;
          vec3 Vm = normalize(Pm - Cm);
          vec3 Nm = normalize(mat3(uToModel) * vEraN);
          float frame;
          vec3 room = eraRoom(Pm, Vm, Nm, frame);
          float fres = pow(1. - clamp(dot(-Vm, Nm), 0., 1.), 4.);
          // reflective glass shows its rooms faintly by day, clearly once lit
          float seeIn = mix(uSeeIn.x, uSeeIn.y, uEve);
          // at grazing angles the glass is a mirror: the rooms fade out
          float ndv = clamp(dot(-Vm, Nm), 0., 1.);
          totalEmissiveRadiance = room * seeIn * (1. - frame) * (1. - fres * .85) * smoothstep(.06, .32, ndv);
          diffuseColor.rgb = mix(diffuseColor.rgb, uMirror > .5 ? vec3(.16, .17, .18) : vec3(.09, .085, .08), frame);
        }`);
  };
  m.customProgramCacheKey = () => 'era-glass-interior' + (mirror ? '-mirror' : '') + (facade ? '-facade' : '') + key;
  return m;
}

export function makeCopper({ envMap, toModel, eve, bakeMap }) {
  const m = new THREE.MeshStandardMaterial({ color: '#9c6649', metalness: .68, roughness: .46, envMap, envMapIntensity: 1.25, emissive: '#ff8a45', emissiveIntensity: 1 });
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

// Water: rolling wave normals in model metres (several directional swells plus
// fine ripples), dark body, sky reflection through the environment and a sharp
// sun glint. `glow` adds underwater light for pools at dusk.
export function makeWater({ envMap, toModel, time, eve, deep = '#0c2f3a', glow = 0, scale = 1, amp = 1 }) {
  const m = new THREE.MeshPhysicalMaterial({ color: deep, metalness: 0, roughness: .06, envMap, envMapIntensity: 1.3, clearcoat: 1, clearcoatRoughness: .02, emissive: '#1fb3c4', emissiveIntensity: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uToModel = { value: toModel };
    sh.uniforms.uTime = time;
    sh.uniforms.uEve = eve;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEraW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEraW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uToModel; uniform float uTime; uniform float uEve; varying vec3 vEraW;' + COMMON + `
        vec2 eraWaveGrad(vec2 p){
          vec2 g = vec2(0.);
          vec3 w[4]; w[0] = vec3(.8, .6, .9); w[1] = vec3(-.5, .86, 1.7); w[2] = vec3(.2, -.98, 3.1); w[3] = vec3(-.9, -.4, 5.3);
          for (int i = 0; i < 4; i++){ float k = w[i].z * ${(1 / scale).toFixed(3)}; float ph = dot(w[i].xy, p) * k + uTime * sqrt(k) * 1.6; g += w[i].xy * k * cos(ph) * (.18 / w[i].z) * ${amp.toFixed(2)}; }
          float e = .05; float n0 = eraNoise(p * 2.4 + uTime * .35);
          g += vec2(eraNoise(p * 2.4 + vec2(e, 0.) + uTime * .35) - n0, eraNoise(p * 2.4 + vec2(0., e) + uTime * .35) - n0) / e * .035 * ${amp.toFixed(2)};
          return g;
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 Pm = (uToModel * vec4(vEraW, 1.)).xyz;
          vec2 g = eraWaveGrad(Pm.xz);
          vec3 nW = normalize(vec3(-g.x, 1., -g.y));
          normal = normalize((viewMatrix * vec4(nW, 0.)).xyz);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance = vec3(.05, .42, .48) * ${glow.toFixed(2)} * uEve;`);
  };
  m.customProgramCacheKey = () => 'era-water' + glow + scale + amp;
  return m;
}
