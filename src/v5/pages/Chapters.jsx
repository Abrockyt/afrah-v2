import {lazy, Suspense, useEffect, useMemo, useRef, useState} from 'react';
import gsap from 'gsap';
import {ArrowUpRight, Heart, Sun, Moon, Sunrise, Sunset} from 'lucide-react';
import {chapterByPath, residences, services, journeys} from '../data';
import {Label, Img, Title, TextLink, Statement, Counter, Marquee, Tilt, StickyStack, HGallery, Carousel, SideSwitch, Accordion, Numbered, ChapterHero, NextChapter, ChapterIndex, useSite} from '../ui';
import {useNear} from './Home';
import {Dialog, Enquiry, FloorPlan} from '../../Forms';

const AfrahView = lazy(() => import('../three/AfrahView'));
const MapView = lazy(() => import('../three/MapView'));
const Sculpture = lazy(() => import('../../scene/CompositeSculpture'));
const City = lazy(() => import('../../scene/EraCity'));

const words = s => s.split(' ').map((w, i) => <span key={i}>{w} </span>);

// Scroll-scrubbed progress for a pinned "track" section.
function useTrack(ref, onStep, steps = 3) {
  const progress = useRef(0);
  useEffect(() => {
    const tw = gsap.to({}, {scrollTrigger: {trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { progress.current = s.progress; onStep?.(Math.min(steps - 1, Math.floor(s.progress * steps))); }}});
    return () => { tw.scrollTrigger?.kill(); tw.kill(); };
  }, []);
  return progress;
}

/* ───────────── 01 · VISION — dawn ───────────── */

function SculptureStory() {
  const ref = useRef(), near = useNear(ref), [step, setStep] = useState(0);
  const progress = useTrack(ref, setStep, 3);
  const caps = [
    ['Architecture', 'inspired by nature,', 'ambitious and innovative.'],
    ['Paving the way', 'to new', 'possibilities.'],
    ['Protection', 'and beauty merge', 'in performance.'],
  ];
  return <section className="v-sculpt" ref={ref} data-tone="graphite">
    <div className="v-sculpt-pin">
      <div className="v-grid-floor light"/>
      {near && <Suspense fallback={null}><Sculpture progress={progress} tone="copper"/></Suspense>}
      <div className="v-sculpt-caps v-pad">{caps.map((c, i) => <h2 key={i} className={step === i ? 'on' : ''} aria-hidden={step !== i}>
        <small>{String(i + 1).padStart(2, '0')}</small>{c.map((l, k) => <span key={k} className={k === 2 ? 'v-accent' : ''}>{l}</span>)}</h2>)}</div>
      <div className="v-sculpt-foot v-pad"><Label>Composite study / move your pointer</Label><Label>{String(step + 1).padStart(2, '0')} / 03</Label></div>
    </div>
  </section>;
}

function Paradox() {
  const pairs = [['Bold', 'on the skyline', 'Quiet', 'at the door'], ['City', 'energy', 'Nature', 'rhythm'], ['Stone', 'that floats', 'Glass', 'that keeps warmth'], ['Public', 'garden', 'Private', 'terrace'], ['Art Deco', 'memory', 'Composite', 'future'], ['Morning', 'river', 'Midnight', 'skyline']];
  return <section className="v-paradox v-pad" data-tone="dawn">
    <div className="v-paradox-head"><Label>Six paradoxes</Label><Title lines={['Opposites,', 'joined.']} accent={[1]}/><p>Hover or tap each card to turn it over. Every one is a design decision in the building.</p></div>
    <div className="v-paradox-grid">{pairs.map(([a, as, b, bs]) => <button key={a} className="v-flip" onClick={e => e.currentTarget.classList.toggle('flipped')}>
      <span className="v-flip-in"><span className="v-flip-front"><strong>{a}</strong><small>{as}</small></span><span className="v-flip-back"><strong>{b}</strong><small>{bs}</small></span></span>
    </button>)}</div>
  </section>;
}

function Palette() {
  const sw = [['Obsidian glass', '#0A0A0A', 'linear-gradient(160deg,#2a2a2a,#0a0a0a 55%,#000)', 'Deep glazing that turns into a black mirror of the sky.'],
    ['Graphite frame', '#2E2E2E', 'linear-gradient(160deg,#5a5a5a,#2e2e2e 50%,#141414)', 'Window frames and fins in dark anodised metal.'],
    ['Brushed silver', '#BDBDBD', 'linear-gradient(115deg,#7d7d7d,#f4f4f4 28%,#9d9d9d 52%,#ffffff 76%,#8a8a8a)', 'The crown and the vertical ribs, catching every hour of light.'],
    ['Chalk stone', '#E9E9E6', 'linear-gradient(160deg,#ffffff,#e9e9e6 50%,#cfcfcc)', 'A pale limestone base that holds the first light.'],
    ['Mirror chrome', '#F5F5F5', 'linear-gradient(100deg,#6d6d6d 0%,#ffffff 18%,#7a7a7a 38%,#f0f0f0 60%,#5c5c5c 82%,#ffffff 100%)', 'Details at the scale of the hand: handles, rails, numbers.']];
  const [on, setOn] = useState(1);
  return <section className="v-palette v-pad" data-tone="dawn">
    <div className="v-palette-head"><Label>The material palette</Label><Title lines={['Five tones,', 'one metal.']} accent={[1]}/></div>
    <div className="v-palette-row">{sw.map(([n, hex, g, d], i) => <button key={n} className={on === i ? 'on' : ''} style={{'--sw': g}} onMouseEnter={() => setOn(i)} onFocus={() => setOn(i)} onClick={() => setOn(i)}>
      <span className="v-palette-chip"/><span className="v-palette-meta"><b>{n}</b><code>{hex}</code><em>{d}</em></span>
    </button>)}</div>
  </section>;
}

