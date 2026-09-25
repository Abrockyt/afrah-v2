import React, { useEffect, useRef } from 'react';
import { useStage } from '../core/useStage';
import { setTheme, store, subscribe } from '../core/store';
import { gsap } from '../core/ScrollManager';
import ArchitecturalPattern from '../ui/ArchitecturalPattern';
import { featherEdgeMask } from '../ui/featherEdge';

const EDGE = featherEdgeMask(4.1);

export default function EraOpening() {
  const entranceRef = useRef(null);
  useEffect(() => {
    let played = false, tween;
    const enter = () => {
      if (!store.ready || played) return;
      played = true;
      tween = gsap.fromTo(entranceRef.current, { y: '-115vh', rotation: -8 }, {
        y: 0, rotation: 0, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2.4,
        ease: 'power3.out', delay: .15,
      });
    };
    const unsubscribe = subscribe(enter); enter();
    return () => { unsubscribe(); tween?.kill(); };
  }, []);
  const { runwayRef, stageRef } = useStage('hero', {
    runway: 2.4,
    build: (tl, { q, stage }) => {
      const pic = q('.era-opening__picture')[0];
      // Scale that makes the circle cover the whole screen from where it sits
      const cover = () => {
        const r = pic.getBoundingClientRect(), w = innerWidth, h = innerHeight;
        const d = pic.offsetWidth || r.width, cx = pic.offsetLeft + d / 2, cy = pic.offsetTop + d / 2;
        const far = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
        return (2 * far) / d * 1.02;
      };
      const H = () => stage.clientHeight;
      tl.to(q('.era-opening__title'), { yPercent: -48, opacity: 0, duration: .35 }, .02)
        .to(q('.era-opening__aside'), { y: -55, opacity: 0, duration: .25 }, .02)
        // the ring closes into a full circle...
        .fromTo(q('.era-opening__aperture'), { '--eye': '58%' }, { '--eye': '-2%', duration: .34, ease: 'power2.inOut' }, .06)
        // ...and grows from where it is, always a circle, until it fills the screen
        .fromTo(pic, { scale: 1 }, { scale: cover, duration: .56, ease: 'power2.inOut' }, .12)
        // magnify: the view dives into the towers inside the circle
        .fromTo(q('.era-opening__picture img'), { scale: 1 }, { scale: 1.35, duration: .86, ease: 'power1.in' }, .04)
        .to(q('.era-opening__map'), { opacity: 0, duration: .15 }, .5)
        .to(q('.era-opening__pattern'), { opacity: 0, duration: .15 }, .55)
        // feathered wipe (Composites cut) uncovers the next chapter from the top
        .fromTo(stage, { '--rise': () => `${-0.36 * H()}px` }, { '--rise': () => `${H()}px`, duration: .24, ease: 'power1.inOut' }, .74);
    },
    onProgress: () => setTheme('dark'),
  });
  return <section className="runway" ref={runwayRef} id="home"><div className="stage era-opening" ref={stageRef} style={{ WebkitMaskImage: EDGE, maskImage: EDGE }}>
    <ArchitecturalPattern className="era-opening__pattern"/>
    <h1 className="era-opening__title"><span>A PLACE</span><span>TO <em>BELONG</em></span></h1>
    <p className="era-opening__aside">ARCHITECTURE FOR LIVING.<br/>A NEW PERSPECTIVE ON HOME.</p>
    <figure className="era-opening__picture"><div className="era-opening__entrance" ref={entranceRef}><div className="era-opening__aperture"><img src="/era/hero.webp" alt="Architectural towers at dusk, revealed through a circular aperture" fetchPriority="high"/></div></div></figure>
    <a className="era-opening__map" href="/map"><span className="era-opening__map-icon">3D</span><span>EXPLORE THE PLACE</span><b>↗</b></a>
  </div></section>;
}
