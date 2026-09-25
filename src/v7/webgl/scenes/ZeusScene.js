import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { sectionProgress, store } from '../../core/store';

// Sculpture room, composed like the Silver Pinewood lobby: a very long lens
// looking across the statue, a dark frame behind it, faint floating stones and
// a dim room. A small point light follows the cursor over the statue and
// casts real shadows, so moving the mouse sculpts it with light. The camera
// orbits the statue slightly with the pointer and the parts drift at
// different speeds with scroll.
export const ZEUS_BG = '#282828';

const CAM = {
  pos: [6.941, 1.1, -8.8], target: new THREE.Vector3(4, 1.35, -2.93),
  posPortrait: [7.641, 1.1, -8.8], targetPortrait: new THREE.Vector3(4.7, 1.35, -2.93), fov: 12,
};
const AXIS_X = new THREE.Vector3(1, 0, 0), AXIS_Y = new THREE.Vector3(0, 1, 0);
const LIGHT_HOME = [4.6, 1.4, -3.8];      // cursor light rest position
const LIGHT_TRAVEL = [0.8, 0.5];          // how far it follows the cursor
// Fixed room lights (position, intensity), no falloff.
const ROOM = [
  [[-42.944, 19.448, -16.665], 0.088],
  [[0.155, 2.289, -1.876], 0.024],
  [[-1.784, -0.384, -0.2], 2.988],
  [[7.606, 1.623, 0.851], 0.888],
];

