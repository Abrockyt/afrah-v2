import React, { useEffect, useState } from 'react';
import { BRAND, NAV } from '../content/copy';

// The film's top navigation, reused on every page so the site reads as one
// piece: logo left, where-you-are in the centre with the grid menu, residences
// right. The menu carries the film's chapters and every page.
export default function PageNav({ path = '/', go, theme = 'dark' }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const close = (e) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const label = (NAV.pages.find(([href]) => href === path) || [null, 'Afrah'])[1];
  const nav = (href) => (e) => { if (!go || e.metaKey || e.ctrlKey) return; e.preventDefault(); setMenu(false); go(href); };
  return (
    <header className={`nav nav--${theme} is-ready`}>
      <a className="nav__logo" href="/"><span>{BRAND.top}</span><span>.{BRAND.bottom}</span></a>
      <div className="nav__center">
        <span className="nav__label t-small">{label}</span>
        <button className="nav__grid" aria-label="Pages" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><i /><i /><i /><i /></button>
      </div>
      <a className="nav__why t-small" href="/residences" onClick={nav('/residences')}>Residences <b>↗</b></a>
      <nav className={`nav__menu ${menu ? 'is-open' : ''}`} aria-hidden={!menu}>
        {NAV.chapters.map((c, i) => <a key={c.id} href={`/#${c.id}`}><em>{String(i + 1).padStart(2, '0')}</em>{c.label}</a>)}
        <i />
        {NAV.pages.map(([href, l]) => <a key={href} href={href} onClick={nav(href)} className={`nav__page ${href === path ? 'is-on' : ''}`}>{l} <b>↗</b></a>)}
      </nav>
    </header>
  );
}
