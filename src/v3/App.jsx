import {lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {ArrowUpRight, ArrowRight} from 'lucide-react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {Dialog, Enquiry} from '../Forms';
import {Site, Link, Label} from './ui';
import {chapters, chapterByPath, tones} from './data';
import Home from './pages/Home';
import {Vision, Landscape, Neighbourhood, Architecture, Lobby, Interiors, Residences, Contact, NotFound} from './pages/Chapters';

gsap.registerPlugin(ScrollTrigger);
const City = lazy(() => import('../scene/EraCity'));
const pages = {'/': Home, '/vision': Vision, '/landscape': Landscape, '/neighbourhood': Neighbourhood, '/architecture': Architecture,
  '/lobby': Lobby, '/interiors': Interiors, '/residences': Residences, '/contact': Contact};
const clean = p => p.replace(/\/$/, '') || '/';
// Tone colours live on <html>; the CSS transition (registered @property) blends between them.
const setTone = t => { const s = document.documentElement.style; s.setProperty('--bg', t.bg); s.setProperty('--ink', t.ink); s.setProperty('--accent', t.accent); };

// Small sun arc showing where in the day the current chapter sits.
function SunDial({hour}) {
  const [h, m] = (hour || '00:00').split(':').map(Number), t = Math.min(Math.max((h + m / 60 - 5) / 18, 0), 1);
  const a = Math.PI * (1 - t), x = 22 + Math.cos(a) * 18, y = 22 - Math.sin(a) * 18;
  return <svg className="v-sundial" viewBox="0 0 44 26" aria-hidden="true"><path d="M4 22a18 18 0 0 1 36 0" fill="none" stroke="currentColor" strokeOpacity=".35"/><line x1="0" x2="44" y1="22" y2="22" stroke="currentColor" strokeOpacity=".35"/><circle cx={x} cy={y} r="3.2" fill="var(--accent)"/></svg>;
}

function Loader({done}) {
  const [pct, setPct] = useState(0), [ready, setReady] = useState(false), ref = useRef();
  useEffect(() => {
    const o = {v: 0};
    const tw = gsap.to(o, {v: 100, duration: 3.6, ease: 'power2.inOut', onUpdate: () => setPct(Math.round(o.v)), onComplete: () => setReady(true)});
    return () => tw.kill();
  }, []);
  const leave = useCallback(() => gsap.to(ref.current, {clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'power4.inOut', onComplete: done}), [done]);
  useEffect(() => { if (ready) { const t = setTimeout(leave, 900); return () => clearTimeout(t); } }, [ready, leave]);
  return <div className="v-loader" ref={ref}>
    <Suspense fallback={null}><City intro/></Suspense>
    <div className="v-loader-top v-pad"><Label>AFRAH / One day, a whole life</Label><Label>Form · Nature · Human</Label></div>
    <div className="v-loader-mid"><span>A</span><span>F</span><span>R</span><span>A</span><span>H</span></div>
    <div className="v-loader-bottom v-pad">
      <span className="v-loader-pct">{String(pct).padStart(3, '0')}<i>%</i></span>
      <Label>{ready ? 'The day begins' : 'Drawing the city'}</Label>
      <button onClick={leave}>Skip intro <ArrowRight size={16}/></button>
    </div>
  </div>;
}

// Runs as a (parent) effect so the pinned sections created in child effects already exist;
// pins are created first and triggers are sorted so every start/end accounts for pin spacing.
function useMotion(root, path) {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      const q = s => gsap.utils.toArray(root.current.querySelectorAll(s));
      if (!reduced) q('[data-hscroll]').forEach(sec => {
        const track = sec.querySelector('[data-track]');
        gsap.to(track, {x: () => -(track.scrollWidth - innerWidth + 32), ease: 'none', scrollTrigger: {trigger: sec, start: 'top top', end: () => '+=' + (track.scrollWidth - innerWidth), pin: sec.querySelector('.v-hgallery-pin'), scrub: .8, invalidateOnRefresh: true, anticipatePin: 1}});
      });
      // Colour story: sections carrying data-tone recolour the whole page as they cross the middle.
      q('[data-tone]').forEach(sec => {
        const t = tones[sec.dataset.tone]; if (!t) return;
        ScrollTrigger.create({trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: s => { if (s.isActive) setTone(t); }});
      });
      if (reduced) return;
      q('[data-lines]').forEach(el => gsap.from(el.querySelectorAll('.v-line > span'), {yPercent: 115, rotate: 3, duration: 1.25, stagger: .09, ease: 'expo.out', scrollTrigger: {trigger: el, start: 'top 88%', once: true}}));
      q('[data-reveal]').forEach(el => gsap.from(el, {y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: {trigger: el, start: 'top 92%', once: true}}));
      q('[data-words]').forEach(el => gsap.fromTo(el.children, {opacity: .12}, {opacity: 1, stagger: .06, ease: 'none', scrollTrigger: {trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: .6}}));
      q('[data-parallax]').forEach(el => gsap.fromTo(el.querySelector('img'), {yPercent: -9, scale: 1.18}, {yPercent: 9, scale: 1.18, ease: 'none', scrollTrigger: {trigger: el, start: 'top bottom', end: 'bottom top', scrub: true}}));
      q('[data-expand]').forEach(el => gsap.fromTo(el, {clipPath: 'inset(0% 22% 0% 22% round 48vw 48vw 0vw 0vw)'}, {clipPath: 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)', ease: 'none', scrollTrigger: {trigger: el, start: 'top 95%', end: 'top 5%', scrub: true}}));
      q('[data-stepped]').forEach(el => gsap.fromTo(el, {clipPath: 'polygon(0 30%,25% 30%,25% 20%,50% 20%,50% 10%,75% 10%,75% 0%,100% 0%,100% 100%,0 100%)'}, {clipPath: 'polygon(0 0%,25% 0%,25% 0%,50% 0%,50% 0%,75% 0%,75% 0%,100% 0%,100% 100%,0 100%)', ease: 'none', scrollTrigger: {trigger: el, start: 'top 95%', end: 'top 25%', scrub: true}}));
      q('[data-count]').forEach(el => { const v = {n: 0}, end = Number(el.dataset.count); gsap.to(v, {n: end, duration: 2, ease: 'power2.out', scrollTrigger: {trigger: el, start: 'top 90%', once: true}, onUpdate: () => { el.textContent = Math.round(v.n); }}); });
      q('.v-stack-card').forEach((card, i, all) => { if (i < all.length - 1) gsap.to(card.querySelector('.v-img'), {scale: .9, opacity: .45, ease: 'none', scrollTrigger: {trigger: all[i + 1], start: 'top bottom', end: 'top 18%', scrub: true}}); });
    }, root);
    ScrollTrigger.sort(); ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [path]);
}

