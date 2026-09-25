import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import gsap from 'gsap';
import {ArrowDown, ArrowUpRight, Play, Box} from 'lucide-react';
import {chapters, dayStops, services, activities} from '../data';
import {Link, Label, Img, Title, TextLink, Statement, Counter, Marquee, Tilt, StickyStack, HGallery, Carousel, SideSwitch, ChapterIndex, useSite} from '../ui';

const Tower = lazy(() => import('../three/Tower'));

// Mount heavy children only once their section approaches the viewport.
export function useNear(ref, margin = '400px') {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, {rootMargin: margin});
    io.observe(ref.current); return () => io.disconnect();
  }, []);
  return near;
}

// Art Deco fan lines drawn behind the hero (ERA loader motif).
const Fan = () => <svg className="v-fan" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  {Array.from({length: 13}, (_, i) => { const x = 600 + (i - 6) * 95; return <path key={i} d={`M600 800 Q${600 + (x - 600) * .35} 380 ${x} 0`} fill="none" stroke="currentColor" strokeWidth="1"/>; })}
  {[220, 380, 540].map(r => <path key={r} d={`M${600 - r} 800 A${r} ${r} 0 0 1 ${600 + r} 800`} fill="none" stroke="currentColor"/>)}
</svg>;

function Hero() {
  return <section className="v-home-hero" data-tone="home">
    <Fan/>
    <div className="v-home-hero-copy v-pad">
      <h1 className="v-home-title" data-lines tabIndex="-1">
        <span className="v-line"><span>One day,</span></span>
        <span className="v-line r"><span className="v-accent">a whole</span></span>
        <span className="v-line"><span className="v-accent">life.</span></span>
      </h1>
      <p className="v-home-caption">The place where a single day<br/>becomes a way of living.</p>
    </div>
    <div className="v-home-hero-foot v-pad">
      <a href="#manifesto" className="v-round" aria-label="Scroll to begin"><ArrowDown size={20}/></a>
      <Label>Scroll — the sun is rising</Label>
      <a href="#tower" className="v-mini-pill"><img src="/v3/era/apart-buildings.webp" alt=""/><span>3D tower</span><Box size={16}/></a>
    </div>
    <div className="v-expand v-home-window" data-expand><Img src="/v3/era/new-era.webp" alt="Stepped residential towers against a pink evening sky" eager/></div>
  </section>;
}

function TowerStory() {
  const ref = useRef(), progress = useRef(0), near = useNear(ref);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const st = gsap.to({}, {scrollTrigger: {trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { progress.current = s.progress; setStep(Math.min(3, Math.floor(s.progress * 4.2))); }}});
    return () => { st.scrollTrigger?.kill(); st.kill(); };
  }, []);
  const caps = [
    ['Make it', 'a paradox.', 'Opposites, joined. The whole idea of AFRAH in four words.'],
    ['Stone that', 'floats.', '01 — A stone podium that seems to hover over the garden, held by slender copper columns.'],
    ['Glass that', 'keeps warmth.', '02 — Deep glazing between vertical fins: light in, glare out, heat kept where it belongs.'],
    ['A crown for', 'the skyline.', '03 — A stepped Art Deco crown that lights up at dusk. Recognisable from the river.'],
  ];
  return <section className="v-tower-story" id="tower" ref={ref} data-tone="night">
    <div className="v-tower-pin">
      <div className="v-grid-floor"/>
      {near && <Suspense fallback={null}><Tower mode="assemble" progress={progress}/></Suspense>}
      <div className="v-tower-caps v-pad">
        {caps.map(([a, b, t], i) => <div key={i} className={`v-tower-cap ${step === i ? 'on' : ''}`} aria-hidden={step !== i}>
          <h2><span>{a}</span><span className="v-accent">{b}</span></h2><p>{t}</p>
        </div>)}
      </div>
      <div className="v-tower-meta v-pad">
        <Label>[ 01 ] The idea / 26 floors / 1 crown</Label>
        <div className="v-tower-steps">{caps.map((_, i) => <i key={i} className={step >= i ? 'on' : ''}/>)}</div>
        <TextLink to="/residences" light>Pick your floor in 3D</TextLink>
      </div>
    </div>
  </section>;
}

