import * as THREE from 'three';
import { loadEraDistrict } from './EraDistrict';

// The shared world for the hero and the building chapter: ERA's district, a
// sky dome, a sun and a warm haze. Only one stage drives it at a time; the
// lights stay in the scene permanently (intensity toggles, never visibility,
// so no program recompiles when stages change).

const skyVert = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const skyFrag = `
uniform vec3 uHorizon; uniform vec3 uMid; uniform vec3 uTop; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uGround;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
  col = mix(col, uTop, smoothstep(0.22, 0.95, h));
  col = mix(col, uHorizon * uGround, smoothstep(0.0, -0.25, h));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunCol * (pow(s, 6.0) * 0.35 + pow(s, 60.0) * 0.8 + pow(s, 900.0) * 3.0);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const MOODS = {
  // Baahubali: warm golden light through a rose haze
  golden: { horizon: '#f2cfb0', mid: '#d9aea6', top: '#7d7b9c', sun: '#ffd09a', sunCol: '#ffc98f', fog: '#e2c3b4', hemiSky: '#ffe9d4', hemiGround: '#6d5f58', sunI: 2.6, hemiI: 1.15, ground: .9, evening: 0 },
  // the place chapter: a clear, cool morning
  morning: { horizon: '#f6e3cf', mid: '#bfd5e6', top: '#6d9ccc', sun: '#fff0da', sunCol: '#fff1d6', fog: '#e3e8eb', hemiSky: '#eef4fb', hemiGround: '#8b8578', sunI: 2.4, hemiI: 1.25, ground: 1, evening: 0 },
  // the building chapter: last light, rooms coming on
  dusk: { horizon: '#e79a74', mid: '#8a6d80', top: '#1d2640', sun: '#ff9a62', sunCol: '#ff8f5a', fog: '#6e5a66', hemiSky: '#c6a8b8', hemiGround: '#231d24', sunI: 1.9, hemiI: .55, ground: .45, evening: 1 },
};

export class EraWorld {
  constructor(scene, renderer) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({
      vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
      uniforms: { uHorizon: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(-.55, .32, -.75) }, uSunCol: { value: new THREE.Color() }, uGround: { value: .9 } },
    }));
    this.sky.frustumCulled = false; this.sky.renderOrder = -5; this.sky.scale.setScalar(900);
    this.group.add(this.sky);
    this.sun = new THREE.DirectionalLight('#ffd09a', 0); this.sun.position.set(-40, 26, -52);
    this.hemi = new THREE.HemisphereLight('#ffe9d4', '#6d5f58', 0);
    scene.add(this.sun, this.hemi);
    this.fogColor = new THREE.Color('#e2c3b4');
    this.fogNear = 30; this.fogFar = 220;
    this.mood = null;
    this.ready = loadEraDistrict(renderer).then((d) => { this.district = d; this.group.add(d.group); this.setMood('golden'); })
      .catch((e) => { this.error = e; console.warn('ERA district could not load', e); });
  }

  setMood(name, k = 1) {
    const a = MOODS.golden, b = MOODS[name] || a, u = this.sky.material.uniforms;
    const mix = (x, y) => new THREE.Color(x).lerp(new THREE.Color(y), k);
    u.uHorizon.value.copy(mix(a.horizon, b.horizon)); u.uMid.value.copy(mix(a.mid, b.mid)); u.uTop.value.copy(mix(a.top, b.top));
    u.uSunCol.value.copy(mix(a.sunCol, b.sunCol)); u.uGround.value = a.ground + (b.ground - a.ground) * k;
    this.fogColor.copy(mix(a.fog, b.fog));
    this.sun.color.copy(mix(a.sun, b.sun)); this.hemi.color.copy(mix(a.hemiSky, b.hemiSky)); this.hemi.groundColor.copy(mix(a.hemiGround, b.hemiGround));
    this._sunI = a.sunI + (b.sunI - a.sunI) * k; this._hemiI = a.hemiI + (b.hemiI - a.hemiI) * k;
    this.district?.setEvening(a.evening + (b.evening - a.evening) * k);
    this.mood = name;
  }

  // Called every frame by SceneManager after the rigs ran.
  update(camera, time, on) {
    this.group.visible = on && !!this.district;
    this.sun.intensity = on ? this._sunI || 0 : 0;
    this.hemi.intensity = on ? this._hemiI || 0 : 0;
    if (!on) return;
    this.sky.position.copy(camera.position);
    this.district?.tick(time);
  }
}
