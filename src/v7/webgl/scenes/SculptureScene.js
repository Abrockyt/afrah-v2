import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {sectionProgress,store} from '../../core/store';

export class SculptureScene{
  constructor(scene){
    this.group=new THREE.Group();this.group.visible=false;scene.add(this.group);
    this.key=new THREE.SpotLight('#f7eee3',105,30,Math.PI*.28,.7,1.25);this.key.position.set(-7,9,8);this.key.target.position.set(-3,0,0);scene.add(this.key,this.key.target);
    this.rim=new THREE.SpotLight('#8ea8bb',95,30,Math.PI*.31,.6,1.35);this.rim.position.set(-1,7,-7);this.rim.target.position.set(-3,0,0);scene.add(this.rim,this.rim.target);
    this.key.visible=this.rim.visible=false;
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.ready=loader.loadAsync('/reference-study/silver/model.gltf').then(({scene:source})=>{
      const sculpt=new THREE.Group();source.updateMatrixWorld(true);
      source.traverse(o=>{if(!o.isMesh)return;if(!['Default','Default2','Default.2'].includes(o.name))return;const m=new THREE.Mesh(o.geometry,o.material.clone());m.material.roughness=.86;m.material.metalness=.02;m.material.side=THREE.DoubleSide;m.applyMatrix4(o.matrixWorld);sculpt.add(m);});
      if(!sculpt.children.length)throw new Error('Sculpture meshes were absent');
      const box=new THREE.Box3().setFromObject(sculpt),centre=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      const normal=new THREE.Group();sculpt.position.sub(centre);normal.add(sculpt);normal.scale.setScalar(9.4/Math.max(.001,size.y));normal.position.set(-4.4,-.25,0);this.group.add(normal);this.model=normal;
    }).catch(e=>{this.error=e;console.warn('Sculpture model could not load',e);});
  }
  update(camera,time){const preview=store.activeStage==='tunnel'&&sectionProgress('tunnel')>.82;
    const active=(store.activeStage==='history'||preview)&&!!this.model;
    this.group.visible=active;this.key.visible=this.rim.visible=active;if(!active)return;
    const p=preview?0:sectionProgress('history');this.model.rotation.y=2.65+p*.48+Math.sin(time*.14)*.025;
    camera.fov=39;camera.updateProjectionMatrix();camera.position.set(0,1.2,15.5/(store.aspectK||1)**.62);camera.lookAt(0,.2,0);
  }
}
