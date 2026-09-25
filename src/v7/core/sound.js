// Minimal, original ambience: a slow filtered drone whose level follows scroll
// velocity. No audio files; everything is synthesised with the Web Audio API,
// and nothing starts until the user opts in (autoplay policy).
import { store } from './store';

let ctx = null, gain = null, lfo = null, started = false;

export function toggleSound(force) {
  const want = force === undefined ? !store.soundOn : !!force;
  if (want && !started) start();
  store.soundOn = want;
  if (gain) gain.gain.setTargetAtTime(want ? 0.12 : 0, ctx.currentTime, 0.4);
}

function start() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  gain = ctx.createGain(); gain.gain.value = 0;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320; filter.Q.value = 0.7;
  const oscs = [55, 82.4, 110.2].map((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1) * 4; o.connect(filter); o.start(); return o; });
  lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 120;
  lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
  filter.connect(gain).connect(ctx.destination);
  started = true;
  // scroll velocity opens the filter a little
  const tick = () => {
    if (ctx && store.soundOn) {
      const v = Math.min(1, Math.abs(store.velocity) / 40);
      filter.frequency.setTargetAtTime(320 + v * 900, ctx.currentTime, 0.2);
    }
    requestAnimationFrame(tick);
  };
  tick();
  void oscs;
}