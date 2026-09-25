import React, { useEffect, useRef, useState } from 'react';
import { World } from './World.js';

const PATH = window.location.pathname.replace(/\/$/, '') || '/';
const chapters = [
  ['arrival', 'Arrival'], ['threshold', 'The opening'], ['architecture', 'Architecture'],
  ['material', 'Material'], ['passage', 'The passage'], ['sculpture', 'The object'],
  ['life', 'Life'], ['residences', 'Residences'], ['place', 'Place'], ['viewing', 'Viewing'],
];
const moments = [
  { name: 'Morning', image: '/v8/photos/morning.webp', note: 'A slower beginning.' },
  { name: 'Architecture', image: '/v8/photos/architecture.webp', note: 'Form with purpose.' },
  { name: 'Inside', image: '/v8/photos/inside.webp', note: 'A sense of arrival.' },
  { name: 'Outside', image: '/v8/photos/outside.webp', note: 'Room to breathe.' },
  { name: 'Evening', image: '/v8/photos/evening.webp', note: 'Light that stays.' },
];
const homes = [
  { floor: '03', residence: 'A.03', area: '146 m²', beds: '2 bedrooms', aspect: 'East / garden' },
  { floor: '07', residence: 'B.07', area: '182 m²', beds: '3 bedrooms', aspect: 'South / city' },
  { floor: '11', residence: 'C.11', area: '221 m²', beds: '3 bedrooms', aspect: 'West / sunset' },
  { floor: '16', residence: 'D.16', area: '304 m²', beds: '4 bedrooms', aspect: 'Panoramic' },
];

