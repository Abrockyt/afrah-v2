import * as THREE from 'three';
import { sectionProgress, store, smooth, range } from '../../core/store';

// The hero, shot for shot after the opening of "Maahishmati" (Baahubali):
//  A  the screen is nothing but cloud, gold rays falling through it; the
//     camera drifts forward and down
//  B  the cloud parts on the whole ERA district far below, seen at a steep
//     angle, the camera sinking and turning slowly towards it
//  C  it dives into a bank of cloud: a whiteout
//  D  low at the foot of the tower, the frame rolled over, looking up; the
//     roll unwinds as the camera pushes in
//  E  it flies up the facade
//  F  it crests the crown and the land opens out to the horizon
//  G  high along the tower's flank, looking down on the gardens and the pool
// Scroll drives the film (sectionProgress('hero')); at rest the clouds keep
// drifting and the camera breathes.

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Tower positions in scene units (see EraDistrict: centre at the complex).
const CROWN = V(-0.16, 5.32, -0.82);        // the tallest tower's crown
const POOL = V(0.92, 0.28, 1.8);
// keyframes: p, camera, target, roll (radians), fov
const SHOTS = [
  // A — inside the cloud
  { p: 0.00, pos: V(18, 26, 40), look: V(4, 8, 10), roll: 0.0, fov: 46 },
  { p: 0.12, pos: V(14, 20, 30), look: V(1, 2, 4), roll: -0.02, fov: 44 },
  // B — the district revealed through the gap, sinking and turning
  { p: 0.22, pos: V(10, 14.5, 21), look: V(0.2, 1.5, 0.5), roll: -0.04, fov: 40 },
  { p: 0.32, pos: V(6.5, 10.5, 14), look: V(-0.3, 2.2, -0.4), roll: -0.07, fov: 38 },
  // C — into the bank (cut happens under the whiteout at 0.36)
  { p: 0.36, pos: V(5, 8.6, 11), look: V(-0.5, 3, -0.8), roll: -0.08, fov: 38, cut: true },
  // D — low, rolled, looking up at the tower
  { p: 0.36, pos: V(1.6, 0.18, 2.2), look: V(-0.25, 3.8, -0.9), roll: 0.42, fov: 52 },
  { p: 0.48, pos: V(1.05, 0.55, 1.2), look: V(-0.2, 4.6, -0.85), roll: 0.08, fov: 48 },
  // E — up the facade
  { p: 0.60, pos: V(0.7, 3.4, 0.2), look: V(-0.18, 5.6, -0.95), roll: 0.0, fov: 46 },
  // F — over the crown, the horizon opens
  { p: 0.72, pos: V(0.25, 6.4, -0.2), look: V(-12, 4.2, -22), roll: -0.02, fov: 44 },
  // G — high along the flank, looking down on the garden and pool
  { p: 0.84, pos: V(2.2, 4.4, 0.4), look: V(0.9, 0.3, 2.4), roll: 0.0, fov: 42 },
  { p: 1.00, pos: V(3.4, 3.4, 3.6), look: V(0.6, 0.4, 1.2), roll: 0.0, fov: 42 },
];
const WHITE_IN = [0.3, 0.355], WHITE_OUT = [0.36, 0.42];

