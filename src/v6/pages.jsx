import {useEffect, useMemo, useRef, useState, lazy, Suspense} from 'react';
import {Dialog, Enquiry} from '../Forms';
import {Residences, PlaceMap} from './Film';
import {PLACES} from './era';
import {Link} from './App';

// ERA-pattern pages (flats · visual search · 3D map · architecture · location · gallery · progress · how to buy ·
// favourites · contacts), rebuilt in the AFRAH palette.
import {UNITS} from './residences-data';
export {UNITS} from './residences-data';

function useFavourites() {
  const read = () => { try { return JSON.parse(localStorage.getItem('afrah:fav') || '[]'); } catch { return []; } };
  const [fav, setFav] = useState(read);
  useEffect(() => { const s = () => setFav(read()); addEventListener('afrah:fav', s); return () => removeEventListener('afrah:fav', s); }, []);
  const toggle = id => { const next = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id]; try { localStorage.setItem('afrah:fav', JSON.stringify(next)); } catch {} setFav(next); dispatchEvent(new Event('afrah:fav')); };
  return [fav, toggle];
}
export function FavCount() { const [fav] = useFavourites(); return fav.length; }

// Procedural line plan — a different room arrangement per unit.
export function Plan({unit}) {
  const {seed, beds} = unit, r = n => ((Math.sin(seed * 91.7 + n * 13.3) * 43758.5) % 1 + 1) % 1;
  const W = 300, H = 220, split = 110 + r(1) * 60, rooms = [];
  for (let i = 0; i < beds; i++) { const w = (W - split) / beds; rooms.push([split + i * w, 0, w, 96 + r(i + 2) * 20]); }
  return <svg className="plan" viewBox="-12 -12 324 244" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="0" y="0" width={W} height={H} strokeWidth="3.2"/>
      <path d={`M${split} 0V${H * .55} M0 ${H * .62}H${split * .8}`} strokeWidth="2.2"/>
      {rooms.map(([x, y, w, h], i) => <path key={i} d={`M${x} ${y + h}H${x + w} ${i ? `M${x} 0V${h}` : ''}`} strokeWidth="2.2"/>)}
      {rooms.map(([x, , w], i) => <rect key={'b' + i} x={x + w * .2} y={14} width={w * .6} height={40} rx="2"/>)}
      <rect x="16" y={H * .7} width={split * .5} height="34" rx="3"/><circle cx={split * .45} cy={H * .3} r="18"/>
      <path d={`M${split + 8} ${H - 10}H${W - 8}`} strokeDasharray="4 5"/>
    </g>
  </svg>;
}

function PageTitle({children, eyebrow, crumbs}) {
  return <header className="e-title">
    {eyebrow && <span className="e-eyebrow">{eyebrow}</span>}
    <h1>{children}</h1>
    {crumbs && <nav className="e-crumbs"><Link to="/">Home</Link><i>/</i><span>{crumbs}</span></nav>}
  </header>;
}

export const Heart = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>;
function UnitCard({u, fav, onFav, onOpen}) {
  return <article className="e-card" onClick={() => onOpen(u)}>
    <div className="e-card-meta"><span>{u.area} m²</span><span>{u.beds} bedroom{u.beds > 1 ? 's' : ''}</span><span>Level {String(u.floor).padStart(2, '0')}</span></div>
    <button className={`e-heart ${fav ? 'on' : ''}`} aria-label={fav ? 'Remove from favourites' : 'Add to favourites'} onClick={e => { e.stopPropagation(); onFav(u.id); }}><Heart/></button>
    <Plan unit={u}/>
    <div className="e-card-foot"><strong>{u.id}</strong><span>{u.aspect} aspect</span></div>
  </article>;
}

