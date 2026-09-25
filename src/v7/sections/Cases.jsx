import React, { useMemo } from 'react';
import { useStage } from '../core/useStage';
import { setTheme } from '../core/store';
import { NestedMotif, RingsMotif } from '../ui/Motifs';
import { CASES } from '../content/copy';
import { projectsByCategory } from '../content/adapters';
import S from '../webgl/data/casesSpec.json';

// The whole 23vh cases pin is one curve player: every continuous value
// (pair offset, box scales, opacities, title mask, content column, gallery
// track) is interpolated from casesSpec.json, which was derived from 215
// measured checkpoints of the reference at 1440x810 and stored as viewport
// ratios. The only discrete state is the kind label, which switches at
// measured thresholds. Nothing here is time based.

const rows = S.curves;
function sample(p) {
  let i = 0;
  while (i < rows.length - 2 && p > rows[i + 1].p) i++;
  const a = rows[i], b = rows[i + 1];
  const t = Math.max(0, Math.min(1, (p - a.p) / Math.max(1e-6, b.p - a.p)));
  const out = {};
  for (const k of Object.keys(a)) {
    if (k === 'p') continue;
    const va = a[k], vb = b[k];
    if (va == null && vb == null) out[k] = null;
    else if (va == null) out[k] = t > 0.5 ? vb : null;
    else if (vb == null) out[k] = t < 0.5 ? va : null;
    else out[k] = va + (vb - va) * t;
  }
  return out;
}

// Original abstract artwork per project (no photography).
export function Artwork({ seed, image, className = '' }) {
  if (image) return <div className={`artwork ${className}`}><img src={image} alt="" loading="lazy" draggable="false" /></div>;
  const hue = Math.floor(20 + seed * 200);
  const a = `hsl(${hue} 18% ${38 + seed * 20}%)`, b = `hsl(${(hue + 40) % 360} 14% ${22 + seed * 12}%)`;
  const bars = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ x: 8 + ((seed * 97 + i * 19) % 80), w: 4 + ((seed * 53 + i * 7) % 18), o: 0.12 + ((seed * 31 + i * 3) % 10) / 40 })), [seed]);
  return (
    <div className={`artwork ${className}`} style={{ background: `linear-gradient(${Math.floor(seed * 360)}deg, ${a}, ${b})` }}>
      {bars.map((bar, i) => <span key={i} style={{ left: `${bar.x}%`, width: `${bar.w}%`, opacity: bar.o }} />)}
      <i style={{ top: `${20 + seed * 50}%`, transform: `rotate(${-8 + seed * 16}deg)` }} />
    </div>
  );
}

function trackItems(cat) {
  const projects = projectsByCategory(cat.id); const items = [];
  for (const kind of cat.kinds) {
    const list = projects.filter((p) => p.kind === kind); if (!list.length) continue;
    items.push({ type: 'kind', kind, count: list.length, id: `k-${kind}` });
    list.forEach((p) => items.push({ type: 'project', kind, ...p }));
  }
  return items;
}

function CaseCard({ cat, Motif, id }) {
  // the measured layout is keyed by the left/right slot: residences → C, amenities → R
  const L = S.layout, m = L.motif[id === 'C' ? 'construction' : 'renovation'];
  return (
    <div className={`case case--${id}`} data-cat={cat.id}>
      <div className="case__box">
        <Motif className="case__motif" style={{ width: `${m.size * 100}%`, height: `${m.size * 100}%`, left: `${m.x * 100}%`, top: `${m.y * 100}%` }} />
        <div className="case__label">
          <span className="case__title"><span className="case__title-in">{cat.label}</span></span>
          <i className="case__rule" />
          <span className="case__meta"><span>{cat.meta}</span><span>[{projectsByCategory(cat.id).length}]</span></span>
        </div>
      </div>
    </div>
  );
}

