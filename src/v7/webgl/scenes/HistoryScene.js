import * as THREE from 'three';
import { sectionProgress, store, range } from '../../core/store';
import { HISTORY_ITEMS } from '../../content/history';
import { loadStatue } from '../objects/Statues';

// Composites-style history helix: image planes wound on a vertical helix that
// turns and rises with scroll. The plane nearest the reading point is fully
// opaque; the rest fade and shrink with distance, and the scene fog swallows
// the far side of the helix. Scroll speed bends the planes slightly and the
// whole group leans with the pointer.
export const HISTORY_BG = '#1a1310';

const RADIUS = 4, PER_TURN = 12, STEP_Y = 0.25, CENTRE_Z = -4;
const ANGLE = (Math.PI * 2) / PER_TURN;
const READ = new THREE.Vector2(0.04, 1.24);   // where the "current" plane sits

export class HistoryScene {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.geometry = new THREE.PlaneGeometry(1.75, 1.2, 16, 16);
    this.base = this.geometry.attributes.position.array.slice();
    this.bend = 0;
    this.planes = [];
    this.current = -1;
    const loader = new THREE.TextureLoader();
    HISTORY_ITEMS.forEach((item, i) => {
      const tex = loader.load(item.image);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 1, fog: true });
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.userData.index = i;
      this.planes.push(mesh);
      this.group.add(mesh);
    });
    this.mouse = new THREE.Vector2();
    // At the heart of the helix stands Venus, in the same silvered marble as
    // the sculpture room, turning slowly as the years go by.
    this.pivot = new THREE.Group();
    this.pivot.position.set(0, -1.55, -4);
    this.group.add(this.pivot);
    this.ready = loadStatue('venus', { height: 4.6, material: { color: new THREE.Color(0.86, 0.85, 0.84), metalness: 0.35, roughness: 0.7, fog: false } })
      .then((venus) => { this.pivot.add(venus); })
      .catch((e) => console.warn('Venus could not load', e));
  }

  // t is the helix phase: plane n reaches the reading point when t = 3.84 - n.
  layout(t) {
    let best = -1, bestOpacity = 0;
    for (let n = 0; n < this.planes.length; n++) {
      const m = this.planes[n], a = ANGLE * (n + t);
      m.position.set(Math.cos(a) * RADIUS, STEP_Y * n + t / 4 + 0.28, Math.sin(a) * RADIUS + CENTRE_Z);
      m.rotation.y = -a + Math.PI / 2;
      const dx = READ.x - m.position.x, dy = READ.y - m.position.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const opacity = 1.05 - Math.min(1, d / 5);
      m.material.opacity = opacity;
      const s = 1 - Math.min(1, d / 2.5) / 5;
      m.scale.setScalar(s);
      if (opacity > bestOpacity && m.position.z > CENTRE_Z) { bestOpacity = opacity; best = n; }
    }
    return best;
  }

  update(camera, time) {
    const active = store.activeStage === 'history';
    this.group.visible = active;
    if (!active) return;
    const p = sectionProgress('history');
    // helix turns through every plane between 0.18 and 0.95 of the section
    const N = this.planes.length;
    const t = (3.84 - (N - 1) - 2.5) + (N - 1 + 5) * range(p, 0.14, 0.97);
    const idx = this.layout(t);
    this.pivot.rotation.y = 0.35 - p * 1.6 + Math.sin(time * 0.3) * 0.03;
    if (idx !== this.current) { this.current = idx; store.ch.historyIndex = idx; }

    // scroll speed bends the planes (shared geometry)
    const want = Math.max(-1, Math.min(1, (store.velocity || 0) / 30));
    this.bend += (want - this.bend) * 0.12;
    if (Math.abs(this.bend) > 0.001 || this._bent) {
      const pos = this.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const x = this.base[i], y = this.base[i + 1];
        pos[i + 2] = this.base[i + 2] - Math.sin(Math.sqrt(x * x + y * y) * 0.9) * this.bend * 0.35;
      }
      this.geometry.attributes.position.needsUpdate = true;
      this._bent = Math.abs(this.bend) > 0.001;
    }

    // camera and group lean gently with the pointer
    this.mouse.lerp(store.pointer || this.mouse, 0.06);
    camera.fov = 35; camera.updateProjectionMatrix();
    camera.position.set(0, 1, 4 / Math.max(0.6, store.aspectK || 1) ** 0.5);
    camera.rotation.set(this.mouse.y * 0.025, -this.mouse.x * 0.025, 0);
    this.group.rotation.set(-this.mouse.y * 0.02, this.mouse.x * 0.02, 0);
  }
}
