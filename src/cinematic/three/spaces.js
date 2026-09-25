import * as T from 'three';

export function roundedRect(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
export function archGeometry(w=10,h=13,thickness=.65,depth=.24){const s=roundedRect(w,h,w*.47),hole=roundedRect(w-thickness*2,h-thickness*2,(w-thickness*2)*.47);s.holes.push(new T.Path(hole.getPoints(32)));return new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.055,bevelThickness:.04,curveSegments:30});}

export function createOpening(materials,mobile){
  const root=new T.Group(),ribs=[],geo=archGeometry(10,13,.73,.18),bronze=materials.metal;
  const stone=materials.stone.clone();stone.color.set('#aaa294');stone.roughness=.72;stone.metalness=.09;
  const count=mobile?24:38;
  for(let i=0;i<count;i++){
    const mesh=new T.Mesh(geo,i%7===0?bronze:stone);mesh.position.z=-i*.39;mesh.rotation.z=-.48+i*.027;mesh.rotation.y=.05*Math.sin(i*.15);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);ribs.push(mesh);
  }
  root.position.set(0,0,1);
  return {root,stone,update(p,t,reduced){const opening=T.MathUtils.smootherstep(p,.22,.86);
    ribs.forEach((r,i)=>{r.scale.x=1+opening*1.3;r.scale.y=1+opening*.18;r.rotation.z=(-.48+i*.027)*(1-opening*.65);r.position.x=Math.sin(i*.18)*opening*.65;});
    root.rotation.y=.24*(1-opening);root.rotation.z=.14*(1-opening);root.position.y=reduced?0:Math.sin(t*.12)*.035;
  }};
}

export function createTunnel(materials,mobile){
  const root=new T.Group(),geo=archGeometry(8.8,11,.68,.38),count=mobile?22:34;
  const mat=materials.stone.clone();mat.color.set('#a59b8b');mat.roughness=.8;
  const ribs=new T.InstancedMesh(geo,mat,count),accent=new T.InstancedMesh(geo,materials.metal,Math.ceil(count/4)),o=new T.Object3D();
  for(let i=0;i<count;i++){o.position.set(Math.sin(i*.08)*.8,0,-i*2);o.rotation.set(0,0,Math.sin(i*.11)*.07);o.scale.set(1,1,1);o.updateMatrix();ribs.setMatrixAt(i,o.matrix);if(i%4===0){o.position.z-=.5;o.scale.set(.984,.989,.22);o.updateMatrix();accent.setMatrixAt(i/4,o.matrix);}}
  ribs.castShadow=ribs.receiveShadow=true;root.add(ribs,accent);
  const floor=new T.Mesh(new T.PlaneGeometry(8,90),materials.dark);floor.rotation.x=-Math.PI/2;floor.position.set(0,-5.1,-30);floor.receiveShadow=true;root.add(floor);
  const exit=new T.Mesh(new T.PlaneGeometry(7.4,10.3),new T.MeshBasicMaterial({color:'#F1EDE5',toneMapped:false}));exit.position.set(0,0,-count*2-.8);root.add(exit);
  const light=new T.PointLight('#f1ede5',160,35,2);light.position.set(0,0,-count*2+2);root.add(light);
  const practical=new T.PointLight('#d9b893',45,25,2);practical.position.set(0,3,2);root.add(practical);
  return {root,mat,count,update(p){const z=5-p*(count*2+4);practical.position.z=z-5;light.intensity=160+p*120;return z;}};
}

export function createObject(materials){
  const root=new T.Group(),geo=archGeometry(5.3,7.4,.5,.32),m=materials.stone.clone();m.color.set('#c5bca9');
  for(let i=0;i<8;i++){const rib=new T.Mesh(geo,i===3?materials.metal:m);rib.position.z=(i-3.5)*.44;rib.rotation.z=(i-3.5)*.035;root.add(rib);}
  const glassMaterial=materials.glass.clone();glassMaterial.transmission=.88;glassMaterial.roughness=.05;glassMaterial.thickness=.22;glassMaterial.color.set('#F1EDE5');const glass=new T.Mesh(new T.BoxGeometry(6.7,3.6,.1),glassMaterial);glass.rotation.z=-.55;glass.position.set(.1,.3,.2);root.add(glass);
  const bronze=new T.Mesh(new T.BoxGeometry(.14,9,.35),materials.metal);bronze.rotation.z=.55;bronze.position.set(0,0,2);root.add(bronze);
  return {root,mat:m,update(p,t,reduced){root.rotation.set(.15,-.55+p*.7+(reduced?0:Math.sin(t*.13)*.04),-.16);root.position.y=reduced?0:Math.sin(t*.2)*.09;}};
}

export const memoryImages=['/cinematic/images/morning.webp','/cinematic/images/building.webp','/cinematic/images/interior.webp','/cinematic/images/lounge.webp','/cinematic/images/dusk.webp'];
export function createGallery(){
  const root=new T.Group(),geo=new T.PlaneGeometry(1,1),slides=[],loader=new T.TextureLoader();let dead=false;
  memoryImages.forEach((url,i)=>{
    const group=new T.Group(),mat=new T.MeshBasicMaterial({color:'#F1EDE5',transparent:true,toneMapped:false}),mesh=new T.Mesh(geo,mat);
    mesh.scale.set(8.7,5.8,1);group.add(mesh);
    const back=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#0B0B0A',transparent:true,opacity:.65}));back.position.set(.12,-.12,-.1);back.scale.set(8.85,5.95,1);group.add(back);root.add(group);slides.push({group,mesh,back,i});
    loader.load(url,t=>{if(dead){t.dispose();return;}t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;const imageRatio=t.image.width/t.image.height,target=1.5;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;if(imageRatio>target){t.repeat.x=target/imageRatio;t.offset.x=(1-t.repeat.x)/2;}else{t.repeat.y=imageRatio/target;t.offset.y=(1-t.repeat.y)/2;}mat.map=t;mat.needsUpdate=true;});
  });
  return {root,slides,update(p,mobile){const active=p*4;
    slides.forEach(({group,mesh,back,i})=>{const d=i-active,near=Math.max(0,1-Math.abs(d));group.position.set(Math.sin(d*.82)*(mobile?5.2:10.3),Math.sin(d*1.9)*1.4,-Math.abs(d)*5.6);group.rotation.set(Math.sin(d)*.07,-d*.21,Math.sin(d*.8)*.07);group.scale.setScalar(.74+near*.26);mesh.material.opacity=.34+near*.66;back.material.opacity=.25+near*.4;});
  },dispose(){dead=true;}};
}
