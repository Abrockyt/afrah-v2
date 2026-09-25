import React from 'react';
import {useStage} from '../core/useStage';
import {setTheme} from '../core/store';

// The first chapter is the architectural arrival. The earlier rib opening
// remains immediately after it so the visitor encounters both film moments.
export default function Arrival(){
  const {runwayRef,stageRef}=useStage('arrival',{
    runway:4,
    build:(tl,{q})=>{
      tl.fromTo(q('.arrival__word'),{autoAlpha:0,y:28},{autoAlpha:1,y:0,duration:.14,ease:'power2.out'},.05)
        .to(q('.arrival__word'),{autoAlpha:0,y:-24,duration:.12},.67)
        .fromTo(q('.arrival__chapter'),{autoAlpha:0},{autoAlpha:1,duration:.1},.11)
        .to(q('.arrival__chapter'),{autoAlpha:0,duration:.1},.72)
        .fromTo(q('.arrival__next'),{autoAlpha:0},{autoAlpha:1,duration:.1},.18);
    },
    onProgress:()=>setTheme('dark'),
  });
  return <section className="runway" ref={runwayRef} id="arrival"><div className="stage stage--arrival" ref={stageRef}>
    <div className="stage__inner"><span className="arrival__chapter t-small">02 / THE ARRIVAL</span><h2 className="arrival__word">Down from<br/>the sky.<span>THE STREET / THE GATE / HOME</span></h2><a className="arrival__next t-small" href="#tower">See the building <b>↓</b></a></div>
  </div></section>;
}
