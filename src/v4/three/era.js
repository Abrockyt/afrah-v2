import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Shared loading + architectural material system for the district study model
// (tools/extract-era-map.py). Geometry is reused as a study; every material is replaced here.
export const MAP = '/v4/era-map/';
export const TOWERS_CENTER = new THREE.Vector3(-120, 0, -95);
export const TALL_TOWER = {x: -140, z: -121, base: 3, top: 266};

const cache = new Map();
export function loadGLB(name) {
  if (!cache.has(name)) cache.set(name, new GLTFLoader().loadAsync(MAP + name).then(g => g.scene));
  return cache.get(name).then(scene => scene.clone(true));
}
let treeCache;
export function loadTrees() { return treeCache ??= fetch(MAP + 'trees.json').then(r => r.json()); }

const skins = {
  day: {
    building: ['#c4c5b9', .92, 0], ground: ['#d5d1bd', 1, 0], road: ['#8e968f', 1, 0], grass: ['#75936e', 1, 0], water: ['#4f8699', .17, .35],
    poi: ['#dfd2b9', .75, 0], tree: '#567a58', towerMetal: ['#c8b8a0', .38, .62], towerChrome: ['#dfc2a1', .25, .8], towerDark: ['#334b55', .42, .3], roof: ['#a69078', .72, .25], glass: ['#345367', .12, .5],
  },
  night: {
    building: ['#374950', .9, 0], ground: ['#1d3439', 1, 0], road: ['#263941', 1, 0], grass: ['#294b3f', 1, 0], water: ['#143e51', .16, .5],
    poi: ['#725e50', .7, 0], tree: '#31513e', towerMetal: ['#b7a58f', .34, .7], towerChrome: ['#dcc29e', .25, .8], towerDark: ['#1d3a48', .5, .4], roof: ['#806e5c', .65, .35], glass: ['#1e3b4a', .1, .6],
  },
  cinematic: {
    building: ['#7c8989', .92, 0], ground: ['#87988e', 1, 0], road: ['#5b7375', .94, 0], grass: ['#507457', 1, 0], water: ['#32627b', .15, .4],
    poi: ['#a6a89d', .7, 0], tree: '#496e50', towerMetal: ['#cfac88', .37, .65], towerChrome: ['#e4bd91', .22, .82], towerDark: ['#2b4350', .48, .36], roof: ['#9d806a', .7, .3], glass: ['#244658', .08, .55],
  },
};
function kind(name) {
  if (/ZK/.test(name)) return 'towerMetal';
  if (/Bronze/.test(name)) return 'towerChrome';
  if (/Bld_Dark/.test(name)) return 'towerDark';
  if (/roof/.test(name)) return 'roof';
  if (/window/.test(name)) return 'glass';
  if (/water/i.test(name)) return 'water';
  if (/grass/i.test(name)) return 'grass';
  if (/asphalt|crosswalk/i.test(name)) return 'road';
  if (/floor|Offroad|fadeer|ramp/i.test(name)) return 'ground';
  if (/Poi|poi|plaza/.test(name)) return 'poi';
  return 'building';
}
export const isTower = name => ['towerMetal', 'towerChrome', 'towerDark', 'roof', 'glass'].includes(kind(name));