function UnitDialog({u, onClose}) {
  const [enq, setEnq] = useState(false);
  if (enq) return <Enquiry residence={u.id} onClose={onClose}/>;
  return <Dialog title={`Residence ${u.id}`} className="p-plan" onClose={onClose}>
    <span>Level {u.floor} · {u.aspect} aspect</span><h2 className="f-serif">{u.id}</h2>
    <Plan unit={u}/>
    <dl className="e-specs"><dt>Area</dt><dd>{u.area} m²</dd><dt>Bedrooms</dt><dd>{u.beds}</dd><dt>Level</dt><dd>{u.floor}</dd><dt>Orientation</dt><dd>{u.aspect}</dd></dl>
    <p className="e-note">Illustrative layout. Final plans on request.</p>
    <button className="f-pill" onClick={() => setEnq(true)}>Arrange a viewing</button>
  </Dialog>;
}

function ResidencesPage() {
  const [beds, setBeds] = useState(0), [lv, setLv] = useState([2, 64]), [area, setArea] = useState(300), [sort, setSort] = useState('floor'), [open, setOpen] = useState(null);
  const [fav, toggle] = useFavourites();
  const list = useMemo(() => UNITS.filter(u => (!beds || u.beds === beds) && u.floor >= lv[0] && u.floor <= lv[1] && u.area <= area).sort((a, b) => a[sort] - b[sort]), [beds, lv, area, sort]);
  return <main className="e-page">
    <PageTitle eyebrow="Residences" crumbs="Residences">Residences</PageTitle>
    <section className="e-filters">
      <div><label>Bedrooms</label><div className="e-chips">{[0, 1, 2, 3, 4].map(b => <button key={b} aria-pressed={beds === b} onClick={() => setBeds(b)}>{b || 'All'}</button>)}</div></div>
      <div><label>Level {lv[0]}–{lv[1]}</label><div className="e-range"><input type="range" min="2" max="64" value={lv[0]} onChange={e => setLv([Math.min(+e.target.value, lv[1]), lv[1]])} aria-label="Lowest level"/><input type="range" min="2" max="64" value={lv[1]} onChange={e => setLv([lv[0], Math.max(+e.target.value, lv[0])])} aria-label="Highest level"/></div></div>
      <div><label>Area up to {area} m²</label><input type="range" min="80" max="300" step="5" value={area} onChange={e => setArea(+e.target.value)} aria-label="Maximum area"/></div>
      <div><label>Sort</label><div className="e-chips">{[['floor', 'Level'], ['area', 'Area'], ['beds', 'Bedrooms']].map(([k, n]) => <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{n}</button>)}</div></div>
      <div className="e-count"><strong>{list.length}</strong><span>residences</span><button onClick={() => { setBeds(0); setLv([2, 64]); setArea(300); }}>Reset</button></div>
    </section>
    <section className="e-grid">{list.map(u => <UnitCard key={u.id} u={u} fav={fav.includes(u.id)} onFav={toggle} onOpen={setOpen}/>)}</section>
    {open && <UnitDialog u={open} onClose={() => setOpen(null)}/>}
  </main>;
}

const FloorSelectPage = lazy(() => import('../v7/pages/FloorSelect'));
function SelectPage() {
  return <Suspense fallback={<main className="e-page"/>}><FloorSelectPage/></Suspense>;
}

function MapPage() {
  return <main className="e-page e-full e-mapPage">
    <PageTitle crumbs="3D map">The district</PageTitle>
    <PlaceMap/>
  </main>;
}

function Editorial({items}) {
  return <section className="e-editorial">{items.map(([n, t, img, text], i) => <article key={t} className={i % 2 ? 'flip' : ''}>
    <figure><img src={img} alt="" loading="lazy"/></figure>
    <div><span className="e-eyebrow">{n}</span><h2 className="f-serif">{t}</h2><p>{text}</p></div>
  </article>)}</section>;
}
function Stats({items}) {
  return <section className="p-facts">{items.map(([v, u, t]) => <div key={t}><strong className="f-serif">{v}</strong><em>{u}</em><span>{t}</span></div>)}</section>;
}

