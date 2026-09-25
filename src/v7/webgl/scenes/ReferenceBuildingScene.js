import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {sectionProgress,range,smooth,store} from '../../core/store';

const CAMERA=[
  {pos:[15.137,.4,-19.258],look:[.363,4.346,-6.368]},
  {pos:[15.749,8.957,-18.29],look:[.715,2.65,-6.707]},
  {pos:[-1.04,4,-22],look:[-1.04,2.675,-2.044]},
  {pos:[-14.207,.4,-17.407],look:[.562,3.663,-4.322]},
  {pos:[-16.685,6.059,-15.461],look:[-.706,.749,-4.669]},
];

export class ReferenceBuildingScene {
  constructor(scene,envMap,renderer){
    this.group=new THREE.Group();this.group.visible=false;scene.add(this.group);
    this.position=new THREE.Vector3();this.target=new THREE.Vector3();this.right=new THREE.Vector3();this.nextPosition=new THREE.Vector3();this.nextTarget=new THREE.Vector3();this.envMap=envMap;
    this.model=null;this.error=null;this.sm=0;this.active='';
    const draco=new DRACOLoader().setDecoderPath('/reference-study/draco/');
    const loader=new GLTFLoader().setDRACOLoader(draco);
    this.ready=loader.loadAsync('/reference-study/likova/dark.glb').then(g=>{
      const model=g.scene;
      model.traverse(o=>{
        if(!o.isMesh)return;
        if(['BG','Ground_Parking'].includes(o.name)||o.name.startsWith('RS_Camera')){o.visible=false;return;}
        o.material=o.material.clone();o.material.envMap=envMap;o.material.envMapIntensity=.85;o.material.needsUpdate=true;
        // Preserve the source model's embedded PBR values and texture maps.
      });
      this.model=model;this.group.add(model);
      return renderer.compileAsync?.(scene,new THREE.PerspectiveCamera(42,1,.1,100));
    }).catch(e=>{this.error=e;console.warn('Reference building could not load',e);});
  }
  update(camera){
    const preview=store.activeStage==='hero'&&sectionProgress('hero')>.62;
    const mode=preview?'arrival':store.activeStage;
    const on=mode==='arrival'||mode==='building';this.group.visible=on&&!!this.model;if(!on)return;
    const p=preview?0:mode==='arrival'?sectionProgress('arrival'):sectionProgress('building');
    if(this.active!==mode){this.sm=p;this.active=mode;}else this.sm+=(p-this.sm)*.08;
    let a,b,t;
    if(mode==='arrival'){
      a={pos:CAMERA[0].pos,look:[.363,2.5,-6.368]};b={pos:[13.8,2.7,-21.5],look:[.4,2.4,-5.8]};t=smooth(range(this.sm,0,.92));
    }else{
      const n=Math.min(3,Math.floor(this.sm*4));a=CAMERA[n];b=CAMERA[n+1];t=smooth((this.sm*4)-n);
    }
    const k=store.aspectK||1;
    this.position.set(...a.pos).lerp(this.nextPosition.set(...b.pos),t);
    this.target.set(...a.look).lerp(this.nextTarget.set(...b.look),t);
    camera.fov=mode==='arrival'?25:27;camera.updateProjectionMatrix();
    camera.position.set(this.position.x/k**.48,this.position.y,this.position.z/k**.55);
    camera.lookAt(this.target);
    if(mode==='arrival' && k>.7){
      this.right.set(1,0,0).applyQuaternion(camera.quaternion);
      this.target.addScaledVector(this.right,-2.8);
      camera.lookAt(this.target);
    }
  }
}
