import React, { useEffect, useState } from 'react';
import { store, notify } from '../core/store';
import { stopScroll, startScroll } from '../core/ScrollManager';
import ArchitecturalPattern from './ArchitecturalPattern';

// Loader: counts to 100 while fonts and the GL scene warm up, then lifts.
// A click anywhere on it doubles as the sound opt-in.
export default function Loader({ onSound }) {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    stopScroll();
    let v = 0;
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const firstImage = new Image(); firstImage.src = '/era/hero.webp';
    const picture = firstImage.decode().catch(() => {});
    const id = setInterval(() => { v = Math.min(96, v + 3 + Math.random() * 6); setPct(Math.floor(v)); }, 70);
    const gl = new Promise((res) => { const t = setInterval(() => { if (store.glReady || performance.now() > 20000) { clearInterval(t); res(); } }, 50); });
    Promise.all([fonts, gl, picture]).then(() => setTimeout(() => {
      clearInterval(id); setPct(100);
      setTimeout(() => { setDone(true); store.ready = true; notify(); startScroll(); window.scrollTo(0, 0); }, 350);
    }, 900));
    return () => clearInterval(id);
  }, []);
  return <div className={`loader ${done ? 'is-done' : ''}`} role="status" aria-live="polite">
    <div className="loader__ornament" aria-hidden="true"><ArchitecturalPattern/></div>
    <div className="loader__portal" aria-hidden="true"><img src="/era/hero.webp" alt=""/></div>
    <div className="loader__centre"><span className="loader__small">A place apart</span><strong>AFRAH</strong><span className="loader__small">Architecture / Life / Light</span></div>
    <div className="loader__footer"><span>Preparing your journey</span><span className="loader__pct">{String(pct).padStart(3,'0')}%</span><button onClick={()=>onSound?.(true)} aria-label="Enable sound">Sound off ↗</button></div>
    <div className="loader__bar"><i style={{ transform: `scaleX(${pct / 100})` }} /></div>
  </div>;
}