function ArchitecturePage() {
  return <main className="e-page">
    <PageTitle eyebrow="Architecture" crumbs="Architecture">Architecture</PageTitle>
    <figure className="e-hero"><img src="/v3/era/arch-building.webp" alt="The tower at dusk"/></figure>
    <p className="e-lede">A tower of stone and bronze that rises in setbacks, each one a terrace.</p>
    <Editorial items={[
      ['01 / Silhouette', 'Setbacks.', '/v3/era/art-deco.webp', 'The mass steps back as it rises, opening terraces to the sky and light to the street. Sixty-four levels, three setbacks and a lantern.'],
      ['02 / Facade', 'Bronze leaves.', '/v3/era/new-era.webp', 'Tall bronze fins shaped like leaves frame deep windows. They catch the low sun in the morning and glow from within at night.'],
      ['03 / Street', 'The arcade.', '/v3/era/arch-2.webp', 'At ground level a stone arcade of arched windows opens onto the square: cafés, the lobby and the entrance to the garden.'],
    ]}/>
    <Stats items={[['64', 'levels', 'Above the river'], ['266', 'm', 'Height to the crown'], ['5', 'towers', 'One ensemble'], ['1.2', 'ha', 'Courtyard garden']]}/>
    <section className="e-forms">
      <header><span className="e-eyebrow">Phase two</span><h2 className="f-serif">Four mirror towers.</h2><p>Around the stone tower, four glass towers, each with its own form, reflect it and the sky.</p></header>
      <div>{TOWER_FORMS.map(([n, t, h, d]) => <article key={n}><svg viewBox="0 0 60 120" aria-hidden="true"><path d={FORM_PATHS[n]}/></svg><span className="e-eyebrow">{n}</span><strong className="f-serif">{t}</strong><em>{h} m</em><p>{d}</p></article>)}</div>
    </section>
    <section className="e-materials">
      {[['Limestone', 'Honed, from the same quarry as the embankment walls.', '/v3/era/int-2.webp'], ['Bronze', 'Patinated by hand; it darkens gently with the years.', '/v3/era/int-4.webp'], ['Glass', 'Low-iron, double-glazed, floor to ceiling.', '/v3/silver/gallery-4.webp']].map(([t, d, img]) => <article key={t}><figure><img src={img} alt="" loading="lazy"/></figure><strong className="f-serif">{t}</strong><p>{d}</p></article>)}
    </section>
    <div className="e-under"><Link to="/gallery" className="f-pill">See the gallery</Link></div>
  </main>;
}
const TOWER_FORMS = [['Twist', 'A quarter turn.', 232, 'A square plan that turns 90° over its height.'], ['Taper', 'The ellipse.', 196, 'An elliptical plan narrowing to a sloped crown.'], ['Step', 'Glass Deco.', 176, 'Three setbacks, the Art Deco profile in mirror glass.'], ['Sail', 'The lens.', 158, 'A lens-shaped plan bowed like a sail towards the river.']];
const FORM_PATHS = {
  Twist: 'M18 118 L42 118 L46 4 L14 4 Z M18 118 L46 4 M42 118 L14 4',
  Taper: 'M10 118 C10 70 18 30 24 6 L38 2 C42 30 50 70 50 118 Z',
  Step: 'M8 118 V52 H16 V26 H24 V8 H36 V26 H44 V52 H52 V118 Z',
  Sail: 'M12 118 C6 80 10 40 26 4 C40 30 50 70 48 118 Z',
};

function PlacePage() {
  return <main className="e-page">
    <PageTitle eyebrow="Place" crumbs="Place">On the river</PageTitle>
    <section className="e-mapblock"><PlaceMap interactive={false}/></section>
    <section className="e-places">{PLACES.slice(1).map(p => <article key={p.id}><span className="e-eyebrow">{p.cat}</span><strong className="f-serif">{p.name}</strong><em>{p.time} min</em></article>)}</section>
    <Editorial items={[
      ['Nature', 'The embankment.', '/v3/silver/loc-1.webp', 'A river path for a morning run or an evening walk, four minutes from the door.'],
      ['Culture', 'An evening out.', '/v3/era/joy-c4.webp', 'The concert hall, galleries and restaurants within a short walk.'],
    ]}/>
    <div className="e-under"><Link to="/map" className="f-pill">Open the 3D map</Link></div>
  </main>;
}