const cloudVert = `
attribute vec4 aCloud;          // atlas cell, alpha, tint shift, spin
varying vec2 vUv; varying float vA; varying float vShift; varying float vDepth; varying vec3 vWorld;
void main(){
  vec3 c = (instanceMatrix * vec4(0.,0.,0.,1.)).xyz;
  float s = length(instanceMatrix[0].xyz);
  float sp = aCloud.w;
  vec2 q = vec2(cos(sp)*position.x - sin(sp)*position.y, sin(sp)*position.x + cos(sp)*position.y) * s;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += q;
  vec2 cell = vec2(mod(aCloud.x, 2.), floor(aCloud.x / 2.));
  vUv = (uv + cell) * .5;
  vA = aCloud.y; vShift = aCloud.z; vDepth = -mv.z; vWorld = c + vec3(q, 0.);
  gl_Position = projectionMatrix * mv;
}`;
const cloudFrag = `
uniform sampler2D uMap; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uFog; uniform float uFade; uniform float uNear;
varying vec2 vUv; varying float vA; varying float vShift; varying float vDepth; varying vec3 vWorld;
void main(){
  vec2 local = fract(vUv * 2.);
  float d = texture2D(uMap, vUv).r;
  float edge = smoothstep(0.0, 0.12, local.x) * smoothstep(0.0, 0.12, 1.0 - local.x) * smoothstep(0.0, 0.12, local.y) * smoothstep(0.0, 0.12, 1.0 - local.y);
  float a = smoothstep(0.04, 0.85, d) * edge * vA * uFade;
  a *= smoothstep(uNear * .35, uNear, vDepth);                // melt as the camera passes through
  // lit from the upper side, lavender in the folds
  float lit = clamp(d * 1.25 + (local.y - .5) * .6 + vShift, 0., 1.);
  vec3 col = mix(uShade, uLit, lit);
  col = mix(col, uFog, smoothstep(40., 190., vDepth) * .75);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

// God rays, whiteout and grade drawn over the frame in one full-screen pass.
const overVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const overFrag = `
uniform float uTime; uniform float uRays; uniform float uFill; uniform float uZoom; uniform float uAspect; uniform vec2 uSun; uniform float uVignette;
uniform vec3 uLit; uniform vec3 uShade; uniform float uGlow; uniform float uFrame;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 1.7; a *= .5; } return v; }
uniform sampler2D uMap;
// one photographed cumulus from ERA's cloud atlas, laid over the lens
void puff(vec2 c, vec2 ctr, float size, float cell, float rot, inout float dens, inout float lit){
  vec2 l = c - ctr; float cs = cos(rot), sn = sin(rot);
  l = vec2(cs * l.x - sn * l.y, sn * l.x + cs * l.y) / size + .5;
  if (l.x < 0. || l.y < 0. || l.x > 1. || l.y > 1.) return;
  float e = smoothstep(0., .14, l.x) * smoothstep(0., .14, 1. - l.x) * smoothstep(0., .14, l.y) * smoothstep(0., .14, 1. - l.y);
  vec2 cc = vec2(mod(cell, 2.), floor(cell / 2.));
  float d = texture2D(uMap, (l + cc) * .5).r;
  float a = smoothstep(.04, .8, d) * e;
  float L = clamp(d * .95 + (l.y - .5) * .9, 0., 1.);
  lit = mix(lit, L, a);
  dens = 1. - (1. - dens) * (1. - a);
}
void main(){
  vec2 uv = vUv;
  vec2 c = (uv - .5) * vec2(uAspect, 1.);
  // a soft bed of cloud so the lens is never empty while it is inside
  float base = fbm(c * 1.6 + vec2(uTime * .01, 0.)) * .6 + fbm(c * 3.4 - vec2(0., uTime * .008) + 3.) * .4;
  float dens = 0., lit = .6;
  // big cumulus sprites streaming out of the frame as the camera moves forward
  for (int i = 0; i < 11; i++){
    float fi = float(i);
    float h1 = fract(sin(fi * 12.9898) * 43758.5453), h2 = fract(sin(fi * 78.233) * 12345.678), h3 = fract(sin(fi * 3.7) * 9876.5);
    float ang = fi * 2.3999 + h1 * .6;
    float r0 = .05 + h2 * .55;
    float z = uZoom * (.8 + h3 * .7);
    vec2 ctr = vec2(cos(ang), sin(ang)) * r0 * (1. + max(z, -.9) * 1.8) + vec2(sin(uTime * .05 + fi) * .02, 0.);
    float size = (1.1 + h1 * 1.1) * (1. + max(z, -.85) * 1.3);
    puff(c, ctr, size, mod(fi, 4.), h2 * 6.283 + uTime * .006, dens, lit);
  }
  float body = clamp(max(dens, smoothstep(.25, .6, base) * uFill * uFill) * uFill * 1.08, 0., 1.);
  float light = mix(clamp(base * 1.3 - .1 + (uv.y - .4) * .5, 0., 1.), lit, dens);
  // the same cumulus keeps hanging round the edges of the lens while the
  // camera flies below it, framing the city like the film
  if (uFrame > 0.001) {
    float edge = smoothstep(.3, .85, length(c * vec2(.72, 1.18)));
    float fd = 0., fl = .6;
    for (int i = 0; i < 8; i++){
      float fi = float(i);
      float h1 = fract(sin(fi * 41.3) * 43758.5453), h2 = fract(sin(fi * 17.7) * 24634.6);
      float ang = fi * .785 + h1 * .5;
      vec2 ctr = vec2(cos(ang) * uAspect * .6, sin(ang) * .66) * (1.05 + h2 * .25) + vec2(sin(uTime * .04 + fi) * .03, cos(uTime * .03 + fi) * .02);
      puff(c, ctr, 1.15 + h1 * .85, mod(fi + 1., 4.), h2 * 6.283 + uTime * .004, fd, fl);
    }
    float fb = clamp(max(fd * smoothstep(.0, .5, edge + .2), smoothstep(.32, .66, base) * edge) * uFrame * 1.15, 0., 1.);
    light = mix(light, mix(fl, clamp(base * 1.3 - .1 + (uv.y - .4) * .5, 0., 1.), 1. - fd), fb * (1. - body));
    body = max(body, fb);
  }
  vec3 cloud = mix(uShade, uLit, light);
  cloud += vec3(1., .8, .55) * (1. - body) * .2 * uRays;
  cloud = mix(cloud, uLit * 1.04, uGlow * (.45 + .4 * smoothstep(.9, .0, distance(uv, vec2(.52, .6)))));
  // soft shafts from the sun, strongest through the thin cloud
  vec2 sp = vec2((uv.x - uSun.x) * uAspect, uv.y - uSun.y);
  float ang = atan(sp.y, sp.x); float r = length(sp);
  float shafts = smoothstep(.25, .9, noise(vec2(ang * 9.0, uTime * .03))) * .6 + smoothstep(.4, 1., noise(vec2(ang * 23.0 + 4., uTime * .05))) * .35;
  shafts *= smoothstep(2.2, .2, r);
  vec3 rays = vec3(1.0, .84, .62) * (shafts * .38 + smoothstep(1.6, 0., r) * .22) * uRays;
  vec3 col = cloud + rays * (1. - body * .35);
  float a = max(body, clamp(max(rays.r, rays.g) * 1.1, 0., 1.));
  // warm vignette
  float v = (1. - smoothstep(1.25, .45, length((uv - .5) * vec2(uAspect * .8, 1.)))) * uVignette;
  col = mix(col, vec3(.22, .15, .17), v * (1. - body));
  a = max(a, v);
  gl_FragColor = vec4(col, a);
}`;

export class HeroCloudScene {
  constructor(scene, world) {
    this.world = world;
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);

    const tex = new THREE.TextureLoader().load('/media/era3d/clouds.webp');
    tex.colorSpace = THREE.NoColorSpace;
    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: cloudVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false, fog: false,
      uniforms: { uMap: { value: tex }, uLit: { value: new THREE.Color('#fff1e2') }, uShade: { value: new THREE.Color('#a8959f') }, uFog: { value: new THREE.Color('#e2c3b4') }, uFade: { value: 1 }, uNear: { value: 2.5 } },
    });
    this.puffs = [];
    const rnd = mulberry(7);
    const add = (x, y, z, s, a) => this.puffs.push({ p: V(x, y, z), s, a, cell: Math.floor(rnd() * 4), shift: (rnd() - .5) * .25, spin: rnd() * 6.28, drift: .4 + rnd() * .8 });
    // the upper deck: a thick layer with a gap over the district
    for (let i = 0; i < 130; i++) {
      const x = (rnd() - .5) * 150, z = (rnd() - .5) * 150 + 10, y = 17 + rnd() * 16;
      const gap = Math.hypot(x - 1, (z - 3) * 1.15);
      if (gap < 11 + (y - 17) * .45 && rnd() > .06) continue;
      add(x, y, z, 9 + rnd() * 12, .55 + rnd() * .45);
    }
    // along the opening flight: cloud wrapped round the camera path
    for (let i = 0; i < 16; i++) {
      const t = rnd(); const x = 18 - t * 8 + (rnd() - .5) * 14, y = 27 - t * 9 + (rnd() - .5) * 6, z = 42 - t * 16 + (rnd() - .5) * 14;
      add(x, y, z, 6 + rnd() * 9, .5 + rnd() * .5);
    }
    // the bank the camera dives into
    for (let i = 0; i < 18; i++) add(4.8 + (rnd() - .5) * 6, 8.3 + (rnd() - .5) * 3, 10 + (rnd() - .7) * 6, 2.5 + rnd() * 4, .8);
    // low wisps that drift past the crowns in the later shots
    for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = 3 + rnd() * 14; add(Math.cos(a) * r, 4.4 + rnd() * 3.5, Math.sin(a) * r, 2.5 + rnd() * 4, .35 + rnd() * .35); }
    const geo = new THREE.PlaneGeometry(1, 1);
    this.clouds = new THREE.InstancedMesh(geo, this.cloudMat, this.puffs.length);
    this.aCloud = new THREE.InstancedBufferAttribute(new Float32Array(this.puffs.length * 4), 4);
    this.aCloud.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCloud', this.aCloud);
    this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.clouds.frustumCulled = false; this.clouds.renderOrder = 5;
    this.clouds.visible = false;                 // the lens clouds do all the cloud work now
    this.group.add(this.clouds);
    this.order = this.puffs.map((_, i) => i);
    this.dist = new Float32Array(this.puffs.length);

    this.over = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: overVert, fragmentShader: overFrag, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uRays: { value: 1 }, uFill: { value: 1 }, uZoom: { value: 0 }, uAspect: { value: 1.78 }, uSun: { value: new THREE.Vector2(0.12, 1.08) }, uVignette: { value: .35 }, uGlow: { value: 0 }, uFrame: { value: 0 }, uMap: { value: tex }, uLit: { value: new THREE.Color('#ffe4d2') }, uShade: { value: new THREE.Color('#7f7391') } },
    }));
    this.over.frustumCulled = false; this.over.renderOrder = 999;
    this.group.add(this.over);

    this.pos = V(0, 0, 0); this.look = V(0, 0, 0); this.tmp = V(0, 0, 0); this.tmp2 = V(0, 0, 0);
    this.drift = new THREE.Vector2(); this.sm = 0;
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sc = V(1, 1, 1); this.pp = V(0, 0, 0);
    this.ready = world.ready;
  }

  shot(p) {
    // the last keyframe at or before p; a repeated p is a cut, the later one wins
    let i = 0;
    for (let j = 0; j < SHOTS.length - 1; j++) if (SHOTS[j].p <= p) i = j;
    const a = SHOTS[i], b = SHOTS[i + 1];
    const t = range(p, a.p, b.p);
    // eased inside the tower shots, a steadier glide through the cloud
    const e = a.p >= 0.36 ? smooth(t) : smooth(t) * 0.35 + t * 0.65;
    return { a, b, t: e };
  }

  update(camera, time) {
    const active = store.activeStage === 'hero' || (!store.activeStage && store.scroll < 4);
    this.group.visible = active;
    if (!active) return;
    const pr = sectionProgress('hero');
    this.sm += (pr - this.sm) * (window.__snap ? 1 : 0.09);
    const p = Math.abs(pr - this.sm) < 1e-4 ? pr : this.sm;
    const k = store.aspectK || 1;
    const ptr = store.pointer;
    this.drift.x += ((ptr ? ptr.x : 0) - this.drift.x) * 0.03;
    this.drift.y += ((ptr ? ptr.y : 0) - this.drift.y) * 0.03;

    const { a, b, t } = this.shot(p);
    this.pos.copy(a.pos).lerp(b.pos, t);
    this.look.copy(a.look).lerp(b.look, t);
    const roll = a.roll + (b.roll - a.roll) * t;
    const fov = a.fov + (b.fov - a.fov) * t;
    // breathing at rest, pointer parallax, portrait screens step back
    const br = Math.sin(time * 0.35) * 0.06, br2 = Math.cos(time * 0.27) * 0.05;
    const scale = this.pos.distanceTo(this.look) * 0.012;
    this.pos.x += (br + this.drift.x * 0.8) * scale * 3; this.pos.y += (br2 + this.drift.y * 0.5) * scale * 3;
    this.pos.sub(this.look).divideScalar(Math.pow(k, 0.5)).add(this.look);
    camera.fov = fov + (1 - k) * 12; camera.near = p < 0.36 ? 0.5 : 0.03; camera.far = 1200;
    camera.updateProjectionMatrix();
    camera.position.copy(this.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.look);
    camera.rotateZ(roll);

    // light and air
    const w = this.world;
    if (w.mood !== 'golden') w.setMood('golden');
    const u = this.over.material.uniforms;
    u.uTime.value = time; u.uAspect.value = camera.aspect;
    u.uRays.value = (1 - smooth(range(p, 0.14, 0.3))) * 0.75 + smooth(range(p, 0.62, 0.74)) * (1 - smooth(range(p, 0.8, 0.92))) * 0.45;
    u.uSun.value.set(p < 0.36 ? 0.12 : 0.18, p < 0.36 ? 1.08 : 0.95);
    // the opening fill parts over the first shot; the whiteout closes and reopens at the cut
    const open = 1 - smooth(range(p, 0.015, 0.2));
    const white = p < 0.36 ? smooth(range(p, WHITE_IN[0], WHITE_IN[1])) : 1 - smooth(range(p, WHITE_OUT[0], WHITE_OUT[1]));
    u.uFill.value = Math.max(open, white);
    u.uGlow.value = white;
    // cloud round the frame through the aerial, and again round the crown
    u.uFrame.value = p < 0.36 ? smooth(range(p, 0.06, 0.2)) * 0.95 : smooth(range(p, 0.6, 0.7)) * (1 - smooth(range(p, 0.8, 0.9))) * 0.55;
    u.uZoom.value = p < 0.23 ? range(p, 0, 0.2) * 1.6 + Math.sin(time * 0.2) * 0.02 : p < 0.36 ? (white - 1) * 0.9 : range(p, 0.36, 0.42) * 1.6;
    // clouds thin out once the camera is below them
    this.cloudMat.uniforms.uFade.value = p < 0.36 ? 1 : 0.9;
    this.cloudMat.uniforms.uNear.value = p < 0.36 ? 7 : 1.2;
    this.cloudMat.uniforms.uFog.value.copy(w.fogColor);
    // haze: deep in the aerial, clearer at the tower
    w.fogNear = p < 0.36 ? 18 : 8; w.fogFar = p < 0.36 ? 115 : 80;

    if (!this.clouds.visible) return;
    // sort and place the puffs back to front, drifting with time
    const cam = camera.position;
    for (let i = 0; i < this.puffs.length; i++) {
      const c = this.puffs[i];
      this.pp.set(c.p.x + Math.sin(time * 0.03 * c.drift + i) * 2.2, c.p.y + Math.sin(time * 0.05 + i * 1.7) * 0.15, c.p.z + Math.cos(time * 0.025 * c.drift + i) * 1.2);
      this.dist[i] = this.pp.distanceToSquared(cam);
      c.w = c.w || V(0, 0, 0); c.w.copy(this.pp);
    }
    this.order.sort((x, y) => this.dist[y] - this.dist[x]);
    const arr = this.aCloud.array;
    for (let j = 0; j < this.order.length; j++) {
      const c = this.puffs[this.order[j]];
      this.sc.setScalar(c.s);
      this.clouds.setMatrixAt(j, this.m4.compose(c.w, this.q, this.sc));
      arr[j * 4] = c.cell; arr[j * 4 + 1] = c.a; arr[j * 4 + 2] = c.shift; arr[j * 4 + 3] = c.spin + time * 0.004 * c.drift;
    }
    this.clouds.instanceMatrix.needsUpdate = true; this.aCloud.needsUpdate = true;
  }
}

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
