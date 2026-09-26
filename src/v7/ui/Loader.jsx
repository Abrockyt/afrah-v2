import React, { useEffect, useMemo, useRef, useState } from 'react';
import { store, notify } from '../core/store';
import { gsap, stopScroll, startScroll } from '../core/ScrollManager';
import { LilyMark } from './NavParts';

// Loader: a city drawn in light. After ERA's glowing line lattice, but made of
// AFRAH's own buildings: three rows of Lily and Wave towers and arcades draw
// themselves in fine lines while the site loads, a banded bronze gradient
// slides along every line so the drawing shimmers, and rings of light open
// behind the Lily. When everything is ready the lines flare, the wordmark
// settles, and the screen dissolves into rose mist, where the hero begins.
// A click anywhere is the sound opt-in.

function rng(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }

// Building vectors (viewBox 1440 × 900, y down, `b` = ground line)
const lily = (x, b, h, w) => {
  const s = b - h * 0.74, t = b - h;
  return [
    `M${x - w / 2} ${b} L${x - w * 0.44} ${s} C${x - w * 0.62} ${s - h * 0.1} ${x - w * 0.22} ${t + h * 0.06} ${x} ${t} C${x + w * 0.22} ${t + h * 0.06} ${x + w * 0.62} ${s - h * 0.1} ${x + w * 0.44} ${s} L${x + w / 2} ${b}`,
    `M${x - w * 0.44} ${s} C${x - w * 0.2} ${s - h * 0.12} ${x - w * 0.08} ${t + h * 0.08} ${x} ${t} M${x + w * 0.44} ${s} C${x + w * 0.2} ${s - h * 0.12} ${x + w * 0.08} ${t + h * 0.08} ${x} ${t}`,
    `M${x} ${t} L${x} ${t - h * 0.07}`,
    `M${x - w * 0.16} ${b} L${x - w * 0.14} ${s} M${x + w * 0.16} ${b} L${x + w * 0.14} ${s}`,
  ];
};
const wave = (x, b, h, w, r) => {
  const t = b - h, out = [`M${x - w / 2} ${b} L${x - w / 2} ${t + w * 0.3} Q${x - w / 2} ${t} ${x} ${t} Q${x + w / 2} ${t} ${x + w / 2} ${t + w * 0.3} L${x + w / 2} ${b}`];
  let d = '';
  for (let y = t + w * 0.36; y < b - 8; y += 13) {
    const a = 3 + 3 * Math.sin(y * 0.05 + r * 6);
    d += `M${x - w / 2 - a} ${y} Q${x} ${y + (r > 0.5 ? 4 : -4)} ${x + w / 2 + a} ${y} `;
  }
  out.push(d);
  return out;
};
const arcade = (x, b, w, n, h) => {
  let d = `M${x} ${b} L${x} ${b - h} L${x + w} ${b - h} L${x + w} ${b} `;
  const aw = w / n;
  for (let i = 0; i < n; i++) { const ax = x + i * aw + aw * 0.15, bw = aw * 0.7; d += `M${ax} ${b} L${ax} ${b - h * 0.45} A${bw / 2} ${bw / 2} 0 0 1 ${ax + bw} ${b - h * 0.45} L${ax + bw} ${b} `; }
  return [d];
};

function buildCity() {
  const rows = [];
  const R = rng(11);
  [[640, 0.55, 0.34], [760, 0.8, 0.62], [880, 1, 1]].forEach(([b, k, o], ri) => {
    const paths = [];
    let x = -40 - R() * 60;
    while (x < 1500) {
      const r = R(), w = (34 + R() * 34) * k, h = (180 + R() * 300) * k;
      if (r < 0.34) paths.push(...lily(x + w / 2, b, h * 1.15, w));
      else if (r < 0.8) paths.push(...wave(x + w / 2, b, h, w, R()));
      else { const aw = (90 + R() * 80) * k; paths.push(...arcade(x, b, aw, 3 + Math.floor(R() * 3), 60 * k + R() * 40 * k)); x += aw - w; }
      x += w + (10 + R() * 30) * k;
    }
    paths.push(`M-20 ${b} L1460 ${b}`);
    rows.push({ o, paths, sw: 0.6 + ri * 0.35 });
  });
  // the hero: one tall Lily at the centre, with rings of light behind it
  const hero = lily(720, 880, 560, 110);
  return { rows, hero };
}

