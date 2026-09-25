import React from 'react';
import {useStage} from '../core/useStage';
import {setTheme} from '../core/store';

// The first chapter is the architectural arrival. The earlier rib opening
// remains immediately after it so the visitor encounters both film moments.
export default function Arrival(){
  const {runwayRef,stageRef}=useStage('arrival',{
    runway:2.6,
    build:(tl,{q})=>{
      tl.fromTo(q('.arrival__word'),{autoAlpha:0,y:28},{autoAlpha:1,y:0,duration:.14,ease:'power2.out'},.05)
        .to(q('.arrival__word'),{autoAlpha:0,y:-24,duration:.12},.67)
        .fromTo(q('.arrival__chapter'),{autoAlpha:0},{autoAlpha:1,duration:.1},.11)
        .to(q('.arrival__chapter'),{autoAlpha:0,duration:.1},.72)
        .fromTo(q('.arrival__next'),{autoAlpha:0},{autoAlpha:1,duration:.1},.18);
    },
    onProgress:()=>setTheme('light'),
  });
  return <section className="runway" ref={runwayRef} id="arrival"><div className="stage stage--arrival" ref={stageRef}>
    <div className="stage__inner"><span className="arrival__chapter t-small">01 / THE ARRIVAL</span><h2 className="arrival__word">A new<br/>perspective.<span>FORM / LIGHT / LIFE</span></h2><a className="arrival__next t-small" href="#introduction">Enter the story <b>↓</b></a></div>
  </div></section>;
}
