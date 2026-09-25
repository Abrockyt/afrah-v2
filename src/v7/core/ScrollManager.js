import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { store } from './store';

gsap.registerPlugin(ScrollTrigger);

// One smooth-scroll instance for the whole experience. Lenis drives native
// scrollY with inertia; GSAP's ticker drives Lenis; ScrollTrigger reads scrollY.
// Perceived movement in the reference: ~0.09 lerp at 60fps, immediate response,
// short tail. We keep latency low (lerp 0.1) rather than "floaty".
let lenis = null;

export function initScroll() {
  if (lenis) return lenis;
  lenis = new Lenis({
    lerp: 0.075,
    wheelMultiplier: 0.62,
    touchMultiplier: 1.05,
    smoothWheel: true,
    syncTouch: false,
    infinite: false,
  });
  lenis.on('scroll', (e) => {
    store.scroll = e.scroll;
    store.velocity = e.velocity;
    store.limit = e.limit || 1;
    ScrollTrigger.update();
  });
  gsap.ticker.add((t) => { lenis.raf(t * 1000); store.time = t; });
  gsap.ticker.lagSmoothing(0);

  const onResize = () => { store.vw = window.innerWidth; store.vh = window.innerHeight; };
  onResize();
  window.addEventListener('resize', onResize);
  ScrollTrigger.config({ ignoreMobileResize: true });
  window.__lenis = lenis;
  return lenis;
}

export function getLenis() { return lenis; }
export function scrollTo(target, opts = {}) { lenis && lenis.scrollTo(target, { duration: 1.4, ...opts }); }
export function stopScroll() { lenis && lenis.stop(); }
export function startScroll() { lenis && lenis.start(); }
if (typeof window !== 'undefined') { window.__gsap = gsap; window.__ST = ScrollTrigger; }
export { gsap, ScrollTrigger };
