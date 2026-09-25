import {Suspense,useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,MeshTransmissionMaterial} from '@react-three/drei';
import {createArchitecturalScene} from './scene';
import './lab.css';

const tests=['Architecture','Glass A/B/C','Stone','Metal','Window light','Cloud','Fog','Shadow','Atmosphere','Floor highlight','Reveal','HDRI','Post-processing'];
const customGlass=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{tint:{value:new T.Color('#b8c9cb')}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;uniform vec3 tint;void main(){float f=.04+.96*pow(1.-abs(dot(normalize(n),normalize(v))),5.);gl_FragColor=vec4(tint*(.65+f*.35),.14+f*.72);}`});
function GlassObjects({report}){
  const {gl,scene,camera}=useThree(),start=useRef(performance.now()),count=useRef(0),compiled=useRef(0);
  useEffect(()=>{const t=performance.now();gl.compileAsync(scene,camera).then(()=>compiled.current=performance.now()-t);},[]);
  useFrame(()=>{count.current++;const now=performance.now();if(now-start.current>1000){report({fps:Math.round(count.current*1000/(now-start.current)),drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,textureMiB:'~16',compileMs:Math.round(compiled.current),quality:'glass comparison'});count.current=0;start.current=now;}});
  return <><Environment files="/afrah/env/day.hdr"/><ambientLight intensity={.25}/><directionalLight position={[-3,5,6]} intensity={3}/>
    {[-3.4,0,3.4].map((x,i)=><group key={i} position={[x,0,0]}>
      <mesh position={[0,0,-.7]}><boxGeometry args={[2.6,3.6,.2]}/><meshStandardMaterial color="#b29b7d" roughness={.85}/></mesh>
      <mesh position={[-.45,-.9,-.1]}><boxGeometry args={[1.3,.7,.6]}/><meshStandardMaterial color="#615447"/></mesh>
      <mesh position={[.7,.5,-.2]}><boxGeometry args={[.18,1.8,.2]}/><meshStandardMaterial color="#ead4ad"/></mesh>
      <mesh position={[0,0,.35]}>{i===2?<planeGeometry args={[2.45,3.3]}/>:<boxGeometry args={[2.45,3.3,.018]}/>}
        {i===0?<meshPhysicalMaterial color="#bfcac8" transmission={.85} roughness={.12} ior={1.5} thickness={.018}/>:i===1?<MeshTransmissionMaterial transmissionSampler samples={4} transmission={.85} roughness={.12} thickness={.018} ior={1.5} chromaticAberration={0} distortion={0} temporalDistortion={0}/>:<primitive object={customGlass} attach="material"/>}
      </mesh>
      {[-1.28,0,1.28].map(a=><mesh position={[a,0,.4]} key={a}><boxGeometry args={[.06,3.5,.12]}/><meshStandardMaterial color="#50483e" metalness={.85} roughness={.34}/></mesh>)}
    </group>)}<mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.85,0]}><planeGeometry args={[50,50]}/><meshStandardMaterial color="#a7aaa3"/></mesh></>;
}

export default function Lab(){
  const host=useRef(),engine=useRef(),state=useRef({}),[test,setTest]=useState('Architecture'),[quality,setQuality]=useState('standard'),[dusk,setDusk]=useState(0),[progress,setProgress]=useState(0),[stats,setStats]=useState({}),[ready,setReady]=useState(false),[ao,setAo]=useState(false),[environment,setEnvironment]=useState('day');
  const capture=new URLSearchParams(location.search).has('capture'),[hidden,setHidden]=useState(capture);
  state.current={test,dusk,progress,ao};
  useEffect(()=>{
    if(test==='Glass A/B/C')return;
    setReady(false);let frame;const scene=createArchitecturalScene(host.current,{quality,lab:true,onReady:()=>setReady(true),onStats:setStats});engine.current=scene;
    const group=new T.Group(),sample=new T.Mesh(new T.BoxGeometry(8,12,1.2),scene.materials.stone);sample.position.set(0,6,0);group.add(sample);scene.scene.add(group);group.visible=false;
    const detailBack=new T.Mesh(new T.BoxGeometry(12,14,.4),scene.materials.dark);detailBack.position.set(0,7,-1.5);group.add(detailBack);
    const highlight=new T.Mesh(new T.BoxGeometry(37,.55,32),new T.MeshBasicMaterial({color:'#d0c09c',transparent:true,opacity:.27,depthWrite:false}));highlight.position.set(-12,82,-5);scene.scene.add(highlight);highlight.visible=false;
    const clip=new T.Plane(new T.Vector3(0,-1,0),180);scene.renderer.localClippingEnabled=true;
    function render(now){frame=requestAnimationFrame(render);if(window.__afrahLab?.manual)return;const s=state.current;
      scene.render({progress:s.progress,dusk:s.dusk,seconds:now*.001,intro:s.test==='Cloud'?.3:1,sample:({camera,hero,district})=>{
        const isolated=['Stone','Metal','Window light'].includes(s.test);group.visible=isolated;hero.root.visible=!isolated;scene.district.root.visible=!isolated;
        if(isolated){camera.position.set(16,11,28);camera.lookAt(0,6,0);sample.material=s.test==='Stone'?scene.materials.stone:s.test==='Metal'?scene.materials.metal:scene.materials.glass;detailBack.material=s.test==='Window light'?scene.materials.rooms[3]:scene.materials.dark;}
        highlight.visible=s.test==='Floor highlight';clip.constant=20+s.progress*160;
        hero.root.traverse(o=>{if(o.isMesh){const mats=[o.material].flat();mats.forEach(m=>{const active=s.test==='Reveal';if(Boolean(m.clippingPlanes?.length)!==active){m.clippingPlanes=active?[clip]:null;m.needsUpdate=true;}});}});
        if(s.test==='Fog')scene.scene.fog.far=700+s.progress*2200;
      }});
    }frame=requestAnimationFrame(render);
    window.__afrahLab={scene,manual:false,render:options=>{window.__afrahLab.manual=true;scene.render(options);},resume:()=>window.__afrahLab.manual=false};
    return()=>{cancelAnimationFrame(frame);scene.dispose();delete window.__afrahLab;};
  },[quality,test==='Glass A/B/C']);
  useEffect(()=>{engine.current?.post(ao);},[ao,quality]);
  useEffect(()=>{engine.current?.preset(environment);},[environment]);
  const screenshot=()=>{const canvas=host.current?.querySelector('canvas');if(!canvas)return;const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=`afrah-${test.toLowerCase().replaceAll(' ','-')}.png`;a.click();};
  return <main className={`afrah-lab ${hidden?'capture':''}`}>
    {!hidden&&<header><a href="/">AFRAH</a><div><strong>Architectural test lab</strong><span>Development only · measurements are from this device</span></div><button onClick={()=>setHidden(true)}>Hide UI</button><button onClick={screenshot}>Capture PNG ↗</button></header>}
    <div className="lab-stage" ref={host}>{test==='Glass A/B/C'&&<Canvas gl={{antialias:true,preserveDrawingBuffer:true}} camera={{position:[5,2,17],fov:36}}><Suspense fallback={null}><GlassObjects report={setStats}/></Suspense></Canvas>}</div>
    {!hidden&&<>
      {test==='Glass A/B/C'&&<div className="lab-glass-labels"><span>A · Three physical glass</span><span>B · Drei transmission</span><span>C · Custom Fresnel (limited)</span></div>}
      <aside className="lab-controls"><label>Test<select value={test} onChange={e=>setTest(e.target.value)}>{tests.map(t=><option key={t}>{t}</option>)}</select></label><label>Quality<select value={quality} onChange={e=>setQuality(e.target.value)}>{['high','standard','mobile'].map(t=><option key={t}>{t}</option>)}</select></label><label>Environment<select value={environment} onChange={e=>setEnvironment(e.target.value)}>{['day','overcast','golden','blue','night'].map(t=><option key={t}>{t}</option>)}</select></label><label>Day → blue hour<input type="range" min="0" max="1" step=".01" value={dusk} onChange={e=>setDusk(+e.target.value)}/></label><label>Camera / reveal<input type="range" min="0" max="1" step=".01" value={progress} onChange={e=>setProgress(+e.target.value)}/></label><label className="lab-check"><input type="checkbox" checked={ao} onChange={e=>setAo(e.target.checked)}/>GTAO comparison</label></aside>
      <footer>{[['FPS',stats.fps],['Draw calls',stats.drawCalls],['Triangles',stats.triangles?.toLocaleString()],['Texture MiB (estimate)',stats.textureMiB],['Compile / warmup ms',stats.compileMs]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v??'—'}</strong></div>)}<p>{ready?'Scene ready':'Preparing scene'} · texture estimate excludes driver overhead and render targets.</p></footer>
    </>}
    {hidden&&!capture&&<button className="lab-show" onClick={()=>setHidden(false)}>Show lab controls</button>}
  </main>;
}
