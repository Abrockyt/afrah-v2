// AFRAH v3 — "One day at AFRAH". Every page is an hour of the same day.
// Copy is original AFRAH narrative; images under /v3 are temporary study copies (see assets/v3-scrape-manifest.json).

export const chapters = [
  {path: '/vision', num: '01', hour: '05:40', time: 'Dawn', title: 'The Idea', kicker: 'Make it a paradox', image: '/v3/era/new-era.webp', tone: 'dawn',
    teaser: 'Stone that seems to float. Glass that keeps its warmth. A building that is bold on the skyline and quiet at the door.'},
  {path: '/landscape', num: '02', hour: '07:10', time: 'Morning', title: 'Landscape', kicker: 'Natural movement', image: '/v3/silver/movement.webp', tone: 'pine',
    teaser: 'The river path, the rain garden, the amphitheatre. The city steps back and the day begins outside.'},
  {path: '/neighbourhood', num: '03', hour: '10:30', time: 'Late morning', title: 'Neighbourhood', kicker: 'Joys of every day', image: '/v3/era/joy-1.webp', tone: 'sand',
    teaser: 'Schools, markets, the embankment and the bridge. Everything a day asks for, a short walk away.'},
  {path: '/architecture', num: '04', hour: '13:00', time: 'Noon', title: 'Architecture', kicker: 'Choose your side', image: '/v3/silver/gallery-3.webp', tone: 'sky',
    teaser: 'A stepped crown, vertical fins and deep reveals. Follow the sun around the tower and pick your light.'},
  {path: '/lobby', num: '05', hour: '17:20', time: 'Afternoon', title: 'Lobby & Services', kicker: 'The art of arriving', image: '/v3/likova/lobby-slide-3.webp', tone: 'stone',
    teaser: 'A hotel-grade lobby, a quiet concierge and technology that stays out of sight until you need it.'},
  {path: '/interiors', num: '06', hour: '19:40', time: 'Dusk', title: 'Interiors', kicker: 'A touch of sophistication', image: '/v3/era/int-2.webp', tone: 'dusk',
    teaser: 'Arched halls, warm stone and brushed metal. Light moves across materials that ask to be touched.'},
  {path: '/residences', num: '07', hour: '21:15', time: 'Evening', title: 'Residences', kicker: 'Select your floor', image: '/v3/silver/terraces.webp', tone: 'night',
    teaser: 'Spin the tower, pick a floor, compare the views. Twenty-six levels, one that is yours.'},
  {path: '/contact', num: '08', hour: '23:00', time: 'Night', title: 'Come home', kicker: 'The story continues', image: '/v3/silver/arch-intro.webp', tone: 'midnight',
    teaser: 'The city lights up below. Arrange a private viewing and write the next chapter yourself.'},
];

export const chapterByPath = Object.fromEntries(chapters.map(c => [c.path, c]));
export const nextChapter = path => {
  const i = chapters.findIndex(c => c.path === path);
  return chapters[(i + 1) % chapters.length];
};

// Light changes through the day: deep blue at dawn, chalk and sage in daylight,
// then copper and midnight blue. These colours also drive page transitions.
const CHALK = '#F1EDE4', INK = '#203339', LIGHT = '#FAF4E8';
export const tones = {
  home: {bg: '#173647', ink: LIGHT, accent: '#D4A77B'},
  black: {bg: '#102A38', ink: LIGHT, accent: '#C99C70'},
  midnight: {bg: '#102735', ink: LIGHT, accent: '#D5A77A'},
  night: {bg: '#173241', ink: LIGHT, accent: '#E0B282'},
  graphite: {bg: '#25434A', ink: LIGHT, accent: '#D8AE82'},
  forest: {bg: '#264638', ink: LIGHT, accent: '#D8BC8D'},
  dusk: {bg: '#5A4945', ink: LIGHT, accent: '#E7BA91'},
  stone: {bg: '#E3D9C8', ink: INK, accent: '#9F6847'},
  silver: {bg: '#E4E5DA', ink: INK, accent: '#A66E49'},
  dawn: {bg: '#E9E5DA', ink: INK, accent: '#AD7655'},
  sand: {bg: '#EEE4D2', ink: INK, accent: '#A36D4C'},
  mist: {bg: '#E5E9E6', ink: INK, accent: '#86694F'},
  pine: {bg: '#DCE3D7', ink: INK, accent: '#987457'},
  sky: {bg: '#E0E8E8', ink: INK, accent: '#9E674D'},
  white: {bg: CHALK, ink: INK, accent: '#9B694D'},
};

// Sky greys for the "day" ribbon: [hour, top, bottom] — from silver dawn to black midnight.
export const dayStops = [
  ['05:40', '#23445B', '#CFAF9F'], ['07:10', '#7EAFC1', '#F0D3B0'], ['10:30', '#8ABCD0', '#E7EBD8'], ['13:00', '#7CB4CC', '#E8DFBF'],
  ['17:20', '#4C7592', '#DCA886'], ['19:40', '#384C69', '#A97269'], ['21:15', '#172F48', '#37465A'], ['23:00', '#0B2333', '#182D39'],
];

