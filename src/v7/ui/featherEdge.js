// A feathered top edge as an SVG mask, so DOM sheets wipe in with the same
// organic fringe as the WebGL FeatherWipe: overlapping feather tips of varied
// height and lean, each with slim curved barbs.
export function featherEdgeMask(seed = 1.7, count = 15) {
  const W = 1000, H = 1400, BAND = 260;
  const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233 + seed * 3.71) * 43758.5453; return x - Math.floor(x); };
  let paths = `<rect x="0" y="${BAND}" width="${W}" height="${H - BAND}" fill="#fff"/>`;
  const slot = W / count;
  for (let i = -1; i <= count; i++) {
    const cx = (i + 0.5) * slot + (rnd(i, 1) - 0.5) * slot * 0.9;
    const w = slot * (0.7 + rnd(i, 2) * 0.9);
    const tip = BAND * (0.05 + rnd(i, 3) * 0.75);
    const lean = (rnd(i, 4) - 0.5) * w * 0.9;
    const base = BAND + 2;
    paths += `<path fill="#fff" d="M${cx - w / 2} ${base} Q${cx - w * 0.28 + lean * 0.4} ${tip + (base - tip) * 0.45} ${cx + lean} ${tip} Q${cx + w * 0.28 + lean * 0.4} ${tip + (base - tip) * 0.45} ${cx + w / 2} ${base} Z"/>`;
    const barbs = 16 + Math.floor(rnd(i, 5) * 10);
    for (let b = 0; b < barbs; b++) {
      const u = (b + 0.5) / barbs, side = b % 2 ? 1 : -1;
      const by = tip + (base - tip) * (0.08 + u * 0.85);
      const bx = cx + lean * (1 - u) * 0.9 + side * w * 0.2 * u * (0.6 + rnd(i * 17 + b, 7) * 0.6);
      const len = 14 + rnd(i * 31 + b, 6) * 38 * (1 - u * 0.5);
      const ex = bx + side * len * 0.7, ey = by - len;
      paths += `<path fill="#fff" d="M${bx - 1.4} ${by + 4} Q${bx + side * len * 0.1} ${by - len * 0.6} ${ex} ${ey} Q${bx + side * len * 0.3} ${by - len * 0.4} ${bx + 1.4} ${by + 3} Z"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${paths}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}
