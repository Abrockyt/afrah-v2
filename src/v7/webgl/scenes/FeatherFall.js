import * as THREE from 'three';
import data from '../data/featherFall.json';

// Feather fall driven entirely by measured keys (see tools/derive_feather_keys.py).
// Screen ratios are mapped to world units on the z=0 plane for a straight-on
// camera at distance CAM_D, so every key lands at the same screen fraction at
// any viewport size. Orientation keys are converted to quaternions once and
// slerped between neighbours.

export const CAM_D = 4.3;
export const FOV = 38;
const halfH = CAM_D * Math.tan((FOV / 2) * Math.PI / 180);

const D2R = Math.PI / 180;
const keys = data.keys;
const quats = keys.map((k) => {
  // roll: screen angle of the tip (image coords, y down) -> rotation about Z
  const a = k.roll * D2R;
  const dirX = Math.cos(a), dirY = -Math.sin(a);
  const rz = Math.atan2(-dirX, dirY);
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(k.pitch * D2R, k.spin * D2R, rz, 'ZXY'));
});

function seg(p, arr) {
  let i = 0;
  while (i < arr.length - 2 && p > arr[i + 1].p) i++;
  const a = arr[i], b = arr[i + 1];
  const t = Math.max(0, Math.min(1, (p - a.p) / Math.max(1e-6, b.p - a.p)));
  return [i, t];
}
// Catmull-Rom on a scalar field of the key list (uniform parameterisation)
function crom(arr, field, i, t) {
  const p0 = arr[Math.max(0, i - 1)][field], p1 = arr[i][field], p2 = arr[i + 1][field], p3 = arr[Math.min(arr.length - 1, i + 2)][field];
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function screenToWorld(cx, cy, aspect, out) {
  out.set((cx - 0.5) * 2 * halfH * aspect, (0.5 - cy) * 2 * halfH, 0);
  return out;
}
export function featherScale(aspect) {
  // geometry is 2 units long; true length is featherLengthRatio of the viewport width
  return (data.featherLengthRatio * 2 * halfH * aspect) / 2;
}

const _q = new THREE.Quaternion();
export function samplePose(p, aspect, obj) {
  const [i, t] = seg(p, keys);
  screenToWorld(crom(keys, 'cx', i, t), crom(keys, 'cy', i, t), aspect, obj.position);
  obj.quaternion.copy(quats[i]).slerp(quats[i + 1], t);
  obj.scale.setScalar(featherScale(aspect));
  return obj;
}
export function sampleShadow(p, aspect) {
  const sh = data.shadow;
  if (!sh.length || p < sh[0].p - 0.02) return null;
  if (p < sh[0].p) { const s = sh[0]; return { ...s, alpha: s.alpha * (p - (sh[0].p - 0.02)) / 0.02 }; }
  const [i, t] = seg(p, sh);
  const a = sh[i], b = sh[i + 1] || sh[i];
  const L = (k) => a[k] + (b[k] - a[k]) * t;
  return { cx: L('cx'), cy: L('cy'), w: L('w'), h: L('h'), alpha: L('alpha') };
}
export const fallData = data;