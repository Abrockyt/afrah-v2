// AFRAH copy. Structure (chapter numbering, line breaks, emphasis slots marked
// with *asterisks*) follows the Composites-style typographic rhythm so the
// measured motion specs still fit; every sentence is written for AFRAH.

export const BRAND = { top: 'afrah', bottom: 'residences' };

export const NAV = {
  chapters: [
    { id: 'home', label: 'Afrah' },
    { id: 'arrival', label: 'Arrival' },
    { id: 'introduction', label: 'Introduction' },
    { id: 'tower', label: 'The tower' },
    { id: 'cases', label: 'Residences' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'interiors', label: 'Interiors' },
    { id: 'history', label: 'History' },
    { id: 'statue', label: 'Heritage' },
    { id: 'place-chapter', label: 'Place' },
    { id: 'contact', label: 'Viewing' },
  ],
  why: 'Why AFRAH',
  sound: { on: 'Sound on', off: 'Sound off' },
  skip: 'Skip',
  pages: [
    ['/residences', 'Residences'], ['/select', 'Select a level'], ['/map', '3D map'], ['/architecture', 'Architecture'],
    ['/place', 'Place'], ['/gallery', 'Gallery'], ['/progress', 'Progress'], ['/how-to-buy', 'How to buy'], ['/viewing', 'Viewing'],
  ],
};

export const OPENING = {
  kicker: ['The story of', 'afrah'],
  title: ['BUILT', 'FROM', 'LIGHT'],
};

export const NATURE = {
  chapter: '01',
  lines: ['FORMS SHAPED', 'BY THE *RIVER*,', 'MADE FOR', 'THE WAY YOU LIVE'],
};

export const PAVING = {
  a: ['OPENING', 'THE DOOR'],
  b: ['TO A NEW', '*SKYLINE*'],
};

export const FUSION = {
  chapter: '02',
  lines: ['STONE, GLASS', 'AND *BRONZE*', 'AS ONE'],
  body: [
    'Honed stone at the base, bronze fins that catch the evening sun, and deep glass that turns each room toward the water.',
    'Three materials, chosen to age slowly and to look better in twenty years than on the day the keys are handed over.',
  ],
};

export const PROTECT = {
  chapter: '03',
  lines: ['*QUIET*', 'STRENGTH IN', 'EVERY LINE'],
  body: [
    'Thick walls, triple glazing and a structure that carries the terraces without a single visible column.',
    'Inside, the city falls silent. Outside, the river keeps moving.',
  ],
};

export const DEFY = { words: ['RISE', 'ABOVE', 'THE', 'CITY'] };

export const PARADOX = {
  first: ['WHAT HAPPENS WHEN', 'A TOWER', 'FEELS LIKE HOME?'],
  second: ['TWENTY-SIX', 'LEVELS OF LIGHT', 'ABOVE THE WATER'],
};

export const TOWER = {
  chapter: '04',
  shots: [
    { at: [0.1, 0.3], num: '01', title: ['RESI', 'DENCES'], body: 'Twenty-six levels on the river bend.' },
    { at: [0.33, 0.52], num: '02', title: ['LIGHT'], body: 'Rooms that glow, never all at once.' },
    { at: [0.55, 0.72], num: '03', title: ['DETAIL'], body: 'Bronze fins, deep reveals, honed stone.' },
    { at: [0.75, 0.9], num: '04', title: ['TERR', 'ACES'], body: 'Every setback becomes a garden.' },
  ],
};

export const CASES = {
  construction: {
    id: 'residences',
    label: 'Residences',
    meta: 'Homes',
    hero: ['CHOOSE', 'A HOME THAT', '*FACES* THE', 'WATER'],
    body: [
      'From garden apartments close to the courtyard to sky residences under the crown, every plan opens to at least two views.',
      'Levels, layouts and orientations below — the full list, with plans, is one click away.',
    ],
    kinds: ['Garden', 'Terrace', 'Sky'],
  },
  renovation: {
    id: 'amenities',
    label: 'Amenities',
    meta: 'Spaces',
    hero: ['SHARED', 'ROOMS FOR', '*SLOWER* DAYS'],
    body: [
      'A lobby like a hotel, a pool under the podium, a library on the terrace and a garden that belongs to everyone who lives here.',
      'Each space is run by the concierge team, day and night.',
    ],
    kinds: ['Wellness', 'Gardens', 'Lounges'],
  },
};

export const WHY = {
  title: ['WHY LIVE', 'AT AFRAH'],
  cta: 'Explore residences',
  href: '/residences',
  benefits: [
    { k: 'Views', v: 'River on three sides' },
    { k: 'Light', v: 'Floor-to-ceiling glass' },
    { k: 'Terraces', v: 'Every setback a garden' },
    { k: 'Quiet', v: 'Triple glazing, deep walls' },
    { k: 'Service', v: 'Concierge, day and night' },
    { k: 'Wellness', v: 'Pool, spa and studio' },
  ],
};

export const BRIDGE = {
  light: ['FROM THIS', 'PASSAGE OF', '*LIGHT*...'],
  dark: ['COMES', 'A PLACE', 'TO CALL', '*HOME*'],
};

export const STANDARDS = {
  split: ['NEAR', 'BY'],
  intro: 'Everything a day needs, within a short walk of the lobby — gathered by what you will use it for.',
  cta: 'Explore the place',
  href: '/place',
};

export const HISTORY = {
  hero: ['A CENTURY', 'ON THE', 'RIVER BEND,', 'ONE NEW', 'LANDMARK'],
  intro: 'From the first embankment wall to the day the lights came on, each moment below shaped the ground AFRAH stands on.',
};

export const CONTACT = {
  lines: ['ARRANGE', 'A PRIVATE', '*VIEWING*.'],
  body: ['Tell us when suits you and what you are looking for. We will show you the residences at dusk, when the tower is at its best.'],
  fields: [
    { name: 'firstName', label: 'First name', type: 'text' },
    { name: 'lastName', label: 'Last name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'bedrooms', label: 'Bedrooms', type: 'text' },
    { name: 'timing', label: 'Preferred time', type: 'text' },
    { name: 'message', label: 'Message', type: 'textarea' },
  ],
  cta: 'Send request',
  footer: [['/residences', 'Residences'], ['/place', 'Place'], ['/gallery', 'Gallery'], ['/viewing', 'Contacts']],
};
