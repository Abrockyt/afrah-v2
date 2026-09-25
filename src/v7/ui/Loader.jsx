import React, { useEffect, useRef, useState } from 'react';
import { store, notify } from '../core/store';
import { gsap, stopScroll, startScroll } from '../core/ScrollManager';
import ArchitecturalPattern from './ArchitecturalPattern';

// Card loader (after the Likova opening). While loading, only the
// architectural background moves behind a small stepped card carrying the
// wordmark and the percentage. When ready, the card opens: it widens into a
// banner, rises into a full-width band across the top while the background
// falls away to reveal the page, then folds into the logo tab in the corner
// and hands over to the navigation. A click anywhere is the sound opt-in.

// A card outline with two steps cut from its lower-right corner. Every state
// uses the same 8 points (in vw / vh), so GSAP can morph between them.
const card = ({ l, t, r, b, ya, rb, yb, rc }) =>
  `polygon(${l}vw ${t}vh, ${r}vw ${t}vh, ${r}vw ${ya}vh, ${rb}vw ${ya}vh, ${rb}vw ${yb}vh, ${rc}vw ${yb}vh, ${rc}vw ${b}vh, ${l}vw ${b}vh)`;

const DESKTOP = {
  small: { l: 36, t: 35, r: 64, b: 64, ya: 55, rb: 61.5, yb: 59.5, rc: 52 },
  wide: { l: 22, t: 38, r: 82, b: 62, ya: 53, rb: 79, yb: 57.5, rc: 44 },
  band: { l: 0, t: 0, r: 100, b: 44, ya: 28, rb: 100, yb: 28, rc: 38 },
  tab: { l: 0, t: 0, r: 18, b: 9.5, ya: 7, rb: 17, yb: 8.2, rc: 12 },
};
const MOBILE = {
  small: { l: 12, t: 38, r: 88, b: 60, ya: 53, rb: 82, yb: 56.5, rc: 60 },
  wide: { l: 6, t: 40, r: 94, b: 60, ya: 54, rb: 90, yb: 57, rc: 58 },
  band: { l: 0, t: 0, r: 100, b: 36, ya: 24, rb: 100, yb: 24, rc: 62 },
  tab: { l: 0, t: 0, r: 44, b: 8, ya: 6, rb: 42, yb: 7, rc: 30 },
};

export default function Loader({ onSound }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    stopScroll();
    const el = ref.current;
    const q = gsap.utils.selector(el);
    const S = innerWidth <= 600 ? MOBILE : DESKTOP;
    const pctEl = q('.loader__pct')[0];
    const counter = { v: 0 };
    gsap.set(q('.loader__card'), { clipPath: card(S.small) });
    // the percentage creeps toward 90 while loading, then completes
    const creep = gsap.to(counter, { v: 90, duration: 6, ease: 'power2.out', onUpdate: () => { pctEl.textContent = `${Math.round(counter.v)}%`; } });

    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const firstImage = new Image(); firstImage.src = '/era/hero.webp';
    const picture = firstImage.decode().catch(() => {});
    const gl = new Promise((res) => { const t = setInterval(() => { if (store.glReady || performance.now() > 20000) { clearInterval(t); res(); } }, 50); });
    const reveal = () => { store.ready = true; notify(); startScroll(); window.scrollTo(0, 0); };
    const started = performance.now();
    let tl, timer;

    Promise.all([fonts, gl, picture]).then(() => {
      timer = setTimeout(() => {
        creep.kill();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { reveal(); setDone(true); return; }
        const mark = q('.loader__mark')[0];
        tl = gsap.timeline({ onComplete: () => setDone(true) })
          .to(counter, { v: 100, duration: 0.35, ease: 'power1.out', onUpdate: () => { pctEl.textContent = `${Math.round(counter.v)}%`; } })
          .to(pctEl, { autoAlpha: 0, duration: 0.25 }, 0.45)
          // 1. the card widens into a banner
          .to(q('.loader__card'), { clipPath: card(S.wide), duration: 0.9, ease: 'power3.inOut' }, 0.5)
          .to(mark, { left: `${S.wide.l + 2.2}vw`, top: `${S.wide.t + 4}vh`, fontSize: innerWidth <= 600 ? '12vw' : '6.4vw', duration: 0.9, ease: 'power3.inOut' }, 0.5)
          // 2. it rises into a full-width band; the background falls away
          .to(q('.loader__card'), { clipPath: card(S.band), duration: 1.0, ease: 'power3.inOut' }, 1.75)
          .to(mark, { left: '2.4vw', top: `${S.band.ya - 12}vh`, fontSize: innerWidth <= 600 ? '14vw' : '8vw', duration: 1.0, ease: 'power3.inOut' }, 1.75)
          .to(q('.loader__ornament'), { autoAlpha: 0, duration: 0.8, ease: 'power1.inOut' }, 2.35)
          .add(reveal, 2.35)
          // 3. it folds into the logo tab and hands over to the navigation
          .to(q('.loader__card'), { clipPath: card(S.tab), duration: 1.0, ease: 'power3.inOut' }, 3.15)
          .to(mark, { left: '1.6vw', top: '2.2vh', fontSize: innerWidth <= 600 ? '6vw' : '1.9vw', duration: 1.0, ease: 'power3.inOut' }, 3.15)
          .to(q('.loader__card, .loader__mark'), { autoAlpha: 0, duration: 0.45, ease: 'power1.out' }, 4.1);
      }, Math.max(0, 1800 - (performance.now() - started)));
    });
    return () => { clearTimeout(timer); creep.kill(); tl?.kill(); };
  }, []);

  return <div ref={ref} className={`loader loader--card ${done ? 'is-done' : ''}`} role="status" aria-live="polite" onClick={() => onSound?.(true)}>
    <span className="loader__sr">{done ? 'AFRAH loaded' : 'Loading AFRAH'}</span>
    <div className="loader__ornament" aria-hidden="true"><ArchitecturalPattern/></div>
    <div className="loader__card" aria-hidden="true" />
    <span className="loader__mark" aria-hidden="true">AFRAH</span>
    <span className="loader__pct" aria-hidden="true">0%</span>
  </div>;
}
