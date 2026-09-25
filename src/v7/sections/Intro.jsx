import React, { useEffect, useRef } from 'react';
import { useStage } from '../core/useStage';
import { gsap } from '../core/ScrollManager';
import { store, subscribe, setTheme } from '../core/store';
import { Lines, showLines, hideLines, fade, drawSvg } from '../ui/Reveal';
import { CutMotif } from '../ui/Motifs';
import { OPENING, NATURE, PAVING, FUSION, PROTECT, DEFY, PARADOX } from '../content/copy';
import { fallData } from '../webgl/scenes/FeatherFall';

/* ---------------------------------------------------------------- Opening */
export function Opening() {
  const kicker = useRef(null);
  const { runwayRef, stageRef } = useStage('opening', {
    runway: 5,
    build: (tl, { q }) => {
      // Kicker dissolves into dash segments then vanishes; giant title sweeps
      // through masked lines; everything is gone before the light tears in.
      tl.to(q('.opening__kicker'), { '--dash': 0.3, y: '-22vh', scaleX: 2.4, scaleY: 0.45, duration: 0.08, ease: 'power1.in' }, 0.02)
        .to(q('.opening__kicker'), { '--dash': 0.0, scaleX: 3.2, autoAlpha: 0, duration: 0.06 }, 0.10);
      showLines(tl, q('.opening__title')[0], 0.2, { dur: 0.08, stagger: 0.03 });
      hideLines(tl, q('.opening__title')[0], 0.5, { dur: 0.07, stagger: 0.02 });
    },
  });
  // Kicker plays once the loader finishes (time based, not scroll based)
  useEffect(() => subscribe((s) => {
    if (s.ready && kicker.current && !kicker.current.dataset.played) {
      kicker.current.dataset.played = '1';
      gsap.fromTo(kicker.current.querySelectorAll('.line__in'), { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out', delay: 0.2 });
    }
  }), []);
  return (
    <section className="runway" ref={runwayRef} id="introduction">
      <div className="stage stage--opening" ref={stageRef}>
        <div className="stage__inner">
          <div className="opening__kicker reveal" ref={kicker}>
            <span className="line"><span className="line__in t-mist">{OPENING.kicker[0]}</span></span>
            <span className="line"><span className="line__in">{OPENING.kicker[1]}</span></span>
          </div>
          <Lines lines={OPENING.title} className="opening__title t-hero" as="h1" />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Nature */
export function Nature() {
  const { runwayRef, stageRef } = useStage('nature', {
    runway: 4,
    build: (tl, { q }) => {
      const h = q('.nature__title')[0];
      fade(tl, q('.nature__chapter'), 0.08, 1, 0.04);
      showLines(tl, h, 0.1, { dur: 0.07, stagger: 0.025 });
      // words leave line by line, last line lingers (observed in the recording)
      hideLines(tl, h, 0.72, { dur: 0.07, stagger: 0.03 });
      fade(tl, q('.nature__chapter'), 0.74, 0, 0.04);
    },
  });
  return (
    <section className="runway" ref={runwayRef}>
      <div className="stage stage--light" ref={stageRef}>
        <div className="stage__inner">
          <div className="nature__block">
            <span className="chapter nature__chapter" style={{ opacity: 0 }}>{NATURE.chapter}</span>
            <Lines lines={NATURE.lines} className="nature__title t-h1" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Paving */
export function Paving() {
  const { runwayRef, stageRef } = useStage('paving', {
    runway: 3.5,
    build: (tl, { q }) => {
      const a = q('.paving__a')[0], b = q('.paving__b')[0];
      showLines(tl, a, 0.12, { dur: 0.08, stagger: 0.03 });
      showLines(tl, b, 0.34, { dur: 0.08, stagger: 0.03 });
      // accent cools down once the second statement has landed
      tl.to(b.querySelectorAll('[data-accent]'), { color: '#8f8b8a', duration: 0.08 }, 0.55);
      tl.to(a.querySelectorAll('.word'), { color: '#8f8b8a', duration: 0.08 }, 0.55);
      hideLines(tl, a, 0.8, { dur: 0.07, stagger: 0.02 });
      hideLines(tl, b, 0.84, { dur: 0.07, stagger: 0.02 });
    },
  });
  return (
    <section className="runway" ref={runwayRef}>
      <div className="stage" ref={stageRef}>
        <div className="stage__inner">
          <Lines lines={PAVING.a} className="paving__a t-giant" />
          <Lines lines={PAVING.b} className="paving__b t-giant" />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Fusion */
export function Fusion() {
  const { runwayRef, stageRef } = useStage('fusion', {
    runway: 4,
    build: (tl, { q }) => {
      const h = q('.fusion__title')[0];
      fade(tl, q('.fusion__chapter'), 0.1, 1, 0.04);
      showLines(tl, h, 0.12, { dur: 0.07, stagger: 0.025 });
      tl.fromTo(q('.fusion__body p'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.08, stagger: 0.03 }, 0.28);
      // last accent word cools, then lines exit toward the right/upward
      tl.to(h.querySelectorAll('[data-accent]'), { color: '#8f8b8a', duration: 0.06 }, 0.5);
      hideLines(tl, h, 0.74, { dur: 0.06, stagger: 0.03 });
      tl.to(q('.fusion__body p'), { autoAlpha: 0, duration: 0.05 }, 0.72);
      fade(tl, q('.fusion__chapter'), 0.74, 0, 0.04);
    },
  });
  return (
    <section className="runway" ref={runwayRef}>
      <div className="stage" ref={stageRef}>
        <div className="stage__inner">
          <div className="fusion__block">
            <span className="chapter fusion__chapter" style={{ opacity: 0 }}>{FUSION.chapter}</span>
            <Lines lines={FUSION.lines} className="fusion__title t-h2" />
            <div className="fusion__body t-body t-mist">{FUSION.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Protect */
export function Protect() {
  const { runwayRef, stageRef } = useStage('protect', {
    runway: 3.5,
    build: (tl, { q }) => {
      const h = q('.protect__title')[0];
      fade(tl, q('.protect__chapter'), 0.08, 1, 0.04);
      showLines(tl, h, 0.1, { dur: 0.07, stagger: 0.025 });
      tl.fromTo(q('.protect__body p'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.08, stagger: 0.03 }, 0.26);
      drawSvg(tl, q('.protect__motif')[0], 0.2, { dur: 0.3, stagger: 0.02 });
      tl.to(h.querySelectorAll('[data-accent]'), { color: '#8c4a12', duration: 0.06 }, 0.5);
      hideLines(tl, h, 0.76, { dur: 0.06, stagger: 0.03 });
      tl.to([q('.protect__body p'), q('.protect__motif')], { autoAlpha: 0, duration: 0.05 }, 0.76);
      fade(tl, q('.protect__chapter'), 0.76, 0, 0.04);
    },
  });
  return (
    <section className="runway" ref={runwayRef}>
      <div className="stage stage--light" ref={stageRef}>
        <div className="stage__inner">
          <div className="protect__block">
            <span className="chapter protect__chapter" style={{ opacity: 0 }}>{PROTECT.chapter}</span>
            <Lines lines={PROTECT.lines} className="protect__title t-h2" />
            <div className="protect__body t-body">{PROTECT.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
          <CutMotif className="protect__motif" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- Defy */
// Everything here is driven by the measured map in webgl/data/featherFall.json:
// word windows, block drift, takeover range and runway length.
export function Defy() {
  const W = fallData.words;
  const { runwayRef, stageRef } = useStage('defy', {
    runway: fallData.runwayVh,
    build: (tl, { q, stage }) => {
      const words = q('.defy__word');
      const col = q('.defy__col')[0];
      const row = () => W.rowGapY * stage.clientHeight;
      // ticker: the column rises one row into the slot, then one more row at
      // every activation; words are pale until active, dark while active,
      // and fade once they have left the slot
      tl.fromTo(words, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, W.appear);
      tl.fromTo(col, { y: () => row() }, { y: 0, duration: W.settle - W.appear, ease: 'power1.out' }, W.appear);
      W.windows.forEach(([a, b], i) => {
        tl.to(words[i], { color: '#1a1a1a', duration: 0.025 }, a);
        if (i > 0) tl.to(col, { y: () => -i * row(), duration: W.shift, ease: 'power1.inOut' }, a);
        if (i < W.windows.length - 1) tl.to(words[i], { color: 'rgba(18,18,18,0.12)', duration: 0.025 }, b);
        if (i >= 1 && i < W.windows.length - 1) tl.to(words[i - 1], { autoAlpha: 0, duration: 0.04 }, b);
      });
      tl.to(words, { autoAlpha: 0, duration: W.fadeOut[1] - W.fadeOut[0] }, W.fadeOut[0]);
      tl.fromTo(q('.defy__dot'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, W.appear);
      tl.to(q('.defy__dot'), { autoAlpha: 0, duration: 0.04 }, W.fadeOut[0]);
      // dark stage takes over from the bottom
      tl.fromTo(q('.defy__takeover'), { yPercent: 100, y: 0 }, { yPercent: 0, y: 0, duration: fallData.takeover[1] - fallData.takeover[0], ease: 'none' }, fallData.takeover[0]);
    },
    onProgress: (p) => setTheme(p > (fallData.takeover[0] + fallData.takeover[1]) / 2 ? 'dark' : 'light'),
  });
  return (
    <section className="runway" ref={runwayRef}>
      <div className="stage stage--light" ref={stageRef}>
        <div className="stage__inner">
          <div className="defy__words" style={{ left: `${W.xRatio * 100}%`, top: `${W.slotY * 100}%`, fontSize: `${W.fontVh}vh` }}>
            <i className="defy__dot" style={{ left: `${(W.dotXRatio - W.xRatio) * 100}vw` }} />
            <div className="defy__col" style={{ rowGap: `calc(${W.rowGapY * 100}vh - 1em)` }}>
              {DEFY.words.map((w) => <span className="defy__word" key={w}>{w}</span>)}
            </div>
          </div>
        </div>
        <div className="defy__takeover" />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Paradox */
export function Paradox() {
  const { runwayRef, stageRef } = useStage('paradox', {
    runway: 3,
    build: (tl, { q }) => {
      const a = q('.paradox__a')[0], b = q('.paradox__b')[0];
      // First statement rides up through the frame; second follows with the motif
      tl.fromTo(a, { y: '80vh' }, { y: 0, duration: 0.22, ease: 'none' }, 0)
        .to(a, { y: '-90vh', duration: 0.24, ease: 'none' }, 0.3);
      tl.fromTo(b, { y: '90vh' }, { y: 0, duration: 0.22, ease: 'none' }, 0.42)
        .to(b, { y: '-60vh', autoAlpha: 0, duration: 0.2, ease: 'none' }, 0.8);
      drawSvg(tl, q('.paradox__motif')[0], 0.36, { dur: 0.3, stagger: 0.03 });
      tl.to(q('.paradox__motif'), { autoAlpha: 0, duration: 0.06 }, 0.86);
      tl.to(q('.paradox__stage'), { backgroundColor: '#121212', duration: 0.001 }, 0);
    },
  });
  return (
    <section className="runway" ref={runwayRef}>
      <div className="stage paradox__stage" ref={stageRef}>
        <div className="stage__inner">
          <Lines lines={PARADOX.first} className="paradox__a t-giant" />
          <Lines lines={PARADOX.second} className="paradox__b t-giant" />
          <CutMotif className="paradox__motif" />
        </div>
      </div>
    </section>
  );
}