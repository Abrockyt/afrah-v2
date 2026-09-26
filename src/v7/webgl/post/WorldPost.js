import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { makeCloudNoise } from './cloudNoise';

// The cinematic pipeline for the ERA world (hero, arrival, tower, place):
//   1. scene → HDR target with MSAA and a depth texture
//   2. volumetric clouds, ray-marched at reduced resolution against that depth:
//      a high cumulus deck, low wisps and (for the dive) a dense cloud bank,
//      all drifting on the wind and lit by the sun with multiple-scattering
//      approximations (Beer–Powder, two-lobe phase, height-graded ambient)
//   3. composite + god rays streaming from the sun through gaps in the cloud
//   4. bloom on the lit rooms and uplights
//   5. grade to screen: ACES, split tone, gentle chromatic fringe, vignette, grain

const quadVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const cloudFrag = `
precision highp float;
precision highp sampler3D;
uniform sampler2D tDepth; uniform sampler3D uNoise; uniform sampler2D uWeather;
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos;
uniform float uTime; uniform vec3 uWind;
uniform vec4 uDeck; uniform vec4 uLow; uniform vec3 uHole; uniform vec4 uBank; uniform float uBankD;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmbHi; uniform vec3 uAmbLo; uniform vec3 uFog; uniform vec2 uFogRange;
uniform float uSteps; uniform float uOn; uniform float uFrameJ;
varying vec2 vUv;
float h12(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float remap(float v, float a, float b, float c, float d){ return c + (v - a) / (b - a) * (d - c); }
float layer(vec3 p, vec3 q, vec4 L, float wOff, float base, bool deck){
  if (L.w <= 0. || p.y < L.x || p.y > L.y) return 0.;
  float h = (p.y - L.x) / (L.y - L.x);
  float shape = deck ? smoothstep(0., .12, h) * smoothstep(1., .55, h) : smoothstep(0., .25, h) * smoothstep(1., .35, h);
  float w = texture(uWeather, q.xz * .016 + wOff).r * .75 + texture(uWeather, q.xz * .05 + wOff * 3.).r * .25;
  float cov = smoothstep(1. - L.z - .18, 1. - L.z + .18, w);
  if (deck) cov *= smoothstep(uHole.z, uHole.z * 1.8, length(p.xz - uHole.xy));
  else cov *= smoothstep(uHole.z * .35, uHole.z * .8, length(p.xz - uHole.xy));
  float d = remap(base, 1. - cov * .8, 1., 0., 1.) * shape;
  return clamp(d * 1.25, 0., 1.) * L.w;
}
float density(vec3 p, bool detail){
  vec3 q = p + uWind * uTime;
  vec2 n = texture(uNoise, q * .1).rg;
  float base = n.r * .65 + texture(uNoise, q * .033 + .5).r * .35;
  float d = max(layer(p, q, uDeck, 0., base, true), layer(p, q, uLow, .37, base, false));
  if (uBankD > 0.) d = max(d, smoothstep(uBank.w, uBank.w * .25, length(p - uBank.xyz)) * uBankD * (.5 + .5 * base));
  if (detail && d > 0.) {
    float det = texture(uNoise, q * .36 + vec3(0., uTime * .02, 0.)).g;
    d = clamp(d - det * .45 * (1. - d * .7), 0., 1.);
  }
  return d;
}
float hg(float c, float g){ float g2 = g * g; return (1. - g2) / (4. * 3.14159 * pow(1. + g2 - 2. * g * c, 1.5)); }
void main(){
  if (uOn < .001) { gl_FragColor = vec4(0., 0., 0., 1.); return; }
  vec4 cp = uInvProj * vec4(vUv * 2. - 1., 1., 1.);
  vec3 vd = normalize(cp.xyz / cp.w);
  vec3 rd = normalize((uCamWorld * vec4(vd, 0.)).xyz);
  vec3 ro = uCamPos;
  float dz = texture(tDepth, vUv).x;
  float maxT = 400.;
  if (dz < 1.) { vec4 vp = uInvProj * vec4(vUv * 2. - 1., dz * 2. - 1., 1.); vp /= vp.w; maxT = min(maxT, length(vp.xyz)); }
  float yb = min(uLow.w > 0. ? uLow.x : 1e3, uBankD > 0. ? uBank.y - uBank.w : 1e3); yb = min(yb, uDeck.x);
  float yt = max(uDeck.y, uBankD > 0. ? uBank.y + uBank.w : -1e3);
  float t0, t1;
  if (abs(rd.y) < 1e-4) { if (ro.y < yb || ro.y > yt) { gl_FragColor = vec4(0., 0., 0., 1.); return; } t0 = 0.; t1 = maxT; }
  else { float a = (yb - ro.y) / rd.y, b = (yt - ro.y) / rd.y; t0 = max(min(a, b), 0.); t1 = min(max(a, b), maxT); }
  if (t1 <= t0) { gl_FragColor = vec4(0., 0., 0., 1.); return; }
  t1 = min(t1, t0 + 75.);
  float stepBase = clamp((t1 - t0) / uSteps, .18, 2.4);
  // interleaved gradient noise: an even, fine dither instead of speckle
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))) + uFrameJ);
  float t = t0 + stepBase * ign;
  float T = 1.; vec3 col = vec3(0.); float firstHit = -1.;
  float cosT = dot(rd, uSunDir);
  float phase = mix(hg(cosT, .6), hg(cosT, -.2), .35) * 4.;
  for (int i = 0; i < 96; i++){
    if (float(i) >= uSteps * 1.5 || t > t1 || T < .02) break;
    vec3 p = ro + rd * t;
    float d = density(p, true);
    float dt = d > .001 ? stepBase : stepBase * 1.8;
    if (d > .001) {
      if (firstHit < 0.) firstHit = t;
      float od = 0.;
      for (int j = 1; j <= 5; j++) od += density(p + uSunDir * (float(j) * float(j) * .22), false);
      float light = exp(-od * .75 * 1.25) * .8 + exp(-od * .75 * .3) * .2;       // multiple scattering lift
      float powder = 1. - exp(-d * 3.);
      float hN = clamp((p.y - yb) / max(yt - yb, .1), 0., 1.);
      vec3 S = uSunCol * light * phase * mix(.5, 1.5, powder) + mix(uAmbLo, uAmbHi, hN) * (.3 + .4 * hN);
      float Ts = exp(-d * 1.55 * dt);
      col += T * S * (1. - Ts);
      T *= Ts;
    }
    t += dt;
  }
  if (firstHit > 0.) {
    float f = smoothstep(uFogRange.x, uFogRange.y, firstHit);
    col = mix(col, uFog * (1. - T), f * .85);
  }
  gl_FragColor = vec4(col, T);
}`;

