import {lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {Dialog, Enquiry} from '../Forms';
import {Site, Link, Label} from './ui';
import {chapters, chapterByPath, tones} from './data';
import Home from './pages/Home';
import {Vision, Landscape, Neighbourhood, Architecture, Lobby, Interiors, Residences, Contact, NotFound} from './pages/Chapters';

gsap.registerPlugin(ScrollTrigger);
const CityMap = lazy(() => import('./three/CityMap'));

function MapPage() {
  return <section className="v-mappage" data-tone="white">
    <Suspense fallback={null}><CityMap/></Suspense>
    <div className="v-mappage-title"><Label>3D map · the district</Label><h1 tabIndex="-1">Everything<br/>on foot.</h1></div>
  </section>;
}

const pages = {'/': Home, '/vision': Vision, '/landscape': Landscape, '/neighbourhood': Neighbourhood, '/architecture': Architecture,
  '/lobby': Lobby, '/interiors': Interiors, '/residences': Residences, '/contact': Contact, '/map': MapPage};
const clean = p => p.replace(/\/$/, '') || '/';
// Tone colours live on <html>; the CSS transition (registered @property) blends between them.
const setTone = t => { const s = document.documentElement.style; s.setProperty('--bg', t.bg); s.setProperty('--ink', t.ink); s.setProperty('--accent', t.accent); };

// ERA-style loader: interlocking arcs drawn in silver, a glint sweeping across them.
// It also preloads the 3D district so the first flight starts immediately.
function Loader({done}) {
  const [pct, setPct] = useState(0), ref = useRef();
  const R = 200, arcs = [];
  for (let row = 0; row < 5; row++) for (let c = -1; c < 5; c++) arcs.push([c * 2 * R + (row % 2 ? 0 : R), row * R]);
  useEffect(() => {
    const o = {v: 0}; let loaded = false, alive = true;
    document.fonts.ready.finally(() => { loaded = true; });
    const tw = gsap.to(o, {v: 88, duration: 3.2, ease: 'power2.out', onUpdate: () => alive && setPct(Math.round(o.v))});
    const wait = setInterval(() => {
      if (!loaded || tw.isActive()) return;
      clearInterval(wait);
      gsap.to(o, {v: 100, duration: .6, onUpdate: () => alive && setPct(Math.round(o.v)), onComplete: () => gsap.to(ref.current, {opacity: 0, duration: .9, delay: .35, ease: 'power2.inOut', onComplete: done})});
    }, 120);
    return () => { alive = false; tw.kill(); clearInterval(wait); };
  }, [done]);
  return <div className="v-loader" ref={ref}>
    <svg className="v-arcs" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="glint" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stopColor="#3a3a3a"/><stop offset=".45" stopColor="#3a3a3a"/><stop offset=".5" stopColor="#f4f4f4"/><stop offset=".55" stopColor="#3a3a3a"/><stop offset="1" stopColor="#3a3a3a"/>
          <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="2.8s" repeatCount="indefinite"/></linearGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stopColor="#fff"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
        <mask id="fadeMask"><rect width="1200" height="800" fill="url(#fade)"/></mask>
      </defs>
      <g mask="url(#fadeMask)" fill="none" stroke="url(#glint)" strokeWidth="1.1">
        {arcs.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={R} pathLength="1" style={{'--d': `${(i % 7) * .09}s`}}/>)}
      </g>
    </svg>
    <div className="v-loader-word">AFRAH</div>
    <div className="v-loader-foot v-pad"><Label>One day, a whole life</Label><span className="v-loader-pct">{String(pct).padStart(3, '0')}</span><button onClick={done}>Skip</button></div>
  </div>;
}

