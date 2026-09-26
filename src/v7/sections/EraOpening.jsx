import React, { useEffect, useRef } from 'react';
import { useStage } from '../core/useStage';
import { setTheme, store, subscribe } from '../core/store';
import { gsap } from '../core/ScrollManager';

// "Above the clouds" hero. The WebGL scene (HeroCloudScene) shows the towers
// standing in a dusk sky with cloud banks round their middle; scroll lifts the
// camera up through the clouds. Over it, the wordmark is set huge and scales
// open as you rise, a second line surfaces above the clouds, and a feathered
// edge closes the sky before the arrival chapter.
// One line of story per shot of the flight (see HeroCloudScene).
const CAPS = [
  { at: '0.21,0.31', line: 'A quarter rises from the cloud', sub: 'Chapter I — The approach' },
  { at: '0.41,0.52', line: 'Ten towers of glass and bronze', sub: 'Chapter II — The foot of the tower' },
  { at: '0.86,0.96', line: 'A garden, a pool, a private park', sub: 'Chapter III — Life below the crowns' },
];

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
    runway: 10,
    build: (tl, { q, stage }) => {
      // the hero's shading leaves with it, never sliding over the next chapter
      tl.fromTo(stage, { '--shade': 1 }, { '--shade': 0, duration: 0.06 }, 0.9);
      // the title card sits on the cloud, then dissolves as the cloud parts
      tl.to(q('.hero__mark'), { scale: 1.35, letterSpacing: '0.3em', autoAlpha: 0, filter: 'blur(10px)', duration: 0.14, ease: 'power1.in' }, 0.05)
        .to(q('.hero__tag, .hero__meta'), { autoAlpha: 0, y: -30, duration: 0.08 }, 0.04)
        .to(q('.era-opening__map'), { autoAlpha: 0, duration: 0.06 }, 0.12);
      // subtitles, one per shot
      q('.hero__cap').forEach((el) => {
        const [a, b] = el.dataset.at.split(',').map(Number);
        tl.fromTo(el.querySelectorAll('.hero__cap-line > span'), { yPercent: 110 }, { yPercent: 0, duration: 0.03, stagger: 0.008, ease: 'power3.out' }, a)
          .fromTo(el.querySelector('.hero__cap-sub'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.03 }, a + 0.015)
          .to(el, { autoAlpha: 0, y: -24, duration: 0.03 }, b);
      });
      // above the clouds: over the crown, the statement surfaces
      tl.fromTo(q('.hero__above .hero__char > span'), { yPercent: 110 }, { yPercent: 0, duration: 0.05, stagger: 0.004, ease: 'power3.out' }, 0.64)
        .fromTo(q('.hero__above-sub'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.04 }, 0.68)
        .to(q('.hero__above'), { autoAlpha: 0, y: -40, duration: 0.04 }, 0.79)
        .fromTo(q('.hero__scrollcue'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.03 }, 0.02);
    },
    onProgress: () => setTheme('dark'),
  });
  const chars = (t) => t.split('').map((c, i) => <span className="hero__char" key={i}><span>{c === ' ' ? ' ' : c}</span></span>);
  return <section className="runway" ref={runwayRef} id="home"><div className="stage era-opening hero" ref={stageRef}>
    <p className="hero__tag">RESIDENCES ABOVE THE CITY</p>
    <h1 className="hero__mark" ref={markRef} aria-label="AFRAH">{chars('AFRAH')}</h1>
    <p className="hero__meta"><span>Architecture for living</span><span>On the river bend · 64 floors</span></p>
    {CAPS.map((c) => <div className="hero__cap" data-at={c.at} key={c.at}><p className="hero__cap-line"><span>{c.line}</span></p><p className="hero__cap-sub">{c.sub}</p></div>)}
    <div className="hero__scrollcue" aria-hidden="true"><span>Scroll</span><i /></div>
    <div className="hero__above" aria-hidden="true"><h2>{chars('ABOVE THE CLOUDS')}</h2><p className="hero__above-sub">Every residence opens onto the sky.</p></div>
    <a className="btn era-opening__map" href="/map"><span className="btn__icon">3D</span>Explore the place<b>↗</b></a>
  </div></section>;
}
