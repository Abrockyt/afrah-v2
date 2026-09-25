import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {sectionProgress,range,smooth,store} from '../../core/store';
import {createCommunity} from '../objects/Community';

// The gated community built from the reference building (see Community.js).
// Arrival: approach from outside the gate. Tower chapter: an aerial of the
// whole community, then close views of each tower in turn.
function shots(towers){
  const T=Object.fromEntries(towers.map(t=>[t.id,t]));
  const one=T.one,two=T.two,three=T.three,four=T.four||T.one;
  const c=(t,dy=0)=>[t.centre.x,dy,t.centre.z];
  return {
    arrival:[
      {pos:[26,1.7,-48],look:[0,9,4]},
      {pos:[12,2.8,-30],look:[0,11,2]},
    ],
    tower:[
      {pos:[52,46,-50],look:[0,6,14]},                                        // aerial of the whole community
      {pos:[-10,one.height*.55,-13],look:c(one,one.height*.62)},              // close on Tower One's facade
      {pos:[-2,two.height*.5,1],look:c(two,two.height*.55)},                  // Tower Two from the courtyard
      {pos:[-7,2.4,6],look:c(three,three.height*.55)},                        // over the pool, up Tower Three
      {pos:[19,four.height+6,5],look:c(four,four.height*.8)},                 // the crown of Tower Four
    ],
  };
}

export class ReferenceBuildingScene {
  constructor(scene,envMap,renderer){
    this.group=new THREE.Group();this.group.visible=false;scene.add(this.group);
    this.position=new THREE.Vector3();this.target=new THREE.Vector3();this.right=new THREE.Vector3();this.nextPosition=new THREE.Vector3();this.nextTarget=new THREE.Vector3();this.envMap=envMap;
    this.model=null;this.error=null;this.sm=0;this.active='';
    renderer.localClippingEnabled=true;
    const draco=new DRACOLoader().setDecoderPath('/reference-study/draco/');
    const loader=new GLTFLoader().setDRACOLoader(draco);
    this.ready=loader.loadAsync('/reference-study/likova/dark.glb').then(g=>{
      const model=g.scene;
      model.traverse(o=>{
        if(!o.isMesh)return;
        if(['BG','Ground_Parking'].includes(o.name)||o.name.startsWith('RS_Camera')){o.visible=false;return;}
        o.material=o.material.clone();o.material.envMap=envMap;o.material.envMapIntensity=.85;o.material.needsUpdate=true;
      });
      // daylight: the model's own night lights step right down
      model.traverse(o=>{if(o.isLight)o.intensity*=.12;});
      const community=createCommunity(model,innerWidth<760);
      const {group,towers}=community;
      community.lights.forEach(l=>scene.add(l));
      this.community=community;this.towers=towers;this.shots=shots(towers);
      this.model=model;this.group.add(model,group);
      return renderer.compileAsync?.(scene,new THREE.PerspectiveCamera(42,1,.1,100));
    }).catch(e=>{this.error=e;console.warn('Reference building could not load',e);});
  }
  update(camera,time=0){
    const mode=store.activeStage;
    const on=mode==='arrival'||mode==='building';this.group.visible=on&&!!this.model;
    this.community?.update(time,camera,on);
    if(!on||!this.shots)return;
    const p=mode==='arrival'?sectionProgress('arrival'):sectionProgress('building');
    if(this.active!==mode){this.sm=p;this.active=mode;}else this.sm+=(p-this.sm)*.08;
    let a,b,t;
    if(mode==='arrival'){
      [a,b]=this.shots.arrival;t=smooth(range(this.sm,0,.92));
    }else{
      const K=this.shots.tower,n=Math.min(K.length-2,Math.floor(this.sm*(K.length-1)));
      a=K[n];b=K[n+1];t=smooth(this.sm*(K.length-1)-n);
    }
    const k=store.aspectK||1;
    this.position.set(...a.pos).lerp(this.nextPosition.set(...b.pos),t);
    this.target.set(...a.look).lerp(this.nextTarget.set(...b.look),t);
    // portrait screens: step back along the view line
    this.position.sub(this.target).divideScalar(Math.pow(k,.55)).add(this.target);
    camera.fov=mode==='arrival'?30:34;camera.updateProjectionMatrix();
    camera.position.copy(this.position);
    camera.lookAt(this.target);
    this.community.update(time,camera,true);
    if(mode==='arrival' && k>.7){
      this.right.set(1,0,0).applyQuaternion(camera.quaternion);
      this.target.addScaledVector(this.right,-6);
      camera.lookAt(this.target);
    }
  }
}
