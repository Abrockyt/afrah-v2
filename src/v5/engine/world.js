import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PRESETS, ENVIRONMENTS, patchFog, createRenderer, createComposer, createSkyDome, loadHDR} from './core';
import {buildTower, TOWER, TOWER_TOP} from './tower';
import {buildCity, buildClouds} from './city';

// AFRAH world: one scene, several camera rigs. Loading follows the brief's priority order:
// shell → hero building → critical environment → near landscape → near city → far city → extras.

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const HERO_SHOT = {pos: V(150, 38, 218), target: V(-4, 68, 0), fov: 32};
const curve = pts => new THREE.CatmullRomCurve3(pts, false, 'centripetal');
// Intro: above the clouds → through them → city lights → reveal → AFRAH (ends exactly on HERO_SHOT)
const INTRO = {duration: 13,
  pos: curve([V(1500, 1500, 2300), V(1150, 1050, 1800), V(820, 620, 1260), V(480, 260, 760), V(250, 110, 380), HERO_SHOT.pos]),
  target: curve([V(0, 0, 0), V(0, 0, 0), V(0, 20, 0), V(0, 40, 0), V(0, 52, 0), HERO_SHOT.target])};
// Home scroll flight: slow crane, push-in to the crown, controlled orbit, street level, wide
const FLIGHT = {
  pos: curve([HERO_SHOT.pos, V(150, 120, 200), V(70, 126, 96), V(-92, 116, 92), V(-150, 60, 150), V(-46, 5, 150), V(300, 70, 560)]),
  target: curve([HERO_SHOT.target, V(0, 78, 0), V(0, 108, 0), V(0, 96, 0), V(0, 62, 0), V(0, 44, 0), V(0, 60, 0)]),
  fov: [30, 30, 26, 28, 30, 34, 32]};
// v6 building film: front three-quarter → closer → architectural detail → elevated
const FILM = {pos: curve([V(150, 38, 218), V(110, 30, 150), V(46, 44, 70), V(-40, 62, 88), V(-150, 150, 200)]),
  target: curve([V(-4, 64, 0), V(-2, 56, 0), V(4, 44, 10), V(-4, 60, 0), V(0, 58, 0)]), fov: [32, 30, 26, 28, 30]};
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerpEnv = (a, b, t) => {
  const o = {};
  for (const k of Object.keys(a)) {
    if (typeof a[k] === 'number') o[k] = a[k] + (b[k] - a[k]) * t;
    else if (Array.isArray(a[k])) o[k] = a[k].map((x, i) => x + (b[k][i] - x) * t);
    else if (typeof a[k] === 'string' && a[k][0] === '#') o[k] = '#' + new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t).getHexString();
    else o[k] = t < .5 ? a[k] : b[k];
  }
  return o;
};
const CLOUD_TONES = {night: ['#39445a', '#0f131d', 1], blue: ['#7385aa', '#27314b', .7], golden: ['#f1c79e', '#6e5b63', .1], overcast: ['#b8bec4', '#6d737a', 0], day: ['#f2f4f6', '#a8b2bd', 0]};

