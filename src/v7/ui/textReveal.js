import { gsap } from '../core/ScrollManager';

// Text reveals for the normal-flow chapters.
//   [data-lines]  headings: every word rises out of its own mask, in order
//   [data-fill]   paragraphs: words fill from a faint ghost to full colour as
//                 the paragraph crosses the screen (scrubbed with the scroll)
// Words are wrapped once, in place; nested markup (<br>, <em>, <span>) keeps
// its structure because only text nodes are split.

function wrapWords(el, cls) {
  if (el.dataset.split) return el.querySelectorAll(`.${cls} > span`);
  el.dataset.split = '1';
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
          const o = document.createElement('span'); o.className = cls;
          const i = document.createElement('span'); i.textContent = t;
          o.appendChild(i); frag.appendChild(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
  return el.querySelectorAll(`.${cls} > span`);
}

export function revealText(root) {
  root.querySelectorAll('[data-lines]').forEach((el) => {
    const w = wrapWords(el, 'tr-l');
    gsap.fromTo(w, { yPercent: 110, rotate: 2 }, {
      yPercent: 0, rotate: 0, duration: 1.15, stagger: 0.05, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });
  root.querySelectorAll('[data-fill]').forEach((el) => {
    const w = wrapWords(el, 'tr-f');
    gsap.fromTo(w, { opacity: 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 },
    });
  });
}
