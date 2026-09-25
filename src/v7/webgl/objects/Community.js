import * as THREE from 'three';
import { buildTower, hideSourceBuilding } from './StackFloors';

// A gated community of towers, every one built from the reference building
// (same geometry, same materials). Four towers of two heights stand round a
// central courtyard garden inside a perimeter wall with a gatehouse at the
// front. The palette stays with the building's own dark metal.

const FOOTPRINT_CENTRE = new THREE.Vector2(-1.18, -1.8);   // building centre in model space (x, z)

export const TOWERS_DESKTOP = [
  { id: 'one', name: 'Tower One', at: [0, 0], rot: 0, bands: 8 },
  { id: 'two', name: 'Tower Two', at: [-17, 13], rot: -Math.PI / 2, bands: 6 },
  { id: 'three', name: 'Tower Three', at: [17, 13], rot: Math.PI / 2, bands: 6 },
  { id: 'four', name: 'Tower Four', at: [0, 27], rot: Math.PI, bands: 8 },
];
export const TOWERS_MOBILE = [
  { id: 'one', name: 'Tower One', at: [0, 0], rot: 0, bands: 5 },
  { id: 'two', name: 'Tower Two', at: [-17, 13], rot: -Math.PI / 2, bands: 3 },
  { id: 'three', name: 'Tower Three', at: [17, 13], rot: Math.PI / 2, bands: 3 },
];
export const WALL = { minX: -28, maxX: 28, minZ: -15, maxZ: 40, gate: 3.2 };

export function createCommunity(model, mobile = false) {
  const layout = mobile ? TOWERS_MOBILE : TOWERS_DESKTOP;
  const group = new THREE.Group();
  group.name = 'Community';
  hideSourceBuilding(model);
  const cache = new Map();
  const templates = new Map();

  const towers = layout.map((t) => {
    if (!templates.has(t.bands)) templates.set(t.bands, buildTower(model, t.bands, cache));
    const tpl = templates.get(t.bands);
    const tower = tpl.parent ? tpl.clone() : tpl;
    // Place the footprint centre on the layout point, rotated about it
    const c = new THREE.Vector3(FOOTPRINT_CENTRE.x, 0, FOOTPRINT_CENTRE.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), t.rot);
    tower.rotation.y = t.rot;
    tower.position.set(t.at[0] - c.x, 0, t.at[1] - c.z);
    tower.name = t.name;
    group.add(tower);
    return { ...t, height: tower.userData.height, centre: new THREE.Vector3(t.at[0], 0, t.at[1]) };
  });

  // ── Ground, courtyard garden, paths ───────────────────────────────────
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: '#0c141e', roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.005, 12); group.add(ground);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(WALL.maxX - WALL.minX, WALL.maxZ - WALL.minZ), new THREE.MeshStandardMaterial({ color: '#141c26', roughness: 0.9 }));
  inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.0, (WALL.minZ + WALL.maxZ) / 2); group.add(inner);
  const lawnMat = new THREE.MeshStandardMaterial({ color: '#16241c', roughness: 1 });
  const pathMat = new THREE.MeshStandardMaterial({ color: '#232c37', roughness: 0.8 });
  const flat = (w, d, x, z, m, y = 0.01) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); group.add(mesh); return mesh; };
  [[-6, 9], [6, 9], [-6, 17], [6, 17]].forEach(([x, z]) => flat(9, 6, x, z, lawnMat, 0.012));
  flat(2.4, 26, 0, 13, pathMat, 0.014);          // spine from the gate to Tower Four
  flat(26, 2.4, 0, 13, pathMat, 0.014);          // cross path between Tower Two and Three
  flat(3, 9, 0, -10, pathMat, 0.014);            // entrance drive
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshStandardMaterial({ color: '#08111a', roughness: 0.05, metalness: 0.9 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.03, 13); group.add(water);
  const rim = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.45, 48), new THREE.MeshStandardMaterial({ color: '#2a2f36', roughness: 0.6, metalness: 0.3 }));
  rim.rotation.x = -Math.PI / 2; rim.position.set(0, 0.035, 13); group.add(rim);

  // ── Perimeter wall with the gate and gatehouse ─────────────────────────
  const wallMat = new THREE.MeshStandardMaterial({ color: '#1a1d23', roughness: 0.55, metalness: 0.45 });
  const wall = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.55, 0.22), wallMat);
    m.position.set((x1 + x2) / 2, 0.275, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); group.add(m);
  };
  const { minX, maxX, minZ, maxZ, gate } = WALL;
  wall(minX, minZ, -gate, minZ); wall(gate, minZ, maxX, minZ);
  wall(maxX, minZ, maxX, maxZ); wall(maxX, maxZ, minX, maxZ); wall(minX, maxZ, minX, minZ);
  // wall piers every few metres
  for (let x = minX; x <= maxX; x += 4) if (Math.abs(x) > gate) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.7, 0.34), wallMat); p.position.set(x, 0.35, minZ); group.add(p); }
  // gate portal
  const pillar = new THREE.BoxGeometry(0.6, 1.8, 0.6);
  [-gate, gate].forEach((x) => { const m = new THREE.Mesh(pillar, wallMat); m.position.set(x, 0.9, minZ); group.add(m); });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(gate * 2 + 0.6, 0.22, 0.7), wallMat); beam.position.set(0, 1.85, minZ); group.add(beam);
  // gate leaves (vertical bars)
  const barMat = new THREE.MeshStandardMaterial({ color: '#2c2f35', roughness: 0.35, metalness: 0.85 });
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 1.3, 0.04), barMat, 44);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 44; i++) { const x = -gate + 0.3 + i * ((gate * 2 - 0.6) / 43); m4.makeTranslation(x, 0.65, minZ); bars.setMatrixAt(i, m4); }
  group.add(bars);
  // gatehouse
  const house = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), wallMat); house.position.set(gate + 2.6, 0.6, minZ + 1.4); group.add(house);
  const houseRoof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.1, 2.3), barMat); houseRoof.position.set(gate + 2.6, 1.25, minZ + 1.4); group.add(houseRoof);

  // ── A few slim trees along the paths ───────────────────────────────────
  const crownGeo = new THREE.SphereGeometry(0.34, 12, 9); crownGeo.scale(1, 3, 1); crownGeo.translate(0, 1.25, 0);
  const treeMat = new THREE.MeshStandardMaterial({ color: '#1c3024', roughness: 0.95 });
  const spots = [];
  for (let z = -8; z <= 34; z += 3.4) { spots.push([-2.2, z]); spots.push([2.2, z]); }
  for (let x = -24; x <= 24; x += 4) { spots.push([x, WALL.maxZ - 1.2]); spots.push([x, WALL.minZ + 1.2]); }
  const clear = spots.filter(([x, z]) => layout.every((t) => Math.abs(x - t.at[0]) > 7 || Math.abs(z - t.at[1]) > 7));
  const trees = new THREE.InstancedMesh(crownGeo, treeMat, clear.length);
  clear.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); trees.setMatrixAt(i, m4); });
  group.add(trees);

  return { group, towers };
}
