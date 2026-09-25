import {useMemo} from 'react';
import * as THREE from 'three';
import {Batch} from './Building';
const rand=n=>{let a=Math.sin(n*93.12)*41739;return a-Math.floor(a)};
const leafGeometry=new THREE.IcosahedronGeometry(1,0);
export default function Landscape(){
 const data=useMemo(()=>{
 const leaves=[],trunks=[],planters=[],pavers=[],lights=[];const trees=[];
 for(let i=0;i<26;i++){const edge=i%4,step=Math.floor(i/4);let x=edge<2?(edge===0?-33:33):-28+step*9;let z=edge<2?-25+step*9:(edge===2?-25:28);if(!(edge===3&&Math.abs(x)<13))trees.push([x,z,6+rand(i)*4]);}

 trees.slice(0,26).forEach(([x,z,h],i)=>{trunks.push({p:[x,h*.43,z],s:[.28,h*.85,.28],c:'#635f4d'});for(let j=0;j<140;j++){const a=rand(i*150+j)*Math.PI*2,r=Math.sqrt(rand(i*150+j+2))*2.8,dy=rand(i*150+j+4)*3.2;leaves.push({p:[x+Math.cos(a)*r,h-1+dy,z+Math.sin(a)*r],s:[.3+rand(j)*.65,.35+rand(j+4)*.7,.3+rand(j+7)*.65],r:[rand(j),rand(j+2),rand(j+3)],c:new THREE.Color().setHSL(.19+rand(i+j)*.045,.2+rand(i+2)*.15,.23+rand(j)*.12).getStyle()});}planters.push({p:[x,.15,z],s:[5,.3,5]});});
 for(let i=0;i<24;i++)pavers.push({p:[-17+i*1.5,.04,24],s:[1.4,.08,8]});
 for(let i=0;i<12;i++)lights.push({p:[-30+i*5.5,.55,29],s:[.15,1.1,.15]});
 // Planting on each of the three stepped terraces.
 for(let level=9;level<=11;level++){const w=46-(level-8)*4,d=28-(level-8)*4,y=4.8+(level-1)*3.25;for(let i=0;i<7;i++){let x=-w/2+2+i*(w-4)/6,z=d/2+.6;planters.push({p:[x,y+.5,z],s:[2,.8,.75]});for(let j=0;j<5;j++)leaves.push({p:[x+(rand(j)-.5)*1.5,y+1.1+rand(j)*.35,z],s:[.55,.5,.5],c:'#596746'});}}
 return {leaves,trunks,planters,pavers,lights};
 },[]);
 const materials=useMemo(()=>({leaf:new THREE.MeshStandardMaterial({color:'#52623a',roughness:1}),trunk:new THREE.MeshStandardMaterial({roughness:1}),planter:new THREE.MeshStandardMaterial({color:'#656852',roughness:1}),paving:new THREE.MeshStandardMaterial({color:'#c8c2b5',roughness:.9}),metal:new THREE.MeshStandardMaterial({color:'#363931',roughness:.5})}),[]);
 return <group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.2,0]} receiveShadow><planeGeometry args={[2000,2000]}/><meshStandardMaterial color="#b9b9a6" roughness={1}/></mesh>
  <mesh position={[0,-.12,0]} receiveShadow><boxGeometry args={[83,.15,70]}/><meshStandardMaterial color="#bcb4a3" roughness={1}/></mesh>
  <mesh position={[0,-.03,-3]} receiveShadow><boxGeometry args={[61,.12,48]}/><meshStandardMaterial color="#959c7b" roughness={1}/></mesh>
  <mesh position={[0,0,2]} receiveShadow><boxGeometry args={[51,.12,36]}/><meshStandardMaterial color="#c5bdad" roughness={1}/></mesh>
  <Batch items={data.leaves} material={materials.leaf} geometry={leafGeometry}/>
  <Batch items={data.trunks} material={materials.trunk}/><Batch items={data.planters} material={materials.planter}/><Batch items={data.pavers} material={materials.paving}/><Batch items={data.lights} material={materials.metal}/>
 </group>;
}
