import {createContext, lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {Dialog} from '../Forms';

gsap.registerPlugin(ScrollTrigger);
const Film = lazy(() => import('./Film'));

const Nav = createContext(null);
export function Link({to, children, className = '', ...rest}) {
  const go = useContext(Nav);
  return <a href={to} className={className} {...rest} onClick={e => { if (e.metaKey || e.ctrlKey || e.button || to === '/') return; e.preventDefault(); go(to); }}>{children}</a>;
}

// Black loader: bronze arcs draw in, AFRAH in serif, real progress (finishes when the first scene renders).
function Loader({done}) {
  const [pct, setPct] = useState(0), ref = useRef();
  useEffect(() => {
    let target = 10, shown = 0, fin = false, raf;
    const ready = () => { target = 100; };
    addEventListener('afrah:ready', ready); document.fonts.ready.then(() => { target = Math.max(target, 55); });
    const safety = setTimeout(ready, 6000);
    const tick = () => { raf = requestAnimationFrame(tick); shown += (target - shown) * .06; setPct(Math.round(shown)); if (!fin && shown > 99.3) { fin = true; gsap.to(ref.current, {opacity: 0, duration: 1.1, delay: .4, ease: 'power2.inOut', onComplete: done}); } };
    tick(); return () => { cancelAnimationFrame(raf); clearTimeout(safety); removeEventListener('afrah:ready', ready); };
  }, [done]);
  return <div className="l-loader" ref={ref}>
    <svg viewBox="0 0 400 400" aria-hidden="true">{Array.from({length: 9}, (_, i) => <path key={i} d={`M${60 + i * 8} 330 Q200 ${40 + i * 12} ${340 - i * 8} 330`} pathLength="1" style={{animationDelay: `${i * .12}s`}}/>)}</svg>
    <div className="l-word">AFRAH</div>
    <div className="l-foot"><span>Residences on the river</span><span className="l-pct">{String(pct).padStart(3, '0')}</span><button className="f-pill ghost sm" onClick={done}>Skip</button></div>
    <i className="l-bar" style={{transform: `scaleX(${pct / 100})`}}/>
  </div>;
}

const PATHS = ['/residences', '/select', '/map', '/architecture', '/place', '/gallery', '/progress', '/how-to-buy', '/favourites', '/viewing'];
const MENU = [['/', 'Film'], ['/residences', 'Residences'], ['/select', 'Select a level'], ['/map', '3D map'], ['/architecture', 'Architecture'], ['/place', 'Place'], ['/gallery', 'Gallery'], ['/progress', 'Progress'], ['/how-to-buy', 'How to buy'], ['/viewing', 'Viewing']];
const Page = lazy(() => import('./pages').then(m => ({default: ({path}) => { const P = m.PAGES[path]; return <P/>; }})));
const FavCount = lazy(() => import('./pages').then(m => ({default: m.FavCount})));

export default function App() {
  const clean = p => p.replace(/\/$/, '') || '/';
  const [path, setPath] = useState(clean(location.pathname)), [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(() => clean(location.pathname) === '/');
  const lenis = useRef(), bar = useRef();
  const go = useCallback(to => { setMenu(false); history.pushState({}, '', to); setPath(clean(to)); }, []);
  useEffect(() => { const pop = () => setPath(clean(location.pathname)); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);
  useLayoutEffect(() => {
    scrollTo(0, 0);
    const l = matchMedia('(prefers-reduced-motion: reduce)').matches ? null : new Lenis({lerp: .075, smoothWheel: true});
    let tick; if (l) { lenis.current = l; window.__lenis = l; l.on('scroll', ScrollTrigger.update); tick = t => l.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0); }
    const st = ScrollTrigger.create({start: 0, end: 'max', onUpdate: s => { if (bar.current) bar.current.style.transform = `scaleX(${s.progress})`; }});
    const r = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => { clearTimeout(r); st.kill(); if (tick) gsap.ticker.remove(tick); l?.destroy(); lenis.current = null; };
  }, [path]);
  useEffect(() => { document.body.style.overflow = loading || menu ? 'hidden' : ''; if (loading || menu) lenis.current?.stop(); else lenis.current?.start(); }, [loading, menu]);
  const isPage = PATHS.includes(path);
  return <Nav.Provider value={go}>
    <div className="a-app">
      {/* ERA-pattern navigation: floating pills, no bar */}
      <div className="a-left">
        <button className="f-pill sm" onClick={() => setMenu(true)}><i className="a-burger"/>Menu</button>
        <Link to="/select" className="f-pill ghost sm hide-m">Select a level</Link>
        <Link to="/map" className="f-pill ghost sm hide-m">3D map</Link>
      </div>
      <Link to="/" className="a-mark">AFRAH</Link>
      <div className="a-right">
        <Link to="/favourites" className="a-round" aria-label="Favourites"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg><Suspense fallback={null}><sup><FavCount/></sup></Suspense></Link>
        <Link to="/viewing" className="f-pill sm">Arrange a viewing</Link>
      </div>
      <div className="a-chapter"><i><b ref={bar}/></i></div>
      <Suspense fallback={null}>{isPage ? <Page key={path} path={path}/> : <main key="film"><Film/></main>}</Suspense>
      <footer className="a-foot">
        <span className="f-serif">AFRAH</span>
        <nav>{MENU.slice(1).map(([to, n]) => <Link key={to} to={to}>{n}</Link>)}</nav>
        <div className="a-foot-cta"><Link to="/viewing" className="f-pill">Arrange a viewing</Link></div>
        <small>Illustrative concept · plans, figures and imagery not final · study build</small>
      </footer>
      {menu && <Dialog title="Menu" className="a-menu" onClose={() => setMenu(false)}>
        <nav>{MENU.map(([to, n], i) => <Link key={to} to={to} className={path === to ? 'on' : ''}><em>{String(i).padStart(2, '0')}</em>{n}</Link>)}</nav>
        <figure><img src="/v3/era/arch-building.webp" alt=""/><figcaption><span>Sales gallery</span>River Embankment 1 · Daily 10–20</figcaption></figure>
      </Dialog>}
      {loading && <Loader done={() => setLoading(false)}/>}
    </div>
  </Nav.Provider>;
}
