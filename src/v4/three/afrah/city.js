import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {batchBuilder,seeded,qualityPresets} from './materials';

export const cityFamilies=['Limestone apartments','Brick courtyard','Glass office','Terraced residences','Townhouses','Retail podium','Civic hall','Warehouse conversion','Hotel','Corner offices','Parking court','Gallery'];
function facadeAtlas(family,night=false){
  const c=document.createElement('canvas');c.width=512;c.height=1024;const ctx=c.getContext('2d');
  const colors=['#a79f91','#8b7061','#829193','#b1aa9e','#b8ae9b','#858b85','#b6b3a8','#9b8b78','#aaa18f','#7b878b','#9c9d97','#c0bbaf'];
  ctx.fillStyle=night?'#000':colors[family];ctx.fillRect(0,0,512,1024);
  const cols=family===2||family===9?10:7,rows=24,bw=512/cols,bh=1024/rows;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const r=seeded(family*200+x*13+y*19),lit=(family===2?r>.42:r>.67);
    ctx.fillStyle=night?(lit?['#9b744c','#dcb785','#675037'][Math.floor(r*3)%3]:'#000'):['#535e5f','#637071','#77817e','#3f4d50'][Math.floor(r*4)];
    ctx.fillRect(x*bw+9,y*bh+8,bw-18,bh-16);
    if(!night){ctx.fillStyle='rgba(230,231,213,.24)';ctx.fillRect(x*bw+10,y*bh+9,bw-20,3);ctx.fillStyle='rgba(18,24,26,.32)';ctx.fillRect(x*bw+8,y*bh+bh-8,bw-16,3);ctx.fillRect(x*bw+bw/2,y*bh+8,1,bh-16);}
  }
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}

export function createDistrict(m,quality='standard'){
  const root=new T.Group();root.name='AFRAH original district / 12 families';const blocks=[],cityMaterials=[];
  const b=batchBuilder(root),limit=qualityPresets[quality].city;
  b.box(m.soil,0,-1.2,0,5800,2,5800);
  b.box(m.paving,5,-.02,-5,170,.25,152);
  // Two principal avenues and a regular, walkable block network.
  for(let k=-limit;k<=limit;k++){
    const v=k*115+83;
    b.box(m.road,v,-.14,0,18,.12,3500);b.box(m.road,0,-.12,v,3500,.12,18);
    b.box(m.paving,v-10.2,.02,0,2.5,.28,3500);b.box(m.paving,0,.02,v-10.2,3500,.28,2.5);
  }
  const lane=new T.MeshStandardMaterial({color:'#c5bda4',roughness:.95});
  const lamps=[];
  for(let i=-14;i<=14;i++){
    const z=i*24;
    b.box(lane,83,.025,z,.12,.025,7);b.box(lane,z,.025,83,7,.025,.12);
    if(i%2===0){
      b.box(m.metal,71,4,z,.14,8,.14);b.box(m.metal,73,8,z,4,.14,.15);b.box(m.practical,74.3,7.87,z,1,.08,.5);
      lamps.push([74.3,7.4,z]);
    }
  }
  for(const x of[-32,64,101])for(let i=0;i<7;i++)b.box(lane,x+i*1.3,.03,83,.65,.025,12);
  // Planted forecourt islands with stone edging and benches.
  for(const[x,z,w,d]of[[-54,20,22,55],[42,38,32,14],[8,-66,60,15],[-48,-48,20,20]]){
    b.box(m.stone,x,.24,z,w,.45,d);b.box(m.soil,x,.49,z,w-.65,.07,d-.65);
    b.box(m.metal,x,.85,z+d/2+2,w*.55,.4,1.1);
  }
  b.finish();
  const unit=new T.BoxGeometry(1,1,1),matrix=new T.Object3D();
  for(let family=0;family<12;family++){
    const map=facadeAtlas(family),emissiveMap=facadeAtlas(family,true);
    const mat=new T.MeshStandardMaterial({map,emissiveMap,emissive:'#ffd7a0',emissiveIntensity:0,roughness:family===2?.35:.87,metalness:family===2?.3:0});cityMaterials.push(mat);
    const positions=[];
    for(let ix=-limit;ix<=limit;ix++)for(let iz=-limit;iz<=limit;iz++){
      const n=(ix+limit)*(limit*2+1)+iz+limit;
      if(n%12!==family)continue;
      const x=ix*115+25,z=iz*115+25;if(Math.hypot(x,z)<155)continue;
      const rnd=seeded(n+92),w=33+rnd*31,d=29+seeded(n+31)*28;
      let h=family===4?13+12*rnd:family===6?21:family===10?15:23+seeded(n+29)*65;
      if(Math.hypot(x,z)<280)h*=.65;
      positions.push({x,z,w,d,h,n});
    }
    const body=new T.InstancedMesh(unit,mat,positions.length),details=new T.Group(),db=batchBuilder(details);
    positions.forEach(({x,z,w,d,h,n},i)=>{
      matrix.position.set(x,h/2,z);matrix.scale.set(w,h,d);matrix.rotation.y=0;matrix.updateMatrix();body.setMatrixAt(i,matrix.matrix);body.setColorAt(i,new T.Color().setHSL(.09+seeded(n)*.06,.04+seeded(n+1)*.04,.72+seeded(n+2)*.25));
      // Roof mechanicals, parapets, setbacks and shopfronts vary by family.
      if(Math.hypot(x,z)<650){
        db.box(m.dark,x,h+.55,z,w+1,1.1,d+1);
        db.box(m.paving,x+w*.16,h+2.4,z-d*.18,w*.3,3.4,d*.35);
        if(family%3===0)db.box(m.metal,x,h+4,z,w*.6,.23,d*.6);
        if(family%2===0)db.box(m.dark,x,2.1,z+d/2+.8,w+3,4.2,2);
        if(family===6){for(let a=-w/2+3;a<w/2;a+=5)db.box(m.stone,x+a,5,z+d/2+1,.6,10,.8);}
        if(family===3)for(let a=6;a<h;a+=4)db.box(m.stone,x,a,z+d/2+1.5,w,.35,3);
      }
    });
    body.receiveShadow=true;body.castShadow=false;root.add(body);db.finish({shadow:false});root.add(details);blocks.push(details);
  }
  // A civic pavilion is a deliberate distant landmark, not another tower.
  const dome=new T.Mesh(new T.SphereGeometry(24,24,12,0,Math.PI*2,0,Math.PI/2),m.stone);dome.position.set(-300,14,-430);root.add(dome);
  const traffic=new T.Group(),cars=[];
  for(let i=0;i<(quality==='mobile'?6:18);i++){
    const car=new T.Group(),cb=batchBuilder(car),mat=new T.MeshStandardMaterial({color:['#b5b9b8','#303e43','#80705c'][i%3],metalness:.5,roughness:.33});
    cb.box(mat,0,.8,0,1.8,.8,4.4);cb.box(m.dark,0,1.4,-.2,1.6,.7,2.1);cb.box(m.practical,0,.85,2.21,1.4,.15,.04);cb.finish({shadow:false});traffic.add(car);cars.push(car);
  }root.add(traffic);
  return {root,lamps,update(dusk,time,camera){cityMaterials.forEach(mat=>mat.emissiveIntensity=dusk*.9);blocks.forEach(g=>g.visible=quality!=='mobile'||camera.position.y<350);cars.forEach((c,i)=>{c.position.set(i%2?79:87,0,((time*(i%2?-2.6:3.1)+i*71)%1000+1000)%1000-500);c.rotation.y=i%2?Math.PI:0;});},dispose(){cityMaterials.forEach(mat=>{mat.map.dispose();mat.emissiveMap.dispose();mat.dispose();});lane.dispose();}};
}

