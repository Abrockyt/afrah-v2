import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createMaterials} from './materials';
import {createAfrah} from './building';
import {createOpening,createTunnel,createObject,createGallery} from './spaces';

const clamp=T.MathUtils.clamp,smooth=T.MathUtils.smootherstep;
const vec=(x,y,z)=>new T.Vector3(x,y,z);
const buildingPath=new T.CatmullRomCurve3([vec(0,1,-18),vec(12,3,-20),vec(8,2,-31),vec(9,9,-28)]);
const buildingLook=new T.CatmullRomCurve3([vec(0,0,-42),vec(0,.5,-42),vec(-.7,1.8,-42),vec(0,1.5,-42)]);

export default function World({signal,floor,onFloor,onHover,route,onReady,fallbackScene}){
  const host=useRef(),selected=useRef(floor),[error,setError]=useState(false);selected.current=floor;
  useEffect(()=>{
    const el=host.current,mobile=matchMedia('(max-width: 760px)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let r;try{r=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:import.meta.env.DEV});}catch{setError(true);onReady();return;}
    r.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.5));r.setSize(innerWidth,innerHeight);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=.82;r.shadowMap.enabled=!mobile;r.shadowMap.type=T.PCFSoftShadowMap;el.appendChild(r.domElement);
    const scene=new T.Scene();scene.background=new T.Color('#0B0B0A');
    const camera=new T.PerspectiveCamera(mobile?49:38,innerWidth/innerHeight,.05,350);
    const m=createMaterials(r,mobile?'mobile':'standard'),opening=createOpening(m,mobile),tunnel=createTunnel(m,mobile),object=createObject(m);
    scene.add(opening.root,tunnel.root,object.root);tunnel.root.visible=object.root.visible=false;
    const pmrem=new T.PMREMGenerator(r),room=new RoomEnvironment(),initialEnv=pmrem.fromScene(room,.04);room.dispose();scene.environment=initialEnv.texture;scene.environmentIntensity=.5;
    let disposed=false,hero,landscape,gallery,envTarget,hdr,loadStarted=false,heroReady=false,raf,last=performance.now(),sm=0,lastMode='',px=0,py=0,hover=-1,statsTime=performance.now(),frames=0;
    const key=new T.DirectionalLight('#f1ede5',2.7);key.position.set(-10,15,12);key.castShadow=!mobile;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-16,right:16,top:18,bottom:-18,near:.1,far:110});key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.0001;key.shadow.normalBias=.025;scene.add(key,key.target);
    const rim=new T.DirectionalLight('#cfb295',1.7);rim.position.set(12,5,-12);scene.add(rim);
    const fill=new T.HemisphereLight('#f1ede5','#0B0B0A',.12);scene.add(fill);
    const highlight=new T.Mesh(new T.BoxGeometry(36.8,3.55,31.8),new T.MeshBasicMaterial({color:'#98735B',transparent:true,opacity:.18,depthWrite:false}));highlight.visible=false;
    const floorPlanes=[];
    const boot=performance.now();
    m.ready.then(()=>{if(disposed)return;for(const mat of[opening.stone,tunnel.mat,object.mat]){mat.map=m.stone.map;mat.normalMap=m.stone.normalMap;mat.roughnessMap=m.stone.roughnessMap;mat.needsUpdate=true;}});
    new RGBELoader().load('/afrah/env/day.hdr',t=>{if(disposed){t.dispose();return;}hdr=t;t.mapping=T.EquirectangularReflectionMapping;envTarget=pmrem.fromEquirectangular(t);scene.environment=envTarget.texture;scene.environmentRotation.y=1.15;onReady();},undefined,()=>onReady());
    async function loadBuilding(){
      if(loadStarted)return;loadStarted=true;
      // Start the page immediately with native geometry; load architecture next.
      await m.ready;if(disposed)return;
      hero=createAfrah(m,mobile?'mobile':'standard');hero.root.scale.setScalar(.075);hero.root.position.set(0,-6,-42);scene.add(hero.root);hero.root.add(highlight);
      const floorGeo=new T.BoxGeometry(36,3.65,31),floorMat=new T.MeshBasicMaterial({visible:false});
      for(let n=1;n<=43;n++){const hit=new T.Mesh(floorGeo,floorMat);hit.position.set(-12,9.2+(n-.5)*3.65,-5);hit.userData.floor=n;hero.root.add(hit);floorPlanes.push(hit);}
      const ground=new T.Mesh(new T.PlaneGeometry(180,180),new T.MeshStandardMaterial({color:'#0e0e0c',roughness:.83,metalness:.1}));ground.material.transparent=true;ground.material.depthWrite=false;ground.material.onBeforeCompile=s=>{s.vertexShader='varying vec3 afGround;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nafGround=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='varying vec3 afGround;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=1.-smoothstep(5.,21.,length(afGround.xz-vec2(0.,-42.)));\n#include <opaque_fragment>');};ground.rotation.x=-Math.PI/2;ground.position.set(0,-5.98,-42);ground.receiveShadow=true;hero.root.parent.add(ground);hero.ground=ground;
      heroReady=true;
      new GLTFLoader().load('/afrah/models/tree.glb',g=>{if(disposed)return;landscape=new T.Group();g.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g.scene),height=bounds.max.y-bounds.min.y,obj=new T.Object3D();g.scene.traverse(source=>{if(!source.isMesh)return;const geo=source.geometry.clone().applyMatrix4(source.matrixWorld);geo.translate(0,-bounds.min.y,0);const mat=source.material.clone();mat.side=T.DoubleSide;mat.transparent=false;mat.alphaTest=.5;const n=mobile?6:10,trees=new T.InstancedMesh(geo,mat,n);for(let i=0;i<n;i++){const side=i%2?-1:1;obj.position.set(side*(3.6+(i%3)*.32),-5.96,-40-(i/2)*.65);obj.rotation.y=i*2.37;obj.scale.setScalar((.65+(i%4)*.1)/height);obj.updateMatrix();trees.setMatrixAt(i,obj.matrix);}landscape.add(trees);});scene.add(landscape);},undefined,()=>{});
    }
    const lazy=setTimeout(loadBuilding,180);
    const onMove=e=>{px=e.clientX/innerWidth-.5;py=e.clientY/innerHeight-.5;if(signal.current.mode!=='residences'||!hero)return;const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(px*2,-py*2),camera);const hit=ray.intersectObjects(floorPlanes,false)[0];const n=hit?.object.userData.floor??-1;if(n!==hover){hover=n;onHover(n);}};
    const onClick=e=>{if(signal.current.mode==='residences'&&hover>0&&!e.target.closest('button,a,input,select,label'))onFloor(hover);};
    addEventListener('pointermove',onMove);addEventListener('click',onClick);
    const resize=()=>{r.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<760?49:38;camera.updateProjectionMatrix();};addEventListener('resize',resize);
    const target=new T.Vector3(),pos=new T.Vector3();
    function render(now,override){
      const state=override||signal.current,mode=state.mode||'opening';
      if(mode==='none'){el.style.opacity='0';return;}el.style.opacity='1';
      const dt=Math.min((now-last)/1000,.05);last=now;
      r.shadowMap.autoUpdate=!['building','residences','finale'].includes(mode);if(lastMode!==mode){r.shadowMap.needsUpdate=true;sm=state.progress||0;lastMode=mode;}else sm=T.MathUtils.damp(sm,state.progress||0,4,dt);
      const p=override?state.progress:sm,time=reduced?0:now*.001;
      opening.root.visible=mode==='opening';tunnel.root.visible=mode==='tunnel';object.root.visible=mode==='object';
      const showBuilding=['building','residences','finale'].includes(mode)||(mode==='opening'&&p>.32);
      if(hero){hero.root.visible=showBuilding;hero.ground.visible=showBuilding;}if(landscape)landscape.visible=showBuilding;
      if(['object','gallery'].includes(mode)&&!gallery){gallery=createGallery();scene.add(gallery.root);}if(gallery)gallery.root.visible=mode==='gallery';
      scene.background.set('#0B0B0A');scene.fog=null;key.intensity=2.4;rim.intensity=1.6;fill.intensity=.12;scene.environmentIntensity=.38;r.toneMappingExposure=.88;key.castShadow=!mobile&&mode!=='gallery';
      highlight.visible=mode==='residences';
      if(mode==='opening'){
        opening.update(p,time,reduced);const a=smooth(p,.02,.78),through=smooth(p,.55,1);
        camera.position.set(7*(1-a)+(reduced?0:px*.15),2.7*(1-a)+through,12-30*through);
        target.set(0,.1,-7-35*through);camera.lookAt(target);
        key.position.set(-11,15,13);key.target.position.set(0,0,-4);rim.position.set(8,1,-17);key.intensity=2.6+p*.6;
        scene.environmentIntensity=.34;key.shadow.camera.far=110;
      }else if(['building','residences','finale'].includes(mode)){
        let k=mode==='building'?p:mode==='finale'?.21+p*.1:.14;
        buildingPath.getPoint(k,pos);buildingLook.getPoint(k,target);
        if(mode==='residences'){pos.set(mobile?8:8,mobile?8:1,mobile?-9:-18);target.set(mobile?0:6,mobile?-6:.2,-42);}
        camera.position.copy(pos);camera.lookAt(target);
        key.position.set(-16,17,-20);key.target.position.set(0,0,-42);rim.position.set(13,9,-47);key.intensity=mode==='finale'?1.5:2.6;rim.intensity=mode==='finale'?1.1:1.7;scene.environmentIntensity=mode==='finale'?.2:.38;
        m.update(mode==='finale'?1:.65);highlight.position.set(-12,9.2+((hover>0?hover:selected.current)-.5)*3.65,-5);
      }else if(mode==='tunnel'){
        const z=tunnel.update(p);camera.position.set(Math.sin(p*Math.PI)*.18,-.4,z);camera.lookAt(0,0,z-20);key.position.set(-2,6,z+7);key.target.position.set(0,0,z-14);key.intensity=1.35;rim.intensity=.1;scene.environmentIntensity=.12;fill.intensity=.08;r.toneMappingExposure=.8+p*.12;
        scene.fog=new T.Fog('#0B0B0A',28,115);if(p>.94)scene.background.set('#F1EDE5');
      }else if(mode==='object'){
        object.update(p,time,reduced);camera.position.set(mobile?1:5,2.4,16);camera.lookAt(0,0,0);key.position.set(-8,12,8);key.target.position.set(0,0,0);rim.position.set(8,2,-9);key.intensity=3.2;scene.environmentIntensity=.52;m.update(.3);
      }else if(mode==='gallery'){
        gallery.update(p,mobile);camera.position.set(0,0,mobile?22:15);camera.lookAt(0,0,-3);key.intensity=0;rim.intensity=0;key.castShadow=false;
      }
      r.render(scene,camera);frames++;
      if(import.meta.env.DEV&&now-statsTime>1000){window.__afrahMetrics={scene:mode,fps:Math.round(frames*1000/(now-statsTime)),drawCalls:r.info.render.calls,triangles:r.info.render.triangles,heroReady,canvasCount:document.querySelectorAll('canvas').length};frames=0;statsTime=now;}
    }
    function tick(now){raf=requestAnimationFrame(tick);if(document.hidden||window.__afrahCapture?.manual)return;render(now);}
    if(import.meta.env.DEV)window.__afrahCapture={manual:false,render:(mode,p=0)=>{window.__afrahCapture.manual=true;render(performance.now(),{mode,progress:p});},resume:()=>window.__afrahCapture.manual=false,get ready(){return heroReady;},canvas:r.domElement};
    raf=requestAnimationFrame(tick);
    return()=>{disposed=true;clearTimeout(lazy);cancelAnimationFrame(raf);removeEventListener('resize',resize);removeEventListener('pointermove',onMove);removeEventListener('click',onClick);gallery?.dispose();const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);[o.material].flat().filter(Boolean).forEach(v=>mats.add(v));});geos.forEach(g=>g.dispose());mats.forEach(v=>v.dispose());m.dispose();envTarget?.dispose();hdr?.dispose();initialEnv.dispose();pmrem.dispose();r.dispose();r.domElement.remove();if(import.meta.env.DEV)delete window.__afrahCapture;};
  },[]);
  return <div ref={host} className={`af-world ${error?'failed':''}`} aria-hidden="true">{error&&<img src={`/cinematic/images/${({building:'building',residences:'building',finale:'dusk',tunnel:'tunnel',gallery:'interior',object:'object'})[fallbackScene]||'opening'}.webp`} alt=""/>}</div>;
}

