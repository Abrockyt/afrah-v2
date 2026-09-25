import * as T from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';

export const qualityPresets = {
  high: {dpr: 1.7, shadow: 2048, trees: 90, city: 13, transmission: .32, ao: true},
  standard: {dpr: 1.35, shadow: 1536, trees: 54, city: 11, transmission: .22, ao: false},
  mobile: {dpr: 1, shadow: 1024, trees: 24, city: 8, transmission: 0, ao: false},
};
export const seeded = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return v - Math.floor(v); };

export function createMaterials(renderer, quality = 'standard') {
  const preset = qualityPresets[quality], textures = [], pending = [];
  const loader = new KTX2Loader().setTranscoderPath('/afrah/basis/').detectSupport(renderer);
  const imageLoader = new T.TextureLoader();
  function texture(name, color = false) {
    const fallback = imageLoader.load('/afrah/textures/' + name + '.jpg');
    fallback.wrapS = fallback.wrapT = T.RepeatWrapping; fallback.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    fallback.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.push(fallback);
    return fallback;
  }
  function pbr(name, color, repeat = 1) {
    const m = new T.MeshStandardMaterial({color, roughness: .86, metalness: 0});
    for (const [slot, channel, srgb] of [['map','color',true],['normalMap','normal',false],['roughnessMap','arm',false]]) {
      // KTX2 is primary. A small JPEG fallback also handles unsupported/failed transcoders.
      pending.push(loader.loadAsync(`/afrah/textures/${name}-${channel}.ktx2`).catch(() => texture(`${name}-${channel}`,srgb)).then(t => {
        t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(repeat);t.anisotropy=4;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;
        textures.push(t);m[slot]=t;if(channel==='arm')m.aoMap=t;m.needsUpdate=true;
      }));
    }
    m.normalScale.setScalar(name==='stone'?.12:.28);m.aoMapIntensity=.35;
    m.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
        vec4 afrahP=vec4(position,1.);
        #ifdef USE_INSTANCING
        afrahP=instanceMatrix*afrahP;
        #endif
        afrahP=modelMatrix*afrahP;
        vec3 afrahN=abs(normal);
        vec2 metricUV=afrahN.y>.5?afrahP.xz:afrahN.x>.5?afrahP.zy:afrahP.xy;
        metricUV*=${name==='stone'?'.45':name==='road'?'.12':'.25'};
        #ifdef USE_MAP
        vMapUv=metricUV;
        #endif
        #ifdef USE_NORMALMAP
        vNormalMapUv=metricUV;
        #endif
        #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv=metricUV;
        #endif
        #ifdef USE_AOMAP
        vAoMapUv=metricUV;
        #endif`);
    };
    m.customProgramCacheKey=()=>`afrah-metre-${name}`;return m;
  }
  const stone=pbr('stone','#e3d9c9'), paving=pbr('paving','#c1b9aa',3), road=new T.MeshStandardMaterial({color:'#737778',roughness:1}), metal=pbr('metal','#54483b');
  metal.metalness=.88;metal.roughness=.34;metal.normalScale.setScalar(.045);
  const glass=new T.MeshPhysicalMaterial({color:'#a4b1b0',metalness:0,roughness:.12,ior:1.5,transmission:0,transparent:true,opacity:.54,depthWrite:false,thickness:.018,attenuationColor:'#c6d5ce',attenuationDistance:8,envMapIntensity:1.1,clearcoat:.2});
  const railing=new T.MeshPhysicalMaterial({color:'#b8c5be',roughness:.18,metalness:0,ior:1.5,transparent:true,opacity:.27,depthWrite:false,envMapIntensity:.8});
  const rooms=[0,.12,.42,.9].map((v,i)=>new T.MeshStandardMaterial({color:['#4b4841','#88745b','#ad906d','#d6b688'][i],roughness:.94,emissive:['#000000','#e5a568','#ffc28a','#ffd4a0'][i],emissiveIntensity:v*.06}));
  const curtain=new T.MeshStandardMaterial({color:'#b9aea0',roughness:1});
  const dark=new T.MeshStandardMaterial({color:'#353c3c',roughness:.6,metalness:.25});
  const soil=new T.MeshStandardMaterial({color:'#42483c',roughness:1});
  const foliage=new T.MeshStandardMaterial({color:'#5c7152',roughness:.96,side:T.DoubleSide});
  const practical=new T.MeshStandardMaterial({color:'#e9c692',emissive:'#ffd299',emissiveIntensity:.1,roughness:.55});
  const mats={stone,paving,road,metal,glass,railing,rooms,curtain,dark,soil,foliage,practical};
  return { ...mats, ready:Promise.all(pending), textures,
    update(dusk){rooms.forEach((m,i)=>m.emissiveIntensity=[0,.15,.6,1.5][i]*dusk+.015);practical.emissiveIntensity=.08+dusk*2.2;glass.envMapIntensity=1.1+dusk*.35;},
    dispose(){new Set(Object.values(mats).flat()).forEach(m=>m.dispose());new Set(textures).forEach(t=>t.dispose());loader.dispose();}
  };
}

// Every instance shares geometry and material. Geometry receives real-world UVs
// so one metre of stone stays one metre across differently sized facade panels.
export function batchBuilder(parent) {
  const batches=new Map(), geometry=new T.BoxGeometry(1,1,1), transform=new T.Object3D();
  function box(material,x,y,z,w,h,d,angle=0,color=null) {
    if(!batches.has(material))batches.set(material,[]);
    transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,angle,0);transform.updateMatrix();
    batches.get(material).push({matrix:transform.matrix.clone(),color});
  }
  function finish({shadow=true}={}) {
    const meshes=[];
    for(const [mat,entries]of batches){
      const mesh=new T.InstancedMesh(geometry,mat,entries.length);
      entries.forEach((e,i)=>{mesh.setMatrixAt(i,e.matrix);if(e.color)mesh.setColorAt(i,new T.Color(e.color));});
      mesh.castShadow=shadow&&mat.transmission===undefined&&!mat.transparent;mesh.receiveShadow=true;
      mesh.computeBoundingSphere();parent.add(mesh);meshes.push(mesh);
    }
    return meshes;
  }
  return {box,finish};
}
