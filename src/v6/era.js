import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {loadGLB, loadTrees, makeTrees, environment, disposeTree, TOWERS_CENTER, TALL_TOWER} from '../v4/three/era';
import {loadEraDistrict} from '../v7/webgl/objects/EraDistrict';

// ERA tower + district (study copies from research/era-3d-map, see reuse-assets/manifest.json),
// re-skinned in the AFRAH night palette: black ground, ivory stone, bronze fins, rooms that glow.
export const LEVELS = 26;
const levelH = (TALL_TOWER.top - TALL_TOWER.base) / LEVELS;
const inTall = p => Math.abs(p.x - TALL_TOWER.x) < 28 && Math.abs(p.z - TALL_TOWER.z) < 25;
const band = f => f ? [TALL_TOWER.base + (f - 1) * levelH, TALL_TOWER.base + f * levelH] : [-1, -1];

function kind(name) {
  if (/ZK/.test(name)) return 'towerMetal';
  if (/Bronze/.test(name)) return 'towerChrome';
  if (/Bld_Dark/.test(name)) return 'towerDark';
  if (/roof/.test(name)) return 'roof';
  if (/window/.test(name)) return 'glass';
  if (/water/i.test(name)) return 'water';
  if (/grass/i.test(name)) return 'grass';
  if (/asphalt|crosswalk/i.test(name)) return 'road';
  if (/floor|Offroad|fadeer|ramp/i.test(name)) return 'ground';
  if (/Poi|poi|plaza/.test(name)) return 'poi';
  return 'building';
}
const PALETTE = {
  building: ['#1d1c1a', .92, 0], ground: ['#0e0e0d', 1, 0], road: ['#171614', .95, 0], grass: ['#121310', 1, 0], water: ['#0b0c0d', .16, .6],
  poi: ['#221f1b', .8, 0], towerMetal: ['#cfcaca', .5, .2], towerChrome: ['#3a3938', .3, .85], towerDark: ['#1a1918', .42, .4], roof: ['#5e4c3f', .6, .4], glass: ['#0e1114', .07, .65],
};
const FLAT = new Set(['ground', 'road', 'grass', 'water']);
// The district reads as a drawing at night: lifted blocks, pale road lines, bronze landmark.
const MAP_PALETTE = {...PALETTE, building: ['#3a3733', .85, 0], ground: ['#171614', 1, 0], road: ['#3b3731', .9, 0], grass: ['#1f231b', 1, 0], water: ['#0f1418', .12, .7], poi: ['#4a4038', .8, 0]};

