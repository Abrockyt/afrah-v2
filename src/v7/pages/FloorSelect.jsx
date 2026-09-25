import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { loadEraDistrict } from '../webgl/objects/EraDistrict';
import { UNITS } from '../../v6/residences-data';
import { Plan } from '../../v6/pages';
import '../styles/floor-select.css';

// Floor selection on the real tower. Hover a storey to see it outlined in
// bronze; click (or use the level list / arrow keys) to select it: the storey
// slides out of the facade, the floors above and below dim, the camera glides
// to it and the plan draws itself in the panel. Pick a residence on the plan
// for its details.

// The tallest tower of the quarter (the one the hero film flies up), from
// ERA's district model: 266 m, bronze leaf crown. Scene scale 1 unit = 12.5 m.
const K = 0.08;                                          // metres → units
const TOWER_M = { x: -139.5, z: -121 };                  // tower centre in model metres
const FIRST_LABEL = 5;                                   // storey number of the first residential floor
const FLOOR = 3.6 * K, FIRST_RES_FLOOR_Y = 18 * K, TOP_Y = 234 * K;
const FLOORS = Math.round((TOP_Y - FIRST_RES_FLOOR_Y) / FLOOR);
const FOOT = { minX: -25.5 * K, maxX: 25.5 * K, minZ: -22 * K, maxZ: 22 * K };
const CX = (FOOT.minX + FOOT.maxX) / 2, CZ = (FOOT.minZ + FOOT.maxZ) / 2, W = FOOT.maxX - FOOT.minX, D = FOOT.maxZ - FOOT.minZ;
const floorY = (i) => FIRST_RES_FLOOR_Y + i * FLOOR;
const STATUS = (u) => (['available', 'available', 'reserved', 'available', 'sold'][(u.seed * 7) % 5]);