// Replaces every material with a shared MeshStandardMaterial per kind. Returns {materials, dispose}.
export function skin(root, mode = 'day', {towersOnly = false} = {}) {
  const s = skins[mode], mats = {};
  const make = k => {
    if (mats[k]) return mats[k];
    const [color, roughness, metalness] = s[k];
    const m = k === 'glass'
      ? new THREE.MeshPhysicalMaterial({color, roughness, metalness, clearcoat: .85, clearcoatRoughness: .08, envMapIntensity: 1.5,
        transparent: mode === 'cinematic', opacity: mode === 'cinematic' ? .82 : 1, depthWrite: mode !== 'cinematic'})
      : new THREE.MeshStandardMaterial({color, roughness, metalness, envMapIntensity: k.startsWith('tower') ? 1.15 : .55});
    if (k === 'glass') {
      m.emissive = new THREE.Color('#ffc58c'); m.emissiveIntensity = 0;
      // Individual bays glow like occupied rooms rather than one flat emissive shell.
      if (mode === 'cinematic') m.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFacadeWorld;')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvFacadeWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFacadeWorld;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            float floorId=floor(vFacadeWorld.y/10.2);
            float bayId=floor((vFacadeWorld.x+vFacadeWorld.z*.47)/7.5);
            float room=fract(sin(dot(vec2(floorId,bayId),vec2(12.9898,78.233)))*43758.5453);
            float occupied=step(.47,room);
            totalEmissiveRadiance*=mix(.045,1.55,occupied);`);
      };
    }
    m.userData.kind = k;
    return mats[k] = m;
  };
  root.traverse(o => {
    if (!o.isMesh) return;
    const name = o.material?.name || '', k = kind(name);
    if (towersOnly && !isTower(name)) { o.visible = false; return; }
    o.material?.dispose?.();
    o.material = make(k);
    o.castShadow = k.startsWith('tower') || k === 'building' || k === 'roof' || k === 'glass';
    o.receiveShadow = true;
    o.userData.kind = k;
  });
  return {materials: mats, dispose: () => Object.values(mats).forEach(m => m.dispose())};
}

// ERA's 856 tree instances, redrawn as one instanced low-poly crown.
export function makeTrees(points, mode = 'day') {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  geo.scale(7, 8.5, 7); geo.translate(0, 9, 0);
  const mat = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .95, flatShading: true});
  const mesh = new THREE.InstancedMesh(geo, mat, points.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const foliage = new THREE.Color(skins[mode].tree);
  points.forEach(([x, y, z, s], i) => { const k = .75 + ((i * 7919) % 100) / 180; mesh.setMatrixAt(i, m.compose(v.set(x, y, z), q, sc.setScalar(s * k * .6)));
    mesh.setColorAt(i, foliage.clone().offsetHSL(((i * 37) % 11 - 5) * .003, ((i * 71) % 9 - 4) * .009, ((i * 43) % 15 - 7) * .008)); });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.dispose = () => { geo.dispose(); mat.dispose(); };
  return mesh;
}

// Modelled floor plates and warm room-depth elements sit behind translucent
// facade glazing. Instances keep hundreds of details to two draw calls.
export function addInteriors(root) {
  root.updateMatrixWorld(true);
  const bounds = [];
  root.traverse(o => {
    if (!o.isMesh || o.userData.kind !== 'glass') return;
    const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
    if (size.y > 90 && size.x > 20 && size.z > 20) bounds.push(box);
  });
  const floors = [], lights = [];
  for (const b of bounds) {
    const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    for (let y = b.min.y + 6; y < b.max.y - 3; y += 10.15) {
      floors.push({p: [c.x, y, c.z], s: [Math.max(5, s.x - 4), .42, Math.max(5, s.z - 4)]});
      for (let i = 0; i < Math.max(2, Math.floor(s.x / 9)); i++) {
        const x = b.min.x + 5 + i * 8.6;
        const occupied = Math.sin((i + 1) * 12.989 + y * .881 + c.x * .117) > -.12;
        if (occupied) lights.push({p: [x, y + 2.3, b.max.z - 2.6], s: [2.7, 1.5, .25]});
      }
    }
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1), matrix = new THREE.Matrix4(), pos = new THREE.Vector3(), scale = new THREE.Vector3(), rot = new THREE.Quaternion();
  const floorMat = new THREE.MeshStandardMaterial({color: '#6c5848', roughness: .84, metalness: .08});
  const lightMat = new THREE.MeshStandardMaterial({color: '#ffc18c', emissive: '#ffb071', emissiveIntensity: .04, roughness: .9});
  const place = (entries, material) => {
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    entries.forEach(({p, s}, i) => mesh.setMatrixAt(i, matrix.compose(pos.set(...p), rot, scale.set(...s))));
    mesh.instanceMatrix.needsUpdate = true; root.add(mesh); return mesh;
  };
  const floorMesh = place(floors, floorMat), lightMesh = place(lights, lightMat);
  return {lightMat, dispose() { root.remove(floorMesh, lightMesh); geometry.dispose(); floorMat.dispose(); lightMat.dispose(); }};
}

export function environment(renderer, intensity = .04) {
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const env = pmrem.fromScene(room, intensity); room.dispose(); pmrem.dispose();
  return env;
}

export function renderer(el, {alpha = false, shadows = false} = {}) {
  const r = new THREE.WebGLRenderer({antialias: true, alpha, powerPreference: 'high-performance'});
  r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .92;
  r.shadowMap.enabled = shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(r.domElement);
  return r;
}

export function disposeTree(root) {
  root.traverse(o => { o.geometry?.dispose(); o.userData.dispose?.(); });
}
