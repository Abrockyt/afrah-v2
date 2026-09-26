import React, { useEffect } from 'react';
import { initScroll, ScrollTrigger, scrollTo } from './core/ScrollManager';
import { subscribe } from './core/store';
import { toggleSound } from './core/sound';
import PersistentCanvas from './webgl/PersistentCanvas';
import Navigation from './ui/Navigation';
import Loader from './ui/Loader';
import Arrival from './sections/Arrival';
import { Building } from './sections/Building';
import EraOpening from './sections/EraOpening';
import { Living } from './sections/Living';
import { EraArchitecture, EraStatement, EraJoy, EraMap, EraGarden, EraInteriors, EraArtDeco, EraCeilings, EraApartments, EraOutro } from './sections/Era';
import { History, Contact } from './sections/History';
import { Statue } from './sections/Statue';

// AFRAH film, built on the Composites-style engine (ported from elegant-hypatia,
// all original code): one persistent canvas, pinned stages, feathered wipes.
export default function App() {
  useEffect(() => {
    initScroll();
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    // arriving from another page with #chapter: go there once the film is ready
    let jumped = false;
    const off = subscribe((st) => {
      if (jumped || !st.ready || !location.hash) return;
      jumped = true;
      const el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(() => scrollTo(el, { immediate: true, offset: 2 }), 400);
    });
    return () => { clearTimeout(t); off(); };
  }, []);
  return (
    <>
      <PersistentCanvas />
      <div id="hist-fg" />
      <Navigation onSound={() => toggleSound()} />
      <main id="page">
        <EraOpening /><Arrival />
        <Building />
        <Living />
        <EraArtDeco /><EraArchitecture /><EraStatement /><EraJoy /><EraMap /><EraGarden /><EraInteriors /><EraCeilings /><EraApartments />
        <History />
        <Statue />
        <EraOutro />
        <Contact />
      </main>
      <Loader onSound={(v) => toggleSound(v)} />
    </>
  );
}
