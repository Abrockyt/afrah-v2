import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from '../core/ScrollManager';
import { setTheme } from '../core/store';
import ArchitecturalPattern from '../ui/ArchitecturalPattern';

export function Living() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.living-photo img').forEach(img => gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.12, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: .55 } }));
      gsap.utils.toArray('.living-block').forEach(block => gsap.fromTo(block.querySelectorAll('[data-reveal]'), { opacity: 0, y: 28 }, { opacity: 1, y: 0, stagger: .1, duration: 1, ease: 'power2.out', scrollTrigger: { trigger: block, start: 'top 75%', onEnter: () => setTheme('light'), onEnterBack: () => setTheme('light') } }));
    }, ref);
    return () => ctx.revert();
  }, []);
  return <section className="living" id="cases" ref={ref}>
    <div className="living-block living-intro"><span className="living-kicker" data-reveal>03 / THE ART OF LIVING</span><h2 data-reveal>Every day.<br/><span>Extraordinary.</span></h2><div className="living-intro__body" data-reveal><p>A home is more than a view. It is the light across a room, the garden on your doorstep, and the space to make life your own.</p><a className="living-link" href="/residences">EXPLORE RESIDENCES <b>↗</b></a></div></div>
    <figure className="living-photo living-panorama"><img src="/v3/silver/terraces.webp" alt="Private terraces opening onto a landscaped setting" loading="lazy"/><figcaption>OPEN TO THE OUTSIDE</figcaption></figure>
    <div className="living-block living-interior"><div className="living-interior__copy"><span className="living-kicker" data-reveal>SPACE TO BE YOURSELF</span><h2 data-reveal>A quieter<br/>kind of<br/><span>grandeur.</span></h2><p data-reveal>Generous proportions. Natural materials. Rooms that open to the light.</p><a className="living-link" href="/architecture" data-reveal>THE ARCHITECTURE <b>↗</b></a></div><figure className="living-photo"><img src="/v3/era/int-1.webp" alt="A double height entrance hall with warm architectural details" loading="lazy"/></figure></div>
    <div className="living-block living-garden"><figure className="living-photo"><img src="/v3/silver/court.webp" alt="A sheltered landscaped courtyard" loading="lazy"/></figure><div><span className="living-kicker" data-reveal>ROOM FOR THE EVERYDAY</span><h2 data-reveal>Life.<br/>In the<br/><span>open.</span></h2><p data-reveal>From a morning in the garden to an evening with friends. A private world, connected to the city.</p><a className="living-link" href="/place" data-reveal>DISCOVER THE PLACE <b>↗</b></a></div></div>
  </section>;
}

export function PlaceChapter() {
  return <section className="place-chapter" id="place-chapter"><ArchitecturalPattern/><div className="place-chapter__heading"><span className="living-kicker">06 / YOUR WORLD</span><h2>Everything.<br/><span>Within reach.</span></h2><a className="living-link" href="/map">EXPLORE THE 3D MAP <b>↗</b></a></div><a href="/map" className="place-chapter__image" aria-label="Open the interactive map"><img src="/v3/likova/location.webp" alt="An aerial view of the landscape and urban connections" loading="lazy"/><span>THE PLACE <b>↗</b></span></a></section>;
}
