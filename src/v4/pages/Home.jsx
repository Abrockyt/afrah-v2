import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import gsap from 'gsap';
import {ArrowDown, ArrowUpRight, Play, Box} from 'lucide-react';
import {chapters, services} from '../data';
import {Link, Label, Img, Title, TextLink, Tilt, StickyStack, HGallery, Carousel, SideSwitch, ChapterIndex, useSite} from '../ui';

const CityFlight = lazy(() => import('../three/CityFlight'));
const CityMap = lazy(() => import('../three/CityMap'));

// Mount heavy children only once their section approaches the viewport.
export function useNear(ref, margin = '400px') {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, {rootMargin: margin});
    io.observe(ref.current); return () => io.disconnect();
  }, []);
  return near;
}

// A continuous camera descent through the cloud bank to the towers.
const beats = [
  [0, .13, 'hero'],
  [.16, .3, ['Make it', 'a paradox.'], 'Opposites, joined: the whole idea of AFRAH in four words.'],
  [.34, .5, ['Architecture', 'inspired by', 'the river.'], '01 — Ambitious on the skyline, quiet at the door.'],
  [.53, .68, ['A crown', 'for the', 'skyline.'], '02 — Stepped silhouettes in brushed metal, recognisable from the water.'],
  [.71, .86, ['Bronze by day.', 'Light by', 'night.'], '03 — As the sun goes down, the windows light up one by one.'],
  [.89, 1.01, ['Welcome', 'home.'], 'Scroll on to read the day, hour by hour.'],
];
function Flight() {
  const ref = useRef(), progress = useRef(0), [p, setP] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [lighting,setLighting]=useState('auto'),[quality,setQuality]=useState(()=>matchMedia('(max-width: 800px)').matches?'mobile':'standard'),[replay,setReplay]=useState(0),[arrived,setArrived]=useState(false);
  const {introDone} = useSite();
  useEffect(() => {
    const el = ref.current;
    const tw = gsap.to({}, {scrollTrigger: {trigger: el, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { progress.current = s.progress; setP(Math.round(s.progress * 200) / 200); }}});
    return () => { tw.scrollTrigger?.kill(); tw.kill(); };
  }, []);
  return <section className="v-flight-track" ref={ref} data-tone="home">
    <div className={`v-flight-pin afrah-cinematic ${arrived?'has-arrived':''}`}>
      <Suspense fallback={null}><CityFlight progress={progress} introDone={introDone} lighting={lighting} quality={quality} replay={replay} onIntroEnd={()=>setArrived(true)} onReady={() => setSceneReady(true)}/></Suspense>
      <div className="v-flight-shade"/>
      {beats.map(([from, to, lines, text], i) => {
        const on = p >= from && p < to;
        if (lines === 'hero') return <div key={i} className={`v-flight-hero v-pad ${on ? 'on' : ''}`}>
          <h1 className="v-mega" tabIndex="-1"><span>One day,</span><span className="v-silver">a whole life.</span></h1>
          <div className="v-flight-hero-foot"><p>The place where a single day<br/>becomes a way of living.</p><Label>Scroll to explore</Label><Link to="/map" className="v-btn">Open the 3D map <ArrowUpRight size={14}/></Link></div>
        </div>;
        return <div key={i} className={`v-flight-cap v-pad ${i % 2 ? 'right' : ''} ${on ? 'on' : ''}`} aria-hidden={!on}>
          <Label>{String(i).padStart(2, '0')} / 05</Label>
          <h2>{lines.map((l, k) => <span key={k} className={k === lines.length - 1 ? 'v-silver' : ''}>{l}</span>)}</h2>
          <p>{text}</p>
        </div>;
      })}
      <div className="v-flight-rail" aria-hidden="true"><i style={{transform: `scaleY(${p})`}}/></div>
      <div className="afrah-scene-controls" aria-label="Architectural view controls">
        <div role="group" aria-label="Lighting">{['auto','day','dusk'].map(mode=><button key={mode} aria-pressed={lighting===mode} onClick={()=>setLighting(mode)}>{mode==='auto'?'Journey':mode==='day'?'Daylight':'Blue hour'}</button>)}</div>
        <label><span>Detail</span><select aria-label="Rendering quality" value={quality} onChange={e=>setQuality(e.target.value)}><option value="high">High</option><option value="standard">Standard</option><option value="mobile">Mobile</option></select></label>
        <button onClick={()=>{setArrived(false);setReplay(v=>v+1);}}>Replay arrival ↗</button>
      </div>
    </div>
  </section>;
}

