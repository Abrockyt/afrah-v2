import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createMaterials,qualityPresets} from './materials';
import {createAfrah} from './building';
import {createDistrict,createLandscape} from './city';
import {createEnvironment,createClouds} from './environment';

export const heroCamera=[228,117,347],heroTarget=[-10,81,-6];
const curve=new T.CatmullRomCurve3([[228,117,347],[210,134,335],[153,118,274],[-211,127,295],[-278,142,-243],[190,72,226]].map(p=>new T.Vector3(...p)),false,'centripetal');
const target=new T.CatmullRomCurve3([[-10,81,-6],[5,85,-8],[0,92,-8],[2,101,-8],[1,85,-6],[0,49,0]].map(p=>new T.Vector3(...p)),false,'centripetal');

export function createArchitecturalScene(host,{quality='standard',lab=false,onReady=()=>{},onError=()=>{},onStats=()=>{}}={}){
  const preset=qualityPresets[quality],scene=new T.Scene(),renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:lab});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
  renderer.setPixelRatio(Math.min(devicePixelRatio,preset.dpr));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.appendChild(renderer.domElement);
  const camera=new T.PerspectiveCamera(32,1,.4,6000);camera.position.set(...heroCamera);camera.lookAt(...heroTarget);
  scene.background=new T.Color('#bec9cf');scene.fog=new T.Fog('#bcc5c7',420,2200);
  const m=createMaterials(renderer,quality),hero=createAfrah(m,quality);scene.add(hero.root);
  const hemi=new T.HemisphereLight('#dce4e7','#6a6559',.22);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff1d8',3.1);sun.position.set(-240,340,260);sun.target.position.set(0,60,0);sun.castShadow=true;sun.shadow.mapSize.set(preset.shadow,preset.shadow);
  Object.assign(sun.shadow.camera,{left:-150,right:150,top:180,bottom:-130,near:1,far:850});sun.shadow.normalBias=.15;sun.shadow.bias=-.00008;sun.shadow.radius=3;scene.add(sun,sun.target);
  const lobby=new T.PointLight('#ffd3a2',0,35,2);lobby.position.set(5,4.2,17);scene.add(lobby);
  const clouds=createClouds(scene),district=createDistrict(m,quality);district.root.visible=false;scene.add(district.root);
  let env,vegetation,disposed=false,ready=false,composer,ao,compileMs=0,presetName='day',time=0,frames=0,statsTime=performance.now(),lastStats;
  const stats={fps:0,drawCalls:0,triangles:0,textureMiB:0,compileMs:0,quality,ready:false};
  const geometryResources=new Set(),materialResources=new Set(),textureResources=new Set();
  function collect(root){root.traverse(o=>{if(o.geometry)geometryResources.add(o.geometry);for(const mat of[o.material].flat().filter(Boolean)){materialResources.add(mat);Object.values(mat).forEach(v=>{if(v?.isTexture)textureResources.add(v);});}});}
  function estimateTextures(){const all=new Set(m.textures);scene.traverse(o=>[o.material].flat().filter(Boolean).forEach(mat=>Object.values(mat).forEach(t=>{if(t?.isTexture)all.add(t);})));let bytes=0;all.forEach(t=>{if(t.mipmaps?.length&&t.isCompressedTexture)t.mipmaps.forEach(l=>bytes+=l.data?.byteLength||0);else if(t.image)bytes+=(t.image.width||0)*(t.image.height||0)*4*1.333;});return bytes/1048576;}
  const resize=()=>{const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<h?43:32;camera.updateProjectionMatrix();composer?.setSize(w,h);};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const loading=Promise.all([createEnvironment(renderer,scene),m.ready]).then(async([environment])=>{
    env=environment;if(disposed){env.dispose();return;}
    env.attach(hero.root);env.attach(district.root);
    const began=performance.now();await renderer.compileAsync(scene,camera);compileMs=performance.now()-began;
    if(disposed)return;ready=true;host.classList.add('ready');onReady();
    // The hero compiles first. Supporting district and vegetation are progressive.
    district.root.visible=true;
    createLandscape(quality).then(root=>{if(disposed){collect(root);geometryResources.forEach(g=>g.dispose());return;}vegetation=root;env.attach(root);scene.add(root);}).catch(e=>{console.warn('AFRAH landscape could not load',e.message);});
  }).catch(e=>{if(!disposed){onError(e);console.error('AFRAH environment:',e);}});
  function post(enabled){
    if(enabled&&!composer){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ao=new GTAOPass(scene,camera,host.clientWidth,host.clientHeight);ao.blendIntensity=.28;ao.updateGtaoMaterial({radius:1.4,distanceExponent:1.8,thickness:1.1});ao.setSceneClipBox(new T.Box3(new T.Vector3(-90,0,-90),new T.Vector3(90,180,90)));composer.addPass(ao);composer.addPass(new OutputPass());resize();}
    if(composer)composer.userData={enabled};
  }
  // Enabled after the zero-post baseline; available only on high by default.
  if(preset.ao)post(true);
  const p=new T.Vector3(),look=new T.Vector3();
  function render({progress=0,dusk=0,seconds=0,intro=1,parallax=[0,0],sample=null}={}){
    if(disposed)return;time=seconds;
    const k=T.MathUtils.clamp(progress,0,1);
    if(intro<1){const a=T.MathUtils.smootherstep(intro,0,1);camera.position.set(610+(heroCamera[0]-610)*a,780+(heroCamera[1]-780)*a,950+(heroCamera[2]-950)*a);look.set(-10,130+(81-130)*a,-6);}
    else{curve.getPoint(k,p);target.getPoint(k,look);camera.position.copy(p);camera.position.x+=parallax[0]*4;camera.position.y+=parallax[1]*2;}
    camera.lookAt(look);scene.fog.color.set('#bdc8c9').lerp(new T.Color('#566779'),dusk);scene.fog.near=420;scene.fog.far=2200-dusk*250;
    sun.position.set(-240+dusk*100,260-dusk*135,260-dusk*170);sun.color.set('#fff0d8').lerp(new T.Color('#c9d7e7'),dusk);sun.intensity=3.1-dusk*2.85;
    hemi.intensity=.18+dusk*.05;lobby.intensity=dusk*90;renderer.toneMappingExposure=.95-dusk*.1;scene.environmentIntensity=.72-dusk*.56;
    m.update(dusk);env?.update(camera,dusk);clouds.update(camera,seconds,intro);district.update(dusk,seconds,camera);
    if(sample)sample({scene,camera,hero,m,renderer});
    renderer.info.reset();if(composer?.userData?.enabled)composer.render();else renderer.render(scene,camera);
    frames++;const now=performance.now();if(now-statsTime>1000){Object.assign(stats,{fps:Math.round(frames*10000/(now-statsTime))/10,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textureMiB:Math.round(estimateTextures()*10)/10,compileMs:Math.round(compileMs),quality,ready});lastStats={...stats};onStats(lastStats);frames=0;statsTime=now;}
  }
  return {scene,camera,renderer,hero,materials:m,district,loading,stats,render,post,clouds,
    get ready(){return ready;},get lastStats(){return lastStats;},
    async preset(name){presetName=name;await env?.preset(name);},
    screenshot(){render({seconds:time});return renderer.domElement.toDataURL('image/png');},
    dispose(){disposed=true;observer.disconnect();collect(scene);geometryResources.forEach(g=>g.dispose());materialResources.forEach(mat=>mat.dispose());textureResources.forEach(t=>t.dispose());m.dispose();district.dispose();env?.dispose();clouds.dispose();composer?.passes.forEach(pass=>pass.dispose?.());composer?.dispose();renderer.dispose();renderer.domElement.remove();}
  };
}
