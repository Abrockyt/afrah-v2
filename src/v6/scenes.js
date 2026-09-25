import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {pbr, rng} from '../v5/engine/core';

// AFRAH v6 cinematic scenes — original geometry, three.js (MIT) only.
// Each factory: (el, getProgress) → {dispose}. Rendering pauses when the element is off-screen.
const BLACK = new THREE.Color('#0b0b0a'), IVORY = new THREE.Color('#f1ede5'), BRONZE = new THREE.Color('#98735b');

function stage(el, {fov = 35, bg = BLACK, fog = null, exposure = 1} = {}) {
  const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 800 ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = bg.clone();
  if (fog) scene.fog = fog;
  const pm = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const env = pm.fromScene(room, .04); scene.environment = env.texture; room.dispose(); pm.dispose();
  const camera = new THREE.PerspectiveCamera(fov, 1, .05, 800);
  const resize = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  let visible = true; const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, {rootMargin: '50px'}); io.observe(el);
  const mouse = {x: 0, y: 0}, onMove = e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; };
  addEventListener('pointermove', onMove);
  let raf, last = performance.now(), t = 0;
  const run = frame => { const loop = now => { raf = requestAnimationFrame(loop); const dt = Math.min((now - last) / 1000, .05); last = now; if (!visible || document.hidden) return; t += dt; frame(dt, t); renderer.render(scene, camera); }; raf = requestAnimationFrame(loop); };
  const dispose = extra => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', onMove); scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); }); extra?.(); env.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  return {renderer, scene, camera, run, dispose, mouse};
}
const damp = THREE.MathUtils.damp, sm = THREE.MathUtils.smoothstep;

/* ── 00/01 · Hero: a vaulted shell of ribs that separates to let light in; the camera passes through ── */
export function heroScene(el, getP) {
  const S = stage(el, {fov: 34, fog: new THREE.FogExp2(BLACK, .055), exposure: 1.1});
  const {scene, camera} = S;
  const N = 44, ribs = [];
  const mat = new THREE.MeshStandardMaterial({color: '#1c1a17', metalness: .72, roughness: .34, envMapIntensity: .55});
  const edge = new THREE.MeshStandardMaterial({color: BRONZE, metalness: 1, roughness: .28, emissive: BRONZE, emissiveIntensity: 0});
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1), rx = 3.2 + Math.sin(k * Math.PI) * 1.3, ry = 4.2 + Math.sin(k * Math.PI * .9) * 1.6;
    const pts = []; for (let j = 0; j <= 48; j++) { const a = Math.PI * (j / 48); pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry - .6, 0)); }
    const shape = new THREE.Shape(); shape.moveTo(-.03, -.34); shape.lineTo(.03, -.34); shape.lineTo(.03, .34); shape.lineTo(-.03, .34); shape.closePath();
    const path = new THREE.CatmullRomCurve3(pts);
    const rib = new THREE.Group();
    rib.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {steps: 96, bevelEnabled: false, extrudePath: path}), mat));
    const lip = new THREE.Mesh(new THREE.TubeGeometry(path, 96, .012, 4, false), edge); lip.position.z = .34; rib.add(lip);
    rib.position.z = -i * .42; rib.userData = {k, base: -i * .42, seed: Math.sin(i * 12.9898) * .5 + .5};
    scene.add(rib); ribs.push(rib);
  }
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(241,237,229,1)'); gr.addColorStop(.35, 'rgba(241,237,229,.6)'); gr.addColorStop(1, 'rgba(241,237,229,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({map: glowTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending}));
  glow.position.set(0, 2.2, -N * .42 - 3); scene.add(glow);
  const key = new THREE.PointLight(IVORY, 30, 40, 1.6); key.position.set(0, 2.4, -N * .42); scene.add(key);
  const rim = new THREE.DirectionalLight('#d9c3ad', .8); rim.position.set(-4, 6, 4); scene.add(rim);
  let p = 0;
  S.run((dt, t) => {
    p = damp(p, getP(), 3.5, dt);
    const open = sm(p, .15, .85);
    ribs.forEach((r, i) => {
      const {k, base, seed} = r.userData;
      r.position.z = base * (1 + open * 1.6);
      r.position.x = (seed - .5) * open * 2.2;
      r.rotation.z = (k - .5) * open * .9 + Math.sin(t * .15 + i) * .004;
      r.scale.setScalar(1 + open * (.25 + seed * .35));
    });
    edge.emissiveIntensity = .1 + open * .6;
    glow.material.opacity = .25 + open * .75; glow.scale.setScalar(.6 + open * 2.4 + sm(p, .8, 1) * 4);
    key.intensity = 18 + open * 60;
    const z = 2.6 - p * (N * .42 * 1.9 + 4);
    camera.position.set(Math.sin(t * .12) * .08 + S.mouse.x * .25, 1.6 + open * .5 - S.mouse.y * .18, z);
    camera.lookAt(S.mouse.x * .4, 1.9 + open * .2, z - 6);
  });
  return {dispose: () => S.dispose(() => glowTex.dispose())};
}