function MapTeaser() {
  const ref = useRef(), near = useNear(ref);
  return <section className="v-mapteaser" ref={ref} data-tone="white">
    <div className="v-mapteaser-stage">{near && <Suspense fallback={null}><CityMap interactive={false} compact/></Suspense>}</div>
    <div className="v-mapteaser-copy v-pad">
      <Label>[ 06 ] 3D map</Label>
      <Title lines={['The district,', 'in your hands.']} accent={[1]}/>
      <p>Rotate the whole neighbourhood, zoom into the river, open a place to see how far it is on foot.</p>
      <Link to="/map" className="v-btn solid">Open the 3D map <ArrowUpRight size={15}/></Link>
    </div>
  </section>;
}

function Prologue() {
  return <section className="v-arrival v-pad" data-tone="dawn" id="manifesto">
    <div className="v-arrival-index"><Label>00 / The proposition</Label><span>From the first light</span></div>
    <div className="v-arrival-main">
      <div className="v-arrival-copy">
        <Label>One day at AFRAH</Label>
        <Title lines={['A life shaped', 'by light.']} accent={[1]}/>
        <p data-reveal>There is a moment when the city quiets and a place begins to feel like yours. AFRAH is designed around those moments: the view at dawn, the garden on the way home, and the warmth waiting inside.</p>
        <TextLink to="/vision">Discover the idea</TextLink>
      </div>
      <Img src="/v3/era/new-era.webp" alt="AFRAH towers in warm evening light" className="v-arrival-image" parallax/>
    </div>
    <div className="v-arrival-end"><span>Form</span><span>Nature</span><span>Human</span></div>
  </section>;
}

function DayJourney() {
  const [active, setActive] = useState(0);
  return <section className="v-day-journey v-pad" data-tone="pine">
    <div className="v-day-journey-head"><Label>01 / One day, eight chapters</Label><Title lines={['Follow the', 'light.']} accent={[1]}/><p>Every hour opens a different part of the place. Begin anywhere; the story is yours to explore.</p></div>
    <div className="v-day-journey-layout">
      <div className="v-day-journey-stage">
        {chapters.map((c, i) => <img key={c.path} src={c.image} alt="" loading="lazy" className={active === i ? 'on' : ''}/>) }
        <div className="v-day-journey-stage-caption"><span>{chapters[active].hour} / {chapters[active].time}</span><strong>{chapters[active].title}</strong></div>
      </div>
      <nav className="v-day-journey-list" aria-label="Explore the day">
        {chapters.map((c, i) => <Link key={c.path} to={c.path} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} className={active === i ? 'on' : ''}>
          <time>{c.hour}</time><span><strong>{c.title}</strong><small>{c.kicker}</small></span><ArrowUpRight size={22}/>
        </Link>)}
      </nav>
    </div>
  </section>;
}