const accumFrag = `
uniform sampler2D tNew; uniform sampler2D tHist; uniform float uKeep;
varying vec2 vUv;
void main(){
  vec4 n = texture2D(tNew, vUv);
  vec4 h = texture2D(tHist, vUv);
  // clamp history to the new sample's neighbourhood range to avoid ghosting
  gl_FragColor = mix(n, clamp(h, n - .25, n + .25), uKeep);
}`;

const compositeFrag = `
uniform sampler2D tScene; uniform sampler2D tCloud; uniform sampler2D tDepth;
uniform vec2 uSunUv; uniform float uRays; uniform vec3 uRayCol; uniform float uAspect; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  // soft 5-tap gather: upsamples the half-resolution clouds without blocks or dither
  vec2 px = uTexel * 1.25;
  vec4 c = texture2D(tCloud, vUv) * .4 + (texture2D(tCloud, vUv + vec2(px.x, px.y)) + texture2D(tCloud, vUv + vec2(-px.x, px.y)) + texture2D(tCloud, vUv + vec2(px.x, -px.y)) + texture2D(tCloud, vUv - px)) * .15;
  vec3 col = texture2D(tScene, vUv).rgb * c.a + c.rgb;
  if (uRays > .001) {
    vec2 dir = (uSunUv - vUv) / 40.;
    vec2 uv = vUv; float acc = 0., w = 1.;
    for (int i = 0; i < 40; i++){
      uv += dir;
      if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) break;
      float sky = step(.99999, texture2D(tDepth, uv).x);
      acc += sky * texture2D(tCloud, uv).a * w; w *= .96;
    }
    float fall = smoothstep(1.6, 0., length((vUv - uSunUv) * vec2(uAspect, 1.)));
    col += uRayCol * acc / 40. * uRays * fall;
  }
  gl_FragColor = vec4(col, 1.);
}`;

