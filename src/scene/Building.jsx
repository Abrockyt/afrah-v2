import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';

const boxGeometry=new THREE.BoxGeometry(1,1,1);
const dummy=new THREE.Object3D();
const seeded=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
export const floorBase=i=>i===0?0:4.8+(i-1)*3.25;
export const floorSize=i=>{const s=Math.max(0,i-8)*2;return [46-s*2,28-s*2]};

export function Batch({items,material,geometry=boxGeometry,cast=true}){
 const ref=useRef();
 useLayoutEffect(()=>{items.forEach((v,i)=>{dummy.position.set(...v.p);dummy.scale.set(...v.s);dummy.rotation.set(...(v.r||[0,0,0]));dummy.updateMatrix();ref.current.setMatrixAt(i,dummy.matrix);if(v.c)ref.current.setColorAt(i,new THREE.Color(v.c));});ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;ref.current.computeBoundingSphere();},[items,geometry,material]);
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} castShadow={cast} receiveShadow frustumCulled={false}/>;
}

function stoneTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){let i=(y*256+x)*4;let n=seeded(x+y*256)*13+Math.sin(y*.19+Math.sin(x*.02))*2;data.data[i]=218+n;data.data[i+1]=209+n;data.data[i+2]=194+n;data.data[i+3]=255;}
 ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function createMaterials(){
 const map=stoneTexture();
 return {stone:new THREE.MeshStandardMaterial({map,color:'#e0d7c7',roughness:.78}),slab:new THREE.MeshStandardMaterial({color:'#d1c5af',roughness:.72}),metal:new THREE.MeshStandardMaterial({color:'#413c34',roughness:.35,metalness:.75}),glass:new THREE.MeshPhysicalMaterial({color:'#79959e',roughness:.15,metalness:.38,transparent:true,opacity:.55,envMapIntensity:1.4,clearcoat:1,clearcoatRoughness:.08}),interior:new THREE.MeshStandardMaterial({color:'#777b74',roughness:.85,emissive:'#e7b375',emissiveIntensity:0}),curtain:new THREE.MeshStandardMaterial({color:'#c8bea6',roughness:1,emissive:'#ecc8a0',emissiveIntensity:0}),floor:new THREE.MeshStandardMaterial({color:'#aba18c',roughness:.9}),wood:new THREE.MeshStandardMaterial({color:'#7c5a3e',roughness:.75}),leaves:new THREE.MeshStandardMaterial({color:'#616b42',roughness:1})};
}