// Pinned horizontal "day" — the sky blends through every chapter's colour as you scroll.
function DayRibbon() {
  const ref = useRef(), track = useRef(), sun = useRef();
  useEffect(() => {
    // DOM nodes are captured here: refs are nulled on unmount before this effect's cleanup runs.
    const sec = ref.current, tr = track.current, sn = sun.current, mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tops = gsap.utils.interpolate(dayStops.map(s => s[1])), bots = gsap.utils.interpolate(dayStops.map(s => s[2]));
      gsap.to(tr, {x: () => -(tr.scrollWidth - innerWidth), ease: 'none', scrollTrigger: {
        trigger: sec, start: 'top top', end: () => '+=' + tr.scrollWidth, pin: true, scrub: .8, invalidateOnRefresh: true,
        onUpdate: s => {
          sec.style.setProperty('--sky-top', tops(s.progress)); sec.style.setProperty('--sky-bot', bots(s.progress));
          const a = Math.PI * (1 - s.progress); sn.style.transform = `translate(${Math.cos(a) * 42}vw, ${-Math.sin(a) * 26}vh)`;
          sec.classList.toggle('is-dark', s.progress < .06 || s.progress > .62);
        },
      }});
    });
    return () => mm.revert();
  }, []);
  return <section className="v-day is-dark" ref={ref}>
    <div className="v-day-sun" ref={sun}/>
    <div className="v-day-head v-pad"><Label>[ 02 ] One day at AFRAH</Label><Title lines={['Eight hours.', 'Eight chapters.']}/></div>
    <div className="v-day-track" ref={track}>
      {chapters.map(c => <Link to={c.path} key={c.path} className="v-day-card">
        <span className="v-day-hour">{c.hour}</span>
        <Img src={c.image} alt=""/>
        <div><Label>{c.num} / {c.time}</Label><h3>{c.title}</h3><p>{c.teaser}</p><span className="v-day-go">Read chapter <ArrowUpRight size={16}/></span></div>
      </Link>)}
    </div>
  </section>;
}

// LIKOVA opening: offset white wordmark card cutting into the building image, framed "class" box.
function Framed() {
  const [night, setNight] = useState(false);
  return <section className={`v-framed ${night ? 'night' : ''}`} data-tone="sky">
    <img className="v-framed-sky" src="/story/likova-sky.webp" alt="" loading="lazy"/>
    <div className="v-framed-card"><span>AFRAH</span><i/></div>
    <div className="v-framed-box" aria-hidden="true"><small>Floors</small><strong data-count="26">26</strong></div>
    <p className="v-framed-lede">Where the city<br/>finds a quieter rhythm.</p>
    <img className="v-framed-building" src="/story/likova-building.webp" alt="Glazed building with vertical fins" loading="lazy"/>
    <img className="v-framed-lights" src="/story/likova-lights.webp" alt="" loading="lazy"/>
    <div className="v-framed-foot v-pad">
      <div className="v-switch" role="group" aria-label="Lighting"><button aria-pressed={!night} onClick={() => setNight(false)}>Day</button><button aria-pressed={night} onClick={() => setNight(true)}>Evening</button><i/></div>
      <TextLink to="/architecture" light>Explore the architecture</TextLink>
    </div>
  </section>;
}

