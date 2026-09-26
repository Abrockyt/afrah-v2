import * as THREE from 'three';
import { sectionProgress, store, smooth, range } from '../../core/store';

// Chapter two explains the building the hero flew through. The camera picks
// up where the hero left it (above the pool deck), comes down to the street
// for the arrival, then the tower chapter visits each part of the complex in
// turn while the evening comes on: the whole quarter, the bronze crown, the
// glass, the pool deck in the park, the garden, and the second phase.
// Each shot carries an anchor; its screen position is published as CSS
// variables so the DOM callout (dot + leader line) sits on the real thing.

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = Math.PI / 180;
// Shots are framed around a target: distance, azimuth (from +z) and elevation.
// Between shots the camera arcs up and over (never through the towers).
const CROWN = V(-0.16, 5.25, -0.82);
export const ARRIVAL = [
  { p: 0, raw: { pos: V(3.4, 3.4, 3.6), look: V(0.6, 0.4, 1.2) } },
  { p: 0.5, target: V(0.3, 1.2, 0.8), dist: 6.2, az: 28 * D, el: 22 * D },
  { p: 1, target: V(0, 2.6, 0), dist: 6.6, az: 8 * D, el: -3 * D },
];
export const TOWER = [
  { p: 0.0, target: V(0, 2.6, 0), dist: 6.6, az: 8 * D, el: -3 * D, anchor: null },
  { p: 0.08, target: V(0.4, 1.4, -0.3), dist: 15, az: 42 * D, el: 32 * D, anchor: CROWN },                 // the quarter
  { p: 0.2, target: V(0.4, 1.4, -0.3), dist: 15, az: -24 * D, el: 30 * D, anchor: CROWN },
  { p: 0.3, target: CROWN.clone().setY(5.0), dist: 3.2, az: 32 * D, el: 9 * D, anchor: V(-0.05, 5.3, -0.55) },   // the crown
  { p: 0.44, target: V(-0.16, 3.1, -0.82), dist: 3.1, az: 4 * D, el: 6 * D, anchor: V(-0.12, 3.1, -0.4) },     // the glass
  { p: 0.58, target: V(-1.2, 0.35, 0.62), dist: 2.7, az: -36 * D, el: 22 * D, anchor: V(-1.28, 0.1, 0.72) },    // the pool deck, the Lily behind
  { p: 0.72, target: V(0.5, 0.35, 4.4), dist: 3.2, az: 12 * D, el: 16 * D, anchor: V(0.6, 0.4, 4.6) },          // the garden
  { p: 0.86, target: V(5.9, 2.0, -2.0), dist: 7.5, az: 62 * D, el: 14 * D, anchor: V(5.9, 3.3, -2.0) },         // phase two
  { p: 1.0, target: V(2.5, 1.2, -1.0), dist: 18, az: 50 * D, el: 30 * D, anchor: null },
];

const _o = V(0, 0, 0);
function frame(k, pos, look) {
  if (k.raw) { pos.copy(k.raw.pos); look.copy(k.raw.look); return; }
  look.copy(k.target);
  _o.set(Math.cos(k.el) * Math.sin(k.az), Math.sin(k.el), Math.cos(k.el) * Math.cos(k.az)).multiplyScalar(k.dist);
  pos.copy(k.target).add(_o);
}
const pa = V(0, 0, 0), la = V(0, 0, 0), pb = V(0, 0, 0), lb = V(0, 0, 0);
function along(K, p, pos, look) {
  let i = 0;
  for (let j = 0; j < K.length - 1; j++) if (K[j].p <= p) i = j;
  const a = K[i], b = K[i + 1];
  const t = smooth(range(p, a.p, b.p));
  if (!a.raw && !b.raw) {
    // interpolate the framing itself, so the camera swings round the subject
    const k = { target: la.copy(a.target).lerp(b.target, t), dist: a.dist + (b.dist - a.dist) * t, az: a.az + (b.az - a.az) * t, el: a.el + (b.el - a.el) * t };
    frame(k, pos, look);
  } else {
    frame(a, pa, la); frame(b, pb, lb);
    pos.copy(pa).lerp(pb, t); look.copy(la).lerp(lb, t);
  }
  // arc up and over between two different subjects
  const far = a.target && b.target ? a.target.distanceTo(b.target) : 0;
  pos.y += Math.sin(Math.PI * t) * Math.min(2.2, far * 0.45);
  return { a, b, t };
}

export class EraBuildingScene {
  constructor(world) {
    this.world = world;
    this.pos = V(0, 0, 0); this.look = V(0, 0, 0); this.anchor = V(0, 0, 0); this.ndc = V(0, 0, 0);
    this.sm = 0; this.active = '';
    this.el = null;
  }

  update(camera, time) {
    const mode = store.activeStage;
    const on = mode === 'arrival' || mode === 'building';
    if (!on) { this.active = ''; return false; }
    const p0 = sectionProgress(mode);
    if (this.active !== mode) { this.sm = p0; this.active = mode; } else this.sm += (p0 - this.sm) * (window.__snap ? 1 : 0.08);
    const p = this.sm;
    const { a, b, t } = along(mode === 'arrival' ? ARRIVAL : TOWER, p, this.pos, this.look);
    const k = store.aspectK || 1;
    const ptr = store.pointer;
    this.pos.x += (ptr ? ptr.x : 0) * 0.08 + Math.sin(time * 0.3) * 0.03;
    this.pos.y += (ptr ? ptr.y : 0) * 0.04;
    this.pos.sub(this.look).divideScalar(Math.pow(k, 0.55)).add(this.look);
    camera.fov = 38 + (1 - k) * 10; camera.near = 0.02; camera.far = 1200; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0);
    camera.position.copy(this.pos); camera.lookAt(this.look);

    // golden hour at the arrival, dusk through the tower chapter
    const eve = mode === 'arrival' ? smooth(p) * 0.35 : 0.35 + smooth(range(p, 0, 0.6)) * 0.65;
    this.world.setMood('dusk', eve);
    Object.assign(this.world.cloud, { on: 1, deck: [16, 30, 0.45, 1], low: [2.8, 5, 0, 0], hole: [0, 0, 0], bankD: 0, rays: 0.25 });
    this.world.fogNear = 8; this.world.fogFar = 90 - eve * 30;

    // callout anchor → CSS variables on the tower stage
    if (mode === 'building') {
      const A = a.anchor && b.anchor ? this.anchor.copy(a.anchor).lerp(b.anchor, t) : (b.anchor || a.anchor);
    camera.updateMatrixWorld();
      this.el = this.el || document.querySelector('.stage--tower');
      if (this.el) {
        if (A) {
          this.ndc.copy(A).project(camera);
          this.el.style.setProperty('--ax', `${((this.ndc.x + 1) / 2 * 100).toFixed(2)}%`);
          this.el.style.setProperty('--ay', `${((1 - this.ndc.y) / 2 * 100).toFixed(2)}%`);
          this.el.style.setProperty('--aon', this.ndc.z < 1 ? '1' : '0');
        } else this.el.style.setProperty('--aon', '0');
      }
    }
    return true;
  }
}
