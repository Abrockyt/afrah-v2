import * as THREE from 'three';

// Tileable noise for the volumetric clouds, generated once at load.
//   3D (32³, RG): R = Perlin-Worley (billowy base shape), G = Worley fbm (erosion detail)
//   2D (256², R): weather map — where the cloud deck is thick or open
function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function worley3(N, cells, rand) {
  const pts = new Float32Array(cells * cells * cells * 3);
  for (let i = 0; i < pts.length; i++) pts[i] = rand();
  const out = new Float32Array(N * N * N), s = cells / N;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x * s, py = y * s, pz = z * s, cx = Math.floor(px), cy = Math.floor(py), cz = Math.floor(pz);
    let best = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx, gy = cy + dy, gz = cz + dz;
      const wx = (gx + cells) % cells, wy = (gy + cells) % cells, wz = (gz + cells) % cells, k = ((wz * cells + wy) * cells + wx) * 3;
      const fx = gx + pts[k] - px, fy = gy + pts[k + 1] - py, fz = gz + pts[k + 2] - pz;
      const d = fx * fx + fy * fy + fz * fz; if (d < best) best = d;
    }
    out[(z * N + y) * N + x] = 1 - Math.min(1, Math.sqrt(best));
  }
  return out;
}

function value3(N, period, rand) {
  const g = new Float32Array(period * period * period);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const at = (x, y, z) => g[(((z % period) + period) % period * period + (((y % period) + period) % period)) * period + (((x % period) + period) % period)];
  const out = new Float32Array(N * N * N), s = period / N, f = (t) => t * t * (3 - 2 * t);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x * s, py = y * s, pz = z * s, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
    const u = f(px - ix), v = f(py - iy), w = f(pz - iz);
    const l = (a, b, t) => a + (b - a) * t;
    out[(z * N + y) * N + x] = l(l(l(at(ix, iy, iz), at(ix + 1, iy, iz), u), l(at(ix, iy + 1, iz), at(ix + 1, iy + 1, iz), u), v),
      l(l(at(ix, iy, iz + 1), at(ix + 1, iy, iz + 1), u), l(at(ix, iy + 1, iz + 1), at(ix + 1, iy + 1, iz + 1), u), v), w);
  }
  return out;
}

export function makeCloudNoise() {
  const N = 64, rand = rng(1337);
  const w1 = worley3(N, 4, rand), w2 = worley3(N, 8, rand), w3 = worley3(N, 16, rand);
  const v1 = value3(N, 4, rand), v2 = value3(N, 8, rand), v3 = value3(N, 16, rand);
  const R = new Float32Array(N * N * N), G = new Float32Array(N * N * N);
  for (let i = 0; i < N * N * N; i++) {
    const perlin = v1[i] * .55 + v2[i] * .3 + v3[i] * .15;
    const worley = w1[i] * .625 + w2[i] * .25 + w3[i] * .125;
    // Perlin-Worley: billows (worley) carved by perlin
    R[i] = perlin * .45 + worley * .55;
    G[i] = w2[i] * .5 + w3[i] * .35 + v3[i] * .15;
  }
  // stretch both to the full 0..1 range (2%–98%), so thresholds make real gaps
  const stretch = (A) => { const s = Float32Array.from(A).sort(), lo = s[Math.floor(s.length * .02)], hi = s[Math.floor(s.length * .98)];
    for (let i = 0; i < A.length; i++) A[i] = Math.max(0, Math.min(1, (A[i] - lo) / (hi - lo))); };
  stretch(R); stretch(G);
  const data = new Uint8Array(N * N * N * 2);
  for (let i = 0; i < N * N * N; i++) { data[i * 2] = Math.round(R[i] * 255); data[i * 2 + 1] = Math.round(G[i] * 255); }
  const tex3 = new THREE.Data3DTexture(data, N, N, N);
  tex3.format = THREE.RGFormat; tex3.type = THREE.UnsignedByteType;
  tex3.wrapS = tex3.wrapT = tex3.wrapR = THREE.RepeatWrapping;
  tex3.minFilter = tex3.magFilter = THREE.LinearFilter; tex3.unpackAlignment = 1; tex3.needsUpdate = true;

  const M = 256, wd = new Uint8Array(M * M), r2 = rng(7);
  const P = 8, grid = new Float32Array(P * P * 4);
  for (let i = 0; i < grid.length; i++) grid[i] = r2();
  const at = (x, y, p, o) => grid[o + (((y % p) + p) % p) * p + (((x % p) + p) % p)];
  const sm = (t) => t * t * (3 - 2 * t);
  const oct = (u, v, p, o) => { const x = u * p, y = v * p, ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
    return (at(ix, iy, p, o) * (1 - fx) + at(ix + 1, iy, p, o) * fx) * (1 - fy) + (at(ix, iy + 1, p, o) * (1 - fx) + at(ix + 1, iy + 1, p, o) * fx) * fy; };
  const W = new Float32Array(M * M);
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
    const u = x / M, v = y / M;
    W[y * M + x] = oct(u, v, 2, 0) * .5 + oct(u, v, 4, 64) * .3 + oct(u, v, 8, 128) * .2;
  }
  { const s2 = Float32Array.from(W).sort(), lo = s2[Math.floor(W.length * .02)], hi = s2[Math.floor(W.length * .98)];
    for (let i = 0; i < W.length; i++) wd[i] = Math.round(Math.max(0, Math.min(1, (W[i] - lo) / (hi - lo))) * 255); }
  const weather = new THREE.DataTexture(wd, M, M, THREE.RedFormat, THREE.UnsignedByteType);
  weather.wrapS = weather.wrapT = THREE.RepeatWrapping; weather.minFilter = weather.magFilter = THREE.LinearFilter; weather.unpackAlignment = 1; weather.needsUpdate = true;
  return { tex3, weather };
}
