import React, { useLayoutEffect, useRef } from 'react';
import { useStage } from '../core/useStage';
import { gsap } from '../core/ScrollManager';
import { setTheme } from '../core/store';

// ERA-style chapters that replace the old passage. Copy is AFRAH's own; the
// imagery is temporary study material from /v3/era and /v3/silver.

const words = (text) => text.split(' ').map((w, i) => <span className="era-w" key={i}><span>{w}</span></span>);

/* ── Architecture: tower rising in a dusk sky, then the ERA ring ─────────── */
// Pinned. The title and text sit top-left while the stepped tower rises and
// grows through the sky. Then a cream ring carrying the arcade image rises from
// the bottom and grows — always a circle — until the image fills the screen.
// The next chapter then slides up over it, as on ERA.
export function EraArchitecture() {
  const { runwayRef, stageRef } = useStage('eraArch', {
    runway: 10,
    build: (tl, { q, stage }) => {
      const ring = q('.era-ring')[0];
      const H = () => stage.clientHeight;
      tl.fromTo(q('.era-arch__title .era-w > span'), { yPercent: 105 }, { yPercent: 0, duration: 0.06, stagger: 0.01, ease: 'power3.out' }, 0.01)
        .fromTo(q('.era-arch__text'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.05)
        .fromTo(q('.era-arch__tower'), { yPercent: 62, scale: 0.92 }, { yPercent: -18, scale: 1.14, duration: 0.56, ease: 'none' }, 0.02)
        .to(q('.era-arch__copy'), { y: () => -0.45 * H(), autoAlpha: 0, duration: 0.14, ease: 'power1.in' }, 0.3)
        // ERA ring: a cream disc rises from below; its hole opens onto a still,
        // full-screen image. The disc grows slowly while the hole opens fast,
        // so the band thins, then the hole takes over the whole screen.
        .fromTo(ring, { '--cy': '128vh', '--ro': '32vw', '--ri': '0vw' }, { '--cy': '80vh', '--ro': '42vw', '--ri': '22vw', duration: 0.16, ease: 'power1.out' }, 0.46)
        .to(ring, { '--cy': '72vh', '--ro': '50vw', '--ri': '31vw', duration: 0.08, ease: 'none' }, 0.62)
        .to(ring, { '--cy': '58vh', '--ro': '150vmax', '--ri': '140vmax', duration: 0.12, ease: 'power2.in' }, 0.7)
        .fromTo(q('.era-ring__img img'), { scale: 1.12 }, { scale: 1, duration: 0.36, ease: 'none' }, 0.46);
    },
    onProgress: () => setTheme('dark'),
  });
  return (
    <section className="runway" id="architecture" ref={runwayRef}>
      <div className="stage era-arch" ref={stageRef}>
        <img className="era-arch__sky" src="/v3/era/arch-bg.webp" alt="" aria-hidden="true" />
        <div className="era-arch__copy">
          <h2 className="era-arch__title">{words('ARCHITECTURE')}</h2>
          <p className="era-arch__text">A new landmark for the skyline. The AFRAH towers pair the stepped silhouettes of the great high-rises of the last century with a precise contemporary facade: honed stone, bronze detailing and arches that glow at dusk.</p>
        </div>
        <img className="era-arch__tower" src="/v3/era/arch-building.webp" alt="The stepped AFRAH tower rising into a dusk sky" />
        <div className="era-ring" aria-hidden="true"><div className="era-ring__disc" /><div className="era-ring__img"><img src="/v3/era/arch-2.webp" alt="" /></div></div>
      </div>
    </section>
  );
}

// Shared scroll reveals for the normal-flow chapters below.
function useReveals(ref, extra) {
  useLayoutEffect(() => {
    const el = ref.current;
    const ctx = gsap.context(() => {
      gsap.utils.toArray(el.querySelectorAll('[data-rise]')).forEach((n) => gsap.fromTo(n, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 85%' } }));
      gsap.utils.toArray(el.querySelectorAll('[data-words]')).forEach((n) => gsap.fromTo(n.querySelectorAll('.era-w > span'), { yPercent: 105 }, { yPercent: 0, duration: 1, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 85%' } }));
      gsap.utils.toArray(el.querySelectorAll('[data-parallax]')).forEach((n) => { const k = parseFloat(n.dataset.parallax) || 10; gsap.fromTo(n, { yPercent: k }, { yPercent: -k, ease: 'none', scrollTrigger: { trigger: n, start: 'top bottom', end: 'bottom top', scrub: 0.5 } }); });
      extra && extra(el);
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── Statement on cream ───────────────────────────────────────────────── */
export function EraStatement() {
  const ref = useRef(null);
  useReveals(ref);
  return (
    <section className="era-statement" ref={ref} onPointerEnter={() => setTheme('light')}>
      <p data-rise>Great architecture has always promised more than shelter. It promises a way of living: light that moves across a room, materials that age with grace, and a presence on the street that people remember. AFRAH is built to keep that promise.</p>
      <blockquote data-rise>«We drew AFRAH for the next hundred years — a silhouette the city will recognise from any direction.»<cite>Lead architect, AFRAH design studio</cite></blockquote>
    </section>
  );
}

/* ── Joys of every day ────────────────────────────────────────────────── */
const JOY_STATS = [['4', 'minutes walk', 'to the park'], ['6', 'minutes walk', 'to school'], ['7', 'minutes walk', 'to the metro'], ['12', 'minutes drive', 'to downtown']];
export function EraJoy() {
  const ref = useRef(null);
  useReveals(ref);
  return (
    <section className="era-joy" ref={ref} id="joy">
      <div className="era-joy__head">
        <figure className="era-joy__lead" data-rise><img src="/v3/era/joy-1.webp" alt="A couple walking through the neighbourhood" loading="lazy" data-parallax="6" /></figure>
        <h2 className="era-joy__title" data-words>{words('THE JOY')}<br />{words('OF EVERY DAY')}</h2>
      </div>
      <div className="era-joy__body">
        <p data-rise>AFRAH brings everyday joy to the heart of the city. Historic streets to wander, schools that open bright futures, parks for quiet mornings and restaurants for long evenings with friends — all within a short walk.</p>
        <figure className="era-joy__side" data-rise><img src="/v3/era/joy-c3.webp" alt="Running along the embankment" loading="lazy" /></figure>
      </div>
      <ul className="era-joy__stats">{JOY_STATS.map(([n, u, t]) => <li key={t} data-rise><strong>{n}</strong><span>{u}</span><em>{t}</em></li>)}</ul>
      <div className="era-joy__strip">
        {['joy-2', 'joy-c1', 'joy-c5', 'joy-c6', 'joy-c4'].map((k, i) => <figure key={k} data-rise style={{ '--i': i }}><img src={`/v3/era/${k}.webp`} alt="" loading="lazy" data-parallax={4 + (i % 3) * 3} /></figure>)}
      </div>
    </section>
  );
}

/* ── 3D map teaser ────────────────────────────────────────────────────── */
const ROADS = [
  'M-20 120 C 260 160, 420 90, 700 150 S 1180 260, 1460 210',
  'M-20 520 C 240 470, 520 560, 760 500 S 1200 420, 1460 470',
  'M180 -20 C 220 200, 150 420, 260 620 S 330 900, 300 920',
  'M980 -20 C 940 180, 1060 380, 1000 560 S 900 820, 960 920',
  'M-20 330 L 1460 360', 'M560 -20 L 620 920', 'M760 -20 C 780 300, 700 560, 820 920',
];
const PLACES = [[420, 230, 'Central park', '4 min'], [1040, 300, 'International school', '6 min'], [1150, 610, 'Metro station', '7 min'], [860, 150, 'Old town', '12 min']];
export function EraMap() {
  const ref = useRef(null);
  useReveals(ref, (el) => {
    gsap.fromTo(el.querySelectorAll('.era-map__roads path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'center center', scrub: 0.6 } });
    gsap.fromTo(el.querySelectorAll('.era-map__place'), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, stagger: 0.12, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: el, start: 'top 45%' } });
  });
  return (
    <section className="era-map" ref={ref} id="map-teaser">
      <svg className="era-map__svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path className="era-map__river" d="M-40 780 C 200 700, 380 820, 620 760 S 1040 640, 1480 700 L 1480 940 L -40 940 Z" />
        <g className="era-map__roads">{ROADS.map((d, i) => <path key={i} d={d} pathLength="1" />)}</g>
        <g className="era-map__routes">{PLACES.map(([x, y], i) => <line key={i} x1="720" y1="450" x2={x} y2={y} />)}</g>
        {PLACES.map(([x, y, n, t]) => <g className="era-map__place" key={n} transform={`translate(${x} ${y})`}><circle r="5" /><text x="14" y="-6">{n}</text><text className="t" x="14" y="12">{t}</text></g>)}
        <g className="era-map__pin" transform="translate(720 450)"><circle className="halo" r="46" /><circle className="halo halo--2" r="46" /><path d="M0 -34 C 14 -34, 22 -24, 22 -12 C 22 4, 0 22, 0 22 C 0 22, -22 4, -22 -12 C -22 -24, -14 -34, 0 -34 Z" /><text y="-6">A</text></g>
      </svg>
      <div className="era-map__copy">
        <span className="t-small" data-rise>07 / The place</span>
        <h2 data-words>{words('AT THE CENTRE')}<br />{words('OF EVERYTHING')}</h2>
        <a className="era-pill" href="/map" data-rise><span className="era-pill__icon">3D</span>OPEN THE 3D MAP <b>↗</b></a>
      </div>
    </section>
  );
}

/* ── Garden ───────────────────────────────────────────────────────────── */
export function EraGarden() {
  const ref = useRef(null);
  useReveals(ref, (el) => {
    gsap.fromTo(el.querySelector('.era-garden__circle'), { yPercent: 40, scale: 0.8 }, { yPercent: -10, scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'center center', scrub: 0.6 } });
  });
  return (
    <section className="era-garden" ref={ref} id="garden">
      <div className="era-garden__intro">
        <figure className="era-garden__circle"><img src="/v3/era/touch.webp" alt="A path through the courtyard garden" loading="lazy" /></figure>
        <p data-rise>Every tree in the courtyard garden was chosen to bring a little of the countryside into the city. Clipped hedges, seasonal planting and quiet benches — and a view of green from every window.</p>
      </div>
      <figure className="era-garden__aerial"><img src="/v3/era/labirint.webp" alt="The formal courtyard garden seen from above" loading="lazy" data-parallax="8" /></figure>
    </section>
  );
}

/* ── Interiors ────────────────────────────────────────────────────────── */
export function EraInteriors() {
  const ref = useRef(null);
  useReveals(ref);
  return (
    <section className="era-int" ref={ref} id="interiors">
      <div className="era-int__grid">
        <figure className="era-int__a" data-rise><img src="/v3/era/int-2.webp" alt="Double-height lobby with a crystal chandelier" loading="lazy" data-parallax="6" /></figure>
        <figure className="era-int__b" data-rise><img src="/v3/era/int-3.webp" alt="Concierge desk in warm stone and wood" loading="lazy" data-parallax="10" /></figure>
        <figure className="era-int__c" data-rise><img src="/v3/era/ceilings.webp" alt="Lounge with arched windows" loading="lazy" data-parallax="4" /></figure>
      </div>
      <h2 className="era-int__word" data-words>{words('INTERIORS')}</h2>
      <div className="era-int__foot">
        <p data-rise>Lobbies by day and by night, lounges, a library and residents' salons — each designed as a room in a private house, in stone, bronze, oak and silk.</p>
        <a className="era-pill era-pill--dark" href="/residences" data-rise>EXPLORE THE RESIDENCES <b>↗</b></a>
      </div>
    </section>
  );
}
