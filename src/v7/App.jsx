import React, { useEffect } from 'react';
import { initScroll, ScrollTrigger } from './core/ScrollManager';
import { toggleSound } from './core/sound';
import PersistentCanvas from './webgl/PersistentCanvas';
import Navigation from './ui/Navigation';
import Loader from './ui/Loader';
import Arrival from './sections/Arrival';
import { Opening } from './sections/Intro';
import { Building } from './sections/Building';
import EraOpening from './sections/EraOpening';
import { Living, PlaceChapter } from './sections/Living';
import { EraArchitecture, EraStatement, EraJoy, EraMap, EraGarden, EraInteriors } from './sections/Era';
import { History, Contact } from './sections/History';
import { Statue } from './sections/Statue';

// AFRAH film, built on the Composites-style engine (ported from elegant-hypatia,
// all original code): one persistent canvas, pinned stages, feathered wipes.
export default function App() {
  useEffect(() => {
    initScroll();
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <PersistentCanvas />
      <div id="hist-fg" />
      <Navigation onSound={() => toggleSound()} />
      <main id="page">
        <EraOpening /><Arrival />
        <Building />
        <Opening />
        <Living />
        <EraArchitecture /><EraStatement /><EraJoy /><EraMap /><EraGarden /><EraInteriors />
        <History />
        <Statue />
        <PlaceChapter />
        <Contact />
      </main>
      <Loader onSound={(v) => toggleSound(v)} />
    </>
  );
}