const PHOTOS = [
  ['Exterior', 'The tower at dusk', '/v3/era/arch-building.webp', 1050, 1878],
  ['Exterior', 'A new era for the city', '/v3/era/new-era.webp', 2016, 2044],
  ['Exterior', 'Stone, bronze and light', '/v3/era/art-deco.webp', 868, 1390],
  ['Exterior', 'The arcade on the square', '/v3/era/arch-2.webp', 2016, 1134],
  ['Exterior', 'Above the river bend', '/v3/silver/intro.webp', 2016, 1260],
  ['Exterior', 'Evening over the district', '/v3/silver/arch-intro.webp', 2016, 1260],
  ['Exterior', 'Terraces in the setbacks', '/v3/silver/gallery-2.webp', 1918, 1176],
  ['Exterior', 'Towers in the sky', '/v3/silver/gallery-4.webp', 1918, 1176],
  ['Interior', 'The entrance hall', '/v3/era/int-1.webp', 1300, 1625],
  ['Interior', 'Double-height lobby', '/v3/era/int-2.webp', 1300, 1625],
  ['Interior', 'Concierge', '/v3/era/int-3.webp', 1300, 1552],
  ['Interior', 'Lift lobby in bronze', '/v3/era/int-4.webp', 1300, 1625],
  ['Interior', 'Residents’ corridor', '/v3/era/int-5.webp', 1300, 1625],
  ['Interior', 'The drawing room', '/media/living.webp', 2000, 1429],
  ['Interior', 'A bedroom above the park', '/media/bedroom.webp', 2000, 1429],
  ['Interior', '5.89 metre ceilings', '/v3/era/ceilings.webp', 2016, 2688],
  ['Interior', 'Private lounge', '/media/lounge.webp', 1282, 1602],
  ['Interior', 'Gallery apartment', '/media/interior-still.webp', 1920, 1080],
  ['Interior', 'Library and fireplace', '/v3/silver/lobby-bottom.webp', 2016, 2016],
  ['Interior', 'The pendant hall', '/v3/era/apart-bg.webp', 2016, 1512],
  ['Interior', 'Sculpture niche', '/media/detail.webp', 2563, 2563],
  ['Grounds', 'The courtyard parterre', '/v3/era/labirint.webp', 2016, 1260],
  ['Grounds', 'A path through the birches', '/v3/era/touch.webp', 1104, 1401],
  ['Grounds', 'Garden pavilion', '/v3/silver/court-1.webp', 1344, 756],
  ['Grounds', 'The long arcade', '/v3/silver/court-2.webp', 1344, 756],
  ['Grounds', 'Water garden', '/v3/silver/court-3.webp', 1344, 756],
  ['Grounds', 'Café terrace', '/v3/silver/court-4.webp', 1344, 756],
  ['Grounds', 'Roof meadow', '/v3/silver/court-5.webp', 1344, 756],
  ['Grounds', 'Evening in the courtyard', '/v3/silver/court-6.webp', 1344, 756],
  ['Grounds', 'Sky terrace', '/v3/silver/terraces.webp', 1932, 1596],
  ['Grounds', 'Picnic lawn', '/media/garden.webp', 2563, 1601],
  ['Life', 'Evenings on the embankment', '/v3/era/joy-1.webp', 946, 1005],
  ['Life', 'Saturday market', '/v3/era/joy-c1.webp', 1302, 1322],
  ['Life', 'A run by the river', '/v3/era/joy-c3.webp', 1302, 1322],
  ['Life', 'The concert hall', '/v3/era/joy-c4.webp', 1302, 1322],
  ['Life', 'Out in town', '/v3/era/joy-c6.webp', 1302, 1322],
  ['Life', 'Family weekend', '/v3/silver/time-2.webp', 1008, 924],
  ['Life', 'The riding club', '/v3/silver/loc-7.webp', 560, 756],
  ['Life', 'Nine holes before breakfast', '/v3/silver/movement.webp', 2016, 1260],
  ['Life', 'Dinner downstairs', '/media/dining.webp', 641, 747],
];
const TABS = ['All', 'Exterior', 'Interior', 'Grounds', 'Life'];

