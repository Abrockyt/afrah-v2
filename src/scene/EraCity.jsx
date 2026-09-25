import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

// ERA's public line models; only geometry is reused. Rendering and timing are local.
const cache=new Map();
async function geometry(index){
 if(cache.has(index))return cache.get(index);
 const promise=fetch(`/era/city-${index}.obj`).then(r=>{if(!r.ok)throw Error('Model unavailable');return r.text()}).then(text=>{
  const vertices=[],segments=[];
  for(const line of text.split('\n')){const parts=line.trim().split(/\s+/);if(parts[0]==='v')vertices.push(parts.slice(1,4).map(Number));if(parts[0]==='l'){const ids=parts.slice(1).map(n=>Number(n)-1);for(let i=1;i<ids.length;i++)segments.push(...vertices[ids[i-1]],...vertices[ids[i]]);}}
  return new Float32Array(segments);
 });cache.set(index,promise);return promise;
}
export default function EraCity({intro=false,onReady=()=>{},onProgress=()=>{},rotation=0,zoom=1,monochrome=false}){
 const host=useRef(),controls=useRef({rotation,zoom});controls.current={rotation,zoom};
 useEffect(()=>{
  let disposed=false,raf,renderer;const meshes=[];const element=host.current;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{onReady();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x051936,0);element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.01,100),group=new THREE.Group();scene.add(group);
  scene.fog=new THREE.FogExp2('#051936',.055);const start=performance.now();let loaded=0;
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(800,600),.65,.6,.4);composer.addPass(bloom);composer.addPass(new OutputPass());
  const resize=()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  Promise.all([1,2,3,4,5].map(async(index)=>{const positions=await geometry(index);if(disposed)return;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));const mat=new THREE.LineBasicMaterial({color:monochrome?(index<3?'#eeedeb':'#888888'):(index<3?'#ffd08a':'#ba8467'),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});const line=new THREE.LineSegments(geo,mat);group.add(line);meshes.push({line,index,count:positions.length/3});onProgress(++loaded/5); })).then(()=>{if(!disposed)onReady()}).catch(()=>{if(!disposed)onReady()});
  let smoothRotation=controls.current.rotation,smoothZoom=controls.current.zoom,last=performance.now();let pointer=0;const move=e=>{pointer=(e.clientX/innerWidth-.5)*.15};if(!intro)element.addEventListener('pointermove',move);
  const render=()=>{
   if(disposed)return;const t=(performance.now()-start)/1000;const progress=intro?Math.min(1,t/3.8):1;
   meshes.forEach(({line,index,count})=>{line.material.opacity=(index<3?.95:.25)*Math.min(1,t/1.5);line.geometry.setDrawRange(0,Math.floor(count*progress/2)*2)});
   const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;smoothRotation=THREE.MathUtils.damp(smoothRotation,controls.current.rotation,6,dt);smoothZoom=THREE.MathUtils.damp(smoothZoom,controls.current.zoom,6,dt);const mobile=element.clientWidth<700;const z=(intro?THREE.MathUtils.lerp(4.5,8.8,Math.min(1,t/6)):9.8)/smoothZoom;
   const angle=smoothRotation+(intro?-.18+Math.min(t,7)*.035:pointer);camera.position.set(.8+Math.sin(angle)*z,intro?2.2+Math.min(t,6)*.15:4.3,Math.cos(angle)*z+(mobile?3:0));camera.lookAt(.4,1.05,-1.1);composer.render();raf=requestAnimationFrame(render);
  };render();
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();element.removeEventListener('pointermove',move);meshes.forEach(({line})=>{line.geometry.dispose();line.material.dispose()});composer.passes.forEach(pass=>pass.dispose?.());composer.dispose();renderer.dispose();renderer.domElement.remove()};
 },[intro,monochrome]);
 return <div ref={host} className="era-city" aria-label="Architectural city model"/>;
}