// Parent effect so pinned sections from child effects exist first; triggers are then sorted.
function useMotion(root, path) {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      const q = s => gsap.utils.toArray(root.current.querySelectorAll(s));
      if (!reduced) q('[data-hscroll]').forEach(sec => {
        const track = sec.querySelector('[data-track]');
        gsap.to(track, {x: () => -(track.scrollWidth - innerWidth), ease: 'none', scrollTrigger: {trigger: sec, start: 'top top', end: () => '+=' + (track.scrollWidth - innerWidth), pin: sec.querySelector('.v-hgallery-pin'), scrub: .8, invalidateOnRefresh: true, anticipatePin: 1}});
      });
      q('[data-tone]').forEach(sec => {
        const t = tones[sec.dataset.tone]; if (!t) return;
        ScrollTrigger.create({trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => { if (s.isActive) setTone(t); }});
      });
      if (reduced) return;
      q('[data-lines]').forEach(el => gsap.from(el.querySelectorAll('.v-line > span'), {yPercent: 110, duration: 1.3, stagger: .08, ease: 'expo.out', scrollTrigger: {trigger: el, start: 'top 88%', once: true}}));
      q('[data-reveal]').forEach(el => gsap.from(el, {y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: {trigger: el, start: 'top 92%', once: true}}));
      q('[data-words]').forEach(el => gsap.fromTo(el.children, {opacity: .14}, {opacity: 1, stagger: .06, ease: 'none', scrollTrigger: {trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: .6}}));
      q('[data-parallax]').forEach(el => gsap.fromTo(el.querySelector('img'), {yPercent: -8, scale: 1.16}, {yPercent: 8, scale: 1.16, ease: 'none', scrollTrigger: {trigger: el, start: 'top bottom', end: 'bottom top', scrub: true}}));
      q('[data-expand]').forEach(el => gsap.fromTo(el, {clipPath: 'inset(8% 24% 0% 24%)'}, {clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: {trigger: el, start: 'top 95%', end: 'top 5%', scrub: true}}));
      q('[data-stepped]').forEach(el => gsap.fromTo(el, {clipPath: 'polygon(0 30%,25% 30%,25% 20%,50% 20%,50% 10%,75% 10%,75% 0%,100% 0%,100% 100%,0 100%)'}, {clipPath: 'polygon(0 0%,25% 0%,25% 0%,50% 0%,50% 0%,75% 0%,75% 0%,100% 0%,100% 100%,0 100%)', ease: 'none', scrollTrigger: {trigger: el, start: 'top 95%', end: 'top 25%', scrub: true}}));
      q('[data-count]').forEach(el => { const v = {n: 0}, end = Number(el.dataset.count); gsap.to(v, {n: end, duration: 2, ease: 'power2.out', scrollTrigger: {trigger: el, start: 'top 90%', once: true}, onUpdate: () => { el.textContent = Math.round(v.n); }}); });
      q('.v-stack-card').forEach((card, i, all) => { if (i < all.length - 1) gsap.to(card.querySelector('.v-img'), {scale: .92, opacity: .4, ease: 'none', scrollTrigger: {trigger: all[i + 1], start: 'top bottom', end: 'top 18%', scrub: true}}); });
    }, root);
    ScrollTrigger.sort(); ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [path]);
}

