import * as THREE from 'three';

// Full-screen colour wipe with a "feathered" edge. A directional gradient is
// perturbed by low-frequency noise (big lobes) plus high-frequency anisotropic
// striations (barbs), so the boundary between the outgoing and incoming stage
// colour looks like a fringe of feathers rather than a straight line.
// It is drawn first, before any 3D scene, and acts as the stage background.
// The same mask function can be injected into any mesh material so 3D objects
// belonging to one side of the wipe are clipped by the same fringe.

export const MASK_GLSL = `
uniform float uProgress;
uniform vec2 uDir;
uniform float uAspect;
uniform float uSeed;
uniform float uFringe;
uniform float uWipeTime;
vec3 wmod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec2 wmod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
vec3 wpermute(vec3 x){return wmod289(((x*34.0)+1.0)*x);}
float wsnoise(vec2 v){
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = wmod289(i);
  vec3 p = wpermute(wpermute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m = m*m; m = m*m;
  vec3 x = 2.0*fract(p*C.www)-1.0; vec3 h = abs(x)-0.5; vec3 ox = floor(x+0.5); vec3 a0 = x-ox;
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x = a0.x*x0.x + h.x*x0.y; g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m,g);
}
// A handful of irregular feather-shaped lobes along the wipe boundary — each
// with its own position/width/height/lean from a per-index hash, so the edge
// reads as a scatter of overlapping feather tips rather than a repeating comb.
float wfeathers(vec2 p, vec2 d, vec2 perp, float seed){
  float lean = dot(p, d) * 0.4;
  float across = dot(p, perp);
  float halfW = 1.7 * uAspect;
  float result = 0.0;
  const int N = 13;
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    float h1 = fract(sin(fi * 12.9898 + seed * 7.13) * 43758.5453);
    float h2 = fract(sin(fi * 78.233 + seed * 3.7 + 1.0) * 23421.631);
    float h3 = fract(sin(fi * 45.164 + seed * 5.1 + 2.0) * 12543.233);
    float h4 = fract(sin(fi * 33.72 + seed * 1.9 + 3.0) * 9871.19);
    float slot = 2.0 * halfW / float(N);
    float cx = (fi + 0.5) * slot - halfW + (h1 - 0.5) * slot * 1.5;
    float width = (0.5 + h2 * 1.0) * slot * 0.85;
    float height = 0.3 + h3 * 0.9;
    float leanI = (h4 - 0.5) * 0.8;
    float x = across + lean * (0.5 + leanI) - cx;
    float shape = 1.0 - smoothstep(0.0, width, abs(x));
    float tip = pow(max(shape, 0.0), 1.7) * height;
    tip *= 0.82 + 0.18 * wsnoise(vec2(x * 6.0, fi) + seed);
    result = max(result, tip);
  }
  return result;
}
// 1.0 = still the outgoing side, 0.0 = incoming side has arrived.
float wipeMask(vec2 uv){
  vec2 p = vec2(uv.x * uAspect, uv.y);
  vec2 d = normalize(vec2(uDir.x * uAspect, uDir.y));
  float span = abs(d.x) * uAspect + abs(d.y);
  float t = (dot(p, d) - min(0.0, d.x*uAspect) - min(0.0, d.y)) / span;
  float lobes = wsnoise(p * 1.1 + uSeed) * 0.05 + wsnoise(p * 2.3 - uSeed) * 0.03;
  vec2 perp = vec2(-d.y, d.x);
  float feathers = wfeathers(p, d, perp, uSeed) * uFringe * 2.4;
  // Composites-style displacement: streaks running along the wipe direction
  // (brush / barb texture) that drift slowly, over a sharp front.
  float along = dot(p, d), across = dot(p, perp);
  float streak = wsnoise(vec2(across * 26.0, along * 1.4 - uWipeTime * 0.12 + uSeed));
  float fine = wsnoise(vec2(across * 88.0, along * 2.6 + uSeed * 1.7));
  float disp = streak * 0.03 + fine * 0.012 + feathers * (0.35 + 0.65 * (fine * 0.5 + 0.5));
  float front = uProgress * 1.5 - 0.25;
  return smoothstep(front - 0.004, front + 0.004, t + lobes + disp);
}
`;

const vert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = `
precision highp float;
varying vec2 vUv;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform float uCover;
uniform float uReverse;
${MASK_GLSL}
void main(){
  float m = wipeMask(vUv);
  gl_FragColor = uCover > 0.5 ? vec4(uTo, mix(1.0-m,m,uReverse)) : vec4(mix(uTo, uFrom, m), 1.0);
}
`;

export class FeatherWipe {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Shared uniform objects: materials patched with applyMask() reference
    // these same objects, so they always agree with the background wipe.
    this.shared = {
      uProgress: { value: 0 },
      uDir: { value: new THREE.Vector2(0, 1) },
      uAspect: { value: 1.78 },
      uSeed: { value: 1.3 },
      uFringe: { value: 0.09 },
      uWipeTime: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
      transparent: true,
      uniforms: { uFrom: { value: new THREE.Color('#121212') }, uTo: { value: new THREE.Color('#cfcaca') }, uCover:{value:0},uReverse:{value:0}, ...this.shared },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }
  set(from, to, progress, dir, seed = 1.3, fringe = 0.09) {
    const u = this.material.uniforms;
    u.uCover.value=0;
    // Colour uniforms are written straight to the framebuffer (no tone
    // mapping / colour-space chunk), so keep them in sRGB numeric values.
    u.uFrom.value.set(from).convertLinearToSRGB();
    u.uTo.value.set(to).convertLinearToSRGB();
    this.shared.uProgress.value = progress;
    this.shared.uDir.value.set(dir[0], dir[1]).normalize();
    this.shared.uSeed.value = seed; this.shared.uFringe.value = fringe;
  }
  tick(time) { this.shared.uWipeTime.value = time; }
  render(renderer, aspect) {
    this.shared.uAspect.value = aspect;
    renderer.render(this.scene, this.camera);
  }

  cover(renderer,aspect,progress,color,reverse=false,dir=[0,1]){
    this.set(color,color,progress,dir,2.7,.12);
    this.material.uniforms.uCover.value=1;
    this.material.uniforms.uReverse.value=reverse?1:0;
    this.render(renderer,aspect);
    this.material.uniforms.uCover.value=0;
  }

  // Patch a mesh material so its fragments are discarded on one side of the
  // wipe. side = 'to' keeps fragments where the incoming colour has arrived;
  // side = 'from' keeps fragments still on the outgoing side. The material's
  // userData.maskEnabled.value toggles the clip so it renders normally
  // outside a transition. uRes must be kept up to date by the owner.
  applyMask(material, side = 'to') {
    const shared = this.shared;
    const enabled = { value: 0 };
    const res = { value: new THREE.Vector2(1, 1) };
    material.userData.maskEnabled = enabled;
    material.userData.maskRes = res;
    const test = side === 'to' ? 'if (wm > 0.5) discard;' : 'if (wm < 0.5) discard;';
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, shared, { uMaskEnabled: enabled, uRes: res });
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uMaskEnabled;\nuniform vec2 uRes;\n' + MASK_GLSL)
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (uMaskEnabled > 0.5) { float wm = wipeMask(gl_FragCoord.xy / uRes); ' + test + ' }');
    };
    material.customProgramCacheKey = () => 'wipe-mask-' + side;
    material.needsUpdate = true;
    return material;
  }
}