export default function Loader({ onSound }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);
  const city = useMemo(buildCity, []);

  useEffect(() => {
    stopScroll();
    const el = ref.current;
    const q = gsap.utils.selector(el);
    const lines = q('.lx__draw');
    const numEl = q('.lx__num')[0];
    gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
    // each line draws in its turn as loading progresses
    const draw = gsap.timeline({ paused: true });
    lines.forEach((l, i) => draw.to(l, { strokeDashoffset: 0, duration: 0.5, ease: 'power1.inOut' }, (i / lines.length) * 0.5));
    const state = { p: 0 };
    const paint = () => { draw.progress(state.p); numEl.textContent = String(Math.round(state.p * 100)).padStart(2, '0'); };
    const creep = gsap.to(state, { p: 0.86, duration: 6, ease: 'power2.out', onUpdate: paint });
    // the shimmer: the banded gradient slides across the city, forever
    const shimmer = gsap.fromTo(q('.lx__band'), { attr: { gradientTransform: 'translate(-1440 0)' } }, { attr: { gradientTransform: 'translate(1440 0)' }, duration: 5.5, ease: 'none', repeat: -1 });
    const rings = gsap.fromTo(q('.lx__ring'), { attr: { r: 40 }, opacity: 0.8 }, { attr: { r: 520 }, opacity: 0, duration: 4.5, ease: 'power1.out', stagger: 1.5, repeat: -1 });

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
          .to(state, { p: 1, duration: 0.8, ease: 'power2.out', onUpdate: paint })
          // the city flares, the wordmark settles
          .to(q('.lx__glow'), { opacity: 1, duration: 0.7 }, 0.5)
          .to(q('.lx__hero .lx__draw'), { strokeWidth: 2.2, duration: 0.7 }, 0.5)
          .to(q('.lx__meta'), { autoAlpha: 0, y: -10, duration: 0.5 }, 1.3)
          .to(q('.lx__mist'), { opacity: 1, duration: 1.1, ease: 'power2.inOut' }, 1.5)
          .to(q('.lx__svg'), { scale: 1.06, opacity: 0, duration: 1.3, ease: 'power2.in', transformOrigin: '50% 80%' }, 1.4)
          .add(reveal, 2.4)
          .to(el, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 2.5);
      }, Math.max(0, 1800 - (performance.now() - started)));
    });
    return () => { clearTimeout(timer); creep.kill(); shimmer.kill(); rings.kill(); tl?.kill(); };
  }, []);

  const bandStops = Array.from({ length: 21 }, (_, i) => <stop key={i} offset={i / 20} stopColor={i === 18 ? '#f6d2b8' : '#e3a98b'} stopOpacity={i % 2 ? 1 : 0.22} />);
  return <div ref={ref} className={`lx loader ${done ? 'is-done' : ''}`} role="status" aria-live="polite" onClick={() => onSound?.(true)}>
    <span className="loader__sr">{done ? 'AFRAH loaded' : 'Loading AFRAH'}</span>
    <svg className="lx__svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="lxBand" className="lx__band" x1="0" y1="0" x2="1440" y2="360" gradientUnits="userSpaceOnUse" spreadMethod="repeat">{bandStops}</linearGradient>
        <linearGradient id="lxFadeY" x1="0" y1="0" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#16291f" /><stop offset=".3" stopColor="#16291f" stopOpacity="0" /><stop offset=".92" stopColor="#16291f" stopOpacity="0" /><stop offset="1" stopColor="#16291f" /></linearGradient>
        <linearGradient id="lxFadeX" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#16291f" /><stop offset=".14" stopColor="#16291f" stopOpacity="0" /><stop offset=".86" stopColor="#16291f" stopOpacity="0" /><stop offset="1" stopColor="#16291f" /></linearGradient>
        <filter id="lxBlur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.2" /></filter>
      </defs>
      <g className="lx__rings">{[0, 1, 2].map((i) => <circle key={i} className="lx__ring" cx="720" cy="360" r="40" />)}</g>
      {city.rows.map((row, ri) => (
        <g key={ri} opacity={row.o}>
          <g className="lx__glow" filter="url(#lxBlur)">{row.paths.map((d, i) => <path key={i} d={d} pathLength="1" className="lx__draw" stroke="url(#lxBand)" strokeWidth={row.sw * 2.4} />)}</g>
          <g>{row.paths.map((d, i) => <path key={i} d={d} pathLength="1" className="lx__draw" stroke="url(#lxBand)" strokeWidth={row.sw} />)}</g>
        </g>
      ))}
      <g className="lx__hero">
        <g className="lx__glow" filter="url(#lxBlur)">{city.hero.map((d, i) => <path key={i} d={d} pathLength="1" className="lx__draw" stroke="url(#lxBand)" strokeWidth="3.4" />)}</g>
        {city.hero.map((d, i) => <path key={i} d={d} pathLength="1" className="lx__draw" stroke="url(#lxBand)" strokeWidth="1.5" />)}
      </g>
      <rect width="1440" height="900" fill="url(#lxFadeY)" /><rect width="1440" height="900" fill="url(#lxFadeX)" />
    </svg>
    <div className="lx__meta" aria-hidden="true">
      <span className="lx__brand"><LilyMark size={30} /><b>AFRAH</b><em>residences above the city</em></span>
      <span className="lx__count"><b className="lx__num">00</b><i>%</i></span>
      <span className="lx__line">Drawing the city</span>
    </div>
    <div className="lx__mist ld__mist" aria-hidden="true" />
  </div>;
}
