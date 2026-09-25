import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadGLB, loadTrees, skin, makeTrees, environment, renderer as makeRenderer, disposeTree, TOWERS_CENTER} from './era';
import {Plus, Minus, RotateCcw, X} from 'lucide-react';

// Interactive district map with colored terrain, river, planting and towers.
export const places = [
  {id: 'afrah', name: 'AFRAH', cat: 'Home', time: '0 min', pos: [-120, 200, -95], image: '/v3/era/new-era.webp', text: 'The towers: 26 floors of residences, a crown and a courtyard garden.'},
  {id: 'embankment', name: 'Embankment', cat: 'Nature', time: '4 min', pos: [-30, 6, 180], image: '/v3/silver/loc-1.webp', text: 'The river path for a morning run or an evening walk.'},
  {id: 'park', name: 'River park', cat: 'Nature', time: '9 min', pos: [420, 6, -520], image: '/v3/likova/env-bg-1.webp', text: 'Meadows, playgrounds and forty kilometres of paths.'},
  {id: 'stadium', name: 'Sports arena', cat: 'Sport', time: '12 min', pos: [671, 20, 364], image: '/v3/silver/loc-3.webp', text: 'Football, athletics and the winter ice rink.'},
  {id: 'school', name: 'School campus', cat: 'Education', time: '7 min', pos: [-1031, 30, 1334], image: '/v3/era/joy-2.webp', text: 'Kindergarten to graduation, on quiet streets.'},
  {id: 'station', name: 'Metro station', cat: 'Transport', time: '6 min', pos: [-834, 16, -1173], image: '/v3/likova/loc-slide-2.webp', text: 'Three lines and the airport express.'},
  {id: 'business', name: 'Business district', cat: 'Work', time: '15 min', pos: [-967, 120, -1115], image: '/v3/likova/offices.webp', text: 'The towers of the business district, one stop away.'},
  {id: 'hall', name: 'Concert hall', cat: 'Culture', time: '12 min', pos: [-745, 30, -1241], image: '/v3/era/joy-c4.webp', text: 'An evening of music, a walk from home.'},
];

const HOME_VIEW = {pos: new THREE.Vector3(560, 820, 1450), target: TOWERS_CENTER.clone().setY(40)};

