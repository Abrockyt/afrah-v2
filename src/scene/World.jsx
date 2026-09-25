import {Suspense,useEffect,useRef,useMemo,Component} from 'react';
import {Canvas,useFrame,useThree,useLoader} from '@react-three/fiber';
import {Environment} from '@react-three/drei';
import * as THREE from 'three';
import Building from './Building';
import Landscape from './Landscape';

const day=new THREE.Color('#e3e2d8'),dusk=new THREE.Color('#364452');
function Scene({state,onReady,selected,onSelect}){
 const {camera,scene,gl,size}=useThree(),sun=useRef(),ambient=useRef(),fill=useRef();
 const progress=useRef({reveal:0,atmosphere:0});const start=useRef(null);const target=new THREE.Vector3();
 useEffect(()=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1;gl.localClippingEnabled=true;gl.shadowMap.type=THREE.PCFSoftShadowMap;onReady();},[gl]);
 useFrame(({clock},delta)=>{
  if(start.current===null)start.current=clock.elapsedTime;
  const t=clock.elapsedTime-start.current,s=state.current,p=s.progress;
  const reduced=s.reduced;progress.current.reveal=reduced?1:Math.min(1,Math.max(t/3.4,.08+p*1.8));
  const mode=s.mode==='auto'?(s.section==='light'?THREE.MathUtils.smoothstep(p,.54,.96):s.section==='afterdark'?1:0):s.mode==='dusk'?1:0;
  const atmosphere=mode;
  progress.current.atmosphere=THREE.MathUtils.damp(progress.current.atmosphere,atmosphere,reduced?100:2.1,delta);
  const a=progress.current.atmosphere;gl.toneMappingExposure=1-a*.25;
  scene.background=day.clone().lerp(dusk,a);scene.fog.color.copy(scene.background);scene.environmentIntensity=1-a*.9;scene.environmentRotation.y=.2+a*.35;
  sun.current.intensity=2.3-a*2.27;sun.current.color.setRGB(1,1-a*.21,1-a*.38);sun.current.position.set(50-a*75,70-a*53,40);ambient.current.intensity=.7-a*.59;fill.current.intensity=.4-a*.29;
  const mobile=size.width<1000;let pos,look;
  if(s.section==='residences'){pos=mobile?[114,64,154]:[110,53,133];look=mobile?[0,30,0]:[3,30,0];}
  else if(s.section==='place'){pos=mobile?[125,175,185]:[90,140,140];look=mobile?[0,45,0]:[-28,5,0];}
  else if(s.section==='afterdark'){pos=mobile?[66,43,98]:[68,31,85];look=mobile?[0,21,0]:[-3,20,0];}
  else if(s.section==='enter'){pos=mobile?[0,5,37]:[10,6,37];look=[0,3,12];}
  else if(s.section==='architecture'){pos=mobile?[110,72,160]:[80,52,120];look=mobile?[0,38,0]:[25,23,0];}
  else if(s.section==='light'){pos=mobile?[114,68,165]:[90,43,110];look=mobile?[0,38,0]:[-18,23,0];}
  else {const orbit=THREE.MathUtils.smoothstep(p,.06,.53);pos=mobile?[122-orbit*15,66+orbit*7,172-orbit*15]:[90-orbit*20,43+orbit*9,106+orbit*5];look=mobile?[0,38,0]:[-18+orbit*26,23,0];}
  let mouse=reduced?0:(s.pointerX||0)*1.5;target.set(pos[0]+mouse,pos[1],pos[2]);camera.position.lerp(target,reduced?1:Math.min(1,delta*2.8));target.set(...look);camera.lookAt(target);camera.fov=mobile?43:37;camera.updateProjectionMatrix();
  if(import.meta.env.DEV){window.__AFRAH_SCENE__={triangles:gl.info.render.triangles,calls:gl.info.render.calls,atmosphere:a,reveal:progress.current.reveal,camera:camera.position.toArray(),section:s.section};}
 });
 return <>
  <fog attach="fog" args={['#e3e2d8',130,360]}/>
  <hemisphereLight ref={ambient} args={['#e4e9f0','#787464',1]}/>
  <directionalLight ref={sun} position={[50,70,40]} intensity={3.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={70} shadow-camera-bottom={-65} shadow-camera-near={1} shadow-camera-far={220} shadow-bias={-.0002} shadow-normalBias={.05}/>
  <directionalLight ref={fill} position={[-40,30,-30]} intensity={.6} color="#bbcadc"/>
  <Suspense fallback={null}><Environment files="/media/environment.hdr" background={false}/></Suspense>
  <Building progress={progress} selected={selected} onSelect={onSelect} interactive={state.current.section==='residences'}/>
  <Landscape/>
 </>;
}
class SceneBoundary extends Component {state={error:false};static getDerivedStateFromError(){return {error:true}}componentDidCatch(){this.props.onFallback()}render(){return this.state.error?<div className="scene-fallback"/>:this.props.children}}
export default function World({state,onReady,selected,onSelect,active=true}){
 return <SceneBoundary onFallback={onReady}><Canvas frameloop={active?'always':'never'} shadows dpr={[1,1.5]} camera={{position:[76,39,92],fov:37,near:.1,far:1500}} gl={{antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true}} fallback={<div className="scene-fallback"/>} onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',onReady)}}><Scene state={state} onReady={onReady} selected={selected} onSelect={onSelect}/></Canvas></SceneBoundary>;
}
