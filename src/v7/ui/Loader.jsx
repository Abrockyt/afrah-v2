import React, { useEffect, useMemo, useRef, useState } from 'react';
import { store, notify } from '../core/store';
import { gsap, stopScroll, startScroll } from '../core/ScrollManager';

// Loader: the tower rises. On a twilight ground the Lily draws itself in a
// single copper line while loading, storey by storey; an altimeter counts the
// levels up to 64. When everything is ready the bronze petals of the crown
// fill in, every window lights at once, and the screen dissolves into rose
// mist, which is exactly where the hero film begins: above the clouds.
// A click anywhere is the sound opt-in.

const FLOORS = 64;
// The Lily's outline (viewBox 0 0 240 520): a gently tapering shaft and the
// bud of bronze petals over the lantern, with its finial.
const ROOF = 196;
const OUTLINE = `M66 504 L72 ${ROOF} C64 150 88 96 120 62 C152 96 176 150 168 ${ROOF} L174 504 Z`;
// petals: lancets from the roof line closing on the tip
const petal = (x) => { const c = x + (120 - x) * 0.25; return `M${x - 3} ${ROOF} Q${c - 10} 120 120 62 Q${c + 8} 120 ${x + 3} ${ROOF} Z`; };
const LEAVES = [78, 90, 102, 114, 126, 138, 150, 162].map(petal);
// fins up the shaft, leaning with the twist
const FINS = Array.from({ length: 9 }, (_, i) => 76 + i * 11);
const levelY = (i) => 492 - (i / (FLOORS - 1)) * (492 - ROOF - 6);
const widthAt = () => [60, 180];

export default function Loader({ onSound }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);
  const floors = useMemo(() => Array.from({ length: FLOORS }, (_, i) => { const y = levelY(i), [a, b] = widthAt(y); return { y, a: a + 2, b: b - 2 }; }), []);

  useEffect(() => {
    stopScroll();
    const el = ref.current;
    const q = gsap.utils.selector(el);
    const line = q('.ld__outline')[0];
    const len = line.getTotalLength();
    gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
    const floorEls = q('.ld__floor');
    const numEl = q('.ld__num')[0];
    const state = { p: 0 };
    const paint = () => {
      const p = state.p;
      line.style.strokeDashoffset = String(len * (1 - Math.min(1, p * 1.15)));
      const lit = Math.floor(p * FLOORS);
      floorEls.forEach((f, i) => { f.style.opacity = i < lit ? '.55' : '0'; });
      numEl.textContent = String(Math.min(FLOORS, Math.max(0, Math.round(p * FLOORS)))).padStart(2, '0');
    };
    // creeps toward 88% while loading
    const creep = gsap.to(state, { p: 0.88, duration: 7, ease: 'power2.out', onUpdate: paint });

    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const gl = new Promise((res) => { const t = setInterval(() => { if (store.glReady || performance.now() > 25000) { clearInterval(t); res(); } }, 50); });
    const reveal = () => { store.ready = true; notify(); startScroll(); window.scrollTo(0, 0); };
    const started = performance.now();
    let tl, timer;
    Promise.all([fonts, gl]).then(() => {
      timer = setTimeout(() => {
        creep.kill();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { reveal(); setDone(true); return; }
        tl = gsap.timeline({ onComplete: () => setDone(true) })
          .to(state, { p: 1, duration: 0.7, ease: 'power2.out', onUpdate: paint })
          // the crown's leaves fill with bronze, the windows all light
          .fromTo(q('.ld__leaf'), { opacity: 0, scale: 0.6, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.02, ease: 'back.out(2)' }, 0.55)
          .to(floorEls, { opacity: 0.95, duration: 0.3, stagger: { each: 0.004, from: 'start' } }, 0.8)
          .to(q('.ld__glow'), { opacity: 1, duration: 0.8 }, 0.9)
          .to(q('.ld__meta'), { autoAlpha: 0, y: -12, duration: 0.5 }, 1.2)
          // rose mist rises over everything: the hero opens inside the cloud
          .to(q('.ld__mist'), { opacity: 1, duration: 1.1, ease: 'power2.inOut' }, 1.5)
          .to(q('.ld__tower'), { y: -60, scale: 1.08, opacity: 0, duration: 1.2, ease: 'power2.in' }, 1.45)
          .add(reveal, 2.4)
          .to(el, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 2.5);
      }, Math.max(0, 1600 - (performance.now() - started)));
    });
    return () => { clearTimeout(timer); creep.kill(); tl?.kill(); };
  }, []);

  return <div ref={ref} className={`ld loader ${done ? 'is-done' : ''}`} role="status" aria-live="polite" onClick={() => onSound?.(true)}>
    <span className="loader__sr">{done ? 'AFRAH loaded' : 'Loading AFRAH'}</span>
    <div className="ld__sky" aria-hidden="true" />
    <svg className="ld__tower" viewBox="0 0 240 520" aria-hidden="true">
      <defs>
        <linearGradient id="ldCopper" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#8f4a26" /><stop offset=".6" stopColor="#d88a52" /><stop offset="1" stopColor="#f4c89a" /></linearGradient>
        <radialGradient id="ldGlow" cx=".5" cy=".55" r=".6"><stop offset="0" stopColor="#ffb676" stopOpacity=".35" /><stop offset="1" stopColor="#ffb676" stopOpacity="0" /></radialGradient>
        <clipPath id="ldShaft"><path d={OUTLINE} /></clipPath>
      </defs>
      <ellipse className="ld__glow" cx="120" cy="300" rx="150" ry="260" fill="url(#ldGlow)" />
      <g clipPath="url(#ldShaft)">
        {floors.map((f, i) => <line key={i} className="ld__floor" x1={f.a} x2={f.b} y1={f.y} y2={f.y} />)}
        {FINS.map((x) => <line key={x} className="ld__fin" x1={x} y1={504} x2={x + 10} y2={ROOF} />)}
      </g>
      <line className="ld__finial" x1="120" y1="62" x2="120" y2="30" />
      {LEAVES.map((d, i) => <path key={i} className="ld__leaf" d={d} fill="url(#ldCopper)" />)}
      <path className="ld__outline" d={OUTLINE} />
    </svg>
    <div className="ld__meta" aria-hidden="true">
      <span className="ld__brand">AFRAH<em>residences</em></span>
      <span className="ld__alt"><b className="ld__num">00</b><i>/ {FLOORS}</i><em>Level</em></span>
      <span className="ld__line">Rising above the clouds</span>
    </div>
    <div className="ld__mist" aria-hidden="true" />
  </div>;
}
