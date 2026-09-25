import {useEffect,useRef,useState} from 'react';
import {createArchitecturalScene} from './afrah/scene';

export default function CityFlight({progress,introDone=true,onReady,onIntroEnd,lighting='auto',quality='standard',replay=0}){
  const host=useRef(),latest=useRef({introDone,lighting}),[failed,setFailed]=useState(false),[live,setLive]=useState(false),[playing,setPlaying]=useState(false),[ended,setEnded]=useState(false),video=useRef(),[videoFailed,setVideoFailed]=useState(false);
  latest.current={introDone,lighting};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(()=>{
    setLive(false);setFailed(false);let disposed=false,raf,scene,sm=0,dusk=0,last=performance.now(),visible=true;
    try{scene=createArchitecturalScene(host.current,{quality,onReady:()=>{if(!disposed){setLive(true);onReady?.();}},onError:()=>{if(!disposed)setFailed(true);}});}
    catch{setFailed(true);onReady?.();return;}
    const io=new IntersectionObserver(([e])=>visible=e.isIntersecting);io.observe(host.current);
    const loop=now=>{raf=requestAnimationFrame(loop);if(!visible||document.hidden)return;const dt=Math.min(.05,(now-last)/1000);last=now;sm+=(progress.current-sm)*(1-Math.exp(-dt*4));
      const mode=latest.current.lighting,target=mode==='day'?0:mode==='dusk'?1:Math.max(0,Math.min(1,(sm-.46)/.42));dusk+=(target-dusk)*(1-Math.exp(-dt*2));
      scene.render({progress:reduced?0:sm,dusk,seconds:reduced?0:now*.001});};raf=requestAnimationFrame(loop);
    return()=>{disposed=true;cancelAnimationFrame(raf);io.disconnect();scene.dispose();};
  },[quality]);
  const complete=()=>{setEnded(true);setPlaying(false);onIntroEnd?.();};
  useEffect(()=>{if(reduced){complete();return;}setEnded(false);setPlaying(false);if(video.current)video.current.currentTime=0;},[replay]);
  useEffect(()=>{if(introDone&&!ended&&!reduced&&video.current)video.current.play().then(()=>setPlaying(true)).catch(complete);},[introDone,ended,replay]);
  useEffect(()=>{if(progress.current>.025&&!ended)complete();});
  return <>
    <div ref={host} className={`v-flight ${failed?'no-webgl':''}`} role="img" aria-label="Original Afrah limestone residences, recessed bronze glazing and planted terraces above a landscaped city"/>
    {!reduced&&!videoFailed&&<video ref={video} className={`afrah-intro-video ${ended?'is-ended':''}`} src="/afrah/intro/arrival.webm" poster="/afrah/intro/arrival-start.webp" muted playsInline preload="auto" onEnded={complete} onError={()=>{setVideoFailed(true);complete();}} aria-hidden="true"/>}
    {((ended&&!live)||failed)&&<img className="afrah-intro-bridge" src="/afrah/intro/arrival-end.webp" alt="Afrah residences in architectural daylight"/>}
    {introDone&&playing&&!ended&&<button className="afrah-skip-film" onClick={complete}>Skip arrival ↗</button>}
    {failed&&<div className="afrah-scene-fallback">Architectural view <button onClick={()=>location.reload()}>Retry 3D</button></div>}
  </>;
}
