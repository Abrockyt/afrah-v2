import React from 'react';
import { NAV } from '../content/copy';

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

// The drawer: film chapters on the left column, pages on the right, and the
// sales gallery at the foot.
export function Drawer({ open, onClose, chapterHref = (id) => `#${id}`, onChapter, pageLink, active }) {
  const Page = pageLink || (({ href, children, ...p }) => <a href={href} {...p}>{children}</a>);
  return (
    <div className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button className="drawer__scrim" tabIndex={-1} aria-label="Close menu" onClick={onClose} />
      <aside className="drawer__panel">
        <div className="drawer__cols">
          <nav className="drawer__chapters" aria-label="The film">
            <span className="drawer__h">The film</span>
            {NAV.chapters.map((c, i) => (
              <a key={c.id} href={chapterHref(c.id)} onClick={(e) => { onChapter?.(c.id, e); onClose(); }}>
                <em>{String(i + 1).padStart(2, '0')}</em><span>{c.label}</span>
              </a>
            ))}
          </nav>
          <nav className="drawer__pages" aria-label="Pages">
            <span className="drawer__h">Explore</span>
            {NAV.pages.map(([href, l]) => <Page key={href} href={href} className={href === active ? 'is-on' : ''} onClick={onClose}>{l}<b>↗</b></Page>)}
          </nav>
        </div>
        <div className="drawer__foot">
          <div><span className="drawer__h">Sales gallery</span><p>River Embankment 1<br />Daily 10:00 — 20:00</p></div>
          <div><span className="drawer__h">Call</span><p><a href="tel:+10000000000">+1 000 000 0000</a></p></div>
          <Page href="/viewing" className="btn" onClick={onClose}>Book a viewing<b>↗</b></Page>
        </div>
      </aside>
    </div>
  );
}
