import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {loadGLB, skin, environment, renderer as makeRenderer, disposeTree, TOWERS_CENTER, TALL_TOWER} from './era';

// The tower complex with day-to-night mineral materials and moving sunlight.
//   sun    — a time-of-day value (ref, 0 = 06:00 … 1 = 22:00) moves the sun and the shadows
//   select — hover / click the tall tower; the chosen level glows as a white band
export const LEVELS = 26;
const levelH = (TALL_TOWER.top - TALL_TOWER.base) / LEVELS;
const inTall = p => Math.abs(p.x - TALL_TOWER.x) < 28 && Math.abs(p.z - TALL_TOWER.z) < 25;

// Adds a world-space horizontal highlight band to a material (used for the chosen level).
function addBand(material, uniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nuniform vec2 uSel; uniform vec2 uHov; uniform vec2 uC;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        bool tall = abs(vWorldPos.x - uC.x) < 28.0 && abs(vWorldPos.z - uC.y) < 25.0;
        float s = tall && vWorldPos.y > uSel.x && vWorldPos.y < uSel.y ? 1.0 : 0.0;
        float h = tall && vWorldPos.y > uHov.x && vWorldPos.y < uHov.y ? 1.0 : 0.0;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), max(s * .78, h * .38));`);
  };
  material.needsUpdate = true;
}

export default function Building({mode = 'sun', sun, selected = null, onSelect, onHover, className = ''}) {
  const host = useRef(), live = useRef({});
  live.current = {sun, selected, onSelect, onHover};

  useEffect(() => {
    const el = host.current;
    let r;
    try { r = makeRenderer(el, {shadows: true}); } catch { el.classList.add('no-webgl'); return; }
    const scene = new THREE.Scene();
    const env = environment(r); scene.environment = env.texture;
    const camera = new THREE.PerspectiveCamera(28, 1, 5, 6000);
    const hemi = new THREE.HemisphereLight('#d9ecf4', '#716455', .85); scene.add(hemi);
    const sunLight = new THREE.DirectionalLight('#ffe4bf', 2.2); sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(4096, 4096); Object.assign(sunLight.shadow.camera, {left: -420, right: 420, top: 420, bottom: -420, near: 50, far: 2200}); sunLight.shadow.bias = -.0004;
    sunLight.target.position.copy(TOWERS_CENTER); scene.add(sunLight, sunLight.target);

    // Ground: shadow catcher + Composites-style technical grid.
    const groundGeo = new THREE.PlaneGeometry(4000, 4000), groundMat = new THREE.ShadowMaterial({opacity: .38});
    const ground = new THREE.Mesh(groundGeo, groundMat); ground.rotation.x = -Math.PI / 2; ground.position.set(TOWERS_CENTER.x, 2.8, TOWERS_CENTER.z); ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(1600, 64, '#bc9671', '#bc9671'); grid.material.transparent = true; grid.material.opacity = .12; grid.position.set(TOWERS_CENTER.x, 2.9, TOWERS_CENTER.z); scene.add(grid);

    const uniforms = {uSel: {value: new THREE.Vector2(-1, -1)}, uHov: {value: new THREE.Vector2(-1, -1)}, uC: {value: new THREE.Vector2(TALL_TOWER.x, TALL_TOWER.z)}};
    let model, skinned, disposed = false;
    const pickables = [];
    loadGLB('era-building.glb').then(root => {
      if (disposed) return disposeTree(root);
      skinned = skin(root, mode === 'select' ? 'night' : 'day');
      if (mode === 'select') Object.values(skinned.materials).forEach(m => addBand(m, uniforms));
      root.traverse(o => { if (o.isMesh) pickables.push(o); });
      model = root; scene.add(root); el.classList.add('ready');
    });

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; r.setSize(w, h); camera.aspect = w / h;
      if (mode === 'sun' && w > 900) camera.setViewOffset(w, h, -w * .14, 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
    let px = 0, py = 0, drag = null, moved = 0, spin = .6, spinTarget = .6, hovered = null;
    const onMove = e => {
      const b = el.getBoundingClientRect(); px = (e.clientX - b.left) / b.width - .5; py = (e.clientY - b.top) / b.height - .5; ndc.set(px * 2, -py * 2);
      if (drag !== null) { spinTarget += (e.clientX - drag) * .006; moved += Math.abs(e.clientX - drag); drag = e.clientX; }
    };
    const onDown = e => { if (mode !== 'select') return; drag = e.clientX; moved = 0; el.setPointerCapture?.(e.pointerId); };
    const onUp = () => { if (mode === 'select' && drag !== null && moved < 6 && hovered) live.current.onSelect?.(hovered); drag = null; };
    const onLeave = () => { ndc.set(-9, -9); if (hovered) { hovered = null; live.current.onHover?.(null); } };
    const onKey = e => { if (e.key === 'ArrowLeft') spinTarget -= .3; if (e.key === 'ArrowRight') spinTarget += .3; };
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerdown', onDown); el.addEventListener('pointerup', onUp); el.addEventListener('pointerleave', onLeave); el.addEventListener('keydown', onKey);

    let visible = true, frame, last = performance.now(), smSun = .45;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, {rootMargin: '150px'}); io.observe(el);
    const sky = new THREE.Color(), daylight = new THREE.Color('#c9dfe5'), sunset = new THREE.Color('#d8a590'), midnight = new THREE.Color('#142e40');
    const band = f => f ? [TALL_TOWER.base + (f - 1) * levelH, TALL_TOWER.base + f * levelH] : [-1, -1];
    const loop = now => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min((now - last) / 1000, .05); last = now; const L = live.current, mobile = el.clientWidth < 700;
      spin = THREE.MathUtils.damp(spin, spinTarget, 6, dt);

      if (mode === 'sun') {
        smSun = THREE.MathUtils.damp(smSun, L.sun?.current ?? .45, 5, dt);
        const a = THREE.MathUtils.lerp(-.08, Math.PI + .08, Math.min(smSun / .9, 1)), elev = Math.max(Math.sin(a), .05);
        sunLight.position.set(TOWERS_CENTER.x + Math.cos(a) * 900, elev * 1100 + 40, TOWERS_CENTER.z + 500);
        const night = THREE.MathUtils.smoothstep(smSun, .8, 1);
        sunLight.intensity = (1 - night) * 2.55 + .18; hemi.intensity = .42 + (1 - night) * .6;
        sunLight.color.set('#ffe5c0').lerp(new THREE.Color('#d4a0a1'), THREE.MathUtils.smoothstep(smSun, .55, .85));
        sky.copy(daylight).lerp(sunset, THREE.MathUtils.smoothstep(smSun, .62, .85)).lerp(midnight, night);
        scene.background = sky; groundMat.opacity = .38 * (1 - night);
        if (skinned?.materials.glass) skinned.materials.glass.emissiveIntensity = night * 1.2;
        const ang = .8 + px * .3, dist = mobile ? 1250 : 950;
        camera.position.set(TOWERS_CENTER.x + Math.sin(ang) * dist, 330 - py * 80, TOWERS_CENTER.z + Math.cos(ang) * dist);
        camera.lookAt(TOWERS_CENTER.x, 115, TOWERS_CENTER.z);
      } else {
        scene.background = midnight; sunLight.position.set(TOWERS_CENTER.x - 600, 900, TOWERS_CENTER.z + 700); sunLight.intensity = 1.35; hemi.intensity = .42;
        if (skinned?.materials.glass) skinned.materials.glass.emissiveIntensity = .35;
        const dist = mobile ? 1350 : 1050;
        camera.position.set(TALL_TOWER.x + Math.sin(spin) * dist, 260 - py * 60, TALL_TOWER.z + Math.cos(spin) * dist);
        camera.lookAt(TALL_TOWER.x, 128, TALL_TOWER.z);
        if (drag === null && model) {
          ray.setFromCamera(ndc, camera);
          const hit = ray.intersectObjects(pickables, false)[0];
          const f = hit && inTall(hit.point) ? THREE.MathUtils.clamp(Math.floor((hit.point.y - TALL_TOWER.base) / levelH) + 1, 1, LEVELS) : null;
          if (f !== hovered) { hovered = f; L.onHover?.(f); el.style.cursor = f ? 'pointer' : 'grab'; }
        }
        uniforms.uSel.value.set(...band(L.selected)); uniforms.uHov.value.set(...band(hovered));
      }
      r.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('keydown', onKey);
      if (model) disposeTree(model); skinned?.dispose(); groundGeo.dispose(); groundMat.dispose(); grid.geometry.dispose(); grid.material.dispose(); env.dispose(); r.dispose(); r.domElement.remove();
    };
  }, [mode]);

  return <div ref={host} className={`v-building ${className}`} tabIndex={mode === 'select' ? 0 : undefined} role="img"
    aria-label={mode === 'select' ? 'ERA tower model. Drag or use arrow keys to rotate; click a level of the tall tower to select it.' : 'ERA tower model lit by the sun'}/>;
}
