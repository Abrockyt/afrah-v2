import * as THREE from 'three';
import { loadGLB, skin } from '../../../v4/three/era';
import { sectionProgress, store, smooth, range } from '../../core/store';

// "Above the clouds" hero: the towers stand in a dusk sky with banks of cloud
// wrapped round their middle. At rest the camera drifts slowly at cloud level;
// scrolling lifts it up through the cloud layer until the crowns stand in
// clear evening light above a sea of cloud.

const S = 0.02;                                   // model metres → scene units
const CENTRE = new THREE.Vector3(-120, 0, -95);   // tower cluster centre (model space)

const skyVert = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFrag = `
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = smoothstep(-0.12, 0.75, d.y);
  vec3 horizon = vec3(0.93, 0.62, 0.48);
  vec3 mid = vec3(0.47, 0.36, 0.45);
  vec3 top = vec3(0.05, 0.11, 0.22);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.35, h));
  col = mix(col, top, smoothstep(0.3, 1.0, h));
  // warm afterglow along the horizon only (no sun disc)
  col += vec3(0.25, 0.1, 0.04) * (1.0 - smoothstep(0.0, 0.25, abs(d.y)));
  gl_FragColor = vec4(col, 1.0);
}`;

const cloudVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const cloudFrag = `
uniform sampler2D uMap; uniform float uTime; uniform float uOpacity; uniform vec3 uTint; uniform vec2 uDrift;
varying vec2 vUv;
void main(){
  vec2 uv = vUv + uDrift * uTime;
  vec4 c = texture2D(uMap, uv);
  float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(0.0, 0.18, 1.0 - vUv.x) * smoothstep(0.0, 0.18, vUv.y) * smoothstep(0.0, 0.18, 1.0 - vUv.y);
  gl_FragColor = vec4(c.rgb * uTint, c.a * edge * uOpacity);
  #include <colorspace_fragment>
}`;

export class HeroCloudScene {
  constructor(scene, envMap) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.sky.frustumCulled = false; this.sky.renderOrder = -2;
    this.group.add(this.sky);

    // Cloud banks: horizontal sheets at the towers' middle, plus a few upright
    // veils the camera passes through on its way up.
    const tex = new THREE.TextureLoader().load('/media/afrah-cloud-atlas.png');
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
    const mk = (w, h, opacity, tint, drift) => new THREE.ShaderMaterial({
      vertexShader: cloudVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uOpacity: { value: opacity }, uTint: { value: new THREE.Color(tint) }, uDrift: { value: new THREE.Vector2(...drift) } },
    });
    this.clouds = [];
    const sheet = (y, size, opacity, tint, drift, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.4), mk(size, size * 0.4, opacity, tint, drift));
      m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(0, y, 0); m.userData.base = opacity;
      this.group.add(m); this.clouds.push(m); return m;
    };
    sheet(1.9, 60, 0.95, '#f3d9cc', [0.0009, 0.0004], 0.2);
    sheet(2.4, 54, 0.85, '#f6e2d6', [-0.0007, 0.0005], -0.35);
    sheet(2.9, 48, 0.7, '#fbe9dd', [0.0006, -0.0006], 0.9);
    sheet(1.2, 70, 1.0, '#e2c3b8', [0.0005, 0.0002], -0.1);
    const veil = (x, y, z, w, opacity, drift) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.4), mk(w, w * 0.4, opacity, '#f7e4d8', drift));
      m.position.set(x, y, z); m.userData.base = opacity; m.userData.veil = true;
      this.group.add(m); this.clouds.push(m); return m;
    };
    veil(-3, 2.3, 6.5, 12, 0.75, [0.0012, 0]);
    veil(3.5, 2.7, 5.2, 10, 0.6, [-0.001, 0]);
    veil(0.5, 3.2, 7.4, 14, 0.5, [0.0008, 0]);

    this.look = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.drift = new THREE.Vector2();

    this.ready = loadGLB('era-building.glb').then((root) => {
      skin(root, 'cinematic');
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false; o.receiveShadow = false;         // no shadow passes for the hero
        const m = o.material;
        if (m && !m.userData.heroTuned) {
          m.userData.heroTuned = true;
          m.envMap = envMap;
          if (m.userData.kind === 'glass') { m.emissiveIntensity = 0.85; }
        }
      });
      const holder = new THREE.Group();
      holder.scale.setScalar(S);
      holder.position.set(-CENTRE.x * S, 0, -CENTRE.z * S);
      holder.add(root);
      this.group.add(holder);
      this.model = holder;
    }).catch((e) => { this.error = e; console.warn('Hero towers could not load', e); });
  }

  update(camera, time) {
    const active = store.activeStage === 'hero' || (!store.activeStage && store.scroll < 4);
    this.group.visible = active;
    if (!active) return;
    const p = sectionProgress('hero');
    const k = store.aspectK || 1;

    // pointer adds a gentle parallax
    const ptr = store.pointer;
    this.drift.x += ((ptr ? ptr.x : 0) - this.drift.x) * 0.04;
    this.drift.y += ((ptr ? ptr.y : 0) - this.drift.y) * 0.04;

    // camera path: cloud level → up through the clouds → above the crowns
    const rise = smooth(range(p, 0.05, 0.85));
    const orbit = -0.35 + rise * 0.55 + Math.sin(time * 0.05) * 0.03 + this.drift.x * 0.05;
    const dist = (11.5 - rise * 3.2) / Math.pow(k, 0.6);
    const y = 2.15 + rise * 4.6 + this.drift.y * 0.12;
    this.pos.set(Math.sin(orbit) * dist, y, Math.cos(orbit) * dist);
    this.look.set(0, 2.9 + rise * 2.0, 0);
    camera.fov = 36; camera.updateProjectionMatrix();
    camera.position.copy(this.pos);
    camera.lookAt(this.look);
    this.sky.position.copy(camera.position);

    // clouds drift; veils thin out as the camera climbs past them
    this.clouds.forEach((c) => {
      const u = c.material.uniforms;
      u.uTime.value = time;
      const fade = c.userData.veil ? 1 - smooth(range(p, 0.2, 0.55)) : 1;
      u.uOpacity.value = c.userData.base * fade;
    });
  }
}