function Floor({level,materials,progress,selected,onSelect,interactive}){
 const group=useRef(),slabMat=useMemo(()=>materials.slab.clone(),[materials]);
 const sets=useMemo(()=>{
  const [w,d]=floorSize(level),h=level===0?4.8:level===11?3.75:3.25;const g={stone:[],slab:[],metal:[],glass:[],interior:[],lit:[],curtain:[],wood:[]};
  const add=(key,p,s,c)=>g[key].push({p,s,c});
  add('slab',[0,.18,0],[w+1.8,.36,d+1.8]);add('slab',[0,h-.13,0],[w+1.6,.26,d+1.6]);
  add('stone',[0,h/2,0],[10,h,7]);
  const nx=Math.round(w/4.5),nz=Math.round(d/4.5),bayX=w/nx,bayZ=d/nz;
  for(const side of [-1,1]){
   for(let j=0;j<nx;j++){
    let x=-w/2+bayX*(j+.5),z=side*(d/2-.5),seed=level*60+j+(side+1)*7;
    add('glass',[x,h/2,z],[bayX-.42,h-.65,.1]);add(seeded(seed)>.63?'lit':'interior',[x,h/2,z-side*.35],[bayX-.48,h-.7,.1]);
    if(seeded(seed+5)>.45)add('curtain',[x-bayX*.28,h/2,z-side*.2],[bayX*.22,h-.72,.1]);
    for(const dx of [-bayX/2,0,bayX/2])add('metal',[x+dx,h/2,z+side*.06],[.065,h-.32,.13]);
    add('metal',[x,h*.64,z+side*.08],[bayX-.36,.065,.14]);
   }
   for(let j=0;j<=nx;j++)add('stone',[-w/2+j*bayX,h/2,side*d/2],[.42,h,.65]);
   if(level>0){
    add('metal',[0,1.3,side*(d/2+.65)],[w,.06,.06]);
    for(let j=0;j<=nx*5;j++)add('metal',[-w/2+w*j/(nx*5),.82,side*(d/2+.65)],[.045,.96,.045]);
   }
   for(let j=0;j<nz;j++){
    let z=-d/2+bayZ*(j+.5),x=side*(w/2-.5);
    add('glass',[x,h/2,z],[.1,h-.65,bayZ-.42]);add(seeded(j+level*8)>.63?'lit':'interior',[x-side*.35,h/2,z],[.1,h-.7,bayZ-.48]);
    for(const dz of [-bayZ/2,0,bayZ/2])add('metal',[x+side*.06,h/2,z+dz],[.13,h-.32,.065]);
   }
   for(let j=0;j<=nz;j++)add('stone',[side*w/2,h/2,-d/2+j*bayZ],[.65,h,.42]);
   if(level>0){add('metal',[side*(w/2+.65),1.3,0],[.06,.06,d]);for(let j=0;j<=nz*5;j++)add('metal',[side*(w/2+.65),.82,-d/2+d*j/(nz*5)],[.045,.96,.045]);}
  }
  if(level>=9){for(let j=0;j<6;j++)add('wood',[-w/2+(j+.5)*w/6,.56,d/2+.22],[2,.65,.65]);}
  return g;
 },[level]);
 useFrame((_,delta)=>{
  const r=progress.current.reveal;const threshold=(level/12)*.8;const amount=THREE.MathUtils.clamp((r-threshold)/.2,0,1);
  group.current.visible=amount>.001;group.current.scale.y=1;group.current.position.y=floorBase(level);
  slabMat.color.lerp(new THREE.Color(selected===level?'#98735b':'#d1c5af'),Math.min(1,delta*7));slabMat.emissive.set(selected===level?'#98735b':'#000000');slabMat.emissiveIntensity=selected===level?.16:0;
 });
 return <group ref={group} onPointerOver={interactive?e=>{e.stopPropagation();onSelect(level)}:undefined} onClick={interactive?e=>{e.stopPropagation();onSelect(level)}:undefined}>
  {Object.entries(sets).map(([key,items])=><Batch key={key} items={items} material={key==='slab'?slabMat:materials[key]} cast={key!=='glass'&&key!=='interior'&&key!=='curtain'}/>)}
 </group>;
}

export default function Building({progress,selected,onSelect,interactive}){
 const materials=useMemo(()=>({...createMaterials(),lit:new THREE.MeshStandardMaterial({color:'#b3a58c',roughness:.8,emissive:'#ffd09a',emissiveIntensity:0})}),[]);
 const clip=useMemo(()=>new THREE.Plane(new THREE.Vector3(0,-1,0),0),[]);
 useMemo(()=>{Object.values(materials).forEach(m=>{m.clippingPlanes=[clip];m.clipShadows=true;});materials.interior.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance *= pow(vColor.r, 3.0);\n#endif');};},[materials,clip]);
 useFrame(()=>{clip.constant=progress.current.reveal*45;const a=progress.current.atmosphere;materials.lit.emissiveIntensity=a*2.4;materials.interior.emissiveIntensity=0;materials.curtain.emissiveIntensity=a*.15;materials.glass.opacity=.48-a*.2;materials.glass.color.setRGB(.42-a*.19,.52-a*.2,.56-a*.16);materials.glass.envMapIntensity=1.3-a*.9;});
 return <group>
  {Array.from({length:12},(_,i)=><Floor key={i} level={i} materials={materials} progress={progress} selected={selected} onSelect={onSelect} interactive={interactive}/>)}
  <mesh position={[0,41.25,0]} castShadow receiveShadow material={materials.stone}><boxGeometry args={[35.2,.4,17.2]}/></mesh>
  <mesh position={[0,42,0]} castShadow material={materials.metal}><boxGeometry args={[12,1.1,7]}/></mesh>
  <mesh position={[0,4.25,17]} castShadow material={materials.stone}><boxGeometry args={[13,.45,7]}/></mesh>
  <mesh position={[-5.8,2.1,19.5]} castShadow material={materials.metal}><boxGeometry args={[.15,4.2,.15]}/></mesh>
  <mesh position={[5.8,2.1,19.5]} castShadow material={materials.metal}><boxGeometry args={[.15,4.2,.15]}/></mesh>
  <mesh position={[0,.25,18]} receiveShadow material={materials.slab}><boxGeometry args={[15,.3,10]}/></mesh>
 </group>;
}
