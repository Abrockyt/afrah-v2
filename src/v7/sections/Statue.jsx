import React from 'react';
import { useStage } from '../core/useStage';
import { setTheme } from '../core/store';

// The sculpture room (ZeusScene draws it): a dark gallery where a small light
// follows the cursor across the statue. The copy sits to the right and rises in
// as the room settles; the statue, frame and stones drift at different speeds.
export function Statue() {
  const { runwayRef, stageRef } = useStage('statue', {
    runway: 5,
    build: (tl, { q }) => {
      tl.fromTo(q('.statue__intro .line__in'), { yPercent: 110 }, { yPercent: 0, duration: 0.08, stagger: 0.012, ease: 'power2.out' }, 0.1)
        .fromTo(q('.statue__word span'), { yPercent: 105 }, { yPercent: 0, duration: 0.14, stagger: 0.012, ease: 'power3.out' }, 0.08)
        .fromTo(q('.statue__word'), { y: '6vh' }, { y: '-4vh', duration: 0.6, ease: 'none' }, 0.08)
        .fromTo(q('.statue__hint'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.24)
        .to(q('.statue__intro, .statue__word, .statue__hint'), { autoAlpha: 0, duration: 0.06 }, 0.62);
    },
    onProgress: () => setTheme('dark'),
  });
  const intro = ['From the first step through the door,', 'the lobby sets the tone of home: stone,', 'bronze and a sculpture that has watched', 'over centuries. Calm, generous, lasting.'];
  return (
    <section className="runway" id="statue" ref={runwayRef}>
      <div className="stage statue" ref={stageRef}>
        <p className="statue__intro">{intro.map((l, i) => <span className="line" key={i}><span className="line__in">{l}</span></span>)}</p>
        <h2 className="statue__word" aria-label="Lobby">{'LOBBY'.split('').map((c, i) => <span key={i}>{c}</span>)}</h2>
        <span className="statue__hint t-small">Move to light the sculpture</span>
      </div>
    </section>
  );
}
