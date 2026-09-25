import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

// AFRAH engine core: quality presets, renderer + restrained post stack, aerial perspective,
// HDRI environments and texture loading. Everything here is three.js (MIT) + our own GLSL.

/* ───────── Quality presets ───────── */
export const PRESETS = {
  high: {name: 'HIGH', dpr: 1.75, shadow: 4096, ao: true, bloom: true, msaa: 4, transmission: true, shrubs: 48, trees: 1.0, traffic: 160, clouds: 18, farCity: true},
  standard: {name: 'STANDARD', dpr: 1.35, shadow: 2048, ao: true, bloom: true, msaa: 2, transmission: true, shrubs: 20, trees: .6, traffic: 70, clouds: 10, farCity: true},
  mobile: {name: 'MOBILE', dpr: 1.0, shadow: 1024, ao: false, bloom: false, msaa: 0, transmission: false, shrubs: 0, trees: .3, traffic: 24, clouds: 6, farCity: false},
};
export function detectQuality() {
  const q = new URLSearchParams(location.search).get('q');
  if (q && PRESETS[q]) return q;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
  if (mobile) return 'mobile';
  return (navigator.hardwareConcurrency || 4) >= 8 && devicePixelRatio <= 2 ? 'high' : 'standard';
}

/* ───────── Aerial perspective (first principles) ─────────
   Exponential height fog integrated along the view ray: density a·e^(−b·h).
   Near: almost no fog. Mid: contrast drops. Far: lighter, cooler haze. Replaces three's fog chunks
   globally so every material (built-in or ours) gets the same atmosphere. */
const FALLOFF = '0.0042';
let fogPatched = false;
export function patchFog() {
  if (fogPatched) return; fogPatched = true;
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif';
  C.fog_vertex = `#ifdef USE_FOG
    vFogDepth = - mvPosition.z;
    #ifdef USE_INSTANCING
      vFogWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
    #else
      vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    #endif
  #endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG
    uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;
    #ifdef FOG_EXP2
      uniform float fogDensity;
    #else
      uniform float fogNear; uniform float fogFar;
    #endif
  #endif`;
  C.fog_fragment = `#ifdef USE_FOG
    #ifdef FOG_EXP2
      vec3 fogRay = vFogWorld - cameraPosition;
      float fogDist = length(fogRay);
      float fb = ${FALLOFF};
      float fogCam = max(cameraPosition.y, 0.0);
      float fogDirY = fogRay.y / max(fogDist, 1e-3);
      float fogAmt = fogDensity * exp(-fogCam * fb) * fogDist;
      if (abs(fogDirY * fogDist * fb) > 1e-3) fogAmt = (fogDensity / fb) * exp(-fogCam * fb) * (1.0 - exp(-fogDirY * fogDist * fb)) / fogDirY;
      fogAmt = 1.0 - exp(-max(fogAmt, 0.0));
      vec3 fogFarCol = fogColor * vec3(0.9, 1.0, 1.18) + vec3(0.004, 0.008, 0.016);
      vec3 fogCol = mix(fogColor, fogFarCol, smoothstep(300.0, 2400.0, fogDist));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogCol, fogAmt);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    #endif
  #endif`;
}

