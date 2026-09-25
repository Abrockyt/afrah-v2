import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Public Composites geometry, independently lit and choreographed for AFRAH.
export default function CompositeSculpture({progress,tone='copper',variant='shape'}){
 const host=useRef();
 useEffect(()=>{
  const el=host.current;let renderer,model,frame,disposed=false,visible=false,last=performance.now(),smooth=0;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'})}catch{return}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x051936,0);el.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100),group=new THREE.Group();scene.add(group);
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;studio.dispose();pmrem.dispose();
  const material=new THREE.MeshStandardMaterial({color:tone==='silver'?'#c6c5c3':'#cf8f7d',metalness:.7,roughness:.3,envMapIntensity:1.4,side:THREE.DoubleSide});
  const draco=new DRACOLoader().setDecoderPath('/composites/draco/');const loader=new GLTFLoader().setDRACOLoader(draco);
  loader.load(`/composites/${variant}.glb`,g=>{if(disposed){g.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});return}model=g.scene;const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());model.position.sub(center);const size=box.getSize(new THREE.Vector3());const scale=11.58/size.y;model.scale.multiplyScalar(scale);model.position.multiplyScalar(scale);model.traverse(o=>{if(o.isMesh){o.material.dispose();o.material=material}});group.add(model);el.classList.add('model-ready')},undefined,()=>{});
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();
  let pointerX=0,pointerY=0;const pointer=e=>{const r=el.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5};el.addEventListener('pointermove',pointer);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const render=now=>{frame=requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden)return;smooth=THREE.MathUtils.damp(smooth,progress.current,5,dt);const mobile=el.clientWidth<700;
   group.rotation.set((variant==='tunnel'?Math.PI/2:.15)+smooth*.5+(reduced?0:pointerY*.06),smooth*Math.PI*1.5+(reduced?0:pointerX*.16),-.32+smooth*.55);group.position.set(mobile?0:1.8,Math.sin(smooth*Math.PI)*.4,0);
   const size=1+Math.sin(smooth*Math.PI)*.3;group.scale.setScalar(size);camera.position.set(0,1, mobile?26:22-smooth*4);camera.lookAt(0,0,0);renderer.render(scene,camera);
  };
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting},{rootMargin:'100px'});io.observe(el);frame=requestAnimationFrame(render);
  if(reduced){pointerX=0;pointerY=0}
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();el.removeEventListener('pointermove',pointer);model?.traverse(o=>o.geometry?.dispose());material.dispose();environment.dispose();draco.dispose();renderer.dispose();renderer.domElement.remove()};
 },[progress,tone,variant]);
 return <div ref={host} className="composite-canvas" aria-hidden="true"/>;
}
