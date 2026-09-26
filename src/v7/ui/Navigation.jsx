import React, { useEffect, useState } from 'react';
import { store, subscribe } from '../core/store';
import { gsap } from '../core/ScrollManager';
import { scrollTo } from '../core/ScrollManager';
import { NAV } from '../content/copy';
import { Brand, MenuButton, Drawer, themeBehindNav } from './NavParts';

// Chapter boundaries are derived from the section registry, so the label and
// the progress line follow the real layout rather than hard-coded offsets.
const CHAPTERS = [
  { id: 'home', label: 'Afrah', sections: ['hero'] },
  { id: 'arrival', label: 'Arrival', sections: ['arrival'] },
  { id: 'tower', label: 'The building', sections: ['building'] },
  { id: 'map-teaser', label: 'Place', sections: ['place'] },
  { id: 'cases', label: 'Residences', sections: ['cases'] },
  { id: 'architecture', label: 'Architecture', sections: ['leaf'] },
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
  for (const [id, label] of [['interiors', 'Interiors'], ['ceilings', 'Interiors'], ['apartments', 'Apartments'], ['garden', 'Garden'], ['map-teaser', 'Place'], ['joy', 'Living'], ['art-deco', 'Art Deco'], ['new-era', 'A new era'], ['cases', 'Living']]) {
    const el = document.getElementById(id);
    if (el) { const r = el.getBoundingClientRect(); if (r.top <= 100 && r.bottom > 100) return { label, p: 0, id }; }
  }
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
    let raf, frame = 0, seen = null;
    const tick = () => {
      const c = chapterState();
      // the bar reads the colour under it; over the 3D film it follows the stage
      if (frame++ % 6 === 0) seen = themeBehindNav();
      const theme = seen || store.themeHint || store.theme;
      setState((prev) => {
        const next = { label: c.label, p: c.p, id: c.id, theme, ready: store.ready, sound: store.soundOn, atTop: store.scroll < 40 };
        return (prev.label === next.label && Math.abs(prev.p - next.p) < 0.004 && prev.theme === next.theme && prev.ready === next.ready && prev.sound === next.sound && prev.atTop === next.atTop) ? prev : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const go = (id) => (e) => { e.preventDefault(); const el = document.getElementById(id); if (el) scrollTo(el, { offset: 2 }); };
  const skip = (e) => { e.preventDefault(); const el = document.getElementById('tower'); if (el) scrollTo(el, { duration: 2 }); };
  const idx = Math.max(0, NAV.chapters.findIndex((c) => c.id === state.id));
  return (
    <header className={`nav nav--${state.theme} ${state.ready ? 'is-ready' : ''} ${menu ? 'is-menu' : ''}`}>
      <Brand href="#home" onClick={go('home')} />
      <div className="nav__chapter" aria-live="polite">
        <span className="nav__idx">{String(idx + 1).padStart(2, '0')}</span>
        <span className="nav__label">{state.label}</span>
        <span className="nav__prog"><i style={{ transform: `scaleX(${Math.max(0.04, state.p)})` }} /></span>
      </div>
      <div className="nav__right">
        <a className="nav__link" href="/residences">Residences</a>
        <a className="nav__book" href="#contact" onClick={go('contact')}>Book a viewing</a>
        <MenuButton open={menu} onClick={() => setMenu((m) => !m)} />
      </div>
      <div className={`nav__hint t-small ${state.atTop ? '' : 'is-hidden'}`}>[ Scroll to explore ]</div>
      <button className={`nav__skip t-small ${state.id === 'arrival' && !state.atTop ? '' : 'is-hidden'}`} onClick={skip}><i /><span>{NAV.skip}</span></button>
      <button className="nav__sound t-small" onClick={onSound}>{state.sound ? NAV.sound.on : NAV.sound.off} <b>{state.sound ? '◉' : '◎'}</b></button>
      <Drawer open={menu} onClose={() => setMenu(false)} onChapter={(id, e) => go(id)(e)} />
    </header>
  );
}