export const residences = [
  {id: '04.A', floor: 4, collection: 'Garden', beds: 1, area: 64, aspect: 'East', view: 'Courtyard', image: '/v3/silver/court-5.webp'},
  {id: '06.B', floor: 6, collection: 'Garden', beds: 2, area: 88, aspect: 'South', view: 'Rain garden', image: '/v3/silver/court-2.webp'},
  {id: '08.A', floor: 8, collection: 'Courtyard', beds: 2, area: 112, aspect: 'East', view: 'Courtyard', image: '/story/courtyard.webp'},
  {id: '10.C', floor: 10, collection: 'Courtyard', beds: 2, area: 96, aspect: 'West', view: 'River', image: '/v3/silver/desc-big.webp'},
  {id: '12.B', floor: 12, collection: 'Terrace', beds: 3, area: 128, aspect: 'South', view: 'Bridge', image: '/v3/silver/gallery-3.webp'},
  {id: '14.D', floor: 14, collection: 'Terrace', beds: 3, area: 134, aspect: 'West', view: 'Sunset', image: '/v3/silver/terraces.webp'},
  {id: '16.C', floor: 16, collection: 'Skyline', beds: 3, area: 136, aspect: 'West', view: 'Skyline', image: '/v3/silver/gallery-2.webp'},
  {id: '18.A', floor: 18, collection: 'Skyline', beds: 3, area: 142, aspect: 'East', view: 'River', image: '/v3/silver/arch-top.webp'},
  {id: '20.B', floor: 20, collection: 'Skyline', beds: 4, area: 158, aspect: 'South', view: 'Park', image: '/v3/era/new-era.webp'},
  {id: '22.B', floor: 22, collection: 'Skyline', beds: 4, area: 154, aspect: 'South', view: 'Skyline', image: '/v3/silver/arch-intro.webp'},
  {id: '24.A', floor: 24, collection: 'Crown', beds: 4, area: 186, aspect: 'East', view: 'Panorama', image: '/v3/silver/gallery-5.webp'},
  {id: '26.P', floor: 26, collection: 'Crown', beds: 5, area: 240, aspect: 'All', view: 'Panorama', image: '/v3/era/touch.webp'},
];

export const services = [
  ['Face ID entry', 'Biometric access for residents: no keys, no fumbling at the door.', '/v3/silver/solution-1.webp'],
  ['Private storage', 'Dry, secure storage rooms on the lower levels, always within reach.', '/v3/silver/solution-2.webp'],
  ['Underground parking', 'Direct lift access, EV charging, motorcycle bays and a tyre station.', '/v3/silver/solution-3.webp'],
  ['High-performance glazing', 'Floor-to-ceiling windows that keep summer out and winter warmth in.', '/v3/silver/solution-4.webp'],
  ['Connected lobby & park', 'Seamless Wi-Fi from the reception desk to the far bench in the garden.', '/v3/silver/solution-5.webp'],
  ['Residents’ app', 'Visitors, deliveries, maintenance and bookings from one screen.', '/v3/silver/solution-6.webp'],
  ['Digital lifts', 'Destination-control lifts that know your floor before you do.', '/v3/silver/solution-7.webp'],
  ['Quiet security', 'Discreet cameras in every public space and a 24-hour concierge.', '/v3/silver/solution-8.webp'],
];

// Illustrative walking/driving times for the study site.
export const journeys = [
  ['4', 'min', 'Walk to the embankment', '/v3/silver/loc-1.webp'],
  ['7', 'min', 'To the nearest school', '/v3/era/joy-2.webp'],
  ['10', 'min', 'To the central park', '/v3/likova/env-bg-1.webp'],
  ['12', 'min', 'To the concert hall', '/v3/era/joy-c4.webp'],
  ['15', 'min', 'To the business district', '/v3/likova/loc-slide-2.webp'],
];

export const activities = ['Sailing', 'River running', 'Kiteboarding', 'Tennis', 'Canoeing', 'Cycling', 'Golf', 'Horse riding', 'Yoga on the lawn', 'Winter skiing'];

// v5 — night theme only: black and gold across every chapter. Tones differ by a few percent of
// warmth so sections still read as separate hours of the same night.
{
  const INK5 = '#EDE6D6', GOLD = '#C9A45C', GOLD_L = '#D8B36A';
  const bgs = {home: '#070707', black: '#070707', midnight: '#040404', night: '#070707', graphite: '#0e0d0b', forest: '#0b0b0a', dusk: '#100e0b',
    stone: '#14120f', silver: '#16130f', dawn: '#12100d', sand: '#13110e', mist: '#12100d', pine: '#0f0e0c', sky: '#11100d', white: '#15130f'};
  for (const [k, bg] of Object.entries(bgs)) tones[k] = {bg, ink: INK5, accent: ['stone', 'silver', 'white'].includes(k) ? GOLD_L : GOLD};
  dayStops.splice(0, dayStops.length, ['05:40', '#1a150d', '#3b2d18'], ['07:10', '#141109', '#2c2414'], ['10:30', '#16120b', '#34291a'], ['13:00', '#120f0a', '#2a2116'],
    ['17:20', '#0f0c08', '#241b10'], ['19:40', '#0c0a07', '#1c150c'], ['21:15', '#080705', '#130f09'], ['23:00', '#050403', '#0b0906']);
}
