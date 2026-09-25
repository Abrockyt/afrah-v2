import * as THREE from 'three';

// A small architectural study made for Afrah: stone ribs intersected by a
// single sheet of glass and a bronze datum. No reference-site model is used.
export function createAfrahObject() {
  const group = new THREE.Group();
  const stone = new THREE.MeshPhysicalMaterial({ color: 0xaea49a, roughness: .9, metalness: 0, clearcoat: .02 });
  const cut = new THREE.MeshStandardMaterial({ color: 0x918a80, roughness: .93 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x98735b, metalness: .82, roughness: .31 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8ddd7, metalness: 0, roughness: .06, transmission: .78, thickness: .18, ior: 1.48, envMapIntensity: 1.8, side: THREE.DoubleSide });
  new THREE.TextureLoader().load('/afrah/textures/stone-normal.jpg', (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    stone.normalMap = texture;
    stone.normalScale.set(.25, .25);
    stone.needsUpdate = true;
  });
  const radius = 2.75;
  const makeArc = (start, end, depth, z) => {
    const outer = radius + .52, inner = radius - .52;
    const shape = new THREE.Shape();
    shape.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
    for (let i = 1; i <= 40; i++) { const a = start + (end - start) * i / 40; shape.lineTo(Math.cos(a) * outer, Math.sin(a) * outer); }
    for (let i = 40; i >= 0; i--) { const a = start + (end - start) * i / 40; shape.lineTo(Math.cos(a) * inner, Math.sin(a) * inner); }
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 3, curveSegments: 24 }), [stone, cut]);
    mesh.position.z = z; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  };
  makeArc(-.18, 1.32, 1.05, -.35);
  makeArc(1.45, 3.08, 1.3, .18);
  makeArc(3.21, 4.62, .92, -.5);
  makeArc(4.75, 6.13, 1.1, .08);
  const glazing = new THREE.Mesh(new THREE.BoxGeometry(.86, 6.6, .15), glass);
  glazing.position.set(.18, 0, .3); glazing.rotation.z = -.17; glazing.rotation.y = .15; group.add(glazing);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(.075, 6.9, .09), bronze);
  seam.position.set(.72, .03, .43); seam.rotation.z = -.17; group.add(seam);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, .13, 96), cut);
  foot.rotation.x = 0; foot.position.set(0, -3.37, -.1); group.add(foot);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.25, .085, 96), bronze);
  base.position.set(0, -3.48, -.1); group.add(base);
  group.userData.materials = { stone, glass, bronze };
  return group;
}