// Background: a dark dome with a few slow, soft light shafts falling from the
// upper left — atmosphere only, no sparkle.
const bgVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const bgFrag = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
float shaft(vec2 uv, vec2 origin, float angle, float width, float len, float phase){
  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 rel = uv - origin;
  float along = dot(rel, dir);
  float across = abs(dot(rel, vec2(-dir.y, dir.x)));
  float w = width * (0.35 + along * 2.2);
  float body = smoothstep(w, 0.0, across) * smoothstep(0.0, 0.03, along) * smoothstep(len, len * 0.35, along);
  float breathe = 0.75 + 0.25 * sin(uTime * (0.35 + phase * 0.1) + phase * 6.283);
  return body * breathe;
}
void main(){
  vec2 o = vec2(0.11, 0.55);
  float b = 0.0;
  b += shaft(vUv, o, -0.10, 0.010, 0.55, 0.13) * 0.06;
  b += shaft(vUv, o, -0.20, 0.014, 0.50, 0.37) * 0.05;
  b += shaft(vUv, o, -0.30, 0.008, 0.30, 0.61) * 0.035;
  b += shaft(vUv, o, -0.42, 0.012, 0.40, 0.83) * 0.045;
  b += shaft(vUv, o, -0.58, 0.010, 0.22, 0.29) * 0.05;
  b += shaft(vUv, o, -0.72, 0.016, 0.36, 0.71) * 0.07;
  float base = 0.08;
  float v = base + b;
  gl_FragColor = vec4(vec3(v), 1.0);
}`;

export class ZeusScene {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.bgMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: bgVert, fragmentShader: bgFrag, side: THREE.DoubleSide, depthWrite: false });
    const bg = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 16), this.bgMat);
    bg.position.set(4.513, 1.066, -3);
    this.group.add(bg);

    // Lights stay in the scene permanently (intensity 0 when inactive) so the
    // light count never changes and no material has to recompile.
    this.room = ROOM.map(([p, i]) => {
      const l = new THREE.PointLight('#ffffff', 0, 0, 0);
      l.position.set(...p); l.userData.base = i * Math.PI; scene.add(l); return l;
    });
    this.cursorLight = new THREE.PointLight('#ffffff', 0, 1.25, 0);
    this.cursorLight.position.set(...LIGHT_HOME);
    this.cursorLight.castShadow = true;
    this.cursorLight.shadow.mapSize.set(1024, 1024);
    this.cursorLight.shadow.normalBias = 0.002;
    this.cursorLight.shadow.camera.near = 0.01;
    scene.add(this.cursorLight);

    this.statue = []; this.frame = []; this.stones = [];
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.camPos = new THREE.Vector3();
    this.intensity = 0;

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.ready = loader.loadAsync('/reference-study/silver/model.gltf').then(({ scene: model }) => {
      model.updateMatrixWorld(true);
      const meshes = [];
      model.traverse((o) => { if (o.isMesh) meshes.push(o); });
      meshes.forEach((o) => {
        const m = new THREE.Mesh(o.geometry, o.material.clone());
        m.applyMatrix4(o.matrixWorld);
        const name = o.name.replace(/[^A-Za-z0-9]/g, '');
        if (/^Default/.test(name)) {
          m.castShadow = true; m.receiveShadow = true;
          m.material.roughness = 0.75; m.material.metalness = 0.5; m.material.color.setRGB(0.8, 0.8, 0.8);
          this.statue.push(m);
        } else if (/^Cube/.test(name)) {
          m.material.roughness = 0.7; m.material.metalness = 0.02; m.material.color.setRGB(0.05, 0.05, 0.05);
          m.userData.rz = m.rotation.z;
          this.frame.push(m);
        } else if (/^Plane/.test(name)) {
          m.material = new THREE.MeshBasicMaterial({ map: o.material.map, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
          this.stones.push(m);
        } else return;
        m.userData.baseY = m.position.y;
        this.group.add(m);
      });
    }).catch((e) => { this.error = e; console.warn('Sculpture model could not load', e); });
  }

  update(camera, time) {
    const active = store.activeStage === 'statue' && this.statue.length > 0;
    this.group.visible = active;
    // ease the room light up on entry
    this.intensity += ((active ? 1 : 0) - this.intensity) * 0.08;
    const k = active ? this.intensity : 0;
    this.room.forEach((l) => { l.intensity = l.userData.base * k; });
    this.cursorLight.intensity = 8 * Math.PI * k;
    this.cursorLight.shadow.autoUpdate = active;
    if (!active) return;

    const p = sectionProgress('statue');
    const off = p - 0.5;
    this.statue.forEach((m) => { m.position.y = m.userData.baseY + 0.5 * off; });
    this.frame.forEach((m) => { m.position.y = m.userData.baseY + 0.25 * off; m.rotation.z = m.userData.rz - 0.2 * (1 - this.intensity); });
    this.stones.forEach((m) => { m.position.y = m.userData.baseY - 1 * off; });

    // pointer: 0..1 from the top-left of the screen, smoothed
    const ptr = store.pointer;
    const tx = ptr ? (ptr.x + 1) / 2 : 0.5, ty = ptr ? (1 - ptr.y) / 2 : 0.5;
    this.mouse.x += (tx - this.mouse.x) * 0.08;
    this.mouse.y += (ty - this.mouse.y) * 0.08;
    this.cursorLight.position.set(
      LIGHT_HOME[0] - 2 * (this.mouse.x - 0.5) * LIGHT_TRAVEL[0],
      LIGHT_HOME[1] - 2 * (this.mouse.y - 0.5) * LIGHT_TRAVEL[1],
      LIGHT_HOME[2],
    );

    // long-lens camera orbiting the target with the pointer and scroll
    const portrait = (store.aspectK || 1) < 0.7;
    const target = portrait ? CAM.targetPortrait : CAM.target;
    this.camPos.set(...(portrait ? CAM.posPortrait : CAM.pos)).sub(target);
    this.camPos.applyAxisAngle(AXIS_X, (2 * (this.mouse.y - 0.5)) / 8 - off);
    this.camPos.applyAxisAngle(AXIS_Y, (2 * (this.mouse.x - 0.5)) / -10);
    camera.fov = CAM.fov; camera.updateProjectionMatrix();
    camera.position.copy(this.camPos.add(target));
    camera.lookAt(target);

    this.bgMat.uniforms.uTime.value = time;
  }
}