const gradeFrag = `
uniform sampler2D tColor; uniform float uExposure; uniform float uAspect; uniform float uTime; uniform float uVig;
varying vec2 vUv;
float h12(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 o = (vUv - .5) * .0016;
  vec3 c = vec3(texture2D(tColor, vUv + o).r, texture2D(tColor, vUv).g, texture2D(tColor, vUv - o).b) * uExposure;
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(c, c * vec3(.93, .99, 1.1), (1. - smoothstep(0., .3, l)) * .4);      // cool shadows
  c = mix(c, c * vec3(1.07, 1., .92), smoothstep(.35, 1.6, l) * .35);           // warm highlights
  c = mix(vec3(l), c, 1.06);                                                     // a touch of saturation
  float v = smoothstep(1.2, .3, length((vUv - .5) * vec2(uAspect * .72, 1.)));
  c *= mix(1. - uVig, 1., v);
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (h12(gl_FragCoord.xy + fract(uTime) * 61.) - .5) * .022;
}`;

export class WorldPost {
  constructor(renderer) {
    this.r = renderer;
    this.mobile = Math.min(innerWidth, innerHeight) < 760;
    this.cloudScale = this.mobile ? .33 : .5;
    const hdr = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace };
    this.sceneRT = new THREE.WebGLRenderTarget(4, 4, { ...hdr, samples: this.mobile ? 0 : 4 });
    this.sceneRT.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType);
    this.rawRT = new THREE.WebGLRenderTarget(4, 4, { ...hdr, depthBuffer: false });
    this.cloudRT = new THREE.WebGLRenderTarget(4, 4, { ...hdr, depthBuffer: false });
    this.histRT = new THREE.WebGLRenderTarget(4, 4, { ...hdr, depthBuffer: false });
    this.compRT = new THREE.WebGLRenderTarget(4, 4, { ...hdr, depthBuffer: false });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), .5, .55, .92);
    const noise = makeCloudNoise();
    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: cloudFrag, depthTest: false, depthWrite: false,
      uniforms: {
        tDepth: { value: this.sceneRT.depthTexture }, uNoise: { value: noise.tex3 }, uWeather: { value: noise.weather },
        uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
        uTime: { value: 0 }, uWind: { value: new THREE.Vector3(.55, 0, .22) },
        uDeck: { value: new THREE.Vector4(15, 28, .55, 1) }, uLow: { value: new THREE.Vector4(2.6, 5, 0, 0) },
        uHole: { value: new THREE.Vector3(0, 0, 10) }, uBank: { value: new THREE.Vector4(0, -100, 0, 1) }, uBankD: { value: 0 },
        uSunDir: { value: new THREE.Vector3(-.55, .32, -.75).normalize() }, uSunCol: { value: new THREE.Color('#ffb487') },
        uAmbHi: { value: new THREE.Color('#b98aa0') }, uAmbLo: { value: new THREE.Color('#6d5a70') },
        uFog: { value: new THREE.Color('#f4ad8a') }, uFogRange: { value: new THREE.Vector2(30, 90) },
        uSteps: { value: this.mobile ? 40 : 64 }, uOn: { value: 1 }, uFrameJ: { value: 0 },
      },
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: compositeFrag, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: this.sceneRT.texture }, tCloud: { value: this.cloudRT.texture }, tDepth: { value: this.sceneRT.depthTexture },
        uSunUv: { value: new THREE.Vector2(.2, 1) }, uTexel: { value: new THREE.Vector2(.001, .001) }, uRays: { value: 0 }, uRayCol: { value: new THREE.Color('#ffc59a') }, uAspect: { value: 1.78 } },
    });
    this.gradeMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: gradeFrag, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: this.compRT.texture }, uExposure: { value: 1 }, uAspect: { value: 1.78 }, uTime: { value: 0 }, uVig: { value: .3 } },
    });
    this.accumMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: accumFrag, depthTest: false, depthWrite: false,
      uniforms: { tNew: { value: this.rawRT.texture }, tHist: { value: this.histRT.texture }, uKeep: { value: 0 } },
    });
    this.prevCam = new THREE.Matrix4(); this.frame = 0;
    this.quad = new FullScreenQuad(this.cloudMat);
    this.sun = new THREE.Vector3();
  }

  setSize(w, h) {
    this.sceneRT.setSize(w, h);
    const cw = Math.max(2, Math.round(w * this.cloudScale)), ch = Math.max(2, Math.round(h * this.cloudScale));
    this.cloudRT.setSize(cw, ch); this.rawRT.setSize(cw, ch); this.histRT.setSize(cw, ch);
    this.compMat.uniforms.uTexel.value.set(1 / cw, 1 / ch);
    this.compRT.setSize(w, h);
    this.bloom.setSize(Math.round(w / 2), Math.round(h / 2));
    this.compMat.uniforms.uAspect.value = this.gradeMat.uniforms.uAspect.value = w / h;
  }

  get clouds() { return this.cloudMat.uniforms; }

  // one step down in quality when frames run long: fewer cloud steps, lower
  // cloud resolution, lighter bloom (called by SceneManager's frame timer)
  degrade() {
    if (this.level >= 2) return false;
    this.level = (this.level || 0) + 1;
    this.cloudScale = this.level === 1 ? .38 : .28;
    this.cloudMat.uniforms.uSteps.value = this.level === 1 ? 44 : 30;
    const v = this.r.getDrawingBufferSize(new THREE.Vector2());
    this.setSize(v.x, v.y);
    return true;
  }

  render(scene, camera, time, { rays = 0, exposure = 1 } = {}) {
    const r = this.r;
    camera.updateMatrixWorld();
    // 1. scene
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(0x000000, 1); r.clear(true, true, true);
    r.render(scene, camera);
    // 2. clouds
    const u = this.cloudMat.uniforms;
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uCamPos.value.copy(camera.position);
    u.uTime.value = time;
    u.uFrameJ.value = (this.frame++ * 0.618034) % 1;
    this.quad.material = this.cloudMat;
    r.setRenderTarget(this.rawRT); r.clear(true, false, false);
    this.quad.render(r);
    // temporal accumulation: keep more history while the camera is still
    let move = 0; const a = camera.matrixWorld.elements, b = this.prevCam.elements;
    for (let i = 0; i < 16; i++) move += Math.abs(a[i] - b[i]);
    this.prevCam.copy(camera.matrixWorld);
    const keep = move < 0.002 ? 0.88 : move < 0.02 ? 0.7 : move < 0.1 ? 0.45 : 0.15;
    const tmp = this.histRT; this.histRT = this.cloudRT; this.cloudRT = tmp;   // last output becomes history
    this.accumMat.uniforms.tHist.value = this.histRT.texture;
    this.accumMat.uniforms.uKeep.value = keep;
    this.quad.material = this.accumMat;
    r.setRenderTarget(this.cloudRT); r.clear(true, false, false);
    this.quad.render(r);
    this.compMat.uniforms.tCloud.value = this.cloudRT.texture;
    // 3. composite + god rays
    const c = this.compMat.uniforms;
    this.sun.copy(camera.position).addScaledVector(u.uSunDir.value, 500).project(camera);
    const front = this.sun.z < 1;
    c.uSunUv.value.set(this.sun.x * .5 + .5, this.sun.y * .5 + .5);
    c.uRays.value = front ? rays : 0;
    c.uRayCol.value.copy(u.uSunCol.value);
    this.quad.material = this.compMat;
    r.setRenderTarget(this.compRT); r.clear(true, false, false);
    this.quad.render(r);
    // 4. bloom (added onto compRT)
    this.bloom.render(r, null, this.compRT, 0, false);
    // 5. grade to screen
    const g = this.gradeMat.uniforms;
    g.uExposure.value = exposure; g.uTime.value = time;
    this.quad.material = this.gradeMat;
    r.setRenderTarget(null);
    this.quad.render(r);
  }
}
