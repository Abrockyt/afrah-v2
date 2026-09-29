import React, { useEffect, useRef, useState } from 'react';
import { store, notify } from '../core/store';
import { gsap, stopScroll, startScroll } from '../core/ScrollManager';

// Loader: the clock of the Lily's lantern. A European clock dial is drawn in
// gold on sapphire while the site loads: the ring draws itself, a glint runs
// round it, the Roman numerals light as the hands pass them. When everything
// is ready the ring flares, the hands reach twelve, and the dial opens out
// into rose mist, which is where the hero film begins.
// A click anywhere is the sound opt-in.

const NUMERALS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const C = 300;
const polar = (r, a) => [C + r * Math.sin(a), C - r * Math.cos(a)];

export default function Loader({ onSound }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    stopScroll();
    const el = ref.current;
    const q = gsap.utils.selector(el);
    const ring = q('.lk__ring');
    const nums = q('.lk__num');
    const numEl = q('.lk__pct b')[0];
    gsap.set(ring, { strokeDasharray: 1, strokeDashoffset: 1 });
    const state = { p: 0 };
    const paint = () => {
      const p = state.p;
      gsap.set(ring, { strokeDashoffset: 1 - p });
      gsap.set(q('.lk__min'), { rotation: p * 360, svgOrigin: `${C} ${C}` });
      gsap.set(q('.lk__hour'), { rotation: p * 30, svgOrigin: `${C} ${C}` });
      nums.forEach((n, i) => { n.style.opacity = p * 12 >= i ? 1 : 0.18; });
      numEl.textContent = String(Math.round(p * 100)).padStart(2, '0');
    };
    paint();
    const creep = gsap.to(state, { p: 0.86, duration: 6, ease: 'power2.out', onUpdate: paint });
    const glint = gsap.to(q('.lk__glint'), { rotation: 360, svgOrigin: `${C} ${C}`, duration: 3.2, ease: 'none', repeat: -1 });
    const rays = gsap.to(q('.lk__rays'), { rotation: -360, svgOrigin: `${C} ${C}`, duration: 60, ease: 'none', repeat: -1 });

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
          .to(state, { p: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: paint })
          .to(q('.lk__flare'), { opacity: 1, duration: 0.5 }, 0.7)
          .to(q('.lk__meta'), { autoAlpha: 0, y: -10, duration: 0.5 }, 1.2)
          .to(q('.lk__dial'), { scale: 1.35, opacity: 0, duration: 1.3, ease: 'power2.in', transformOrigin: '50% 50%' }, 1.3)
          .to(q('.lk__mist'), { opacity: 1, duration: 1.1, ease: 'power2.inOut' }, 1.5)
          .add(reveal, 2.4)
          .to(el, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 2.5);
      }, Math.max(0, 1800 - (performance.now() - started)));
    });
    return () => { clearTimeout(timer); creep.kill(); glint.kill(); rays.kill(); tl?.kill(); };
  }, []);

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    const [x1, y1] = polar(big ? 236 : 246, a), [x2, y2] = polar(256, a);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={big ? 'lk__tick lk__tick--big' : 'lk__tick'} />;
  });
  const rays = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2, [x1, y1] = polar(62, a), [x2, y2] = polar(i % 2 ? 150 : 170, a);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });
  const g0 = polar(270, -0.18);
  return <div ref={ref} className={`lk loader ${done ? 'is-done' : ''}`} role="status" aria-live="polite" onClick={() => onSound?.(true)}>
    <span className="loader__sr">{done ? 'AFRAH loaded' : 'Loading AFRAH'}</span>
    <div className="lk__dial">
      <svg viewBox="0 0 600 600" aria-hidden="true">
        <defs>
          <linearGradient id="lkGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3e2b8" /><stop offset=".5" stopColor="#c9a86a" /><stop offset="1" stopColor="#8f7440" /></linearGradient>
          <filter id="lkBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <circle cx={C} cy={C} r="270" className="lk__track" />
        <circle cx={C} cy={C} r="270" className="lk__ring lk__ring--glow" pathLength="1" transform={`rotate(-90 ${C} ${C})`} filter="url(#lkBlur)" />
        <circle cx={C} cy={C} r="270" className="lk__ring" pathLength="1" transform={`rotate(-90 ${C} ${C})`} />
        <circle cx={C} cy={C} r="270" className="lk__flare" filter="url(#lkBlur)" />
        <g className="lk__glint"><path d={`M${g0[0]} ${g0[1]} A270 270 0 0 1 ${C} ${C - 270}`} filter="url(#lkBlur)" /></g>
        <g className="lk__ticks">{ticks}</g>
        <circle cx={C} cy={C} r="186" className="lk__inner" />
        <g className="lk__rays">{rays}</g>
        {NUMERALS.map((n, i) => { const [x, y] = polar(212, (i / 12) * Math.PI * 2); return <text key={n} x={x} y={y} className="lk__num" textAnchor="middle" dominantBaseline="central">{n}</text>; })}
        <g className="lk__hour"><path d={`M${C} ${C + 18} L${C} ${C - 120}`} /><path d={`M${C - 7} ${C - 112} L${C} ${C - 134} L${C + 7} ${C - 112} Z`} /></g>
        <g className="lk__min"><path d={`M${C} ${C + 26} L${C} ${C - 200}`} /><path d={`M${C - 6} ${C - 190} L${C} ${C - 216} L${C + 6} ${C - 190} Z`} /></g>
        <circle cx={C} cy={C} r="7" className="lk__pin" />
      </svg>
    </div>
    <div className="lk__meta" aria-hidden="true">
      <span className="lk__brand"><b>AFRAH</b><em>Residences above the city</em></span>
      <span className="lk__pct"><b>00</b><i>%</i></span>
      <span className="lk__est">Est. MMXXVI</span>
    </div>
    <div className="lk__mist ld__mist" aria-hidden="true" />
  </div>;
}