export function Vision() {
  const c = chapterByPath['/vision'];
  return <>
    <div data-tone="dawn"><ChapterHero chapter={c} lines={['Make it', 'a paradox.']} intro="Before the first light reaches the river, there is an idea: a home can be bold and quiet, open and entirely yours." image="/v3/era/new-era.webp"/></div>
    <div data-tone="dawn"><Statement label="01 / The idea" aside="05:40">The most memorable places join things that were never meant to belong together. A skyline and a garden. Stone and air. The energy of a city and the pace of a river.</Statement></div>
    <SculptureStory/>
    <div data-tone="dawn">
      <Numbered n="01" label="Presence, without noise" title={['A silhouette', 'you remember.']} text="A stepped crown and a clear material language make AFRAH recognisable from across the water — yet at street level the building steps back, lowers its voice and opens a garden." image="/v3/likova/idea-1.webp"/>
      <Numbered n="02" reverse label="Nature, within reach" title={['A room', 'without a ceiling.']} text="The courtyard is designed as the largest room in the building: paths, water, shade and places to pause, part of every resident’s daily journey." image="/v3/silver/court.webp"/>
      <Numbered n="03" label="Space, with possibility" title={['Composed,', 'never finished.']} text="Generous proportions, light from two sides, rooms that adapt as life does. The plan leaves room for the personal details that make a home yours." image="/v3/likova/cube.webp"/>
    </div>
    <Paradox/>
    <Palette/>
    <section className="v-principles v-pad" data-tone="night">
      <div><Label>Four principles</Label><Title lines={['The way', 'we see it.']} accent={[1]}/></div>
      <Accordion items={[
        ['Light first.', 'Every plan starts with the sun path. Living rooms face the longest light; bedrooms find the calm side of the tower.'],
        ['Materials you can touch.', 'Stone, glass and brushed silver, chosen to age well and feel warm under the hand.'],
        ['Landscape as infrastructure.', 'Rain gardens, mature trees and permeable paths cool the courtyard and manage the water.'],
        ['Technology in the background.', 'Face ID entry, destination lifts and a residents’ app — useful, then invisible.'],
      ]}/>
    </section>
    <NextChapter path={c.path}/>
  </>;
}

/* ───────────── 02 · LANDSCAPE — morning ───────────── */

