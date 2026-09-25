import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sectionProgress, range, smooth, store } from '../../core/store';

// The tower chapter: the ERA study model (public/v4/era-map/era-building.glb —
// study copy, see reuse-assets/manifest.json) presented like the Composites
// sculpture: glossy black solids on the bone stage, a perspective floor grid,
// and a few warm windows. The feathered wipe brings it in from the dark stage
// and takes it back out; the model is clipped by the same fringe.
const TALL = { x: -140, z: -121, base: 3, top: 266 };
const S = 4.2 / (TALL.top - TALL.base);
const FOOT = -2.25;

// Four shots (front three-quarter → closer → crown detail → elevated), scene units.
const SHOTS = {
  pos: [[8.2, -1.2, 9.6], [5.2, -0.1, 6.0], [2.1, 1.5, 2.3], [-1.0, 2.6, 2.6], [-7.0, 5.4, 8.0]],
  look: [[0, -0.3, 0], [0, 0.0, 0], [0, 1.25, 0], [0, 1.2, 0], [0, -0.6, 0]],
};

// Sideways camera pan (scene units) against chapter progress; matches the
// caption side of each shot in copy.js TOWER.shots (l, r, l, r).
const FRAME = [[0, -2.2], [0.3, -2.2], [0.4, 1.8], [0.52, 1.8], [0.6, -1.3], [0.72, -1.3], [0.8, 2.2], [1, 2.2]];
function frameOffset(p) {
  let i = 0; while (i < FRAME.length - 2 && p > FRAME[i + 1][0]) i++;
  const [p0, a] = FRAME[i], [p1, b] = FRAME[i + 1];
  return a + (b - a) * smooth(Math.max(0, Math.min(1, (p - p0) / (p1 - p0))));
}

function kind(name) {
  if (/window/.test(name)) return 'glass';
  if (/Bronze/.test(name)) return 'fin';
  if (/roof/.test(name)) return 'roof';
  return 'body';
}

// Warm rooms: a stable per-bay hash lights roughly one window in five.
const ROOMS = `
  float fl = floor(vTowerW.y / 0.155), bay = floor((vTowerW.x + vTowerW.z * 0.47) / 0.115);
  float rr = fract(sin(dot(vec2(fl, bay), vec2(12.9898, 78.233))) * 43758.5453);
  totalEmissiveRadiance *= rr > 0.8 ? 1.0 : rr > 0.66 ? 0.18 : 0.0;`;

export class BuildingScene {
  constructor(scene, envMap, wipe, renderer) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.wipe = wipe;
    this.mats = {
      body: new THREE.MeshPhysicalMaterial({ color: 0x080808, roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.3, envMap, envMapIntensity: 0.35 }),
      fin: new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.32, metalness: 0.75, envMap, envMapIntensity: 0.55 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.2, envMap, envMapIntensity: 0.3 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.12, metalness: 0.55, envMap, envMapIntensity: 0.9, emissive: new THREE.Color('#f0801a'), emissiveIntensity: 0.0 }),
    };
    this.masked = Object.values(this.mats);
    for (const m of this.masked) wipe.applyMask(m, 'to');
    // Chain the room-occupancy shader after the wipe mask on the glass.
    const g = this.mats.glass, maskHook = g.onBeforeCompile;
    g.onBeforeCompile = (sh, r) => {
      maskHook(sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTowerW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTowerW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTowerW;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + ROOMS);
    };
    g.customProgramCacheKey = () => 'tower-glass';

    const grid = new THREE.GridHelper(60, 60, 0xb5b0af, 0xb5b0af);
    grid.material.transparent = true; grid.material.opacity = 0.45; grid.material.depthWrite = false;
    grid.position.y = FOOT - 0.01;
    wipe.applyMask(grid.material, 'to');
    this.masked.push(grid.material);
    this.grid = grid;
    this.group.add(grid);

    this.pos = new THREE.CatmullRomCurve3(SHOTS.pos.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    this.look = new THREE.CatmullRomCurve3(SHOTS.look.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    this.P = new THREE.Vector3(); this.L = new THREE.Vector3(); this.sm = 0;

    this.model = null;
    new GLTFLoader().loadAsync('/v4/era-map/era-building.glb').then((gltf) => {
      const root = gltf.scene;
      root.traverse((o) => {
        if (!o.isMesh) return;
        const k = kind(o.material?.name || '');
        o.material?.dispose?.();
        o.material = this.mats[k];
      });
      root.scale.setScalar(S);
      root.position.set(-TALL.x * S, FOOT - TALL.base * S, -TALL.z * S);
      this.group.add(root);
      this.model = root;
      // compile the new programs now so the chapter never stalls on first use
      const was = this.group.visible; this.group.visible = true;
      (renderer.compileAsync ? renderer.compileAsync(scene, new THREE.PerspectiveCamera()) : Promise.resolve(renderer.compile(scene, new THREE.PerspectiveCamera())))
        .finally(() => { this.group.visible = was; });
    }).catch((e) => console.warn('tower model unavailable', e));
  }

  setMask(enabled, w, h) {
    for (const m of this.masked) { m.userData.maskEnabled.value = enabled ? 1 : 0; m.userData.maskRes.value.set(w, h); }
  }

  update(camera, t, renderer) {
    const active = store.activeStage === 'building';
    this.group.visible = active;
    if (!active) return;
    const p = sectionProgress('building');
    this.sm += (p - this.sm) * 0.12;
    const k = Math.max(0, Math.min(1, range(this.sm, 0.04, 0.96)));
    this.pos.getPoint(k, this.P); this.look.getPoint(k, this.L);
    const ak = store.aspectK || 1;
    camera.position.set(this.P.x * ak, this.P.y, this.P.z / Math.pow(ak, 0.85));
    camera.lookAt(this.L);
    // keep the tower opposite the caption (left captions → tower right, and back)
    camera.translateX(frameOffset(p) * ak);
    // the tower turns a little as the chapter plays
    if (this.model) this.group.rotation.y = -0.35 + k * 0.7;
    // windows warm up for the LIGHT shot and stay faintly lit afterwards
    this.mats.glass.emissiveIntensity = 0.35 + 1.4 * smooth(range(p, 0.28, 0.4)) - 0.9 * smooth(range(p, 0.55, 0.7));
    this.grid.rotation.y = -this.group.rotation.y;
    this.grid.material.opacity = 0.45;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.setMask(p < 0.1 || p > 0.9, size.x, size.y);
  }
}