/* ── 05 · Tunnel: rings of Afrah facade fins, stone floor, a bright aperture at the end ── */
export function tunnelScene(el, getP) {
  const S = stage(el, {fov: 38, fog: new THREE.FogExp2(BLACK, .045), exposure: 1.05});
  const {scene, camera} = S;
  const RINGS = 70, FINS = 34, GAP = 1.15;
  const finMat = new THREE.MeshStandardMaterial({color: '#262320', metalness: .55, roughness: .38, envMapIntensity: .6});
  const bronzeMat = new THREE.MeshStandardMaterial({color: BRONZE, metalness: 1, roughness: .3, envMapIntensity: .9});
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(.09, .9, .55), finMat, RINGS * FINS), lips = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, .04, .56), bronzeMat, RINGS * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  let n = 0, l = 0;
  for (let r = 0; r < RINGS; r++) {
    const z = -r * GAP, breathe = 1 + Math.sin(r * .35) * .12, rx = 3.1 * breathe, ry = 3.6 * breathe;
    for (let f = 0; f < FINS; f++) {
      const a = Math.PI * 1.08 * (f / (FINS - 1)) - .04;
      m.compose(v.set(Math.cos(a) * rx, Math.sin(a) * ry, z), q.setFromEuler(e.set(0, 0, a - Math.PI / 2)), s.set(1, 1 + Math.sin(r * .7 + f) * .12, 1));
      fins.setMatrixAt(n++, m);
    }
    if (r % 3 === 0) for (const side of [-1, 1]) { m.compose(v.set(side * rx * .98, .3, z), q.identity(), s.set(1, 1, 1)); lips.setMatrixAt(l++, m); }
  }
  lips.count = l; scene.add(fins, lips);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, RINGS * GAP + 20), new THREE.MeshStandardMaterial({color: '#171513', roughness: .22, metalness: .1, envMapIntensity: .7}));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -.25, -RINGS * GAP / 2); scene.add(floor);
  pbr('granite').then(t => { if (!t.normalMap) return; t.normalMap = t.normalMap.clone(); t.normalMap.repeat.set(3, 30); t.normalMap.needsUpdate = true; floor.material.normalMap = t.normalMap; floor.material.needsUpdate = true; }).catch(() => {});
  const endZ = -RINGS * GAP - 2;
  const aperture = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({color: IVORY.clone().multiplyScalar(2.2), fog: false}));
  aperture.position.set(0, 1.4, endZ); aperture.scale.set(1, 1.25, 1); scene.add(aperture);
  const endLight = new THREE.PointLight(IVORY, 80, 60, 1.4); endLight.position.set(0, 1.6, endZ + 1); scene.add(endLight);
  const warm = new THREE.PointLight('#c89a74', 6, 14, 2); scene.add(warm);
  let p = 0;
  S.run((dt, t) => {
    p = damp(p, getP(), 3, dt);
    const z = 3 - p * (RINGS * GAP - 2);
    camera.position.set(S.mouse.x * .3 + Math.sin(t * .2) * .05, .9 - S.mouse.y * .15, z);
    camera.lookAt(S.mouse.x * .6, 1.05, z - 8);
    warm.position.set(0, 2.4, z - 3);
    const near = sm(p, .72, 1);
    aperture.scale.set(1 + near * 5, 1.25 + near * 6, 1);
    endLight.intensity = 60 + near * 400;
    scene.fog.density = .045 - near * .03;
  });
  return {dispose: () => S.dispose()};
}

