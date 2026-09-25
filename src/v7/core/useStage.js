import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from './ScrollManager';
import { store } from './store';

// A "stage" is a 100vh viewport pinned inside a tall runway. The hook builds
// one scrubbed timeline for the whole runway and publishes its progress into
// the shared store under `id`. `build(tl, ctx)` receives a paused timeline
// whose duration equals 1 (so positions are fractions of the runway).
//
// options:
//   runway: number of viewport heights the stage stays pinned (e.g. 4 => 400vh)
//   pinType: 'transform' | 'fixed'
//   onProgress(p, self): optional per-frame callback
export function useStage(id, { runway = 3, build, onProgress, deps = [], scrub = true, pin = true, anticipatePin = 1 }) {
  const runwayRef = useRef(null);
  const stageRef = useRef(null);

  useLayoutEffect(() => {
    const runwayEl = runwayRef.current;
    const stageEl = stageRef.current;
    if (!runwayEl || !stageEl) return undefined;
    // The stage stays pinned until the NEXT runway reaches the top of the
    // viewport (end: 'bottom top'), so consecutive stages hand over with no
    // un-pinned gap where neither is active.
    runwayEl.style.height = `${runway * 100}vh`;
    stageEl.dataset.stage = id;

    let cleanup = null;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      // Reserve a 1-unit-long span so child positions can be expressed 0..1.
      tl.to({}, { duration: 1 }, 0);
      cleanup = build && build(tl, { runway: runwayEl, stage: stageEl, q: gsap.utils.selector(stageEl) });
      const st = ScrollTrigger.create({
        trigger: runwayEl,
        start: 'top top',
        end: 'bottom top',
        pin: pin ? stageEl : false,
        pinSpacing: false,
        anticipatePin,
        scrub: scrub === true ? 0.35 : scrub,
        animation: tl,
        onUpdate: (self) => {
          const rec = store.sections[id] || (store.sections[id] = { p: 0, active: false });
          rec.p = self.progress;
          rec.active = self.isActive;
          onProgress && onProgress(self.progress, self);
        },
        onToggle: (self) => {
          const rec = store.sections[id] || (store.sections[id] = { p: 0, active: false });
          rec.active = self.isActive;
        },
        invalidateOnRefresh: true,
      });
      store.sections[id] = { p: 0, active: false, st };
    }, runwayEl);
    return () => { if (typeof cleanup === 'function') cleanup(); ctx.revert(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { runwayRef, stageRef };
}

// Helper: split text into masked lines. Pass an array of lines; each line may
// contain {accent: true} words as objects. Returns JSX-able structure builder.
export function lineParts(text) {
  // "FORMS BORROWED FROM *NATURE*" -> words with accent flags
  return text.split(/\s+/).map((w) => {
    const accent = w.startsWith('*') && w.endsWith('*');
    return { text: accent ? w.slice(1, -1) : w, accent };
  });
}
