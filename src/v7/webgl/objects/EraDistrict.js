import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {makeGlass, makeCopper, addFinCoords} from './EraMaterials';

// ERA's own 3D district (era.estate/3d-map, Era_100.gltf) with its original
// baked textures: every building carries ERA's 4K baked shadow atlas on uv0,
// the ground carries the baked offroad plate, grass and asphalt tile on top.
// The towers are the ERA complex itself; a second copy of the complex stands
// across the park, a pool deck sits on the podium, and ERA's tree species are
// planted along every street. Scene scale: 1 unit = 50 m (S = 0.02).
export const S = 0.02;
export const CENTRE = new THREE.Vector3(-128, 0, -80);          // tower complex centre (model metres)
const DIR = '/media/era3d/';

// Standard Surface values read from ERA's Verge3D node graphs.
const LOOK = {
  Bld__Bronze:     {color: [.96, .58, .34], metalness: .9, roughness: .3, env: 1.3},
  Bld__Bronze1:    {color: [.96, .58, .34], metalness: .9, roughness: .3, env: 1.3},
  Bld_Metal_1_ZK:  {color: [.80, .77, .74], metalness: .15, roughness: .55, env: .9},
  Bld_Metal_2_ZK:  {color: [.93, .88, .82], metalness: .3, roughness: .5, env: 1},
  Bld_window1:     {color: [.5, .73, 1.0], metalness: .65, roughness: .06, env: 1.8, glass: true},
  Bld_Dark:        {color: [.6, .51, .365], metalness: 1, roughness: .62, env: 1},
  Bld__roof1:      {color: [.62, .56, .5], metalness: .1, roughness: .8, env: .6},
  Bld_buildinbgs1: {color: [.78, .7, .62], metalness: 0, roughness: .71, env: .5},
  BC_plaza:        {color: [.86, .82, .76], metalness: 0, roughness: .8, env: .4},
  Poi_white_poi:   {color: [.95, .92, .88], metalness: 0, roughness: .8, env: .4},
  poi_gold:        {color: [.95, .72, .38], metalness: .7, roughness: .35, env: 1},
  Poi_green:       {color: [.44, .56, .42], metalness: 0, roughness: .9, env: .3},
  Poi_Torpedo_1:   {color: [.78, .5, .38], metalness: 0, roughness: .85, env: .4},
  Poi_Torpedo_3:   {color: [.66, .7, .74], metalness: .2, roughness: .6, env: .5},
  Poi_Brown:       {color: [.6, .45, .34], metalness: 0, roughness: .9, env: .3},
  Poi_Yellow:      {color: [.92, .8, .5], metalness: 0, roughness: .85, env: .3},
  Poi_Dom_muziki:  {color: [.84, .86, .88], metalness: .4, roughness: .3, env: 1},
  Poi_pavaleckaya_bronze: {color: [.8, .56, .32], metalness: .8, roughness: .35, env: 1},
  Poi_pavelezkaya_blue:   {color: [.4, .55, .7], metalness: .2, roughness: .5, env: .6},
  Lnd_crosswalk:   {color: [.9, .9, .88], metalness: 0, roughness: .9, env: .2},
  Lnd_floor_common:{color: [.78, .74, .68], metalness: 0, roughness: .9, env: .2},
  standardSurface35:{color: [.78, .74, .68], metalness: 0, roughness: .9, env: .2},
  fadeer:          {color: [.7, .7, .66], metalness: 0, roughness: 1, env: .2},
};
const BAKED = /^(Bld_|BC_|Poi_|poi_|Lnd_crosswalk|Lnd_grass|Lnd_asphalt$)/;