function ActivityList() {
  const items = [['Running', 'The embankment trail', '/v3/silver/loc-3.webp'], ['Kiteboarding', 'Wind off the river', '/v3/silver/loc-2.webp'], ['Sailing', 'Moorings at the marina', '/v3/silver/loc-4.webp'],
    ['Skiing', 'Winter slopes nearby', '/v3/silver/loc-5.webp'], ['Golf', 'Nine holes by the water', '/v3/silver/loc-6.webp'], ['Riding', 'The equestrian club', '/v3/silver/loc-7.webp'], ['Cycling', 'Forty kilometres of paths', '/v3/silver/loc-1.webp']];
  const [hover, setHover] = useState(-1), float = useRef();
  const move = e => { if (float.current) float.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%) rotate(${(e.clientX / innerWidth - .5) * 10}deg)`; };
  return <section className="v-acts v-pad" data-tone="pine" onPointerMove={move} onPointerLeave={() => setHover(-1)}>
    <div className="v-acts-head"><Label>Seven ways to begin the day</Label><Label>Hover a line</Label></div>
    <ul>{items.map(([t, s, img], i) => <li key={t} onPointerEnter={() => setHover(i)} className={hover === i ? 'on' : ''}><span>{String(i + 1).padStart(2, '0')}</span><strong>{t}</strong><em>{s}</em><img src={img} alt="" loading="lazy" className="v-acts-mobile"/></li>)}</ul>
    <div className="v-acts-float" ref={float} aria-hidden="true">{items.map(([t, , img], i) => <img key={t} src={img} alt="" className={hover === i ? 'on' : ''} loading="lazy"/>)}</div>
  </section>;
}

function Stones() {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.v-stone').forEach((s, i) => gsap.fromTo(s, {y: 160 * (i + 1), rotate: -8 + i * 6}, {y: -160 * (i + 1), rotate: 8 - i * 5, ease: 'none', scrollTrigger: {trigger: el, start: 'top bottom', end: 'bottom top', scrub: true}}));
    }, el);
    const move = e => gsap.to(el.querySelectorAll('.v-stone'), {x: i => (e.clientX / innerWidth - .5) * (i + 1) * 40, duration: 1.2, ease: 'power3.out'});
    el.addEventListener('pointermove', move);
    return () => { ctx.revert(); el.removeEventListener('pointermove', move); };
  }, []);
  return <section className="v-stones v-pad" ref={ref} data-tone="forest">
    <img className="v-stone s1" src="/v3/silver/stone-1.webp" alt=""/><img className="v-stone s2" src="/v3/silver/stone-2.webp" alt=""/><img className="v-stone s3" src="/v3/silver/stone-3.webp" alt=""/>
    <div className="v-stones-copy"><Label>The territory</Label><Title lines={['Stones in', 'the garden.']} accent={[1]}/><p>Smooth river stones mark the paths through the courtyard: places to sit, to climb, to pause. Move your pointer and they drift like the water that shaped them.</p></div>
  </section>;
}

function Seasons() {
  const s = [['Spring', 'Blossom along the rain garden, first coffee outside.', '/v3/likova/env-bg-1.webp'], ['Summer', 'Fountains, open-air cinema on the amphitheatre steps.', '/v3/silver/court-2.webp'], ['Autumn', 'Picnics under copper leaves, long walks by the water.', '/v3/silver/idle.webp'], ['Winter', 'Snow on the pines, the slopes twenty minutes away.', '/v3/silver/loc-5.webp']];
  const [i, setI] = useState(0);
  return <section className="v-seasons" data-tone="pine">
    {s.map(([n, , img], k) => <img key={n} src={img} alt="" className={i === k ? 'on' : ''} loading="lazy"/>)}
    <div className="v-seasons-shade"/>
    <div className="v-seasons-copy v-pad">
      <Label>Four seasons, one garden</Label>
      <h2 className="v-seasons-name">{s[i][0]}.</h2>
      <p>{s[i][1]}</p>
      <div className="v-tabs" role="tablist">{s.map(([n], k) => <button role="tab" aria-selected={i === k} key={n} onClick={() => setI(k)}>{n}</button>)}</div>
    </div>
  </section>;
}

export function Landscape() {
  const c = chapterByPath['/landscape'];
  return <>
    <div data-tone="pine"><ChapterHero chapter={c} lines={['Natural', 'movement.']} intro="Just a few steps, and the city gives way to the river, the pines and a garden that changes every hour." image="/v3/silver/movement.webp"/></div>
    <div data-tone="pine"><Statement label="02 / Landscape" aside="07:10">A building is only half the story. The spaces around it shape how a place feels — and how we feel in it. At AFRAH the day begins outside.</Statement></div>
    <ActivityList/>
    <section className="v-full" data-tone="forest">
      <Img src="/v3/silver/idle.webp" alt="Friends having a picnic on the lawn" parallax/>
      <div className="v-full-copy v-pad"><Label>Beauty of idle days</Label><Title lines={['Room for', 'the unplanned.']} accent={[1]}/><p>Stroll through the rain garden, meet friends in the amphitheatre, hold a meeting in the shade of the trees or teach a child to shoot hoops.</p></div>
    </section>
    <div data-tone="pine"><StickyStack items={[
      ['The rain garden', 'A sunken garden that collects the rain and turns it into planting.', '/v3/silver/court-1.webp'],
      ['The fountain square', 'Water jets for summer evenings, a mirror for the towers at night.', '/v3/silver/court-2.webp'],
      ['The glass pavilion', 'A winter garden café between the lobby and the lawn.', '/v3/silver/court-3.webp'],
      ['The long terrace', 'Benches and shade along the podium edge.', '/v3/silver/court-4.webp'],
      ['The stone deck', 'River stones and timber for sitting, climbing, pausing.', '/v3/silver/court-5.webp'],
      ['The play court', 'Every age, every afternoon.', '/v3/silver/court-6.webp'],
    ]}/></div>
    <Stones/>
    <section className="v-moments v-pad" data-tone="pine">
      <div className="v-moments-head"><Label>Good time</Label><Title lines={['Small moments,', 'every day.']} accent={[1]}/></div>
      <div className="v-moments-grid">
        {[['/v3/silver/time-1.webp', 'The morning walk'], ['/v3/silver/time-2.webp', 'Stories on the terrace'], ['/v3/silver/time-3.webp', 'A picnic in the pines'], ['/v3/silver/time-4.webp', 'Dinner by the water']].map(([src, t], i) =>
          <Tilt key={src} className={`v-moment m${i}`}><img src={src} alt={t} loading="lazy"/><span>{t}</span></Tilt>)}
      </div>
    </section>
    <Seasons/>
    <section className="v-numbers v-pad" data-tone="sand">
      <div className="v-numbers-head"><Label>The landscape in numbers</Label><Label>Illustrative</Label></div>
      <div className="v-numbers-grid">
        <Counter value={312} label="Trees planted"/><Counter value={48} label="Plant species"/><Counter value={3} suffix="km" label="Of walking paths"/>
        <Counter value={14} suffix="k m²" label="Courtyard"/><Counter value={6} label="Outdoor rooms"/><Counter value={1} label="River, always"/>
      </div>
    </section>
    <section className="v-full" data-tone="graphite">
      <Img src="/v3/silver/taste.webp" alt="Residents riding along a tree-lined road" parallax/>
      <div className="v-full-copy v-pad"><Label>Tasteful life</Label><Title lines={['Everything,', 'a few steps away.']} accent={[1]}/><p>A signature restaurant and a specialty coffee house open onto the garden — the places your family will call “ours”.</p></div>
    </section>
    <NextChapter path={c.path}/>
  </>;
}

/* ───────────── 03 · NEIGHBOURHOOD — late morning ───────────── */

export function Neighbourhood() {
  const c = chapterByPath['/neighbourhood'];
  return <>
    <div data-tone="sand"><ChapterHero chapter={c} lines={['Joys of', 'every day.']} intro="Markets, schools, the river path and the concert hall. A neighbourhood you can live in on foot." image="/v3/era/joy-1.webp"/></div>
    <div data-tone="sand"><Statement label="03 / Neighbourhood" aside="10:30">Here you can turn the pages of the city’s history like a memoir, walk the children to school, find solitude in a park — or stay out with friends until the lights come on over the bridge.</Statement></div>
    <section className="v-journeys v-pad" data-tone="sand">
      <div className="v-journeys-head"><Label>Proximity</Label><Label>Walking times, illustrative</Label></div>
      {journeys.map(([n, u, t, img]) => <div className="v-journey" key={t}><strong data-count={n}>{n}</strong><sup>{u}</sup><span>{t}</span><Img src={img} alt=""/></div>)}
    </section>
    <section className="v-map-live" data-tone="white">
      <div className="v-map-live-head v-pad"><Label>3D map / Location</Label><Title lines={['Everything', 'on foot.']} accent={[1]}/><p>Drag to rotate the district, scroll to zoom, choose a place to fly there. The real street grid, the river and the towers — rebuilt in silver and white.</p></div>
      <div className="v-map-live-stage"><Suspense fallback={null}><MapView/></Suspense></div>
    </section>
    <div data-tone="dusk"><HGallery label="The daily list" title={['From coffee', 'to concerts.']} items={[
      ['/v3/likova/infra-3.webp', 'Specialty coffee on the corner'], ['/v3/likova/infra-1.webp', 'The covered market'], ['/v3/likova/infra-2.webp', 'Dinner at the brasserie'],
      ['/v3/era/joy-c4.webp', 'An evening at the concert hall'], ['/v3/era/joy-c6.webp', 'The shopping boulevard'], ['/v3/era/joy-c5.webp', 'The children’s square'],
    ]}/></div>
    <div data-tone="sand">
      <Numbered n="01" label="Education" title={['Schools that', 'shape a future.']} text="Kindergartens and schools within a short walk, on quiet streets with wide pavements and safe crossings." image="/v3/era/joy-2.webp"/>
      <Numbered n="02" reverse label="Culture" title={['An evening', 'of music.']} text="A concert hall, galleries and a cinema along the boulevard. Culture is a walk, not a journey." image="/v3/era/joy-c4.webp"/>
      <Numbered n="03" label="Business" title={['Fifteen minutes', 'to the office.']} text="The business district, the airport express and the ring road are all close — but never under your window." image="/v3/likova/offices.webp"/>
    </div>
    <section className="v-joys v-pad" data-tone="stone">
      <div className="v-joys-copy"><Label>Postcards</Label><Title lines={['A week', 'in the area.']} accent={[1]}/><p>Five scenes from a normal week at AFRAH.</p></div>
      <Carousel items={[
        ['/v3/era/joy-c3.webp', 'Monday', 'A run on the embankment before work.'], ['/v3/era/joy-c1.webp', 'Tuesday', 'Fresh produce from the market.'],
        ['/v3/era/joy-c5.webp', 'Wednesday', 'Playground after school.'], ['/v3/era/joy-c6.webp', 'Thursday', 'An hour on the boulevard.'], ['/v3/era/joy-c4.webp', 'Friday', 'Music in the evening.'],
      ]}/>
    </section>
    <NextChapter path={c.path}/>
  </>;
}

/* ───────────── 04 · ARCHITECTURE — noon ───────────── */

function SunStudy() {
  const ref = useRef(), near = useNear(ref), [v, setV] = useState(1);
  // 0 → golden hour, .5 → blue hour, 1 → night: HDRI, sun, exposure, fog, glass, windows and street lights all blend
  const [from, to, t] = v <= .5 ? ['golden', 'blue', v / .5] : ['blue', 'night', (v - .5) / .5];
  const minutes = Math.round(18 * 60 + 30 + v * 4.5 * 60), label = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const presets = [[Sunset, 'Golden hour', 0], [Sun, 'Blue hour', .5], [Moon, 'Night', 1]];
  const jump = x => { const o = {t: v}; gsap.to(o, {t: x, duration: 1.4, ease: 'power2.inOut', onUpdate: () => setV(o.t)}); };
  return <section className="v-sun" ref={ref} data-tone="night">
    <div className="v-sun-stage">{near && <Suspense fallback={null}><AfrahView mode="orbit" env={from} envTo={to} envT={t} offset={.12}/></Suspense>}</div>
    <div className="v-sun-ui v-pad">
      <div className="v-sun-copy"><Label>Light study · real-time</Label><h2>From gold<br/><span className="v-accent">to night.</span></h2><p>Drag through the evening. The sky, the sun, the reflections in the glass, the rooms lighting up and the street lamps all change in the 3D scene.</p></div>
      <div className="v-sun-controls">
        <span className="v-sun-time">{label}</span>
        <input type="range" min="0" max="1" step=".001" value={v} onChange={e => setV(Number(e.target.value))} aria-label="Time of evening"/>
        <div className="v-sun-presets">{presets.map(([I, n, x]) => <button key={n} onClick={() => jump(x)}><I size={16}/>{n}</button>)}</div>
      </div>
    </div>
  </section>;
}

function Facade() {
  const layers = [['Lighting', 'Warm LED lines trace the crown after dark.'], ['Silver fins', 'Vertical brushed-metal fins shade the glass.'], ['Glazing', 'Triple glazing, floor to ceiling.'], ['Stone frame', 'Limestone slabs mark every floor.']];
  const [open, setOpen] = useState(false), [on, setOn] = useState(-1);
  return <section className={`v-facade v-pad ${open ? 'open' : ''}`} data-tone="night">
    <div className="v-facade-copy"><Label>Facade anatomy</Label><Title lines={['Four layers,', 'one surface.']} accent={[1]}/><p>Open the facade to see how it is built. Hover a layer to read what it does.</p>
      <button className="v-pill" onClick={() => setOpen(o => !o)}>{open ? 'Close the facade' : 'Explode the facade'}</button>
      <ol>{layers.map(([n, d], i) => <li key={n} className={on === i ? 'on' : ''} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(-1)}><b>{String(i + 1).padStart(2, '0')} {n}</b><span>{d}</span></li>)}</ol>
    </div>
    <div className="v-facade-stage" onMouseEnter={() => setOpen(true)}>
      <div className="v-facade-stack">{layers.map(([n], i) => <div key={n} className={`v-layer l${i} ${on === i ? 'on' : ''}`} style={{'--i': i}} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(-1)}><span>{n}</span></div>)}</div>
    </div>
  </section>;
}

export function Architecture() {
  const c = chapterByPath['/architecture'];
  return <>
    <div data-tone="sky"><ChapterHero chapter={c} lines={['A crown for', 'the skyline.']} intro="A stepped silhouette, illuminated arches and deep reveals. Architecture that changes with the light." image="/v3/silver/gallery-3.webp"/></div>
    <div data-tone="sky"><Statement label="04 / Architecture" aside="13:00">The idea behind AFRAH is the tradition of the great twentieth-century towers — the stepped silhouettes that made the skylines of the world’s cities recognisable — rebuilt with the materials of tomorrow.</Statement></div>
    <SunStudy/>
    <section className="v-silhouette v-pad" data-tone="dusk">
      <Img src="/v3/era/arch-building.webp" alt="Stepped Art Deco tower facade glowing at dusk" className="v-silhouette-img" data-stepped/>
      <div><Label>The silhouette</Label><Title lines={['Stepped,', 'lit, lifted.']} accent={[1]}/><p>The tower narrows in four steps as it rises — at the fourteenth, twentieth and twenty-fourth floors — ending in a crown of silver arches that lights up at dusk.</p>
        <div className="v-silhouette-steps">{[['01–13', 'Garden & Courtyard'], ['14–19', 'Terrace'], ['20–23', 'Skyline'], ['24–26', 'Crown']].map(([f, n]) => <div key={f}><b>{f}</b><span>{n}</span></div>)}</div></div>
    </section>
    <div data-tone="sky"><SideSwitch
      a={{label: 'Morning · East', image: '/v3/silver/gallery-4.webp', text: 'Wake up to the golden light of the rising sun. The east side gets the morning and stays calm in the afternoon.'}}
      b={{label: 'Evening · West', image: '/v3/silver/arch-top.webp', text: 'Be inspired by the play of light and shadow as the sun sets in the west, behind the skyline.'}}/></div>
    <Facade/>
    <section className="v-arch-grid v-pad" data-tone="sky">
      <div className="v-arch-grid-head"><Label>Views of the tower</Label><Title lines={['From every', 'direction.']} accent={[1]}/></div>
      <div className="v-arch-mosaic">
        {['/v3/silver/gallery-1.webp', '/v3/silver/gallery-5.webp', '/v3/likova/arch.webp', '/v3/silver/gallery-2.webp', '/v3/likova/arch-slide.webp', '/v3/likova/idea-2.webp'].map((s, i) => <Tilt key={s} className={`g${i}`} max={5}><img src={s} alt="" loading="lazy"/></Tilt>)}
      </div>
    </section>
    <section className="v-full" data-tone="dusk">
      <Img src="/v3/silver/terraces.webp" alt="Terrace with outdoor lounge overlooking the city" parallax/>
      <div className="v-full-copy v-pad"><Label>Terraces</Label><Title lines={['Every home,', 'a piece of sky.']} accent={[1]}/><p>From the fourteenth floor up, every residence opens onto a private terrace — an outdoor room between the city and the clouds.</p></div>
    </section>
    <section className="v-quote v-pad" data-tone="graphite">
      <Label>Design notes</Label>
      <blockquote data-words>{words('“A tower should be read at three distances: as a silhouette from the river, as a rhythm from the street, and as a material at the scale of your hand.”')}</blockquote>
      <div className="v-quote-by"><img src="/v3/era/arch-2.webp" alt="" loading="lazy"/><div><strong>AFRAH design studio</strong><span>Concept architects, study team</span></div></div>
    </section>
    <NextChapter path={c.path}/>
  </>;
}

/* ───────────── 05 · LOBBY & SERVICES — afternoon ───────────── */

export function Lobby() {
  const c = chapterByPath['/lobby'];
  return <>
    <div data-tone="stone"><ChapterHero chapter={c} lines={['The art of', 'arriving.']} intro="A lobby with the finesse of a luxury hotel, and services that anticipate the day before it happens." image="/v3/likova/lobby-slide-3.webp"/></div>
    <div data-tone="stone"><Statement label="05 / Lobby" aside="17:20">Coming home should feel like checking into your favourite hotel — a familiar face at the desk, the scent of the garden, and nothing to think about.</Statement></div>
    <section className="v-lobby v-pad" data-tone="stone">
      <div className="v-lobby-imgs"><Img src="/v3/silver/lobby-top.webp" alt="Library lounge with fireplace" parallax/><Img src="/v3/silver/lobby-mid.webp" alt="Lift lobby with chandeliers" parallax/><Img src="/v3/silver/lobby-bottom.webp" alt="Gallery corridor with sculpture" parallax/></div>
      <div className="v-lobby-copy">
        <Label>The space</Label><Title lines={['Finesse of', 'a luxury hotel.']} accent={[1]}/>
        <ul className="v-biglist">{['Reception & concierge', 'Residents’ lounge', 'Delivery room', 'Stroller parking', 'Drop-off point', 'Pet wash station', 'Library corner', 'Winter garden café'].map((t, i) => <li key={t} data-reveal><span>{String(i + 1).padStart(2, '0')}</span>{t}</li>)}</ul>
      </div>
    </section>
    <section className="v-services v-pad" data-tone="graphite">
      <div className="v-services-head"><Label>Smart solutions</Label><Title lines={['Eight things', 'you won’t notice.']} accent={[1]}/></div>
      <div className="v-services-grid">{services.map(([t, d, img], i) => <Tilt key={t} className="v-service"><img src={img} alt="" loading="lazy"/><div><span>{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></div></Tilt>)}</div>
    </section>
    <div data-tone="stone">
      <Numbered n="01" label="Concierge" title={['A familiar face', 'at the desk.']} text="Deliveries received, guests welcomed, taxis called, flowers arranged. The concierge knows your name and your routine." image="/v3/likova/lobby.webp"/>
      <Numbered n="02" reverse label="Property management" title={['Care, around', 'the clock.']} text="A professional management team keeps every system running and every space immaculate, twenty-four hours a day." image="/v3/likova/engineering.webp"/>
      <Numbered n="03" label="Residents’ app" title={['The building,', 'in your pocket.']} text="Invite guests, book the lounge, request maintenance or open the gate. All your residential services on one screen." image="/v3/silver/solution-6.webp"/>
    </div>
    <div data-tone="dusk"><HGallery label="Lobby gallery" title={['Light, stone', 'and green.']} items={[
      ['/v3/likova/lobby-slide-1.webp', 'Reception under timber fins'], ['/v3/likova/lobby-slide-2.webp', 'Lounge by the atrium'], ['/v3/silver/lobby-space.webp', 'The entrance court'],
      ['/v3/likova/lobby-image.webp', 'A quiet corner'], ['/v3/era/int-3.webp', 'Concierge desk'], ['/v3/era/int-4.webp', 'Lift lobby'],
    ]}/></div>
    <section className="v-principles v-pad" data-tone="stone">
      <div><Label>Questions</Label><Title lines={['How it', 'all works.']} accent={[1]}/></div>
      <Accordion items={[
        ['Who is at the desk?', 'A concierge team is on duty around the clock, with a dedicated manager for residents’ requests.'],
        ['How do deliveries work?', 'Couriers leave parcels in the temperature-controlled delivery room; the app tells you when they arrive.'],
        ['Can I bring my pet?', 'Of course — there is even a pet wash station by the garden entrance.'],
        ['Is parking included?', 'Underground spaces with EV charging are available with every residence collection above Garden.'],
      ]}/>
    </section>
    <NextChapter path={c.path}/>
  </>;
}

/* ───────────── 06 · INTERIORS — dusk ───────────── */

function Materials() {
  const m = [['Marble', 'Honed white marble with a soft grey vein.', 'linear-gradient(125deg,transparent 40%,rgba(120,120,120,.35) 41%,transparent 43%),linear-gradient(35deg,transparent 60%,rgba(140,140,140,.25) 61%,transparent 62%),radial-gradient(circle at 30% 20%,#ffffff,#ececea 50%,#d4d4d2)'],
    ['Granite', 'Black granite, flamed and polished.', 'radial-gradient(circle at 20% 30%,rgba(255,255,255,.08) 0 1px,transparent 2px) 0 0/7px 7px,radial-gradient(circle at 70% 60%,rgba(255,255,255,.06) 0 1px,transparent 2px) 0 0/11px 11px,linear-gradient(160deg,#2b2b2b,#0c0c0c)'],
    ['Steel', 'Brushed stainless steel.', 'repeating-linear-gradient(90deg,rgba(255,255,255,.12) 0 1px,transparent 1px 3px),linear-gradient(115deg,#8a8a8a,#e6e6e6 35%,#9c9c9c 60%,#d4d4d4 85%,#7a7a7a)'],
    ['Chrome', 'Polished nickel that mirrors the room.', 'linear-gradient(100deg,#5c5c5c 0%,#ffffff 18%,#6a6a6a 36%,#f4f4f4 58%,#4d4d4d 80%,#ffffff 100%)']];
  const [ripple, setRipple] = useState(null);
  return <section className="v-materials v-pad" data-tone="dusk">
    <div className="v-materials-head"><Label>Touch</Label><Title lines={['Materials that', 'ask to be touched.']} accent={[1]}/><p>Tilt a sample, tap it to feel the surface.</p></div>
    <div className="v-materials-grid">{m.map(([n, d, bg], i) => <Tilt key={n} className="v-material" max={14}>
      <div className="v-material-face" style={{background: bg}} onPointerDown={e => { const r = e.currentTarget.getBoundingClientRect(); setRipple({i, x: e.clientX - r.left, y: e.clientY - r.top, k: Date.now()}); }}>
        {ripple?.i === i && <i key={ripple.k} className="v-ripple" style={{left: ripple.x, top: ripple.y}}/>}
      </div><b>{n}</b><span>{d}</span></Tilt>)}</div>
  </section>;
}

function Rooms() {
  const r = [['Living', '/media/living.webp', 'Light from two sides and a ceiling height of 3.3 metres.'], ['Kitchen', '/media/kitchen.webp', 'An island in stone, appliances out of sight.'], ['Dining', '/media/dining.webp', 'A table for twelve, a view of the river.'], ['Bedroom', '/media/bedroom.webp', 'The calm side of the tower, with a dressing room.'], ['Lounge', '/media/lounge.webp', 'A reading chair, a fireplace, an evening.']];
  const [i, setI] = useState(0);
  return <section className="v-rooms v-pad" data-tone="dusk">
    <div className="v-rooms-head"><Label>Rooms</Label><Title lines={['Five rooms,', 'one evening.']} accent={[1]}/></div>
    <div className="v-rooms-tabs" role="tablist">{r.map(([n], k) => <button key={n} role="tab" aria-selected={i === k} onClick={() => setI(k)}><span>{String(k + 1).padStart(2, '0')}</span>{n}</button>)}</div>
    <div className="v-rooms-stage">{r.map(([n, src], k) => <img key={n} src={src} alt={n} className={i === k ? 'on' : ''} loading="lazy"/>)}<p className="v-rooms-cap"><b>{r[i][0]}</b>{r[i][2]}</p></div>
  </section>;
}

export function Interiors() {
  const c = chapterByPath['/interiors'];
  return <>
    <div data-tone="dusk"><ChapterHero chapter={c} lines={['A touch of', 'sophistication.']} intro="The towering arches, framed by panoramic windows, give every hall a sense of occasion." image="/v3/era/int-2.webp"/></div>
    <div data-tone="dusk"><Statement label="06 / Interiors" aside="19:40">Each detail is a note in a quiet symphony: an arch that frames a view, a handrail that catches the sun, stone that stays cool in summer and warm under lamplight.</Statement></div>
    <section className="v-stepped v-pad" data-tone="dusk">
      <Img src="/v3/era/ceilings.webp" alt="Double-height lounge with tall arched windows" className="v-stepped-img" data-stepped/>
      <div className="v-stepped-copy"><Label>Getting to the heart</Label><Title lines={['Double height,', 'double light.']} accent={[1]}/><p>The residents’ lounge rises through two floors, with arched windows that let the evening sun reach deep into the room.</p></div>
    </section>
    <HGallery label="The halls" title={['Arches, stone,', 'a warmer light.']} items={[
      ['/v3/era/int-1.webp', 'Arrival hall'], ['/v3/era/int-2.webp', 'Chandelier lobby'], ['/v3/era/int-3.webp', 'Concierge'], ['/v3/era/int-4.webp', 'Lift lobby'], ['/v3/era/int-5.webp', 'Library'], ['/v3/era/touch.webp', 'Garden entrance'],
    ]}/>
    <Materials/>
    <Rooms/>
    <section className="v-full" data-tone="midnight">
      <Img src="/v3/era/apart-bg.webp" alt="Metal pendant lamps" parallax/>
      <div className="v-full-copy v-pad"><Label>After dark</Label><Title lines={['The warmth', 'of a lamp.']} accent={[1]}/><p>Evening changes the scale of a home: the big view gives way to a pool of warm light, a book, a conversation.</p></div>
    </section>
    <NextChapter path={c.path}/>
  </>;
}

/* ───────────── 07 · RESIDENCES — evening ───────────── */

const collectionOf = f => f <= 7 ? 'Garden' : f <= 13 ? 'Courtyard' : f <= 19 ? 'Terrace' : f <= 23 ? 'Skyline' : 'Crown';

function Selector() {
  const {saved, toggleSave, setEnquiry} = useSite();
  const [hover, setHover] = useState(null), [floor, setFloor] = useState(12), [filter, setFilter] = useState('All'), [plan, setPlan] = useState(null);
  const ref = useRef(), near = useNear(ref, '200px');
  const shown = hover || floor;
  const onFloor = useMemo(() => residences.filter(r => Math.abs(r.floor - floor) <= 1), [floor]);
  const cards = onFloor.length ? onFloor : residences.filter(r => r.collection === collectionOf(floor)).slice(0, 2);
  const list = residences.filter(r => filter === 'All' || r.collection === filter || (filter === 'Saved' && saved.includes(r.id)));
  return <section className="v-selector" ref={ref} data-tone="night">
    <div className="v-selector-stage">
      {near && <Suspense fallback={null}><AfrahView mode="select" selected={floor} onSelect={setFloor} onHover={setHover}/></Suspense>}
      <div className="v-selector-hud"><span className="v-selector-floor">{String(shown).padStart(2, '0')}</span><span>Floor<br/>{collectionOf(shown)}</span></div>
      <Label className="v-selector-hint">Drag to rotate · Click a floor</Label>
      <div className="v-selector-steps"><button className="v-round" onClick={() => setFloor(f => Math.max(1, f - 1))} aria-label="Floor down">−</button><button className="v-round" onClick={() => setFloor(f => Math.min(26, f + 1))} aria-label="Floor up">+</button></div>
    </div>
    <div className="v-selector-panel v-pad">
      <Label>Floor {floor} · {collectionOf(floor)} collection</Label>
      <h2>{onFloor.length ? `${onFloor.length} residence${onFloor.length > 1 ? 's' : ''} on this level` : `Nearest ${collectionOf(floor)} homes`}</h2>
      <div className="v-selector-cards">{cards.map(r => <article key={r.id} className="v-res-card">
        <img src={r.image} alt="" loading="lazy"/>
        <div><b>{r.id}</b><span>{r.beds} bed · {r.area} m² · {r.aspect}</span><span>View: {r.view}</span></div>
        <div className="v-res-actions"><button onClick={() => setPlan(r)}>Plan</button><button aria-pressed={saved.includes(r.id)} aria-label={`Save ${r.id}`} onClick={() => toggleSave(r.id)}><Heart size={16} fill={saved.includes(r.id) ? 'currentColor' : 'none'}/></button></div>
      </article>)}</div>
      <div className="v-chips">{['All', 'Garden', 'Courtyard', 'Terrace', 'Skyline', 'Crown', 'Saved'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}{f === 'Saved' && saved.length ? ` (${saved.length})` : ''}</button>)}</div>
      <table className="v-res-table"><thead><tr><th>Residence</th><th>Floor</th><th>Beds</th><th>Area</th><th>Aspect</th><th><span className="v-sr">Save</span></th></tr></thead>
        <tbody>{list.map(r => <tr key={r.id} className={r.floor === floor ? 'on' : ''} onClick={() => setFloor(r.floor)}><td>{r.id}</td><td>{r.floor}</td><td>{r.beds}</td><td>{r.area} m²</td><td>{r.aspect}</td>
          <td><button aria-label={`Save ${r.id}`} aria-pressed={saved.includes(r.id)} onClick={e => { e.stopPropagation(); toggleSave(r.id); }}><Heart size={15} fill={saved.includes(r.id) ? 'currentColor' : 'none'}/></button></td></tr>)}
          {!list.length && <tr><td colSpan="6">No saved residences yet — tap a heart to save one.</td></tr>}</tbody></table>
    </div>
    {plan && <Dialog title={`Residence ${plan.id}`} className="v-plan" onClose={() => setPlan(null)}>
      <Label>Residence {plan.id} · Floor {plan.floor} · {plan.collection}</Label>
      <h2>{plan.beds} bedrooms, {plan.area} m²</h2>
      <FloorPlan unit={plan.id}/>
      <p className="v-plan-note">Illustrative layout. Final plans, areas and specifications may change.</p>
      <button className="v-pill" onClick={() => { setPlan(null); setEnquiry(plan.id); }}>Enquire about {plan.id} <ArrowUpRight size={15}/></button>
    </Dialog>}
  </section>;
}

export function Residences() {
  const c = chapterByPath['/residences'];
  const cols = [['Garden', 'Floors 1–7', 'Private gardens and direct courtyard access.', '/v3/silver/court-5.webp'], ['Courtyard', 'Floors 8–13', 'Views over the planting, light from two sides.', '/story/courtyard.webp'],
    ['Terrace', 'Floors 14–19', 'The first step of the tower: every home with a terrace.', '/v3/silver/terraces.webp'], ['Skyline', 'Floors 20–23', 'The river and the city skyline, framed.', '/v3/silver/gallery-2.webp'], ['Crown', 'Floors 24–26', 'Penthouses under the silver arches.', '/v3/silver/gallery-5.webp']];
  return <>
    <div data-tone="night"><ChapterHero chapter={c} lines={['Select', 'your floor.']} intro="Spin the tower. Hover a level. Open a plan. Twenty-six floors, and one of them is yours." image="/v3/silver/terraces.webp"/></div>
    <Selector/>
    <section className="v-collections v-pad" data-tone="night">
      <div className="v-collections-head"><Label>Five collections</Label><Title lines={['From the garden', 'to the crown.']} accent={[1]}/></div>
      <div className="v-collections-grid">{cols.map(([n, f, d, img]) => <Tilt key={n} className="v-collection"><img src={img} alt="" loading="lazy"/><div><Label>{f}</Label><h3>{n}</h3><p>{d}</p></div></Tilt>)}</div>
    </section>
    <div data-tone="night"><Statement label="07 / Residences" aside="21:15">A home is never finished in quite the same way as a drawing. Books arrive, favourite objects find their places, routines change. The plans leave room for that.</Statement></div>
    <div data-tone="dusk"><HGallery label="Inside the residences" title={['Rooms with', 'a view.']} items={[
      ['/media/living.webp', 'Living room, floor 18'], ['/media/kitchen.webp', 'Kitchen island in stone'], ['/media/dining.webp', 'Dining by the window'],
      ['/media/bedroom.webp', 'Principal bedroom'], ['/media/lounge.webp', 'Reading corner'], ['/v3/silver/terraces.webp', 'Terrace, floor 14'],
    ]}/></div>
    <div data-tone="sky"><SideSwitch
      a={{label: 'River · East', image: '/v3/silver/desc-big.webp', text: 'East-facing homes look over the water and the bridge. Breakfast in the sun, a calm, shaded afternoon.'}}
      b={{label: 'Skyline · West', image: '/v3/silver/gallery-2.webp', text: 'West-facing homes frame the city skyline, lit gold at sunset and sparkling long after dark.'}}/></div>
    <section className="v-numbers v-pad" data-tone="sand">
      <div className="v-numbers-head"><Label>Specification</Label><Label>Illustrative study figures</Label></div>
      <div className="v-numbers-grid">
        <Counter value={212} label="Residences in total"/><Counter value={330} suffix="cm" label="Ceiling height in living rooms"/><Counter value={5} label="Collections, garden to crown"/>
        <Counter value={64} suffix="m²" label="Smallest home"/><Counter value={240} suffix="m²" label="Crown penthouse"/><Counter value={2} label="Aspects in most homes"/>
      </div>
    </section>
    <section className="v-principles v-pad" data-tone="night">
      <div><Label>Specification</Label><Title lines={['Built in,', 'thought through.']} accent={[1]}/></div>
      <Accordion items={[
        ['Windows', 'Floor-to-ceiling triple glazing in slim frames, with opening panels in every room.'],
        ['Kitchens', 'Stone worktops, integrated appliances and a pantry wall that hides everything else.'],
        ['Bathrooms', 'Heated floors, walk-in showers and a separate bath in homes with three bedrooms or more.'],
        ['Climate', 'Quiet heating and cooling in every room, controlled from the residents’ app.'],
        ['Storage', 'Built-in wardrobes, a utility room in larger homes and a private storage room downstairs.'],
      ]}/>
    </section>
    <NextChapter path={c.path}/>
  </>;
}

/* ───────────── 08 · CONTACT — night ───────────── */

export function Contact() {
  const c = chapterByPath['/contact'];
  const ref = useRef(), near = useNear(ref);
  return <>
    <div data-tone="midnight"><ChapterHero chapter={c} lines={['Come', 'home.']} intro="The city lights up below. The last chapter is the one you write yourself." image="/v3/silver/arch-intro.webp"/></div>
    <section className="v-contact v-pad" data-tone="midnight">
      <div className="v-contact-copy">
        <Label>Private viewing</Label><Title lines={['Let’s', 'begin.']} accent={[1]}/>
        <p>Tell us a little about what you’re looking for, and we’ll arrange a private visit to the AFRAH gallery.</p>
        <ol className="v-steps">{[['Book', 'Choose a time that suits you.'], ['Visit', 'Walk the model and the material library.'], ['Choose', 'Find your floor, your view, your home.']].map(([t, d], i) => <li key={t}><span>{String(i + 1).padStart(2, '0')}</span><b>{t}</b><em>{d}</em></li>)}</ol>
        <p className="v-contact-note">By appointment only · Responses within one working day · Your details stay private.</p>
      </div>
      <div className="v-contact-form"><Enquiry embedded onClose={() => {}}/></div>
    </section>
    <section className="v-full" data-tone="midnight">
      <Img src="/v3/era/int-deco.webp" alt="Sculptural stone and metal object in the gallery" parallax/>
      <div className="v-full-copy v-pad"><Label>The AFRAH gallery</Label><Title lines={['Touch it', 'before it’s built.']} accent={[1]}/><p>A scale model of the tower, the material library and a full-size corner of a Skyline residence — all in one room, by appointment.</p></div>
    </section>
    <div data-tone="midnight"><Statement label="08 / The day, remembered" aside="23:00">First light over the river. A run under the pines. Coffee on the corner, a tower in the noon sun, a quiet lobby, an arched hall at dusk, a floor of your own — and now the city, glowing below. One day. A whole life.</Statement></div>
    <section className="v-finale" ref={ref} data-tone="midnight">
      {near && <Suspense fallback={null}><City/></Suspense>}
      <div className="v-finale-copy v-pad"><Label>23:00 — The city at midnight</Label><h2>Imagine<br/><span className="v-accent">tomorrow</span><br/>at AFRAH.</h2></div>
      <Marquee items={['Form', 'Nature', 'Human', 'One day', 'A whole life']} className="big"/>
    </section>
    <section className="v-principles v-pad" data-tone="graphite">
      <div><Label>Before you visit</Label><Title lines={['Good to', 'know.']} accent={[1]}/></div>
      <Accordion items={[
        ['Is AFRAH a real development?', 'AFRAH is a design study. Figures, plans and images are illustrative and may change.'],
        ['Where are enquiries stored?', 'Enquiries are saved privately on this site’s own server and are not sent to marketing services.'],
        ['Can I save residences?', 'Yes — tap the heart on any residence. Your list stays in this browser.'],
      ]}/>
    </section>
    <div data-tone="night"><ChapterIndex current={c.path}/></div>
  </>;
}

export function NotFound() {
  return <section className="v-404 v-pad" data-tone="night"><Label>Lost in the day</Label><Title as="h1" lines={['This hour', 'doesn’t exist.']} accent={[1]}/><TextLink to="/" light>Back to the prologue</TextLink></section>;
}
