import {useEffect, useRef, useState} from 'react';
import {Minus, RotateCcw, X} from 'lucide-react';
import AfrahView from './AfrahView';

// Interactive district map on the AFRAH engine (orbit, zoom, pins that fly the camera).
export const places = [
  {id: 'afrah', name: 'AFRAH', cat: 'Home', time: '0 min', pos: [0, 128, 0], image: '/v3/era/new-era.webp', text: 'The tower: 26 levels of residences, a lantern crown and a riverside plaza.'},
  {id: 'embankment', name: 'Embankment', cat: 'Nature', time: '2 min', pos: [60, 6, 150], image: '/v3/silver/loc-1.webp', text: 'The river promenade for a morning run or an evening walk.'},
  {id: 'bridge', name: 'Lantern Bridge', cat: 'Landmark', time: '8 min', pos: [-500, 20, 300], image: '/v3/silver/loc-2.webp', text: 'Gold-lit arches across the river.'},
  {id: 'towers', name: 'Business district', cat: 'Work', time: '12 min', pos: [680, 190, 790], image: '/v3/likova/offices.webp', text: 'The landmark office towers, across the water.'},
  {id: 'park', name: 'City park', cat: 'Nature', time: '6 min', pos: [-300, 6, -300], image: '/v3/likova/env-bg-1.webp', text: 'Lawns, trees and quiet paths.'},
  {id: 'school', name: 'School campus', cat: 'Education', time: '7 min', pos: [300, 10, -500], image: '/v3/era/joy-2.webp', text: 'Kindergarten to graduation, on quiet streets.'},
  {id: 'hall', name: 'Concert hall', cat: 'Culture', time: '10 min', pos: [-700, 20, -200], image: '/v3/era/joy-c4.webp', text: 'An evening of music, a walk from home.'},
];

export default function MapView() {
  const api = useRef(), pins = useRef({});
  const [active, setActive] = useState(null), [filter, setFilter] = useState('All'), [ready, setReady] = useState(false);
  useEffect(() => {
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const w = api.current; if (!w) return;
      const el = w.renderer.domElement, W = el.clientWidth, H = el.clientHeight;
      for (const p of places) {
        const n = pins.current[p.id]; if (!n) continue;
        const v = w.project(p.pos), on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        n.style.transform = `translate(${(v.x * .5 + .5) * W}px, ${(-v.y * .5 + .5) * H}px)`;
        n.style.opacity = on ? '' : 0; n.style.pointerEvents = on ? '' : 'none';
      }
    };
    loop(); return () => cancelAnimationFrame(raf);
  }, []);
  const cats = ['All', ...new Set(places.map(p => p.cat))];
  const choose = p => { setActive(p); api.current?.flyTo(p.pos, p.id === 'afrah' ? 320 : 460); };
  return <div className={`v-citymap night ${ready ? 'ready' : ''}`}>
    <AfrahView mode="map" apiRef={api} onReady={s => s === 'hero' && setReady(true)} className="v-citymap-canvas"/>
    <div className="v-citymap-pins">{places.map((p, i) => <button key={p.id} ref={n => { pins.current[p.id] = n; }} className={`v-pin ${p.id === 'afrah' ? 'home' : ''} ${active?.id === p.id ? 'on' : ''} ${filter !== 'All' && filter !== p.cat && p.id !== 'afrah' ? 'dim' : ''}`} onClick={() => choose(p)}>
      <i>{p.id === 'afrah' ? 'A' : String(i).padStart(2, '0')}</i><span>{p.name}<em>{p.time}</em></span></button>)}</div>
    {!ready && <div className="v-citymap-loading"><span/>Loading the district</div>}
    <div className="v-citymap-filters">{cats.map(c => <button key={c} aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}</button>)}</div>
    <div className="v-citymap-tools">
      <button aria-label="Zoom out" onClick={() => api.current?.resetView()}><Minus size={18}/></button>
      <button aria-label="Reset view" onClick={() => { setActive(null); api.current?.resetView(); }}><RotateCcw size={17}/></button>
    </div>
    {active && <aside className="v-citymap-card"><button className="v-citymap-close" aria-label="Close" onClick={() => setActive(null)}><X size={16}/></button>
      <img src={active.image} alt=""/><div><span className="v-label">{active.cat} · {active.time} from AFRAH</span><h3>{active.name}</h3><p>{active.text}</p></div></aside>}
  </div>;
}