/* ───────── Renderer + post ───────── */
const GradeShader = {
  uniforms: {tDiffuse: {value: null}, uVignette: {value: .22}, uLift: {value: new THREE.Vector3(0, 0, 0)}, uGain: {value: new THREE.Vector3(1, 1, 1)}, uGamma: {value: new THREE.Vector3(1, 1, 1)}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVignette; uniform vec3 uLift, uGain, uGamma; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb = pow(max(c.rgb * uGain + uLift, 0.0), 1.0 / uGamma);
      vec2 d = vUv - 0.5; float v = 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(c.rgb * v, c.a);
    }`,
};

export function createRenderer(el, quality) {
  const P = PRESETS[quality];
  const renderer = new THREE.WebGLRenderer({antialias: P.msaa === 0, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: new URLSearchParams(location.search).has('capture')});
  renderer.setPixelRatio(Math.min(devicePixelRatio, P.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  return renderer;
}

export function createComposer(renderer, scene, camera, quality) {
  const P = PRESETS[quality];
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {type: THREE.HalfFloatType, samples: P.msaa});
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null, bloom = null;
  if (P.ao) {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.blendIntensity = .7;
    gtao.updateGtaoMaterial({radius: 2.4, distanceExponent: 1.4, thickness: 1.4, scale: 1, samples: 12});
    gtao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12});
    composer.addPass(gtao);
  }
  if (P.bloom) {
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), .28, .55, .9);
    composer.addPass(bloom);
  }
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {composer, gtao, bloom, grade, setSize: (w, h) => { composer.setSize(w, h); gtao?.setSize(w, h); bloom?.setSize(w, h); }};
}

/* ───────── Environments ─────────
   Five Poly Haven CC0 pure-sky HDRIs. Numeric parameters interpolate continuously; the HDRI
   crossfades on the sky dome and swaps as the PMREM environment at the midpoint. */
export const ENVIRONMENTS = {
  night: {hdr: 'night', rot: 2.2, exposure: 1.0, env: .22, sky: .16, key: [.35, .55, -.55], keyColor: '#9fb2d6', keyI: .55, fog: '#070b14', fogD: .00062, windows: 1, street: 1, bloom: .3, lantern: 1},
  blue: {hdr: 'blue', rot: 1.4, exposure: .95, env: .55, sky: .55, key: [-.6, .12, -.5], keyColor: '#8fa7d4', keyI: .9, fog: '#1b2740', fogD: .00046, windows: .78, street: .85, bloom: .28, lantern: .85},
  golden: {hdr: 'golden', rot: 3.6, exposure: .92, env: .95, sky: 1, key: [-.75, .22, -.35], keyColor: '#ffb57a', keyI: 2.6, fog: '#b58b66', fogD: .00032, windows: .22, street: .1, bloom: .18, lantern: .3},
  overcast: {hdr: 'overcast', rot: 0, exposure: .98, env: 1.25, sky: 1, key: [.3, .9, .2], keyColor: '#ffffff', keyI: .5, fog: '#8f989f', fogD: .0005, windows: .12, street: 0, bloom: .1, lantern: 0},
  day: {hdr: 'day', rot: 1.1, exposure: .82, env: 1, sky: 1, key: [.45, .78, .35], keyColor: '#fff3e2', keyI: 3.1, fog: '#a9bccd', fogD: .00026, windows: .04, street: 0, bloom: .08, lantern: 0},
};
export const ENV_ORDER = ['day', 'overcast', 'golden', 'blue', 'night'];

const hdrCache = new Map();
export function loadHDR(name) {
  if (!hdrCache.has(name)) hdrCache.set(name, new HDRLoader().setDataType(THREE.HalfFloatType).loadAsync(`/v5/hdri/${name}.hdr`).then(t => { t.mapping = THREE.EquirectangularReflectionMapping; return t; }));
  return hdrCache.get(name);
}

// Sky dome that crossfades two equirect HDRIs with rotation + intensity.
export function createSkyDome() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {tA: {value: null}, tB: {value: null}, uMix: {value: 0}, uRotA: {value: 0}, uRotB: {value: 0}, uIntA: {value: 1}, uIntB: {value: 1}, uHorizon: {value: new THREE.Color('#0a0f1a')}},
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uRotA, uRotB, uIntA, uIntB; uniform vec3 uHorizon; varying vec3 vDir;
      vec2 eq(vec3 d, float r){ float a = atan(d.z, d.x) + r; return vec2(fract(a / 6.2831853 + 0.5), asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5); }
      void main(){
        vec3 d = normalize(vDir);
        vec3 a = texture2D(tA, eq(d, uRotA)).rgb * uIntA;
        vec3 b = texture2D(tB, eq(d, uRotB)).rgb * uIntB;
        vec3 c = mix(a, b, uMix);
        c = mix(uHorizon, c, smoothstep(-0.05, 0.035, d.y));
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(8000, 48, 24), mat);
  mesh.renderOrder = -10; mesh.frustumCulled = false;
  return mesh;
}

/* ───────── Textures ───────── */
const texLoader = new THREE.TextureLoader(), texCache = new Map();
export function tex(path, {srgb = false, anisotropy = 8} = {}) {
  const key = path + srgb;
  if (!texCache.has(key)) {
    texCache.set(key, new Promise((res, rej) => texLoader.load(path, t => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anisotropy;
      res(t);
    }, undefined, rej)));
  }
  return texCache.get(key);
}
export function pbr(role) {
  const base = `/v5/tex/${role}_`;
  return Promise.all([tex(base + 'diffuse.webp', {srgb: true}).catch(() => null), tex(base + 'nor.webp').catch(() => null), tex(base + 'rough.webp').catch(() => null)])
    .then(([map, normalMap, roughnessMap]) => ({map, normalMap, roughnessMap}));
}

/* ───────── Shared GLSL (first principles, no third-party shader source) ───────── */
export const GLSL_NOISE = `
  float h11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 r = mat2(0.8, -0.6, 0.6, 0.8); for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = r * p * 2.03 + 11.7; a *= 0.5; } return v; }
`;

// Kelvin (approx.) → linear RGB for interior light temperatures 2400–3200 K.
export function kelvin(k) {
  const t = k / 100;
  const g = THREE.MathUtils.clamp(99.47 * Math.log(t) - 161.12, 0, 255), b = t <= 19 ? 0 : THREE.MathUtils.clamp(138.52 * Math.log(t - 10) - 305.04, 0, 255);
  return new THREE.Color(1, g / 255, b / 255).convertSRGBToLinear();
}

export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