function useTower(canvasRef, onHover, onPick) {
  const api = useRef({});
  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.localClippingEnabled = true;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 900);
    scene.add(new THREE.HemisphereLight('#ffffff', '#1a2433', 0.9));
    const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(-12, 20, -14); scene.add(key);
    const rim = new THREE.DirectionalLight('#bcd0ff', 0.6); rim.position.set(14, 8, 12); scene.add(rim);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 64), new THREE.MeshStandardMaterial({ color: '#0d1826', roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(CX, -0.01, CZ);

    // hover and selection storeys, and the dimming volumes above/below
    const slabGeo = new THREE.BoxGeometry(W + 0.35, FLOOR * 0.96, D + 0.35);
    const edges = new THREE.EdgesGeometry(slabGeo);
    const mkSlab = (color, opacity) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(slabGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })));
      g.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity: Math.min(1, opacity * 3.2) })));
      g.position.set(CX, 0, CZ); g.visible = false; scene.add(g); return g;
    };
    const hover = mkSlab('#c5a48f', 0.18);
    const picked = mkSlab('#e2bf9f', 0.32);
    const dimMat = new THREE.MeshBasicMaterial({ color: '#081c32', transparent: true, opacity: 0, depthWrite: false });
    const dimBelow = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 1, D + 0.5), dimMat);
    const dimAbove = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 1, D + 0.5), dimMat);
    scene.add(dimBelow, dimAbove);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(W, TOP_Y - FIRST_RES_FLOOR_Y, D), new THREE.MeshBasicMaterial({ visible: false }));
    collider.position.set(CX, (TOP_Y + FIRST_RES_FLOOR_Y) / 2, CZ); scene.add(collider);

    // camera rig: orbit angle + height + distance, all tweened
    const rig = { angle: -0.55, y: TOP_Y * 0.55, dist: 46, lookY: TOP_Y * 0.5, spin: true };
    loadEraDistrict(renderer).then((d) => {
      // re-scale ERA's quarter so the tallest tower stands on the origin
      const g = d.group;
      g.scale.setScalar(K);
      g.position.set(-TOWER_M.x * K, 0, -TOWER_M.z * K);
      d.setEvening(0.7);
      scene.add(g);
      const tick = (t) => d.tick(t);
      api.current.tick = tick;
      canvas.classList.add('is-ready');
    });
    scene.fog = new THREE.Fog('#081c32', 60, 260);

    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    const floorAt = (e) => {
      const r = canvas.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObject(collider)[0];
      if (!hit) return -1;
      const i = Math.floor((hit.point.y - FIRST_RES_FLOOR_Y) / FLOOR);
      return i >= 0 && i < FLOORS ? i : -1;
    };
    let hovered = -1, selected = -1;
    const move = (e) => {
      const i = floorAt(e);
      if (i !== hovered) {
        hovered = i;
        hover.visible = i >= 0 && i !== selected;
        if (i >= 0) hover.position.y = floorY(i) + FLOOR / 2;
        canvas.style.cursor = i >= 0 ? 'pointer' : 'grab';
        onHover(i, e);
      } else if (i >= 0) onHover(i, e);
    };
    const leave = () => { hovered = -1; hover.visible = false; onHover(-1); };
    let downAt = null;
    const down = (e) => { downAt = { x: e.clientX, a: rig.angle }; rig.spin = false; };
    const up = (e) => {
      if (downAt && Math.abs(e.clientX - downAt.x) < 5) { const i = floorAt(e); if (i >= 0) onPick(i); }
      downAt = null;
    };
    const drag = (e) => { if (downAt && e.buttons) rig.angle = downAt.a - (e.clientX - downAt.x) * 0.006; };
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointermove', drag);
    canvas.addEventListener('pointerleave', leave); canvas.addEventListener('pointerdown', down); window.addEventListener('pointerup', up);

    api.current.select = (i) => {
      selected = i;
      hover.visible = false;
      if (i < 0) {
        gsap.to(picked.scale, { x: 1, z: 1, duration: 0.4 });
        gsap.to(dimMat, { opacity: 0, duration: 0.5, onComplete: () => { picked.visible = false; } });
        gsap.to(rig, { y: TOP_Y * 0.55, dist: 46, lookY: TOP_Y * 0.5, duration: 1.2, ease: 'power3.inOut' });
        return;
      }
      const y = floorY(i);
      picked.visible = true;
      gsap.to(picked.position, { y: y + FLOOR / 2, duration: 0.6, ease: 'power3.inOut' });
      gsap.fromTo(picked.scale, { x: 1, z: 1 }, { x: 1.07, z: 1.07, duration: 0.7, ease: 'back.out(2.2)', delay: 0.25 });
      // dim everything above and below the chosen storey
      dimBelow.scale.y = Math.max(0.01, y - 0.02); dimBelow.position.set(CX, (y - 0.02) / 2, CZ);
      const topSpan = TOP_Y + 1.2 - (y + FLOOR);
      dimAbove.scale.y = Math.max(0.01, topSpan); dimAbove.position.set(CX, y + FLOOR + topSpan / 2, CZ);
      gsap.to(dimMat, { opacity: 0.62, duration: 0.6 });
      gsap.to(rig, { y: y + 3.2, lookY: y - 0.2, dist: 22, duration: 1.3, ease: 'power3.inOut' });
    };

    let raf;
    const size = () => { const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
    size(); window.addEventListener('resize', size);
    const clock = new THREE.Clock();
    const loop = () => {
      const dt = clock.getDelta();
      if (rig.spin) rig.angle += dt * 0.06;
      camera.position.set(CX + Math.sin(rig.angle) * rig.dist, rig.y, CZ - Math.cos(rig.angle) * rig.dist);
      camera.lookAt(CX, rig.lookY, CZ);
      api.current.tick?.(clock.elapsedTime);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', size); window.removeEventListener('pointerup', up);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return api;
}

export default function FloorSelectPage() {
  const canvasRef = useRef(null), panelRef = useRef(null), tipRef = useRef(null);
  const [floor, setFloor] = useState(-1);
  const [unit, setUnit] = useState(null);
  const [tip, setTip] = useState(-1);
  const label = (i) => i + FIRST_LABEL;
  const unitsOn = (i) => UNITS.filter((u) => u.floor === label(i));

  const api = useTower(canvasRef,
    (i, e) => { setTip(i); if (e && tipRef.current) { const r = canvasRef.current.getBoundingClientRect(); tipRef.current.style.transform = `translate(${e.clientX - r.left + 18}px, ${e.clientY - r.top - 14}px)`; } },
    (i) => setFloor(i));

  useEffect(() => {
    api.current.select?.(floor);
    setUnit(null);
    if (floor < 0 || !panelRef.current) return;
    const el = panelRef.current;
    const tl = gsap.timeline();
    tl.fromTo(el.querySelector('.fs-num span'), { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power4.out' })
      .fromTo(el.querySelectorAll('.fs-meta > *'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.5 }, 0.15)
      .fromTo(el.querySelectorAll('.fs-plan .fs-unit path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, stagger: 0.08, ease: 'power2.inOut' }, 0.2)
      .fromTo(el.querySelectorAll('.fs-plan .fs-unit'), { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.5, stagger: 0.08 }, 0.9)
      .fromTo(el.querySelectorAll('.fs-list li'), { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, stagger: 0.07, duration: 0.5 }, 0.4);
    return () => tl.kill();
  }, [floor]);

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); setFloor((f) => Math.min(FLOORS - 1, f < 0 ? 0 : f + 1)); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFloor((f) => Math.max(0, f < 0 ? 0 : f - 1)); }
      if (e.key === 'Escape') setFloor(-1);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);

  const units = floor >= 0 ? unitsOn(floor) : [];
  const quads = useMemo(() => [
    { k: 'A', d: 'M20 20 H150 V110 H110 V150 H20 Z' }, { k: 'B', d: 'M170 20 H300 V150 H210 V110 H170 Z' },
    { k: 'C', d: 'M20 170 H110 V210 H150 V300 H20 Z' }, { k: 'D', d: 'M210 170 H300 V300 H170 V210 H210 Z' },
  ], []);

  return (
    <main className="fs-page">
      <header className="fs-head">
        <span className="fs-eyebrow">Select a floor</span>
        <h1>Choose your level</h1>
        <p>Hover the tower to see each storey. Click one, or use ↑ ↓, to open its plan.</p>
      </header>
      <div className="fs-stage">
        <canvas ref={canvasRef} className="fs-canvas" aria-label="AFRAH tower, select a floor" />
        <div ref={tipRef} className={`fs-tip ${tip >= 0 && tip !== floor ? 'is-on' : ''}`}>
          {tip >= 0 && <><strong>Floor {label(tip)}</strong><span>{unitsOn(tip).filter((u) => STATUS(u) === 'available').length} residences available</span></>}
        </div>
        <ol className="fs-levels" aria-label="Floors">
          {Array.from({ length: FLOORS }, (_, i) => FLOORS - 1 - i).map((i) => (
            <li key={i}><button className={i === floor ? 'on' : ''} onClick={() => setFloor(i)}>{String(label(i)).padStart(2, '0')}</button></li>
          ))}
        </ol>
      </div>
      <aside ref={panelRef} className={`fs-panel ${floor >= 0 ? 'is-open' : ''}`} aria-live="polite">
        {floor >= 0 && <>
          <button className="fs-back" onClick={() => setFloor(-1)}>← Whole tower</button>
          <div className="fs-num"><span>{String(label(floor)).padStart(2, '0')}</span></div>
          <div className="fs-meta">
            <span>Floor {label(floor)} of {FIRST_LABEL + FLOORS - 1}</span>
            <span>{units.length} residences · {units.filter((u) => STATUS(u) === 'available').length} available</span>
            <span>Views: {['River & park', 'Old town', 'Courtyard garden', 'Skyline'][floor % 4]}</span>
          </div>
          <svg className="fs-plan" viewBox="0 0 320 320" aria-label={`Plan of floor ${label(floor)}`}>
            <rect x="120" y="120" width="80" height="80" className="fs-core" />
            <text x="160" y="164" className="fs-core-t">CORE</text>
            {quads.map((q) => {
              const u = units.find((x) => x.id.endsWith(q.k));
              const st = u ? STATUS(u) : 'none';
              return <g key={q.k} className={`fs-unit is-${st} ${unit && u && unit.id === u.id ? 'is-picked' : ''}`} onClick={() => u && st !== 'sold' && setUnit(u)}>
                <path d={q.d} pathLength="1" />
                <text x={q.k === 'A' || q.k === 'C' ? 64 : 256} y={q.k === 'A' || q.k === 'B' ? 70 : 250}>{q.k}</text>
                {u && <text className="t2" x={q.k === 'A' || q.k === 'C' ? 64 : 256} y={q.k === 'A' || q.k === 'B' ? 90 : 270}>{u.beds} bd · {u.area} m²</text>}
              </g>;
            })}
          </svg>
          <ul className="fs-list">
            {units.map((u) => (
              <li key={u.id}><button className={`is-${STATUS(u)} ${unit?.id === u.id ? 'on' : ''}`} disabled={STATUS(u) === 'sold'} onClick={() => setUnit(u)}>
                <b>{u.id}</b><span>{u.beds} bedroom{u.beds > 1 ? 's' : ''}</span><span>{u.area} m²</span><em>{STATUS(u)}</em>
              </button></li>
            ))}
          </ul>
          {unit && <div className="fs-unitcard" key={unit.id}>
            <div className="fs-unitplan"><Plan unit={unit} /></div>
            <div><strong>Residence {unit.id}</strong><span>{unit.beds} bedrooms · {unit.area} m² · {unit.aspect} aspect</span>
              <a className="fs-cta" href="/viewing">Request a viewing ↗</a></div>
          </div>}
        </>}
        {floor < 0 && <div className="fs-empty"><span>Select a floor on the tower</span><em>{FLOORS} residential floors · 4 residences per floor</em></div>}
      </aside>
    </main>
  );
}