function Nav({ light = false }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const close = (event) => { if (event.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  return <>
    <header className={`v8-nav${light ? ' v8-nav--light' : ''}`}>
      <a className="v8-nav__brand" href="/" aria-label="Afrah home">AFRAH<span>RESIDENCES</span></a>
      <nav className="v8-nav__links" aria-label="Main navigation">
        <a href="/residences">RESIDENCES</a><a href="/place">PLACE</a><a href="/viewing">VIEWING</a>
      </nav>
      <button className="v8-nav__menu" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="v8-menu">{open ? 'CLOSE' : 'MENU'} <span>{open ? '×' : '+'}</span></button>
    </header>
    <div id="v8-menu" className={`v8-menu-overlay${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <span className="v8-menu-overlay__eyebrow">THE AFRAH STORY</span>
      <nav aria-label="All pages">{[
        ['/', 'Home'], ['/architecture', 'Architecture'], ['/residences', 'Residences'],
        ['/place', 'Place'], ['/gallery', 'Life at Afrah'], ['/viewing', 'Arrange a viewing'],
      ].map(([href, label], i) => <a key={href} href={href} onClick={() => setOpen(false)}><small>0{i + 1}</small>{label}<span>↗</span></a>)}</nav>
      <span className="v8-menu-overlay__foot">A study in light, material and place.</span>
    </div>
  </>;
}

function Loader({ loaded }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setProgress((n) => loaded ? Math.min(100, n + 9) : Math.min(90, n + 3)), 100);
    return () => clearInterval(timer);
  }, [loaded]);
  return <div className={`v8-loader${loaded && progress >= 100 ? ' is-complete' : ''}`} aria-hidden={loaded && progress >= 100}>
    <div className="v8-loader__art" />
    <span className="v8-loader__top">AFRAH <span>·</span> RESIDENCES</span>
    <div className="v8-loader__center"><span>AN ARCHITECTURAL STORY</span><strong>AFRAH</strong><em>Coming into view.</em></div>
    <div className="v8-loader__bottom"><span>PLEASE WAIT</span><div className="v8-loader__track"><i style={{ transform: `scaleX(${progress / 100})` }} /></div><span>{String(progress).padStart(2, '0')}%</span></div>
  </div>;
}

function Label({ number, children }) { return <div className="v8-label"><span>{number}</span><span>{children}</span></div>; }

function Cinema({ onReady }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let world; let raf = 0; let disposed = false;
    try { world = new World(canvasRef.current); }
    catch (error) { console.warn('WebGL unavailable', error); onReady(); return; }
    window.__afrahWorld = world;
    window.dispatchEvent(new Event('afrah:worldready'));
    const warmup = setTimeout(onReady, 7000);
    world.ready.then(() => { if (!disposed) { clearTimeout(warmup); onReady(); } });
    const sections = [...document.querySelectorAll('[data-scene]')];
    const gallery = document.getElementById('life');
    const cards = [...document.querySelectorAll('.v8-memory')];
    const counter = document.querySelector('.v8-gallery__counter');
    const name = document.querySelector('.v8-gallery__name');
    const line = document.querySelector('.v8-gallery__progress i');
    let galleryAt = 0;
    let previousFrame = performance.now();
    const update = () => {
      const now = performance.now();
      const delta = Math.min(64, now - previousFrame);
      previousFrame = now;
      const center = innerHeight * .52;
      let active = sections[0];
      for (const section of sections) {
        const r = section.getBoundingClientRect();
        if (r.top <= center && r.bottom >= center) { active = section; break; }
      }
      if (active) {
        const r = active.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
        world.set(active.dataset.scene, p);
        active.style.setProperty('--scene-progress', p);
        if (active.dataset.scene === 'selector') active.classList.toggle('is-selecting', p > .25);
        document.documentElement.dataset.chapter = active.dataset.chapter || '';
      }
      if (gallery && cards.length) {
        const r = gallery.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
        const target = p * (moments.length - 1);
        galleryAt += (target - galleryAt) * (1 - Math.exp(-delta * .015));
        const at = galleryAt;
        const cardWidth = innerWidth < 800 ? innerWidth * .67 : Math.min(innerWidth * .34, 550);
        cards.forEach((card, i) => {
          const d = i - at, distance = Math.abs(d), near = Math.max(0, 1 - distance);
          const x = (innerWidth - cardWidth) / 2 + d * innerWidth * .38;
          card.style.transform = `translate3d(${x}px, -50%, ${-distance * 360}px) rotateY(${-d * 19}deg) rotateZ(${Math.sin(d) * 2.5}deg) scale(${.74 + near * .26})`;
          card.style.opacity = Math.max(0, 1 - distance * .38);
          card.style.filter = `brightness(${1 - Math.min(.36, distance * .15)})`;
          card.style.visibility = distance > 2.5 ? 'hidden' : 'visible';
          card.style.zIndex = String(20 - Math.round(distance));
        });
        const selected = Math.min(moments.length - 1, Math.round(at));
        if (counter) counter.textContent = `0${selected + 1} / 0${moments.length}`;
        if (name) name.textContent = moments[selected].name;
        if (line) line.style.transform = `scaleX(${p})`;
      }
      world.render();
      raf = requestAnimationFrame(update);
    };
    const move = (event) => {
      world.pointer((event.clientX / innerWidth - .5) * 2, (.5 - event.clientY / innerHeight) * 2);
      if (world.mode === 'selector' && !event.target.closest?.('.v8-selector__diagram')) world.hoverFloor = world.pickFloor(event.clientX, event.clientY) ?? -9;
    };
    const selectFloor = (event) => {
      if (world.mode !== 'selector' || !event.target.closest?.('.v8-residences') || event.target.closest?.('button,a')) return;
      const floor = world.pickFloor(event.clientX, event.clientY);
      if (floor) window.dispatchEvent(new CustomEvent('afrah:select-floor', { detail: { floor } }));
    };
    const resize = () => world.resize();
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', selectFloor);
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(update);
    return () => { disposed = true; clearTimeout(warmup); cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', selectFloor); window.removeEventListener('resize', resize); world.dispose(); delete window.__afrahWorld; };
  }, [onReady]);
  return <div className="v8-world" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}

function ResidenceSelector({ compact = false }) {
  const [index, setIndex] = useState(1);
  const h = homes[index];
  useEffect(() => {
    const sync = () => { if (window.__afrahWorld) window.__afrahWorld.selectedFloor = Number(h.floor); };
    sync(); window.addEventListener('afrah:worldready', sync);
    return () => window.removeEventListener('afrah:worldready', sync);
  }, [h.floor]);
  useEffect(() => {
    const select = (event) => { const next = homes.findIndex((home) => Number(home.floor) === event.detail.floor); if (next >= 0) setIndex(next); };
    window.addEventListener('afrah:select-floor', select);
    return () => window.removeEventListener('afrah:select-floor', select);
  }, []);
  return <div className={`v8-selector${compact ? ' v8-selector--compact' : ''}`}>
    <div className="v8-selector__diagram" aria-label="Select a floor">
      <span className="v8-selector__roof">AFRAH</span>
      {[...homes].reverse().map((home, reverseIndex) => {
        const i = homes.length - 1 - reverseIndex;
        return <button key={home.floor} className={i === index ? 'is-selected' : ''} onClick={() => setIndex(i)} onPointerEnter={() => { if (window.__afrahWorld) window.__afrahWorld.hoverFloor = Number(home.floor); }} onPointerLeave={() => { if (window.__afrahWorld) window.__afrahWorld.hoverFloor = -9; }} aria-label={`Select floor ${home.floor}`} aria-pressed={i === index}><span>LEVEL {home.floor}</span><i /></button>;
      })}
      <span className="v8-selector__base">GROUND · ARRIVAL</span>
    </div>
    <div className="v8-selector__detail"><span className="v8-eyebrow">SELECTED RESIDENCE / {h.floor}</span><h3>{h.residence}</h3><div className="v8-selector__facts"><div><small>AREA</small>{h.area}</div><div><small>PLAN</small>{h.beds}</div><div><small>ORIENTATION</small>{h.aspect}</div></div><a className="v8-text-link" href={`/viewing?residence=${encodeURIComponent(h.residence)}`}>ENQUIRE ABOUT THIS RESIDENCE <span>↗</span></a></div>
  </div>;
}

const landmarks = [
  { name: 'AFRAH', kind: 'Residences', x: 49, y: 50 },
  { name: 'THE GARDENS', kind: 'Landscape', x: 25, y: 24 },
  { name: 'CULTURAL WALK', kind: 'Culture', x: 75, y: 28 },
  { name: 'THE GROVE', kind: 'Landscape', x: 70, y: 72 },
];
function PlaceMap() {
  const [selected, setSelected] = useState(0);
  return <div className="v8-map"><div className="v8-map__graphic" role="img" aria-label="Conceptual architectural map showing Afrah and nearby landmarks">
    <svg viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path className="road" d="M-40 138 L940 390 M-20 480 L935 65 M152 -30 L410 590 M755 -30 L565 590"/><path className="street" d="M-20 315 L940 520 M70 -20 L310 580 M625 -20 L820 590 M-20 500 L910 198"/><path className="block" d="M85 160 L207 200 L236 298 L134 264 Z M264 86 L402 117 L431 221 L299 189 Z M560 98 L700 146 L672 260 L524 217 Z M143 377 L286 411 L261 509 L117 476 Z M659 372 L794 410 L774 512 L632 478 Z"/><path className="park" d="M51 45 Q181 10 279 72 L209 146 L88 136 Z M651 268 Q773 230 866 304 L847 379 L705 353 Z"/><path className="afrah" d="M379 256 L506 222 L579 283 L542 384 L415 408 L343 341 Z"/><path className="afrah-inner" d="M402 275 L502 250 L553 291 L520 357 L424 381 L371 334 Z"/></svg>
    {landmarks.map((item, i) => <button key={item.name} className={`v8-map__pin${i === selected ? ' is-active' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setSelected(i)} aria-label={`Show ${item.name}`}><i /><span>{item.name}</span></button>)}
    <span className="v8-map__north">N ↑</span>
  </div><div className="v8-map__detail"><span className="v8-eyebrow">0{selected + 1} / 04 — {landmarks[selected].kind}</span><h3>{landmarks[selected].name}</h3><p>{selected === 0 ? 'A considered point of arrival, connected to landscape and city.' : 'Part of the everyday world around Afrah.'}</p><a className="v8-text-link" href="/place">EXPLORE THE PLACE <span>↗</span></a></div></div>;
}

function ViewingForm() {
  const [status, setStatus] = useState('idle');
  const [reference, setReference] = useState('');
  const residence = new URLSearchParams(location.search).get('residence') || '';
  const submit = async (event) => {
    event.preventDefault(); setStatus('sending');
    try {
      const response = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      setReference(result.reference); setStatus('sent');
    } catch { setStatus('error'); }
  };
  return <form className="v8-form" onSubmit={submit}>
    <div className="v8-form__row"><label>YOUR NAME<input name="name" autoComplete="name" required placeholder="Name" /></label><label>EMAIL ADDRESS<input name="email" type="email" autoComplete="email" required placeholder="Email" /></label></div>
    <div className="v8-form__row"><label>PHONE NUMBER<input name="phone" type="tel" autoComplete="tel" placeholder="Phone (optional)" /></label><label>INTEREST<select name="interest" defaultValue="viewing"><option value="viewing">Arrange a viewing</option><option value="residences">Explore residences</option><option value="architecture">Architecture enquiry</option></select></label></div>
    {residence && <input type="hidden" name="residence" value={residence} />}
    <label className="v8-form__consent"><input type="checkbox" name="consent" value="yes" required /> I agree to be contacted about this enquiry.</label>
    <button className="v8-form__submit" type="submit" disabled={status === 'sending' || status === 'sent'}>{status === 'sending' ? 'SENDING…' : status === 'sent' ? `REQUEST RECEIVED · ${reference}` : 'REQUEST A VIEWING'} <span>↗</span></button>
    {status === 'error' && <p role="alert">We could not send your request. Please try again.</p>}
  </form>;
}

function Footer() { return <footer className="v8-footer"><a href="/">AFRAH<span>RESIDENCES</span></a><div><a href="/architecture">ARCHITECTURE</a><a href="/residences">RESIDENCES</a><a href="/place">PLACE</a><a href="/viewing">VIEWING</a></div><small>© {new Date().getFullYear()} AFRAH · VISUAL STUDY</small></footer>; }

function Home() {
  const [ready, setReady] = useState(false);
  const onReady = React.useCallback(() => setReady(true), []);
  useEffect(() => { document.title = 'AFRAH — Architecture for living'; }, []);
  return <><Cinema onReady={onReady} /><Nav /><Loader loaded={ready} /><main className="v8-home">
    <section id="arrival" className="v8-cinema-section v8-hero" data-scene="hero" data-chapter="arrival"><div className="v8-sticky"><div className="v8-hero__sky" /><div className="v8-hero__top"><span>01 / THE RESIDENCES</span><span>AN ARCHITECTURAL STORY</span></div><h1>AFRAH</h1><div className="v8-hero__bottom"><span>FORMED BY LIGHT</span><span>SCROLL TO ENTER <i>↓</i></span></div></div></section>
    <section id="threshold" className="v8-cinema-section v8-threshold" data-scene="threshold" data-chapter="threshold"><div className="v8-sticky"><Label number="02 / 10">THE OPENING</Label><div className="v8-threshold__copy"><span>ARCHITECTURE BEGINS WITH A FEELING</span><h2>A way<br/><em>through.</em></h2></div><span className="v8-section-tail">LIGHT FINDS ITS WAY IN.</span></div></section>
    <section id="architecture" className="v8-cinema-section v8-building" data-scene="building" data-chapter="architecture"><div className="v8-sticky"><Label number="03 / 10">THE ARCHITECTURE</Label><div className="v8-building__copy"><h2>Form<br/>in balance.</h2><span>STONE · GLASS · LIGHT</span></div><div className="v8-building__meta"><span>AN OBJECT TO EXPERIENCE</span><a href="/architecture">EXPLORE ARCHITECTURE ↗</a></div></div></section>
    <section id="material" className="v8-material" data-scene="none" data-chapter="material"><div className="v8-material__intro"><Label number="04 / 10">THE MATERIAL</Label><h2>Close enough<br/>to feel.</h2><p>Light, texture and proportion shape the everyday.</p></div><div className="v8-material__image"><img src="/v8/photos/outside.webp" alt="Afrah limestone facade and planted terrace" loading="lazy"/><span>01 / STONE</span></div><div className="v8-material__pair"><figure><img src="/v8/photos/inside.webp" alt="Afrah entrance interior with natural materials" loading="lazy"/><figcaption>02 / INTERIOR</figcaption></figure><p>Honest material.<br/>Quiet detail.<br/>An enduring sense of place.</p></div></section>
    <section id="passage" className="v8-cinema-section v8-passage" data-scene="tunnel" data-chapter="passage"><div className="v8-sticky"><Label number="05 / 10">THE PASSAGE</Label><h2>Into the light.</h2><div className="v8-passage__bottom"><span>THE LANGUAGE OF THE FACADE, REIMAGINED IN SPACE.</span><span>CONTINUE ↓</span></div></div></section>
    <section id="light" className="v8-light-bridge" data-scene="none" data-chapter="material"><div><span className="v8-eyebrow">BEYOND THE PASSAGE</span><h2>Light has<br/><em>its own room.</em></h2></div><figure><img src="/v8/photos/morning.webp" alt="Morning light within an Afrah residence" loading="lazy"/><figcaption>SPACE / MATERIAL / LIGHT</figcaption></figure></section>
    <section id="sculpture" className="v8-cinema-section v8-sculpture" data-scene="sculpture" data-chapter="sculpture"><div className="v8-sticky"><Label number="06 / 10">THE OBJECT</Label><div className="v8-sculpture__copy"><span>A STUDY OF PRESENCE</span><h2>Stone.<br/>Light.<br/><em>Time.</em></h2><p>Material becomes a moment.</p></div></div></section>
    <section id="life" className="v8-cinema-section v8-gallery" data-scene="none" data-chapter="life"><div className="v8-sticky"><Label number="07 / 10">LIFE AT AFRAH</Label><div className="v8-gallery__heading"><span>THE MOMENTS IN BETWEEN</span><h2>Life, in layers.</h2></div><div className="v8-gallery__space">{moments.map((m, i) => <figure key={m.name} className="v8-memory"><img src={m.image} alt={`${m.name}: ${m.note}`} loading="lazy"/><figcaption>0{i + 1} / {m.name}</figcaption></figure>)}</div><div className="v8-gallery__caption"><span className="v8-gallery__counter">01 / 05</span><strong className="v8-gallery__name">Morning</strong><div className="v8-gallery__progress"><i /></div></div></div></section>
    <section id="residences" className="v8-residences" data-scene="selector" data-chapter="residences"><div className="v8-section-head"><Label number="08 / 10">THE RESIDENCES</Label><h2>Find your<br/><em>perspective.</em></h2><p>A small collection of spaces, each with its own outlook.</p></div><ResidenceSelector/><a className="v8-inline-cta" href="/residences">DISCOVER ALL RESIDENCES <span>↗</span></a></section>
    <section id="place" className="v8-place" data-scene="none" data-chapter="place"><div className="v8-section-head"><Label number="09 / 10">THE PLACE</Label><h2>Grounded<br/>in place.</h2></div><PlaceMap/></section>
    <section id="finale" className="v8-cinema-section v8-finale" data-scene="final" data-chapter="finale"><div className="v8-sticky"><Label number="10 / 10">AN EVENING AT AFRAH</Label><h2>AFRAH</h2></div></section>
    <section id="viewing" className="v8-viewing" data-scene="none" data-chapter="viewing"><div><Label number="THE NEXT CHAPTER">YOUR VISIT</Label><h2>Come and<br/><em>see.</em></h2><p>Arrange a private conversation with our team.</p></div><ViewingForm/></section>
  </main><Footer/></>;
}

const pageData = {
  '/architecture': { eyebrow: '01 / ARCHITECTURE', title: 'Form, in balance.', image: '/v8/photos/architecture.webp', intro: 'A rhythm of solid and open, shaped around the light.', secondary: '/v8/photos/outside.webp', section: 'MATERIAL AS MEMORY', body: 'Stone sets the tone. Glass brings the outside close. Every proportion serves the experience of being here.' },
  '/gallery': { eyebrow: '03 / LIFE AT AFRAH', title: 'Life, in layers.', image: '/v8/photos/outside.webp', intro: 'A collection of moments, spaces and impressions.', secondary: '/v8/photos/inside.webp', section: 'FROM MORNING TO EVENING', body: 'A slower start. A place to gather. The luxury of room to breathe.' },
};
function EditorialPage({ data }) {
  useEffect(() => { document.title = `${data.title} — AFRAH`; }, [data.title]);
  return <><Nav/><main className="v8-page"><section className="v8-page__hero"><img src={data.image} alt="Afrah architectural study"/><div><span className="v8-eyebrow">{data.eyebrow}</span><h1>{data.title}</h1><p>{data.intro}</p></div></section><section className="v8-page__essay"><span className="v8-eyebrow">{data.section}</span><h2>{data.body}</h2><img src={data.secondary} alt="Architectural detail" loading="lazy"/></section><section className="v8-page__links"><a href="/residences">EXPLORE RESIDENCES <span>↗</span></a><a href="/viewing">ARRANGE A VIEWING <span>↗</span></a></section></main><Footer/></>;
}
function ResidencesPage() { useEffect(() => { document.title = 'Residences — AFRAH'; }, []); return <><Nav/><main className="v8-page"><section className="v8-page__text-hero"><span className="v8-eyebrow">02 / THE RESIDENCES</span><h1>Room to<br/><em>be yourself.</em></h1><p>Discover spaces with considered views and natural light.</p></section><section className="v8-page__selector"><Label number="A COLLECTION OF FOUR">SELECT A LEVEL</Label><ResidenceSelector/></section><section className="v8-page__image-band"><img src="/v8/photos/morning.webp" alt="Morning within an Afrah residence" loading="lazy"/><div><span className="v8-eyebrow">THE RESIDENCES</span><h2>Designed around life.</h2><a className="v8-text-link" href="/viewing">ARRANGE A VIEWING ↗</a></div></section></main><Footer/></>; }
function PlacePage() { useEffect(() => { document.title = 'Place — AFRAH'; }, []); return <><Nav/><main className="v8-page"><section className="v8-page__text-hero"><span className="v8-eyebrow">04 / THE PLACE</span><h1>Where the<br/><em>day unfolds.</em></h1><p>An address made by its connections to the city and landscape.</p></section><section className="v8-page__map"><PlaceMap/></section><section className="v8-page__image-band"><img src="/v8/photos/architecture.webp" alt="Afrah within its planted setting" loading="lazy"/><div><span className="v8-eyebrow">CLOSE TO NATURE</span><h2>Life in every direction.</h2></div></section></main><Footer/></>; }
function ViewingPage() { useEffect(() => { document.title = 'Arrange a viewing — AFRAH'; }, []); return <><Nav/><main className="v8-page v8-page--viewing"><div><span className="v8-eyebrow">05 / YOUR VISIT</span><h1>Come and<br/><em>see.</em></h1><p>Arrange a private conversation with our team.</p></div><ViewingForm/></main><Footer/></>; }

export default function App() {
  if (PATH === '/') return <Home/>;
  if (PATH === '/residences' || PATH === '/select') return <ResidencesPage/>;
  if (PATH === '/place' || PATH === '/map') return <PlacePage/>;
  if (PATH === '/viewing') return <ViewingPage/>;
  return <EditorialPage data={pageData[PATH] || pageData['/architecture']}/>;
}
