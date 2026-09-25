import {useEffect, useRef, useState} from 'react';
import gsap from 'gsap';
import {heroScene, tunnelScene, objectScene, galleryScene} from './scenes';
import {eraFilm, eraSelect, eraMap, PLACES, LEVELS} from './era';
import {UNITS} from './residences-data';
import {Link} from './App';

// Scroll progress of a pinned section (0 → 1) + whether it is near enough to exist at all.
// Only scenes within ~1 viewport are mounted; everything else is disposed (one major WebGL scene at a time).
function useSection(ref, margin = '120% 0px') {
  const progress = useRef(0), [p, setP] = useState(0), [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {rootMargin: margin}); io.observe(el);
    const tw = gsap.to({}, {scrollTrigger: {trigger: el, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { progress.current = s.progress; setP(Math.round(s.progress * 100) / 100); }}});
    return () => { io.disconnect(); tw.scrollTrigger?.kill(); tw.kill(); };
  }, []);
  return {progress, p, near};
}
const still = {current: 0};
export function Scene({factory, progress = still, args = [], className = 'f-canvas'}) {
  const el = useRef();
  useEffect(() => { const s = factory(el.current, () => progress.current, ...args); dispatchEvent(new CustomEvent('afrah:ready', {detail: 'hero'})); return () => s.dispose(); }, []);
  return <div className={className} ref={el}/>;
}
// Mounts only while within ~1 viewport of the screen.
function useNear(ref, margin) {
  const [near, setNear] = useState(false);
  useEffect(() => { const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {rootMargin: margin}); io.observe(ref.current); return () => io.disconnect(); }, []);
  return near;
}
const on = (p, a, b) => p >= a && p < b;

/* 00 → 01 · ribbed hero that opens into light */
function Hero() {
  const ref = useRef(), {progress, p, near} = useSection(ref);
  return <section className="f-pin f-hero" ref={ref} style={{height: '420vh'}}>
    <div className="f-sticky">
      {near && <Scene factory={heroScene} progress={progress}/>}
      <div className={`f-hero-title ${p < .55 ? 'on' : ''}`}><h1>AFRAH</h1><span>Residences on the river</span></div>
      <div className={`f-cue ${p < .06 ? 'on' : ''}`}>Scroll to enter</div>
      <div className="f-light" style={{opacity: Math.max(0, (p - .82) / .18)}}/>
    </div>
  </section>;
}

/* 02 → 03 · the building, four shots */
const SHOTS = [[.02, .24, 'Residences', 'Twenty-six levels on the water.'], [.28, .48, 'Light', 'Rooms that glow, never all at once.'], [.52, .72, 'Detail', 'Stone, bronze, deep reveals.'], [.78, 1.01, 'Terraces', 'Every setback, a garden.']];
function Building() {
  const ref = useRef(), {progress, p, near} = useSection(ref, '80% 0px');
  return <section className="f-pin f-building" ref={ref} style={{height: '520vh'}}>
    <div className="f-sticky">
      {near && <Scene factory={eraFilm} progress={progress}/>}
      <div className="f-light" style={{opacity: Math.max(0, 1 - p / .05)}}/>
      {SHOTS.map(([a, b, t, s], i) => <div key={t} className={`f-caption ${i % 2 ? 'right' : ''} ${on(p, a, b) ? 'on' : ''}`}><em>0{i + 1}</em><strong>{t}</strong><span>{s}</span></div>)}
    </div>
  </section>;
}

function Pause({num, word, image, line, alt}) {
  return <section className="f-pause">
    <div className="f-pause-head"><span>{num}</span></div>
    <h2 className="f-serif">{word}</h2>
    <figure className="f-pause-img"><img src={image} alt={alt} loading="lazy"/></figure>
    <p>{line}</p>
  </section>;
}

/* 05 · architectural tunnel → light fills the screen */
function Tunnel() {
  const ref = useRef(), {progress, p, near} = useSection(ref);
  return <section className="f-pin f-tunnel" ref={ref} style={{height: '460vh'}}>
    <div className="f-sticky">
      {near && <Scene factory={tunnelScene} progress={progress}/>}
      <div className={`f-caption center ${on(p, .08, .5) ? 'on' : ''}`}><em>02</em><strong>Structure</strong><span>A passage of facade fins.</span></div>
      <div className="f-light" style={{opacity: Math.max(0, (p - .86) / .14)}}/>
    </div>
  </section>;
}

function Materials() {
  const m = [['Stone', '/v3/era/ceilings.webp'], ['Glass', '/v3/silver/gallery-4.webp'], ['Wood', '/media/living.webp'], ['Fabric', '/media/bedroom.webp'], ['Garden', '/v3/silver/court-5.webp']];
  return <section className="f-materials">
    <div className="f-materials-head"><span>03 / Material</span><h2 className="f-serif">Made to be<br/>touched.</h2></div>
    <div className="f-materials-grid">{m.map(([n, src], i) => <figure key={n} className={`m${i}`}><img src={src} alt={n} loading="lazy"/><figcaption>{n}</figcaption></figure>)}</div>
  </section>;
}

