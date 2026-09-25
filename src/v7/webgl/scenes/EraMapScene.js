import * as THREE from 'three';
import { sectionProgress, store, smooth, range } from '../../core/store';

// "At the centre of everything": the same district in morning light, seen
// first from straight above like a map, then tilting down into a slow orbit.
// The places around AFRAH are real spots in the district; each one's screen
// position is published to the section as CSS variables (--x, --y, --on) so
// the DOM pins and their routes sit on the 3D ground.

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const MAP_PLACES = [
  { id: 'home', p: V(-0.16, 5.5, -0.82) },
  { id: 'park', p: V(-0.9, 0.2, 5.2) },
  { id: 'river', p: V(7.3, 0.1, 4.0) },
  { id: 'arena', p: V(15.9, 0.6, 8.2) },
  { id: 'metro', p: V(10.5, 0.2, -5.9) },
  { id: 'old', p: V(-6, 0.4, -15) },
];

export class EraMapScene {
  constructor(world) {
    this.world = world;
    this.pos = V(0, 0, 0); this.look = V(0, 0, 0); this.v = V(0, 0, 0);
    this.el = null; this.pins = null; this.sm = 0; this.on = false;
  }

  update(camera, time) {
    const on = store.activeStage === 'place';
    if (!on) { this.on = false; return false; }
    const p0 = sectionProgress('place');
    if (!this.on) { this.sm = p0; this.on = true; } else this.sm += (p0 - this.sm) * (window.__snap ? 1 : 0.08);
    const p = this.sm;
    if (this.world.mood !== 'morning') this.world.setMood('morning');
    this.world.cloud.on = 0;                     // the camera is above any deck here: a clear morning
    // from a map (straight down) to an oblique orbit round the quarter
    const tilt = smooth(range(p, 0.08, 0.6));
    const az = 0.35 - p * 0.9 + Math.sin(time * 0.05) * 0.02;
    const el = (88 - tilt * 50) * Math.PI / 180;
    const dist = 42 - tilt * 12;
    const k = store.aspectK || 1;
    this.look.set(-6.5 + tilt * 1.5, 0, 1.5 - tilt);
    this.pos.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(dist / Math.pow(k, 0.6)).add(this.look);
    const ptr = store.pointer;
    this.pos.x += (ptr ? ptr.x : 0) * 0.6; this.pos.z -= (ptr ? ptr.y : 0) * 0.6;
    camera.fov = 36; camera.near = 0.1; camera.far = 1200; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0);
    camera.position.copy(this.pos); camera.lookAt(this.look);
    this.world.fogNear = 40; this.world.fogFar = 150;

    camera.updateMatrixWorld();
    this.el = this.el || document.querySelector('.era-map');
    if (this.el) {
      this.pins = this.pins || [...this.el.querySelectorAll('[data-pin]')];
      this.routes = this.routes || [...this.el.querySelectorAll('[data-route]')];
      const at = {};
      this.pins.forEach((pin) => {
        const place = MAP_PLACES.find((x) => x.id === pin.dataset.pin);
        if (!place) return;
        this.v.copy(place.p).project(camera);
        const vis = this.v.z < 1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1;
        pin.style.setProperty('--x', `${((this.v.x + 1) / 2 * 100).toFixed(2)}%`);
        pin.style.setProperty('--y', `${((1 - this.v.y) / 2 * 100).toFixed(2)}%`);
        pin.style.visibility = vis ? '' : 'hidden';
        at[place.id] = [((this.v.x + 1) / 2 * 100).toFixed(2) + '%', ((1 - this.v.y) / 2 * 100).toFixed(2) + '%'];
      });
      const h = at.home;
      if (h) this.routes.forEach((l) => { const t = at[l.dataset.route]; if (!t) return; l.setAttribute('x1', h[0]); l.setAttribute('y1', h[1]); l.setAttribute('x2', t[0]); l.setAttribute('y2', t[1]); });
    }
    return true;
  }
}
