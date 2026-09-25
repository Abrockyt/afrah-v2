import React, { useMemo } from 'react';

// Original procedural "architecture photograph" plate: a sky gradient, a
// silhouetted massing with a window grid, and a grain/vignette pass — reads
// as a stylised building photo rather than a decorative gradient swatch.
// Every value is derived from the item's seed, no two plates repeat.
export function Photo({ seed, image, className = '' }) {
  if (image) return <img className={`photo ${className}`} src={image} alt="" decoding="async" draggable="false" />;
  return <PlotPhoto seed={seed} className={className} />;
}
function PlotPhoto({ seed, className = '' }) {
  const id = useMemo(() => `ph${Math.floor(seed * 1e6)}`, [seed]);
  const skyHue = Math.floor(190 + seed * 60 - 30);
  const warm = seed > 0.55;
  const sky1 = warm ? `hsl(${30 + seed * 30} 55% ${78 - seed * 10}%)` : `hsl(${skyHue} 45% ${72 - seed * 8}%)`;
  const sky2 = warm ? `hsl(${20 + seed * 20} 40% 92%)` : `hsl(${skyHue + 10} 30% 94%)`;
  const bodyTone = 88 - seed * 55;
  const body = `hsl(${20 + seed * 30} ${8 + seed * 6}% ${bodyTone}%)`;
  const bodyShade = `hsl(${20 + seed * 30} ${8 + seed * 6}% ${Math.max(8, bodyTone - 22)}%)`;

  const massing = useMemo(() => {
    const n = 3 + Math.floor(seed * 3);
    return Array.from({ length: n }, (_, i) => {
      const s = (seed * 71 + i * 37) % 1;
      const w = 22 + s * 30, h = 30 + ((seed * 53 + i * 17) % 1) * 45;
      const x = (i / n) * 100 + s * (100 / n) * 0.4;
      return { x, w, h, skew: -6 + s * 12, shade: i % 2 === 0 };
    });
  }, [seed]);

  const windows = useMemo(() => {
    const cols = 4 + Math.floor(seed * 6), rows = 3 + Math.floor(((seed * 37) % 1) * 5);
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lit = ((seed * 999 + r * 13 + c * 7) % 1) > 0.62;
      cells.push({ c, r, lit });
    }
    return { cols, rows, cells };
  }, [seed]);

  return (
    <svg className={`photo ${className}`} viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky1} />
          <stop offset="100%" stopColor={sky2} />
        </linearGradient>
        <linearGradient id={`${id}grnd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bodyShade} stopOpacity="0" />
          <stop offset="100%" stopColor={bodyShade} stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id={`${id}vig`} cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
        </radialGradient>
        <filter id={`${id}grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(seed * 100)} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.1 0.1 0.1 0 0" />
        </filter>
      </defs>
      <rect width="100" height="70" fill={`url(#${id}sky)`} />
      <g opacity="0.92">
        {massing.map((m, i) => (
          <polygon key={i} points={`${m.x},70 ${m.x},${70 - m.h} ${m.x + m.w},${70 - m.h - m.skew} ${m.x + m.w},70`} fill={m.shade ? bodyShade : body} />
        ))}
      </g>
      <g opacity="0.5">
        {windows.cells.map((w, i) => {
          const mm = massing[i % massing.length];
          const cw = mm.w / windows.cols, ch = (mm.h / windows.rows) * 0.6;
          const x = mm.x + w.c * cw * 0.9 + cw * 0.3;
          const y = 70 - mm.h + w.r * ch * 1.3 + ch * 0.5;
          if (x > mm.x + mm.w - cw * 0.3) return null;
          return <rect key={i} x={x} y={y} width={cw * 0.5} height={ch * 0.6} fill={w.lit ? '#fff7e0' : bodyShade} opacity={w.lit ? 0.85 : 0.4} />;
        })}
      </g>
      <rect width="100" height="70" fill={`url(#${id}grnd)`} />
      <rect width="100" height="70" fill={`url(#${id}vig)`} />
      <rect width="100" height="70" filter={`url(#${id}grain)`} opacity="0.5" />
    </svg>
  );
}