/* ── 07 · Object: honed stone cut by a glass plane and a bronze blade ── */
export function objectScene(el, getP) {
  const S = stage(el, {fov: 28, exposure: 1.05});
  const {scene, camera, renderer} = S;
  renderer.shadowMap.enabled = true;
  const group = new THREE.Group(); scene.add(group);
  const stone = new THREE.MeshStandardMaterial({color: '#e9e2d5', roughness: .9, envMapIntensity: .8});
  pbr('stone').then(t => { Object.assign(stone, {map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap}); stone.needsUpdate = true; }).catch(() => {});
  const a = new THREE.Mesh(new RoundedBoxGeometry(1.4, 2.6, 1.1, 4, .04), stone); a.position.set(-.34, 0, 0); a.castShadow = true;
  const b = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.9, 1.1, 4, .04), stone); b.position.set(.86, -.35, .05); b.rotation.y = .06; b.castShadow = true;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(.05, 2.4, 1.5), new THREE.MeshPhysicalMaterial({color: '#f4f1ea', transmission: 1, thickness: .05, roughness: .03, ior: 1.52, envMapIntensity: 1.3}));
  glass.position.set(.34, .05, 0);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(2.8, .03, 1.3), new THREE.MeshStandardMaterial({color: BRONZE, metalness: 1, roughness: .26}));
  blade.position.set(.2, .55, 0); blade.rotation.z = -.08; blade.castShadow = true;
  group.add(a, b, glass, blade);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({opacity: .45})); ground.rotation.x = -Math.PI / 2; ground.position.y = -1.32; ground.receiveShadow = true; scene.add(ground);
  const key = new THREE.SpotLight('#fff1dc', 90, 20, .5, .6, 1.2); key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key);
  const rim = new THREE.DirectionalLight('#c8a88c', 1.6); rim.position.set(-4, 2, -3); scene.add(rim);
  let p = 0;
  S.run((dt, t) => {
    p = damp(p, getP(), 3, dt);
    group.rotation.y = -.7 + p * 1.6 + t * .03;
    group.position.y = Math.sin(t * .5) * .03;
    camera.position.set(S.mouse.x * .2, .5 - S.mouse.y * .12, 7.2 - p * 1.1);
    camera.lookAt(0, .1, 0);
  });
  return {dispose: () => S.dispose()};
}

/* ── 08 · Rolling gallery: moments floating at different depths; the scroll travels through them ── */
export function galleryScene(el, getP, items, onIndex) {
  const S = stage(el, {fov: 40, bg: IVORY, fog: new THREE.Fog(IVORY, 9, 26), exposure: 1});
  const {scene, camera} = S;
  S.renderer.toneMapping = THREE.NoToneMapping;
  const loader = new THREE.TextureLoader(), R = rng(31);
  const planes = [];
  const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(11,11,10,.28)'); g.addColorStop(1, 'rgba(11,11,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const load = src => { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  items.forEach((it, i) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({transparent: true}));
    mesh.material.map = loader.load(it.src, t => { mesh.scale.set(t.image.width / t.image.height * 2.3, 2.3, 1); });
    mesh.material.map.colorSpace = THREE.SRGBColorSpace; mesh.scale.set(3.4, 2.3, 1);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: shadowTex, transparent: true, depthWrite: false}));
    scene.add(mesh, sh); planes.push({mesh, sh, main: true, i});
    for (let k = 0; k < 3; k++) {
      const m2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshBasicMaterial({map: load(items[(i + k + 1) % items.length].src), transparent: true}));
      m2.userData = {side: k % 2 ? 1 : -1, off: [2.4 + R() * 1.8, (R() - .5) * 2.6, -1.5 - R() * 4], rot: (R() - .5) * .6, s: .55 + R() * .5};
      scene.add(m2); planes.push({mesh: m2, i});
    }
  });
  let p = 0, lastIdx = -1;
  S.run((dt, t) => {
    p = damp(p, getP(), 2.6, dt);
    const f = p * (items.length - 1), idx = Math.round(f);
    if (idx !== lastIdx) { lastIdx = idx; onIndex?.(idx); }
    planes.forEach(pl => {
      const d = pl.i - f;
      if (pl.main) {
        const x = d * 3.8, z = -Math.abs(d) * 3.4, y = Math.sin(d * 1.3) * .35;
        pl.mesh.position.set(x, y + .25, z); pl.mesh.rotation.set(0, -d * .42, d * .02);
        pl.mesh.material.opacity = 1 - sm(Math.abs(d), 1.4, 2.6);
        pl.sh.position.set(x, y - 1.2, z - .2); pl.sh.scale.set(pl.mesh.scale.x * 1.1, .6, 1); pl.sh.rotation.x = -Math.PI / 2.2; pl.sh.material.opacity = pl.mesh.material.opacity * .8;
      } else {
        const u = pl.mesh.userData;
        pl.mesh.position.set(d * 3.8 + u.side * u.off[0], u.off[1] + Math.sin(t * .2 + pl.i) * .05, -Math.abs(d) * 3.4 + u.off[2] + d * .8);
        pl.mesh.rotation.set(0, -u.side * .35 + u.rot - d * .2, 0); pl.mesh.scale.setScalar(u.s);
        pl.mesh.material.opacity = .8 * (1 - sm(Math.abs(d), 1.2, 2.4));
      }
    });
    camera.position.set(S.mouse.x * .35, .25 - S.mouse.y * .2, 5.4);
    camera.lookAt(0, .15, -2);
  });
  return {dispose: () => S.dispose(() => shadowTex.dispose())};
}
