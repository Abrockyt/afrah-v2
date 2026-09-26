import React, { useEffect, useState } from 'react';
import { NAV } from '../content/copy';
import { Brand, MenuButton, Drawer } from './NavParts';

// AFRAH's top navigation on every page, the same as the film's: the Lily
// mark and wordmark, where-you-are in the centre, Residences, a viewing
// button and the drawer menu.
export default function PageNav({ path = '/', go, theme = 'dark' }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const close = (e) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const i = NAV.pages.findIndex(([href]) => href === path);
  const label = i >= 0 ? NAV.pages[i][1] : 'Afrah';
  const nav = (href) => (e) => { if (!go || e.metaKey || e.ctrlKey) return; e.preventDefault(); setMenu(false); go(href); };
  const PageLink = ({ href, children, onClick, ...p }) => <a href={href} {...p} onClick={(e) => { onClick?.(e); nav(href)(e); }}>{children}</a>;
  return (
    <header className={`nav nav--${theme} is-ready ${menu ? 'is-menu' : ''}`}>
      <Brand href="/" />
      <div className="nav__chapter">
        <span className="nav__idx">{i >= 0 ? String(i + 1).padStart(2, '0') : '—'}</span>
        <span className="nav__label">{label}</span>
        <span className="nav__prog"><i style={{ transform: 'scaleX(1)' }} /></span>
      </div>
      <div className="nav__right">
        <a className="nav__link" href="/residences" onClick={nav('/residences')}>Residences</a>
        <a className="nav__book" href="/viewing" onClick={nav('/viewing')}>Book a viewing</a>
        <MenuButton open={menu} onClick={() => setMenu((m) => !m)} />
      </div>
      <Drawer open={menu} onClose={() => setMenu(false)} chapterHref={(id) => `/#${id}`} pageLink={PageLink} active={path} />
    </header>
  );
}
