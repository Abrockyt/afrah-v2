import {residences} from '../v5/data';
const ASPECTS = ['North', 'East', 'South', 'West'];
export const UNITS = (() => {
  const out = [];
  for (let f = 2; f <= 26; f += 1) for (const [j, u] of ['A', 'B', 'C', 'D'].entries()) {
    if ((f * 7 + j * 3) % 5 === 0) continue;
    const known = residences.find(r => r.id === `${String(f).padStart(2, '0')}.${u}`);
    const beds = known?.beds ?? 1 + ((f + j * 2) % 4), area = known?.area ?? 52 + beds * 24 + ((f * 13 + j * 7) % 19);
    out.push({id: `${String(f).padStart(2, '0')}.${u}`, floor: f, beds, area, aspect: known?.aspect ?? ASPECTS[(j + f) % 4], seed: f * 4 + j});
  }
  return out;
})();