function Framed() {
  const [night, setNight] = useState(false);
  return <section className={`v-framed v-architecture-scene ${night ? 'night' : ''}`} data-tone="sky">
    <img className="v-architecture-day" src="/media/architecture-day.webp" alt="Building facade and planted forecourt in daylight" loading="lazy"/>
    <img className="v-architecture-night" src="/media/architecture-dusk.webp" alt="The same building glowing at dusk" loading="lazy"/>
    <div className="v-architecture-wash"/>
    <div className="v-architecture-head v-pad"><Label>02 / Architecture</Label><span>48°  ·  A study in light</span></div>
    <div className="v-architecture-copy v-pad">
      <Label>Crafted for every hour</Label>
      <Title lines={['A different', 'face of home.']} accent={[1]}/>
      <p>Stone catches the morning. Bronze warms with the afternoon. After dark, the life inside becomes the architecture.</p>
    </div>
    <div className="v-architecture-foot v-pad">
      <div className="v-switch" role="group" aria-label="Lighting"><button aria-pressed={!night} onClick={() => setNight(false)}>Daylight</button><button aria-pressed={night} onClick={() => setNight(true)}>After dark</button><i/></div>
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
  return <section className="v-landscape-flow v-pad" data-tone="pine">
    <div className="v-landscape-flow-head"><Label>04 / Beyond the door</Label><Title lines={['Room to', 'breathe.']} accent={[1]}/></div>
    <div className="v-landscape-flow-grid">
      <Img src="/v3/silver/movement.webp" alt="Open green landscape beside the river" parallax/>
      <div className="v-landscape-flow-copy">
        <span className="v-landscape-flow-line" aria-hidden="true"/>
        <Label>Landscape / movement / water</Label>
        <p>The river makes the day feel larger. Walk beneath the pines, run along the embankment, or stay in the garden until the light changes.</p>
        <TextLink to="/landscape">Explore the landscape</TextLink>
        <div className="v-landscape-flow-notes"><span><b>01</b>River path</span><span><b>02</b>Rain garden</span><span><b>03</b>Outdoor rooms</span></div>
      </div>
    </div>
  </section>;
}

function Numbers() {
  const details = [
    {label: '01 / Form', title: 'A silhouette with presence.', text: 'Stepped volumes catch the light differently from every street. The crown gives the skyline a point of recognition.', image: '/v3/era/arch-2.webp'},
    {label: '02 / Material', title: 'Warmth in every edge.', text: 'Pale stone and brushed bronze balance the blue of the glazing. Deep reveals give the facade shade, depth and texture.', image: '/v3/era/arch-4.webp'},
    {label: '03 / Interior', title: 'The detail continues within.', text: 'Behind the facade, layered rooms, warm lighting and tactile finishes make arrival feel personal.', image: '/v3/era/int-2.webp'},
  ];
  const [active, setActive] = useState(0), d = details[active];
  return <section className="v-material-focus v-pad" data-tone="sand">
    <div className="v-material-focus-head"><Label>05 / The building, revealed</Label><Label>Form · material · interior</Label></div>
    <div className="v-material-focus-grid">
      <div className="v-material-focus-copy">
        <span className="v-material-focus-index">{d.label}</span>
        <h2>{d.title}</h2><p>{d.text}</p>
        <div className="v-material-focus-tabs" role="tablist" aria-label="Architectural details">
          {details.map((item, i) => <button key={item.label} role="tab" aria-selected={active === i} onClick={() => setActive(i)}><span>0{i + 1}</span>{item.label.split(' / ')[1]}</button>)}
        </div>
      </div>
      <div className="v-material-focus-media">
        {details.map((item, i) => <img key={item.image} src={item.image} alt={item.title} loading="lazy" className={active === i ? 'on' : ''}/>)}
        <div className="v-material-focus-gridlines" aria-hidden="true"/>
        <span className="v-material-focus-spec">AFRAH / {String(active + 1).padStart(2, '0')} — 03</span>
      </div>
    </div>
    <div className="v-material-focus-facts"><span><b>26</b> floors</span><span><b>04</b> min to the river</span><span><b>312</b> trees</span><span><b>24/7</b> welcome</span></div>
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
    <Flight/>
    <Prologue/>
    <DayJourney/>
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
    <MapTeaser/>
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
