import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildTower } from '../v5/engine/tower.js';
import { createAfrahObject } from './OriginalObject.js';

const clamp = (v) => Math.max(0, Math.min(1, v));
const v3 = (v) => new THREE.Vector3(...v);
const blendCamera = (camera, a, b, t, la, lb) => {
  camera.position.copy(v3(a)).lerp(v3(b), t);
  camera.lookAt(v3(la).lerp(v3(lb), t));
};

function createOpening(scene) {
  const group = new THREE.Group();
  const ribs = [];
  const stone = new THREE.MeshPhysicalMaterial({ color: 0x38332d, roughness: .78, metalness: .04, side: THREE.DoubleSide });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x98735b, roughness: .5, metalness: .5 });
  for (let i = 0; i < 18; i++) {
    const r = 2.1 + i * .16;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-r * 1.1, -3.6, 0), new THREE.Vector3(-r, -.6, 0),
      new THREE.Vector3(-r * .62, r * .7, 0), new THREE.Vector3(0, r, 0),
      new THREE.Vector3(r * .62, r * .7, 0), new THREE.Vector3(r, -.6, 0),
      new THREE.Vector3(r * 1.1, -3.6, 0),
    ], false, 'centripetal');
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, .17, 9, false), i > 0 && i % 6 === 0 ? bronze : stone);
    rail.position.set(Math.sin(i * .32) * .1, -.2, -i * 1.06);
    group.add(rail);
    ribs.push(rail);
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(15, 11), new THREE.MeshBasicMaterial({ color: 0x0b0b0a, side: THREE.DoubleSide }));
  glow.position.z = -20;
  group.add(glow);
  const light = new THREE.PointLight(0xf1dfca, 16, 32, 1.45);
  light.position.set(0, 1, -15);
  group.add(light);
  group.userData.glow = glow;
  group.userData.ribs = ribs;
  group.visible = false;
  scene.add(group);
  return group;
}

function createTunnel(scene) {
  const group = new THREE.Group();
  const stone = new THREE.MeshPhysicalMaterial({ color: 0x24211e, roughness: .93, metalness: .02, side: THREE.DoubleSide });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x584438, roughness: .58, metalness: .34, side: THREE.DoubleSide });
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/afrah/textures/stone-normal.jpg', (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    stone.normalMap = texture;
    stone.normalScale.set(.27, .27);
    stone.needsUpdate = true;
  });
  const outer = new THREE.Shape();
  outer.moveTo(-4.6, -3.05); outer.lineTo(-4.6, -.5);
  outer.bezierCurveTo(-4.6, 3.2, -2.3, 4.3, 0, 4.35);
  outer.bezierCurveTo(2.3, 4.3, 4.6, 3.2, 4.6, -.5);
  outer.lineTo(4.6, -3.05);
  outer.lineTo(3.65, -3.05); outer.lineTo(3.65, -.5);
  outer.bezierCurveTo(3.65, 2.35, 1.8, 3.42, 0, 3.46);
  outer.bezierCurveTo(-1.8, 3.42, -3.65, 2.35, -3.65, -.5);
  outer.lineTo(-3.65, -3.05); outer.closePath();
  const geometry = new THREE.ExtrudeGeometry(outer, { depth: .64, bevelEnabled: true, bevelThickness: .05, bevelSize: .06, bevelSegments: 2, curveSegments: 20 });
  for (let i = 0; i < 24; i++) {
    const rib = new THREE.Mesh(geometry, i % 6 === 0 ? bronze : stone);
    rib.position.set(Math.sin(i * .15) * .28, Math.cos(i * .16) * .08, -i * 2.35);
    rib.rotation.z = Math.sin(i * .18) * .017;
    group.add(rib);
    if (i < 23) for (const x of [-3.95, 3.95]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(.12, .18, 2.35), bronze);
      strut.position.set(x, 1.15, -i * 2.35 - 1.16);
      group.add(strut);
    }
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 61), new THREE.MeshStandardMaterial({ color: 0x11100e, roughness: .94, metalness: 0, envMapIntensity: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -3.02, -25); group.add(floor);
  const aperture = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 8.5), new THREE.MeshBasicMaterial({ color: 0xf1ede5, toneMapped: false }));
  aperture.position.set(.15, .45, -57); group.add(aperture);
  const light = new THREE.PointLight(0xf6e9da, 27, 55, 1.4);
  light.position.set(.1, 1.1, -52); group.add(light);
  const sideLight = new THREE.PointLight(0xb48d73, 12, 20, 1.6);
  sideLight.position.set(-2.8, 2.4, -12); group.add(sideLight);
  group.userData.aperture = aperture;
  group.visible = false; scene.add(group); return group;
}

