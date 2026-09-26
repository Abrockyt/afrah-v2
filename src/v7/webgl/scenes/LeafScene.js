import * as THREE from 'three';
import { sectionProgress, store, range, smooth } from '../../core/store';
import { samplePose, sampleShadow, screenToWorld, fallData, CAM_D, FOV } from './FeatherFall';
import { createLeaf, createLeafSwarm } from '../objects/CopperLeaf';

// The architecture chapter, after Composites' "Defy gravity" feather: one
// copper leaf falls through the measured poses of the reference (same screen
// path, tumble and landing shadow), a far field of small leaves drifts behind
// it, and at the end a storm of leaves carries the feathered wipe into the
// next chapter, its edge made of leaves rather than a line.
export const LEAF_BG = '#f1e2dd';
const _o = new THREE.Object3D(), _v = new THREE.Vector3();

export class LeafScene {
  constructor(scene, envMap) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    this.leaf = createLeaf({ envMap }); this.group.add(this.leaf);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#3a2a22', transparent: true, opacity: 0, depthWrite: false }));
    this.group.add(this.shadow);
    // far field: small leaves drifting slowly behind the main one
    this.far = createLeafSwarm(16, { envMap, glow: 0.05 });
    this.far.material.transparent = true; this.far.material.opacity = 0.35;
    const rnd = mulberry(5);
    this.farSeeds = Array.from({ length: 16 }, () => ({ x: (rnd() - 0.5) * 11, y: (rnd() - 0.5) * 6, z: -4 - rnd() * 6, s: 0.1 + rnd() * 0.1, a: rnd() * 6.28, r: rnd() }));
    this.group.add(this.far);
    // the storm renders after the wipe, so its leaves sit on the wipe's edge
    this.stormScene = new THREE.Scene();
    this.stormDark = createLeafSwarm(150, { envMap, glow: 0.1 });
    this.stormLight = createLeafSwarm(90, { envMap, color: '#f3ece2' });
    this.stormScene.add(this.stormDark, this.stormLight, new THREE.HemisphereLight('#ffffff', '#6d5f58', 1.4));
    const key = new THREE.DirectionalLight('#fff3e6', 2); key.position.set(-2, 3, 4); this.stormScene.add(key);
    this.stormSeeds = Array.from({ length: 240 }, () => ({ x: rnd(), y: (rnd() - 0.5), z: rnd(), s: rnd(), a: rnd() * 6.28, b: rnd() * 6.28, sp: 0.6 + rnd() * 1.4 }));
    this.storm = 0;
  }

  // progress of the storm/wipe (0..1) for SceneManager's cover
  get takeover() { return range(sectionProgress('leaf'), fallData.takeover[0] - 0.05, 1); }

  update(camera, time) {
    const on = store.activeStage === 'leaf';
    this.group.visible = on;
    this.storm = 0;
    if (!on) return;
    const p = sectionProgress('leaf');
    const aspect = camera.aspect;
    camera.fov = FOV; camera.near = 0.05; camera.far = 200; camera.up.set(0, 1, 0);
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, CAM_D); camera.lookAt(0, 0, 0);
    const ptr = store.pointer;
    camera.position.x += (ptr ? ptr.x : 0) * 0.05; camera.position.y += (ptr ? ptr.y : 0) * 0.03;

    // the fall, straight from the measured keys; a leaf is broader than a
    // feather, so it is drawn slightly shorter
    samplePose(p, aspect, this.leaf);
    this.leaf.scale.multiplyScalar(0.92);
    this.leaf.userData.eve.value = 0.22 + 0.12 * Math.sin(time * 0.6);
    const sh = sampleShadow(p, aspect);
    if (sh) {
      screenToWorld(sh.cx, sh.cy, aspect, this.shadow.position); this.shadow.position.z = -0.05;
      const hh = CAM_D * Math.tan(FOV / 2 * Math.PI / 180);
      this.shadow.scale.set(sh.w * hh * aspect, sh.h * hh, 1);
      this.shadow.material.opacity = sh.alpha * 0.9;
    } else this.shadow.material.opacity = 0;

    // far field drifts down, turning
    for (let i = 0; i < this.farSeeds.length; i++) {
      const f = this.farSeeds[i];
      const y = ((f.y - time * 0.05 * (0.5 + f.r) - p * 3 + 30) % 6) - 3;
      _o.position.set(f.x + Math.sin(time * 0.3 + f.a) * 0.3, y, f.z);
      _o.rotation.set(f.a + time * 0.4 * f.r, f.a * 2 + time * 0.3, f.a + time * 0.2);
      _o.scale.setScalar(f.s); _o.updateMatrix();
      this.far.setMatrixAt(i, _o.matrix);
    }
    this.far.instanceMatrix.needsUpdate = true;

    // the storm: leaves riding the rising wipe front
    const k = this.takeover;
    this.storm = k > 0 && k < 1 ? 1 : 0;
    if (this.storm) {
      const hh = CAM_D * Math.tan(FOV / 2 * Math.PI / 180);
      const front = k * 1.5 - 0.25;                       // wipe front in screen uv (FeatherWipe)
      const put = (mesh, seeds, offset) => {
        for (let i = 0; i < mesh.count; i++) {
          const s = seeds[i + offset];
          const uvx = s.x, uvy = front + s.y * 0.22 + Math.sin(time * s.sp + s.a) * 0.02;
          _v.set((uvx - 0.5) * 2 * hh * aspect, (uvy - 0.5) * 2 * hh, 0.3 + s.z * 1.2);
          _o.position.copy(_v);
          _o.rotation.set(s.a + time * s.sp * 0.8, s.b + time * s.sp, s.a * 0.5 + time * 0.6 * s.sp);
          _o.scale.setScalar((0.06 + s.s * 0.16) * (1 - Math.abs(s.y) * 1.2));
          _o.updateMatrix(); mesh.setMatrixAt(i, _o.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      };
      put(this.stormDark, this.stormSeeds, 0);
      put(this.stormLight, this.stormSeeds, 150);
    }
  }

  renderStorm(renderer, camera) {
    if (!this.storm) return;
    renderer.clearDepth();
    renderer.render(this.stormScene, camera);
  }
}

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
