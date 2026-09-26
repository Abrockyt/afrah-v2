import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {makeGlass, makeCopper, addFinCoords, makeWater} from './EraMaterials';

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
  const [gltf, shadow, ground, grass, asphalt, leaves, sky, phTree, rooms] = await Promise.all([
    new GLTFLoader().setDRACOLoader(draco).loadAsync(DIR + 'district.glb'),
    tex('shadow.webp'), tex('ground.webp'), tex('grass.webp', true, 50), tex('asphalt.webp', true, 40), tex('leaves.png'),
    tl.loadAsync(DIR + 'sky.webp'),
    // Poly Haven's tree_small_02 (CC0): a real scanned-texture tree for the garden
    new GLTFLoader().loadAsync('/afrah/models/tree.glb').catch(() => null),
    // real interiors for the rooms behind the glass
    tl.loadAsync(DIR + 'rooms.webp').then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }),
  ]);
  sky.mapping = THREE.EquirectangularReflectionMapping; sky.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(sky).texture; pmrem.dispose(); sky.dispose();

  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const mats = {};
  const eve = {value: 0};
  const waterTime = {value: 0};
  const make = (name) => {
    if (mats[name]) return mats[name];
    let m;
    const L = LOOK[name];
    if (name === 'Lnd_grass') m = bake(new THREE.MeshStandardMaterial({map: grass, color: '#a5b684', roughness: 1}), shadow, 1, .35);
    else if (name === 'Lnd_asphalt' || name === 'Lnd_Asphalt_out') m = bake(new THREE.MeshStandardMaterial({map: asphalt, color: '#9a9690', roughness: .92}), shadow, name === 'Lnd_asphalt' ? 1 : 0, .3);
    else if (name === 'Offroad_2' || name === 'Bld_offroad') m = new THREE.MeshStandardMaterial({map: ground, color: '#b9a893', roughness: 1});
    else if (name === 'Lnd_water') m = makeWater({envMap, toModel: TO_MODEL, time: waterTime, eve, deep: '#0d2a33', scale: 3});
    else if (/^Tree_leafs/.test(name)) m = new THREE.MeshStandardMaterial({map: leaves, alphaTest: .45, side: THREE.DoubleSide, color: name === 'Tree_leafs_02' ? '#93a472' : name === 'Tree_leafs_03' ? '#a3ab6e' : '#86996a', roughness: .9});
    else if (name === 'Tree_bark') m = new THREE.MeshStandardMaterial({color: '#5a4a3c', roughness: 1});
    else if (name === 'Bld_window1') m = makeGlass({envMap, toModel: TO_MODEL, eve, rooms});
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
    const GARDEN = innerWidth < 760 ? 60 : 105;
    const garden = phTree ? pick.filter(([x, , z]) => Math.hypot(x - CENTRE.x, z - CENTRE.z) < GARDEN) : [];
    const close = pick.filter(([x, , z]) => { const d = Math.hypot(x - CENTRE.x, z - CENTRE.z); return d < (innerWidth < 760 ? 240 : 400) && (!phTree || d >= GARDEN); });
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
    if (phTree && garden.length) {
      // the garden round the towers: full trees, each turned and sized differently
      phTree.scene.updateMatrixWorld(true);
      phTree.scene.traverse((o) => {
        if (!o.isMesh) return;
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        const m = o.material.clone();
        if (/leaves/.test(m.name)) { m.transparent = false; m.alphaTest = .5; m.depthWrite = true; m.side = THREE.DoubleSide; m.color.multiplyScalar(.9); }
        m.envMap = envMap; m.envMapIntensity = .5;
        const mesh = new THREE.InstancedMesh(g, m, garden.length);
        garden.forEach(([x, y, z, s], i) => {
          const r = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5);
          q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r % 6.283);
          mesh.setMatrixAt(i, m4.compose(p.set(x, y, z), q, sc.setScalar(2.6 + (r % 1) * 1.1 + s * .3)));
        });
        mesh.receiveShadow = true;
        treeGroup.add(mesh);
      });
    }
    // garden lamps: warm bollards and post lanterns among the trees, lit at dusk
    {
      const spots = [...garden, ...close].filter((_, i) => i % 3 === 0).slice(0, 260);
      const lamp = new THREE.SphereGeometry(.35, 8, 6);
      const lampMat = new THREE.MeshStandardMaterial({color: '#2a2622', emissive: '#ffb56b', emissiveIntensity: 0, roughness: .6});
      lampMat.onBeforeCompile = (sh) => { sh.uniforms.uEve = eve; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uEve;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vec3(1., .66, .36) * 6. * uEve;'); };
      lampMat.customProgramCacheKey = () => 'era-lamp';
      const lamps = new THREE.InstancedMesh(lamp, lampMat, spots.length);
      spots.forEach(([x, y, z], i) => { const a = i * 2.39; lamps.setMatrixAt(i, m4.compose(p.set(x + Math.cos(a) * 4, y + 3.2, z + Math.sin(a) * 4), q.identity(), sc.setScalar(1))); });
      treeGroup.add(lamps);
    }
    const blob = new THREE.IcosahedronGeometry(1, 1); blob.scale(5.5, 6.5, 5.5); blob.translate(0, 8, 0);
    const blobMat = new THREE.MeshStandardMaterial({color: '#6f8656', roughness: 1, flatShading: true});
    const distant = new THREE.InstancedMesh(blob, blobMat, far.length);
    far.forEach(([x, y, z, s], i) => distant.setMatrixAt(i, m4.compose(p.set(x, y, z), q.identity(), sc.setScalar(.7 + s * .25))));
    treeGroup.add(distant);
  }

  // The resort deck on the podium courtyard (ERA's podium roof at +13.5 m):
  // a 64 m pool with stone coping, a lap pool, loungers and umbrellas.
  const pools = new THREE.Group();
  const waterMat = makeWater({envMap, toModel: TO_MODEL, time: waterTime, eve, deep: '#0d4d5c', glow: .5, scale: .8, amp: .4});
  const deckMat = bake(new THREE.MeshStandardMaterial({color: '#cfc2ad', roughness: .78, envMap}), shadow, 0, 0, false, {stone: true});
  const coping = new THREE.MeshStandardMaterial({color: '#ece5d8', roughness: .55, envMap});
  const basin = new THREE.MeshStandardMaterial({color: '#6fb7c2', roughness: .4, envMap});
  const fabric = new THREE.MeshStandardMaterial({color: '#f2ede4', roughness: .85, envMap});
  const teak = new THREE.MeshStandardMaterial({color: '#7a5436', roughness: .6, envMap});
  const canopy = new THREE.MeshStandardMaterial({color: '#efe7da', roughness: .9, side: THREE.DoubleSide, envMap});
  const box = (w, h, d, mat, x, y, z, g, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const pool = (x, z, w, d, ry = 0, deckPad = 6, loungers = true) => {
    const g = new THREE.Group(); g.position.set(x, 13.6, z); g.rotation.y = ry;
    // deck round the pool (four slabs, so the water sits in an opening)
    const P = deckPad;
    box(w + P * 2, .3, P, deckMat, 0, -.15, d / 2 + P / 2 + .4, g); box(w + P * 2, .3, P, deckMat, 0, -.15, -d / 2 - P / 2 - .4, g);
    box(P, .3, d + .8, deckMat, w / 2 + P / 2 + .4, -.15, 0, g); box(P, .3, d + .8, deckMat, -w / 2 - P / 2 - .4, -.15, 0, g);
    // coping ring and a tiled basin a little below the deck
    box(w + .8, .12, .4, coping, 0, .06, d / 2 + .2, g); box(w + .8, .12, .4, coping, 0, .06, -d / 2 - .2, g);
    box(.4, .12, d, coping, w / 2 + .2, .06, 0, g); box(.4, .12, d, coping, -w / 2 - .2, .06, 0, g);
    box(w, .05, d, basin, 0, -.9, 0, g);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = -.08; water.receiveShadow = true;
    g.add(water);
    if (loungers) for (let i = 0; i < Math.floor(w / 2.6); i++) {
      const lx = -w / 2 + 1.3 + i * 2.6, lz = d / 2 + 2.4;
      box(.75, .12, 1.9, fabric, lx, .38, lz, g);
      box(.75, .1, .8, fabric, lx, .62, lz + .85, g, 0, -.6);
      box(.08, .3, 1.8, teak, lx - .34, .2, lz, g); box(.08, .3, 1.8, teak, lx + .34, .2, lz, g);
      if (i % 2 === 0) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.6, 6), teak); pole.position.set(lx + 1.3, 1.3, lz + .4); g.add(pole);
        const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, .45, 8, 1, true), canopy); top.position.set(lx + 1.3, 2.55, lz + .4); top.castShadow = true; g.add(top);
      }
    }
    pools.add(g); return g;
  };
  pool(-82, 9, 64, 16, 0, 6);
  pool(-139, 9, 18, 6, 0, 3, false);

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
    setEvening(k) { eve.value = k; },
    tick(t) { waterTime.value = t; holder.updateMatrixWorld(); TO_MODEL.copy(holder.matrixWorld).invert(); },
  };
}