function createFloorMarker(scene) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x98735b, transparent: true, opacity: .94, toneMapped: false, depthWrite: false });
  const unit = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 4; i++) {
    const edge = new THREE.Mesh(unit, material);
    edge.renderOrder = 12;
    group.add(edge);
  }
  group.visible = false;
  scene.add(group);
  return group;
}

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, .08, 160);
    this.clock = new THREE.Clock();
    this.mode = 'hero'; this.progress = 0; this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.selectedFloor = 7;
    this.hoverFloor = -9;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.opening = createOpening(this.scene);
    this.tunnel = createTunnel(this.scene);
    this.building = new THREE.Group(); this.sculpture = createAfrahObject(); this.hasSculpture = true;
    this.floorMarker = createFloorMarker(this.scene);
    this.floorMarkerY = null;
    this.sculpture.position.set(-2.3, .15, 0);
    this.sculpture.scale.setScalar(.78);
    this.scene.add(this.building, this.sculpture);
    this.lights = [];
    const ambient = new THREE.HemisphereLight(0xf1ede5, 0x25211e, .72);
    this.lights.push([ambient, .72]); this.scene.add(ambient);
    const lights = [[0xffe8d5, 1.8, [-9, 17, -4]], [0xc5c7c3, .85, [13, 6, -16]], [0xe5d5c9, 1.0, [4, 5, 16]]];
    for (const [color, intensity, pos] of lights) {
      const light = new THREE.DirectionalLight(color, intensity); light.position.set(...pos); this.scene.add(light); this.lights.push([light, intensity]);
      if (pos[0] === -9) { light.castShadow = true; light.shadow.mapSize.set(2048, 2048); light.shadow.camera.left = -22; light.shadow.camera.right = 22; light.shadow.camera.top = 22; light.shadow.camera.bottom = -22; light.shadow.bias = -.0003; }
    }
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    pmrem.dispose(); this.scene.environment = this.env;
    this.ready = this.loadBuilding();
    this.resize();
  }
  async loadBuilding() {
    try {
      const hdr = await new HDRLoader().loadAsync('/afrah/env/overcast.hdr');
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const oldEnv = this.env;
      this.env = pmrem.fromEquirectangular(hdr).texture;
      this.scene.environment = this.env;
      pmrem.dispose(); oldEnv.dispose();
      this.hdr = hdr;
      this.loadNightEnvironment();
      const shared = {
        uReveal: { value: 1e4 }, uSel: { value: -9 }, uHov: { value: -9 },
        uGold: { value: new THREE.Color(0x98735b) },
      };
      const tower = await buildTower({ quality: innerWidth < 700 ? 'mobile' : 'high', shared, plaza: false });
      tower.windowMaterial.uniforms.uEnv.value = hdr;
      tower.windowMaterial.uniforms.uEnvInt.value = .55;
      // The study tower includes a large plaza slab. Absorb it into the dark
      // cinematic stage rather than exposing a rectangular site placeholder.
      for (const key of ['granite', 'water']) {
        tower.materials[key].dispose();
        tower.materials[key] = new THREE.MeshBasicMaterial({ color: 0x0b0b0a, toneMapped: false });
        if (tower.meshes[key]) tower.meshes[key].material = tower.materials[key];
      }
      tower.group.rotation.y = Math.PI;
      tower.group.scale.setScalar(.122);
      tower.group.position.set(2, -3.8, -6);
      this.tower = tower;
      this.building.add(tower.group);
      this.hasBuilding = true;
    } catch (error) { console.warn('Building study model could not load', error); this.hasBuilding = false; }
  }
  async loadNightEnvironment() {
    try {
      const hdr = await new HDRLoader().loadAsync('/afrah/env/night.hdr');
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.nightEnv = pmrem.fromEquirectangular(hdr).texture;
      pmrem.dispose();
      this.nightHdr = hdr;
    } catch (error) { console.warn('Night environment could not load', error); }
  }
  resize() {
    const width = window.innerWidth, height = window.innerHeight;
    this.width = width;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  }
  set(mode, progress) { this.mode = mode; this.progress = clamp(progress); }
  pointer(x, y) { this.mouse.set(x, y); }
  pickFloor(clientX, clientY) {
    if (this.mode !== 'selector' || !this.tower?.windows) return null;
    const pointer = new THREE.Vector2(clientX / this.width * 2 - 1, 1 - clientY / this.renderer.domElement.clientHeight * 2);
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.tower.windows, false)[0];
    if (!hit || hit.instanceId == null) return null;
    const level = this.tower.windows.geometry.getAttribute('aLevel').getX(hit.instanceId);
    const available = [3, 7, 11, 16];
    return available.reduce((closest, candidate) => Math.abs(candidate - level) < Math.abs(closest - level) ? candidate : closest, available[0]);
  }
  render() {
    if (this.mode === 'none' && this.lastMode === 'none') return;
    const dt = Math.min(this.clock.getDelta(), .05);
    const t = this.clock.elapsedTime, p = this.progress, mx = this.mouse.x * .12, my = this.mouse.y * .08;
    const lightFactor = this.mode === 'tunnel' ? .045 : this.mode === 'threshold' || this.mode === 'hero' ? .19 : this.mode === 'sculpture' ? .72 : this.mode === 'final' ? .74 : 1;
    for (const [light, value] of this.lights) light.intensity = value * lightFactor;
    this.scene.environment = this.mode === 'final' && this.nightEnv ? this.nightEnv : this.env;
    if (this.tower) this.tower.windowMaterial.uniforms.uEnv.value = this.mode === 'final' && this.nightHdr ? this.nightHdr : this.hdr;
    this.building.visible = ['building', 'selector', 'final'].includes(this.mode);
    this.floorMarker.visible = this.mode === 'selector' && this.hasBuilding;
    if (this.floorMarker.visible) {
      const floor = this.hoverFloor > 0 ? this.hoverFloor : this.selectedFloor;
      const terrace = floor > 14;
      const width = (terrace ? 32 : 38) * .122 + .15;
      const depth = (terrace ? 23 : 28) * .122 + .15;
      const targetY = -3.8 + (9 + (floor - 1) * 3.4 + 1.7) * .122;
      this.floorMarkerY = this.floorMarkerY == null ? targetY : THREE.MathUtils.damp(this.floorMarkerY, targetY, 9, dt);
      this.floorMarker.position.set(2, this.floorMarkerY, -6);
      const [front, back, left, right] = this.floorMarker.children;
      front.position.set(0, 0, -depth / 2); back.position.set(0, 0, depth / 2);
      left.position.set(-width / 2, 0, 0); right.position.set(width / 2, 0, 0);
      front.scale.set(width, .045, .045); back.scale.set(width, .045, .045);
      left.scale.set(.045, .045, depth); right.scale.set(.045, .045, depth);
    }
    this.opening.visible = this.mode === 'hero' || this.mode === 'threshold';
    this.tunnel.visible = this.mode === 'tunnel';
    this.sculpture.visible = this.mode === 'sculpture';
    this.renderer.toneMappingExposure = this.mode === 'final' ? .92 : this.mode === 'threshold' || this.mode === 'hero' ? .72 : this.mode === 'tunnel' ? .78 : this.mode === 'sculpture' ? .74 : .86;
    this.tower?.update({ windows: this.mode === 'final' ? .9 : .32, lantern: this.mode === 'final' ? .78 : .14 }, t);
    if (this.tower) {
      this.tower.windowMaterial.uniforms.uSel.value = this.mode === 'selector' ? this.selectedFloor : -9;
      this.tower.windowMaterial.uniforms.uHov.value = this.mode === 'selector' ? this.hoverFloor : -9;
    }
    if (this.mode === 'hero') {
      for (const rib of this.opening.userData.ribs) rib.scale.x = 1;
      blendCamera(this.camera, [-2.5, .55, 5.7], [0, .4, 4], p, [.8, .25, -7], [0, .3, -3]);
      this.camera.position.x += mx; this.camera.position.y += my;
    } else if (this.mode === 'building') {
      const shots = [{ pos: [19, 11.8, -31], look: [2, 4.1, -6] }, { pos: [14.8, 8.6, -26], look: [2, 4.3, -6] }, { pos: [-15, 12, -28], look: [2, 4.4, -6] }];
      const s = Math.min(1, Math.floor(p * 2));
      blendCamera(this.camera, shots[s].pos, shots[s + 1].pos, p * 2 - s, shots[s].look, shots[s + 1].look);
      this.camera.position.x += mx;
    } else if (this.mode === 'selector') {
      this.camera.position.set(13.5 + mx, 8.8 + my, -28);
      this.camera.lookAt(8, 4.5, -6);
    } else if (this.mode === 'threshold') {
      const spread = THREE.MathUtils.smoothstep(p, .18, .9) * .42;
      for (const rib of this.opening.userData.ribs) rib.scale.x = 1 + spread;
      const z = 4 - p * 15.5;
      this.camera.position.set(mx, .4 - p * .3 + my, z);
      this.camera.lookAt(0, .3, z - 8); this.opening.rotation.y = Math.sin(t * .13) * .018;
      this.opening.userData.glow.material.color.setHex(0x0b0b0a).lerp(this.apertureColor || (this.apertureColor = new THREE.Color(0xf1ede5)), clamp((p - .62) * 2.4));
    } else if (this.mode === 'tunnel') {
      const z = 8.8 - p * 62.3;
      this.camera.position.set(Math.sin(p * 2.5) * .33 + mx, .1 + p * .35 + my, z);
      this.camera.lookAt(Math.sin(p * 2.7) * .2, .35, z - 11);
      const open = clamp((p - .72) / .28);
      this.tunnel.userData.aperture.scale.setScalar(1 + open * open * 10);
    } else if (this.mode === 'sculpture') {
      this.camera.position.set(0, 1.2, this.width < 700 ? 19 : 13.5);
      this.camera.lookAt(0, .1, 0);
      this.sculpture.rotation.y = -.45 + p * .65 + (this.reducedMotion ? 0 : Math.sin(t * .18) * .025);
    } else if (this.mode === 'final') {
      blendCamera(this.camera, [-19, 11.5, -31], [-16, 9, -27], p, [2, 4.4, -6], [2, 4.3, -6]);
    } else { this.camera.position.set(0, 0, 14); this.camera.lookAt(0, 0, 0); }
    this.camera.fov = this.width < 700 ? 52 : (this.mode === 'tunnel' ? 42 : 36);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    this.lastMode = this.mode;
  }
  dispose() { this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.tower?.dispose(); this.hdr?.dispose(); this.nightHdr?.dispose(); this.nightEnv?.dispose(); this.env.dispose(); this.renderer.dispose(); }
}