export default function App() {
  const [path, setPath] = useState(clean(location.pathname));
  const [menu, setMenu] = useState(false), [film, setFilm] = useState(false), [enquiry, setEnquiry] = useState(null);
  const [intro, setIntro] = useState(() => { try { return clean(location.pathname) === '/' && !sessionStorage.getItem('afrah-v4-intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } });
  const [saved, setSaved] = useState(() => { try { const v = JSON.parse(localStorage.getItem('afrah-saved') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } });
  const root = useRef(), lenis = useRef(), pctRef = useRef();
  const chapter = chapterByPath[path];
  const overlay = menu || film || enquiry !== null || intro;

  const navigate = useCallback(to => {
    setMenu(false);
    if (to === location.pathname) { lenis.current ? lenis.current.scrollTo(0) : scrollTo(0, 0); return; }
    const go = () => { history.pushState({}, '', to); setPath(clean(to)); };
    const curtain = document.querySelector('.v-curtain');
    if (!curtain || matchMedia('(prefers-reduced-motion: reduce)').matches) return go();
    gsap.timeline().set(curtain, {display: 'grid'}).fromTo(curtain, {clipPath: 'inset(100% 0 0 0)'}, {clipPath: 'inset(0% 0 0 0)', duration: .55, ease: 'power3.in'})
      .add(go).to(curtain, {clipPath: 'inset(0 0 100% 0)', duration: .75, ease: 'power3.out', delay: .12}).set(curtain, {display: 'none'});
  }, []);

  useEffect(() => { const pop = () => { setMenu(false); setPath(clean(location.pathname)); }; addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);

  useLayoutEffect(() => {
    scrollTo(0, 0);
    document.title = path === '/map' ? 'AFRAH — 3D map' : chapter ? `AFRAH — ${chapter.hour} ${chapter.title}` : 'AFRAH — One day, a whole life';
    setTone(tones[path === '/map' ? 'white' : chapter?.tone || 'home']);
    let tick;
    if (path !== '/map' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const l = new Lenis({lerp: .085, smoothWheel: true, anchors: true}); lenis.current = l;
      l.on('scroll', ScrollTrigger.update); tick = time => l.raf(time * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    }
    const st = ScrollTrigger.create({start: 0, end: 'max', onUpdate: s => { if (pctRef.current) pctRef.current.textContent = String(Math.round(s.progress * 100)).padStart(3, '0'); }});
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 250);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => { clearTimeout(refresh); st.kill(); if (tick) gsap.ticker.remove(tick); lenis.current?.destroy(); lenis.current = null; };
  }, [path]);

  useMotion(root, path);

  useEffect(() => {
    if (overlay) { lenis.current?.stop(); document.body.style.overflow = 'hidden'; }
    else { lenis.current?.start(); document.body.style.overflow = ''; }
  }, [overlay]);

  const toggleSave = id => setSaved(old => { const next = old.includes(id) ? old.filter(x => x !== id) : [...old, id]; try { localStorage.setItem('afrah-saved', JSON.stringify(next)); } catch {} return next; });
  const finishIntro = useCallback(() => { setIntro(false); try { sessionStorage.setItem('afrah-v4-intro', '1'); } catch {} }, []);
  const Page = pages[path] || NotFound;

  return <Site.Provider value={{navigate, path, saved, toggleSave, setEnquiry, setFilm, introDone: !intro}}>
    <div className={`v-app ${path === '/map' ? 'is-map' : ''}`} ref={root}>
      <a href="#main" className="v-skip">Skip to content</a>

      {/* Floating corners instead of a header bar; mix-blend-mode keeps them readable on black and white. */}
      <Link to="/" className="v-corner v-corner-tl v-brand" aria-label="AFRAH home">AFRAH</Link>
      <nav className="v-corner v-corner-tr" aria-label="Primary">
        <Link to="/map" className="v-btn v-hide-sm">3D map</Link>
        <Link to="/residences" className="v-btn v-hide-sm">Residences{saved.length > 0 && <em>{saved.length}</em>}</Link>
        <button className="v-btn v-hide-xs" onClick={() => setEnquiry('')}>Book a viewing</button>
        <button className="v-btn v-btn-menu" onClick={() => setMenu(true)} aria-label="Open menu"><i/><i/><span>Menu</span></button>
      </nav>
      {path !== '/map' && <>
        <Link to={chapter ? chapter.path : '/vision'} className="v-corner v-corner-bl"><b>{chapter?.hour || '00:00'}</b><span>{chapter ? `${chapter.time} / ${chapter.title}` : 'Prologue / One day at AFRAH'}</span></Link>
        <div className="v-corner v-corner-br" aria-hidden="true"><span ref={pctRef}>000</span><i>Scroll</i></div>
      </>}

      <main id="main" key={path}><Page/></main>

      {path !== '/map' && <footer className="v-footer" data-tone="black">
        <div className="v-footer-cta v-pad">
          <Label>The story continues with you</Label>
          <Link to="/contact" className="v-footer-big">Let’s begin <ArrowUpRight/></Link>
        </div>
        <div className="v-footer-grid v-pad">
          <div><Label>AFRAH</Label><p>One day, a whole life. A residential study where architecture, nature and people share the same story.</p></div>
          <nav aria-label="Footer"><Link to="/">00 Prologue</Link>{chapters.map(c => <Link to={c.path} key={c.path}>{c.num} {c.title}</Link>)}<Link to="/map">3D map</Link></nav>
          <div className="v-footer-actions">
            <button onClick={() => setFilm(true)}>Watch the film <ArrowUpRight size={14}/></button>
            <button onClick={() => setEnquiry('')}>Private viewing <ArrowUpRight size={14}/></button>
            <button onClick={() => lenis.current ? lenis.current.scrollTo(0) : scrollTo({top: 0})}>Back to dawn ↑</button>
          </div>
        </div>
        <div className="v-footer-word" aria-hidden="true">AFRAH</div>
        <div className="v-footer-legal v-pad"><Label>© {new Date().getFullYear()} AFRAH study</Label><Label>Illustrative concept · plans and figures not final</Label><Label>Form / Nature / Human</Label></div>
      </footer>}

      <div className="v-curtain" aria-hidden="true"><span>AFRAH</span></div>

      {menu && <Dialog title="Menu" className="v-menu" onClose={() => setMenu(false)}>
        <div className="v-menu-grid">
          <nav aria-label="All chapters">
            <Link to="/" aria-current={path === '/' ? 'page' : undefined}><span>00:00</span>Prologue<ArrowUpRight/></Link>
            {chapters.map(c => <Link key={c.path} to={c.path} aria-current={path === c.path ? 'page' : undefined}><span>{c.hour}</span>{c.title}<ArrowUpRight/></Link>)}
            <Link to="/map" aria-current={path === '/map' ? 'page' : undefined}><span>3D</span>District map<ArrowUpRight/></Link>
          </nav>
          <aside><Label>One day at AFRAH</Label><p>Eight chapters, from the first light over the river to the city at midnight. Read them in order, or jump to the hour you like best.</p><button className="v-btn solid" onClick={() => { setMenu(false); setEnquiry(''); }}>Book a private viewing <ArrowUpRight size={15}/></button></aside>
        </div>
      </Dialog>}
      {film && <Dialog title="AFRAH film" className="v-film" onClose={() => setFilm(false)}><video controls autoPlay playsInline poster="/media/living.webp" src="/media/afrah-life.mp4"/></Dialog>}
      {enquiry !== null && <Enquiry residence={enquiry || null} onClose={() => setEnquiry(null)}/>}
      {intro && <Loader done={finishIntro}/>}
    </div>
  </Site.Provider>;
}