// Multiplies the albedo by ERA's baked atlas (own uv set, never tiled).
// With `hole`, fragments inside that model-space rectangle (x0, z0, x1, z1)
// are dropped: city blocks give way to the second phase of towers.
export const HOLE = new THREE.Vector4(28, -322, 312, -44);
// world → ERA model metres, kept current by tick() wherever the quarter is placed
const TO_MODEL = new THREE.Matrix4();
// Extra looks layered on the bake: `stone` adds honed-stone grain and panel
// joints; `lights` (the evening uniform) lights random windows on city blocks.
const BAKE_COMMON = `
float bkH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bkN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(bkH(i), bkH(i + vec2(1, 0)), f.x), mix(bkH(i + vec2(0, 1)), bkH(i + vec2(1, 1)), f.x), f.y); }
`;
function bake(mat, tex, strength = 1, lift = 0, hole = false, extra = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBake = {value: tex};
    sh.uniforms.uBakeK = {value: new THREE.Vector2(strength, lift)};
    sh.uniforms.uHole = {value: HOLE};
    sh.uniforms.uToModel = {value: TO_MODEL};
    sh.uniforms.uEve = extra.lights || {value: 0};
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vBakeUv; varying vec3 vModel;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBakeUv = uv; vModel = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uBake; uniform vec2 uBakeK; uniform vec4 uHole; uniform mat4 uToModel; uniform float uEve; varying vec2 vBakeUv; varying vec3 vModel;' + BAKE_COMMON)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + (hole ? `{ vec2 m = (uToModel * vec4(vModel, 1.0)).xz; if (m.x > uHole.x && m.x < uHole.z && m.y > uHole.y && m.y < uHole.w) discard; }` : ''))
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 bk = texture2D(uBake, vBakeUv).rgb; diffuseColor.rgb *= mix(vec3(1.0), bk * (1.0 - uBakeK.y) + uBakeK.y, uBakeK.x);
        vec3 mm = (uToModel * vec4(vModel, 1.0)).xyz;
        vec3 fn = normalize(cross(dFdx(mm), dFdy(mm)));
        float hor = dot(mm.xz, vec2(-fn.z, fn.x));
        ${extra.stone ? `{
          float jy = abs(fract(mm.y / 1.52) - .5), jx = abs(fract(hor / 1.18) - .5);
          float joint = smoothstep(.465, .495, max(jy, jx)) * (1. - abs(fn.y));
          float grain = bkN(mm.xy * 1.3 + mm.z * .7) * .55 + bkN(vec2(hor, mm.y) * 7.) * .45;
          diffuseColor.rgb *= (1. - joint * .28) * (.9 + grain * .16);
        }` : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${extra.lights ? `if (abs(fn.y) < .35) {
          vec2 g = vec2(hor / 2.7, (mm.y - 1.5) / 3.2);
          vec2 cell = floor(g), f = fract(g);
          float win = step(.2, f.x) * step(f.x, .8) * step(.28, f.y) * step(f.y, .82);
          float lit = step(.6, bkH(cell));
          totalEmissiveRadiance += mix(vec3(1., .66, .36), vec3(1., .86, .66), bkH(cell + 7.)) * win * lit * uEve * (.35 + bkH(cell + 3.) * .7);
        }` : ''}`);
  };
  mat.customProgramCacheKey = () => 'bake' + strength + '_' + lift + (hole ? 'h' : '') + (extra.stone ? 's' : '') + (extra.lights ? 'l' : '');
  return mat;
}

let shared;
export function loadEraDistrict(renderer) {
  return shared ??= build(renderer);
}

async function build(renderer) {
  const tl = new THREE.TextureLoader();
  const tex = (f, srgb = true, rep = 1) => tl.loadAsync(DIR + f).then((t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = false;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (rep !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    return t;
  });
  const draco = new DRACOLoader().setDecoderPath('/reference-study/draco/');
  const [gltf, shadow, ground, grass, asphalt, leaves, sky] = await Promise.all([
    new GLTFLoader().setDRACOLoader(draco).loadAsync(DIR + 'district.glb'),
    tex('shadow.webp'), tex('ground.webp'), tex('grass.webp', true, 50), tex('asphalt.webp', true, 40), tex('leaves.png'),
    tl.loadAsync(DIR + 'sky.webp'),
  ]);
  sky.mapping = THREE.EquirectangularReflectionMapping; sky.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(sky).texture; pmrem.dispose(); sky.dispose();

  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const mats = {};
  const eve = {value: 0};
  const make = (name) => {
    if (mats[name]) return mats[name];
    let m;
    const L = LOOK[name];
    if (name === 'Lnd_grass') m = bake(new THREE.MeshStandardMaterial({map: grass, color: '#8c9c72', roughness: 1}), shadow, 1, .25);
    else if (name === 'Lnd_asphalt' || name === 'Lnd_Asphalt_out') m = bake(new THREE.MeshStandardMaterial({map: asphalt, color: '#9a9690', roughness: .92}), shadow, name === 'Lnd_asphalt' ? 1 : 0, .3);
    else if (name === 'Offroad_2' || name === 'Bld_offroad') m = new THREE.MeshStandardMaterial({map: ground, color: '#b9a893', roughness: 1});
    else if (name === 'Lnd_water') m = new THREE.MeshStandardMaterial({color: '#4c6f7c', roughness: .08, metalness: .2, envMapIntensity: 1.6});
    else if (/^Tree_leafs/.test(name)) m = new THREE.MeshStandardMaterial({map: leaves, alphaTest: .45, side: THREE.DoubleSide, color: name === 'Tree_leafs_02' ? '#93a472' : name === 'Tree_leafs_03' ? '#a3ab6e' : '#86996a', roughness: .9});
    else if (name === 'Tree_bark') m = new THREE.MeshStandardMaterial({color: '#5a4a3c', roughness: 1});
    else if (name === 'Bld_window1') m = makeGlass({envMap, toModel: TO_MODEL, eve});
    else if (name === 'Bld__Bronze' || name === 'Bld__Bronze1') m = makeCopper({envMap, toModel: TO_MODEL, eve, bakeMap: shadow});
    else if (L) {
      m = new THREE.MeshStandardMaterial({color: new THREE.Color(...L.color), metalness: L.metalness, roughness: L.roughness, envMapIntensity: L.env});
      if (BAKED.test(name)) bake(m, shadow, 1, name.startsWith('Bld_') ? .12 : .2, /^(Bld_buildinbgs1|Poi_|poi_|BC_)/.test(name),
        {stone: /^Bld_(Metal|Dark|_roof)/.test(name), lights: /^(Bld_buildinbgs1|Poi_white_poi|Poi_Brown|Poi_Torpedo|BC_plaza)/.test(name) ? eve : null});
    } else m = new THREE.MeshStandardMaterial({color: '#cfc8bc', roughness: .9});
    m.envMap = envMap; m.name = name;
    return mats[name] = m;
  };
  const trees = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = o.material?.name || '';
    if (name === 'pasted__Lnd_floor_common' || name === 'fadeer') { o.visible = false; return; }
    o.material = make(name);
    // towers cast onto each other and the ground; everything built receives
    o.castShadow = /^Bld_(Metal|window|Dark|_roof|_Bronze)|^Bld__/.test(name);
    o.receiveShadow = !/^Tree_leafs|Lnd_water/.test(name);
    if (name === 'Bld__Bronze' || name === 'Bld__Bronze1') addFinCoords(o, o.matrixWorld);
    if (/^Tree_/.test(name)) trees.push(o);
  });

  // The complex's second phase: ERA's own towers again, across the park.
  root.updateMatrixWorld(true);
  const towers = new THREE.Group(); towers.name = 'era-towers';
  const phase2 = new THREE.Group(); phase2.name = 'era-phase-2';
  root.traverse((o) => {
    if (!o.isMesh || !/^Bld_(Metal|window|Bronze|_Bronze|Dark|_roof)|^Bld__/.test(o.material.name)) return;
    const b = new THREE.Box3().setFromObject(o);
    if (b.max.y < 30 || b.min.x < -300 || b.max.x > 40 || b.min.z < -240 || b.max.z > 80) return;
    const c = new THREE.Mesh(o.geometry, o.material); c.applyMatrix4(o.matrixWorld); c.castShadow = true; c.receiveShadow = true; phase2.add(c);
  });
  // rotated a quarter turn and set on the open plot north-east of the park
  phase2.rotation.y = Math.PI / 2;
  phase2.position.set(250, 0, -310);
  towers.add(phase2);

  // Trees: ERA's leaf cards planted as instances along the streets.
  const treeGroup = new THREE.Group();
  const pts = await fetch('/v4/era-map/trees.json').then((r) => r.json()).catch(() => []);
  if (trees.length && pts.length) {
    // the source is a stand of ERA trees: split it into single trees (each
    // crown with its nearest trunk), then plant them. Real trees near the
    // complex; simple crowns in the distance, where a leaf card is a pixel.
    const crowns = trees.filter((t) => /leafs/.test(t.material.name)), trunks = trees.filter((t) => !/leafs/.test(t.material.name));
    const centreOf = (o) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    const species = crowns.map((cr) => {
      const cc = centreOf(cr);
      const tr = trunks.reduce((best, t) => (!best || centreOf(t).distanceTo(cc) < centreOf(best).distanceTo(cc) ? t : best), null);
      const box = new THREE.Box3().setFromObject(cr); if (tr) box.expandByObject(tr);
      const base = box.getCenter(new THREE.Vector3()); base.y = box.min.y;
      const geo = (o) => o.geometry.clone().applyMatrix4(o.matrixWorld).translate(-base.x, -base.y, -base.z);
      return { crown: geo(cr), crownMat: cr.material, trunk: tr ? geo(tr) : null, trunkMat: tr?.material };
    });
    trees.forEach((t) => { t.visible = false; });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    // clearings where the hero camera runs at street level
    const CLEAR = [[-48, 30], [-62, 5], [-75, -20], [-80, -38]];
    const pick = pts.filter(([x, , z]) => Math.hypot(x - CENTRE.x, z - CENTRE.z) < 1500 && !(x > HOLE.x && x < HOLE.z && z > HOLE.y && z < HOLE.w)
      && CLEAR.every(([cx, cz]) => Math.hypot(x - cx, z - cz) > 34));
    const close = pick.filter(([x, , z]) => Math.hypot(x - CENTRE.x, z - CENTRE.z) < (innerWidth < 760 ? 240 : 400));
    const far = pick.filter(([x, , z]) => Math.hypot(x - CENTRE.x, z - CENTRE.z) >= (innerWidth < 760 ? 240 : 400));
    species.forEach((sp, k) => {
      const mine = close.filter((_, i) => i % species.length === k);
      const place = (geo, mat, list = mine) => {
        const mesh = new THREE.InstancedMesh(geo, mat, list.length); let n = 0;
        list.forEach(([x, y, z, s]) => { q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5) % 6.283); mesh.setMatrixAt(n++, m4.compose(p.set(x, y, z), q, sc.setScalar(.8 + s * .25))); });
        treeGroup.add(mesh);
      };
      place(sp.crown, sp.crownMat);
      if (sp.trunk) place(sp.trunk, sp.trunkMat, mine.filter(([x, , z]) => Math.hypot(x - CENTRE.x, z - CENTRE.z) < 260));
    });
    const blob = new THREE.IcosahedronGeometry(1, 1); blob.scale(5.5, 6.5, 5.5); blob.translate(0, 8, 0);
    const blobMat = new THREE.MeshStandardMaterial({color: '#6f8656', roughness: 1, flatShading: true});
    const distant = new THREE.InstancedMesh(blob, blobMat, far.length);
    far.forEach(([x, y, z, s], i) => distant.setMatrixAt(i, m4.compose(p.set(x, y, z), q.identity(), sc.setScalar(.7 + s * .25))));
    treeGroup.add(distant);
  }

  // Pool deck on the podium courtyard (ERA's podium roof at +13.5 m).
  const pools = new THREE.Group();
  const waterMat = new THREE.ShaderMaterial({
    transparent: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {uTime: {value: 0}, uSky: {value: new THREE.Color('#bfe3ee')}, uDeep: {value: new THREE.Color('#136f82')}, uEve: {value: 0}}]),
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSky; uniform vec3 uDeep; uniform float uEve; varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return sin(p.x * 3.1 + uTime * .9) * sin(p.y * 2.3 - uTime * .7) + sin((p.x - p.y) * 5.7 + uTime * 1.3) * .35; }
      void main(){
        vec2 p = vW.xz * 180.;
        float e = .02;
        vec3 n = normalize(vec3(h(p + vec2(e, 0.)) - h(p - vec2(e, 0.)), 6., h(p + vec2(0., e)) - h(p - vec2(0., e))));
        vec3 V = normalize(cameraPosition - vW);
        float fr = .03 + .97 * pow(1. - max(dot(V, n), 0.), 5.);
        float edge = smoothstep(0., .08, vUv.x) * smoothstep(0., .08, 1. - vUv.x) * smoothstep(0., .14, vUv.y) * smoothstep(0., .14, 1. - vUv.y);
        vec3 body = mix(uDeep * .55, uDeep * 1.15, edge);
        body += vec3(.03, .26, .3) * uEve * (.25 + .55 * edge);               // underwater lights
        vec3 col = mix(body, uSky, clamp(fr, 0., .85));
        col += pow(max(dot(reflect(-V, n), normalize(vec3(-.5, .4, -.7))), 0.), 180.) * .8;
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const deckMat = bake(new THREE.MeshStandardMaterial({color: '#d9cdb9', roughness: .85, envMap}), shadow, 0);
  const pool = (x, z, w, d, ry = 0) => {
    const g = new THREE.Group(); g.position.set(x, 13.6, z); g.rotation.y = ry;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 8, .35, d + 8), deckMat); deck.position.y = -.1;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = .085;
    g.add(deck, water);
    // loungers along the long edge
    const lounger = new THREE.BoxGeometry(1, .5, 2.2), lm = new THREE.MeshStandardMaterial({color: '#f3eee6', roughness: .7, envMap});
    for (let i = 0; i < Math.floor(w / 3.2); i++) { const l = new THREE.Mesh(lounger, lm); l.position.set(-w / 2 + 1.6 + i * 3.2, .35, d / 2 + 2.6); g.add(l); }
    pools.add(g); return g;
  };
  pool(-82, 10, 38, 9);
  pool(-126, 8, 16, 7);

  // the land runs on past the edge of ERA's map disc into the haze
  const land = new THREE.Mesh(new THREE.CircleGeometry(60000, 48), new THREE.MeshStandardMaterial({color: '#d6c2aa', roughness: 1}));
  land.rotation.x = -Math.PI / 2; land.position.y = -12;
  root.add(land);

  const holder = new THREE.Group();
  holder.scale.setScalar(S);
  holder.position.set(-CENTRE.x * S, 0, -CENTRE.z * S);
  holder.add(root, towers, treeGroup, pools);
  holder.updateMatrixWorld(); TO_MODEL.copy(holder.matrixWorld).invert();

  return {
    group: holder, envMap, waterMat, materials: mats,
    // evening: 0 = golden hour, 1 = dusk with rooms lit
    setEvening(k) { eve.value = k; waterMat.uniforms.uEve.value = k; },
    tick(t) { waterMat.uniforms.uTime.value = t; holder.updateMatrixWorld(); TO_MODEL.copy(holder.matrixWorld).invert(); },
  };
}
