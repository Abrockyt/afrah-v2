import React, { useLayoutEffect, useRef } from 'react';
import { useStage } from '../core/useStage';
import { gsap } from '../core/ScrollManager';
import { setTheme } from '../core/store';
import { fallData } from '../webgl/scenes/FeatherFall';
import { revealText } from '../ui/textReveal';

// ERA-style chapters that replace the old passage. Copy is AFRAH's own; the
// imagery is temporary study material from /v3/era and /v3/silver.

const words = (text) => text.split(' ').map((w, i) => <span className="era-w" key={i}><span>{w}</span></span>);

/* ── Architecture: the falling copper leaf (after Composites) ───────────── */
// The WebGL LeafScene drops one of ERA's bronze leaves through the measured
// fall of Composites' feather. The words tick through a fixed slot marked by
// the accent dot (same measured windows), and a storm of leaves carries the
// wipe into the next chapter.
const LEAF_WORDS = ['ARCHITECTURE', 'SHAPED', 'BY', 'NATURE'];
export function EraArchitecture() {
  const W = fallData.words;
  const { runwayRef, stageRef } = useStage('leaf', {
    runway: fallData.runwayVh,
    build: (tl, { q, stage }) => {
      const words = q('.leaf__word');
      const col = q('.leaf__col')[0];
      const row = () => W.rowGapY * stage.clientHeight;
      tl.fromTo(q('.leaf__kicker, .leaf__intro'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.04, stagger: 0.01 }, 0.02)
        .to(q('.leaf__intro'), { autoAlpha: 0, y: -20, duration: 0.04 }, 0.16);
      tl.fromTo(words, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, W.appear);
      tl.fromTo(col, { y: () => row() }, { y: 0, duration: W.settle - W.appear, ease: 'power1.out' }, W.appear);
      W.windows.forEach(([a, b], i) => {
        tl.to(words[i], { color: '#1a1a1a', duration: 0.025 }, a);
        if (i > 0) tl.to(col, { y: () => -i * row(), duration: W.shift, ease: 'power1.inOut' }, a);
        if (i < W.windows.length - 1) tl.to(words[i], { color: 'rgba(18,18,18,0.12)', duration: 0.025 }, b);
        if (i >= 1 && i < W.windows.length - 1) tl.to(words[i - 1], { autoAlpha: 0, duration: 0.04 }, b);
      });
      tl.to(words, { autoAlpha: 0, duration: W.fadeOut[1] - W.fadeOut[0] }, W.fadeOut[0]);
      tl.fromTo(q('.leaf__dot'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, W.appear);
      tl.to(q('.leaf__dot'), { autoAlpha: 0, duration: 0.04 }, W.fadeOut[0]);
      tl.fromTo(q('.leaf__outro'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.66)
        .to(q('.leaf__outro'), { autoAlpha: 0, duration: 0.04 }, 0.86)
        .to(q('.leaf__kicker'), { autoAlpha: 0, duration: 0.04 }, 0.86);
    },
    onProgress: () => setTheme('light'),
  });
  return (
    <section className="runway" id="architecture" ref={runwayRef}>
      <div className="stage stage--light leaf" ref={stageRef}>
        <span className="leaf__kicker t-small">05 / Architecture</span>
        <p className="leaf__intro">The Lily wears a crown of bronze leaves. Here is one of them, let go.</p>
        <div className="leaf__words" style={{ left: `${W.xRatio * 100}%`, top: `${W.slotY * 100}%`, fontSize: `${W.fontVh}vh` }}>
          <i className="leaf__dot" style={{ left: `${(W.dotXRatio - W.xRatio) * 100}vw` }} />
          <div className="leaf__col" style={{ rowGap: `calc(${W.rowGapY * 100}vh - 1em)` }}>
            {LEAF_WORDS.map((w) => <span className="leaf__word" key={w}>{w}</span>)}
          </div>
        </div>
        <div className="leaf__outro">
          <p>Thirty-two bronze fins, cut like leaves, turn with the Lily as it rises and close over its lantern. Glass, white stone and bronze that catches the last of the sun: a landmark drawn to age slowly.</p>
          <a className="btn" href="/architecture">The architecture<b>↗</b></a>
        </div>
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
      revealText(el);
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
      <span className="era-statement__k">06 / A promise</span>
      <p data-fill>Great architecture has always promised more than shelter. It promises a way of living: light that moves across a room, materials that age with grace, and a presence on the street that people remember. AFRAH is built to keep that promise.</p>
      <blockquote><span className="era-statement__q" aria-hidden="true">“</span><span data-lines>We drew AFRAH for the next hundred years — a silhouette the city will recognise from any direction.</span><cite data-rise><i />Lead architect, AFRAH design studio</cite></blockquote>
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
        <div className="era-joy__copy">
          <span className="era-joy__k" data-rise>07 / Everyday life</span>
          <h2 className="era-joy__title" data-lines>The joy<br /><em>of every day</em></h2>
          <p data-fill>Historic streets to wander, schools that open bright futures, parks for quiet mornings and restaurants for long evenings with friends — all within a short walk of your door.</p>
        </div>
        <figure className="era-joy__lead" data-rise><img src="/v3/era/joy-1.webp" alt="A couple walking through the neighbourhood" loading="lazy" data-parallax="6" /></figure>
      </div>
      <ul className="era-joy__stats">{JOY_STATS.map(([n, u, t]) => <li key={t} data-rise><strong>{n}</strong><span>{u}</span><em>{t}</em></li>)}</ul>
      <div className="era-joy__strip">
        {[['joy-2', 'Mornings in the park'], ['joy-c1', 'The Saturday market'], ['joy-c5', 'Round the corner'], ['joy-c6', 'Out in town'], ['joy-c4', 'The concert hall']].map(([k, c], i) => <figure key={k} data-rise style={{ '--i': i }}><div><img src={`/v3/era/${k}.webp`} alt="" loading="lazy" data-parallax={3 + (i % 3) * 2} /></div><figcaption>{c}</figcaption></figure>)}
      </div>
    </section>
  );
}

/* ── 3D map teaser ────────────────────────────────────────────────────── */
const PINS = [
  ['park', 'Central park', '4 min on foot'],
  ['river', 'River embankment', '2 min on foot'],
  ['arena', 'Arena & sports park', '9 min'],
  ['metro', 'Metro station', '7 min'],
  ['old', 'Old town', '12 min'],
];
// The place, in 3D: the district in morning light (EraMapScene draws it on the
// persistent canvas). Pins and routes are placed on the ground every frame.
export function EraMap() {
  const { runwayRef, stageRef } = useStage('place', {
    runway: 5,
    build: (tl, { q }) => {
      tl.fromTo(q('.era-map__copy [data-rise]'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.02 }, 0.04)
        .fromTo(q('.era-map__copy .era-w > span'), { yPercent: 105 }, { yPercent: 0, duration: 0.06, stagger: 0.01, ease: 'power3.out' }, 0.05)
        .fromTo(q('.era-map__pin3d--home'), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.05, ease: 'back.out(2)' }, 0.1)
        .fromTo(q('.era-map__place3d'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.04 }, 0.2)
        .fromTo(q('.era-map__routes3d line'), { strokeDashoffset: 400 }, { strokeDashoffset: 0, duration: 0.12, stagger: 0.04 }, 0.22)
        .fromTo(q('.era-map__panel'), { xPercent: -100 }, { xPercent: 0, duration: 0.08, ease: 'power3.out' }, 0)
        .to(q('.era-map__copy'), { autoAlpha: 0, y: -30, duration: 0.06 }, 0.9);
    },
    onProgress: () => setTheme('light'),
  });
  return (
    <section className="runway" ref={runwayRef} id="map-teaser">
      <div className="stage era-map" ref={stageRef}>
        <svg className="era-map__routes3d" width="100%" height="100%" aria-hidden="true">{PINS.map(([id]) => <line key={id} data-route={id} />)}</svg>
        <div className="era-map__pin3d era-map__pin3d--home" data-pin="home" aria-hidden="true"><i className="halo" /><i className="halo halo--2" /><b>A</b></div>
        {PINS.map(([id, n, t]) => <div className="era-map__place3d" data-pin={id} key={id}><i /><span>{n}</span><em>{t}</em></div>)}
        <div className="era-map__panel" aria-hidden="true" />
        <div className="era-map__copy">
          <span className="t-small" data-rise>08 / The place</span>
          <h2 className="era-map__serif">{words('At the centre')}<br />{words('of')} <em>{words('everything')}</em></h2>
          <p className="era-map__lede" data-rise>A river bend, a park on the doorstep and the old town a short walk away. Scroll to turn the city.</p>
          <a className="btn" href="/map" data-rise><span className="btn__icon">3D</span>Open the 3D map<b>↗</b></a>
        </div>
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
        <p data-fill>Every tree in the courtyard garden was chosen to bring a little of the countryside into the city. Clipped hedges, seasonal planting and quiet benches — and a view of green from every window.</p>
      </div>
      <figure className="era-garden__aerial"><img src="/v3/era/labirint.webp" alt="The formal courtyard garden seen from above" loading="lazy" data-parallax="8" /></figure>
    </section>
  );
}

/* ── Interiors ────────────────────────────────────────────────────────── */
const ROOMS = [
  ['01', 'The lobby', 'Double height, under a crystal chandelier', '/v3/era/int-2.webp'],
  ['02', 'Concierge', 'Warm stone, walnut and a fire', '/v3/era/int-3.webp'],
  ['03', 'The lounge', 'Arched windows onto the garden', '/v3/era/ceilings.webp'],
  ['04', 'The library', 'Books, armchairs and a quiet hour', '/v3/silver/lobby-bottom.webp'],
];
export function EraInteriors() {
  const ref = useRef(null);
  useReveals(ref);
  return (
    <section className="int2" ref={ref} id="interiors">
      <header className="int2__head">
        <span className="int2__k" data-rise>09 / Interiors</span>
        <h2 data-lines>Rooms like<br /><em>a private house</em></h2>
        <p data-fill>Lobbies by day and by night, lounges, a library and residents’ salons — each designed as a room in a private house, in stone, bronze, oak and silk.</p>
      </header>
      <div className="int2__grid">
        {ROOMS.map(([n, t, d, img], i) => (
          <figure className={`int2__f int2__f--${i + 1}`} key={n} data-rise>
            <div className="int2__img"><img src={img} alt={t} loading="lazy" data-parallax={4 + (i % 2) * 4} /></div>
            <figcaption><b>{n}</b><span>{t}</span><small>{d}</small></figcaption>
          </figure>
        ))}
      </div>
      <div className="int2__foot">
        <p data-rise>Every residence is finished with the same care: oak floors, stone bathrooms and bronze hardware.</p>
        <a className="btn" href="/residences" data-rise>Explore the residences<b>↗</b></a>
      </div>
    </section>
  );
}

/* ── A new landmark: the Lily ─────────────────────────────────────────── */
export function EraArtDeco() {
  const ref = useRef(null);
  useReveals(ref);
  return (
    <section className="era-deco" ref={ref} id="art-deco" onPointerEnter={() => setTheme('dark')}>
      <span className="t-small era-kicker" data-rise>04 / A place of art</span>
      <h2 className="era-deco__title" data-words>{words('A NEW')}<br />{words('LANDMARK')}</h2>
      <figure className="era-deco__img" data-rise><img src="/media/renders/lily-crown.webp" alt="The Lily's crown of bronze fins closing over its glass lantern" loading="lazy" data-parallax="8" /></figure>
      <p className="era-deco__text" data-fill>The Lily turns an eighth of a turn as it rises, and thirty-two bronze fins turn with it, closing over a lantern of glass at the top. By day it holds the sky; at night it is the brightest thing on the river.</p>
    </section>
  );
}

/* ── Ceilings: 5.89 m ─────────────────────────────────────────────────── */
export function EraCeilings() {
  const ref = useRef(null);
  useReveals(ref, (el) => {
    const n = el.querySelector('.era-ceil__num b'), o = { v: 0 };
    gsap.to(o, { v: 5.89, duration: 2.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 60%' }, onUpdate: () => { n.textContent = o.v.toFixed(2); } });
    gsap.fromTo(el.querySelector('.era-ceil__img img'), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  });
  return (
    <section className="era-ceil" ref={ref} id="ceilings" onPointerEnter={() => setTheme('light')}>
      <figure className="era-ceil__img"><img src="/v3/era/ceilings.webp" alt="A double-height lounge under a coffered ceiling" loading="lazy" /></figure>
      <div className="era-ceil__card" data-rise>
        <span className="t-small">Ceiling height, m</span>
        <p className="era-ceil__num"><b>0.00</b></p>
        <p>Lobbies and lounges rise almost six metres, so the light comes in high and falls deep into every room.</p>
      </div>
    </section>
  );
}

/* ── Apartments: two ways in ──────────────────────────────────────────── */
export function EraApartments() {
  const ref = useRef(null);
  useReveals(ref);
  return (
    <section className="era-apart" ref={ref} id="apartments" onPointerEnter={() => setTheme('dark')}>
      <img className="era-apart__bg" src="/v3/era/apart-bg.webp" alt="" aria-hidden="true" data-parallax="6" />
      <div className="era-apart__head"><span className="t-small era-kicker" data-rise>10 / Residences</span><h2 data-words>{words('APARTMENTS')}</h2></div>
      <div className="era-apart__cards">
        <a className="era-apart__card" href="/residences" data-rise><span className="t-small">Select by criteria</span><strong>Bedrooms, level, area, view</strong><b>Select an apartment</b></a>
        <a className="era-apart__card era-apart__card--img" href="/select" data-rise><img src="/media/renders/quarter.webp" alt="" aria-hidden="true" /><span className="t-small">Visual selection</span><strong>Pick a floor on the tower</strong><b>Open the tower</b></a>
      </div>
    </section>
  );
}

/* ── A new era: the last word ─────────────────────────────────────────── */
export function EraOutro() {
  const ref = useRef(null);
  useReveals(ref, (el) => {
    gsap.fromTo(el.querySelector('.era-outro__bg'), { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
  });
  return (
    <section className="era-outro" ref={ref} id="new-era" onPointerEnter={() => setTheme('dark')}>
      <img className="era-outro__bg" src="/media/renders/quarter-river.webp" alt="" aria-hidden="true" />
      <div className="era-outro__copy">
        <span className="t-small" data-rise>A place where life becomes art</span>
        <h2 data-words>{words('A NEW ERA')}<br />{words('FOR THE CITY,')}<br />{words('A NEW CHAPTER')}<br />{words('IN YOUR LIFE.')}</h2>
        <a className="btn" href="#contact" data-rise>Request a call<b>↗</b></a>
      </div>
    </section>
  );
}