export default function App() {
  const [path, setPath] = useState(clean(location.pathname));
  const [menu, setMenu] = useState(false), [film, setFilm] = useState(false), [enquiry, setEnquiry] = useState(null);
  const [intro, setIntro] = useState(() => { try { return clean(location.pathname) === '/' && !sessionStorage.getItem('afrah-v3-intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } });
  const [saved, setSaved] = useState(() => { try { const v = JSON.parse(localStorage.getItem('afrah-saved') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } });
  const root = useRef(), lenis = useRef(), bar = useRef();
  const chapter = chapterByPath[path];
  const overlay = menu || film || enquiry !== null || intro;

  const navigate = useCallback(to => {
    setMenu(false);
    if (to === location.pathname) { lenis.current ? lenis.current.scrollTo(0) : scrollTo(0, 0); return; }
    const go = () => { history.pushState({}, '', to); setPath(clean(to)); };
    const curtain = document.querySelector('.v-curtain');
    if (!curtain || matchMedia('(prefers-reduced-motion: reduce)').matches) return go();
    gsap.timeline().set(curtain, {display: 'grid'}).fromTo(curtain, {clipPath: 'inset(100% 0 0 0)'}, {clipPath: 'inset(0% 0 0 0)', duration: .6, ease: 'power3.in'})
      .add(go).to(curtain, {clipPath: 'inset(0 0 100% 0)', duration: .8, ease: 'power3.out', delay: .12}).set(curtain, {display: 'none'});
  }, []);

  useEffect(() => { const pop = () => { setMenu(false); setPath(clean(location.pathname)); }; addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);

  useLayoutEffect(() => {
    scrollTo(0, 0);
    document.title = chapter ? `AFRAH — ${chapter.hour} ${chapter.title}` : 'AFRAH — One day, a whole life';
    setTone(tones[chapter?.tone || 'home']);
    let tick;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const l = new Lenis({lerp: .09, smoothWheel: true, anchors: true}); lenis.current = l;
      l.on('scroll', ScrollTrigger.update); tick = time => l.raf(time * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    }
    const st = ScrollTrigger.create({start: 0, end: 'max', onUpdate: s => { if (bar.current) bar.current.style.transform = `scaleX(${s.progress})`; }});
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
  const finishIntro = useCallback(() => { setIntro(false); try { sessionStorage.setItem('afrah-v3-intro', '1'); } catch {} }, []);
  const Page = pages[path] || NotFound;

  return <Site.Provider value={{navigate, path, saved, toggleSave, setEnquiry, setFilm, introDone: !intro}}>
    <div className="v-app" ref={root}>
      <a href="#main" className="v-skip">Skip to content</a>
      <header className="v-header">
        <Link to="/" className="v-brand" aria-label="AFRAH home">AFRAH<sup>®</sup></Link>
        <Link to={chapter ? chapter.path : '/vision'} className="v-now">
          <SunDial hour={chapter?.hour || '05:00'}/>
          <span><b>{chapter?.hour || '00:00'}</b> {chapter ? `${chapter.time} — ${chapter.title}` : 'Prologue — One day at AFRAH'}</span>
        </Link>
        <nav aria-label="Primary">
          <Link to="/residences" className="v-hide-sm">Select a residence{saved.length > 0 && <em>{saved.length}</em>}</Link>
          <button className="v-pill" onClick={() => setEnquiry('')}>Book a viewing <ArrowUpRight size={15}/></button>
          <button className="v-burger" onClick={() => setMenu(true)} aria-label="Open menu"><i/><i/></button>
        </nav>
        <span className="v-progress" ref={bar}/>
      </header>

      <main id="main" key={path}><Page/></main>

      <footer className="v-footer" data-tone="midnight">
        <div className="v-footer-cta v-pad">
          <Label>The story continues with you</Label>
          <Link to="/contact" className="v-footer-big">Let’s begin <ArrowUpRight/></Link>
        </div>
        <div className="v-footer-grid v-pad">
          <div><Label>AFRAH</Label><p>One day, a whole life.<br/>A residential study where architecture, nature and people share the same story.</p></div>
          <nav aria-label="Footer"><Link to="/">00 Prologue</Link>{chapters.map(c => <Link to={c.path} key={c.path}>{c.num} {c.title}</Link>)}</nav>
          <div className="v-footer-actions">
            <button onClick={() => setFilm(true)}>Watch the film <ArrowUpRight size={14}/></button>
            <button onClick={() => setEnquiry('')}>Private viewing <ArrowUpRight size={14}/></button>
            <button onClick={() => lenis.current ? lenis.current.scrollTo(0) : scrollTo({top: 0})}>Back to dawn ↑</button>
          </div>
        </div>
        <div className="v-footer-word" aria-hidden="true">AFRAH</div>
        <div className="v-footer-legal v-pad"><Label>© {new Date().getFullYear()} AFRAH study</Label><Label>Illustrative concept · plans and figures not final</Label><Label>Form / Nature / Human</Label></div>
      </footer>

      <div className="v-curtain" aria-hidden="true"><span>AFRAH</span></div>

      {menu && <Dialog title="Menu" className="v-menu" onClose={() => setMenu(false)}>
        <div className="v-menu-grid">
          <nav aria-label="All chapters">
            <Link to="/" aria-current={path === '/' ? 'page' : undefined}><span>00:00</span>Prologue<ArrowUpRight/></Link>
            {chapters.map(c => <Link key={c.path} to={c.path} aria-current={path === c.path ? 'page' : undefined}><span>{c.hour}</span>{c.title}<ArrowUpRight/></Link>)}
          </nav>
          <aside><Label>One day at AFRAH</Label><p>Eight chapters, from the first light over the river to the city at midnight. Read them in order, or jump to the hour you like best.</p><button className="v-pill" onClick={() => { setMenu(false); setEnquiry(''); }}>Book a private viewing <ArrowUpRight size={15}/></button></aside>
        </div>
      </Dialog>}
      {film && <Dialog title="AFRAH film" className="v-film" onClose={() => setFilm(false)}><video controls autoPlay playsInline poster="/media/living.webp" src="/media/afrah-life.mp4"/></Dialog>}
      {enquiry !== null && <Enquiry residence={enquiry || null} onClose={() => setEnquiry(null)}/>}
      {intro && <Loader done={finishIntro}/>}
    </div>
  </Site.Provider>;
}