export function createWorld(el, opts = {}) {
  const quality = opts.quality || 'high', Q = PRESETS[quality];
  const capture = !!opts.capture;
  patchFog();
  const renderer = createRenderer(el, quality);
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(HERO_SHOT.fov, 1, 1, 20000);
  camera.position.copy(HERO_SHOT.pos); camera.lookAt(HERO_SHOT.target);
  const post = createComposer(renderer, scene, camera, quality);
  scene.fog = new THREE.FogExp2('#0a0f1a', .0005);

  const shared = {uReveal: {value: 1e4}, uSel: {value: -9}, uHov: {value: -9}, uGold: {value: new THREE.Color('#d8b36a')}, uTime: {value: 0}, uCityLights: {value: 1}};
  const key = new THREE.DirectionalLight('#ffffff', 1);
  key.castShadow = true; key.shadow.mapSize.set(Q.shadow, Q.shadow);
  Object.assign(key.shadow.camera, {left: -170, right: 170, top: 170, bottom: -170, near: 10, far: 1800});
  key.shadow.bias = -.00025; key.shadow.normalBias = .6;
  scene.add(key, key.target);
  const dome = createSkyDome(); scene.add(dome);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const pmremCache = new Map();

  const state = {mode: opts.mode || 'flight', progress: 0, intro: opts.intro ? 0 : -1, introT: 0, envFrom: opts.env || 'night', envTo: opts.env || 'night', envT: 0,
    parallax: [0, 0], ready: false, time: 0, spin: 0, spinTarget: 0, hover: null, fps: 60, frames: 0, fpsT: 0};
  let tower, city, clouds, controls, disposed = false, envCurrent = ENVIRONMENTS.night, fly = null;

  async function envTexture(name) {
    const hdr = await loadHDR(name);
    if (!pmremCache.has(name)) pmremCache.set(name, pmrem.fromEquirectangular(hdr).texture);
    return {hdr, pm: pmremCache.get(name)};
  }
  async function setEnv(from, to = from, t = 0) {
    state.envFrom = from; state.envTo = to; state.envT = t;
    const [a, b] = await Promise.all([envTexture(ENVIRONMENTS[from].hdr), envTexture(ENVIRONMENTS[to].hdr)]);
    if (disposed) return;
    dome.material.uniforms.tA.value = a.hdr; dome.material.uniforms.tB.value = b.hdr;
    state.envTex = [a, b];
  }
  function applyEnv() {
    const A = ENVIRONMENTS[state.envFrom], B = ENVIRONMENTS[state.envTo], t = state.envT;
    const E = envCurrent = lerpEnv(A, B, t);
    const u = dome.material.uniforms;
    u.uMix.value = t; u.uRotA.value = A.rot; u.uRotB.value = B.rot; u.uIntA.value = A.sky; u.uIntB.value = B.sky; u.uHorizon.value.set(E.fog);
    if (state.envTex) scene.environment = state.envTex[t < .5 ? 0 : 1].pm;
    scene.environmentIntensity = E.env;
    renderer.toneMappingExposure = E.exposure;
    scene.fog.color.set(E.fog); scene.fog.density = E.fogD;
    key.color.set(E.keyColor); key.intensity = E.keyI;
    key.position.copy(V(...E.key).normalize().multiplyScalar(900)); key.target.position.set(0, 0, 0);
    if (post.bloom) post.bloom.strength = E.bloom;
    shared.uCityLights.value = E.windows;
    if (tower) {
      const w = tower.windowMaterial.uniforms;
      if (state.envTex) { w.uEnv.value = state.envTex[t < .5 ? 0 : 1].hdr; w.uEnvRot.value = t < .5 ? A.rot : B.rot; }
      w.uEnvInt.value = E.env * 1.1; w.uCity.value.set(E.fog).multiplyScalar(1.4);
      tower.update(E, state.time);
    }
    if (clouds) {
      const [ta, ba, ga] = CLOUD_TONES[state.envFrom], [tb, bb, gb] = CLOUD_TONES[state.envTo];
      clouds.material.uniforms.uTop.value.set(ta).lerp(new THREE.Color(tb), t);
      clouds.material.uniforms.uBottom.value.set(ba).lerp(new THREE.Color(bb), t);
      clouds.material.uniforms.uCityGlow.value = ga + (gb - ga) * t;
    }
  }

  // ── staged loading ──
  const progress = p => opts.onProgress?.(p);
  const ready = (async () => {
    progress(.05);
    const heroP = buildTower({quality, shared});
    await setEnv(state.envFrom, state.envTo, state.envT);        // critical environment
    progress(.3);
    tower = await heroP; if (disposed) return;
    scene.add(tower.group);                                       // hero building first
    progress(.55);
    applyEnv(); renderer.compile(scene, camera);
    state.ready = true; opts.onReady?.('hero');
    await new Promise(r => setTimeout(r, capture ? 0 : 60));
    city = await buildCity({quality, shared, minimal: !!opts.minimal, stage: s => progress({river: .62, roads: .7, buildings: .82, lights: .88, traffic: .92}[s] || .6)});
    if (disposed) return;
    city.addTrees(tower.spots.trees);
    city.commitTrees(Q.trees);
    scene.add(city.group);
    city.setFarVisible(Q.farCity || state.mode === 'map');
    if (!opts.minimal) { clouds = buildClouds({count: Q.clouds, shared}); scene.add(clouds.group); }
    progress(.97);
    await city.addShrubs(tower.spots.shrubs, Q.shrubs).catch(() => {});
    applyEnv(); renderer.compile(scene, camera);
    progress(1); opts.onReady?.('city');
  })().catch(e => { console.error(e); opts.onError?.(e); });

  // ── interaction ──
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let drag = null, moved = 0;
  const onMove = e => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    state.parallax = [x - .5, y - .5]; ndc.set(x * 2 - 1, -(y * 2 - 1));
    if (drag !== null) { state.spinTarget += (e.clientX - drag) * .005; moved += Math.abs(e.clientX - drag); drag = e.clientX; }
  };
  const onDown = e => { if (state.mode !== 'select') return; drag = e.clientX; moved = 0; };
  const onUp = () => { if (state.mode === 'select' && drag !== null && moved < 6 && state.hover) opts.onSelect?.(state.hover); drag = null; };
  const onLeave = () => { ndc.set(-9, -9); state.parallax = [0, 0]; if (state.hover) { state.hover = null; shared.uHov.value = -9; opts.onHover?.(null); } };
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerdown', onDown); addEventListener('pointerup', onUp); el.addEventListener('pointerleave', onLeave);
  if (state.mode === 'map') {
    controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, {enableDamping: true, dampingFactor: .06, minDistance: 90, maxDistance: 2600, maxPolarAngle: 1.32, minPolarAngle: .2, rotateSpeed: .45, zoomSpeed: .8, screenSpacePanning: false});
    controls.target.set(0, 40, 0); camera.position.set(520, 420, 760);
  }

  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h); post.setSize(w, h);
    camera.aspect = w / h;
    if (opts.offset && w > 900) camera.setViewOffset(w, h, -w * opts.offset, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, {rootMargin: '200px'}); io.observe(el);

  // ── camera rigs ──
  const tp = new THREE.Vector3(), tt = new THREE.Vector3();
  function placeCamera(dt) {
    const [px, py] = state.parallax;
    if (state.intro >= 0) {
      const k = Math.min(state.introT / INTRO.duration, 1), e = ease(k);
      INTRO.pos.getPoint(e, tp); INTRO.target.getPoint(e, tt);
      camera.fov = THREE.MathUtils.lerp(38, HERO_SHOT.fov, e);
      shared.uReveal.value = k >= 1 ? 1e4 : k < .55 ? -10 : THREE.MathUtils.lerp(-10, TOWER_TOP + 30, THREE.MathUtils.smoothstep(k, .55, .93));
      camera.position.copy(tp); camera.lookAt(tt);
    } else if (state.mode === 'flight') {
      const p = THREE.MathUtils.clamp(state.progress, 0, 1);
      FLIGHT.pos.getPoint(p, tp); FLIGHT.target.getPoint(p, tt);
      const f = p * (FLIGHT.fov.length - 1), i = Math.floor(f);
      camera.fov = THREE.MathUtils.lerp(FLIGHT.fov[i], FLIGHT.fov[Math.min(i + 1, FLIGHT.fov.length - 1)], f - i);
      camera.position.copy(tp); camera.lookAt(tt);
    } else if (state.mode === 'film') {
      const p = THREE.MathUtils.clamp(state.progress, 0, 1);
      FILM.pos.getPoint(p, tp); FILM.target.getPoint(p, tt);
      const f = p * (FILM.fov.length - 1), i = Math.floor(f);
      camera.fov = THREE.MathUtils.lerp(FILM.fov[i], FILM.fov[Math.min(i + 1, FILM.fov.length - 1)], f - i);
      camera.position.copy(tp); camera.lookAt(tt);
    } else if (state.mode === 'orbit') {
      const a = .98 + state.time * .012, r = 330;
      camera.position.set(Math.sin(a) * r, 95, Math.cos(a) * r); camera.fov = 30; camera.lookAt(0, 58, 0);
    } else if (state.mode === 'select') {
      state.spin = THREE.MathUtils.damp(state.spin, state.spinTarget, 6, dt);
      const a = .45 + state.spin, r = 250;
      camera.position.set(Math.sin(a) * r, 70, Math.cos(a) * r); camera.fov = 32; camera.lookAt(0, 58, 0);
    } else if (state.mode === 'map') {
      if (fly) { fly.t = Math.min(1, fly.t + dt / 1.6); const k = ease(fly.t); camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.q0, fly.q1, k); if (fly.t >= 1) fly = null; }
      controls.update();
    }
    if (state.mode !== 'map' && !capture && state.intro < 0) { camera.rotateY(-px * .026); camera.rotateX(-py * .018); } // ≤ 1.5°
    camera.updateProjectionMatrix();
  }

  function pick() {
    if (state.mode !== 'select' || !tower || drag !== null) return;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([tower.meshes.stone, tower.windows], false)[0];
    let lvl = null;
    if (hit && Math.abs(hit.point.x) < 22 && Math.abs(hit.point.z) < 17 && hit.point.y > TOWER.base) lvl = THREE.MathUtils.clamp(Math.floor((hit.point.y - TOWER.base) / TOWER.floorH) + 1, 1, TOWER.levels);
    if (lvl !== state.hover) { state.hover = lvl; shared.uHov.value = lvl ?? -9; opts.onHover?.(lvl); el.style.cursor = lvl ? 'pointer' : 'grab'; }
  }

  // ── loop ──
  let last = performance.now(), frame;
  function renderFrame(dt) {
    shared.uTime.value = state.time;
    placeCamera(dt);
    applyEnv();
    city?.update(envCurrent, state.time, dt);
    pick();
    renderer.info.reset();
    post.composer.render(dt);
  }
  function loop(now) {
    frame = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!visible || document.hidden || !state.ready || capture) return;
    state.time += dt;
    if (state.intro >= 0) { state.introT += dt; if (state.introT >= INTRO.duration) { state.intro = -1; shared.uReveal.value = 1e4; opts.onIntroEnd?.(); } }
    renderFrame(dt);
    state.frames++; state.fpsT += dt; if (state.fpsT > .5) { state.fps = state.frames / state.fpsT; state.frames = 0; state.fpsT = 0; }
  }
  frame = requestAnimationFrame(loop);

  const api = {
    renderer, scene, camera, state, shared, ready,
    get tower() { return tower; }, get city() { return city; },
    setProgress: p => { state.progress = p; },
    setMode: m => { state.mode = m; },
    setEnv, setEnvT: t => { state.envT = t; },
    setSelected: l => { shared.uSel.value = l ?? -9; },
    startIntro: () => { state.intro = 0; state.introT = 0; },
    skipIntro: () => { state.intro = -1; shared.uReveal.value = 1e4; },
    // deterministic frame for the intro film; t in seconds (0 … introDuration)
    captureAt: t => { state.time = t; state.intro = t < INTRO.duration ? 0 : -1; state.introT = t; renderFrame(1 / 30); },
    introDuration: INTRO.duration,
    project: (p, out = new THREE.Vector3()) => out.set(...p).project(camera),
    flyTo(target, dist = 420) {
      if (!controls) return;
      const t = V(...target), dir = camera.position.clone().sub(controls.target).setY(0).normalize();
      fly = {t: 0, p0: camera.position.clone(), q0: controls.target.clone(), p1: t.clone().addScaledVector(dir, dist).setY(Math.max(220, t.y + 240)), q1: t};
    },
    resetView() { if (controls) fly = {t: 0, p0: camera.position.clone(), q0: controls.target.clone(), p1: V(520, 420, 760), q1: V(0, 40, 0)}; },
    stats: () => ({fps: state.fps, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, quality: Q.name, windows: tower?.stats.windows, ...city?.stats}),
    dispose() {
      disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown); removeEventListener('pointerup', onUp); el.removeEventListener('pointerleave', onLeave);
      controls?.dispose(); tower?.dispose(); clouds?.dispose();
      scene.traverse(o => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); });
      pmremCache.forEach(t => t.dispose()); pmrem.dispose(); post.composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
  if (capture) window.__afrah = api;
  return api;
}
