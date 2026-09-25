import React from 'react';
import { useStage } from '../core/useStage';
import { setTheme } from '../core/store';
import { Lines, showLines, hideLines, fade } from '../ui/Reveal';
import { WHY, BRIDGE, STANDARDS } from '../content/copy';
import T from '../webgl/data/tunnelSpec.json';
import { standardsList } from '../content/adapters';

/* ---------------------------------------------------------- Why composites */
// Six benefit nodes scattered around a centred heading; they fly in from the
// centre with a little rotation and drift at different depths.
const NODE_POS = [
  { x: 14, y: 30, r: -6, d: 0.6 }, { x: 78, y: 26, r: 5, d: 1.0 }, { x: 8, y: 66, r: 4, d: 1.3 },
  { x: 82, y: 70, r: -4, d: 0.8 }, { x: 30, y: 80, r: 6, d: 1.1 }, { x: 62, y: 16, r: -5, d: 0.7 },
];
export function Why() {
  const { runwayRef, stageRef } = useStage('why', {
    runway: 6,
    build: (tl, { q }) => {
      const nodes = q('.why__node');
      showLines(tl, q('.why__title')[0], 0.08, { dur: 0.08, stagger: 0.03 });
      nodes.forEach((n, i) => {
        const p = NODE_POS[i];
        tl.fromTo(n, { x: `${50 - p.x}vw`, y: `${50 - p.y}vh`, rotation: p.r * 4, autoAlpha: 0 },
          { x: 0, y: 0, rotation: p.r, autoAlpha: 1, duration: 0.14, ease: 'power2.out' }, 0.12 + i * 0.02);
        // parallax drift by depth while the section holds
        tl.to(n, { y: `${-14 * p.d}vh`, duration: 0.5, ease: 'none' }, 0.3);
      });
      tl.fromTo(q('.why__cta'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.26);
      // the feather field takes over gradually: nodes recede one at a time
      // (by depth, nearest last), the CTA next, the heading dims but lingers
      // longest — not a single simultaneous cut.
      nodes.forEach((n, i) => {
        const p = NODE_POS[i];
        tl.to(n, { autoAlpha: 0, duration: 0.1 }, 0.58 + (1 - p.d) * 0.1);
      });
      tl.to(q('.why__cta'), { autoAlpha: 0, duration: 0.08 }, 0.74);
      tl.to(q('.why__title'), { autoAlpha: 0.08, duration: 0.16 }, 0.8);
    },
    onProgress: () => setTheme('dark'),
  });
  return (
    <section className="runway" ref={runwayRef} id="why">
      <div className="stage" ref={stageRef}>
        <div className="stage__inner">
          <Lines lines={WHY.title} className="why__title t-h1" />
          {WHY.benefits.map((b, i) => (
            <div className="why__node" key={b.k} style={{ left: `${NODE_POS[i].x}%`, top: `${NODE_POS[i].y}%` }}>
              <i />
              <span className="t-small">{b.k}</span>
              <small>{b.v}</small>
            </div>
          ))}
          <a className="cta why__cta" href={WHY.href}>{WHY.cta}</a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- Tunnel + bridge */
// One 10vh pin (as measured): WebGL tunnel until the portal fills at 0.55,
// then the light statement, the dark sheet rising 0.675-0.775 with the second
// statement, everything dark by 0.925. p below is the reference progress
// (over the 9vh pin); the stage maps its own progress with pinFraction.
export function Tunnel() {
  const PF = T.pinFraction;
  const { runwayRef, stageRef } = useStage('tunnel', {
    runway: T.runwayVh,
    build: (tl, { q, stage }) => {
      const a = q('.bridge__a')[0], b = q('.bridge__b')[0], light = q('.bridge__light')[0], dark = q('.bridge__dark')[0];
      const H = () => stage.clientHeight;
      const at = (pr) => pr * PF;                          // reference p -> stage position
      tl.fromTo(light, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 * PF }, at(T.light.start - 0.02));
      showLines(tl, a, at(T.light.start), { dur: 0.05 * PF, stagger: 0.02 * PF });
      const [[p0, y0], [p1, y1]] = T.light.text1Y;
      tl.fromTo(a, { y: () => y0 * H() }, { y: () => y1 * H(), duration: at(p1) - at(p0), ease: 'none' }, at(p0));
      tl.to(a.querySelectorAll('[data-accent]'), { color: '#8c4a12', duration: 0.05 * PF }, at(0.62));
      tl.fromTo(dark, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: at(T.sheet.rise[1]) - at(T.sheet.rise[0]), ease: 'none' }, at(T.sheet.rise[0]));
      showLines(tl, b, at(T.sheet.rise[0] - 0.03), { dur: 0.04 * PF, stagger: 0.015 * PF });
      tl.to([a, b], { autoAlpha: 0, duration: at(T.fadeAll[1]) - at(T.fadeAll[0]) }, at(T.fadeAll[0]));
      tl.set(light,{autoAlpha:0},.82)
        .to(dark,{clipPath:'inset(0% 0 100% 0)',duration:.14,ease:'power1.inOut'},.85);
    },
    onProgress: (p) => setTheme(p / PF > T.light.start && p / PF < (T.sheet.rise[0] + T.sheet.rise[1]) / 2 ? 'light' : 'dark'),
  });
  return (
    <section className="runway" ref={runwayRef} id="tunnel">
      <div className="stage" ref={stageRef}>
        <div className="bridge__light"><div className="stage__inner"><Lines lines={BRIDGE.light} className="bridge__a t-h1" /></div></div>
        <div className="bridge__dark"><div className="stage__inner"><Lines lines={BRIDGE.dark} className="bridge__b t-h1" /></div></div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Standards */
// Giant split word in the middle; the standards field scrolls past it at three
// speeds, some cards in front of the type, some behind.
export function Standards() {
  const list = standardsList();
  const { runwayRef, stageRef } = useStage('standards', {
    runway: 8,
    build: (tl, { q, stage }) => {
      showLines(tl, q('.standards__giant')[0], 0.02, { dur: 0.1, stagger: 0.04 });
      tl.fromTo(q('.standards__intro'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.08);
      tl.to(q('.standards__intro'), { autoAlpha: 0, duration: 0.05 }, 0.3);
      tl.fromTo(q('.standards__cta'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.2);
      // three layers, three speeds
      q('.standards__layer').forEach((layer, i) => {
        const speed = [0.7, 1.0, 1.45][i];
        tl.fromTo(layer, { y: () => stage.clientHeight * 1.05 }, { y: () => -layer.scrollHeight * speed - stage.clientHeight * 0.2, duration: 0.86, ease: 'none' }, 0.12);
      });
      tl.to([q('.standards__giant'), q('.standards__cta')], { autoAlpha: 0, duration: 0.05 }, 0.94);
    },
    onProgress: () => setTheme('dark'),
  });
  const layers = [[], [], []];
  list.forEach((s, i) => layers[i % 3].push(s));
  return (
    <section className="runway" ref={runwayRef} id="standards">
      <div className="stage stage--ink2" ref={stageRef}>
        <div className="stage__inner">
          <p className="standards__intro t-body t-mist">{STANDARDS.intro}</p>
          <Lines lines={STANDARDS.split} className="standards__giant t-giant" as="h2" />
          {layers.map((layer, li) => (
            <div className={`standards__layer standards__layer--${li}`} key={li}>
              {layer.map((s, i) => (
                <a className="standard" key={s.id} href={s.link || '#'} style={{ marginLeft: `${(s.seed * 60) | 0}%`, marginTop: `${8 + ((s.seed * 30) | 0)}vh` }}>
                  <span className="standard__region t-small t-accent">{s.region}</span>
                  <span className="standard__title">{s.title}</span>
                  <span className="standard__box">↗</span>
                </a>
              ))}
            </div>
          ))}
          <a className="cta standards__cta" href={STANDARDS.href}>{STANDARDS.cta}</a>
        </div>
      </div>
    </section>
  );
}
