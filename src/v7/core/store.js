// Shared, mutable, allocation-free scroll state. Sections write into it from
// their ScrollTrigger callbacks; the WebGL loop and the navigation read it.
// No React state is touched per frame — only the nav subscribes (throttled).

export const store = {
  scroll: 0,          // smoothed document scrollY (Lenis output)
  velocity: 0,        // px per frame, signed
  limit: 1,           // max scroll
  vw: 1440,
  vh: 810,
  time: 0,
  // Section progress map: id -> { p: 0..1, active: bool }. Written by useStage.
  sections: Object.create(null),
  // Named scalar channels sections publish for the WebGL layer (0..1).
  ch: Object.create(null),
  theme: 'dark',      // 'dark' | 'light' — drives nav colour
  navLabel: 'Introduction',
  navSection: 0,      // 0..1 progress within the current nav chapter
  ready: false,       // loader finished
  activeStage: null,  // id of the stage currently pinned (sticky across boundaries)
  soundOn: false,
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
let scheduled = false;
export function notify() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; listeners.forEach((l) => l(store)); });
}

export function setChannel(name, value) { store.ch[name] = value; }
export function getChannel(name, fallback = 0) { const v = store.ch[name]; return v === undefined ? fallback : v; }
export function sectionProgress(id, fallback = 0) { const s = store.sections[id]; return s ? s.p : fallback; }
export function setTheme(t) { if (store.theme !== t) { store.theme = t; document.documentElement.dataset.theme = t; notify(); } }
export function setNav(label, p) {
  if (store.navLabel !== label) { store.navLabel = label; notify(); }
  store.navSection = p;
}

// The stage that owns the viewport at the current scroll: the one whose pin
// range contains the scroll position (the incoming stage wins at a shared
// boundary). Deterministic for jumps and for real scrolling alike.
export function resolveActiveStage() {
  const y = store.scroll;
  let best = null, bestStart = -Infinity, nearest = null, nd = Infinity;
  for (const id in store.sections) {
    const st = store.sections[id].st;
    if (!st) continue;
    if (y >= st.start && y <= st.end) { if (st.start > bestStart) { best = id; bestStart = st.start; } }
    const d = y < st.start ? st.start - y : y > st.end ? y - st.end : 0;
    if (d < nd) { nd = d; nearest = id; }
  }
  store.activeStage = best;
  return store.activeStage;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
// Map value v from [a,b] to 0..1 clamped.
export const range = (v, a, b) => clamp01((v - a) / (b - a));
