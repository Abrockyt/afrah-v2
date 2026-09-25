import React from 'react';

// Original line-art motifs used on the case cards and the paradox stage.
// "Nested" = a chain of rotated, shrinking squares; "Rings" = concentric arcs
// off-centre. Both are plain SVG paths so they can be stroke-drawn.
// Both motifs below wrap each ring/polygon in its own <g class="motif__ring">
// with an explicit transform-origin at its own centre, so a caller (Cases.jsx)
// can drive each layer's rotation/scale independently as the card scales —
// the whole artwork is one continuous object, not a flat printed image: outer
// rings drift slowest, inner ones fastest, alternating direction by index.
export function NestedMotif({ className = "", stroke = "currentColor", n = 6, style }) {
  // "Fold": a pentagon whose successive copies shrink, rotate and slide along
  // one edge, so the shapes read as a sheet folding in on itself.
  const rings = [];
  let s = 74, cx = 50, cy = 38, rot = -18;
  for (let i = 0; i < n; i++) {
    const pts = [];
    for (let k = 0; k < 5; k++) {
      const a = ((rot + k * 72) * Math.PI) / 180;
      pts.push([cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55]);
    }
    rings.push({ d: `M${pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join('L')}Z`, cx, cy });
    s *= 0.8; rot += 23; cx += 2.6 * Math.cos((rot * Math.PI) / 180); cy += 1.6;
  }
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" stroke={stroke} strokeWidth="1.6" preserveAspectRatio="xMidYMid meet">
      {rings.map((r, i) => <g className="motif__ring" key={i} data-ring={i} style={{ transformOrigin: `${r.cx}px ${r.cy}px` }}><path d={r.d} /></g>)}
    </svg>
  );
}

export function RingsMotif({ className = '', stroke = 'currentColor', n = 6, style }) {
  // "Open arcs": concentric arcs sharing a centre near the top, each one left
  // open at the bottom so the set reads as nested horseshoes.
  const rings = [];
  for (let i = 0; i < n; i++) {
    const r = 9 + i * 7.6;
    const cy = 30 + i * 1.9;
    const gap = 0.5 + i * 0.16;                      // opening widens outward
    const a0 = Math.PI / 2 + gap, a1 = Math.PI / 2 - gap + Math.PI * 2;
    const x0 = 50 + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
    const x1 = 50 + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    rings.push({ d: `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 1,1 ${x1.toFixed(2)},${y1.toFixed(2)}`, cx: 50, cy });
  }
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" stroke={stroke} strokeWidth="1.6" preserveAspectRatio="xMidYMid meet">
      {rings.map((r, i) => <g className="motif__ring" key={i} data-ring={i} style={{ transformOrigin: `${r.cx}px ${r.cy}px` }}><path d={r.d} /></g>)}
    </svg>
  );
}

// Angular "cut-away" motif for the paradox stage
export function CutMotif({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M10,110 L10,30 L70,30 L70,80 L120,80 L120,10 L190,10" />
      <path d="M30,110 L30,50 L90,50 L90,100 L140,100 L140,30 L190,30" />
      <path d="M10,110 L190,110" />
    </svg>
  );
}