export async function createLandscape(quality='standard'){
  const root=new T.Group(),loader=new GLTFLoader(),sources=await Promise.all(['tree','shrub'].map(n=>loader.loadAsync(`/afrah/models/${n}.glb`)));
  const tmp=new T.Object3D(),count=qualityPresets[quality].trees;
  sources.forEach((gltf,type)=>{
    const bounds=new T.Box3().setFromObject(gltf.scene),height=bounds.max.y-bounds.min.y;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o=>{
      if(!o.isMesh)return;
      const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.translate(0,-bounds.min.y,0);
      const mat=o.material.clone();mat.side=T.DoubleSide;mat.alphaTest=.5;mat.roughness=.94;
      const amount=type===0?count:count*2,mesh=new T.InstancedMesh(geometry,mat,amount);
      for(let i=0;i<amount;i++){
        const r=seeded(i+type*91),s=(type===0?7+r*5:.7+r*.9)/height;
        let x,z;
        if(i<count*.38){x=-53+(r-.5)*15;z=-35+i*3.4;}
        else if(i<count*.6){x=-15+(i-count*.38)*5.2;z=-64+(r-.5)*7;}
        else{x=(i%2?68:-82)+(r-.5)*8;z=(i-count*.7)*13;}
        if(type===1){x=41+(r-.5)*29;z=38+(seeded(i+8)-.5)*11;}
        tmp.position.set(x,.5,z);tmp.rotation.set(0,r*6.28,0);tmp.scale.set(s*(.85+r*.25),s,s);tmp.updateMatrix();mesh.setMatrixAt(i,tmp.matrix);mesh.setColorAt(i,new T.Color().setHSL(.22+r*.045,.12,.74+r*.2));
      }
      mesh.castShadow=quality==='high';mesh.receiveShadow=true;root.add(mesh);
    });
    gltf.scene.traverse(o=>{o.geometry?.dispose();});
  });
  return root;
}
