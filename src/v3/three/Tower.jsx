import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Procedural AFRAH tower: stepped Art Deco crown (ERA), vertical fins (LIKOVA),
// copper composite ribbons (Composites.archi). One scene, three modes:
//   assemble — floors fly in with scroll progress (Home)
//   sun      — draggable time of day moves the sun and shadows (Architecture)
//   select   — hover / click floors to choose a residence (Residences)
export const FLOORS = 26;
const FLOOR_H = .36;
const footprint = i => i < 14 ? [3.3, 2.5] : i < 20 ? [2.75, 2.05] : i < 24 ? [2.15, 1.65] : [1.55, 1.2];

const skyDay = new THREE.Color('#9fbbe0'), skyDusk = new THREE.Color('#e7a386'), skyNight = new THREE.Color('#0b1430');
function skyAt(t) { // t: 0 = 06:00, 1 = 22:00
  const c = new THREE.Color();
  if (t < .15) return c.copy(skyDusk).lerp(skyDay, t / .15);
  if (t < .7) return c.copy(skyDay);
  if (t < .85) return c.copy(skyDay).lerp(skyDusk, (t - .7) / .15);
  return c.copy(skyDusk).lerp(skyNight, Math.min(1, (t - .85) / .15));
}

export default function Tower({mode = 'assemble', progress, sun, selected = null, onSelect, onHover, transparent = true, className = ''}) {
  const host = useRef();
  const live = useRef({});
  live.current = {progress, sun, selected, onSelect, onHover};

  useEffect(() => {
    const el = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({antialias: true, alpha: transparent, powerPreference: 'high-performance'}); } catch { el.classList.add('no-webgl'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = mode !== 'assemble';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    const env = pmrem.fromScene(room, .04); scene.environment = env.texture; room.dispose(); pmrem.dispose();

    const hemi = new THREE.HemisphereLight('#f6e2d0', '#1a2240', .9); scene.add(hemi);
    const sunLight = new THREE.DirectionalLight('#ffe2c4', 2.4);
    sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
    Object.assign(sunLight.shadow.camera, {left: -9, right: 9, top: 12, bottom: -6, near: 1, far: 60});
    sunLight.shadow.bias = -.0004; scene.add(sunLight, sunLight.target);

    // Materials
    const stone = new THREE.MeshStandardMaterial({color: '#ece2d6', roughness: .62, metalness: .02});
    const copper = new THREE.MeshStandardMaterial({color: '#c9866a', roughness: .28, metalness: .9, envMapIntensity: 1.3});
    const ribbon = new THREE.MeshStandardMaterial({color: '#e3a083', roughness: .22, metalness: .95, side: THREE.DoubleSide, envMapIntensity: 1.5});

    const tower = new THREE.Group(); scene.add(tower);
    const floors = [], pickables = [], disposables = [stone, copper, ribbon];
    const finGeo = new THREE.BoxGeometry(.045, FLOOR_H * .98, .16); disposables.push(finGeo);

    for (let i = 0; i < FLOORS; i++) {
      const [w, d] = footprint(i), g = new THREE.Group();
      g.userData.floor = i + 1; g.position.y = i * FLOOR_H;
      const slabGeo = new THREE.BoxGeometry(w + .12, .06, d + .12);
      const glassGeo = new THREE.BoxGeometry(w, FLOOR_H - .06, d);
      const glass = new THREE.MeshPhysicalMaterial({color: '#1d2b4d', roughness: .06, metalness: .35, envMapIntensity: 1.6, clearcoat: 1, emissive: new THREE.Color('#f2b07e'), emissiveIntensity: 0});
      glass.userData.lit = .35 + Math.random() * .65;
      const slab = new THREE.Mesh(slabGeo, stone), box = new THREE.Mesh(glassGeo, glass);
      slab.castShadow = slab.receiveShadow = box.castShadow = box.receiveShadow = true;
      box.position.y = FLOOR_H / 2; box.userData.floor = i + 1; slab.userData.floor = i + 1;
      g.add(slab, box); pickables.push(box, slab);
      // vertical fins along the long facades
      const count = Math.round(w / .26);
      for (let k = 0; k <= count; k++) {
        for (const side of [-1, 1]) {
          const fin = new THREE.Mesh(finGeo, copper);
          fin.position.set(-w / 2 + k * (w / count), FLOOR_H / 2, side * (d / 2 + .06)); fin.castShadow = true; g.add(fin);
        }
      }
      disposables.push(slabGeo, glassGeo, glass);
      g.userData.glass = glass; g.userData.base = i * FLOOR_H;
      tower.add(g); floors.push(g);
    }

    // Crown: stepped copper arches rising above the last floor (ERA silhouette).
    const crown = new THREE.Group(); crown.position.y = FLOORS * FLOOR_H; tower.add(crown);
    [[1.3, 1.9], [.95, 2.7], [.55, 3.4]].forEach(([r, h], k) => {
      const geo = new THREE.TorusGeometry(r, .035, 8, 64, Math.PI); disposables.push(geo);
      for (const rot of [0, Math.PI / 2]) {
        const m = new THREE.Mesh(geo, copper); m.rotation.y = rot; m.scale.y = h / r * .55; m.castShadow = true; crown.add(m);
      }
      const ringGeo = new THREE.TorusGeometry(r * .82, .02, 6, 48); disposables.push(ringGeo);
      const ring = new THREE.Mesh(ringGeo, copper); ring.rotation.x = Math.PI / 2; ring.position.y = k * .35; crown.add(ring);
    });
    const spireGeo = new THREE.CylinderGeometry(.005, .05, 2.4, 8); disposables.push(spireGeo);
    const spire = new THREE.Mesh(spireGeo, copper); spire.position.y = 2.4; crown.add(spire);

    // Composite ribbons spiralling around the podium (Composites.archi sculpture language).
    const ribbons = new THREE.Group(); tower.add(ribbons);
    for (let r = 0; r < 3; r++) {
      const pts = [];
      for (let s = 0; s <= 120; s++) {
        const t = s / 120, a = t * Math.PI * 2.2 + r * 2.1, rad = 2.9 + Math.sin(t * Math.PI * 3 + r) * .35;
        pts.push(new THREE.Vector3(Math.cos(a) * rad, t * 4.2 - .2, Math.sin(a) * rad * .82));
      }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, .03 + r * .008, 8); disposables.push(geo);
      const m = new THREE.Mesh(geo, ribbon); m.castShadow = true; ribbons.add(m);
    }

    // Ground: shadow catcher + Composites-style technical grid.
    const groundGeo = new THREE.CircleGeometry(16, 64), groundMat = new THREE.ShadowMaterial({opacity: .28});
    const ground = new THREE.Mesh(groundGeo, groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(32, 64, '#e3a083', '#e3a083'); grid.material.transparent = true; grid.material.opacity = .14; grid.position.y = .001; scene.add(grid);
    const ringsGroup = new THREE.Group(); scene.add(ringsGroup);
    [4.2, 6.5, 9].forEach(r => {
      const geo = new THREE.RingGeometry(r, r + .015, 128), mat = new THREE.MeshBasicMaterial({color: '#e3a083', transparent: true, opacity: .35, side: THREE.DoubleSide});
      const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = .002; ringsGroup.add(m); disposables.push(geo, mat);
    });
    disposables.push(groundGeo, groundMat, grid.geometry, grid.material);

    // On wide screens the Home/Architecture tower sits right of centre, leaving the left for captions.
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h;
      if (mode !== 'select' && w > 900) camera.setViewOffset(w, h, -w * (mode === 'sun' ? .14 : .2), 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    // Pointer: parallax in every mode, drag-rotate + picking in select mode.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
    let px = 0, py = 0, drag = null, spin = mode === 'select' ? -.5 : 0, spinTarget = spin, hovered = null, moved = 0;
    const onMove = e => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5;
      ndc.set(px * 2, -py * 2);
      if (drag !== null) { spinTarget += (e.clientX - drag) * .008; moved += Math.abs(e.clientX - drag); drag = e.clientX; }
    };
    const onDown = e => { if (mode !== 'select') return; drag = e.clientX; moved = 0; el.setPointerCapture?.(e.pointerId); };
    const onUp = () => {
      if (mode === 'select' && drag !== null && moved < 6 && hovered) live.current.onSelect?.(hovered);
      drag = null;
    };
    const onLeave = () => { ndc.set(-9, -9); if (hovered) { hovered = null; live.current.onHover?.(null); } };
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp); el.addEventListener('pointerleave', onLeave);
    const onKey = e => { if (mode !== 'select') return; if (e.key === 'ArrowLeft') spinTarget -= .3; if (e.key === 'ArrowRight') spinTarget += .3; };
    el.addEventListener('keydown', onKey);

    let visible = true, frame, last = performance.now(), sm = 0, smSun = .5, t0 = performance.now();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, {rootMargin: '200px'}); io.observe(el);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tmp = new THREE.Color();

    const render = now => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden) return;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      const time = (now - t0) / 1000, L = live.current, mobile = el.clientWidth < 700;
      const p = L.progress ? L.progress.current : 1;
      sm = THREE.MathUtils.damp(sm, p, 4, dt);
      smSun = THREE.MathUtils.damp(smSun, L.sun ? L.sun.current : (mode === 'assemble' ? .9 + sm * .12 : .92), 4, dt);
      spin = THREE.MathUtils.damp(spin, spinTarget, 6, dt);

      // Sun position on an arc from east (morning) to west (evening).
      const a = THREE.MathUtils.lerp(-.1, Math.PI + .1, Math.min(smSun / .92, 1));
      const elev = Math.max(Math.sin(a), .04);
      sunLight.position.set(Math.cos(a) * 16, elev * 18 + 1, 6);
      const night = THREE.MathUtils.smoothstep(smSun, .82, 1);
      sunLight.intensity = (1 - night) * 2.6 + .15;
      sunLight.color.set(elev < .35 ? '#ffb48a' : '#fff1de');
      hemi.intensity = .35 + (1 - night) * .7;
      if (!transparent) { scene.background = skyAt(smSun); }

      floors.forEach((g, i) => {
        const f = i + 1, glass = g.userData.glass;
        let y = g.userData.base, s = 1, rot = 0;
        if (mode === 'assemble') {
          const start = (i / FLOORS) * .62, t = reduced ? 1 : THREE.MathUtils.smoothstep(sm, start, start + .26);
          y += (1 - t) * (6 + i * .08); rot = (1 - t) * (i % 2 ? 1 : -1) * .9; s = .3 + t * .7;
          g.visible = t > .01;
        }
        const isSel = L.selected === f, isHover = hovered === f;
        const out = mode === 'select' ? (isSel ? .5 : isHover ? .22 : 0) : 0;
        g.position.set(out * .6, y, out);
        g.rotation.y = THREE.MathUtils.damp(g.rotation.y, rot, 8, dt); g.scale.setScalar(s);
        const lit = night * glass.userData.lit * (0.6 + .4 * Math.sin(time * .6 + i)) * (mode === 'select' ? .18 : 1);
        const target = isSel ? 2.4 : isHover ? 1.1 : lit;
        glass.emissiveIntensity = THREE.MathUtils.damp(glass.emissiveIntensity, target, 6, dt);
        glass.emissive.copy(tmp.set(isSel || isHover ? '#e3a083' : '#f6b67e'));
      });
      crown.scale.setScalar(mode === 'assemble' ? THREE.MathUtils.smoothstep(sm, .78, 1) + .0001 : 1);
      ribbons.rotation.y = time * .06 + (mode === 'assemble' ? sm * 2 : 0);
      ribbons.scale.setScalar(mode === 'assemble' ? .6 + THREE.MathUtils.smoothstep(sm, .1, .6) * .4 : 1);
      ringsGroup.children.forEach((m, k) => { m.scale.setScalar(1 + ((time * .08 + k * .33) % 1) * .25); m.material.opacity = .35 * (1 - ((time * .08 + k * .33) % 1)); });

      // Hover picking.
      if (mode === 'select' && drag === null) {
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(pickables, false)[0];
        const f = hit ? hit.object.userData.floor : null;
        if (f !== hovered) { hovered = f; L.onHover?.(f); el.style.cursor = f ? 'pointer' : 'grab'; }
      }

      // Camera choreography.
      const H = FLOORS * FLOOR_H;
      if (mode === 'assemble') {
        const ang = -.9 + sm * 1.9 + px * .25, dist = (mobile ? 30 : 23) - sm * 3;
        camera.position.set(Math.sin(ang) * dist, 3 + sm * 6 - py * 2, Math.cos(ang) * dist);
        camera.lookAt(0, H * .45, 0);
      } else if (mode === 'sun') {
        const ang = .55 + px * .35, dist = mobile ? 42 : 34;
        camera.position.set(Math.sin(ang) * dist, 10 - py * 3, Math.cos(ang) * dist);
        camera.lookAt(0, H * .5, 0);
      } else {
        tower.rotation.y = spin + (drag === null && !reduced ? Math.sin(time * .2) * .05 : 0);
        const dist = mobile ? 38 : 31;
        camera.position.set(dist * .15, H * .62 - py * 2, dist);
        camera.lookAt(0, H * .56, 0);
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    el.classList.add('ready');

    return () => {
      cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('keydown', onKey);
      disposables.forEach(d => d.dispose?.()); env.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [mode, transparent]);

  return <div ref={host} className={`v-tower ${className}`} tabIndex={mode === 'select' ? 0 : undefined}
    aria-label={mode === 'select' ? 'Interactive tower. Drag or use arrow keys to rotate, click a floor to select it.' : 'AFRAH tower model'} role="img"/>;
}
