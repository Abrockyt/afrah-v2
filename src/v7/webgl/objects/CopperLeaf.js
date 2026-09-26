import * as THREE from 'three';
import { makeCopper } from './EraMaterials';

// ERA's bronze leaf, freed from the facade: a lanceolate copper leaf with a
// cupped blade, a slight bow along its length, a short stalk, and the same
// veined copper shader the towers wear. Geometry spans 2 units along +Y
// (stalk at -1, tip at +1) so it drops straight into the measured fall poses.

const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); WHITE.needsUpdate = true;

export function leafGeometry(segW = 24, segL = 110) {
  const g = new THREE.PlaneGeometry(0.5, 2, segW, segL);
  const pos = g.attributes.position, n = pos.count;
  const fin = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const v = (y + 1) / 2;                                    // 0 stalk → 1 tip
    const u = x / 0.25;                                       // -1..1 across
    const w = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.82)), 0.78) * (1 - 0.1 * v);
    const px = 0.25 * u * Math.max(w, 0.012);
    const cup = -0.07 * u * u * w;                            // blade cupped towards the viewer's back
    const bow = 0.14 * Math.sin(Math.PI * v) - 0.05 * v;      // gentle bow along the length
    const twist = 0.12 * (v - 0.5) * u * w;                   // a hint of twist
    pos.setXYZ(i, px, y, cup + bow + twist);
    // leaf coordinates in "facade metres" for the vein shader (a 12 m leaf)
    fin[i * 4] = u; fin[i * 4 + 1] = v * 12; fin[i * 4 + 2] = 1.3; fin[i * 4 + 3] = 12;
  }
  g.setAttribute('aFin', new THREE.BufferAttribute(fin, 4));
  g.computeVertexNormals();
  return g;
}

export function createLeaf({ envMap, glow = 0.28 } = {}) {
  const eve = { value: glow };
  const mat = makeCopper({ envMap, toModel: new THREE.Matrix4(), eve, bakeMap: WHITE });
  mat.side = THREE.DoubleSide;
  const group = new THREE.Group();
  const blade = new THREE.Mesh(leafGeometry(), mat);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.34, 8), new THREE.MeshStandardMaterial({ color: '#6b3a1e', metalness: 0.6, roughness: 0.45, envMap }));
  stalk.position.set(0, -1.12, 0.0);
  blade.castShadow = stalk.castShadow = true;
  group.add(blade, stalk);
  group.userData = { eve, material: mat };
  return group;
}

// Many small leaves as one instanced mesh (far field and the transition storm).
export function createLeafSwarm(count, { envMap, color = null, glow = 0.15 } = {}) {
  const geo = leafGeometry(8, 28);
  let mat;
  if (color) mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide, envMap });
  else { mat = makeCopper({ envMap, toModel: new THREE.Matrix4(), eve: { value: glow }, bakeMap: WHITE }); mat.side = THREE.DoubleSide; }
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  return mesh;
}
