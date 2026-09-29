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

// Headings marked [data-air] are set like the reference: their <br>-separated
// lines become blocks pushed to the two edges of the column.
function splitLines(el) {
  if (el.dataset.air === 'done') return;
  const groups = [[]];
  [...el.childNodes].forEach((n) => { if (n.nodeName === 'BR') groups.push([]); else groups[groups.length - 1].push(n); });
  el.textContent = '';
  groups.filter((g) => g.some((n) => n.textContent.trim())).forEach((g) => { const ln = document.createElement('span'); ln.className = 'air-ln'; g.forEach((n) => ln.appendChild(n)); el.appendChild(ln); });
  el.classList.add('air-split');
  el.dataset.air = 'done';
}

// Words rise out of a soft blur, one after another (the reference's text
// reveal), once, when the block enters.
const EASE = 'expo.out';
export function revealText(root) {
  root.querySelectorAll('[data-air]').forEach(splitLines);
  root.querySelectorAll('[data-lines]').forEach((el) => {
    const w = wrapWords(el, 'tr-l');
    gsap.fromTo(w, { yPercent: 70, opacity: 0, filter: 'blur(12px)' }, {
      yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, stagger: 0.05, ease: EASE,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
  root.querySelectorAll('[data-fill]').forEach((el) => {
    const w = wrapWords(el, 'tr-f');
    gsap.fromTo(w, { y: 14, opacity: 0, filter: 'blur(8px)' }, {
      y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, stagger: 0.012, ease: EASE,
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });
}

// Section motion after the reference: pictures come in out of a blur,
// [data-air-full] pictures open from an inset rounded card to the full
// width, and every [data-air-fade] section dims as it scrolls away.
export function airMotion(root) {
  root.querySelectorAll('img[data-air-img], [data-air-img] img').forEach((img) => {
    gsap.fromTo(img, { opacity: 0, filter: 'blur(20px)' }, { opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: EASE, scrollTrigger: { trigger: img, start: 'top 90%' } });
  });
  root.querySelectorAll('[data-air-full]').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(7% 9% 7% 9% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 15%', scrub: 0.6 } });
  });
  const fades = root.matches?.('[data-air-fade]') ? [root] : [...root.querySelectorAll('[data-air-fade]')];
  fades.forEach((sec) => {
    let veil = sec.querySelector(':scope > .air-veil');
    if (!veil) { veil = document.createElement('div'); veil.className = 'air-veil'; sec.appendChild(veil); }
    gsap.fromTo(veil, { opacity: 0 }, { opacity: 0.55, ease: 'none', scrollTrigger: { trigger: sec, start: 'bottom bottom', end: 'bottom top', scrub: true } });
  });
}