// Silver Pinewood editorial pause: oversized uppercase statement + staggered images.
function RiverStatement() {
  return <section className="v-river v-pad" data-tone="graphite">
    <div className="v-river-top"><Label>[ 03 ] Quiet luxury</Label><Label>On the river’s edge</Label></div>
    <p className="v-river-text" data-words>{'A residential address where the skyline meets the pines — where mornings start on the water and every evening ends with a view.'.split(' ').map((w, i) => <span key={i}>{w} </span>)}</p>
    <div className="v-river-imgs">
      <Img src="/v3/silver/desc-small.webp" alt="Two residents walking through morning mist" parallax/>
      <Img src="/v3/silver/desc-big.webp" alt="Residential towers by the river at dusk" parallax/>
    </div>
  </section>;
}

function Movement() {
  return <section className="v-movement" data-tone="pine">
    <Img src="/v3/silver/movement.webp" alt="Golfer on a green lawn by the river" parallax/>
    <div className="v-movement-shade"/>
    <div className="v-movement-copy v-pad">
      <Label>[ 04 ] 07:10 — Morning</Label>
      <Title lines={['Natural', 'movement.']} accent={[1]}/>
      <p>Running trails along the embankment, sailing and kiteboarding on the water, tennis under the pines. The recreational life of the river begins at your door.</p>
      <TextLink to="/landscape" light>Into the landscape</TextLink>
    </div>
    <Marquee items={activities}/>
  </section>;
}

function Numbers() {
  return <section className="v-numbers v-pad" data-tone="sand">
    <div className="v-numbers-head"><Label>[ 05 ] AFRAH in numbers</Label><Label>Illustrative study figures</Label></div>
    <div className="v-numbers-grid">
      <Counter value={26} label="Floors, stepping to a crown"/>
      <Counter value={4} suffix="min" label="Walk to the embankment"/>
      <Counter value={14} suffix="k m²" label="Of landscaped courtyard"/>
      <Counter value={312} label="Trees planted on site"/>
      <Counter value={8} label="Residence collections"/>
      <Counter value={24} suffix="/7" label="Concierge and security"/>
    </div>
  </section>;
}

function Residences3D() {
  const floors = Array.from({length: 13}, (_, i) => 13 - i);
  return <section className="v-res-teaser v-pad" data-tone="night">
    <div className="v-res-copy">
      <Label>[ 09 ] 21:15 — Evening</Label>
      <Title lines={['A place.', 'A view.', 'A floor.']} accent={[2]}/>
      <p>Spin the tower, hover a level, open a plan. Choose from garden homes on the lower floors to the crown penthouse above the skyline.</p>
      <TextLink to="/residences" light>Select your residence</TextLink>
    </div>
    <Link to="/residences" className="v-iso" aria-label="Open the residence selector">
      {floors.map((f, i) => <span key={f} style={{'--i': i}}><b>{String(f * 2).padStart(2, '0')}</b></span>)}
    </Link>
  </section>;
}