export default function CityMap({mode = 'day', interactive = true, compact = false}) {
  const host = useRef(), pinsRef = useRef({}), api = useRef({});
  const [ready, setReady] = useState(0), [active, setActive] = useState(null), [filter, setFilter] = useState('All');

  useEffect(() => {
    const el = host.current;
    let r;
    try { r = makeRenderer(el, {shadows: true}); } catch { el.classList.add('no-webgl'); return; }
    const scene = new THREE.Scene(), bg = new THREE.Color(mode === 'day' ? '#c8dbd9' : '#142f3c');
    scene.background = bg; scene.fog = new THREE.Fog(bg, 1900, 4500);
    const env = environment(r); scene.environment = env.texture;
    const camera = new THREE.PerspectiveCamera(30, 1, 5, 12000);
    camera.position.set(HOME_VIEW.pos.x * 2.2, HOME_VIEW.pos.y * 2.4, HOME_VIEW.pos.z * 2.2);
    scene.add(new THREE.HemisphereLight('#d7eaf5', mode === 'day' ? '#796f60' : '#18323d', mode === 'day' ? .8 : .45));
    const sun = new THREE.DirectionalLight(mode === 'day' ? '#ffe1b7' : '#aec7da', mode === 'day' ? 2.15 : .75);
    sun.position.set(-900, 1400, 700); sun.target.position.copy(TOWERS_CENTER); sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, {left: -1300, right: 1300, top: 1300, bottom: -1300, near: 100, far: 4000}); sun.shadow.bias = -.0005;
    scene.add(sun, sun.target);

    const controls = new OrbitControls(camera, r.domElement);
    Object.assign(controls, {enableDamping: true, dampingFactor: .06, minDistance: 220, maxDistance: 3400, maxPolarAngle: 1.3, minPolarAngle: .25, screenSpacePanning: false, rotateSpeed: .5, zoomSpeed: .8, enabled: interactive, enableZoom: interactive && !compact});
    controls.target.copy(HOME_VIEW.target);

    let city, trees, skinned, disposed = false;
    Promise.all([loadGLB('era-city.glb'), loadTrees()]).then(([root, pts]) => {
      if (disposed) return disposeTree(root);
      skinned = skin(root, mode); city = root; scene.add(root);
      trees = makeTrees(pts, mode); scene.add(trees);
      setReady(1);
    }).catch(() => el.classList.add('no-webgl'));

    // Camera flights (pins, reset).
    let flight = null;
    const fly = (pos, target, dur = 1.6) => { flight = {t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target}; };
    api.current.home = () => fly(HOME_VIEW.pos.clone(), HOME_VIEW.target.clone());
    api.current.zoom = k => { const d = camera.position.clone().sub(controls.target).multiplyScalar(k); fly(controls.target.clone().add(d), controls.target.clone(), .7); };
    api.current.focus = p => { const t = new THREE.Vector3(p.pos[0], p.pos[1] * .4, p.pos[2]); const dir = camera.position.clone().sub(controls.target).setY(0).normalize().multiplyScalar(620); fly(t.clone().add(dir).setY(Math.max(300, t.y + 340)), t); };
    const intro = setTimeout(() => api.current.home(), 400);

    const resize = () => { const w = el.clientWidth, h = el.clientHeight; r.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, {rootMargin: '100px'}); io.observe(el);

    const v = new THREE.Vector3(), bounds = 1500, clock = new THREE.Clock(), up = new THREE.Vector3(0, 1, 0);
    let frame;
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min(clock.getDelta(), .05);
      if (flight) {
        flight.t = Math.min(1, flight.t + dt / flight.dur); const k = ease(flight.t);
        camera.position.lerpVectors(flight.p0, flight.p1, k); controls.target.lerpVectors(flight.t0, flight.t1, k);
        if (flight.t >= 1) flight = null;
      } else if (compact) {
        const off = camera.position.clone().sub(controls.target).applyAxisAngle(up, dt * .03); camera.position.copy(controls.target).add(off);
      }
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -bounds, bounds); controls.target.z = THREE.MathUtils.clamp(controls.target.z, -bounds, bounds);
      controls.update();
      r.render(scene, camera);
      const w = el.clientWidth, h = el.clientHeight;
      for (const p of places) {
        const node = pinsRef.current[p.id]; if (!node) continue;
        v.set(...p.pos).project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        node.style.transform = `translate(${(v.x * .5 + .5) * w}px, ${(-v.y * .5 + .5) * h}px)`;
        node.style.opacity = on ? '' : 0; node.style.pointerEvents = on ? '' : 'none';
      }
    };
    loop();

    return () => {
      disposed = true; clearTimeout(intro); cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); controls.dispose();
      if (city) disposeTree(city); if (trees) disposeTree(trees); skinned?.dispose(); env.dispose(); r.dispose(); r.domElement.remove();
    };
  }, [mode, interactive, compact]);

  const cats = ['All', ...new Set(places.map(p => p.cat))];
  const choose = p => { setActive(p); api.current.focus?.(p); };
  return <div className={`v-citymap ${compact ? 'compact' : ''} ${ready ? 'ready' : ''} ${mode}`}>
    <div ref={host} className="v-citymap-canvas" role="img" aria-label="3D map of the district. Drag to rotate, scroll to zoom."/>
    <div className="v-citymap-pins" aria-hidden={!ready}>
      {places.map((p, i) => <button key={p.id} ref={n => { pinsRef.current[p.id] = n; }} className={`v-pin ${p.id === 'afrah' ? 'home' : ''} ${active?.id === p.id ? 'on' : ''} ${filter !== 'All' && filter !== p.cat && p.id !== 'afrah' ? 'dim' : ''}`} onClick={() => choose(p)} tabIndex={interactive ? 0 : -1}>
        <i>{p.id === 'afrah' ? 'A' : String(i).padStart(2, '0')}</i><span>{p.name}<em>{p.time}</em></span>
      </button>)}
    </div>
    {!ready && <div className="v-citymap-loading"><span/>Loading the district</div>}
    {interactive && <>
      <div className="v-citymap-filters">{cats.map(c => <button key={c} aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}</button>)}</div>
      <div className="v-citymap-tools">
        {!compact && <><button aria-label="Zoom in" onClick={() => api.current.zoom(.7)}><Plus size={18}/></button><button aria-label="Zoom out" onClick={() => api.current.zoom(1.4)}><Minus size={18}/></button></>}
        <button aria-label="Reset view" onClick={() => { setActive(null); api.current.home(); }}><RotateCcw size={17}/></button>
      </div>
      {active && <aside className="v-citymap-card">
        <button className="v-citymap-close" aria-label="Close" onClick={() => setActive(null)}><X size={16}/></button>
        <img src={active.image} alt=""/>
        <div><span className="v-label">{active.cat} · {active.time} from AFRAH</span><h3>{active.name}</h3><p>{active.text}</p></div>
      </aside>}
    </>}
  </div>;
}
