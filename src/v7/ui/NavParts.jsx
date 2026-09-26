import React, { useState } from 'react';

import { NAV } from '../content/copy';

// What colour is behind the navigation? Looks straight down the stack of
// elements under the bar and takes the first one with a real background
// (images count as dark). Returns 'light' (dark text) or 'dark' (light
// text), or null when only the WebGL canvas is there.
export function themeBehindNav() {
  // the page's sections ignore the pointer, so look them up by position
  const y = 34;
  const lum = (str) => { const c = str && str.match(/rgba?\(([^)]+)\)/g); if (!c) return null;
    const v = c[c.length - 1].match(/[\d.]+/g).map(Number); if (v.length > 3 && v[3] < 0.5) return null;
    return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255; };
  const blocks = document.querySelectorAll('#page > section, #page > footer, main > section, main > footer, .a-app main, .a-app footer, .e-page');
  for (const el of blocks) {
    const r = el.getBoundingClientRect();
    if (r.top > y || r.bottom <= y) continue;
    const cs = getComputedStyle(el);
    let l = lum(cs.backgroundColor);
    if (l === null && cs.backgroundImage !== 'none') l = lum(cs.backgroundImage);
    if (l === null) return null;              // a transparent stage over the WebGL canvas
    return l > 0.55 ? 'light' : 'dark';
  }
  return null;
}


// Shared pieces of AFRAH's top navigation (film and pages): the Lily mark,
// the wordmark and the side drawer menu.

export function LilyMark({ size = 22 }) {
  // the Lily in outline: a tapering shaft under a bud of petals
  return (
    <svg className="lily-mark" width={size * 0.62} height={size} viewBox="0 0 26 42" fill="none" aria-hidden="true">
      <path d="M8 41 L9 17 C7 12 9.5 6 13 2 C16.5 6 19 12 17 17 L18 41" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M13 2 C11.2 7 11 12.5 11.6 17 M13 2 C14.8 7 15 12.5 14.4 17" stroke="currentColor" strokeWidth="1" opacity=".7" />
      <path d="M9 22 H17 M8.8 27 H17.2 M8.6 32 H17.4 M8.4 37 H17.6" stroke="currentColor" strokeWidth=".8" opacity=".5" />
    </svg>
  );
}

export function Brand({ href = '/', onClick }) {
  return (
    <a className="nav__brand" href={href} onClick={onClick} aria-label="AFRAH residences — home">
      <LilyMark />
      <span className="nav__word">AFRAH</span>
      <span className="nav__sub">residences</span>
    </a>
  );
}

export function MenuButton({ open, onClick }) {
  return (
    <button className={`nav__burger ${open ? 'is-open' : ''}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={onClick}>
      <span className="nav__burger-t">{open ? 'Close' : 'Menu'}</span>
      <span className="nav__burger-i"><i /><i /></span>
    </button>
  );
}

// The menu, full screen (after the Awwwards fullscreen-menu pattern): three
// green panels drop in turn, the film's chapters are set large in a serif
// and each one previews its picture in an arched frame on hover; the pages
// sit below as pills beside the sales gallery and a viewing button.
const PREVIEW = {
  home: ['/media/renders/quarter-river.webp', 'The quarter on the river bend'],
  arrival: ['/media/renders/waves.webp', 'Down from the sky'],
  tower: ['/media/renders/lily-crown.webp', 'The Lily, sixty-four levels'],
  cases: ['/v3/era/int-1.webp', 'The art of living'],
  architecture: ['/media/renders/lily-crown.webp', 'A crown of bronze leaves'],
  'map-teaser': ['/media/renders/quarter.webp', 'At the centre of everything'],
  garden: ['/v3/era/labirint.webp', 'Four hectares of park'],
  interiors: ['/v3/era/int-2.webp', 'Rooms like a private house'],
  history: ['/v3/silver/lobby-bottom.webp', 'A place imagined long before'],
  statue: ['/v3/era/int-deco.webp', 'The heritage room'],
  contact: ['/media/renders/quarter-dusk.webp', 'Come and see it at dusk'],
};
export function Drawer({ open, onClose, chapterHref = (id) => `#${id}`, onChapter, pageLink, active }) {
  const Page = pageLink || (({ href, children, ...p }) => <a href={href} {...p}>{children}</a>);
  const [hover, setHover] = useState('home');
  const [img, cap] = PREVIEW[hover] || PREVIEW.home;
  return (
    <div className={`menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="menu__panels" aria-hidden="true"><i /><i /><i /></div>
      <div className="menu__inner">
        <nav className="menu__chapters" aria-label="The film" onMouseLeave={() => setHover('home')}>
          {NAV.chapters.map((c, i) => (
            <a key={c.id} href={chapterHref(c.id)} style={{ '--i': i }} className={hover === c.id ? 'is-hover' : ''}
              onMouseEnter={() => setHover(c.id)} onFocus={() => setHover(c.id)}
              onClick={(e) => { onChapter?.(c.id, e); onClose(); }}>
              <em>{String(i + 1).padStart(2, '0')}</em><span>{c.label}</span>
            </a>
          ))}
        </nav>
        <aside className="menu__preview">
          <figure>
            {Object.entries(PREVIEW).map(([k, [src]]) => <img key={k} src={src} alt="" className={src === img ? 'is-on' : ''} loading="lazy" />)}
          </figure>
          <p><span>{(NAV.chapters.find((c) => c.id === hover) || NAV.chapters[0]).label}</span>{cap}</p>
        </aside>
        <div className="menu__foot">
          <nav className="menu__pages" aria-label="Pages">
            {NAV.pages.map(([href, l]) => <Page key={href} href={href} className={href === active ? 'is-on' : ''} onClick={onClose}>{l}</Page>)}
          </nav>
          <div className="menu__contact">
            <span>Sales gallery</span>
            <p>River Embankment 1 · Daily 10:00 — 20:00</p>
            <a href="tel:+10000000000">+1 000 000 0000</a>
          </div>
          <Page href="/viewing" className="btn" onClick={onClose}>Book a viewing<b>↗</b></Page>
        </div>
      </div>
    </div>
  );
}
