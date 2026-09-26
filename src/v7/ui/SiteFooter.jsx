import React from 'react';
import { LilyMark } from './NavParts';

// AFRAH's footer, shared by the film and every page: a closing invitation,
// four columns (residences, explore, sales gallery, follow), and a legal bar.
// `Link` lets the pages app route internally; plain anchors otherwise.
const COLS = [
  ['Residences', [['/residences', 'All residences'], ['/select', 'Select a level'], ['/how-to-buy', 'How to buy'], ['/favourites', 'Favourites']]],
  ['Explore', [['/architecture', 'Architecture'], ['/place', 'The place'], ['/map', '3D map'], ['/gallery', 'Gallery'], ['/progress', 'Construction']]],
];

export default function SiteFooter({ Link }) {
  const A = Link || (({ to, children, ...p }) => <a href={to} {...p}>{children}</a>);
  const top = (e) => { e.preventDefault(); if (window.__lenis) window.__lenis.scrollTo(0, { duration: 2.4 }); else window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <footer className="site-foot">
      <svg className="site-foot__lattice" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 4 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
          const x = c * 120, y = r * 120;
          return <path key={`${r}-${c}`} d={`M${x} ${y} A120 120 0 0 0 ${x + 120} ${y + 120} M${x + 120} ${y} A120 120 0 0 1 ${x} ${y + 120}`} />;
        }))}
      </svg>
      <div className="site-foot__top">
        <p className="site-foot__invite">Come and see the Lily<br /><span>at dusk.</span></p>
        <div className="site-foot__cta">
          <A to="/viewing" className="btn">Book a private viewing<b>↗</b></A>
          <a className="site-foot__phone" href="tel:+10000000000">+1 000 000 0000</a>
        </div>
      </div>
      <div className="site-foot__grid">
        <div className="site-foot__brand">
          <span className="site-foot__mark"><LilyMark size={40} /></span>
          <strong>AFRAH</strong>
          <p>Residences on the river bend. The Lily and five Wave towers around a four-hectare park.</p>
        </div>
        {COLS.map(([h, links]) => (
          <nav key={h} aria-label={h}>
            <span className="site-foot__h">{h}</span>
            {links.map(([to, l]) => <A key={to} to={to}>{l}</A>)}
          </nav>
        ))}
        <div>
          <span className="site-foot__h">Sales gallery</span>
          <p>River Embankment 1<br />Daily 10:00 — 20:00<br />Private viewings by appointment</p>
          <a href="mailto:hello@afrah.example">hello@afrah.example</a>
        </div>
        <div>
          <span className="site-foot__h">Follow</span>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
        </div>
      </div>
      <div className="site-foot__bar">
        <span>© {new Date().getFullYear()} AFRAH Residences</span>
        <nav aria-label="Legal"><A to="/viewing">Privacy</A><A to="/viewing">Terms</A><A to="/viewing">Cookies</A></nav>
        <span className="site-foot__note">Illustrative concept. Plans, figures and imagery are not final.</span>
        <a className="site-foot__up" href="#top" onClick={top}>Back to top <b>↑</b></a>
      </div>
    </footer>
  );
}
