import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {batchBuilder,seeded} from './materials';

// Original AFRAH geometry, in metres. Two offset, chamfered wings, continuous
// limestone piers and loggias. No imported real-estate geometry is used here.
export function createAfrah(materials, quality='standard') {
  const root=new T.Group();root.name='AFRAH / original architecture';
  const b=batchBuilder(root),m=materials,terraces=[],plates=new Map();
  const footprint=(w,d,c)=>[[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]];
  function plate(points,x,y,z,h,mat){
    const shape=new T.Shape(points.map(([a,c])=>new T.Vector2(a,-c)));
    const geo=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:1});geo.rotateX(-Math.PI/2);geo.translate(x,y,z);
    if(!plates.has(mat))plates.set(mat,[]);plates.get(mat).push(geo);
  }
  function wing(cx,cz,floors,w,d,seed){
    const base=9.2,fh=3.65;
    for(let f=0;f<=floors;f++){
      const setback=f>floors-5?3.5:f>floors-10?1.5:0;
      const pts=footprint(w-setback*2,d-setback*2,5.5),y=base+f*fh;
      plate(pts,cx,y,cz,.32,m.stone);
      if(f===floors){
        plate(footprint(w-13,d-13,4),cx,y+.33,cz,2.4,m.dark);
        for(let i=-w/2+7;i<w/2-6;i+=1.7)b.box(m.metal,cx+i,y+4,cz,.16,3,d-12);
        terraces.push([cx,y+.5,cz,w-8,d-8]);break;
      }
      if(f===floors-9||f===floors-4)terraces.push([cx,y+.5,cz,w,d]);
      pts.forEach(([x1,z1],edge)=>{
        const[x2,z2]=pts[(edge+1)%pts.length],dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);
        const nx=dz/len,nz=-dx/len,angle=-Math.atan2(dz,dx),n=Math.max(1,Math.round(len/3.4)),bay=len/n;
        for(let j=0;j<n;j++){
          const u=(j+.5)/n,x=cx+x1+dx*u,z=cz+z1+dz*u;
          const id=seed+f*163+edge*31+j*7,r=seeded(id),state=r<.42?0:r<.66?1:r<.9?2:3;
          const loggia=edge%2===0&&j%4===1&&f>1&&f<floors-5;
          const recess=loggia?2.15:.65;
          // Room backs and side partitions give the glass genuine interior depth.
          b.box(m.rooms[state],x-nx*(recess+1.8),y+1.83,z-nz*(recess+1.8),bay-.34,2.95,.12,angle);
          b.box(m.glass,x-nx*recess,y+1.86,z-nz*recess,bay-.3,2.97,.05,angle);
          b.box(m.metal,x-nx*(recess-.04),y+1.8,z-nz*(recess-.04),.055,3.03,.16,angle);
          b.box(m.metal,x-nx*(recess-.04),y+2.74,z-nz*(recess-.04),bay-.3,.055,.16,angle);
          const bx=cx+x1+dx*j/n,bz=cz+z1+dz*j/n;
          b.box(m.stone,bx+nx*.08,y+fh/2,bz+nz*.08,.38,fh-.03,1.24,angle);
          b.box(m.metal,bx+nx*.76,y+fh/2,bz+nz*.76,.085,fh-.08,.12,angle);
          // Shadow joint / spandrel below the glazing.
          b.box(m.dark,x-nx*.5,y+.46,z-nz*.5,bay-.32,.23,.38,angle);
          if(loggia){
            b.box(m.railing,x+nx*.35,y+.98,z+nz*.35,bay-.35,1.1,.055,angle);
            b.box(m.metal,x+nx*.35,y+1.54,z+nz*.35,bay-.24,.045,.08,angle);
          }
          if(r>.53){
            const amount=.24+seeded(id+2)*.45;
            b.box(m.curtain,x-nx*(recess+.25),y+1.9,z-nz*(recess+.25),bay*amount,2.85,.09,angle);
          }
          if(quality!=='mobile'&&r>.72){
            b.box(m.dark,x-nx*(recess+1.2),y+.75,z-nz*(recess+1.2),1.35,.62,.7,angle);
            b.box(m.rooms[3],x-nx*(recess+1.15),y+2.67,z-nz*(recess+1.15),.38,.14,.38,angle);
          }
        }
        // Parapet to recessed top floors, creating planted sky terraces.
        if(f>floors-6)b.box(m.stone,cx+(x1+x2)/2,y+.77,cz+(z1+z2)/2,len,.65,.22,angle);
      });
    }
  }
  wing(-12,-5,43,36,31,7);
  wing(28,-28,31,30,29,999);
  // A double-height colonnade and sheltered arrival sit on a solid ground plane.
  plate(footprint(100,71,12),9,.15,-12,.7,m.paving);
  plate(footprint(77,49,8),8,8.4,-13,.85,m.stone);
  b.box(m.glass,8,4.65,10.3,65,7.2,.08);
  b.box(m.rooms[2],8,4.3,-8,65,6.9,.3);
  for(let x=-25;x<=42;x+=5.6){b.box(m.stone,x,4.4,13.2,.85,8,1.25);b.box(m.metal,x,4.4,11,.12,7.5,.18);}
  b.box(m.metal,4,5.5,21,30,.25,14);b.box(m.practical,4,5.31,21,27,.06,10);
  for(let x=-8;x<=16;x+=24)b.box(m.metal,x,2.8,26,.2,5.5,.2);
  for(let i=0;i<5;i++)b.box(m.stone,4,.12+i*.11,28-i*1.1,31,.2,1.3);
  for(let i=0;i<7;i++){b.box(m.dark,-18+i*8,1,5,3.2,.6,1);b.box(m.curtain,-18+i*8,1.45,5.25,3.2,.6,.65);}
  for(const[x,y,z,w,d]of terraces){
    for(let i=-w/2+4;i<w/2-3;i+=3.6){
      b.box(m.stone,x+i,y+.2,z+d/2-2,3.1,.65,1.5);
      b.box(m.foliage,x+i,y+.75,z+d/2-2,2.8,.7,1.25);
    }
  }
  for(const[mat,geos]of plates){const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());const mesh=new T.Mesh(merged,mat);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
  const meshes=b.finish();
  root.userData={floors:43,height:170.15,original:true};
  return {root,meshes,terraces};
}
