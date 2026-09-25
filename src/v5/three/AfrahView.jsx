import {useEffect, useRef, useState} from 'react';
import {createWorld} from '../engine/world';
import {detectQuality} from '../engine/core';

// React wrapper around the AFRAH engine. `progress` is a ref read every frame, so scroll never re-renders React.
export default function AfrahView({mode = 'flight', progress, env = 'night', envTo, envT, selected, intro = false, offset = 0, minimal = false, onReady, onProgress, onSelect, onHover, onIntroEnd, apiRef, className = ''}) {
  const host = useRef(), world = useRef(), cb = useRef({});
  cb.current = {onReady, onProgress, onSelect, onHover, onIntroEnd};
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const capture = new URLSearchParams(location.search).has('capture');
    const w = createWorld(host.current, {mode, env, intro, offset, minimal, capture, quality: capture ? 'high' : detectQuality(),
      onProgress: p => { dispatchEvent(new CustomEvent('afrah:progress', {detail: p})); cb.current.onProgress?.(p); },
      onReady: s => { if (s === 'hero') setReady(true); dispatchEvent(new CustomEvent('afrah:ready', {detail: s})); cb.current.onReady?.(s); },
      onSelect: l => cb.current.onSelect?.(l), onHover: l => cb.current.onHover?.(l), onIntroEnd: () => cb.current.onIntroEnd?.()});
    world.current = w; if (apiRef) apiRef.current = w;
    let raf;
    const tick = () => { raf = requestAnimationFrame(tick); if (progress) w.setProgress(progress.current); };
    tick();
    return () => { cancelAnimationFrame(raf); w.dispose(); if (apiRef) apiRef.current = null; };
  }, [mode]);
  useEffect(() => { world.current?.setEnv(env, envTo || env, envT || 0); }, [env, envTo]);
  useEffect(() => { if (envT !== undefined) world.current?.setEnvT(envT); }, [envT]);
  useEffect(() => { world.current?.setSelected(selected); }, [selected]);
  return <div ref={host} className={`v-afrah ${ready ? 'ready' : ''} ${className}`} role="img" aria-label="AFRAH, a 26-level residential tower in its city at night"/>;
}