function nightSkin(root, {uniforms, glow = 1, map = false} = {}) {
  const mats = {}, pal = map ? MAP_PALETTE : PALETTE;
  const make = k => {
    if (mats[k]) return mats[k];
    const [color, roughness, metalness] = pal[k], glass = k === 'glass', banded = uniforms && (k.startsWith('tower') || glass);
    const m = new THREE.MeshStandardMaterial({color, roughness, metalness, envMapIntensity: FLAT.has(k) || k === 'building' ? .3 : 1.2});
    if (glass) { m.emissive = new THREE.Color('#ffbd82'); m.emissiveIntensity = glow; }
    if (glass || banded) m.onBeforeCompile = sh => {
      if (banded) Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      let f = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;' + (banded ? '\nuniform vec2 uSel; uniform vec2 uHov; uniform vec2 uC;' : ''));
      // Room-by-room occupancy: most bays dark, some dim, a few warm — never a flat emissive shell.
      if (glass) f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fl = floor(vW.y / 10.2), bay = floor((vW.x + vW.z * .47) / 7.5);
        float rr = fract(sin(dot(vec2(fl, bay), vec2(12.9898, 78.233))) * 43758.5453);
        totalEmissiveRadiance *= rr > .64 ? 1.0 : rr > .46 ? .22 : .012;`);
      if (banded) f = f.replace('#include <dithering_fragment>', `#include <dithering_fragment>
        bool tall = abs(vW.x - uC.x) < 28.0 && abs(vW.z - uC.y) < 25.0;
        float s = tall && vW.y > uSel.x && vW.y < uSel.y ? 1.0 : 0.0, h = tall && vW.y > uHov.x && vW.y < uHov.y ? 1.0 : 0.0;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(.94, .5, .1), max(s * .8, h * .35));`);
      sh.fragmentShader = f;
    };
    m.userData.kind = k;
    return mats[k] = m;
  };
  root.traverse(o => {
    if (!o.isMesh) return;
    const k = kind(o.material?.name || '');
    o.material?.dispose?.(); o.material = make(k);
    o.castShadow = !FLAT.has(k); o.receiveShadow = true; o.userData.kind = k;
  });
  return {mats, dispose: () => Object.values(mats).forEach(m => m.dispose())};
}

// Shared renderer / scene / bloom / lifecycle for the ERA scenes.
function stage(el, {fov = 30, far = 12000, fog = .00045, bloom = .5} = {}) {
  const r = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
  r.setPixelRatio(Math.min(devicePixelRatio, 1.6)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#15100d'); scene.fog = new THREE.FogExp2('#15100d', fog);
  const env = environment(r); scene.environment = env.texture; scene.environmentIntensity = .32;
  const camera = new THREE.PerspectiveCamera(fov, 1, 4, far);
  const composer = new EffectComposer(r); composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom, .7, .78); composer.addPass(bloomPass); composer.addPass(new OutputPass());

  const hemi = new THREE.HemisphereLight('#39383a', '#0b0b0a', .55); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#b9c0cc', .55); moon.position.set(TALL_TOWER.x - 700, 1000, TALL_TOWER.z + 500);
  moon.target.position.set(TALL_TOWER.x, 0, TALL_TOWER.z); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, {left: -500, right: 500, top: 500, bottom: -500, near: 100, far: 2600}); moon.shadow.bias = -.0005;
  const rim = new THREE.DirectionalLight('#c89a74', 1.1); rim.position.set(TALL_TOWER.x + 800, 260, TALL_TOWER.z - 900);
  scene.add(moon, moon.target, rim);

  const mouse = {x: 0, y: 0};
  const onMove = e => { const b = el.getBoundingClientRect(); mouse.x = (e.clientX - b.left) / b.width - .5; mouse.y = (e.clientY - b.top) / b.height - .5; };
  el.addEventListener('pointermove', onMove);
  const resize = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; r.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  let visible = true; const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(el);
  const owned = [];
  let frame, last = performance.now();
  const run = fn => { const loop = now => { frame = requestAnimationFrame(loop); if (!visible || document.hidden) return; const dt = Math.min((now - last) / 1000, .05); last = now; fn(dt, now / 1000); composer.render(); }; frame = requestAnimationFrame(loop); };
  const dispose = () => {
    cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); el.removeEventListener('pointermove', onMove);
    owned.forEach(f => f()); env.dispose(); composer.dispose?.(); r.dispose(); r.domElement.remove();
  };
  return {r, scene, camera, mouse, run, dispose, owned, el, rim, moon, hemi, bloomPass};
}

function addGround(s, y = 2.6) {
  const g = new THREE.CircleGeometry(2600, 64), m = new THREE.MeshStandardMaterial({color: '#0d0d0c', roughness: .42, metalness: .25});
  const mesh = new THREE.Mesh(g, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(TALL_TOWER.x, y, TALL_TOWER.z); mesh.receiveShadow = true; s.scene.add(mesh);
  s.owned.push(() => { g.dispose(); m.dispose(); });
}
function loadTower(s, opts) {
  let done = false;
  s.owned.push(() => { done = true; });
  return loadGLB('era-building.glb').then(root => {
    if (done) { disposeTree(root); return null; }
    const skin = nightSkin(root, opts); s.scene.add(root);
    s.owned.push(() => { disposeTree(root); skin.dispose(); });
    return {root, skin};
  });
}

const T = (x, y, z) => new THREE.Vector3(TALL_TOWER.x + x, y, TALL_TOWER.z + z);
// 02 → 03 · four shots: front three-quarter → closer → facade detail → elevated.
const FILM = {
  pos: [T(640, 60, 760), T(470, 170, 400), T(120, 205, 170), T(-60, 330, 150), T(-520, 560, 640)],
  look: [T(0, 150, 0), T(0, 150, 0), T(0, 205, 0), T(0, 230, 0), T(0, 110, 0)],
  fov: [30, 26, 22, 26, 30],
};
export function eraFilm(el, getP, {orbit = false} = {}) {
  const s = stage(el, {fov: 30, bloom: .55}); addGround(s);
  const pos = new THREE.CatmullRomCurve3(FILM.pos, false, 'centripetal'), look = new THREE.CatmullRomCurve3(FILM.look, false, 'centripetal');
  let sm = 0, spin = 0, glass = null;
  loadTower(s, {glow: 1.1}).then(t => { if (t) glass = t.skin.mats.glass; });
  const P = new THREE.Vector3(), L = new THREE.Vector3();
  s.run((dt, t) => {
    if (orbit) {
      spin += dt * .035; const d = 980;
      s.camera.position.set(TALL_TOWER.x + Math.sin(spin + .7) * d, 190 - s.mouse.y * 40, TALL_TOWER.z + Math.cos(spin + .7) * d);
      s.camera.lookAt(TALL_TOWER.x, 150, TALL_TOWER.z); s.camera.fov = 30;
    } else {
      sm = THREE.MathUtils.damp(sm, getP(), 4, dt);
      const k = THREE.MathUtils.clamp(sm, 0, 1), f = k * (FILM.fov.length - 1), i = Math.min(Math.floor(f), FILM.fov.length - 2);
      pos.getPoint(k, P); look.getPoint(k, L);
      P.x += s.mouse.x * 30; P.y -= s.mouse.y * 18;
      s.camera.position.copy(P); s.camera.lookAt(L);
      s.camera.fov = THREE.MathUtils.lerp(FILM.fov[i], FILM.fov[i + 1], f - i);
    }
    s.camera.updateProjectionMatrix();
    if (glass) glass.emissiveIntensity = 1.1 + Math.sin(t * .3) * .05;
  });
  return {dispose: s.dispose};
}

// 09 · residences: hover / click a level of the tall tower. `live` is a mutable {selected, onSelect, onHover}.
export function eraSelect(el, getP, live) {
  const s = stage(el, {fov: 28, bloom: .45}); addGround(s);
  const uniforms = {uSel: {value: new THREE.Vector2(-1, -1)}, uHov: {value: new THREE.Vector2(-1, -1)}, uC: {value: new THREE.Vector2(TALL_TOWER.x, TALL_TOWER.z)}};
  const pick = [];
  loadTower(s, {uniforms, glow: .8}).then(t => t && t.root.traverse(o => o.isMesh && pick.push(o)));
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let spin = .75, spinT = .75, drag = null, moved = 0, hovered = null;
  const move = e => { const b = el.getBoundingClientRect(); ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); if (drag !== null) { spinT += (e.clientX - drag) * .006; moved += Math.abs(e.clientX - drag); drag = e.clientX; } };
  const down = e => { drag = e.clientX; moved = 0; };
  const up = () => { if (drag !== null && moved < 6 && hovered) live.onSelect?.(hovered); drag = null; };
  const leave = () => { ndc.set(-9, -9); drag = null; if (hovered) { hovered = null; live.onHover?.(null); } };
  el.addEventListener('pointermove', move); el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointerleave', leave);
  s.owned.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', leave); });
  s.run(dt => {
    spin = THREE.MathUtils.damp(spin, spinT, 6, dt);
    const d = el.clientWidth < 700 ? 1250 : 900;
    s.camera.position.set(TALL_TOWER.x + Math.sin(spin) * d, 250, TALL_TOWER.z + Math.cos(spin) * d); s.camera.lookAt(TALL_TOWER.x, 135, TALL_TOWER.z);
    if (drag === null && pick.length) {
      ray.setFromCamera(ndc, s.camera);
      const hit = ray.intersectObjects(pick, false)[0];
      const f = hit && inTall(hit.point) ? THREE.MathUtils.clamp(Math.floor((hit.point.y - TALL_TOWER.base) / levelH) + 1, 2, LEVELS) : null;
      if (f !== hovered) { hovered = f; live.onHover?.(f); el.style.cursor = f ? 'pointer' : 'grab'; }
    }
    uniforms.uSel.value.set(...band(live.selected)); uniforms.uHov.value.set(...band(hovered));
  });
  return {dispose: s.dispose};
}

// 10 · place: the district map, dark, with HTML pins (children of `pins`, same order as PLACES) projected every frame.
export const PLACES = [
  {id: 'afrah', name: 'AFRAH', cat: 'Home', time: 0, pos: [-120, 290, -95]},
  {id: 'embankment', name: 'Embankment', cat: 'Nature', time: 4, pos: [-30, 6, 180]},
  {id: 'park', name: 'River park', cat: 'Nature', time: 9, pos: [420, 6, -520]},
  {id: 'arena', name: 'Sports arena', cat: 'Sport', time: 12, pos: [671, 20, 364]},
  {id: 'school', name: 'School campus', cat: 'Education', time: 7, pos: [-1031, 30, 1334]},
  {id: 'station', name: 'Metro station', cat: 'Transport', time: 6, pos: [-834, 16, -1173]},
  {id: 'hall', name: 'Concert hall', cat: 'Culture', time: 12, pos: [-745, 30, -1241]},
];
const HOME = {pos: new THREE.Vector3(560, 900, 1500), target: TOWERS_CENTER.clone().setY(40)};
export function eraMap(el, getP, {pins, interactive = true, api = {}} = {}) {
  const s = stage(el, {fov: 30, fog: .00018, bloom: .6});
  Object.assign(s.moon.shadow.camera, {left: -1400, right: 1400, top: 1400, bottom: -1400, far: 4200});
  s.camera.position.copy(HOME.pos).multiplyScalar(2);
  const controls = new OrbitControls(s.camera, s.r.domElement);
  Object.assign(controls, {enableDamping: true, dampingFactor: .06, minDistance: 250, maxDistance: 3400, maxPolarAngle: 1.25, minPolarAngle: .3, screenSpacePanning: false, rotateSpeed: .5, enabled: interactive, enableZoom: interactive});
  controls.target.copy(HOME.target); s.owned.push(() => controls.dispose());
  let done = false;
  s.owned.push(() => { done = true; });
  // Morning: ERA's own district with its baked textures, a clear sky and haze.
  const sky = new THREE.Color('#cfdde8');
  s.scene.background = sky; s.scene.fog = new THREE.Fog('#dfe6ea', 4200, 11000);
  s.hemi.color.set('#eef4fb'); s.hemi.groundColor.set('#8b8578'); s.hemi.intensity = 1.3;
  s.moon.color.set('#fff0da'); s.moon.intensity = 2.4; s.rim.color.set('#ffe2c4'); s.rim.intensity = .5;
  s.scene.environmentIntensity = .7; s.bloomPass.strength = .12; s.r.toneMappingExposure = 1;
  let district = null;
  loadEraDistrict(s.r).then(d => {
    if (done) return;
    district = d; d.group.scale.setScalar(1); d.group.position.set(0, 0, 0); d.setEvening(0);
    s.scene.add(d.group);
    el.classList.add('ready');
  });
  let flight = null;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const fly = (p1, t1, dur = 1.6) => { flight = {t: 0, dur, p0: s.camera.position.clone(), t0: controls.target.clone(), p1, t1}; };
  api.home = () => fly(HOME.pos.clone(), HOME.target.clone());
  api.focus = p => { const t = new THREE.Vector3(p.pos[0], Math.min(p.pos[1], 120) * .4, p.pos[2]); const dir = s.camera.position.clone().sub(controls.target).setY(0).normalize().multiplyScalar(640); fly(t.clone().add(dir).setY(Math.max(320, t.y + 360)), t); };
  api.zoom = k => { const d = s.camera.position.clone().sub(controls.target).multiplyScalar(k); fly(controls.target.clone().add(d), controls.target.clone(), .7); };
  const intro = setTimeout(api.home, 300); s.owned.push(() => clearTimeout(intro));
  const v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  s.run((dt, t) => {
    district?.tick(t);
    if (flight) { flight.t = Math.min(1, flight.t + dt / flight.dur); const k = ease(flight.t); s.camera.position.lerpVectors(flight.p0, flight.p1, k); controls.target.lerpVectors(flight.t0, flight.t1, k); if (flight.t >= 1) flight = null; }
    else if (!interactive) { const off = s.camera.position.clone().sub(controls.target).applyAxisAngle(up, dt * .025); s.camera.position.copy(controls.target).add(off); }
    controls.update();
    const w = el.clientWidth, h = el.clientHeight, nodes = pins?.current?.children || [];
    PLACES.forEach((p, i) => {
      const n = nodes[i]; if (!n) return;
      v.set(...p.pos).project(s.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      n.style.transform = `translate(${(v.x * .5 + .5) * w}px, ${(-v.y * .5 + .5) * h}px)`; n.style.opacity = on ? '' : 0; n.style.pointerEvents = on ? '' : 'none';
    });
  });
  return {dispose: s.dispose};
}