function Services() {
  return <section className="v-services v-pad" data-tone="stone">
    <div className="v-services-head">
      <Label>[ 08 ] 17:20 — Services</Label>
      <Title lines={['Technology that', 'stays out of sight.']} accent={[1]}/>
    </div>
    <div className="v-services-grid">{services.map(([t, d, img], i) => <Tilt key={t} className="v-service">
      <img src={img} alt="" loading="lazy"/><div><span>{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></div>
    </Tilt>)}</div>
    <TextLink to="/lobby">The lobby & services</TextLink>
  </section>;
}

function Quote() {
  return <section className="v-quote v-pad" data-tone="graphite">
    <Label>[ 11 ] Design notes</Label>
    <blockquote data-words>{'“We wanted a silhouette you could recognise from across the river — and a front door that feels as if it was made for you.”'.split(' ').map((w, i) => <span key={i}>{w} </span>)}</blockquote>
    <div className="v-quote-by"><img src="/v3/era/int-deco.webp" alt="" loading="lazy"/><div><strong>AFRAH design studio</strong><span>Concept architects, study team</span></div></div>
  </section>;
}

function Film() {
  const {setFilm} = useSite();
  return <section className="v-film-sec" data-tone="midnight">
    <video src="/media/afrah-life.mp4" muted loop autoPlay playsInline poster="/media/living.webp" aria-hidden="true"/>
    <div className="v-film-shade"/>
    <button className="v-film-play" onClick={() => setFilm(true)}><span><Play size={30}/></span>Watch the film</button>
    <div className="v-film-copy v-pad"><Label>[ 12 ] Life, unhurried</Label><Title lines={['A day, in', 'ninety seconds.']} accent={[1]}/></div>
  </section>;
}

export default function Home() {
  return <>
    <Hero/>
    <div id="manifesto" data-tone="night"><Statement label="[ 00 ] Prologue" aside="Why AFRAH">AFRAH began with a simple question. What if a home could hold a whole day — the first light on the river, a walk under the pines, the hush of the lobby, and the city glowing at midnight?</Statement></div>
    <TowerStory/>
    <DayRibbon/>
    <Framed/>
    <RiverStatement/>
    <Movement/>
    <Numbers/>
    <div data-tone="pine"><StickyStack items={[
      ['The rain garden', 'A sunken garden that collects the rain and turns it into a stream of planting. The quietest corner of the courtyard.', '/v3/silver/court-1.webp'],
      ['The amphitheatre', 'Timber steps for an open-air film, a neighbourhood concert or simply an afternoon in the sun.', '/v3/silver/court-5.webp'],
      ['Meetings under the trees', 'Shaded outdoor rooms with power and Wi-Fi. The best meeting room in the building has no ceiling.', '/v3/silver/court-6.webp'],
      ['Fountains and play', 'Water jets for summer, a play court for every age and benches for the grandparents watching.', '/v3/silver/court-4.webp'],
    ]}/></div>
    <div data-tone="sky"><SideSwitch
      a={{label: 'Morning · East', image: '/v3/silver/gallery-4.webp', text: 'Wake to the gentle golden light rising over the river. East-facing homes catch the sun at breakfast and stay cool through the afternoon.'}}
      b={{label: 'Evening · West', image: '/v3/silver/gallery-2.webp', text: 'Or follow the sun as it sets behind the skyline. West-facing homes glow in the evening, with a light show over the city every night.'}}/></div>
    <div data-tone="dusk"><HGallery label="[ 07 ] 19:40 — Interiors" title={['Arches, stone,', 'a warmer light.']} items={[
      ['/v3/era/int-1.webp', 'Arrival hall under the arches'], ['/v3/era/int-2.webp', 'Lobby with chandelier and garden light'], ['/v3/era/ceilings.webp', 'Double-height lounge'],
      ['/v3/era/int-3.webp', 'Concierge desk in carved stone'], ['/v3/era/int-4.webp', 'Lift lobby in bronze and walnut'], ['/v3/era/int-5.webp', 'Residents’ library corner'],
    ]}/></div>
    <Services/>
    <Residences3D/>
    <section className="v-joys v-pad" data-tone="sand">
      <div className="v-joys-copy"><Label>[ 10 ] 10:30 — Neighbourhood</Label><Title lines={['Joys of', 'every day.']} accent={[1]}/><p>Markets and cafés, schools and concert halls, the embankment for a morning run. A neighbourhood you can live in on foot.</p><TextLink to="/neighbourhood">Explore the neighbourhood</TextLink></div>
      <Carousel items={[
        ['/v3/era/joy-c1.webp', 'The market', 'Seasonal produce two streets away.'], ['/v3/era/joy-c3.webp', 'The embankment', 'Four minutes to the river path.'],
        ['/v3/era/joy-c4.webp', 'The concert hall', 'Evenings of music within walking distance.'], ['/v3/era/joy-c5.webp', 'The playground', 'Safe streets and open squares for children.'],
        ['/v3/era/joy-c6.webp', 'The boulevard', 'Shops, galleries and cafés along the avenue.'],
      ]}/>
    </section>
    <Quote/>
    <Film/>
    <div data-tone="night"><ChapterIndex/></div>
  </>;
}
