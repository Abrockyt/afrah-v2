import React, { useEffect, useRef } from 'react';
import { useStage } from '../core/useStage';
import { setTheme, store, subscribe } from '../core/store';
import { gsap } from '../core/ScrollManager';
import ArchitecturalPattern from '../ui/ArchitecturalPattern';

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
    runway: 2.2,
    build: (tl, { q }) => {
      tl.to(q('.era-opening__title'), { yPercent: -48, opacity: 0, duration: .35 }, .02)
        .to(q('.era-opening__aside'), { y: -55, opacity: 0, duration: .25 }, .02)
        .fromTo(q('.era-opening__picture'), { top: () => innerWidth <= 600 ? '30vh' : '12vh', left: () => innerWidth <= 600 ? '17%' : '31%', width: () => innerWidth <= 600 ? '66%' : '38%', height: () => innerWidth <= 600 ? '57vh' : '79vh' }, { top: 0, left: 0, width: '100%', height: '100%', duration: .54, ease: 'power2.inOut' }, .12)
        .fromTo(q('.era-opening__aperture'), { borderRadius: '50%', '--eye': '58%' }, { borderRadius: '0%', '--eye': '-2%', duration: .5, ease: 'power2.inOut' }, .14)
        // magnify: the view dives into the towers while the aperture opens
        .fromTo(q('.era-opening__picture img'), { scale: 1 }, { scale: 1.65, duration: .9, ease: 'power1.in' }, .04)
        .to(q('.era-opening__aperture'), { '--eye': '148%', duration: .25, ease: 'power2.inOut' }, .72)
        .to(q('.era-opening__map'), { opacity: 0, duration: .15 }, .65)
        .to(q('.era-opening__pattern'), { opacity: 0, duration: .15 }, .7);
    },
    onProgress: () => setTheme('dark'),
  });
  return <section className="runway" ref={runwayRef} id="home"><div className="stage era-opening" ref={stageRef}>
    <ArchitecturalPattern className="era-opening__pattern"/>
    <h1 className="era-opening__title"><span>A PLACE</span><span>TO <em>BELONG</em></span></h1>
    <p className="era-opening__aside">ARCHITECTURE FOR LIVING.<br/>A NEW PERSPECTIVE ON HOME.</p>
    <figure className="era-opening__picture"><div className="era-opening__entrance" ref={entranceRef}><div className="era-opening__aperture"><img src="/era/hero.webp" alt="Architectural towers at dusk, revealed through an oval aperture" fetchPriority="high"/></div></div></figure>
    <a className="era-opening__map" href="/map"><span className="era-opening__map-icon">3D</span><span>EXPLORE THE PLACE</span><b>↗</b></a>
  </div></section>;
}
