import React from 'react';
import { gsap } from '../core/ScrollManager';

// Masked line reveal. Each line is an overflow-hidden box whose inner span
// translates up from 110%. Words wrapped in *asterisks* get the accent class.
export function Lines({ lines, className = '', as: Tag = 'h2', accentClass = 't-accent', inner = '' }) {
  return (
    <Tag className={`reveal ${className}`}>
      {lines.map((line, i) => (
        <span className="line" key={i}>
          <span className={`line__in ${inner}`}>
            {line.split(/\s+/).map((w, j) => {
              const m = /^\*(.+?)\*(.*)$/.exec(w);
              const acc = !!m;
              const txt = acc ? m[1] + m[2] : w;
              return (
                <React.Fragment key={j}>
                  <span className={`word ${acc ? accentClass : ''}`} data-accent={acc ? '1' : undefined}>{txt}</span>
                  {j < line.split(/\s+/).length - 1 ? ' ' : ''}
                </React.Fragment>
              );
            })}
          </span>
        </span>
      ))}
    </Tag>
  );
}

// Timeline helpers (positions are fractions of the stage runway).
export function showLines(tl, el, at, { dur = 0.06, stagger = 0.02, from = 110 } = {}) {
  const ins = el.querySelectorAll('.line__in');
  tl.fromTo(ins, { yPercent: from, y: 0 }, { yPercent: 0, y: 0, duration: dur, stagger, ease: 'power2.out' }, at);
}
export function hideLines(tl, el, at, { dur = 0.06, stagger = 0.015, to = -110, reverse = false } = {}) {
  const ins = el.querySelectorAll('.line__in');
  tl.to(ins, { yPercent: to, y: 0, duration: dur, stagger: { each: stagger, from: reverse ? 'end' : 'start' }, ease: 'power2.in' }, at);
}
export function fade(tl, el, at, to, dur = 0.05) { tl.to(el, { autoAlpha: to, duration: dur }, at); }

// Drawn line-art motif: animates stroke-dashoffset on every path inside.
export function drawSvg(tl, svg, at, { dur = 0.2, stagger = 0.01, reverse = false } = {}) {
  const paths = svg.querySelectorAll('path, line, polyline, circle, rect');
  paths.forEach((p) => {
    const L = p.getTotalLength ? p.getTotalLength() : 1000;
    p.style.strokeDasharray = `${L}`;
    p.style.strokeDashoffset = reverse ? 0 : `${L}`;
  });
  tl.to(paths, { strokeDashoffset: reverse ? (i, el) => el.getTotalLength() : 0, duration: dur, stagger, ease: 'none' }, at);
}