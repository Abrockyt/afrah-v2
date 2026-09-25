import {useEffect, useMemo, useState} from 'react';
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
  const [beds, setBeds] = useState(0), [lv, setLv] = useState([2, 26]), [area, setArea] = useState(300), [sort, setSort] = useState('floor'), [open, setOpen] = useState(null);
  const [fav, toggle] = useFavourites();
  const list = useMemo(() => UNITS.filter(u => (!beds || u.beds === beds) && u.floor >= lv[0] && u.floor <= lv[1] && u.area <= area).sort((a, b) => a[sort] - b[sort]), [beds, lv, area, sort]);
  return <main className="e-page">
    <PageTitle eyebrow="Residences" crumbs="Residences">Residences</PageTitle>
    <section className="e-filters">
      <div><label>Bedrooms</label><div className="e-chips">{[0, 1, 2, 3, 4].map(b => <button key={b} aria-pressed={beds === b} onClick={() => setBeds(b)}>{b || 'All'}</button>)}</div></div>
      <div><label>Level {lv[0]}–{lv[1]}</label><div className="e-range"><input type="range" min="2" max="26" value={lv[0]} onChange={e => setLv([Math.min(+e.target.value, lv[1]), lv[1]])} aria-label="Lowest level"/><input type="range" min="2" max="26" value={lv[1]} onChange={e => setLv([lv[0], Math.max(+e.target.value, lv[0])])} aria-label="Highest level"/></div></div>
      <div><label>Area up to {area} m²</label><input type="range" min="80" max="300" step="5" value={area} onChange={e => setArea(+e.target.value)} aria-label="Maximum area"/></div>
      <div><label>Sort</label><div className="e-chips">{[['floor', 'Level'], ['area', 'Area'], ['beds', 'Bedrooms']].map(([k, n]) => <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{n}</button>)}</div></div>
      <div className="e-count"><strong>{list.length}</strong><span>residences</span><button onClick={() => { setBeds(0); setLv([2, 26]); setArea(300); }}>Reset</button></div>
    </section>
    <section className="e-grid">{list.map(u => <UnitCard key={u.id} u={u} fav={fav.includes(u.id)} onFav={toggle} onOpen={setOpen}/>)}</section>
    {open && <UnitDialog u={open} onClose={() => setOpen(null)}/>}
  </main>;
}

function SelectPage() {
  return <main className="e-page e-full">
    <PageTitle crumbs="Select a level">Select a level</PageTitle>
    <Residences head="Visual selection" link={false}/>
    <div className="e-under"><Link to="/residences" className="f-pill ghost">Select by criteria</Link></div>
  </main>;
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
      ['01 / Silhouette', 'Setbacks.', '/v3/era/arch-2.webp', 'The mass steps back as it rises, opening terraces to the sky and light to the street.'],
      ['02 / Facade', 'Vertical fins.', '/v3/era/arch-4.webp', 'Bronze fins frame deep windows and cast long shadows that change through the day.'],
      ['03 / Crown', 'The lantern.', '/v3/era/new-era.webp', 'The top levels glow at night, a quiet landmark over the river.'],
    ]}/>
    <Stats items={[['26', 'levels', 'Above the river'], ['266', 'm', 'Height to the crown'], ['4', 'towers', 'One ensemble'], ['1.2', 'ha', 'Courtyard garden']]}/>
  </main>;
}

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
  ['Exterior', '/v3/era/arch-building.webp'], ['Exterior', '/v3/era/new-era.webp'], ['Interior', '/v3/era/int-1.webp'], ['Interior', '/v3/era/int-2.webp'],
  ['Grounds', '/v3/silver/court-5.webp'], ['Interior', '/media/living.webp'], ['Exterior', '/v3/era/arch-2.webp'], ['Grounds', '/v3/silver/court-2.webp'],
  ['Interior', '/media/bedroom.webp'], ['Interior', '/v3/era/int-4.webp'], ['Grounds', '/v3/silver/terraces.webp'], ['Exterior', '/media/architecture-dusk.webp'],
];
function GalleryPage() {
  const [tab, setTab] = useState('All'), [open, setOpen] = useState(null);
  const list = PHOTOS.filter(p => tab === 'All' || p[0] === tab);
  return <main className="e-page">
    <PageTitle eyebrow="Gallery" crumbs="Gallery">Gallery</PageTitle>
    <nav className="e-tabs">{['All', 'Exterior', 'Interior', 'Grounds'].map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}<i>{t === 'All' ? PHOTOS.length : PHOTOS.filter(p => p[0] === t).length}</i></button>)}</nav>
    <section className="e-masonry">{list.map(([c, src], i) => <button key={src} className={`g${i % 5}`} onClick={() => setOpen(src)}><img src={src} alt={c} loading="lazy"/><span>{c}</span></button>)}</section>
    {open && <Dialog title="Image" className="e-lightbox" onClose={() => setOpen(null)}><img src={open} alt=""/></Dialog>}
  </main>;
}

const PROGRESS = [['September 2026', 64, '/v3/era/arch-4.webp', 'Facade installation reaches level 18.'], ['June 2026', 51, '/v3/era/arch-2.webp', 'Structure tops out at level 26.'], ['March 2026', 38, '/v3/likova/engineering.webp', 'Core and slabs to level 19.'], ['December 2025', 22, '/v3/likova/cube.webp', 'Podium and courtyard slab complete.']];
function ProgressPage() {
  return <main className="e-page">
    <PageTitle eyebrow="Construction" crumbs="Progress">Progress</PageTitle>
    <section className="e-progress">{PROGRESS.map(([d, pct, img, t]) => <article key={d}>
      <figure><img src={img} alt="" loading="lazy"/></figure>
      <div><span className="e-eyebrow">{d}</span><strong className="f-serif">{pct}%</strong><i><b style={{width: pct + '%'}}/></i><p>{t}</p></div>
    </article>)}</section>
  </main>;
}

function BuyPage() {
  const steps = [['Choose', 'Select a residence by level, view or plan.'], ['Reserve', 'Hold it for fourteen days while you decide.'], ['Agree', 'Sign with our team and your adviser.'], ['Move in', 'Handover with a full walkthrough.']];
  return <main className="e-page">
    <PageTitle eyebrow="How to buy" crumbs="How to buy">How to buy</PageTitle>
    <section className="e-steps">{steps.map(([t, s], i) => <article key={t}><span>{String(i + 1).padStart(2, '0')}</span><h2 className="f-serif">{t}</h2><p>{s}</p></article>)}</section>
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
