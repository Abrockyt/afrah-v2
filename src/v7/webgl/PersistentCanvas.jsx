import React, { useEffect, useRef } from 'react';
import { gsap } from '../core/ScrollManager';
import { SceneManager } from './SceneManager';
import { store } from '../core/store';

// One canvas for the whole page. Mounted once, never re-created.
export default function PersistentCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (/[?&]nogl/.test(window.location.search)) { store.glReady = true; return undefined; }
    let mgr;
    try { mgr = new SceneManager(canvas); } catch (e) { console.warn('WebGL unavailable', e); return undefined; }
    window.__gl = mgr;
    mgr.ready.then(() => { store.glReady = true; });
    const resize = () => mgr.resize(window.innerWidth, window.innerHeight);
    resize();
    window.addEventListener('resize', resize);
    const tick = (t) => mgr.render(t);
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); window.removeEventListener('resize', resize); mgr.dispose(); };
  }, []);
  return <div id="gl-stage"><canvas ref={ref} /></div>;
}