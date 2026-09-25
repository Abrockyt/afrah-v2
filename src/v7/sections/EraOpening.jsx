import React, { useEffect, useRef } from 'react';
import { useStage } from '../core/useStage';
import { setTheme, store, subscribe } from '../core/store';
import { gsap } from '../core/ScrollManager';

// "Above the clouds" hero. The WebGL scene (HeroCloudScene) shows the towers
// standing in a dusk sky with cloud banks round their middle; scroll lifts the
// camera up through the clouds. Over it, the wordmark is set huge and scales
// open as you rise, a second line surfaces above the clouds, and a feathered
// edge closes the sky before the arrival chapter.
export default function EraOpening() {
  const markRef = useRef(null);
  useEffect(() => {
    let played = false, tween;
    const enter = () => {
      if (!store.ready || played) return;
      played = true;
      const el = markRef.current;
      tween = gsap.timeline()
        .fromTo(el.querySelectorAll('.hero__char > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.07, ease: 'power4.out' }, 0.2)
        .fromTo(el.parentElement.querySelectorAll('.hero__tag, .hero__meta, .era-opening__map'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power2.out' }, 0.9);
    };
    const unsubscribe = subscribe(enter); enter();
    return () => { unsubscribe(); tween?.kill(); };
  }, []);
  const { runwayRef, stageRef } = useStage('hero', {
    runway: 3,
    build: (tl, { q }) => {
      // dramatic type: the wordmark scales up and opens its tracking as the camera rises
      tl.to(q('.hero__mark'), { scale: 1.9, letterSpacing: '0.42em', autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0.03)
        .to(q('.hero__tag, .hero__meta'), { autoAlpha: 0, y: -30, duration: 0.14 }, 0.03)
        .to(q('.era-opening__map'), { autoAlpha: 0, duration: 0.1 }, 0.3)
        // above the clouds: a second statement surfaces, then clears
        .fromTo(q('.hero__above .hero__char > span'), { yPercent: 110 }, { yPercent: 0, duration: 0.12, stagger: 0.01, ease: 'power3.out' }, 0.48)
        .fromTo(q('.hero__above-sub'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.56)
        .to(q('.hero__above'), { autoAlpha: 0, y: -40, duration: 0.1 }, 0.78);
    },
    onProgress: () => setTheme('dark'),
  });
  const chars = (t) => t.split('').map((c, i) => <span className="hero__char" key={i}><span>{c === ' ' ? ' ' : c}</span></span>);
  return <section className="runway" ref={runwayRef} id="home"><div className="stage era-opening hero" ref={stageRef}>
    <p className="hero__tag">RESIDENCES ABOVE THE CITY</p>
    <h1 className="hero__mark" ref={markRef} aria-label="AFRAH">{chars('AFRAH')}</h1>
    <p className="hero__meta"><span>Architecture for living</span><span>Downtown · 52 floors</span></p>
    <div className="hero__above" aria-hidden="true"><h2>{chars('ABOVE THE CLOUDS')}</h2><p className="hero__above-sub">Every residence opens onto the sky.</p></div>
    <a className="era-opening__map" href="/map"><span className="era-opening__map-icon">3D</span><span>EXPLORE THE PLACE</span><b>↗</b></a>
  </div></section>;
}
