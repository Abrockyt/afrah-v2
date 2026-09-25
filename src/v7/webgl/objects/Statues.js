import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Scanned sculptures, dressed like the Silver Pinewood Zeus: the same silvered
// marble (rough 0.75, metal 0.5, 80% grey) over each scan's own detail maps.
//   venus  — Venus de Milo, CC0 (Objaverse / Sketchfab "Statues Texturing Challenge", SMK)
//   youth  — Marble Bust 01, CC0 (Poly Haven): a young man, short curls
export const STATUES = {
  venus: '/media/statues/venus.glb',
  youth: '/media/statues/bust/marble_bust_01.gltf',
};

// Loads a statue, stands it on the origin (feet at y = 0, centred on x/z) and
// scales it to `height`. Returns a Group of plain meshes ready for shadows.
export function loadStatue(name, { height = 1, material = {} } = {}) {
  return new GLTFLoader().loadAsync(STATUES[name]).then(({ scene }) => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    const k = height / size.y;
    const group = new THREE.Group();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const src = o.material;
      const m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.8, 0.8, 0.8), roughness: 0.75, metalness: 0.5,
        map: src.map || null, normalMap: src.normalMap || null, aoMap: src.aoMap || null, roughnessMap: null,
        side: THREE.FrontSide, ...material,
      });
      if (m.normalMap) m.normalScale.set(1, 1);
      const mesh = new THREE.Mesh(o.geometry, m);
      mesh.applyMatrix4(o.matrixWorld);
      mesh.position.sub(centre); mesh.position.y += size.y / 2;
      mesh.position.multiplyScalar(k); mesh.scale.multiplyScalar(k);
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    });
    group.userData.height = height;
    return group;
  });
}