function ObjectMoment() {
  const ref = useRef(), {progress, p, near} = useSection(ref);
  return <section className="f-pin f-object" ref={ref} style={{height: '260vh'}}>
    <div className="f-sticky">
      {near && <Scene factory={objectScene} progress={progress}/>}
      <div className="f-object-words">{['Stone', 'Glass', 'Light'].map((w, i) => <span key={w} className={p > i * .28 ? 'on' : ''}>{w}</span>)}</div>
    </div>
  </section>;
}

const MOMENTS = [
  {src: '/v3/silver/time-1.webp', label: 'Morning'}, {src: '/v3/silver/gallery-4.webp', label: 'Light'}, {src: '/v3/era/int-2.webp', label: 'Inside'},
  {src: '/v3/silver/terraces.webp', label: 'Outside'}, {src: '/v3/silver/arch-intro.webp', label: 'Evening'},
];
function Gallery() {
  const ref = useRef(), {progress, near} = useSection(ref), [idx, setIdx] = useState(0);
  return <section className="f-pin f-gallery" ref={ref} style={{height: '560vh'}}>
    <div className="f-sticky">
      {near && <Scene factory={galleryScene} progress={progress} args={[MOMENTS, setIdx]}/>}
      <div className="f-gallery-label"><em>{String(idx + 1).padStart(2, '0')}</em><strong key={idx}>{MOMENTS[idx].label}</strong></div>
      <div className="f-gallery-index">{MOMENTS.map((m, i) => <i key={m.label} className={i === idx ? 'on' : ''}/>)}</div>
    </div>
  </section>;
}

export function Residences({head = '04 / Residences', link = true}) {
  const ref = useRef(), near = useNear(ref, '60% 0px'), [floor, setFloor] = useState(14), [hover, setHover] = useState(null);
  const live = useRef({}).current; Object.assign(live, {selected: floor, onSelect: setFloor, onHover: setHover});
  const lv = hover || floor, r = UNITS.find(unit => unit.floor === lv) || UNITS[0];
  return <section className="f-res" ref={ref}>
    <div className="f-res-stage">{near && <Scene factory={eraSelect} args={[live]}/>}<span className="f-res-hint">Hover a level · drag to turn</span></div>
    <aside className="f-res-panel">
      <span>{head}</span>
      <strong className="f-serif">{String(lv).padStart(2, '0')}</strong>
      <dl><dt>Residence</dt><dd>{r.id}</dd><dt>Area</dt><dd>{r.area} m²</dd><dt>Bedrooms</dt><dd>{r.beds}</dd><dt>Orientation</dt><dd>{r.aspect}</dd></dl>
      <div className="f-res-steps"><button onClick={() => setFloor(f => Math.max(2, f - 1))} aria-label="Level down">−</button><button onClick={() => setFloor(f => Math.min(LEVELS, f + 1))} aria-label="Level up">+</button></div>
      {link && <Link to="/residences" className="f-pill">All residences</Link>}
    </aside>
  </section>;
}

export function PlaceMap({interactive = true}) {
  const ref = useRef(), pins = useRef(), api = useRef({}).current, near = useNear(ref, '50% 0px'), [h, setH] = useState(0);
  const choose = i => { setH(i); api.focus?.(PLACES[i]); };
  return <div className={`f-map ${interactive ? '' : 'still'}`} ref={ref}>
    {near && <Scene factory={eraMap} args={[{pins, interactive, api}]} className="f-map-canvas"/>}
    <div className="f-map-pins" ref={pins}>{PLACES.map((p, i) => <button key={p.id} className={`m-pin ${i ? '' : 'home'} ${h === i ? 'on' : ''}`} onClick={() => choose(i)}><i/><span>{p.name}{i ? <em>{p.time} min</em> : null}</span></button>)}</div>
    <div className="f-map-read"><span>{PLACES[h].cat}</span><strong className="f-serif">{PLACES[h].name}</strong><em>{h ? `${PLACES[h].time} min on foot` : 'Home'}</em></div>
    {interactive && <div className="f-map-tools"><button aria-label="Zoom in" onClick={() => api.zoom?.(.7)}>+</button><button aria-label="Zoom out" onClick={() => api.zoom?.(1.4)}>−</button><button aria-label="Reset view" onClick={() => { setH(0); api.home?.(); }}>○</button></div>}
  </div>;
}

function Finale() {
  const ref = useRef(), near = useNear(ref, '40% 0px');
  return <section className="f-finale" ref={ref}>
    {near && <Scene factory={eraFilm} args={[{orbit: true}]}/>}
    <div className="f-finale-word"><h2 className="f-serif">AFRAH</h2><span>The lights are on.</span></div>
  </section>;
}

export default function Film() {
  return <>
    <Hero/>
    <Building/>
    <Pause num="01 / Architecture" word="Material." image="/v3/era/int-deco.webp" alt="Stone and bronze detail" line="Honed stone, bronze, and the depth of a window."/>
    <Tunnel/>
    <Materials/>
    <ObjectMoment/>
    <Gallery/>
    <Residences/>
    <section className="f-place"><div className="f-place-head"><span>05 / Place</span><h2 className="f-serif">On the river.</h2></div><PlaceMap/></section>
    <Finale/>
    <section className="f-cta"><Link to="/viewing" className="f-pill big">Arrange a viewing</Link><Link to="/residences" className="f-pill big ghost">Explore residences</Link></section>
  </>;
}
