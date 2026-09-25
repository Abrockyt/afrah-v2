import React, { useEffect, useRef, useState } from 'react';
import { store, notify } from '../core/store';
import { gsap, stopScroll, startScroll } from '../core/ScrollManager';
import ArchitecturalPattern from './ArchitecturalPattern';

// Loader: only the architectural background animates while fonts, the hero
// picture and the GL scene warm up. Then a card opens in the middle of it — a
// hairline draws across, the card unfolds to portrait, and its window onto the
// page grows until the loader is gone. A click anywhere is the sound opt-in.
export default function Loader({ onSound }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    stopScroll();
    const el = ref.current;
    const started = performance.now();
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const firstImage = new Image(); firstImage.src = '/era/hero.webp';
    const picture = firstImage.decode().catch(() => {});
    const gl = new Promise((res) => { const t = setInterval(() => { if (store.glReady || performance.now() > 20000) { clearInterval(t); res(); } }, 50); });
    const reveal = () => { store.ready = true; notify(); startScroll(); window.scrollTo(0, 0); };
    let tl, timer;

    Promise.all([fonts, gl, picture]).then(() => {
      timer = setTimeout(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { reveal(); setDone(true); return; }
        const mobile = innerWidth <= 600;
        const cw = mobile ? innerWidth * 0.62 : Math.min(innerWidth * 0.26, 420);
        const ch = mobile ? innerHeight * 0.46 : Math.min(innerHeight * 0.58, 600);
        const card = el.querySelector('.loader__card');
        tl = gsap.timeline({ onComplete: () => setDone(true) })
          // hairline draws across the middle
          .fromTo(el, { '--cw': '0px', '--ch': '0px' }, { '--cw': `${cw}px`, '--ch': '1px', duration: 0.7, ease: 'power3.inOut' })
          .fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0)
          // the card unfolds to portrait, a window onto the page
          .to(el, { '--ch': `${ch}px`, duration: 0.8, ease: 'power3.inOut' }, 0.75)
          .add(reveal, 1.1)
          // the window opens to the full screen; the background eases away
          .to(el, { '--cw': `${innerWidth + 4}px`, '--ch': `${innerHeight + 4}px`, duration: 1.3, ease: 'power4.inOut' }, 1.95)
          .to(el.querySelector('.loader__ornament'), { scale: 1.12, duration: 1.3, ease: 'power4.inOut' }, 1.95)
          .to(card, { autoAlpha: 0, duration: 0.4 }, 2.6);
      }, Math.max(0, 1600 - (performance.now() - started)));
    });
    return () => { clearTimeout(timer); tl?.kill(); };
  }, []);

  return <div ref={ref} className={`loader loader--card ${done ? 'is-done' : ''}`} role="status" aria-live="polite" onClick={() => onSound?.(true)}>
    <span className="loader__sr">{done ? 'AFRAH loaded' : 'Loading AFRAH'}</span>
    <div className="loader__ornament" aria-hidden="true"><ArchitecturalPattern/></div>
    <div className="loader__card" aria-hidden="true" />
  </div>;
}
