import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

const vertex=`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`uniform sampler2D daySky;uniform sampler2D duskSky;uniform float blend;varying vec3 direction;
void main(){vec3 d=normalize(direction);float a=atan(d.z,d.x)+.85;vec2 uv=vec2(a/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
vec3 day=texture2D(daySky,uv).rgb;vec3 dusk=texture2D(duskSky,uv).rgb;
vec3 sky=mix(day,dusk*.18,blend);float horizon=1.-smoothstep(-.025,.085,d.y);sky=mix(sky,mix(vec3(.47,.56,.6),vec3(.13,.19,.28),blend),horizon*.97);gl_FragColor=vec4(sky,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

export async function createEnvironment(renderer,scene){
  const loader=new RGBELoader(),pmrem=new T.PMREMGenerator(renderer),assets=new Map(),disposed={value:false};
  async function load(name){
    if(assets.has(name))return assets.get(name);
    const promise=loader.loadAsync(`/afrah/env/${name}.hdr`).then(hdr=>{
      hdr.mapping=T.EquirectangularReflectionMapping;const env=pmrem.fromEquirectangular(hdr);
      if(disposed.value){hdr.dispose();env.dispose();}
      return {hdr,env};
    });assets.set(name,promise);return promise;
  }
  const day=await load('day'),blue=await load('blue');
  scene.environment=day.env.texture;scene.environmentRotation.y=.85;
  const nightUniform={value:blue.env.texture},blendUniform={value:0};
  const skyMat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{daySky:{value:day.hdr},duskSky:{value:blue.hdr},blend:blendUniform},side:T.BackSide,depthWrite:false});
  const sky=new T.Mesh(new T.SphereGeometry(4500,32,20),skyMat);sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  const chunk=T.ShaderChunk.envmap_physical_pars_fragment
    .replace('textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 )','mix(textureCubeUV(envMap, envMapRotation * worldNormal, 1.0),textureCubeUV(afrahEvening, envMapRotation * worldNormal, 1.0),afrahDayBlend)')
    .replace('textureCubeUV( envMap, envMapRotation * reflectVec, roughness )','mix(textureCubeUV(envMap, envMapRotation * reflectVec, roughness),textureCubeUV(afrahEvening, envMapRotation * reflectVec, roughness),afrahDayBlend)');
  function attach(root){root.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){
    if(!m.isMeshStandardMaterial||m.userData.afrahEnvironment)return;
    const previous=m.onBeforeCompile,oldKey=m.customProgramCacheKey();m.userData.afrahEnvironment=true;
    m.onBeforeCompile=shader=>{previous.call(m,shader,renderer);shader.uniforms.afrahEvening=nightUniform;shader.uniforms.afrahDayBlend=blendUniform;shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>','uniform sampler2D afrahEvening;uniform float afrahDayBlend;\n'+chunk);};m.customProgramCacheKey=()=> 'afrah-environment-blend'+oldKey;m.needsUpdate=true;
  }});}
  return {attach,sky,async preset(name){const selected=await load(name);if(disposed.value)return;skyMat.uniforms.daySky.value=selected.hdr;scene.environment=selected.env.texture;},
    update(camera,blend){sky.position.copy(camera.position);blendUniform.value=blend;},
    dispose(){disposed.value=true;sky.geometry.dispose();skyMat.dispose();assets.forEach(p=>p.then(v=>{v.hdr.dispose();v.env.dispose();}));pmrem.dispose();}
  };
}

export function createClouds(scene){
  const map=new T.TextureLoader().load('/media/afrah-cloud-atlas.png');map.colorSpace=T.SRGBColorSpace;
  const root=new T.Group(),geo=new T.PlaneGeometry(1,1),layers=[];
  for(let i=0;i<7;i++){
    const mat=new T.MeshBasicMaterial({map,transparent:true,opacity:.68,depthWrite:false,side:T.DoubleSide,color:'#cfd2d3'});
    const mesh=new T.Mesh(geo,mat);mesh.position.set((i%3-1)*430,270+i*80,-200+i*120);mesh.scale.set(1800,700,1);root.add(mesh);layers.push(mesh);
  }scene.add(root);
  return {root,update(camera,t,intro=1){layers.forEach((m,i)=>{m.quaternion.copy(camera.quaternion);m.material.opacity=(1-intro)*(.55+i*.025);m.position.x+=(Math.sin(t*.02+i))*.005;});root.visible=intro<.98;},dispose(){geo.dispose();map.dispose();layers.forEach(m=>m.material.dispose());}};
}