function CaseContent({ cat, Motif, id }) {
  const C = S.layout.content, items = trackItems(cat);
  return (
    <div className={`case-content case-content--${id}`}>
      <div className="case__column">
        <h2 className="case__hero">
          {cat.hero.map((line, i) => <span className="line" key={i} style={{ marginLeft: `${C.indents[i % C.indents.length] * 100}vw` }}>{line.replace(/\*/g, '')}</span>)}
        </h2>
        <div className="case__intro">
          <Motif className="case__intro-motif" />
          <div className="case__body">{cat.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          <ul className="case__kinds">{cat.kinds.map((k) => <li key={k}>{k}</li>)}</ul>
        </div>
      </div>
      <div className="gallery">
        <div className="gallery__track">
          {items.map((it) => it.type === 'kind'
            ? <div className="gallery__kind gallery__item" key={it.id}><span>{it.kind}</span><b>[{it.count}]</b></div>
            : <article className="gallery__card gallery__item" key={it.id}><Artwork seed={it.seed} image={it.image} /><div className="gallery__meta"><span>{it.year} · {it.location}</span><h3>{it.title}</h3></div></article>)}
        </div>
        <div className="gallery__label"><span>{cat.label} /</span><b className="gallery__kind-now">{cat.kinds[0]}</b></div>
      </div>
    </div>
  );
}

export function Cases() {
  const { runwayRef, stageRef } = useStage('cases', {
    runway: S.runwayVh,
    build: (tl, { stage, q }) => {
      const W = () => stage.clientWidth, H = () => stage.clientHeight;
      const pair = q('.cases__pair')[0];
      const el = (id) => ({ card: q(`.case--${id}`)[0], box: q(`.case--${id} .case__box`)[0], title: q(`.case--${id} .case__title-in`)[0], meta: q(`.case--${id} .case__meta`)[0], rule: q(`.case--${id} .case__rule`)[0],
        content: q(`.case-content--${id}`)[0], column: q(`.case-content--${id} .case__column`)[0], gallery: q(`.case-content--${id} .gallery`)[0], track: q(`.case-content--${id} .gallery__track`)[0],
        items: Array.from(q(`.case-content--${id} .gallery__item`)), label: q(`.case-content--${id} .gallery__kind-now`)[0],
        rings: Array.from(q(`.case--${id} .case__motif .motif__ring`)) });
      const C = el('C'), R = el('R');
      const G = S.gallery, PF = S.pinFraction;
      const kinds = { C: CASES.construction.kinds, R: CASES.renovation.kinds };
      const state = { C: 0, R: 0 };
      const apply = (pStage) => {
        // reference progress covers the 22vh pin; the last 1vh of our stage is the un-pinned scroll-away
        const p = Math.min(1, pStage / PF), w = W(), h = H(), runwayPx = S.runwayVh * PF * h;
        const s = sample(p);
        const lift = pStage > PF ? -h * (pStage - PF) / (1 - PF) : 0;
        pair.style.transform = `translate3d(${(s.pairX || 0) * w}px, ${lift}px, 0)`;
        for (const [key, X, other] of [['C', C, R], ['R', R, C]]) {
          const sc = s[key + 'scale'] ?? 1, op = s[key + 'op'] ?? 1, ty = s[key + 'titleY'] ?? 0, mop = s[key + 'metaOp'] ?? 1;
          X.card.style.transform = `translate3d(0, ${(s[key + 'entryY'] || 0) * h}px, 0)`;
          X.card.style.opacity = op; X.card.style.zIndex = sc > 1.001 ? 3 : 1;
          X.box.style.transform = `scale(${sc})`;
          // Internal motif layers move independently as the card expands —
          // outer rings drift slowest, inner ones fastest, alternating
          // direction — so the artwork reads as one object deforming, not a
          // flat image scaling as a rigid block. Idle (sc=1) leaves it at rest.
          const growth = sc - 1;
          X.rings.forEach((g, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            const rot = dir * growth * (1.6 + i * 1.35);
            const rs = 1 + growth * 0.014 * (i + 1);
            g.style.transform = `rotate(${rot}deg) scale(${rs})`;
          });
          X.title.style.transform = `translateY(${ty * 100}%)`;
          X.meta.style.opacity = mop; X.rule.style.opacity = mop;
          // content column + gallery ride inside the expanded state
          const hy = s[key + 'heroY'];
          const p0 = G.startP[key], tx = w - G.speedPxPerScrollPx * (p - p0) * runwayPx;
          const trackW = X.track.scrollWidth;
          const galleryOn = p >= p0 && tx > -trackW - 40 && sc > 3.99;
          const contentOn = (hy != null) || galleryOn;
          X.content.style.visibility = contentOn ? 'visible' : 'hidden';
          X.column.style.visibility = hy != null ? 'visible' : 'hidden';
          if (hy != null) X.column.style.transform = `translate3d(0, ${hy * h}px, 0)`;
          X.gallery.style.visibility = galleryOn ? 'visible' : 'hidden';
          if (galleryOn) {
            X.track.style.transform = `translate3d(${tx}px, 0, 0)`;
            // per-item perspective by screen position (entering larger, leaving smaller + fading)
            for (const it of X.items) {
              const cx = (it.offsetLeft + tx + it.offsetWidth / 2) / w;
              if (cx < -0.5 || cx > 1.6) continue;
              const enter = Math.max(0, Math.min(1, (cx - G.enter.x0) / (G.enter.x1 - G.enter.x0)));
              const leave = Math.max(0, Math.min(1, (G.leave.x0 - cx) / G.leave.x0));
              const fade = Math.max(0, Math.min(1, (G.leave.fadeX0 - cx) / (G.leave.fadeX0 - G.leave.fadeX1)));
              it.style.transform = `scale(${1 + (G.enter.scale1 - 1) * enter - (1 - G.leave.scale) * leave})`;
              it.style.opacity = 1 - (1 - G.leave.op1) * fade;
            }
            // kind label: threshold-triggered (measured forward; reverse assumed symmetric)
            const th = G.labelThresholds[key]; let k = 0; for (const t of th) if (p > t) k++;
            if (k !== state[key]) { state[key] = k; X.label.textContent = kinds[key][Math.min(k, kinds[key].length - 1)]; }
          }
        }
      };
      tl.to({}, { duration: 1, onUpdate: () => apply(tl.progress()) }, 0);
      apply(0);
    },
    onProgress: () => setTheme('dark'),
  });
  return (
    <section className="runway" ref={runwayRef} id="cases">
      <div className="stage stage--cases" ref={stageRef}>
        <div className="cases__pair">
          <CaseCard cat={CASES.construction} Motif={NestedMotif} id="C" />
          <CaseCard cat={CASES.renovation} Motif={RingsMotif} id="R" />
        </div>
        <CaseContent cat={CASES.construction} Motif={NestedMotif} id="C" />
        <CaseContent cat={CASES.renovation} Motif={RingsMotif} id="R" />
      </div>
    </section>
  );
}