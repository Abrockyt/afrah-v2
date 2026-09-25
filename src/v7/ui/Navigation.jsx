import React, { useEffect, useState } from 'react';
import { store, subscribe } from '../core/store';
import { gsap } from '../core/ScrollManager';
import { scrollTo } from '../core/ScrollManager';
import { BRAND, NAV } from '../content/copy';

// Chapter boundaries are derived from the section registry, so the label and
// the progress line follow the real layout rather than hard-coded offsets.
const CHAPTERS = [
  { id: 'home', label: 'Afrah', sections: ['hero'] },
  { id: 'arrival', label: 'Arrival', sections: ['arrival'] },
  { id: 'introduction', label: 'The opening', sections: ['opening'] },
  { id: 'tower', label: 'The tower', sections: ['building'] },
  { id: 'cases', label: 'Residences', sections: ['cases'] },
  { id: 'tunnel', label: 'The passage', sections: ['tunnel'] },
  { id: 'history', label: 'History', sections: ['history'] },
  { id: 'statue', label: 'Heritage', sections: ['statue'] },
  { id: 'contact', label: 'Viewing', sections: [] },
];

function chapterState() {
  const s = store.sections;
  for (const ch of CHAPTERS) {
    const active = ch.sections.filter((id) => s[id] && s[id].active);
    if (active.length) {
      const idx = ch.sections.indexOf(active[0]);
      const p = (idx + s[active[0]].p) / ch.sections.length;
      return { label: ch.label, p, id: ch.id };
    }
  }
  const contact = document.getElementById('contact');
  if (contact && contact.getBoundingClientRect().top < window.innerHeight * 0.7) return { label: 'Viewing', p: 1, id: 'contact' };
  const living = document.getElementById('cases');
  if (living && living.getBoundingClientRect().top <= 100 && living.getBoundingClientRect().bottom > 100) return { label: 'Living', p: 0, id: 'cases' };
  const place = document.getElementById('place-chapter');
  if (place && place.getBoundingClientRect().top <= 100 && place.getBoundingClientRect().bottom > 100) return { label: 'Place', p: 0, id: 'place-chapter' };
  return { label: 'Afrah', p: 0, id: 'home' };
}

export default function Navigation({ onSound }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const [state, setState] = useState({ label: 'Arrival', p: 0, theme: 'dark', ready: false, sound: false, atTop: true, id: 'arrival' });
  useEffect(() => {
    let raf;
    const tick = () => {
      const c = chapterState();
      setState((prev) => {
        const next = { label: c.label, p: c.p, id: c.id, theme: store.theme, ready: store.ready, sound: store.soundOn, atTop: store.scroll < 40 };
        return (prev.label === next.label && Math.abs(prev.p - next.p) < 0.004 && prev.theme === next.theme && prev.ready === next.ready && prev.sound === next.sound && prev.atTop === next.atTop) ? prev : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const go = (id) => (e) => { e.preventDefault(); const el = document.getElementById(id); if (el) scrollTo(el, { offset: 2 }); };
  const skip = (e) => { e.preventDefault(); const el = document.getElementById('introduction'); if (el) scrollTo(el, { duration: 2 }); };
  return (
    <header className={`nav nav--${state.theme} ${state.ready ? 'is-ready' : ''}`}>
      <a className="nav__logo" href="#home" onClick={go('home')}><span>{BRAND.top}</span><span>.{BRAND.bottom}</span></a>
      <div className="nav__center">
        <span className="nav__label t-small">{state.label}</span>
        <span className="nav__line"><i style={{ transform: `scaleX(${state.p})` }} /></span>
        <button className="nav__grid" aria-label="Pages" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><i /><i /><i /><i /></button>
      </div>
      <a className="nav__why t-small" href="/residences">Residences <b>↗</b></a>
      <div className={`nav__hint t-small ${state.atTop ? '' : 'is-hidden'}`}>[ Scroll to explore ]</div>
      <button className={`nav__skip t-small ${state.id === 'arrival' && !state.atTop ? '' : 'is-hidden'}`} onClick={skip}><i /><span>{NAV.skip}</span></button>
      <button className="nav__sound t-small" onClick={onSound}>{state.sound ? NAV.sound.on : NAV.sound.off} <b>{state.sound ? '◉' : '◎'}</b></button>
      <nav className={`nav__menu ${menu ? 'is-open' : ''}`} aria-hidden={!menu}>
        {NAV.chapters.map((c, i) => <a key={c.id} href={`#${c.id}`} onClick={(e) => { setMenu(false); go(c.id)(e); }}><em>{String(i + 1).padStart(2, '0')}</em>{c.label}</a>)}
        <i />
        {NAV.pages.map(([href, label]) => <a key={href} href={href} className="nav__page">{label} <b>↗</b></a>)}
      </nav>
    </header>
  );
}
