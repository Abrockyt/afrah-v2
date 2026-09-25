import React from 'react';
import { useStage } from '../core/useStage';
import { setTheme } from '../core/store';
import { Lines, showLines } from '../ui/Reveal';

// The sculpture room (ZeusScene draws it): a dark gallery where a small light
// follows the cursor across the statue. The copy sits to the right and rises in
// as the room settles; the statue, frame and stones drift at different speeds.
export function Statue() {
  const { runwayRef, stageRef } = useStage('statue', {
    runway: 5,
    build: (tl, { q }) => {
      tl.fromTo(q('.statue__kicker'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.12);
      showLines(tl, q('.statue__title')[0], 0.14, { dur: 0.1, stagger: 0.03 });
      tl.fromTo(q('.statue__body'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.26)
        .fromTo(q('.statue__hint'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.3)
        .to(q('.statue__copy, .statue__hint'), { autoAlpha: 0, y: -20, duration: 0.06 }, 0.62);
    },
    onProgress: () => setTheme('dark'),
  });
  return (
    <section className="runway" id="statue" ref={runwayRef}>
      <div className="stage statue" ref={stageRef}>
        <div className="statue__copy">
          <span className="statue__kicker t-small">06 / Heritage</span>
          <Lines lines={['Made to', 'outlast', 'its century.']} className="statue__title" />
          <p className="statue__body">Stone, bronze and light, chosen the way the ancients chose theirs: for the next hundred years, not the next season. Every surface at AFRAH is meant to age into beauty.</p>
        </div>
        <span className="statue__hint t-small">Move to light the sculpture</span>
      </div>
    </section>
  );
}
