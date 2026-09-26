import * as THREE from 'three';

// ERA's bronze leaf, freed from the facade: a lanceolate copper leaf with a
// cupped blade, a slight bow along its length, a short stalk, and the same
// veined copper shader the towers wear. Geometry spans 2 units along +Y
// (stalk at -1, tip at +1) so it drops straight into the measured fall poses.

const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); WHITE.needsUpdate = true;

export function leafGeometry(segW = 24, segL = 110) {
  const g = new THREE.PlaneGeometry(0.5, 2, segW, segL);
  const pos = g.attributes.position, n = pos.count;
  const fin = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const v = (y + 1) / 2;                                    // 0 stalk → 1 tip
    const u = x / 0.25;                                       // -1..1 across
    const w = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.82)), 0.78) * (1 - 0.1 * v);
    const px = 0.25 * u * Math.max(w, 0.012);
    const cup = -0.07 * u * u * w;                            // blade cupped towards the viewer's back
    const bow = 0.14 * Math.sin(Math.PI * v) - 0.05 * v;      // gentle bow along the length
    const twist = 0.12 * (v - 0.5) * u * w;                   // a hint of twist
    pos.setXYZ(i, px, y, cup + bow + twist);
    // leaf coordinates in "facade metres" for the vein shader (a 12 m leaf)
    fin[i * 4] = u; fin[i * 4 + 1] = v * 12; fin[i * 4 + 2] = 1.3; fin[i * 4 + 3] = 12;
  }
  g.setAttribute('aFin', new THREE.BufferAttribute(fin, 4));
  g.computeVertexNormals();
  return g;
}

// A painted copper leaf: colour with patina and darker veins, a height field
// (raised midrib, grooved side veins, a thickened rim) turned into a normal
// map, and matching roughness. Drawn once on canvases at load.
let _tex;
function leafTextures() {
  if (_tex) return _tex;
  const W = 512, H = 2048;
  const hc = document.createElement('canvas'); hc.width = W; hc.height = H;
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H;
  const hg = hc.getContext('2d'), cg = cc.getContext('2d');
  // colour: warm copper, deeper at the stalk, lighter at the tip, patina blotches
  const grad = cg.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0, '#7e4527'); grad.addColorStop(0.45, '#b06a41'); grad.addColorStop(1, '#d99a6c');
  cg.fillStyle = grad; cg.fillRect(0, 0, W, H);
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H, r = 20 + rnd() * 90;
    const g = cg.createRadialGradient(x, y, 0, x, y, r);
    const c = rnd() < 0.25 ? 'rgba(96,120,96,' : rnd() < 0.6 ? 'rgba(236,178,132,' : 'rgba(90,44,24,';
    g.addColorStop(0, c + (0.05 + rnd() * 0.08) + ')'); g.addColorStop(1, c + '0)');
    cg.fillStyle = g; cg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // height: mid grey base, rim thickened
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  const rim = hg.createLinearGradient(0, 0, W, 0);
  rim.addColorStop(0, '#a0a0a0'); rim.addColorStop(0.06, '#808080'); rim.addColorStop(0.94, '#808080'); rim.addColorStop(1, '#a0a0a0');
  hg.fillStyle = rim; hg.fillRect(0, 0, W, H);
  const stroke = (ctx, style, w, path) => { ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); path(ctx); ctx.stroke(); };
  // side veins: curved from the midrib to the edge, alternating a little
  for (let k = 0; k < 26; k++) {
    const v = 0.05 + k * 0.034;
    for (const side of [-1, 1]) {
      const y0 = H * (1 - v - (side > 0 ? 0.008 : 0)), y1 = y0 - H * 0.075, y2 = y0 - H * 0.11;
      const path = (c) => { c.moveTo(W / 2, y0); c.quadraticCurveTo(W / 2 + side * W * 0.22, y1, W / 2 + side * W * 0.49, y2); };
      stroke(hg, 'rgba(40,40,40,.55)', 9, path);
      stroke(hg, 'rgba(210,210,210,.5)', 3, path);
      stroke(cg, 'rgba(92,46,24,.45)', 5, path);
      stroke(cg, 'rgba(246,196,150,.35)', 1.5, path);
    }
  }
  // midrib: a raised spine
  const rib = (c) => { c.moveTo(W / 2, H); c.lineTo(W / 2, 0); };
  stroke(hg, 'rgba(255,255,255,.9)', 22, rib); stroke(hg, '#ffffff', 8, rib);
  stroke(cg, 'rgba(120,62,32,.6)', 16, rib); stroke(cg, 'rgba(250,206,160,.7)', 4, rib);
  // height → normal map
  const hd = hg.getImageData(0, 0, W, H).data, nc = document.createElement('canvas'); nc.width = W; nc.height = H;
  const ng = nc.getContext('2d'), nimg = ng.createImageData(W, H), nd = nimg.data;
  const at = (x, y) => hd[((Math.min(H - 1, Math.max(0, y)) * W) + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2;
    const l = Math.hypot(dx, dy, 1), i = (y * W + x) * 4;
    nd[i] = (-dx / l * 0.5 + 0.5) * 255; nd[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd[i + 3] = 255;
  }
  ng.putImageData(nimg, 0, 0);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  _tex = { map: tex(cc, true), normalMap: tex(nc, false) };
  return _tex;
}

export function leafMaterial({ envMap, color = null } = {}) {
  const t = leafTextures();
  return new THREE.MeshPhysicalMaterial({
    map: color ? null : t.map, color: color || '#ffffff', normalMap: t.normalMap, normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: color ? 0.1 : 0.72, roughness: color ? 0.7 : 0.36, clearcoat: 0.35, clearcoatRoughness: 0.4,
    envMap, envMapIntensity: 1.1, side: THREE.DoubleSide,
  });
}

export function createLeaf({ envMap } = {}) {
  const mat = leafMaterial({ envMap });
  const group = new THREE.Group();
  const blade = new THREE.Mesh(leafGeometry(), mat);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.34, 10), new THREE.MeshPhysicalMaterial({ color: '#7a4526', metalness: 0.6, roughness: 0.42, envMap }));
  stalk.position.set(0, -1.12, 0.0);
  blade.castShadow = stalk.castShadow = true;
  group.add(blade, stalk);
  group.userData = { eve: { value: 0 }, material: mat };
  return group;
}

// Many small leaves as one instanced mesh (far field and the transition storm).
export function createLeafSwarm(count, { envMap, color = null } = {}) {
  const mesh = new THREE.InstancedMesh(leafGeometry(8, 28), leafMaterial({ envMap, color }), count);
  mesh.frustumCulled = false;
  return mesh;
}
