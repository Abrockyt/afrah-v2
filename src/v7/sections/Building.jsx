import React from 'react';
import { useStage } from '../core/useStage';
import { setTheme } from '../core/store';
import { Lines, showLines, hideLines, fade } from '../ui/Reveal';
import { TOWER } from '../content/copy';

// The tower chapter. The stage itself is transparent: the persistent canvas
// draws the bone background, the grid and the model (webgl/scenes/BuildingScene).
// Four captions rise and leave in masked lines as the camera moves shot to shot.
export function Building() {
  const { runwayRef, stageRef } = useStage('building', {
    runway: 4.5,
    build: (tl, { q }) => {
      const shots = q('.tower__shot');
      TOWER.shots.forEach((s, i) => {
        const el = shots[i], title = el.querySelector('.tower__title'), meta = el.querySelectorAll('.tower__meta');
        showLines(tl, title, s.at[0], { dur: 0.04, stagger: 0.012 });
        tl.fromTo(meta, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.04 }, s.at[0] + 0.02);
        hideLines(tl, title, s.at[1], { dur: 0.04, stagger: 0.01 });
        tl.to(meta, { autoAlpha: 0, duration: 0.03 }, s.at[1]);
      });
      fade(tl, q('.tower__chapter'), 0.08, 1, 0.03);
      fade(tl, q('.tower__chapter'), 0.9, 0, 0.03);
      tl.fromTo(q('.tower__cta'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.04 }, 0.78);
      tl.to(q('.tower__cta'), { autoAlpha: 0, duration: 0.03 }, 0.9);
    },
    onProgress: () => setTheme('dark'),
  });
  return (
    <section className="runway" ref={runwayRef} id="tower">
      <div className="stage stage--light stage--tower" ref={stageRef}>
        <div className="stage__inner">
          <span className="chapter tower__chapter" style={{ opacity: 0 }}>{TOWER.chapter} — The tower</span>
          {TOWER.shots.map((s, i) => (
            <div className={`tower__shot tower__shot--${i % 2 ? 'r' : 'l'}`} key={s.num}>
              <span className="tower__meta tower__num t-small">{s.num} / 04</span>
              <Lines lines={s.title} className="tower__title t-giant" />
              <p className="tower__meta t-body">{s.body}</p>
            </div>
          ))}
          <a className="cta tower__cta" href="/select">Select a level ↗</a>
        </div>
      </div>
    </section>
  );
}