// Columns filled shortest-first, so the grid has no holes whatever the mix of
// portrait and landscape pictures.
function useColumns() {
  const get = () => (innerWidth < 640 ? 1 : innerWidth < 1100 ? 2 : 3);
  const [n, setN] = useState(get);
  useEffect(() => { const r = () => setN(get()); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);
  return n;
}

function GalleryPage() {
  const [tab, setTab] = useState('All'), [open, setOpen] = useState(-1);
  const list = PHOTOS.filter(p => tab === 'All' || p[0] === tab);
  const n = useColumns();
  const cols = useMemo(() => {
    const c = Array.from({length: n}, () => ({h: 0, items: []}));
    list.forEach((p, i) => { const col = c.reduce((a, b) => (b.h < a.h ? b : a)); col.items.push(i); col.h += p[4] / p[3] + 0.08; });
    return c;
  }, [list, n]);
  return <main className="e-page">
    <PageTitle eyebrow="Gallery" crumbs="Gallery">Gallery</PageTitle>
    <nav className="e-tabs" aria-label="Filter pictures">{TABS.map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}<i>{t === 'All' ? PHOTOS.length : PHOTOS.filter(p => p[0] === t).length}</i></button>)}</nav>
    <section className="e-masonry" key={tab + n}>{cols.map((c, k) => <div key={k}>{c.items.map(i => { const [cat, title, src, w, h] = list[i]; return <button key={src} className="e-shot" style={{aspectRatio: `${w} / ${h}`, '--d': `${(i % 6) * 60}ms`}} onClick={() => setOpen(i)} aria-label={`Open ${title}`}>
      <img src={src} alt={title} loading={i < 9 ? 'eager' : 'lazy'} decoding="async"/>
      <span><em>{cat}</em>{title}</span>
    </button>; })}</div>)}</section>
    {open >= 0 && <Lightbox items={list} index={open} onIndex={setOpen} onClose={() => setOpen(-1)}/>}
  </main>;
}

