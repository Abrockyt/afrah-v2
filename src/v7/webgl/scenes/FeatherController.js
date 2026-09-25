import * as THREE from 'three';
import { createFeather, createFeatherSprites } from '../objects/ProceduralFeather';
import { sectionProgress, range, smooth, lerp, store } from '../../core/store';
import { samplePose, sampleShadow, screenToWorld, featherScale, fallData } from './FeatherFall';
import HS from '../data/historySpec.json';

// FeatherController: one narrative feather (two colour variants share pose)
// plus a far-field sprite cloud. Poses are keyframed against section progress
// and blended with quaternion slerp so the tumble reads as real 3D rotation.

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();
const halfHFor = () => 4.3 * Math.tan((38 / 2) * Math.PI / 180);

export class FeatherController {
  constructor(scene) {
    this.scene = scene;
    this.white = createFeather({ color: '#fbfaf8', roughness: 0.75 });
    this.black = createFeather({ color: '#050505', rachisColor: '#2c2c2c', roughness: 0.55, streaks: true });
    this.white.visible = false; this.black.visible = false;
    this.sprites = createFeatherSprites(64, { color: '#4a4848' });
    this.sprites.visible = false;
    this.darkSprites = createFeatherSprites(28, { color: '#1c1c1c', spread: 10, depth: 8, seed: 11 });
    this.darkSprites.visible = false;
    // Ground shadow + ripple rings used when the feather lands
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
    this.rings = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 96), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      this.rings.add(r);
    }
    scene.add(this.white, this.black, this.sprites, this.darkSprites, this.shadow, this.rings);
    this.tmp = new THREE.Object3D();
  }

  update(t, dt) {
    const ak = store.aspectK || 1;           // portrait: objects toward centre, a bit smaller
    const sk = 0.55 + 0.45 * ak;
    const fusion = sectionProgress('fusion');
    const protect = sectionProgress('protect');
    const defy = sectionProgress('defy');
    const why = sectionProgress('why');
    const tunnel = sectionProgress('tunnel');
    const hist = sectionProgress('history');
    const act = (id) => store.activeStage === id;

    this.white.visible = false; this.black.visible = false;
    this.sprites.visible = false; this.darkSprites.visible = false;
    this.shadow.material.opacity = 0;
    this.rings.children.forEach((r) => (r.material.opacity = 0));

    // --- Ideal fusion: white feather left-centre, tilted, drifting; cloud behind
    if (act('fusion') || (act('protect') && protect < 0.08)) {
      const f = this.white;
      f.visible = true;
      const enter = smooth(range(fusion, 0.0, 0.18));
      const leave = smooth(range(fusion, 0.86, 1.0));
      f.position.set(lerp(1.4, -1.45, enter) + leave * -1.2, lerp(1.6, 0.05, enter) + Math.sin(t * 0.7) * 0.05 - leave * 1.6, 0.6);
      f.rotation.set(0.12 + Math.sin(t * 0.5) * 0.05, -0.2 + fusion * 0.45, -0.72 + Math.sin(t * 0.4) * 0.04);
      f.scale.setScalar(1.7 * sk); f.position.x *= ak;
      this.sprites.visible = true;
      this.sprites.userData.update(t, -fusion * 4);
    }
    // --- Protection: black feather right, tilted, gently floating
    if (act('protect') || (act('defy') && defy < 0.02)) {
      const f = this.black;
      f.visible = true;
      const enter = smooth(range(protect, 0.0, 0.22));
      const aspect = store.vw / store.vh;
      f.position.set(lerp(2.6, 0.95, enter) * ak, lerp(2.4, 0.05, enter) + Math.sin(t * 0.6) * 0.05, 0.4);
      f.rotation.set(0.1, 0.15, -0.5 + Math.sin(t * 0.45) * 0.03);
      f.scale.setScalar(1.6 * sk);
      // hand-over: converge onto the measured start pose of the fall
      const k = smooth(range(protect, 0.7, 1.0));
      if (k > 0) {
        samplePose(0, aspect, this.tmp);
        f.position.lerp(this.tmp.position, k);
        f.quaternion.slerp(this.tmp.quaternion, k);
        f.scale.lerp(this.tmp.scale, k);
      }
    }
    // --- Defy gravity: the fall, entirely from measured keys (no decorative motion:
    // the reference feather is still when scrolling stops)
    if (act('defy')) {
      const f = this.black;
      f.visible = true;
      const aspect = store.vw / store.vh;
      samplePose(defy, aspect, f);
      const sh = sampleShadow(defy, aspect);
      if (sh) {
        // camera-facing flat ellipse on the z=0 plane, sized/placed in screen ratios
        screenToWorld(sh.cx, sh.cy, aspect, this.shadow.position); this.shadow.position.z = -0.02;
        const sw = sh.w * 2 * halfHFor(aspect) * aspect, shh = sh.h * 2 * halfHFor(aspect);
        this.shadow.scale.set(sw / 2, shh / 2, 1);
        this.shadow.material.opacity = sh.alpha;
        // rings: faint ellipses expanding around the shadow once landed
        const land = range(defy, fallData.takeover[0], 1.0);
        this.rings.children.forEach((r, i) => {
          const k = range(land, i * 0.2, 0.7 + i * 0.2);
          r.position.copy(this.shadow.position); r.position.z = -0.03;
          r.scale.set(sw * (0.9 + k * 1.6) / 2, sw * (0.9 + k * 1.6) / 2 * 0.14, 1);
          r.material.opacity = 0.16 * Math.sin(k * Math.PI);
        });
      }
    }
    // --- Why composites / tunnel intro: the feather field builds progressively
    // as the benefit labels recede (not a hard cut), then continues into the
    // tunnel's contour emergence so the two read as one transformation.
    if (act('why') || (act('tunnel') && tunnel < 0.3)) {
      this.darkSprites.visible = true;
      this.darkSprites.userData.update(t, -(why + tunnel) * 3);
      const build = act('why') ? smooth(range(why, 0.35, 1.0)) : 1;
      this.darkSprites.material.opacity = 0.15 + 0.85 * build;
    }
    // --- History: white feather rises with the light into the measured centre
    // pose, then holds there for the rest of the timeline while slowly
    // rotating/drifting in place (measured: it never spins fast, but it is
    // not a static prop either — subtle continuous motion, not decorative flair).
    if (act('history')) {
      const f = this.white;
      const HF = HS.feather;
      const rise = smooth(range(hist, HF.riseStart, HF.riseEnd));
      f.visible = rise > 0.001;
      const aspect = store.vw / store.vh, hh = halfHFor();
      const worldLen = HF.heightH * 2 * hh * 1.55;          // enlarged: the reference feather spans most of the field's visible height
      const cy = (0.5 - HF.centerY) * 2 * hh;
      const settle = smooth(range(hist, HF.riseEnd, 1.0));  // 0 during the rise, 1 for the rest of the timeline
      const driftX = Math.sin(t * 0.11) * 0.05 * settle;
      const driftZ = Math.sin(t * 0.07 + 1.4) * 0.12 * settle;
      f.position.set((HF.centerX - 0.5) * 2 * hh * aspect + driftX, lerp(cy - 2 * hh - worldLen, cy, rise), driftZ);
      f.rotation.set(Math.sin(t * 0.08) * 0.05 * settle, t * 0.025 * settle, Math.sin(t * 0.065 + 0.6) * 0.04 * settle);
      f.scale.setScalar(worldLen / 2);
    }
  }
}