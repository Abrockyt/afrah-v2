import {residences} from '../../v5/data';

// AFRAH records for the Composites-style components. Imagery under /v3 is a
// scraped study copy (see reuse-assets/manifest.json) and must be replaced by
// AFRAH photography or renders before launch; /media and /story are project renders.
const seedOf = (id) => (String(id).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 997) / 997;

// Illustrative backstory of the site — placeholder copy until the developer's archive is supplied.
const HISTORIES = [
  [1897, 'The embankment wall', '/story/water.webp'],
  [1909, 'First bridge over the bend', '/v3/likova/loc-slide-2.webp'],
  [1924, 'The riverside market', '/v3/silver/loc-1.webp'],
  [1934, 'The bronze foundry opens', '/v3/era/art-deco.webp'],
  [1951, 'Riverside gardens planted', '/story/forest.webp'],
  [1968, 'The lantern bridge', '/v3/likova/loc-slide-3.webp'],
  [1976, 'The concert hall', '/v3/era/joy-c4.webp'],
  [1989, 'Foundry falls silent', '/v3/likova/engineering.webp'],
  [2004, 'The river path reopens', '/story/cycle.webp'],
  [2014, 'A new masterplan', '/v3/likova/plan.webp'],
  [2019, 'Design competition', '/story/idea-detail.webp'],
  [2021, 'The AFRAH design is chosen', '/story/idea-space.webp'],
  [2023, 'First stone', '/v3/likova/cube.webp'],
  [2024, 'The courtyard slab', '/v3/silver/court-2.webp'],
  [2025, 'The tower tops out', '/v3/era/arch-2.webp'],
  [2026, 'Bronze crown complete', '/media/renders/lily-crown.webp'],
  [2026, 'Gardens on the terraces', '/v3/silver/terraces.webp'],
  [2027, 'The lights come on', '/media/renders/quarter-dusk.webp'],
  [2027, 'First residents move in', '/media/living.webp'],
].map(([year, title, image], i) => ({id: `h${i}`, year, title, image}));

const RES_IMAGES = ['/media/living.webp', '/media/bedroom.webp', '/media/kitchen.webp', '/media/dining.webp', '/media/lounge.webp', '/v3/silver/court-5.webp', '/v3/silver/terraces.webp', '/v3/era/int-2.webp', '/v3/era/int-4.webp'];
const kindOfFloor = (f) => (f <= 8 ? 'Garden' : f <= 18 ? 'Terrace' : 'Sky');
const RESIDENCES = residences.map((r, i) => ({
  id: `r-${r.id}`, title: `Residence ${r.id}`, year: `Level ${String(r.floor).padStart(2, '0')}`, location: `${r.beds} bed · ${r.area} m² · ${r.aspect}`,
  category: 'residences', kind: kindOfFloor(r.floor), image: r.image || RES_IMAGES[i % RES_IMAGES.length],
}));
const AMENITIES = [
  ['Wellness', 'Pool under the podium', '/media/interior.webp'], ['Wellness', 'Spa and hammam', '/v3/era/int-3.webp'], ['Wellness', 'Movement studio', '/v3/likova/lobby-slide-2.webp'],
  ['Gardens', 'Courtyard garden', '/v3/silver/court-5.webp'], ['Gardens', 'Terrace orchard', '/media/garden.webp'], ['Gardens', 'River lawn', '/media/nature.webp'],
  ['Lounges', 'The lobby', '/v3/likova/lobby.webp'], ['Lounges', 'Terrace library', '/media/lounge.webp'], ['Lounges', 'Private dining', '/media/dining.webp'],
].map(([kind, title, image], i) => ({id: `a${i}`, title, year: kind, location: 'Residents only', category: 'amenities', kind, image}));

const PLACES = [
  ['Nature', 'Embankment river path', '2 min'], ['Nature', 'River park meadows', '9 min'], ['Nature', 'Botanical garden', '14 min'],
  ['Culture', 'Concert hall', '12 min'], ['Culture', 'Contemporary art museum', '11 min'], ['Culture', 'Old town galleries', '15 min'],
  ['Education', 'International school', '7 min'], ['Education', 'University campus', '13 min'], ['Education', 'Kindergarten', '4 min'],
  ['Transport', 'Metro station, three lines', '6 min'], ['Transport', 'Airport express', '18 min'], ['Transport', 'River ferry pier', '5 min'],
  ['Sport', 'Sports arena', '12 min'], ['Sport', 'Rowing club', '8 min'], ['Sport', 'Tennis courts', '6 min'],
  ['Daily', 'Market hall', '5 min'], ['Daily', 'Pharmacy and clinic', '3 min'], ['Daily', 'Bakery on the square', '2 min'],
].map(([region, title, time], i) => ({id: `p${i}`, region: `${region} · ${time}`, title, link: '/place'}));

export function projectsByCategory(slug) { return [...RESIDENCES, ...AMENITIES].filter((p) => p.category === slug).map((p) => ({...p, seed: seedOf(p.id)})); }
export function standardsList() { return PLACES.map((s, i) => ({...s, seed: (i * 0.618033) % 1})); }
export function historyList() { return HISTORIES.map((h) => ({...h, seed: seedOf(h.id)})); }
