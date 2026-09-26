import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from '../core/ScrollManager';
import { setTheme } from '../core/store';
import ArchitecturalPattern from '../ui/ArchitecturalPattern';
import { revealText } from '../ui/textReveal';

export function Living() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.lv [data-par]').forEach((img) => gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.55 } }));
      // the cream section keeps the navigation dark, however it is entered
      gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 80px', end: 'bottom 80px', onEnter: () => setTheme('light'), onEnterBack: () => setTheme('light') } });
      gsap.utils.toArray('.lv [data-rise]').forEach((n) => gsap.fromTo(n, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 86%' } }));
      // the arched frames open from the bottom as they arrive
      gsap.utils.toArray('.lv-arch').forEach((f) => gsap.fromTo(f, { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 0 0)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0 0)', duration: 1.6, ease: 'power3.inOut', scrollTrigger: { trigger: f, start: 'top 85%' } }));
      revealText(ref.current);
    }, ref);
    return () => ctx.revert();
  }, []);
  return <section className="lv living" id="cases" ref={ref}>
    <div className="lv-intro">
      <span className="lv-k" data-rise>03 / The art of living</span>
      <h2 data-lines>Every day.<br /><em>Extraordinary.</em></h2>
      <div className="lv-intro__side">
        <p data-fill>A home is more than a view. It is the light across a room, the garden on your doorstep, and the space to make life your own.</p>
        <a className="btn" href="/residences" data-rise>Explore residences<b>↗</b></a>
      </div>
    </div>
    <div className="lv-duo">
      <figure className="lv-duo__wide"><img data-par src="/v3/silver/terraces.webp" alt="Private terraces opening onto the city" loading="lazy" /></figure>
      <figure className="lv-duo__arch lv-arch"><img data-par src="/v3/era/int-5.webp" alt="A calm corridor in warm stone" loading="lazy" /></figure>
      <p className="lv-duo__cap" data-rise><b>Open to the outside</b>Deep balconies on every floor of the Wave towers, and terraces at the top of the Lily.</p>
    </div>
    <div className="lv-row">
      <div className="lv-row__copy">
        <span className="lv-k" data-rise>Space to be yourself</span>
        <h3 data-lines>A quieter kind<br /><em>of grandeur.</em></h3>
        <p data-fill>Generous proportions and natural materials: oak underfoot, stone in the bathrooms, and rooms that open to the light on two sides.</p>
        <a className="btn" href="/architecture" data-rise>The architecture<b>↗</b></a>
      </div>
      <figure className="lv-row__img lv-arch"><img data-par src="/v3/era/int-1.webp" alt="A double height entrance hall with warm architectural details" loading="lazy" /></figure>
      <figure className="lv-row__small"><img data-par src="/media/lounge.webp" alt="" loading="lazy" /></figure>
    </div>
    <div className="lv-row lv-row--flip">
      <figure className="lv-row__img lv-arch"><img data-par src="/v3/silver/court.webp" alt="A sheltered landscaped courtyard" loading="lazy" /></figure>
      <div className="lv-row__copy">
        <span className="lv-k" data-rise>Room for the everyday</span>
        <h3 data-lines>Life.<br /><em>In the open.</em></h3>
        <p data-fill>From a morning in the garden to an evening with friends by the pool. A private world in the park, connected to the city.</p>
        <a className="btn" href="/place" data-rise>Discover the place<b>↗</b></a>
      </div>
    </div>
  </section>;
}

export function PlaceChapter() {
  return <section className="place-chapter" id="place-chapter"><ArchitecturalPattern/><div className="place-chapter__heading"><span className="living-kicker">06 / YOUR WORLD</span><h2>Everything.<br/><span>Within reach.</span></h2><a className="living-link" href="/map">EXPLORE THE 3D MAP <b>↗</b></a></div><a href="/map" className="place-chapter__image" aria-label="Open the interactive map"><img src="/v3/likova/location.webp" alt="An aerial view of the landscape and urban connections" loading="lazy"/><span>THE PLACE <b>↗</b></span></a></section>;
}