function Lightbox({items, index, onIndex, onClose}) {
  const go = d => onIndex((index + d + items.length) % items.length);
  const [cat, title, src] = items[index];
  const strip = useRef(null), touch = useRef(null);
  useEffect(() => {
    const k = e => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });
  useEffect(() => {
    [1, -1].forEach(d => { const im = new Image(); im.src = items[(index + d + items.length) % items.length][2]; });
    strip.current?.children[index]?.scrollIntoView({block: 'nearest', inline: 'center', behavior: 'smooth'});
  }, [index, items]);
  return <Dialog title="Gallery" className="e-lightbox" onClose={onClose}>
    <figure onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
      <img key={src} src={src} alt={title}/>
      <figcaption><span className="e-eyebrow">{cat}</span><strong>{title}</strong><em>{String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</em></figcaption>
    </figure>
    <button className="e-lb-nav prev" onClick={() => go(-1)} aria-label="Previous picture">←</button>
    <button className="e-lb-nav next" onClick={() => go(1)} aria-label="Next picture">→</button>
    <nav className="e-lb-strip" ref={strip} aria-label="All pictures">{items.map(([, t, s], i) => <button key={s} aria-current={i === index} onClick={() => onIndex(i)} aria-label={t}><img src={s} alt="" loading="lazy"/></button>)}</nav>
  </Dialog>;
}

const PROGRESS = [
  ['September 2026', 64, '/v3/era/new-era.webp', 'Facade installation reaches level 41; bronze leaves fitted to the first setback.'],
  ['June 2026', 51, '/v3/silver/arch-top.webp', 'The structure tops out at level 64. Crown steelwork begins.'],
  ['March 2026', 38, '/v3/silver/gallery-5.webp', 'Core and slabs to level 44; the podium arcade is glazed.'],
  ['December 2025', 22, '/v3/silver/court.webp', 'Podium and courtyard slab complete; the first trees planted.'],
];
const MILESTONES = [['Q2 2024', 'Groundbreaking', 1], ['Q4 2025', 'Podium complete', 1], ['Q2 2026', 'Topping out', 1], ['Q4 2026', 'Facade closed', 0.6], ['Q2 2027', 'Interiors and garden', 0], ['Q4 2027', 'Handover', 0]];
function ProgressPage() {
  return <main className="e-page">
    <PageTitle eyebrow="Construction" crumbs="Progress">Progress</PageTitle>
    <section className="e-overall">
      <div><span className="e-eyebrow">Overall</span><strong className="f-serif">64%</strong><i><b style={{width: '64%'}}/></i><p>Handover of the first residences is planned for the fourth quarter of 2027.</p></div>
      <ol>{MILESTONES.map(([q, t, k]) => <li key={t} className={k >= 1 ? 'done' : k > 0 ? 'now' : ''}><em>{q}</em><span>{t}</span></li>)}</ol>
    </section>
    <section className="e-progress">{PROGRESS.map(([d, pct, img, t]) => <article key={d}>
      <figure><img src={img} alt="" loading="lazy"/></figure>
      <div><span className="e-eyebrow">{d}</span><strong className="f-serif">{pct}%</strong><i><b style={{width: pct + '%'}}/></i><p>{t}</p></div>
    </article>)}</section>
  </main>;
}

const STEPS = [['Choose', 'Select a residence by level, view or plan, online or in the sales gallery.'], ['Reserve', 'A refundable deposit holds it for fourteen days while you decide.'], ['Agree', 'Sign the purchase agreement with our team and your adviser.'], ['Pay', 'On the plan that suits you: in full, in stages, or with a mortgage.'], ['Choose finishes', 'Select stone, timber and kitchen with our interior team.'], ['Move in', 'Handover with a full walkthrough and a year of aftercare.']];
const PLANS = [['Full payment', '8%', 'discount', ['Pay within 30 days of signing', 'Best price on any residence', 'Priority choice of finishes']], ['Staged', '30 / 70', 'split', ['30% on signing', '70% in stages as the tower rises', 'No interest']], ['Instalments', '24', 'months', ['20% on signing', 'Equal monthly payments to handover', 'Fixed price']]];
const FAQ = [['Can I visit the site?', 'Yes. Private viewings of the sales gallery and a show residence run daily; site tours by appointment.'], ['Can foreign buyers purchase?', 'Yes. Our team works with international buyers and can recommend advisers and banks.'], ['Is the deposit refundable?', 'The reservation deposit is fully refundable for fourteen days.'], ['Which banks offer mortgages?', 'Several partner banks offer mortgages on AFRAH residences; our team can arrange an introduction.'], ['Can I change the layout?', 'Adjacent residences can be combined, and layouts can be adjusted until the facade is closed.']];
const fmt = v => '€' + Math.round(v).toLocaleString('en-GB');
function BuyPage() {
  const [price, setPrice] = useState(1800000), [down, setDown] = useState(30), [years, setYears] = useState(20), [rate, setRate] = useState(4.2), [faq, setFaq] = useState(0);
  const loan = price * (1 - down / 100), r = rate / 1200, m = years * 12;
  const monthly = r ? loan * r / (1 - Math.pow(1 + r, -m)) : loan / m;
  return <main className="e-page">
    <PageTitle eyebrow="How to buy" crumbs="How to buy">How to buy</PageTitle>
    <section className="e-steps">{STEPS.map(([t, s], i) => <article key={t}><span>{String(i + 1).padStart(2, '0')}</span><h2 className="f-serif">{t}</h2><p>{s}</p></article>)}</section>
    <section className="e-sub"><span className="e-eyebrow">Payment</span><h2 className="f-serif">Three ways to pay.</h2></section>
    <section className="e-plans">{PLANS.map(([t, v, u, list]) => <article key={t}><span className="e-eyebrow">{t}</span><strong className="f-serif">{v}<em>{u}</em></strong><ul>{list.map(x => <li key={x}>{x}</li>)}</ul></article>)}</section>
    <section className="e-calc">
      <div className="e-calc-in">
        <span className="e-eyebrow">Mortgage calculator</span>
        <label><span>Residence price<b>{fmt(price)}</b></span><input type="range" min="600000" max="9000000" step="50000" value={price} onChange={e => setPrice(+e.target.value)}/></label>
        <label><span>Down payment<b>{down}% · {fmt(price * down / 100)}</b></span><input type="range" min="10" max="90" value={down} onChange={e => setDown(+e.target.value)}/></label>
        <label><span>Term<b>{years} years</b></span><input type="range" min="5" max="30" value={years} onChange={e => setYears(+e.target.value)}/></label>
        <label><span>Interest rate<b>{rate.toFixed(1)}%</b></span><input type="range" min="0" max="10" step="0.1" value={rate} onChange={e => setRate(+e.target.value)}/></label>
      </div>
      <div className="e-calc-out" aria-live="polite">
        <span className="e-eyebrow">Monthly payment</span>
        <strong className="f-serif">{fmt(monthly)}</strong>
        <dl><dt>Loan</dt><dd>{fmt(loan)}</dd><dt>Total interest</dt><dd>{fmt(monthly * m - loan)}</dd></dl>
        <p className="e-note">An illustration only, not an offer of credit.</p>
        <Link to="/residences" className="f-pill">Find a residence</Link>
      </div>
    </section>
    <section className="e-sub"><span className="e-eyebrow">Questions</span><h2 className="f-serif">Often asked.</h2></section>
    <section className="e-faq">{FAQ.map(([q, a], i) => <article key={q} className={faq === i ? 'open' : ''}>
      <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>{q}<i aria-hidden="true">+</i></button>
      <div><p>{a}</p></div>
    </article>)}</section>
    <div className="e-under"><Link to="/viewing" className="f-pill big">Arrange a viewing</Link></div>
  </main>;
}

function FavouritesPage() {
  const [fav, toggle] = useFavourites(), [open, setOpen] = useState(null);
  const list = UNITS.filter(u => fav.includes(u.id));
  return <main className="e-page">
    <PageTitle crumbs="Favourites">Favourites</PageTitle>
    <nav className="e-tabs"><button aria-pressed="true">Residences<i>{list.length}</i></button></nav>
    {list.length ? <section className="e-grid">{list.map(u => <UnitCard key={u.id} u={u} fav onFav={toggle} onOpen={setOpen}/>)}</section>
      : <section className="e-empty"><p>Your saved residences appear here.</p><Link to="/residences" className="e-circle">Choose a residence</Link></section>}
    {open && <UnitDialog u={open} onClose={() => setOpen(null)}/>}
  </main>;
}

function ViewingPage() {
  return <main className="e-page">
    <PageTitle eyebrow="Contacts" crumbs="Viewing">Come in</PageTitle>
    <section className="e-contact">
      <div className="p-form"><Enquiry embedded onClose={() => {}}/></div>
      <aside><span className="e-eyebrow">Sales gallery</span><p className="f-serif">River Embankment 1</p><p>Daily, 10:00–20:00</p><span className="e-eyebrow">By appointment</span><p>Private viewings at dusk</p></aside>
    </section>
  </main>;
}

export const PAGES = {
  '/residences': ResidencesPage, '/select': SelectPage, '/map': MapPage, '/architecture': ArchitecturePage, '/place': PlacePage,
  '/gallery': GalleryPage, '/progress': ProgressPage, '/how-to-buy': BuyPage, '/favourites': FavouritesPage, '/viewing': ViewingPage,
};
export const MENU = [['/', 'Film'], ['/residences', 'Residences'], ['/select', 'Select a level'], ['/map', '3D map'], ['/architecture', 'Architecture'], ['/place', 'Place'], ['/gallery', 'Gallery'], ['/progress', 'Progress'], ['/how-to-buy', 'How to buy'], ['/viewing', 'Viewing']];
